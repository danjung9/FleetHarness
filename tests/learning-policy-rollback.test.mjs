import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { evaluatePromotion, fitPolicy, promotedPolicy, proposeDecision } from '../dist-electron/electron/learning-policy.js';

const trainingTime = '2026-11-05T11:00:00.000Z', frozenTime = '2026-11-05T12:00:00.000Z', validationTime = '2026-11-05T13:00:00.000Z';
const outcome = (success = true, recordedAt = trainingTime) => ({ mandatoryPassed: success, requiredScopePassed: success, withinBudget: true,
  terminalReason: success ? 'completed' : 'verification-failed', durationMs: 10, costUsd: null, repairCount: 0,
  sourceHash: 'source', contractHash: 'contract', evidenceHash: 'evidence', evaluatorVersion: 'host-v1', recordedAt });
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-policy-rollback-'));
  const store = new LearningStore(root); await store.init();
  t.after(async () => { store.close(); await fs.rm(root, { recursive: true, force: true }); });
  return store;
}
function experiment(store, id, cohortKey, createdAt, overrides = {}) {
  return store.createExperiment({ id, projectId: 'project', lineageId: id, cohortKey, partition: 'development', mode: 'paired',
    status: 'review', baselineProfileId: 'a', candidateIds: [], createdAt, updatedAt: createdAt, ...overrides });
}
function completedPair(store, record) {
  for (const profileId of ['a', 'b']) {
    const id = `${record.id}-${profileId}`;
    store.putCandidate({ id, experimentId: record.id, profileId, profileVersion: '1', baseline: profileId === 'a',
      status: 'running', createdAt: record.createdAt, updatedAt: record.createdAt });
    store.recordOutcome(id, outcome(true, record.createdAt));
  }
}
function proposal(store, id, cohortKey, createdAt = frozenTime) {
  if (!store.listExperiments().some(record => record.cohortKey === cohortKey && record.partition === 'development')) {
    for (let index = 0; index < 8; index++) completedPair(store, experiment(store, `${id}-training-${index}`, cohortKey, trainingTime));
  }
  const policy = fitPolicy(store, { id, cohortKey, baselineProfileId: 'a', profileIds: ['a', 'b'], createdAt });
  store.savePolicy(policy); return policy;
}
function assessedBatch(store, policy, createdAt = validationTime) {
  const validation = [];
  for (let index = 0; index < 12; index++) {
    const record = experiment(store, `${policy.id}-validation-${index}`, policy.cohortKey, createdAt,
      { partition: 'validation', mode: 'holdout', policySnapshotId: policy.id });
    const decision = proposeDecision(policy, { experimentId: record.id, credit: store.getRoutingState(policy.cohortKey).credit,
      mode: 'paired', prospectiveValidation: true, random: () => 0.99, createdAt });
    store.recordDecision(decision); completedPair(store, record);
    validation.push({ experiment: store.getExperiment(record.id), candidates: store.listCandidates(record.id), decision });
  }
  const development = store.listExperiments().filter(record => record.partition === 'development')
    .map(record => ({ experiment: record, candidates: store.listCandidates(record.id) }));
  const assessment = evaluatePromotion(policy, development, validation);
  assert.equal(assessment.eligible, true, assessment.reasons.join(' '));
  return assessment;
}
function activate(store, policy, createdAt = validationTime) {
  const assessment = assessedBatch(store, policy, createdAt), promoted = promotedPolicy(policy, assessment, `${policy.id}-promoted`);
  store.savePolicy(promoted); store.activatePolicy(promoted.id); return promoted;
}

