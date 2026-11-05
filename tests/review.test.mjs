import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, sourceHash } from '../dist-electron/electron/storage.js';
import { recordReview, reviewFeedback, copyReviewSource } from '../dist-electron/electron/review.js';
import { applicationTestFiles } from '../dist-electron/electron/verification.js';
import { withDesktopCompatibility, reviewRestartMessage } from '../dist-electron/shared/desktop-api.js';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-review-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new Store(root); await store.init();
  const project = store.state.projects[0];
  project.runId = 'reviewed-run'; project.workspace = path.join(root, 'workspace'); project.status = 'review';
  await fs.mkdir(project.workspace);
  await fs.writeFile(path.join(project.workspace, 'index.html'), '<h1>Current build</h1>');
  project.report = { sourceHash: await sourceHash(project.workspace) };
  return { root, store, project };
}

test('review notes require useful bounded comments', () => {
  for (const value of [undefined, null, '', 'short', ' '.repeat(10), 'a'.repeat(10001)]) assert.throws(() => reviewFeedback(value), /10 to 10,000/);
  assert.equal(reviewFeedback('  Keep entered values after errors.  '), 'Keep entered values after errors.');
});

test('change requests and later approval keep a durable run-scoped review history', async t => {
  const { root, store, project } = await fixture(t);
  const first = await recordReview(store, project, 'changes_requested', 'Keep entered values after errors.');
  assert.equal(first.runId, 'reviewed-run'); assert.equal(project.approvedAt, undefined);
  assert.equal(await sourceHash(project.workspace), project.report.sourceHash, 'Human review does not alter verified source');
  project.runId = 'next-run';
  const approved = await recordReview(store, project, 'approved', 'Retested errors; entered values are retained.');
  assert.equal(project.status, 'approved'); assert.equal(project.approvedAt, approved.createdAt);
  const reloaded = new Store(root); await reloaded.init();
  assert.deepEqual(reloaded.project(project.id).reviewHistory.map(item => [item.runId, item.decision]), [['reviewed-run', 'changes_requested'], ['next-run', 'approved']]);
  const artifact = JSON.parse(await fs.readFile(path.join(project.workspace, 'review.json'), 'utf8'));
  assert.equal(artifact.approvedAt, approved.createdAt); assert.equal(artifact.history[0].feedback, first.feedback);
});

test('a failed review save restores prior state and review artifact', async t => {
  const { store, project } = await fixture(t);
  await recordReview(store, project, 'changes_requested', 'Keep entered values after errors.');
  const previous = structuredClone(project), artifact = await fs.readFile(path.join(project.workspace, 'review.json'), 'utf8');
  store.save = async () => { throw new Error('Disk full'); };
  await assert.rejects(recordReview(store, project, 'approved', 'The updated errors are now useful.'), /Disk full/);
  assert.deepEqual(project, previous);
  assert.equal(await fs.readFile(path.join(project.workspace, 'review.json'), 'utf8'), artifact);
});

test('prior source is copied without old evidence or answer keys, and reference tests never execute', async t => {
  const { root, project } = await fixture(t);
  await fs.writeFile(path.join(project.workspace, 'app.test.cjs'), 'throw new Error("Old test must not run");');
  await fs.writeFile(path.join(project.workspace, 'evaluation-plan.json'), '{"sealed":"answer"}');
  await fs.writeFile(path.join(project.workspace, 'test-report.json'), '{"passed":1}');
  await fs.mkdir(path.join(project.workspace, '.fleet'));
  await fs.writeFile(path.join(project.workspace, '.fleet', 'packet.json'), '{}');
  const next = path.join(root, 'next');
  const snapshot = path.join(next, '.review-source');
  await copyReviewSource(project.workspace, snapshot);
  assert.equal(await fs.readFile(path.join(snapshot, 'index.html'), 'utf8'), '<h1>Current build</h1>');
  for (const file of ['evaluation-plan.json', 'test-report.json', '.fleet/packet.json']) await assert.rejects(fs.access(path.join(snapshot, file)), /ENOENT/);
  await fs.writeFile(path.join(next, 'new.test.cjs'), 'Current test');
  assert.deepEqual(await applicationTestFiles(next), ['new.test.cjs']);
});

test('a renderer update on an old desktop bridge gives a clear restart message', async () => {
  await assert.rejects(withDesktopCompatibility({}).requestChanges('id', 'Keep entered values.'), error => error.message === reviewRestartMessage);
  await assert.rejects(withDesktopCompatibility({ requestChanges: async () => { throw new Error("No handler registered for 'fleet:request-changes'"); } }).requestChanges('id', 'Keep entered values.'), error => error.message === reviewRestartMessage);
  const calls = [];
  await withDesktopCompatibility({ requestChanges: async (...args) => calls.push(args) }).requestChanges('id', 'Keep entered values.');
  assert.deepEqual(calls, [['id', 'Keep entered values.']]);
});
