import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadQualityContract, assertQualityContract } from '../dist-electron/electron/quality.js';
import { solutionFixture, structuredSolutionFixture } from '../scripts/solution-fixture.mjs';

const acceptance = [{ id: 'R1', requirement: 'Parse a task message and recover from invalid input.', method: 'automated', scenario: 'Parse and review a saved task.' }];
async function workspace(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-ux-planning-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await Promise.all(Object.entries(files).map(([name, body]) => fs.writeFile(path.join(root, name), body)));
  return root;
}

test('live browser planning requires screen structure while saved v1 contracts remain usable', async t => {
  const root = await workspace(t, solutionFixture(['R1']));
  const saved = await loadQualityContract(root, acceptance, true);
  assert.equal(saved.ux.schemaVersion, 1);
  await assert.rejects(loadQualityContract(root, acceptance, true, { requireStructuredUi: true }), /schemaVersion 2/);
  await assertQualityContract(root, saved);
  assert.equal((await loadQualityContract(root, acceptance, true)).hash, saved.hash);
});

test('structured browser plans freeze the screen map and navigation checks with domain expectations', async t => {
  const root = await workspace(t, structuredSolutionFixture(['R1']));
  const saved = await loadQualityContract(root, acceptance, true, { requireStructuredUi: true });
  assert.equal(saved.ux.schemaVersion, 2);
  assert.equal(saved.plan.journeys[0].steps[0].action, 'expectScreen');
  await assertQualityContract(root, saved);
  const ux = JSON.parse(await fs.readFile(path.join(root, 'ux-spec.json'), 'utf8'));
  ux.screens[0].route = '/different.html';
  await fs.writeFile(path.join(root, 'ux-spec.json'), JSON.stringify(ux));
  await assert.rejects(assertQualityContract(root, saved), /changed after planning/);
});

test('a valid UX file alone cannot freeze an untested screen map', async t => {
  const files = structuredSolutionFixture(['R1']);
  const ux = JSON.parse(files['ux-spec.json']);
  ux.screens.push({ ...ux.screens[0], id: 'history', name: 'History', route: '/history.html', selector: '#history-screen' });
  files['ux-spec.json'] = JSON.stringify(ux);
  const root = await workspace(t, files);
  await assert.rejects(loadQualityContract(root, acceptance, true, { requireStructuredUi: true }), /Missing screens: history/);
});

test('CLI planning retains its original UX format and requires no artificial screens', async t => {
  const files = solutionFixture(['R1']);
  const solution = JSON.parse(files['solution-contract.json']), plan = JSON.parse(files['acceptance-plan.json']);
  solution.runtime = { profile: 'cli', files: ['evaluate.cjs', 'core.cjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'evaluate.cjs', args: [] } };
  plan.journeys = [];
  plan.criteria.forEach(criterion => { criterion.journeyIds = []; });
  files['solution-contract.json'] = JSON.stringify(solution);
  files['acceptance-plan.json'] = JSON.stringify(plan);
  const root = await workspace(t, files);
  assert.equal((await loadQualityContract(root, acceptance, true, { requireStructuredUi: true })).ux.schemaVersion, 1);
});
