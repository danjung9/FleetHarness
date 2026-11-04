import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { challenges } from '../harness/catalog.js';
import { packetFor, customPacket } from '../harness/planner.js';
import { getRecipe } from '../harness/recipes.js';
import { sourceLines } from '../harness/norfolk.js';
import { prepareFleetWorkspace, assertFleetPacketIntegrity } from '../harness/integration.js';
import { parseQualityPlan, parseUxSpec, qualityContractGuide } from '../harness/quality-contract.js';
import type { AcceptanceCriterion, Challenge } from '../harness/types.js';
import type { QualityPlan, UxSpec } from '../shared/quality.js';

const challenge: Challenge = {
  id: 'sample', title: 'Review records', summary: 'A complete local review workflow.', category: null,
  recipe: 'workflow', related: [], requirements: ['Keep history.', 'Validate edits.'],
  evaluationCriteria: ['Keep history.', 'A new user can export a record.'],
  expectedDeliverables: '- Keep history.\n- An offline application.\n',
  dataNeeds: [], sourceUrl: 'https://example.test/challenge/sample', sourceScope: 'detail', capturedOn: '2026-11-04', pilot: false
};

test('acceptance covers requirements, judging, deliverables and user scope without losing duplicate provenance', () => {
  const original = structuredClone(challenge), recipe = getRecipe('workflow');
  const packet = packetFor(challenge, ['A new user can export a record.', 'Use plain-language errors.']);
  const history = packet.acceptance.find(item => item.requirement === 'Keep history.')!;
  assert.equal(history.id, 'UCsample-1');
  assert.deepEqual(history.provenance, [
    { kind: 'requirement', id: 'UCsample-1', path: 'challenge.requirements[0]' },
    { kind: 'evaluation', id: 'EVALsample-1', path: 'challenge.evaluationCriteria[0]' },
    { kind: 'deliverable', id: 'DELIVERABLEsample-1', path: 'challenge.expectedDeliverables.lines[0]' }
  ]);
  const exporting = packet.acceptance.find(item => item.id === 'EVALsample-2')!;
  assert.deepEqual(exporting.provenance?.map(item => item.id), ['EVALsample-2', 'USERsample-1']);
  assert.equal(packet.acceptance.find(item => item.id === 'DELIVERABLEsample-2')?.requirement, 'An offline application.');
  assert.equal(packet.acceptance.find(item => item.id === 'USERsample-2')?.requirement, 'Use plain-language errors.');
  assert.equal(new Set(packet.acceptance.map(item => item.requirement)).size, packet.acceptance.length);
  for (const criterion of recipe.acceptance) assert.equal(packet.acceptance.find(item => item.id === criterion.id)?.scenario, criterion.scenario);
  assert.deepEqual(challenge, original);
  assert.deepEqual(getRecipe('workflow'), recipe);
  assert.deepEqual(packetFor(challenge, ['A new user can export a record.', 'Use plain-language errors.']), packet);
});

test('custom criteria retain existing IDs and user provenance, including repeated user entries', () => {
  const packet = customPacket({ title: 'Custom', description: 'A custom workflow', criteria: ['Keep history.', 'Keep history.'] });
  const criterion = packet.acceptance.find(item => item.requirement === 'Keep history.')!;
  assert.equal(criterion.id, 'UCcustom-1');
  assert.deepEqual(criterion.provenance?.map(item => item.id), ['UCcustom-1', 'UCcustom-2', 'USERcustom-1', 'USERcustom-2']);
  assert.equal(packet.acceptance.filter(item => item.requirement === 'Keep history.').length, 1);
  assert.equal(packet.challenge.sourceScope, 'user');
});

test('every captured challenge retains all source outcomes in its acceptance inventory', () => {
  for (const source of challenges) {
    const packet = packetFor(source, source.evaluationCriteria);
    assert.equal(new Set(packet.acceptance.map(item => item.id)).size, packet.acceptance.length);
    assert.ok(packet.acceptance.length <= 512);
    const requirements = new Set(packet.acceptance.map(item => item.requirement));
    for (const requirement of [...source.requirements, ...(source.evaluationCriteria ?? []), ...sourceLines(source.expectedDeliverables ?? '')]) {
      assert.ok(requirements.has(requirement.trim()), `Challenge ${source.id} lost: ${requirement}`);
    }
    for (const criterion of packet.acceptance) assert.ok(criterion.provenance?.length);
  }
});

test('workspace returns the merged inventory and protects the supplied quality guide', async t => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-quality-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const prepared = await prepareFleetWorkspace({ workspace, resourcesRoot: process.cwd(), challengeId: challenge.id, sourceChallenge: challenge,
    title: challenge.title, description: challenge.summary, criteria: ['Additional user outcome.'] });
  const packet = JSON.parse(await fs.readFile(path.join(workspace, '.fleet', 'packet.json'), 'utf8'));
  assert.deepEqual(prepared.acceptance, packet.acceptance);
  assert.equal(prepared.acceptance.find(item => item.id === 'USERsample-1')?.requirement, 'Additional user outcome.');
  const guidePath = path.join(workspace, '.fleet', 'quality-contract.md');
  assert.equal(await fs.readFile(guidePath, 'utf8'), qualityContractGuide);
  await assertFleetPacketIntegrity(workspace, prepared.packetHash);
  await fs.appendFile(guidePath, '\nChanged contract');
  await assert.rejects(assertFleetPacketIntegrity(workspace, prepared.packetHash), /integrity failed/);
});

