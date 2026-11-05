import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { codexExecutable } from './codex-rpc.js';
import { prepareMacosIsolation } from './macos-isolation.js';

export interface IsolationOptions {
  workspace: string; command: string[]; writable?: boolean;
  readPaths?: string[]; writePaths?: string[]; denyPaths?: string[]; immutablePaths?: string[];
  env?: Record<string, string>; signal?: AbortSignal; timeoutMs?: number; maxOutputBytes?: number;
  onStdout?: (chunk: Buffer) => void; onStderr?: (chunk: Buffer) => void;
}
export interface IsolationProfile { filesystem: Record<string, string>; network: { enabled: false } }
export interface IsolatedProcess {
  child: ChildProcessWithoutNullStreams;
  done: Promise<{ exitCode: number | null; stderr: string }>;
  close(): Promise<void>;
}
const protectedFiles = ['.fleet', 'inputs', '.review-source', 'requirements.md', 'acceptance-plan.json', 'ux-spec.json', 'solution-contract.json', 'evaluation-plan.json'];
const hiddenFiles = ['.git', '.agents', '.codex', '.aws', '.solution-evidence'];
const inside = (root: string, file: string) => file === root || file.startsWith(root + path.sep);
const bounded = (value: number | undefined, fallback: number, maximum: number) => {
  if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0 || value > maximum)) throw new Error('Invalid isolated execution limit.');
  return value ?? fallback;
};

export function permissionProfileToml(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return JSON.stringify(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unsupported permission profile value.');
  return '{' + Object.entries(value).map(([key, entry]) => JSON.stringify(key) + '=' + permissionProfileToml(entry)).join(',') + '}';
}

async function ordinaryDirectory(directory: string) {
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Isolation requires ordinary directories.');
  return fs.realpath(directory);
}

/** Reject aliases in writable trees, including hardlinks to protected or host files. */
export async function assertIsolatedWritableTree(root: string) {
  const pending = [root]; let count = 0;
  while (pending.length) {
    const directory = pending.pop()!;
    for (const name of await fs.readdir(directory)) {
      if (++count > 30_000) throw new Error('Isolated workspace exceeds its entry limit.');
      const file = path.join(directory, name), entry = await fs.lstat(file);
      if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile()) || (entry.isFile() && entry.nlink !== 1)) throw new Error('Writable isolation trees cannot contain symlinks, hardlinks, or special files.');
      if (entry.isDirectory()) pending.push(file);
    }
  }
}

export async function createCandidatePermissionProfile(options: Pick<IsolationOptions, 'workspace' | 'writable' | 'readPaths' | 'writePaths' | 'denyPaths' | 'immutablePaths'>): Promise<IsolationProfile> {
  const workspace = await ordinaryDirectory(options.workspace);
  const filesystem: Record<string, string> = { ':root': 'deny', ':minimal': 'read', [workspace]: options.writable ? 'write' : 'read' };
  for (const item of options.readPaths ?? []) filesystem[await fs.realpath(item)] = 'read';
  for (const item of options.writePaths ?? []) {
    const resolved = await ordinaryDirectory(item);
    if (!inside(workspace, resolved)) throw new Error('Writable paths must stay inside the candidate workspace.');
    filesystem[resolved] = 'write';
  }
  for (const relative of options.immutablePaths ?? protectedFiles) {
    if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => !part || part === '.' || part === '..')) throw new Error('Immutable paths must be normalized workspace-relative paths.');
    filesystem[path.join(workspace, relative)] = 'read';
  }
  for (const relative of hiddenFiles) filesystem[path.join(workspace, relative)] = 'deny';
  for (const relative of ['.quality-evidence', '.browser-observations']) filesystem[path.join(workspace, relative)] = 'read';
  for (const item of options.denyPaths ?? []) {
    if (!path.isAbsolute(item)) throw new Error('Denied isolation paths must be absolute.');
    filesystem[path.resolve(item)] = 'deny';
  }
  return { filesystem, network: { enabled: false } };
}

