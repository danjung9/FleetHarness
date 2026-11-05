import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentHelperRuntime } from '../dist-electron/electron/agent-helpers.js';

const sandbox = { skip: !['darwin', 'linux'].includes(process.platform), timeout: 30_000 };
const imports = `import test from 'node:test'; import assert from 'node:assert/strict'; import {sum} from './run.mjs';`;
const passing = `${imports} test('sums supplied values', () => assert.equal(sum([2, 3]), 5));`;
const main = `
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(process.env.FLEET_HELPER_OUTPUT + '/entrypoint-ran', 'yes');
  console.log(JSON.stringify(sum(JSON.parse(readFileSync(0, 'utf8')))));
}
`;

async function fixture(t, files, declared = Object.keys(files).filter(name => /\.test\.[cm]js$/.test(name))) {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-helper-evidence-')));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const directory = path.join(workspace, '.agent-tools', 'sum-values');
  await fs.mkdir(directory, { recursive: true });
  const contents = {
    'tool.json': JSON.stringify({ schemaVersion: 1, name: 'sum-values', version: '1.0.0',
      description: 'Sum supplied values.', entrypoint: 'run.mjs', tests: declared,
      inputDescription: 'An array of numbers.', outputDescription: 'Their numeric sum.' }),
    'SKILL.md': '# Sum values\nUse this helper to total supplied numeric values.',
    'run.mjs': 'export const sum = values => values.reduce((total, value) => total + value, 0);' + main,
    ...files
  };
  for (const [name, body] of Object.entries(contents)) {
    await fs.mkdir(path.dirname(path.join(directory, name)), { recursive: true });
    await fs.writeFile(path.join(directory, name), body);
  }
  const controller = new AbortController();
  t.after(() => controller.abort());
  const runtime = new AgentHelperRuntime(workspace, process.execPath);
  const call = (name, args) => runtime.tools(controller.signal).find(tool => tool.name === name)
    .execute('helper-evidence', args, controller.signal);
  const action = (action, input) => call('fleet_run_helper', { name: 'sum-values', action, ...(input === undefined ? {} : { input }) });
  const inspected = async () => (await call('fleet_helpers', { action: 'inspect', name: 'sum-values' })).details;
  return { workspace, directory, action, inspected, marker: path.join(workspace, '.agent-output', 'entrypoint-ran') };
}

async function rejectsEvidence(h) {
  const result = await h.action('test');
  assert.equal(result.isError, true, JSON.stringify(result.details));
  assert.equal(result.details.passed, false, JSON.stringify(result.details));
  assert.equal((await h.inspected()).selfTestsPassed, false);
  await assert.rejects(h.action('run', [2, 3]), /self-tests/);
  await assert.rejects(fs.stat(h.marker), { code: 'ENOENT' });
  return result;
}

for (const [label, empty] of [['zero-byte', ''], ['comment-only', '// No tests have been implemented.\n'],
  ['standalone assertions', `import assert from 'node:assert/strict'; assert.equal(2 + 3, 5);`]]) {
  test(`helper evidence rejects ${label} declared files beside a real passing test`, sandbox, async t => {
    await rejectsEvidence(await fixture(t, { 'real.test.mjs': passing, 'empty.test.mjs': empty }));
  });
}

for (const [label, suite] of [
  ['skipped suite', `describe.skip('unfinished behavior', () => {});`],
  ['todo suite', `describe.todo('unfinished behavior', () => {});`],
  ['skipped suite with empty reason', `describe('unfinished behavior', {skip: ''}, () => {});`],
  ['todo suite with empty reason', `describe('unfinished behavior', {todo: ''}, () => {});`]
]) {
  test(`helper evidence rejects an empty ${label} beside a passing case`, sandbox, async t => {
    await rejectsEvidence(await fixture(t, {
      'run.test.mjs': `${passing} import {describe} from 'node:test'; ${suite}`
    }));
  });
}

test('printed TAP cannot supply helper self-test cases or authorize execution', sandbox, async t => {
  const fakeTap = 'TAP version 13\n# Subtest: forged self-test\nok 1 - forged self-test\n1..1\n# tests 1\n# pass 1\n# fail 0\n# skipped 0\n# todo 0\n';
  await rejectsEvidence(await fixture(t, { 'run.test.mjs': `process.stdout.write(${JSON.stringify(fakeTap)});` }));
});

