import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { DataStorageService } from '../dist-electron/electron/data-storage.js';

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-storage-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'app'), output = path.join(directory, 'exports');
  await fs.mkdir(output);
  const store = new Store(root); await store.init();
  const project = newProject({ title: 'Storage example', description: 'Test an application with saved build files.', criteria: ['Works'] });
  project.workspace = path.join(root, 'workspaces', project.id, 'current-run'); project.runId = 'current-run';
  project.status = 'approved'; project.approvedAt = new Date().toISOString(); project.exportedTo = '/previous/export';
  project.report = { sourceHash: 'old', passed: 1, failed: 0 };
  project.verification = { runId: project.runId, reportHash: 'old-report' };
  project.approval = { runId: project.runId, sourceHash: 'old', reportHash: 'old-report', approvedAt: project.approvedAt, feedback: 'Approved build', scope: 'app' };
  project.processScope = { runId: project.runId, marker: 'completed-run', cleanup: 'confirmed' };
  project.runCheckpoint = { version: 1, briefHash: 'brief', requirementsHash: 'requirements', packetHash: 'packet', context: 'saved build', repairAttempts: 0, writerState: 'idle' };
  project.visualReview = { verdict: 'passed' }; project.resumeStage = 'build';
  project.executable = { status: 'ready', platform: 'darwin', arch: 'arm64', fileName: 'app.zip' };
  store.state.projects = [project]; await store.save();
  const active = new Set(), owners = [], reserved = new Set();
  let changes = 0;
  const options = { store, isActive: id => active.has(id) || reserved.has(id), candidateProjects: () => owners,
    beforeMutation: async id => {
      if (active.has(id) || reserved.has(id)) throw new Error('busy');
      reserved.add(id); return () => reserved.delete(id);
    }, changed: () => changes++ };
  const service = new DataStorageService(options); await service.init();
  const write = async (file, content = file) => { await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true }); await fs.writeFile(path.join(root, file), content); };
  const current = `workspaces/${project.id}/current-run`, old = `workspaces/${project.id}/old-run`;
  await write(`${current}/app.js`, 'console.log("hello");');
  await write(`${old}/README.md`, '# Previous build');
  return { directory, root, output, store, project, active, reserved, owners, service, options, write, current, old,
    changes: () => changes, items: async () => (await service.storageOverview()).items,
    find: async runId => (await service.storageOverview()).items.find(item => item.runId === runId) };
}

test('inventory includes previous builds, dependencies, hidden evidence, real experiment workspaces and sessions', async t => {
  const f = await fixture(t);
  await f.write(`${f.current}/node_modules/pkg/index.js`, 'dependency bytes');
  await f.write(`${f.current}/.quality-evidence/report.json`, 'evidence');
  await f.write(`sessions/${f.project.id}/agent.jsonl`, 'session');
  await f.write('learning/workspaces/candidate-a/candidate-run/source.py', 'candidate');
  await f.write('learning/workspaces/shared-experiment/shared-run/plan.md', 'plan');
  await f.write('learning/sessions/candidate-a/chat.jsonl', 'scoped session');
  await f.write('learning/experiments/experiment/shared.json', 'private host metadata');
  f.owners.push({ projectId: f.project.id, scopedProjectId: 'candidate-a', protected: true },
    { projectId: f.project.id, scopedProjectId: 'shared-experiment', protected: true });
  const overview = await f.service.storageOverview();
  assert.equal(overview.items.length, 6);
  const current = overview.items.find(item => item.current);
  assert.equal(current.fileCount, 3);
  assert.equal(current.bytes, Buffer.byteLength('console.log("hello");dependency bytesevidence'));
  assert.equal(overview.projects[0].buildCount, 4);
  assert.equal(overview.projects[0].bytes, overview.items.reduce((sum, item) => sum + item.bytes, 0));
  const stateBytes = (await fs.stat(path.join(f.root, 'state.json'))).size;
  assert.equal(overview.otherBytes, stateBytes + Buffer.byteLength('private host metadata'));
  assert.equal(overview.totalBytes, overview.projects[0].bytes + overview.otherBytes);
  const files = await f.service.storageFiles(current.id);
  assert.equal(files.find(file => file.path.startsWith('node_modules')).category, 'dependencies');
  assert.equal(files.find(file => file.path.startsWith('.quality-evidence')).category, 'evidence');
  assert.equal(JSON.stringify(overview).includes(f.root), false, 'renderer summaries contain opaque identities, not host paths');
});

