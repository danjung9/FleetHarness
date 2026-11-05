import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { captureTestBaseline, restoreTestBaseline, assertTestBaseline } from '../dist-electron/electron/test-baseline.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';

// Only the launcher is replaced. The real Node coordinator,
// registered-case reporter and verifier execute the synthetic application tests.
// This fixture makes no claim about production launcher or process-scanner behavior.
const nodeLauncher = (_root, executable, args) => {
  const ready = 'synthetic-baseline-runtime-ready\n';
  return { runner: executable, ready, command: 'synthetic direct Node launcher',
    args: ['--input-type=commonjs', '-e', `process.stdout.write(${JSON.stringify(ready)});const c=require('node:child_process').spawn(process.execPath,${JSON.stringify(args)},{stdio:'inherit'});c.on('exit',code=>process.exitCode=code??1);`] };
};
async function workspace(t) {
  await fs.mkdir('.tmp', { recursive: true });
  const root = await fs.mkdtemp(path.resolve('.tmp/repair-baseline-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const original = "const test=require('node:test'),assert=require('node:assert/strict');const add=require('./core.cjs');test('adds both amounts',()=>assert.equal(add(2,3),5));";

test('repair cannot replace a failing baseline assertion, but repaired code and additional tests pass', async t => {
  const root = await workspace(t);
  await fs.writeFile(path.join(root, 'core.cjs'), 'module.exports=(a,b)=>a;');
  await fs.writeFile(path.join(root, 'core.test.cjs'), original);
  const baseline = await captureTestBaseline(root);
  const verify = () => verifyWorkspace(root, process.execPath, () => {}, undefined, { launcher: nodeLauncher });
  const before = await verify();
  assert.equal(before.failed, 1); assert.equal(reportPassed(before), false);
  const checkpoint = JSON.parse(JSON.stringify({ buildTests: baseline.hashes, buildTestContents: baseline.contents,
    lastTests: baseline.hashes, testChanges: [] }));
  const project = { workspace: root, logs: [], runCheckpoint: checkpoint };
  const backend = new FleetBackend({ save: async () => {} }, process.execPath, () => {}, process.cwd());
  await fs.writeFile(path.join(root, 'core.test.cjs'), original.replace('add(2,3),5', 'add(2,3),2'));
  await backend.recordTestChanges(project, 'verify');
  assert.equal(await fs.readFile(path.join(root, 'core.test.cjs'), 'utf8'), original);
  assert.match(checkpoint.testChanges.join('\n'), /modified: core.test.cjs/);
  const unchanged = await verify();
  assert.equal(unchanged.failed, 1); assert.equal(reportPassed(unchanged), false);
  await fs.writeFile(path.join(root, 'core.cjs'), 'module.exports=(a,b)=>a+b;');
  await fs.writeFile(path.join(root, 'negative.test.cjs'), "require('node:test')('negative amount',()=>require('node:assert/strict').equal(require('./core.cjs')(-2,3),1));");
  await backend.recordTestChanges(project, 'repair');
  const repaired = await verify();
  assert.equal(reportPassed(repaired), true); assert.equal(repaired.total, 2);
  assert.deepEqual(repaired.registeredTests, [{ file: 'core.test.cjs', tests: 1 }, { file: 'negative.test.cjs', tests: 1 }]);
  project.report = repaired;
  backend.appendTestChanges(project);
  assert.deepEqual(repaired.testBaseline.hashes, baseline.hashes);
  assert.match(repaired.testBaseline.policy, /explicit contract revision/);
  assert.match(repaired.output, /modified: core.test.cjs/);
});

test('deleted baseline tests are restored and a missing or corrupted host baseline cannot be replaced', async t => {
  const root = await workspace(t);
  await fs.mkdir(path.join(root, 'tests'));
  await fs.writeFile(path.join(root, 'tests/core.test.cjs'), original);
  const baseline = await captureTestBaseline(root);
  await fs.rm(path.join(root, 'tests'), { recursive: true });
  assert.deepEqual(await restoreTestBaseline(root, baseline.hashes, baseline.contents), ['tests/core.test.cjs']);
  assert.equal(await fs.readFile(path.join(root, 'tests/core.test.cjs'), 'utf8'), original);
  assert.throws(() => assertTestBaseline(baseline.hashes), /baseline is missing/);
  assert.throws(() => assertTestBaseline(baseline.hashes, { 'tests/core.test.cjs': Buffer.from('weakened').toString('base64') }), /baseline is invalid/);
});

test('baseline restoration replaces a file link without following it and rejects linked parents', async t => {
  const root = await workspace(t), elsewhere = await workspace(t);
  await fs.writeFile(path.join(root, 'core.test.cjs'), original);
  const baseline = await captureTestBaseline(root);
  await fs.writeFile(path.join(elsewhere, 'untouched.txt'), 'untouched');
  await fs.rm(path.join(root, 'core.test.cjs'));
  await fs.symlink(path.join(elsewhere, 'untouched.txt'), path.join(root, 'core.test.cjs'));
  await restoreTestBaseline(root, baseline.hashes, baseline.contents);
  assert.equal(await fs.readFile(path.join(elsewhere, 'untouched.txt'), 'utf8'), 'untouched');
  assert.equal((await fs.lstat(path.join(root, 'core.test.cjs'))).isSymbolicLink(), false);
  await fs.mkdir(path.join(root, 'tests'));
  await fs.writeFile(path.join(root, 'tests/extra.test.cjs'), original);
  const nested = await captureTestBaseline(root);
  await fs.rm(path.join(root, 'tests'), { recursive: true });
  await fs.symlink(elsewhere, path.join(root, 'tests'));
  await assert.rejects(restoreTestBaseline(root, nested.hashes, nested.contents), /real workspace directory/);
  assert.deepEqual(await fs.readdir(elsewhere), ['untouched.txt']);
});
