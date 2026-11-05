import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readMailMcpDemoBundle, seedMailMcpDemo } from '../dist-electron/electron/mailmcp-demo.js';
import { sourceHash, Store } from '../dist-electron/electron/storage.js';
import { reportHash } from '../dist-electron/electron/delivery.js';
import { mainHarness } from './helpers/main-harness.mjs';

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

const previewManifest = { schemaVersion: 1, projectId: 'mailmcp-demo', label: 'AppYard Demo', repository: 'https://github.com/shourovsahaaa/mailmcp', commit: 'a'.repeat(40), python: 'python/bin/python3.12', entry: 'backend-entry.py' };

async function writePreviewBundle(root) {
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(previewManifest));
}

async function previewFixture(t, { standalone = false, imported = true } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mailmcp-preview-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const profile = path.join(root, 'profile'), importedRoot = path.join(profile, 'demos', 'mailmcp'), standaloneRoot = path.join(root, 'standalone');
  if (imported) await writePreviewBundle(importedRoot);
  if (standalone) await writePreviewBundle(standaloneRoot);
  const store = new Store(profile); await store.init();
  const project = store.state.projects[0];
  Object.assign(project, { id: 'mailmcp-demo', title: 'MailMCP', runId: 'demo-run', status: 'review', demo: { kind: 'mailmcp' },
    workspace: path.join(profile, 'workspaces', 'mailmcp-demo', 'demo-run'), processScope: { runId: 'demo-run', marker: 'mailmcp-preview-marker', cleanup: 'confirmed' } });
  store.state.projects = [project];
  await fs.mkdir(project.workspace, { recursive: true });
  await store.save();
  const calls = { reads: [], bundles: [], starts: [], stops: 0, genericStarts: [], sweeps: [], order: [] };
  let selectedProfile, appName;
  const app = {
    commandLine: { appendSwitch() {} }, isPackaged: false, getAppPath: () => process.cwd(),
    getPath: name => name === 'userData' ? selectedProfile : root,
    setPath(name, value) { if (name === 'userData') selectedProfile = value; }, setName(value) { appName = value; },
    requestSingleInstanceLock: () => true, whenReady: () => ({ then() {} }), on() {}, quit() {},
  };
  const main = await mainHarness(store, { active: new Map(), models: () => [], async stop() {} }, 'electron/main.ts', {
    app, process: { ...process, env: { FLEET_USER_DATA: profile, ...(standalone ? { APPYARD_DEMO_BUNDLE: standaloneRoot } : {}) } },
    readMailMcpDemoBundle(bundleRoot) { calls.reads.push(bundleRoot); return readMailMcpDemoBundle(bundleRoot); },
    MailMcpDemoPreview: class {
      constructor(bundle) { calls.bundles.push(bundle); }
      async url(workspace, signal) { calls.starts.push({ workspace, signal }); calls.order.push('start'); return `http://127.0.0.1:${43210 + calls.starts.length}/`; }
      async stop() { calls.stops++; calls.order.push('stop'); }
    },
    ApplicationPreviews: class {
      async url(workspace) { calls.genericStarts.push(workspace); return 'http://127.0.0.1:49999/'; }
      async stop() {} async close() {}
    },
    RunProcessSweep: class {
      constructor({ marker }) { this.marker = marker; }
      run(work) { return work(); }
      async stop() { calls.sweeps.push(this.marker); calls.order.push('sweep'); }
    },
  });
  return { main, store, project, calls, profile, importedRoot, standaloneRoot, appName, selectedProfile };
}

