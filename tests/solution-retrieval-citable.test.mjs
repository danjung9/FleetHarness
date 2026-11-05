import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { solutionFixture } from '../scripts/solution-fixture.mjs';
import { parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';
import { parseExperimentEvaluationPlan } from '../dist-electron/harness/experiment-contract.js';
import { runSolutionEvaluation, scoreSolutionOutput } from '../dist-electron/electron/solution-evaluation.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { loadQualityContract, sealEvaluationPlan } from '../dist-electron/electron/quality.js';

const solution = {
  schemaVersion: 1, objective: 'Retrieve supplied permitted evidence with exact citations.',
  runtime: { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } },
  capabilities: [{ id: 'retrieve', kind: 'retrieval', description: 'Find evidence or abstain.', criterionIds: ['R1'], required: true, evaluationIds: ['citations'] }]
};
const reference = { id: 'known', text: 'Inspect pump', source: 'manual://pump' };
const parsers = [parseEvaluationPlan, parseExperimentEvaluationPlan];
const invalidSources = [null, 0, false, true, [], ['manual://pump'], {}, { url: 'manual://pump' }];
const sourceDiagnostic = /evaluations\[0\]\.cases\[0\]\.input\.documents\[0\]\.source.*string/;
const emptyDiagnostic = /evaluations\[0\]\.cases\[0\]\.expected\.ids\[0\].*(?:empty|nonempty)/;

function fixture(document = reference, expectedIds = [document.id]) {
  return { schemaVersion: 1, evaluations: [{
    id: 'citations', capabilityId: 'retrieve', description: 'Independent source and abstention cases.',
    dataset: { name: 'citable-evidence', version: '1', provenance: 'reviewed' },
    evaluator: 'retrieval', threshold: 1, trials: 1,
    cases: [
      { id: 'known', input: { query: 'pump', documents: [structuredClone(document)] }, expected: { ids: [...expectedIds] } },
      { id: 'abstain', input: { query: 'unavailable', documents: [] }, expected: { ids: [] } }
    ]
  }] };
}
function citation(document) {
  return { id: document.id, ...(Object.hasOwn(document, 'source') ? { source: document.source } : {}),
    excerpt: { start: 0, end: document.text.length, text: document.text } };
}
function score(input, output, expected) {
  return scoreSolutionOutput({ evaluator: 'retrieval' }, input, output, expected);
}
function assertFatal(result) {
  assert.equal(result.score, 0);
  assert.equal(result.fatal, true);
}

test('retrieval and experiment planning reject supplied non-string source locators before freezing', () => {
  for (const parse of parsers) for (const source of invalidSources) {
    assert.throws(() => parse(fixture({ ...reference, source }), solution), sourceDiagnostic,
      `${parse.name} must reject locator ${JSON.stringify(source)}`);
    const abstention = fixture({ ...reference, source, approved: false }, []);
    assert.throws(() => parse(abstention, solution), sourceDiagnostic,
      'Optional source fields must be well formed even on excluded documents in an abstention case');
  }
});

test('retrieval and experiment planning reject answer IDs whose documents have no citable text', () => {
  for (const parse of parsers) for (const document of [
    { id: 'known', text: '' }, { id: 'known', text: '', approved: true, source: 'manual://empty' }
  ]) {
    assert.throws(() => parse(fixture(document), solution), emptyDiagnostic,
      'A relevant document cannot supply the required nonempty span when its text is empty');
  }
});

