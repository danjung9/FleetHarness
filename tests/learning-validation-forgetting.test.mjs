import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { ExperimentCoordinator } from '../dist-electron/electron/experiment-coordinator.js';
import { evaluatePromotion, fitPolicy, promotedPolicy, proposeDecision } from '../dist-electron/electron/learning-policy.js';
import { newProject } from '../dist-electron/electron/storage.js';

const trainingTime = '2026-11-05T11:00:00.000Z', frozenTime = '2026-11-05T12:00:00.000Z', validationTime = '2026-11-05T13:00:00.000Z';
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const outcome = (success = true, recordedAt = trainingTime) => ({ mandatoryPassed: success, requiredScopePassed: success, withinBudget: true,
  terminalReason: success ? 'completed' : 'verification-failed', durationMs: 10, costUsd: null, repairCount: 0,
  sourceHash: 'source', contractHash: 'contract', evidenceHash: 'evidence', evaluatorVersion: 'host-v1', recordedAt });

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-validation-forgetting-'));
  const store = new LearningStore(root); await store.init();
  t.after(async () => { store.close(); await fs.rm(root, { recursive: true, force: true }); });
  return store;
}
function experiment(store, id, cohortKey, createdAt, overrides = {}) {
  return store.createExperiment({ id, projectId: 'training-project', lineageId: id, cohortKey, partition: 'development', mode: 'paired',
    status: 'review', baselineProfileId: 'a', candidateIds: [], createdAt, updatedAt: createdAt, ...overrides });
}
function completedPair(store, record, challengerSuccess = true) {
  for (const profileId of ['a', 'b']) {
    const id = `${record.id}-${profileId}`;
    store.putCandidate({ id, experimentId: record.id, profileId, profileVersion: '1', baseline: profileId === 'a',
      status: 'running', createdAt: record.createdAt, updatedAt: record.createdAt });
    store.recordOutcome(id, outcome(profileId === 'a' || challengerSuccess, record.createdAt));
  }
}
function proposal(store, id, cohortKey, createdAt = frozenTime) {
  if (!store.listExperiments().some(record => record.cohortKey === cohortKey && record.partition === 'development')) {
    for (let index = 0; index < 8; index++) completedPair(store, experiment(store, `${id}-training-${index}`, cohortKey, trainingTime));
  }
  return store.savePolicy(fitPolicy(store, { id, cohortKey, baselineProfileId: 'a', profileIds: ['a', 'b'], createdAt }));
}
function batch(store, policy, { partition = 'validation', failedIndex = -1, createdAt = validationTime } = {}) {
  const validation = [];
  for (let index = 0; index < 12; index++) {
    const record = experiment(store, `${policy.id}-validation-${index}`, policy.cohortKey, createdAt,
      { projectId: index === 0 ? 'forgotten-project' : 'retained-project', partition, mode: 'holdout', policySnapshotId: policy.id });
    const decision = proposeDecision(policy, { experimentId: record.id, credit: store.getRoutingState(policy.cohortKey).credit,
      mode: 'paired', prospectiveValidation: true, random: () => 0.99, createdAt });
    store.recordDecision(decision); completedPair(store, record, index !== failedIndex);
    validation.push({ experiment: store.getExperiment(record.id), candidates: store.listCandidates(record.id), decision });
  }
  const development = store.listExperiments().filter(record => record.partition === 'development')
    .map(record => ({ experiment: record, candidates: store.listCandidates(record.id) }));
  return evaluatePromotion(policy, development, validation);
}

