import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planningContractFixture } from './helpers/planning-contract-fixture.mjs';
import { parseBehavioralContract, parseExperimentEvaluationPlan, experimentContractHash } from '../dist-electron/harness/experiment-contract.js';
import { loadQualityContract } from '../dist-electron/electron/quality.js';
import { createPlanningReviewSnapshot, createSharedPlanningReviewSnapshot, assertSharedPlanningReviewSnapshot,
  assertAnyPlanningReviewSnapshot, PlanningReviewLedger, sharedPlanningReviewInstructions } from '../dist-electron/electron/planning-review.js';

const acceptance = [
  { id: 'R1', requirement: 'Calculate the supplied workload and recover from invalid input.', method: 'automated', scenario: 'Ordinary and empty sums with visible validation recovery.' },
  { id: 'R2', provenance: [{ kind: 'recipe', id: 'optional-feed', path: 'synthetic/optional-feed' }], requirement: 'Connect a future operational feed.', method: 'integration', scenario: 'A separately commissioned operational integration.' }
];
function behaviorInput(surface = 'browser') {
  return { schemaVersion: 1, objective: 'Calculate the total of supplied workload minutes.', surface,
    invocation: { input: 'Object with values: finite number[].', output: 'Exactly {total:number}.', rules: ['Sum every value; an empty array returns zero.'] },
    capabilities: [{ id: 'total', kind: 'algorithm', description: 'Sum all supplied minutes.', criterionIds: ['R1'], required: true, evaluationIds: ['sum-cases'] }],
    delivery: { profiles: surface === 'browser' ? ['browser-js', 'node-service'] : ['node-cli', 'python-cli'], network: 'offline', operationIds: [] },
    criteria: [
      { criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'The independently calculated workload is returned.', capabilityIds: ['total'], scenarioIds: surface === 'browser' ? ['primary', 'recovery'] : [] },
      { criterionId: 'R2', disposition: 'deferred', expectedOutcome: 'Operational data will be imported.', capabilityIds: [], scenarioIds: [], reason: 'real-system: The operational feed requires a separately commissioned authenticated connection.' }
    ],
    ux: { audience: 'An operator', primaryTask: 'Calculate workload', successOutcome: 'A correct total',
      states: { empty: 'Explain input', loading: 'Show progress', error: 'Explain validation', success: 'Show total' },
      persistence: 'No persistence required.', recovery: 'Correct invalid input and retry.', keyboard: 'All controls usable by keyboard.' },
    scenarios: surface === 'browser' ? [
      { id: 'primary', title: 'Calculate workload', kind: 'primary', steps: [
        { id: 'values', action: 'input', value: '1,2' }, { id: 'submit', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }] },
      { id: 'recovery', title: 'Correct invalid values', kind: 'recovery', steps: [
        { id: 'invalid', action: 'input', value: 'invalid' }, { id: 'reject', action: 'activate' }, { id: 'error', action: 'expectText', text: 'Enter numbers' },
        { id: 'correct', action: 'input', value: '1,2' }, { id: 'retry', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }] }
    ] : [] };
}
function evaluationInput() {
  return { schemaVersion: 1, evaluations: [{ id: 'sum-cases', capabilityId: 'total', description: 'Independent reference sums.',
    dataset: { name: 'sums', version: '1', provenance: 'reviewed' }, evaluator: 'numeric', tolerance: 0, threshold: 1, trials: 1,
    cases: [{ id: 'ordinary', input: { values: [2, 3] }, expected: { total: 5 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }] }] };
}
async function setup(t, surface = 'browser', documents = {}) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-shared-planning-review-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const behavior = parseBehavioralContract(behaviorInput(surface), acceptance), evaluation = parseExperimentEvaluationPlan(evaluationInput(), behavior);
  const files = { 'requirements.md': 'Deliver offline workload calculation. Commission the operational feed separately.',
    'scope.md': 'An operator supplies workload minutes and obtains their total.', 'research.md': 'Arithmetic needs no external operation.',
    'behavior-contract.json': JSON.stringify(behavior), 'evaluation-plan.json': JSON.stringify(evaluation),
    'experiment-guide.md': 'Compare architectures against exactly the same product behavior and private evaluations.', 'available-operations.json': '[]' };
  Object.assign(files, documents);
  await Promise.all(Object.entries(files).map(([name, body]) => fs.writeFile(path.join(workspace, name), body)));
  const snapshot = await createSharedPlanningReviewSnapshot(workspace, acceptance, behavior, evaluation);
  const controller = new AbortController();
  return { workspace, behavior, evaluation, files, snapshot, controller, ledger: new PlanningReviewLedger(snapshot, controller.signal) };
}
const submit = (ledger, input, signal) => ledger.tools().find(tool => tool.name === 'fleet_submit_planning_review').execute('submit', input, signal);
const read = async (ledger, file, offset = 0, signal) => JSON.parse((await ledger.tools().find(tool => tool.name === 'fleet_read_planning_artifact')
  .execute('read', { path: file, offset }, signal)).content[0].text);