test('an imported MailMCP build loads its profile runtime on preview and keeps ordinary AppYard identity', async t => {
  const { main, project, calls, profile, importedRoot, appName, selectedProfile } = await previewFixture(t);
  assert.equal(appName, 'AppYard');
  assert.equal(selectedProfile, profile);
  assert.deepEqual(calls.reads, [undefined]);
  assert.equal(calls.bundles.length, 0, 'An imported runtime is not loaded during ordinary startup');
  assert.equal(Object.hasOwn(await main.invoke('fleet:bootstrap'), 'demo'), false);

  assert.equal(await main.invoke('fleet:preview', project.id), 'http://127.0.0.1:43211/');
  assert.deepEqual(calls.reads, [undefined, importedRoot]);
  assert.equal(calls.bundles[0].root, importedRoot);
  assert.equal(calls.starts[0].workspace, project.workspace);
  assert.equal(calls.starts[0].signal.aborted, false);
  assert.deepEqual(calls.genericStarts, []);
  assert.equal(Object.hasOwn(await main.invoke('fleet:bootstrap'), 'demo'), false, 'Previewing an imported demo must not switch the app into standalone demo mode');
  await main.invoke('fleet:stop', project.id);
});

test('the standalone demo retains its identity, bootstrap metadata, and bundled runtime', async t => {
  const { main, project, calls, standaloneRoot, appName } = await previewFixture(t, { standalone: true });
  assert.equal(appName, 'AppYard Demo');
  assert.deepEqual((await main.invoke('fleet:bootstrap')).demo, {
    projectId: previewManifest.projectId, label: previewManifest.label, repository: previewManifest.repository, commit: previewManifest.commit,
  });
  assert.equal(calls.bundles[0].root, standaloneRoot);
  await main.invoke('fleet:preview', project.id);
  assert.deepEqual(calls.reads, [standaloneRoot], 'The profile import must not replace a standalone package runtime');
  assert.equal(calls.bundles.length, 1);
  assert.equal(calls.starts[0].workspace, project.workspace);
  assert.deepEqual(calls.genericStarts, []);
  await main.invoke('fleet:stop', project.id);
});

test('imported demo reloads stop and sweep the previous preview before reopening, and Stop persists cleanup', async t => {
  const { main, store, project, calls } = await previewFixture(t);
  await main.invoke('fleet:preview', project.id);
  assert.equal(project.processScope.cleanup, 'pending');
  assert.equal(await main.invoke('fleet:preview', project.id), 'http://127.0.0.1:43212/');
  assert.deepEqual(calls.order, ['start', 'stop', 'sweep', 'start']);
  assert.equal(calls.bundles.length, 1, 'Reload reuses the selected imported runtime');
  assert.equal(calls.starts.length, 2);
  assert.equal(project.processScope.cleanup, 'pending');
  await main.invoke('fleet:stop', project.id);
  assert.deepEqual(calls.order, ['start', 'stop', 'sweep', 'start', 'stop', 'sweep']);
  assert.deepEqual(calls.sweeps, [project.processScope.marker, project.processScope.marker]);
  assert.equal(project.processScope.cleanup, 'confirmed');
  const saved = JSON.parse(await fs.readFile(path.join(store.root, 'state.json'), 'utf8'));
  assert.equal(saved.projects[0].processScope.cleanup, 'confirmed');
  await main.invoke('fleet:stop', project.id);
  assert.equal(calls.stops, 2, 'Stopping an already stopped preview is harmless');
});

test('a missing imported demo runtime reports how to recover without falling back to a generic preview', async t => {
  const { main, project, calls, importedRoot } = await previewFixture(t, { imported: false });
  await assert.rejects(main.invoke('fleet:preview', project.id), /MailMCP preview runtime is missing\. Restore the demo runtime/);
  assert.deepEqual(calls.genericStarts, []);
  assert.equal(calls.bundles.length, 0);
  assert.equal(project.processScope.cleanup, 'confirmed');
  assert.deepEqual(calls.sweeps, [project.processScope.marker]);

  await writePreviewBundle(importedRoot);
  assert.equal(await main.invoke('fleet:preview', project.id), 'http://127.0.0.1:43211/');
  assert.equal(calls.bundles[0].root, importedRoot);
  await main.invoke('fleet:stop', project.id);
});