for (const partition of ['validation', 'holdout']) test(`forgetting ${partition} evidence durably invalidates its frozen source and promotion, preserving unrelated policies`, async t => {
  const store = await fixture(t), source = proposal(store, 'source', 'target');
  const assessment = batch(store, source, { partition }); assert.equal(assessment.eligible, true);
  const promoted = promotedPolicy(source, assessment, 'promoted'); store.savePolicy(promoted); store.activatePolicy(promoted.id);
  const unrelated = proposal(store, 'independent-proposal', 'target'), other = proposal(store, 'other-cohort', 'other');
  const unrelatedBefore = store.getPolicy(unrelated.id), otherBefore = store.getPolicy(other.id);
  const training = source.sourceExperimentIds.map(id => store.getExperiment(id));
  const forgottenId = assessment.validationExperimentIds[0];
  const forgotten = store.forgetExperiment(forgottenId);
  assert.deepEqual(new Set(forgotten.policyIds), new Set([source.id, promoted.id]));
  assert.equal(store.getExperiment(forgottenId), undefined);
  assert.equal(store.getCandidate(`${forgottenId}-a`), undefined);
  assert.deepEqual(store.getPolicy(unrelated.id), unrelatedBefore);
  assert.deepEqual(store.getPolicy(other.id), otherBefore);
  assert.deepEqual(source.sourceExperimentIds.map(id => store.getExperiment(id)), training);
  const policies = store.listPolicies(); store.close(); await store.init();
  assert.deepEqual(store.listPolicies(), policies, 'Invalidation survives SQLite reopen.');
  for (const id of [source.id, promoted.id]) {
    assert.equal(store.getPolicy(id).status, 'invalidated');
    assert.throws(() => store.activatePolicy(id), /cannot be activated/);
  }
  const replacement = experiment(store, 'replacement', 'target', '2026-11-05T14:00:00.000Z');
  assert.throws(() => store.enrollValidation(replacement.id, source.id), /earlier frozen proposal/);
  const staleDecision = proposeDecision(source, { experimentId: replacement.id, credit: store.getRoutingState('target').credit,
    mode: 'paired', prospectiveValidation: true, random: () => 0.99, createdAt: replacement.createdAt });
  assert.throws(() => store.recordDecision(staleDecision), /policy is not eligible/);
  assert.equal(store.getExperiment(replacement.id).partition, 'development');
  assert.equal(store.getExperiment(replacement.id).decisionId, undefined);
});

test('forgetting a failed heldout trial cannot refill the old batch, while a fresh proposal can earn independent validation', async t => {
  const store = await fixture(t), source = proposal(store, 'failed-source', 'target');
  const failed = batch(store, source, { failedIndex: 0 });
  assert.equal(failed.eligible, false); assert.equal(failed.baselineRegressions, 1);
  store.forgetExperiment(failed.validationExperimentIds[0]);
  assert.equal(store.getPolicy(source.id).status, 'invalidated');
  const replacement = experiment(store, 'failed-replacement', 'target', '2026-11-05T14:00:00.000Z');
  assert.throws(() => store.enrollValidation(replacement.id, source.id), /earlier frozen proposal/);
  let regressionChecks = 0;
  const coordinator = new ExperimentCoordinator({ store, regressionCheck: async () => { regressionChecks++; return true; } });
  await assert.rejects(coordinator.validatePolicy(source.id, failed.validationExperimentIds), /Frozen policy is unavailable/);
  assert.equal(regressionChecks, 0);
  const fresh = proposal(store, 'fresh-source', 'target', '2026-11-05T14:00:00.000Z');
  const freshAssessment = batch(store, fresh, { createdAt: '2026-11-05T15:00:00.000Z' });
  const result = await coordinator.validatePolicy(fresh.id, freshAssessment.validationExperimentIds);
  assert.equal(result.eligible, true); assert.equal(regressionChecks, 1);
  const active = store.listPolicies().filter(policy => policy.status === 'active'); assert.equal(active.length, 1);
  assert.equal(active[0].validation.policySnapshotId, fresh.id);
  assert.deepEqual(active[0].validation.validationExperimentIds, freshAssessment.validationExperimentIds);
  assert.equal(store.getPolicy(source.id).status, 'invalidated');
});

test('forgetting an enrolled trial without candidates invalidates its frozen source and prevents refilling', async t => {
  const store = await fixture(t), source = proposal(store, 'unfinished-source', 'target');
  const pending = experiment(store, 'unfinished-validation', 'target', validationTime, { projectId: 'forgotten-project', status: 'stopped' });
  const enrolled = store.enrollValidation(pending.id, source.id);
  assert.equal(enrolled.mode, 'holdout'); assert.equal(enrolled.partition, 'validation');
  assert.equal(enrolled.decisionId, undefined); assert.deepEqual(store.listCandidates(enrolled.id), []);
  const coordinator = new ExperimentCoordinator({ store });
  const forgotten = await coordinator.forgetProject('forgotten-project');
  assert.deepEqual(forgotten.experimentIds, [enrolled.id]); assert.deepEqual(forgotten.policyIds, [source.id]);
  assert.equal(store.getExperiment(enrolled.id), undefined);
  assert.equal(store.getPolicy(source.id).status, 'invalidated');
  const replacement = experiment(store, 'unfinished-replacement', 'target', '2026-11-05T14:00:00.000Z');
  assert.throws(() => store.enrollValidation(replacement.id, source.id), /earlier frozen proposal/);
  assert.equal(store.getExperiment(replacement.id).partition, 'development');
});

