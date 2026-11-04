import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { runSolutionEvaluation, scoreSolutionOutput, solutionEvidenceLimits } from '../dist-electron/electron/solution-evaluation.js';

const manifest = { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
const solution = { schemaVersion: 1, objective: 'Calculate answers', runtime: manifest, capabilities: [{ id: 'core', kind: 'algorithm', description: 'Actual engine', criterionIds: ['R1'], required: true, evaluationIds: ['core-eval'] }] };
const evaluation = (overrides = {}) => ({ id: 'core-eval', capabilityId: 'core', description: 'Known cases', dataset: { name: 'independent-fixtures', version: '1', provenance: 'reviewed' }, cases: [{ id: 'first', input: 2, expected: 4 }, { id: 'second', input: 3, expected: 6 }], evaluator: 'exact', threshold: 1, trials: 2, ...overrides });
async function evaluate(t, script, item = evaluation(), contract = solution) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-eval-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'engine.mjs'), `let text='';for await(const c of process.stdin)text+=c;const input=JSON.parse(text);${script}`);
  const runtime = await prepareSolutionRuntime(root, manifest, process.execPath);
  t.after(() => runtime.close());
  return runSolutionEvaluation(runtime, contract, { schemaVersion: 1, evaluations: [item] });
}

test('host evaluates the real engine for all cases and repeated trials with dataset provenance', async t => {
  const report = await evaluate(t, 'console.log(input*2);');
  assert.equal(report.status, 'passed');
  assert.equal(report.evaluations[0].cases.length, 4);
  assert.equal(report.evaluations[0].actual, 1);
  assert.equal(report.evaluations[0].dataset.provenance, 'reviewed');
  assert.deepEqual(report.capabilities, [{ id: 'core', required: true, status: 'passed' }]);
  assert.match(report.runtime.filesHash, /^[a-f0-9]{64}$/);
});

test('a hardcoded answer passes the first example but is rejected by the independent second case', async t => {
  const report = await evaluate(t, 'console.log(4);');
  assert.equal(report.status, 'failed');
  assert.equal(report.evaluations[0].actual, 0.5);
  assert.equal(report.evaluations[0].cases.filter(item => !item.passed).length, 2);
});

test('engine failures cannot be hidden by an aggregate threshold', async t => {
  const report = await evaluate(t, 'if(input===2)console.log(4);else process.exit(1);', evaluation({ threshold: 0.5 }));
  assert.equal(report.evaluations[0].actual, 0.5);
  assert.equal(report.status, 'failed');
  assert.match(report.evaluations[0].cases[1].detail, /exited/);
});

test('an undeclared evaluation cannot fulfill a required capability', async t => {
  const contract = structuredClone(solution); contract.capabilities[0].evaluationIds.push('missing-evaluation');
  const report = await evaluate(t, 'console.log(input*2);', evaluation(), contract);
  assert.equal(report.evaluations[0].status, 'passed');
  assert.equal(report.capabilities[0].status, 'failed');
  assert.equal(report.status, 'failed');
});

test('raw outputs are scored before declared credentials are redacted from evidence', async t => {
  const secret = 'fixture-secret-never-in-evidence';
  process.env.FLEET_EVAL_SECRET = secret; t.after(() => delete process.env.FLEET_EVAL_SECRET);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-redact-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'engine.mjs'), 'console.log(JSON.stringify({value:process.env.FLEET_EVAL_SECRET,nested:[process.env.FLEET_EVAL_SECRET]}));');
  const runtime = await prepareSolutionRuntime(root, { ...manifest, requiredEnv: ['FLEET_EVAL_SECRET'] }, process.execPath); t.after(() => runtime.close());
  const item = evaluation({ trials: 1, cases: [{ id: 'echo', input: null, expected: { value: secret, nested: [secret] } }] });
  const report = await runSolutionEvaluation(runtime, solution, { schemaVersion: 1, evaluations: [item] });
  assert.equal(report.status, 'passed');
  assert.equal(JSON.stringify(report).includes(secret), false);
  assert.deepEqual(report.evaluations[0].cases[0].output, { value: '[redacted]', nested: ['[redacted]'] });
});

test('large case output is scored fully and explicitly omitted from retained evidence', async t => {
  const value = 'x'.repeat(solutionEvidenceLimits.caseOutputBytes + 1024);
  const item = evaluation({ trials: 1, cases: [{ id: 'large', input: value.length, expected: value }] });
  const report = await evaluate(t, 'console.log(JSON.stringify("x".repeat(input)));', item);
  assert.equal(report.status, 'passed');
  const result = report.evaluations[0].cases[0];
  assert.equal(result.score, 1); assert.equal(Object.hasOwn(result, 'output'), false);
  assert.match(result.detail, /per-case retention limit.*scoring used the full output/);
  assert.ok(Buffer.byteLength(JSON.stringify(report)) < 4000);
});

test('repeated trials cannot accumulate unbounded output evidence', async () => {
  const value = 'x'.repeat(60_000);
  const runtime = { provenance: { profile: 'cli', filesHash: 'known', runtime: 'node', environmentNames: [] },
    invoke: async () => value, redactOutput: output => output, redactMessage: message => message };
  const item = evaluation({ trials: 10, cases: Array.from({ length: 15 }, (_, i) => ({ id: 'case-' + i, input: i, expected: value })) });
  const report = await runSolutionEvaluation(runtime, solution, { schemaVersion: 1, evaluations: [item] });
  assert.equal(report.status, 'passed');
  assert.equal(report.evaluations[0].cases.length, 150);
  const cases = report.evaluations[0].cases, retained = cases.filter(entry => Object.hasOwn(entry, 'output'));
  assert.ok(retained.length > 0 && retained.length < cases.length);
  assert.ok(retained.reduce((total, entry) => total + Buffer.byteLength(JSON.stringify(entry.output)), 0) <= solutionEvidenceLimits.totalOutputBytes);
  assert.ok(cases.filter(entry => !Object.hasOwn(entry, 'output')).every(entry => /aggregate output retention budget.*scoring used the full output/.test(entry.detail)));
  assert.ok(Buffer.byteLength(JSON.stringify(report)) < solutionEvidenceLimits.totalOutputBytes + 100_000);
});