test('file trash invalidates saved verification and restores bytes without reviving approval', async t => {
  const f = await fixture(t), item = await f.find('current-run');
  const entry = await f.service.storageTrash(item.id, 'app.js');
  assert.equal(entry.kind, 'file');
  await assert.rejects(fs.stat(path.join(f.root, f.current, 'app.js')), { code: 'ENOENT' });
  for (const field of ['report', 'verification', 'approval', 'approvedAt', 'exportedTo', 'executable', 'resumeStage', 'visualReview']) assert.equal(f.project[field], undefined, field);
  assert.equal(f.project.status, 'stopped'); assert.equal(f.project.runId, 'current-run');
  const persisted = JSON.parse(await fs.readFile(path.join(f.root, 'state.json'), 'utf8')).projects[0];
  assert.equal(persisted.report, undefined); assert.equal(persisted.workspace, f.project.workspace);
  const reopened = new DataStorageService(f.options); await reopened.init();
  assert.equal((await reopened.storageOverview()).trash[0].id, entry.id);
  await reopened.storageRestore(entry.id);
  assert.equal(await fs.readFile(path.join(f.root, f.current, 'app.js'), 'utf8'), 'console.log("hello");');
  assert.equal(f.project.report, undefined); assert.equal(f.project.approvedAt, undefined);
  assert.equal((await reopened.storageOverview()).trash.length, 0);
  assert.equal(f.reserved.size, 0);
});

test('whole current build removal resets run references and recovery keeps it as a historical build', async t => {
  const f = await fixture(t), item = await f.find('current-run');
  const entry = await f.service.storageTrash(item.id);
  assert.equal(entry.kind, 'build');
  for (const field of ['workspace', 'runId', 'processScope', 'runCheckpoint', 'verification', 'approval']) assert.equal(f.project[field], undefined, field);
  assert.equal(f.project.status, 'draft'); assert.ok(f.project.stages.every(stage => stage.status === 'queued'));
  assert.equal(await f.find('current-run'), undefined);
  const reopenedStore = new Store(f.root, () => { throw new Error('A removed build must not trigger process recovery.'); });
  await reopenedStore.init();
  const reopenedProject = reopenedStore.project(f.project.id);
  assert.equal(reopenedProject.status, 'draft');
  assert.equal(reopenedProject.error, undefined);
  const reopened = new DataStorageService({ ...f.options, store: reopenedStore }); await reopened.init();
  assert.equal((await reopened.storageOverview()).trash[0].id, entry.id);
  await reopened.storageRestore(entry.id);
  assert.equal((await reopened.storageOverview()).items.find(item => item.runId === 'current-run').current, false);
  assert.equal(await fs.readFile(path.join(f.root, f.current, 'app.js'), 'utf8'), 'console.log("hello");');
  assert.equal(reopenedProject.status, 'draft');
  assert.equal(reopenedProject.report, undefined);
  assert.equal(reopenedProject.approval, undefined);
});

test('deleting and restoring a historical build preserves the current project and its approval', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  const before = structuredClone(f.project);
  const entry = await f.service.storageTrash(item.id);
  assert.equal(await f.find('old-run'), undefined);
  assert.deepEqual(f.project, before);
  assert.equal(await fs.readFile(path.join(f.root, f.current, 'app.js'), 'utf8'), 'console.log("hello");');
  await f.service.storageRestore(entry.id);
  assert.equal((await f.find('old-run')).current, false);
  assert.equal(await fs.readFile(path.join(f.root, f.old, 'README.md'), 'utf8'), '# Previous build');
  assert.deepEqual(f.project, before);
});

test('restoration refuses collisions and restores a parent build before an individually trashed file', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  const file = await f.service.storageTrash(item.id, 'README.md');
  await f.write(`${f.old}/README.md`, 'new contents');
  await assert.rejects(f.service.storageRestore(file.id), /already exists/);
  assert.equal(await fs.readFile(path.join(f.root, f.old, 'README.md'), 'utf8'), 'new contents');
  await fs.rm(path.join(f.root, f.old, 'README.md'));
  const build = await f.service.storageTrash(item.id);
  await assert.rejects(f.service.storageRestore(file.id), /folder first/);
  await f.service.storageRestore(build.id); await f.service.storageRestore(file.id);
  assert.equal(await fs.readFile(path.join(f.root, f.old, 'README.md'), 'utf8'), '# Previous build');
});

