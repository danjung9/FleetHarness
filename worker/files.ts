import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { sourceHash } from './runtime/electron/storage.js';

export const artifactLimits = { count: 2000, fileBytes: 10 * 1024 * 1024, totalBytes: 20 * 1024 * 1024 } as const;
const ignored = new Set(['node_modules', '.git', '.pi', '.DS_Store']);
export interface ArtifactFile { path: string; size: number; sha256: string; base64: string }
export interface ArtifactBundle {
  version: 1;
  runId: string;
  epoch: number;
  createdAt: string;
  sourceHash: string;
  files: ArtifactFile[];
}
export const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');

async function boundedBytes(handle: Awaited<ReturnType<typeof fs.open>>, maxBytes: number) {
  const stat = await handle.stat();
  if (!stat.isFile() || stat.size > maxBytes) throw new Error('File exceeds its size limit or is not a regular file.');
  const bytes = Buffer.alloc(stat.size + 1);
  let offset = 0;
  while (offset < bytes.length) {
    const read = await handle.read(bytes, offset, bytes.length - offset, offset);
    if (!read.bytesRead) break;
    offset += read.bytesRead;
  }
  if (offset !== stat.size) throw new Error('File changed while being read.');
  return bytes.subarray(0, offset);
}

export function artifactPath(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value || value.length > 500 || value.includes('\\') || /[\x00-\x1f\x7f]/.test(value) ||
    path.posix.isAbsolute(value) || value.split('/').some(part => !part || part === '.' || part === '..' || ignored.has(part))) {
    throw new Error('Invalid artifact path.');
  }
}

export async function atomicJson(file: string, value: unknown) {
  const data = JSON.stringify(value);
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = file + '.' + randomUUID() + '.tmp';
  try {
    await fs.writeFile(temporary, data, { mode: 0o600, flag: 'wx' });
    await fs.rename(temporary, file);
  } finally { await fs.rm(temporary, { force: true }); }
  return digest(data);
}

export async function readJson<T>(file: string, maxBytes = 32 * 1024 * 1024): Promise<{ value: T; sha256: string }> {
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const bytes = await boundedBytes(handle, maxBytes);
    return { value: JSON.parse(bytes.toString('utf8')) as T, sha256: digest(bytes) };
  } finally { await handle.close(); }
}

export async function collectArtifacts(root: string, runId: string, epoch: number, secrets: string[] = []): Promise<ArtifactBundle> {
  const base = await fs.realpath(root);
  if ((await fs.lstat(root)).isSymbolicLink()) throw new Error('Workspace must be a real directory.');
  const files: ArtifactFile[] = [];
  let total = 0, entries = 0;
  async function walk(prefix: string) {
    for (const entry of await fs.readdir(path.join(base, prefix), { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      if (++entries > artifactLimits.count * 2) throw new Error('Workspace contains too many entries.');
      const relative = prefix ? prefix + '/' + entry.name : entry.name;
      artifactPath(relative);
      if (entry.isSymbolicLink()) throw new Error('Symbolic links cannot be checkpointed or exported: ' + relative);
      const file = path.join(base, relative);
      if ((await fs.realpath(file)) !== file) throw new Error('Artifact must stay inside its workspace.');
      if (entry.isDirectory()) { await walk(relative); continue; }
      if (!entry.isFile()) throw new Error('Only regular files can be checkpointed or exported.');
      if (files.length >= artifactLimits.count) throw new Error('This workspace exceeds the 2,000-file artifact limit.');
      const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
      let bytes: Buffer;
      try {
        bytes = await boundedBytes(handle, artifactLimits.fileBytes);
      } finally { await handle.close(); }
      total += bytes.length;
      if (bytes.length > artifactLimits.fileBytes || total > artifactLimits.totalBytes) throw new Error('Artifacts exceed the 20 MB workspace limit.');
      if (secrets.some(secret => secret.length > 8 && bytes.includes(Buffer.from(secret)))) throw new Error('A generated artifact contains a runtime credential and cannot be saved.');
      files.push({ path: relative, size: bytes.length, sha256: digest(bytes), base64: bytes.toString('base64') });
    }
  }
  await walk('');
  files.sort((a, b) => a.path.localeCompare(b.path));
  const calculated = bundleSourceHash(files);
  if (calculated !== await sourceHash(base)) throw new Error('Workspace changed while creating the artifact checkpoint.');
  return { version: 1, runId, epoch, createdAt: new Date().toISOString(), sourceHash: calculated, files };
}

export function bundleSourceHash(files: ArtifactFile[]) {
  const hash = createHash('sha256');
  for (const file of files) {
    if (['test-report.json', 'review.json', 'DELIVERY.md'].includes(file.path)) continue;
    hash.update(file.path); hash.update(Buffer.from(file.base64, 'base64'));
  }
  return hash.digest('hex');
}

export function validateBundle(bundle: ArtifactBundle, runId: string) {
  if (bundle?.version !== 1 || bundle.runId !== runId || !Number.isSafeInteger(bundle.epoch) || bundle.epoch < 1 ||
    !Array.isArray(bundle.files) || bundle.files.length > artifactLimits.count) throw new Error('Invalid artifact bundle.');
  const paths = new Set<string>();
  let total = 0;
  for (const file of bundle.files) {
    artifactPath(file.path);
    if (paths.has(file.path)) throw new Error('Duplicate artifact path.');
    paths.add(file.path);
    if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > artifactLimits.fileBytes ||
      typeof file.base64 !== 'string' || file.base64.length > Math.ceil(artifactLimits.fileBytes / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.base64)) throw new Error('Invalid artifact size or encoding.');
    const bytes = Buffer.from(file.base64, 'base64');
    total += bytes.length;
    if (total > artifactLimits.totalBytes || bytes.length !== file.size || bytes.toString('base64') !== file.base64 || digest(bytes) !== file.sha256) throw new Error('Artifact integrity check failed.');
  }
  for (const name of paths) {
    const components = name.split('/'); components.pop();
    while (components.length) {
      if (paths.has(components.join('/'))) throw new Error('Artifact path conflicts with another file.');
      components.pop();
    }
  }
  const sorted = [...bundle.files].sort((a, b) => a.path.localeCompare(b.path));
  if (sorted.some((file, i) => file.path !== bundle.files[i].path) || bundleSourceHash(sorted) !== bundle.sourceHash) throw new Error('Artifact source hash or canonical order is invalid.');
}

/** Restore into a new sibling before replacing any interrupted workspace. */
export async function restoreArtifacts(root: string, bundle: ArtifactBundle, runId: string) {
  validateBundle(bundle, runId);
  const parent = await fs.realpath(path.dirname(root));
  const target = path.join(parent, path.basename(root));
  const temporary = await fs.mkdtemp(path.join(parent, '.restore-'));
  try {
    for (const file of bundle.files) {
      const destination = path.join(temporary, file.path);
      await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
      await fs.writeFile(destination, Buffer.from(file.base64, 'base64'), { mode: 0o600, flag: 'wx' });
    }
    if (await sourceHash(temporary) !== bundle.sourceHash) throw new Error('Restored checkpoint source hash does not match.');
    await fs.rm(target, { recursive: true, force: true });
    await fs.rename(temporary, target);
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}
