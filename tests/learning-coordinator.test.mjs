import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { ExperimentCoordinator } from '../dist-electron/electron/experiment-coordinator.js';
import { newProject } from '../dist-electron/electron/storage.js';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function fixture(t, overrides = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-experiments-'));
  const store = new LearningStore(root); await store.init();
  const project = newProject({ title: 'Scheduling tool', description: 'Calculate a schedule from supplied constraints.', criteria: ['Return a valid schedule.'] });
  const profiles = ['static', 'node', 'python', 'node-cli', 'python-cli'].map(id => ({ id, version: '1', label: id, instructions: `Use ${id}.`, budget: { timeoutMs: 90 * 60_000 } }));
  const model = { backend: 'pi', provider: 'fixture', model: 'fixture-v1' };
  const events = [], projections = new Map(), verified = [], promotions = [], applied = new Set();
  let reserved = false, maximumWorkers = 0, runningWorkers = 0, date = new Date('2026-11-05T14:00:00Z');
  const outcome = (context, success = true) => ({ mandatoryPassed: success, requiredScopePassed: success, withinBudget: true,
    terminalReason: success ? 'completed' : 'verification-failed', durationMs: 10, costUsd: null, repairCount: 0,
    sourceHash: `${context.candidate.id}-source`, contractHash: `${context.candidate.id}-contract`, evidenceHash: `${context.candidate.id}-evidence`, evaluatorVersion: 'host-v1', recordedAt: date.toISOString() });
  const createWorker = (kind, context) => {
    let waiting = Promise.resolve(), stopped = false;
    const begin = async resume => {
      runningWorkers++; maximumWorkers = Math.max(maximumWorkers, runningWorkers); events.push(`${kind}:${context.profile?.id ?? 'shared'}:${resume ? 'resume' : 'start'}`);
      const projection = { ...structuredClone(context.project), runId: context.project.runId ?? `run-${context.project.id}`,
        workspace: path.join(root, context.project.id), status: 'running', resumeStage: kind === 'shared' ? 'research' : 'build' };
      await context.saveProjection(projection); projections.set(context.project.id, projection);
      waiting = Promise.resolve().then(async () => {
        try {
          await overrides.worker?.({ kind, context, resume, projection, isStopped: () => stopped });
          projection.status = stopped ? 'stopped' : 'review';
          await context.saveProjection(projection);
        } finally { runningWorkers--; }
      });
    };
    return { start: () => begin(false), resume: () => begin(true), stop: async () => { stopped = true; await overrides.stop?.(context); }, wait: () => waiting,
      result: async () => kind === 'shared' ? { workspace: path.join(root, context.project.id), objectiveHash: 'objective', taskFamily: 'scheduling', runtimeConstraints: ['service'], budgetTier: 'bounded' }
        : outcome(context, overrides.success?.(context.profile.id) ?? true) };
  };
  const options = { store, profiles, project: id => { assert.equal(id, project.id); return project; }, modelConfig: () => model,
    readiness: async () => ({ supported: true }), selectProfiles: async (_shared, registry) => registry.filter(item => ['node', 'python'].includes(item.id)),
    acquire: async () => { if (reserved) throw new Error('Host capacity is busy.'); reserved = true; return () => { reserved = false; }; },
    sharedPlanner: async context => createWorker('shared', context), candidateWorker: async context => createWorker('candidate', context),
    verifyCandidate: async candidate => { verified.push(candidate.id); if (overrides.rejectVerification?.(candidate)) throw new Error('Source fingerprint changed.'); },
    applyPromotion: async record => {
      promotions.push(record.id);
      if (!applied.has(record.id)) { Object.assign(project, record.payload.project, { id: project.id, status: 'review', approvedAt: undefined, exportedTo: undefined, executable: undefined }); applied.add(record.id); }
      await overrides.applyPromotion?.(record);
    }, random: () => 0.75, now: () => date, timeZone: 'America/New_York', ...overrides.options };
  const coordinator = new ExperimentCoordinator(options);
  t.after(async () => { await coordinator.stopAll(); store.close(); await fs.rm(root, { recursive: true, force: true }); });
  return { root, store, project, profiles, model, events, coordinator, options, verified, promotions, applied,
    maxWorkers: () => maximumWorkers, isReserved: () => reserved, setDate: value => { date = new Date(value); } };
}

