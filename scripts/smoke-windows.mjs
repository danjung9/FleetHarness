import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { startFixtureProvider } from './mock-provider.mjs';
import { checkPackagedIntegrity } from './check-packaged-integrity.mjs';

// Run on a disposable Windows account/runner. NSIS registration uses the real
// application identity, so refuse to touch an existing AppYard installation.
const { values } = parseArgs({ options: {
  installer: { type: 'string' }, 'previous-installer': { type: 'string' }, output: { type: 'string' },
} });
assert.equal(process.platform, 'win32', 'The installed-app gate requires Windows.');
assert.equal(process.arch, 'x64', 'The installed-app gate requires Windows x64.');
async function installerPath(explicit, directory) {
  if (explicit) return path.resolve(explicit);
  const metadata = JSON.parse(await fs.readFile(path.join(directory, 'windows-build.json'), 'utf8'));
  assert.ok(metadata.installer, directory + '/windows-build.json needs an installer field.');
  return path.resolve(directory, metadata.installer);
}
const installers = {
  previous: await installerPath(values['previous-installer'], 'release-baseline'),
  candidate: await installerPath(values.installer, 'release'),
};
const candidateMetadata = JSON.parse(await fs.readFile(path.join(path.dirname(installers.candidate), 'windows-build.json'), 'utf8'));
const previousMetadata = JSON.parse(await fs.readFile(path.join(path.dirname(installers.previous), 'windows-build.json'), 'utf8'));
assert.equal(candidateMetadata.installer, path.basename(installers.candidate), 'Candidate metadata must describe the installer being validated.');
assert.equal(previousMetadata.installer, path.basename(installers.previous), 'Previous metadata must describe the installer being validated.');
for (const installer of Object.values(installers)) assert.ok((await fs.stat(installer)).isFile(), installer);
assert.equal(createHash('sha256').update(await fs.readFile(installers.candidate)).digest('hex'), candidateMetadata.sha256, 'Candidate installer checksum differs from build metadata.');
assert.equal(createHash('sha256').update(await fs.readFile(installers.previous)).digest('hex'), previousMetadata.sha256, 'Previous installer checksum differs from build metadata.');
assert.notEqual(installers.previous, installers.candidate, 'Upgrade validation needs two distinct installers.');
const output = path.resolve(values.output ?? 'output/windows-smoke');
await fs.mkdir(output, { recursive: true });
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-windows-smoke-')));
const installDir = path.join(root, 'AppYard');
const stateDir = path.join(root, 'state');
const piDir = path.join(root, 'pi');
const binary = path.join(installDir, 'AppYard.exe');
const result = { passed: false, platform: process.platform, arch: process.arch, installers, checks: [], root };
let app, page, generated, generatedData, fixture, installed = false, uninstallAttempted = false, stateCreated = false;
const rendererErrors = [];
const check = name => { result.checks.push(name); console.log('PASS ' + name); };
const childEnv = { ...process.env, FLEET_USER_DATA: stateDir, PI_CODING_AGENT_DIR: piDir };
delete childEnv.ELECTRON_RUN_AS_NODE;
delete childEnv.ELECTRON_NO_ASAR;
delete childEnv.VITE_DEV_SERVER_URL;

