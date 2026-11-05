import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';
import { runSolutionEvaluation, scoreSolutionOutput } from '../dist-electron/electron/solution-evaluation.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';

const solution = {
  schemaVersion: 1, objective: 'Retrieve supplied evidence without inventing citation locators.',
  runtime: { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } },
  capabilities: [{ id: 'retrieve', kind: 'retrieval', description: 'Find evidence or abstain.', criterionIds: ['R1'], required: true, evaluationIds: ['citations'] }]
};
const sourceDocument = { id: 'known', text: 'Inspect pump' };
const malformedLocators = [null, 0, 42, false, true, [], ['manual://pump'], {}, { url: 'manual://pump' }];

function citation(document) {
  return { id: document.id, ...(Object.hasOwn(document, 'source') ? { source: document.source } : {}),
    excerpt: { start: 0, end: document.text.length, text: document.text } };
}
function score(document, result) {
  return scoreSolutionOutput({ evaluator: 'retrieval' }, { documents: [document] }, { results: [result] }, { ids: [document.id] });
}
function assertInvalidLocator(result, message) {
  assert.equal(result.score, 0, message);
  assert.equal(result.fatal, true, message);
  assert.match(result.detail, /source locator/i);
}
function plan(cases, options = {}) {
  return parseEvaluationPlan({ schemaVersion: 1, evaluations: [{
    id: 'citations', capabilityId: 'retrieve', description: 'Independent supplied-document citation cases.',
    dataset: { name: 'citation-locators', version: '1', provenance: 'synthetic' },
    evaluator: 'retrieval', threshold: 1, trials: 1, cases, ...options
  }] }, solution);
}
function entry(id, document) {
  return { id, input: { documents: [structuredClone(document)] }, expected: { ids: [document.id] } };
}

test('retrieval rejects invented string locators when the source document has no locator', () => {
  for (const source of ['', ' ', 'https://fabricated.example/policy', 'manual://café/🚢']) {
    assertInvalidLocator(score(sourceDocument, { ...citation(sourceDocument), source }),
      `A locator-free document cannot ground the output locator ${JSON.stringify(source)}`);
  }
});

test('retrieval rejects malformed output locators for locator-free and located documents', () => {
  for (const document of [sourceDocument, { ...sourceDocument, source: 'manual://pump' }]) {
    for (const source of malformedLocators) {
      assertInvalidLocator(score(document, { ...citation(document), source }),
        `Output locator ${JSON.stringify(source)} is not a grounded string locator`);
    }
  }
});

test('direct retrieval scoring rejects an explicit undefined output locator on a locator-free document', () => {
  const output = { ...citation(sourceDocument), source: undefined };
  assert.equal(Object.hasOwn(sourceDocument, 'source'), false);
  assert.equal(Object.hasOwn(output, 'source'), true);
  assertInvalidLocator(score(sourceDocument, output), 'An own undefined locator is not an omitted locator');
});

test('direct retrieval scoring rejects explicit undefined locators even when both values match', () => {
  const document = { ...sourceDocument, source: undefined }, output = citation(document);
  assert.equal(Object.hasOwn(document, 'source'), true);
  assert.equal(Object.hasOwn(output, 'source'), true);
  assertInvalidLocator(score(document, output), 'Present locators must be strings, not matching undefined values');
});

test('direct retrieval scoring does not accept a matching locator inherited by the output', () => {
  const document = { ...sourceDocument, source: 'manual://pump' };
  const output = Object.assign(Object.create({ source: document.source }), citation(sourceDocument));
  assert.equal(output.source, document.source);
  assert.equal(Object.hasOwn(output, 'source'), false);
  assertInvalidLocator(score(document, output), 'The output JSON must own the supplied locator');
});

test('retrieval preserves omitted locators and exact empty, whitespace and Unicode locators', () => {
  for (const locator of [{}, { source: '' }, { source: ' ' }, { source: 'manual://café/🚢' }, { source: 'manual://cafe\u0301/🚢' }]) {
    const document = { id: 'known', text: '🚢 Inspect pump', ...locator };
    const result = score(document, citation(document));
    assert.equal(result.score, 1);
    assert.notEqual(result.fatal, true);
  }
});

test('retrieval rejects omitted or changed locators when a source locator was supplied', () => {
  for (const source of ['', ' ', 'manual://pump', 'manual://café/🚢']) {
    const document = { ...sourceDocument, source };
    const omitted = citation(document);
    delete omitted.source;
    assertInvalidLocator(score(document, omitted), 'A supplied locator must be retained, including the empty string');
    assertInvalidLocator(score(document, { ...citation(document), source: source + ' ' }), 'Locators must not be trimmed');
  }
  const document = { ...sourceDocument, source: 'manual://café/🚢' };
  assertInvalidLocator(score(document, { ...citation(document), source: 'manual://cafe\u0301/🚢' }),
    'Unicode normalization must not change a locator');
});

test('retrieval rejects borrowing another document locator even when citation text matches', () => {
  const documents = [sourceDocument, { id: 'other', text: sourceDocument.text, source: 'manual://other' }];
  const result = scoreSolutionOutput({ evaluator: 'retrieval' }, { documents }, {
    results: [{ ...citation(sourceDocument), source: documents[1].source }]
  }, { ids: ['known'] });
  assertInvalidLocator(result, 'A locator must belong to the returned document ID');
});

