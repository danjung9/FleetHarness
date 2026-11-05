import { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, Menu, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { promises as disk } from 'original-fs';
import { fileURLToPath } from 'node:url';
import { Store, newProject, validateInput, listArtifacts, safeFile, sourceHash } from './storage.js';
import { FleetBackend } from './pi-backend.js';
import { CodexAccount } from './codex-account.js';
import { reportPassed } from './verification.js';
import { ApplicationPreviews } from './solution-preview.js';
import { assertExecutableSource, executableFileName, stageExecutable, runPackageWorker, saveExecutable } from './executable.js';
import type { NewProject, Settings } from '../shared/types.js';
import { challenges, getChallenge, refreshNorfolkCatalog } from '../harness/catalog.js';
import { exportVerifiedBundle } from './source-export.js';
import { ProjectLead, briefHash, projectBrief } from './conversation.js';
import { ClarificationBroker } from './clarifications.js';
import type { ClarificationAnswer } from '../shared/conversation.js';
import { randomUUID } from 'node:crypto';
import { recordReview, reviewFeedback } from './review.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const iconPath = path.join(app.getAppPath(), app.isPackaged ? 'dist' : 'public', 'app-icon-512.png');
// Preserve existing workspaces and credentials when the display name changes.
app.setPath('userData', process.env.FLEET_USER_DATA ? path.resolve(process.env.FLEET_USER_DATA) : path.join(app.getPath('appData'), 'fleetharness'));
app.setName('AppYard');
// A user-data directory has one owner for its rotating ChatGPT credentials.
if (!app.requestSingleInstanceLock()) app.exit(0);
let window: BrowserWindow | null = null;
app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
let store: Store, backend: FleetBackend, codex: CodexAccount;
let lead: ProjectLead, clarifications: ClarificationBroker;
const conversationActions = new Map<string, Promise<void>>();
const previews = new ApplicationPreviews(process.execPath);
const deliveries = new Map<string, { controller: AbortController; done: Promise<void> }>();
const startingRuns = new Map<string, Promise<void>>();
let norfolkRefresh: ReturnType<typeof refreshNorfolkCatalog> | undefined;
const currentCatalog = () => store.state.norfolkCatalog?.challenges ?? challenges;
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
  capabilities: { projectConversation: true },
  chatgpt: codex.account,
  credentialStatus: store.state.settings.backend === 'codex' ? (codex.account.status === 'connected' && codex.account.planUsageEnabled ? 'Using ChatGPT plan' : 'Connect your ChatGPT plan to run Codex') : store.state.settings.provider && backend.runtime.hasConfiguredAuth(store.state.settings.provider) ? 'Provider connected' : 'Connect a provider to run Pi agents',
  runtime: 'Codex 0.166.0 · Pi SDK 1.5.0 · Electron ' + process.versions.electron
});
function requireIdle(id: string, fromConversation = false) {
  if (!fromConversation && conversationActions.has(id)) throw new Error('Wait for the project lead action to finish.');
  if (deliveries.has(id)) throw new Error('Wait for the app download to finish before changing this build.');
  if (backend.active.has(id) || startingRuns.has(id)) throw new Error('Stop this run before changing its requirements or delivery state.');
  return store.project(id);
}
async function updateProject(id: string, input: NewProject, fromConversation = false) {
  const p = requireIdle(id, fromConversation);
  const catalog = p.sourceChallenge ? [p.sourceChallenge, ...currentCatalog()] : currentCatalog();
  const normalized = validateInput(input, catalog);
  const previous = structuredClone({ ...projectBrief(p), sourceChallenge: p.sourceChallenge, status: p.status, runtimeProfile: p.runtimeProfile,
    report: p.report, approvedAt: p.approvedAt, exportedTo: p.exportedTo, executable: p.executable, error: p.error,
    systemDesign: p.systemDesign, phasePlan: p.phasePlan, globalTools: p.globalTools, stages: p.stages, updatedAt: p.updatedAt });
  Object.assign(p, normalized, { sourceChallenge: normalized.challengeId ? getChallenge(normalized.challengeId, catalog) : undefined });
  p.status = 'draft'; p.runtimeProfile = undefined; p.report = undefined; p.approvedAt = undefined; p.exportedTo = undefined; p.executable = undefined; p.error = undefined;
  p.systemDesign = undefined; p.phasePlan = undefined; p.globalTools = undefined;
  p.stages.forEach(s => { s.status = s.id === 'intake' ? 'complete' : 'queued'; });
  p.updatedAt = new Date().toISOString();
  try { await store.save(); }
  catch (error) { Object.assign(p, previous); notify(); throw error; }
  notify(); return p;
}
async function startRun(id: string, fromConversation = false, feedback?: string) {
  if (quitting) throw new Error('AppYard is closing. Reopen it to start a build.');
  requireIdle(id, fromConversation);
  let resolve!: () => void;
  const done = new Promise<void>(r => { resolve = r; }); startingRuns.set(id, done);
  try { if (feedback === undefined) await backend.start(id); else await backend.requestChanges(id, feedback); }
  finally { try { if (quitting) await backend.stop(id); } finally { startingRuns.delete(id); resolve(); } }
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
  if (!p.workspace || !reportPassed(p.report, p.qualityVersion !== undefined)) throw new Error('Passing required capability, runtime and application checks are required before delivery.');
  if (await sourceHash(p.workspace) !== p.report!.sourceHash) throw new Error('Artifacts changed after verification. Start a new run before approving or exporting.');
  return p;
}
function registerIPC() {
  handle('fleet:conversation:send', (id: string, text: string) => {
    if (quitting) throw new Error('AppYard is closing. Reopen it to continue the conversation.');
    if (conversationActions.has(id)) throw new Error('Wait for the project action to finish before sending a message.');
    return lead.send(id, text);
  });
  handle('fleet:conversation:cancel', (id: string) => lead.cancel(id));
  handle('fleet:conversation:answer', (id: string, questionId: string, answer: string | ClarificationAnswer) => {
    if (conversationActions.has(id)) throw new Error('The project is changing. Wait for the action to finish.');
    return clarifications.answer(id, questionId, answer);
  });
  handle('fleet:conversation:dismiss', (id: string, actionId: string) => {
    if (conversationActions.has(id)) throw new Error('This action is already being applied.');
    return lead.dismiss(id, actionId);
  });
  handle('fleet:conversation:apply', async (id: string, actionId: string) => {
    if (conversationActions.has(id) || deliveries.has(id) || startingRuns.has(id)) throw new Error('Wait for the current project operation to finish.');
    const p = store.project(id), action = p.conversation?.actions.find(item => item.id === actionId);
    if (!action || action.status !== 'proposed') throw new Error('This proposal is no longer available.');
    if (action.baseBriefHash !== briefHash(p) || action.runId !== p.runId) throw new Error('This proposal belongs to an older brief or build. Ask the project lead for an updated proposal.');
    if (action.type === 'start' && backend.active.has(id)) throw new Error('This build is already running.');
    if (action.type === 'stop' && !backend.active.has(id)) throw new Error('That build is no longer running.');
    if (quitting) throw new Error('AppYard is closing. Reopen it to apply this proposal.');
    let resolve!: () => void;
    const done = new Promise<void>(r => { resolve = r; }); conversationActions.set(id, done);
    const record = (text: string) => p.conversation!.messages.push({ id: randomUUID(), role: 'system', text, createdAt: new Date().toISOString(), runId: p.runId });
    try {
      await lead.cancel(id);
      if (quitting) throw new Error('AppYard is closing. This proposal was not applied.');
      if (p.conversation?.actions.find(item => item.id === actionId) !== action || action.status !== 'proposed'
        || action.baseBriefHash !== briefHash(p) || action.runId !== p.runId) throw new Error('This proposal changed while the reply was finishing. Ask for an updated proposal.');
      if (action.type === 'stop' && !backend.active.has(id)) throw new Error('That build finished before the stop action was applied.');
      if (action.type === 'stop') { await backend.stop(id); action.status = 'applied'; record('Build stopped. Saved outputs remain available.'); }
      else if (action.type === 'start') { await startRun(id, true); action.status = 'applied'; record('Started a fresh build from the current brief.'); }
      else if (action.type === 'revise' && action.brief) {
        const revised = validateInput({ ...projectBrief(p), ...action.brief }, p.sourceChallenge ? [p.sourceChallenge, ...currentCatalog()] : currentCatalog());
        if (backend.active.has(id)) await backend.stop(id);
        await updateProject(id, revised, true); action.status = 'applied';
        record('Brief updated. Previous test results and approval were reset.');
        await startRun(id, true); record('Started a fresh build with the revised brief. Previous run files are preserved.');
      } else throw new Error('Invalid project action.');
    } catch (error) {
      if (action.status === 'applied') record('The brief was updated, but the fresh build could not start: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    } finally { try { await store.save(); } finally { conversationActions.delete(id); resolve(); notify(); } }
  });
  handle('fleet:bootstrap', bootstrap);
  handle('fleet:norfolk:refresh', () => {
    if (!norfolkRefresh) norfolkRefresh = (async () => {
      const catalog = await refreshNorfolkCatalog();
      const previous = store.state.norfolkCatalog;
      store.state.norfolkCatalog = catalog;
      try { await store.save(); } catch (error) { store.state.norfolkCatalog = previous; throw error; }
      notify(); return catalog;
    })().finally(() => { norfolkRefresh = undefined; });
    return norfolkRefresh;
  });
  handle('fleet:create', async (input: NewProject) => {
    const p = newProject(input, currentCatalog()); store.state.projects.unshift(p); await store.save(); notify(); return p;
  });
  handle('fleet:update', (id: string, input: NewProject) => updateProject(id, input));
  handle('fleet:start', (id: string) => startRun(id));
  handle('fleet:request-changes', (id: string, feedback: string) => {
    reviewFeedback(feedback); return startRun(id, false, feedback);
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
    reviewFeedback(feedback);
    const p = await assertVerified(id);
    await recordReview(store, p, 'approved', feedback); notify();
  });
  handle('fleet:export', async (id: string) => {
    const project = requireIdle(id), p = structuredClone(project), controller = new AbortController();
    let finish!: () => void;
    const done = new Promise<void>(resolve => { finish = resolve; });
    deliveries.set(id, { controller, done });
    let destination: string | undefined, committed = false;
    try {
      if (!p.approvedAt || !['approved', 'delivered'].includes(p.status)) throw new Error('Review and approve this prototype before export.');
      if (!p.workspace || !reportPassed(p.report, p.qualityVersion !== undefined)) throw new Error('Passing required capability, runtime and application checks are required before delivery.');
      if (await sourceHash(p.workspace) !== p.report!.sourceHash) throw new Error('Artifacts changed after verification. Start a new run before exporting.');
      controller.signal.throwIfAborted();
      const result = await dialog.showOpenDialog(window!, { title: 'Choose a delivery folder', properties: ['openDirectory', 'createDirectory'] });
      if (result.canceled) return null;
      controller.signal.throwIfAborted();
      destination = await exportVerifiedBundle({ workspace: p.workspace, parent: result.filePaths[0], title: p.title,
        verifiedHash: p.report!.sourceHash, deliveryMarkdown: [
          '# ' + p.title, '', 'Follow README.md for the declared runtime, dependency installation, required environment settings and startup command.', '',
          'Tests: follow the prerequisites in README.md, then run: ' + p.report!.command, '',
          'Automated result: ' + p.report!.passed + '/' + p.report!.total + ' passed.',
          ...(p.report!.quality ? [
            'Browser journeys: ' + p.report!.quality.journeys.filter(journey => journey.status === 'passed').length + '/' + p.report!.quality.journeys.length + ' passed. Evidence: test-report.json and .quality-evidence/.',
            ...(p.report!.quality.schemaVersion === 2 ? [
              'Runtime profile: ' + p.report!.quality.package?.profile + '. Clean-package check: ' + p.report!.quality.package?.status + '.',
              'Computational evaluation: ' + p.report!.quality.solutionEvaluation?.status + '. Datasets, metrics, thresholds and per-case evidence: test-report.json.'
            ] : []),
            'Requirement coverage: ' + (p.report!.quality.requirementsMet ? 'all recorded requirements have their required evidence.' : 'unverified requirements remain; prototype approval does not complete them.'),
            ...p.report!.quality.criteria.filter(criterion => criterion.status !== 'passed').map(criterion => '- ' + criterion.criterionId + ' (' + criterion.status + '): ' + criterion.requirement + ' — ' + criterion.detail)
          ] : ['Browser journeys and requirement coverage were not recorded for this legacy run.']),
          'Reviewed: ' + p.approvedAt, p.feedback, '', 'Operational readiness has not been verified.',
          'Generated by ' + (p.backend === 'codex' ? 'Codex' : 'Pi') + ' using ' + p.model + '. Run ' + p.runId
        ].join('\n') }, controller.signal);
      project.exportedTo = destination; project.status = 'delivered'; project.stages.find(s => s.id === 'deliver')!.status = 'complete';
      await store.save(); committed = true;
      notify(); shell.showItemInFolder(destination); return destination;
    } catch (error) {
      if (!committed) {
        project.exportedTo = p.exportedTo; project.status = p.status;
        project.stages.find(s => s.id === 'deliver')!.status = p.stages.find(s => s.id === 'deliver')!.status;
        if (destination) await fs.rm(destination, { recursive: true, force: true });
      }
      throw error;
    } finally { deliveries.delete(id); finish(); }
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
  const requireNoRuns = () => { if (backend.active.size || startingRuns.size || lead.active.size || conversationActions.size) throw new Error('Stop active builds and project lead replies before changing accounts or providers.'); };
  const chatGPTAccountId = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error('Choose a valid saved ChatGPT account.');
    return value;
  };
  handle('fleet:chatgpt:connect', async (accountId?: unknown) => { requireNoRuns(); await codex.login(accountId === undefined ? undefined : chatGPTAccountId(accountId)); return bootstrap(); });
  handle('fleet:chatgpt:select', async (accountId: unknown) => { requireNoRuns(); await codex.selectAccount(chatGPTAccountId(accountId)); return bootstrap(); });
  handle('fleet:chatgpt:reopen', async () => { requireNoRuns(); await codex.reopenLogin(); return bootstrap(); });
  handle('fleet:chatgpt:usage', async () => { await codex.manageUsage(); });
  handle('fleet:chatgpt:cancel', async () => { requireNoRuns(); await codex.cancel(); return bootstrap(); });
  handle('fleet:chatgpt:disconnect', async () => { requireNoRuns(); await codex.logout(); return bootstrap(); });
  handle('fleet:chatgpt:refresh', async () => { requireNoRuns(); await codex.refresh(); return bootstrap(); });
  handle('fleet:developer-mode', async (enabled: boolean) => {
    if (typeof enabled !== 'boolean') throw new Error('Choose whether developer mode is enabled.');
    const previous = store.state.settings.developerMode;
    store.state.settings.developerMode = enabled;
    try { await store.save(); }
    catch (error) { store.state.settings.developerMode = previous; throw error; }
    notify(); return bootstrap();
  });
  handle('fleet:settings', async (settings: Settings, key?: string) => {
    requireNoRuns();
    if (!settings || typeof settings.provider !== 'string' || typeof settings.model !== 'string' || typeof settings.rememberKey !== 'boolean' ||
      !['pi', 'codex'].includes(settings.backend ?? 'pi')) throw new Error('Select a valid backend and model.');
    if (key !== undefined && (typeof key !== 'string' || key.length > 20000)) throw new Error('Invalid API key.');
    if (settings.backend === 'codex') {
      if (key?.trim()) throw new Error('ChatGPT uses browser sign-in, not an API key.');
      if (codex.account.status !== 'connected' || !codex.account.planUsageEnabled || !codex.models.some(m => m.id === settings.model && m.configured) || settings.provider !== 'chatgpt') throw new Error('Sign in with ChatGPT, allow plan usage, and select a Codex model first.');
      store.state.settings = { backend: 'codex', provider: 'chatgpt', model: settings.model, rememberKey: false, developerMode: store.state.settings.developerMode === true };
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
    store.state.settings = { backend: 'pi', provider: settings.provider, model: settings.model, rememberKey: settings.rememberKey, developerMode: store.state.settings.developerMode === true };
    await store.save(); notify(); return bootstrap();
  });
}
function createWindow() {
  window = new BrowserWindow({
    width: 1512, height: 982, minWidth: 1120, minHeight: 720, title: 'AppYard',
    icon: iconPath,
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
    if (process.platform === 'darwin' && !app.isPackaged) app.dock?.setIcon(iconPath);
    store = new Store(app.getPath('userData'));
    await store.init();
    codex = new CodexAccount(store.root, url => shell.openExternal(url));
    clarifications = new ClarificationBroker(store, notify);
    backend = new FleetBackend(store, process.execPath, notify, app.getAppPath(), { codex, clarifications });
    await backend.init(); await codex.refresh();
    lead = new ProjectLead(store, backend.runtime, notify, { codex });
    try {
      const encrypted = await fs.readFile(path.join(store.root, 'credentials.enc'));
      const { provider, key } = JSON.parse(safeStorage.decryptString(encrypted));
      await backend.runtime.setRuntimeApiKey(provider, key);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Saved credential could not be loaded. Reconnect in Model settings.'); }
    registerIPC();
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'AppYard', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] },
      { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }
    ]));
    createWindow();
    app.on('activate', () => { if (!window) createWindow(); });
  } catch (error) { dialog.showErrorBox('AppYard could not start', String(error)); app.quit(); }
});
let quitting = false;
app.on('before-quit', event => {
  if (!quitting && (backend?.active.size || lead?.active.size || deliveries.size || startingRuns.size || conversationActions.size)) {
    event.preventDefault(); quitting = true;
    for (const delivery of deliveries.values()) delivery.controller.abort();
    void Promise.allSettled([backend.stopAll(), lead.stopAll(), ...startingRuns.values(), ...conversationActions.values(), ...[...deliveries.values()].map(d => d.done)]).then(async () => {
      try { await store.save(); } catch { console.error('Could not save the final workspace state while closing.'); }
      app.quit();
    });
  }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { previews.close(); codex?.dispose(); });
