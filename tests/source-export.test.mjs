import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-source-export-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'), parent = path.join(root, 'exports');
  await fs.mkdir(path.join(workspace, '.quality-evidence'), { recursive: true });
  await fs.mkdir(path.join(parent, 'existing'), { recursive: true });
  await fs.writeFile(path.join(parent, 'existing', 'keep.txt'), 'Keep this earlier export.');
  await fs.writeFile(path.join(workspace, 'index.html'), '<h1>Approved app</h1>');
  await fs.writeFile(path.join(workspace, 'acceptance-plan.json'), '{"schemaVersion":1}');
  await fs.writeFile(path.join(workspace, '.quality-evidence', 'desktop.png'), 'Verified browser screenshot');
  await fs.writeFile(path.join(workspace, 'test-report.json'), '{"result":"host report"}');
  return { root, workspace, parent, title: 'Approved app', verifiedHash: await sourceHash(workspace), deliveryMarkdown: '# Approved delivery\nBrowser evidence is included.' };
}

async function onlyExisting(parent) {
  assert.deepEqual(await fs.readdir(parent), ['existing']);
  assert.equal(await fs.readFile(path.join(parent, 'existing', 'keep.txt'), 'utf8'), 'Keep this earlier export.');
}

test('source export preserves the verified revision and browser evidence in a new bundle', async t => {
  const input = await fixture(t), destination = await exportVerifiedBundle(input);
  assert.equal(await sourceHash(destination), input.verifiedHash);
  assert.equal(await fs.readFile(path.join(destination, '.quality-evidence', 'desktop.png'), 'utf8'), 'Verified browser screenshot');
  assert.equal(await fs.readFile(path.join(destination, 'test-report.json'), 'utf8'), '{"result":"host report"}');
  assert.equal(await fs.readFile(path.join(destination, 'DELIVERY.md'), 'utf8'), input.deliveryMarkdown);
  assert.equal(await fs.readFile(path.join(input.parent, 'existing', 'keep.txt'), 'utf8'), 'Keep this earlier export.');
});

test('an edit made while choosing an export folder is rejected before creating a bundle', async t => {
  const input = await fixture(t);
  await fs.appendFile(path.join(input.workspace, 'index.html'), 'Unverified change');
  await assert.rejects(exportVerifiedBundle(input), /changed after verification/);
  await onlyExisting(input.parent);
});

test('editing browser evidence during copying rejects export and removes only the new bundle', async t => {
  const input = await fixture(t);
  await assert.rejects(exportVerifiedBundle(input, undefined, async (source, destination) => {
    await fs.copyFile(source, destination);
    if (path.basename(source) === 'index.html') await fs.writeFile(path.join(input.workspace, '.quality-evidence', 'desktop.png'), 'Changed screenshot');
  }), /during export/);
  await onlyExisting(input.parent);
  assert.equal(await fs.readFile(path.join(input.workspace, '.quality-evidence', 'desktop.png'), 'utf8'), 'Changed screenshot');
});

test('a copied artifact mismatch is rejected even when the source still matches verification', async t => {
  const input = await fixture(t);
  await assert.rejects(exportVerifiedBundle(input, undefined, async (source, destination) => {
    await fs.copyFile(source, destination);
    if (path.basename(source) === 'index.html') await fs.appendFile(destination, 'Incomplete or altered copy');
  }), /copied bundle does not match/);
  assert.equal(await sourceHash(input.workspace), input.verifiedHash);
  await onlyExisting(input.parent);
});

test('cancellation during copying cleans the incomplete bundle and preserves earlier exports', async t => {
  const input = await fixture(t), controller = new AbortController();
  await assert.rejects(exportVerifiedBundle(input, controller.signal, async (source, destination) => {
    await fs.copyFile(source, destination); controller.abort();
  }), { name: 'AbortError' });
  await onlyExisting(input.parent);
});

test('export destinations inside the workspace are rejected through symlink aliases', async t => {
  const input = await fixture(t), alias = path.join(input.root, 'workspace-alias');
  await fs.symlink(input.workspace, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(exportVerifiedBundle({ ...input, parent: alias }), /outside the agent workspace/);
  assert.equal(await sourceHash(input.workspace), input.verifiedHash);
  await onlyExisting(input.parent);
});
