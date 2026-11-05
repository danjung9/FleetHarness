import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { solutionFixture } from '../scripts/solution-fixture.mjs';
import { completeFixturePlanningReview } from '../scripts/planning-review-fixture.mjs';
import { parseBehavioralContract, parseExperimentEvaluationPlan } from '../dist-electron/harness/experiment-contract.js';
import { loadQualityContract } from '../dist-electron/electron/quality.js';
import { createPlanningReviewSnapshot, createSharedPlanningReviewSnapshot, assertPlanningReviewSnapshot,
  assertSharedPlanningReviewSnapshot, PlanningReviewLedger } from '../dist-electron/electron/planning-review.js';

const acceptance = [{ id: 'R1', requirement: 'Extract the task from a supplied message.', method: 'automated',
  scenario: 'Check ordinary messages and invalid input.' }];

async function setup(t, shared) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-planning-utf8-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const files = { ...solutionFixture(['R1']), 'requirements.md': 'Extract tasks from local messages.',
    'scope.md': 'Return the task after the public TASK: prefix.', 'research.md': 'Use a deterministic parser.',
    'plan.md': 'Implement the public parsing protocol.', 'test-matrix.md': 'Check task extraction and invalid messages.',
    'system-design.json': JSON.stringify({ title: 'Task parser', description: 'Shared parser', components: [], connections: [] }) };
  let behavior, evaluation;
  if (shared) {
    const solution = JSON.parse(files['solution-contract.json']), plan = JSON.parse(files['acceptance-plan.json']);
    const { schemaVersion: _version, screens: _screens, ...ux } = JSON.parse(files['ux-spec.json']);
    behavior = parseBehavioralContract({ schemaVersion: 1, objective: solution.objective, invocation: solution.invocation,
      capabilities: solution.capabilities, surface: 'cli',
      delivery: { profiles: ['node-cli', 'python-cli'], network: 'offline', operationIds: [] },
      criteria: plan.criteria.map(({ journeyIds: _journeys, ...criterion }) => ({ ...criterion, scenarioIds: [] })), ux, scenarios: [] }, acceptance);
    evaluation = parseExperimentEvaluationPlan(JSON.parse(files['evaluation-plan.json']), behavior);
    files['behavior-contract.json'] = JSON.stringify(behavior);
    files['evaluation-plan.json'] = JSON.stringify(evaluation);
    files['experiment-guide.md'] = 'Compare two implementations of the same public parsing protocol.';
    files['available-operations.json'] = '[]';
  }
  await Promise.all(Object.entries(files).map(([name, body]) => fs.writeFile(path.join(workspace, name), body)));
  const quality = shared ? undefined : await loadQualityContract(workspace, acceptance, true);
  return { workspace,
    create: () => shared ? createSharedPlanningReviewSnapshot(workspace, acceptance, behavior, evaluation)
      : createPlanningReviewSnapshot(workspace, acceptance, quality),
    check: snapshot => shared ? assertSharedPlanningReviewSnapshot(workspace, snapshot)
      : assertPlanningReviewSnapshot(workspace, snapshot) };
}

const malformedSequences = [
  ['lone continuation byte', [0x80]],
  ['truncated multibyte character', [0xe2, 0x82]],
  ['invalid continuation', [0xe2, 0x28, 0xa1]],
  ['overlong encoding', [0xc0, 0xaf]],
  ['encoded surrogate', [0xed, 0xa0, 0x80]],
  ['code point above Unicode range', [0xf4, 0x90, 0x80, 0x80]]
];
const prefix = 'Preserve this private source label: ', suffix = ' before freezing.\n';
const documentBytes = bytes => Buffer.concat([Buffer.from(prefix), Buffer.from(bytes), Buffer.from(suffix)]);
function encodingError(name) {
  return error => {
    assert.match(error.message, /UTF-?8/i);
    assert.ok(error.message.includes(name), 'The diagnostic identifies the affected planning artifact.');
    assert.ok(!error.message.includes(prefix), 'The diagnostic does not echo project content.');
    return true;
  };
}

for (const shared of [false, true]) {
  const label = shared ? 'shared' : 'ordinary';
  test(`${label} planning capture rejects malformed UTF-8 instead of replacing source bytes`, async t => {
    const h = await setup(t, shared);
    for (const [name, bytes] of malformedSequences) await t.test(name, async () => {
      await fs.writeFile(path.join(h.workspace, 'scope.md'), documentBytes(bytes));
      await assert.rejects(h.create(), encodingError('scope.md'));
    });
  });

  test(`${label} planning capture also rejects malformed optional clarifications`, async t => {
    const h = await setup(t, shared);
    await fs.writeFile(path.join(h.workspace, 'clarifications.json'), Buffer.concat([
      Buffer.from('{"answer":"' + prefix), Buffer.from([0x81]), Buffer.from(' before freezing."}')
    ]));
    await assert.rejects(h.create(), encodingError('clarifications.json'));
  });

  for (const byte of [0x80, 0x81]) test(`${label} approved planning snapshot rejects replacement-character byte collision 0x${byte.toString(16)}`, async t => {
    const h = await setup(t, shared), file = path.join(h.workspace, 'scope.md');
    const valid = prefix + '\uFFFD' + suffix;
    await fs.writeFile(file, valid);
    const snapshot = await h.create(), ledger = new PlanningReviewLedger(snapshot, new AbortController().signal);
    await completeFixturePlanningReview(ledger.tools());
    assert.equal(ledger.result().verdict, 'approved');
    assert.equal(ledger.result().inputHash, snapshot.hash);
    await h.check(snapshot);

    const changed = documentBytes([byte]);
    assert.equal(changed.toString('utf8'), valid, 'Lossy decoding would conceal this actual file mutation.');
    assert.notDeepEqual(changed, Buffer.from(valid));
    await fs.writeFile(file, changed);
    await assert.rejects(h.check(snapshot), encodingError('scope.md'));
  });

  test(`${label} planning preserves valid Unicode, BOM, replacement characters and stable identity`, async t => {
    const h = await setup(t, shared), file = path.join(h.workspace, 'scope.md');
    const body = '\uFEFFScope: caf\u00e9, e\u0301, \u65e5\u672c\u8a9e, \ud83d\ude80 and literal \uFFFD.\n';
    await fs.writeFile(file, Buffer.from(body, 'utf8'));
    const snapshot = await h.create();
    assert.equal(snapshot.documents['scope.md'], body, 'Valid text is preserved exactly, including the leading BOM.');
    const ledger = new PlanningReviewLedger(snapshot, new AbortController().signal);
    const read = ledger.tools().find(tool => tool.name === 'fleet_read_planning_artifact');
    const page = JSON.parse((await read.execute('unicode-page', { path: 'scope.md', offset: 0 })).content[0].text);
    assert.equal(page.text, body);
    await h.check(snapshot);
    await fs.writeFile(file, Buffer.from(snapshot.documents['scope.md'], 'utf8'));
    assert.equal((await h.create()).hash, snapshot.hash, 'Rewriting identical UTF-8 bytes preserves the existing snapshot identity.');

    await fs.writeFile(file, body.slice(1));
    assert.notEqual((await h.create()).hash, snapshot.hash, 'A leading BOM remains part of the reviewed source identity.');
    await assert.rejects(h.check(snapshot), /inputs changed/i);
  });
}
