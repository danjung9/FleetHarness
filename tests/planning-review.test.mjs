import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { solutionFixture } from '../scripts/solution-fixture.mjs';
import { loadQualityContract } from '../dist-electron/electron/quality.js';
import { createPlanningReviewSnapshot, assertPlanningReviewSnapshot, PlanningReviewLedger, planningReviewInstructions } from '../dist-electron/electron/planning-review.js';

async function setup(t, options = {}) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-planning-review-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const acceptance = [
    { id: 'R1', requirement: options.constant ? 'Return the fixed offline availability flag for any input.' : 'Extract a task and recover from invalid input.', method: 'automated', scenario: 'Exercise the public invocation protocol.' },
    { id: 'R2', requirement: 'Connect a future operational feed.', method: 'integration', scenario: 'Requires a separate operational integration.' },
    ...Array.from({ length: options.extraCriteria ?? 0 }, (_, index) => ({ id: 'R' + (index + 3), requirement: 'An additional operational integration.', method: 'integration', scenario: 'Requires independent later verification.' }))
  ];
  const files = { ...solutionFixture(acceptance.map(criterion => criterion.id)), 'requirements.md': 'Deliver a useful offline task parser; operational integration is outside this prototype.',
    'scope.md': 'Parse task messages from local inputs.', 'research.md': 'Use a small deterministic parser.',
    'plan.md': 'Implement the shared parser and accessible input form.', 'test-matrix.md': 'R1 maps to parse-cases and primary/recovery journeys.',
    'system-design.json': JSON.stringify({ title: 'Task parser', description: 'Shared parser', components: [], connections: [] }) };
  if (options.profile === 'cli') {
    const solution = JSON.parse(files['solution-contract.json']);
    solution.runtime = { profile: 'cli', files: ['evaluate.cjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'evaluate.cjs', args: [] } };
    files['solution-contract.json'] = JSON.stringify(solution);
    const plan = JSON.parse(files['acceptance-plan.json']);
    plan.journeys = []; plan.criteria.forEach(criterion => { criterion.journeyIds = []; });
    files['acceptance-plan.json'] = JSON.stringify(plan);
  }
  if (options.constant) {
    const solution = JSON.parse(files['solution-contract.json']);
    solution.objective = 'Return the fixed offline availability flag.';
    solution.invocation = { input: 'Any JSON input.', output: 'The JSON string offline.', rules: ['Always return offline.'] };
    files['solution-contract.json'] = JSON.stringify(solution);
    const evaluation = JSON.parse(files['evaluation-plan.json']);
    evaluation.evaluations[0].cases = [{ id: 'empty', input: '', expected: 'offline' }, { id: 'object', input: { request: 1 }, expected: 'offline' }];
    files['evaluation-plan.json'] = JSON.stringify(evaluation);
  }
  if (options.clarifications) files['clarifications.json'] = JSON.stringify({ answer: 'Operational integration is a separate phase.' });
  Object.assign(files, options.documents);
  await Promise.all(Object.entries(files).map(([file, body]) => fs.writeFile(path.join(workspace, file), body)));
  const quality = await loadQualityContract(workspace, acceptance, true);
  const snapshot = await createPlanningReviewSnapshot(workspace, acceptance, quality);
  const controller = new AbortController();
  return { workspace, acceptance, quality, files, snapshot, controller, ledger: new PlanningReviewLedger(snapshot, controller.signal) };
}
const tool = (ledger, name) => {
  const found = ledger.tools().find(tool => tool.name === name);
  assert.ok(found, `Missing ${name}`); return found;
};
const submit = (ledger, input, signal) => tool(ledger, 'fleet_submit_planning_review').execute('submit', input, signal);
const read = async (ledger, file, offset = 0, signal) => JSON.parse((await tool(ledger, 'fleet_read_planning_artifact').execute('read', { path: file, offset }, signal)).content[0].text);
async function readDocument(ledger, name) {
  let offset = 0, body = '';
  for (;;) {
    const page = await read(ledger, name, offset);
    assert.equal(page.offset, offset); body += page.text;
    if (page.nextOffset === null) return body;
    assert.ok(page.nextOffset > offset); offset = page.nextOffset;
  }
}
async function readAll(ledger, snapshot, excluded = []) {
  for (const name of Object.keys(snapshot.documents)) if (!excluded.includes(name)) await readDocument(ledger, name);
}
function approved(snapshot) {
  return { verdict: 'approved', minimumUsefulOutcome: 'A user obtains the required offline result from the public input without the future operational integration.',
    scope: snapshot.acceptance.map(criterion => ({ criterionId: criterion.id,
      assessment: snapshot.quality.plan.criteria.find(item => item.criterionId === criterion.id).disposition === 'implemented' ? 'covered' : 'justified-deferral',
      reason: criterion.id === 'R1' ? 'R1 maps to the public invocation rules and the required parse-cases evaluation.' : 'R2 is an operational connection excluded by the prototype brief; offline R1 remains useful.' })),
    evaluations: snapshot.quality.evaluation.evaluations.map(evaluation => ({ evaluationId: evaluation.id, assessment: 'adequate',
      reason: 'The task-specific cases distinguish valid messages from malformed input and agree with the public protocol; constant-output behavior cannot satisfy the varying parser outcomes.' })),
    recovery: { assessment: snapshot.quality.solution.runtime.profile === 'cli' ? 'not-applicable' : 'adequate', reason: 'The browser journey rejects empty input, corrects it and observes the literal parsed task; CLI delivery needs no browser journey.' }, findings: [] };
}

test('snapshot covers all review inputs and canonical acceptance without importing an agent verdict', async t => {
  const h = await setup(t, { clarifications: true });
  await fs.writeFile(path.join(h.workspace, 'planning-review.json'), JSON.stringify({ verdict: 'approved' }));
  assert.equal(Object.keys(h.snapshot.documents).length, 12);
  assert.equal(h.snapshot.documents['planning-review.json'], undefined);
  assert.equal(h.snapshot.documents['clarifications.json'], h.files['clarifications.json']);
  assert.equal(h.snapshot.quality.hash, h.quality.hash);
  const reordered = h.acceptance.map(({ id, ...criterion }) => ({ ...criterion, id }));
  assert.equal((await createPlanningReviewSnapshot(h.workspace, reordered, h.quality)).hash, h.snapshot.hash);
  const changed = structuredClone(h.acceptance); changed[0].requirement += ' Extra outcome.';
  const changedQuality = { ...h.quality, acceptance: changed };
  assert.notEqual((await createPlanningReviewSnapshot(h.workspace, changed, changedQuality)).hash, h.snapshot.hash);
  await assert.rejects(createPlanningReviewSnapshot(h.workspace, changed, h.quality), /acceptance inventory/);
  assert.throws(() => h.ledger.result(), /did not submit/);
});

test('review input paging reads immutable snapshots and denies unlisted files and malformed offsets', async t => {
  const h = await setup(t);
  const body = 'A'.repeat(12_000) + 'the final obligation';
  await fs.writeFile(path.join(h.workspace, 'plan.md'), body);
  const snapshot = await createPlanningReviewSnapshot(h.workspace, h.acceptance, h.quality);
  const ledger = new PlanningReviewLedger(snapshot, h.controller.signal);
  await fs.writeFile(path.join(h.workspace, 'plan.md'), 'changed after capture');
  snapshot.documents['plan.md'] = 'caller mutation';
  const first = await read(ledger, 'plan.md');
  assert.equal(first.text.length, 12_000); assert.equal(first.nextOffset, 12_000); assert.equal(first.totalCharacters, body.length);
  const second = await read(ledger, 'plan.md', first.nextOffset);
  assert.equal(second.text, 'the final obligation'); assert.equal(second.nextOffset, null);
  assert.equal((await read(ledger, 'plan.md', body.length)).text, '');
  for (const file of ['../requirements.md', '/tmp/plan.md', '.fleet/packet.json', 'planning-review.json', 'toString', 'clarifications.json']) {
    await assert.rejects(read(ledger, file), /not available/);
  }
  for (const offset of [-1, 0.5, NaN, Infinity, '0', body.length + 1]) await assert.rejects(read(ledger, 'plan.md', offset), /offset/);
  await assert.rejects(tool(ledger, 'fleet_read_planning_artifact').execute('bad', { path: 'plan.md', offset: 0, command: 'write' }), /unknown field/);
  assert.deepEqual(ledger.tools().map(tool => tool.name), ['fleet_read_planning_artifact', 'fleet_submit_planning_review']);
});

test('approval records host identity only after a complete structured verdict and returns detached copies', async t => {
  const h = await setup(t), input = approved(h.snapshot);
  assert.throws(() => h.ledger.result(), /did not submit/);
  await readAll(h.ledger, h.snapshot);
  const before = Date.now(); await submit(h.ledger, input);
  const record = h.ledger.result();
  assert.equal(record.reviewerVersion, 1); assert.equal(record.inputHash, h.snapshot.hash); assert.equal(record.contractHash, h.quality.hash);
  assert.ok(Date.parse(record.reviewedAt) >= before && Date.parse(record.reviewedAt) <= Date.now());
  assert.equal(record.verdict, 'approved');
  input.scope[0].reason = 'caller replaced submitted input'; record.scope[0].reason = 'caller replaced returned verdict';
  assert.notEqual(h.ledger.result().scope[0].reason, input.scope[0].reason);
  assert.notEqual(h.ledger.result().scope[0].reason, record.scope[0].reason);
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /already has a verdict/);
  await assertPlanningReviewSnapshot(h.workspace, h.snapshot);
  await assert.rejects(fs.access(path.join(h.workspace, 'planning-review.json')), { code: 'ENOENT' });
});