async function readAll(ledger, snapshot, excluded = []) {
  for (const name of Object.keys(snapshot.documents)) {
    if (excluded.includes(name)) continue;
    let offset = 0;
    for (;;) {
      const page = await read(ledger, name, offset);
      assert.equal(page.offset, offset);
      if (page.nextOffset === null) break;
      assert.ok(page.nextOffset > offset); offset = page.nextOffset;
    }
  }
}
function approved(snapshot) {
  return { verdict: 'approved', minimumUsefulOutcome: 'An operator calculates workload from local inputs without the separately commissioned feed.',
    scope: snapshot.acceptance.map(criterion => ({ criterionId: criterion.id,
      assessment: snapshot.behavior.criteria.find(item => item.criterionId === criterion.id).disposition === 'implemented' ? 'covered' : 'justified-deferral',
      reason: criterion.id === 'R1' ? 'R1 is covered by sum-cases and the shared primary/recovery scenarios.' : 'The original requirements place R2 in a separate commission; R1 remains useful offline.' })),
    evaluations: snapshot.evaluation.evaluations.map(item => ({ evaluationId: item.id, assessment: 'adequate',
      reason: 'sum-cases rules out constant answers with ordinary and empty inputs; the public protocol defines both expected totals.' })),
    recovery: { assessment: snapshot.behavior.surface === 'cli' ? 'not-applicable' : 'adequate',
      reason: 'The browser recovery observes invalid-input rejection before correction, retry and the independent total; CLI has no browser interface.' }, findings: [] };
}

test('shared snapshots capture architecture-neutral review inputs and deterministic contract identity', async t => {
  const h = await setup(t);
  assert.equal(h.snapshot.kind, 'shared');
  assert.equal(Object.keys(h.snapshot.documents).length, 7);
  assert.equal(h.snapshot.contractHash, experimentContractHash({ behavior: h.behavior, evaluation: h.evaluation }));
  assert.equal(Object.hasOwn(h.snapshot, 'quality'), false);
  for (const name of ['solution-contract.json', 'foundation-plan.json', 'execution-contract.json', 'planning-review.json']) {
    await fs.writeFile(path.join(h.workspace, name), '{"verdict":"approved"}');
    await assert.rejects(read(h.ledger, name), /not available/);
  }
  await assertSharedPlanningReviewSnapshot(h.workspace, h.snapshot);
  const reordered = { ...h.behavior, invocation: { rules: h.behavior.invocation.rules, output: h.behavior.invocation.output, input: h.behavior.invocation.input } };
  const same = await createSharedPlanningReviewSnapshot(h.workspace, acceptance, reordered, h.evaluation);
  assert.equal(same.hash, h.snapshot.hash); assert.equal(same.contractHash, h.snapshot.contractHash);
  assert.throws(() => h.ledger.result(), /did not submit/);
});

test('complete shared approval records host identities and returns detached evidence', async t => {
  const h = await setup(t), input = approved(h.snapshot);
  await readAll(h.ledger, h.snapshot);
  await submit(h.ledger, input);
  const record = h.ledger.result();
  assert.equal(record.verdict, 'approved'); assert.equal(record.reviewerVersion, 1);
  assert.equal(record.inputHash, h.snapshot.hash); assert.equal(record.contractHash, h.snapshot.contractHash);
  assert.ok(Number.isFinite(Date.parse(record.reviewedAt)));
  input.scope[0].reason = 'changed caller input'; record.evaluations[0].reason = 'changed returned evidence';
  assert.notEqual(h.ledger.result().scope[0].reason, input.scope[0].reason);
  assert.notEqual(h.ledger.result().evaluations[0].reason, record.evaluations[0].reason);
  await assertAnyPlanningReviewSnapshot(h.workspace, h.snapshot);
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /already has a verdict/);
});

