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
function evaluateWithRuntime(invoke, item) {
  const runtime = { provenance: { profile: 'cli', filesHash: 'known', runtime: 'node', environmentNames: [] },
    invoke, redactOutput: output => output, redactMessage: message => message };
  return runSolutionEvaluation(runtime, solution, { schemaVersion: 1, evaluations: [item] });
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
  const report = await evaluate(t, 'if(input===2)console.log(4);else process.exit(1);', evaluation({ evaluator: 'classification', threshold: 0.5 }));
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

test('exact mismatches locate string and type defects without revealing inputs or expected values', () => {
  const input = { confidential: 'private-input-must-not-appear' }, expectedSecret = 'frozen-answer-must-not-appear';
  const cases = [
    [{ status: 'resolved' }, { status: expectedSecret }, '$.status: value mismatch'],
    [{ errors: ['title'] }, { errors: [expectedSecret] }, '$.errors[0]: value mismatch'],
    [{ result: null }, { result: { status: expectedSecret } }, '$.result: type mismatch'],
    [{ result: '3' }, { result: 3 }, '$.result: type mismatch'],
    [true, false, '$: value mismatch']
  ];
  for (const [actual, expected, diagnostic] of cases) {
    const result = scoreSolutionOutput({ evaluator: 'exact' }, input, actual, expected);
    assert.equal(result.score, 0);
    assert.ok(result.detail.includes(diagnostic), result.detail);
    assert.equal(result.detail.includes(expectedSecret), false);
    assert.equal(result.detail.includes(input.confidential), false);
    assert.equal(result.detail.includes('resolved'), false, 'The detail should not duplicate actual output values either');
  }
});

test('object diagnostics distinguish missing and unexpected keys and ignore key ordering', () => {
  const score = (actual, expected) => scoreSolutionOutput({ evaluator: 'exact' }, null, actual, expected);
  assert.equal(score({ beta: 2, alpha: { second: 2, first: 1 } }, { alpha: { first: 1, second: 2 }, beta: 2 }).score, 1);
  assert.match(score({ task: {} }, { task: { status: 'secret answer' } }).detail, /\$\.task\.status: missing key/);
  assert.match(score({ task: { status: 'ready', extra: 'private actual' } }, { task: { status: 'ready' } }).detail, /\$\.task\.extra: unexpected key/);
  assert.match(score({ task: { state: 'ready' } }, { task: { status: 'ready' } }).detail, /\$\.task\.status: missing key/);
  const first = score({ beta: 4, alpha: 3 }, { beta: 2, alpha: 1 });
  const reordered = score({ alpha: 3, beta: 4 }, { alpha: 1, beta: 2 });
  assert.equal(first.detail, reordered.detail);
  assert.match(first.detail, /\$\.alpha: value mismatch/);
});

test('array diagnostics identify length defects and the first differing nested element', () => {
  const score = (actual, expected) => scoreSolutionOutput({ evaluator: 'exact' }, null, actual, expected);
  assert.match(score({ tasks: [1] }, { tasks: [1, 2] }).detail, /\$\.tasks: array length mismatch/);
  assert.match(score({ tasks: [{ id: 'same' }, { id: 'actual' }] }, { tasks: [{ id: 'same' }, { id: 'expected' }] }).detail, /\$\.tasks\[1\]\.id: value mismatch/);
  assert.match(score({ tasks: [1, '2'] }, { tasks: [1, 2] }).detail, /\$\.tasks\[1\]: type mismatch/);
  assert.match(score([1, 2], [3, 1]).detail, /\$\[0\]: value mismatch/);
  // Right values in another order get their own message, and it never reveals an answer.
  const reordered = score({ ids: ['D3:OP2', 'D5:OP1'] }, { ids: ['D5:OP1', 'D3:OP2'] });
  assert.equal(reordered.score, 0);
  assert.match(reordered.detail, /\$\.ids: array order differs/);
  assert.match(score({ ids: ['a', 'a', 'b'] }, { ids: ['a', 'b', 'b'] }).detail, /value mismatch/);
});

test('numeric diagnostics separate nested tolerance failures from structural and text failures', () => {
  const score = (actual, expected) => scoreSolutionOutput({ evaluator: 'numeric', tolerance: 0.01 }, null, actual, expected);
  const expected = { results: [{ total: 2 }, { total: 3 }], unit: 'm' };
  assert.equal(score({ results: [{ total: 2.005 }, { total: 3 }], unit: 'm' }, expected).score, 1);
  const outside = score({ results: [{ total: 2.005 }, { total: 3.02 }], unit: 'm' }, expected);
  assert.equal(outside.score, 0);
  assert.match(outside.detail, /\$\.results\[1\]\.total: numeric difference exceeds tolerance/);
  assert.match(score({ ...expected, unit: 'km' }, expected).detail, /\$\.unit: value mismatch/);
  assert.match(score({ results: [{ total: 2 }, { total: '3' }], unit: 'm' }, expected).detail, /\$\.results\[1\]\.total: type mismatch/);
  assert.equal(score({ result: 1 }, { result: 987654321 }).detail.includes('987654321'), false);
});

test('diagnostic paths omit unsafe or long property names and remain bounded at depth and length limits', () => {
  const score = (actual, expected) => scoreSolutionOutput({ evaluator: 'exact' }, null, actual, expected);
  for (const key of ['control\nname', 'quote"name', 'back\\slash', 'unicode\u202ename', 'secret'.repeat(20_000)]) {
    const result = score({ [key]: 'actual' }, { [key]: 'hidden answer' });
    assert.equal(result.score, 0);
    assert.match(result.detail, /\$\[property name omitted\]: value mismatch/);
    assert.equal(result.detail.includes(key), false);
    assert.equal(result.detail.includes(JSON.stringify(key)), false);
    assert.ok(result.detail.length < 200);
    assert.equal(/[\r\n\u202e]/.test(result.detail), false);
  }
  for (const key of ['nested', 'property_name_'.repeat(4)]) {
    let actual = 'actual', expected = 'hidden answer';
    for (let i = 0; i < 30; i++) { actual = { [key]: actual }; expected = { [key]: expected }; }
    const result = score(actual, expected);
    assert.equal(result.score, 0);
    assert.match(result.detail, /nested value mismatch \(path limit reached\)/);
    assert.ok(result.detail.length < 550);
    assert.equal(result.detail.includes('hidden answer'), false);
  }
});

test('mismatch property paths receive runtime credential redaction before evidence retention', async t => {
  const secret = 'FLEET_SECRET_IDENTIFIER_FOR_DIAGNOSTIC';
  process.env.FLEET_DIAGNOSTIC_SECRET = secret; t.after(() => delete process.env.FLEET_DIAGNOSTIC_SECRET);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-diagnostic-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'engine.mjs'), 'console.log(JSON.stringify({[process.env.FLEET_DIAGNOSTIC_SECRET]:"actual"}));');
  const runtime = await prepareSolutionRuntime(root, { ...manifest, requiredEnv: ['FLEET_DIAGNOSTIC_SECRET'] }, process.execPath);
  t.after(() => runtime.close());
  const item = evaluation({ trials: 1, cases: [{ id: 'mismatch', input: { value: 'private input' }, expected: { [secret]: 'private expected answer' } }] });
  const report = await runSolutionEvaluation(runtime, solution, { schemaVersion: 1, evaluations: [item] });
  assert.equal(report.status, 'failed');
  assert.match(report.evaluations[0].cases[0].detail, /\$\.\[redacted\]: value mismatch/);
  assert.deepEqual(report.evaluations[0].cases[0].output, { '[redacted]': 'actual' });
  for (const omitted of [secret, 'private input', 'private expected answer']) assert.equal(JSON.stringify(report).includes(omitted), false);
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

function invalidRetrievalFixtures() {
  const document = { id: 'a', text: 'Known fact' };
  return [
    { name: 'missing documents', input: { query: 'Known facts' }, expected: { ids: ['a'] } },
    { name: 'non-array documents', input: { documents: {} }, expected: { ids: ['a'] } },
    { name: 'non-object document', input: { documents: [null] }, expected: { ids: ['a'] } },
    { name: 'non-string document ID', input: { documents: [{ id: 1, text: 'Known fact' }] }, expected: { ids: ['a'] } },
    { name: 'missing document text', input: { documents: [{ id: 'a' }] }, expected: { ids: ['a'] } },
    { name: 'non-string document text', input: { documents: [{ id: 'a', text: 7 }] }, expected: { ids: ['a'] } },
    { name: 'duplicate document IDs', input: { documents: [document, { ...document, text: 'Conflicting fact' }] }, expected: { ids: ['a'] } },
    { name: 'absent answer-key reference', input: { documents: [document] }, expected: { ids: ['missing'] } },
    { name: 'excluded answer-key reference', input: { documents: [{ ...document, approved: false }] }, expected: { ids: ['a'] } }
  ];
}

test('retrieval scoring remains fatal for invalid fixtures even when planning validation is bypassed', () => {
  for (const fixture of invalidRetrievalFixtures()) {
    const result = scoreSolutionOutput({ evaluator: 'retrieval' }, fixture.input, { results: [] }, fixture.expected);
    assert.equal(result.score, 0, fixture.name);
    assert.equal(result.fatal, true, fixture.name);
    assert.match(result.detail, /document|source|fixture/i, fixture.name);
  }
});

test('invalid retrieval fixtures cannot hide behind a passing fractional aggregate', async () => {
  const valid = { id: 'valid', input: { documents: [{ id: 'a', text: 'Known fact' }] }, expected: { ids: ['a'] } };
  const output = { results: [{ id: 'a', excerpt: { start: 0, end: 10, text: 'Known fact' } }] };
  for (const fixture of invalidRetrievalFixtures()) {
    let calls = 0;
    const item = evaluation({ evaluator: 'retrieval', threshold: 0.5, trials: 1,
      cases: [valid, { id: 'invalid', input: fixture.input, expected: fixture.expected }] });
    const report = await evaluateWithRuntime(async () => ++calls === 1 ? structuredClone(output) : { results: [] }, item);
    assert.equal(report.evaluations[0].actual, 0.5, fixture.name);
    assert.deepEqual(report.evaluations[0].cases.map(entry => entry.passed), [true, false], fixture.name);
    assert.equal(report.evaluations[0].status, 'failed', fixture.name);
    assert.equal(report.capabilities[0].status, 'failed', fixture.name);
    assert.equal(report.status, 'failed', fixture.name);
  }
});

test('retrieval scoring still accepts implicit approval, empty sources, and empty abstention', () => {
  const options = { evaluator: 'retrieval' }, output = { results: [{ id: 'a', excerpt: { start: 0, end: 10, text: 'Known fact' } }] };
  const allowed = scoreSolutionOutput(options, { documents: [{ id: 'a', text: 'Known fact' }] }, output, { ids: ['a'] });
  assert.equal(allowed.score, 1); assert.notEqual(allowed.fatal, true);
  for (const documents of [[], [{ id: 'empty', text: '' }], [{ id: 'excluded', text: 'Excluded fact', approved: false }]]) {
    const abstention = scoreSolutionOutput(options, { documents }, { results: [] }, { ids: [] });
    assert.equal(abstention.score, 1); assert.notEqual(abstention.fatal, true);
  }
});

function deterministicFixtures() {
  const infeasible = structuredClone(scheduleInput); infeasible.people[0].maxMinutes = 30;
  return [
    { evaluator: 'exact', cases: evaluation().cases, constant: 4, correct: input => input * 2 },
    { evaluator: 'numeric', cases: evaluation().cases, constant: 4, correct: input => input * 2 },
    { evaluator: 'schedule', cases: [
      { id: 'feasible', input: scheduleInput, expected: { status: 'feasible' } },
      { id: 'infeasible', input: infeasible, expected: { status: 'infeasible' } }
    ], constant: validSchedule, correct: input => input.people[0].maxMinutes === 30 ? { status: 'infeasible', assignments: [] } : validSchedule }
  ];
}

test('deterministic evaluators reject low-threshold plans with partially correct constant answers', async () => {
  for (const fixture of deterministicFixtures()) {
    const item = evaluation({ evaluator: fixture.evaluator, cases: fixture.cases, threshold: 0.5 });
    const report = await evaluateWithRuntime(async () => structuredClone(fixture.constant), item);
    const result = report.evaluations[0];
    assert.equal(result.actual, 0.5, fixture.evaluator);
    assert.deepEqual(result.cases.map(entry => entry.score), [1, 0, 1, 0], fixture.evaluator);
    assert.equal(result.threshold, 0.5, 'The frozen threshold must not be silently rewritten.');
    assert.equal(result.status, 'failed', fixture.evaluator);
    assert.equal(report.capabilities[0].status, 'failed', fixture.evaluator);
    assert.equal(report.status, 'failed', fixture.evaluator);
    const diagnostic = report.errors.join('\n');
    assert.match(diagnostic, /core-eval/);
    assert.match(diagnostic, new RegExp(fixture.evaluator));
    assert.match(diagnostic, /threshold.*1/i);
  }
});

test('deterministic thresholds must equal one even when every output is correct', async () => {
  for (const fixture of deterministicFixtures()) {
    const threshold = 1 - Number.EPSILON;
    const item = evaluation({ evaluator: fixture.evaluator, cases: fixture.cases, threshold });
    const report = await evaluateWithRuntime(async input => structuredClone(fixture.correct(input)), item);
    assert.equal(report.evaluations[0].actual, 1, fixture.evaluator);
    assert.ok(report.evaluations[0].cases.every(entry => entry.passed), fixture.evaluator);
    assert.equal(report.evaluations[0].threshold, threshold);
    assert.equal(report.evaluations[0].status, 'failed', fixture.evaluator);
    assert.equal(report.capabilities[0].status, 'failed', fixture.evaluator);
    assert.equal(report.status, 'failed', fixture.evaluator);
    assert.match(report.errors.join('\n'), /threshold.*1/i);
  }
});

test('a failed repeated trial prevents deterministic evaluation and capability success', async () => {
  for (const fixture of deterministicFixtures()) {
    let invocations = 0;
    const item = evaluation({ evaluator: fixture.evaluator, cases: fixture.cases, threshold: 1, trials: 2 });
    const report = await evaluateWithRuntime(async input => structuredClone(++invocations === 4 ? fixture.constant : fixture.correct(input)), item);
    const result = report.evaluations[0];
    assert.equal(result.actual, 0.75, fixture.evaluator);
    assert.deepEqual(result.cases.map(entry => [entry.trial, entry.passed]), [[1, true], [1, true], [2, true], [2, false]], fixture.evaluator);
    assert.equal(result.status, 'failed', fixture.evaluator);
    assert.equal(report.capabilities[0].status, 'failed', fixture.evaluator);
    assert.equal(report.status, 'failed', fixture.evaluator);
    assert.deepEqual(report.errors, []);
  }
});

function statisticalFixtures() {
  const documents = [{ id: 'a', text: 'Known fact' }, { id: 'b', text: 'Other fact' }];
  const results = documents.map(document => ({ id: document.id, excerpt: { start: 0, end: document.text.length, text: document.text } }));
  return [
    { evaluator: 'classification', cases: [
      { id: 'first', input: [1, -1], expected: ['yes', 'no'] },
      { id: 'second', input: [-1, 1], expected: ['no', 'yes'] }
    ], partial: ['yes', 'yes'], score: 0.5, threshold: 0.5, correct: input => input.map(value => value > 0 ? 'yes' : 'no'), invalid: ['yes'] },
    { evaluator: 'retrieval', cases: [
      { id: 'first', input: { query: 'facts', documents }, expected: { ids: ['a', 'b'] } },
      { id: 'second', input: { query: 'known facts', documents }, expected: { ids: ['a', 'b'] } }
    ], partial: { results: [results[0]] }, score: 2 / 3, threshold: 0.6, correct: () => ({ results }),
    invalid: { results: [{ ...results[0], excerpt: { ...results[0].excerpt, text: 'Fabricated' } }] } }
  ];
}

test('classification and retrieval can pass valid fractional scores without perfect cases', async () => {
  for (const fixture of statisticalFixtures()) {
    const item = evaluation({ evaluator: fixture.evaluator, cases: fixture.cases, threshold: fixture.threshold, baseline: 0.5, trials: 1 });
    const report = await evaluateWithRuntime(async () => structuredClone(fixture.partial), item);
    assert.equal(report.evaluations[0].actual, fixture.score, fixture.evaluator);
    assert.ok(report.evaluations[0].cases.every(entry => !entry.passed), fixture.evaluator);
    assert.equal(report.evaluations[0].status, 'passed', fixture.evaluator);
    assert.equal(report.capabilities[0].status, 'passed', fixture.evaluator);
    assert.equal(report.status, 'passed', fixture.evaluator);
    assert.deepEqual(report.errors, []);
  }
});

test('fractional thresholds cannot hide invalid statistical outputs or invocation failures', async () => {
  for (const fixture of statisticalFixtures()) for (const failure of ['invalid-output', 'invocation-error']) {
    let invocations = 0;
    const item = evaluation({ evaluator: fixture.evaluator, cases: fixture.cases, threshold: 0.5, trials: 1 });
    const report = await evaluateWithRuntime(async input => {
      if (++invocations === 1) return structuredClone(fixture.correct(input));
      if (failure === 'invocation-error') throw new Error('Fixture invocation failed.');
      return structuredClone(fixture.invalid);
    }, item);
    assert.equal(report.evaluations[0].actual, 0.5, fixture.evaluator);
    assert.equal(report.evaluations[0].status, 'failed', `${fixture.evaluator}: ${failure}`);
    assert.equal(report.capabilities[0].status, 'failed', fixture.evaluator);
    assert.equal(report.status, 'failed', fixture.evaluator);
    if (failure === 'invocation-error') assert.match(report.evaluations[0].cases[1].detail, /Fixture invocation failed/);
    else assert.match(report.evaluations[0].cases[1].detail, fixture.evaluator === 'classification' ? /label shape/ : /source span/);
  }
});