test('five-profile registry resolves a frozen pair, executes sequentially, and publishes only safe summaries', async t => {
  const h = await fixture(t);
  const before = structuredClone(h.project);
  const run = await h.coordinator.start(h.project.id, { requestId: 'first', mode: 'paired' });
  await h.coordinator.wait(run.id);
  assert.deepEqual(h.project, before, 'Detached workers cannot rewrite the parent project.');
  assert.equal(h.maxWorkers(), 1); assert.equal(h.isReserved(), false);
  assert.deepEqual(h.events, ['shared:shared:start', 'candidate:node:start', 'candidate:python:start']);
  const record = h.store.getExperiment(run.id);
  assert.equal(record.profileSnapshots.length, 5); assert.deepEqual(record.eligibleProfileIds, ['node', 'python']);
  assert.deepEqual(record.comparisonProfileIds, ['node', 'python']); assert.equal(record.baselineProfileId, 'node');
  assert.equal(h.coordinator.inspect(run.id).status, 'review'); assert.equal(h.coordinator.inspect(run.id).candidates.length, 2);
  assert.ok(!JSON.stringify(h.coordinator.inspect(run.id)).includes(h.root));
  assert.ok(!JSON.stringify(h.coordinator.inspect(run.id)).includes('executionState'));
  assert.equal((await h.coordinator.start(h.project.id, { requestId: 'first' })).id, run.id);
  assert.equal(h.store.listExperiments().length, 1);
});

test('unsupported isolation fails before creating history or acquiring host capacity', async t => {
  const h = await fixture(t, { options: { readiness: async () => ({ supported: false, reason: 'Isolation unavailable.' }) } });
  await assert.rejects(h.coordinator.start(h.project.id), /Isolation unavailable/);
  assert.equal(h.store.listExperiments().length, 0); assert.equal(h.isReserved(), false); assert.equal(h.events.length, 0);
});

test('ordinary paired-mode runs earn bounded comparison credits while explicit comparisons remain separate', async t => {
  const h = await fixture(t, { options: { random: () => 0 } });
  h.store.setSettings({ mode: 'paired', automaticComparisons: true });
  let normalCandidates = 0;
  for (let i = 0; i < 10; i++) {
    const run = await h.coordinator.start(h.project.id, { automatic: true }); await h.coordinator.wait(run.id);
    const experiment = h.store.getExperiment(run.id), decision = h.store.getDecision(experiment.decisionId);
    assert.equal(experiment.mode, 'single'); assert.equal(decision.selectedProfileId, 'node');
    assert.equal(decision.comparisonProbability, i === 9 ? 0.1 : 0);
    assert.equal(decision.compare, i === 9); normalCandidates += experiment.candidateIds.length;
  }
  assert.equal(normalCandidates, 11);
  const manual = await h.coordinator.start(h.project.id, { mode: 'paired' }); await h.coordinator.wait(manual.id);
  const record = h.store.getExperiment(manual.id), decision = h.store.getDecision(record.decisionId);
  assert.equal(record.candidateIds.length, 2); assert.equal(decision.creditAfter, 0); assert.equal(decision.comparisonProbability, 1);
});

