import { redactSecrets, registerCredential } from './secrets.js';
import { RunProcessSweep, runProcessEnvironment } from './process-sweep.js';
import { VerificationShutdownError } from './verification.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { artifactManifest } from './storage.js';
import { spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { PreviewServers } from './preview.js';
import type { JsonValue, RuntimeCommand, RuntimeManifest, SolutionEvaluationReport } from '../shared/solution.js';

export interface SolutionRuntimeLimits {
  totalTimeoutMs: number;
  startupTimeoutMs: number;
  invocationTimeoutMs: number;
  installTimeoutMs: number;
  maxOutputBytes: number;
  maxPackageBytes: number;
}
export interface SolutionRuntime {
  root: string;
  url?: string;
  provenance: SolutionEvaluationReport['runtime'];
  /** For host-run tests only; never serialize this environment into evidence. */
  testEnvironment: NodeJS.ProcessEnv;
  invoke(input: JsonValue): Promise<JsonValue>;
  assertIntegrity(): Promise<void>;
  redactOutput(value: JsonValue): JsonValue;
  redactMessage(message: string): string;
  close(): Promise<void>;
}

const defaults: SolutionRuntimeLimits = { totalTimeoutMs: 300_000, startupTimeoutMs: 15_000,
  invocationTimeoutMs: 15_000, installTimeoutMs: 120_000, maxOutputBytes: 2_000_000, maxPackageBytes: 100_000_000 };
const forbidden = /(?:^|\/)(?:\.fleet|\.git|\.quality-evidence|\.solution-evidence|\.browser-observations|node_modules|\.venv)(?:\/|$)|(?:^|\/)(?:solution-contract|evaluation-plan|acceptance-plan|ux-spec|packet|visual-review)\.json$|(?:^|\/)inputs\/manifest\.json$|(?:^|\/)\.env[^/]*(?:\/|$)/i;
const reservedEnv = /^(?:PATH|HOME|TMPDIR|TMP|TEMP|NODE_OPTIONS|NODE_PATH|PYTHONPATH|PYTHONHOME|LD_.*|DYLD_.*|ELECTRON_.*|HOST|PORT|npm_.*|NPM_.*|PIP_.*|VIRTUAL_ENV)$/;
function relativeFile(file: string) {
  if (!file || file.includes('\\') || file.includes('\0') || path.isAbsolute(file) || file.split('/').some(p => !p || p === '.' || p === '..') || forbidden.test(file)) throw new Error('Invalid runtime file: ' + file);
  return file;
}
async function ordinaryFile(root: string, relative: string) {
  let current = root;
  const parts = relativeFile(relative).split('/');
  for (const [i, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink() || (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw new Error('Runtime files must be ordinary files without symlink ancestors: ' + relative);
  }
  return current;
}
async function executable(name: string) {
  for (const folder of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!folder) continue;
    const file = path.join(folder, name);
    try { await fs.access(file, fs.constants.X_OK); return await fs.realpath(file); } catch { /* next installed executable */ }
  }
  throw new Error('Required runtime is not installed: ' + name);
}
function kill(child: ChildProcess) {
  try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch { /* already stopped */ }
}
function json(text: string): JsonValue {
  let parsed: JsonValue;
  try { parsed = JSON.parse(text); } catch { throw new Error('The engine must return exactly one JSON value on stdout.'); }
  const pending = [{ value: parsed, depth: 0 }];
  let count = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (++count > 100_000 || depth > 64) throw new Error('Engine JSON exceeded its structural limits.');
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Engine JSON contains a nonfinite number.');
    if (value !== null && typeof value === 'object') for (const item of Object.values(value)) pending.push({ value: item, depth: depth + 1 });
  }
  return parsed;
}
async function port(preferred?: number) {
  const server = createServer();
  const listen = (requested: number) => new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(requested, '127.0.0.1', () => { server.off('error', reject); resolve(); }); });
  if (preferred) await listen(preferred).catch(() => listen(0));
  else await listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not allocate a local service port.');
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}

