import test from 'node:test';
import assert from 'node:assert/strict';
import { qualityFixture, qualityFixtureProject } from '../scripts/quality-fixture.mjs';
import { customPacket, packetFor } from '../dist-electron/harness/planner.js';
import { challenges } from '../dist-electron/harness/catalog.js';
import { newProject } from '../dist-electron/electron/storage.js';
import { starters } from '../dist-electron/shared/types.js';
import { parseQualityPlan } from '../dist-electron/harness/quality-contract.js';
import { startFixtureProvider } from '../scripts/mock-provider.mjs';

test('parser lifecycle fixture refuses starter and catalog acceptance inventories', () => {
  const starter = newProject(starters[0]);
  const id12 = challenges.find(item => item.id === '12');
  for (const inventory of [customPacket(starter).acceptance, packetFor(id12).acceptance, packetFor(id12, starter.criteria).acceptance]) {
    assert.throws(() => qualityFixture(inventory.map(item => item.id)), /only supports.*synthetic task parser/i);
  }
});

test('parser lifecycle fixture retains each recipe outcome as unverified', () => {
  const inventory = customPacket(qualityFixtureProject).acceptance;
  const plan = JSON.parse(qualityFixture(inventory.map(item => item.id))['acceptance-plan.json']);
  for (const criterion of inventory.filter(item => item.provenance.every(source => source.kind === 'recipe'))) {
    const result = plan.criteria.find(item => item.criterionId === criterion.id);
    assert.equal(result.disposition, 'deferred');
    assert.deepEqual(result.journeyIds, []);
    assert.equal(result.expectedOutcome, criterion.requirement);
  }
  assert.deepEqual(parseQualityPlan(plan, inventory), plan);
});

test('synthetic message-recipe lifecycle preserves message tools and deferred recipe outcomes', () => {
  const packet = customPacket(qualityFixtureProject, 'messages');
  assert.ok(packet.stages.find(item => item.id === 'build').tools.includes('fleet_extract_messages'));
  assert.equal(packet.stages.some(item => item.tools.includes('fleet_solve_schedule')), false);
  const plan = JSON.parse(qualityFixture(packet.acceptance.map(item => item.id))['acceptance-plan.json']);
  assert.deepEqual(parseQualityPlan(plan, packet.acceptance), plan);
  for (const criterion of packet.recipe.acceptance) {
    const result = plan.criteria.find(item => item.criterionId === criterion.id);
    assert.equal(result.expectedOutcome, criterion.requirement);
    assert.equal(result.disposition, 'deferred');
  }
});

test('local provider returns a bounded rejection for an unsupported catalog plan', async t => {
  const fixture = await startFixtureProvider();
  t.after(async () => { fixture.server.closeAllConnections(); await fixture.close(); });
  const ids = packetFor(challenges.find(item => item.id === '12')).acceptance.map(item => item.id);
  const response = await fetch(fixture.baseUrl + '/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(2000),
    body: JSON.stringify({ messages: [{ role: 'user', content: 'You are the planning agent.\nAcceptance IDs: ' + ids.join(', ') }] })
  });
  assert.equal(response.status, 422);
  assert.match(await response.text(), /only supports.*synthetic task parser/i);
});
