import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RunBudget } from '../dist-electron/electron/run-budget.js';
import { Store } from '../dist-electron/electron/storage.js';
import { normalizeBuildTimeLimitMinutes } from '../dist-electron/shared/run-budget.js';

function clock() {
  let monotonic = 0, wall = Date.parse('2026-11-04T15:00:00.000Z'), sequence = 0;
  const timers = new Map();
  return {
    now: () => monotonic,
    wallNow: () => wall,
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, at: monotonic + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    advance(milliseconds) {
      const target = monotonic + milliseconds;
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        wall += next[1].at - monotonic; monotonic = next[1].at; timers.delete(next[0]); next[1].callback();
      }
      wall += target - monotonic; monotonic = target;
    },
    shiftWall(milliseconds) { wall += milliseconds; },
    get pending() { return timers.size; }
  };
}

function fixture(limit = 1000, elapsed = 0) {
  const time = clock(), controller = new AbortController();
  const summary = {
    version: 1, runId: 'fixture-run', backend: 'pi', model: 'fixture/fixture',
    startedAt: new Date(time.wallNow() - elapsed).toISOString(),
    deadlineAt: new Date(time.wallNow() + limit - elapsed).toISOString(),
    timeLimitMs: limit, elapsedMs: elapsed, phases: [], usage: {}
  };
  const budget = new RunBudget(summary, controller, time);
  return { time, controller, summary, budget };
}

test('saved settings retain a default and invalid whole-build allowances are rejected', () => {
  assert.equal(normalizeBuildTimeLimitMinutes(undefined), 60);
  assert.equal(normalizeBuildTimeLimitMinutes(1), 1);
  assert.equal(normalizeBuildTimeLimitMinutes(180), 180);
  for (const value of [0, -1, 181, 1.5, NaN, Infinity, '60', null]) {
    assert.throws(() => normalizeBuildTimeLimitMinutes(value), /time|budget|minute/i, String(value));
  }
});

test('production construction uses the default monotonic clock when no test clock is provided', () => {
  const now = Date.now(), controller = new AbortController();
  const summary = { runId: 'production-clock', backend: 'pi', model: 'fixture', timeLimitMs: 60_000, elapsedMs: 0,
    startedAt: new Date(now).toISOString(), deadlineAt: new Date(now + 60_000).toISOString(), phases: [], usage: {} };
  const budget = new RunBudget(summary, controller);
  try { assert.ok(budget.remainingMs() > 59_000); assert.equal(controller.signal.aborted, false); }
  finally { budget.finish('completed'); }
});

test('one deadline spans phase boundaries instead of allocating a fresh stage allowance', () => {
  const { time, controller, budget, summary } = fixture();
  budget.phase('setup', 'Session setup'); time.advance(700);
  budget.phase('intake', 'Intake'); assert.equal(budget.remainingMs(), 300);
  time.advance(299); assert.equal(controller.signal.aborted, false);
  time.advance(1); assert.equal(controller.signal.aborted, true);
  assert.match(controller.signal.reason.message, /time.*budget|budget.*exhaust|whole.build/i);
  assert.throws(() => budget.check(), /time.*budget|budget.*exhaust|whole.build/i);
  budget.finish('time_budget_exhausted');
  assert.equal(summary.elapsedMs, 1000);
  assert.deepEqual(summary.phases.map(phase => [phase.id, phase.durationMs]), [['setup', 700], ['intake', 300]]);
  assert.equal(time.pending, 0);
});

test('expiry rejects stuck work, prevents dispatch afterward, and tolerates late settlement', async () => {
  const { time, budget } = fixture();
  let resolve, dispatched = 0;
  const operation = budget.wait(() => { dispatched++; return new Promise(done => { resolve = done; }); });
  const rejected = assert.rejects(operation, /time.*budget|budget.*exhaust|whole.build/i);
  time.advance(1000); await rejected;
  await assert.rejects(budget.wait(async () => { dispatched++; }), /time.*budget|budget.*exhaust|whole.build/i);
  assert.equal(dispatched, 1);
  resolve('late'); await Promise.resolve();
  budget.finish('time_budget_exhausted');
});

test('wall-clock changes cannot renew or prematurely consume the active monotonic deadline', () => {
  const { time, controller, budget } = fixture();
  time.advance(200); time.shiftWall(-3_600_000);
  assert.equal(budget.remainingMs(), 800);
  time.shiftWall(7_200_000); assert.equal(budget.remainingMs(), 800);
  time.advance(800); assert.equal(controller.signal.aborted, true);
  budget.finish('time_budget_exhausted');
});

