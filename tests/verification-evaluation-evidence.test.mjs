import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { getJourneyState } from '../dist-electron/shared/journey.js';
import { assertExecutableSource } from '../dist-electron/electron/executable.js';
import { newProject, sourceHash, Store } from '../dist-electron/electron/storage.js';

const roundtrip = value => JSON.parse(JSON.stringify(value));
const experiment = { experimentId: 'score-evidence', candidateId: 'candidate-1',
  behaviorHash: 'a'.repeat(64), evaluationSetHash: 'b'.repeat(64), executionHash: 'c'.repeat(64) };

async function passingReport({ version = 2, trials = 2, evaluator = 'classification', fractions = [[2, 2], [1, 2]], optional } = {}) {
  const capabilities = [{ id: 'core', kind: 'prediction', description: 'Classify supplied observations.',
    required: true, criterionIds: ['R1'], evaluationIds: ['core-eval'] }];
  const evaluation = { id: 'core-eval', capabilityId: 'core', description: 'Independent reference observations.',
    dataset: { name: 'score-evidence-fixtures', version: '1', provenance: 'synthetic' },
    evaluator, threshold: evaluator === 'classification' ? 0.5 : 1, baseline: 0, trials,
    cases: fractions.map(([correct, count], i) => ({ id: `case-${i}`, input: { i, correct, count }, expected: Array(count).fill(true) })) };
  const evaluations = [evaluation];
  if (optional) {
    capabilities.push({ id: 'optional', kind: 'prediction', description: 'Provide an optional observation.',
      required: false, criterionIds: ['R2'], evaluationIds: optional === 'evaluated' ? ['optional-eval'] : [] });
    if (optional === 'evaluated') evaluations.push({ ...structuredClone(evaluation), id: 'optional-eval', capabilityId: 'optional',
      trials: 1, cases: [{ id: 'optional-case', input: { i: 5, correct: 1, count: 1 }, expected: [true] }] });
  }
  const solution = { schemaVersion: 1, objective: 'Produce independently evaluated observations.', capabilities,
    runtime: { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } };
  const runtime = { provenance: { profile: 'cli', filesHash: 'score-evidence-files', runtime: 'node', environmentNames: [] },
    invoke: async input => Array.from({ length: input.count }, (_, i) => i < input.correct),
    redactMessage: value => value, redactOutput: value => value };
  const solutionEvaluation = await runSolutionEvaluation(runtime, solution, { schemaVersion: 1, evaluations });
  assert.equal(solutionEvaluation.status, 'passed', 'The fixture must be produced by a passing host evaluation.');
  return roundtrip({ time: '2026-11-05T10:00:00Z', command: 'node --test app.test.mjs',
    exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0, durationMs: 1, output: '', sourceHash: 'fixture-source',
    quality: { schemaVersion: version, contractHash: 'frozen-contract', status: 'passed', requirementsMet: true,
      errors: [], journeys: [], expectedJourneys: 0,
      criteria: [{ criterionId: 'R1', status: 'passed', capabilityIds: ['core'] },
        ...(optional ? [{ criterionId: 'R2', status: 'unverified', capabilityIds: [] }] : [])],
      capabilities: capabilities.map(capability => ({ ...capability,
        status: solutionEvaluation.capabilities.find(result => result.id === capability.id).status })),
      package: { status: 'passed', cleanCopy: true, profile: 'cli', filesHash: runtime.provenance.filesHash },
      solutionEvaluation, ...(version === 4 ? { experiment } : {}) } });
}

for (const version of [2, 3, 4]) test(`saved quality version ${version} preserves genuine fractional and deterministic evidence`, async () => {
  for (const options of [{}, { fractions: [[1, 1], [0, 1]] }, { evaluator: 'exact', fractions: [[1, 1], [2, 2]] }]) {
    const report = await passingReport({ version, ...options });
    assert.equal(reportPassed(report, version), true);
    assert.equal(reportPassed(report, true), true);
    if (options.evaluator !== 'exact') {
      assert.ok(report.quality.solutionEvaluation.evaluations[0].cases.some(entry => !entry.passed),
        'Valid classification misses remain compatible with fractional thresholds.');
    }
  }
});

const invalidResults = [
  ['an aggregate disconnected from zero case scores', result => {
    result.cases.forEach(entry => Object.assign(entry, { score: 0, passed: false }));
  }],
  ['an aggregate disconnected from perfect case scores', result => {
    result.cases.forEach(entry => Object.assign(entry, { score: 1, passed: true }));
  }],
  ['an aggregate changed by one representable step', result => { result.actual += Number.EPSILON / 2; }],
  ['a negative case score', result => { result.cases[1].score = -0.5; }],
  ['a case score above one', result => { result.cases[1].score = 2; }],
  ['a string case score', result => { result.cases[1].score = '0.5'; }],
  ['a nonfinite case score serialized as null', result => { result.cases[1].score = NaN; }],
  ['an infinite case score serialized as null', result => { result.cases[1].score = Infinity; }],
  ['a negative threshold', result => { result.threshold = -1; }],
  ['a zero threshold', result => { result.threshold = 0; }],
  ['an aggregate and threshold above one', result => { result.actual = 2; result.threshold = 2; }],
  ['a string threshold', result => { result.threshold = '0.5'; }],
  ['a nonfinite aggregate serialized as null', result => { result.actual = Infinity; }],
  ['a negative baseline', result => { result.baseline = -1; }],
  ['a baseline above one', result => { result.baseline = 2; }],
  ['a null baseline', result => { result.baseline = null; }],
  ['a nonfinite baseline serialized as null', result => { result.baseline = NaN; }],
  ['a string baseline', result => { result.baseline = '0'; }],
  ['a threshold below its declared baseline', result => { result.threshold = 0.5; result.baseline = 0.7; }],
  ['a perfect-score case claiming failure', result => { result.cases[0].passed = false; }],
  ['a fractional-score case claiming success', result => { result.cases[1].passed = true; }],
  ['a nonboolean passing flag', result => { result.cases[0].passed = 'true'; }],
  ['an unsupported evaluator', result => { result.evaluator = 'custom-grader'; }],
  ['a failed evaluation underneath a passing report', result => { result.status = 'failed'; }],
  ['duplicate case and trial evidence', result => { result.cases[2] = structuredClone(result.cases[0]); }],
  ['a zero trial number', result => { result.cases[0].trial = 0; }],
  ['an out-of-range trial number', result => { result.cases[0].trial = result.trials + 1; }],
  ['a fractional trial number', result => { result.cases[0].trial = 1.5; }],
  ['a string trial number', result => { result.cases[0].trial = '1'; }],
  ['a missing case from one trial despite enough total rows', result => {
    result.cases[2].id = 'case-2';
  }],
  ['a missing case id', result => { delete result.cases[0].id; }],
  ['an empty case id', result => { result.cases[0].id = ''; }],
  ['a null case row', result => { result.cases[0] = null; }],
  ['a null cases collection', result => { result.cases = null; }],
  ['no cases', result => { result.cases = []; }]
];