test('shared approval requires all captured prose, operations and optional clarifications', async t => {
  const h = await setup(t, 'browser', { 'clarifications.json': '{"answer":"Keep the offline outcome."}' });
  const names = Object.keys(h.snapshot.documents);
  const schema = h.ledger.tools().find(tool => tool.name === 'fleet_read_planning_artifact').parameters.properties.path;
  assert.deepEqual(schema.anyOf.map(value => value.const).sort(), [...names].sort());
  assert.ok(!schema.anyOf.some(value => value.const === 'solution-contract.json'));
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /read/i);
  assert.throws(() => h.ledger.result(), /did not submit/);
  for (const missing of names) {
    await t.test('unread ' + missing, async () => {
      const ledger = new PlanningReviewLedger(h.snapshot, h.controller.signal);
      await readAll(ledger, h.snapshot, [missing]);
      await assert.rejects(submit(ledger, approved(h.snapshot)), error => {
        assert.ok(error.message.includes(missing), error.message); return true;
      });
      assert.throws(() => ledger.result(), /did not submit/);
      await read(ledger, missing);
      await submit(ledger, approved(h.snapshot));
      assert.equal(ledger.result().verdict, 'approved');
    });
  }
});

test('shared page coverage rejects duplicates and gaps while accepting out-of-order overlaps', async t => {
  const h = await setup(t, 'cli', { 'research.md': 'A'.repeat(24_001), 'clarifications.json': '' });
  await readAll(h.ledger, h.snapshot, ['research.md', 'clarifications.json']);
  for (const offset of [24_001, 12_001, 12_001, 0]) await read(h.ledger, 'research.md', offset);
  await read(h.ledger, 'clarifications.json');
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /research\.md/);
  const call = new AbortController(); call.abort(new Error('shared page cancelled'));
  await assert.rejects(read(h.ledger, 'research.md', 12_000, call.signal), /shared page cancelled/);
  await assert.rejects(read(h.ledger, 'research.md', -1), /offset/);
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /research\.md/);
  await read(h.ledger, 'research.md', 6_000);
  await submit(h.ledger, approved(h.snapshot));
  assert.equal(h.ledger.result().verdict, 'approved');
  const fresh = new PlanningReviewLedger(h.snapshot, h.controller.signal);
  await readAll(fresh, h.snapshot, ['clarifications.json']);
  await assert.rejects(submit(fresh, approved(h.snapshot)), /clarifications\.json/);
  await read(fresh, 'clarifications.json');
  await submit(fresh, approved(h.snapshot));
  assert.equal(fresh.result().verdict, 'approved');
});

test('shared revision can identify missing essential scope and trivial evaluation shortcuts', async t => {
  const h = await setup(t), input = approved(h.snapshot);
  input.verdict = 'revise'; input.scope[1].assessment = 'gap'; input.evaluations[0].assessment = 'gap';
  input.scope[1].reason = 'The original brief requires a usable import path before the operator can complete the task.';
  input.evaluations[0].reason = 'The declared protocol needs a negative-value case to distinguish summation from dropping nonpositive inputs.';
  input.findings = ['Restore the minimal R2 import outcome required by the original brief.', 'Add a mixed-sign fixture following the public invocation rules.'];
  await submit(h.ledger, input);
  assert.equal(h.ledger.result().verdict, 'revise'); assert.deepEqual(h.ledger.result().findings, input.findings);
  assert.equal(await fs.readFile(path.join(h.workspace, 'evaluation-plan.json'), 'utf8'), h.files['evaluation-plan.json']);
});

test('shared criterion dispositions and all evaluations must be assessed without contradictions', async t => {
  const h = await setup(t);
  for (const mutate of [input => { input.scope.pop(); }, input => { input.scope[0].assessment = 'justified-deferral'; },
    input => { input.scope[1].assessment = 'covered'; }, input => { input.scope[1] = { ...input.scope[0] }; },
    input => { input.scope[1].criterionId = 'invented'; }, input => { input.evaluations = []; },
    input => { input.evaluations.push({ ...input.evaluations[0] }); }, input => { input.evaluations[0].evaluationId = 'invented'; }]) {
    const ledger = new PlanningReviewLedger(h.snapshot, h.controller.signal), input = approved(h.snapshot); mutate(input);
    await assert.rejects(submit(ledger, input), /Missing|contradicts|duplicate or unknown/);
    assert.throws(() => ledger.result(), /did not submit/);
  }
});

