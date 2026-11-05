import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExperimentCoordinator } from '../dist-electron/electron/experiment-coordinator.js';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { newProject } from '../dist-electron/electron/storage.js';

const interruption = () => Object.assign(new Error('Result collection interrupted.'), { infrastructure: true });
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-failed-finalization-'));
  const store = new LearningStore(root);
  await store.init();
  store.setSettings({ automaticComparisons: false, maxHumanRequestsPerDay: 0 });
  const project = newProject({ title: 'Sum values', description: 'Calculate a total from supplied values.', criteria: ['Return the correct total.'] });
  const events = [], entered = deferred(), release = deferred();
  let firstResult = true, interruptedExecution = false, reserved = false;
  const worker = (kind, context) => {
    const projection = structuredClone(context.project);
    const save = () => context.saveProjection(projection);
    const begin = async action => {
      events.push(`${kind}:${action}`);
      if (action === 'resume') assert.ok(['failed', 'stopped'].includes(projection.status));
      projection.runId ??= `run-${projection.id}`;
      projection.workspace ??= path.join(root, projection.id);
      projection.status = 'running'; projection.resumeStage = kind === 'shared' ? 'plan' : 'build';
      projection.executionFailure = undefined;
      await save();
      if (options.interruptedState?.kind === kind && !interruptedExecution) {
        interruptedExecution = true;
        Object.assign(projection, options.interruptedState.state);
        await save();
        throw interruption();
      }
      projection.status = 'review'; projection.resumeStage = undefined;
      if (kind === 'candidate' && options.failure) {
        projection.status = 'failed'; projection.executionFailure = options.failure;
        projection.resumeStage = options.noResumeStage ? undefined : 'verify';
        projection.error = 'Host-classified terminal failure.';
      }
      await save();
    };
    return {
      start: () => begin('start'), resume: () => begin('resume'), wait: async () => {},
      stop: async () => { events.push(`${kind}:stop`); release.resolve(); },
      result: async () => {
        events.push(`${kind}:result`);
        if (kind === 'shared') return { workspace: projection.workspace, objectiveHash: 'objective-v1', taskFamily: 'arithmetic', runtimeConstraints: ['cli'], budgetTier: 'bounded' };
        if (options.failure) assert.equal(projection.status, 'failed');
        if (options.failure && firstResult) {
          firstResult = false;
          if (options.cancel) { entered.resolve(); await release.promise; }
          else throw interruption();
        }
        return {
          mandatoryPassed: !options.failure, requiredScopePassed: !options.failure, withinBudget: options.failure !== 'budget',
          terminalReason: options.failure === 'budget' ? 'timeout' : options.failure ? 'verification-failed' : 'completed',
          durationMs: 42_000, costUsd: null, repairCount: 1, sourceHash: 'original-source', contractHash: 'original-contract',
          evidenceHash: 'original-evidence', evaluatorVersion: 'host-v1', recordedAt: '2026-11-05T11:30:00Z',
        };
      },
    };
  };
  const config = {
    store,
    profiles: ['node', 'python'].map(id => ({ id, version: '1', label: id, instructions: `Use ${id}.`, budget: { timeoutMs: 60_000 } })),
    project: id => { assert.equal(id, project.id); return project; },
    modelConfig: () => ({ backend: 'pi', provider: 'fixture', model: 'fixture-v1' }),
    readiness: async () => ({ supported: true }),
    acquire: async () => { assert.equal(reserved, false); reserved = true; return () => { reserved = false; }; },
    sharedPlanner: async context => worker('shared', context),
    candidateWorker: async context => worker('candidate', context),
    verifyCandidate: async () => { assert.ok(!options.failure, 'Failed candidates cannot be verified as successful.'); },
    applyPromotion: async () => assert.fail('Finalization must not promote a candidate.'),
    classifyFailure: error => error.infrastructure ? 'infrastructure' : 'build-failed',
    random: () => 0.75, timeZone: 'UTC',
  };
  const instances = [];
  const coordinator = () => { const instance = new ExperimentCoordinator(config); instances.push(instance); return instance; };
  const initial = coordinator();
  t.after(async () => { release.resolve(); await Promise.all(instances.map(instance => instance.stopAll())); store.close(); await fs.rm(root, { recursive: true, force: true }); });
  return { store, initial, coordinator, events, entered, reserved: () => reserved,
    start: () => initial.start(project.id, { automatic: true }) };
}

