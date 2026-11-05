import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseSystemDefinition } from '../dist-electron/shared/system-design.js';
import { createSystemDesignTools, checkSystemDesign, incompleteComponents } from '../dist-electron/electron/system-design.js';
import { Store, newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { fixtureSystemDesign } from '../scripts/mock-provider.mjs';

test('architecture and component tools are unavailable outside their assigned phases', () => {
  for (const stage of ['intake', 'research', 'review', 'deliver']) {
    assert.deepEqual(createSystemDesignTools({}, stage, new AbortController().signal, async () => {}), []);
  }
});

test('architecture rejects duplicate IDs, missing connection endpoints, unsafe files and excessive diagrams', () => {
  for (const edit of [
    d => { d.components[1].id = d.components[0].id; },
    d => { d.connections[0].to = 'missing'; },
    d => { d.connections.push(d.connections[0]); },
    d => { d.components[0].files = ['../secret']; },
    d => { d.components[0].files = ['/tmp/secret']; },
    d => { d.components[0].files = ['.fleet/packet.json']; },
    d => { d.components = Array(13).fill(d.components[0]); }
  ]) {
    const definition = structuredClone(fixtureSystemDesign); edit(definition);
    assert.throws(() => parseSystemDefinition(definition));
  }
});

test('live design progress persists, requires source, and never changes verification hashes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-design-'));
  try {
    const store = new Store(root); await store.init();
    const p = store.state.projects[0]; p.workspace = path.join(root, 'workspace'); await fs.mkdir(p.workspace);
    const signal = new AbortController().signal;
    const publish = createSystemDesignTools(p, 'plan', signal, () => store.save())[0];
    await publish.execute('publish', fixtureSystemDesign);
    assert.deepEqual(incompleteComponents(p), ['review-ui', 'parser', 'local-history']);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(p.workspace, 'system-design.json'), 'utf8')), fixtureSystemDesign);
    const update = createSystemDesignTools(p, 'build', signal, () => store.save())[0];
    await assert.rejects(update.execute('progress', { componentId: 'parser', status: 'generated', detail: 'Done' }));
    await assert.rejects(update.execute('progress', { componentId: 'unknown', status: 'building', detail: 'Working' }), /Unknown component/);
    await fs.writeFile(path.join(p.workspace, 'core.cjs'), 'exports.parse = text => text;');
    const before = await sourceHash(p.workspace);
    await update.execute('progress', { componentId: 'parser', status: 'building', detail: 'Working on extraction.' });
    assert.equal(p.systemDesign.progress.parser.status, 'building');
    await update.execute('progress', { componentId: 'parser', status: 'generated', detail: 'Extraction implemented.' });
    assert.equal(await sourceHash(p.workspace), before);
    const restored = new Store(root); await restored.init();
    assert.equal(restored.state.projects[0].systemDesign.progress.parser.status, 'generated');
    assert.equal(restored.state.projects[0].report, undefined);
    await checkSystemDesign(p);
    const changed = structuredClone(fixtureSystemDesign); changed.title = 'Different architecture';
    await fs.writeFile(path.join(p.workspace, 'system-design.json'), JSON.stringify(changed));
    await assert.rejects(checkSystemDesign(p), /changed outside/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('cancelled stages cannot publish and symlinked sources cannot claim completion', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-design-'));
  try {
    const p = newProject({ title: 'Design', description: 'Verify system diagram progress boundaries.', criteria: ['Track actual source.'] });
    p.workspace = path.join(root, 'workspace'); await fs.mkdir(p.workspace);
    const controller = new AbortController();
    const publish = createSystemDesignTools(p, 'plan', controller.signal, async () => {})[0];
    await publish.execute('publish', fixtureSystemDesign);
    await fs.writeFile(path.join(root, 'outside.cjs'), 'outside');
    await fs.symlink(path.join(root, 'outside.cjs'), path.join(p.workspace, 'core.cjs'));
    const update = createSystemDesignTools(p, 'build', controller.signal, async () => {})[0];
    await assert.rejects(update.execute('progress', { componentId: 'parser', status: 'generated', detail: 'Done' }), /inside its workspace/);
    controller.abort();
    await assert.rejects(publish.execute('publish', fixtureSystemDesign));
    await assert.rejects(update.execute('progress', { componentId: 'parser', status: 'building', detail: 'Working' }));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

async function restoredCandidateDesign(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-design-recovery-'));
  let store = new LearningStore(root);
  t.after(async () => { store.close(); await fs.rm(root, { recursive: true, force: true }); });
  await store.init();
  const project = newProject({ title: 'Recover published design', description: 'Preserve published application architecture across durable candidate recovery.',
    criteria: ['Preserve the same architecture when resuming verification.'] });
  project.workspace = path.join(root, 'workspace'); await fs.mkdir(project.workspace);
  const experiment = { id: 'design-recovery-experiment', projectId: project.id, lineageId: 'design-recovery-lineage', partition: 'development',
    cohortKey: 'design-recovery', mode: 'paired', status: 'stopped', baselineProfileId: 'node-cli', candidateIds: [project.id],
    createdAt: project.createdAt, updatedAt: project.updatedAt };
  store.createExperiment(experiment);
  store.putCandidate({ id: project.id, experimentId: experiment.id, profileId: 'node-cli', profileVersion: '1', baseline: true,
    status: 'stopped', createdAt: project.createdAt, updatedAt: project.updatedAt, executionState: project });
  const publish = createSystemDesignTools(project, 'plan', new AbortController().signal, async () => {
    store.updateCandidate(project.id, { executionState: structuredClone(project), workspace: project.workspace });
  })[0];
  await publish.execute('publish', fixtureSystemDesign);
  const file = path.join(project.workspace, 'system-design.json'), body = await fs.readFile(file, 'utf8');
  store.close(); store = new LearningStore(root); await store.init();
  const restored = store.getCandidate(project.id).executionState;
  assert.deepEqual(restored.systemDesign, project.systemDesign, 'SQLite retains the published architecture values.');
  assert.notEqual(JSON.stringify(restored.systemDesign.definition), JSON.stringify(project.systemDesign.definition),
    'The real SQLite boundary changes object insertion order.');
  return { restored, file, body };
}

test('SQLite-restored candidate architecture accepts the unchanged published system design', async t => {
  const h = await restoredCandidateDesign(t), before = structuredClone(h.restored);
  await checkSystemDesign(h.restored);
  assert.deepEqual(h.restored, before, 'Verification must not rewrite the saved project.');
  assert.equal(await fs.readFile(h.file, 'utf8'), h.body, 'Verification must preserve the published design bytes.');
});

for (const [name, edit] of [
  ['title', definition => { definition.title = 'A different application architecture'; }],
  ['component label', definition => { definition.components[0].label = 'Different interface'; }],
  ['component source file', definition => { definition.components[1].files[0] = 'different-core.cjs'; }],
  ['connection label', definition => { definition.connections[0].label = 'Different data flow'; }],
  ['component array order', definition => { definition.components.reverse(); }],
  ['connection array order', definition => { definition.connections.reverse(); }],
]) {
  test(`SQLite-restored candidate architecture still rejects a changed ${name}`, async t => {
    const h = await restoredCandidateDesign(t);
    edit(h.restored.systemDesign.definition);
    const before = structuredClone(h.restored);
    await assert.rejects(checkSystemDesign(h.restored), /changed outside the planning tool/);
    assert.deepEqual(h.restored, before, 'A failed comparison must not repair or rewrite changed saved architecture.');
    assert.equal(await fs.readFile(h.file, 'utf8'), h.body);
  });
}