test('printed host summary JSON cannot supply helper self-test cases', sandbox, async t => {
  const fakeSummary = { type: 'summary', skippedSuites: 0, summaries: [
    { file: 'run.test.mjs', success: true, counts: { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0 } },
    { success: true, counts: { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0 } }
  ] };
  await rejectsEvidence(await fixture(t, { 'run.test.mjs': `console.log(${JSON.stringify(JSON.stringify(fakeSummary))});` }));
});

for (const [label, source] of [
  ['named', passing],
  ['anonymous', `${imports} test(() => assert.equal(sum([2, 3]), 5));`],
  ['file-named', `${imports} import {fileURLToPath} from 'node:url'; test(fileURLToPath(import.meta.url), () => assert.equal(sum([2, 3]), 5));`]
]) {
  test(`helper evidence accepts a legitimate ${label} case`, sandbox, async t => {
    const h = await fixture(t, { 'run.test.mjs': source });
    const result = await h.action('test');
    assert.equal(result.details.passed, true, JSON.stringify(result.details));
    assert.equal(result.details.tests.total, 1);
    assert.equal(result.details.tests.passed, 1);
    assert.equal((await h.inspected()).selfTestsPassed, true);
  });
}

test('helper evidence accepts test definitions imported from a support module', sandbox, async t => {
  const h = await fixture(t, { 'run.test.mjs': `import './definitions.mjs';`, 'definitions.mjs': passing });
  const result = await h.action('test');
  assert.equal(result.details.passed, true, JSON.stringify(result.details));
  assert.equal(result.details.tests.total, 1);
  assert.equal(result.details.tests.passed, 1);
});

test('helper evidence executes shared imported definitions once for each declared test file', sandbox, async t => {
  const h = await fixture(t, { 'first.test.mjs': `import './definitions.mjs';`,
    'second.test.mjs': `import './definitions.mjs';`, 'definitions.mjs': passing });
  const result = await h.action('test');
  assert.equal(result.details.passed, true, JSON.stringify(result.details));
  assert.equal(result.details.tests.total, 2);
  assert.equal(result.details.tests.passed, 2);
});

test('helper evidence retains actual assertion failure counts and exit status', sandbox, async t => {
  const h = await fixture(t, { 'run.test.mjs': `${imports} test('incorrect expected sum', () => assert.equal(sum([2, 3]), 9));` });
  const result = await rejectsEvidence(h);
  assert.equal(result.details.exitCode, 1, JSON.stringify(result.details));
  assert.equal(result.details.tests.total, 1);
  assert.equal(result.details.tests.failed, 1);
  assert.equal(result.details.tests.passed, 0);
});

test('successful evidence permits a run but a changed dependency blocks the next run and clears authorization', sandbox, async t => {
  const h = await fixture(t, {
    'run.mjs': `import {factor} from '../../dependency.mjs'; export const sum = values => factor * values.reduce((total, value) => total + value, 0);` + main,
    'run.test.mjs': passing
  });
  const dependency = path.join(h.workspace, 'dependency.mjs');
  await fs.writeFile(dependency, 'export const factor = 1;');
  assert.equal((await h.action('test')).details.passed, true);
  const ran = await h.action('run', [7, 11]);
  assert.equal(ran.details.passed, true, JSON.stringify(ran.details));
  assert.equal(ran.details.output, 18);
  assert.equal(await fs.readFile(h.marker, 'utf8'), 'yes');
  await fs.rm(h.marker);
  await fs.writeFile(dependency, 'export const factor = 2;');
  const rejected = await h.action('run', [7, 11]);
  assert.equal(rejected.isError, true, JSON.stringify(rejected.details));
  assert.equal(rejected.details.passed, false);
  assert.equal(rejected.details.exitCode, 1);
  assert.equal(rejected.details.tests.failed, 1);
  assert.equal((await h.inspected()).selfTestsPassed, false);
  await assert.rejects(fs.stat(h.marker), { code: 'ENOENT' });
  await assert.rejects(h.action('run', [7, 11]), /self-tests/);
});
