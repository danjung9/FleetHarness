import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginFunctionalRepair, createFunctionalRepairState, finishFunctionalRepair,
  functionalRepairAttempts, functionalRepairLimits, observeFunctionalRepair, qualityRepairObservation,
  recoverFunctionalRepair, solutionRepairObservation, validateFunctionalRepairState,
  verificationRepairObservation
} from '../dist-electron/electron/functional-repair.js';

const observation = (failures = ['one', 'two'], metrics = { accuracy: 0 }) => ({ failures, metrics });
const core = (overrides = {}) => ({
  schemaVersion: 1, status: 'failed', durationMs: 12,
  runtime: { profile: 'cli', filesHash: 'initial-source', runtime: 'node', environmentNames: [] },
  evaluations: [{ id: 'correctness', capabilityId: 'compute', evaluator: 'classification', dataset: { name: 'frozen', version: '1', provenance: 'host' },
    metric: 'mean_label_accuracy', threshold: 1, actual: 0.4, trials: 1, status: 'failed',
    cases: [{ id: 'boundary', trial: 1, passed: false, score: 0.4, detail: 'Runtime error on port 1234', durationMs: 10, output: 'bad answer' }] }],
  capabilities: [{ id: 'compute', required: true, status: 'failed' }], errors: [], ...overrides
});
const quality = (overrides = {}) => ({ schemaVersion: 2, status: 'failed', contractHash: 'contract', requirementsMet: false,
  criteria: [{ criterionId: 'R1', requirement: 'Useful result', status: 'failed', detail: 'Diagnostic prose' }],
  journeys: [{ id: 'save', title: 'Save and reopen', viewport: 'desktop', status: 'failed', detail: 'Old rendering' }], expectedJourneys: 1,
  errors: [], solutionEvaluation: core(), package: { status: 'failed', cleanCopy: true, profile: 'cli', detail: 'Old error' }, ...overrides });
const verification = (overrides = {}) => ({ time: '2026-01-01', command: 'node --test', exitCode: 1,
  passed: 1, failed: 2, skipped: 0, total: 3, output: 'not ok 1 - diagnostics', durationMs: 20, sourceHash: 'first-source', ...overrides });

test('a core repair cannot consume the reserved workflow or final allowance', () => {
  const state = createFunctionalRepairState();
  for (let attempt = 1; attempt <= functionalRepairLimits.attemptsPerGate; attempt++) {
    const decision = beginFunctionalRepair(state, 'core', observation(['one'], { accuracy: attempt / 10 }));
    assert.equal(decision.allowed, true); assert.equal(decision.attempt, attempt);
    finishFunctionalRepair(state, 1000);
  }
  assert.deepEqual(beginFunctionalRepair(state, 'core', observation(['one'], { accuracy: 0.4 })), { allowed: false, reason: 'attempt-limit' });
  for (const gate of ['workflow', 'final']) {
    assert.deepEqual(beginFunctionalRepair(state, gate, observation()), { allowed: true, attempt: 1, allowanceMs: functionalRepairLimits.activeMsPerGate });
    finishFunctionalRepair(state, 2000);
  }
  assert.deepEqual(Object.values(state.gates).map(gate => gate.attempts), [3, 1, 1]);
});

test('two unchanged independent failure observations stop repairs before a third model call', () => {
  const state = createFunctionalRepairState();
  assert.equal(beginFunctionalRepair(state, 'final', observation()).allowed, true);
  finishFunctionalRepair(state, 1);
  assert.equal(beginFunctionalRepair(state, 'final', observation(['two', 'one'])).allowed, true);
  finishFunctionalRepair(state, 1);
  assert.deepEqual(beginFunctionalRepair(state, 'final', observation()), { allowed: false, reason: 'no-progress' });
  assert.equal(state.gates.final.attempts, 2);
});

