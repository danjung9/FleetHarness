import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { Store } from '../dist-electron/electron/storage.js';
import { createCodexSession } from '../dist-electron/electron/codex-session.js';
import { RunProcessSweep, runProcessEnvironment, markedPsProcesses } from '../dist-electron/electron/process-sweep.js';

// Real detached processes and OS signals; discovery is injected because the seat
// sandbox prohibits ps. Native discovery and the GUI fixture belong to the overseer.
async function worker(t, env, ignoreTerm = false, commandLine = []) {
  const child = spawn(process.execPath, ['-e', `
    if (${ignoreTerm}) process.on('SIGTERM', () => {});
    process.chdir('/');
    let tick = 0;
    const timer = setInterval(() => process.send({ tick: ++tick }), 20);
    process.on('disconnect', () => { clearInterval(timer); process.exit(); });
    setTimeout(() => process.exit(), 15000).unref();
  `, ...commandLine], { detached: true, env, windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  let ticks = 0, exited = false;
  child.on('message', message => { ticks = message.tick; });
  const exit = once(child, 'exit').then(() => { exited = true; });
  t.after(async () => { if (!exited) child.kill('SIGKILL'); await exit; });
  await once(child, 'message');
  return { child, env, get ticks() { return ticks; }, get exited() { return exited; }, exit };
}

test('a fake run sweeps its detached job after cwd changes and leaves an unrelated job alive', { timeout: 10000 }, async t => {
  const jobs = [];
  const scope = new RunProcessSweep({
    scan: async marker => jobs.filter(job => !job.exited && job.env.APPYARD_RUN_PROCESS === marker)
      .map(job => ({ pid: job.child.pid, started: String(job.child.pid) })),
  });
  const owned = await worker(t, scope.run(() => runProcessEnvironment({ ...process.env }))),
    unrelated = await worker(t, { ...process.env });
  jobs.push(owned, unrelated);
  const before = unrelated.ticks;
  await scope.stop();
  await delay(80);
  assert.equal(owned.exited, true, 'detached process survived fake run cleanup');
  assert.equal(unrelated.exited, false, 'sweep ended a process outside the run');
  assert.ok(unrelated.ticks > before, 'unrelated process heartbeat must keep advancing');
  assert.throws(() => scope.run(() => runProcessEnvironment()), /closed/);
});

// The fixtures above inject discovery. This one uses the native process environment, which every
// actual run depends on, and only stands aside where the host forbids running ps at all.
test('native discovery sweeps a marked job and leaves an unmarked job alive', { timeout: 20000 }, async t => {
  if (!['darwin', 'linux', 'win32'].includes(process.platform)) return t.skip('Native discovery requires macOS, Linux, or Windows.');
  if (process.platform === 'darwin') {
    const allowed = await new Promise(resolve => execFile('/bin/ps', ['-p', String(process.pid)], error => resolve(!error)));
    if (!allowed) return t.skip('This host forbids running ps.');
  }
  const scope = new RunProcessSweep();
  const owned = await worker(t, scope.run(() => runProcessEnvironment({ ...process.env }))),
    unrelated = await worker(t, { ...process.env }),
    spoofed = await worker(t, { ...process.env }, false, ['APPYARD_RUN_PROCESS=' + scope.marker]);
  const before = unrelated.ticks;
  await scope.stop();
  await delay(80);
  assert.equal(owned.exited, true, 'native discovery missed the marked job');
  assert.equal(unrelated.exited, false, 'native discovery ended an unmarked job');
  assert.equal(spoofed.exited, false, 'a command-line marker must not establish environment ownership');
  assert.ok(unrelated.ticks > before, 'unrelated process heartbeat must keep advancing');
});

test('a clean sweep is not refused when slow inspection uses the whole deadline', async () => {
  const slow = () => delay(60).then(() => []);
  const scope = new RunProcessSweep({ graceMs: 1, killMs: 10, scan: slow });
  scope.run(() => runProcessEnvironment());
  await scope.stop();
});

test('a single empty snapshot at the deadline is still refused', async () => {
  let scans = 0;
  const scope = new RunProcessSweep({ graceMs: 1, killMs: 10, signal: () => {},
    scan: async () => { await delay(30); return ++scans < 3 ? [{ pid: 987654, started: 'fixture' }] : []; } });
  scope.run(() => runProcessEnvironment());
  await assert.rejects(scope.stop(), /did not settle/);
});

for (const failure of ['ps timeout', 'changed snapshot']) test(`${failure} is retried before confirming two clean snapshots`, async () => {
  let scans = 0;
  const signals = [];
  const scope = new RunProcessSweep({
    scan: async marker => {
      if (++scans === 1) {
        if (failure === 'ps timeout') throw new Error('synthetic ps timeout');
        const row = command => `987654 Wed Nov  4 16:08:30 2026 Ss ${command}\n`;
        return markedPsProcesses(row('node worker'), row('node worker APPYARD_RUN_PROCESS=' + marker), marker, row('node changed'));
      }
      return [];
    },
    signal: (...args) => signals.push(args),
  });
  scope.environment({});
  await scope.stop();
  assert.equal(scans, 3, 'Cleanup needs two clean snapshots after the failed inspection');
  assert.deepEqual(signals, []);
});

test('an inspection failure resets the consecutive clean snapshot count', async () => {
  let scans = 0;
  const scope = new RunProcessSweep({ scan: async () => {
    if (++scans === 2) throw new Error('synthetic inspection failure');
    return [];
  } });
  scope.environment({});
  await scope.stop();
  assert.equal(scans, 4, 'Clean snapshots separated by a failed inspection cannot confirm cleanup');
});

test('a transient identity recheck failure requires fresh ownership before any signal', async () => {
  let scans = 0, alive = true;
  const signals = [];
  const scope = new RunProcessSweep({
    scan: async () => {
      if (++scans === 2) throw new Error('synthetic recheck timeout');
      return alive ? [{ pid: 987654, started: 'fixture' }] : [];
    },
    signal: (pid, signal) => { signals.push({ pid, signal, scans }); alive = false; },
  });
  scope.environment({});
  await scope.stop();
  assert.equal(signals.length, 1);
  assert.equal(signals[0].pid, 987654);
  assert.equal(signals[0].scans, 4, 'The failed ownership recheck must never authorize a signal');
  assert.equal(scans, 6, 'Two clean snapshots are required after the signal');
});

test('inspection failure at the deadline fails closed even after an empty snapshot', async () => {
  for (const firstEmpty of [false, true]) {
    let scans = 0;
    const scope = new RunProcessSweep({ graceMs: 1, killMs: 10, scan: async () => {
      scans++;
      if (scans === 1) {
        await delay(30);
        if (firstEmpty) return [];
      }
      throw new Error('synthetic private environment');
    } });
    scope.environment({});
    await assert.rejects(scope.stop(), error => {
      assert.match(error.message, /cleanup could not be confirmed: cannot inspect/);
      assert.doesNotMatch(error.message, /synthetic private environment/);
      return true;
    });
    assert.equal(scans, 2, 'The failed first inspection must be retried before giving up');
  }
});

test('a detached job that ignores TERM is killed and repeated Stop shares cleanup', { timeout: 10000 }, async t => {
  let job;
  const signals = [];
  const scope = new RunProcessSweep({ graceMs: 60, killMs: 800,
    scan: async () => job && !job.exited ? [{ pid: job.child.pid, started: 'fixture' }] : [],
      signal: (pid, signal) => {
        signals.push(signal);
        // Windows terminates even with a JS SIGTERM handler. Model refusal at
        // this injected signal boundary so escalation still kills a real worker.
        if (process.platform !== 'win32' || signal !== 'SIGTERM') process.kill(pid, signal);
      },
  });
  job = await worker(t, scope.run(() => runProcessEnvironment()), true);
  const stopping = scope.stop();
  assert.equal(scope.stop(), stopping);
  await stopping;
  assert.ok(job.exited);
  assert.ok(signals.includes('SIGTERM'));
  assert.ok(signals.includes('SIGKILL'));
});

test('a denied signal or denied inspection cannot claim successful cleanup', async () => {
  for (const deniedScan of [false, true]) {
    const scope = new RunProcessSweep({ graceMs: 1, killMs: 10,
      scan: async () => {
        if (deniedScan) throw new Error('fixture denied');
        return [{ pid: 987654, started: 'fixture' }];
      },
      signal: () => { throw Object.assign(new Error('fixture denied'), { code: 'EPERM' }); },
    });
    scope.run(() => runProcessEnvironment());
    await assert.rejects(scope.stop(), /cleanup could not be confirmed/);
    assert.throws(() => scope.run(() => runProcessEnvironment()), /closed/);
  }
});

for (const [change, fresh] of [
  ['PID reuse', [{ pid: 987654, started: 'new' }]],
  ['lost run ownership', []],
]) test(`${change} between discovery and signal is never targeted`, async () => {
  let scans = 0;
  const signalAttempts = [];
  const scope = new RunProcessSweep({
    scan: async () => ++scans === 1 ? [{ pid: 987654, started: 'old' }]
      : scans === 2 ? fresh : [],
    signal: (pid, signal) => { signalAttempts.push({ pid, signal }); },
  });
  scope.run(() => runProcessEnvironment());
  await scope.stop();
  // Signal errors are caught by the sweep, so assert outside its callback.
  assert.deepEqual(signalAttempts, [], `${change} must prevent every signal attempt`);
});

test('concurrent asynchronous runs keep unique markers without mutating the host environment', async () => {
  const original = process.env.APPYARD_RUN_PROCESS;
  const one = new RunProcessSweep({ scan: async () => [] }), two = new RunProcessSweep({ scan: async () => [] });
  const [a, b] = await Promise.all([one, two].map(scope => scope.run(async () => {
    const first = runProcessEnvironment({ PATH: 'synthetic' });
    await delay(10);
    assert.deepEqual(runProcessEnvironment({ PATH: 'synthetic' }), first);
    assert.equal(process.env.APPYARD_RUN_PROCESS, original);
    return first.APPYARD_RUN_PROCESS;
  })));
  assert.notEqual(a, b);
  await Promise.all([one.stop(), two.stop()]);
  assert.equal(runProcessEnvironment(), process.env);
});

test('macOS discovery matches only environment markers with the same start identity', () => {
  const row = (pid, command, started = 'Wed Nov  4 16:08:30 2026') => `${pid} ${started} Ss ${command}\n`;
  const marker = 'synthetic-run';
  const plain = row(101, 'node worker') + row(102, 'node APPYARD_RUN_PROCESS=' + marker)
    + row(103, 'node other-run');
  const expanded = row(101, 'node worker PATH=/bin APPYARD_RUN_PROCESS=' + marker)
    + row(102, 'node APPYARD_RUN_PROCESS=' + marker + ' PATH=/bin')
    + row(103, 'node other-run APPYARD_RUN_PROCESS=' + marker + '-other');
  assert.deepEqual(markedPsProcesses(plain, expanded, marker).map(p => p.pid), [101]);
  assert.throws(() => markedPsProcesses(row(104, 'node worker'),
    row(104, 'node worker APPYARD_RUN_PROCESS=' + marker, 'Wed Nov  4 16:08:31 2026'), marker), /identity changed/);
  assert.throws(() => markedPsProcesses(row(105, 'node worker'),
    row(105, 'node worker changed-argv APPYARD_RUN_PROCESS=' + marker), marker), /identity changed/);
  assert.throws(() => markedPsProcesses('', '', marker), /no identities/);
  const multiline = 'node -e first-line\nsecond-line';
  assert.deepEqual(markedPsProcesses(row(106, multiline), row(106, multiline + ' APPYARD_RUN_PROCESS=' + marker), marker).map(p => p.pid), [106]);
  assert.throws(() => markedPsProcesses(row(107, 'node worker'), row(107, 'node worker APPYARD_RUN_PROCESS=' + marker), marker,
    row(107, 'node different-worker')), /identity changed/);
});

for (const engine of ['pi', 'codex']) for (const outcome of ['stop', 'failure', 'cleanup-failure']) {
  // Failed cleanup also runs startup recovery, which can spend its full retry
  // window after the session's five-second abort allowance.
  test(`${engine}: ${outcome} waits for cleanup and persists the truthful outcome`, { timeout: outcome === 'cleanup-failure' ? 20000 : 10000 }, async t => {
    await fs.mkdir('.tmp', { recursive: true });
    const root = await fs.mkdtemp(path.resolve('.tmp/sweep-run-'));
    const store = new Store(root); await store.init();
    store.state.settings = { backend: engine, provider: engine === 'codex' ? 'chatgpt' : 'fixture', model: 'fixture', rememberKey: false };
    const project = store.state.projects[0];
    const jobs = [];
    let entered;
    const ready = new Promise(resolve => { entered = resolve; });
    let owned;
    const begin = async env => {
      assert.ok(env.APPYARD_RUN_PROCESS, 'the engine did not pass the run marker to its shell');
      owned = await worker(t, { ...process.env, ...env }); jobs.push(owned);
      entered();
      if (outcome === 'failure') throw new Error('synthetic stage failure');
    };
    const never = () => new Promise(() => {});
    let prematureStatus = false;
    const backend = new FleetBackend(store, process.execPath, () => {
      if (['stopped', 'review'].includes(project.status) && owned && !owned.exited) prematureStatus = true;
    }, path.resolve('.'), {
      codex: { home: root, models: [{ id: 'fixture', configured: true }], async refresh() {} },
      processSweep: () => new RunProcessSweep({ graceMs: 1, killMs: outcome === 'cleanup-failure' ? 20 : 500,
        scan: async marker => jobs.filter(j => !j.exited && j.env.APPYARD_RUN_PROCESS === marker)
          .map(j => ({ pid: j.child.pid, started: 'fixture' })),
        ...(outcome === 'cleanup-failure' ? { signal: () => { throw Object.assign(new Error('denied'), { code: 'EPERM' }); } } : {}),
      }),
      createSession: async ({ customTools }) => ({
        session: {
          subscribe: () => () => {}, abort() {}, dispose() {},
          async prompt() {
            const bash = customTools.find(tool => tool.name === 'bash');
            const result = await bash.execute('marker-fixture', { command: 'printf "%s" "$APPYARD_RUN_PROCESS"' });
            await begin({ APPYARD_RUN_PROCESS: result.content.find(c => c.type === 'text').text });
            await never();
          },
        },
      }),
      createCodexSession: options => {
        let env;
        const rpc = {
          async initialize() {}, subscribe() {}, onClose() {}, dispose() {}, send() {},
          async request(method, params) {
            if (method === 'account/read') return { account: { type: 'chatgpt' } };
            if (method === 'thread/start') { env = params.config['shell_environment_policy.set']; return { thread: { id: 'fixture-thread' } }; }
            if (method === 'turn/start') { await begin(env); return { turn: { id: 'fixture-turn' } }; }
            return {};
          },
        };
        return createCodexSession({ ...options, launch: () => rpc });
      },
    });
    backend.runtime = { getModel: () => ({}), hasConfiguredAuth: () => true };
    t.after(async () => { await backend.stopAll(); await fs.rm(root, { recursive: true, force: true }); });
    const unrelated = await worker(t, { ...process.env }); jobs.push(unrelated);
    await backend.start(project.id);
    const done = backend.active.get(project.id).done;
    await ready;
    if (outcome !== 'failure') await backend.stop(project.id);
    await done;
    assert.equal(prematureStatus, false);
    assert.equal(project.status, outcome === 'stop' ? 'stopped' : 'failed');
    assert.equal(owned.exited, outcome !== 'cleanup-failure');
    assert.equal(unrelated.exited, false);
    assert.equal(backend.active.size, 0);
    if (outcome === 'cleanup-failure') {
      assert.match(project.error, /processes may still be active/);
      assert.doesNotMatch(project.error, /Run stopped by you/);
    } else assert.doesNotMatch(project.error ?? '', /cleanup could not be confirmed/);
    const restored = new Store(root); await restored.init();
    const recovered = restored.project(project.id);
    if (outcome === 'cleanup-failure' && recovered.processScope.cleanup === 'confirmed') {
      assert.equal(recovered.status, 'stopped');
      assert.equal(owned.exited, true, 'Startup claimed cleanup while the worker remained live');
      assert.match(recovered.error, /processes have been stopped/);
    } else {
      assert.equal(recovered.status, project.status);
      assert.equal(recovered.error, project.error);
      assert.equal(recovered.processScope.cleanup, project.processScope.cleanup);
    }
  });
}
