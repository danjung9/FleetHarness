import { spawn, type ChildProcess } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { listArtifacts, sourceHash } from './storage.js';
import type { TestReport } from '../shared/types.js';
export { reportPassed } from '../shared/verification.js';

export interface VerificationLimits { timeoutMs: number; maxOutputBytes: number }
export async function applicationTestFiles(root: string) {
  return (await listArtifacts(root)).filter(f => f.size > 0 && !/^\.fleet(?:\/|\\)/.test(f.path) && /(?:^|\/)[^/]+\.(?:test|spec)\.(?:cjs|mjs|js)$/.test(f.path)).map(f => f.path);
}
export function summarizeTap(output: string) {
  const count = (name: string) => Number(output.match(new RegExp('^# ' + name + ' (\\d+)', 'm'))?.[1] ?? 0);
  return { total: count('tests'), passed: count('pass'), failed: count('fail'), skipped: count('skipped') + count('todo') };
}
export async function verifyWorkspace(root: string, executable: string, onProcess: (child: ChildProcess) => void, signal?: AbortSignal,
  options: Partial<VerificationLimits> = {}, environment?: NodeJS.ProcessEnv): Promise<TestReport> {
  const limits = { timeoutMs: 120_000, maxOutputBytes: 2_000_000, ...options };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid verification limit: ${key}`);
  }
  const files = await applicationTestFiles(root);
  if (!files.length) throw new Error('Pi did not produce any .test.js, .test.cjs, or .test.mjs files. No verification claim was made.');
  if (signal?.aborted) throw new Error('Run stopped.');
  const started = performance.now();
  const beforeHash = await sourceHash(root);
  if (signal?.aborted) throw new Error('Run stopped.');
  const args = [...(environment ? ['--no-global-search-paths'] : []), '--test', '--test-reporter=tap', ...files.map(file => './' + file)];
  const child = spawn(executable, args, {
    cwd: root, env: environment ? { ...environment, ELECTRON_RUN_AS_NODE: '1' }
      : { PATH: process.env.PATH, HOME: root, TMPDIR: process.env.TMPDIR, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32'
  });
  const stop = () => { try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {} };
  let output = '', outputBytes = 0, timedOut = false, overflow = false;
  let interrupt!: () => void;
  const interrupted = new Promise<null>(resolve => { interrupt = () => { stop(); resolve(null); }; });
  // Register completion and cancellation before exposing the child to a caller.
  const completed = new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
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
  try { onProcess(child); exitCode = await Promise.race([completed, interrupted]); }
  finally {
    clearTimeout(timer); signal?.removeEventListener('abort', interrupt);
    stop(); child.stdout?.destroy(); child.stderr?.destroy();
  }
  if (signal?.aborted) throw new Error('Run stopped.');
  if (timedOut) output += `\nVerification exceeded the ${limits.timeoutMs / 1000}-second limit.`;
  if (overflow) output += '\nVerification exceeded the output limit.';
  const hash = await sourceHash(root);
  if (signal?.aborted) throw new Error('Run stopped.');
  if (beforeHash !== hash) throw new Error('Source files changed during verification. Run verification again before review.');
  return { time: new Date().toISOString(), command: 'node ' + args.map(arg => JSON.stringify(arg)).join(' '),
    exitCode: timedOut || overflow ? null : exitCode, ...summarizeTap(output), output, durationMs: Math.round(performance.now() - started), sourceHash: hash };
}