test('host-scored improvement with the same failing cases grants a targeted retry', () => {
  const state = createFunctionalRepairState();
  beginFunctionalRepair(state, 'core', observation(['case'], { accuracy: 0.2 })); finishFunctionalRepair(state, 10);
  beginFunctionalRepair(state, 'core', observation(['case'], { accuracy: 0.2 })); finishFunctionalRepair(state, 10);
  assert.equal(state.gates.core.noProgress, 1);
  assert.equal(beginFunctionalRepair(state, 'core', observation(['case'], { accuracy: 0.3 })).allowed, true);
  assert.equal(state.gates.core.noProgress, 0);
});

test('fixing a failure establishes progress but replacing failures, new metric names and regressions do not', () => {
  for (const [next, expected] of [
    [observation(['one'], { accuracy: 0 }), 0],
    [observation(['one', 'new'], { accuracy: 1 }), 1],
    [observation(['one', 'two'], { accuracy: 0, invented: 100 }), 1],
    [observation(['one'], { accuracy: -1 }), 1],
    [observation(['one'], {}), 1]
  ]) {
    const state = createFunctionalRepairState();
    beginFunctionalRepair(state, 'workflow', observation()); finishFunctionalRepair(state, 1);
    beginFunctionalRepair(state, 'workflow', next);
    assert.equal(state.gates.workflow.noProgress, expected);
  }
});

test('clean cancellation consumes its attempt and active time while resumed stopped time is free', () => {
  const state = createFunctionalRepairState();
  const input = observation();
  beginFunctionalRepair(state, 'workflow', input);
  input.failures.length = 0; input.metrics.accuracy = 100;
  assert.deepEqual(state.gates.workflow.previous, observation());
  assert.equal(observeFunctionalRepair(state, 250.2), functionalRepairLimits.activeMsPerGate - 251);
  assert.equal(observeFunctionalRepair(state, 100), functionalRepairLimits.activeMsPerGate - 251);
  finishFunctionalRepair(state, 300);
  const resumed = JSON.parse(JSON.stringify(state));
  recoverFunctionalRepair(resumed);
  assert.equal(resumed.gates.workflow.attempts, 1);
  assert.equal(resumed.gates.workflow.consumedMs, 300);
  assert.deepEqual(beginFunctionalRepair(resumed, 'workflow', observation(['one'], { accuracy: 0.1 })), {
    allowed: true, attempt: 2, allowanceMs: functionalRepairLimits.activeMsPerGate - 300
  });
  finishFunctionalRepair(resumed, functionalRepairLimits.activeMsPerGate * 2);
  assert.equal(resumed.gates.workflow.consumedMs, functionalRepairLimits.activeMsPerGate);
  assert.deepEqual(beginFunctionalRepair(resumed, 'workflow', observation(['one'], { accuracy: 0.2 })), { allowed: false, reason: 'time-limit' });
});

test('an unclean pending repair cannot obtain free time or free attempts by resuming', () => {
  const state = createFunctionalRepairState();
  beginFunctionalRepair(state, 'core', observation());
  observeFunctionalRepair(state, 100);
  const resumed = JSON.parse(JSON.stringify(state));
  recoverFunctionalRepair(resumed);
  assert.equal(resumed.gates.core.attempts, 1);
  assert.equal(resumed.gates.core.consumedMs, functionalRepairLimits.activeMsPerGate);
  assert.equal(resumed.active, undefined);
  recoverFunctionalRepair(resumed);
  assert.equal(resumed.gates.core.consumedMs, functionalRepairLimits.activeMsPerGate);
  assert.deepEqual(beginFunctionalRepair(resumed, 'core', observation(['one'], { accuracy: 1 })), { allowed: false, reason: 'time-limit' });
  assert.equal(beginFunctionalRepair(resumed, 'final', observation()).allowed, true);
});