test('policy rollback durably retires current proposals and active policies without touching other cohorts or prior terminal states', async t => {
  const store = await fixture(t);
  const source = proposal(store, 'target-source', 'target'), active = activate(store, source), pending = proposal(store, 'target-pending', 'target');
  const invalidated = { ...fitPolicy(store, { id: 'target-invalidated', cohortKey: 'target', baselineProfileId: 'a', profileIds: ['a', 'b'] }),
    status: 'invalidated', invalidationReason: 'Source experience was forgotten.' };
  const retired = { ...fitPolicy(store, { id: 'target-retired', cohortKey: 'target', baselineProfileId: 'a', profileIds: ['a', 'b'] }),
    status: 'rolled-back', invalidationReason: 'An earlier rollback.' };
  store.savePolicy(invalidated); store.savePolicy(retired);
  const priorInvalidated = store.getPolicy(invalidated.id), priorRetired = store.getPolicy(retired.id);
  const other = proposal(store, 'other-source', 'other'); activate(store, other); proposal(store, 'other-pending', 'other');
  const otherPolicies = store.listPolicies('other'), otherRouting = store.getRoutingState('other');
  store.rollbackContext('target', 'Rolled back by the user.');
  for (const id of [source.id, active.id, pending.id]) {
    assert.equal(store.getPolicy(id).status, 'rolled-back');
    assert.equal(store.getPolicy(id).invalidationReason, 'Rolled back by the user.');
  }
  assert.deepEqual(store.getPolicy(invalidated.id), priorInvalidated);
  assert.deepEqual(store.getPolicy(retired.id), priorRetired);
  assert.deepEqual(store.listPolicies('other'), otherPolicies);
  assert.deepEqual(store.getRoutingState('other'), otherRouting);
  assert.equal(store.getRoutingState('target').rolledBack, true);
  const policies = store.listPolicies(); store.close(); await store.init();
  assert.deepEqual(store.listPolicies(), policies, 'Retired proposals stay retired after reopening SQLite.');
  assert.equal(store.getRoutingState('target').rolledBack, true);
  assert.throws(() => store.activatePolicy(active.id), /cannot be activated/);
  const enrollment = experiment(store, 'retired-enrollment', 'target', '2026-11-05T14:00:00.000Z');
  assert.throws(() => store.enrollValidation(enrollment.id, source.id), /earlier frozen proposal/);
});

test('three routed failures retire pending proposals as well as the active policy, with cancellation and replay excluded', async t => {
  const store = await fixture(t), source = proposal(store, 'failure-source', 'target'), active = activate(store, source);
  const pending = proposal(store, 'failure-pending', 'target'), other = proposal(store, 'failure-other', 'other');
  for (const [index, reason] of ['verification-failed', 'cancelled', 'verification-failed', 'verification-failed'].entries()) {
    const record = experiment(store, `routed-${index}`, 'target', '2026-11-05T14:00:00.000Z', { mode: 'adaptive' });
    const decision = proposeDecision(store.getPolicy(active.id), { experimentId: record.id, credit: store.getRoutingState('target').credit,
      mode: 'adaptive', random: () => 0.01, createdAt: record.createdAt });
    store.recordDecision(decision);
    const candidateId = `${record.id}-a`;
    store.putCandidate({ id: candidateId, experimentId: record.id, profileId: 'a', profileVersion: '1', baseline: true,
      status: 'running', createdAt: record.createdAt, updatedAt: record.createdAt });
    const result = { ...outcome(false, record.createdAt), terminalReason: reason };
    store.recordOutcome(candidateId, result); store.recordOutcome(candidateId, result);
    assert.equal(store.getRoutingState('target').consecutiveFailures, [1, 1, 2, 3][index]);
    assert.equal(store.getPolicy(pending.id).status, index === 3 ? 'rolled-back' : 'shadow');
  }
  for (const id of [source.id, active.id, pending.id]) {
    assert.equal(store.getPolicy(id).status, 'rolled-back');
    assert.equal(store.getPolicy(id).invalidationReason, 'Three consecutive routed-candidate failures.');
  }
  assert.equal(store.getRoutingState('target').rolledBack, true);
  assert.equal(store.getPolicy(other.id).status, 'shadow');
});

test('a newly fitted proposal can earn fresh validation after rollback while the prior batch remains retired', async t => {
  const store = await fixture(t), previous = proposal(store, 'old-source', 'target');
  const previousActive = activate(store, previous);
  store.rollbackContext('target', 'Rolled back by the user.');
  const fresh = proposal(store, 'fresh-source', 'target', '2026-11-05T14:00:00.000Z');
  assert.equal(store.getRoutingState('target').rolledBack, true, 'Fitting alone cannot restore routing.');
  assert.equal(store.getPolicy(fresh.id).status, 'shadow');
  const next = activate(store, fresh, '2026-11-05T15:00:00.000Z');
  assert.equal(store.getPolicy(next.id).status, 'active');
  assert.equal(store.getRoutingState('target').rolledBack, false);
  assert.equal(store.getPolicy(previous.id).status, 'rolled-back');
  assert.equal(store.getPolicy(previousActive.id).status, 'rolled-back');
  assert.equal(next.validation.policySnapshotId, fresh.id);
  assert.ok(next.validation.validationExperimentIds.every(id => id.startsWith(`${fresh.id}-validation-`)));
});
