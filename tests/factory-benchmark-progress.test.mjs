import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { benchmarkLiveFactory, factoryBenchmarkScenarios } from '../scripts/benchmark-factory.mjs';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { Store } from '../dist-electron/electron/storage.js';

const privateFailure = 'fixture-provider-token-MUST-NOT-APPEAR';
const readReport = async directory => JSON.parse(await fs.readFile(path.join(directory, 'benchmark-report.json'), 'utf8'));

async function temporaryOutput(t) {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-benchmark-progress-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  return output;
}

async function reportDirectory(output) {
  const names = (await fs.readdir(output)).filter(name => name.startsWith('fleet-live-benchmark-'));
  assert.equal(names.length, 1, 'A benchmark invocation must retain one evidence directory.');
  return path.join(output, names[0]);
}

async function snapshot(directory) {
  try { return await readReport(directory); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function lifecycle(t, { start, init, stopAll, runs = 1 } = {}) {
  const output = await temporaryOutput(t);
  const starts = [], initial = [], shutdown = [];
  // All model entry points are replaced. Project creation, the benchmark loop,
  // grading, repair lookup, cleanup ordering and report persistence stay real.
  // Failed fixture projects intentionally never execute a package or browser.
  t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
  t.mock.method(FleetBackend.prototype, 'init', async function () {
    initial.push(await snapshot(this.store.root));
    await init?.(this);
  });
  t.mock.method(FleetBackend.prototype, 'stop', async () => {});
  t.mock.method(FleetBackend.prototype, 'stopAll', async function () {
    shutdown.push(await snapshot(this.store.root));
    await stopAll?.(this);
  });
  t.mock.method(FleetBackend.prototype, 'start', async function (id) {
    const project = this.store.project(id);
    const scenario = factoryBenchmarkScenarios.find(item => item.description === project.description);
    project.status = 'failed';
    project.error = 'Offline lifecycle fixture';
    const context = { backend: this, project, scenario, index: starts.length, report: await snapshot(this.store.root) };
    starts.push(context);
    await start?.(context);
  });
  return { output, starts, initial, shutdown,
    run: () => benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', output, runs }) };
}

function assertRunning(report, completed, planned = factoryBenchmarkScenarios.length) {
  assert.ok(report, 'The aggregate must already be durable before starting model work.');
  assert.equal(report.schemaVersion, 7);
  assert.equal(report.status, 'running');
  assert.equal(report.generations, completed);
  assert.equal(report.plannedGenerations, planned);
  assert.equal(report.results.length, completed);
}

async function expectPrivateFailure(run) {
  let caught;
  try { await run(); }
  catch (error) { caught = error; }
  assert.ok(caught instanceof Error, 'Fatal benchmark infrastructure or cleanup failure must reject the caller.');
  assert.equal(caught.message.includes(privateFailure), false, 'Caller errors must not expose provider details.');
}

function assertFailed(report, completed, planned = factoryBenchmarkScenarios.length) {
  assert.equal(report.schemaVersion, 7);
  assert.equal(report.status, 'failed');
  assert.equal(report.generations, completed);
  assert.equal(report.plannedGenerations, planned);
  assert.equal(report.results.length, completed);
  assert.equal(typeof report.failureNote, 'string');
  assert.ok(report.failureNote.length > 0, 'An incomplete report needs a safe explanation.');
  assert.equal(JSON.stringify(report).includes(privateFailure), false, 'Persisted aggregate errors must not contain raw provider details.');
}

test('live benchmark persists initial and completed progress before each model start', async t => {
  const harness = await lifecycle(t);
  const result = await harness.run();
  assert.equal(harness.starts.length, factoryBenchmarkScenarios.length);
  assertRunning(harness.initial[0], 0);
  assert.equal(harness.initial[0].activeGeneration, null);
  for (const [index, entry] of harness.starts.entries()) {
    assertRunning(entry.report, index);
    assert.deepEqual(entry.report.activeGeneration, { scenario: entry.scenario.id, trial: 1, projectId: entry.project.id });
    assert.deepEqual(entry.report.results, result.results.slice(0, index), 'Earlier graded rows must be durable and unchanged before another generation starts.');
  }
  assertRunning(harness.shutdown[0], factoryBenchmarkScenarios.length);
  assert.equal(harness.shutdown[0].activeGeneration, null, 'Cleanup starts only after the final completed row is persisted.');
});

test('live benchmark publishes completed only after cleanup and preserves repeated-run aggregates', async t => {
  const harness = await lifecycle(t, { runs: 2 });
  const result = await harness.run();
  const planned = 2 * factoryBenchmarkScenarios.length;
  assert.equal(harness.starts.length, planned);
  assertRunning(harness.shutdown[0], planned, planned);
  assert.equal(result.status, 'completed');
  assert.equal(result.schemaVersion, 7);
  assert.equal(result.generations, planned);
  assert.equal(result.plannedGenerations, planned);
  assert.equal(result.activeGeneration, null);
  assert.equal(result.accepted, 0);
  assert.equal(result.fullyCovered, 0);
  assert.equal(result.repaired, 0);
  assert.equal(result.repairEvidenceMissing, planned);
  assert.equal(result.costUsd, null);
  assert.deepEqual(result.results.map(row => [row.scenario, row.trial]),
    [1, 2].flatMap(trial => factoryBenchmarkScenarios.map(scenario => [scenario.id, trial])));
  assert.ok(result.results.every(row => row.accepted === false && row.failureReasons.includes('pipeline-not-accepted')));
  assert.deepEqual(await readReport(result.output), result, 'Returned and persisted complete evidence must agree.');
});

test('a later project-save failure retains completed rows and the unfinished generation', async t => {
  let failed = false;
  const save = Store.prototype.save;
  t.mock.method(Store.prototype, 'save', async function () {
    if (!failed && this.state.settings.provider === 'fixture' && this.state.projects.length === 3) {
      failed = true;
      throw new Error(privateFailure);
    }
    return save.call(this);
  });
  const harness = await lifecycle(t);
  await expectPrivateFailure(harness.run);
  assert.equal(failed, true);
  assert.equal(harness.starts.length, 2, 'A setup failure must not start the unfinished or later generations.');
  const report = await readReport(await reportDirectory(harness.output));
  assertFailed(report, 2);
  assert.deepEqual(report.results[0], harness.starts[1].report.results[0]);
  assert.equal(report.activeGeneration.scenario, factoryBenchmarkScenarios[2].id);
  assert.equal(report.activeGeneration.trial, 1);
  assert.equal(typeof report.activeGeneration.projectId, 'string');
  assert.equal(report.accepted, 0);
});

test('provider initialization failure leaves a safe failed aggregate before any generation', async t => {
  const harness = await lifecycle(t, { init: async () => { throw new Error(privateFailure); } });
  await expectPrivateFailure(harness.run);
  assert.equal(harness.starts.length, 0);
  const report = await readReport(await reportDirectory(harness.output));
  assertFailed(report, 0);
  assert.equal(report.activeGeneration, null);
});

test('store initialization failure still retains the initial benchmark ledger', async t => {
  let initial;
  t.mock.method(Store.prototype, 'init', async function () {
    initial = await snapshot(this.root);
    throw new Error(privateFailure);
  });
  const harness = await lifecycle(t);
  await expectPrivateFailure(harness.run);
  assertRunning(initial, 0);
  assert.equal(harness.initial.length, 0, 'The model backend cannot initialize after store setup failed.');
  assert.equal(harness.starts.length, 0);
  const report = await readReport(await reportDirectory(harness.output));
  assertFailed(report, 0);
  assert.equal(report.activeGeneration, null);
});

test('backend cleanup failure cannot leave a completed aggregate even when all rows finished', async t => {
  const harness = await lifecycle(t, { stopAll: async () => { throw new Error(privateFailure); } });
  await expectPrivateFailure(harness.run);
  assert.equal(harness.starts.length, factoryBenchmarkScenarios.length);
  assertRunning(harness.shutdown[0], factoryBenchmarkScenarios.length);
  const report = await readReport(await reportDirectory(harness.output));
  assertFailed(report, factoryBenchmarkScenarios.length);
  assert.equal(report.activeGeneration, null);
  assert.deepEqual(report.results, harness.shutdown[0].results);
});

test('final project persistence failure cannot publish completed benchmark evidence', async t => {
  let failFinalSave = false, failed = false;
  const save = Store.prototype.save;
  t.mock.method(Store.prototype, 'save', async function () {
    if (failFinalSave && !failed && this.state.settings.provider === 'fixture') {
      failed = true;
      throw new Error(privateFailure);
    }
    return save.call(this);
  });
  const harness = await lifecycle(t, { stopAll: async () => { failFinalSave = true; } });
  await expectPrivateFailure(harness.run);
  assert.equal(failed, true);
  const report = await readReport(await reportDirectory(harness.output));
  assertFailed(report, factoryBenchmarkScenarios.length);
  assert.equal(report.activeGeneration, null);
  assert.deepEqual(report.results, harness.shutdown[0].results);
});

for (const operation of ['write', 'rename']) {
  function failReportPersistence(t, enabled) {
    const method = operation === 'write' ? 'writeFile' : 'rename';
    const original = fs[method];
    let failures = 0;
    t.mock.method(fs, method, async function (target, ...args) {
      if (enabled() && path.basename(String(target)) === 'benchmark-report.json.tmp') {
        failures++;
        throw Object.assign(new Error(privateFailure), { code: operation === 'write' ? 'ENOSPC' : 'EIO' });
      }
      return original.call(this, target, ...args);
    });
    return () => failures;
  }

  test(`initial aggregate ${operation} failure prevents all model initialization and generation`, async t => {
    const failures = failReportPersistence(t, () => true);
    const harness = await lifecycle(t);
    await expectPrivateFailure(harness.run);
    assert.ok(failures() >= 2, 'The initial save and failed-status finalization both encounter the persistent storage failure.');
    assert.equal(harness.initial.length, 0, 'No model backend may initialize without a saved initial report.');
    assert.equal(harness.starts.length, 0);
    const directory = await reportDirectory(harness.output);
    assert.equal(await snapshot(directory), null);
    await assert.rejects(fs.access(path.join(directory, 'benchmark-report.json.tmp')), { code: 'ENOENT' });
  });

  test(`repeated progress ${operation} failures preserve the last complete JSON and prevent another generation`, async t => {
    let enabled = false;
    const failures = failReportPersistence(t, () => enabled);
    const harness = await lifecycle(t, { start: async ({ index }) => { if (index === 1) enabled = true; } });
    await expectPrivateFailure(harness.run);
    assert.equal(harness.starts.length, 2, 'Another model generation cannot start after progress failed to persist.');
    assert.ok(failures() >= 2, 'Both progress and final failed-status writes must exercise the storage fault.');
    const directory = await reportDirectory(harness.output);
    const report = await readReport(directory);
    assertRunning(report, 1);
    assert.deepEqual(report, harness.starts[1].report,
      'A persistent storage failure must leave the exact previously committed JSON parseable.');
    assert.equal(report.results[0].scenario, factoryBenchmarkScenarios[0].id);
    assert.equal(report.activeGeneration.projectId, harness.starts[1].project.id);
    await assert.rejects(fs.access(path.join(directory, 'benchmark-report.json.tmp')), { code: 'ENOENT' });
  });
}

test('an interrupted benchmark process retains prior results with explicit running status', { timeout: 15_000 }, async t => {
  const output = await temporaryOutput(t);
  const benchmarkUrl = new URL('../scripts/benchmark-factory.mjs', import.meta.url).href;
  const backendUrl = new URL('../dist-electron/electron/pi-backend.js', import.meta.url).href;
  // A separate Node process makes abrupt interruption real. Every provider
  // method is replaced before the caller starts; no package/browser is run.
  const script = `
    import { benchmarkLiveFactory } from ${JSON.stringify(benchmarkUrl)};
    import { FleetBackend } from ${JSON.stringify(backendUrl)};
    FleetBackend.prototype.init = async function () {};
    FleetBackend.prototype.models = () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }];
    FleetBackend.prototype.stop = async function () {};
    FleetBackend.prototype.stopAll = async function () {};
    let starts = 0;
    FleetBackend.prototype.start = async function (id) {
      const project = this.store.project(id); project.status = 'failed';
      if (++starts === 2) {
        console.log(JSON.stringify({ directory: this.store.root, projectId: id }));
        await new Promise(() => {});
      }
    };
    await benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', output: ${JSON.stringify(output)} });
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  });
  const closed = once(child, 'close');
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });
  t.after(async () => { child.kill('SIGKILL'); await closed; });
  const ready = await new Promise((resolve, reject) => {
    let stdout = '';
    const timer = setTimeout(() => reject(new Error('Offline interrupt fixture did not reach its second generation. ' + stderr)), 10_000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', () => { clearTimeout(timer); reject(new Error('Offline interrupt fixture exited early. ' + stderr)); });
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      const newline = stdout.indexOf('\n');
      if (newline < 0) return;
      clearTimeout(timer);
      try { resolve(JSON.parse(stdout.slice(0, newline))); }
      catch (error) { reject(error); }
    });
  });
  child.kill('SIGKILL');
  await closed;
  const report = await readReport(ready.directory);
  assertRunning(report, 1);
  assert.deepEqual(report.activeGeneration, { scenario: factoryBenchmarkScenarios[1].id, trial: 1, projectId: ready.projectId });
  assert.equal(report.results[0].scenario, factoryBenchmarkScenarios[0].id);
  assert.equal(report.results[0].accepted, false);
});