test('eight warmup comparisons automatically enroll a fixed twelve-task validation batch and activate only that snapshot', async t => {
  let regressionChecks = 0;
  const h = await fixture(t, { options: { regressionCheck: async () => { regressionChecks++; return true; } } });
  const run = async index => {
    h.setDate(new Date(Date.UTC(2026, 10, 5, 14, index)).toISOString());
    const result = await h.coordinator.start(h.project.id, { mode: 'paired', lineageId: `fresh-lineage-${index}` }); await h.coordinator.wait(result.id);
    assert.equal(h.coordinator.inspect(result.id).status, 'review'); return h.store.getExperiment(result.id);
  };
  const training = []; for (let index = 0; index < 8; index++) training.push(await run(index));
  assert.ok(training.every(value => value.partition === 'development')); assert.equal(h.store.listPolicies().filter(value => value.status === 'active').length, 0);
  const validation = []; for (let index = 8; index < 20; index++) validation.push(await run(index));
  assert.ok(validation.every(value => value.partition === 'validation' && value.mode === 'holdout'));
  assert.equal(new Set(validation.map(value => value.policySnapshotId)).size, 1); assert.equal(new Set(validation.map(value => value.memorySnapshotId)).size, 1);
  assert.ok(validation.every(value => value.candidateIds.length === 2)); assert.equal(regressionChecks, 1);
  const active = h.store.listPolicies().find(value => value.status === 'active'); assert.ok(active); assert.equal(active.validation.validationPairs, 12);
  assert.equal(active.validation.validationExperimentIds.length, 12);
  assert.deepEqual(active.sourceExperimentIds, training.map(value => value.id));
  assert.ok(h.store.listObservations().every(value => value.partition === 'development' && training.some(experiment => experiment.id === value.experimentId)));
  await run(20);
  assert.equal(h.store.listPolicies().find(value => value.status === 'active').id, active.id, 'New training outcomes cannot inherit an old assessment.');
  assert.equal(h.store.listPolicies().at(-1).validation, undefined);
  const repeat = await h.coordinator.start(h.project.id, { mode: 'paired', lineageId: validation[0].lineageId }); await h.coordinator.wait(repeat.id);
  assert.equal(h.store.getExperiment(repeat.id).partition, 'validation', 'Repeating a held-out task remains excluded from training.');
  assert.equal(h.store.getExperiment(repeat.id).mode, 'paired', 'A repeat does not extend the completed prospective batch.');
  assert.equal(h.store.listExperiments().filter(value => value.mode === 'holdout').length, 12);
});

for (const delayedResult of [true, false]) test(`stopping automatic policy validation prevents late ${delayedResult} results from activating policy and resume rechecks the frozen batch`, { timeout: 10_000 }, async t => {
  const entered = deferred(), release = deferred();
  t.after(() => release.resolve());
  let regressionChecks = 0;
  const h = await fixture(t, { options: { regressionCheck: async () => {
    if (++regressionChecks === 1) { entered.resolve(); await release.promise; return delayedResult; }
    return true;
  } } });
  for (let index = 0; index < 19; index++) {
    h.setDate(new Date(Date.UTC(2026, 10, 5, 14, index)).toISOString());
    const run = await h.coordinator.start(h.project.id, { mode: 'paired', lineageId: `policy-cancellation-${index}` });
    await h.coordinator.wait(run.id);
  }
  h.setDate('2026-11-05T14:19:00Z');
  const run = await h.coordinator.start(h.project.id, { mode: 'paired', lineageId: 'policy-cancellation-19' });
  await entered.promise;
  const frozen = h.store.getExperiment(run.id), candidates = h.store.listCandidates(run.id), policies = h.store.listPolicies();
  const events = [...h.events];
  assert.equal(frozen.mode, 'holdout');
  assert.equal(h.store.listExperiments().filter(item => item.policySnapshotId === frozen.policySnapshotId && item.mode === 'holdout').length, 12);
  assert.ok(candidates.every(candidate => candidate.outcome));
  const stopping = h.coordinator.stop(run.id);
  assert.equal(h.coordinator.active.get(run.id).controller.signal.aborted, true);
  release.resolve();
  await stopping;
  assert.equal(h.store.listPolicies().filter(policy => policy.status === 'active').length, 0);
  assert.deepEqual(h.store.listPolicies(), policies, 'A cancelled assessment cannot persist a promoted policy.');
  assert.equal(h.store.getExperiment(run.id).status, 'stopped');
  assert.deepEqual(h.store.listCandidates(run.id), candidates);
  assert.equal(h.isReserved(), false);
  await h.coordinator.resume(run.id); await h.coordinator.wait(run.id);
  assert.equal(regressionChecks, 2, 'Resume must obtain a new successful regression result.');
  assert.equal(h.store.getExperiment(run.id).status, 'review');
  assert.equal(h.store.getExperiment(run.id).policySnapshotId, frozen.policySnapshotId);
  assert.deepEqual(h.store.listCandidates(run.id), candidates);
  assert.deepEqual(h.events, events, 'Finished candidates must not be rebuilt or charged again.');
  const active = h.store.listPolicies().filter(policy => policy.status === 'active');
  assert.equal(active.length, 1);
  assert.equal(active[0].validation.policySnapshotId, frozen.policySnapshotId);
  assert.equal(active[0].validation.validationPairs, 12);
});

