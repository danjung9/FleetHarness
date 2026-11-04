import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { Store, sourceHash } from '../dist-electron/electron/storage.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { RunProcessSweep } from '../dist-electron/electron/process-sweep.js';
import { reportHash, deliveryEvidence } from '../dist-electron/electron/delivery.js';
import { atomicHostWrite } from '../dist-electron/shared/host-files.js';
import { mainHarness } from './helpers/main-harness.mjs';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lifecycle-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new Store(root); await store.init();
  const p = store.state.projects[0];
  p.workspace = path.join(root, 'workspace'); await fs.mkdir(p.workspace);
  await fs.writeFile(path.join(p.workspace, 'index.html'), '<h1>Synthetic fixture</h1>');
  p.status = 'review'; p.runId = 'synthetic-run'; p.qualityVersion = 1;
  p.processScope = { runId: p.runId, marker: 'synthetic-marker', cleanup: 'confirmed' };
  p.stages.forEach(s => { s.status = s.id === 'deliver' ? 'queued' : s.id === 'review' ? 'review' : 'complete'; });
  // Synthetic prior verification. No native browser or sandbox success is claimed.
  p.report = { time: new Date().toISOString(), command: 'synthetic host sandbox', portableCommand: "node --test './app.test.cjs'", exitCode: 0,
    passed: 1, failed: 0, skipped: 0, total: 1, output: 'Synthetic prior evidence', durationMs: 1,
    sourceHash: await sourceHash(p.workspace),
    quality: { schemaVersion: 1, status: 'passed', errors: [], journeys: [{ status: 'passed' }], criteria: [{ status: 'passed' }] } };
  p.verification = { runId: p.runId, reportHash: reportHash(p.report) };
  await store.save();
  return { store, p, root };
}

test('failed cleanup cannot be approved, exported, or packaged', async t => {
  const { store, p } = await fixture(t);
  const backend = new FleetBackend(store, process.execPath, () => {}, process.cwd());
  const run = { controller: new AbortController(), outcome: 'review', resolve() {},
    processes: { marker: p.processScope.marker, async stop() { throw new Error('Synthetic cleanup refusal'); } } };
  backend.active.set(p.id, run); await backend.finish(p, run);
  assert.equal(p.status, 'failed'); assert.equal(p.processScope.cleanup, 'unconfirmed');
  assert.match(p.error, /cleanup could not be confirmed/);
  const main = await mainHarness(store, backend);
  for (const channel of ['fleet:approve', 'fleet:export', 'fleet:download-executable']) {
    await assert.rejects(main.invoke(channel, p.id, 'Synthetic review note'), /cleanup|review/i);
  }
});

for (const mismatch of ['run', 'cleanup', 'report']) test('approval rejects mismatched ' + mismatch + ' evidence', async t => {
  const { store, p } = await fixture(t);
  if (mismatch === 'run') p.runId = 'another-run';
  if (mismatch === 'cleanup') p.processScope = undefined;
  if (mismatch === 'report') p.report.output = 'Altered host evidence';
  const main = await mainHarness(store);
  await assert.rejects(main.invoke('fleet:approve', p.id, 'Synthetic review note'), /cleanup|evidence/);
  assert.equal(p.approvedAt, undefined);
});

test('approval receipt failure leaves prior state intact', async t => {
  const { store, p } = await fixture(t);
  await fs.mkdir(path.join(p.workspace, 'review.json'));
  const prior = structuredClone(p), main = await mainHarness(store);
  await assert.rejects(main.invoke('fleet:approve', p.id, 'Synthetic review note'), /EISDIR|ENOTDIR/);
  assert.deepEqual(p, prior);
  assert.equal(JSON.parse(await fs.readFile(path.join(store.root, 'state.json'), 'utf8')).projects[0].approvedAt, undefined);
});

test('failed state persistence does not commit approval or leave a new receipt', async t => {
  const { store, p } = await fixture(t), prior = structuredClone(p);
  await fs.rm(path.join(store.root, 'state.json')); await fs.mkdir(path.join(store.root, 'state.json'));
  const main = await mainHarness(store);
  await assert.rejects(main.invoke('fleet:approve', p.id, 'Synthetic review note'), /EISDIR|ENOTDIR/);
  assert.deepEqual(p, prior);
  await assert.rejects(fs.access(path.join(p.workspace, 'review.json')), { code: 'ENOENT' });
});

