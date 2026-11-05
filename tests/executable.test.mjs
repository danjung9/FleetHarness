import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { reportHash } from '../dist-electron/electron/delivery.js';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { newProject, sourceHash, Store } from '../dist-electron/electron/storage.js';
import { assertExecutableSource, stageExecutable, executableName, runPackageWorker, saveExecutable } from '../dist-electron/electron/executable.js';
import { loadQualityContract, verifyApplication } from '../dist-electron/electron/quality.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { solutionFixture, solutionFixtureEvaluator } from '../scripts/solution-fixture.mjs';
import { qualityFixtureHtml } from '../scripts/quality-fixture.mjs';

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
  await fs.symlink(path.join(root, 'outside.html'), path.join(project.workspace, 'index.html'));
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
  await fs.symlink(project.workspace, path.join(root, 'alias'));
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

async function verifiedBrowserFixture(t) {
  const prepared = await fixture(t), { project } = prepared;
  const acceptance = [{ id: 'R1', requirement: 'Parse tasks.', method: 'automated', scenario: 'Parse varied messages.' }];
  const files = solutionFixture(['R1']);
  const solution = JSON.parse(files['solution-contract.json']);
  solution.runtime.files = ['index.html', 'evaluate.cjs'];
  solution.runtime.files.push('assets/status.mjs', 'assets/style.css', 'assets/data.json', 'package.json', 'package-lock.json', 'main.cjs');
  solution.runtime.dependencies = { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' };
  files['solution-contract.json'] = JSON.stringify(solution);
  files['index.html'] = qualityFixtureHtml.replace('</head>', '<link rel="stylesheet" href="./assets/style.css"></head>')
    .replace('</body>', '<script type="module" src="./assets/status.mjs"></script></body>');
  files['evaluate.cjs'] = solutionFixtureEvaluator;
  files['assets/status.mjs'] = 'document.body.dataset.assetLoaded="yes";';
  files['assets/style.css'] = 'body { color: #123; }';
  files['assets/data.json'] = '{"purpose":"declared example"}';
  const packageJson = { name: 'agent-browser-payload', version: '1.0.0', private: true, main: 'main.cjs', dependencies: {},
    scripts: { postinstall: 'node main.cjs' } };
  files['package.json'] = JSON.stringify(packageJson);
  files['package-lock.json'] = JSON.stringify({ name: packageJson.name, version: packageJson.version, lockfileVersion: 3, requires: true, packages: { '': packageJson } });
  files['main.cjs'] = 'throw new Error("Generated payload main must never execute in Electron main");';
  files['app.test.cjs'] = `const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('actual parser core',()=>{const context={};const html=fs.readFileSync('index.html','utf8');vm.runInNewContext(html.split('/* CORE_START */')[1].split('/* CORE_END */')[0],context);assert.equal(context.parseTask('TASK: inspect valve'),'inspect valve');});`;
  files['.fleet/packet.json'] = JSON.stringify({ acceptance });
  for (const [name, body] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(project.workspace, name)), { recursive: true });
    await fs.writeFile(path.join(project.workspace, name), body);
  }
  const contract = await loadQualityContract(project.workspace, acceptance, true);
  project.report = await verifyApplication(project.workspace, process.execPath, contract, undefined, { browserTimeoutMs: 20_000, browserStepTimeoutMs: 2_000 });
  assert.equal(reportPassed(project.report, true), true, project.report.output);
  project.qualityVersion = 2; project.runtimeProfile = 'browser'; bindEvidence(project);
  return { ...prepared, solution };
}

