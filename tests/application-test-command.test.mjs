import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as verification from '../dist-electron/electron/verification.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';
import { verifyIsolatedWorkspace } from '../dist-electron/electron/isolated-solution-runtime.js';

const passingTest = `import test from 'node:test';
import assert from 'node:assert/strict';
test('advertised application check', () => assert.equal(2 + 2, 4));
`;
const { verifyWorkspace, reportPassed } = verification;

async function fixture(t, filename = 'arithmetic.test.mjs', source = passingTest) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-test-command-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'), parent = path.join(root, 'exports');
  await fs.mkdir(workspace); await fs.mkdir(parent);
  await fs.writeFile(path.join(workspace, filename), source);
  return { root, workspace, parent };
}

function rerun(command, destination, root) {
  // Do not inherit Node's parent test-runner IPC context into the user shell.
  return spawnSync('/bin/sh', ['-c', command], { cwd: destination, encoding: 'utf8', timeout: 10_000,
    env: { PATH: process.env.PATH, HOME: root, TMPDIR: process.env.TMPDIR,
      ELECTRON_RUN_AS_NODE: '1', FLEET_COMMAND_PROBE: 'unexpected-expansion' } });
}

async function exportedCommand(t, filename, environment, verify = verifyWorkspace) {
  const input = await fixture(t, filename);
  const report = await verify(input.workspace, process.execPath, () => {}, undefined, {}, environment);
  assert.equal(report.exitCode, 0, report.output);
  assert.equal(report.total, 1, report.output);
  assert.equal(report.passed, 1, report.output);
  const destination = await exportVerifiedBundle({ ...input, title: 'Application tests', verifiedHash: report.sourceHash,
    deliveryMarkdown: 'Tests: follow the prerequisites in README.md, then run: ' + report.command });
  const notes = await fs.readFile(path.join(destination, 'DELIVERY.md'), 'utf8');
  assert.ok(notes.includes(report.command), 'The exported notes retain the advertised test command.');
  const result = rerun(report.command, destination, input.root);
  return { report, destination, result };
}

const posix = { skip: process.platform === 'win32' };

test('the application test command advertised in an exported bundle can be executed', posix, async t => {
  const { report, result } = await exportedCommand(t, 'arithmetic.test.mjs');
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /ok 1 - advertised application check/);
  assert.doesNotMatch(report.command, /host application evidence|data:text\/javascript/);
});

test('the clean-package command keeps its runtime flags and runs outside AppYard', posix, async t => {
  const { report, result } = await exportedCommand(t, 'arithmetic.test.mjs', {
    PATH: process.env.PATH, HOME: os.tmpdir(), TMPDIR: process.env.TMPDIR
  });
  assert.match(report.command, /--no-global-search-paths/);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /ok 1 - advertised application check/);
});

test('isolated verification also advertises a runnable exported test command', {
  skip: !['darwin', 'linux'].includes(process.platform), timeout: 30_000
}, async t => {
  const { report, result } = await exportedCommand(t, 'isolated test.test.mjs', undefined, verifyIsolatedWorkspace);
  assert.match(report.command, /--no-global-search-paths/);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /ok 1 - advertised application check/);
});

test('delivery rebuilds a runnable test command for a saved report containing the old reporter placeholder', posix, async t => {
  const input = await fixture(t, 'original.test.mjs');
  await fs.writeFile(path.join(input.workspace, 'second test.test.mjs'), passingTest);
  const report = await verifyWorkspace(input.workspace, process.execPath, () => {});
  assert.equal(reportPassed(report), true, report.output);
  const legacyCommand = 'node "--test" "--test-reporter=<host application evidence>" "./original.test.mjs"';
  report.command = legacyCommand;
  const command = await verification.applicationTestRerunCommand(input.workspace);
  const destination = await exportVerifiedBundle({ ...input, title: 'Saved application', verifiedHash: report.sourceHash,
    deliveryMarkdown: 'Rerun application tests: ' + command });
  const result = rerun(command, destination, input.root);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /# pass 2(?:\r?\n|$)/);
  assert.doesNotMatch(await fs.readFile(path.join(destination, 'DELIVERY.md'), 'utf8'), /host application evidence/);
  assert.equal(report.command, legacyCommand, 'Rebuilding delivery instructions must not rewrite saved verification evidence.');
});

test('delivery command discovery rejects a workspace without application test files', async t => {
  const input = await fixture(t, 'readme.txt', 'No executable tests.');
  await assert.rejects(() => verification.applicationTestRerunCommand(input.workspace), /test/i);
});

for (const filename of [
  'two words.test.mjs', "single'quote.test.mjs", 'double"quote.test.mjs',
  '$FLEET_COMMAND_PROBE.test.mjs', '$(touch dollar-marker).test.mjs',
  '`touch backtick-marker`.test.mjs', "line\nbreak'quote.test.mjs"
]) test('exported command preserves the literal test path ' + JSON.stringify(filename), posix, async t => {
  const { destination, result } = await exportedCommand(t, filename);
  const files = await fs.readdir(destination);
  assert.equal(files.includes('dollar-marker'), false, 'The command must not evaluate dollar command substitutions.');
  assert.equal(files.includes('backtick-marker'), false, 'The command must not evaluate backtick command substitutions.');
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /ok 1 - advertised application check/);
});

for (const [name, source] of [
  ['an empty module', ''],
  ['standalone assertions', "import assert from 'node:assert/strict'; assert.equal(2 + 2, 4);"],
  ['a skipped test', "import test from 'node:test'; test.skip('unfinished', () => {});"],
  ['a todo test', "import test from 'node:test'; test.todo('unfinished');"]
]) test('a runnable advertised command does not weaken host rejection of ' + name, async t => {
  const { workspace } = await fixture(t, 'unfinished.test.mjs', source);
  const report = await verifyWorkspace(workspace, process.execPath, () => {});
  assert.equal(reportPassed(report), false, JSON.stringify(report));
  if (name === 'an empty module' || name === 'standalone assertions') {
    assert.equal(report.exitCode, null);
    assert.match(report.output, /completed node:test cases in every test file/);
  } else assert.equal(report.skipped, 1);
});
