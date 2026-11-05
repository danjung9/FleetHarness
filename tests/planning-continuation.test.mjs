import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { newProject } from '../dist-electron/electron/storage.js';
import { prepareFleetWorkspace } from '../dist-electron/harness/integration.js';
import { prepareBriefData, freezeSyntheticData, assertBriefDataIntegrity } from '../dist-electron/electron/brief-data.js';
import { briefFingerprint, readRunCheckpoint, writeRunCheckpoint, maxPriorClarificationsBytes } from '../dist-electron/electron/run-checkpoint.js';
import { readPlanningContinuation, copyPlanningContinuation, getPlanningContinuationClarifications } from '../dist-electron/electron/planning-continuation.js';
import { syntheticDataFiles } from '../scripts/data-fixture.mjs';

const supplied = [
  { name: 'messages.csv', kind: 'file', content: '\uFEFFmessage\r\n"TASK: inspect café pump 🧪"\r\n' },
  { name: 'messages.csv', kind: 'text', content: 'TASK: check valve\nLiteral replacement character: \uFFFD\n' }
];
const drafts = ['plan.md', 'test-matrix.md', 'system-design.json', 'foundation-plan.json',
  'acceptance-plan.json', 'ux-spec.json', 'solution-contract.json', 'evaluation-plan.json'];
const clarification = (runId, answer, status = 'answered') => JSON.stringify({ runId,
  scope: 'Answers clarify the original brief. They do not change original requirements or acceptance criteria.',
  questions: [{ id: runId + '-question', runId, phase: 'plan', status,
    question: 'Which audience should the release workflow support?', answer }] }, null, 2) + '\n';

async function fixture(t, { synthetic = false, catalog = false } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-planning-continuation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = newProject({ title: 'Task extraction', description: 'Extract task text from supplied message records.',
    criteria: ['Extract complete task messages.'], dataInputs: synthetic ? [] : supplied,
    ...(catalog ? { challengeId: '40' } : {}) });
  project.status = 'failed'; project.runId = 'source-run'; project.workspace = path.join(root, 'source');
  project.resumeStage = 'plan';
  await fs.mkdir(project.workspace);
  let data = await prepareBriefData(project.workspace, project.dataInputs);
  if (synthetic) {
    await fs.mkdir(path.join(project.workspace, 'data'));
    for (const [file, body] of Object.entries(syntheticDataFiles)) await fs.writeFile(path.join(project.workspace, file), body);
    data = await freezeSyntheticData(project.workspace, data);
  }
  const packet = await prepareFleetWorkspace({ ...project, resourcesRoot: path.resolve('.') });
  const requirements = 'Original host-written requirements.\n';
  await fs.writeFile(path.join(project.workspace, 'requirements.md'), requirements);
  await fs.writeFile(path.join(project.workspace, 'scope.md'), 'Completed intake with preserved original input formats.\n');
  await fs.writeFile(path.join(project.workspace, 'research.md'), 'Completed research; use the shared parser.\n');
  for (const file of drafts) await fs.writeFile(path.join(project.workspace, file), 'Saved unfrozen ' + file + '\n');
  const checkpoint = { version: 1, projectId: project.id, runId: project.runId, workspace: project.workspace,
    briefHash: briefFingerprint(project), stage: 'plan', context: packet.context, phases: packet.phases,
    globalTools: packet.globalTools, packetHash: packet.packetHash, requirements, acceptance: packet.acceptance, data,
    planningReview: { phase: 'rejected', revisionUsed: true, review: { reviewerVersion: 1,
      inputHash: 'a'.repeat(64), contractHash: 'b'.repeat(64), preparedDataHash: data.hash,
      reviewedAt: '2026-11-05T14:04:09.000Z', verdict: 'revise', findings: ['Correct the public workflow rule.'] } } };
  await writeRunCheckpoint(root, project, checkpoint);
  const checkpointFile = path.join(root, 'run-checkpoints', project.runId + '.json');
  return { root, project, checkpoint, checkpointFile,
    revise() { project.criteria.push('Returned amendments must remain releasable after fresh approval.'); project.status = 'draft'; },
    async destination(name = 'continued') { const directory = path.join(root, name); await fs.mkdir(directory); return directory; } };
}

for (const catalog of [false, true]) test(`revised ${catalog ? 'source challenge' : 'custom'} criteria reuse authenticated planning while normal resume rejects changed brief`, async t => {
  const h = await fixture(t, { catalog });
  const before = await fs.readFile(h.checkpointFile);
  assert.deepEqual(await readPlanningContinuation(h.root, h.project), h.checkpoint, 'Eligibility also supports the unchanged brief.');
  h.revise();
  assert.deepEqual(await readPlanningContinuation(h.root, h.project), h.checkpoint);
  await assert.rejects(readRunCheckpoint(h.root, h.project), /brief or attached inputs changed/);
  assert.deepEqual(await fs.readFile(h.checkpointFile), before, 'Eligibility never rewrites source recovery state.');
});