test('string locators, whitespace and Unicode spans remain valid beside empty irrelevant documents', () => {
  for (const locator of [{}, { source: '' }, { source: ' ' }, { source: 'manual://café/🚢' }]) {
    for (const text of [' ', '🚢 Café — pump inspection']) {
      const document = { id: 'known', text, ...locator };
      const plan = fixture(document);
      plan.evaluations[0].cases[0].input.documents.push(
        { id: 'irrelevant-empty', text: '' }, { id: 'excluded-empty', text: '', approved: false, source: '' });
      for (const parse of parsers) assert.deepEqual(parse(plan, solution), plan);
      const entry = plan.evaluations[0].cases[0];
      const result = score(entry.input, { results: [citation(document)] }, entry.expected);
      assert.equal(result.score, 1);
      assert.notEqual(result.fatal, true);
    }
  }
  const abstention = fixture({ id: 'empty', text: '', source: '' }, []);
  for (const parse of parsers) assert.deepEqual(parse(abstention, solution), abstention);
  const entry = abstention.evaluations[0].cases[0];
  assert.equal(score(entry.input, { results: [] }, entry.expected).score, 1);
});

test('direct retrieval scoring rejects malformed locators even when output reuses the same object', () => {
  for (const source of invalidSources) {
    const document = { ...reference, source };
    const output = { results: [citation(document)] };
    assert.strictEqual(output.results[0].source, source, 'Exercise the prior strict-identity loophole');
    const result = score({ documents: [document] }, output, { ids: ['known'] });
    assertFatal(result);
    assert.match(result.detail, /input\.documents\[0\]\.source.*string/);
  }
});

test('direct retrieval scoring treats empty required evidence as an invalid fixture even on abstention output', () => {
  const input = { documents: [{ id: 'known', text: '' }] };
  for (const output of [{ results: [] }, { results: [citation(input.documents[0])] }]) {
    const result = score(input, output, { ids: ['known'] });
    assertFatal(result);
    assert.match(result.detail, /expected\.ids\[0\].*(?:empty|nonempty)/);
  }
});

test('invalid retrieval fixtures cannot average into a passing fractional threshold across trials', async () => {
  const malformed = [
    { id: 'broken', text: '' },
    ...invalidSources.map(source => ({ id: 'broken', text: 'Inspect valve', source }))
  ];
  for (const document of malformed) {
    const plan = fixture();
    const evaluation = plan.evaluations[0];
    evaluation.threshold = 0.5;
    evaluation.trials = 2;
    evaluation.cases[1] = { id: 'invalid', input: { query: 'valve', documents: [document] }, expected: { ids: ['broken'] } };
    const runtime = {
      provenance: { profile: 'cli', filesHash: 'citable-fixture', runtime: 'node', environmentNames: [] },
      invoke: async input => ({ results: input.query === 'pump' ? [citation(input.documents[0])] : [] }),
      redactOutput: output => output, redactMessage: message => message
    };
    const report = await runSolutionEvaluation(runtime, solution, plan);
    assert.equal(report.evaluations[0].actual, 0.5);
    assert.equal(report.evaluations[0].threshold, 0.5);
    assert.deepEqual(report.evaluations[0].cases.map(entry => entry.passed), [true, false, true, false]);
    assert.equal(report.evaluations[0].status, 'failed');
    assert.equal(report.capabilities[0].status, 'failed');
    assert.equal(report.status, 'failed');
    assert.ok(report.evaluations[0].cases.filter(entry => !entry.passed).every(entry =>
      /input\.documents\[0\]\.source|expected\.ids\[0\]/.test(entry.detail)));
  }
});