test('approval requires every captured document and advertises the exact readable inventory', async t => {
  const h = await setup(t, { clarifications: true }), names = Object.keys(h.snapshot.documents);
  const schema = tool(h.ledger, 'fleet_read_planning_artifact').parameters.properties.path;
  assert.deepEqual(schema.anyOf.map(value => value.const).sort(), [...names].sort());
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
      await readDocument(ledger, missing);
      await submit(ledger, approved(h.snapshot));
      assert.equal(ledger.result().verdict, 'approved');
    });
  }
});

test('repeated, tail-only and skipped-character reads cannot substitute for complete pages', async t => {
  const h = await setup(t, { documents: { 'plan.md': 'A'.repeat(36_001) } });
  const cases = [
    { name: 'repeated first page', offsets: [0, 0, 0, 0] },
    { name: 'empty end-of-document read', offsets: [36_001] },
    { name: 'tail only', offsets: [36_000] },
    { name: 'one-character prefix missing', offsets: [1, 12_001, 24_001] },
    { name: 'one-character interior hole', offsets: [0, 12_001, 24_001] }
  ];
  for (const value of cases) {
    await t.test(value.name, async () => {
      const ledger = new PlanningReviewLedger(h.snapshot, h.controller.signal);
      await readAll(ledger, h.snapshot, ['plan.md']);
      for (const offset of value.offsets) await read(ledger, 'plan.md', offset);
      await assert.rejects(submit(ledger, approved(h.snapshot)), /plan\.md/);
      assert.throws(() => ledger.result(), /did not submit/);
      await readDocument(ledger, 'plan.md');
      await submit(ledger, approved(h.snapshot));
      assert.equal(ledger.result().verdict, 'approved');
    });
  }
});

