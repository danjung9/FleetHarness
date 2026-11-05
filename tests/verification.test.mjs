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

function assertKilled([code, signal]) {
  if (process.platform === 'win32') { assert.notEqual(code, 0); assert.equal(signal, null); }
  else { assert.equal(code, null); assert.equal(signal, 'SIGKILL'); }
}

const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } };

test('cancellation at process handoff is observed and terminates the child', { timeout: 5000 }, async t => {
  const root = await workspace(t, 'setInterval(() => {}, 1000);'), controller = new AbortController();
  let exited;
  await assert.rejects(verifyWorkspace(root, process.execPath, child => { exited = once(child, 'exit'); controller.abort(); }, controller.signal), /Run stopped/);
  assertKilled(await exited);
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
  assertKilled(await exited);
});

for (const reason of ['cancellation', 'timeout', 'output']) {
  test(`${reason} terminates the test worker and its descendant before returning`, { timeout: 10000 }, async t => {
    const root = await workspace(t, `
      const { spawn } = require('node:child_process');
      const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
      console.log('TREE_PIDS=' + process.pid + ',' + descendant.pid);
      setInterval(() => { ${reason === 'output' ? 'process.stdout.write("x".repeat(4096));' : ''} }, 5);
    `);
    const controller = new AbortController(); let observed = '', parent, closed = false;
    const verify = verifyWorkspace(root, process.execPath, child => {
      parent = child.pid;
      child.once('close', () => { closed = true; });
      child.stdout.on('data', chunk => {
        if (observed.length < 4096) observed += chunk.toString();
        if (reason === 'cancellation' && /TREE_PIDS=\d+,\d+/.test(observed)) controller.abort();
      });
    }, controller.signal, { timeoutMs: 1500, maxOutputBytes: 8192 });
    if (reason === 'cancellation') await assert.rejects(verify, /Run stopped/);
    else {
      const report = await verify;
      assert.equal(reportPassed(report), false); assert.equal(report.exitCode, null);
      assert.match(report.output, reason === 'timeout' ? /1.5-second limit/ : /output limit/);
    }
    assert.equal(closed, true, 'verification must observe the coordinator close before settling');
    const match = observed.match(/TREE_PIDS=(\d+),(\d+)/);
    assert.ok(match, 'fixture must start both the test worker and its descendant');
    const pids = [parent, Number(match[1]), Number(match[2])];
    // Unix reaps killed grandchildren asynchronously. No process may survive.
    const deadline = Date.now() + 2000;
    while (pids.some(alive) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(pids.filter(alive), [], 'verification left a worker or descendant running');
  });
}

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

test('toolkit checks and empty files cannot replace application tests', async t => {
  const root = await workspace(t, 'require("node:test")("toolkit only", () => {});', '.fleet/toolkit/reference.test.cjs');
  await fs.writeFile(path.join(root, 'empty.test.cjs'), '');
  await assert.rejects(verifyWorkspace(root, process.execPath, () => {}), /did not produce/);
});

test('test filenames containing spaces are passed as single paths', async t => {
  const root = await workspace(t, 'require("node:test")("real assertion", () => require("node:assert/strict").deepEqual([1, 2].slice(1), [2]));', 'special name.test.cjs');
  const report = await verifyWorkspace(root, process.execPath, () => {});
  assert.equal(reportPassed(report), true); assert.equal(report.passed, 1);
});
