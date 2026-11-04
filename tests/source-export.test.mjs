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
  return { root, workspace, parent, title: 'Approved app', verifiedHash: await sourceHash(workspace), evidence: { report: '{"result":"host report"}', review: '{"approved":true}' }, deliveryMarkdown: '# Approved delivery\nBrowser evidence is included.' };
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

test('BUG-E2 editing index.html after the first copy rejects a mixed revision', async t => {
  const input = await fixture(t);
  let changed = false;
  await assert.rejects(exportVerifiedBundle(input, undefined, async (source, destination) => {
    await fs.copyFile(source, destination);
    if (!changed) {
      changed = true;
      assert.notEqual(path.basename(source), 'index.html');
      await fs.appendFile(path.join(input.workspace, 'index.html'), '<p>Unreviewed copy change</p>');
    }
  }), /during export/);
  assert.equal(changed, true);
  await onlyExisting(input.parent);
});

test('BUG-H1 different file path and content boundaries produce different source hashes', async t => {
  const left = await fixture(t), right = await fixture(t);
  await fs.writeFile(path.join(left.workspace, 'a'), 'bc');
  await fs.writeFile(path.join(right.workspace, 'ab'), 'c');
  assert.notEqual(await sourceHash(left.workspace), await sourceHash(right.workspace));
});

test('BUG-H1 different boundaries between file contents produce different source hashes', async t => {
  const { root } = await fixture(t);
  const left = path.join(root, 'left'), right = path.join(root, 'right');
  await fs.mkdir(left); await fs.mkdir(right);
  // Both legacy encodings are "aXbYbZ", with identical file names and total byte counts.
  await fs.writeFile(path.join(left, 'a'), 'XbY');
  await fs.writeFile(path.join(left, 'b'), 'Z');
  await fs.writeFile(path.join(right, 'a'), 'X');
  await fs.writeFile(path.join(right, 'b'), 'YbZ');
  assert.notEqual(await sourceHash(left), await sourceHash(right));
});

test('BUG-H1 an ambiguously renamed artifact cannot reuse the approved export hash', async t => {
  const input = await fixture(t);
  await fs.writeFile(path.join(input.workspace, 'a'), 'bc');
  input.verifiedHash = await sourceHash(input.workspace);
  await fs.rm(path.join(input.workspace, 'a'));
  await fs.writeFile(path.join(input.workspace, 'ab'), 'c');
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
  await fs.symlink(input.workspace, alias);
  await assert.rejects(exportVerifiedBundle({ ...input, parent: alias }), /outside the agent workspace/);
  assert.equal(await sourceHash(input.workspace), input.verifiedHash);
  await onlyExisting(input.parent);
});

for (const target of ['page.html', 'node_modules/page.html']) test('an entry point symlink cannot bypass hashing or export: ' + target, async t => {
  const input = await fixture(t);
  await fs.mkdir(path.dirname(path.join(input.workspace, target)), { recursive: true });
  await fs.writeFile(path.join(input.workspace, target), '<h1>Unverified page</h1>');
  await fs.rm(path.join(input.workspace, 'index.html'));
  await fs.symlink(target, path.join(input.workspace, 'index.html'));
  await assert.rejects(sourceHash(input.workspace), /symlinks/);
  await assert.rejects(exportVerifiedBundle(input), /symlinks/);
  await onlyExisting(input.parent);
});

test('source export cannot succeed without a regular entry point', async t => {
  const input = await fixture(t);
  await fs.rm(path.join(input.workspace, 'index.html'));
  input.verifiedHash = await sourceHash(input.workspace);
  await assert.rejects(exportVerifiedBundle(input), /index.html entry point/);
  await onlyExisting(input.parent);
});

test('workspace receipt edits cannot replace authoritative evidence', async t => {
  const input = await fixture(t);
  await fs.writeFile(path.join(input.workspace, 'test-report.json'), '{"passed":999}');
  await fs.writeFile(path.join(input.workspace, 'review.json'), '{"feedback":"forged"}');
  const destination = await exportVerifiedBundle(input);
  assert.equal(await fs.readFile(path.join(destination, 'test-report.json'), 'utf8'), input.evidence.report);
  assert.equal(await fs.readFile(path.join(destination, 'review.json'), 'utf8'), input.evidence.review);
});
