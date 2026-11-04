import { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, Menu, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { promises as disk } from 'original-fs';
import { fileURLToPath } from 'node:url';
import { Store, newProject, validateInput, listArtifacts, safeFile, sourceHash } from './storage.js';
import { FleetBackend } from './pi-backend.js';
import { CodexAccount } from './codex-account.js';
import { reportPassed } from './verification.js';
import { PreviewServers } from './preview.js';
import { assertExecutableSource, executableFileName, stageExecutable, runPackageWorker, saveExecutable } from './executable.js';
import type { NewProject, Settings } from '../shared/types.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.FLEET_USER_DATA) app.setPath('userData', path.resolve(process.env.FLEET_USER_DATA));
let window: BrowserWindow | null = null;
let store: Store, backend: FleetBackend, codex: CodexAccount;
const previews = new PreviewServers();
const deliveries = new Map<string, { controller: AbortController; done: Promise<void> }>();
const startingRuns = new Set<string>();
let emitTimer: ReturnType<typeof setTimeout> | undefined;
const notify = () => {
  if (emitTimer) return;
  emitTimer = setTimeout(() => { emitTimer = undefined; if (window && !window.isDestroyed()) window.webContents.send('fleet:state', store.state); }, 100);
};
function checkSender(event: IpcMainInvokeEvent) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Untrusted application frame.');
}
function handle(channel: string, fn: (...args: any[]) => unknown) {
  ipcMain.handle(channel, async (event, ...args) => { checkSender(event); return fn(...args); });
}
const bootstrap = () => ({
  state: store.state, models: backend.models(), storagePath: store.root,
  chatgpt: codex.account,
  credentialStatus: store.state.settings.backend === 'codex' ? (codex.account.status === 'connected' ? 'ChatGPT connected' : 'Sign in with ChatGPT to run Codex') : store.state.settings.provider && backend.runtime.hasConfiguredAuth(store.state.settings.provider) ? 'Provider connected' : 'Connect a provider to run Pi agents',
  runtime: 'Codex 0.166.0 · Pi SDK 1.5.0 · Electron ' + process.versions.electron
});
function requireIdle(id: string) {
  if (deliveries.has(id)) throw new Error('Wait for the app download to finish before changing this build.');
  if (backend.active.has(id) || startingRuns.has(id)) throw new Error('Stop this run before changing its requirements or delivery state.');
  return store.project(id);
}
async function readArtifact(id: string, file: string) {
  const p = store.project(id);
  if (!p.workspace) throw new Error('Start a run to create artifacts.');
  const target = await safeFile(p.workspace, file);
  if ((await fs.stat(target)).size > 2_000_000) throw new Error('This file is too large for the viewer. Open its workspace folder.');
  return fs.readFile(target, 'utf8');
}
async function assertVerified(id: string) {
  const p = requireIdle(id);
  if (!p.workspace || !reportPassed(p.report)) throw new Error('Passing automated tests are required before delivery.');
  if (await sourceHash(p.workspace) !== p.report!.sourceHash) throw new Error('Artifacts changed after verification. Start a new run before approving or exporting.');
  return p;
}
function registerIPC() {
  handle('fleet:bootstrap', bootstrap);
  handle('fleet:create', async (input: NewProject) => {
    const p = newProject(input); store.state.projects.unshift(p); await store.save(); notify(); return p;
  });
  handle('fleet:update', async (id: string, input: NewProject) => {
    const p = requireIdle(id); Object.assign(p, validateInput(input));
    p.status = 'draft'; p.report = undefined; p.approvedAt = undefined; p.exportedTo = undefined; p.executable = undefined; p.error = undefined;
    p.systemDesign = undefined; p.phasePlan = undefined; p.globalTools = undefined;
    p.stages.forEach(s => { s.status = s.id === 'intake' ? 'complete' : 'queued'; });
    p.updatedAt = new Date().toISOString(); await store.save(); notify(); return p;
  });
  handle('fleet:start', async (id: string) => {
    requireIdle(id); startingRuns.add(id);
    try { await backend.start(id); } finally { startingRuns.delete(id); }
  });
  handle('fleet:stop', (id: string) => backend.stop(id));
  handle('fleet:artifacts', async (id: string) => { const p = store.project(id); return p.workspace ? listArtifacts(p.workspace) : []; });
  handle('fleet:read', readArtifact);
  handle('fleet:preview', async (id: string) => {
    try { const p = store.project(id); return p.workspace ? await previews.url(p.workspace) : null; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || !store.project(id).workspace) return null; throw error; }
  });
  handle('fleet:open', async (id: string) => {
    const p = store.project(id); if (!p.workspace) throw new Error('This challenge has no workspace yet.');
    const error = await shell.openPath(p.workspace); if (error) throw new Error(error);
  });
  handle('fleet:approve', async (id: string, feedback: string) => {
    if (typeof feedback !== 'string' || feedback.trim().length < 10 || feedback.length > 10000) throw new Error('Add a review note of at least 10 characters.');
    const p = await assertVerified(id);
    p.feedback = feedback.trim(); p.approvedAt = new Date().toISOString(); p.status = 'approved';
    p.stages.find(s => s.id === 'review')!.status = 'complete';
    await fs.writeFile(path.join(p.workspace!, 'review.json'), JSON.stringify({ approvedAt: p.approvedAt, feedback: p.feedback, scope: 'Prototype delivery only. Operational readiness is unverified.', sourceHash: p.report!.sourceHash }, null, 2));
    await store.save(); notify();
  });
  handle('fleet:export', async (id: string) => {
    const p = await assertVerified(id);
    if (!p.approvedAt) throw new Error('Review and approve this prototype before export.');
    const result = await dialog.showOpenDialog(window!, { title: 'Choose a delivery folder', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled) return null;
    const parent = await fs.realpath(result.filePaths[0]);
    if (parent === p.workspace || parent.startsWith(p.workspace! + path.sep)) throw new Error('Choose a folder outside the agent workspace.');
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'challenge';
    const destination = await fs.mkdtemp(path.join(parent, 'FleetHarness-' + slug + '-'));
    for (const file of await listArtifacts(p.workspace!)) {
      const source = await safeFile(p.workspace!, file.path);
      await fs.mkdir(path.dirname(path.join(destination, file.path)), { recursive: true });
      await fs.copyFile(source, path.join(destination, file.path));
    }
    await fs.writeFile(path.join(destination, 'DELIVERY.md'), [
      '# ' + p.title, '', 'Open index.html in a browser to run the application.', '',
      'Tests: install Node.js 22.19 or newer, then run: ' + p.report!.command, '',
      'Automated result: ' + p.report!.passed + '/' + p.report!.total + ' passed.',
      'Reviewed: ' + p.approvedAt, p.feedback, '', 'Operational readiness has not been verified.',
      'Generated by ' + (p.backend === 'codex' ? 'Codex' : 'Pi') + ' using ' + p.model + '. Run ' + p.runId
    ].join('\n'));
    p.exportedTo = destination; p.status = 'delivered'; p.stages.find(s => s.id === 'deliver')!.status = 'complete';
    await store.save(); notify(); shell.showItemInFolder(destination); return destination;
  });
  handle('fleet:download-executable', async (id: string) => {
    const p = requireIdle(id), controller = new AbortController();
    let finish!: () => void;
    const done = new Promise<void>(resolve => { finish = resolve; });
    deliveries.set(id, { controller, done });
    let temporary: string | undefined, packaging = false;
    try {
      await assertExecutableSource(p);
      const fileName = executableFileName(p);
      const result = await dialog.showSaveDialog(window!, {
        title: 'Download standalone app', defaultPath: path.join(app.getPath('downloads'), fileName),
        filters: [{ name: 'Application ZIP', extensions: ['zip'] }]
      });
      if (result.canceled || !result.filePath) return null;
      controller.signal.throwIfAborted();
      const parent = await fs.realpath(path.dirname(result.filePath)), workspace = await fs.realpath(p.workspace!);
      if (parent === workspace || parent.startsWith(workspace + path.sep)) throw new Error('Save the download outside the agent workspace.');
      p.executable = { status: 'packaging', platform: process.platform, arch: process.arch, fileName };
      packaging = true; await store.save(); notify();
      temporary = await fs.mkdtemp(path.join(app.getPath('temp'), 'fleet-executable-'));
      const staged = await stageExecutable(p, temporary);
      const archive = path.join(temporary, fileName);
      await runPackageWorker({ ...staged, archive, output: path.join(temporary, 'output'), electronVersion: process.versions.electron }, process.execPath, controller.signal);
      await assertExecutableSource(p);
      controller.signal.throwIfAborted();
      const savedTo = await saveExecutable(archive, result.filePath, p.workspace!);
      p.executable = { ...p.executable, status: 'ready', savedTo };
      p.status = 'delivered'; p.stages.find(s => s.id === 'deliver')!.status = 'complete';
      p.updatedAt = new Date().toISOString(); await store.save(); notify();
      shell.showItemInFolder(savedTo); return savedTo;
    } catch (error) {
      if (packaging && p.executable) {
        p.executable = { ...p.executable, status: 'failed', error: error instanceof Error ? error.message : String(error) };
        await store.save(); notify();
      }
      throw error;
    } finally {
      try { if (temporary) await disk.rm(temporary, { recursive: true, force: true, maxRetries: 3 }); }
      finally { deliveries.delete(id); finish(); }
    }
  });
  const requireNoRuns = () => { if (backend.active.size) throw new Error('Stop active runs before changing accounts or providers.'); };
  handle('fleet:chatgpt:connect', async () => { requireNoRuns(); await codex.login(); return bootstrap(); });
  handle('fleet:chatgpt:cancel', async () => { requireNoRuns(); await codex.cancel(); return bootstrap(); });
  handle('fleet:chatgpt:disconnect', async () => { requireNoRuns(); await codex.logout(); return bootstrap(); });
  handle('fleet:chatgpt:refresh', async () => { await codex.refresh(); return bootstrap(); });
  handle('fleet:settings', async (settings: Settings, key?: string) => {
    if (backend.active.size) throw new Error('Stop active runs before changing providers.');
    if (!settings || typeof settings.provider !== 'string' || typeof settings.model !== 'string' || typeof settings.rememberKey !== 'boolean' ||
      !['pi', 'codex'].includes(settings.backend ?? 'pi')) throw new Error('Select a valid backend and model.');
    if (key !== undefined && (typeof key !== 'string' || key.length > 20000)) throw new Error('Invalid API key.');
    if (settings.backend === 'codex') {
      if (key?.trim()) throw new Error('ChatGPT uses browser sign-in, not an API key.');
      if (codex.account.status !== 'connected' || !codex.models.some(m => m.id === settings.model && m.configured) || settings.provider !== 'chatgpt') throw new Error('Sign in with ChatGPT and select a Codex model first.');
      store.state.settings = { backend: 'codex', provider: 'chatgpt', model: settings.model, rememberKey: false };
      await store.save(); notify(); return bootstrap();
    }
    if (!backend.runtime.getModel(settings.provider, settings.model)) throw new Error('Select a valid Pi model.');
    const keyFile = path.join(store.root, 'credentials.enc');
    if (key?.trim()) {
      if (settings.rememberKey && !safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable. Use a session-only key.');
      await backend.runtime.setRuntimeApiKey(settings.provider, key.trim());
      if (settings.rememberKey) await fs.writeFile(keyFile, safeStorage.encryptString(JSON.stringify({ provider: settings.provider, key: key.trim() })), { mode: 0o600 });
    }
    if (!settings.rememberKey) await fs.rm(keyFile, { force: true });
    store.state.settings = { backend: 'pi', provider: settings.provider, model: settings.model, rememberKey: settings.rememberKey };
    await store.save(); notify(); return bootstrap();
  });
}
function createWindow() {
  window = new BrowserWindow({
    width: 1512, height: 982, minWidth: 1120, minHeight: 720, title: 'FleetHarness',
    titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 18 }, backgroundColor: '#ebe9e2',
    webPreferences: { preload: path.join(dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: false }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  const devURL = !app.isPackaged && process.env.VITE_DEV_SERVER_URL;
  if (devURL) void window.loadURL(devURL);
  else void window.loadFile(path.join(dirname, '../../dist/index.html'));
  window.on('closed', () => { window = null; });
}
app.whenReady().then(async () => {
  try {
    store = new Store(app.getPath('userData'));
    await store.init();
    codex = new CodexAccount(store.root, url => shell.openExternal(url));
    backend = new FleetBackend(store, process.execPath, notify, app.getAppPath(), { codex });
    await backend.init(); await codex.refresh();
    try {
      const encrypted = await fs.readFile(path.join(store.root, 'credentials.enc'));
      const { provider, key } = JSON.parse(safeStorage.decryptString(encrypted));
      await backend.runtime.setRuntimeApiKey(provider, key);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Saved credential could not be loaded. Reconnect in Model settings.'); }
    registerIPC();
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'FleetHarness', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] },
      { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }
    ]));
    createWindow();
    app.on('activate', () => { if (!window) createWindow(); });
  } catch (error) { dialog.showErrorBox('FleetHarness could not start', String(error)); app.quit(); }
});
let quitting = false;
app.on('before-quit', event => {
  if (!quitting && (backend?.active.size || deliveries.size)) {
    event.preventDefault(); quitting = true;
    for (const delivery of deliveries.values()) delivery.controller.abort();
    void Promise.all([backend.stopAll(), ...[...deliveries.values()].map(d => d.done)]).finally(async () => { await store.save(); app.quit(); });
  }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { previews.close(); codex?.dispose(); });
