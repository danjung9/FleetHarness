import { spawn, type ChildProcess } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { listArtifacts, sourceHash } from './storage.js';
import type { TestReport } from '../shared/types.js';

export function summarizeTap(output: string) {
  const count = (name: string) => Number(output.match(new RegExp('^# ' + name + ' (\\d+)', 'm'))?.[1] ?? 0);
  return { total: count('tests'), passed: count('pass'), failed: count('fail'), skipped: count('skipped') + count('todo') };
}
export async function verifyWorkspace(root: string, executable: string, onProcess: (child: ChildProcess) => void, signal?: AbortSignal): Promise<TestReport> {
  const files = (await listArtifacts(root)).filter(f => /(?:^|\/)[^/]+\.(?:test|spec)\.(?:cjs|mjs|js)$/.test(f.path)).map(f => f.path);
  if (!files.length) throw new Error('Pi did not produce any .test.js, .test.cjs, or .test.mjs files. No verification claim was made.');
  if (signal?.aborted) throw new Error('Run stopped.');
  const started = performance.now();
  const beforeHash = await sourceHash(root);
  const child = spawn(executable, ['--test', '--test-reporter=tap', ...files], {
    cwd: root, env: { PATH: process.env.PATH, HOME: root, TMPDIR: process.env.TMPDIR, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32'
  });
  onProcess(child);
  const stop = () => { try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {} };
  signal?.addEventListener('abort', stop, { once: true });
  let output = '', timedOut = false, overflow = false;
  const collect = (chunk: Buffer) => { output += chunk.toString(); if (output.length > 2_000_000) { overflow = true; output = output.slice(0, 2_000_000); stop(); } };
  child.stdout?.on('data', collect); child.stderr?.on('data', collect);
  const timer = setTimeout(() => { timedOut = true; stop(); }, 120_000);
  let exitCode: number | null;
  try { exitCode = await new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('close', resolve); }); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', stop); }
  if (signal?.aborted) throw new Error('Run stopped.');
  if (timedOut) output += '\nVerification exceeded the 120-second limit.';
  if (overflow) output += '\nVerification exceeded the output limit.';
  const hash = await sourceHash(root);
  if (beforeHash !== hash) throw new Error('Source files changed during verification. Run verification again before review.');
  return { time: new Date().toISOString(), command: 'node --test --test-reporter=tap ' + files.join(' '),
    exitCode, ...summarizeTap(output), output, durationMs: Math.round(performance.now() - started), sourceHash: hash };
}
export function reportPassed(report?: TestReport) {
  return !!report && report.exitCode === 0 && report.total > 0 && report.passed > 0 && report.failed === 0 && report.skipped === 0 && report.passed === report.total;
}
