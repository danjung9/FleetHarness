import { spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { codexExecutable } from './codex-rpc.js';

export interface HelperProcessOptions {
  workspace: string;
  executable: string;
  command: string[];
  stdin?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxOutputBytes?: number;
}
export interface HelperProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  outputLimited: boolean;
}

const outputDirectory = '.agent-output';
const maxStdinBytes = 1_000_000;
const protectedPaths = ['.fleet', '.agent-tools', 'inputs', '.review-source', 'requirements.md',
  'acceptance-plan.json', 'ux-spec.json', 'solution-contract.json', 'evaluation-plan.json'];
const hiddenPaths = ['.git', '.agents', '.codex', '.aws', '.quality-evidence', '.solution-evidence'];

function bounded(value: number | undefined, fallback: number, maximum: number, label: string) {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) throw new Error(`${label} must be a positive integer.`);
  return Math.min(value ?? fallback, maximum);
}

// TOML is passed as one argv item, never interpolated into a shell command.
function toml(value: string | boolean | Record<string, unknown>): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return String(value);
  return '{' + Object.entries(value).map(([key, entry]) => JSON.stringify(key) + '=' + toml(entry as Parameters<typeof toml>[0])).join(',') + '}';
}

function killGroup(child: ChildProcess) {
  try { if (child.pid) process.kill(-child.pid, 'SIGKILL'); } catch { /* process group already exited */ }
}

async function ordinaryOutput(root: string) {
  const target = path.join(root, outputDirectory);
  try { await fs.mkdir(target, { mode: 0o700 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const stat = await fs.lstat(target);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(target) !== target) {
    throw new Error('Helper output must be an ordinary .agent-output directory inside the workspace.');
  }
  // A preexisting hardlink inside a writable tree could alias a read-only or
  // outside inode. Path-based sandboxes cannot distinguish that alias.
  const pending = [target];
  let entries = 0;
  while (pending.length) {
    const directory = pending.pop()!;
    for (const name of await fs.readdir(directory)) {
      if (++entries > 10_000) throw new Error('Helper output exceeds the 10,000-entry limit.');
      const file = path.join(directory, name), entry = await fs.lstat(file);
      if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile()) || (entry.isFile() && entry.nlink !== 1)) {
        throw new Error('Helper output must contain ordinary files and directories without symlinks or hardlinks.');
      }
      if (entry.isDirectory()) pending.push(file);
    }
  }
  return target;
}

function runtimeArguments(command: string[]) {
  // The host supports file entrypoints and Node's test runner. Arbitrary Node
  // switches could disable the permission layer or load code before it applies.
  const args = command.slice(1);
  let entry = 0, tests = false;
  while (entry < args.length && args[entry].startsWith('-')) {
    const flag = args[entry++];
    if (flag === '--test') tests = true;
    else if (flag !== '--no-global-search-paths' && flag !== '--test-reporter=tap') throw new Error('Unsupported helper runtime flag: ' + flag);
  }
  if (entry === args.length) throw new Error('Helper command requires a script entrypoint.');
  if (tests && args.slice(entry).some(arg => arg.startsWith('-'))) throw new Error('Helper test files cannot contain runtime switches.');
  return ['--permission', '--allow-fs-read=*', '--allow-fs-write=*',
    ...(tests ? ['--experimental-test-isolation=none'] : []), ...args];
}

/**
 * Runs an agent-authored local program through the bundled, auth-free Codex
 * sandbox. The workspace is read-only; only .agent-output and a disposable
 * private temp directory are writable. Failure never retries without sandboxing.
 */
