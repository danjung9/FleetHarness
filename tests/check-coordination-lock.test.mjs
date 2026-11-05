import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { acquireCheckLock, checkLockPath } from '../scripts/check-coordination.mjs';

const moduleUrl = new URL('../scripts/check-coordination.mjs', import.meta.url).href;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const execute = promisify(execFile);

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-check-coordination-test-'));
  const dependencyPath = path.join(directory, 'node_modules');
  await fs.mkdir(dependencyPath);
  const lockPath = await checkLockPath(dependencyPath);
  t.after(async () => {
    // This key belongs only to this test's random temporary dependency tree.
    await fs.rm(lockPath, { recursive: true, force: true });
    await fs.rm(directory, { recursive: true, force: true });
  });
  return { directory, dependencyPath, lockPath, artifactDirectory: path.join(directory, 'artifacts') };
}

function worker(t, fixture, extra = {}) {
  const source = `import { acquireCheckLock } from ${JSON.stringify(moduleUrl)};
    try {
      const lock = await acquireCheckLock({ ...${JSON.stringify({ dependencyPath: fixture.dependencyPath,
        artifactDirectory: fixture.artifactDirectory, timeoutMs: 5000, pollMs: 15, ...extra })},
        onWaiting: record => process.send({ type: 'waiting', record }) });
      process.send({ type: 'acquired', record: lock.record });
      process.once('message', async message => {
        if (message !== 'release') return;
        try { await lock.release(); process.send({ type: 'released' }); }
        catch (error) { process.send({ type: 'error', message: error.message, code: error.code }); process.exitCode = 1; }
        process.disconnect();
      });
    } catch (error) {
      process.send({ type: 'error', message: error.message, code: error.code });
      process.exitCode = 1; process.disconnect();
    }`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', source], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const messages = [], waiters = new Set();
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  child.on('message', message => { messages.push(message); for (const notify of waiters) notify(); });
  const exit = once(child, 'exit');
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); await exit; });
  return { child, messages, exit, async message(type, timeoutMs = 6000) {
    let timer, notify;
    try {
      return await Promise.race([
        new Promise(resolve => {
          notify = () => { const found = messages.find(message => message.type === type); if (found) resolve(found); };
          waiters.add(notify); notify();
        }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Worker ${child.pid} did not send ${type}: ${JSON.stringify(messages)} ${output}`)), timeoutMs); })
      ]);
    } finally { clearTimeout(timer); waiters.delete(notify); }
  } };
}

test('canonical dependency paths coordinate original and symlinked snapshot roots', async t => {
  const f = await fixture(t);
  const snapshot = path.join(f.directory, 'private-snapshot');
  await fs.mkdir(snapshot);
  const linked = path.join(snapshot, 'node_modules');
  await fs.symlink(f.dependencyPath, linked, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(await checkLockPath(linked), f.lockPath);
  assert.ok(!f.lockPath.startsWith(f.dependencyPath + path.sep), 'Dependency reinstalls must not remove a live lock.');
  const other = await fixture(t);
  assert.notEqual(other.lockPath, f.lockPath);
});

test('separate processes sharing dependencies acquire exclusively and preserve owner evidence', { timeout: 15_000 }, async t => {
  const f = await fixture(t);
  const first = worker(t, f);
  const acquired = await first.message('acquired');
  const second = worker(t, f);
  const waiting = await second.message('waiting');
  assert.equal(waiting.record.owner.pid, first.child.pid);
  assert.equal(waiting.record.owner.artifactDirectory, f.artifactDirectory);
  await delay(90);
  assert.equal(second.messages.filter(message => message.type === 'waiting').length, 1, 'Waiting reports change only with the owner.');
  assert.equal(second.messages.some(message => message.type === 'acquired'), false);
  first.child.send('release');
  await first.message('released');
  const successor = await second.message('acquired');
  assert.notEqual(acquired.record.owner.token, successor.record.owner.token);
  assert.ok(successor.record.waitMs >= 50);
  assert.ok(Number.isFinite(Date.parse(successor.record.requestedAt)));
  assert.ok(Number.isFinite(Date.parse(successor.record.acquiredAt)));
  second.child.send('release');
  await second.message('released');
  assert.deepEqual(await first.exit, [0, null]);
  assert.deepEqual(await second.exit, [0, null]);
  await assert.rejects(fs.access(f.lockPath), { code: 'ENOENT' });
});

test('live lock timeout and cancellation preserve the current owner bytes', async t => {
  const f = await fixture(t);
  const owner = await acquireCheckLock(f);
  t.after(owner.release);
  const original = await fs.readFile(f.lockPath);
  let waits = 0;
  await assert.rejects(acquireCheckLock({ ...f, timeoutMs: 90, pollMs: 10, onWaiting: async record => {
    waits++; assert.equal(record.owner.token, owner.record.owner.token); await delay(1);
  } }), error => error.code === 'CHECK_LOCK_TIMEOUT' && error.message.includes(f.lockPath));
  assert.equal(waits, 1);
  assert.deepEqual(await fs.readFile(f.lockPath), original);
  const controller = new AbortController();
  const cancellation = new Error('Fixture cancelled while queued');
  await assert.rejects(acquireCheckLock({ ...f, signal: controller.signal, onWaiting: async () => controller.abort(cancellation) }), error => error === cancellation);
  assert.deepEqual(await fs.readFile(f.lockPath), original);
  await owner.release();
  await owner.release();
});

test('SIGKILL leaves evidence and a retained abandoned lock until explicit recovery', { timeout: 10_000 }, async t => {
  const f = await fixture(t);
  await fs.mkdir(f.artifactDirectory);
  const evidence = path.join(f.artifactDirectory, 'result.json');
  await fs.writeFile(evidence, '{"status":"running","evidence":"retain me"}\n');
  const child = worker(t, f);
  await child.message('acquired');
  const original = await fs.readFile(f.lockPath);
  child.child.kill('SIGKILL');
  await child.exit;
  let observed;
  await assert.rejects(acquireCheckLock({ ...f, timeoutMs: 200, pollMs: 10, onWaiting: record => { observed = record; } }), error =>
    error.code === 'CHECK_LOCK_ABANDONED' && error.message.includes(f.lockPath) && error.message.includes(f.artifactDirectory));
  assert.equal(observed.owner.pid, child.child.pid, 'Failed acquisition must retain the abandoned owner provenance.');
  assert.deepEqual(await fs.readFile(f.lockPath), original);
  assert.equal(await fs.readFile(evidence, 'utf8'), '{"status":"running","evidence":"retain me"}\n');
  // This fixture owns the crashed process and confirms it had no stage children.
  await fs.unlink(f.lockPath);
  const recovered = await acquireCheckLock(f);
  await recovered.release();
});

test('malformed owner records fail closed and are never replaced', async t => {
  const f = await fixture(t);
  await fs.mkdir(path.dirname(f.lockPath), { recursive: true });
  await fs.writeFile(f.lockPath, '{broken owner', { flag: 'wx' });
  const old = new Date(Date.now() - 10_000);
  await fs.utimes(f.lockPath, old, old);
  await assert.rejects(acquireCheckLock(f), error => error.code === 'CHECK_LOCK_MALFORMED' && error.message.includes(f.lockPath));
  assert.equal(await fs.readFile(f.lockPath, 'utf8'), '{broken owner');
});

test('a newly created partial owner record gets initialization grace', async t => {
  const f = await fixture(t);
  await fs.mkdir(path.dirname(f.lockPath), { recursive: true });
  const initializing = await fs.open(f.lockPath, 'wx');
  t.after(() => initializing.close());
  let initializingWait = false;
  const acquired = await acquireCheckLock({ ...f, timeoutMs: 500, pollMs: 10, onWaiting: async ({ owner }) => {
    assert.equal(owner, null);
    initializingWait = true;
    await delay(30);
    await initializing.close();
    await fs.unlink(f.lockPath);
  } });
  assert.equal(initializingWait, true);
  await acquired.release();
});

test('release refuses both token mutation and replacement-file ownership', async t => {
  for (const replacement of [false, true]) {
    const f = await fixture(t);
    const acquired = await acquireCheckLock(f);
    const owner = { ...acquired.record.owner, token: replacement ? acquired.record.owner.token : '00000000-0000-4000-8000-000000000000' };
    if (replacement) await fs.unlink(f.lockPath);
    const bytes = JSON.stringify(owner) + '\n';
    await fs.writeFile(f.lockPath, bytes);
    await assert.rejects(acquired.release(), { code: 'CHECK_LOCK_CHANGED' });
    assert.equal(await fs.readFile(f.lockPath, 'utf8'), bytes);
  }
});

test('different dependency installations can validate concurrently', async t => {
  const first = await fixture(t), second = await fixture(t);
  const a = await acquireCheckLock(first);
  t.after(a.release);
  const b = await acquireCheckLock({ ...second, timeoutMs: 100 });
  t.after(b.release);
  assert.notEqual(a.record.lockPath, b.record.lockPath);
  await b.release(); await a.release();
});

test('pre-aborted acquisition does not create a lock', async t => {
  const f = await fixture(t);
  const controller = new AbortController();
  controller.abort(new Error('Already cancelled'));
  await assert.rejects(acquireCheckLock({ ...f, signal: controller.signal }), /Already cancelled/);
  await assert.rejects(fs.access(f.lockPath), { code: 'ENOENT' });
});

test('cancellation interrupts a long polling interval promptly', { timeout: 2000 }, async t => {
  const f = await fixture(t);
  const owner = await acquireCheckLock(f);
  t.after(owner.release);
  const controller = new AbortController();
  let timer;
  t.after(() => clearTimeout(timer));
  const began = performance.now();
  await assert.rejects(acquireCheckLock({ ...f, signal: controller.signal, timeoutMs: 10_000, pollMs: 5000,
    onWaiting: () => { timer = setTimeout(() => controller.abort(new Error('Cancel during poll')), 30); }
  }), /Cancel during poll/);
  assert.ok(performance.now() - began < 1000, 'Cancellation must not wait for the five-second poll.');
  assert.equal(JSON.parse(await fs.readFile(f.lockPath, 'utf8')).token, owner.record.owner.token);
  await owner.release();
});

test('deadline is enforced before reopening a lock that was released while queued', async t => {
  const f = await fixture(t);
  const owner = await acquireCheckLock(f);
  t.after(owner.release);
  let now = 0, attempts = 0, release;
  t.mock.method(performance, 'now', () => now);
  const open = fs.open.bind(fs);
  t.mock.method(fs, 'open', (...args) => { if (args[0] === f.lockPath && args[1] === 'wx') attempts++; return open(...args); });
  await assert.rejects(acquireCheckLock({ ...f, timeoutMs: 50, pollMs: 10, onWaiting: () => {
    setTimeout(() => { now = 51; release = owner.release(); }, 0);
  } }), { code: 'CHECK_LOCK_TIMEOUT' });
  await release;
  assert.equal(attempts, 1, 'No exclusive open may be retried after the queue deadline.');
  await assert.rejects(fs.access(f.lockPath), { code: 'ENOENT' });
});

for (const kind of ['directory', 'symlink', 'fifo']) {
  test(`a ${kind} at the lock path fails closed without blocking`, { skip: process.platform === 'win32' && kind !== 'directory', timeout: 7000 }, async t => {
    const f = await fixture(t);
    await fs.mkdir(path.dirname(f.lockPath), { recursive: true });
    if (kind === 'directory') await fs.mkdir(f.lockPath);
    else if (kind === 'symlink') await fs.symlink(f.dependencyPath, f.lockPath);
    else await execute('mkfifo', [f.lockPath]);
    if (kind === 'fifo') {
      // A blocking FIFO open cannot be cancelled by node:test or AbortSignal.
      // Isolate it so a regression can be killed without hanging the suite.
      const probe = worker(t, f, { timeoutMs: 100, pollMs: 10 });
      try {
        const failure = await probe.message('error', 3000);
        assert.equal(failure.code, 'CHECK_LOCK_MALFORMED');
        assert.ok(failure.message.includes(f.lockPath));
      } finally {
        if (probe.child.exitCode === null && probe.child.signalCode === null) probe.child.kill('SIGKILL');
        await probe.exit;
      }
    } else {
      await assert.rejects(acquireCheckLock({ ...f, timeoutMs: 100, pollMs: 10 }), error =>
        error.code === 'CHECK_LOCK_MALFORMED' && error.message.includes(f.lockPath));
    }
    const stat = await fs.lstat(f.lockPath);
    assert.ok(kind === 'directory' ? stat.isDirectory() : kind === 'symlink' ? stat.isSymbolicLink() : stat.isFIFO());
  });
}