async function command(executable, args, options = {}) {
  const { timeout = 180_000, ...spawnOptions } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...spawnOptions });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Timed out: ${path.basename(executable)}`)); }, timeout);
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${path.basename(executable)} exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}
async function registration() {
  // Electron-builder UUIDv5 for appId dev.fleetharness.desktop, using its
  // 50e065bc-3134-11e6-9bab-38c9862bdaf3 namespace. Match identity first, and
  // legacy display names too: the default uninstall name includes the version.
  const script = "$ErrorActionPreference='Stop'; $roots=@('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'); $entries=@(Get-ItemProperty -Path $roots -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -eq '0a4ae40f-80ab-5617-ae8f-aa83a5ddafeb' -or $_.DisplayName -match '^(AppYard|fleetharness)( [0-9]+(\\.[0-9]+){1,3}([-+][0-9A-Za-z.-]+)?)?$' } | Select-Object DisplayName,DisplayVersion,InstallLocation,UninstallString,PSPath); ConvertTo-Json -InputObject $entries -Compress";
  return JSON.parse(await command('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]));
}
async function install(installer) {
  // NSIS requires /D last and unquoted, including when the directory has spaces.
  installed = true;
  await command(installer, ['/S', '/currentuser', '/D=' + installDir], { windowsVerbatimArguments: true, timeout: 300_000 });
  await fs.access(binary);
  checkPackagedIntegrity(path.join(installDir, 'resources', 'app.asar'));
  const records = await registration();
  assert.equal(records.length, 1, 'Exactly one AppYard uninstall registration must exist.');
  const record = records[0];
  assert.ok((record.InstallLocation || record.UninstallString).toLowerCase().includes(installDir.toLowerCase()),
    'NSIS must install into the isolated test folder.');
  return record;
}
async function launch() {
  // Isolate Chromium even if a module-load failure occurs before main.ts can
  // apply FLEET_USER_DATA. A broken package must not open the user's profile.
  app = await electron.launch({ executablePath: binary, args: ['--user-data-dir=' + stateDir], env: childEnv, timeout: 60_000 });
  app.process().stderr?.on('data', data => { void fs.appendFile(path.join(output, 'electron-stderr.log'), data).catch(() => {}); });
  page = await app.firstWindow({ timeout: 60_000 });
  page.on('pageerror', error => rendererErrors.push(error.message));
  await page.locator('.app-shell').waitFor({ timeout: 60_000 });
  stateCreated = true;
  await app.evaluate(({ shell }) => { shell.showItemInFolder = () => {}; });
  const identity = await app.evaluate(({ app }) => ({ packaged: app.isPackaged, version: app.getVersion(), name: app.getName(), userData: app.getPath('userData'), appData: app.getPath('appData'), appPath: app.getAppPath() }));
  assert.equal(identity.packaged, true);
  assert.equal(identity.name, 'AppYard');
  assert.equal(path.resolve(identity.userData).toLowerCase(), stateDir.toLowerCase());
  assert.ok(identity.appPath.endsWith('app.asar'), 'Use the installed ASAR application, not development sources.');
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  assert.equal(await page.evaluate(() => typeof window.fleetHarness.startRun), 'function');
  return identity;
}
async function closeApp() { if (app) { await app.close(); app = undefined; page = undefined; } }
const boot = () => page.evaluate(() => window.fleetHarness.bootstrap());
const project = id => page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(p => p.id === id), id);
async function completed(id) {
  await page.waitForFunction(async id => ['review', 'failed', 'stopped'].includes((await window.fleetHarness.bootstrap()).state.projects.find(p => p.id === id)?.status), id, { timeout: 180_000 });
  const current = await project(id);
  await fs.writeFile(path.join(output, 'last-fixture-run.json'), JSON.stringify(current, null, 2));
  assert.equal(current.status, 'review', current.error);
  assert.equal(current.report.passed, 1, current.report.output);
  assert.equal(current.report.failed, 0);
  assert.ok(current.report.quality.journeys.length >= 4, 'Run both primary/recovery journeys at desktop/narrow sizes.');
  assert.ok(current.report.quality.journeys.every(journey => journey.status === 'passed'));
  assert.equal(current.report.quality.requirementsMet, true);
  assert.ok(current.logs.some(log => log.text.includes('Starting one Pi repair attempt')));
  return current;
}
async function treeHash(directory) {
  const hash = createHash('sha256');
  async function walk(folder) {
    for (const entry of (await fs.readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(folder, entry.name);
      assert.equal(entry.isSymbolicLink(), false, 'Fixture workspaces must not contain symlinks.');
      if (entry.isDirectory()) await walk(file);
      else { hash.update(path.relative(directory, file)); hash.update(await fs.readFile(file)); }
    }
  }
  await walk(directory);
  return hash.digest('hex');
}
async function exportSource(id, name) {
  const destination = path.join(root, name); await fs.mkdir(destination);
  await app.evaluate(({ dialog }, directory) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [directory] }); }, destination);
  const exported = await page.evaluate(id => window.fleetHarness.exportProject(id), id);
  assert.ok(exported.startsWith(destination + path.sep));
  assert.match(await fs.readFile(path.join(exported, 'DELIVERY.md'), 'utf8'), /1\/1 passed/);
  assert.ok((await fs.stat(path.join(exported, 'index.html'))).size > 0);
  return exported;
}
async function exportExecutable(id) {
  const archive = path.join(root, 'candidate-standalone.zip');
  await app.evaluate(({ dialog }, filePath) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath }); }, archive);
  assert.equal(await page.evaluate(id => window.fleetHarness.downloadExecutable(id), id), archive);
  assert.ok((await fs.stat(archive)).size > 1_000_000);
  const exported = await project(id);
  assert.equal(exported.executable.status, 'ready', exported.executable.error);
  assert.equal(exported.executable.platform, 'win32');
  assert.equal(exported.executable.arch, 'x64');
  const extracted = path.join(root, 'standalone');
  await command('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `Expand-Archive -LiteralPath '${archive.replaceAll("'", "''")}' -DestinationPath '${extracted.replaceAll("'", "''")}'`]);
  const executable = (await fs.readdir(extracted)).find(name => name.endsWith('.exe'));
  assert.ok(executable, 'Generated export must contain a Windows executable.');
  generated = await electron.launch({ executablePath: path.join(extracted, executable), args: ['--user-data-dir=' + path.join(root, 'generated-bootstrap')], env: childEnv, timeout: 60_000 });
  const standalone = await generated.firstWindow({ timeout: 60_000 });
  const data = await generated.evaluate(({ app }) => ({ root: app.getPath('appData'), data: app.getPath('userData') }));
  const expectedName = 'dev.fleetharness.generated.' + createHash('sha256').update(id).digest('hex').slice(0, 24);
  assert.equal(data.data.toLowerCase(), path.join(data.root, expectedName).toLowerCase());
  generatedData = data.data;
  await standalone.getByLabel('Message', { exact: true }).fill('TASK: validate Windows export');
  await standalone.getByRole('button', { name: 'Parse message', exact: true }).click();
  assert.equal(await standalone.locator('#result').textContent(), 'validate Windows export');
  assert.equal(await standalone.evaluate(() => typeof window.fleetHarness), 'undefined');
  assert.equal(await standalone.evaluate(() => typeof window.require), 'undefined');
  await standalone.reload();
  assert.equal(await standalone.locator('#result').textContent(), 'validate Windows export');
  await standalone.screenshot({ path: path.join(output, 'standalone.png') });
  await generated.close(); generated = undefined;
}
async function uninstall() {
  uninstallAttempted = true;
  const uninstaller = path.join(installDir, 'Uninstall AppYard.exe');
  await fs.access(uninstaller);
  await command(uninstaller, ['/S', '/currentuser', '_?=' + installDir], { windowsVerbatimArguments: true });
  assert.equal((await registration()).length, 0, 'The temporary install registration must be removed.');
  installed = false;
  if (stateCreated) await fs.access(path.join(stateDir, 'state.json'));
}

try {
  assert.deepEqual(await registration(), [], 'An AppYard installation already exists. Use a disposable Windows account or runner for this test.');
  await fs.mkdir(piDir);
  fixture = await startFixtureProvider();
  await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: { 'fleet-fixture': {
    baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
    models: [{ id: 'fixture-model', name: 'Local test fixture', reasoning: false, input: ['text'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }],
  } } }));
  result.previousRegistration = await install(installers.previous);
  result.previous = await launch();
  result.previous.buildInfo = (await boot()).buildInfo ?? null;
  for (const key of ['version', 'revision', 'sourceUrl', 'buildId']) {
    assert.equal(result.previous.buildInfo?.[key], previousMetadata[key], 'Installed previous provenance mismatch: ' + key);
  }
  check('installed A starts from ASAR with isolated saved-state root');
  const beforeSettings = await boot();
  await assert.rejects(page.evaluate(id => window.fleetHarness.startRun(id), beforeSettings.state.projects[0].id), /Choose a model/);
  await page.evaluate(() => window.fleetHarness.saveSettings({ backend: 'pi', provider: 'fleet-fixture', model: 'fixture-model', rememberKey: true }, 'local-fixture-only'));
  const credentialBytes = await fs.readFile(path.join(stateDir, 'credentials.enc'));
  assert.ok(credentialBytes.length > 0);
  assert.equal(credentialBytes.includes(Buffer.from('local-fixture-only')), false, 'Remembered fixture credentials must be encrypted.');
  const input = { title: 'Windows release fixture', description: 'Parse synthetic task messages locally and recover from empty input.', criteria: ['Parse a synthetic TASK message and recover from empty input.'] };
  const saved = await page.evaluate(input => window.fleetHarness.createProject(input), input);
  await page.evaluate(id => window.fleetHarness.startRun(id), saved.id);
  const built = await completed(saved.id);
  check('mock-provider build, repair, independent tests and browser verification');
  await page.evaluate(id => window.fleetHarness.approve(id, 'Inspected deterministic test evidence for the Windows installer gate.'), saved.id);
  await exportSource(saved.id, 'source-before-upgrade');
  check('A exports verified source and evidence');

  fixture.setDelay(1500);
  const stopProject = await page.evaluate(input => window.fleetHarness.createProject({ ...input, title: 'Windows stop and restart fixture' }), input);
  await page.evaluate(id => window.fleetHarness.startRun(id), stopProject.id);
  const interrupted = await project(stopProject.id);
  await fs.writeFile(path.join(interrupted.workspace, 'saved-before-stop.txt'), 'Keep this previous workspace after restart and upgrade.');
  await page.evaluate(id => window.fleetHarness.stopRun(id), stopProject.id);
  assert.equal((await project(stopProject.id)).status, 'stopped');
  fixture.setDelay(0);
  await page.evaluate(id => window.fleetHarness.startRun(id), stopProject.id);
  const restarted = await completed(stopProject.id);
  assert.notEqual(restarted.workspace, interrupted.workspace);
  assert.equal(await fs.readFile(path.join(interrupted.workspace, 'saved-before-stop.txt'), 'utf8'), 'Keep this previous workspace after restart and upgrade.');
  check('stopped run restarts with previous workspace preserved');

  const snapshot = (await boot()).state;
  const workspaceHashes = await Promise.all([built.workspace, restarted.workspace, interrupted.workspace].map(async workspace => ({ workspace, hash: await treeHash(workspace) })));
  await page.screenshot({ path: path.join(output, 'before-upgrade.png') });
  await closeApp();
  await launch();
  assert.deepEqual((await boot()).state, snapshot);
  check('saved challenges and settings survive process restart');
  await closeApp();

  result.candidateRegistration = await install(installers.candidate);
  assert.equal(result.candidateRegistration.PSPath, result.previousRegistration.PSPath, 'Upgrade must retain the installer registration identity.');
  result.candidate = await launch();
  const versionParts = version => version.split('.').map(Number);
  const [a, b] = [versionParts(result.previous.version), versionParts(result.candidate.version)];
  assert.ok(b.some((value, i) => a.slice(0, i).every((previous, j) => previous === b[j]) && value > a[i]), 'Candidate B must have a newer numeric version than A.');
  assert.equal(result.candidateRegistration.DisplayVersion, result.candidate.version);
  const upgraded = await boot();
  assert.deepEqual(upgraded.state, snapshot, 'Upgrade must preserve saved challenges, requirements, settings and run state.');
  assert.equal(upgraded.buildInfo.version, result.candidate.version);
  assert.match(upgraded.buildInfo.revision, /^[a-f0-9]{40}$/);
  assert.ok(upgraded.buildInfo.sourceUrl.endsWith('/commit/' + upgraded.buildInfo.revision));
  for (const key of ['version', 'revision', 'sourceUrl', 'buildId']) {
    assert.equal(upgraded.buildInfo[key], candidateMetadata[key], 'Installed candidate provenance mismatch: ' + key);
  }
  result.buildInfo = upgraded.buildInfo;
  await page.getByRole('button', { name: 'Model settings', exact: true }).click();
  const visibleBuild = page.getByTestId('app-build-info');
  await visibleBuild.waitFor();
  assert.ok((await visibleBuild.textContent()).includes(result.candidate.version));
  assert.ok((await visibleBuild.textContent()).includes(upgraded.buildInfo.revision));
  assert.deepEqual(await fs.readFile(path.join(stateDir, 'credentials.enc')), credentialBytes, 'Upgrade must preserve encrypted credentials.');
  for (const entry of workspaceHashes) assert.equal(await treeHash(entry.workspace), entry.hash, 'Upgrade changed workspace ' + entry.workspace);
  check('A to B upgrade preserves state, encrypted settings and all workspace bytes');
  const fresh = await page.evaluate(input => window.fleetHarness.createProject({ ...input, title: 'Candidate installed runtime fixture' }), input);
  await page.evaluate(id => window.fleetHarness.startRun(id), fresh.id);
  await completed(fresh.id);
  check('installed B completes a fresh mock-provider build and verification');
  await exportSource(saved.id, 'source-after-upgrade');
  await exportExecutable(saved.id);
  check('B exports verified source and a working standalone Windows executable');
  const exported = await project(saved.id);
  await fs.appendFile(path.join(exported.workspace, 'index.html'), '\n<!-- changed after verification -->');
  await assert.rejects(page.evaluate(id => window.fleetHarness.downloadExecutable(id), saved.id), /changed after verification/);
  check('stale verification blocks executable export');
  assert.deepEqual(rendererErrors, []);
  result.fixtureRequests = fixture.requests.length;
  await page.screenshot({ path: path.join(output, 'after-upgrade.png') });
  await closeApp();
  await uninstall();
  check('uninstall removes registration and preserves application data');
  result.passed = true;
} catch (error) {
  result.error = error?.stack ?? String(error);
  if (page) {
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    await fs.writeFile(path.join(output, 'failure-state.json'), JSON.stringify(await boot().catch(() => null), null, 2));
  }
  throw error;
} finally {
  await generated?.close().catch(() => {});
  await closeApp().catch(() => {});
  await fixture?.close();
  if (installed && !uninstallAttempted) await uninstall().catch(error => { result.cleanupError = String(error); });
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  if (generatedData) await fs.rm(generatedData, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  // Keep a failed run's isolated state and logs for diagnosis. Never remove an
  // unknown installation or user-data directory during cleanup.
  if (result.passed && !installed) await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  console.log(JSON.stringify(result, null, 2));
}