test('a failed proposed validation choice remains in its batch and prevents automatic activation', async t => {
  let fail = false, regressionChecks = 0;
  const h = await fixture(t, { success: profile => !(fail && profile === 'python'), options: { random: () => 0.99, regressionCheck: async () => { regressionChecks++; return true; } } });
  for (let index = 0; index < 20; index++) {
    fail = index >= 8; h.setDate(new Date(Date.UTC(2026, 10, 5, 14, index)).toISOString());
    const run = await h.coordinator.start(h.project.id, { mode: 'paired', lineageId: `regression-${index}` }); await h.coordinator.wait(run.id);
  }
  const batch = h.store.listExperiments().filter(value => value.mode === 'holdout'); assert.equal(batch.length, 12);
  assert.ok(batch.every(value => h.store.listCandidates(value.id).some(candidate => candidate.status === 'failed')));
  assert.equal(h.store.listPolicies().filter(value => value.status === 'active').length, 0); assert.equal(regressionChecks, 0);
  const assessment = await h.coordinator.validatePolicy(batch[0].policySnapshotId, batch.map(value => value.id));
  assert.equal(assessment.validationPairs, 12); assert.equal(assessment.baselineRegressions, 12); assert.equal(assessment.eligible, false);
});

async function prepareRollbackValidation(h, prefix) {
  for (let index = 0; index < 19; index++) {
    h.setDate(new Date(Date.UTC(2026, 10, 5, 14, index)).toISOString());
    const run = await h.coordinator.start(h.project.id, { mode: 'paired', lineageId: `${prefix}-${index}` });
    await h.coordinator.wait(run.id);
  }
  h.setDate('2026-11-05T14:19:00Z');
  return h.coordinator.start(h.project.id, { mode: 'paired', lineageId: `${prefix}-19` });
}

