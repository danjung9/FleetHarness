import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { DataStorageService } from '../dist-electron/electron/data-storage.js';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-storage-refresh-'));
  const store = new Store(root); await store.init();
  const project = newProject({ title: 'Live storage', description: 'Refresh saved build files while a folder is open.', criteria: ['Works'] });
  const relative = `workspaces/${project.id}/run`;
  project.workspace = path.join(root, relative); project.runId = 'run';
  store.state.projects = [project]; await store.save();
  const write = async (file, content) => {
    await fs.mkdir(path.dirname(path.join(root, relative, file)), { recursive: true });
    await fs.writeFile(path.join(root, relative, file), content);
  };
  await write('src/main.js', 'before');
  await write('README.md', 'readme');
  const active = new Set();
  const service = new DataStorageService({ store, isActive: id => active.has(id), beforeMutation: async () => {}, changed: () => {} });
  await service.init();
  t.after(async () => { await service.measuring; await fs.rm(root, { recursive: true, force: true }); });
  return { root, store, project, relative, write, active, service };
}

async function refresh(service) {
  await service.storageOverview({ background: true, refresh: true });
  await service.measuring;
  return service.storageOverview({ background: true });
}

test('background inventory responds before measurement and concurrent refreshes share one scan', async t => {
  const gate = Promise.withResolvers();
  t.after(() => gate.resolve());
  const f = await fixture(t);
  const walk = f.service.walk.bind(f.service);
  let scans = 0;
  f.service.walk = async (...args) => {
    if (args[0] === f.relative) { scans++; await gate.promise; }
    return walk(...args);
  };
  const first = await f.service.storageOverview({ background: true });
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0].measured, false);
  assert.equal(first.scanning, true);
  assert.equal(first.measuredAt, undefined);
  const repeated = await Promise.all(Array.from({ length: 4 }, () => f.service.storageOverview({ background: true, refresh: true })));
  assert.equal(scans, 1);
  assert.ok(repeated.every(overview => overview.scanning));
  gate.resolve(); await f.service.measuring;
  const measured = await f.service.storageOverview({ background: true });
  assert.equal(measured.scanning, false);
  assert.equal(measured.items[0].measured, true);
  assert.equal(measured.items[0].bytes, 12);
  assert.equal(measured.items[0].fileCount, 2);
  assert.match(measured.items[0].revision, /^[a-f0-9]{64}$/);
  assert.ok(measured.measuredAt);
  assert.equal(scans, 1, 'fresh polling does not recursively scan again');
  assert.equal(JSON.stringify(measured).includes(f.root), false);
});

test('cached measurements retain current project and active-work metadata', async t => {
  const f = await fixture(t), measured = await f.service.storageOverview();
  const walk = f.service.walk;
  f.service.walk = () => { throw new Error('Fresh polling should reuse measured sizes.'); };
  f.active.add(f.project.id);
  f.project.title = 'Updated title'; f.project.archivedAt = new Date().toISOString();
  const current = await f.service.storageOverview({ background: true });
  assert.equal(current.items[0].bytes, measured.items[0].bytes);
  assert.equal(current.items[0].projectTitle, 'Updated title');
  assert.equal(current.items[0].active, true);
  assert.equal(current.items[0].canTrash, false);
  assert.equal(current.projects[0].archived, true);
  assert.equal(current.projects[0].active, true);
  assert.equal(current.scanning, false);
  f.service.walk = walk;
});

test('complete and background callers never run overlapping measurements', async t => {
  const entered = Promise.withResolvers(), release = Promise.withResolvers();
  t.after(() => release.resolve());
  const f = await fixture(t), measure = f.service.measure.bind(f.service);
  let active = 0, peak = 0;
  f.service.measure = async (...args) => {
    peak = Math.max(peak, ++active); entered.resolve();
    try { await release.promise; return await measure(...args); }
    finally { active--; }
  };
  const first = f.service.storageOverview();
  await entered.promise;
  const second = f.service.storageOverview();
  assert.equal((await f.service.storageOverview({ background: true, refresh: true })).scanning, true);
  release.resolve();
  const complete = await Promise.all([first, second]);
  assert.equal(peak, 1);
  assert.ok(complete.every(overview => overview.items[0].fileCount === 2 && !overview.scanning));
});

test('complete inventories stay available while a mutation waits for its preview reservation', async t => {
  const entered = Promise.withResolvers(), release = Promise.withResolvers();
  t.after(() => release.resolve());
  const f = await fixture(t), first = await f.service.storageOverview();
  f.service.options.beforeMutation = async projectId => {
    f.active.add(projectId); entered.resolve(); await release.promise;
    return () => f.active.delete(projectId);
  };
  const mutation = f.service.storageTrash(first.items[0].id, 'src/main.js');
  await entered.promise;
  const waiting = await f.service.storageOverview();
  assert.equal(waiting.projects[0].active, true);
  assert.equal(waiting.items[0].canTrash, false);
  release.resolve(); await mutation;
  assert.equal((await f.service.storageOverview()).items[0].fileCount, 1);
});