test('legacy shared repair usage conservatively consumes one slot without resetting new state', () => {
  assert.equal(createFunctionalRepairState({ legacyRepairUsed: true }).gates.core.attempts, 1);
  const state = createFunctionalRepairState({ legacyRepairUsed: true, legacyGate: 'final' });
  assert.equal(state.gates.final.attempts, 1); assert.equal(state.gates.core.attempts, 0);
  beginFunctionalRepair(state, 'final', observation()); finishFunctionalRepair(state, 13);
  const resumed = JSON.parse(JSON.stringify(state)); recoverFunctionalRepair(resumed);
  assert.equal(resumed.gates.final.attempts, 2); assert.equal(resumed.gates.final.consumedMs, 13);
});

test('telemetry sums validated gate reservations including pending work and falls back only for legacy checkpoints', () => {
  const state = createFunctionalRepairState();
  for (const gate of ['core', 'workflow', 'final']) {
    beginFunctionalRepair(state, gate, observation());
    if (gate !== 'final') finishFunctionalRepair(state, 10);
  }
  assert.equal(functionalRepairAttempts(state, true), 3);
  assert.equal(functionalRepairAttempts(state, false), 3);
  assert.equal(functionalRepairAttempts(undefined, true), 1);
  assert.equal(functionalRepairAttempts(undefined, false), 0);
  assert.equal(functionalRepairAttempts(), 0);
  assert.throws(() => functionalRepairAttempts({ ...state, version: 2 }, false), /Invalid/);
  assert.throws(() => functionalRepairAttempts(undefined, 'false'), /Invalid/);
});

test('persisted validation rejects invalid budgets, progress counters, observations and leases', () => {
  const mutations = [
    state => { state.version = 2; },
    state => { state.gates.other = state.gates.core; },
    state => { state.gates.core.attempts = 4; },
    state => { state.gates.core.consumedMs = -1; },
    state => { state.gates.core.consumedMs = functionalRepairLimits.activeMsPerGate + 1; },
    state => { state.gates.core.noProgress = 3; },
    state => { state.gates.core.previous.metrics.accuracy = Infinity; },
    state => { state.gates.core.previous.failures = ['a', 'a']; },
    state => { state.active.gate = 'other'; },
    state => { state.active.attempt = 0; },
    state => { state.active.allowanceMs++; },
    state => { state.active.elapsedMs = state.active.allowanceMs + 1; }
  ];
  for (const mutate of mutations) {
    const state = createFunctionalRepairState(); beginFunctionalRepair(state, 'core', observation()); mutate(state);
    assert.throws(() => validateFunctionalRepairState(state), /Invalid/);
  }
  const state = createFunctionalRepairState(); beginFunctionalRepair(state, 'core', observation());
  assert.throws(() => beginFunctionalRepair(state, 'final', observation()), /current functional repair lease/);
  assert.throws(() => observeFunctionalRepair(state, NaN), /elapsed time/);
  assert.throws(() => observeFunctionalRepair(state, -1), /elapsed time/);
});

test('solution failure identities survive reordered reports, changed diagnostics, outputs, hashes and timing', () => {
  const initial = core(), modified = structuredClone(initial);
  modified.durationMs = 999; modified.runtime.filesHash = 'new-source';
  modified.evaluations[0].cases[0].durationMs = 998;
  modified.evaluations[0].cases[0].detail = 'Different message on port 9999';
  modified.evaluations[0].cases[0].output = { time: 'now', value: 'new bad answer' };
  assert.deepEqual(solutionRepairObservation(initial), solutionRepairObservation(modified));
  assert.deepEqual(solutionRepairObservation(initial).failures, ['capability/compute', 'case/compute/correctness/boundary/1', 'evaluation/compute/correctness']);
  modified.evaluations[0].actual = 0.6; modified.evaluations[0].cases[0].score = 0.6;
  assert.deepEqual(solutionRepairObservation(initial).failures, solutionRepairObservation(modified).failures);
  assert.equal(solutionRepairObservation(modified).metrics['case/compute/correctness/boundary/1'], 0.6);
});