test('failed reapproval restores the previous receipt and approval state', async t => {
  const { store, p } = await fixture(t), main = await mainHarness(store);
  await main.invoke('fleet:approve', p.id, 'Original synthetic review');
  const prior = structuredClone(p), receipt = await fs.readFile(path.join(p.workspace, 'review.json'), 'utf8');
  await fs.rm(path.join(store.root, 'state.json')); await fs.mkdir(path.join(store.root, 'state.json'));
  await assert.rejects(main.invoke('fleet:approve', p.id, 'Replacement synthetic review'), /EISDIR|ENOTDIR/);
  assert.deepEqual(structuredClone(p), prior);
  assert.equal(await fs.readFile(path.join(p.workspace, 'review.json'), 'utf8'), receipt);
});

test('a queued state save cannot overwrite a committed project with an earlier snapshot', async t => {
  const { store, p } = await fixture(t), next = structuredClone(p);
  next.title = 'Synthetic persisted revision';
  const committing = store.saveProject(next);
  store.state.settings.developerMode = true;
  await Promise.all([committing, store.save()]);
  const saved = JSON.parse(await fs.readFile(path.join(store.root, 'state.json'), 'utf8'));
  assert.equal(saved.projects[0].title, next.title);
  assert.equal(saved.settings.developerMode, true);
});

test('approval reserves the project and persists before publishing approved state', async t => {
  const { store, p } = await fixture(t), entered = deferred(), release = deferred();
  const save = store.saveProject.bind(store);
  store.saveProject = async next => { entered.resolve(); await release.promise; await save(next); };
  const main = await mainHarness(store);
  const approving = main.invoke('fleet:approve', p.id, 'Synthetic review note');
  await entered.promise;
  assert.equal(p.status, 'review'); assert.equal(p.approvedAt, undefined);
  for (const channel of ['fleet:approve', 'fleet:export', 'fleet:start', 'fleet:resume', 'fleet:update']) {
    await assert.rejects(main.invoke(channel, p.id, 'Synthetic review note'), /review to be saved/);
  }
  release.resolve(); await approving;
  assert.equal(p.status, 'approved');
  const saved = new Store(store.root); await saved.init();
  assert.deepEqual(saved.project(p.id).approval, structuredClone(p.approval));
  assert.equal(p.approval.reportHash, reportHash(p.report));
});

for (const file of ['review.json', 'test-report.json', 'system-design.json', 'requirements.md']) {
  test('host atomic writer replaces ' + file + ' without following links', async t => {
    const { p, root } = await fixture(t), target = path.join(root, 'canary');
    await fs.writeFile(target, 'SYNTHETIC CANARY');
    const receipt = path.join(p.workspace, file);
    await fs.symlink(target, receipt);
    await atomicHostWrite(p.workspace, file, 'HOST RECEIPT');
    assert.equal(await fs.readFile(target, 'utf8'), 'SYNTHETIC CANARY');
    assert.equal((await fs.lstat(receipt)).isSymbolicLink(), false);
    assert.equal(await fs.readFile(receipt, 'utf8'), 'HOST RECEIPT');
    await fs.rm(receipt); await fs.link(target, receipt);
    await atomicHostWrite(p.workspace, file, 'SECOND RECEIPT');
    assert.equal(await fs.readFile(target, 'utf8'), 'SYNTHETIC CANARY');
  });
}

test('host writer refuses a symlinked artifact directory', async t => {
  const { p, root } = await fixture(t);
  await fs.symlink(root, path.join(p.workspace, 'alias'));
  await assert.rejects(atomicHostWrite(p.workspace, 'alias/canary', 'bad'), /real artifact directories/);
  await assert.rejects(fs.access(path.join(root, 'canary')), { code: 'ENOENT' });
});

