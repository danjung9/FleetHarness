import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseSystemDefinition } from '../dist-electron/shared/system-design.js';
import { createSystemDesignTools, checkSystemDesign, incompleteComponents } from '../dist-electron/electron/system-design.js';
import { Store, newProject, sourceHash } from '../dist-electron/electron/storage.js';
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
    const linkedDesign = structuredClone(fixtureSystemDesign);
    linkedDesign.components.find(component => component.id === 'parser').files = ['linked/outside.cjs'];
    await publish.execute('publish', linkedDesign);
    await fs.writeFile(path.join(root, 'outside.cjs'), 'outside');
    await fs.symlink(root, path.join(p.workspace, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    const update = createSystemDesignTools(p, 'build', controller.signal, async () => {})[0];
    await assert.rejects(update.execute('progress', { componentId: 'parser', status: 'generated', detail: 'Done' }), /Artifact symlinks are not allowed/);
    controller.abort();
    await assert.rejects(publish.execute('publish', fixtureSystemDesign));
    await assert.rejects(update.execute('progress', { componentId: 'parser', status: 'building', detail: 'Working' }));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