test('numeric checker requires the expected structure and tolerates only bounded numerical error', () => {
  const options = { evaluator: 'numeric', tolerance: 0.01 };
  assert.equal(scoreSolutionOutput(options, null, { answer: [2.005], unit: 'm' }, { answer: [2], unit: 'm' }).score, 1);
  assert.equal(scoreSolutionOutput(options, null, { answer: [2.02], unit: 'm' }, { answer: [2], unit: 'm' }).score, 0);
  assert.equal(scoreSolutionOutput(options, null, { answer: [2], unit: 'km' }, { answer: [2], unit: 'm' }).score, 0);
  assert.equal(scoreSolutionOutput(options, null, { answer: [2], extra: true }, { answer: [2] }).score, 0);
});

test('classification measures label accuracy against the frozen labels and baseline', async t => {
  const cases = [{ id: 'a', input: [1, -1], expected: ['yes', 'no'] }, { id: 'b', input: [-1, 2], expected: ['no', 'yes'] }];
  const report = await evaluate(t, 'console.log(JSON.stringify(input.map(value=>value>0?"yes":"no")));', evaluation({ evaluator: 'classification', cases, baseline: 0.5 }));
  assert.equal(report.status, 'passed'); assert.equal(report.evaluations[0].metric, 'mean_label_accuracy');
  assert.equal(scoreSolutionOutput({ evaluator: 'classification' }, null, ['yes', 'yes'], ['yes', 'no']).score, 0.5);
  assert.equal(scoreSolutionOutput({ evaluator: 'classification' }, null, ['yes'], ['yes', 'no']).fatal, true);
});

const scheduleInput = {
  windows: [{ start: 0, end: 180 }], people: [{ id: 'p', qualifications: ['q'], windows: [{ start: 0, end: 180 }], maxMinutes: 100, restMinutes: 10 }],
  requests: [
    { id: 'a', starts: [0], duration: 30, people: ['p'], resources: ['room'], qualifications: ['q'] },
    { id: 'b', starts: [30, 40], duration: 30, people: ['p'], resources: ['room'], qualifications: ['q'] }
  ]
};
const validSchedule = { status: 'feasible', assignments: [{ id: 'a', start: 0, end: 30, people: ['p'], resources: ['room'] }, { id: 'b', start: 40, end: 70, people: ['p'], resources: ['room'] }] };
test('schedule host checker detects dropped work, rest violations, changed resources and duty budget', () => {
  const score = (input, output) => scoreSolutionOutput({ evaluator: 'schedule' }, input, output, { status: 'feasible' });
  assert.equal(score(scheduleInput, validSchedule).score, 1);
  const dropped = structuredClone(validSchedule); dropped.assignments.pop();
  assert.equal(score(scheduleInput, dropped).fatal, true);
  const rest = structuredClone(validSchedule); rest.assignments[1].start = 30; rest.assignments[1].end = 60;
  assert.match(score(scheduleInput, rest).detail, /minimum rest/);
  const resources = structuredClone(validSchedule); resources.assignments[0].resources = [];
  assert.match(score(scheduleInput, resources).detail, /resource allocation/);
  const budget = structuredClone(scheduleInput); budget.people[0].maxMinutes = 50;
  assert.match(score(budget, validSchedule).detail, /duty budget/);
});

test('schedule status distinguishes infeasible answer keys from timeout and does not claim a proof', () => {
  const options = { evaluator: 'schedule' }, expected = { status: 'infeasible' };
  assert.equal(scoreSolutionOutput(options, scheduleInput, { status: 'budget_exhausted' }, expected).score, 0);
  const result = scoreSolutionOutput(options, scheduleInput, { status: 'infeasible', assignments: [] }, expected);
  assert.equal(result.score, 1); assert.match(result.detail, /not a general infeasibility proof/);
});

test('retrieval scores relevant ids and rejects fabricated citations or excluded sources', () => {
  const input = { documents: [{ id: 'a', text: 'Known fact', source: 'source-a', approved: true }, { id: 'b', text: 'Other fact', source: 'source-b', approved: false }] };
  const result = { id: 'a', source: 'source-a', excerpt: { start: 0, end: 10, text: 'Known fact' } };
  const options = { evaluator: 'retrieval' }, expected = { ids: ['a'] };
  assert.equal(scoreSolutionOutput(options, input, { results: [result] }, expected).score, 1);
  assert.equal(scoreSolutionOutput(options, input, { results: [] }, expected).score, 0);
  const fabricated = structuredClone(result); fabricated.excerpt.text = 'Invented';
  assert.match(scoreSolutionOutput(options, input, { results: [fabricated] }, expected).detail, /source span/);
  const excluded = { id: 'b', source: 'source-b', excerpt: { start: 0, end: 10, text: 'Other fact' } };
  assert.match(scoreSolutionOutput(options, input, { results: [excluded] }, expected).detail, /excluded source/);
  assert.equal(scoreSolutionOutput(options, input, { results: [] }, { ids: [] }).score, 1);
});