test('passed thresholded evaluations do not invent failures for allowed imperfect case scores', () => {
  const report = core({ status: 'passed', capabilities: [{ id: 'compute', required: true, status: 'passed' }] });
  report.evaluations[0].threshold = 0.3; report.evaluations[0].status = 'passed';
  assert.deepEqual(solutionRepairObservation(report).failures, []);
  assert.equal(beginFunctionalRepair(createFunctionalRepairState(), 'core', solutionRepairObservation(report)).reason, 'passed');
});

test('quality observations identify frozen journeys, criteria and package failure without hashing prose', () => {
  const initial = quality(), modified = structuredClone(initial);
  modified.contractHash = 'different'; modified.criteria[0].detail = 'new prose'; modified.journeys[0].detail = 'new steps';
  modified.journeys[0].trace = 'new/trace.zip'; modified.package.detail = 'new diagnostic';
  assert.deepEqual(qualityRepairObservation(initial), qualityRepairObservation(modified));
  assert.ok(qualityRepairObservation(initial).failures.includes('journey/save/desktop'));
  assert.ok(qualityRepairObservation(initial).failures.includes('criterion/R1'));
  assert.ok(qualityRepairObservation(initial).failures.includes('quality/package'));
});

test('independent browser step completion counts as progress before a failing journey fully passes', () => {
  const initial = quality(), improved = structuredClone(initial);
  Object.assign(initial.journeys[0], { completedSteps: 2, totalSteps: 8 });
  Object.assign(improved.journeys[0], { completedSteps: 4, totalSteps: 8 });
  const before = qualityRepairObservation(initial), after = qualityRepairObservation(improved);
  assert.deepEqual(after.failures, before.failures);
  assert.equal(before.metrics['journey/save/desktop'], 0.25);
  assert.equal(after.metrics['journey/save/desktop'], 0.5);
  const state = createFunctionalRepairState();
  beginFunctionalRepair(state, 'final', before); finishFunctionalRepair(state, 1);
  beginFunctionalRepair(state, 'final', before); finishFunctionalRepair(state, 1);
  assert.equal(beginFunctionalRepair(state, 'final', after).allowed, true);
  assert.equal(state.gates.final.noProgress, 0);
  improved.journeys[0].completedSteps = 999;
  assert.equal(qualityRepairObservation(improved).metrics['journey/save/desktop'], undefined);
});

test('application diagnostic changes or added passing tests cannot masquerade as repair progress', () => {
  const original = verificationRepairObservation(verification(), false);
  const changed = verificationRepairObservation(verification({ passed: 100, total: 102,
    time: '2027-01-01', sourceHash: 'new-source', durationMs: 999,
    output: 'totally different names, line numbers and stack traces' }), false);
  assert.deepEqual(original, changed);
  const improved = verificationRepairObservation(verification({ failed: 1, total: 2 }), false);
  const state = createFunctionalRepairState(); beginFunctionalRepair(state, 'final', original); finishFunctionalRepair(state, 1);
  beginFunctionalRepair(state, 'final', improved);
  assert.equal(state.gates.final.noProgress, 0);
});

test('missing and incomplete evidence remains a repair failure; a complete passing report consumes no attempt', () => {
  assert.ok(verificationRepairObservation().failures.includes('verification/missing-report'));
  assert.ok(solutionRepairObservation(core({ evaluations: [], capabilities: [], status: 'failed' })).failures.includes('core/no-evaluations'));
  const passed = verification({ passed: 1, failed: 0, total: 1, exitCode: 0 });
  assert.deepEqual(verificationRepairObservation(passed, false).failures, []);
  assert.ok(verificationRepairObservation(passed, true).failures.includes('quality/missing-report'));
  const state = createFunctionalRepairState();
  assert.deepEqual(beginFunctionalRepair(state, 'final', verificationRepairObservation(passed, false)), { allowed: false, reason: 'passed' });
  assert.equal(state.gates.final.attempts, 0);
});