test('out-of-order and overlapping pages merge only when the final unread gap is filled', async t => {
  const h = await setup(t, { documents: { 'plan.md': 'A'.repeat(36_001) } });
  await readAll(h.ledger, h.snapshot, ['plan.md']);
  for (const offset of [24_001, 12_000, 0]) await read(h.ledger, 'plan.md', offset);
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /plan\.md/);
  await read(h.ledger, 'plan.md', 18_000);
  await submit(h.ledger, approved(h.snapshot));
  assert.equal(h.ledger.result().verdict, 'approved');
  const fresh = new PlanningReviewLedger(h.snapshot, h.controller.signal);
  await assert.rejects(submit(fresh, approved(h.snapshot)), /read/i);
  assert.throws(() => fresh.result(), /did not submit/);
});

test('empty documents and optional clarifications require an explicit successful read', async t => {
  const h = await setup(t, { documents: { 'research.md': '', 'clarifications.json': '' } });
  await readAll(h.ledger, h.snapshot, ['research.md', 'clarifications.json']);
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /research\.md|clarifications\.json/);
  const empty = await read(h.ledger, 'research.md');
  assert.equal(empty.text, ''); assert.equal(empty.totalCharacters, 0); assert.equal(empty.nextOffset, null);
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /clarifications\.json/);
  await read(h.ledger, 'clarifications.json');
  await submit(h.ledger, approved(h.snapshot));
  assert.equal(h.ledger.result().verdict, 'approved');
});

