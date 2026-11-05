import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentHelperRuntime } from '../dist-electron/electron/agent-helpers.js';
import { applicationTestFiles } from '../dist-electron/electron/verification.js';
import { registerCredential } from '../dist-electron/electron/secrets.js';

const counts = { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0 };
const passedTests = { exitCode: 0, stdout: JSON.stringify({ type: 'summary', summaries: [
  { file: 'run.test.mjs', success: true, counts }, { success: true, counts }
], skippedSuites: 0 }) + '\n', stderr: '', timedOut: false, outputLimited: false };
test('helper catalog and execution redact synthetic credentials in both text and structured results', async t => {
  const secret = 'synthetic-helper-secret-distinctive-0137'; registerCredential(secret);
  const h = await fixture(t, async options => options.command.includes('--test') ? passedTests : { ...passedTests, stdout: JSON.stringify({ diagnostic: secret }), stderr: secret });
  await fs.appendFile(path.join(h.directory, 'SKILL.md'), '\nSynthetic diagnostic: ' + secret);
  const catalog = await h.call('fleet_helpers', {action:'inspect', name:'sum-records'});
  assert.equal(JSON.stringify(catalog).includes(secret), false);
  assert.match(catalog.details.instructions, /\[REDACTED\]/);
  await h.call('fleet_run_helper', {action:'test', name:'sum-records'});
  const result = await h.call('fleet_run_helper', {action:'run', name:'sum-records'});
  assert.equal(result.details.passed, true);
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(result.details.output.diagnostic, '[REDACTED]');
  assert.equal(result.details.stderr, '[REDACTED]');
});
async function fixture(t, execute) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-helper-runtime-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const directory = path.join(workspace, '.agent-tools', 'sum-records');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'tool.json'), JSON.stringify({ schemaVersion: 1, name: 'sum-records', version: '1.0.0', description: 'Sum supplied records.', entrypoint: 'run.mjs', tests: ['run.test.mjs'], inputDescription: 'Array of numbers.', outputDescription: 'Sum.' }));
  await fs.writeFile(path.join(directory, 'SKILL.md'), '# Sum records\nUse for numeric records.');
  await fs.writeFile(path.join(directory, 'run.mjs'), 'export const sum = values => values.reduce((a,b) => a+b, 0);');
  await fs.writeFile(path.join(directory, 'run.test.mjs'), "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {sum} from './run.mjs';\ntest('sum', () => assert.equal(sum([1,2]), 3));");
  const controller = new AbortController();
  const runtime = new AgentHelperRuntime(workspace, process.execPath, execute);
  const tools = () => Object.fromEntries(runtime.tools(controller.signal).map(tool => [tool.name, tool]));
  const call = async (name, args, selected = tools()) => selected[name].execute('test-call', args, controller.signal);
  return { workspace, directory, runtime, controller, tools, call };
}

test('helper tests authorize the exact revision across phase tool instances; edits invalidate it', async t => {
  const calls = [];
  const h = await fixture(t, async options => { calls.push(options); return options.command.includes('--test') ? passedTests : { ...passedTests, stdout: '6' }; });
  await assert.rejects(h.call('fleet_run_helper', { name: 'sum-records', action: 'run', input: [1,2,3] }), /self-tests/);
  assert.equal(calls.length, 0);
  assert.equal((await h.call('fleet_run_helper', { name: 'sum-records', action: 'test' })).details.passed, true);
  const nextPhase = h.tools();
  assert.equal((await h.call('fleet_helpers', { action: 'inspect', name: 'sum-records' }, nextPhase)).details.selfTestsPassed, true);
  const run = await h.call('fleet_run_helper', { name: 'sum-records', action: 'run', input: [1,2,3] }, nextPhase);
  assert.equal(run.details.output, 6);
  assert.equal(calls.at(-1).stdin, '[1,2,3]\n');
  assert.equal(calls.at(-1).command[0], process.execPath);
  await fs.appendFile(path.join(h.directory, 'run.mjs'), '\n// revised');
  assert.equal((await h.call('fleet_helpers', { action: 'inspect', name: 'sum-records' })).details.selfTestsPassed, false);
  await assert.rejects(h.call('fleet_run_helper', { name: 'sum-records', action: 'run' }), /self-tests/);
});

test('failed, skipped, empty, timed-out and overflowed self-tests cannot authorize reuse', async t => {
  let response = passedTests;
  const h = await fixture(t, async () => response);
  for (const failure of [{ exitCode: 1 }, { stdout: '# tests 1\n# pass 0\n# skipped 1\n' }, { stdout: '' }, { timedOut: true }, { outputLimited: true }]) {
    response = passedTests;
    await h.call('fleet_run_helper', { name: 'sum-records', action: 'test' });
    response = { ...passedTests, ...failure };
    assert.equal((await h.call('fleet_run_helper', { name: 'sum-records', action: 'test' })).isError, true);
    await assert.rejects(h.call('fleet_run_helper', { name: 'sum-records', action: 'run' }), /self-tests/);
  }
});

