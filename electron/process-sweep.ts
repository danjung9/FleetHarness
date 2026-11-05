import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let windowsAccess: typeof import('./windows-process-scan.js') | undefined;
function windowsProcesses() {
  windowsAccess ??= require('./windows-process-scan.js') as typeof import('./windows-process-scan.js');
  windowsAccess.initializeWindowsProcessJob();
  return windowsAccess;
}

const current = new AsyncLocalStorage<RunProcessSweep>();
type Identity = { pid: number; started: string };
type SweepOptions = {
  marker?: string;
  scan?: (marker: string) => Promise<Identity[]>;
  signal?: (pid: number, signal: NodeJS.Signals) => void;
  graceMs?: number;
  killMs?: number;
};
const markerKey = 'APPYARD_RUN_PROCESS';
const vanished = (error: unknown) => ['ENOENT', 'ESRCH'].includes((error as NodeJS.ErrnoException).code ?? '');
class SnapshotChanged extends Error {}

// Strip the complete argv using a separate, non-environment ps snapshot. Looking
// for a marker anywhere in `ps e` would also match an unrelated process's argv.
// Environment and command strings stay in memory and never enter logs/errors.
export function markedPsProcesses(plain: string, expanded: string, marker: string, confirmedPlain = plain): Identity[] {
  const parse = (body: string) => {
    const rows = new Map<number, { started: string; state: string; command: string }>();
    let previous: { started: string; state: string; command: string } | undefined;
    for (const line of body.replace(/\n$/, '').split('\n')) {
      const match = line.match(/^\s*(\d+)\s+(\w{3}\s+\w{3}\s+\d+\s+\d\d:\d\d:\d\d\s+\d{4})\s+(\S+)\s+(.*)$/);
      if (match) {
        previous = { started: match[2], state: match[3], command: match[4] };
        rows.set(Number(match[1]), previous);
      } else if (previous) previous.command += '\n' + line;
    }
    if (!rows.size) throw new Error('Process inspection returned no identities.');
    return rows;
  };
  const before = parse(plain), after = parse(expanded), confirmed = parse(confirmedPlain), result: Identity[] = [];
  for (const [pid, row] of after) {
    const old = before.get(pid);
    if (row.state.startsWith('Z')) continue;
    const possibleMarker = row.command.split(/\s+/).includes(markerKey + '=' + marker);
    const uncertain = () => { if (possibleMarker) throw new SnapshotChanged('Run process identity changed during inspection.'); };
    if (!old || old.started !== row.started) { uncertain(); continue; }
    if (confirmed.get(pid)?.command !== old.command || confirmed.get(pid)?.started !== old.started) { uncertain(); continue; }
    if (!row.command.startsWith(old.command + ' ')) { uncertain(); continue; }
    const environment = row.command.slice(old.command.length).trimStart();
    if (!/^[A-Za-z_][A-Za-z0-9_]*=/.test(environment)) { uncertain(); continue; }
    if (environment.split(/\s+/).includes(markerKey + '=' + marker)) result.push({ pid, started: row.started });
  }
  return result;
}

async function ps(environment: boolean) {
  return new Promise<string>((resolve, reject) => {
    // A BSD-style first word (ww, eww) puts macOS ps in its legacy parser, where -u is a
    // bare flag and everything after it is refused. -U selects by user in both parsers.
    execFile('/bin/ps', [...(environment ? ['eww'] : ['ww']), '-U', String(process.getuid!()), '-o', 'pid=,lstart=,stat=,command='],
      { env: { ...process.env, LC_ALL: 'C' }, encoding: 'utf8', timeout: 5000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
        // execFile errors can contain process environments. Do not forward them.
        if (error) reject(new Error('Cannot inspect the current user\'s processes.'));
        else resolve(stdout);
      });
  });
}

