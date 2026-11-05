import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { setImmediate } from 'node:timers/promises';
import { benchmarkLiveFactory, factoryBenchmarkScenarios } from '../scripts/benchmark-factory.mjs';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';

function deferred() {
  let resolve;
  const promise = new Promise(settle => { resolve = settle; });
  return { promise, resolve };
}

const flush = async () => { await setImmediate(); await setImmediate(); };

async function fixture(t, start, stop = async () => {}) {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-live-deadline-test-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const starts = [], stops = [], entries = factoryBenchmarkScenarios.map(() => deferred());
  let now = 0, settled = false;
  const clock = {
    advance(milliseconds) { now += milliseconds; t.mock.timers.tick(milliseconds); },
    // Model synchronous work that has consumed time before a timer can run.
    elapse(milliseconds) { now += milliseconds; }
  };
  // Every model entry point is replaced. The benchmark orchestration, grading,
  // project creation, state persistence and summary serialization remain real.
  t.mock.method(FleetBackend.prototype, 'init', async () => {});
  t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
  t.mock.method(FleetBackend.prototype, 'stopAll', async () => {});
  t.mock.method(FleetBackend.prototype, 'start', async function (id) {
    const project = this.store.project(id), index = starts.length;
    // These lifecycle fixtures deliberately have no accepted computational
    // evidence, so no package execution or provider call is needed.
    project.status = 'failed';
    project.error = 'Offline lifecycle fixture';
    const context = { backend: this, id, index, project, clock };
    starts.push(context); entries[index].resolve(context);
    await start(context);
  });
  t.mock.method(FleetBackend.prototype, 'stop', async function (id) {
    const context = starts.find(item => item.id === id);
    stops.push(context);
    await stop(context);
  });
  t.mock.method(performance, 'now', () => now);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const completion = benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', runs: 1, output, timeoutMs: 100 });
  void completion.then(() => { settled = true; }, () => { settled = true; });
  return { starts, stops, entries, clock, completion, settled: () => settled };
}

async function savedResult(result) {
  const saved = JSON.parse(await fs.readFile(path.join(result.output, 'benchmark-report.json'), 'utf8'));
  assert.deepEqual(saved, result, 'Persisted benchmark evidence must retain every timeout result.');
  return JSON.parse(await fs.readFile(path.join(result.output, 'state.json'), 'utf8'));
}

function assertTimeout(result, index = 0) {
  assert.equal(result.results[index].timedOut, true);
  assert.equal(result.results[index].accepted, false);
  assert.ok(result.results[index].failureReasons.includes('generation-timed-out'));
  assert.ok(result.results.filter((_, current) => current !== index).every(item => !item.timedOut));
}

test('live benchmark interrupts pending startup and waits for stop cleanup before recording or starting another scenario', { timeout: 5000 }, async t => {
  const startup = deferred(), cleanup = deferred();
  let stoppedWhilePreparing = false, startupSettled = false, cleanupSettled = false;
  const harness = await fixture(t, async ({ backend, id, index }) => {
    if (index) return;
    backend.active.set(id, { done: startup.promise });
    await startup.promise;
    backend.active.delete(id);
    startupSettled = true;
  }, async ({ backend, id, index, project }) => {
    if (index) return;
    stoppedWhilePreparing = backend.active.has(id);
    startup.resolve();
    await cleanup.promise;
    cleanupSettled = true;
    project.status = 'stopped';
    project.error = 'Startup cancelled; cleanup completed';
  });
  await harness.entries[0].promise;
  harness.clock.advance(100); await flush();
  const stopsAtDeadline = harness.stops.length;
  const startsBeforeCleanup = harness.starts.length;
  const completedBeforeCleanup = harness.settled();
  const startupSettledAtDeadline = startupSettled;
  // Release both barriers even for a broken implementation, making the old
  // behavior fail assertions instead of leaving the regression test hanging.
  startup.resolve();
  harness.clock.advance(40); cleanup.resolve();
  const result = await harness.completion;
  assert.equal(stopsAtDeadline, 1, 'The deadline must stop a run while start() is still pending.');
  assert.equal(stoppedWhilePreparing, true);
  assert.equal(startupSettledAtDeadline, true);
  assert.equal(startsBeforeCleanup, 1, 'Another scenario must not start before cancellation cleanup settles.');
  assert.equal(completedBeforeCleanup, false);
  assert.equal(cleanupSettled, true);
  assert.equal(harness.stops.length, 1);
  assert.equal(result.results[0].durationMs, 140, 'Reported duration includes awaited cancellation cleanup.');
  assert.equal(result.results[0].status, 'stopped');
  assertTimeout(result);
  const saved = await savedResult(result);
  assert.equal(saved.projects[0].error, 'Startup cancelled; cleanup completed');
});