test('revisions detect nested same-size writes, renames and deletions even with unchanged newest timestamps', async t => {
  const f = await fixture(t);
  const future = new Date(Date.now() + 60_000);
  await fs.utimes(path.join(f.root, f.relative, 'README.md'), future, future);
  const first = (await f.service.storageOverview()).items[0];
  const initialFiles = await f.service.storageFiles(first.id);
  const file = path.join(f.root, f.relative, 'src/main.js'), original = await fs.stat(file);
  await f.write('src/main.js', 'after!');
  await fs.utimes(file, original.atime, original.mtime);
  const edited = (await refresh(f.service)).items[0];
  assert.equal(edited.bytes, first.bytes);
  assert.equal(edited.updatedAt, first.updatedAt);
  assert.notEqual(edited.revision, first.revision);
  const editedFiles = await f.service.storageFiles(edited.id);
  assert.notEqual(editedFiles.find(file => file.path === 'src/main.js').revision, initialFiles.find(file => file.path === 'src/main.js').revision);
  assert.equal(editedFiles.find(file => file.path === 'README.md').revision, initialFiles.find(file => file.path === 'README.md').revision);
  assert.deepEqual(await f.service.storageFiles(edited.id), editedFiles, 'unchanged files keep their revisions');
  await fs.rename(file, path.join(f.root, f.relative, 'src/renamed.js'));
  const renamed = (await refresh(f.service)).items[0];
  assert.equal(renamed.updatedAt, first.updatedAt);
  assert.notEqual(renamed.revision, edited.revision);
  assert.deepEqual((await f.service.storageFiles(renamed.id)).map(file => file.path), ['README.md', 'src/renamed.js']);
  await fs.rm(path.join(f.root, f.relative, 'src/renamed.js'));
  const deleted = (await refresh(f.service)).items[0];
  assert.equal(deleted.fileCount, 1);
  assert.equal(deleted.updatedAt, first.updatedAt);
  assert.notEqual(deleted.revision, renamed.revision);
});

test('a partially committed mutation invalidates an older in-flight measurement', async t => {
  const entered = Promise.withResolvers(), release = Promise.withResolvers();
  t.after(() => release.resolve());
  const f = await fixture(t), first = await f.service.storageOverview();
  const walk = f.service.walk.bind(f.service);
  let held = false;
  f.service.walk = async (...args) => {
    const result = await walk(...args);
    if (args[0] === f.relative && args[3] > 1 && !held) {
      held = true; entered.resolve(); await release.promise;
    }
    return result;
  };
  await f.service.storageOverview({ background: true, refresh: true });
  await entered.promise;
  const writeRecord = f.service.writeRecord.bind(f.service);
  f.service.writeRecord = async record => {
    if (record.phase === 'ready') throw new Error('journal write failed');
    await writeRecord(record);
  };
  await assert.rejects(f.service.storageTrash(first.items[0].id, 'src/main.js'), /journal write failed/);
  release.resolve(); await f.service.measuring;
  const refreshing = await f.service.storageOverview({ background: true });
  assert.equal(refreshing.scanning, true, 'a scan from before the mutation cannot mark the cache fresh');
  await f.service.measuring;
  const updated = await f.service.storageOverview({ background: true });
  assert.equal(updated.items[0].fileCount, 1);
  assert.equal(updated.items[0].bytes, 6);
  assert.equal(updated.trash.length, 1);
  assert.equal(updated.trash[0].bytes, 6);
  assert.notEqual(updated.items[0].revision, first.items[0].revision);
});

test('mutations cancel stale background walks between batches instead of finishing a large tree', async t => {
  const entered = Promise.withResolvers(), release = Promise.withResolvers();
  t.after(() => release.resolve());
  const f = await fixture(t);
  await Promise.all(Array.from({ length: 128 }, (_, index) => f.write(`many/${index}.js`, 'file')));
  const guard = f.service.guard.bind(f.service);
  let guardedFiles = 0;
  f.service.guard = async (...args) => {
    if (args[0].startsWith(`${f.relative}/many/`)) {
      guardedFiles++; entered.resolve(); await release.promise;
    }
    return guard(...args);
  };
  await f.service.storageOverview({ background: true });
  await entered.promise;
  await f.service.storageArchiveProject(f.project.id, true);
  release.resolve(); await f.service.measuring;
  assert.ok(guardedFiles <= 16, `stale measurement inspected ${guardedFiles} files after cancellation`);
  f.service.guard = guard;
  const updated = await refresh(f.service);
  assert.equal(updated.items[0].fileCount, 130);
  assert.equal(updated.projects[0].archived, true);
  assert.equal(updated.scanning, false);
});

test('background snapshots and parallel file lists retain root and symlink protections', async t => {
  const f = await fixture(t), first = await f.service.storageOverview();
  const outside = `${f.root}-outside`;
  await fs.mkdir(outside); await fs.writeFile(path.join(outside, 'secret.txt'), 'external bytes');
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  await fs.symlink(outside, path.join(f.root, f.relative, 'linked'));
  const updated = await refresh(f.service);
  assert.equal(updated.items[0].bytes, 12);
  assert.ok(updated.warnings.some(warning => /Symbolic links/.test(warning)));
  assert.equal((await f.service.storageFiles(first.items[0].id)).length, 2);
  const moved = `${f.root}-moved`;
  await fs.rename(f.root, moved); await fs.symlink(outside, f.root);
  t.after(() => fs.rm(moved, { recursive: true, force: true }));
  await assert.rejects(f.service.storageOverview({ background: true }), /storage folder moved or was replaced/);
  await assert.rejects(f.service.storageFiles(first.items[0].id), /storage folder moved or was replaced/);
  assert.equal(await fs.readFile(path.join(outside, 'secret.txt'), 'utf8'), 'external bytes');
});