for (const [name, mutate] of invalidResults) test(`saved capability evidence rejects ${name}`, async () => {
  for (const version of [2, 3, 4]) {
    const report = await passingReport({ version });
    mutate(report.quality.solutionEvaluation.evaluations[0]);
    assert.equal(reportPassed(roundtrip(report), version), false, `Version ${version}: ${name}`);
  }
});

test('saved required evidence cannot count repeats of one case as independent cases', async () => {
  const report = await passingReport({ trials: 4 });
  const result = report.quality.solutionEvaluation.evaluations[0];
  result.cases = result.cases.filter(entry => entry.id === 'case-0');
  result.actual = 1;
  assert.equal(reportPassed(report, 2), false);
});

test('saved complete trial evidence is independent of row order', async () => {
  const report = await passingReport({ trials: 3 });
  report.quality.solutionEvaluation.evaluations[0].cases.reverse();
  assert.equal(reportPassed(roundtrip(report), 2), true);
});

test('saved repeated fractional means retain the host rounding and strict thresholds', async () => {
  const report = await passingReport({ trials: 3, fractions: [[6, 10], [7, 10], [8, 10]] });
  const result = report.quality.solutionEvaluation.evaluations[0];
  assert.equal(result.actual, 0.7);
  result.threshold = 0.7; result.baseline = 0.7;
  assert.equal(reportPassed(roundtrip(report), 2), true);
  result.cases.reverse();
  assert.equal(reportPassed(roundtrip(report), 2), true);
  result.threshold = 0.7 + Number.EPSILON / 2;
  assert.equal(reportPassed(roundtrip(report), 2), false, 'Threshold comparisons must not gain a rounding tolerance.');
});

test('saved evidence accepts baseline endpoints and an omitted baseline', async () => {
  for (const baseline of [undefined, 0, 1]) {
    const report = await passingReport({ evaluator: 'exact', fractions: [[1, 1], [2, 2]] });
    report.quality.solutionEvaluation.evaluations[0].baseline = baseline;
    assert.equal(reportPassed(roundtrip(report), 2), true);
  }
});

test('unused optional capabilities may retain no evaluation or one complete evaluated case', async () => {
  for (const optional of ['unevaluated', 'evaluated']) {
    const report = await passingReport({ optional });
    assert.equal(reportPassed(report, 2), true, optional);
  }
});

test('unused optional evaluations cannot hide malformed or failed recorded results', async () => {
  for (const mutate of [
    result => { result.actual = 0.75; },
    result => { result.status = 'failed'; },
    result => { result.cases[0].score = null; },
    result => { result.cases.push(structuredClone(result.cases[0])); }
  ]) {
    const report = await passingReport({ optional: 'evaluated' });
    mutate(report.quality.solutionEvaluation.evaluations.find(result => result.capabilityId === 'optional'));
    assert.equal(reportPassed(roundtrip(report), 2), false);
  }
});

test('restored inconsistent scores block review and executable approval for unchanged source', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-score-evidence-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const workspace = path.join(directory, 'workspace');
  await fs.mkdir(workspace);
  await fs.writeFile(path.join(workspace, 'index.html'), '<h1>Saved application</h1>');
  const report = await passingReport();
  report.sourceHash = await sourceHash(workspace);
  const project = { ...newProject({ title: 'Scored observations', description: 'Classify observations with independent evidence.', criteria: ['Classify observations correctly.'] }),
    workspace, qualityVersion: 2, status: 'review', report };
  assert.equal(getJourneyState(project).current, 'review');
  const result = report.quality.solutionEvaluation.evaluations[0];
  result.cases.forEach(entry => Object.assign(entry, { score: 0, passed: false }));
  const store = new Store(path.join(directory, 'store'));
  await store.init(); store.state.projects = [project]; await store.save();
  const restored = new Store(store.root); await restored.init();
  const saved = restored.project(project.id);
  assert.equal(saved.report.quality.solutionEvaluation.evaluations[0].actual, 0.75);
  assert.equal(await sourceHash(workspace), saved.report.sourceHash);
  const journey = getJourneyState(saved);
  assert.equal(journey.current, 'build');
  assert.match(journey.message, /Verification needs attention/);
  saved.status = 'approved'; saved.approvedAt = '2026-11-05T10:01:00Z';
  await assert.rejects(assertExecutableSource(saved), /Passing required capability, runtime and application checks/);
});
