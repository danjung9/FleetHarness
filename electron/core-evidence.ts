import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const digest = (body: string) => createHash('sha256').update(body).digest('hex');

type ReportKind = 'core' | 'workflow';

async function hostDirectory(hostRoot: string, workspace: string, create = false, kind: ReportKind = 'core') {
  const directory = path.join(hostRoot, kind + '-reports');
  if (create) await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const stat = await fs.lstat(directory), base = await fs.realpath(directory), root = await fs.realpath(workspace);
  if (!stat.isDirectory() || stat.isSymbolicLink() || base === root || base.startsWith(root + path.sep)) {
    throw new Error('Core evaluation snapshots must remain in an ordinary private host directory.');
  }
  return directory;
}

async function readSnapshot(directory: string, hash: string) {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid host core evaluation snapshot hash.');
  const file = await fs.open(path.join(directory, hash + '.json'), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!(await file.stat()).isFile()) throw new Error('Host core evaluation snapshot must be a regular file.');
    const body = await file.readFile('utf8');
    if (digest(body) !== hash) throw new Error('Host core evaluation snapshot changed. Workspace claims cannot replace it.');
    return body;
  } finally { await file.close(); }
}

/** Keep the body outside the checkpoint's size budget; old checkpoint hashes remain valid. */
export async function retainCoreReport(hostRoot: string, workspace: string, body: string) {
  return retainReport(hostRoot, workspace, body, 'core');
}

export async function retainWorkflowReport(hostRoot: string, workspace: string, body: string) {
  return retainReport(hostRoot, workspace, body, 'workflow');
}

async function retainReport(hostRoot: string, workspace: string, body: string, kind: ReportKind) {
  const hash = digest(body), directory = await hostDirectory(hostRoot, workspace, true, kind);
  const temporary = path.join(directory, randomUUID() + '.tmp');
  try {
    await fs.writeFile(temporary, body, { flag: 'wx', mode: 0o600 });
    try { await fs.link(temporary, path.join(directory, hash + '.json')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    await readSnapshot(directory, hash);
  } finally { await fs.rm(temporary, { force: true }); }
  return hash;
}

/** The workspace copy is readable diagnostic output, never the source of trusted evidence. */
export async function restoreCoreReport(hostRoot: string, workspace: string, hash?: string, signal?: AbortSignal): Promise<boolean> {
  return restoreReport(hostRoot, workspace, hash, signal, 'core');
}

export async function restoreWorkflowReport(hostRoot: string, workspace: string, hash?: string, signal?: AbortSignal): Promise<boolean> {
  return restoreReport(hostRoot, workspace, hash, signal, 'workflow');
}

async function restoreReport(hostRoot: string, workspace: string, hash: string | undefined, signal: AbortSignal | undefined, kind: ReportKind): Promise<boolean> {
  signal?.throwIfAborted();
  // Legacy checkpoints have no trusted snapshot. Never promote their workspace report.
  if (hash === undefined) return false;
  const body = await readSnapshot(await hostDirectory(hostRoot, workspace, false, kind), hash);
  signal?.throwIfAborted();
  const root = await fs.realpath(workspace), directory = path.join(root, '.quality-evidence');
  await fs.mkdir(directory, { recursive: true });
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Evidence directory must be an ordinary workspace directory.');
  const destination = path.join(directory, kind + '-report.json');
  try {
    const current = await fs.lstat(destination);
    if (!current.isFile() && !current.isSymbolicLink()) throw new Error('Core evaluation report must be a regular file.');
    if (!current.isSymbolicLink()) {
      const file = await fs.open(destination, constants.O_RDONLY | constants.O_NOFOLLOW);
      try { if (await file.readFile('utf8') === body) return false; }
      finally { await file.close(); }
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const temporary = path.join(directory, randomUUID() + '.json');
  try {
    await fs.writeFile(temporary, body, { flag: 'wx', mode: 0o600 });
    signal?.throwIfAborted();
    await fs.rename(temporary, destination);
  } finally { await fs.rm(temporary, { force: true }); }
  return true;
}
