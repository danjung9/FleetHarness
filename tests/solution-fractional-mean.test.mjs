import test from 'node:test';
import assert from 'node:assert/strict';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';
import { reportPassed } from '../dist-electron/shared/verification.js';

const contract = {
  schemaVersion: 1, objective: 'Score supplied observations.',
  runtime: { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } },
  capabilities: [{ id: 'core', kind: 'prediction', description: 'Evaluate observations.', criterionIds: ['R1'], required: true, evaluationIds: ['quality'] }]
};
function adjacent(value, direction) {
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setFloat64(0, value); bytes.setBigUint64(0, bytes.getBigUint64(0) + BigInt(direction));
  return bytes.getFloat64(0);
}
function classification(name, fractions, mean, trials = 1) {
  return { name, evaluator: 'classification', mean, trials,
    scores: fractions.map(([correct, count]) => correct / count),
    cases: fractions.map(([, count], i) => ({ id: `case-${i}`, input: { index: i }, expected: Array(count).fill(true) })),
    outputs: fractions.map(([correct, count]) => Array.from({ length: count }, (_, i) => i < correct)) };
}
const documents = Array.from({ length: 10 }, (_, i) => ({ id: `document-${i}`, text: 'source' }));
const retrieval = { name: 'fifteen retrieval F1 scores of two thirds', evaluator: 'retrieval', mean: 2 / 3, trials: 1,
  scores: Array(15).fill(2 / 3),
  cases: Array.from({ length: 15 }, (_, i) => ({ id: `query-${i}`, input: { index: i, query: `query ${i}`, documents }, expected: { ids: documents.map(item => item.id) } })),
  outputs: Array.from({ length: 15 }, () => ({ results: documents.slice(0, 5).map(item => ({ id: item.id, excerpt: { start: 0, end: 6, text: 'source' } })) })) };
const fixtures = [
  classification('three classification scores of seven tenths', Array(3).fill([7, 10]), 0.7),
  classification('six classification scores of eight tenths', Array(6).fill([8, 10]), 0.8),
  classification('fractional classification across repeated trials', [[7, 10], [7, 10]], 0.7, 7),
  classification('unequal label counts retain equal case weighting', [[1, 2], [9, 10]], 0.7),
  classification('existing per-case rounding is preserved', [[1, 10], [7, 10]], 0.39999999999999997),
  retrieval,
  ...[[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].flatMap((order, i) => [
    classification(`mixed fractions permutation ${i}`, order.map(j => [[6, 10], [7, 10], [8, 10]][j]), 0.7),
    classification(`binary scores permutation ${i}`, order.map(j => [[1, 1], [0, 1], [0, 1]][j]), 1 / 3)
  ])
];
function savedReport(solutionEvaluation) {
  return { exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0,
    quality: { schemaVersion: 2, status: 'passed', errors: [], journeys: [], expectedJourneys: 0,
      criteria: [{ criterionId: 'R1', status: 'passed', capabilityIds: ['core'] }],
      capabilities: contract.capabilities.map(item => ({ ...item, status: 'passed' })),
      package: { status: 'passed', cleanCopy: true, profile: 'cli', filesHash: 'fractional-fixture' }, solutionEvaluation } };
}
for (const fixture of fixtures) test(`fractional mean: ${fixture.name}`, async () => {
  const runtime = { provenance: { profile: 'cli', filesHash: 'fractional-fixture' },
    invoke: async input => structuredClone(fixture.outputs[input.index]), redactMessage: value => value, redactOutput: value => value };
  const plan = { schemaVersion: 1, evaluations: [{ id: 'quality', capabilityId: 'core', evaluator: fixture.evaluator,
    dataset: { name: 'fractional-boundaries', version: '1', provenance: 'synthetic' }, cases: fixture.cases,
    trials: fixture.trials, threshold: fixture.mean, baseline: fixture.mean }] };
  for (const [threshold, baseline, passed] of [
    [fixture.mean, fixture.mean, true],
    [adjacent(fixture.mean, -1), adjacent(fixture.mean, -1), true],
    [adjacent(fixture.mean, 1), fixture.mean, false],
    [fixture.mean, adjacent(fixture.mean, 1), false]
  ]) {
    const frozen = structuredClone(plan); Object.assign(frozen.evaluations[0], { threshold, baseline });
    const report = await runSolutionEvaluation(runtime, contract, frozen), result = report.evaluations[0];
    assert.equal(result.actual, fixture.mean);
    assert.equal(result.threshold, threshold); assert.equal(result.baseline, baseline);
    assert.deepEqual(result.cases.map(item => item.score), Array.from({ length: fixture.trials }, () => fixture.scores).flat());
    assert.equal(report.status, passed ? 'passed' : 'failed');
    const saved = JSON.parse(JSON.stringify(savedReport(report)));
    assert.equal(reportPassed(saved, true), passed);
    if (passed) {
      saved.quality.solutionEvaluation.evaluations[0].threshold = adjacent(fixture.mean, 1);
      assert.equal(reportPassed(saved, true), false, 'Persisted evidence must retain strict threshold comparisons.');
    }
  }
});
