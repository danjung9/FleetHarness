import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';
import { runSolutionEvaluation, scoreSolutionOutput } from '../dist-electron/electron/solution-evaluation.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';

const solution = {
  schemaVersion: 1, objective: 'Classify supplied observations.',
  runtime: { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } },
  capabilities: [{ id: 'classify', kind: 'prediction', description: 'Classify observations.', criterionIds: ['R1'], required: true, evaluationIds: ['labels'] }]
};
const evaluation = (overrides = {}) => ({
  id: 'labels', capabilityId: 'classify', description: 'Independent reference labels.',
  dataset: { name: 'classification-reference', version: '1', provenance: 'reviewed' },
  evaluator: 'classification', threshold: 0.5, trials: 1,
  cases: [{ id: 'positive', input: 1, expected: 'yes' }, { id: 'negative', input: -1, expected: 'no' }],
  ...overrides
});
const score = (output, expected) => scoreSolutionOutput({ evaluator: 'classification' }, null, output, expected);
function evaluate(invoke, item = evaluation()) {
  const runtime = {
    provenance: { profile: 'cli', filesHash: 'classification-fixture', runtime: 'node', environmentNames: [] },
    invoke, redactOutput: output => output, redactMessage: message => message
  };
  return runSolutionEvaluation(runtime, solution, { schemaVersion: 1, evaluations: [item] });
}
function assertFatal(result, label) {
  assert.equal(result.fatal, true, label);
  assert.equal(result.score, 0, label);
}
function assertFailed(report, label) {
  assert.equal(report.status, 'failed', label);
  assert.equal(report.evaluations[0].status, 'failed', label);
  assert.equal(report.capabilities[0].status, 'failed', label);
}
const validLabels = ['', 'yes', 'non-ASCII: café', 0, -0, -1.25, Number.MAX_VALUE, Number.MIN_VALUE, false, true];

test('classification plans accept all scalar label types and flat mixed label arrays', () => {
  for (const expected of [...validLabels, ['yes', 0, false, -1.25], ['yes', 'yes']]) {
    const item = evaluation();
    item.cases[0].expected = expected;
    const parsed = parseEvaluationPlan({ schemaVersion: 1, evaluations: [item] }, solution);
    assert.deepEqual(parsed.evaluations[0].cases[0].expected, expected);
    assert.equal(parsed.evaluations[0].threshold, 0.5);
  }
});

test('classification plans reject malformed and nonfinite expected labels before freezing', () => {
  const invalid = [null, {}, [], ['yes', null], ['yes', {}], ['yes', ['no']],
    NaN, Infinity, -Infinity, undefined, 1n, Symbol('label'), () => 'yes', ['yes', undefined], ['yes', NaN], ['yes', ,]];
  for (const expected of invalid) {
    const item = evaluation();
    item.cases[0].expected = expected;
    assert.throws(() => parseEvaluationPlan({ schemaVersion: 1, evaluations: [item] }, solution), /expected/);
  }
});

test('classification scores valid scalar labels including zero, false and empty strings', () => {
  for (const label of validLabels) {
    const result = score(label, label);
    assert.equal(result.score, 1);
    assert.notEqual(result.fatal, true);
  }
  const labels = ['yes', 0, false, -1.25];
  assert.equal(score([...labels], labels).score, 1);
});

test('valid incorrect classification labels remain ordinary misses with fractional accuracy', () => {
  for (const [output, expected] of [['other', 'yes'], [1, 0], [true, false], [0, false], [false, 'no']]) {
    const result = score(output, expected);
    assert.equal(result.score, 0);
    assert.notEqual(result.fatal, true);
  }
  const result = score(['yes', 'yes', 0, true], ['yes', 'no', 0, false]);
  assert.equal(result.score, 0.5);
  assert.notEqual(result.fatal, true);
});

test('classification rejects null, object and nested labels even beside correct array labels', () => {
  for (const output of [null, {}, { label: 'yes' }]) assertFatal(score(output, 'yes'), 'Malformed scalar output');
  for (const label of [null, {}, { label: 'no' }, ['no'], []]) {
    assertFatal(score(['yes', label], ['yes', 'no']), 'Malformed array label must invalidate the whole case');
  }
});

test('direct classification scoring fails closed on nonfinite and non-JSON output labels', () => {
  for (const label of [NaN, Infinity, -Infinity, undefined, 1n, Symbol('label'), () => 'yes']) {
    assertFatal(score(label, 0), 'Invalid scalar output');
    assertFatal(score(['yes', label], ['yes', 0]), 'Invalid label in an otherwise correct array');
  }
  assertFatal(score(['yes', ,], ['yes', 'no']), 'Sparse output array');
});

