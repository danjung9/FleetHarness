// Real containment proofs for the outside-sandbox QA loop.
// Run after Electron compilation: node scripts/smoke-sandbox.mjs
// No injected launcher, skips or fallback. Startup errors fail this script.
import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';

async function workspace(t, source, filename = 'app.test.cjs') {
  const root = await fs.mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'fleet-verification-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.dirname(path.join(root, filename)), { recursive: true });
  await fs.writeFile(path.join(root, filename), source);
  return root;
}

test('generated tests cannot read a synthetic home canary outside their workspace', { timeout: 20000 }, async t => {
  // This script creates and reads only its own synthetic home canary.
  const home = await fs.mkdtemp(path.join(os.homedir(), '.appyard-synthetic-home-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const canary = path.join(home, 'synthetic-home-canary.txt');
  await fs.writeFile(canary, 'synthetic data only');
  const root = await workspace(t, `require('node:test')('outside read', () => require('node:fs').readFileSync(${JSON.stringify(canary)}, 'utf8'));`);
  // Generated project configuration must not be able to relax the app-owned profile.
  await fs.mkdir(path.join(root, '.codex'));
  await fs.writeFile(path.join(root, '.codex', 'config.toml'), 'sandbox_mode="danger-full-access"\n[permissions.fleet-build.filesystem]\n":root"="write"\n[permissions.fleet-build.network]\nenabled=true\n');
  const report = await verifyWorkspace(root, process.execPath, () => {}, undefined, { timeoutMs: 10000 });
  assert.equal(report.total, 1, report.output);
  assert.equal(report.failed, 1, report.output);
  assert.notEqual(report.exitCode, 0);
  assert.equal(reportPassed(report), false, 'Reading outside the workspace must fail.');
  assert.match(report.output, /EACCES|EPERM|Operation not permitted|Permission denied/);
});

test('generated tests cannot open a network socket', { timeout: 20000 }, async t => {
  const root = await workspace(t, `require('node:test')('network', async () => {
    const server = require('node:net').createServer();
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    server.close();
  });`);
  const report = await verifyWorkspace(root, process.execPath, () => {}, undefined, { timeoutMs: 10000 });
  assert.equal(report.total, 1, report.output);
  assert.equal(report.failed, 1, report.output);
  assert.notEqual(report.exitCode, 0);
  assert.equal(reportPassed(report), false);
  assert.match(report.output, /EACCES|EPERM|Operation not permitted|Permission denied/);
});

test('generated tests cannot connect to the network', { timeout: 20000 }, async t => {
  const root = await workspace(t, `require('node:test')('network connection', async () => {
    const socket = require('node:net').connect({ host: '127.0.0.1', port: 9 });
    await new Promise((resolve, reject) => { socket.once('error', reject); socket.once('connect', () => { socket.destroy(); resolve(); }); });
  });`);
  const report = await verifyWorkspace(root, process.execPath, () => {}, undefined, { timeoutMs: 10000 });
  assert.equal(report.total, 1, report.output);
  assert.equal(report.failed, 1, report.output);
  assert.notEqual(report.exitCode, 0);
  assert.equal(reportPassed(report), false);
  assert.match(report.output, /EACCES|EPERM|Operation not permitted|Permission denied/);
});

test('workspace-only reads and writes pass inside the sandbox', { timeout: 20000 }, async t => {
  const root = await workspace(t, `require('node:test')('workspace IO', () => {
    const fs = require('node:fs');
    fs.writeFileSync('synthetic-result.txt', 'synthetic workspace data');
    require('node:assert/strict').equal(fs.readFileSync('synthetic-result.txt', 'utf8'), 'synthetic workspace data');
    fs.unlinkSync('synthetic-result.txt');
  });`);
  const report = await verifyWorkspace(root, process.execPath, () => {}, undefined, { timeoutMs: 10000 });
  assert.equal(reportPassed(report), true, report.output);
  assert.equal(report.passed, 1);
  assert.match(report.command, /sandbox/);
});