test('active projects reject mutations and export; saved experiment evidence unlocks only after forgetting its owners', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  f.active.add(f.project.id);
  assert.equal((await f.find('old-run')).canTrash, false);
  await assert.rejects(f.service.storageTrash(item.id), /active work/);
  await assert.rejects(f.service.storageArchiveProject(f.project.id, true), /active work/);
  await assert.rejects(f.service.exportTo(item.id, f.output), /active work/);
  assert.equal(f.reserved.size, 0);
  f.active.clear();
  f.owners.push({ projectId: f.project.id, workspace: path.join(f.root, f.old), protected: true });
  assert.match((await f.find('old-run')).blockedReason, /Forget/);
  await assert.rejects(f.service.storageTrash(item.id, 'README.md'), /experiment evidence/);
  f.owners.splice(0);
  const entry = await f.service.storageTrash(item.id);
  f.active.add(f.project.id);
  await assert.rejects(f.service.storageRestore(entry.id), /active work/);
  await assert.rejects(f.service.storageDeleteForever(entry.id), /active work/);
});

test('untrusted file paths and symlink ancestors cannot escape storage, while targets stay untouched', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  const secret = path.join(f.directory, 'secret.txt'); await fs.writeFile(secret, 'private');
  await fs.symlink(secret, path.join(f.root, f.old, 'linked.txt'));
  await fs.symlink(f.directory, path.join(f.root, f.old, 'linked-folder'));
  for (const file of ['../current-run/app.js', '/etc/passwd', 'linked.txt', 'linked-folder/secret.txt', 'x/../../README.md', 'x\\..\\secret']) {
    await assert.rejects(f.service.storageReadFile(item.id, file));
    await assert.rejects(f.service.storageTrash(item.id, file));
    await assert.rejects(f.service.resolveTarget(item.id, file));
  }
  const overview = await f.service.storageOverview();
  assert.ok(overview.warnings.some(warning => /Symbolic links/.test(warning)));
  assert.equal((await f.service.storageFiles(item.id)).some(file => file.path.includes('linked')), false);
  const moved = path.join(f.root, f.old + '-moved');
  await fs.rename(path.join(f.root, f.old), moved);
  await fs.symlink(moved, path.join(f.root, f.old));
  await assert.rejects(f.service.storageTrash(item.id), /no longer available/);
  await assert.rejects(f.service.storageFiles(item.id), /no longer available/);
  assert.equal(await fs.readFile(secret, 'utf8'), 'private');
  await assert.rejects(f.service.storageDeleteForever('../../secret'));
  await assert.rejects(f.service.storageTrash(path.join(f.root, f.old)));
});

test('failed state save rolls back files and in-memory project fields, including archive actions', async t => {
  const f = await fixture(t), item = await f.find('current-run');
  const before = structuredClone(f.project), save = f.store.save;
  f.store.save = async () => { throw new Error('disk full'); };
  await assert.rejects(f.service.storageTrash(item.id, 'app.js'), /disk full/);
  assert.deepEqual(f.project, before);
  assert.equal(await fs.readFile(path.join(f.root, f.current, 'app.js'), 'utf8'), 'console.log("hello");');
  assert.equal((await f.service.storageOverview()).trash.length, 0);
  await assert.rejects(f.service.storageArchiveProject(f.project.id, true), /disk full/);
  assert.deepEqual(f.project, before); assert.equal(f.reserved.size, 0);
  f.store.save = save;
  await f.service.storageArchiveProject(f.project.id, true);
  assert.ok(f.project.archivedAt); assert.deepEqual(f.project.report, before.report);
  await f.service.storageArchiveProject(f.project.id, false); assert.equal(f.project.archivedAt, undefined);
});

test('pending trash manifests recover a crash after rename and conservatively invalidate the current build', async t => {
  const f = await fixture(t), item = await f.find('current-run'), id = randomUUID();
  const record = { version: 1, id, name: 'app.js', projectId: f.project.id, projectTitle: f.project.title, kind: 'file',
    bytes: 21, deletedAt: new Date().toISOString(), original: `${f.current}/app.js`, itemRelative: f.current, itemKind: 'build', phase: 'prepared' };
  await f.write(`storage-trash/${id}/manifest.json`, JSON.stringify(record));
  await fs.rename(path.join(f.root, f.current, 'app.js'), path.join(f.root, 'storage-trash', id, 'payload'));
  const recovered = new DataStorageService(f.options); await recovered.init();
  assert.equal(f.project.report, undefined); assert.equal(f.project.resumeStage, undefined);
  assert.equal((await recovered.storageOverview()).trash[0].id, id);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.root, 'storage-trash', id, 'manifest.json'))).phase, 'ready');
  await recovered.storageRestore(id);
  assert.equal((await recovered.storageFiles(item.id)).length, 1);
});