test('only a shared CLI surface permits recovery to be marked not applicable', async t => {
  const browser = await setup(t), input = approved(browser.snapshot); input.recovery.assessment = 'not-applicable';
  await assert.rejects(submit(browser.ledger, input), /require a recovery assessment/);
  const cli = await setup(t, 'cli'); await readAll(cli.ledger, cli.snapshot); await submit(cli.ledger, approved(cli.snapshot));
  assert.equal(cli.ledger.result().recovery.assessment, 'not-applicable');
});

test('shared verdicts cannot approve gaps, omit actionable revision findings or forge host fields', async t => {
  const h = await setup(t);
  for (const mutate of [input => { input.scope[0].assessment = 'gap'; }, input => { input.evaluations[0].assessment = 'gap'; },
    input => { input.recovery.assessment = 'gap'; }, input => { input.findings = ['Resolve a protocol inconsistency.']; },
    input => { input.verdict = 'revise'; }, input => { input.inputHash = h.snapshot.hash; },
    input => { input.contractHash = h.snapshot.contractHash; }, input => { input.reviewedAt = new Date().toISOString(); }]) {
    const ledger = new PlanningReviewLedger(h.snapshot, h.controller.signal), input = approved(h.snapshot); mutate(input);
    await assert.rejects(submit(ledger, input), /gaps or unresolved findings|actionable findings|unknown field/);
    assert.throws(() => ledger.result(), /did not submit/);
  }
  await fs.writeFile(path.join(h.workspace, 'planning-review.json'), JSON.stringify({ ...approved(h.snapshot), reviewerVersion: 1 }));
  assert.throws(() => new PlanningReviewLedger(h.snapshot, h.controller.signal).result(), /did not submit/);
});

test('changed shared prose, operations, instructions, answers and clarifications invalidate review', async t => {
  const h = await setup(t); await readAll(h.ledger, h.snapshot); await submit(h.ledger, approved(h.snapshot));
  for (const name of Object.keys(h.files)) {
    await fs.appendFile(path.join(h.workspace, name), '\n');
    await assert.rejects(assertSharedPlanningReviewSnapshot(h.workspace, h.snapshot), /inputs changed/);
    await fs.writeFile(path.join(h.workspace, name), h.files[name]);
  }
  await fs.writeFile(path.join(h.workspace, 'clarifications.json'), '{"answer":"new scope decision"}');
  await assert.rejects(assertSharedPlanningReviewSnapshot(h.workspace, h.snapshot), /inputs changed/);
  const clarified = await createSharedPlanningReviewSnapshot(h.workspace, acceptance, h.behavior, h.evaluation);
  await fs.rm(path.join(h.workspace, 'clarifications.json'));
  await assert.rejects(assertSharedPlanningReviewSnapshot(h.workspace, clarified), /inputs changed/);
  const answers = structuredClone(h.evaluation); answers.evaluations[0].cases[0].expected = { total: 6 };
  await fs.writeFile(path.join(h.workspace, 'evaluation-plan.json'), JSON.stringify(answers));
  await assert.rejects(assertSharedPlanningReviewSnapshot(h.workspace, h.snapshot), /do not match/);
});

test('shared capture and ledger reject changed parsed contracts, identities and document inventories', async t => {
  const h = await setup(t);
  for (const mutate of [snapshot => { snapshot.hash = '0'.repeat(64); }, snapshot => { snapshot.contractHash = '0'.repeat(64); },
    snapshot => { snapshot.documents['scope.md'] += ' weakened'; }, snapshot => { delete snapshot.documents['available-operations.json']; },
    snapshot => { snapshot.documents['execution-contract.json'] = '{}'; }, snapshot => { snapshot.acceptance[0].requirement = 'Changed original requirement'; },
    snapshot => { snapshot.behavior.criteria[1].disposition = 'implemented'; }, snapshot => { snapshot.behavior.invocation.rules = ['Ignore empty inputs.']; },
    snapshot => { snapshot.evaluation.evaluations[0].cases[0].expected = { total: 6 }; }]) {
    const changed = structuredClone(h.snapshot); mutate(changed);
    assert.throws(() => new PlanningReviewLedger(changed, h.controller.signal));
    await assert.rejects(assertSharedPlanningReviewSnapshot(h.workspace, changed));
  }
  const behavior = structuredClone(h.behavior); behavior.objective = 'A different objective';
  await assert.rejects(createSharedPlanningReviewSnapshot(h.workspace, acceptance, behavior, h.evaluation), /do not match/);
});

