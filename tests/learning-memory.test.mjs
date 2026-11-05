import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { LessonMemory } from '../dist-electron/electron/lesson-memory.js';
import { fitPolicy } from '../dist-electron/electron/learning-policy.js';

const time = '2026-11-05T12:00:00.000Z';
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-memory-'));
  const store = new LearningStore(root); await store.init();
  t.after(async () => { store.close(); await fs.rm(root, { recursive: true, force: true }); });
  return { store, memory: new LessonMemory(store) };
}
function evidence(store, id, lineageId = id, partition = 'development', outcome = {}) {
  store.createExperiment({ id, projectId: 'project', lineageId, cohortKey: 'cohort', partition, mode: 'paired', status: 'review',
    baselineProfileId: 'a', candidateIds: [], createdAt: time, updatedAt: time });
  store.putCandidate({ id: `${id}-a`, experimentId: id, profileId: 'a', profileVersion: '1', baseline: true, status: 'running', createdAt: time, updatedAt: time });
  store.recordOutcome(`${id}-a`, { mandatoryPassed: true, requiredScopePassed: true, withinBudget: true, terminalReason: 'completed', durationMs: 2, costUsd: null,
    repairCount: 0, sourceHash: `${id}-source`, contractHash: `${id}-contract`, evidenceHash: `${id}-evidence`, evaluatorVersion: '1', recordedAt: time, ...outcome });
}
function record(memory, id, overrides = {}) {
  return memory.recordObservation({ experimentId: id, candidateId: `${id}-a`, taskFamily: 'scheduling', lessonKey: 'respect-resources',
    statement: 'Resource constraints must be checked before selecting a scheduling result.', conditions: ['Task family: scheduling'], outcome: 'supported', ...overrides });
}

test('two distinct lineages are required; repeated observations cannot manufacture corroboration', async t => {
  const { store, memory } = await fixture(t);
  evidence(store, 'one', 'same-lineage'); evidence(store, 'repeat', 'same-lineage'); evidence(store, 'two', 'other-lineage');
  assert.equal(record(memory, 'one').status, 'proposed'); record(memory, 'one');
  assert.equal(store.listObservations().length, 1);
  assert.equal(record(memory, 'repeat').status, 'proposed');
  assert.equal(memory.retrieve({ taskFamily: 'scheduling', query: 'resource' }).lessons.length, 0);
  const lesson = record(memory, 'two'); assert.equal(lesson.status, 'corroborated'); assert.equal(lesson.lineageIds.length, 2);
  const retrieved = memory.retrieve({ taskFamily: 'scheduling', query: 'resource' }); assert.equal(retrieved.lessons.length, 1);
  assert.ok(retrieved.text.includes('does not establish causation'));
  assert.equal(memory.retrieve({ taskFamily: 'scheduling', query: 'resource', excludeLineageIds: ['other-lineage'] }).lessons.length, 0);
  assert.ok(store.listEdges().some(edge => edge.fromType === 'lesson' && edge.toType === 'observation' && edge.relation === 'supports'));
});

test('holdout canaries, raw answer keys, credentials and hypotheses never enter retrieved memory', async t => {
  const { store, memory } = await fixture(t);
  evidence(store, 'one'); evidence(store, 'two'); evidence(store, 'secret-holdout', 'secret-holdout', 'holdout');
  assert.throws(() => record(memory, 'secret-holdout', { statement: 'HOLDOUT-CANARY' }), /development evidence/);
  for (const statement of ['Read evaluation-plan.json', 'expected: 123', 'api_key=abcdef', 'Bearer abcdef', 'Stored at /Users/private/file', 'owner@example.com']) {
    assert.throws(() => record(memory, 'one', { statement }), /private data or evaluation content/);
  }
  record(memory, 'one', { explanation: 'hypothesis' }); record(memory, 'two', { explanation: 'hypothesis' });
  assert.equal(memory.retrieve({ taskFamily: 'scheduling', query: 'resource' }).text, '');
  assert.ok(!JSON.stringify(store.listObservations()).includes('HOLDOUT-CANARY'));
});

test('contradiction removes advice from retrieval and retirement cannot silently reactivate it', async t => {
  const { store, memory } = await fixture(t);
  for (const id of ['one', 'two', 'three', 'four']) evidence(store, id);
  record(memory, 'one'); const lesson = record(memory, 'two');
  assert.equal(record(memory, 'three', { outcome: 'contradicted' }).status, 'contradicted');
  assert.equal(memory.retrieve({ taskFamily: 'scheduling', query: 'resource' }).lessons.length, 0);
  memory.retire(lesson.id); assert.equal(record(memory, 'four').status, 'retired');
});