test('coverage follows UTF-16 page offsets across multibyte text and split surrogate pairs', async t => {
  const body = 'A'.repeat(11_999) + '🧪' + 'é'.repeat(12_000) + '終';
  const h = await setup(t, { documents: { 'plan.md': body } });
  await readAll(h.ledger, h.snapshot, ['plan.md']);
  const first = await read(h.ledger, 'plan.md');
  assert.equal(first.totalCharacters, body.length); assert.equal(first.nextOffset, 12_000);
  assert.equal(first.text.charCodeAt(11_999), body.charCodeAt(11_999));
  const second = await read(h.ledger, 'plan.md', first.nextOffset);
  assert.equal(second.nextOffset, 24_000);
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /plan\.md/);
  const last = await read(h.ledger, 'plan.md', second.nextOffset);
  assert.equal(first.text + second.text + last.text, body);
  await submit(h.ledger, approved(h.snapshot));
  assert.equal(h.ledger.result().verdict, 'approved');
});

test('aborted and invalid requests earn no document coverage and approval remains retryable', async t => {
  const h = await setup(t), call = new AbortController();
  await readAll(h.ledger, h.snapshot, ['plan.md']);
  call.abort(new Error('page cancelled'));
  await assert.rejects(read(h.ledger, 'plan.md', 0, call.signal), /page cancelled/);
  await assert.rejects(tool(h.ledger, 'fleet_read_planning_artifact').execute('invalid', { path: 'plan.md', offset: 0, extra: true }), /unknown field/);
  await assert.rejects(read(h.ledger, 'plan.md', -1), /offset/);
  await assert.rejects(read(h.ledger, 'unlisted.md'), /not available/);
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /plan\.md/);
  assert.throws(() => h.ledger.result(), /did not submit/);
  await readDocument(h.ledger, 'plan.md');
  await submit(h.ledger, approved(h.snapshot));
  assert.equal(h.ledger.result().verdict, 'approved');
});

test('unjustified scope reduction and weak constant-output cases can be rejected with concrete revision findings', async t => {
  const h = await setup(t), input = approved(h.snapshot);
  input.verdict = 'revise'; input.scope[1].assessment = 'gap'; input.evaluations[0].assessment = 'gap';
  input.scope[1].reason = 'The original operational workflow cannot be completed without the feed that R2 defers.';
  input.evaluations[0].reason = 'Two fixtures return the same result and do not rule out a constant implementation of the variable task.';
  input.findings = ['Implement the minimal R2 import path needed by the original user workflow.', 'Add a novel valid message with a different expected task so a constant output fails.'];
  await submit(h.ledger, input);
  assert.equal(h.ledger.result().verdict, 'revise'); assert.equal(h.ledger.result().findings.length, 2);
  assert.equal(await fs.readFile(path.join(h.workspace, 'evaluation-plan.json'), 'utf8'), h.files['evaluation-plan.json']);
});

test('a legitimate constant task can be approved without distinct-answer quotas', async t => {
  const h = await setup(t, { constant: true, profile: 'cli' }), input = approved(h.snapshot);
  input.minimumUsefulOutcome = 'A caller receives the documented fixed offline availability flag for any JSON input.';
  input.evaluations[0].reason = 'A constant output is the entire original requirement, not a shortcut; both string and object inputs correctly return offline under the public unconditional rule. No invalid-input branch is promised.';
  await readAll(h.ledger, h.snapshot);
  await submit(h.ledger, input);
  assert.equal(h.ledger.result().verdict, 'approved');
  assert.equal(h.ledger.result().recovery.assessment, 'not-applicable');
  assert.match(planningReviewInstructions, /legitimately constant task/);
});