export async function executeHelperProcess(options: HelperProcessOptions): Promise<HelperProcessResult> {
  options.signal?.throwIfAborted();
  if (process.platform !== 'darwin' && process.platform !== 'linux') throw new Error('Sandboxed helper execution currently requires macOS or Linux.');
  const timeoutMs = bounded(options.timeoutMs, 30_000, 120_000, 'Helper timeout');
  const maxOutputBytes = bounded(options.maxOutputBytes, 64_000, 512_000, 'Helper output limit');
  if (!Array.isArray(options.command) || !options.command.length || options.command.length > 256 ||
    options.command.some(arg => typeof arg !== 'string' || arg.includes('\0') || Buffer.byteLength(arg) > 32_000) ||
    !path.isAbsolute(options.command[0]) || !path.isAbsolute(options.executable)) throw new Error('Helper command must contain an absolute runtime executable and bounded argv strings.');
  if (options.stdin !== undefined && (typeof options.stdin !== 'string' || Buffer.byteLength(options.stdin) > maxStdinBytes)) throw new Error('Helper input exceeds the 1 MB limit.');
  const nodeArgs = runtimeArguments(options.command);
  const workspace = await fs.realpath(options.workspace);
  if (!(await fs.stat(workspace)).isDirectory()) throw new Error('Helper workspace must be a directory.');
  // Node canonicalizes import.meta.url by default. Canonicalize the entrypoint
  // argv too so normal CLI main guards work when macOS /var resolves to /private/var.
  // Arguments after an ordinary script are its data, and must remain untouched.
  const firstScript = nodeArgs.findIndex(arg => !arg.startsWith('-'));
  const tests = nodeArgs.slice(0, firstScript).includes('--test');
  for (let index = firstScript; index < (tests ? nodeArgs.length : firstScript + 1); index++) {
    nodeArgs[index] = await fs.realpath(path.resolve(workspace, nodeArgs[index]));
  }
  const executable = await fs.realpath(options.executable);
  if (await fs.realpath(options.command[0]) !== executable || !(await fs.stat(executable)).isFile()) throw new Error('Helper command must use the configured runtime executable.');
  const output = await ordinaryOutput(workspace);
  const scratch = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-helper-')));
  try {
    const home = path.join(scratch, 'home'), config = path.join(scratch, 'codex'), temporary = path.join(scratch, 'tmp');
    await Promise.all([home, config, temporary].map(dir => fs.mkdir(dir, { mode: 0o700 })));
    const filesystem: Record<string, string> = { ':root': 'deny', ':minimal': 'read', [workspace]: 'read', [output]: 'write', [temporary]: 'write', [executable]: 'read' };
    for (const relative of protectedPaths) filesystem[path.join(workspace, relative)] = 'read';
    for (const relative of hiddenPaths) filesystem[path.join(workspace, relative)] = 'deny';
    // Node consults this system OpenSSL configuration on macOS. Electron also
    // needs its framework/resources alongside the executable in an app bundle.
    if (process.platform === 'darwin') {
      filesystem['/System/Library/OpenSSL'] = 'read';
      const appContents = /^(.*\.app\/Contents)\//.exec(executable)?.[1];
      if (appContents) filesystem[appContents] = 'read';
    }
    const profile = { filesystem, network: { enabled: false } };
    // Node's permission layer denies subprocesses, workers and native addons.
    // This prevents helpers daemonizing beyond the process group timeout. The
    // Codex OS sandbox remains the authority for filesystem and network access.
    const args = ['sandbox', '-C', workspace, '-P', 'fleet-helper', '-c', 'permissions.fleet-helper=' + toml(profile), '--', executable, ...nodeArgs];
    // Do not inherit API keys, loader hooks, proxy settings, shell startup files,
    // or the user's Codex configuration. This invocation makes no model call.
    const env: NodeJS.ProcessEnv = {
      PATH: [path.dirname(executable), '/usr/bin', '/bin', '/usr/sbin', '/sbin'].join(path.delimiter),
      HOME: home, CODEX_HOME: config, TMPDIR: temporary, TMP: temporary, TEMP: temporary,
      ELECTRON_RUN_AS_NODE: '1', LANG: 'C', LC_ALL: 'C', TZ: 'UTC', FLEET_HELPER_OUTPUT: output
    };
    options.signal?.throwIfAborted();
    const result = await new Promise<HelperProcessResult>((resolve, reject) => {
      const child = spawn(codexExecutable(), args, { cwd: workspace, env, stdio: ['pipe', 'pipe', 'pipe'], detached: true, windowsHide: true });
      const stdout: Buffer[] = [], stderr: Buffer[] = [];
      let bytes = 0, timedOut = false, outputLimited = false, aborted = false;
      const stop = () => { aborted = true; killGroup(child); };
      const timer = setTimeout(() => { timedOut = true; killGroup(child); }, timeoutMs);
      const append = (chunks: Buffer[], data: Buffer) => {
        const remaining = maxOutputBytes - bytes;
        if (remaining > 0) { const kept = data.subarray(0, remaining); chunks.push(kept); bytes += kept.byteLength; }
        if (data.byteLength > remaining) { outputLimited = true; killGroup(child); }
      };
      const clean = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', stop); killGroup(child); };
      child.stdout.on('data', data => append(stdout, data));
      child.stderr.on('data', data => append(stderr, data));
      // Cleanup also runs on ordinary exit so background children cannot keep
      // inherited stdout/stderr alive after their parent command has completed.
      child.once('exit', () => killGroup(child));
      child.once('error', error => { clean(); reject(new Error('Could not start the helper sandbox: ' + error.message)); });
      child.once('close', code => {
        clean();
        if (aborted || options.signal?.aborted) { reject(new Error('Helper execution stopped.')); return; }
        // Decoding invalid UTF-8 can expand bytes into replacement characters.
        // Bound the returned text as well and avoid splitting a final code point.
        const out = Buffer.from(Buffer.concat(stdout).toString('utf8')), err = Buffer.from(Buffer.concat(stderr).toString('utf8'));
        if (out.byteLength + err.byteLength > maxOutputBytes) outputLimited = true;
        const stdoutText = new StringDecoder('utf8').write(out.subarray(0, maxOutputBytes));
        const stderrText = new StringDecoder('utf8').write(err.subarray(0, maxOutputBytes - Buffer.byteLength(stdoutText)));
        resolve({ exitCode: timedOut || outputLimited ? null : code, stdout: stdoutText, stderr: stderrText, timedOut, outputLimited });
      });
      child.stdin.on('error', () => { /* sandbox can exit before consuming input */ });
      options.signal?.addEventListener('abort', stop, { once: true });
      if (options.signal?.aborted) stop();
      child.stdin.end(options.stdin ?? '');
    });
    return result;
  } finally { await fs.rm(scratch, { recursive: true, force: true }); }
}