for (const synthetic of [false, true]) test(`continuation preserves exact ${synthetic ? 'synthetic' : 'attached'} data and copies only planning artifacts`, async t => {
  const h = await fixture(t, { synthetic }); h.revise();
  const source = await readPlanningContinuation(h.root, h.project), destination = await h.destination();
  for (const name of ['runtime.mjs', 'test-report.json', 'foundation-lock.json', 'clarifications.json']) {
    await fs.writeFile(path.join(source.workspace, name), 'Do not inherit this file.');
  }
  const copied = await copyPlanningContinuation(source, destination);
  assert.deepEqual(copied, source.data); assert.notEqual(copied, source.data);
  await assertBriefDataIntegrity(destination, source.data);
  for (const name of [...source.data.files, 'scope.md', 'research.md', ...drafts]) {
    assert.deepEqual(await fs.readFile(path.join(destination, name)), await fs.readFile(path.join(source.workspace, name)));
  }
  assert.deepEqual((await fs.readdir(destination)).sort(), [...new Set([
    ...source.data.files.map(file => file.split('/')[0]), 'scope.md', 'research.md', ...drafts])].sort());
  for (const name of ['requirements.md', '.fleet', 'runtime.mjs', 'test-report.json', 'foundation-lock.json', 'clarifications.json']) {
    await assert.rejects(fs.access(path.join(destination, name)), { code: 'ENOENT' });
  }
  assert.deepEqual(JSON.parse(await fs.readFile(h.checkpointFile, 'utf8')), h.checkpoint);
});

test('attachment names, kinds, content, ordering and removal cannot reuse completed intake', async t => {
  const h = await fixture(t);
  for (const edit of [
    inputs => { inputs[0].name = 'renamed.csv'; },
    inputs => { inputs[0].kind = 'text'; },
    inputs => { inputs[0].content += ' '; },
    inputs => { inputs.reverse(); },
    inputs => { inputs.pop(); }
  ]) {
    const changed = structuredClone(h.project); edit(changed.dataInputs);
    await assert.rejects(readPlanningContinuation(h.root, changed), /[Aa]ttached input/);
  }
});

test('source challenge identity and captured source cannot change during planning continuation', async t => {
  const h = await fixture(t, { catalog: true }); h.revise();
  for (const edit of [
    project => { project.challengeId = undefined; project.sourceChallenge = undefined; },
    project => { project.sourceChallenge.summary += ' changed'; },
    project => { project.sourceChallenge = undefined; }
  ]) {
    const changed = structuredClone(h.project); edit(changed);
    await assert.rejects(readPlanningContinuation(h.root, changed), /source challenge/);
  }
});

test('changed source packet, requirements or data cannot be inherited', async t => {
  const h = await fixture(t); h.revise();
  for (const name of ['.fleet/packet.json', 'requirements.md', h.checkpoint.data.files[1]]) {
    const target = path.join(h.project.workspace, name), original = await fs.readFile(target);
    await fs.appendFile(target, '\nChanged');
    await assert.rejects(readPlanningContinuation(h.root, h.project), /integrity|requirements changed|data changed|inputs.*changed/i);
    await fs.writeFile(target, original);
  }
  await fs.rm(path.join(h.project.workspace, 'research.md'));
  await assert.rejects(readPlanningContinuation(h.root, h.project), /ENOENT/);
});

test('frozen, scoped or later-stage checkpoints never gain changed-brief planning recovery', async t => {
  const h = await fixture(t); h.revise();
  for (const extra of [
    { stage: 'build' }, { quality: {} }, { foundation: {} }, { foundationPlan: 'frozen' },
    { coreReportHash: 'c'.repeat(64) }, { modelConfig: { backend: 'pi', provider: 'fixture', model: 'fixture' } },
    { executionBudget: {} }
  ]) {
    await writeRunCheckpoint(h.root, h.project, { ...h.checkpoint, ...extra });
    await assert.rejects(readPlanningContinuation(h.root, h.project), /ordinary, unfrozen planning/);
  }
  await writeRunCheckpoint(h.root, h.project, h.checkpoint);
  await fs.mkdir(path.join(h.root, 'evaluations'));
  await fs.writeFile(path.join(h.root, 'evaluations', h.project.runId + '.json'), 'sealed');
  await assert.rejects(readPlanningContinuation(h.root, h.project), /sealed host evaluation/);
});