async function coordinatorFixture(t, regressionCheck, beforeCandidate = async () => {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-validation-forgetting-coordinator-'));
  const store = new LearningStore(root); await store.init();
  const project = newProject({ title: 'Scheduling tool', description: 'Calculate a schedule from supplied constraints.', criteria: ['Return a valid schedule.'] });
  const other = { ...structuredClone(project), id: 'earlier-validation-project' };
  const profiles = ['node', 'python'].map(id => ({ id, version: '1', label: id, instructions: `Use ${id}.`, budget: { timeoutMs: 90 * 60_000 } }));
  let date = new Date('2026-11-05T14:00:00.000Z'), reserved = false;
  const events = [];
  const worker = (kind, context) => {
    let waiting = Promise.resolve();
    const begin = async () => {
      events.push(`${kind}:${context.experiment.id}:${context.profile?.id ?? 'shared'}`);
      waiting = (async () => {
        if (kind === 'candidate') await beforeCandidate(context);
        await context.saveProjection({ ...structuredClone(context.project), status: 'review', runId: `run-${context.project.id}`,
          workspace: path.join(store.root, context.project.id), resumeStage: kind === 'shared' ? 'research' : 'build' });
      })();
    };
    return { start: begin, resume: begin, stop: async () => {}, wait: () => waiting,
      result: async () => kind === 'shared' ? { workspace: store.root, objectiveHash: 'objective', taskFamily: 'scheduling', runtimeConstraints: ['service'], budgetTier: 'bounded' }
        : outcome(true, date.toISOString()) };
  };
  const coordinator = new ExperimentCoordinator({ store, profiles, project: id => id === other.id ? other : project,
    modelConfig: () => ({ backend: 'pi', provider: 'fixture', model: 'fixture-v1' }), readiness: async () => ({ supported: true }),
    acquire: async () => { assert.equal(reserved, false); reserved = true; return () => { reserved = false; }; },
    sharedPlanner: async context => worker('shared', context), candidateWorker: async context => worker('candidate', context),
    verifyCandidate: async () => {}, applyPromotion: async () => {}, regressionCheck, random: () => 0.75, now: () => date, timeZone: 'America/New_York' });
  t.after(async () => { await coordinator.stopAll(); store.close(); await fs.rm(root, { recursive: true, force: true }); });
  return { store, coordinator, project, other, events, isReserved: () => reserved,
    run: async index => {
      date = new Date(Date.UTC(2026, 10, 5, 14, index));
      const run = await coordinator.start(index === 8 ? other.id : project.id, { mode: 'paired', lineageId: `forgetting-${index}` });
      if (index !== 19) await coordinator.wait(run.id);
      return store.getExperiment(run.id);
    } };
}

test('automatic adaptive runs fall back to baseline after forgetting an active policy validation trial', { timeout: 10_000 }, async t => {
  let regressionChecks = 0;
  const h = await coordinatorFixture(t, async () => { regressionChecks++; return true; });
  for (let index = 0; index < 20; index++) { const run = await h.run(index); await h.coordinator.wait(run.id); }
  const active = h.store.listPolicies().find(policy => policy.status === 'active'); assert.ok(active);
  const sourceId = active.validation.policySnapshotId;
  await h.coordinator.forgetProject(h.other.id);
  h.store.setSettings({ mode: 'adaptive', automaticComparisons: true });
  const run = await h.coordinator.start(h.project.id, { automatic: true, lineageId: 'adaptive-after-forgetting' });
  await h.coordinator.wait(run.id);
  const record = h.store.getExperiment(run.id), decision = h.store.getDecision(record.decisionId);
  assert.equal(record.status, 'review'); assert.equal(record.mode, 'adaptive');
  assert.equal(decision.mode, 'baseline'); assert.equal(decision.selectedProfileId, active.baselineProfileId);
  assert.equal(record.candidateIds.length, 1); assert.equal(decision.compare, false);
  assert.ok(![sourceId, active.id].includes(decision.policySnapshotId));
  assert.equal(h.store.getPolicy(decision.policySnapshotId).status, 'shadow');
  assert.equal(h.store.getPolicy(sourceId).status, 'invalidated');
  assert.equal(h.store.getPolicy(active.id).status, 'invalidated');
  assert.equal(h.store.listPolicies().filter(policy => policy.status === 'active').length, 0);
  assert.equal(regressionChecks, 1, 'Fallback routing cannot revalidate the retired batch.');
  assert.equal(h.isReserved(), false);
});

for (const delayedResult of [true, false]) test(`forgetting another project's validation trial revokes a pending ${delayedResult} regression result`, { timeout: 10_000 }, async t => {
  const entered = deferred(), release = deferred(); t.after(() => release.resolve());
  let regressionChecks = 0;
  const h = await coordinatorFixture(t, async () => { regressionChecks++; entered.resolve(); await release.promise; return delayedResult; });
  let forgotten;
  for (let index = 0; index < 19; index++) { const run = await h.run(index); if (index === 8) forgotten = run; }
  const run = await h.run(19); await entered.promise;
  const current = h.store.getExperiment(run.id), candidates = h.store.listCandidates(run.id), events = [...h.events];
  const originalBatch = h.store.listExperiments().filter(item => item.mode === 'holdout' && item.policySnapshotId === current.policySnapshotId).map(item => item.id);
  assert.equal(originalBatch.length, 12); assert.equal(forgotten.policySnapshotId, current.policySnapshotId);
  assert.notEqual(forgotten.projectId, current.projectId);
  const result = await h.coordinator.forgetProject(h.other.id);
  assert.ok(result.policyIds.includes(current.policySnapshotId));
  assert.equal(h.store.getExperiment(forgotten.id), undefined);
  assert.equal(h.store.getPolicy(current.policySnapshotId).status, 'invalidated');
  const policies = h.store.listPolicies(); release.resolve(); await h.coordinator.wait(run.id);
  assert.equal(regressionChecks, 1);
  assert.deepEqual(h.store.listPolicies(), policies, 'A late successful check cannot save a promoted snapshot with missing evidence.');
  assert.equal(h.store.listPolicies().filter(policy => policy.status === 'active').length, 0);
  assert.equal(h.store.getExperiment(run.id).status, 'review');
  assert.deepEqual(h.store.listCandidates(run.id), candidates); assert.deepEqual(h.events, events);
  assert.equal(h.isReserved(), false);
  await assert.rejects(h.coordinator.validatePolicy(current.policySnapshotId, originalBatch), /Frozen policy is unavailable/);
  await assert.rejects(h.coordinator.start(h.project.id, { partition: 'validation', lineageId: 'replacement-after-forgetting', validationPolicyId: current.policySnapshotId }), /frozen validation policy is unavailable/);
  assert.equal(regressionChecks, 1, 'The invalidated batch cannot ask for another regression check.');
});

test('forgetting earlier validation evidence while the final candidate runs preserves its completed apps and skips promotion', { timeout: 10_000 }, async t => {
  const entered = deferred(), release = deferred(); t.after(() => release.resolve());
  let regressionChecks = 0;
  const h = await coordinatorFixture(t, async () => { regressionChecks++; return true; }, async context => {
    if (context.experiment.lineageId === 'forgetting-19' && context.profile.id === 'python') { entered.resolve(); await release.promise; }
  });
  for (let index = 0; index < 19; index++) await h.run(index);
  const run = await h.run(19); await entered.promise;
  const current = h.store.getExperiment(run.id), candidateIds = [...current.candidateIds];
  await h.coordinator.forgetProject(h.other.id);
  release.resolve(); await h.coordinator.wait(run.id);
  assert.equal(h.store.getExperiment(run.id).status, 'review');
  assert.deepEqual(h.store.getExperiment(run.id).candidateIds, candidateIds);
  assert.ok(h.store.listCandidates(run.id).every(candidate => candidate.status === 'passed' && candidate.outcome));
  assert.equal(regressionChecks, 0);
  assert.equal(h.store.getPolicy(current.policySnapshotId).status, 'invalidated');
  assert.equal(h.store.listPolicies().filter(policy => policy.status === 'active').length, 0);
  assert.equal(h.isReserved(), false);
});
