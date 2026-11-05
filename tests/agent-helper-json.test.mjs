import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseToolCallArguments, validateToolArguments } from '@earendil-works/pi-ai';
import { AgentHelperRuntime } from '../dist-electron/electron/agent-helpers.js';

const counts = { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0 };
const passedTests = { exitCode: 0, stdout: JSON.stringify({ type: 'summary', summaries: [
  { file: 'run.test.mjs', success: true, counts }, { success: true, counts }
], skippedSuites: 0 }) + '\n', stderr: '', timedOut: false, outputLimited: false };

async function fixture(t, execute) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-helper-json-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const directory = path.join(workspace, '.agent-tools', 'json-values');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'tool.json'), JSON.stringify({ schemaVersion: 1,
    name: 'json-values', version: '1.0.0', description: 'Return JSON values.', entrypoint: 'run.mjs',
    tests: ['run.test.mjs'], inputDescription: 'JSON input.', outputDescription: 'JSON output.' }));
  await fs.writeFile(path.join(directory, 'SKILL.md'), '# JSON values\nUse for JSON value checks.');
  await fs.writeFile(path.join(directory, 'run.mjs'), 'export const value = 1;');
  await fs.writeFile(path.join(directory, 'run.test.mjs'), `import test from 'node:test';
import assert from 'node:assert/strict';
import {value} from './run.mjs';
test('finite value', () => assert.equal(value, 1));
`);
  const controller = new AbortController();
  const runtime = new AgentHelperRuntime(workspace, process.execPath, execute);
  const tools = Object.fromEntries(runtime.tools(controller.signal).map(tool => [tool.name, tool]));
  const call = args => tools.fleet_run_helper.execute('json-test', { name: 'json-values', ...args }, controller.signal);
  return { workspace, directory, call, tool: tools.fleet_run_helper, signal: controller.signal };
}

const nonfiniteInputs = [
  ['positive infinity', Infinity],
  ['negative infinity', -Infinity],
  ['not a number', NaN],
  ['nested positive infinity', { records: [{ value: Infinity }] }],
  ['nested negative infinity', [0, { result: -Infinity }]],
  ['nested not a number', { result: [NaN] }],
];
for (const [label, input] of nonfiniteInputs) {
  test(`helper rejects ${label} input before running any process`, async t => {
    const calls = [];
    const h = await fixture(t, async options => { calls.push(options); return passedTests; });
    await h.call({ action: 'test' });
    calls.length = 0;
    await assert.rejects(h.call({ action: 'run', input }), /finite/i);
    assert.equal(calls.length, 0, 'invalid input must not be rewritten to null and executed');
  });
}

test('helper rejects overflow in SDK-parsed tool arguments without executing and accepts a corrected retry', async t => {
  const calls = [];
  const h = await fixture(t, async options => {
    calls.push(options);
    return options.command.includes('--test') ? passedTests : { ...passedTests, stdout: options.stdin };
  });
  await h.call({ action: 'test' });
  calls.length = 0;
  const parsed = parseToolCallArguments('{"name":"json-values","action":"run","input":{"records":[1e9999]}}');
  const args = validateToolArguments(h.tool, { type: 'toolCall', id: 'overflow', name: h.tool.name, ...parsed });
  assert.equal(args.input.records[0], Infinity, 'the SDK schema permits an overflowing numeric argument');
  await assert.rejects(h.tool.execute('overflow', args, h.signal), /finite/i);
  assert.equal(calls.length, 0);
  const retry = await h.call({ action: 'run', input: { records: [42] } });
  assert.equal(retry.details.passed, true);
  assert.deepEqual(retry.details.output, { records: [42] });
  assert.equal(calls.length, 2, 'the corrected retry still repeats tests before execution');
});