test('startup and active generation consume one live benchmark deadline', { timeout: 5000 }, async t => {
  const startup = deferred(), generation = deferred();
  const harness = await fixture(t, async ({ backend, id, index }) => {
    if (index) return;
    await startup.promise;
    backend.active.set(id, { done: generation.promise });
    void generation.promise.then(() => backend.active.delete(id));
  }, async ({ index, project }) => {
    if (index) return;
    project.status = 'stopped'; generation.resolve();
    await generation.promise;
  });
  await harness.entries[0].promise;
  harness.clock.advance(60); startup.resolve(); await flush();
  const activeAfterStartup = harness.starts[0].backend.active.has(harness.starts[0].id);
  harness.clock.advance(40); await flush();
  const stopsAtOriginalDeadline = harness.stops.length;
  generation.resolve();
  const result = await harness.completion;
  assert.equal(activeAfterStartup, true);
  assert.equal(stopsAtOriginalDeadline, 1, 'Startup must not reset the generation timeout.');
  assert.equal(harness.stops.length, 1);
  assert.equal(result.results[0].durationMs, 100);
  assertTimeout(result);
  await savedResult(result);
});

test('quick startup and generation completion leave no timeout or cancellation behind', { timeout: 5000 }, async t => {
  const harness = await fixture(t, async ({ backend, id }) => {
    const done = Promise.resolve();
    backend.active.set(id, { done });
    void done.then(() => backend.active.delete(id));
  });
  const result = await harness.completion;
  harness.clock.advance(1000); await flush();
  assert.equal(result.generations, factoryBenchmarkScenarios.length);
  assert.equal(harness.starts.length, factoryBenchmarkScenarios.length);
  assert.equal(harness.stops.length, 0);
  assert.ok(result.results.every(item => !item.timedOut && !item.failureReasons.includes('generation-timed-out')));
  await savedResult(result);
});

test('a startup rejection clears its timer before the next scenario and preserves failure evidence', { timeout: 5000 }, async t => {
  const secondStartup = deferred();
  const harness = await fixture(t, async ({ index, project, clock }) => {
    if (index === 0) {
      clock.advance(20);
      project.error = 'Fixture startup failure';
      throw new Error(project.error);
    }
    if (index === 1) await secondStartup.promise;
  });
  await harness.entries[1].promise;
  harness.clock.advance(80); await flush();
  const stopsBeforeSecondDeadline = harness.stops.length;
  secondStartup.resolve();
  const result = await harness.completion;
  harness.clock.advance(1000); await flush();
  assert.equal(stopsBeforeSecondDeadline, 0, 'The rejected scenario timer must not cancel a later scenario.');
  assert.equal(harness.stops.length, 0);
  assert.ok(result.results.every(item => !item.timedOut));
  assert.equal(result.results[0].status, 'failed');
  const saved = await savedResult(result);
  assert.equal(saved.projects[0].error, 'Fixture startup failure');
});

test('elapsed startup cannot evade the deadline by completing before its delayed timer callback', { timeout: 5000 }, async t => {
  const harness = await fixture(t, async ({ index, clock }) => {
    if (index === 0) clock.elapse(101);
  }, async ({ project }) => { project.status = 'stopped'; });
  const result = await harness.completion;
  assert.equal(harness.stops.length, 1);
  assert.equal(harness.stops[0].index, 0);
  assert.equal(result.results[0].durationMs, 101);
  assertTimeout(result);
  await savedResult(result);
});

test('invalid live benchmark deadlines fail before initializing a backend or creating output', async t => {
  let initialized = 0;
  t.mock.method(FleetBackend.prototype, 'init', async () => { initialized++; });
  t.mock.method(FleetBackend.prototype, 'models', () => []);
  t.mock.method(FleetBackend.prototype, 'start', async () => { throw new Error('A provider must never start.'); });
  t.mock.method(FleetBackend.prototype, 'stopAll', async () => {});
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-invalid-deadline-test-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  for (const timeoutMs of [0, -1, 1.5, NaN, Infinity, 2_147_483_648, '100', null]) {
    await t.test(String(timeoutMs), async () => {
      const output = path.join(parent, 'not-created');
      await assert.rejects(benchmarkLiveFactory({ provider: 'fixture', model: 'no-model', output, timeoutMs }), /timeout/i);
      await assert.rejects(fs.access(output), { code: 'ENOENT' });
    });
  }
  assert.equal(initialized, 0);
});