// This verifies three separately installed packages and confirms each process
// sweep, plus a browser pass with its own 20-second deadline, before staging.
// The outer test budget must cover that combined work and its teardown.
test('version 2 browser staging isolates dependency manifests and generated main scripts while preserving declared assets', { timeout: 60_000 }, async t => {
  const { root, project } = await verifiedBrowserFixture(t);
  const staged = await stageExecutable(project, root);
  assert.deepEqual((await fs.readdir(staged.source)).sort(), ['application', 'main.cjs', 'package.json']);
  const payload = path.join(staged.source, 'application');
  assert.deepEqual((await fs.readdir(payload)).sort(), ['assets', 'evaluate.cjs', 'index.html', 'main.cjs', 'package-lock.json', 'package.json']);
  assert.deepEqual((await fs.readdir(path.join(payload, 'assets'))).sort(), ['data.json', 'status.mjs', 'style.css']);
  assert.equal(await fs.readFile(path.join(payload, 'assets/status.mjs'), 'utf8'), 'document.body.dataset.assetLoaded="yes";');
  assert.match(await fs.readFile(path.join(payload, 'main.cjs'), 'utf8'), /Generated payload main must never execute/);
  assert.doesNotMatch(await fs.readFile(path.join(staged.source, 'main.cjs'), 'utf8'), /Generated payload main must never execute/);
  const wrapperPackage = JSON.parse(await fs.readFile(path.join(staged.source, 'package.json'), 'utf8'));
  assert.equal(wrapperPackage.main, 'main.cjs');
  assert.notEqual(wrapperPackage.name, 'agent-browser-payload');
  assert.equal(wrapperPackage.scripts, undefined); assert.equal(wrapperPackage.dependencies, undefined);
  let handler, browserOptions;
  const electron = {
    app: { setName() {}, setPath() {}, getPath: () => root, whenReady: () => Promise.resolve(), on() {} },
    protocol: { registerSchemesAsPrivileged() {}, handle: (_scheme, value) => { handler = value; } },
    Menu: { setApplicationMenu() {}, buildFromTemplate: value => value },
    BrowserWindow: class {
      constructor(options) { browserOptions = options; this.webContents = { setWindowOpenHandler() {}, on() {}, session: { setPermissionRequestHandler() {}, setPermissionCheckHandler() {} } }; }
      loadURL() {} on() {}
    }
  };
  const require = createRequire(import.meta.url);
  vm.runInNewContext(await fs.readFile(path.join(staged.source, 'main.cjs'), 'utf8'), {
    require: name => name === 'electron' ? electron : require(name), __dirname: staged.source, process: { platform: 'linux' }, URL, Response
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(browserOptions.webPreferences.nodeIntegration, false);
  assert.equal(browserOptions.webPreferences.sandbox, false);
  const script = await handler({ url: 'fleet-app://app/assets/status.mjs', method: 'GET' });
  assert.equal(script.status, 200); assert.match(script.headers.get('content-type'), /javascript/);
  assert.equal(script.headers.get('content-security-policy'), null);
  assert.equal(await script.text(), 'document.body.dataset.assetLoaded="yes";');
  const dependencyManifest = await handler({ url: 'fleet-app://app/package.json', method: 'GET' });
  assert.equal(dependencyManifest.status, 200);
  assert.equal((await dependencyManifest.json()).name, 'agent-browser-payload');
  for (const url of ['fleet-app://app/.env', 'fleet-app://app/evaluation-plan.json', 'fleet-app://app/main.cjs', 'fleet-app://other/index.html']) {
    assert.equal((await handler({ url, method: 'GET' })).status, 404, url);
  }
  assert.equal((await handler({ url: 'fleet-app://app/index.html', method: 'POST' })).status, 404);
});

test('CLI runtime delivery offers source export and cannot become a browser-only standalone package', async t => {
  const { root, project } = await fixture(t);
  const acceptance = [{ id: 'R1', requirement: 'Calculate totals.', method: 'automated', scenario: 'Calculate independent examples.' }];
  await fs.mkdir(path.join(project.workspace, '.fleet'));
  await fs.writeFile(path.join(project.workspace, '.fleet/packet.json'), JSON.stringify({ acceptance }));
  const files = { 'solution-contract.json': JSON.stringify({ schemaVersion: 1, objective: 'Calculate totals.',
    runtime: { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } },
    capabilities: [{ id: 'total', kind: 'algorithm', description: 'Total values.', criterionIds: ['R1'], required: true, evaluationIds: ['examples'] }] }),
    'acceptance-plan.json': JSON.stringify({ schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Calculate correct totals.', journeyIds: [], capabilityIds: ['total'] }], journeys: [] }),
    'ux-spec.json': solutionFixture(['R1'])['ux-spec.json'],
    'evaluation-plan.json': JSON.stringify({ schemaVersion: 1, evaluations: [{ id: 'examples', capabilityId: 'total', description: 'Independent totals.',
      dataset: { name: 'totals', version: '1', provenance: 'synthetic' }, evaluator: 'exact', threshold: 1, trials: 1,
      cases: [{ id: 'values', input: [1, 2], expected: 3 }, { id: 'empty', input: [], expected: 0 }] }] }),
    'engine.mjs': "import { readFileSync } from 'node:fs'; console.log(JSON.stringify(JSON.parse(readFileSync(0,'utf8')).reduce((a,b)=>a+b,0)));",
    'app.test.cjs': "const test=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'); test('CLI sums',()=>assert.equal(spawnSync(process.execPath,['engine.mjs'],{input:'[1,2]',encoding:'utf8'}).stdout.trim(),'3'));"
  };
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(project.workspace, name), body);
  const contract = await loadQualityContract(project.workspace, acceptance, true);
  project.report = await verifyApplication(project.workspace, process.execPath, contract);
  project.qualityVersion = 2; project.runtimeProfile = 'cli'; bindEvidence(project);
  assert.equal(reportPassed(project.report, true), true, project.report.output);
  await assert.rejects(assertExecutableSource(project), /Python or a command-line engine; export the runnable source package/);
  await assert.rejects(stageExecutable(project, root), /export the runnable source package/);
});
