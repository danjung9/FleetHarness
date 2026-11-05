import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExperimentCoordinator } from '../dist-electron/electron/experiment-coordinator.js';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { newProject } from '../dist-electron/electron/storage.js';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

const interrupted = () => Object.assign(new Error('Result collection was interrupted.'), { infrastructure: true });

async function fixture(t, hooks = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-finalization-'));
  const store = new LearningStore(root);
  await store.init();
  store.setSettings({ automaticComparisons: false, maxHumanRequestsPerDay: 0 });
  const project = newProject({ title: 'Scheduling tool', description: 'Build a valid schedule.', criteria: ['Return a valid schedule.'] });
  const events = [], verified = [];
  let reserved = false;
  const worker = (kind, context) => {
    const projection = structuredClone(context.project);
    const begin = async action => {
      events.push({ kind, action, projectId: projection.id });
      if (action === 'resume') assert.ok(['stopped', 'failed'].includes(projection.status), 'The backend resumes only interrupted projections.');
      projection.runId ??= `run-${projection.id}`;
      projection.workspace ??= path.join(root, projection.id);
      projection.status = 'running';
      projection.resumeStage = kind === 'shared' ? 'research' : 'build';
      await context.saveProjection(projection);
      await hooks.beforeComplete?.({ kind, context, projection, action });
      projection.status = 'review';
      projection.resumeStage = undefined;
      projection.stages.forEach(stage => { stage.status = 'complete'; });
      await context.saveProjection(projection);
    };
    return {
      start: () => begin('start'),
      resume: () => begin('resume'),
      wait: async () => {},
      stop: async () => { events.push({ kind, action: 'stop', projectId: projection.id }); await hooks.stop?.(); },
      result: async () => {
        events.push({ kind, action: 'result', projectId: projection.id });
        assert.equal(projection.status, 'review', 'Collect evidence only from the completed projection.');
        await hooks.beforeResult?.({ kind, context, projection });
        if (kind === 'shared') return { workspace: projection.workspace, objectiveHash: 'objective-v1', taskFamily: 'scheduling', runtimeConstraints: ['service'], budgetTier: 'bounded' };
        return { mandatoryPassed: true, requiredScopePassed: true, withinBudget: true, terminalReason: 'completed',
          durationMs: 10, costUsd: null, repairCount: 0, sourceHash: `${context.candidate.id}-source`,
          contractHash: `${context.candidate.id}-contract`, evidenceHash: `${context.candidate.id}-evidence`,
          evaluatorVersion: 'host-v1', recordedAt: '2026-11-05T14:00:00Z' };
      },
    };
  };
  const coordinator = new ExperimentCoordinator({
    store,
    profiles: ['node', 'python'].map(id => ({ id, version: '1', label: id, instructions: `Use ${id}.`, budget: { timeoutMs: 60_000 } })),
    project: id => { assert.equal(id, project.id); return project; },
    modelConfig: () => ({ backend: 'pi', provider: 'fixture', model: 'fixture-v1' }),
    readiness: async () => ({ supported: true }),
    acquire: async () => { assert.equal(reserved, false); reserved = true; return () => { reserved = false; }; },
    sharedPlanner: async context => worker('shared', context),
    candidateWorker: async context => worker('candidate', context),
    verifyCandidate: async candidate => { verified.push(candidate.id); await hooks.verify?.(candidate); },
    applyPromotion: async () => { assert.fail('Finalizing an experiment must not promote a candidate.'); },
    classifyFailure: error => error.infrastructure ? 'infrastructure' : 'build-failed',
    random: () => 0.75,
    now: () => new Date('2026-11-05T14:00:00Z'),
    timeZone: 'UTC',
  });
  const coordinators = [coordinator];
  t.after(async () => { await Promise.all(coordinators.map(instance => instance.stopAll())); store.close(); await fs.rm(root, { recursive: true, force: true }); });
  return { store, project, coordinator, events, verified, isReserved: () => reserved,
    start: options => coordinator.start(project.id, { automatic: true, ...options }),
    freshCoordinator: () => { const restarted = new ExperimentCoordinator(coordinator.options); coordinators.push(restarted); return restarted; },
    actions: kind => events.filter(event => event.kind === kind).map(event => event.action) };
}