test('invented and malformed output locators cannot average into a passing fractional retrieval score', async () => {
  const accepted = { id: 'accepted', text: 'Inspect pump', source: 'manual://pump' };
  const unlocated = { id: 'unlocated', text: 'Inspect valve' };
  const evaluationPlan = plan([entry('valid', accepted), entry('unlocated', unlocated)], { threshold: 0.5, trials: 2 });
  for (const source of ['https://fabricated.example/valve', { url: 'https://fabricated.example/valve' }]) {
    const runtime = {
      provenance: { profile: 'cli', filesHash: 'a'.repeat(64), runtime: 'node', environmentNames: [] },
      invoke: async input => ({ results: input.documents.map(document => ({ ...citation(document),
        ...(document.id === 'unlocated' ? { source } : {}) })) }),
      redactOutput: output => output, redactMessage: message => message
    };
    const report = await runSolutionEvaluation(runtime, solution, evaluationPlan);
    assert.equal(report.evaluations[0].actual, 0.5, 'Ordinary successful cases still contribute their score');
    assert.equal(report.evaluations[0].threshold, 0.5);
    assert.deepEqual(report.evaluations[0].cases.map(result => result.passed), [true, false, true, false]);
    assert.equal(report.evaluations[0].status, 'failed', 'Invalid citation evidence is fatal even at the aggregate threshold');
    assert.equal(report.capabilities[0].status, 'failed');
    assert.equal(report.status, 'failed');
    assert.ok(report.evaluations[0].cases.filter(result => !result.passed).every(result => /source locator/i.test(result.detail)));
  }
});

test('valid locator-free citations retain ordinary fractional relevance scoring', async () => {
  const relevant = { id: 'relevant', text: 'Inspect pump' }, irrelevant = { id: 'irrelevant', text: 'Inspect valve' };
  const evaluationPlan = plan([
    entry('matched', relevant),
    { id: 'irrelevant', input: { documents: [relevant, irrelevant] }, expected: { ids: ['relevant'] } }
  ], { threshold: 0.5 });
  const runtime = {
    provenance: { profile: 'cli', filesHash: 'a'.repeat(64), runtime: 'node', environmentNames: [] },
    invoke: async input => ({ results: [citation(input.documents.at(-1))] }),
    redactOutput: output => output, redactMessage: message => message
  };
  const report = await runSolutionEvaluation(runtime, solution, evaluationPlan);
  assert.equal(report.evaluations[0].actual, 0.5);
  assert.deepEqual(report.evaluations[0].cases.map(result => result.passed), [true, false]);
  assert.equal(report.status, 'passed', 'Grounded but irrelevant citations remain ordinary relevance misses');
});

async function evaluateCleanPackage(engine, evaluationPlan) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-retrieval-locator-'));
  let runtime;
  try {
    await fs.writeFile(path.join(root, 'engine.mjs'), engine);
    runtime = await prepareSolutionRuntime(root, solution.runtime, process.execPath);
    assert.notEqual(runtime.root, root);
    const report = await runSolutionEvaluation(runtime, solution, evaluationPlan);
    assert.match(report.runtime.filesHash, /^[a-f0-9]{64}$/);
    return report;
  } finally {
    await runtime?.close();
    await fs.rm(root, { recursive: true, force: true });
  }
}
const engineStart = `
let body = ''; for await (const chunk of process.stdin) body += chunk;
const input = JSON.parse(body);
`;

test('a clean Node package cannot pass by adding fabricated citation URLs to locator-free documents', async () => {
  const evaluationPlan = plan([
    entry('unlocated', sourceDocument),
    { id: 'abstain', input: { documents: [] }, expected: { ids: [] } }
  ], { threshold: 0.5, trials: 2 });
  const report = await evaluateCleanPackage(engineStart + `
console.log(JSON.stringify({ results: input.documents.map(document => ({
  id: document.id, source: 'https://fabricated.example/policy',
  excerpt: { start: 0, end: document.text.length, text: document.text }
})) }));
`, evaluationPlan);
  assert.equal(report.evaluations[0].actual, 0.5);
  assert.deepEqual(report.evaluations[0].cases.map(result => result.passed), [false, true, false, true]);
  assert.equal(report.status, 'failed');
  assert.equal(report.capabilities[0].status, 'failed');
  assert.match(report.evaluations[0].cases[0].detail, /source locator/i);
  assert.equal(report.evaluations[0].cases[0].output.results[0].source, 'https://fabricated.example/policy',
    'Failed evidence retains the actual process output for repair');
});

test('a clean Node package passes omitted, empty and Unicode locators without normalization', async () => {
  const documents = [sourceDocument, { id: 'empty', text: ' ', source: '' },
    { id: 'unicode', text: '🚢 Café — pump inspection', source: 'manual://cafe\u0301/🚢' }];
  const evaluationPlan = plan([...documents.map((document, index) => entry(`document-${index}`, document)),
    { id: 'abstain', input: { documents: [] }, expected: { ids: [] } }]);
  const report = await evaluateCleanPackage(engineStart + `
console.log(JSON.stringify({ results: input.documents.map(document => ({
  id: document.id, ...(Object.hasOwn(document, 'source') ? { source: document.source } : {}),
  excerpt: { start: 0, end: document.text.length, text: document.text }
})) }));
`, evaluationPlan);
  assert.equal(report.status, 'passed');
  assert.equal(report.evaluations[0].actual, 1);
  assert.ok(report.evaluations[0].cases.every(result => result.passed));
  for (const [index, document] of documents.entries()) {
    assert.deepEqual(report.evaluations[0].cases[index].output, { results: [citation(document)] });
  }
  assert.deepEqual(report.evaluations[0].cases.at(-1).output, { results: [] });
});
