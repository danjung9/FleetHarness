import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importMailMcpDemo } from '../scripts/import-mailmcp-demo.mjs';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { reportHash } from '../dist-electron/electron/delivery.js';

const json = (file, value) => fs.writeFile(file, JSON.stringify(value, null, 2));
const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));

async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mailmcp-import-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const profile = path.join(root, 'main'), sourceProfile = path.join(root, 'demo'), bundle = path.join(root, 'bundle');
  const runId = 'mailmcp-demo-run-001';
  const workspace = path.join(sourceProfile, 'workspaces', 'mailmcp-demo', runId);
  await fs.mkdir(profile); await fs.mkdir(workspace, { recursive: true });
  await fs.mkdir(path.join(bundle, 'workspace'), { recursive: true });
  await fs.mkdir(path.join(bundle, 'python', 'bin'), { recursive: true });
  await fs.writeFile(path.join(bundle, 'python', 'bin', 'python3.12'), 'portable runtime', { mode: 0o755 });
  await fs.symlink('python3.12', path.join(bundle, 'python', 'bin', 'python3'));
  await fs.writeFile(path.join(bundle, 'backend-entry.py'), 'print("demo")\n');
  const manifest = { schemaVersion: 1, projectId: 'mailmcp-demo', label: 'AppYard Demo',
    repository: 'https://github.com/shourovsahaaa/mailmcp', commit: 'a'.repeat(40), python: 'python/bin/python3.12', entry: 'backend-entry.py' };
  await json(path.join(bundle, 'manifest.json'), manifest);
  await fs.writeFile(path.join(workspace, 'README.md'), 'Saved demo files and local notes.\n');
  await fs.writeFile(path.join(bundle, 'workspace', 'README.md'), 'Original seed source.\n');
  const report = { time: '2026-11-05T12:00:00Z', command: 'demo checks', exitCode: 0, passed: 1, failed: 0, skipped: 0, total: 1, output: 'passed', durationMs: 1, sourceHash: await sourceHash(workspace) };
  const project = { id: 'mailmcp-demo', title: 'MailMCP with saved notes', runId, workspace, status: 'review',
    demo: { kind: 'mailmcp', activity: 'simulated', repository: manifest.repository, commit: manifest.commit },
    criteria: [], logs: [], stages: [{ id: 'review', status: 'review' }], feedback: 'My existing review notes.',
    processScope: { runId, marker: 'original-process-marker', cleanup: 'confirmed' },
    report, verification: { runId, reportHash: reportHash(report) },
    conversation: { status: 'idle', messages: [{ role: 'user', text: 'Keep this note.' }], questions: [], actions: [] } };
  await json(path.join(workspace, 'test-report.json'), report);
  const original = { version: 1, projects: [{ id: 'existing-build', title: 'Existing work', status: 'draft', feedback: 'Keep me.' }],
    settings: { backend: 'codex', provider: 'saved-provider', model: 'saved-model', rememberKey: true, developerMode: true }, extraState: { retain: true } };
  await json(path.join(profile, 'state.json'), original);
  await json(path.join(sourceProfile, 'state.json'), { version: 1, projects: [project], settings: { model: 'demo-only' } });
  const seed = structuredClone(project); delete seed.workspace; delete seed.verification; delete seed.processScope;
  seed.title = 'Seed demo'; seed.report.sourceHash = '';
  await json(path.join(bundle, 'seed-project.json'), seed);
  return { root, profile, sourceProfile, bundle, workspace, project, original };
}

test('imports the saved demo with its runtime and evidence while preserving both profiles', async t => {
  const f = await fixture(t);
  const targetBefore = await fs.readFile(path.join(f.profile, 'state.json'));
  const sourceBefore = await fs.readFile(path.join(f.sourceProfile, 'state.json'));
  const result = await importMailMcpDemo(f);
  assert.equal(result.imported, true); assert.equal(result.evidencePreserved, true);
  const state = await readJSON(path.join(f.profile, 'state.json')), imported = state.projects[1];
  assert.deepEqual(state.settings, f.original.settings);
  assert.deepEqual(state.extraState, f.original.extraState);
  assert.deepEqual(state.projects[0], f.original.projects[0]);
  assert.equal(imported.feedback, f.project.feedback);
  assert.deepEqual(imported.conversation, f.project.conversation);
  assert.equal(imported.workspace, path.join(f.profile, 'workspaces', imported.id, imported.runId));
  assert.notEqual(imported.processScope.marker, f.project.processScope.marker);
  assert.equal(imported.processScope.cleanup, 'confirmed');
  assert.deepEqual(imported.report, f.project.report); assert.deepEqual(imported.verification, f.project.verification);
  assert.equal(await sourceHash(imported.workspace), imported.report.sourceHash);
  assert.equal(await fs.readlink(path.join(result.runtime, 'python', 'bin', 'python3')), 'python3.12');
  assert.ok((await fs.stat(path.join(result.runtime, 'python', 'bin', 'python3.12'))).mode & 0o100);
  assert.deepEqual(await fs.readFile(result.backup), targetBefore);
  assert.deepEqual(await fs.readFile(path.join(f.sourceProfile, 'state.json')), sourceBefore);
  assert.equal(await fs.readFile(path.join(f.workspace, 'README.md'), 'utf8'), 'Saved demo files and local notes.\n');
});