test('stopping shared result collection preserves completed planning for resume without freezing a result', { timeout: 5000 }, async t => {
  const entered = deferred(), release = deferred();
  let pause = true;
  const h = await fixture(t, {
    beforeResult: async ({ kind }) => {
      if (kind === 'shared' && pause) { pause = false; entered.resolve(); await release.promise; }
    },
    stop: () => release.resolve(),
  });
  const run = await h.start();
  await entered.promise;
  const before = h.store.getExperiment(run.id).sharedExecutionState;
  await h.coordinator.stop(run.id);
  const stopped = h.store.getExperiment(run.id);
  assert.equal(stopped.status, 'stopped');
  assert.equal(stopped.objectiveHash, undefined, 'A result finishing after stop must not become the frozen shared contract.');
  assert.deepEqual(stopped.candidateIds, []);
  assert.equal(h.store.listCandidates(run.id).length, 0);
  assert.deepEqual(h.actions('candidate'), []);
  assert.deepEqual(stopped.sharedExecutionState, before);
  assert.equal(before.status, 'review');
  assert.equal(before.resumeStage, undefined);
  assert.equal(h.isReserved(), false);
  await h.coordinator.resume(run.id);
  await h.coordinator.wait(run.id);
  const after = h.store.getExperiment(run.id);
  assert.equal(after.status, 'review');
  assert.equal(after.objectiveHash, 'objective-v1');
  assert.deepEqual(after.sharedExecutionState, before);
  assert.deepEqual(h.actions('shared'), ['start', 'result', 'stop', 'result']);
  assert.equal(h.store.listCandidates(run.id).length, 1);
  assert.equal(h.isReserved(), false);
});

for (const boundary of ['result', 'verification']) {
  test(`stopping during candidate ${boundary} leaves its completed output unscored`, { timeout: 5000 }, async t => {
    const entered = deferred(), release = deferred();
    const pause = async () => { entered.resolve(); await release.promise; };
    const h = await fixture(t, {
      beforeResult: async ({ kind }) => { if (kind === 'candidate' && boundary === 'result') await pause(); },
      verify: async () => { if (boundary === 'verification') await pause(); },
      stop: () => release.resolve(),
    });
    const run = await h.start();
    await entered.promise;
    const policiesBeforeStop = h.store.listPolicies().map(policy => policy.id);
    await h.coordinator.stop(run.id);
    const [candidate] = h.store.listCandidates(run.id);
    assert.equal(h.store.getExperiment(run.id).status, 'stopped');
    assert.equal(candidate.status, 'stopped');
    assert.equal(candidate.outcome, undefined, 'A cancellation cannot commit immutable success after the stop request.');
    assert.equal(candidate.executionState.status, 'review', 'Keep completed artifacts available for finalization on resume.');
    assert.equal(candidate.executionState.resumeStage, undefined);
    assert.deepEqual(h.store.listPolicies().map(policy => policy.id), policiesBeforeStop, 'Interrupted outcomes must not train a policy.');
    assert.equal(h.store.listObservations().length, 0);
    assert.equal(h.isReserved(), false);
    if (boundary === 'result') assert.equal(h.verified.length, 0, 'Cancellation must be observed before verification starts.');
  });
}

for (const stoppedIndex of [0, 1]) {
  test(`stopping paired candidate ${stoppedIndex + 1} preserves earlier outcomes and prevents learning`, { timeout: 5000 }, async t => {
    const entered = deferred(), release = deferred();
    let verificationIndex = 0;
    const h = await fixture(t, {
      verify: async () => { if (verificationIndex++ === stoppedIndex) { entered.resolve(); await release.promise; } },
      stop: () => release.resolve(),
    });
    const run = await h.start({ automatic: false, mode: 'paired' });
    await entered.promise;
    const before = h.store.listCandidates(run.id), policies = h.store.listPolicies().map(policy => policy.id);
    assert.equal(before.length, 2);
    await h.coordinator.stop(run.id);
    const after = h.store.listCandidates(run.id);
    assert.equal(h.store.getExperiment(run.id).status, 'stopped');
    assert.equal(after[stoppedIndex].status, 'stopped');
    assert.equal(after[stoppedIndex].outcome, undefined);
    if (stoppedIndex === 1) {
      assert.equal(after[0].status, 'passed');
      assert.deepEqual(after[0].outcome, before[0].outcome, 'An earlier committed outcome stays immutable.');
    } else {
      assert.equal(after[1].status, 'queued');
      assert.equal(after[1].executionState, undefined, 'Cancellation must prevent the next worker from starting.');
    }
    assert.equal(h.actions('candidate').filter(action => action === 'start').length, stoppedIndex + 1);
    assert.deepEqual(h.store.listPolicies().map(policy => policy.id), policies);
    assert.equal(h.store.listObservations().length, 0);
    assert.equal(h.isReserved(), false);
  });
}

