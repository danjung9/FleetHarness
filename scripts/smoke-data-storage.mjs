import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { reportHash } from '../dist-electron/electron/delivery.js';

// A separate Electron profile and synthetic files keep this smoke away from real user data.
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-data-storage-')));
const stateRoot = path.join(root, 'state');
const output = path.resolve('output/playwright/data-storage');
await fs.mkdir(output, { recursive: true });
const errors = [];
const currentRunId = randomUUID(), oldRunId = randomUUID(), secondRunId = randomUUID();
const primary = newProject({ title: 'Harbor watch planner', description: 'Organize a synthetic harbor watch schedule.', criteria: ['Show the saved watch schedule.'] });
const secondary = newProject({ title: 'Inventory handoff', description: 'Inspect synthetic stores and handoff records.', criteria: ['Show the saved inventory.'] });
const currentWorkspace = path.join(stateRoot, 'workspaces', primary.id, currentRunId);
const oldWorkspace = path.join(stateRoot, 'workspaces', primary.id, oldRunId);
const secondWorkspace = path.join(stateRoot, 'workspaces', secondary.id, secondRunId);
const dataPath = 'data/watch-schedule.json';
const dataText = JSON.stringify({ synthetic: true, watches: [{ station: 'North pier', start: '08:00', crew: 'Alpha' }, { station: 'South pier', start: '12:00', crew: 'Bravo' }] }, null, 2) + '\n';
const oldNote = 'Synthetic notes retained from the previous build.\n';
const imagePath = '.quality-evidence/watch-preview.png';
const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6SMAAAAASUVORK5CYII=', 'base64');