test('the production terminal report write protects an outside canary', async t => {
  const { store, p, root } = await fixture(t), canary = path.join(root, 'canary');
  await fs.writeFile(canary, 'SYNTHETIC CANARY');
  await fs.symlink(canary, path.join(p.workspace, 'test-report.json'));
  const processes = new RunProcessSweep();
  p.processScope = { runId: p.runId, marker: processes.marker, cleanup: 'pending' };
  const backend = new FleetBackend(store, process.execPath, () => {}, process.cwd());
  await backend.finish(p, { processes, controller: new AbortController(), outcome: 'review', resolve() {} });
  assert.equal(await fs.readFile(canary, 'utf8'), 'SYNTHETIC CANARY');
  assert.equal((await fs.lstat(path.join(p.workspace, 'test-report.json'))).isSymbolicLink(), false);
  assert.equal(p.status, 'review'); assert.equal(p.verification.reportHash, reportHash(p.report));
});

test('approval refuses an agent-created review symlink without touching its target', async t => {
  const { store, p, root } = await fixture(t), canary = path.join(root, 'canary');
  await fs.writeFile(canary, 'SYNTHETIC CANARY'); await fs.symlink(canary, path.join(p.workspace, 'review.json'));
  const main = await mainHarness(store);
  await assert.rejects(main.invoke('fleet:approve', p.id, 'Synthetic review note'), /symlinks/);
  assert.equal(await fs.readFile(canary, 'utf8'), 'SYNTHETIC CANARY'); assert.equal(p.approvedAt, undefined);
});

test('Stop aborts matching delivery and waits until packaging settles', async t => {
  const { store, p, root } = await fixture(t), entered = deferred(), release = deferred();
  let workerSignal;
  const destination = path.join(root, 'download.zip');
  const backend = new FleetBackend(store, process.execPath, () => {}, process.cwd());
  const main = await mainHarness(store, backend, 'electron/main.ts', {
    dialog: { async showSaveDialog() { return { filePath: destination }; } },
    async runPackageWorker(job, _runtime, signal) { workerSignal = signal; entered.resolve(); await release.promise; signal.throwIfAborted(); await fs.writeFile(job.archive, 'SYNTHETIC ZIP'); }
  });
  await main.invoke('fleet:approve', p.id, 'Synthetic review note');
  const delivery = main.invoke('fleet:download-executable', p.id), rejection = assert.rejects(delivery, { name: 'AbortError' });
  await entered.promise;
  let stopped = false;
  const stopping = main.invoke('fleet:stop', p.id).then(() => { stopped = true; });
  await delay(20); assert.equal(workerSignal.aborted, true); assert.equal(stopped, false);
  release.resolve(); await Promise.all([stopping, rejection]);
  await assert.rejects(fs.access(destination), { code: 'ENOENT' });
  assert.equal(p.status, 'approved'); assert.equal(p.executable.status, 'failed');
});

test('source delivery exports host evidence and portable instructions after workspace receipt tampering', async t => {
  const { store, p, root } = await fixture(t);
  const main = await mainHarness(store, undefined, 'electron/main.ts', {
    dialog: { async showOpenDialog() { return { filePaths: [root] }; } }
  });
  await main.invoke('fleet:approve', p.id, 'Synthetic review note');
  const evidence = deliveryEvidence(p);
  await fs.writeFile(path.join(p.workspace, 'test-report.json'), '{"passed":999}');
  await fs.writeFile(path.join(p.workspace, 'review.json'), '{"feedback":"forged"}');
  const destination = await main.invoke('fleet:export', p.id);
  assert.equal(await fs.readFile(path.join(destination, 'test-report.json'), 'utf8'), evidence.report);
  assert.equal(await fs.readFile(path.join(destination, 'review.json'), 'utf8'), evidence.review);
  const instructions = await fs.readFile(path.join(destination, 'DELIVERY.md'), 'utf8');
  assert.match(instructions, /node --test '\.\/app.test.cjs'/); assert.match(instructions, /provenance/);
  assert.doesNotMatch(instructions, /synthetic host sandbox|Generated by/);
});

