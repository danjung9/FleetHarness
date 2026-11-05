import test from 'node:test';
import assert from 'node:assert/strict';
import { cohortKey, greedyProfile, proposeDecision, evaluatePromotion, promotedPolicy, selectCandidate } from '../dist-electron/electron/learning-policy.js';

const time = '2026-11-05T12:00:00.000Z';
const policy = (overrides = {}) => ({ id: 'policy', cohortKey: 'cohort', createdAt: time, baselineProfileId: 'a', profileIds: ['a', 'b'],
  validatedProfileIds: ['a', 'b'], arms: [{ profileId: 'a', successes: 8, failures: 0 }, { profileId: 'b', successes: 8, failures: 0 }],
  preferences: [], sourceExperimentIds: [], status: 'active', version: 1, ...overrides });
const outcome = (success = true) => ({ mandatoryPassed: success, requiredScopePassed: success, withinBudget: true,
  terminalReason: success ? 'completed' : 'verification-failed', durationMs: 2, costUsd: null, repairCount: 0,
  sourceHash: 'source', contractHash: 'contract', evidenceHash: 'evidence', evaluatorVersion: '1', recordedAt: '2026-11-05T12:01:00.000Z' });
function pair(id, partition, lineageId = id) {
  return { experiment: { id, projectId: 'project', lineageId, cohortKey: 'cohort', partition, mode: 'paired', status: 'review',
    baselineProfileId: 'a', candidateIds: [`${id}-a`, `${id}-b`], createdAt: time, updatedAt: time },
    candidates: ['a', 'b'].map(profileId => ({ id: `${id}-${profileId}`, experimentId: id, profileId, profileVersion: '1', baseline: profileId === 'a',
      status: 'passed', createdAt: time, updatedAt: time, outcome: outcome() })),
    decision: { ...proposeDecision(policy(), { experimentId: id, credit: 0, mode: 'paired', prospectiveValidation: true, random: () => 0.99 }), createdAt: time } };
}

test('cohorts separate model, profile, evaluation and memory versions without order sensitivity', () => {
  const context = { taskFamily: 'schedule', runtimeConstraints: ['offline', 'service'], budgetTier: 'bounded', backend: 'pi', provider: 'provider', model: 'model',
    profileVersions: { a: '1', b: '1' }, evaluatorVersion: '1', memoryPolicyVersion: '1' };
  assert.equal(cohortKey(context), cohortKey({ ...context, runtimeConstraints: [...context.runtimeConstraints].reverse(), profileVersions: { b: '1', a: '1' } }));
  for (const patch of [{ model: 'new' }, { profileVersions: { a: '2', b: '1' } }, { evaluatorVersion: '2' }, { memoryPolicyVersion: '2' }]) assert.notEqual(cohortKey(context), cohortKey({ ...context, ...patch }));
});

test('human preference affects only exact reliability ties with three explicit labels', () => {
  const preference = { profileAId: 'a', profileBId: 'b', aWins: 0, bWins: 3, ties: 0, labels: 3 };
  assert.equal(greedyProfile(policy()), 'a');
  assert.equal(greedyProfile(policy({ preferences: [{ ...preference, labels: 2 }] })), 'a');
  assert.equal(greedyProfile(policy({ preferences: [preference] })), 'b');
  const unequal = policy({ preferences: [{ ...preference, bWins: 100, labels: 100 }], arms: [{ profileId: 'a', successes: 100, failures: 0 }, { profileId: 'b', successes: 99, failures: 0 }] });
  assert.equal(greedyProfile(unequal), 'a', 'Even a tiny success difference cannot be offset by preference.');
  assert.equal(greedyProfile(policy({ preferences: [preference], validatedProfileIds: ['a'] })), 'a');
});

test('adaptive action and observation probabilities match actual draws, and unvalidated cohorts use baseline', () => {
  const selected = proposeDecision(policy(), { experimentId: 'one', credit: 1, mode: 'adaptive', automaticComparisons: true, comparisonBudgetAvailable: true, random: () => 0.99 });
  assert.deepEqual(selected.probabilities, { a: 0.95, b: 0.05 });
  assert.equal(selected.selectedProfileId, 'b'); assert.equal(selected.comparisonProbability, 0.1); assert.equal(selected.compare, false);
  assert.ok(Math.abs(selected.observationProbabilities.b - 0.145) < 1e-10);
  const baseline = proposeDecision(policy({ status: 'shadow' }), { experimentId: 'two', credit: 0, mode: 'adaptive', random: () => 0.99 });
  assert.deepEqual(baseline.probabilities, { a: 1, b: 0 }); assert.equal(baseline.selectedProfileId, 'a');
  const prospective = proposeDecision(policy({ status: 'shadow' }), { experimentId: 'test', credit: 0, mode: 'paired', prospectiveValidation: true, random: () => 0.99 });
  assert.equal(prospective.selectedProfileId, 'b'); assert.deepEqual(prospective.observationProbabilities, { a: 1, b: 1 });
});