for (const failure of ['implementation', 'budget']) {
  for (const boundary of ['collection-error', 'user-stop', 'missing-resume-stage']) {
    test(`resumed ${failure} failure is finalized without redispatch after ${boundary}`, { timeout: 5000 }, async t => {
      const h = await fixture(t, { failure, cancel: boundary === 'user-stop', noResumeStage: boundary === 'missing-resume-stage' });
      const run = await h.start();
      if (boundary === 'user-stop') { await h.entered.promise; await h.initial.stop(run.id); }
      else await h.initial.wait(run.id);
      const [before] = h.store.listCandidates(run.id);
      assert.equal(before.executionState.status, 'failed');
      assert.equal(before.executionState.executionFailure, failure);
      assert.equal(before.outcome, undefined);
      assert.equal(h.store.getExperiment(run.id).status, 'stopped');
      assert.equal(h.store.listObservations().length, 0);
      assert.equal(h.reserved(), false);
      const recovered = h.coordinator();
      await recovered.recover(); await recovered.resume(run.id); await recovered.wait(run.id);
      const [after] = h.store.listCandidates(run.id);
      assert.deepEqual(h.events.filter(event => event.startsWith('candidate:')), ['candidate:start', 'candidate:result', ...(boundary === 'user-stop' ? ['candidate:stop'] : []), 'candidate:result']);
      assert.deepEqual(after.executionState, before.executionState, 'Finalization preserves the exact completed execution projection.');
      assert.deepEqual(after.outcome, {
        mandatoryPassed: false, requiredScopePassed: false, withinBudget: failure !== 'budget',
        terminalReason: failure === 'budget' ? 'timeout' : 'verification-failed', durationMs: 42_000,
        costUsd: null, repairCount: 1, sourceHash: 'original-source', contractHash: 'original-contract', evidenceHash: 'original-evidence',
        evaluatorVersion: 'host-v1', recordedAt: '2026-11-05T11:30:00Z',
      });
      assert.equal(after.status, 'failed');
      assert.equal(h.store.getExperiment(run.id).status, 'failed');
      assert.equal(h.reserved(), false);
      await assert.rejects(recovered.resume(run.id), /finalized outcomes/);
    });
  }
}

for (const [label, state] of [
  ['infrastructure', { status: 'failed', executionFailure: 'infrastructure' }],
  ['integrity', { status: 'failed', executionFailure: 'integrity' }],
  ['legacy unclassified failure', { status: 'failed' }],
  ['user cancellation', { status: 'stopped', executionFailure: 'cancelled' }],
  ['crashed active execution', { status: 'running' }],
  ['stopped projection with old implementation marker', { status: 'stopped', executionFailure: 'implementation' }],
]) {
  test(`${label} still resumes execution before collecting an outcome`, async t => {
    const h = await fixture(t, { interruptedState: { kind: 'candidate', state } });
    const run = await h.start(); await h.initial.wait(run.id);
    const [before] = h.store.listCandidates(run.id);
    assert.equal(before.outcome, undefined);
    assert.equal(before.executionState.status, state.status);
    const recovered = h.coordinator();
    await recovered.recover(); await recovered.resume(run.id); await recovered.wait(run.id);
    const [after] = h.store.listCandidates(run.id);
    assert.deepEqual(h.events.filter(event => event.startsWith('candidate:')), ['candidate:start', 'candidate:resume', 'candidate:result']);
    assert.equal(after.status, 'passed');
    assert.equal(after.executionState.runId, before.executionState.runId);
    assert.equal(after.executionState.workspace, before.executionState.workspace);
    assert.equal(h.reserved(), false);
  });
}

for (const failure of ['implementation', 'budget']) {
  test(`shared planning ${failure} failure still resumes its existing planning checkpoint`, async t => {
    const h = await fixture(t, { interruptedState: { kind: 'shared', state: { status: 'failed', executionFailure: failure } } });
    const run = await h.start(); await h.initial.wait(run.id);
    assert.equal(h.store.getExperiment(run.id).objectiveHash, undefined);
    assert.equal(h.store.listCandidates(run.id).length, 0);
    const recovered = h.coordinator();
    await recovered.resume(run.id); await recovered.wait(run.id);
    assert.deepEqual(h.events.filter(event => event.startsWith('shared:')), ['shared:start', 'shared:resume', 'shared:result']);
    assert.equal(h.store.getExperiment(run.id).status, 'review');
    assert.equal(h.reserved(), false);
  });
}