test('unreadable or forged manifests preserve bytes and never authorize paths outside managed builds', async t => {
  const f = await fixture(t), id = randomUUID();
  await f.write(`storage-trash/${id}/manifest.json`, '{broken'); await f.write(`storage-trash/${id}/payload`, 'recover me');
  const recovered = new DataStorageService(f.options); await recovered.init();
  const overview = await recovered.storageOverview();
  assert.equal(overview.trash.length, 0); assert.ok(overview.trashBytes >= 10);
  assert.ok(overview.warnings.some(warning => /records could not be read/.test(warning)));
  await assert.rejects(recovered.storageDeleteForever(id));
  assert.equal(await fs.readFile(path.join(f.root, 'storage-trash', id, 'payload'), 'utf8'), 'recover me');
  const record = { version: 1, id, name: 'state.json', projectId: f.project.id, projectTitle: f.project.title, kind: 'file',
    bytes: 10, deletedAt: new Date().toISOString(), original: 'state.json', itemRelative: 'state.json', itemKind: 'build', phase: 'ready' };
  await f.write(`storage-trash/${id}/manifest.json`, JSON.stringify(record));
  await assert.rejects(recovered.storageRestore(id), /Invalid trash/);
  await assert.rejects(recovered.storageDeleteForever(id), /Invalid trash/);
});

test('permanent deletion is limited to trash and interrupted explicit deletion finishes on restart', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  const entry = await f.service.storageTrash(item.id);
  const manifest = path.join(f.root, 'storage-trash', entry.id, 'manifest.json');
  const record = JSON.parse(await fs.readFile(manifest, 'utf8'));
  await fs.writeFile(manifest, JSON.stringify({ ...record, phase: 'deleting' }));
  const recovered = new DataStorageService(f.options); await recovered.init();
  await assert.rejects(fs.stat(path.dirname(manifest)), { code: 'ENOENT' });
  const current = await f.find('current-run');
  const second = await recovered.storageTrash(current.id, 'app.js');
  await recovered.storageDeleteForever(second.id);
  assert.equal((await recovered.storageOverview()).trash.length, 0);
  await assert.rejects(recovered.storageRestore(second.id));
});

test('exports include dependencies, exclude links, create unique folders, and never overwrite or write inside managed storage', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  await f.write(`${f.old}/node_modules/a/index.js`, 'package');
  await f.write(`${f.old}/run.sh`, '#!/bin/sh\necho hello\n');
  await fs.chmod(path.join(f.root, f.old, 'run.sh'), 0o755);
  await fs.symlink(path.join(f.root, 'state.json'), path.join(f.root, f.old, 'private-link'));
  const first = await f.service.exportTo(item.id, f.output), second = await f.service.exportTo(item.id, f.output);
  assert.notEqual(first, second);
  assert.equal(await fs.readFile(path.join(first, 'node_modules/a/index.js'), 'utf8'), 'package');
  assert.equal((await fs.stat(path.join(first, 'run.sh'))).mode & 0o777, 0o755);
  assert.equal((await fs.readdir(first)).includes('private-link'), false);
  const file = path.join(f.output, 'copied.md');
  assert.equal(await f.service.exportTo(item.id, file, 'README.md'), path.join(await fs.realpath(f.output), 'copied.md'));
  await assert.rejects(f.service.exportTo(item.id, file, 'README.md'), /already exists/);
  await assert.rejects(f.service.exportTo(item.id, f.root), /outside AppYard/);
  await assert.rejects(f.service.exportTo(item.id, path.join(f.root, f.old, 'overwrite.md'), 'README.md'), /outside AppYard/);
  const hardlink = path.join(f.root, f.old, 'hardlink.md');
  await fs.link(path.join(f.root, f.old, 'README.md'), hardlink);
  await assert.rejects(f.service.storageReadFile(item.id, 'hardlink.md'), /ordinary file/);
  await assert.rejects(f.service.exportTo(item.id, f.output), /ordinary file/);
  assert.equal(f.reserved.size, 0);
});

test('previews treat HTML and SVG as text, bound reads and report binary files clearly', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  await f.write(`${f.old}/page.html`, '<script>bad()</script>');
  await f.write(`${f.old}/icon.svg`, '<svg onload="bad()"/>');
  await f.write(`${f.old}/binary.dat`, Buffer.from([0, 1, 2]));
  await f.write(`${f.old}/large.txt`, 'x'.repeat(1024 * 1024 + 1));
  await f.write(`${f.old}/screen.png`, Buffer.from([137, 80, 78, 71]));
  assert.equal((await f.service.storageReadFile(item.id, 'page.html')).kind, 'text');
  assert.equal((await f.service.storageReadFile(item.id, 'icon.svg')).kind, 'text');
  assert.equal((await f.service.storageReadFile(item.id, 'binary.dat')).kind, 'binary');
  assert.match((await f.service.storageReadFile(item.id, 'large.txt')).message, /too large/);
  assert.match((await f.service.storageReadFile(item.id, 'screen.png')).url, /^data:image\/png;base64,/);
});