const overflowOutputs = [
  ['positive overflow', '1e9999'],
  ['negative overflow', '-1e9999'],
  ['nested positive overflow', '{"records":[{"value":1e9999}]}'],
  ['nested negative overflow', '[0,{"result":-1e9999}]'],
];
for (const [label, stdout] of overflowOutputs) {
  test(`helper rejects ${label} output without publishing a null replacement`, async t => {
    const h = await fixture(t, async options => options.command.includes('--test')
      ? passedTests : { ...passedTests, stdout });
    await h.call({ action: 'test' });
    const result = await h.call({ action: 'run' });
    assert.equal(result.isError, true, 'nonfinite output must fail the helper call');
    assert.equal(result.details.passed, false);
    assert.equal(Object.hasOwn(result.details, 'output'), false);
    assert.match(result.details.error, /finite/i);
    const text = JSON.parse(result.content[0].text);
    assert.equal(text.passed, false);
    assert.equal(Object.hasOwn(text, 'output'), false);
    assert.equal(result.details.stdout, stdout, 'raw output remains available for diagnosis');
  });
}

const finiteValues = [
  ['largest finite number', Number.MAX_VALUE],
  ['smallest positive number', Number.MIN_VALUE],
  ['negative finite extreme', -Number.MAX_VALUE],
  ['null', null],
  ['false', false],
  ['zero', 0],
  ['numeric-looking string', '1e9999'],
  ['nested values', { records: [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE, null, 'Infinity', 'NaN'] }],
];
for (const [label, value] of finiteValues) {
  test(`helper preserves valid ${label} input and output`, async t => {
    const calls = [];
    const h = await fixture(t, async options => {
      calls.push(options);
      return options.command.includes('--test') ? passedTests : { ...passedTests, stdout: JSON.stringify(value) };
    });
    await h.call({ action: 'test' });
    const result = await h.call({ action: 'run', input: value });
    assert.equal(result.isError, false);
    assert.equal(result.details.passed, true);
    assert.deepEqual(JSON.parse(calls.at(-1).stdin), value);
    assert.deepEqual(result.details.output, value);
    assert.deepEqual(JSON.parse(result.content[0].text).output, value);
  });
}

for (const stdout of ['NaN', 'Infinity', 'undefined', '', '{}{}', '{broken']) {
  test(`helper still rejects malformed JSON output ${JSON.stringify(stdout)}`, async t => {
    const h = await fixture(t, async options => options.command.includes('--test')
      ? passedTests : { ...passedTests, stdout });
    await h.call({ action: 'test' });
    const result = await h.call({ action: 'run' });
    assert.equal(result.isError, true);
    assert.equal(result.details.passed, false);
    assert.equal(Object.hasOwn(result.details, 'output'), false);
    assert.match(result.details.error, /JSON/i);
  });
}

test('sandboxed helper rejects overflow after genuine self-tests and accepts a finite control', {
  skip: process.platform !== 'darwin' && process.platform !== 'linux',
}, async t => {
  const h = await fixture(t);
  await fs.writeFile(path.join(h.directory, 'run.mjs'), `import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export const value = 1;
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  process.stdout.write(input.overflow ? '{"result":[1e9999]}' : '{"result":[1.7976931348623157e308]}');
}
`);
  const tested = await h.call({ action: 'test' });
  assert.equal(tested.details.passed, true, JSON.stringify(tested.details));
  assert.equal(tested.details.tests.total, 1);
  const finite = await h.call({ action: 'run', input: { overflow: false } });
  assert.equal(finite.details.passed, true, JSON.stringify(finite.details));
  assert.deepEqual(finite.details.output, { result: [Number.MAX_VALUE] });
  const overflow = await h.call({ action: 'run', input: { overflow: true } });
  assert.equal(overflow.details.tests.passed, 1, 'genuine self-tests pass before output is rejected');
  assert.equal(overflow.details.exitCode, 0, 'the helper itself exits normally');
  assert.equal(overflow.isError, true, JSON.stringify(overflow.details));
  assert.equal(overflow.details.passed, false);
  assert.equal(Object.hasOwn(overflow.details, 'output'), false);
  assert.match(overflow.details.error, /finite/i);
});
