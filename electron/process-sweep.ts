import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';

const current = new AsyncLocalStorage<RunProcessSweep>();
type Identity = { pid: number; started: string; parentPid?: number; zombie?: boolean };
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
export function markedPsProcesses(plain: string, expanded: string, marker: string, confirmedPlain = plain, known: Identity[] = []): Identity[] {
  const parse = (body: string) => {
    const rows = new Map<number, { started: string; state: string; command: string; parentPid?: number }>();
    let previous: { started: string; state: string; command: string; parentPid?: number } | undefined;
    for (const line of body.replace(/\n$/, '').split('\n')) {
      const match = line.match(/^\s*(\d+)\s+(\w{3}\s+\w{3}\s+\d+\s+\d\d:\d\d:\d\d\s+\d{4})\s+(\S+)\s+(.*)$/);
      if (match) {
        const parent = match[4].match(/^(\d+)\s+(.*)$/);
        previous = { started: match[2], state: match[3], command: parent?.[2] ?? match[4], ...(parent ? { parentPid: Number(parent[1]) } : {}) };
        rows.set(Number(match[1]), previous);
      } else if (previous) previous.command += '\n' + line;
    }
    if (!rows.size) throw new Error('Process inspection returned no identities.');
    return rows;
  };
  const before = parse(plain), after = parse(expanded), confirmed = parse(confirmedPlain), owned = new Map<number, Identity>();
  const retain = (pid: number, row: ReturnType<typeof parse> extends Map<number, infer T> ? T : never) =>
    owned.set(pid, { pid, started: row.started, ...(row.parentPid === undefined ? {} : { parentPid: row.parentPid }), ...(row.state.startsWith('Z') ? { zombie: true } : {}) });
  // Chromium can clear its environment and dying children lose argv/environment.
  // Once owned, retain the exact start identity until it disappears, including zombies.
  for (const item of known) {
    const row = confirmed.get(item.pid);
    if (row?.started === item.started) retain(item.pid, row);
  }
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
    if (environment.split(/\s+/).includes(markerKey + '=' + marker)) retain(pid, confirmed.get(pid)!);
  }
  // Discover children before their parent exits, even when a browser rewrites its environment.
  for (let changed = true; changed;) {
    changed = false;
    for (const [pid, row] of confirmed) {
      if (owned.has(pid) || !row.parentPid || !owned.has(row.parentPid)) continue;
      if (before.get(pid)?.started !== row.started || after.get(pid)?.started !== row.started) throw new SnapshotChanged('Run process identity changed during inspection.');
      retain(pid, row); changed = true;
    }
  }
  return [...owned.values()];
}