test('comparison credits start empty, accrue one tenth, cap at one, and pay for every automatic extra build', () => {
  let credit = 0, comparisons = 0;
  for (let i = 1; i <= 100; i++) {
    const decision = proposeDecision(policy(), { experimentId: String(i), credit, mode: 'adaptive', automaticComparisons: true, comparisonBudgetAvailable: true, random: () => 0 });
    credit = decision.creditAfter; if (decision.compare) comparisons++;
    assert.ok(comparisons <= Math.floor(i / 10));
    assert.equal(decision.comparisonProbability, i % 10 === 0 ? 0.1 : 0);
  }
  assert.equal(comparisons, 10); assert.equal(credit, 0);
  const noBudget = proposeDecision(policy(), { experimentId: 'no-budget', credit: 1, mode: 'adaptive', automaticComparisons: true, comparisonBudgetAvailable: false, random: () => 0 });
  assert.equal(noBudget.compare, false); assert.equal(noBudget.creditAfter, 1);
  const manual = proposeDecision(policy(), { experimentId: 'manual', credit: 0.4, mode: 'paired', random: () => 0 });
  assert.equal(manual.compare, true); assert.equal(manual.creditAfter, 0.4);
});

test('promotion requires independent warmup and a fixed prospective 12-task batch without baseline regressions', () => {
  const development = Array.from({ length: 8 }, (_, i) => pair(`development-${i}`, 'development'));
  const frozen = policy({ status: 'shadow', createdAt: '2026-11-05T12:02:00.000Z', sourceExperimentIds: development.map(item => item.experiment.id) });
  const validation = Array.from({ length: 12 }, (_, i) => pair(`validation-${i}`, 'holdout', `holdout-lineage-${i % 3}`));
  for (const entry of validation) {
    entry.experiment.createdAt = '2026-11-05T13:00:00.000Z'; entry.decision.createdAt = entry.experiment.createdAt;
    entry.candidates.forEach(candidate => { candidate.outcome.recordedAt = '2026-11-05T13:01:00.000Z'; });
  }
  const approved = evaluatePromotion(frozen, development, validation);
  assert.equal(approved.eligible, true); assert.equal(approved.proposedSuccesses, 12);
  const active = promotedPolicy(frozen, approved, 'promoted');
  assert.equal(active.id, 'promoted'); assert.equal(frozen.validation, undefined); assert.equal(active.validation.policySnapshotId, frozen.id);
  const regression = structuredClone(validation); regression[0].candidates[1].outcome = { ...outcome(false), recordedAt: '2026-11-05T13:01:00.000Z' };
  assert.equal(evaluatePromotion(frozen, development, regression).eligible, false);
  assert.equal(evaluatePromotion(frozen, development, regression).baselineRegressions, 1);
  const unchosenFailures = structuredClone(validation);
  for (const entry of unchosenFailures) {
    entry.decision.selectedProfileId = 'a';
    entry.candidates[1].outcome = { ...outcome(false), recordedAt: '2026-11-05T13:01:00.000Z' };
  }
  const unsafeExploration = evaluatePromotion(frozen, development, unchosenFailures);
  assert.equal(unsafeExploration.proposedSuccesses, 12);
  assert.equal(unsafeExploration.baselineRegressions, 0);
  assert.equal(unsafeExploration.eligible, false, 'Unchosen failing arms cannot enter epsilon exploration');
  assert.match(unsafeExploration.reasons.join(' '), /Architecture b.*before exploration/);
  assert.throws(() => promotedPolicy(frozen, unsafeExploration), /does not validate/);
  const leaked = structuredClone(validation); leaked[0].experiment.lineageId = development[0].experiment.lineageId;
  assert.equal(evaluatePromotion(frozen, development, leaked).eligible, false);
  const unfrozen = structuredClone(validation); unfrozen[0].decision.memorySnapshotId = 'different';
  assert.equal(evaluatePromotion(frozen, development, unfrozen).eligible, false);
  const posthoc = structuredClone(validation); posthoc[0].decision.createdAt = '2026-11-05T13:02:00.000Z';
  assert.equal(evaluatePromotion(frozen, development, posthoc).eligible, false);
  assert.equal(evaluatePromotion(frozen, [...development, ...development], validation).warmupPairs, 8);
  const extra = structuredClone(validation[0]); extra.experiment.id = 'extra'; extra.decision.experimentId = 'extra';
  assert.equal(evaluatePromotion(frozen, development, [...validation, extra]).eligible, false);
});

test('selection never picks failed candidates, treats missing preference as missing, and ignores stale preferences', () => {
  const candidates = pair('selection', 'development').candidates;
  assert.equal(selectCandidate(candidates).candidateId, candidates[0].id);
  const preference = { candidateAId: candidates[0].id, candidateBId: candidates[1].id, sourceHashA: 'source', sourceHashB: 'source', choice: 'b' };
  assert.equal(selectCandidate(candidates, preference).candidateId, candidates[1].id);
  assert.equal(selectCandidate(candidates, { ...preference, sourceHashB: 'old' }).candidateId, candidates[0].id);
  assert.equal(selectCandidate(candidates, { ...preference, choice: 'neither' }).candidateId, candidates[0].id);
  candidates[1].outcome = outcome(false); candidates[1].status = 'failed';
  assert.equal(selectCandidate(candidates, preference).candidateId, candidates[0].id);
  candidates[0].outcome = outcome(false); candidates[0].status = 'failed';
  assert.equal(selectCandidate(candidates).candidateId, undefined);
});