test('session deletion invalidates resuming but retains verified build evidence', async t => {
  const f = await fixture(t);
  await f.write(`sessions/${f.project.id}/session.jsonl`, 'saved conversation');
  const item = (await f.items()).find(item => item.kind === 'sessions');
  const previous = structuredClone(f.project.report);
  const entry = await f.service.storageTrash(item.id, 'session.jsonl');
  assert.equal(f.project.resumeStage, undefined); assert.deepEqual(f.project.report, previous);
  await f.service.storageRestore(entry.id); assert.equal(f.project.resumeStage, undefined);
});

test('ready trash from an older run does not invalidate a newer checkpoint on restart', async t => {
  const f = await fixture(t);
  await f.write(`sessions/${f.project.id}/old.jsonl`, 'old session');
  const item = (await f.items()).find(item => item.kind === 'sessions');
  await f.service.storageTrash(item.id, 'old.jsonl');
  f.project.runId = 'new-run'; f.project.resumeStage = 'verify';
  f.project.report = { sourceHash: 'new-verification', passed: 2, failed: 0 };
  await f.store.save();
  const reopened = new DataStorageService(f.options); await reopened.init();
  assert.equal(f.project.resumeStage, 'verify');
  assert.equal(f.project.report.sourceHash, 'new-verification');
});

test('a crash before the trash rename preserves verification and removes only the empty journal', async t => {
  const f = await fixture(t), id = randomUUID();
  const record = { version: 1, id, name: 'app.js', projectId: f.project.id, projectTitle: f.project.title, kind: 'file',
    bytes: 21, deletedAt: new Date().toISOString(), original: `${f.current}/app.js`, itemRelative: f.current, itemKind: 'build', phase: 'prepared' };
  await f.write(`storage-trash/${id}/manifest.json`, JSON.stringify(record));
  const reopened = new DataStorageService(f.options); await reopened.init();
  assert.equal(f.project.report.sourceHash, 'old'); assert.ok(f.project.approvedAt);
  await assert.rejects(fs.stat(path.join(f.root, 'storage-trash', id)), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(f.root, f.current, 'app.js'), 'utf8'), 'console.log("hello");');
});

test('restoration save failure preserves both byte copies and the previous project state', async t => {
  const f = await fixture(t), item = await f.find('current-run');
  const entry = await f.service.storageTrash(item.id, 'app.js');
  const before = structuredClone(f.project);
  f.store.save = async () => { throw new Error('state unavailable'); };
  await assert.rejects(f.service.storageRestore(entry.id), /state unavailable/);
  assert.deepEqual(f.project, before);
  assert.equal(await fs.readFile(path.join(f.root, f.current, 'app.js'), 'utf8'), 'console.log("hello");');
  assert.equal((await f.service.storageOverview()).trash[0].id, entry.id);
  assert.equal(f.reserved.size, 0);
});

test('selected experiment delivery evidence remains protected after its learning records are forgotten', async t => {
  const f = await fixture(t), item = await f.find('current-run');
  f.project.report.quality = { experiment: { experimentId: 'old-experiment' } };
  assert.match((await f.find('current-run')).blockedReason, /selected experiment build/);
  await assert.rejects(f.service.storageTrash(item.id), /selected experiment build/);
  assert.equal(f.owners.length, 0);
  assert.equal(await fs.readFile(path.join(f.root, f.current, 'app.js'), 'utf8'), 'console.log("hello");');
});

test('storage mutations serialize and release their activity reservation even when a later operation fails', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  let releaseFirst, firstStarted;
  const started = new Promise(resolve => { firstStarted = resolve; });
  const gate = new Promise(resolve => { releaseFirst = resolve; });
  const originalReserve = f.options.beforeMutation;
  let calls = 0;
  f.options.beforeMutation = async id => {
    calls++;
    const release = await originalReserve(id);
    if (calls === 1) { firstStarted(); await gate; }
    return release;
  };
  const one = f.service.storageArchiveProject(f.project.id, true);
  await started;
  const two = f.service.storageTrash(item.id, 'missing.txt');
  await Promise.resolve(); assert.equal(calls, 1); assert.equal(f.reserved.size, 1);
  releaseFirst(); await one;
  await assert.rejects(two, /ENOENT/);
  assert.equal(calls, 2); assert.equal(f.reserved.size, 0); assert.ok(f.project.archivedAt);
});