for (const delayedResult of [true, false]) test(`policy rollback survives a delayed ${delayedResult} regression result without discarding completed candidates`, { timeout: 10_000 }, async t => {
  const entered = deferred(), release = deferred();
  t.after(() => release.resolve());
  let regressionChecks = 0;
  const h = await fixture(t, { options: { regressionCheck: async () => {
    regressionChecks++; entered.resolve(); await release.promise; return delayedResult;
  } } });
  const assessments = [], validatePolicy = h.coordinator.validatePolicy.bind(h.coordinator);
  h.coordinator.validatePolicy = async (...args) => { const result = await validatePolicy(...args); assessments.push(result); return result; };
  const run = await prepareRollbackValidation(h, `rollback-late-${delayedResult}`);
  await entered.promise;
  const frozen = h.store.getExperiment(run.id), candidates = h.store.listCandidates(run.id), events = [...h.events];
  const batch = h.store.listExperiments().filter(item => item.mode === 'holdout' && item.policySnapshotId === frozen.policySnapshotId).map(item => item.id);
  h.store.rollbackContext(frozen.cohortKey, 'Rolled back by the user.');
  const rolledBackPolicies = h.store.listPolicies();
  release.resolve(); await h.coordinator.wait(run.id);
  assert.equal(regressionChecks, 1);
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].eligible, false, 'A delayed result cannot authorize a retired proposal.');
  if (delayedResult) assert.match(assessments[0].reasons.join(' '), /rolled back|invalidated/i);
  assert.equal(h.store.getPolicy(frozen.policySnapshotId).status, 'rolled-back');
  assert.deepEqual(h.store.listPolicies(), rolledBackPolicies, 'No promoted snapshot may be written after rollback.');
  assert.equal(h.store.getRoutingState(frozen.cohortKey).rolledBack, true);
  assert.equal(h.store.getExperiment(run.id).status, 'review');
  assert.deepEqual(h.store.listCandidates(run.id), candidates);
  assert.deepEqual(h.events, events);
  assert.equal(h.isReserved(), false);
  await assert.rejects(validatePolicy(frozen.policySnapshotId, batch), /Frozen policy is unavailable/);
  assert.equal(regressionChecks, 1, 'Retry rejects the retired source before regression work.');
});

test('rollback while the last validation candidate runs keeps its finished apps reviewable and skips policy checks', { timeout: 10_000 }, async t => {
  const entered = deferred(), release = deferred();
  t.after(() => release.resolve());
  let regressionChecks = 0;
  const h = await fixture(t, { worker: async ({ kind, context }) => {
    if (kind === 'candidate' && context.experiment.lineageId === 'rollback-worker-19' && context.profile.id === 'python') {
      entered.resolve(); await release.promise;
    }
  }, options: { regressionCheck: async () => { regressionChecks++; return true; } } });
  const run = await prepareRollbackValidation(h, 'rollback-worker');
  await entered.promise;
  const frozen = h.store.getExperiment(run.id), candidateIds = [...frozen.candidateIds];
  h.store.rollbackContext(frozen.cohortKey, 'Rolled back by the user.');
  const policyCount = h.store.listPolicies().length;
  release.resolve(); await h.coordinator.wait(run.id);
  assert.equal(h.store.getExperiment(run.id).status, 'review');
  assert.deepEqual(h.store.getExperiment(run.id).candidateIds, candidateIds);
  assert.ok(h.store.listCandidates(run.id).every(candidate => candidate.status === 'passed' && candidate.outcome));
  assert.equal(regressionChecks, 0, 'Completed applications do not revive the retired proposal.');
  assert.equal(h.store.listPolicies().length, policyCount);
  assert.equal(h.store.listPolicies().filter(policy => policy.status === 'active').length, 0);
  assert.equal(h.store.getRoutingState(frozen.cohortKey).rolledBack, true);
  assert.equal(h.isReserved(), false);
});

