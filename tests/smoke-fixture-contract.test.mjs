import test from 'node:test';
import assert from 'node:assert/strict';
import { qualityFixture, qualityFixtureProject } from '../scripts/quality-fixture.mjs';
import { customPacket, packetFor } from '../dist-electron/harness/planner.js';
import { challenges } from '../dist-electron/harness/catalog.js';
import { newProject } from '../dist-electron/electron/storage.js';
import { starters } from '../dist-electron/shared/types.js';
import { parseQualityPlan } from '../dist-electron/harness/quality-contract.js';
import { startFixtureProvider } from '../scripts/mock-provider.mjs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadQualityContract } from '../dist-electron/electron/quality.js';

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

test('the actual smoke provider supplies acceptance v2, the required solution and an evaluator connected to the delivered app', async t => {
  const parent = path.resolve('output/connectors-unit'); await fs.mkdir(parent, { recursive: true });
  const workspace = await fs.mkdtemp(path.join(parent, 'smoke-contract-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const fixture = await startFixtureProvider();
  t.after(async () => { fixture.server.closeAllConnections(); await fixture.close(); });
  const acceptance = customPacket(qualityFixtureProject).acceptance;
  async function turn(prompt) {
    const response = await fetch(fixture.baseUrl + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2000), body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }) });
    assert.equal(response.status, 200);
    const chunks = (await response.text()).split('\n').filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)));
    const writes = chunks.flatMap(chunk => chunk.choices[0].delta.tool_calls ?? []).filter(call => call.function.name === 'write');
    assert.ok(writes.length > 0);
    for (const call of writes) {
      const input = JSON.parse(call.function.arguments);
      assert.equal(path.basename(input.path), input.path);
      await fs.writeFile(path.join(workspace, input.path), input.content);
    }
  }
  await turn('You are the planning agent.\nAcceptance IDs: ' + acceptance.map(item => item.id).join(', '));
  const contract = await loadQualityContract(workspace, acceptance, true);
  assert.equal(contract.plan.schemaVersion, 2); assert.equal(contract.solution.runtime.profile, 'browser');
  assert.equal(contract.solution.capabilities[0].required, true);
  assert.equal(contract.evaluation.evaluations[0].cases.length, 4);
  for (const criterion of acceptance.filter(item => item.provenance.every(source => source.kind === 'recipe'))) {
    assert.equal(contract.plan.criteria.find(item => item.criterionId === criterion.id).disposition, 'deferred');
  }
  await turn('You are the implementation agent.');
  for (const example of contract.evaluation.evaluations[0].cases) {
    const result = spawnSync(process.execPath, [contract.solution.runtime.evaluator.entrypoint], { cwd: workspace, input: JSON.stringify(example.input), encoding: 'utf8', timeout: 2000 });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), example.expected);
  }
  // Removing the delivered implementation must break evaluation, rather than
  // silently running a second implementation kept only in the test harness.
  await fs.writeFile(path.join(workspace, 'index.html'), '<h1>Missing parser</h1>');
  const missing = spawnSync(process.execPath, [contract.solution.runtime.evaluator.entrypoint], { cwd: workspace, input: JSON.stringify('TASK: inspect pump'), encoding: 'utf8', timeout: 2000 });
  assert.notEqual(missing.status, 0); assert.match(missing.stderr, /Delivered parser core missing/);
});
