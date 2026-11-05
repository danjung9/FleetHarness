import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readMailMcpDemoBundle, seedMailMcpDemo } from '../dist-electron/electron/mailmcp-demo.js';
import { sourceHash, Store } from '../dist-electron/electron/storage.js';
import { reportHash } from '../dist-electron/electron/delivery.js';

test('ordinary installs have no demo; bundled executable paths cannot escape resources', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mailmcp-manifest-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  assert.equal(readMailMcpDemoBundle(undefined), undefined);
  assert.equal(readMailMcpDemoBundle(root), undefined);
  const manifest = { schemaVersion: 1, projectId: 'mailmcp-demo', label: 'AppYard Demo', repository: 'https://github.com/shourovsahaaa/mailmcp', commit: 'a'.repeat(40), python: '../python', entry: 'backend-entry.py' };
  await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  assert.throws(() => readMailMcpDemoBundle(root), /resource path/);
  manifest.python = 'python/bin/python3.12';
  await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  assert.equal(readMailMcpDemoBundle(root).python, manifest.python);
});

test('first launch seeds managed source and matching evidence without overwriting saved work', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mailmcp-seed-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const bundle = { root: path.join(root, 'bundle'), projectId: 'mailmcp-demo' };
  await fs.mkdir(path.join(bundle.root, 'workspace', 'source'), { recursive: true });
  await fs.writeFile(path.join(bundle.root, 'workspace', 'source', 'README.md'), 'Imported repository source.');
  const project = { id: bundle.projectId, runId: 'demo-run', title: 'MailMCP', description: 'Repository demo', criteria: [], stages: [], logs: [], status: 'review', feedback: '',
    report: { time: new Date().toISOString(), command: 'local workflow checks', exitCode: 0, passed: 1, failed: 0, skipped: 0, total: 1, output: 'passed', durationMs: 1, sourceHash: '' } };
  await fs.writeFile(path.join(bundle.root, 'seed-project.json'), JSON.stringify(project));
  const profile = path.join(root, 'profile');
  assert.equal(await seedMailMcpDemo(profile, bundle), true);
  const store = new Store(profile); await store.init();
  assert.equal(store.state.projects.length, 1);
  const seeded = store.project(bundle.projectId);
  assert.equal(seeded.workspace, path.join(profile, 'workspaces', bundle.projectId, project.runId));
  assert.equal(seeded.status, 'review');
  assert.equal(seeded.processScope.cleanup, 'confirmed');
  assert.equal(seeded.report.sourceHash, await sourceHash(seeded.workspace));
  assert.equal(seeded.verification.reportHash, reportHash(seeded.report));
  await fs.writeFile(path.join(seeded.workspace, 'source', 'README.md'), 'User edits.');
  seeded.title = 'Saved user title'; await store.save();
  assert.equal(await seedMailMcpDemo(profile, bundle), false);
  assert.equal(JSON.parse(await fs.readFile(path.join(profile, 'state.json'), 'utf8')).projects[0].title, 'Saved user title');
  assert.equal(await fs.readFile(path.join(seeded.workspace, 'source', 'README.md'), 'utf8'), 'User edits.');
  const ordinary = path.join(root, 'ordinary'); await fs.mkdir(ordinary);
  await fs.writeFile(path.join(ordinary, 'state.json'), 'existing profile');
  assert.equal(await seedMailMcpDemo(ordinary, bundle), false);
  assert.equal(await fs.readFile(path.join(ordinary, 'state.json'), 'utf8'), 'existing profile');
});