function registryLock(packageJson: unknown, packageLock: unknown) {
  const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
  const message = 'Clean npm installs require a v2/v3 registry lockfile without workspaces or external local links. Every external package must pin an exact version, an HTTP(S) .tgz/.tar.gz archive and valid integrity; git and unpinned packages are unsupported.';
  const reject = () => { throw new Error(message); };
  if (!record(packageJson) || !record(packageLock) || packageJson.workspaces || ![2, 3].includes(packageLock.lockfileVersion as number) || !record(packageLock.packages)) return reject();
  const packages = packageLock.packages;
  if (!record(packages['']) || packages[''].workspaces) return reject();
  const exactVersion = (version: unknown) => {
    if (typeof version !== 'string') return false;
    const match = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version);
    return !!match && (!match[1] || match[1].split('.').every(part => !/^\d+$/.test(part) || part === '0' || !part.startsWith('0')));
  };
  const pinnedIntegrity = (integrity: unknown) => {
    if (typeof integrity !== 'string' || !integrity.trim() || integrity.length > 2_000) return false;
    const lengths: Record<string, number> = { sha1: 20, sha256: 32, sha384: 48, sha512: 64 };
    return integrity.trim().split(/\s+/).every(part => {
      const match = /^(sha1|sha256|sha384|sha512)-([A-Za-z0-9+/]+={0,2})$/.exec(part);
      if (!match) return false;
      const bytes = Buffer.from(match[2], 'base64');
      return bytes.length === lengths[match[1]] && bytes.toString('base64').replace(/=+$/, '') === match[2].replace(/=+$/, '');
    });
  };
  const archive = (resolved: unknown) => {
    if (typeof resolved !== 'string' || resolved.trim() !== resolved) return false;
    try {
      const url = new URL(resolved);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.hash && /\.(?:tgz|tar\.gz)$/i.test(url.pathname);
    } catch { return false; }
  };
  const external = (entry: unknown) => {
    if (!record(entry) || entry.link || !exactVersion(entry.version) || !archive(entry.resolved) || !pinnedIntegrity(entry.integrity)) reject();
  };
  for (const [location, entry] of Object.entries(packages)) {
    if (!record(entry) || entry.link) return reject();
    if (!location) continue;
    if (!/^(?:node_modules\/(?:@[^/]+\/)?[^/]+)(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(location) ||
        location.includes('\\') || location.split('/').some(part => part === '.' || part === '..')) return reject();
    external(entry);
  }
  // v2 includes a legacy dependency tree for older npm readers; do not accept an
  // unpinned source there even when the corresponding modern package row is valid.
  const pending: unknown[] = packageLock.dependencies === undefined ? [] : [packageLock.dependencies];
  while (pending.length) {
    const entries = pending.pop();
    if (!record(entries)) return reject();
    for (const entry of Object.values(entries)) {
      external(entry);
      if (record(entry) && entry.dependencies !== undefined) pending.push(entry.dependencies);
    }
  }
}

