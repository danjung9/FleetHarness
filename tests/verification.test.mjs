import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';

async function workspace(t, source, filename = 'app.test.cjs') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-verification-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.dirname(path.join(root, filename)), { recursive: true });
  await fs.writeFile(path.join(root, filename), source);
  return root;
}

test('cancellation at process handoff is observed and terminates the child', { timeout: 5000 }, async t => {
  const root = await workspace(t, 'setInterval(() => {}, 1000);'), controller = new AbortController();
  let exited;
  await assert.rejects(verifyWorkspace(root, process.execPath, child => { exited = once(child, 'exit'); controller.abort(); }, controller.signal), /Run stopped/);
  const [code, signal] = await exited; assert.equal(code, null); assert.equal(signal, 'SIGKILL');
});

test('already cancelled verification never launches a process', async t => {
  const root = await workspace(t, 'setInterval(() => {}, 1000);'), controller = new AbortController(); controller.abort();
  await assert.rejects(verifyWorkspace(root, process.execPath, () => assert.fail('Must not spawn'), controller.signal), /Run stopped/);
});

test('a hanging test produces bounded failure evidence and is killed', { timeout: 5000 }, async t => {
  const root = await workspace(t, 'setInterval(() => {}, 1000);'); let exited;
  const report = await verifyWorkspace(root, process.execPath, child => { exited = once(child, 'exit'); }, undefined, { timeoutMs: 150 });
  assert.equal(reportPassed(report), false); assert.equal(report.exitCode, null);
  assert.match(report.output, /exceeded the 0.15-second limit/);
  const [code, signal] = await exited; assert.equal(code, null); assert.equal(signal, 'SIGKILL');
});

test('unbounded test output cannot hold the runner or count as success', { timeout: 5000 }, async t => {
  const root = await workspace(t, 'setInterval(() => process.stdout.write("x".repeat(4096)), 1);');
  const report = await verifyWorkspace(root, process.execPath, () => {}, undefined, { timeoutMs: 1000, maxOutputBytes: 8192 });
  assert.equal(reportPassed(report), false); assert.equal(report.exitCode, null);
  assert.match(report.output, /exceeded the output limit/); assert.ok(report.output.length < 8300);
});

test('source mutation during verification blocks review even when tests pass', async t => {
  const root = await workspace(t, 'require("node:test")("mutates", () => require("node:fs").writeFileSync("core.cjs", "changed"));');
  await fs.writeFile(path.join(root, 'core.cjs'), 'original');
  await assert.rejects(verifyWorkspace(root, process.execPath, () => {}), /Source files changed/);
});

test('spawn errors settle with a useful failure', async t => {
  const root = await workspace(t, 'require("node:test")("exists", () => {});');
  await assert.rejects(verifyWorkspace(root, path.join(root, 'missing-node'), () => {}), /ENOENT/);
});

test('toolkit checks, browser observations and empty files cannot replace application tests', async t => {
  const root = await workspace(t, 'require("node:test")("toolkit only", () => {});', '.fleet/toolkit/reference.test.cjs');
  await fs.mkdir(path.join(root, '.browser-observations', 'session'), { recursive: true });
  await fs.writeFile(path.join(root, '.browser-observations', 'session', 'snapshot.test.mjs'), 'throw new Error("This is not an application test");');
  await assert.rejects(verifyWorkspace(root, process.execPath, () => {}), /did not produce/);
  await fs.writeFile(path.join(root, 'empty.test.cjs'), '');
  const report = await verifyWorkspace(root, process.execPath, () => {});
  assert.equal(reportPassed(report), false);
  assert.equal(report.passed, 0);
  assert.equal(report.exitCode, null);
  assert.match(report.output, /completed node:test cases in every test file/);
});

test('test filenames containing spaces are passed as single paths', async t => {
  const root = await workspace(t, 'require("node:test")("real assertion", () => require("node:assert/strict").deepEqual([1, 2].slice(1), [2]));', 'special name.test.cjs');
  const report = await verifyWorkspace(root, process.execPath, () => {});
  assert.equal(reportPassed(report), true); assert.equal(report.passed, 1);
});
