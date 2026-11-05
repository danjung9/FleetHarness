import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { newProject } from '../dist-electron/electron/storage.js';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { prepareBriefData } from '../dist-electron/electron/brief-data.js';
import { briefFingerprint, readRunCheckpoint, writeRunCheckpoint } from '../dist-electron/electron/run-checkpoint.js';

const sample = { name: 'sample.json', kind: 'text', content: '{"values":[1,2]}' };
const additional = { name: 'observations.csv', kind: 'file', content: 'name,value\n café,3\n東京,5\n' };
// Captured from the pre-fix serializer after the existing input normalization.
const legacyInputHash = '454ae8dfccf43ee2f66ca620cc97e2cc720c5ebecb8c416a045c22ad39d8e98d';
const legacyNoInputHash = '0d1e8e9077fd945faa2b6fa9932b90197eb7a510b9f7ac498527e32b89c1581c';

function projectWith(inputs = [sample]) {
  return newProject({ title: 'Resume supplied data', description: 'Resume a command-line build with supplied example inputs.',
    criteria: ['Calculate sum.'], dataInputs: structuredClone(inputs) });
}

async function fixture(t, inputs = [sample], savedHash) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-checkpoint-inputs-'));
  const store = new LearningStore(root);
  t.after(async () => { store.close(); await fs.rm(root, { recursive: true, force: true }); });
  await store.init();
  const project = projectWith(inputs);
  project.runId = 'input-recovery-run';
  project.workspace = path.join(root, 'workspace');
  project.status = 'stopped'; project.resumeStage = 'build';
  await fs.mkdir(project.workspace);
  const data = await prepareBriefData(project.workspace, project.dataInputs);
  const experiment = { id: 'input-recovery-experiment', projectId: project.id, lineageId: 'input-recovery-lineage',
    partition: 'development', cohortKey: 'pending', mode: 'paired', status: 'stopped', baselineProfileId: 'node-cli',
    candidateIds: [project.id], createdAt: project.createdAt, updatedAt: project.updatedAt };
  store.createExperiment(experiment);
  store.putCandidate({ id: project.id, experimentId: experiment.id, profileId: 'node-cli', profileVersion: '1',
    baseline: true, status: 'stopped', createdAt: project.createdAt, updatedAt: project.updatedAt, executionState: project });
  const checkpoint = { version: 1, projectId: project.id, runId: project.runId, workspace: project.workspace,
    briefHash: savedHash ?? briefFingerprint(project), stage: 'build', context: 'Preserved candidate build.',
    phases: [], globalTools: [], packetHash: 'fixture-packet', requirements: 'Calculate sum.', acceptance: [], data };
  await writeRunCheckpoint(root, project, checkpoint);
  const checkpointFile = path.join(root, 'run-checkpoints', project.runId + '.json');
  return { root, store, project, checkpoint, checkpointFile,
    persisted: store.getCandidate(project.id).executionState };
}

test('normalized attached inputs retain the existing checkpoint fingerprint', () => {
  assert.equal(briefFingerprint(projectWith()), legacyInputHash);
});

const keyOrders = [
  ['name', 'kind', 'content'], ['name', 'content', 'kind'],
  ['kind', 'name', 'content'], ['kind', 'content', 'name'],
  ['content', 'name', 'kind'], ['content', 'kind', 'name'],
];
for (const order of keyOrders) {
  test(`input property order ${order.join('/')} preserves the original brief identity`, () => {
    const project = projectWith();
    project.dataInputs = [Object.fromEntries(order.map(key => [key, sample[key]]))];
    const before = JSON.stringify(project);
    assert.equal(briefFingerprint(project), legacyInputHash);
    assert.equal(JSON.stringify(project), before, 'Fingerprinting must not rewrite the supplied input object.');
  });
}

for (const [label, inputs, savedHash] of [
  ['one input and a pre-fix checkpoint', [sample], legacyInputHash],
  ['multiple file and pasted inputs', [sample, additional], undefined],
]) {
  test(`SQLite reload recovers ${label} without changing saved evidence`, async t => {
    const h = await fixture(t, inputs, savedHash);
    assert.deepEqual(h.persisted, JSON.parse(JSON.stringify(h.project)), 'Persistence changes property order, not JSON values.');
    assert.deepEqual(Object.keys(h.project.dataInputs[0]), ['name', 'kind', 'content']);
    assert.deepEqual(Object.keys(h.persisted.dataInputs[0]), ['content', 'kind', 'name']);
    const before = await fs.readFile(h.checkpointFile, 'utf8');
    assert.deepEqual(await readRunCheckpoint(h.root, h.persisted), h.checkpoint);
    assert.equal(briefFingerprint(h.persisted), briefFingerprint(h.project));
    assert.equal(await fs.readFile(h.checkpointFile, 'utf8'), before);
  });
}

const edits = [
  ['name', project => { project.dataInputs[0].name = 'renamed.json'; }],
  ['kind', project => { project.dataInputs[0].kind = 'file'; }],
  ['content', project => { project.dataInputs[0].content = '{"values":[1,3]}'; }],
  ['leading content whitespace', project => { project.dataInputs[0].content = ' ' + project.dataInputs[0].content; }],
  ['trailing content whitespace', project => { project.dataInputs[0].content += '\n'; }],
  ['input array order', project => { project.dataInputs.reverse(); }],
  ['input removal', project => { project.dataInputs.pop(); }],
  ['input addition', project => { project.dataInputs.push({ name: 'notes.txt', kind: 'text', content: 'An extra requirement.' }); }],
];
for (const [label, edit] of edits) {
  test(`a real ${label} change still rejects the checkpoint and preserves it`, async t => {
    const h = await fixture(t, [sample, additional]);
    // Keep normalized property order so this control cannot pass solely because of
    // the SQLite-order defect exercised by the recovery regressions above.
    const changed = structuredClone(h.project);
    edit(changed);
    assert.notEqual(briefFingerprint(changed), h.checkpoint.briefHash);
    const before = await fs.readFile(h.checkpointFile, 'utf8');
    await assert.rejects(readRunCheckpoint(h.root, changed), /brief or attached inputs changed/);
    assert.equal(await fs.readFile(h.checkpointFile, 'utf8'), before);
  });
}

test('no-input SQLite recovery and omitted inputs preserve the existing fingerprint', async t => {
  const h = await fixture(t, [], legacyNoInputHash);
  assert.equal(briefFingerprint(h.project), legacyNoInputHash);
  assert.deepEqual(await readRunCheckpoint(h.root, h.persisted), h.checkpoint);
  const omitted = structuredClone(h.persisted);
  delete omitted.dataInputs;
  assert.equal(briefFingerprint(omitted), legacyNoInputHash);
  assert.deepEqual(await readRunCheckpoint(h.root, omitted), h.checkpoint);
});
