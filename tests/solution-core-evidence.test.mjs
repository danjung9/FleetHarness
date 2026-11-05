import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { retainCoreReport, restoreCoreReport } from '../dist-electron/electron/core-evidence.js';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-core-evidence-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const hostRoot = path.join(root, 'host'), workspace = path.join(root, 'workspace');
  await fs.mkdir(hostRoot);
  await fs.mkdir(workspace);
  return { root, hostRoot, workspace, mirror: path.join(workspace, '.quality-evidence', 'core-report.json'),
    snapshot: hash => path.join(hostRoot, 'core-reports', hash + '.json') };
}

const report = '{\n  "status": "passed",\n  "evaluations": [{"id":"exact","detail":"UTF-8 evidence: café ✓","actual":1}]\n}\n';

test('core report retention publishes only private host bytes and repairs the exact agent-modified mirror', async t => {
  const f = await fixture(t), hash = await retainCoreReport(f.hostRoot, f.workspace, report);
  assert.equal(hash, createHash('sha256').update(report).digest('hex'));
  assert.equal(await fs.readFile(f.snapshot(hash), 'utf8'), report);
  await assert.rejects(fs.access(f.mirror), { code: 'ENOENT' });

  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, hash), true);
  assert.equal(await fs.readFile(f.mirror, 'utf8'), report);
  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, hash), false);

  await fs.writeFile(f.mirror, JSON.stringify({ status: 'local-tests-passed-host-core-pass-reported', tests: 7, passed: 7 }));
  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, hash), true);
  assert.equal(await fs.readFile(f.mirror, 'utf8'), report, 'Agent notes must not alter the host verdict or its exact serialized evidence');
  assert.equal(await fs.readFile(f.snapshot(hash), 'utf8'), report);
});

test('a deleted core report is recovered from host evidence without rerunning evaluation', async t => {
  const f = await fixture(t), hash = await retainCoreReport(f.hostRoot, f.workspace, report);
  await restoreCoreReport(f.hostRoot, f.workspace, hash);
  await fs.unlink(f.mirror);
  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, hash), true);
  assert.equal(await fs.readFile(f.mirror, 'utf8'), report);
  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, hash), false);
});

test('legacy checkpoints without a host hash neither trust nor replace workspace evidence', async t => {
  const f = await fixture(t), untrusted = '{"status":"agent-claimed-pass"}';
  await fs.mkdir(path.dirname(f.mirror));
  await fs.writeFile(f.mirror, untrusted);
  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace), false);
  assert.equal(await fs.readFile(f.mirror, 'utf8'), untrusted);
  await assert.rejects(fs.access(path.join(f.hostRoot, 'core-reports')), { code: 'ENOENT' });
});

for (const damage of ['missing', 'corrupt']) test(`${damage} private core evidence cannot be replaced by an agent's workspace claim`, async t => {
  const f = await fixture(t), hash = await retainCoreReport(f.hostRoot, f.workspace, report);
  await restoreCoreReport(f.hostRoot, f.workspace, hash);
  const untrusted = '{"status":"agent-claimed-pass"}';
  await fs.writeFile(f.mirror, untrusted);
  if (damage === 'missing') await fs.unlink(f.snapshot(hash));
  else await fs.writeFile(f.snapshot(hash), '{"status":"changed-private-report"}');

  await assert.rejects(restoreCoreReport(f.hostRoot, f.workspace, hash));
  assert.equal(await fs.readFile(f.mirror, 'utf8'), untrusted, 'Without valid host evidence, restoration must fail without fabricating a verdict');
});

test('replacing a core-report leaf symlink preserves the symlink target', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t), hash = await retainCoreReport(f.hostRoot, f.workspace, report);
  const target = path.join(f.root, 'unrelated.json'), original = '{"keep":"unrelated file"}';
  await fs.writeFile(target, original);
  await fs.mkdir(path.dirname(f.mirror));
  await fs.symlink(target, f.mirror);

  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, hash), true);
  assert.equal((await fs.lstat(f.mirror)).isSymbolicLink(), false);
  assert.equal(await fs.readFile(f.mirror, 'utf8'), report);
  assert.equal(await fs.readFile(target, 'utf8'), original);
});

test('a symlinked evidence directory cannot redirect host restoration outside the workspace', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t), hash = await retainCoreReport(f.hostRoot, f.workspace, report);
  const elsewhere = path.join(f.root, 'elsewhere'), original = '{"keep":"external report"}';
  await fs.mkdir(elsewhere);
  await fs.writeFile(path.join(elsewhere, 'core-report.json'), original);
  await fs.symlink(elsewhere, path.dirname(f.mirror), 'dir');

  await assert.rejects(restoreCoreReport(f.hostRoot, f.workspace, hash));
  assert.equal(await fs.readFile(path.join(elsewhere, 'core-report.json'), 'utf8'), original);
  assert.equal((await fs.lstat(path.dirname(f.mirror))).isSymbolicLink(), true);
});

test('failed and repaired host reports remain independently recoverable for interrupted checkpoints', async t => {
  const f = await fixture(t), failed = '{"status":"failed","evaluations":[{"actual":0,"detail":"wrong response shape"}]}\n';
  const failedHash = await retainCoreReport(f.hostRoot, f.workspace, failed);
  await restoreCoreReport(f.hostRoot, f.workspace, failedHash);
  const passedHash = await retainCoreReport(f.hostRoot, f.workspace, report);
  assert.notEqual(failedHash, passedHash);
  assert.equal(await fs.readFile(f.mirror, 'utf8'), failed, 'Retaining a new result must not silently advance the public mirror');

  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, passedHash), true);
  assert.equal(await fs.readFile(f.mirror, 'utf8'), report);
  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, failedHash), true);
  assert.equal(await fs.readFile(f.mirror, 'utf8'), failed, 'A checkpoint interrupted before advancing its hash must retain its own genuine host evidence');
  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, passedHash), true);
  assert.equal(await fs.readFile(f.mirror, 'utf8'), report);
  assert.equal(await fs.readFile(f.snapshot(failedHash), 'utf8'), failed);
  assert.equal(await fs.readFile(f.snapshot(passedHash), 'utf8'), report);
});

test('core report bodies larger than the checkpoint budget remain external and restore without truncation', async t => {
  const f = await fixture(t), large = JSON.stringify({ status: 'passed', evaluations: [{ output: 'x'.repeat(8 * 1024 * 1024) }] });
  assert.ok(Buffer.byteLength(large) > 8 * 1024 * 1024);
  const hash = await retainCoreReport(f.hostRoot, f.workspace, large);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal((await fs.stat(f.snapshot(hash))).size, Buffer.byteLength(large));
  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, hash), true);
  assert.equal(await fs.readFile(f.mirror, 'utf8'), large);
  assert.equal(await restoreCoreReport(f.hostRoot, f.workspace, hash), false);
});