async function writeFiles(directory, files) {
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(directory, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
}
async function fixture() {
  await writeFiles(currentWorkspace, {
    'README.md': '# Harbor watch planner\n\nA synthetic local app for organizing station watches.\n',
    'index.html': '<!doctype html><html lang="en"><meta charset="utf-8"><title>Synthetic harbor watch</title><h1>Harbor watch planner</h1><p>Local storage smoke fixture.</p></html>\n',
    'src/app.ts': 'export const title = "Harbor watch planner";\n',
    [dataPath]: dataText,
    [imagePath]: imageBytes,
    '.quality-evidence/checks.json': '{"passed":3,"failed":0}\n',
    'logs/build.log': 'Research complete\nBuild complete\nVerification complete\n',
    'assets/opaque.bin': Buffer.from([0, 255, 1, 128, 0, 37, 244]),
    'node_modules/example/index.js': 'module.exports = "synthetic dependency";\n'
  });
  await writeFiles(oldWorkspace, {
    'README.md': '# Previous harbor watch build\n',
    'data/watch-schedule.json': '{"synthetic":true,"watches":[]}\n',
    'notes.txt': oldNote,
    'discard-me.txt': 'This synthetic file is safe to delete permanently.\n',
    'node_modules/example/index.js': 'module.exports = "previous dependency";\n'
  });
  await writeFiles(secondWorkspace, {
    'README.md': '# Inventory handoff\n\nSynthetic inventory data.\n',
    'data/inventory.csv': 'item,quantity\nLife vest,12\nSignal lamp,4\n'
  });
  await writeFiles(path.join(stateRoot, 'sessions', primary.id), {
    'saved-session.jsonl': JSON.stringify({ type: 'message', role: 'assistant', content: 'Synthetic planning session.' }) + '\n'
  });
  await writeFiles(path.join(stateRoot, 'sessions', secondary.id), {
    'saved-session.jsonl': JSON.stringify({ type: 'message', role: 'assistant', content: 'Synthetic inventory session.' }) + '\n'
  });
  const earlier = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await fs.utimes(oldWorkspace, earlier, earlier);
  Object.assign(primary, {
    runId: currentRunId, workspace: currentWorkspace, status: 'approved', approvedAt: new Date().toISOString(),
    processScope: { runId: currentRunId, marker: randomUUID(), cleanup: 'confirmed' },
    exportedTo: path.join(root, 'previous-export'), resumeStage: 'verify',
    report: { time: new Date().toISOString(), command: 'synthetic-fixture', exitCode: 0, passed: 3, failed: 0, skipped: 0, total: 3,
      output: 'Synthetic fixture checks passed.', durationMs: 20, sourceHash: await sourceHash(currentWorkspace) },
    executable: { status: 'ready', platform: process.platform, arch: process.arch, fileName: 'fixture.zip', savedTo: path.join(root, 'fixture.zip') }
  });
  primary.verification = { runId: currentRunId, reportHash: reportHash(primary.report) };
  primary.stages.forEach(stage => { stage.status = 'complete'; });
  Object.assign(secondary, { runId: secondRunId, workspace: secondWorkspace, status: 'stopped' });
  await fs.mkdir(stateRoot, { recursive: true });
  await fs.writeFile(path.join(stateRoot, 'state.json'), JSON.stringify({ version: 1, projects: [primary, secondary], settings: { backend: 'pi', provider: '', model: '', rememberKey: false, developerMode: false } }, null, 2));
  await fs.mkdir(path.join(root, 'pi'), { recursive: true });
}

let app, page;
async function launch() {
  app = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: stateRoot,
    PI_CODING_AGENT_DIR: path.join(root, 'pi'), VITE_DEV_SERVER_URL: '' }, timeout: 45000 });
  page = await app.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.webContents.setBackgroundThrottling(false); window.hide(); window.setSize(1512, 982);
  });
  await page.locator('.app-shell').waitFor({ timeout: 45000 });
}
const overview = () => page.evaluate(() => window.fleetHarness.storageOverview());
const project = id => page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(item => item.id === id), id);
const browseLabel = item => `Browse ${item.name} in ${item.projectTitle}`;
const row = item => page.locator('.storage-item-row').filter({ has: page.getByRole('button', { name: browseLabel(item), exact: true }) });
async function openStorage() {
  await page.getByRole('button', { name: 'Data & storage', exact: true }).click();
  await page.getByRole('heading', { name: 'Data & storage', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Refresh storage', exact: true }).waitFor();
}
async function tab(name) {
  const back = page.getByRole('button', { name: 'Back to storage', exact: true });
  if (await back.isVisible()) await back.click();
  await page.getByRole('tab', { name: new RegExp(`^${name}\\s*\\d*$`) }).click();
}
async function browse(item) {
  await tab('Builds');
  await row(item).getByRole('button', { name: browseLabel(item), exact: true }).click();
  await page.locator('.storage-detail').waitFor();
}
async function confirmTrash() {
  const dialog = page.getByRole('dialog', { name: 'Move to Trash?', exact: true });
  await dialog.getByRole('button', { name: 'Move to Trash', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
}
async function restore(item) {
  await tab('Trash');
  await page.getByRole('button', { name: `Restore ${item.name} to ${item.projectTitle}`, exact: true }).click();
  await page.getByRole('button', { name: `Restore ${item.name} to ${item.projectTitle}`, exact: true }).waitFor({ state: 'hidden' });
}
async function archive(archived) {
  await tab('Projects');
  await page.getByRole('button', { name: `${archived ? 'Archive' : 'Unarchive'} ${secondary.title}`, exact: true }).click();
  await page.getByRole('button', { name: `${archived ? 'Unarchive' : 'Archive'} ${secondary.title}`, exact: true }).waitFor();
}
async function capture(name, width, height) {
  await app.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setSize(...size), [width, height]);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.data-storage-page').evaluate(element => element.scrollTo({ top: 0 }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Storage fits the supported window width.');
  await page.screenshot({ path: path.join(output, name), scale: 'css', animations: 'disabled' });
}
const focusedName = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim());
const waitFocused = name => page.waitForFunction(name => (document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim()) === name, name);
async function approvalBlocksStorage(item) {
  const target = await fs.realpath(path.join(currentWorkspace, 'src/app.ts'));
  await app.evaluate((_, target) => {
    const disk = process.getBuiltinModule('fs').promises;
    const originalOpen = disk.open;
    let entered, release;
    const reached = new Promise(resolve => { entered = resolve; });
    const blocked = new Promise(resolve => { release = resolve; });
    let intercepted = false;
    globalThis.storageReadGate = {
      reached,
      release: () => { disk.open = originalOpen; release(); delete globalThis.storageReadGate; }
    };
    disk.open = async function(file, ...args) {
      if (file === target && !intercepted) { intercepted = true; entered(); await blocked; }
      return originalOpen.call(this, file, ...args);
    };
  }, target);
  const approval = page.evaluate(id => window.fleetHarness.approve(id, 'Review the synthetic fixture for the storage concurrency regression.', true), primary.id);
  // Observe any early rejection while the main-process gate is being awaited.
  void approval.catch(() => {});
  try {
    await app.evaluate(async () => {
      let timer;
      try {
        await Promise.race([globalThis.storageReadGate.reached,
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Approval did not reach the source-file open gate.')), 10000); })]);
      } finally { clearTimeout(timer); }
    });
    assert.equal((await overview()).items.find(entry => entry.id === item.id).canTrash, false, 'An in-flight approval is active project work.');
    await assert.rejects(page.evaluate(({ id, file }) => window.fleetHarness.storageTrash(id, file), { id: item.id, file: dataPath }), /active|in use|finish|busy|running/i);
    assert.equal(await fs.readFile(path.join(currentWorkspace, dataPath), 'utf8'), dataText);
  } finally {
    await app.evaluate(() => globalThis.storageReadGate?.release());
    await approval;
  }
  assert.equal((await project(primary.id)).status, 'approved');
}
async function storageDrainsPendingPreview(old) {
  const target = path.join(currentWorkspace, 'index.html');
  await app.evaluate((_, target) => {
    const disk = process.getBuiltinModule('fs').promises;
    const originalRealpath = disk.realpath;
    let entered, release;
    const reached = new Promise(resolve => { entered = resolve; });
    const blocked = new Promise(resolve => { release = resolve; });
    let intercepted = false;
    globalThis.storagePreviewGate = {
      reached,
      release: () => { disk.realpath = originalRealpath; release(); delete globalThis.storagePreviewGate; }
    };
    disk.realpath = async function(file, ...args) {
      if (file === target && !intercepted) { intercepted = true; entered(); await blocked; }
      return originalRealpath.call(this, file, ...args);
    };
  }, target);
  const preview = page.evaluate(id => window.fleetHarness.preview(id), primary.id);
  void preview.catch(() => {});
  let trash;
  try {
    await app.evaluate(async () => {
      let timer;
      try {
        await Promise.race([globalThis.storagePreviewGate.reached,
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Preview did not reach its source-path gate.')), 10000); })]);
      } finally { clearTimeout(timer); }
    });
    trash = page.evaluate(({ id, file }) => window.fleetHarness.storageTrash(id, file), { id: old.id, file: 'discard-me.txt' });
    void trash.catch(() => {});
    await page.waitForFunction(async id => (await window.fleetHarness.storageOverview()).projects.find(project => project.id === id)?.active === true, primary.id, { timeout: 10000 });
    await app.evaluate(() => globalThis.storagePreviewGate.release());
    assert.equal(await preview, null, 'A storage mutation invalidates a preview request that was still opening.');
    const removed = await trash;
    await assert.rejects(fs.access(path.join(oldWorkspace, 'discard-me.txt')), /ENOENT/);
    await page.evaluate(id => window.fleetHarness.storageRestore(id), removed.id);
    assert.equal(await fs.readFile(path.join(oldWorkspace, 'discard-me.txt'), 'utf8'), 'This synthetic file is safe to delete permanently.\n');
  } finally {
    await app.evaluate(() => globalThis.storagePreviewGate?.release());
    await Promise.allSettled([preview, ...(trash ? [trash] : [])]);
  }
}

async function withVisibleStorage(work) {
  // The smoke's Electron window stays hidden; simulate a visible document for live refresh.
  await page.evaluate(() => {
    globalThis.storageSmokeVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  try { await work(); }
  finally {
    await page.evaluate(() => {
      const descriptor = globalThis.storageSmokeVisibility;
      if (descriptor) Object.defineProperty(document, 'visibilityState', descriptor);
      else delete document.visibilityState;
      delete globalThis.storageSmokeVisibility;
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
}
async function storageTracksExternalChanges(old) {
  const extraRunId = randomUUID();
  const extraWorkspace = path.join(stateRoot, 'workspaces', primary.id, extraRunId);
  const extraBuild = { name: `Build ${extraRunId}`, projectTitle: primary.title };
  const extraFile = 'data/watch-live.json';
  const previousData = await fs.readFile(path.join(oldWorkspace, dataPath), 'utf8');
  await withVisibleStorage(async () => {
    await tab('Builds');
    await page.getByLabel('Search storage', { exact: true }).fill(primary.title);
    await page.getByLabel('Filter storage by project', { exact: true }).selectOption(primary.id);
    await page.getByLabel('Sort storage', { exact: true }).selectOption('size');
    await writeFiles(extraWorkspace, { 'README.md': 'A build created outside the storage screen.\n' });
    await row(extraBuild).locator('small').filter({ hasText: /1 files/ }).waitFor({ timeout: 15000 });
    assert.equal(await page.getByLabel('Search storage', { exact: true }).inputValue(), primary.title, 'Live overview refresh preserves the search.');
    assert.equal(await page.getByLabel('Filter storage by project', { exact: true }).inputValue(), primary.id, 'Live overview refresh preserves the project filter.');
    assert.equal(await page.getByLabel('Sort storage', { exact: true }).inputValue(), 'size', 'Live overview refresh preserves sorting.');
    await fs.rm(extraWorkspace, { recursive: true });
    await row(extraBuild).waitFor({ state: 'hidden', timeout: 15000 });
    await page.getByLabel('Search storage', { exact: true }).fill('');
    await page.getByLabel('Filter storage by project', { exact: true }).selectOption('all');

    await browse(old);
    await page.getByRole('button', { name: `Preview ${dataPath}`, exact: true }).click();
    await page.locator('.storage-file-preview pre').filter({ hasText: 'watches' }).waitFor();
    const preview = await page.locator('.storage-file-preview pre').elementHandle();
    await page.getByLabel('Search files', { exact: true }).fill('watch');
    await page.getByLabel('Filter files by type', { exact: true }).selectOption('data');
    await writeFiles(oldWorkspace, { [extraFile]: '{"synthetic":true,"live":true}\n' });
    await page.getByRole('button', { name: `Preview ${extraFile}`, exact: true }).waitFor({ timeout: 15000 });
    assert.equal(await page.getByLabel('Search files', { exact: true }).inputValue(), 'watch', 'Live file refresh preserves the search.');
    assert.equal(await page.getByLabel('Filter files by type', { exact: true }).inputValue(), 'data', 'Live file refresh preserves the type filter.');
    assert.equal(await page.getByRole('button', { name: `Preview ${dataPath}`, exact: true }).getAttribute('aria-pressed'), 'true', 'Unrelated file changes preserve the selection.');
    assert.equal(await preview.evaluate(element => element.isConnected), true, 'An unrelated file change does not remove the existing preview.');

    await fs.writeFile(path.join(oldWorkspace, dataPath), '{"synthetic":true,"watches":[{"station":"Live update at the west pier"}]}\n');
    await page.locator('.storage-file-preview pre').filter({ hasText: 'Live update at the west pier' }).waitFor({ timeout: 15000 });
    assert.equal(await preview.evaluate(element => element.isConnected), true, 'Updating selected content keeps its preview mounted.');
    const priorStat = await fs.stat(path.join(oldWorkspace, dataPath));
    await fs.writeFile(path.join(oldWorkspace, dataPath), '{"synthetic":true,"watches":[{"station":"Live update at the east pier"}]}\n');
    await fs.utimes(path.join(oldWorkspace, dataPath), priorStat.atime, priorStat.mtime);
    const nextStat = await fs.stat(path.join(oldWorkspace, dataPath));
    assert.equal(nextStat.size, priorStat.size, 'The edit preserves the selected file size.');
    assert.equal(nextStat.mtime.toISOString(), priorStat.mtime.toISOString(), 'The edit preserves the displayed modification time.');
    await page.locator('.storage-file-preview pre').filter({ hasText: 'Live update at the east pier' }).waitFor({ timeout: 15000 });
    assert.equal(await preview.evaluate(element => element.isConnected), true, 'A same-size edit with preserved modification time updates the mounted preview.');
    await preview.dispose();
    await fs.rm(path.join(oldWorkspace, dataPath));
    await page.getByRole('button', { name: `Preview ${dataPath}`, exact: true }).waitFor({ state: 'hidden', timeout: 15000 });
    await page.getByRole('heading', { name: 'Select a file', exact: true }).waitFor();
    await fs.writeFile(path.join(oldWorkspace, dataPath), previousData);
    await fs.rm(path.join(oldWorkspace, extraFile));
    await page.getByRole('button', { name: `Preview ${extraFile}`, exact: true }).waitFor({ state: 'hidden', timeout: 15000 });
    await page.getByRole('button', { name: `Preview ${dataPath}`, exact: true }).waitFor({ timeout: 15000 });
    assert.equal(await page.getByLabel('Search files', { exact: true }).inputValue(), 'watch');
    assert.equal(await page.getByLabel('Filter files by type', { exact: true }).inputValue(), 'data');

    await page.getByRole('button', { name: 'Home — challenge portfolio', exact: true }).click();
    await writeFiles(extraWorkspace, { 'README.md': 'A build created while viewing Home.\n' });
    await openStorage();
    await row(extraBuild).getByRole('button', { name: browseLabel(extraBuild), exact: true }).waitFor({ timeout: 15000 });
    await fs.rm(extraWorkspace, { recursive: true });
    await row(extraBuild).waitFor({ state: 'hidden', timeout: 15000 });
  });
}
async function storageKeepsFilePage() {
  await withVisibleStorage(async () => {
    const extraFile = 'archives/note-205.md';
    const preview = await page.locator('.storage-file-preview pre').elementHandle();
    await writeFiles(oldWorkspace, { [extraFile]: 'A note added while browsing the second file page.\n' });
    await page.getByRole('button', { name: `Preview ${extraFile}`, exact: true }).waitFor({ timeout: 15000 });
    assert.equal(await page.getByRole('button', { name: 'Preview archives/note-000.md', exact: true }).count(), 0, 'Live file refresh stays on the current page.');
    assert.equal(await preview.evaluate(element => element.isConnected), true, 'Live pagination changes preserve the selected preview.');
    await fs.rm(path.join(oldWorkspace, extraFile));
    await page.getByRole('button', { name: `Preview ${extraFile}`, exact: true }).waitFor({ state: 'hidden', timeout: 15000 });
    await page.getByRole('button', { name: 'Preview archives/note-204.md', exact: true }).waitFor();
    assert.equal(await preview.evaluate(element => element.isConnected), true);
    await preview.dispose();
  });
}

try {
  await fixture();
  await launch();
  await openStorage();
  const initial = await overview();
  const current = initial.items.find(item => item.runId === currentRunId);
  const old = initial.items.find(item => item.runId === oldRunId);
  assert.ok(current?.current && old && !old.current, 'Both current and earlier builds are listed.');
  assert.ok(initial.items.some(item => item.kind === 'sessions' && item.projectId === primary.id), 'Saved agent sessions are included.');
  assert.equal(initial.projects.length, 2);
  assert.equal(initial.items.length, 5);
  assert.deepEqual(initial.warnings, [], 'A normal isolated Electron profile does not need a storage warning.');
  assert.ok(initial.totalBytes > 0);
  await row(current).getByRole('button', { name: browseLabel(current), exact: true }).waitFor();
  const sessions = initial.items.filter(item => item.kind === 'sessions');
  assert.equal(sessions.length, 2);
  for (const session of sessions) {
    for (const name of [browseLabel(session), `Open ${session.name} folder in ${session.projectTitle}`, `Delete ${session.name} from ${session.projectTitle}`]) {
      assert.equal(await page.getByRole('button', { name, exact: true }).count(), 1, 'Repeated folder names include their project in the accessible label.');
    }
  }
  await browse(sessions.find(item => item.projectId === secondary.id));
  await page.getByRole('button', { name: 'Preview saved-session.jsonl', exact: true }).click();
  await page.locator('.storage-file-preview pre').filter({ hasText: 'Synthetic inventory session.' }).waitFor();
  await tab('Builds');
  await approvalBlocksStorage(current);
  await storageDrainsPendingPreview(old);
  await storageTracksExternalChanges(old);
  await page.getByRole('button', { name: 'Refresh storage', exact: true }).click();

  // The remaining UI flows deliberately exercise the real preload and main-process handlers.
  await page.getByLabel('Search storage', { exact: true }).fill('no-matching-storage-fixture');
  assert.equal(await page.locator('.storage-item-row').count(), 0);
  await page.getByLabel('Search storage', { exact: true }).fill('');
  await page.getByLabel('Filter storage by project', { exact: true }).selectOption(primary.id);
  assert.equal(await page.locator('.storage-item-row').count(), 3);
  await page.getByLabel('Filter storage by project', { exact: true }).selectOption('all');
  await browse(current);
  await page.getByRole('button', { name: `Preview ${dataPath}`, exact: true }).click();
  await page.locator('.storage-file-preview pre').filter({ hasText: 'North pier' }).waitFor();
  const exportDirectory = path.join(root, 'exports');
  const exportFile = path.join(exportDirectory, 'watch-schedule.json');
  await fs.mkdir(exportDirectory);
  await app.evaluate(({ dialog, shell }, destination) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [destination.directory] });
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination.file });
    globalThis.storageSmokeOpened = [];
    shell.openPath = async target => { globalThis.storageSmokeOpened.push(target); return ''; };
    shell.showItemInFolder = target => { globalThis.storageSmokeOpened.push(target); };
  }, { directory: exportDirectory, file: exportFile });
  const copiedFile = await page.evaluate(({ id, file }) => window.fleetHarness.storageExport(id, file), { id: current.id, file: dataPath });
  assert.equal(copiedFile, exportFile);
  assert.equal(await fs.readFile(copiedFile, 'utf8'), dataText);
  const copiedBuild = await page.evaluate(id => window.fleetHarness.storageExport(id), old.id);
  assert.equal(await fs.readFile(path.join(copiedBuild, 'notes.txt'), 'utf8'), oldNote);
  await page.getByRole('button', { name: 'Reveal file', exact: true }).click();
  await page.evaluate(id => window.fleetHarness.storageOpen(id), old.id);
  assert.deepEqual(await app.evaluate(() => globalThis.storageSmokeOpened), [path.join(currentWorkspace, dataPath), oldWorkspace]);
  await page.getByLabel('Search files', { exact: true }).fill('watch-schedule');
  assert.equal(await page.locator('.storage-file-list').getByRole('button', { name: /^Preview / }).count(), 1);
  await page.getByLabel('Search files', { exact: true }).fill('');
  await page.getByLabel('Filter files by type', { exact: true }).selectOption('data');
  assert.equal(await page.locator('.storage-file-list').getByRole('button', { name: /^Preview / }).count(), 1);
  await page.getByLabel('Filter files by type', { exact: true }).selectOption('all');
  await page.getByRole('button', { name: `Preview ${imagePath}`, exact: true }).click();
  await page.locator('.storage-file-preview img').waitFor();
  await page.waitForFunction(() => { const image = document.querySelector('.storage-file-preview img'); return image?.complete && image.naturalWidth > 0; });
  await page.getByRole('button', { name: 'Preview assets/opaque.bin', exact: true }).click();
  assert.equal((await page.evaluate(({ id, file }) => window.fleetHarness.storageReadFile(id, file), { id: current.id, file: 'assets/opaque.bin' })).kind, 'binary');
  await page.getByLabel('Filter files by type', { exact: true }).selectOption('dependencies');
  await page.getByRole('button', { name: 'Preview node_modules/example/index.js', exact: true }).waitFor();
  await page.getByLabel('Filter files by type', { exact: true }).selectOption('all');

  await tab('Builds');
  const deleteBuild = row(old).getByRole('button', { name: `Delete ${old.name} from ${old.projectTitle}`, exact: true });
  assert.equal(await deleteBuild.innerText(), 'Delete', 'Build deletion has a visible text label.');
  await deleteBuild.click();
  const buildDialog = page.getByRole('dialog', { name: 'Move to Trash?', exact: true });
  await buildDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await buildDialog.waitFor({ state: 'hidden' });
  await waitFocused(`Delete ${old.name} from ${old.projectTitle}`);
  assert.equal(await fs.readFile(path.join(oldWorkspace, 'notes.txt'), 'utf8'), oldNote, 'Cancel keeps the whole build intact.');
  await deleteBuild.click();
  await confirmTrash();
  await assert.rejects(fs.access(oldWorkspace), /ENOENT/);
  let trashed = (await overview()).trash.find(item => item.kind === 'build');
  assert.ok(trashed);
  await tab('Trash');
  assert.equal(await page.getByRole('button', { name: `Delete permanently: ${trashed.name} from ${trashed.projectTitle}`, exact: true }).innerText(), 'Delete permanently');
  await capture('trash-desktop.png', 1512, 982);
  await capture('trash-minimum.png', 1120, 720);
  await restore(trashed);
  assert.equal(await fs.readFile(path.join(oldWorkspace, 'notes.txt'), 'utf8'), oldNote);

  await browse(old);
  const deleteFromFiles = page.getByRole('button', { name: `Delete build: ${old.name} from ${old.projectTitle}`, exact: true });
  assert.equal(await deleteFromFiles.innerText(), 'Delete build', 'The file workspace names the whole-build action.');
  await deleteFromFiles.click();
  await confirmTrash();
  await page.getByRole('heading', { name: 'Data & storage', exact: true }).waitFor();
  await assert.rejects(fs.access(oldWorkspace), /ENOENT/);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await row(old).waitFor();
  assert.equal(await fs.readFile(path.join(oldWorkspace, 'notes.txt'), 'utf8'), oldNote, 'Undo restores a build deleted from its file workspace.');

  await browse(old);
  await page.getByRole('button', { name: 'Preview notes.txt', exact: true }).click();
  await page.getByRole('button', { name: 'Move file to Trash', exact: true }).click();
  await confirmTrash();
  await assert.rejects(fs.access(path.join(oldWorkspace, 'notes.txt')), /ENOENT/);
  trashed = (await overview()).trash.find(item => item.kind === 'file');
  await restore(trashed);
  assert.equal(await fs.readFile(path.join(oldWorkspace, 'notes.txt'), 'utf8'), oldNote);

  await browse(old);
  await page.getByRole('button', { name: 'Preview discard-me.txt', exact: true }).click();
  await page.getByRole('button', { name: 'Move file to Trash', exact: true }).click();
  await confirmTrash();
  trashed = (await overview()).trash.find(item => item.kind === 'file');
  await tab('Trash');
  await page.getByRole('button', { name: `Delete permanently: ${trashed.name} from ${trashed.projectTitle}`, exact: true }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Delete permanently?', exact: true });
  await deleteDialog.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await deleteDialog.waitFor({ state: 'hidden' });
  assert.equal((await overview()).trash.some(item => item.id === trashed.id), false);
  await assert.rejects(fs.access(path.join(oldWorkspace, 'discard-me.txt')), /ENOENT/);

  await browse(current);
  await page.getByRole('button', { name: `Preview ${dataPath}`, exact: true }).click();
  await page.getByRole('button', { name: 'Move file to Trash', exact: true }).click();
  await confirmTrash();
  const invalidated = await project(primary.id);
  assert.equal(invalidated.status, 'stopped');
  for (const field of ['report', 'approvedAt', 'exportedTo', 'executable', 'resumeStage']) assert.equal(invalidated[field], undefined, `${field} is cleared after changing the current build.`);
  trashed = (await overview()).trash.find(item => item.kind === 'file');
  await restore(trashed);
  assert.equal(await fs.readFile(path.join(currentWorkspace, dataPath), 'utf8'), dataText);
  assert.equal((await project(primary.id)).approvedAt, undefined, 'Restoring a file does not restore approval.');

  await archive(true);
  await page.getByRole('button', { name: 'Home — challenge portfolio', exact: true }).click();
  await page.locator('.home-build-list>button').filter({ hasText: secondary.title }).waitFor({ state: 'hidden' });
  await page.locator('.home-build-list>button').filter({ hasText: primary.title }).click();
  assert.equal(await page.getByLabel('Current challenge', { exact: true }).locator('option').filter({ hasText: secondary.title }).count(), 0);
  await openStorage();
  await archive(false);
  await page.getByRole('button', { name: 'Home — challenge portfolio', exact: true }).click();
  await page.locator('.home-build-list>button').filter({ hasText: secondary.title }).waitFor();
  await page.locator('.home-build-list>button').filter({ hasText: primary.title }).click();
  assert.equal(await page.getByLabel('Current challenge', { exact: true }).locator('option').filter({ hasText: secondary.title }).count(), 1);
  await openStorage();

  // Preserve a trash entry and an archived project across a complete Electron restart.
  await archive(true);
  await browse(old);
  await page.getByRole('button', { name: 'Preview notes.txt', exact: true }).click();
  await page.getByRole('button', { name: 'Move file to Trash', exact: true }).click();
  await confirmTrash();
  const persistedTrash = (await overview()).trash.find(item => item.kind === 'file');
  await app.close(); app = undefined;
  await launch();
  await openStorage();
  assert.ok((await overview()).trash.some(item => item.id === persistedTrash.id));
  assert.ok((await project(secondary.id)).archivedAt);
  assert.equal((await project(primary.id)).report, undefined);
  await restore(persistedTrash);
  await archive(false);
  await tab('Builds');
  await writeFiles(oldWorkspace, Object.fromEntries(Array.from({ length: 205 }, (_, index) => [
    `archives/note-${String(index).padStart(3, '0')}.md`, `Saved synthetic note ${index}.\n`
  ])));
  await page.getByRole('button', { name: 'Refresh storage', exact: true }).click();
  await browse(old);
  await page.getByRole('button', { name: 'Preview archives/note-000.md', exact: true }).click();
  await page.locator('.storage-file-preview pre').filter({ hasText: 'Saved synthetic note 0.' }).waitFor();
  assert.equal(await page.locator('.storage-file-list').getByRole('button', { name: /^Preview / }).count(), 200);
  await page.keyboard.press('ArrowDown');
  await waitFocused('Preview archives/note-001.md');
  await page.keyboard.press('ArrowUp');
  await waitFocused('Preview archives/note-000.md');
  const lastFile = (await page.evaluate(id => window.fleetHarness.storageFiles(id), old.id)).at(-1).path;
  await page.keyboard.press('End');
  await waitFocused(`Preview ${lastFile}`);
  await page.keyboard.press('Home');
  await waitFocused('Preview archives/note-000.md');
  await page.locator('.storage-file-preview pre').filter({ hasText: 'Saved synthetic note 0.' }).waitFor();
  await page.keyboard.press('Tab');
  if (await focusedName() === 'Next file page') await page.keyboard.press('Tab');
  await waitFocused('Reveal file');
  await page.keyboard.press('Tab');
  await waitFocused('Export file');
  await page.keyboard.press('Tab');
  await waitFocused('Move file to Trash');
  await page.keyboard.press('Enter');
  const cancelDialog = page.getByRole('dialog', { name: 'Move to Trash?', exact: true });
  await cancelDialog.waitFor();
  await waitFocused('Cancel');
  await page.keyboard.press('Enter');
  await cancelDialog.waitFor({ state: 'hidden' });
  await waitFocused('Move file to Trash');
  assert.equal(await fs.readFile(path.join(oldWorkspace, 'archives/note-000.md'), 'utf8'), 'Saved synthetic note 0.\n');
  await page.getByRole('button', { name: 'Next file page', exact: true }).click();
  await page.getByRole('button', { name: 'Preview archives/note-204.md', exact: true }).waitFor();
  assert.match(await page.locator('.storage-file-preview pre').textContent(), /Saved synthetic note 0\./, 'Changing pages keeps the selected preview.');
  await storageKeepsFilePage();
  await page.getByLabel('Search files', { exact: true }).fill('note-004');
  await page.getByRole('button', { name: 'Preview archives/note-004.md', exact: true }).waitFor();
  assert.equal(await page.locator('.storage-file-pagination').count(), 0, 'Filtering returns to the first matching page.');
  await tab('Builds');
  const dismissNotice = page.getByRole('button', { name: 'Dismiss notification', exact: true });
  if (await dismissNotice.isVisible()) await dismissNotice.click();
  assert.equal(await page.locator('.storage-item-row').count(), 5);
  assert.deepEqual((await overview()).warnings, []);
  await withVisibleStorage(async () => {
    const settled = page.locator('.storage-refresh-status').filter({ hasText: 'Updates automatically' });
    await settled.waitFor({ timeout: 15000 });
    await capture('storage-desktop.png', 1512, 982);
    await settled.waitFor({ timeout: 15000 });
    await capture('storage-minimum.png', 1120, 720);
    await browse(current);
    await page.getByRole('button', { name: `Preview ${dataPath}`, exact: true }).click();
    await page.locator('.storage-file-preview pre').filter({ hasText: 'North pier' }).waitFor();
    await capture('files-minimum.png', 1120, 720);
    await capture('files-desktop.png', 1512, 982);
  });
  assert.deepEqual(errors, []);
  const result = { passed: true, isolatedSyntheticProfile: true, realElectronIPC: true,
    inventoryAndFilters: true, paginatedFiles: true, keyboardFileNavigation: true, cancelRestoresFocus: true,
    distinctProjectAccessibleNames: true, normalProfileHasNoWarnings: true, textImageBinaryPreviews: true, dependenciesVisible: true,
    buildAndFileTrashRestore: true, labeledBuildDeletion: true, buildDeleteCancel: true, detailBuildDeleteUndo: true,
    permanentDeletion: true, exportCopiesAndReveal: true,
    approvalBlocksConcurrentStorage: true, storageDrainsPendingPreview: true,
    externalBuildsAndFilesRefresh: true, selectedPreviewUpdatesInPlace: true, sameSizePreservedTimePreviewRefresh: true,
    liveRefreshPreservesFiltersAndPage: true, returningToStorageRefreshes: true,
    currentFileInvalidatesVerification: true, archiveHidesAndRestoresProject: true,
    restartPersistence: true, rendererErrors: errors.length, screenshots: output };
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page?.screenshot({ path: path.join(output, 'failure.png'), scale: 'css' }).catch(() => {});
  throw error;
} finally {
  await app?.evaluate(() => { globalThis.storageReadGate?.release(); globalThis.storagePreviewGate?.release(); }).catch(() => {});
  await app?.close();
  await fs.rm(root, { recursive: true, force: true });
}