async function scan(marker: string): Promise<Identity[]> {
  if (process.platform === 'win32') return windowsProcesses().windowsRunProcesses(marker);
  if (process.platform === 'darwin') {
    return markedPsProcesses(await ps(false), await ps(true), marker, await ps(false));
  }
  if (process.platform !== 'linux') throw new Error('Run process inspection is unavailable on this platform.');
  const result: Identity[] = [];
  for (const name of await fs.readdir('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try {
      if ((await fs.stat('/proc/' + name)).uid !== process.getuid!()) continue;
      const stat = await fs.readFile('/proc/' + name + '/stat', 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
      if (fields[0] === 'Z') continue;
      const env = await fs.readFile('/proc/' + name + '/environ', 'utf8');
      if (env.split('\0').includes(markerKey + '=' + marker)) result.push({ pid: Number(name), started: fields[19] });
    } catch (error) {
      if (!vanished(error)) throw new Error('Cannot inspect user process ' + name + '.');
    }
  }
  return result;
}

/** Tags only this run's launch environments, never the application's global env.
 * This is cleanup, not containment: deliberately clearing the inherited marker
 * needs an OS worker boundary. Unsupported inspection fails closed at launch.
 */
export class RunProcessSweep {
  readonly marker: string;
  private used = false;
  private closed = false;
  private stopping?: Promise<void>;
  constructor(private options: SweepOptions = {}) {
    this.marker = options.marker ?? randomUUID();
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(this.marker)) throw new Error('Invalid saved run process marker.');
    if (process.platform === 'win32' && !options.scan) windowsProcesses();
    this.used = options.marker !== undefined;
  }
  run<T>(work: () => T): T { return current.run(this, work); }
  environment(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    if (this.closed) throw new Error('Run process scope is closed; no further processes may start.');
    if (!this.options.scan && !['darwin', 'linux', 'win32'].includes(process.platform)) throw new Error('Run process inspection is unavailable on this platform; process launch refused.');
    if (process.platform === 'win32' && !this.options.scan) windowsProcesses();
    this.used = true;
    return { ...base, [markerKey]: this.marker };
  }
  stop(): Promise<void> {
    this.closed = true;
    return this.stopping ??= this.sweep();
  }
  private async sweep() {
    if (!this.used) return;
    let empty = 0;
    const inspect = async () => {
      try { return await (this.options.scan ?? scan)(this.marker); }
      // A timeout or changing snapshot is inconclusive. Retry within the same
      // deadline, and never count snapshots across an inspection failure.
      catch { empty = 0; return undefined; }
    };
    const windows = process.platform === 'win32' && !this.options.signal && !this.options.scan
      ? windowsProcesses() : undefined;
    const signal = this.options.signal ?? ((pid, signal) => { process.kill(pid, signal); });
    const started = performance.now(), grace = this.options.graceMs ?? 400, deadline = grace + (this.options.killMs ?? 5000);
    do {
      const remaining = await inspect();
      if (remaining && !remaining.length) { if (++empty === 2) return; }
      else if (remaining) {
        empty = 0;
        for (const target of remaining) {
          if (target.pid <= 1 || target.pid === process.pid) throw new Error('Process cleanup refused an invalid run process identity.');
          // Recheck both ownership and start identity immediately before each
          // signal. Never signal a process group or a saved, unverified PID.
          const fresh = await inspect();
          if (!fresh) break;
          if (!fresh.some(p => p.pid === target.pid && p.started === target.started)) continue;
          try {
            if (windows) windows.windowsSignalRunProcess(this.marker, target);
            else signal(target.pid, performance.now() - started < grace ? 'SIGTERM' : 'SIGKILL');
          }
          catch (error) { if (!vanished(error)) { /* Verify again and report survivors below. */ } }
        }
      }
      await delay(50);
    } while (performance.now() - started <= deadline);
    const remaining = await inspect();
    if (!remaining) throw new Error('Process cleanup could not be confirmed: cannot inspect this run\'s processes. Check the run and use the operator shutdown procedure.');
    // Two consecutive empty snapshots are verified quiescence, even when slow inspection used
    // the whole deadline. A single empty snapshot at the deadline is not.
    if (!remaining.length && empty) return;
    throw new Error('Process cleanup could not be confirmed' + (remaining.length ? ': run PIDs ' + remaining.map(p => p.pid).join(', ') + ' remain.' : ': processes did not settle before the deadline.') + ' Use the operator shutdown procedure.');
  }
}
export function runProcessEnvironment(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  // Unscoped account/model sessions also launch subprocesses. Establish the app
  // job before those can become parents of later run work.
  if (process.platform === 'win32') windowsProcesses();
  return current.getStore()?.environment(base) ?? base;
}