async function ps(environment: boolean) {
  return new Promise<string>((resolve, reject) => {
    // A BSD-style first word (ww, eww) puts macOS ps in its legacy parser, where -u is a
    // bare flag and everything after it is refused. -U selects by user in both parsers.
    execFile('/bin/ps', [...(environment ? ['eww'] : ['ww']), '-U', String(process.getuid!()), '-o', 'pid=,lstart=,stat=,ppid=,command='],
      { env: { ...process.env, LC_ALL: 'C' }, encoding: 'utf8', timeout: 5000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => {
        // execFile errors can contain process environments. Do not forward them.
        if (error) reject(new Error('Cannot inspect the current user\'s processes.'));
        else resolve(stdout);
      });
  });
}

let inspecting: Promise<[string, string, string]> | undefined;
async function scan(marker: string, known: Identity[]): Promise<Identity[]> {
  if (process.platform === 'darwin') {
    // Concurrent runs share only an in-flight OS snapshot, never cached ownership.
    const snapshot = inspecting ??= (async (): Promise<[string, string, string]> => [await ps(false), await ps(true), await ps(false)])().finally(() => { inspecting = undefined; });
    const [plain, expanded, confirmed] = await snapshot;
    return markedPsProcesses(plain, expanded, marker, confirmed, known);
  }
  if (process.platform !== 'linux') throw new Error('Run process inspection is unavailable on this platform.');
  const result: Identity[] = [];
  for (const name of await fs.readdir('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try {
      if ((await fs.stat('/proc/' + name)).uid !== process.getuid!()) continue;
      const stat = await fs.readFile('/proc/' + name + '/stat', 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
      const owned = known.some(item => item.pid === Number(name) && item.started === fields[19]);
      if (fields[0] === 'Z') { if (owned) result.push({ pid: Number(name), started: fields[19], parentPid: Number(fields[1]), zombie: true }); continue; }
      const env = await fs.readFile('/proc/' + name + '/environ', 'utf8');
      if (owned || env.split('\0').includes(markerKey + '=' + marker)) result.push({ pid: Number(name), started: fields[19], parentPid: Number(fields[1]) });
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
  private cleanups: (() => Promise<void>)[] = [];
  constructor(private options: SweepOptions = {}) {
    this.marker = options.marker ?? randomUUID();
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(this.marker)) throw new Error('Invalid saved run process marker.');
    this.used = options.marker !== undefined;
  }
  run<T>(work: () => T): T { return current.run(this, work); }
  afterCleanup(work: () => Promise<void>) {
    if (this.closed) throw new Error('Run process scope is closed; no further processes may start.');
    this.cleanups.push(work);
  }
  environment(base: NodeJS.ProcessEnv) {
    if (this.closed) throw new Error('Run process scope is closed; no further processes may start.');
    if (!this.options.scan && !['darwin', 'linux'].includes(process.platform)) throw new Error('Run process inspection is unavailable on this platform; process launch refused.');
    this.used = true;
    return { ...base, [markerKey]: this.marker };
  }
  stop(): Promise<void> {
    this.closed = true;
    return this.stopping ??= (async () => {
      await this.sweep();
      for (const cleanup of this.cleanups) await cleanup();
      this.cleanups = [];
    })();
  }
  /** Prove this run's processes have ended without closing the scope, so a stage can start again. */
  quiesce(): Promise<void> { return this.closed ? this.stop() : this.sweep(); }
  private async sweep() {
    if (!this.used) return;
    let empty = 0;
    let known: Identity[] = [];
    const inspect = async () => {
      try { const found = this.options.scan ? await this.options.scan(this.marker) : await scan(this.marker, known); known = found; return found; }
      // A timeout or changing snapshot is inconclusive. Retry within the same
      // deadline, and never count snapshots across an inspection failure.
      catch { empty = 0; return undefined; }
    };
    const signal = this.options.signal ?? ((pid, signal) => { process.kill(pid, signal); });
    const started = performance.now(), grace = this.options.graceMs ?? 1000, deadline = grace + (this.options.killMs ?? 10000);
    do {
      const remaining = await inspect();
      if (remaining && !remaining.length) { if (++empty === 2) return; }
      else if (remaining) {
        empty = 0;
        // Let parents reap children. Killing the browser launcher first can leave
        // an orphan zombie that still has a PID after a falsely empty env scan.
        const leaves = remaining.filter(target => !target.zombie && !remaining.some(child => child.parentPid === target.pid));
        await Promise.all(leaves.map(async target => {
          if (target.pid <= 1 || target.pid === process.pid) throw new Error('Process cleanup refused an invalid run process identity.');
          // Recheck both ownership and start identity immediately before each
          // signal. The concurrent native rechecks share one in-flight snapshot
          // instead of launching three full ps calls per browser renderer.
          const fresh = await inspect();
          if (!fresh) return;
          if (!fresh.some(p => p.pid === target.pid && p.started === target.started && !p.zombie)
            || fresh.some(child => child.parentPid === target.pid)) return;
          try { signal(target.pid, performance.now() - started < grace ? 'SIGTERM' : 'SIGKILL'); }
          catch (error) { if (!vanished(error)) { /* Verify again and report survivors below. */ } }
        }));
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
export function runProcessEnvironment(base: NodeJS.ProcessEnv = process.env) {
  return current.getStore()?.environment(base) ?? base;
}
/** Keep helper runtime directories available to descendants until the run ends. */
export function deferRunCleanup(work: () => Promise<void>): boolean {
  const scope = current.getStore();
  if (!scope) return false;
  scope.afterCleanup(work);
  return true;
}