/** A clean package that runs generated commands directly with run process ownership. */
export async function prepareSolutionRuntime(sourceRoot: string, manifest: RuntimeManifest, nodeExecutable: string,
  signal?: AbortSignal, options: Partial<SolutionRuntimeLimits> & { preferredPort?: number } = {}): Promise<SolutionRuntime> {
  const { preferredPort, ...requestedLimits } = options;
  const limits = { ...defaults, ...requestedLimits };
  for (const [key, value] of Object.entries(limits)) if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid solution runtime limit: ' + key);
  signal?.throwIfAborted();
  if (manifest.profile === 'browser' && (manifest.requiredEnv.length || manifest.evaluator?.runtime !== 'node')) {
    throw new Error('Static browser packages require a Node evaluator for browser-compatible shared code and cannot receive runtime environment credentials. Use a service profile for model/API credentials or Python.');
  }
  const missing = manifest.requiredEnv.filter(name => !process.env[name]);
  if (missing.length) throw new Error('Missing required runtime environment: ' + missing.join(', ') + '. No model or service fallback was used.');
  if (manifest.requiredEnv.some(name => !/^[A-Z_][A-Z0-9_]*$/.test(name) || reservedEnv.test(name))) throw new Error('Runtime environment contains a reserved or invalid name.');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-solution-'));
  const root = path.join(directory, 'package');
  const children = new Set<ChildProcess>();
  const closedChildren = new Map<ChildProcess, Promise<void>>();
  const inherited = runProcessEnvironment({});
  const ownScope = inherited.APPYARD_RUN_PROCESS ? undefined : new RunProcessSweep();
  const controller = new AbortController();
  const previews = new PreviewServers();
  let failure: Error | undefined, closed = false;
  const stop = (error: Error) => { failure ??= error; controller.abort(error); for (const child of children) kill(child); previews.close(); };
  const abort = () => stop(new Error('Solution execution stopped.'));
  signal?.addEventListener('abort', abort, { once: true });
  const deadline = setTimeout(() => stop(new Error('Solution runtime exceeded its total execution limit.')), limits.totalTimeoutMs);
  const check = () => { if (failure) throw failure; if (closed) throw new Error('Solution runtime is closed.'); signal?.throwIfAborted(); };
  let closing: Promise<void> | undefined;
  const close = () => closing ??= (async () => {
    closed = true; clearTimeout(deadline); signal?.removeEventListener('abort', abort);
    controller.abort(new Error('Solution runtime closed.'));
    for (const child of children) kill(child);
    previews.close();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([Promise.all([...closedChildren.values()]), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Runtime workers did not close.')), 5000); })]);
      await ownScope?.stop();
    } catch (error) { throw new VerificationShutdownError(error); }
    finally { clearTimeout(timer); }
    await fs.rm(directory, { recursive: true, force: true });
  })();
  const env: NodeJS.ProcessEnv = { ...inherited, PATH: [path.dirname(nodeExecutable), '/usr/local/bin', '/usr/bin', '/bin'].join(path.delimiter),
    HOME: path.join(directory, 'home'), TMPDIR: path.join(directory, 'tmp'), TEMP: path.join(directory, 'tmp'), TMP: path.join(directory, 'tmp'),
    ELECTRON_RUN_AS_NODE: '1', PYTHONDONTWRITEBYTECODE: '1', LANG: 'C.UTF-8' };
  for (const name of manifest.requiredEnv) env[name] = process.env[name];
  const secrets = manifest.requiredEnv.map(name => env[name]!).filter(Boolean).sort((a, b) => b.length - a.length);
  secrets.forEach(registerCredential);
  const redact = (text: string) => redactSecrets(secrets.reduce((value, secret) => value.split(secret).join('[redacted]'), text));
  const redactOutput = (value: JsonValue): JsonValue => {
    if (typeof value === 'string') return redact(value);
    if (value === null || typeof value !== 'object') return secrets.includes(String(value)) ? '[redacted]' : value;
    if (Array.isArray(value)) return value.map(redactOutput);
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [redact(key), redactOutput(entry)]));
  };
  const launch = async (command: string, args: string[], timeout: number, input?: string, extraEnv?: NodeJS.ProcessEnv, _dependencyInstall = false) => {
    check();
    const baseEnv = { ...env, ...extraEnv };
    const child = spawn(command, args, { cwd: root, env: runProcessEnvironment(ownScope ? ownScope.environment(baseEnv) : baseEnv), stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    children.add(child);
    closedChildren.set(child, new Promise<void>(resolve => child.once('close', () => { children.delete(child); closedChildren.delete(child); resolve(); })));
    const stdout: Buffer[] = [], stderr: Buffer[] = []; let bytes = 0;
    let rejectExecution!: (error: Error) => void;
    let settled = false;
    const finished = new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      rejectExecution = reject;
      child.once('error', error => reject(error));
      child.once('close', code => {
        const out = Buffer.concat(stdout).toString('utf8'), err = Buffer.concat(stderr).toString('utf8');
        if (code === 0) resolve({ stdout: out, stderr: err });
        else reject(new Error('Runtime process exited with ' + code + (err ? ': ' + redact(err).slice(0, 1500) : '.')));
      });
    });
    const terminate = (reason: Error) => { if (!settled) { kill(child); rejectExecution(reason); } };
    const timer = setTimeout(() => terminate(new Error('Runtime process exceeded its execution limit.')), timeout);
    const aborted = () => terminate(failure ?? new Error('Solution execution stopped.'));
    controller.signal.addEventListener('abort', aborted, { once: true });
    const collect = (chunk: Buffer, stream: 'stdout' | 'stderr') => {
      bytes += chunk.length;
      if (bytes > limits.maxOutputBytes) { terminate(new Error('Runtime process exceeded its output limit.')); return; }
      (stream === 'stdout' ? stdout : stderr).push(chunk);
    };
    child.stdout?.on('data', chunk => collect(chunk, 'stdout'));
    child.stderr?.on('data', chunk => collect(chunk, 'stderr'));
    child.stdin?.on('error', () => { /* exit status reports broken input pipes */ });
    child.stdin?.end(input);
    const result = finished.finally(() => { settled = true; clearTimeout(timer); controller.signal.removeEventListener('abort', aborted); kill(child); });
    void result.catch(() => {});
    return { child, result };
  };
  try {
    await Promise.all([fs.mkdir(root), fs.mkdir(env.HOME!), fs.mkdir(env.TMPDIR!)]);
    // Node searches ancestor node_modules directories; fail rather than use ambient packages.
    for (let parent = path.dirname(root);; parent = path.dirname(parent)) {
      try { await fs.lstat(path.join(parent, 'node_modules')); throw new Error('Clean runtime has an ambient node_modules ancestor.'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if (parent === path.dirname(parent)) break;
    }
    const base = await fs.realpath(sourceRoot), hash = createHash('sha256');
    const validated = await artifactManifest(base);
    let size = 0;
    if (!manifest.files.length || manifest.files.length > 256 || new Set(manifest.files).size !== manifest.files.length) throw new Error('Runtime files must be a nonempty unique allowlist of at most 256 files.');
    for (const file of [...manifest.files].sort()) {
      check();
      const source = await ordinaryFile(base, file);
      size += (await fs.stat(source)).size;
      if (size > limits.maxPackageBytes) throw new Error('Runtime package exceeded the size limit.');
      const bytes = validated.find(item => item.path === file)?.contents;
      if (!bytes) throw new Error('Runtime file is absent from the validated manifest: ' + file);
      hash.update(file + '\0').update(bytes).update('\0');
      const target = path.join(root, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await atomicHostWrite(root, file, bytes);
    }
    const filesHash = hash.digest('hex');
    const assertIntegrity = async () => {
      check();
      const current = createHash('sha256');
      for (const file of [...manifest.files].sort()) current.update(file + '\0').update(await fs.readFile(await ordinaryFile(root, file))).update('\0');
      if (current.digest('hex') !== filesHash) throw new Error('Declared runtime files changed during execution. Keep mutable state outside the deployment file allowlist.');
    };
    for (const file of [manifest.entrypoint, manifest.command?.entrypoint, manifest.evaluator?.entrypoint, manifest.dependencies?.manifest, manifest.dependencies?.lockfile].filter((file): file is string => !!file)) {
      if (!manifest.files.includes(file)) throw new Error('Runtime entrypoint or dependency is absent from its file allowlist: ' + file);
    }
    let python: string | undefined;
    if (manifest.command?.runtime === 'python' || manifest.evaluator?.runtime === 'python' || manifest.dependencies?.manager === 'pip') python = await executable('python3');
    if (manifest.dependencies?.manager === 'npm') {
      if (manifest.dependencies.manifest !== 'package.json' || manifest.dependencies.lockfile !== 'package-lock.json') throw new Error('npm runtime dependencies require package.json and package-lock.json.');
      const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
      const packageLock = JSON.parse(await fs.readFile(path.join(root, 'package-lock.json'), 'utf8'));
      registryLock(packageJson, packageLock);
      const npm = await executable('npm');
      await (await launch(nodeExecutable, [npm, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], limits.installTimeoutMs, undefined, undefined, true)).result;
    } else if (manifest.dependencies?.manager === 'pip') {
      const lock = await fs.readFile(path.join(root, manifest.dependencies.lockfile), 'utf8');
      const lines = lock.replace(/\\\r?\n/g, ' ').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
      if (lines.some(line => !/^[A-Za-z0-9][A-Za-z0-9_.-]*(?:\[[A-Za-z0-9_,.-]+\])?==[^\s;]+\s+/.test(line) || !/--hash=sha256:[a-f0-9]{64}(?:\s|$)/i.test(line) || /(?:^|\s)(?:-r|-c|-e|--(?:requirement|constraint|editable|index-url|extra-index-url|trusted-host|find-links))(?:\s|=|$)/.test(line))) {
        throw new Error('Clean pip installs require pinned name==version entries with SHA-256 hashes; external requirement files and local links are unsupported.');
      }
      const venv = path.join(directory, 'venv');
      await (await launch(python!, ['-I', '-m', 'venv', venv], limits.installTimeoutMs, undefined, undefined, true)).result;
      python = path.join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
      await (await launch(python, ['-I', '-m', 'pip', '--isolated', '--disable-pip-version-check', 'install', '--require-hashes', '--only-binary=:all:', '-r', manifest.dependencies.lockfile], limits.installTimeoutMs, undefined, undefined, true)).result;
      env.VIRTUAL_ENV = venv;
      env.PATH = path.dirname(python) + path.delimiter + env.PATH;
    }
    const commandFor = (command: RuntimeCommand): [string, string[]] => {
      if (command.runtime === 'node') return [nodeExecutable, ['--no-global-search-paths', command.entrypoint, ...command.args]];
      // Ignore ambient user paths/site packages, while retaining this package's modules.
      const bootstrap = 'import os,runpy,sys;sys.path.insert(0,os.getcwd());p=sys.argv[1];sys.argv=sys.argv[1:];runpy.run_path(p,run_name="__main__")';
      return [python!, ['-I', '-B', ...(manifest.dependencies?.manager === 'pip' ? [] : ['-S']), '-c', bootstrap, command.entrypoint, ...command.args]];
    };
    const selected = manifest.profile === 'browser' ? manifest.evaluator : manifest.command;
    const actualRuntime = selected?.runtime === 'python' ? python! : nodeExecutable;
    const version = (await (await launch(actualRuntime, ['--version'], limits.startupTimeoutMs)).result).stdout.trim();
    let url: string | undefined, serviceFailure: Error | undefined;
    const request = async (address: string, init?: RequestInit) => {
      check();
      const requestSignal = AbortSignal.any([controller.signal, AbortSignal.timeout(limits.invocationTimeoutMs), ...(init?.signal ? [init.signal] : [])]);
      const response = await fetch(address, { ...init, redirect: 'error', signal: requestSignal });
      if (!response.ok) { await response.body?.cancel(); throw new Error('Runtime HTTP request failed with status ' + response.status); }
      const reader = response.body?.getReader();
      let bytes = 0; const chunks: Uint8Array[] = [];
      if (reader) try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length; if (bytes > limits.maxOutputBytes) throw new Error('Runtime response exceeded its output limit.'); chunks.push(chunk.value); } }
      finally { await reader.cancel().catch(() => {}); }
      return Buffer.concat(chunks).toString('utf8');
    };
    if (manifest.profile === 'service') {
      if (!selected || !manifest.healthPath || !manifest.invokePath) throw new Error('Service runtime needs a command, healthPath and invokePath.');
      for (const value of [manifest.healthPath, manifest.invokePath]) if (!value.startsWith('/') || value.startsWith('//') || /[\\?#]/.test(value)) throw new Error('Service paths must be local absolute URL paths.');
      const assignedPort = await port(preferredPort); url = 'http://127.0.0.1:' + assignedPort + '/';
      env.HOST = '127.0.0.1'; env.PORT = String(assignedPort);
      const [program, args] = commandFor(selected);
      const running = await launch(program, args, limits.totalTimeoutMs, undefined, { HOST: '127.0.0.1', PORT: String(assignedPort) });
      void running.result.then(() => { serviceFailure = new Error('The runtime service exited unexpectedly.'); }, error => { serviceFailure = error; });
      const until = Date.now() + limits.startupTimeoutMs;
      for (;;) {
        check(); if (serviceFailure) throw serviceFailure;
        try { await request(new URL(manifest.healthPath, url).href, { signal: AbortSignal.timeout(Math.min(1000, limits.startupTimeoutMs)) }); break; }
        catch (error) { if (Date.now() >= until) throw new Error('Runtime service did not become healthy before the startup deadline.'); }
        await new Promise(resolve => setTimeout(resolve, Math.min(50, Math.max(1, until - Date.now()))));
      }
    } else if (manifest.profile === 'browser') {
      if (manifest.entrypoint !== 'index.html') throw new Error('Browser runtime requires index.html.');
      url = await previews.url(root, manifest.files);
    }
    await assertIntegrity();
    return { root, url, testEnvironment: { ...env }, provenance: { profile: manifest.profile, filesHash, runtime: version || selected?.runtime || 'node', environmentNames: [...manifest.requiredEnv] },
      async invoke(input) {
        check(); if (serviceFailure) throw serviceFailure;
        await assertIntegrity();
        const encoded = JSON.stringify(input);
        if (Buffer.byteLength(encoded) > limits.maxOutputBytes) throw new Error('Runtime input exceeded the size limit.');
        let output: JsonValue;
        if (manifest.profile === 'service') output = json(await request(new URL(manifest.invokePath!, url!).href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: encoded }));
        else {
          if (!selected) throw new Error('This browser package has no callable evaluation entrypoint.');
          const [program, args] = commandFor(selected);
          output = json((await (await launch(program, args, limits.invocationTimeoutMs, encoded + '\n')).result).stdout);
        }
        await assertIntegrity(); return output;
      }, assertIntegrity, redactOutput, redactMessage: redact, close };
  } catch (error) { await close(); throw error; }
}