test('normal Electron app-data links do not flag healthy build folders', async t => {
  const f = await fixture(t);
  const outside = path.join(f.directory, 'browser-lock');
  await fs.writeFile(outside, 'not managed');
  await fs.symlink(outside, path.join(f.root, 'SingletonLock'));
  assert.deepEqual((await f.service.storageOverview()).warnings, []);
  await fs.symlink(outside, path.join(f.root, f.old, 'linked-file'));
  assert.ok((await f.service.storageOverview()).warnings.some(warning => /Symbolic links/.test(warning)));
  assert.equal(await fs.readFile(outside, 'utf8'), 'not managed');
});

test('a file appearing after the restore existence check is never overwritten', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  const entry = await f.service.storageTrash(item.id, 'README.md');
  const exists = f.service.exists.bind(f.service);
  let inserted = false;
  f.service.exists = async relative => {
    const result = await exists(relative);
    if (!inserted && relative === `${f.old}/README.md` && !result) {
      inserted = true; await f.write(`${f.old}/README.md`, 'new work from an editor');
    }
    return result;
  };
  await assert.rejects(f.service.storageRestore(entry.id), /already exists/);
  assert.equal(await fs.readFile(path.join(f.root, f.old, 'README.md'), 'utf8'), 'new work from an editor');
  assert.equal(await fs.readFile(path.join(f.root, 'storage-trash', entry.id, 'payload'), 'utf8'), '# Previous build');
  assert.equal((await f.service.storageOverview()).trash[0].id, entry.id);
});

test('a directory appearing after the restore existence check is never replaced', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  const entry = await f.service.storageTrash(item.id), exists = f.service.exists.bind(f.service);
  let inserted = false;
  f.service.exists = async relative => {
    const result = await exists(relative);
    if (!inserted && relative === f.old && !result) {
      inserted = true; await f.write(`${f.old}/watcher.txt`, 'new folder contents');
    }
    return result;
  };
  await assert.rejects(f.service.storageRestore(entry.id), /already exists/);
  assert.equal(await fs.readFile(path.join(f.root, f.old, 'watcher.txt'), 'utf8'), 'new folder contents');
  assert.equal(await fs.readFile(path.join(f.root, 'storage-trash', entry.id, 'payload', 'README.md'), 'utf8'), '# Previous build');
});

test('a mid-copy collision preserves new files and the complete trashed directory', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  await f.write(`${f.old}/a-first.txt`, 'first original file');
  await f.write(`${f.old}/z-last.txt`, 'last original file');
  const entry = await f.service.storageTrash(item.id);
  const restoreDestination = f.service.restoreDestination.bind(f.service);
  let inserted = false;
  f.service.restoreDestination = async (relative, created) => {
    const destination = await restoreDestination(relative, created);
    if (relative === `${f.old}/z-last.txt` && !inserted) {
      inserted = true; await fs.writeFile(destination, 'concurrent new file', { flag: 'wx' });
    }
    return destination;
  };
  await assert.rejects(f.service.storageRestore(entry.id), /already exists/);
  assert.equal(await fs.readFile(path.join(f.root, f.old, 'z-last.txt'), 'utf8'), 'concurrent new file');
  const payload = path.join(f.root, 'storage-trash', entry.id, 'payload');
  assert.equal(await fs.readFile(path.join(payload, 'README.md'), 'utf8'), '# Previous build');
  assert.equal(await fs.readFile(path.join(payload, 'a-first.txt'), 'utf8'), 'first original file');
  assert.equal(await fs.readFile(path.join(payload, 'z-last.txt'), 'utf8'), 'last original file');
});

test('directory restoration preserves symbolic links without reading or modifying their targets', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  const target = path.join(f.directory, 'external.txt'); await fs.writeFile(target, 'external bytes');
  await fs.symlink(target, path.join(f.root, f.old, 'external-link'));
  await fs.symlink('README.md', path.join(f.root, f.old, 'relative-link'));
  const entry = await f.service.storageTrash(item.id); await f.service.storageRestore(entry.id);
  assert.equal(await fs.readlink(path.join(f.root, f.old, 'external-link')), target);
  assert.equal(await fs.readlink(path.join(f.root, f.old, 'relative-link')), 'README.md');
  assert.equal(await fs.readFile(target, 'utf8'), 'external bytes');
});