test('missing, duplicate, unknown and disposition-inconsistent assessments fail closed', async t => {
  const h = await setup(t);
  const invalid = [
    input => { input.scope.pop(); },
    input => { input.scope[1] = { ...input.scope[0] }; },
    input => { input.scope[1].criterionId = 'invented'; },
    input => { input.scope[0].assessment = 'justified-deferral'; },
    input => { input.scope[1].assessment = 'covered'; },
    input => { input.evaluations = []; },
    input => { input.evaluations.push({ ...input.evaluations[0] }); },
    input => { input.evaluations[0].evaluationId = 'invented'; },
    input => { input.recovery.assessment = 'not-applicable'; }
  ];
  for (const mutate of invalid) {
    const ledger = new PlanningReviewLedger(h.snapshot, h.controller.signal), input = approved(h.snapshot); mutate(input);
    await assert.rejects(submit(ledger, input), /Missing|duplicate or unknown|contradicts|require a recovery/);
    assert.throws(() => ledger.result(), /did not submit/);
  }
});

test('approval cannot ignore gaps or findings and revision needs actionable findings', async t => {
  const h = await setup(t);
  const invalid = [
    input => { input.scope[0].assessment = 'gap'; },
    input => { input.evaluations[0].assessment = 'gap'; },
    input => { input.recovery.assessment = 'gap'; },
    input => { input.findings = ['Resolve the public protocol contradiction.']; },
    input => { input.verdict = 'revise'; }
  ];
  for (const mutate of invalid) {
    const ledger = new PlanningReviewLedger(h.snapshot, h.controller.signal), input = approved(h.snapshot); mutate(input);
    await assert.rejects(submit(ledger, input), /gaps or unresolved findings|requires actionable findings/);
  }
});

test('malformed and forged verdict payloads cannot set host fields or satisfy the ledger', async t => {
  const h = await setup(t);
  const invalid = [null, [], 'approved', { ...approved(h.snapshot), inputHash: h.snapshot.hash },
    { ...approved(h.snapshot), reviewerVersion: 1 }, { ...approved(h.snapshot), contractHash: h.quality.hash },
    { ...approved(h.snapshot), reviewedAt: new Date().toISOString() }];
  for (const value of invalid) {
    const ledger = new PlanningReviewLedger(h.snapshot, h.controller.signal);
    await assert.rejects(submit(ledger, value), /object|unknown field/); assert.throws(() => ledger.result(), /did not submit/);
  }
  for (const mutate of [input => { delete input.minimumUsefulOutcome; }, input => { input.verdict = 'pass'; },
    input => { input.scope[0].reason = ' '; }, input => { input.evaluations[0].assessment = 'unreviewed'; },
    input => { input.findings = ['']; }, input => { input.findings = Array(21).fill('Review this case.'); },
    input => { input.minimumUsefulOutcome = 'x'.repeat(4001); }, input => { input.scope[0].reason = 'x'.repeat(2001); },
    input => { input.recovery = null; }, input => { input.scope = new Array(2); }]) {
    const ledger = new PlanningReviewLedger(h.snapshot, h.controller.signal), input = approved(h.snapshot); mutate(input);
    await assert.rejects(submit(ledger, input)); assert.throws(() => ledger.result(), /did not submit/);
  }
});

test('review abort and tool-call abort reject late reads, submissions and result use', async t => {
  const h = await setup(t), call = new AbortController(); call.abort(new Error('call cancelled'));
  await assert.rejects(read(h.ledger, 'plan.md', 0, call.signal), /call cancelled/);
  await assert.rejects(submit(h.ledger, approved(h.snapshot), call.signal), /call cancelled/);
  assert.throws(() => h.ledger.result(), /did not submit/);
  await readAll(h.ledger, h.snapshot);
  await submit(h.ledger, approved(h.snapshot)); h.controller.abort(new Error('review stopped'));
  assert.throws(() => h.ledger.result(), /review stopped/);
  await assert.rejects(read(h.ledger, 'plan.md'), /review stopped/);
  await assert.rejects(submit(h.ledger, approved(h.snapshot)), /review stopped/);
  assert.throws(() => new PlanningReviewLedger(h.snapshot, h.controller.signal), /review stopped/);
});