test('copy rejects linked drafts, nonempty destinations and source data changed after eligibility', async t => {
  const h = await fixture(t), source = await readPlanningContinuation(h.root, h.project);
  const destination = await h.destination();
  await fs.writeFile(path.join(destination, 'existing.txt'), 'Keep this file.');
  await assert.rejects(copyPlanningContinuation(source, destination), /empty ordinary destination/);
  await fs.rm(path.join(destination, 'existing.txt'));
  const draft = path.join(source.workspace, 'plan.md');
  await fs.rm(draft); await fs.symlink(path.join(source.workspace, 'research.md'), draft);
  await assert.rejects(copyPlanningContinuation(source, destination), /ordinary files/);
  assert.deepEqual(await fs.readdir(destination), []);
  await fs.rm(draft); await fs.writeFile(draft, 'Restored draft.');
  await fs.appendFile(path.join(source.workspace, source.data.files[1]), 'Changed after validation');
  await assert.rejects(copyPlanningContinuation(source, destination), /inputs.*changed|data changed/i);
  assert.deepEqual(await fs.readdir(destination), []);
});

test('answered clarification history survives repeated continuations without copying or reopening old questions', async t => {
  const h = await fixture(t);
  const inherited = clarification('earlier-run', 'Consumers must retain exact message bodies.');
  const current = clarification(h.project.runId, 'Reviewers must record a return reason.');
  h.checkpoint.priorClarifications = [inherited, inherited];
  h.checkpoint.clarifications = current;
  await fs.writeFile(path.join(h.project.workspace, 'clarifications.json'), current);
  await writeRunCheckpoint(h.root, h.project, h.checkpoint);
  h.revise();
  const source = await readPlanningContinuation(h.root, h.project);
  const firstHistory = getPlanningContinuationClarifications(source);
  assert.deepEqual(firstHistory, [inherited, current]);
  assert.notEqual(firstHistory, source.priorClarifications);
  const destination = await h.destination();
  await copyPlanningContinuation(source, destination);
  await assert.rejects(fs.access(path.join(destination, 'clarifications.json')), { code: 'ENOENT' });
  const next = clarification('next-run', 'Corrections preserve their released base.');
  assert.deepEqual(getPlanningContinuationClarifications({ priorClarifications: firstHistory, clarifications: next }), [inherited, current, next]);
  assert.deepEqual(getPlanningContinuationClarifications({ priorClarifications: firstHistory, clarifications: current }), firstHistory);
  assert.deepEqual(await fs.readFile(path.join(source.workspace, 'clarifications.json'), 'utf8'), current);
  await fs.appendFile(path.join(source.workspace, 'clarifications.json'), ' ');
  await assert.rejects(readPlanningContinuation(h.root, h.project), /original clarification answers changed/);
  const empty = await h.destination('tampered-destination');
  await assert.rejects(copyPlanningContinuation(source, empty), /original clarification answers changed/);
  assert.deepEqual(await fs.readdir(empty), []);
});

test('checkpoint readers reject malformed, pending or oversized inherited clarification history', async t => {
  const h = await fixture(t);
  for (const history of [
    'not-an-array', [null], ['not JSON'], [JSON.stringify({ runId: 'old', scope: 'old', questions: 'not an array' })],
    [clarification('old', 'Unanswered choice.', 'pending')], [clarification('old', 'Cancelled choice.', 'cancelled')],
    [clarification('old', 'x'.repeat(maxPriorClarificationsBytes))]
  ]) {
    await writeRunCheckpoint(h.root, h.project, { ...h.checkpoint, priorClarifications: history });
    await assert.rejects(readRunCheckpoint(h.root, h.project), /clarification history/i);
    await assert.rejects(readPlanningContinuation(h.root, h.project), /clarification history/i);
  }
});

test('combined clarification history has a strict byte budget and never silently drops old answers', () => {
  const first = clarification('first', 'α'.repeat(20_000));
  const second = clarification('second', 'β'.repeat(20_000));
  assert.ok(Buffer.byteLength(first) + Buffer.byteLength(second) < maxPriorClarificationsBytes);
  assert.deepEqual(getPlanningContinuationClarifications({ priorClarifications: [first], clarifications: second }), [first, second]);
  const third = clarification('third', 'γ'.repeat(20_000));
  assert.throws(() => getPlanningContinuationClarifications({ priorClarifications: [first, second], clarifications: third }), /100,000-byte/);
  assert.deepEqual(getPlanningContinuationClarifications({}), []);
});