test('ending automatic work freezes duration and excludes human review and packaging time', () => {
  const { time, budget, summary, controller } = fixture();
  budget.phase('verify', 'Verification'); time.advance(400); budget.finish('completed');
  const saved = structuredClone(summary);
  time.advance(20_000); budget.snapshot();
  assert.deepEqual(summary, saved);
  assert.equal(summary.elapsedMs, 400);
  assert.equal(summary.terminalReason, 'completed');
  assert.ok(summary.finishedAt);
  assert.equal(controller.signal.aborted, false);
  assert.equal(time.pending, 0);
});

test('user cancellation rejects stuck operations with the caller reason and clears the deadline', async () => {
  const { time, budget, controller, summary } = fixture();
  const operation = budget.wait(() => new Promise(() => {}));
  const rejected = assert.rejects(operation, /stopped by you/i);
  time.advance(200); controller.abort(new Error('Run stopped by you.'));
  await rejected; budget.finish('stopped');
  assert.equal(summary.elapsedMs, 200);
  assert.equal(time.pending, 0);
  time.advance(5000); assert.match(controller.signal.reason.message, /stopped by you/i);
});

test('restored consumed time cannot renew the whole-build allowance', () => {
  const { time, budget, controller, summary } = fixture(1000, 750);
  assert.equal(budget.remainingMs(), 250);
  time.advance(250); assert.equal(controller.signal.aborted, true);
  budget.finish('time_budget_exhausted'); assert.equal(summary.elapsedMs, 1000);
});

test('interrupted persisted runs retain consumed allowance and partial usage on application restart', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-budget-recovery-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new Store(root); await store.init();
  const project = store.state.projects[0], now = Date.now();
  project.status = 'running'; project.runId = 'interrupted-budget';
  project.workspace = path.join(root, 'workspaces', project.id, project.runId);
  await fs.mkdir(project.workspace, { recursive: true });
  const usage = { version: 1, backend: 'pi', prompts: 3, requests: { value: 2, state: 'partial' },
    tokens: { value: 900, state: 'partial' }, inputTokens: { value: 800, state: 'partial' },
    outputTokens: { value: 100, state: 'partial' }, cachedInputTokens: { value: null, state: 'unavailable' },
    cacheWriteTokens: { value: null, state: 'unavailable' }, reasoningTokens: { value: null, state: 'unavailable' },
    costUsd: { value: null, state: 'unavailable' }, phases: [], limitations: ['An interrupted request has no final usage.'] };
  project.runSummary = { runId: project.runId, backend: 'pi', model: 'fixture/fixture',
    startedAt: new Date(now - 1000).toISOString(), deadlineAt: new Date(now + 59_000).toISOString(),
    timeLimitMs: 60_000, elapsedMs: 1000,
    phases: [{ id: 'build', label: 'Build', startedAt: new Date(now - 500).toISOString(), durationMs: 500 }],
    usage: structuredClone(usage) };
  project.stages.find(stage => stage.id === 'build').status = 'active';
  await store.save();
  const restored = new Store(root); await restored.init();
  const recovered = restored.project(project.id);
  assert.equal(recovered.status, 'stopped');
  assert.equal(recovered.runSummary.terminalReason, 'interrupted');
  assert.equal(recovered.runSummary.timeLimitMs, 60_000);
  assert.ok(recovered.runSummary.elapsedMs >= 1000);
  assert.equal(recovered.runSummary.deadlineAt, project.runSummary.deadlineAt);
  assert.ok(recovered.runSummary.finishedAt);
  for (const field of ['prompts', 'requests', 'tokens', 'inputTokens', 'outputTokens', 'costUsd']) {
    assert.deepEqual(recovered.runSummary.usage[field], usage[field], field);
  }
  assert.ok(recovered.runSummary.usage.limitations.includes(usage.limitations[0]));
  assert.equal(recovered.stages.find(stage => stage.id === 'build').status, 'failed');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(recovered.workspace, 'run-summary.json'), 'utf8')), recovered.runSummary);
});

test('legacy saved workspaces open without synthesizing usage or treating old runs as zero-cost', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-budget-legacy-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new Store(root); await store.init();
  const project = store.state.projects[0]; project.status = 'stopped'; project.runId = 'legacy';
  delete store.state.settings.buildTimeLimitMinutes;
  await store.save();
  const restored = new Store(root); await restored.init();
  assert.equal(restored.project(project.id).runSummary, undefined);
  assert.equal(normalizeBuildTimeLimitMinutes(restored.state.settings.buildTimeLimitMinutes), 60);
});