test('shared reviewer reads an immutable snapshot and cancellation invalidates its verdict', async t => {
  const h = await setup(t), captured = h.snapshot.documents['scope.md'];
  await fs.writeFile(path.join(h.workspace, 'scope.md'), 'changed workspace');
  h.snapshot.documents['scope.md'] = 'changed caller snapshot';
  assert.equal((await read(h.ledger, 'scope.md')).text, captured);
  assert.equal((await read(h.ledger, 'scope.md')).inputHash, h.snapshot.hash);
  await readAll(h.ledger, h.snapshot);
  await submit(h.ledger, approved(h.snapshot));
  h.controller.abort(new Error('shared review cancelled'));
  assert.throws(() => h.ledger.result(), /shared review cancelled/);
  await assert.rejects(read(h.ledger, 'scope.md'), /shared review cancelled/);
});

test('shared snapshot capture rejects missing, aliased and oversized required inputs', async t => {
  const h = await setup(t), create = () => createSharedPlanningReviewSnapshot(h.workspace, acceptance, h.behavior, h.evaluation);
  await fs.rm(path.join(h.workspace, 'available-operations.json'));
  await assert.rejects(create(), { code: 'ENOENT' });
  await fs.symlink('scope.md', path.join(h.workspace, 'available-operations.json'));
  await assert.rejects(create(), /ordinary file/);
  await fs.rm(path.join(h.workspace, 'available-operations.json'));
  await fs.writeFile(path.join(h.workspace, 'available-operations.json'), h.files['available-operations.json']);
  await fs.writeFile(path.join(h.workspace, 'scope.md'), 'x'.repeat(250_001));
  await assert.rejects(create(), /250000 byte/);
  await fs.writeFile(path.join(h.workspace, 'scope.md'), h.files['scope.md']);
  await fs.writeFile(path.join(h.workspace, 'behavior-contract.json'), 'x'.repeat(2_000_001));
  await assert.rejects(create(), /2000000 byte/);
});

test('shared support preserves regular snapshot and ledger approval semantics', async t => {
  const h = await setup(t);
  const files = { ...planningContractFixture(acceptance), 'plan.md': 'Implement the task parser.', 'test-matrix.md': 'Verify parsing and recovery.',
    'system-design.json': JSON.stringify({ title: 'Task parser', description: 'Shared parser', components: [], connections: [] }) };
  await Promise.all(Object.entries(files).map(([name, body]) => fs.writeFile(path.join(h.workspace, name), body)));
  const quality = await loadQualityContract(h.workspace, acceptance, true);
  const snapshot = await createPlanningReviewSnapshot(h.workspace, acceptance, quality), ledger = new PlanningReviewLedger(snapshot, h.controller.signal);
  const input = approved(h.snapshot);
  input.evaluations = quality.evaluation.evaluations.map(item => ({ evaluationId: item.id, assessment: 'adequate', reason: 'The parser cases exercise valid and malformed messages.' }));
  await readAll(ledger, snapshot);
  await submit(ledger, input);
  assert.equal(ledger.result().contractHash, quality.hash);
  assert.equal(ledger.result().inputHash, snapshot.hash);
  assert.equal(Object.hasOwn(snapshot, 'kind'), false);
  assert.equal(snapshot.documents['behavior-contract.json'], undefined);
  await assertAnyPlanningReviewSnapshot(h.workspace, snapshot);
});

test('shared review instructions assess common outcomes without presupposing an implementation', () => {
  for (const expected of [/ORIGINAL requirements/, /For EVERY canonical criterion/, /For EVERY evaluation/,
    /available-operations\.json/, /legitimately constant task/, /without choosing or assuming an architecture/,
    /same cases and answers/, /Only a shared CLI surface/, /fresh independent review after each revision/]) assert.match(sharedPlanningReviewInstructions, expected);
});
