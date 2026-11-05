import { redactValue, redactSecrets, registerCredential } from './secrets.js';
import { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, Menu, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { promises as disk } from 'original-fs';
import { fileURLToPath } from 'node:url';
import { Store, newProject, validateInput, listArtifacts, safeFile } from './storage.js';
import { FleetBackend } from './pi-backend.js';
import { CodexAccount } from './codex-account.js';
import { applicationTestFiles, portableTestCommand } from './verification.js';
import { ApplicationPreviews } from './solution-preview.js';
import { assertExecutableSource, executableFileName, stageExecutable, runPackageWorker, saveExecutable } from './executable.js';
import type { NewProject, Settings } from '../shared/types.js';
import { challenges, getChallenge, refreshNorfolkCatalog } from '../harness/catalog.js';
import { exportVerifiedBundle } from './source-export.js';
import { ConnectorService, registerConnectorIPC } from './connectors/index.js';
import { ConnectorStore } from './connectors/store.js';
import { connectorConfiguration, connectorEncryption, fixtureSource } from './connectors/config.js';
import { DATA_SERVICE_SECRET_NAMES } from './connectors/custom-api.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { verifiedManifest, deliveryEvidence, evidenceJson } from './delivery.js';
import { ProjectLead, briefHash, projectBrief } from './conversation.js';
import { ClarificationBroker } from './clarifications.js';
import { RunProcessSweep } from './process-sweep.js';
import type { ClarificationAnswer } from '../shared/conversation.js';
import { randomUUID } from 'node:crypto';
import { recordReview, reviewFeedback } from './review.js';
import { readVisualCapture } from './visual-review.js';
import { GenAiMil, GENAI_MIL_PROVIDER, genAiMilUnlockUrl } from './genai-mil.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const iconPath = path.join(app.getAppPath(), app.isPackaged ? 'dist' : 'public', 'app-icon-512.png');
// Preserve existing workspaces and credentials when the display name changes.
app.setPath('userData', process.env.FLEET_USER_DATA ? path.resolve(process.env.FLEET_USER_DATA) : path.join(app.getPath('appData'), 'fleetharness'));
app.setName('AppYard');
const ownsInstance = app.requestSingleInstanceLock();
if (!ownsInstance) app.quit();
let window: BrowserWindow | null = null;
app.on('second-instance', () => {
  if (!window) return;
  if (window.isMinimized()) window.restore();
  window.show(); window.focus();
});
let store: Store, backend: FleetBackend, codex: CodexAccount;
let genAiMil: GenAiMil;
let connectors: ConnectorService;
let lead: ProjectLead, clarifications: ClarificationBroker;
const conversationActions = new Map<string, Promise<void>>();
const previewing = new Set<string>();
const previewStarts = new Map<string, AbortController>();
const previews = new ApplicationPreviews(process.execPath);
const deliveries = new Map<string, { controller: AbortController; done: Promise<void> }>();
const startingRuns = new Map<string, Promise<void>>();
const approvals = new Set<string>();
let norfolkRefresh: ReturnType<typeof refreshNorfolkCatalog> | undefined;
const currentCatalog = () => store.state.norfolkCatalog?.challenges ?? challenges;
let emitTimer: ReturnType<typeof setTimeout> | undefined;
const notify = () => {
  if (emitTimer) return;
  emitTimer = setTimeout(() => { emitTimer = undefined; if (window && !window.isDestroyed()) window.webContents.send('fleet:state', redactValue(store.state)); }, 100);
};
function checkSender(event: IpcMainInvokeEvent) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Untrusted application frame.');
}
function handle(channel: string, fn: (...args: any[]) => unknown) {
  ipcMain.handle(channel, async (event, ...args) => {
    checkSender(event);
    try { return redactValue(await fn(...args)); }
    catch (error) {
      const source = error as { message?: unknown; name?: unknown } | null;
      const safe = new Error(redactSecrets(typeof source?.message === 'string' ? source.message : String(error)));
      if (typeof source?.name === 'string') safe.name = redactSecrets(source.name);
      throw safe;
    }
  });
}
const bootstrap = () => ({
  state: redactValue(store.state), models: backend.models(), storagePath: store.root,
  capabilities: { projectConversation: true },
  chatgpt: codex.account,
  genAiMil: genAiMil.view(),
  credentialStatus: store.state.settings.backend === 'codex' ? (codex.account.status === 'connected' ? codex.route.label + ' connected' : 'Connect ChatGPT or an API key to run Codex') : store.state.settings.provider === GENAI_MIL_PROVIDER ? (genAiMil.view().connected ? 'GenAI.mil connected' : 'Connect GenAI.mil in Model settings') : store.state.settings.provider && backend.runtime.hasConfiguredAuth(store.state.settings.provider) ? 'Provider connected' : 'Connect a provider to run Pi agents',
  runtime: 'Codex 0.166.0 · Pi SDK 1.5.0 · Electron ' + process.versions.electron
});
function requireIdle(id: string, fromConversation = false) {
  if (!fromConversation && conversationActions.has(id)) throw new Error('Wait for the project lead action to finish.');
  if (approvals.has(id)) throw new Error('Wait for the review to be saved before changing this build.');
  if (deliveries.has(id)) throw new Error('Wait for the app download to finish before changing this build.');
  if (backend.active.has(id) || startingRuns.has(id)) throw new Error('Stop this run before changing its requirements or delivery state.');
  const p = store.project(id);
  if (p.processScope && (p.processScope.cleanup !== 'confirmed' || p.processScope.runId !== p.runId)) throw new Error('Process cleanup is unconfirmed. Use Stop before changing this build.');
  return p;
}
async function updateProject(id: string, input: NewProject, fromConversation = false) {
  await stopPreview(id);
  const p = requireIdle(id, fromConversation);
  const catalog = p.sourceChallenge ? [p.sourceChallenge, ...currentCatalog()] : currentCatalog();
  const normalized = validateInput(input, catalog);
  const previous = structuredClone({ ...projectBrief(p), sourceChallenge: p.sourceChallenge, status: p.status, runtimeProfile: p.runtimeProfile,
    runCheckpoint: p.runCheckpoint, verification: p.verification, approval: p.approval, report: p.report, approvedAt: p.approvedAt, exportedTo: p.exportedTo, executable: p.executable, error: p.error, visualReview: p.visualReview, resumeStage: p.resumeStage,
    systemDesign: p.systemDesign, phasePlan: p.phasePlan, globalTools: p.globalTools, stages: p.stages, updatedAt: p.updatedAt });
  Object.assign(p, normalized, { sourceChallenge: normalized.challengeId ? getChallenge(normalized.challengeId, catalog) : undefined });
  p.connectedData = normalized.connectedData;
  p.status = 'draft'; p.resumeStage = undefined; p.runtimeProfile = undefined; p.report = undefined; p.visualReview = undefined; p.approvedAt = undefined; p.exportedTo = undefined; p.executable = undefined; p.error = undefined;
  p.systemDesign = undefined; p.phasePlan = undefined; p.globalTools = undefined;
  p.runCheckpoint = undefined; p.verification = undefined; p.approval = undefined;
  p.stages.forEach(s => { s.status = s.id === 'intake' ? 'complete' : 'queued'; });
  p.updatedAt = new Date().toISOString();
  try { await store.save(); }
  catch (error) { Object.assign(p, previous); notify(); throw error; }
  notify(); return p;
}
async function startRun(id: string, fromConversation = false, resuming = false, feedback?: string) {
  if (quitting) throw new Error('AppYard is closing. Reopen it to start a build.');
  await stopPreview(id);
  requireIdle(id, fromConversation);
  let resolve!: () => void;
  const done = new Promise<void>(r => { resolve = r; }); startingRuns.set(id, done);
  try { if (resuming) await backend.resume(id); else if (feedback !== undefined) await backend.requestChanges(id, feedback); else await backend.start(id); }
  finally { try { if (quitting) await backend.stop(id); } finally { startingRuns.delete(id); resolve(); } }
}
async function readArtifact(id: string, file: string) {
  const p = store.project(id);
  if (!p.workspace) throw new Error('Start a run to create artifacts.');
  const target = await safeFile(p.workspace, file);
  if ((await fs.stat(target)).size > 2_000_000) throw new Error('This file is too large for the viewer. Open its workspace folder.');
  return fs.readFile(target, 'utf8');
}
async function stopPreview(id: string) {
  if (!previewing.has(id)) return;
  previewStarts.get(id)?.abort();
  const p = store.project(id);
  try {
    await previews.stop(p.workspace!);
    await new RunProcessSweep({ marker: p.processScope!.marker }).stop();
    p.processScope!.cleanup = 'confirmed'; previewing.delete(id);
  } catch (error) { p.processScope!.cleanup = 'unconfirmed'; throw error; }
  finally { await store.save(); }
}
function registerIPC() {
  registerConnectorIPC(handle, connectors);
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
  handle('fleet:resume', (id: string) => startRun(id, false, true));
  handle('fleet:stop', async (id: string) => {
    const delivery = deliveries.get(id); delivery?.controller.abort();
    await stopPreview(id);
    await Promise.all([backend.stop(id), delivery?.done]);
  });
  handle('fleet:request-changes', (id: string, feedback: string) => {
    reviewFeedback(feedback); return startRun(id, false, false, feedback);
  });
  handle('fleet:artifacts', async (id: string) => { const p = store.project(id); return p.workspace ? listArtifacts(p.workspace) : []; });
  handle('fleet:read', readArtifact);
  handle('fleet:visual-review-image', async (id: string, captureId: string) => {
    if (typeof captureId !== 'string' || !captureId || captureId.length > 200) throw new Error('Choose a recorded screenshot.');
    const p = store.project(id);
    if (!p.workspace) throw new Error('This build has no saved screenshots.');
    const evidence = p.visualReview ?? p.report?.quality?.visualReview;
    if (!evidence || evidence.runId !== p.runId) throw new Error('Screenshot evidence does not belong to this build.');
    const capture = evidence.captures.find(item => item.id === captureId);
    if (!capture) throw new Error('This screenshot was not recorded by the host for this build.');
    const bytes = await readVisualCapture(p.workspace, capture);
    return 'data:image/png;base64,' + bytes.toString('base64');
  });
  handle('fleet:preview', async (id: string) => {
    try {
      await stopPreview(id);
      const p = requireIdle(id);
      if (!p.workspace) return null;
      if (!p.runId || !p.processScope) throw new Error('Start a new build before opening a runtime preview.');
      const scope = new RunProcessSweep({ marker: p.processScope.marker });
      const starting = new AbortController(); previewStarts.set(id, starting);
      p.processScope.cleanup = 'pending'; previewing.add(id);
      try {
        await store.save();
        if (starting.signal.aborted || previewStarts.get(id) !== starting || quitting) return null;
        return await scope.run(() => previews.url(p.workspace!));
      }
      catch (error) { await stopPreview(id); throw error; }
      finally { if (previewStarts.get(id) === starting) previewStarts.delete(id); }
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || !store.project(id).workspace) return null; throw error; }
  });
  handle('fleet:open', async (id: string) => {
    const p = store.project(id); if (!p.workspace) throw new Error('This challenge has no workspace yet.');
    const error = await shell.openPath(p.workspace); if (error) throw new Error(error);
  });
  handle('fleet:approve', async (id: string, feedback: string) => {
    reviewFeedback(feedback);
    await stopPreview(id);
    const p = requireIdle(id);
    approvals.add(id);
    try { await recordReview(store, p, 'approved', feedback); }
    finally { approvals.delete(id); notify(); }
  });
  handle('fleet:export', async (id: string) => {
    await stopPreview(id);
    const project = requireIdle(id), p = structuredClone(project), controller = new AbortController();
    let finish!: () => void;
    const done = new Promise<void>(resolve => { finish = resolve; });
    deliveries.set(id, { controller, done });
    let destination: string | undefined, committed = false;
    try {
      await verifiedManifest(p, true);
      controller.signal.throwIfAborted();
      const result = await dialog.showOpenDialog(window!, { title: 'Choose a delivery folder', properties: ['openDirectory', 'createDirectory'] });
      if (result.canceled) return null;
      controller.signal.throwIfAborted();
      destination = await exportVerifiedBundle({ workspace: p.workspace!, parent: result.filePaths[0], title: p.title,
        verifiedHash: p.report!.sourceHash, evidence: deliveryEvidence(p), deliveryMarkdown: [
          '# ' + p.title, '', 'Follow README.md for the declared runtime, dependency installation, required environment settings and startup command.', '',
          'Tests: follow the prerequisites in README.md, then run: ' + (p.report!.portableCommand ?? portableTestCommand(await applicationTestFiles(p.workspace!))), '',
          'Original runtime execution provenance is recorded separately in test-report.json (provenance).', '',
          'Automated result: ' + p.report!.passed + '/' + p.report!.total + ' passed.',
          ...(p.report!.quality ? [
            'Browser journeys: ' + p.report!.quality.journeys.filter(journey => journey.status === 'passed').length + '/' + p.report!.quality.journeys.length + ' passed. Evidence: test-report.json and .quality-evidence/.',
            ...(p.report!.quality.schemaVersion >= 2 ? [
              'Runtime profile: ' + p.report!.quality.package?.profile + '. Clean-package check: ' + p.report!.quality.package?.status + '.',
              'Computational evaluation: ' + p.report!.quality.solutionEvaluation?.status + '. Datasets, metrics, thresholds and per-case evidence: test-report.json.'
            ] : []),
            'Requirement coverage: ' + (p.report!.quality.requirementsMet ? 'all recorded requirements have their required evidence.' : 'unverified requirements remain; prototype approval does not complete them.'),
            ...p.report!.quality.criteria.filter(criterion => criterion.status !== 'passed').map(criterion => '- ' + criterion.criterionId + ' (' + criterion.status + '): ' + criterion.requirement + ' — ' + criterion.detail)
          ] : ['Browser journeys and requirement coverage were not recorded for this legacy run.']),
          'Reviewed: ' + p.approvedAt, p.feedback, '', 'Operational readiness has not been verified.',
          'Run ' + p.runId
        ].join('\n') }, controller.signal);
      controller.signal.throwIfAborted();
      project.exportedTo = destination; project.status = 'delivered'; project.stages.find(s => s.id === 'deliver')!.status = 'complete';
      await store.save(); controller.signal.throwIfAborted(); committed = true;
      notify(); shell.showItemInFolder(destination); return destination;
    } catch (error) {
      if (!committed) {
        project.exportedTo = p.exportedTo; project.status = p.status;
        project.stages.find(s => s.id === 'deliver')!.status = p.stages.find(s => s.id === 'deliver')!.status;
        if (destination) await fs.rm(destination, { recursive: true, force: true });
        await store.save(); notify();
      }
      throw error;
    } finally { deliveries.delete(id); finish(); }
  });
  handle('fleet:download-executable', async (id: string) => {
    await stopPreview(id);
    const p = requireIdle(id), controller = new AbortController();
    const prior = structuredClone(p);
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
      const savedTo = await saveExecutable(archive, result.filePath, p.workspace!, controller.signal, async target => {
        controller.signal.throwIfAborted();
        p.executable = { ...p.executable!, status: 'ready', savedTo: target };
        p.status = 'delivered'; p.stages.find(s => s.id === 'deliver')!.status = 'complete';
        p.updatedAt = new Date().toISOString(); await store.save();
      });
      notify();
      shell.showItemInFolder(savedTo); return savedTo;
    } catch (error) {
      if (packaging && p.executable) {
        p.status = prior.status; p.updatedAt = prior.updatedAt;
        p.stages.find(s => s.id === 'deliver')!.status = prior.stages.find(s => s.id === 'deliver')!.status;
        p.executable = { ...p.executable, status: 'failed', error: error instanceof Error ? error.message : String(error) };
        delete p.executable.savedTo;
        await store.save(); notify();
      }
      throw error;
    } finally {
      try { if (temporary) await disk.rm(temporary, { recursive: true, force: true, maxRetries: 3 }); }
      finally { deliveries.delete(id); finish(); }
    }
  });
  const requireNoRuns = () => { if (backend.active.size || startingRuns.size || lead.active.size || conversationActions.size) throw new Error('Stop active builds and project lead replies before changing accounts or providers.'); };
  handle('fleet:genai-mil:save', async (address: unknown, key?: unknown) => { requireNoRuns(); await genAiMil.save(address, key); return bootstrap(); });
  handle('fleet:genai-mil:connect', async () => { requireNoRuns(); await genAiMil.connect(); return bootstrap(); });
  handle('fleet:genai-mil:clear', async () => { requireNoRuns(); await genAiMil.clear(); return bootstrap(); });
  handle('fleet:genai-mil:unlock', async () => {
    const url = genAiMilUnlockUrl(genAiMil.view().issue?.unlockUrl);
    if (!url) throw new Error('No valid GenAI.mil unlock link is available.');
    await shell.openExternal(url);
  });
  const chatGPTAccountId = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error('Choose a valid saved ChatGPT account.');
    return value;
  };
  handle('fleet:chatgpt:connect', async (accountId?: unknown) => { requireNoRuns(); await codex.login(accountId === undefined ? undefined : chatGPTAccountId(accountId)); return bootstrap(); });
  handle('fleet:chatgpt:select', async (accountId: unknown) => { requireNoRuns(); await codex.selectAccount(chatGPTAccountId(accountId)); return bootstrap(); });
  handle('fleet:chatgpt:reopen', async () => { requireNoRuns(); await codex.reopenLogin(); return bootstrap(); });
  handle('fleet:chatgpt:usage', async () => { await codex.manageUsage(); });
  handle('fleet:codex:connect-key', async (key: unknown) => { requireNoRuns(); await codex.loginWithKey(key); return bootstrap(); });
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
    if (settings.provider === GENAI_MIL_PROVIDER) {
      if (key) throw new Error('Save the key in the GenAI.mil tab.');
      genAiMil.assertModel(settings.backend ?? 'pi', settings.model);
      store.state.settings = { backend: 'pi', provider: GENAI_MIL_PROVIDER, model: settings.model, rememberKey: true, developerMode: store.state.settings.developerMode === true };
      await store.save(); notify(); return bootstrap();
    }
    if (settings.backend === 'codex') {
      if (key?.trim()) throw new Error('Use the Codex API-key sign-in control before saving model settings.');
      if (codex.account.status !== 'connected' || (codex.account.authType !== 'apiKey' && !codex.account.planUsageEnabled) || !codex.models.some(m => (!settings.model || m.id === settings.model) && m.configured) || settings.provider !== 'chatgpt') throw new Error('Connect ChatGPT or an API key and select a Codex model first.');
      store.state.settings = { backend: 'codex', provider: 'chatgpt', model: settings.model, rememberKey: false, developerMode: store.state.settings.developerMode === true };
      await store.save(); notify(); return bootstrap();
    }
    if (!backend.runtime.getModel(settings.provider, settings.model)) throw new Error('Select a valid Pi model.');
    const keyFile = path.join(store.root, 'credentials.enc');
    if (key?.trim()) {
      if (settings.rememberKey && !safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable. Use a session-only key.');
      registerCredential(key.trim());
      await backend.runtime.setRuntimeApiKey(settings.provider, key.trim());
      if (settings.rememberKey) await atomicHostWrite(store.root, 'credentials.enc', safeStorage.encryptString(JSON.stringify({ provider: settings.provider, key: key.trim() })));
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
    webPreferences: { preload: path.join(dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: false, webviewTag: false }
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
if (ownsInstance) app.whenReady().then(async () => {
  try {
    if (process.platform === 'darwin' && !app.isPackaged) app.dock?.setIcon(iconPath);
    store = new Store(app.getPath('userData'));
    await store.init();
    const connectorConfig = connectorConfiguration(app.isPackaged, process.env);
    const encryption = connectorEncryption(app.isPackaged, process.env, safeStorage);
    // The fixture key stays in the host encryptor, never in build child environments.
    delete process.env.APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY;
    connectors = new ConnectorService(new ConnectorStore(path.join(store.root, 'connectors'), encryption), [], 120_000, {
      allowConnections: true,
      openBrowser: async address => {
        const url = new URL(address);
        if (url.protocol !== 'https:' && !(connectorConfig.fixture && url.origin === connectorConfig.fixture.accounts)) throw new Error('Sign-in address is not allowed.');
        await shell.openExternal(url.href);
      },
      isSynthetic: async (kind, secrets) => {
        if (!connectorConfig.fixture) return false;
        const address = kind === 'custom-api' ? JSON.parse(await secrets.get(DATA_SERVICE_SECRET_NAMES.connection) ?? '{}').url : undefined;
        return fixtureSource(connectorConfig, kind, address);
      }
    });
    await connectors.registerInstalledAdapters(connectorConfig);
    await connectors.init();
    codex = new CodexAccount(store.root, url => shell.openExternal(url));
    clarifications = new ClarificationBroker(store, notify);
    backend = new FleetBackend(store, process.execPath, notify, app.getAppPath(), { codex, clarifications, connectorStore: connectors.store, genAiMil: () => genAiMil });
    await backend.init(); await codex.refresh();
    genAiMil = new GenAiMil(store.root, safeStorage, backend.runtime, { log: line => console.info(line) });
    await genAiMil.load();
    lead = new ProjectLead(store, backend.runtime, notify, { codex });
    try {
      const encrypted = await fs.readFile(path.join(store.root, 'credentials.enc'));
      const { provider, key } = JSON.parse(safeStorage.decryptString(encrypted));
      registerCredential(key);
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
  if (!quitting && (backend?.active.size || lead?.active.size || deliveries.size || startingRuns.size || conversationActions.size || previewing.size || connectors?.busy)) {
    event.preventDefault(); quitting = true;
    for (const delivery of deliveries.values()) delivery.controller.abort();
    void Promise.allSettled([connectors?.shutdown(), backend.stopAll(), lead.stopAll(), ...[...previewing].map(id => stopPreview(id)), ...startingRuns.values(), ...conversationActions.values(), ...[...deliveries.values()].map(d => d.done)]).then(async () => {
      try { await store.save(); } catch { console.error('Could not save the final workspace state while closing.'); }
      app.quit();
    });
  }
  else if (!quitting) void connectors?.shutdown();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { void previews.close().catch(() => {}); codex?.dispose(); });
