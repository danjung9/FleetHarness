import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { LearningStore, candidateSucceeded } from '../dist-electron/electron/learning-store.js';
import { fitPolicy, proposeDecision } from '../dist-electron/electron/learning-policy.js';

const time = '2026-11-05T12:00:00.000Z';
const experiment = (id, overrides = {}) => ({ id, projectId: 'project', lineageId: id, cohortKey: 'cohort', partition: 'development',
  mode: 'paired', status: 'running', baselineProfileId: 'a', candidateIds: [], createdAt: time, updatedAt: time, ...overrides });
const candidate = (id, experimentId, baseline = true) => ({ id, experimentId, profileId: baseline ? 'a' : 'b', profileVersion: '1', baseline,
  status: 'running', createdAt: time, updatedAt: time });
const outcome = (success = true) => ({ mandatoryPassed: success, requiredScopePassed: success, withinBudget: true,
  terminalReason: success ? 'completed' : 'verification-failed', durationMs: 200, costUsd: null, repairCount: 0,
  sourceHash: 'source', contractHash: 'contract', evidenceHash: 'evidence', evaluatorVersion: '1', recordedAt: time });
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-learning-'));
  const store = new LearningStore(root); await store.init();
  t.after(async () => { store.close(); await fs.rm(root, { recursive: true, force: true }); });
  return { store, root };
}
function pair(store, id = 'experiment') {
  store.createExperiment(experiment(id)); store.putCandidate(candidate(`${id}-a`, id)); store.putCandidate(candidate(`${id}-b`, id, false));
  return [`${id}-a`, `${id}-b`];
}

test('sidecar creates restrictive durable SQLite data, transaction rollback, and idempotent immutable identities', async t => {
  const { store, root } = await fixture(t);
  assert.equal(store.getSettings().mode, 'off');
  assert.equal((await fs.stat(store.file)).mode & 0o777, 0o600);
  assert.throws(() => store.transaction(() => { store.createExperiment(experiment('rolled-back')); throw new Error('crash'); }), /crash/);
  assert.equal(store.getExperiment('rolled-back'), undefined);
  store.createExperiment(experiment('one')); store.createExperiment(experiment('one'));
  assert.equal(store.listExperiments().length, 1);
  assert.throws(() => store.createExperiment(experiment('one', { projectId: 'other' })), /different content/);
  assert.throws(() => store.createExperiment(experiment('leak', { lineageId: 'one', partition: 'holdout' })), /cannot cross/);
  store.setSettings({ mode: 'paired' }); store.close();
  await store.init(); assert.equal(store.getSettings().mode, 'paired'); assert.equal(store.getExperiment('one').projectId, 'project');
  const reopened = new LearningStore(root); await reopened.init(); assert.equal(reopened.listExperiments().length, 1); reopened.close();
});

test('unknown schemas and corrupt databases fail closed without overwriting stored bytes', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-learning-corrupt-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const filename = path.join(root, 'learning.sqlite');
  await fs.writeFile(filename, 'not a database');
  await assert.rejects(new LearningStore(root).init());
  assert.equal(await fs.readFile(filename, 'utf8'), 'not a database');
  await fs.rm(filename); const db = new DatabaseSync(filename); db.exec('PRAGMA user_version=99'); db.close();
  await assert.rejects(new LearningStore(root).init(), /Unsupported learning database version/);
});

test('host-only execution snapshots never appear in renderer summaries and final evidence cannot be rewritten', async t => {
  const { store } = await fixture(t); const [a] = pair(store);
  store.updateCandidate(a, { workspace: '/private/workspace', executionState: { logs: [{ text: 'private prompt' }] }, checkpointRef: '/private/checkpoint' });
  store.recordOutcome(a, outcome()); store.recordOutcome(a, outcome());
  assert.throws(() => store.recordOutcome(a, outcome(false)), /immutable/);
  assert.throws(() => store.updateCandidate(a, { profileId: 'different' }), /immutable/);
  const summary = JSON.stringify(store.summary('experiment'));
  assert.ok(!summary.includes('private')); assert.ok(!summary.includes('executionState'));
  assert.equal(store.summary('experiment').candidates[0].success, true);
  assert.equal(store.summary('experiment').candidates[0].costUsd, null);
  assert.equal(candidateSucceeded({ ...outcome(false), terminalReason: 'cancelled' }), null);
});

test('preferences require eligible candidates, fresh source identities, and one actual label per comparison', async t => {
  const { store } = await fixture(t); const [a, b] = pair(store);
  store.recordOutcome(a, outcome());
  const label = { id: 'label', experimentId: 'experiment', candidateAId: a, candidateBId: b, sourceHashA: 'source', sourceHashB: 'source',
    choice: 'b', reasonTags: ['clarity'], createdAt: time, presentationOrder: [b, a], sampling: 'targeted', samplingProbability: null };
  assert.throws(() => store.recordPreference(label), /passing/);
  store.recordOutcome(b, outcome());
  assert.throws(() => store.recordPreference({ ...label, sourceHashA: 'old-source' }), /stale/);
  store.recordPreference(label); store.recordPreference(label);
  assert.equal(store.listPreferences().length, 1);
  assert.throws(() => store.recordPreference({ ...label, id: 'duplicate' }), /UNIQUE/);
  assert.throws(() => store.recordPreference({ ...label, choice: 'a' }), /different content/);
});