for (const kind of ['source', 'executable']) test('Stop during final ' + kind + ' persistence rolls back delivery and waits', async t => {
  const { store, p, root } = await fixture(t), entered = deferred(), release = deferred();
  const destination = path.join(root, 'delivery'); await fs.mkdir(destination);
  const zip = path.join(destination, 'app.zip'); await fs.writeFile(zip, 'PREVIOUS ZIP');
  const backend = new FleetBackend(store, process.execPath, () => {}, process.cwd());
  const main = await mainHarness(store, backend, 'electron/main.ts', {
    dialog: { async showOpenDialog() { return { filePaths: [destination] }; }, async showSaveDialog() { return { filePath: zip }; } },
    async runPackageWorker(job) { await fs.writeFile(job.archive, 'NEW ZIP'); }
  });
  await main.invoke('fleet:approve', p.id, 'Synthetic review note');
  const save = store.save.bind(store);
  store.save = async () => { if (p.status === 'delivered') { entered.resolve(); await release.promise; } await save(); };
  const delivery = main.invoke(kind === 'source' ? 'fleet:export' : 'fleet:download-executable', p.id);
  const rejected = assert.rejects(delivery, { name: 'AbortError' });
  await entered.promise;
  let stopped = false;
  const stopping = main.invoke('fleet:stop', p.id).then(() => { stopped = true; });
  await delay(20); assert.equal(stopped, false);
  release.resolve(); await Promise.all([stopping, rejected]);
  assert.equal(p.status, 'approved'); assert.notEqual(p.stages.find(s => s.id === 'deliver').status, 'complete');
  assert.deepEqual(await fs.readdir(destination), ['app.zip']);
  assert.equal(await fs.readFile(zip, 'utf8'), 'PREVIOUS ZIP');
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8')).projects[0].status, 'approved');
});

test('untrusted IPC and sources edited after verification remain refused', async t => {
  const { store, p } = await fixture(t), main = await mainHarness(store);
  await assert.rejects(main.handlers.get('fleet:approve')({}, p.id, 'Synthetic review note'), /Untrusted/);
  await fs.writeFile(path.join(p.workspace, 'index.html'), 'CHANGED');
  await assert.rejects(main.invoke('fleet:approve', p.id, 'Synthetic review note'), /changed after verification/);
});

test('startup reconciliation fails closed, blocks new runs, and retries the saved marker on Stop', async t => {
  const { store, p } = await fixture(t);
  p.status = 'running'; p.processScope.cleanup = 'pending'; await store.save();
  let recover = false; const markers = [];
  const restarted = new Store(store.root, async marker => { markers.push(marker); if (!recover) throw new Error('Synthetic inspection failure'); });
  await restarted.init(); const restored = restarted.project(p.id);
  assert.equal(restored.status, 'failed'); assert.equal(restored.processScope.cleanup, 'unconfirmed');
  const backend = new FleetBackend(restarted, process.execPath, () => {}, process.cwd());
  await assert.rejects(backend.start(p.id), /cleanup is unconfirmed/);
  await assert.rejects(backend.resume(p.id), /cleanup is unconfirmed/);
  recover = true; await backend.stop(p.id);
  assert.equal(restored.status, 'stopped'); assert.equal(restored.processScope.cleanup, 'confirmed');
  assert.deepEqual(markers, ['synthetic-marker', 'synthetic-marker']);
});

test('a run marker is durable before the first engine session launches', async t => {
  const { store, p } = await fixture(t);
  store.state.settings = { provider: 'fixture', model: 'fixture', rememberKey: false };
  let launched = false;
  const backend = new FleetBackend(store, process.execPath, () => {}, process.cwd(), {
    createSession: async () => {
      launched = true;
      const saved = JSON.parse(await fs.readFile(path.join(store.root, 'state.json'), 'utf8')).projects.find(project => project.id === p.id);
      assert.equal(saved.status, 'running'); assert.equal(saved.processScope.cleanup, 'pending');
      assert.equal(saved.processScope.runId, p.runId);
      assert.equal(saved.processScope.marker, backend.active.get(p.id).processes.marker);
      throw new Error('Synthetic session launch boundary');
    }
  });
  backend.runtime = { getModel: () => ({}), hasConfiguredAuth: () => true };
  await backend.start(p.id); await backend.active.get(p.id)?.done;
  assert.equal(launched, true); assert.match(p.error, /Synthetic session launch boundary/);
});

test('startup and repeated Stop never relabel another run marker as the current run', async t => {
  const { store, p } = await fixture(t);
  p.processScope.runId = 'earlier-run'; await store.save();
  let sweeps = 0;
  const restarted = new Store(store.root, async () => { sweeps++; }); await restarted.init();
  const backend = new FleetBackend(restarted, process.execPath, () => {}, process.cwd());
  for (let n = 0; n < 2; n++) await backend.stop(p.id);
  const restored = restarted.project(p.id);
  assert.equal(sweeps, 0); assert.equal(restored.status, 'failed');
  assert.equal(restored.processScope.runId, 'earlier-run'); assert.equal(restored.processScope.cleanup, 'unconfirmed');
  await assert.rejects(backend.start(p.id), /cleanup is unconfirmed/);
});