test('direct classification scoring rejects malformed answer keys when planning is bypassed', () => {
  for (const expected of [null, {}, NaN, Infinity, -Infinity, undefined, 1n, Symbol('label'), () => 'yes']) {
    assertFatal(score(expected, expected), 'Malformed scalar answer key');
  }
  for (const expected of [[], ['yes', null], ['yes', {}], ['yes', ['no']], ['yes', undefined], ['yes', NaN], ['yes', ,]]) {
    assertFatal(score(expected, expected), 'Malformed array answer key');
  }
});

test('malformed scalar output fails the complete evaluation despite meeting its aggregate threshold', async () => {
  for (const output of [null, {}, { label: 'no' }]) {
    const report = await evaluate(async input => input > 0 ? 'yes' : output);
    assert.equal(report.evaluations[0].actual, 0.5);
    assert.equal(report.evaluations[0].threshold, 0.5);
    assertFailed(report, 'A correct case cannot compensate for malformed output');
    assert.deepEqual(report.evaluations[0].cases.map(entry => entry.passed), [true, false]);
  }
});

test('partly correct arrays containing malformed labels cannot pass a fractional threshold', async () => {
  const cases = [
    { id: 'positive', input: 1, expected: ['yes', 'no'] },
    { id: 'negative', input: -1, expected: ['no', 'yes'] }
  ];
  for (const label of [null, {}, ['no']]) {
    const report = await evaluate(async input => [input > 0 ? 'yes' : 'no', label], evaluation({ cases }));
    assertFailed(report, 'Malformed labels must not receive ordinary partial credit');
    assert.equal(report.evaluations[0].actual, 0);
    assert.ok(report.evaluations[0].cases.every(entry => entry.score === 0 && entry.passed === false));
  }
});

test('one malformed output in a later trial fails the evaluation after earlier correct trials', async () => {
  let invocations = 0;
  const report = await evaluate(async input => {
    invocations++;
    return invocations === 4 ? null : input > 0 ? 'yes' : 'no';
  }, evaluation({ trials: 3 }));
  assert.equal(invocations, 6);
  assert.equal(report.evaluations[0].actual, 5 / 6);
  assert.ok(report.evaluations[0].actual > report.evaluations[0].threshold);
  assert.deepEqual(report.evaluations[0].cases.map(entry => [entry.trial, entry.passed]), [
    [1, true], [1, true], [2, true], [2, false], [3, true], [3, true]
  ]);
  assertFailed(report, 'Later successes must not clear a fatal trial');
});

test('valid wrong labels can still pass a fractional threshold across repeated trials', async () => {
  for (const cases of [
    [{ id: 'first', input: 1, expected: 'yes' }, { id: 'second', input: 2, expected: 'no' }],
    [{ id: 'first', input: 1, expected: 0 }, { id: 'second', input: 2, expected: 1 }],
    [{ id: 'first', input: 1, expected: false }, { id: 'second', input: 2, expected: true }],
    [{ id: 'first', input: 1, expected: ['yes', 'no'] }, { id: 'second', input: 2, expected: ['no', 'yes'] }]
  ]) {
    const output = Array.isArray(cases[0].expected) ? ['yes', 'yes'] : cases[0].expected;
    const report = await evaluate(async () => output, evaluation({ cases, trials: 3 }));
    assert.equal(report.evaluations[0].cases.length, 6);
    assert.equal(report.evaluations[0].actual, 0.5);
    assert.equal(report.evaluations[0].status, 'passed');
    assert.equal(report.capabilities[0].status, 'passed');
    assert.equal(report.status, 'passed');
    assert.deepEqual(report.errors, []);
  }
});

test('clean packaged classifier returning JSON null fails its frozen fractional evaluation', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-classification-gate-'));
  let runtime;
  try {
    await fs.writeFile(path.join(root, 'engine.mjs'), `
let text = ''; for await (const chunk of process.stdin) text += chunk;
const input = JSON.parse(text);
console.log(JSON.stringify(input > 0 ? 'yes' : null));
`);
    const plan = parseEvaluationPlan({ schemaVersion: 1, evaluations: [evaluation()] }, solution);
    runtime = await prepareSolutionRuntime(root, solution.runtime, process.execPath);
    const report = await runSolutionEvaluation(runtime, solution, plan);
    assertFailed(report, 'Malformed labels from a real process must fail the same gate');
    assert.equal(report.evaluations[0].actual, 0.5);
    assert.equal(report.evaluations[0].cases[1].output, null);
    assert.match(report.evaluations[0].cases[1].detail, /Classification labels/);
    assert.match(report.runtime.filesHash, /^[a-f0-9]{64}$/);
  } finally {
    await runtime?.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});