test('stop and resume after policy rollback cannot revalidate the old batch, while a fresh proposal earns a new batch', { timeout: 10_000 }, async t => {
  const entered = deferred(), release = deferred();
  t.after(() => release.resolve());
  let regressionChecks = 0;
  const h = await fixture(t, { options: { regressionCheck: async () => {
    if (++regressionChecks === 1) { entered.resolve(); await release.promise; }
    return true;
  } } });
  const run = await prepareRollbackValidation(h, 'rollback-resume');
  await entered.promise;
  const frozen = h.store.getExperiment(run.id), candidates = h.store.listCandidates(run.id), events = [...h.events];
  h.store.rollbackContext(frozen.cohortKey, 'Rolled back by the user.');
  const stopping = h.coordinator.stop(run.id);
  release.resolve(); await stopping;
  assert.equal(h.store.getExperiment(run.id).status, 'stopped');
  await h.coordinator.resume(run.id); await h.coordinator.wait(run.id);
  assert.equal(h.store.getExperiment(run.id).status, 'review');
  assert.equal(regressionChecks, 1, 'Resuming keeps the applications but cannot revalidate the retired policy.');
  assert.deepEqual(h.store.listCandidates(run.id), candidates);
  assert.deepEqual(h.events, events, 'Finalized candidates must not be rebuilt.');
  assert.equal(h.store.getRoutingState(frozen.cohortKey).rolledBack, true);
  assert.equal(h.store.listPolicies().filter(policy => policy.status === 'active').length, 0);
  const fresh = [];
  for (let index = 20; index < 33; index++) {
    h.setDate(new Date(Date.UTC(2026, 10, 5, 14, index)).toISOString());
    const next = await h.coordinator.start(h.project.id, { mode: 'paired', lineageId: `rollback-fresh-${index}` });
    await h.coordinator.wait(next.id); fresh.push(h.store.getExperiment(next.id));
  }
  assert.equal(fresh[0].partition, 'development');
  assert.ok(fresh.slice(1).every(experiment => experiment.partition === 'validation' && experiment.mode === 'holdout'));
  const active = h.store.listPolicies().filter(policy => policy.status === 'active');
  assert.equal(active.length, 1);
  assert.notEqual(active[0].validation.policySnapshotId, frozen.policySnapshotId);
  assert.deepEqual(active[0].validation.validationExperimentIds, fresh.slice(1).map(experiment => experiment.id));
  assert.equal(h.store.getPolicy(frozen.policySnapshotId).status, 'rolled-back');
  assert.equal(h.store.getRoutingState(frozen.cohortKey).rolledBack, false);
  assert.equal(regressionChecks, 2, 'Only the new complete batch earns a fresh regression check.');
});

test('stop/resume preserves candidate identity, pinned model/profile/memory and checkpoints while preventing concurrent runs', async t => {
  const entered = deferred(), release = deferred();
  let blocked = false;
  const h = await fixture(t, { worker: async ({ kind, resume }) => { if (kind === 'candidate' && !resume && !blocked) { blocked = true; entered.resolve(); await release.promise; } }, stop: async () => release.resolve() });
  const run = await h.coordinator.start(h.project.id, { mode: 'paired' }); await entered.promise;
  await assert.rejects(h.coordinator.start(h.project.id), /active experiment/);
  await h.coordinator.stop(run.id);
  const frozen = h.store.getExperiment(run.id), candidateIds = [...frozen.candidateIds];
  assert.equal(frozen.status, 'stopped'); assert.equal(h.store.getCandidate(candidateIds[0]).outcome, undefined);
  h.model.model = 'different-model'; h.profiles.find(item => item.id === 'node').version = '2';
  h.store.setSettings({ memoryEnabled: false });
  await h.coordinator.resume(run.id); await h.coordinator.wait(run.id);
  const resumed = h.store.getExperiment(run.id);
  assert.deepEqual(resumed.candidateIds, candidateIds); assert.equal(resumed.modelConfig.model, 'fixture-v1');
  assert.equal(resumed.profileSnapshots.find(item => item.id === 'node').version, '1'); assert.equal(resumed.memorySnapshotId, frozen.memorySnapshotId);
  assert.ok(h.events.includes('candidate:node:resume')); assert.equal(h.events.filter(item => item.startsWith('shared')).length, 1);
  assert.equal(resumed.status, 'review'); assert.equal(h.maxWorkers(), 1);
});