const acceptance: AcceptanceCriterion[] = [
  { id: 'UCsample-1', requirement: 'Create a record and recover from invalid input.', method: 'integration', scenario: 'Save, reject an empty name and correct it.' },
  { id: 'USERsample-1', requirement: 'Connect to the operational identity service.', method: 'integration', scenario: 'Use an owner-authorized identity provider.' }
];

function validPlan(): QualityPlan {
  return {
    schemaVersion: 1,
    criteria: [
      { criterionId: 'UCsample-1', disposition: 'implemented', expectedOutcome: 'A saved record is visible. Empty titles are rejected and the draft can be corrected.', journeyIds: ['create', 'recover'] },
      { criterionId: 'USERsample-1', disposition: 'deferred', expectedOutcome: 'Users sign in through the approved identity service.', journeyIds: [], reason: 'The owner has not supplied an authorized identity integration.' }
    ],
    journeys: [
      { id: 'create', title: 'Create a record', kind: 'primary', steps: [{ action: 'fill', selector: '#title', value: 'Inspect pump' }, { action: 'click', selector: '#save' }, { action: 'expectText', selector: '#result', text: 'Saved: Inspect pump' }] },
      { id: 'recover', title: 'Correct a required field', kind: 'recovery', steps: [{ action: 'fill', selector: '#title', value: '' }, { action: 'click', selector: '#save' }, { action: 'expectText', selector: '#error', text: 'Enter a title.' }, { action: 'fill', selector: '#title', value: 'Inspect valve' }, { action: 'click', selector: '#save' }, { action: 'expectText', selector: '#result', text: 'Saved: Inspect valve' }] }
    ]
  };
}

function validUx(): UxSpec {
  return {
    schemaVersion: 1, audience: 'Maintenance staff', primaryTask: 'Create a task', successOutcome: 'The saved task appears in the list',
    screens: [{ name: 'Tasks', purpose: 'Create and review tasks', primaryAction: 'Save task' }],
    states: { empty: 'Show guidance and sample data', loading: 'Saves are immediate and prevent duplicate submission', error: 'Show an inline field error', success: 'Confirm the saved record' },
    persistence: 'Records survive reload in local storage', recovery: 'Preserve entered fields while correcting invalid input', keyboard: 'Logical Tab order and visible focus on every control'
  };
}

test('quality plans preserve explicit deferrals and independent literal results without mutating caller data', () => {
  const plan = validPlan(), parsed = parseQualityPlan(plan, acceptance);
  assert.deepEqual(parsed, plan);
  plan.journeys[0].steps[0] = { action: 'reload' };
  assert.equal(parsed.journeys[0].steps[0].action, 'fill');
  assert.equal(parsed.criteria[1].disposition, 'deferred');
  assert.deepEqual(parsed.criteria[1].journeyIds, []);
});

test('browser contracts accept the full bounded action vocabulary and empty reset values', () => {
  const plan = validPlan();
  plan.journeys[0].steps.push(
    { action: 'select', selector: '#department', value: 'engineering' },
    { action: 'press', selector: '#title', key: 'Enter' },
    { action: 'check', selector: '#reviewed' },
    { action: 'reload' },
    { action: 'expectVisible', selector: '#records' },
    { action: 'expectValue', selector: '#title', value: '' },
    { action: 'expectDownload', selector: '#export', fileName: 'records.csv', text: 'Inspect pump' }
  );
  assert.deepEqual(parseQualityPlan(plan, acceptance), plan);
});

test('quality contracts reject incomplete or misleading coverage', () => {
  const cases: Array<{ label: string; change: (plan: QualityPlan) => void; error: RegExp }> = [
    { label: 'missing source criterion', change: plan => { plan.criteria.pop(); }, error: /Missing acceptance criteria/ },
    { label: 'duplicate criterion', change: plan => { plan.criteria.push(plan.criteria[0]); }, error: /Duplicate criterion/ },
    { label: 'invented criterion', change: plan => { plan.criteria[1].criterionId = 'MADE_UP'; }, error: /unknown criterion/ },
    { label: 'implemented without a test', change: plan => { plan.criteria[0].journeyIds = []; }, error: /must map/ },
    { label: 'deferred without reason', change: plan => { delete plan.criteria[1].reason; }, error: /requires a nonempty reason/ },
    { label: 'deferred with passing journeys', change: plan => { plan.criteria[1].journeyIds = ['create']; }, error: /no journeyIds/ },
    { label: 'no implementation', change: plan => { plan.criteria[0] = { ...plan.criteria[0], disposition: 'deferred', reason: 'Not built', journeyIds: [] }; }, error: /At least one.*implemented/ },
    { label: 'unknown journey', change: plan => { plan.criteria[0].journeyIds = ['absent']; }, error: /unknown journey/ },
    { label: 'duplicate journey reference', change: plan => { plan.criteria[0].journeyIds.push('create'); }, error: /contains duplicates/ },
    { label: 'orphaned recovery journey', change: plan => { plan.criteria[0].journeyIds = ['create']; }, error: /Unmapped journeys: recover/ },
    { label: 'duplicate journey ID', change: plan => { plan.journeys[1].id = 'create'; }, error: /Journey IDs must be unique/ },
    { label: 'no recovery journey', change: plan => { plan.journeys[1].kind = 'primary'; }, error: /primary journey and one recovery/ }
  ];
  for (const { label, change, error } of cases) {
    const plan = validPlan(); change(plan);
    assert.throws(() => parseQualityPlan(plan, acceptance), error, label);
  }
});