test('resume finalizes an existing completed candidate without rebuilding its artifacts', async t => {
  let fail = true;
  const h = await fixture(t, { beforeResult: async ({ kind }) => {
    if (kind === 'candidate' && fail) { fail = false; throw interrupted(); }
  } });
  const run = await h.start();
  await h.coordinator.wait(run.id);
  const [before] = h.store.listCandidates(run.id);
  assert.equal(h.store.getExperiment(run.id).status, 'stopped');
  assert.equal(before.executionState.status, 'review');
  assert.equal(before.executionState.resumeStage, undefined);
  assert.equal(before.outcome, undefined);
  await h.coordinator.resume(run.id);
  await h.coordinator.wait(run.id);
  const [after] = h.store.listCandidates(run.id);
  assert.deepEqual(h.actions('candidate'), ['start', 'result', 'result'], 'Resume must recollect host evidence without starting or resuming the completed backend.');
  assert.deepEqual(after.executionState, before.executionState);
  assert.equal(after.id, before.id);
  assert.equal(after.status, 'passed');
  assert.deepEqual(h.verified, [before.id]);
  assert.equal(h.store.getExperiment(run.id).status, 'review');
  assert.deepEqual(h.actions('shared'), ['start', 'result']);
  assert.equal(h.isReserved(), false);
});

test('resume recovers completed shared planning before any candidate was dispatched', async t => {
  let fail = true;
  const h = await fixture(t, { beforeResult: async ({ kind }) => {
    if (kind === 'shared' && fail) { fail = false; throw interrupted(); }
  } });
  const run = await h.start();
  await h.coordinator.wait(run.id);
  const before = h.store.getExperiment(run.id);
  assert.equal(before.status, 'failed');
  assert.equal(before.sharedExecutionState.status, 'review');
  assert.equal(before.sharedExecutionState.resumeStage, undefined);
  assert.equal(before.objectiveHash, undefined);
  assert.deepEqual(before.candidateIds, []);
  await h.coordinator.resume(run.id);
  await h.coordinator.wait(run.id);
  const after = h.store.getExperiment(run.id);
  assert.deepEqual(h.actions('shared'), ['start', 'result', 'result']);
  assert.deepEqual(after.sharedExecutionState, before.sharedExecutionState);
  assert.equal(after.objectiveHash, 'objective-v1');
  assert.equal(after.status, 'review');
  assert.equal(h.store.listCandidates(run.id).length, 1);
  assert.equal(h.isReserved(), false);
});

test('recovered completed candidates still require fresh host verification', async t => {
  let fail = true;
  const h = await fixture(t, {
    beforeResult: async ({ kind }) => { if (kind === 'candidate' && fail) { fail = false; throw interrupted(); } },
    verify: async () => { throw new Error('Source fingerprint changed after the interruption.'); },
  });
  const run = await h.start();
  await h.coordinator.wait(run.id);
  const [before] = h.store.listCandidates(run.id);
  await h.coordinator.resume(run.id);
  await h.coordinator.wait(run.id);
  const [after] = h.store.listCandidates(run.id);
  assert.deepEqual(h.actions('candidate'), ['start', 'result', 'result']);
  assert.deepEqual(h.verified, [before.id]);
  assert.equal(after.status, 'failed');
  assert.equal(after.outcome.mandatoryPassed, false);
  assert.match(after.error, /Source fingerprint changed/);
  assert.equal(h.store.getExperiment(run.id).status, 'failed');
});

for (const interruptedKind of ['shared', 'candidate']) {
  test(`startup recovery resumes a crashed running ${interruptedKind} projection through a fresh coordinator`, async t => {
    let fail = true;
    const h = await fixture(t, { beforeComplete: async ({ kind }) => {
      if (kind === interruptedKind && fail) { fail = false; throw interrupted(); }
    } });
    const run = await h.start();
    await h.coordinator.wait(run.id);
    const before = interruptedKind === 'shared' ? h.store.getExperiment(run.id).sharedExecutionState : h.store.listCandidates(run.id)[0].executionState;
    assert.equal(before.status, 'running');
    assert.ok(before.resumeStage);
    // Model persisted records from a process crash, before exception handling could mark them stopped.
    h.store.updateExperiment(run.id, { status: interruptedKind === 'shared' ? 'planning' : 'running', error: undefined });
    if (interruptedKind === 'candidate') h.store.updateCandidate(h.store.listCandidates(run.id)[0].id, { status: 'running', error: undefined });
    const restarted = h.freshCoordinator();
    await restarted.recover();
    assert.equal(h.store.getExperiment(run.id).status, 'stopped');
    if (interruptedKind === 'candidate') assert.equal(h.store.listCandidates(run.id)[0].status, 'stopped');
    assert.equal(restarted.active.size, 0, 'Startup recovery must wait for an explicit resume.');
    await restarted.resume(run.id);
    await restarted.wait(run.id);
    assert.equal(h.store.getExperiment(run.id).status, 'review');
    assert.deepEqual(h.actions(interruptedKind), ['start', 'resume', 'result']);
    const after = interruptedKind === 'shared' ? h.store.getExperiment(run.id).sharedExecutionState : h.store.listCandidates(run.id)[0].executionState;
    assert.equal(after.runId, before.runId);
    assert.equal(after.workspace, before.workspace);
    assert.equal(h.isReserved(), false);
  });
}