test('host loading preserves uncitable planning output for correction and only seals corrected fixtures', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-citable-preflight-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const acceptance = [{ id: 'R1', requirement: 'Retrieve supplied permitted evidence.', method: 'automated', scenario: 'Find evidence or abstain.' }];
  const malformed = [
    { document: { id: 'known', text: '', source: 'manual://pump' }, diagnostic: emptyDiagnostic },
    { document: { ...reference, source: { url: 'manual://pump' } }, diagnostic: sourceDiagnostic }
  ];
  for (const [index, { document, diagnostic }] of malformed.entries()) {
    const workspace = path.join(root, `workspace-${index}`), hostKey = path.join(root, `host-key-${index}.json`);
    await fs.mkdir(workspace);
    const files = solutionFixture(['R1']);
    const contract = JSON.parse(files['solution-contract.json']);
    contract.objective = solution.objective;
    contract.capabilities[0].kind = 'retrieval';
    contract.capabilities[0].description = 'Find evidence with exact citations, or abstain.';
    contract.invocation = { input: 'Object with query and source documents.', output: 'Object with results containing document IDs, optional string locators and exact nonempty excerpts.',
      rules: ['Return relevant supplied documents with exact source spans; exclude approved false documents; abstain when no relevant evidence exists.'] };
    files['solution-contract.json'] = JSON.stringify(contract);
    const plan = fixture(document);
    plan.evaluations[0].id = contract.capabilities[0].evaluationIds[0];
    plan.evaluations[0].capabilityId = contract.capabilities[0].id;
    files['evaluation-plan.json'] = JSON.stringify(plan);
    for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), body);

    await assert.rejects(loadQualityContract(workspace, acceptance, true), diagnostic);
    assert.equal(await fs.readFile(path.join(workspace, 'evaluation-plan.json'), 'utf8'), files['evaluation-plan.json']);
    await assert.rejects(fs.access(hostKey), /ENOENT/);

    plan.evaluations[0].cases[0].input.documents[0] = { ...reference, text: '🚢 Inspect pump' };
    const corrected = JSON.stringify(plan);
    await fs.writeFile(path.join(workspace, 'evaluation-plan.json'), corrected);
    const loaded = await loadQualityContract(workspace, acceptance, true);
    await sealEvaluationPlan(workspace, loaded, hostKey);
    assert.equal(loaded.sealedEvaluation, true);
    assert.equal(await fs.readFile(hostKey, 'utf8'), corrected);
    await assert.rejects(fs.access(path.join(workspace, 'evaluation-plan.json')), /ENOENT/);
  }
});

test('a clean Node package passes valid string locators, Unicode citations, whitespace and abstention', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-citable-runtime-'));
  let runtime;
  try {
    await fs.writeFile(path.join(root, 'engine.mjs'), `
let body = ''; for await (const chunk of process.stdin) body += chunk;
const input = JSON.parse(body);
const results = input.documents.filter(document => document.approved !== false && document.text.includes(input.query)).map(document => {
  const start = document.text.indexOf(input.query), end = start + input.query.length;
  return { id: document.id, ...(Object.hasOwn(document, 'source') ? { source: document.source } : {}), excerpt: { start, end, text: document.text.slice(start, end) } };
});
console.log(JSON.stringify({ results }));
`);
    const plan = fixture({ id: 'known', text: 'Préface: 🚢 Café — pump inspection.', source: 'manual://café/🚢' });
    plan.evaluations[0].cases[0].input.query = '🚢 Café';
    plan.evaluations[0].cases.splice(1, 0, {
      id: 'whitespace', input: { query: ' ', documents: [{ id: 'space', text: ' ', source: '' }] }, expected: { ids: ['space'] }
    });
    plan.evaluations[0].cases[2].input.documents = [
      { id: 'irrelevant-empty', text: '' }, { id: 'excluded-empty', text: '', source: '', approved: false }
    ];
    const parsed = parseEvaluationPlan(plan, solution);
    runtime = await prepareSolutionRuntime(root, solution.runtime, process.execPath);
    assert.notEqual(runtime.root, root);
    const report = await runSolutionEvaluation(runtime, solution, parsed);
    assert.equal(report.status, 'passed');
    assert.equal(report.evaluations[0].actual, 1);
    assert.ok(report.evaluations[0].cases.every(entry => entry.passed));
    assert.deepEqual(report.evaluations[0].cases[0].output.results[0], {
      id: 'known', source: 'manual://café/🚢', excerpt: { start: 9, end: 16, text: '🚢 Café' }
    });
    assert.deepEqual(report.evaluations[0].cases[1].output, { results: [{ id: 'space', source: '', excerpt: { start: 0, end: 1, text: ' ' } }] });
    assert.deepEqual(report.evaluations[0].cases[2].output, { results: [] });
    assert.match(report.runtime.filesHash, /^[a-f0-9]{64}$/);
  } finally {
    await runtime?.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});