test('promotion outbox survives restart and ack is idempotent; failed candidates cannot be promoted', async t => {
  const { store } = await fixture(t); const [a, b] = pair(store);
  store.recordOutcome(a, outcome()); store.recordOutcome(b, outcome(false));
  assert.throws(() => store.promoteCandidate('experiment', b, {}), /passing candidate/);
  const record = store.promoteCandidate('experiment', a, { projectId: 'project', runId: 'selected-run' });
  assert.equal(store.getExperiment('experiment').status, 'promoting');
  store.close(); await store.init();
  assert.deepEqual(store.pendingPromotions(), [record]);
  assert.equal(store.promoteCandidate('experiment', a, record.payload).id, record.id);
  store.ackPromotion(record.id); store.ackPromotion(record.id);
  assert.equal(store.pendingPromotions().length, 0); assert.equal(store.getExperiment('experiment').status, 'complete');
});

test('decision recording atomically spends credits once and rejects invented probabilities or stale state', async t => {
  const { store } = await fixture(t); pair(store);
  const policy = fitPolicy(store, { cohortKey: 'cohort', baselineProfileId: 'a', profileIds: ['a', 'b'], id: 'policy' }); store.savePolicy(policy);
  const decision = proposeDecision(policy, { experimentId: 'experiment', credit: 0, automaticComparisons: true, comparisonBudgetAvailable: true, random: () => 0.01 });
  store.recordDecision(decision); store.recordDecision(decision);
  assert.equal(store.getRoutingState('cohort').credit, 0.1); assert.equal(store.listDecisions().length, 1);
  pair(store, 'second');
  const stale = proposeDecision(policy, { experimentId: 'second', credit: 0, random: () => 0.1 });
  assert.throws(() => store.recordDecision(stale), /credits changed/);
  const valid = proposeDecision(policy, { experimentId: 'second', credit: 0.1, random: () => 0.1 });
  assert.throws(() => store.recordDecision({ ...valid, creditAfter: 1 }), /credit balance/);
  assert.throws(() => store.recordDecision({ ...valid, observationProbabilities: { a: 0, b: 1 } }), /observation probabilities/);
  assert.equal(store.listDecisions().length, 1);
});

test('three routed failures roll back once; cancellations and duplicate completion do not count', async t => {
  const { store } = await fixture(t);
  const policy = fitPolicy(store, { cohortKey: 'cohort', baselineProfileId: 'a', profileIds: ['a', 'b'], validatedProfileIds: ['a', 'b'], id: 'active' });
  store.savePolicy({ ...structuredClone(policy), id: 'frozen-source' });
  policy.validation = { eligible: true, reasons: [], warmupPairs: 8, validationPairs: 12, validationLineages: 3, proposedSuccesses: 12, baselineRegressions: 0, policySnapshotId: 'frozen-source' };
  store.savePolicy(policy); store.activatePolicy(policy.id);
  for (let i = 0; i < 4; i++) {
    const [a] = pair(store, `r${i}`);
    const decision = proposeDecision(store.getPolicy(policy.id), { experimentId: `r${i}`, credit: store.getRoutingState('cohort').credit, mode: 'adaptive', random: () => 0.1 });
    store.recordDecision(decision);
    const result = i === 1 ? { ...outcome(false), terminalReason: 'cancelled' } : outcome(false);
    store.recordOutcome(a, result); store.recordOutcome(a, result);
  }
  assert.equal(store.getRoutingState('cohort').consecutiveFailures, 3);
  assert.equal(store.getRoutingState('cohort').rolledBack, true);
  assert.equal(store.getPolicy(policy.id).status, 'rolled-back');
});

test('activation binds distribution and pins to its frozen validated policy; online fits remain unvalidated', async t => {
  const { store } = await fixture(t);
  const frozen = fitPolicy(store, { cohortKey: 'cohort', baselineProfileId: 'a', profileIds: ['a', 'b'], id: 'frozen' }); store.savePolicy(frozen);
  const validated = { ...structuredClone(frozen), id: 'promoted', validatedProfileIds: ['a', 'b'], validation: { eligible: true, reasons: [], warmupPairs: 8,
    validationPairs: 12, validationLineages: 3, proposedSuccesses: 12, baselineRegressions: 0, policySnapshotId: frozen.id } };
  store.savePolicy(validated); store.activatePolicy(validated.id);
  for (const [id, change] of [
    ['success-flip', value => { value.arms[1].successes++; }],
    ['preference-flip', value => { value.preferences[0].bWins = 3; value.preferences[0].labels = 3; }],
    ['new-cohort', value => { value.cohortKey = 'new-model-or-profile'; }],
    ['different-memory', value => { value.validation.memorySnapshotId = 'other'; }],
    ['missing-source', value => { value.validation.policySnapshotId = 'absent'; }],
    ['self-validation', value => { value.validation.policySnapshotId = value.id; }],
  ]) {
    const changed = { ...structuredClone(validated), id }; change(changed); store.savePolicy(changed);
    assert.throws(() => store.activatePolicy(id), /frozen|pins/);
  }
  assert.throws(() => store.savePolicy({ ...validated, id: 'bypass', status: 'active' }), /activate/);
  const [a] = pair(store, 'new-outcome'); store.recordOutcome(a, outcome(false));
  const refit = fitPolicy(store, { cohortKey: 'cohort', baselineProfileId: 'a', profileIds: ['a', 'b'] }); store.savePolicy(refit);
  assert.equal(refit.status, 'shadow'); assert.equal(refit.validation, undefined); assert.throws(() => store.activatePolicy(refit.id), /independent/);
  assert.equal(store.getPolicy(validated.id).status, 'active');
});
