import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applicationTestFiles, verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';
import { verifyIsolatedWorkspace } from '../dist-electron/electron/isolated-solution-runtime.js';
import { loadQualityContract, verifyApplication } from '../dist-electron/electron/quality.js';
import { qualityFixture } from '../scripts/quality-fixture.mjs';

const realTest = 'require("node:test")("arithmetic", () => require("node:assert/strict").equal(2 + 2, 4));';
async function workspace(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-empty-test-evidence-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [name, body] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await fs.writeFile(path.join(root, name), body);
  }
  return root;
}

test('test discovery includes empty JavaScript test and spec files while excluding host and dependency files', async t => {
  const expected = ['cjs', 'mjs', 'js'].flatMap(extension => ['test', 'spec'].map(kind => `tests/nested/empty.${kind}.${extension}`));
  const excluded = ['.fleet', '.review-source', '.agent-tools', '.agent-output', '.browser-observations', 'node_modules', '.git', '.pi']
    .map(directory => `${directory}/internal.test.cjs`);
  const root = await workspace(t, Object.fromEntries([...expected, ...excluded, 'tests/notes.txt'].map(name => [name, ''])));
  assert.deepEqual(await applicationTestFiles(root), expected.map(name => path.normalize(name)).sort((a, b) => a.localeCompare(b)));
});

test('an empty test beside a passing test prevents ordinary verification until it contains a real case', async t => {
  const root = await workspace(t, { 'app.test.cjs': realTest, 'tests/unfinished.spec.cjs': '' });
  const incomplete = await verifyWorkspace(root, process.execPath, () => {});
  assert.equal(reportPassed(incomplete), false, incomplete.output);
  assert.equal(incomplete.passed, 1, 'The real case still executes; it cannot cover the empty file.');
  assert.match(incomplete.output, /completed node:test cases in every test file/);
  await fs.writeFile(path.join(root, 'tests/unfinished.spec.cjs'), realTest);
  const complete = await verifyWorkspace(root, process.execPath, () => {});
  assert.equal(reportPassed(complete), true, complete.output);
  assert.equal(complete.passed, 2);
});

test('an empty-only test workspace yields failed evidence instead of claiming no tests were produced', async t => {
  const root = await workspace(t, { 'tests/unfinished.test.mjs': '' });
  const report = await verifyWorkspace(root, process.execPath, () => {});
  assert.equal(reportPassed(report), false, report.output);
  assert.equal(report.total, 0);
  assert.equal(report.passed, 0);
  assert.match(report.output, /completed node:test cases in every test file/);
});

test('isolated verification includes empty tests and recovers after they receive real cases', {
  skip: !['darwin', 'linux'].includes(process.platform), timeout: 30_000
}, async t => {
  const root = await workspace(t, { 'app.test.cjs': realTest, 'tests/unfinished.test.cjs': '' });
  const incomplete = await verifyIsolatedWorkspace(root, process.execPath, () => {});
  assert.equal(reportPassed(incomplete), false, incomplete.output);
  assert.equal(incomplete.passed, 1);
  assert.match(incomplete.output, /completed node:test cases in every test file/);
  await fs.writeFile(path.join(root, 'tests/unfinished.test.cjs'), realTest);
  const complete = await verifyIsolatedWorkspace(root, process.execPath, () => {});
  assert.equal(reportPassed(complete), true, complete.output);
  assert.equal(complete.passed, 2);
});

test('clean package verification copies empty tests outside the runtime manifest and requires their completion', { timeout: 30_000 }, async t => {
  const acceptance = [{ id: 'R1', requirement: 'Sum the supplied numbers.', method: 'automated', scenario: 'Compare independent sums.' }];
  const root = await workspace(t, {
    'ux-spec.json': qualityFixture(['R1'])['ux-spec.json'],
    'acceptance-plan.json': JSON.stringify({ schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented',
      expectedOutcome: 'Totals match the independently calculated sums.', journeyIds: [], capabilityIds: ['total'] }], journeys: [] }),
    'solution-contract.json': JSON.stringify({ schemaVersion: 1, objective: 'Calculate sums reliably.',
      capabilities: [{ id: 'total', kind: 'algorithm', description: 'Sum supplied numeric values.', required: true, criterionIds: ['R1'], evaluationIds: ['reference'] }],
      runtime: { profile: 'cli', files: ['engine.mjs', 'math.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } }),
    'evaluation-plan.json': JSON.stringify({ schemaVersion: 1, evaluations: [{ id: 'reference', capabilityId: 'total', description: 'Independent sums.',
      dataset: { name: 'Arithmetic reference', version: '1', provenance: 'reviewed' }, evaluator: 'numeric', threshold: 1, trials: 1,
      cases: [{ id: 'positive', input: { values: [2, 3] }, expected: { total: 5 } }, { id: 'mixed', input: { values: [10, -3, 1] }, expected: { total: 8 } }] }] }),
    'math.mjs': 'export const sum = values => values.reduce((total, value) => total + value, 0);',
    'engine.mjs': 'import { readFileSync } from "node:fs"; import { sum } from "./math.mjs"; console.log(JSON.stringify({ total: sum(JSON.parse(readFileSync(0, "utf8")).values) }));',
    'math.test.mjs': 'import test from "node:test"; import assert from "node:assert/strict"; import { sum } from "./math.mjs"; test("positive values", () => assert.equal(sum([2, 3]), 5));',
    'tests/unfinished.spec.mjs': ''
  });
  const contract = await loadQualityContract(root, acceptance, true);
  assert.equal(contract.solution.runtime.files.includes('tests/unfinished.spec.mjs'), false);
  const incomplete = await verifyApplication(root, process.execPath, contract);
  assert.equal(incomplete.quality.package.status, 'passed', incomplete.output);
  assert.equal(incomplete.quality.solutionEvaluation.status, 'passed', incomplete.output);
  assert.equal(incomplete.passed, 1);
  assert.equal(reportPassed(incomplete, true), false, incomplete.output);
  assert.match(incomplete.output, /completed node:test cases in every test file/);
  await fs.writeFile(path.join(root, 'tests/unfinished.spec.mjs'),
    'import test from "node:test"; import assert from "node:assert/strict"; import { sum } from "../math.mjs"; test("mixed values", () => assert.equal(sum([10, -3, 1]), 8));');
  const complete = await verifyApplication(root, process.execPath, contract);
  assert.equal(reportPassed(complete, true), true, complete.output);
  assert.equal(complete.passed, 2);
});
