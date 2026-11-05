import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatedApplicationContract } from '../dist-electron/harness/application-policy.js';
import { phasePrompt, phasesForRecipe, resolvePhaseForRuntime, syntheticDataPhase } from '../dist-electron/harness/phases.js';
import { fleetStagePrompt } from '../dist-electron/harness/planner.js';
import { recipes } from '../dist-electron/harness/recipes.js';
import { foundationGuide } from '../dist-electron/harness/foundations.js';
import { prepareFleetWorkspace, assertFleetPacketIntegrity } from '../dist-electron/harness/integration.js';
import { briefDataPrompt, syntheticDataInstruction } from '../dist-electron/electron/brief-data.js';

const resourcesRoot = fileURLToPath(new URL('..', import.meta.url));

function assertNoOldFixtureInstructions(prompt) {
  for (const oldInstruction of [
    'Embed any needed example data into the self-contained index.html',
    'Embed needed fixture data into the self-contained index.html',
    'Keep synthetic provenance visible in the application and documentation',
    'planning, application sample data and tests',
    'A synthetic example with expected results that a first-time user can reproduce',
    'prepared input or synthetic sample data and the expected output, with accurate provenance',
    'use the prepared brief data for the actual application and acceptance tests'
  ]) assert.ok(!prompt.includes(oldInstruction), `Obsolete runtime fixture guidance: ${oldInstruction}`);
}

test('every agent phase and runtime carries the same application contract without duplicating it', () => {
  for (const recipe of Object.values(recipes)) {
    for (const phase of phasesForRecipe(recipe)) {
      for (const profile of ['browser', 'service', 'cli']) {
        const prompt = phasePrompt(resolvePhaseForRuntime(phase, profile));
        assert.equal(prompt.split(generatedApplicationContract).length - 1, phase.owner === 'agent' ? 1 : 0,
          `${recipe.id}/${phase.id}/${profile}`);
        assertNoOldFixtureInstructions(prompt);
      }
    }
  }
  assert.ok(phasePrompt(syntheticDataPhase).includes(generatedApplicationContract));
  assert.match(syntheticDataPhase.exit, /test inputs, never default application records/);
});

test('planning, build, verification and delivery keep product behavior separate from test inputs', () => {
  const plan = fleetStagePrompt('plan'), build = fleetStagePrompt('build'), verify = fleetStagePrompt('verify');
  assert.match(plan, /plugin\/connector interfaces/);
  assert.match(plan, /test records through explicit inputs instead of default runtime seed data/);
  assert.match(build, /do not load fictional records on normal startup/);
  assert.match(build, /setup\/disconnected states/);
  assert.match(verify, /unavailable operations do not fabricate live results or successful connections/);
  for (const prompt of [build, verify]) assert.match(prompt, /without synthetic-data, mock, demo or prototype branding/);
  assert.match(fleetStagePrompt('deliver'), /post-build implementation\/configuration steps/);
  for (const stage of ['intake', 'research', 'plan', 'build', 'verify', 'review', 'deliver']) {
    const prompt = fleetStagePrompt(stage);
    assertNoOldFixtureInstructions(prompt);
    assert.ok(!prompt.includes(generatedApplicationContract), 'The shared phase contract should not be repeated by stage guidance.');
  }
  assert.match(foundationGuide, /do not fetch it or prepared brief fixtures into normal application state at startup/);
  assertNoOldFixtureInstructions(foundationGuide);
});

test('supplied and generated brief data prompts preserve provenance without seeding the application', () => {
  for (const mode of ['provided', 'synthetic']) {
    const prompt = briefDataPrompt({ mode, files: ['inputs/manifest.json'], hash: 'fixture' });
    assertNoOldFixtureInstructions(prompt);
    assert.match(prompt, /(?:Do not embed example records|Never embed or preload these records) as default runtime data/);
    assert.match(prompt, /plugins and data connectors after the build/);
    assert.match(prompt, /provenance/);
  }
  assert.match(briefDataPrompt({ mode: 'provided', files: [], hash: '' }), /original contents and provenance/);
  const synthetic = briefDataPrompt({ mode: 'synthetic', files: [], hash: '' });
  assert.match(synthetic, /synthetic provenance in development documentation and evidence/);
  assert.match(synthetic, /real application with empty\/setup states/);
  assert.match(syntheticDataInstruction, /development and verification inputs only, never the default application data/);
  assert.match(syntheticDataInstruction, /"classification":"synthetic"/);
});

for (const supplied of [false, true]) {
  test(`standalone ${supplied ? 'supplied-input' : 'fixture-input'} workspaces carry an immutable application contract`, async t => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-application-policy-'));
    t.after(() => fs.rm(workspace, { recursive: true, force: true }));
    const prepared = await prepareFleetWorkspace({
      workspace, resourcesRoot, title: 'Revision workspace', description: 'Track and review local records.',
      criteria: ['Keep user edits'], dataInputs: supplied ? [{ name: 'records.csv', kind: 'file', content: 'id,value\n1,submitted\n' }] : []
    });
    const readmePath = path.join(workspace, '.fleet/README.md');
    const readme = await fs.readFile(readmePath, 'utf8');
    assert.ok(readme.includes(generatedApplicationContract));
    assert.match(prepared.context, /\.fleet\/README\.md/);
    assertNoOldFixtureInstructions(readme + prepared.context);
    const packet = JSON.parse(await fs.readFile(path.join(workspace, '.fleet/packet.json'), 'utf8'));
    assert.equal(packet.dataPolicy, supplied ? 'user-provided-or-synthetic' : 'synthetic-only');
    const fixtures = JSON.parse(await fs.readFile(path.join(workspace, '.fleet/fixtures.json'), 'utf8'));
    assert.equal(fixtures.classification, 'synthetic', 'Product copy policy must not erase honest fixture provenance.');
    for (const skill of ['fleet-intake', 'fleet-research', 'fleet-planning', 'fleet-ux', 'fleet-data', 'fleet-delivery', 'fleet-evidence']) {
      const content = await fs.readFile(path.join(workspace, '.fleet/skills', skill, 'SKILL.md'), 'utf8');
      assertNoOldFixtureInstructions(content);
      assert.match(content, /(?:plugin|connector)/i, `${skill} must retain the post-build integration boundary.`);
    }
    await assertFleetPacketIntegrity(workspace, prepared.packetHash);
    await fs.writeFile(readmePath, readme.replace(generatedApplicationContract, ''));
    await assert.rejects(assertFleetPacketIntegrity(workspace, prepared.packetHash), /integrity failed/);
  });
}
