import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { applicationTestFiles } from './verification.js';
import { safeFile } from './storage.js';

export const testBaselinePolicy = 'Original build tests are restored and rerun unchanged. Add coverage in new test files. Expectation changes require an explicit contract revision in a new run; repairs cannot authorize one.';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

export async function captureTestBaseline(root: string) {
  const hashes: Record<string, string> = {}, contents: Record<string, string> = {};
  for (const file of await applicationTestFiles(root, true)) {
    const source = await safeFile(root, file);
    if ((await fs.stat(source)).size > 10 * 1024 * 1024) throw new Error('A baseline test exceeds the 10 MB verification limit.');
    const bytes = await fs.readFile(source);
    hashes[file] = digest(bytes); contents[file] = bytes.toString('base64');
  }
  return { hashes, contents };
}

export function assertTestBaseline(hashes?: Record<string, string>, contents?: Record<string, string>) {
  if (!hashes || !contents || !Object.keys(hashes).length || Object.keys(hashes).length !== Object.keys(contents).length) {
    throw new Error('The executable build-test baseline is missing. Start a new run; resume cannot replace original evidence.');
  }
  for (const [file, hash] of Object.entries(hashes)) {
    if (path.isAbsolute(file) || file.split(/[/\\]/).some(part => !part || part === '.' || part === '..')
      || typeof contents[file] !== 'string' || digest(Buffer.from(contents[file], 'base64')) !== hash) {
      throw new Error('The executable build-test baseline is invalid. Start a new run.');
    }
  }
}

/** Restore host-retained bytes only after the workspace writer has stopped. */
export async function restoreTestBaseline(root: string, hashes?: Record<string, string>, contents?: Record<string, string>) {
  assertTestBaseline(hashes, contents);
  const base = await fs.realpath(root), restored: string[] = [];
  for (const [file, hash] of Object.entries(hashes!)) {
    // Walk parents without following links, including when a repair deleted a test directory.
    let parent = base;
    for (const part of file.split(path.sep).slice(0, -1)) {
      parent = path.join(parent, part);
      await fs.mkdir(parent).catch(error => { if (error.code !== 'EEXIST') throw error; });
      const stat = await fs.lstat(parent);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Baseline test parent must be a real workspace directory.');
    }
    const target = path.join(base, file);
    const stat = await fs.lstat(target).catch(error => { if (error.code !== 'ENOENT') throw error; return undefined; });
    if (stat?.isFile() && digest(await fs.readFile(target)) === hash) continue;
    const temporary = path.join(parent, '.baseline-' + randomUUID());
    try {
      await fs.writeFile(temporary, Buffer.from(contents![file], 'base64'), { flag: 'wx', mode: 0o600 });
      await fs.rename(temporary, target);
      restored.push(file);
    } finally { await fs.rm(temporary, { force: true }); }
  }
  return restored;
}
