import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { customPacket, packetFor } from '../harness/planner.js';
import { prepareFleetWorkspace, assertFleetPacketIntegrity } from '../harness/integration.js';
import { parseQualityPlan } from '../harness/quality-contract.js';
import type { QualityPlan } from '../shared/quality.js';

const description = 'Import a synthetic CSV and export the sum of its amount column.';
const steps = [{ action: 'click' as const, selector: '#run' }, { action: 'expectText' as const, selector: '#result', text: 'Sum: 5' }];
const planFor = (ids: string[]): QualityPlan => ({ schemaVersion: 1,
  criteria: ids.map(criterionId => ({ criterionId, disposition: 'implemented', expectedOutcome: 'Sum: 5', journeyIds: ['primary', 'recovery'] })),
  journeys: [{ id: 'primary', kind: 'primary', title: 'Sum fresh input', steps }, { id: 'recovery', kind: 'recovery', title: 'Recover input', steps }] });

test('a prose-only brief freezes its exact requirement and rejects recipe-only coverage', () => {
  const packet = customPacket({ title: 'Synthetic totals', description, criteria: [] });
  const source = packet.acceptance.find(item => item.requirement === description)!;
  assert.ok(source);
  assert.deepEqual(source.provenance, [{ kind: 'summary', id: 'SUMMARYcustom-1', path: `challenge.summary[0:${description.length}]` }]);
  const incomplete = planFor(packet.acceptance.filter(item => item.id !== source.id).map(item => item.id));
  assert.throws(() => parseQualityPlan(incomplete, packet.acceptance), /Missing acceptance criteria: SUMMARYcustom-1/);
  const complete = planFor(packet.acceptance.map(item => item.id));
  assert.deepEqual(parseQualityPlan(complete, packet.acceptance), complete);
  complete.criteria.find(item => item.criterionId === source.id)!.journeyIds = [];
  assert.throws(() => parseQualityPlan(complete, packet.acceptance), /implemented criterion must map to at least one journey/);
});

test('narrative spans preserve every sentence, named format, generation and delivery with exact source offsets', () => {
  const body = 'Use the named real format with synthetic records.\nGenerate answers from new inputs, beyond presets. Deliver the reviewed packet to a separate receiving workspace.';
  const base = customPacket({ title: 'Synthetic workflow', description: 'Retain review history.', criteria: ['Retain review history.'] });
  const packet = packetFor({ ...base.challenge, description: body });
  const spans = packet.acceptance.filter(item => item.provenance?.some(source => source.kind === 'description'));
  assert.deepEqual(spans.map(item => item.requirement), [
    'Use the named real format with synthetic records.', 'Generate answers from new inputs, beyond presets.',
    'Deliver the reviewed packet to a separate receiving workspace.'
  ]);
  for (const item of spans) {
    const offset = /challenge.description\[(\d+):(\d+)\]/.exec(item.provenance![0].path)!;
    assert.equal(body.slice(Number(offset[1]), Number(offset[2])), item.requirement);
    assert.match(item.scenario, /Presets, invented formats and simulated delivery/);
    const incomplete = planFor(packet.acceptance.filter(other => other.id !== item.id).map(other => other.id));
    assert.throws(() => parseQualityPlan(incomplete, packet.acceptance), /Missing acceptance criteria/);
  }
  const repeated = packet.acceptance.find(item => item.requirement === 'Retain review history.')!;
  assert.equal(packet.acceptance.filter(item => item.requirement === repeated.requirement).length, 1);
  assert.ok(repeated.provenance!.some(item => item.kind === 'summary'));
});

test('source-card and user-scope prose both enter the immutable workspace inventory', async t => {
  await fs.mkdir('.tmp', { recursive: true });
  const workspace = await fs.mkdtemp(path.resolve('.tmp/prose-inventory-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const source = customPacket({ title: 'Totals', description, criteria: [] }).challenge;
  const prepared = await prepareFleetWorkspace({ workspace, resourcesRoot: process.cwd(), challengeId: source.id,
    sourceChallenge: source, title: source.title, description: 'Reject malformed amounts before export.', criteria: [] });
  const packetPath = path.join(workspace, '.fleet/packet.json');
  const packet = JSON.parse(await fs.readFile(packetPath, 'utf8'));
  assert.deepEqual(packet.acceptance, prepared.acceptance);
  assert.ok(prepared.acceptance.some(item => item.requirement === description));
  assert.ok(prepared.acceptance.some(item => item.requirement === 'Reject malformed amounts before export.' && item.provenance?.some(source => source.path.startsWith('userScope.description['))));
  await assertFleetPacketIntegrity(workspace, prepared.packetHash);
  packet.acceptance = packet.acceptance.filter((item: { id: string }) => !item.id.startsWith('SCOPE'));
  await fs.writeFile(packetPath, JSON.stringify(packet));
  await assert.rejects(assertFleetPacketIntegrity(workspace, prepared.packetHash), /integrity failed/);
});