test('repeating an import preserves edits to the imported build and adds no duplicate', async t => {
  const f = await fixture(t), first = await importMailMcpDemo(f);
  const state = await readJSON(path.join(f.profile, 'state.json'));
  state.projects[1].title = 'My edited title'; state.projects[1].feedback = 'New notes after import.';
  await json(path.join(f.profile, 'state.json'), state);
  await fs.writeFile(path.join(first.workspace, 'README.md'), 'My edited source.');
  const before = await fs.readFile(path.join(f.profile, 'state.json'));
  assert.equal((await importMailMcpDemo(f)).imported, false);
  assert.deepEqual(await fs.readFile(path.join(f.profile, 'state.json')), before);
  assert.equal(await fs.readFile(path.join(first.workspace, 'README.md'), 'utf8'), 'My edited source.');
  assert.equal((await fs.readdir(path.join(f.profile, 'backups'))).length, 1);
});

test('an unrelated project using the demo ID is rejected without overwriting state', async t => {
  const f = await fixture(t);
  f.original.projects[0].id = 'mailmcp-demo';
  await json(path.join(f.profile, 'state.json'), f.original);
  const before = await fs.readFile(path.join(f.profile, 'state.json'));
  await assert.rejects(importMailMcpDemo(f), /different project/);
  assert.deepEqual(await fs.readFile(path.join(f.profile, 'state.json')), before);
  assert.equal((await fs.readdir(f.profile)).includes('.mailmcp-import.lock'), false);
});

test('an active Electron profile must be closed before any import writes', async t => {
  const f = await fixture(t);
  await fs.symlink(`${os.hostname()}-${process.pid}`, path.join(f.profile, 'SingletonLock'));
  await assert.rejects(importMailMcpDemo(f), /Quit AppYard/);
  assert.deepEqual((await fs.readdir(f.profile)).sort(), ['SingletonLock', 'state.json']);
});

test('the seed can initialize a demo when no saved source profile exists', async t => {
  const f = await fixture(t);
  const result = await importMailMcpDemo({ profile: f.profile, bundle: f.bundle });
  const imported = (await readJSON(path.join(f.profile, 'state.json'))).projects[1];
  assert.equal(imported.title, 'Seed demo'); assert.equal(result.evidencePreserved, true);
  assert.equal(imported.report.sourceHash, await sourceHash(result.workspace));
  assert.equal(imported.verification.reportHash, reportHash(imported.report));
  assert.deepEqual(await readJSON(path.join(result.workspace, 'test-report.json')), imported.report);
});

test('changed saved source is imported without manufacturing fresh verification or approval', async t => {
  const f = await fixture(t);
  const state = await readJSON(path.join(f.sourceProfile, 'state.json'));
  state.projects[0].status = 'approved'; state.projects[0].approvedAt = '2026-11-05T13:00:00Z'; state.projects[0].approval = { reportHash: 'old' };
  await json(path.join(f.sourceProfile, 'state.json'), state);
  await fs.writeFile(path.join(f.workspace, 'README.md'), 'Changed since verification.');
  const result = await importMailMcpDemo(f);
  const imported = (await readJSON(path.join(f.profile, 'state.json'))).projects[1];
  assert.equal(result.evidencePreserved, false); assert.equal(imported.status, 'review');
  assert.equal(imported.verification, undefined); assert.equal(imported.approval, undefined); assert.equal(imported.approvedAt, undefined);
  assert.equal(imported.report.sourceHash, f.project.report.sourceHash);
  assert.equal(await fs.readFile(path.join(result.workspace, 'README.md'), 'utf8'), 'Changed since verification.');
});

test('unowned runtime files and incomplete source activity are rejected', async t => {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.profile, 'demos', 'mailmcp'), { recursive: true });
  await fs.writeFile(path.join(f.profile, 'demos', 'mailmcp', 'keep.txt'), 'Keep existing files.');
  await assert.rejects(importMailMcpDemo(f), /destination files already exist/);
  assert.equal(await fs.readFile(path.join(f.profile, 'demos', 'mailmcp', 'keep.txt'), 'utf8'), 'Keep existing files.');
  await fs.rm(path.join(f.profile, 'demos'), { recursive: true });
  const state = await readJSON(path.join(f.sourceProfile, 'state.json'));
  state.projects[0].processScope.cleanup = 'pending';
  await json(path.join(f.sourceProfile, 'state.json'), state);
  await assert.rejects(importMailMcpDemo(f), /unfinished activity/);
  assert.deepEqual(await readJSON(path.join(f.profile, 'state.json')), f.original);
});
