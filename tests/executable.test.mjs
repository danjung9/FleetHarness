import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { reportHash } from '../dist-electron/electron/delivery.js';
import { newProject, sourceHash, Store } from '../dist-electron/electron/storage.js';
import { assertExecutableSource, stageExecutable, executableName, runPackageWorker, saveExecutable } from '../dist-electron/electron/executable.js';

function bindEvidence(project) {
  project.verification = { runId: project.runId, reportHash: reportHash(project.report) };
  project.approval = { runId: project.runId, sourceHash: project.report.sourceHash, reportHash: project.verification.reportHash, approvedAt: project.approvedAt, feedback: project.feedback };
}

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-package-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'); await fs.mkdir(workspace);
  await fs.writeFile(path.join(workspace, 'index.html'), '<h1>Offline tool</h1>');
  await fs.writeFile(path.join(workspace, '.env'), 'SECRET=do-not-ship');
  await fs.writeFile(path.join(workspace, 'main.cjs'), 'throw new Error("agent code must never become the host");');
  const project = { ...newProject({ title: 'A useful tool', description: 'A self contained offline application for testing.', criteria: ['Works offline.'] }), workspace, status: 'approved', approvedAt: new Date().toISOString() };
  project.report = { exitCode: 0, passed: 1, total: 1, failed: 0, skipped: 0, sourceHash: await sourceHash(workspace) };
  project.runId = 'synthetic-run';
  project.processScope = { runId: project.runId, marker: 'synthetic-marker', cleanup: 'confirmed' };
  project.stages.find(stage => stage.id === 'review').status = 'complete';
  bindEvidence(project);
  return { root, project };
}

test('packaging requires approval, passing evidence, and unchanged source', async t => {
  const { project } = await fixture(t);
  await assertExecutableSource(project);
  await assert.rejects(assertExecutableSource({ ...project, approvedAt: undefined }), /approve/);
  await assert.rejects(assertExecutableSource({ ...project, status: 'running' }), /approve/);
  await assert.rejects(assertExecutableSource({ ...project, report: { ...project.report, failed: 1 } }), /Passing/);
  await fs.appendFile(path.join(project.workspace, 'index.html'), 'changed');
  await assert.rejects(assertExecutableSource(project), /changed after verification/);
});

test('staging includes only the verified page and trusted wrapper, with a stable app identity', async t => {
  const { root, project } = await fixture(t);
  const first = await stageExecutable(project, root);
  assert.deepEqual((await fs.readdir(first.source)).sort(), ['index.html', 'main.cjs', 'package.json']);
  assert.equal(await fs.readFile(path.join(first.source, 'index.html'), 'utf8'), '<h1>Offline tool</h1>');
  assert.doesNotMatch(await fs.readFile(path.join(first.source, 'main.cjs'), 'utf8'), /agent code|SECRET/);
  const secondRoot = path.join(root, 'second'); await fs.mkdir(secondRoot);
  const second = await stageExecutable({ ...project, title: 'Renamed tool' }, secondRoot);
  assert.equal(first.appId, second.appId);
  assert.match(executableName({ title: '../../CON : " /' }), /^app-con/);
});

test('missing, oversized and escaped entry points cannot be packaged', async t => {
  const { root, project } = await fixture(t);
  await fs.rm(path.join(project.workspace, 'index.html'));
  await fs.writeFile(path.join(root, 'outside.html'), 'private');
  // Junctions test the same escaping reparse-point boundary on Windows without
  // requiring Developer Mode; Unix keeps its regular-file symlink coverage.
  await fs.symlink(process.platform === 'win32' ? root : path.join(root, 'outside.html'),
    path.join(project.workspace, 'index.html'), process.platform === 'win32' ? 'junction' : 'file');
  await assert.rejects(sourceHash(project.workspace), /symlinks/);
  await assert.rejects(stageExecutable(project, root), /symlinks/);
  await fs.rm(path.join(project.workspace, 'index.html'));
  await fs.writeFile(path.join(project.workspace, 'index.html'), 'x'.repeat(2_000_001));
  project.report.sourceHash = await sourceHash(project.workspace);
  bindEvidence(project);
  const other = path.join(root, 'other'); await fs.mkdir(other);
  await assert.rejects(stageExecutable(project, other), /2 MB/);
});

test('saving replaces a complete archive and rejects workspaces through symlink aliases', async t => {
  const { root, project } = await fixture(t);
  const archive = path.join(root, 'built.zip'), destination = path.join(root, 'download.zip');
  await fs.writeFile(archive, 'complete archive'); await fs.writeFile(destination, 'old archive');
  assert.equal(await saveExecutable(archive, destination, project.workspace), await fs.realpath(destination));
  assert.equal(await fs.readFile(destination, 'utf8'), 'complete archive');
  await fs.symlink(project.workspace, path.join(root, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(saveExecutable(archive, path.join(root, 'alias', 'bad.zip'), project.workspace), /outside/);
  await assert.rejects(saveExecutable(path.join(root, 'missing.zip'), destination, project.workspace));
  assert.equal(await fs.readFile(destination, 'utf8'), 'complete archive');
  assert.equal((await fs.readdir(root)).some(f => f.endsWith('.download')), false);
});

test('interrupted packaging recovers as retryable without losing approval', async t => {
  const { root, project } = await fixture(t);
  const store = new Store(path.join(root, 'store')); await store.init();
  project.executable = { status: 'packaging', platform: process.platform, arch: process.arch, fileName: 'app.zip' };
  store.state.projects = [project]; await store.save();
  const restored = new Store(store.root); await restored.init();
  assert.equal(restored.project(project.id).status, 'approved');
  assert.equal(restored.project(project.id).executable.status, 'failed');
  assert.match(restored.project(project.id).executable.error, /interrupted/);
});

test('a hanging packaging worker is terminated and cancellation never starts a worker', { timeout: 5000 }, async t => {
  const { root } = await fixture(t);
  const worker = path.join(root, 'hang.cjs'); await fs.writeFile(worker, 'setInterval(() => {}, 1000)');
  await assert.rejects(runPackageWorker({}, process.execPath, undefined, 100, worker), /exceeded/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runPackageWorker({}, '/missing-runtime', controller.signal));
  await assert.rejects(runPackageWorker({}, '/missing-runtime', undefined, 100, worker), /ENOENT/);
});

test('cancellation during final download commit restores the previous archive', async t => {
  const { root, project } = await fixture(t), controller = new AbortController();
  const archive = path.join(root, 'built.zip'), target = path.join(root, 'download.zip');
  await fs.writeFile(archive, 'NEW ZIP'); await fs.writeFile(target, 'PREVIOUS ZIP');
  await assert.rejects(saveExecutable(archive, target, project.workspace, controller.signal, async saved => {
    assert.equal(await fs.readFile(saved, 'utf8'), 'NEW ZIP'); controller.abort();
  }), { name: 'AbortError' });
  assert.equal(await fs.readFile(target, 'utf8'), 'PREVIOUS ZIP');
  assert.equal((await fs.readdir(root)).some(file => file.startsWith('.appyard-download-')), false);
});

test('an existing destination directory is preserved when download fails', async t => {
  const { root, project } = await fixture(t), archive = path.join(root, 'built.zip'), target = path.join(root, 'existing');
  await fs.writeFile(archive, 'NEW ZIP'); await fs.mkdir(target); await fs.writeFile(path.join(target, 'keep'), 'KEEP');
  await assert.rejects(saveExecutable(archive, target, project.workspace), /not a directory/);
  assert.equal(await fs.readFile(path.join(target, 'keep'), 'utf8'), 'KEEP');
});