test('a moved root replaced by a symlink is rejected by every storage operation', async t => {
  const f = await fixture(t), item = await f.find('old-run');
  const entry = await f.service.storageTrash(item.id, 'README.md');
  const savedRoot = f.root + '-saved', outside = path.join(f.directory, 'outside');
  await fs.rename(f.root, savedRoot); await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'sentinel'), 'untouched'); await fs.symlink(outside, f.root);
  for (const operation of [
    () => f.service.storageOverview(), () => f.service.storageFiles(item.id),
    () => f.service.storageReadFile(item.id, 'README.md'), () => f.service.resolveTarget(item.id),
    () => f.service.storageTrash(item.id), () => f.service.storageRestore(entry.id),
    () => f.service.storageDeleteForever(entry.id), () => f.service.storageArchiveProject(f.project.id, true),
    () => f.service.exportTo(item.id, f.output),
  ]) await assert.rejects(operation(), /storage folder moved or was replaced/);
  assert.deepEqual(await fs.readdir(outside), ['sentinel']);
  assert.equal(await fs.readFile(path.join(outside, 'sentinel'), 'utf8'), 'untouched');
  assert.equal(await fs.readFile(path.join(savedRoot, 'storage-trash', entry.id, 'payload'), 'utf8'), '# Previous build');
});

test('an ordinary replacement root and a replaced ancestor fail the pinned identity checks', async t => {
  const f = await fixture(t), savedRoot = f.root + '-saved';
  await fs.rename(f.root, savedRoot); await fs.mkdir(f.root);
  await assert.rejects(f.service.storageOverview(), /storage folder moved or was replaced/);
  await fs.rmdir(f.root); await fs.rename(savedRoot, f.root);
  const moved = f.directory + '-moved';
  await fs.rename(f.directory, moved); await fs.symlink(moved, f.directory);
  t.after(async () => { await fs.rm(f.directory, { force: true }); await fs.rm(moved, { recursive: true, force: true }); });
  await assert.rejects(f.service.storageOverview(), /storage folder moved or was replaced/);
});

test('committed trash changes notify even when the final ready journal write fails', async t => {
  const f = await fixture(t), item = await f.find('current-run'), before = f.changes();
  const writeRecord = f.service.writeRecord.bind(f.service);
  f.service.writeRecord = async record => { if (record.phase === 'ready') throw new Error('journal write failed'); await writeRecord(record); };
  await assert.rejects(f.service.storageTrash(item.id, 'app.js'), /journal write failed/);
  assert.equal(f.changes(), before + 1); assert.equal(f.project.report, undefined); assert.equal(f.project.approvedAt, undefined);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.root, 'state.json'))).projects[0].report, undefined);
  assert.equal((await f.service.storageOverview()).trash.length, 1);
});

test('committed restoration notifies and preserves invalidation when final record cleanup fails', async t => {
  const f = await fixture(t), item = await f.find('current-run');
  const entry = await f.service.storageTrash(item.id, 'app.js'), before = f.changes();
  f.service.removeRecord = async () => { throw new Error('record cleanup failed'); };
  await assert.rejects(f.service.storageRestore(entry.id), /record cleanup failed/);
  assert.equal(f.changes(), before + 1); assert.equal(f.project.report, undefined); assert.equal(f.project.approvedAt, undefined);
  assert.equal(await fs.readFile(path.join(f.root, f.current, 'app.js'), 'utf8'), 'console.log("hello");');
  const reopened = new DataStorageService(f.options); await reopened.init();
  assert.equal((await reopened.storageOverview()).trash.length, 0);
  assert.equal(f.project.report, undefined);
});

test('save-failure rollback never replaces a concurrently recreated original or revives approval', async t => {
  const f = await fixture(t), item = await f.find('current-run'), save = f.store.save;
  f.store.save = async () => { throw new Error('state write failed'); };
  const exists = f.service.exists.bind(f.service);
  let inserted = false;
  f.service.exists = async relative => {
    const result = await exists(relative);
    if (!inserted && relative === `${f.current}/app.js` && !result) {
      inserted = true; await f.write(`${f.current}/app.js`, 'new editor revision');
    }
    return result;
  };
  await assert.rejects(f.service.storageTrash(item.id, 'app.js'), /state write failed/);
  assert.equal(await fs.readFile(path.join(f.root, f.current, 'app.js'), 'utf8'), 'new editor revision');
  assert.equal(f.project.report, undefined); assert.equal(f.project.approvedAt, undefined);
  const trash = (await f.service.storageOverview()).trash;
  assert.equal(trash.length, 1);
  assert.equal(await fs.readFile(path.join(f.root, 'storage-trash', trash[0].id, 'payload'), 'utf8'), 'console.log("hello");');
  f.store.save = save;
  const reopened = new DataStorageService(f.options); await reopened.init();
  assert.equal(JSON.parse(await fs.readFile(path.join(f.root, 'state.json'))).projects[0].report, undefined);
  assert.equal(await fs.readFile(path.join(f.root, f.current, 'app.js'), 'utf8'), 'new editor revision');
});

