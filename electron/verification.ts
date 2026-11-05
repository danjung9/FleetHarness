import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { listArtifacts, sourceHash } from './storage.js';
import { codexExecutable } from './codex-rpc.js';
import type { TestReport } from '../shared/types.js';
import { runAbortError } from './run-budget.js';
import { runProcessEnvironment } from './process-sweep.js';
export { reportPassed } from '../shared/verification.js';

export interface VerificationLimits { timeoutMs: number; maxOutputBytes: number }
export interface VerificationCommand { runner: string; args: string[]; ready: string; command: string }
// Trusted host/test dependency only. Production callers omit this and always use the sandbox.
export type VerificationLauncher = (root: string, executable: string, testArgs: string[]) => VerificationCommand | Promise<VerificationCommand>;
export interface VerificationOptions extends Partial<VerificationLimits> { launcher?: VerificationLauncher }
export class VerificationShutdownError extends Error {
  constructor(cause: unknown) {
    super('Verification shutdown was not confirmed. Recovery in this workspace is blocked. An operator must stop remaining workers before starting a new run in a fresh workspace.', { cause });
    this.name = 'VerificationShutdownError';
  }
}
export async function applicationTestFiles(root: string, includeEmpty = false) {
  return (await listArtifacts(root)).filter(f => (includeEmpty || f.size > 0) && !/^\.(?:fleet|review-source|agent-tools|agent-output|browser-observations)(?:\/|\\)/.test(f.path) && /(?:^|[/\\])[^/\\]+\.(?:test|spec)\.(?:cjs|mjs|js)$/.test(f.path)).map(f => f.path);
}
const shellArgument = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
export function portableTestCommand(files: string[]) {
  if (!files.length) throw new Error('No application test files were verified.');
  return 'node --test ' + files.map(file => shellArgument('./' + file)).join(' ');
}
export function summarizeTap(output: string) {
  const count = (name: string) => Number(output.match(new RegExp('^# ' + name + ' (\\d+)', 'm'))?.[1] ?? 0);
  return { total: count('tests'), passed: count('pass'), failed: count('fail'), skipped: count('skipped') + count('todo') };
}
// The host-owned reporter runs in Node's coordinator, outside generated test
// workers. Encode TAP as data, so worker stdout can never forge a summary record.
// Both the TAP and per-file registered-case evidence come from this ONE run.
const registeredReporter = 'data:text/javascript;base64,' + Buffer.from(`
import { tap } from 'node:test/reporters';
export default async function* (events) {
  const summaries = [];
  async function* observe() {
    for await (const event of events) {
      if (event.type === 'test:summary' && event.data.file) summaries.push(event.data);
      yield event;
    }
  }
  for await (const text of tap(observe())) yield JSON.stringify({ type: 'output', text }) + '\\n';
  yield JSON.stringify({ type: 'registered', summaries }) + '\\n';
}
`).toString('base64');

async function registeredEvidence(root: string, files: string[], wire: string) {
  type Summary = { file: string; counts: { tests: number; passed: number; failed: number; skipped: number; todo: number; cancelled: number } };
  let summaries: Summary[] | undefined, output = '', invalid = false;
  for (const line of wire.split('\n').filter(Boolean)) {
    try {
      const record = JSON.parse(line);
      if (record.type === 'output' && typeof record.text === 'string') output += record.text;
      else if (record.type === 'registered' && Array.isArray(record.summaries) && !summaries) summaries = record.summaries;
      else invalid = true;
    } catch { output += line + '\n'; invalid = true; }
  }
  const registeredTests: NonNullable<TestReport['registeredTests']> = [];
  const counts = { total: 0, passed: 0, failed: 0, skipped: 0 };
  const missing: string[] = [];
  for (const file of files) {
    const resolved = await fs.realpath(path.join(root, file));
    const matches = summaries?.filter(summary => typeof summary.file === 'string' && path.resolve(summary.file) === resolved) ?? [];
    const c = matches.length === 1 ? matches[0].counts : undefined;
    if (!c || !['tests', 'passed', 'failed', 'skipped', 'todo', 'cancelled'].every(key => Number.isSafeInteger(c[key as keyof typeof c]) && c[key as keyof typeof c] >= 0) || c.tests <= 0) {
      missing.push(file); continue;
    }
    registeredTests.push({ file, tests: c.tests });
    counts.total += c.tests; counts.passed += c.passed;
    counts.failed += c.failed + c.cancelled; counts.skipped += c.skipped + c.todo;
  }
  const problem = invalid || !summaries ? 'Registered-test evidence did not complete successfully.'
    : missing.length ? 'No registered application tests in: ' + missing.join(', ') : '';
  if (problem) { counts.total = 0; counts.passed = 0; counts.failed = 0; counts.skipped = 0; output += '\n' + problem; }
  return { ...counts, output, registeredTests, problem };
}
const sandboxFailure = 'Could not start verification sandbox. Reinstall AppYard or ask your administrator to enable its bundled sandbox. Tests will never run unsandboxed.';
function sandboxStartupFailure(output: string) {
  // Applying Seatbelt can be forbidden by the enclosing development sandbox. Reinstallation
  // cannot fix that host restriction, and running generated tests directly is not a fallback.
  const message = /sandbox_apply: Operation not permitted/.test(output)
    ? 'Could not start verification sandbox. An enclosing sandbox may prevent startup. Ask your operator to run verification on a host that permits the verification sandbox. Keep the verification sandbox enabled. Tests will never run unsandboxed.'
    : sandboxFailure;
  return message + '\n' + output;
}