/** Auth-free OS sandbox. No caller environment is inherited and there is no unsandboxed fallback. */
export async function spawnIsolatedProcess(options: IsolationOptions): Promise<IsolatedProcess> {
  options.signal?.throwIfAborted();
  if (!['darwin', 'linux'].includes(process.platform)) throw new Error('Isolated experiments require macOS or Linux.');
  const timeout = bounded(options.timeoutMs, 300_000, 3_600_000), maxOutput = bounded(options.maxOutputBytes, 16_000_000, 256_000_000);
  if (!Array.isArray(options.command) || !options.command.length || options.command.length > 256 || !path.isAbsolute(options.command[0])
    || options.command.some(arg => typeof arg !== 'string' || arg.includes('\0') || Buffer.byteLength(arg) > 64_000)) throw new Error('Isolated execution requires a bounded argv with an absolute executable.');
  const workspace = await ordinaryDirectory(options.workspace), executable = await fs.realpath(options.command[0]);
  if (!(await fs.stat(executable)).isFile()) throw new Error('Invalid isolated executable.');
  if (options.writable) await assertIsolatedWritableTree(workspace);
  else for (const item of options.writePaths ?? []) await assertIsolatedWritableTree(await ordinaryDirectory(item));
  const scratch = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-isolated-')));
  let child: ChildProcessWithoutNullStreams | undefined;
  try {
    const home = path.join(scratch, 'home'), config = path.join(scratch, 'codex'), temporary = path.join(scratch, 'tmp');
    await Promise.all([home, config, temporary].map(dir => fs.mkdir(dir, { mode: 0o700 })));
    const profile = await createCandidatePermissionProfile({ ...options, workspace, readPaths: [...(options.readPaths ?? []), executable] });
    profile.filesystem[home] = 'write'; profile.filesystem[temporary] = 'write';
    if (process.platform === 'darwin') {
      profile.filesystem['/System/Library/OpenSSL'] = 'read';
      const appContents = /^(.*\.app\/Contents)\//.exec(executable)?.[1];
      if (appContents) profile.filesystem[appContents] = 'read';
    }
    const env: NodeJS.ProcessEnv = { PATH: [path.dirname(executable), '/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(path.delimiter),
      HOME: home, CODEX_HOME: config, TMPDIR: temporary, TMP: temporary, TEMP: temporary,
      ELECTRON_RUN_AS_NODE: '1', PYTHONDONTWRITEBYTECODE: '1', PYTHONNOUSERSITE: '1', LANG: 'C.UTF-8', TZ: 'UTC' };
    for (const [key, value] of Object.entries(options.env ?? {})) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(key) || /^(?:HOME|CODEX_HOME|PATH|TMPDIR|TMP|TEMP|NODE_.*|PYTHON.*|LD_.*|DYLD_.*|ELECTRON_.*|.*PROXY|BASH_ENV|ENV|SHELLOPTS)$/.test(key)
        || typeof value !== 'string' || value.includes('\0') || value.length > 10_000) throw new Error('Unsafe isolated environment variable: ' + key);
      env[key] = value;
    }
    options.signal?.throwIfAborted();
    const launch = process.platform === 'darwin' ? await prepareMacosIsolation(profile, scratch, executable, options.command.slice(1))
      : { executable: codexExecutable(), args: ['sandbox', '-C', workspace, '-P', 'fleet-candidate', '-c', 'permissions.fleet-candidate=' + permissionProfileToml(profile), '--', executable, ...options.command.slice(1)], nodeOptions: undefined, nodeBin: undefined };
    if (launch.nodeOptions) env.NODE_OPTIONS = launch.nodeOptions;
    if (launch.nodeBin) env.PATH = launch.nodeBin + path.delimiter + env.PATH;
    options.signal?.throwIfAborted();
    child = spawn(launch.executable, launch.args, { cwd: workspace, env, stdio: ['pipe', 'pipe', 'pipe'], detached: true, windowsHide: true });
    const running = child;
    let failure: Error | undefined, retainedError = '', bytes = 0;
    const kill = () => { try { if (running.pid) process.kill(-running.pid, 'SIGKILL'); } catch { /* already exited */ } };
    const fail = (error: Error) => { failure ??= error; kill(); };
    const stop = () => fail(new Error('Isolated execution cancelled.'));
    const timer = setTimeout(() => fail(new Error('Isolated execution exceeded its deadline.')), timeout);
    const collect = (data: Buffer, stderr: boolean) => {
      bytes += data.length;
      if (bytes > maxOutput) { fail(new Error('Isolated execution exceeded its output budget.')); return; }
      try {
        if (stderr) { retainedError += data.toString('utf8'); if (retainedError.length > 64_000) retainedError = retainedError.slice(-64_000); options.onStderr?.(data); }
        else options.onStdout?.(data);
      } catch (error) { fail(error instanceof Error ? error : new Error(String(error))); }
    };
    running.stdout.on('data', data => collect(data, false)); running.stderr.on('data', data => collect(data, true));
    running.stdin.on('error', () => { /* The close event reports execution failure. */ });
    options.signal?.addEventListener('abort', stop, { once: true });
    const done = new Promise<{ exitCode: number | null; stderr: string }>((resolve, reject) => {
      running.once('error', error => { failure ??= new Error('Could not start the isolation sandbox: ' + error.message); });
      running.once('exit', kill);
      running.once('close', async code => {
        clearTimeout(timer); options.signal?.removeEventListener('abort', stop); kill();
        await fs.rm(scratch, { recursive: true, force: true }).catch(() => {});
        if (failure) reject(failure); else resolve({ exitCode: code, stderr: retainedError });
      });
    });
    void done.catch(() => {});
    if (options.signal?.aborted) stop();
    return { child: running, done, async close() { kill(); await done.catch(() => {}); } };
  } catch (error) { if (!child) await fs.rm(scratch, { recursive: true, force: true }); throw error; }
}

export async function executeIsolatedProcess(options: IsolationOptions & { stdin?: string }) {
  if (options.stdin !== undefined && Buffer.byteLength(options.stdin) > 2_000_000) throw new Error('Isolated input exceeds its byte limit.');
  const output: Buffer[] = [];
  const process = await spawnIsolatedProcess({ ...options, onStdout: chunk => { output.push(chunk); options.onStdout?.(chunk); } });
  process.child.stdin.end(options.stdin ?? '');
  const result = await process.done;
  return { ...result, stdout: Buffer.concat(output).toString('utf8') };
}