test('browser contracts reject static placeholders, input echoes and assertions preceding all interactions', () => {
  for (const steps of [
    [{ action: 'expectVisible', selector: 'h1' }, { action: 'reload' }],
    [{ action: 'fill', selector: '#title', value: 'echo' }, { action: 'expectValue', selector: '#title', value: 'echo' }],
    [{ action: 'expectText', selector: '#result', text: 'Saved' }, { action: 'click', selector: '#save' }],
    [{ action: 'click', selector: '#save' }, { action: 'expectVisible', selector: 'h1' }],
    [{ action: 'click', selector: '#save' }, { action: 'expectDownload', selector: '#export', fileName: 'records.csv' }]
  ]) {
    const plan = validPlan(); plan.journeys[0].steps = steps as QualityPlan['journeys'][number]['steps'];
    assert.throws(() => parseQualityPlan(plan, acceptance), /interact|literal outcome/);
  }
  const recovery = validPlan();
  recovery.journeys[1].steps = [{ action: 'expectVisible', selector: '#error' }, { action: 'click', selector: '#save' }];
  assert.throws(() => parseQualityPlan(recovery, acceptance), /then assert/);
});

test('quality parser rejects unsupported fields, executable steps and unbounded contracts', () => {
  const invalid: unknown[] = [
    { ...validPlan(), schemaVersion: 2 },
    { ...validPlan(), eval: 'arbitrary code' },
    { ...validPlan(), criteria: [{ ...validPlan().criteria[0], source: 'invented' }, validPlan().criteria[1]] }
  ];
  for (const item of [
    { action: 'evaluate', script: 'document.body.innerHTML="pass"' },
    { action: 'click', selector: '#save', url: 'https://example.test' },
    { action: 'reload', selector: 'body' },
    { action: 'expectText', selector: '#result', text: '' },
    { action: 'expectDownload', selector: '#export', fileName: '' },
    { action: 'fill', selector: '', value: 'input' },
    { action: 'fill', selector: '#title', value: 'x'.repeat(10_001) },
    { action: 'click', selector: '#'.repeat(513) }
  ]) {
    const plan: any = validPlan(); plan.journeys[0].steps[0] = item; invalid.push(plan);
  }
  const tooManySteps = validPlan(); tooManySteps.journeys[0].steps = Array.from({ length: 41 }, () => ({ action: 'click', selector: '#save' })); invalid.push(tooManySteps);
  const tooManyJourneys = validPlan(); tooManyJourneys.journeys = Array.from({ length: 13 }, (_, i) => ({ ...validPlan().journeys[0], id: `journey-${i}` })); invalid.push(tooManyJourneys);
  const hugeOutcome = validPlan(); hugeOutcome.criteria[0].expectedOutcome = 'x'.repeat(4_001); invalid.push(hugeOutcome);
  for (const plan of invalid) assert.throws(() => parseQualityPlan(plan, acceptance));
});

test('UX contracts require the complete task, screen, state and recovery specification', () => {
  const ux = validUx(); assert.deepEqual(parseUxSpec(ux), ux);
  for (const field of ['audience', 'primaryTask', 'successOutcome', 'screens', 'states', 'persistence', 'recovery', 'keyboard'] as const) {
    const missing: any = validUx(); delete missing[field];
    assert.throws(() => parseUxSpec(missing), `Missing ${field}`);
  }
  const invalid: unknown[] = [
    { ...validUx(), schemaVersion: 0 }, { ...validUx(), audience: ' ' }, { ...validUx(), css: 'body{}' },
    { ...validUx(), states: { ...validUx().states, error: '' } },
    { ...validUx(), states: { ...validUx().states, custom: 'Extra state' } },
    { ...validUx(), screens: [validUx().screens[0], validUx().screens[0]] },
    { ...validUx(), screens: [{ ...validUx().screens[0], selector: '#main' }] },
    { ...validUx(), persistence: 'x'.repeat(4_001) }
  ];
  for (const spec of invalid) assert.throws(() => parseUxSpec(spec));
});