test('discovery is metadata only, fresh, and never executes helper code', async t => {
  const h = await fixture(t, async () => { throw new Error('must not run'); });
  const list = (await h.call('fleet_helpers', { action: 'list' })).details;
  assert.equal(list.helpers[0].name, 'sum-records');
  assert.equal(JSON.stringify(list).includes('Use for numeric records'), false);
  assert.match((await h.call('fleet_helpers', { action: 'inspect', name: 'sum-records' })).details.instructions, /numeric records/);
  await fs.rm(h.directory, { recursive: true });
  assert.deepEqual((await h.call('fleet_helpers', { action: 'list' })).details.helpers, []);
});

test('execution rejects changed source, invalid JSON output, huge input, and canceled stages', async t => {
  let mode = 'test';
  const h = await fixture(t, async options => {
    if (mode === 'mutate') await fs.appendFile(path.join(h.directory, 'run.mjs'), '\n// changed');
    return mode === 'invalid' && !options.command.includes('--test') ? { ...passedTests, stdout: 'not JSON' } : passedTests;
  });
  await h.call('fleet_run_helper', { name: 'sum-records', action: 'test' });
  mode = 'invalid';
  assert.equal((await h.call('fleet_run_helper', { name: 'sum-records', action: 'run' })).isError, true);
  await assert.rejects(h.call('fleet_run_helper', { name: 'sum-records', action: 'run', input: 'a'.repeat(65536) }), /64 KiB/);
  mode = 'mutate';
  await assert.rejects(h.call('fleet_run_helper', { name: 'sum-records', action: 'test' }), /changed during execution/);
  h.controller.abort();
  await assert.rejects(h.call('fleet_helpers', { action: 'list' }), /abort/i);
});

test('helper self-tests and generated output never count as application tests', async t => {
  const h = await fixture(t, async () => passedTests);
  await fs.mkdir(path.join(h.workspace, '.agent-output'));
  await fs.writeFile(path.join(h.workspace, '.agent-output', 'pretend.test.mjs'), 'console.log("not acceptance");');
  assert.deepEqual(await applicationTestFiles(h.workspace), []);
  await fs.writeFile(path.join(h.workspace, 'app.test.mjs'), 'console.log("application");');
  assert.deepEqual(await applicationTestFiles(h.workspace), ['app.test.mjs']);
});

test('real helper runtime executes tested JSON utilities and rejects empty test modules', { skip: process.platform !== 'darwin' && process.platform !== 'linux' }, async t => {
  const h = await fixture(t);
  await fs.appendFile(path.join(h.directory, 'run.mjs'), `
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(sum(JSON.parse(readFileSync(0, 'utf8')))));
`);
  const tested = await h.call('fleet_run_helper', { name: 'sum-records', action: 'test' });
  assert.equal(tested.details.passed, true, JSON.stringify(tested.details));
  const ran = await h.call('fleet_run_helper', { name: 'sum-records', action: 'run', input: [7, 11] });
  assert.equal(ran.details.output, 18, JSON.stringify(ran.details));
  await fs.writeFile(path.join(h.directory, 'run.test.mjs'), 'export const noTests = true;');
  const empty = await h.call('fleet_run_helper', { name: 'sum-records', action: 'test' });
  assert.equal(empty.isError, true, JSON.stringify(empty.details));
});

test('run repeats self-tests against changed workspace dependencies before executing', { skip: process.platform !== 'darwin' && process.platform !== 'linux' }, async t => {
  const h = await fixture(t);
  const dependency = path.join(h.workspace, 'dependency.mjs');
  await fs.writeFile(dependency, 'export const value = 1;');
  await fs.writeFile(path.join(h.directory, 'run.mjs'), `export {value} from '../../dependency.mjs';`);
  await fs.writeFile(path.join(h.directory, 'run.test.mjs'), `import test from 'node:test'; import assert from 'node:assert/strict'; import {value} from './run.mjs'; test('dependency contract', () => assert.equal(value, 1));`);
  assert.equal((await h.call('fleet_run_helper', { name: 'sum-records', action: 'test' })).details.passed, true);
  await fs.writeFile(dependency, 'export const value = 2;');
  const ran = await h.call('fleet_run_helper', { name: 'sum-records', action: 'run' });
  assert.equal(ran.isError, true);
  assert.equal(ran.details.tests.failed, 1);
  assert.equal((await h.call('fleet_helpers', { action: 'inspect', name: 'sum-records' })).details.selfTestsPassed, false);
});
