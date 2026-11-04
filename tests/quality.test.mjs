import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { qualityFixture, qualityFixtureHtml, qualityFixtureProject } from '../scripts/quality-fixture.mjs';
import { loadQualityContract, assertQualityContract } from '../dist-electron/electron/quality.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { sourceHash } from '../dist-electron/electron/storage.js';

test('shared parser fixture preserves primary approval deferral with synthetic journey evidence', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-fixture-contract-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const acceptance = [
    { id: 'UCcustom-1', requirement: 'Parse a synthetic task and recover from empty input.', method: 'integration', scenario: 'Parse and reload a task.' },
    { id: 'UCcustom-2', requirement: 'Publication of the synthetic review draft requires owner approval.', method: 'integration', scenario: 'Review a local draft without publishing it.' }
  ];
  assert.deepEqual(qualityFixtureProject.criteria, acceptance.map(item => item.requirement));
  for (const [name, body] of Object.entries(qualityFixture(acceptance.map(item => item.id)))) await fs.writeFile(path.join(root, name), body);
  const { plan } = await loadQualityContract(root, acceptance);
  assert.equal(plan.criteria[1].disposition, 'deferred');
  assert.deepEqual(plan.criteria[1].journeyIds, []);
  assert.match(plan.criteria[1].reason, /^human-authority:/);
  const expected = 'Synthetic review draft: inspect pump. Publication requires owner approval.';
  assert.ok(plan.journeys.some(journey => journey.kind === 'primary' && journey.steps.some(step => step.action === 'expectText' && step.text === expected)), 'The deferred publication needs a checked synthetic review draft.');

  // Run the delivered fixture script with a tiny DOM/storage adapter, without a browser claim.
  const storage = new Map();
  const load = () => {
    const elements = Object.fromEntries(['message', 'parse', 'result', 'review', 'review-result'].map(id => [id, { value: '', textContent: '' }]));
    const script = /<script>([\s\S]*?)<\/script>/.exec(qualityFixtureHtml)[1];
    runInNewContext(script, { document: { getElementById: id => elements[id] }, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } });
    return elements;
  };
  let app = load();
  app.message.value = 'TASK: inspect pump'; app.parse.onclick();
  assert.equal(app.result.textContent, 'inspect pump');
  app.review.onclick(); assert.equal(app['review-result'].textContent, expected);
  app = load(); assert.equal(app.result.textContent, 'inspect pump');
  assert.equal(app['review-result'].textContent, expected);
  app.message.value = 'TASK: inspect valve'; app.parse.onclick();
  assert.equal(app.result.textContent, 'inspect valve');
  assert.equal(app['review-result'].textContent, '', 'Changing a task invalidates the old review.');
  app.review.onclick();
  assert.equal(app['review-result'].textContent, 'Synthetic review draft: inspect valve. Publication requires owner approval.');
  app.message.value = ''; app.parse.onclick();
  assert.equal(app.result.textContent, 'Enter a message.');
  assert.equal(app['review-result'].textContent, '');
  app.review.onclick(); assert.equal(app['review-result'].textContent, '', 'Invalid input cannot create a review draft.');
});

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