async function sandboxCommand(root: string, executable: string, testArgs: string[]) {
  const runner = codexExecutable(), runtime = await fs.realpath(executable);
  // Electron is the shipped Node runtime. On macOS it also needs its sibling Frameworks directory.
  const bundle = runtime.match(/^(.*\.app)[/\\]Contents[/\\]/)?.[1];
  const runtimeRoot = bundle ?? (runtime.startsWith('/opt/homebrew/') ? '/opt/homebrew' : path.dirname(runtime));
  // Match the agents' fleet-build policy, using a fresh scratch home with no credentials.
  const toolchains = [...new Set(['/Library/Developer', '/opt/homebrew', '/usr/local', path.dirname(process.execPath), path.dirname(runner), runtimeRoot])];
  const filesystem = { ':root': 'deny', ':minimal': 'read', ':workspace_roots': 'write',
    ...Object.fromEntries(toolchains.map(folder => [folder, 'read'])) };
  const toml = '{' + Object.entries(filesystem).map(([key, value]) => JSON.stringify(key) + '=' + JSON.stringify(value)).join(',') + '}';
  const ready = 'appyard-verification-ready-' + randomUUID() + '\n';
  // The bootstrap runs INSIDE the sandbox, before any generated code. Its marker distinguishes
  // sandbox/runtime startup failure from an ordinary failing application test.
  const bootstrap = `process.stdout.write(${JSON.stringify(ready)});const child=require('node:child_process').spawn(process.execPath,${JSON.stringify(testArgs)},{stdio:'inherit'});child.once('error',e=>{console.error('Could not start Node tests: '+e.code);process.exitCode=1});child.once('exit',code=>{process.exitCode=code??1});`;
  return { runner, ready, command: 'codex sandbox -P fleet-build -- node ' + testArgs.map(arg => JSON.stringify(arg)).join(' '), args: ['sandbox', '-P', 'fleet-build',
    '-c', 'permissions.fleet-build.filesystem=' + toml,
    '-c', 'permissions.fleet-build.network.enabled=false',
    '-c', 'projects={' + JSON.stringify(await fs.realpath(root)) + '={trust_level="untrusted"}}',
    '--', runtime, '--input-type=commonjs', '-e', bootstrap] };
}
export async function verifyWorkspace(root: string, executable: string, onProcess: (child: ChildProcess) => void, signal?: AbortSignal, options: VerificationOptions = {}, runtimeEnvironment?: NodeJS.ProcessEnv): Promise<TestReport> {
  const { launcher = sandboxCommand, ...overrides } = options;
  const limits = { timeoutMs: 120_000, maxOutputBytes: 2_000_000, ...overrides };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid verification limit: ${key}`);
  }
  const files = await applicationTestFiles(root, true);
  if (!files.length || !(await applicationTestFiles(root)).length) throw new Error('Pi did not produce any .test.js, .test.cjs, or .test.mjs files. No verification claim was made.');
  if (signal?.aborted) throw runAbortError(signal);
  const started = performance.now();
  const beforeHash = await sourceHash(root);
  if (signal?.aborted) throw runAbortError(signal);
  const args = [...(runtimeEnvironment ? ['--no-global-search-paths'] : []), '--test', '--test-reporter=' + registeredReporter, ...files.map(file => './' + file)];
  let command: VerificationCommand, home: string;
  try {
    command = await launcher(root, executable, args);
    // Never load a user's credentials/config or let workspace .codex settings replace this profile.
    home = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-verification-'));
  }
  catch (error) { throw new Error(sandboxFailure + ' ' + (error as Error).message, { cause: error }); }
  try {
    if (signal?.aborted) throw runAbortError(signal);
    const environment = Object.fromEntries(Object.entries(runProcessEnvironment({ ...runtimeEnvironment, PATH: runtimeEnvironment?.PATH ?? process.env.PATH, HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root,
      CODEX_HOME: home, ELECTRON_RUN_AS_NODE: '1', ELECTRON_NO_ASAR: '1', SystemRoot: process.env.SystemRoot })).filter(([, value]) => value !== undefined));
    const child = spawn(command.runner, command.args, {
      cwd: root, env: environment,
      stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true
    });
    let closed = false;
    const close = new Promise<void>(resolve => { child.once('close', () => { closed = true; resolve(); }); });
    const stop = async () => {
      if (!child.pid) return;
      if (process.platform === 'win32') {
        if (!closed) {
          // Node's child.kill() only ends the coordinator on Windows, leaving its workers.
          const taskkill = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
          await new Promise<void>((resolve, reject) => execFile(taskkill, ['/PID', String(child.pid), '/T', '/F'],
            { windowsHide: true, timeout: 5000, maxBuffer: 64 * 1024 }, error => {
              if (error && !closed) reject(new Error('Could not terminate the verification process tree: ' + error.message));
              else resolve();
            }));
        }
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([close, new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Verification process did not close after termination.')), 5000);
        })]);
      } finally { clearTimeout(timer); }
    };
    let output = '', outputBytes = 0, timedOut = false, overflow = false;
    let interrupt!: () => void;
    const interrupted = new Promise<null>(resolve => { interrupt = () => resolve(null); });
    // Register completion and cancellation before exposing the child to a caller.
    const completed = new Promise<{ code: number | null; error?: Error }>(resolve => {
      child.once('error', error => resolve({ code: null, error: new Error(sandboxFailure + ' ' + error.message, { cause: error }) }));
      child.once('close', code => resolve({ code }));
    });
    const collect = (chunk: Buffer) => {
      const remaining = Math.max(0, limits.maxOutputBytes - outputBytes);
      output += chunk.subarray(0, remaining).toString(); outputBytes += chunk.length;
      if (outputBytes > limits.maxOutputBytes) { overflow = true; interrupt(); }
    };
    child.stdout?.on('data', collect); child.stderr?.on('data', collect);
    const timer = setTimeout(() => { timedOut = true; interrupt(); }, limits.timeoutMs);
    signal?.addEventListener('abort', interrupt, { once: true });
    if (signal?.aborted) interrupt();
    let exitCode: number | null;
    try {
      onProcess(child);
      const result = await Promise.race([completed, interrupted]);
      if (result?.error) throw result.error;
      exitCode = result?.code ?? null;
    }
    finally {
      clearTimeout(timer); signal?.removeEventListener('abort', interrupt);
      try { await stop(); }
      catch (error) { throw new VerificationShutdownError(error); }
      finally { child.stdout?.destroy(); child.stderr?.destroy(); }
    }
    if (signal?.aborted) throw runAbortError(signal);
    if (timedOut) output += `\nVerification exceeded the ${limits.timeoutMs / 1000}-second limit.`;
    if (overflow) output += '\nVerification exceeded the output limit.';
    // Limits before the trusted bootstrap starts are sandbox startup failures, not test results.
    // Keep their bounded diagnostics and never attempt another, unsandboxed launch.
    if (!output.includes(command.ready)) throw new Error(sandboxStartupFailure(output));
    output = output.replace(command.ready, '');
    const evidence = await registeredEvidence(root, files, output);
    output = evidence.output;
    const hash = await sourceHash(root);
    if (signal?.aborted) throw runAbortError(signal);
    if (beforeHash !== hash) throw new Error('Source files changed during verification. Run verification again before review.');
    return { time: new Date().toISOString(), command: command.command,
      portableCommand: portableTestCommand(files), provenance: { runner: command.runner, args: [...command.args], cwd: root, environment },
      exitCode: timedOut || overflow ? null : evidence.problem ? 1 : exitCode,
      total: evidence.total, passed: evidence.passed, failed: evidence.failed, skipped: evidence.skipped,
      registeredTests: evidence.registeredTests, output, durationMs: Math.round(performance.now() - started), sourceHash: hash };
  } finally { await fs.rm(home, { recursive: true, force: true }); }
}