test('selection verifies source intent, recovers interrupted promotion, and supports changing architecture without approving delivery', async t => {
  let fail = true;
  const h = await fixture(t, { applyPromotion: async () => { if (fail) { fail = false; throw new Error('Crash after parent save.'); } } });
  const run = await h.coordinator.start(h.project.id, { mode: 'paired' }); await h.coordinator.wait(run.id);
  const [a, b] = h.store.listCandidates(run.id);
  await assert.rejects(h.coordinator.select(run.id, a.id, 'stale'), /revision changed/);
  await assert.rejects(h.coordinator.select(run.id, a.id, a.outcome.sourceHash), /Crash after/);
  assert.equal(h.store.pendingPromotions().length, 1); assert.equal(h.applied.size, 1);
  await h.coordinator.recoverPromotions(); assert.equal(h.store.pendingPromotions().length, 0); assert.equal(h.applied.size, 1);
  h.project.status = 'approved'; h.project.approvedAt = 'old approval';
  await h.coordinator.select(run.id, b.id, b.outcome.sourceHash);
  assert.equal(h.project.status, 'review'); assert.equal(h.project.approvedAt, undefined);
  assert.equal(h.store.getExperiment(run.id).selectedCandidateId, b.id);
  await h.coordinator.select(run.id, a.id, a.outcome.sourceHash); assert.equal(h.applied.size, 3);
});

test('failed candidate cannot be selected and fresh source changes block selection and preferences', async t => {
  let edited = false;
  const h = await fixture(t, { success: profile => profile !== 'python', rejectVerification: () => edited });
  const run = await h.coordinator.start(h.project.id, { mode: 'paired' }); await h.coordinator.wait(run.id);
  const [a, b] = h.store.listCandidates(run.id);
  await assert.rejects(h.coordinator.select(run.id, b.id), /passing candidate/);
  edited = true; await assert.rejects(h.coordinator.select(run.id, a.id), /fingerprint changed/);
  assert.equal(h.store.pendingPromotions().length, 0); assert.equal(h.project.status, 'draft');
});

test('feedback is optional, capped at two per local day with one audit and one targeted request; skip is not a label', async t => {
  const h = await fixture(t);
  const ids = [];
  for (let i = 0; i < 3; i++) { const run = await h.coordinator.start(h.project.id, { mode: 'paired' }); await h.coordinator.wait(run.id); ids.push(run.id); }
  let requests = h.store.listExperiments().flatMap(item => item.preferenceRequest ? [item.preferenceRequest] : []);
  assert.equal(requests.length, 2); assert.deepEqual(new Set(requests.map(item => item.sampling)), new Set(['targeted', 'random-audit']));
  assert.ok(requests.find(item => item.sampling === 'random-audit').samplingProbability > 0);
  const skipped = requests[0]; h.coordinator.skipPreference(skipped.experimentId, skipped.id);
  assert.equal(h.store.listPreferences().length, 0);
  const answered = requests[1]; await h.coordinator.recordPreference(answered.experimentId, { requestId: answered.id, choice: 'tie' });
  await h.coordinator.recordPreference(answered.experimentId, { requestId: answered.id, choice: 'tie' });
  assert.equal(h.store.listPreferences().length, 1); assert.equal(h.store.listPreferences()[0].choice, 'tie');
  h.coordinator.requestFeedback(); assert.equal(h.store.getExperiment(ids[2]).preferenceRequest, undefined);
  h.setDate('2026-11-06T04:59:00Z'); h.coordinator.requestFeedback(); assert.equal(h.store.getExperiment(ids[2]).preferenceRequest, undefined, 'Still November 5 in New York.');
  h.setDate('2026-11-06T05:01:00Z'); h.coordinator.requestFeedback();
  assert.equal(h.store.getExperiment(ids[2]).preferenceRequest.localDay, '2026-11-06');
});

test('recovery refuses brief changes and forgetting is prevented during an active build', async t => {
  const entered = deferred(), release = deferred();
  const h = await fixture(t, { worker: async ({ kind }) => { if (kind === 'shared') { entered.resolve(); await release.promise; } }, stop: async () => release.resolve() });
  const run = await h.coordinator.start(h.project.id); await entered.promise;
  await assert.rejects(h.coordinator.forgetProject(h.project.id), /active experiment/);
  await h.coordinator.stop(run.id); h.project.description = 'A different brief.';
  await assert.rejects(h.coordinator.resume(run.id), /brief changed/);
  const forgotten = await h.coordinator.forgetProject(h.project.id); assert.deepEqual(forgotten.experimentIds, [run.id]);
});
