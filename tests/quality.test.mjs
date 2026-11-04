import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { qualityFixture } from '../scripts/quality-fixture.mjs';
import { loadQualityContract, assertQualityContract } from '../dist-electron/electron/quality.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { sourceHash } from '../dist-electron/electron/storage.js';

test('frozen quality contract rejects changed expected outcomes and UX behavior', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-quality-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = qualityFixture(['R1']);
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(root, name), body);
  const contract = await loadQualityContract(root, [{ id: 'R1', requirement: 'Parse tasks', method: 'automated', scenario: 'Example task' }]);
  await assertQualityContract(root, contract);
  for (const name of Object.keys(files)) {
    await fs.appendFile(path.join(root, name), ' ');
    await assert.rejects(assertQualityContract(root, contract), /changed after planning/);
    await fs.writeFile(path.join(root, name), files[name]);
  }
});

test('quality gate rejects missing or failed browser evidence and preserves legacy reports', () => {
  const report = { exitCode: 0, total: 2, passed: 2, failed: 0, skipped: 0 };
  assert.equal(reportPassed(report), true);
  assert.equal(reportPassed(report, true), false);
  const quality = { schemaVersion: 1, status: 'passed', errors: [], journeys: [{ status: 'passed' }], criteria: [{ status: 'passed' }, { status: 'unverified' }] };
  assert.equal(reportPassed({ ...report, quality }, true), true);
  assert.equal(reportPassed({ ...report, quality: { ...quality, journeys: [] } }, true), false);
  assert.equal(reportPassed({ ...report, quality: { ...quality, journeys: [{ status: 'failed' }] } }, true), false);
  assert.equal(reportPassed({ ...report, quality: { ...quality, criteria: [{ status: 'unverified' }] } }, true), false);
  assert.equal(reportPassed({ ...report, quality: { ...quality, errors: ['Browser unavailable'] } }, true), false);
});

test('browser evidence is excluded only during execution and bound to delivery source hash', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-evidence-hash-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'index.html'), '<h1>App</h1>');
  const before = await sourceHash(root), executionHash = await sourceHash(root, { excludeEvidence: true });
  await fs.mkdir(path.join(root, '.quality-evidence')); await fs.writeFile(path.join(root, '.quality-evidence', 'desktop.png'), 'screenshot');
  assert.equal(await sourceHash(root, { excludeEvidence: true }), executionHash);
  assert.notEqual(await sourceHash(root), before);
  const verified = await sourceHash(root);
  await fs.writeFile(path.join(root, '.quality-evidence', 'desktop.png'), 'tampered screenshot');
  assert.notEqual(await sourceHash(root), verified);
});