test('the complete verdict has a total size bound even when every individual assessment is valid', async t => {
  const h = await setup(t, { extraCriteria: 126 }), input = approved(h.snapshot);
  input.scope.forEach(item => { item.reason = 'x'.repeat(2000); });
  await assert.rejects(submit(h.ledger, input), /250 KB/);
  assert.throws(() => h.ledger.result(), /did not submit/);
});

test('changed prose, optional clarification presence and quality contracts invalidate review snapshots', async t => {
  const h = await setup(t); await readAll(h.ledger, h.snapshot); await submit(h.ledger, approved(h.snapshot));
  await fs.writeFile(path.join(h.workspace, 'plan.md'), 'Different implementation scope.');
  await assert.rejects(assertPlanningReviewSnapshot(h.workspace, h.snapshot), /inputs changed/);
  await fs.writeFile(path.join(h.workspace, 'plan.md'), h.files['plan.md']);
  await fs.writeFile(path.join(h.workspace, 'clarifications.json'), '{"answer":"new decision"}');
  await assert.rejects(assertPlanningReviewSnapshot(h.workspace, h.snapshot), /inputs changed/);
  const clarified = await createPlanningReviewSnapshot(h.workspace, h.acceptance, h.quality);
  await fs.rm(path.join(h.workspace, 'clarifications.json'));
  await assert.rejects(assertPlanningReviewSnapshot(h.workspace, clarified), /inputs changed/);
  await fs.appendFile(path.join(h.workspace, 'evaluation-plan.json'), '\n');
  await assert.rejects(assertPlanningReviewSnapshot(h.workspace, h.snapshot), /changed after planning/);
});

test('caller changes to snapshot identities or document inventory cannot authorize a verdict', async t => {
  const h = await setup(t);
  for (const mutate of [snapshot => { snapshot.hash = '0'.repeat(64); }, snapshot => { snapshot.documents['plan.md'] += ' amended'; },
    snapshot => { snapshot.documents['forged-verdict.json'] = '{}'; }, snapshot => { snapshot.quality.hash = '0'.repeat(64); },
    snapshot => { snapshot.acceptance[0].requirement = 'Changed requirement'; }, snapshot => { snapshot.quality.sealedEvaluation = true; },
    snapshot => { snapshot.quality.plan.criteria[1].disposition = 'implemented'; },
    snapshot => { snapshot.quality.evaluation.evaluations[0].cases[0].expected = 'changed answer'; },
    snapshot => { snapshot.quality.solution.invocation.rules = ['Weakened rule']; }]) {
    const snapshot = structuredClone(h.snapshot); mutate(snapshot);
    assert.throws(() => new PlanningReviewLedger(snapshot, h.controller.signal));
    await assert.rejects(assertPlanningReviewSnapshot(h.workspace, snapshot));
  }
});

test('snapshot capture rejects oversize, nonordinary and missing files before review', async t => {
  const h = await setup(t);
  await fs.writeFile(path.join(h.workspace, 'plan.md'), 'x'.repeat(250_001));
  await assert.rejects(createPlanningReviewSnapshot(h.workspace, h.acceptance, h.quality), /250000 byte/);
  await fs.writeFile(path.join(h.workspace, 'plan.md'), h.files['plan.md']);
  await fs.rm(path.join(h.workspace, 'scope.md')); await fs.symlink('research.md', path.join(h.workspace, 'scope.md'));
  await assert.rejects(createPlanningReviewSnapshot(h.workspace, h.acceptance, h.quality), /ordinary file/);
  await fs.rm(path.join(h.workspace, 'scope.md')); await fs.mkdir(path.join(h.workspace, 'scope.md'));
  await assert.rejects(createPlanningReviewSnapshot(h.workspace, h.acceptance, h.quality), /ordinary file/);
  await fs.rm(path.join(h.workspace, 'scope.md'), { recursive: true });
  await assert.rejects(createPlanningReviewSnapshot(h.workspace, h.acceptance, h.quality), { code: 'ENOENT' });
  await fs.writeFile(path.join(h.workspace, 'scope.md'), h.files['scope.md']);
  const huge = structuredClone(h.acceptance); huge[0].requirement = 'x'.repeat(6_000_000);
  await assert.rejects(createPlanningReviewSnapshot(h.workspace, huge, { ...h.quality, acceptance: huge }), /6 MB/);
});