test('production startup discovers and stops a persisted orphan before reporting stopped', { timeout: 15000 }, async t => {
  if (!['darwin', 'linux'].includes(process.platform)) return t.skip('Native discovery requires macOS or Linux.');
  if (process.platform === 'darwin') {
    const allowed = await new Promise((resolve, reject) => {
      try { execFile('/bin/ps', ['-p', String(process.pid)], error => resolve(!error)); }
      catch (error) { if (error.code === 'EPERM') resolve(false); else reject(error); }
    });
    if (!allowed) return t.skip('Sandbox forbids native ps; overseer must run this regression outside.');
  }
  const { store, p, root } = await fixture(t), heartbeat = path.join(root, 'heartbeat');
  const scope = new RunProcessSweep();
  p.status = 'running'; p.processScope = { runId: p.runId, marker: scope.marker, cleanup: 'pending' }; await store.save();
  const worker = `const fs=require('node:fs');let n=0;setInterval(()=>fs.writeFileSync(${JSON.stringify(heartbeat)},String(++n)),20);setTimeout(()=>process.exit(),10000);`;
  const launcher = spawn(process.execPath, ['-e', `const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e',${JSON.stringify(worker)}],{detached:true,stdio:'ignore',env:JSON.parse(process.argv[1])});c.unref();process.stdout.write(String(c.pid));`, JSON.stringify(scope.environment({ PATH: process.env.PATH }))], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; launcher.stdout.on('data', chunk => { output += chunk; }); await once(launcher, 'close');
  const pid = Number(output); assert.ok(Number.isSafeInteger(pid) && pid > 1);
  t.after(() => { try { process.kill(pid, 'SIGKILL'); } catch {} });
  for (let i = 0; i < 100; i++) { try { await fs.access(heartbeat); break; } catch { await delay(10); } }
  const before = await fs.readFile(heartbeat, 'utf8'); await delay(60);
  assert.notEqual(await fs.readFile(heartbeat, 'utf8'), before, 'Control: orphan was writing before startup');
  const restarted = new Store(root); await restarted.init();
  const after = await fs.readFile(heartbeat, 'utf8'); await delay(100);
  assert.equal(await fs.readFile(heartbeat, 'utf8'), after, 'Orphan continued writing after startup');
  assert.equal(restarted.project(p.id).status, 'stopped');
  assert.equal(restarted.project(p.id).processScope.cleanup, 'confirmed');
});

test('single-instance lock follows the selected profile and a rejected owner never initializes', async t => {
  const { store } = await fixture(t), calls = [], events = new Map();
  let owns = false, selected;
  const app = { isPackaged: false, getAppPath: () => process.cwd(), getPath: name => name === 'userData' ? selected : store.root,
    setPath(name, value) { if (name === 'userData') selected = value; calls.push('path'); }, setName() {},
    requestSingleInstanceLock() { assert.ok(selected); calls.push('lock'); return owns; }, quit() { calls.push('quit'); },
    whenReady() { calls.push('ready'); return { then() {} }; }, on(name, fn) { events.set(name, fn); } };
  await mainHarness(store, undefined, 'electron/main.ts', { app });
  assert.deepEqual(calls, ['path', 'lock', 'quit']);
  calls.length = 0; owns = true;
  const focus = [];
  await mainHarness(store, undefined, 'electron/main.ts', { app, hostWindow: { isMinimized: () => true, restore: () => focus.push('restore'), show: () => focus.push('show'), focus: () => focus.push('focus') } });
  assert.deepEqual(calls, ['path', 'lock', 'ready']);
  events.get('second-instance')(); assert.deepEqual(focus, ['restore', 'show', 'focus']);
  const folders = [path.join(store.root, 'profile-one'), path.join(store.root, 'profile-two')];
  for (const folder of folders) {
    await mainHarness(store, undefined, 'electron/main.ts', { app, process: { ...process, env: { FLEET_USER_DATA: folder } } });
    assert.equal(selected, folder);
  }
});
