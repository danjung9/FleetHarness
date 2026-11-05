import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Host writes never open an existing destination, including links and hard links. */
export async function atomicHostWrite(root: string, relative: string, contents: string | Uint8Array, options: { exclusive?: boolean; signal?: AbortSignal } = {}) {
  options.signal?.throwIfAborted();
  const base = await fs.realpath(root);
  if ((await fs.lstat(root)).isSymbolicLink()) throw new Error('Host write requires a real directory.');
  const target = path.resolve(base, relative);
  if (!relative || path.isAbsolute(relative) || !target.startsWith(base + path.sep)) throw new Error('Invalid host artifact path.');
  let parent = base;
  for (const part of path.relative(base, path.dirname(target)).split(path.sep).filter(Boolean)) {
    parent = path.join(parent, part);
    const stat = await fs.lstat(parent);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Host write requires real artifact directories.');
  }
  const temporary = path.join(parent, '.host-' + randomUUID());
  let created = false;
  try {
    const file = await fs.open(temporary, 'wx', 0o600); created = true;
    try { await file.writeFile(contents); await file.sync(); } finally { await file.close(); }
    options.signal?.throwIfAborted();
    if (options.exclusive) await fs.link(temporary, target);
    else await fs.rename(temporary, target);
  } finally { if (created) await fs.rm(temporary, { force: true }); }
}
