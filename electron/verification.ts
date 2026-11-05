import { redactSecrets } from './secrets.js';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { listArtifacts, sourceHash } from './storage.js';
import type { TestReport } from '../shared/types.js';
import { runProcessEnvironment } from './process-sweep.js';
export { reportPassed } from '../shared/verification.js';

export interface VerificationLimits { timeoutMs: number; maxOutputBytes: number }
export interface VerificationCommand { runner: string; args: string[]; ready: string; command: string }
// Trusted host/test dependency only. Production callers omit this and launch the runtime directly.
export type VerificationLauncher = (root: string, executable: string, testArgs: string[]) => VerificationCommand | Promise<VerificationCommand>;
export interface VerificationOptions extends Partial<VerificationLimits> { launcher?: VerificationLauncher }
export class VerificationShutdownError extends Error {
  constructor(cause: unknown) {
    super('Verification shutdown was not confirmed. Recovery in this workspace is blocked. An operator must stop remaining workers before starting a new run in a fresh workspace.', { cause });
    this.name = 'VerificationShutdownError';
  }
}
export async function applicationTestFiles(root: string, includeEmpty = false) {
  return (await listArtifacts(root)).filter(f => (includeEmpty || f.size > 0) && !/^\.fleet(?:\/|\\)/.test(f.path) && /(?:^|\/)[^/]+\.(?:test|spec)\.(?:cjs|mjs|js)$/.test(f.path)).map(f => f.path);
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
const runtimeFailure = 'Could not start the verification runtime.';

async function runtimeCommand(root: string, executable: string, testArgs: string[]) {
  const ready = 'appyard-verification-ready-' + randomUUID() + '\n';
  // The host bootstrap distinguishes runtime startup from application test failure.
  const bootstrap = `process.stdout.write(${JSON.stringify(ready)});const child=require('node:child_process').spawn(process.execPath,${JSON.stringify(testArgs)},{stdio:'inherit'});child.once('error',e=>{console.error('Could not start Node tests: '+e.code);process.exitCode=1});child.once('exit',code=>{process.exitCode=code??1});`;
  return { runner: executable, args: ['--input-type=commonjs', '-e', bootstrap], ready, command: 'node ' + testArgs.map(arg => JSON.stringify(arg)).join(' ') };
}
export async function verifyWorkspace(root: string, executable: string, onProcess: (child: ChildProcess) => void, signal?: AbortSignal, options: VerificationOptions = {}, runtimeEnvironment?: NodeJS.ProcessEnv): Promise<TestReport> {
  const { launcher = runtimeCommand, ...overrides } = options;
  const limits = { timeoutMs: 120_000, maxOutputBytes: 2_000_000, ...overrides };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid verification limit: ${key}`);
  }
  const files = await applicationTestFiles(root, true);
  if (!files.length || !(await applicationTestFiles(root)).length) throw new Error('Pi did not produce any .test.js, .test.cjs, or .test.mjs files. No verification claim was made.');
  if (signal?.aborted) throw new Error('Run stopped.');
  const started = performance.now();
  const beforeHash = await sourceHash(root);
  if (signal?.aborted) throw new Error('Run stopped.');
  const args = [...(runtimeEnvironment ? ['--no-global-search-paths'] : []), '--test', '--test-reporter=' + registeredReporter, ...files.map(file => './' + file)];
  let command: VerificationCommand, home: string;
  try {
    command = await launcher(root, executable, args);
    // Use a disposable home without account credentials.
    home = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-verification-'));
  }
  catch (error) { throw new Error(runtimeFailure + ' ' + (error as Error).message, { cause: error }); }
  try {
    if (signal?.aborted) throw new Error('Run stopped.');
    const environment = Object.fromEntries(Object.entries(runProcessEnvironment({ ...runtimeEnvironment, PATH: runtimeEnvironment?.PATH ?? process.env.PATH,
      HOME: runtimeEnvironment?.HOME ?? root, USERPROFILE: runtimeEnvironment?.HOME ?? root,
      TMPDIR: runtimeEnvironment?.TMPDIR ?? root, TEMP: runtimeEnvironment?.TEMP ?? root, TMP: runtimeEnvironment?.TMP ?? root,
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
      child.once('error', error => resolve({ code: null, error: new Error(runtimeFailure + ' ' + error.message, { cause: error }) }));
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
    if (signal?.aborted) throw new Error('Run stopped.');
    if (timedOut) output += `\nVerification exceeded the ${limits.timeoutMs / 1000}-second limit.`;
    if (overflow) output += '\nVerification exceeded the output limit.';
    // A missing bootstrap marker cannot count as a completed test run.
    if (!output.includes(command.ready)) throw new Error(runtimeFailure + '\n' + output);
    output = output.replace(command.ready, '');
    const evidence = await registeredEvidence(root, files, output);
    output = evidence.output;
    const hash = await sourceHash(root);
    if (signal?.aborted) throw new Error('Run stopped.');
    if (beforeHash !== hash) throw new Error('Source files changed during verification. Run verification again before review.');
    return { time: new Date().toISOString(), command: command.command,
      portableCommand: portableTestCommand(files), provenance: { runner: command.runner, args: [...command.args], cwd: root, environment: Object.fromEntries(Object.entries(environment).map(([key, value]) => [key, runtimeEnvironment?.[key] && !['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'ELECTRON_RUN_AS_NODE', 'LANG', 'PYTHONDONTWRITEBYTECODE', 'VIRTUAL_ENV'].includes(key) ? '[redacted]' : value])) },
      exitCode: timedOut || overflow ? null : evidence.problem ? 1 : exitCode,
      total: evidence.total, passed: evidence.passed, failed: evidence.failed, skipped: evidence.skipped,
      registeredTests: evidence.registeredTests, output: redactSecrets(output), durationMs: Math.round(performance.now() - started), sourceHash: hash };
  } finally { await fs.rm(home, { recursive: true, force: true }); }
}