test('automatic extraction contradicts corroborated success after a terminal failure with host evidence', async t => {
  const { store, memory } = await fixture(t);
  for (const id of ['one', 'two']) { evidence(store, id); memory.recordComparison(id, 'scheduling'); }
  assert.equal(store.listLessons()[0].status, 'corroborated');
  assert.equal(memory.retrieve({ taskFamily: 'scheduling', query: 'architecture' }).lessons.length, 1);
  evidence(store, 'before-verification', 'new-lineage', 'development', { mandatoryPassed: false, requiredScopePassed: false,
    terminalReason: 'build-failed', contractHash: undefined, evidenceHash: 'immutable-host-failure-receipt' });
  const [lesson] = memory.recordComparison('before-verification', 'scheduling');
  assert.equal(lesson.status, 'contradicted');
  assert.equal(memory.retrieve({ taskFamily: 'scheduling', query: 'architecture' }).text, '');
  const observation = store.listObservations().find(item => item.candidateId === 'before-verification-a');
  assert.equal(observation.outcome, 'contradicted'); assert.equal(observation.evidenceHash, 'immutable-host-failure-receipt');
  evidence(store, 'cancelled', 'cancelled', 'development', { terminalReason: 'cancelled', mandatoryPassed: false });
  assert.deepEqual(memory.recordComparison('cancelled', 'scheduling'), [], 'Cancellation is censored even when evidence exists');
});

test('FTS retrieval is bounded, literal-query safe, and snapshots are immutable', async t => {
  const { store, memory } = await fixture(t); evidence(store, 'one'); evidence(store, 'two');
  for (let index = 0; index < 6; index++) for (const id of ['one', 'two']) record(memory, id, { lessonKey: `resource-${index}`,
    statement: `Resource condition ${index} was checked. ` + 'A bounded scheduling observation. '.repeat(26) });
  const result = memory.retrieve({ taskFamily: 'scheduling', query: 'resource " OR * NOT' });
  assert.ok(result.lessons.length > 0); assert.ok(result.lessons.length <= 3); assert.ok(result.text.length <= 4000);
  const snapshot = memory.snapshot({ id: 'frozen', taskFamily: 'scheduling', query: 'resource', createdAt: time });
  assert.deepEqual(store.saveMemorySnapshot(snapshot), snapshot);
  assert.throws(() => store.saveMemorySnapshot({ ...snapshot, text: 'changed' }), /immutable/);
  assert.deepEqual(memory.retrieve({ taskFamily: 'scheduling', query: 'resource', enabled: false }), { lessons: [], text: '' });
});

test('forgetting removes evidence, invalidates dependent policy, erases snapshots and prevents resurrection', async t => {
  const { store, memory } = await fixture(t); evidence(store, 'one'); evidence(store, 'two');
  record(memory, 'one'); const lesson = record(memory, 'two');
  const snapshot = memory.snapshot({ id: 'memory', taskFamily: 'scheduling', query: 'resource', createdAt: time });
  const policy = fitPolicy(store, { cohortKey: 'cohort', baselineProfileId: 'a', profileIds: ['a', 'b'], memorySnapshotId: snapshot.id, id: 'dependent-policy' });
  store.savePolicy(policy);
  const forgotten = store.forgetExperiment('one');
  assert.deepEqual(forgotten.policyIds, ['dependent-policy']); assert.deepEqual(forgotten.memorySnapshotIds, ['memory']);
  assert.equal(store.getExperiment('one'), undefined); assert.equal(store.getCandidate('one-a'), undefined);
  assert.equal(store.getLesson(lesson.id).status, 'proposed'); assert.equal(store.getMemorySnapshot(snapshot.id), undefined);
  assert.equal(store.getPolicy(policy.id).status, 'invalidated'); assert.equal(memory.retrieve({ taskFamily: 'scheduling', query: 'resource' }).text, '');
  assert.throws(() => store.saveMemorySnapshot(snapshot), /cannot be recreated/);
  assert.throws(() => store.activatePolicy(policy.id), /cannot be activated/);
  assert.equal(store.listObservations().length, 1);
  const refit = fitPolicy(store, { cohortKey: 'cohort', baselineProfileId: 'a', profileIds: ['a', 'b'] });
  assert.deepEqual(refit.sourceExperimentIds, ['two']); assert.equal(refit.arms[0].successes, 1);
  store.forgetProject('project'); assert.equal(store.listExperiments().length, 0); assert.equal(store.listLessons().length, 0);
});

test('forgetting validation evidence invalidates eligibility without treating holdout outcomes as training', async t => {
  const { store, memory } = await fixture(t); evidence(store, 'one'); evidence(store, 'two'); evidence(store, 'heldout', 'heldout', 'holdout');
  record(memory, 'one'); const lesson = record(memory, 'two'); memory.retire(lesson.id);
  const policy = fitPolicy(store, { cohortKey: 'cohort', baselineProfileId: 'a', profileIds: ['a', 'b'], id: 'validated' });
  store.savePolicy({ ...structuredClone(policy), id: 'frozen' }); policy.validatedProfileIds = ['a', 'b'];
  policy.validation = { eligible: true, reasons: [], warmupPairs: 8, validationPairs: 12, validationLineages: 3, proposedSuccesses: 12, baselineRegressions: 0, policySnapshotId: 'frozen', validationExperimentIds: ['heldout'] };
  store.savePolicy(policy); store.activatePolicy(policy.id);
  assert.ok(!policy.sourceExperimentIds.includes('heldout'));
  assert.deepEqual(store.forgetExperiment('heldout').policyIds, ['validated']);
  assert.equal(store.getPolicy(policy.id).status, 'invalidated');
  store.forgetExperiment('one'); assert.equal(store.getLesson(lesson.id).status, 'retired');
});