test('repointed configured root aliases and ancestor aliases cannot redirect state saves', async t => {
  for (const ancestorAlias of [false, true]) await t.test(ancestorAlias ? 'symlink ancestor' : 'symlink root', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-storage-alias-test-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const actual = path.join(directory, 'actual'), external = path.join(directory, 'external'), alias = path.join(directory, 'alias');
    await fs.mkdir(actual); await fs.mkdir(external); await fs.symlink(actual, alias);
    const configuredRoot = ancestorAlias ? path.join(alias, 'app') : alias;
    const externalRoot = ancestorAlias ? path.join(external, 'app') : external;
    if (ancestorAlias) await fs.mkdir(externalRoot);
    const store = new Store(configuredRoot); await store.init();
    const project = store.state.projects[0];
    const service = new DataStorageService({ store, isActive: () => false, beforeMutation: async () => {}, changed: () => {} });
    await service.init(); await service.storageArchiveProject(project.id, true);
    const savedState = await fs.readFile(path.join(actual, ancestorAlias ? 'app/state.json' : 'state.json'), 'utf8');
    await fs.writeFile(path.join(externalRoot, 'state.json'), 'external state must survive');
    await fs.unlink(alias); await fs.symlink(external, alias);
    await assert.rejects(service.storageArchiveProject(project.id, false), /storage folder moved or was replaced/);
    await assert.rejects(service.storageOverview(), /storage folder moved or was replaced/);
    assert.equal(await fs.readFile(path.join(externalRoot, 'state.json'), 'utf8'), 'external state must survive');
    assert.equal(await fs.readFile(path.join(actual, ancestorAlias ? 'app/state.json' : 'state.json'), 'utf8'), savedState);
    assert.ok(project.archivedAt);
  });
});

test('restore save failure preserves an editor revision written before the final copy stat', async t => {
  const f = await fixture(t), item = await f.find('current-run');
  const entry = await f.service.storageTrash(item.id, 'app.js');
  const destination = path.join(await fs.realpath(f.root), f.current, 'app.js');
  const open = fs.open;
  let edited = false;
  fs.open = async (...args) => {
    const handle = await open(...args);
    if (args[0] === destination && typeof args[1] === 'number' && (args[1] & 1)) {
      const chmod = handle.chmod.bind(handle);
      handle.chmod = async mode => { await chmod(mode); await fs.writeFile(destination, 'new editor revision'); edited = true; };
    }
    return handle;
  };
  t.after(() => { fs.open = open; });
  f.store.save = async () => { throw new Error('state save failed'); };
  await assert.rejects(f.service.storageRestore(entry.id), /Copied files were kept in place.*state save failed/);
  assert.ok(edited);
  assert.equal(await fs.readFile(destination, 'utf8'), 'new editor revision');
  assert.equal(await fs.readFile(path.join(f.root, 'storage-trash', entry.id, 'payload'), 'utf8'), 'console.log("hello");');
  assert.equal(f.project.report, undefined); assert.equal(f.project.approvedAt, undefined);
});

test('failed file and folder exports preserve editor revisions absorbed by a post-write stat', async t => {
  for (const folder of [false, true]) await t.test(folder ? 'folder export' : 'file export', async t => {
    const f = await fixture(t), item = await f.find('old-run');
    const source = path.join(await fs.realpath(f.root), f.old, 'README.md'), outputRoot = await fs.realpath(f.output);
    const open = fs.open;
    let editedPath;
    fs.open = async (...args) => {
      const handle = await open(...args);
      if (args[0] === source) {
        const read = handle.read.bind(handle); let reads = 0;
        handle.read = async (...readArgs) => { if (++reads > 1) throw new Error('copy interrupted'); return read(...readArgs); };
      } else if (typeof args[0] === 'string' && args[0].startsWith(outputRoot + path.sep)) {
        const stat = handle.stat.bind(handle); let stats = 0;
        handle.stat = async (...statArgs) => {
          if (++stats === 2) { await fs.writeFile(args[0], 'new editor revision'); editedPath = args[0]; }
          return stat(...statArgs);
        };
      }
      return handle;
    };
    t.after(() => { fs.open = open; });
    await assert.rejects(folder ? f.service.exportTo(item.id, f.output)
      : f.service.exportTo(item.id, path.join(f.output, 'copy.md'), 'README.md'), /partial copy was kept.*copy interrupted/);
    assert.ok(editedPath);
    assert.equal(await fs.readFile(editedPath, 'utf8'), 'new editor revision');
    assert.equal(await fs.readFile(source, 'utf8'), '# Previous build');
  });
});
