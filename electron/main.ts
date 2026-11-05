import { redactValue, redactSecrets, registerCredential } from './secrets.js';
import { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, Menu, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { promises as disk } from 'original-fs';
import { fileURLToPath } from 'node:url';
import { Store, newProject, validateInput, listArtifacts, safeFile, sourceHash } from './storage.js';
import { FleetBackend } from './pi-backend.js';
import { CodexAccount } from './codex-account.js';
import { applicationTestFiles, portableTestCommand } from './verification.js';
import { CodexGoalService } from './codex-goal.js';
import { applicationTestRerunCommand, reportPassed } from './verification.js';
import { ApplicationPreviews } from './solution-preview.js';
import { assertExecutableSource, executableFileName, stageExecutable, runPackageWorker, saveExecutable } from './executable.js';
import type { NewProject, Project, Settings } from '../shared/types.js';
import { challenges, getChallenge, refreshNorfolkCatalog } from '../harness/catalog.js';
import { exportVerifiedBundle } from './source-export.js';
import { ConnectorService, registerConnectorIPC } from './connectors/index.js';
import { ConnectorStore } from './connectors/store.js';
import { connectorConfiguration, connectorEncryption, fixtureSource } from './connectors/config.js';
import { DATA_SERVICE_SECRET_NAMES } from './connectors/custom-api.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { assertReviewState, verifiedManifest, deliveryEvidence, evidenceJson } from './delivery.js';
import { ProjectLead, briefHash, projectBrief, canRequestChange } from './conversation.js';
import { ClarificationBroker } from './clarifications.js';
import { RunProcessSweep } from './process-sweep.js';
import type { ClarificationAnswer } from '../shared/conversation.js';
import { randomUUID } from 'node:crypto';
import { recordReview, reviewFeedback } from './review.js';
import { readVisualCapture } from './visual-review.js';
import { GenAiMil, GENAI_MIL_PROVIDER, genAiMilUnlockUrl } from './genai-mil.js';
import { createPreviewProxy } from './preview-proxy.js';
import { PreviewBoundary } from './preview-boundary.js';
import { ExperimentService } from './experiment-service.js';
import { experimentMethodNames } from '../shared/experiments.js';
import { DataStorageService } from './data-storage.js';
import { storageMethodNames } from '../shared/data-storage.js';
import { readPlanningContinuation } from './planning-continuation.js';
import { briefFingerprint } from './run-checkpoint.js';
import { savedReasoningEffort } from '../shared/reasoning.js';
import { readMailMcpDemoBundle, seedMailMcpDemo, MailMcpDemoPreview } from './mailmcp-demo.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const iconPath = path.join(app.getAppPath(), app.isPackaged ? 'dist' : 'public', 'app-icon-512.png');
const demoBundle = readMailMcpDemoBundle(app.isPackaged ? path.join(process.resourcesPath, 'mailmcp-demo') : process.env.APPYARD_DEMO_BUNDLE);
const appName = demoBundle ? 'AppYard Demo' : 'AppYard';
let demoPreview = demoBundle ? new MailMcpDemoPreview(demoBundle) : undefined;
// Preserve existing workspaces and credentials when the display name changes.
app.setPath('userData', process.env.FLEET_USER_DATA ? path.resolve(process.env.FLEET_USER_DATA) : path.join(app.getPath('appData'), demoBundle ? 'fleetharness-mailmcp-demo' : 'fleetharness'));
app.setName(appName);
function mailMcpPreview() {
  if (!demoPreview) {
    const importedBundle = readMailMcpDemoBundle(path.join(app.getPath('userData'), 'demos', 'mailmcp'));
    if (!importedBundle) throw new Error('The MailMCP preview runtime is missing. Restore the demo runtime in this AppYard profile’s demos/mailmcp folder.');
    demoPreview = new MailMcpDemoPreview(importedBundle);
  }
  return demoPreview;
}
app.commandLine.appendSwitch('disable-quic');
app.commandLine.appendSwitch('dns-prefetch-disable');
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
const previews = new ApplicationPreviews(process.execPath, {
  clearStorage: origin => window!.webContents.session.clearStorageData({ origin })
});
let codexGoals: CodexGoalService;
let experiments: ExperimentService;
let dataStorage: DataStorageService;
const storageMutations = new Map<string, Promise<void>>();
const approvals = new Map<string, Promise<void>>();
let previewRequestGeneration = 0;
const previewRequests = new Set<Promise<void>>();
async function trackPreview<T>(work: () => Promise<T>): Promise<T> {
  let finish!: () => void;
  const done = new Promise<void>(resolve => { finish = resolve; }); previewRequests.add(done);
  try { return await work(); }
  finally { previewRequests.delete(done); finish(); }
}
let desktopProxy: Awaited<ReturnType<typeof createPreviewProxy>> | undefined;
const experimentReservations = new Map<string, string>();
const previewBoundary = new PreviewBoundary({ fileRoot: path.join(dirname, '../../dist'), developmentURL: !app.isPackaged ? process.env.VITE_DEV_SERVER_URL : undefined });
async function closeLegacyPreviews() { await Promise.all([...previewing].map(id => stopPreview(id))); await previews.close(); }
const deliveries = new Map<string, { controller: AbortController; done: Promise<void> }>();
const startingRuns = new Map<string, Promise<void>>();
let norfolkRefresh: ReturnType<typeof refreshNorfolkCatalog> | undefined;
const currentCatalog = () => store.state.norfolkCatalog?.challenges ?? challenges;
let emitTimer: ReturnType<typeof setTimeout> | undefined;
const notify = () => {
  experiments?.refreshProjectSummaries();
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
  ...(demoBundle ? { demo: { projectId: demoBundle.projectId, label: demoBundle.label, repository: demoBundle.repository, commit: demoBundle.commit } } : {}),
  capabilities: { projectConversation: true, experiments: true, planningContinuation: true },
  chatgpt: codex.account,
  genAiMil: genAiMil.view(),
  credentialStatus: store.state.settings.backend === 'codex' ? (codex.account.status === 'connected' ? codex.route.label + ' connected' : 'Connect ChatGPT or an API key to run Codex') : store.state.settings.provider === GENAI_MIL_PROVIDER ? (genAiMil.view().connected ? 'GenAI.mil connected' : 'Connect GenAI.mil in Model settings') : store.state.settings.provider && backend.runtime.hasConfiguredAuth(store.state.settings.provider) ? 'Provider connected' : 'Connect a provider to run Pi agents',
  runtime: 'Codex 0.166.0 · Pi SDK 1.5.0 · Electron ' + process.versions.electron
});
function requireIdle(id: string, fromConversation = false) {
  if (codexGoals?.isActive(id)) throw new Error('Stop this Codex build before changing this project.');
  if (approvals.has(id)) throw new Error('Wait for the review to be saved before changing this project.');
  if (storageMutations.has(id)) throw new Error('Wait for the storage action to finish before changing this project.');
  if (!fromConversation && conversationActions.has(id)) throw new Error('Wait for the project lead action to finish.');
  if (approvals.has(id)) throw new Error('Wait for the review to be saved before changing this build.');
  if (deliveries.has(id)) throw new Error('Wait for the app download to finish before changing this build.');
  if (backend.active.has(id) || startingRuns.has(id) || experimentReservations.has(id) || experiments?.isActive(id)) throw new Error('Stop this run before changing its requirements or delivery state.');
  const p = store.project(id);
  if (p.processScope && (p.processScope.cleanup !== 'confirmed' || p.processScope.runId !== p.runId)) throw new Error('Process cleanup is unconfirmed. Use Stop before changing this build.');
  return p;
}
function requireRunCapacity() {
  const projects = new Set([...backend.active.keys(), ...startingRuns.keys(), ...experimentReservations.keys(), ...(codexGoals?.activeIds() ?? [])]);
  if (projects.size >= 3) throw new Error('Three builds or comparisons are already active. Stop one before starting another.');
}
async function stopRun(id: string) {
  if (codexGoals?.isActive(id)) { await codexGoals.stop(id); return; }
  const experiment = experiments?.activeExperiment(id);
  if (experiment) await experiments.stopExperiment(experiment); else await backend.stop(id);
}
async function updateProject(id: string, input: NewProject, fromConversation = false) {
  await stopPreview(id);
  const p = requireIdle(id, fromConversation);
  const catalog = p.sourceChallenge ? [p.sourceChallenge, ...currentCatalog()] : currentCatalog();
  const normalized = validateInput(input, catalog);
  const previousBriefHash = briefFingerprint(p), previousRunId = p.runId;
  const sourceChallenge = normalized.challengeId ? getChallenge(normalized.challengeId, catalog) : undefined;
  const updated = { ...p, ...normalized, sourceChallenge };
  // Only host-validated, unfrozen planning work can survive a brief edit.
  const planning = !p.approvedAt && !p.report
    ? await readPlanningContinuation(store.root, updated).catch(() => undefined) : undefined;
  requireIdle(id, fromConversation);
  if (p.runId !== previousRunId || briefFingerprint(p) !== previousBriefHash) throw new Error('The build changed while saving the brief. Try again.');
  const previous = structuredClone({ ...projectBrief(p), sourceChallenge: p.sourceChallenge, status: p.status, runtimeProfile: p.runtimeProfile,
    runCheckpoint: p.runCheckpoint, verification: p.verification, approval: p.approval, report: p.report, approvedAt: p.approvedAt, exportedTo: p.exportedTo, executable: p.executable, error: p.error, visualReview: p.visualReview, resumeStage: p.resumeStage,
    systemDesign: p.systemDesign, phasePlan: p.phasePlan, globalTools: p.globalTools, stages: p.stages, updatedAt: p.updatedAt });
  Object.assign(p, normalized, { sourceChallenge: normalized.challengeId ? getChallenge(normalized.challengeId, catalog) : undefined });
  p.connectedData = normalized.connectedData;
  p.status = 'draft'; p.resumeStage = undefined; p.runtimeProfile = undefined; p.report = undefined; p.visualReview = undefined; p.approvedAt = undefined; p.exportedTo = undefined; p.executable = undefined; p.error = undefined;
  p.systemDesign = undefined; p.phasePlan = undefined; p.globalTools = undefined;
  p.runCheckpoint = undefined; p.verification = undefined; p.approval = undefined;
  p.stages.forEach(s => { s.status = s.id === 'intake' ? 'complete' : 'queued'; });
  if (planning) {
    p.status = 'stopped'; p.resumeStage = 'plan';
    p.error = 'Brief updated. Continue planning from the saved work; completed intake and research are preserved.';
    p.stages.forEach(stage => { stage.status = ['intake', 'research'].includes(stage.id) ? 'complete' : stage.id === 'plan' ? 'failed' : 'queued'; });
  }
  p.updatedAt = new Date().toISOString();
  try { await store.save(); }
  catch (error) { Object.assign(p, previous); notify(); throw error; }
  notify(); return p;
}
async function startRun(id: string, fromConversation = false, resuming = false, feedback?: string) {
  if (quitting) throw new Error('AppYard is closing. Reopen it to start a build.');
  await stopPreview(id);
  if (resuming) return resumeRun(id, fromConversation);
  if (requireIdle(id, fromConversation).archivedAt) throw new Error('Restore this archived project in Data & storage before starting a build.');
  requireRunCapacity();
  if (feedback === undefined && experiments.learning.getSettings().mode !== 'off') { await experiments.startOrdinary(id); return; }
  let resolve!: () => void;
  const done = new Promise<void>(r => { resolve = r; }); startingRuns.set(id, done);
  try { if (feedback === undefined) await backend.start(id); else await backend.requestChanges(id, feedback); }
  finally { try { if (quitting) await backend.stop(id); } finally { startingRuns.delete(id); resolve(); } }
}
async function resumeRun(id: string, fromConversation = false) {
  if (quitting) throw new Error('AppYard is closing. Reopen it to resume a build.');
  await stopPreview(id);
  if (requireIdle(id, fromConversation).archivedAt) throw new Error('Restore this archived project in Data & storage before resuming a build.');
  requireRunCapacity();
  let resolve!: () => void;
  const done = new Promise<void>(r => { resolve = r; }); startingRuns.set(id, done);
  try {
    const project = store.project(id);
    const planning = project.resumeStage === 'plan' || project.status === 'draft'
      ? await readPlanningContinuation(store.root, project).catch(() => undefined) : undefined;
    if (planning && (planning.briefHash !== briefFingerprint(project)
      || project.error?.startsWith('Brief updated. Continue planning from the saved work;'))) await backend.continuePlanning(id);
    else await backend.resume(id);
  }
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
    if (demoPreview && p.demo?.kind === 'mailmcp') await demoPreview.stop();
    await previews.stop(p.workspace!);
    await new RunProcessSweep({ marker: p.processScope!.marker }).stop();
    p.processScope!.cleanup = 'confirmed'; previewing.delete(id);
  } catch (error) { p.processScope!.cleanup = 'unconfirmed'; throw error; }
  finally { await store.save(); }
}
async function assertVerified(id: string, reservedProject?: Project) {
  const p = reservedProject ?? requireIdle(id);
  assertReviewState(p);
  await experiments.assertSelectedVerified(p);
  return p;
}
function registerIPC() {
  registerConnectorIPC(handle, connectors);
  handle('fleet:conversation:send', (id: string, text: string) => {
    if (quitting) throw new Error('AppYard is closing. Reopen it to continue the conversation.');
    if (conversationActions.has(id)) throw new Error('Wait for the project action to finish before sending a message.');
    if (storageMutations.has(id)) throw new Error('Wait for the storage action to finish before sending a message.');
    if (approvals.has(id)) throw new Error('Wait for approval to finish before sending a message.');
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
    if (approvals.has(id)) throw new Error('Wait for approval to finish before applying a proposal.');
    if (storageMutations.has(id)) throw new Error('Wait for the storage action to finish before applying a proposal.');
    if (conversationActions.has(id) || deliveries.has(id) || startingRuns.has(id)) throw new Error('Wait for the current project operation to finish.');
    const p = store.project(id), action = p.conversation?.actions.find(item => item.id === actionId);
    if (!action || action.status !== 'proposed') throw new Error('This proposal is no longer available.');
    if (action.baseBriefHash !== briefHash(p) || action.runId !== p.runId) throw new Error('This proposal belongs to an older brief or build. Ask the project lead for an updated proposal.');
    if (action.type === 'start' && (backend.active.has(id) || experiments.isActive(id) || codexGoals?.isActive(id))) throw new Error('This build is already running.');
    if (action.type === 'stop' && !backend.active.has(id) && !experiments.isActive(id) && !codexGoals?.isActive(id)) throw new Error('That build is no longer running.');
    if (quitting) throw new Error('AppYard is closing. Reopen it to apply this proposal.');
    let resolve!: () => void;
    const done = new Promise<void>(r => { resolve = r; }); conversationActions.set(id, done);
    const record = (text: string) => p.conversation!.messages.push({ id: randomUUID(), role: 'system', text, createdAt: new Date().toISOString(), runId: p.runId });
    try {
      await lead.cancel(id);
      if (quitting) throw new Error('AppYard is closing. This proposal was not applied.');
      if (p.conversation?.actions.find(item => item.id === actionId) !== action || action.status !== 'proposed'
        || action.baseBriefHash !== briefHash(p) || action.runId !== p.runId) throw new Error('This proposal changed while the reply was finishing. Ask for an updated proposal.');
      if (action.type === 'stop' && !backend.active.has(id) && !experiments.isActive(id) && !codexGoals?.isActive(id)) throw new Error('That build finished before the stop action was applied.');
      if (action.type === 'stop') { await stopRun(id); action.status = 'applied'; record('Build stopped. Saved outputs remain available.'); }
      else if (action.type === 'start') { await startRun(id, true); action.status = 'applied'; record('Started a fresh build from the current brief.'); }
      else if (action.type === 'request_changes') {
        if (!canRequestChange(p)) throw new Error('Finish a build and open its review or approved delivery before requesting changes.');
        reviewFeedback(action.feedback!);
        await startRun(id, true, false, action.feedback); action.status = 'applied';
        record('Started a new iteration with your requested changes. Review and approve the new build before delivery.');
      }
      else if (action.type === 'revise' && action.brief) {
        const revised = validateInput({ ...projectBrief(p), ...action.brief }, p.sourceChallenge ? [p.sourceChallenge, ...currentCatalog()] : currentCatalog());
        if (backend.active.has(id) || experiments.isActive(id) || codexGoals?.isActive(id)) await stopRun(id);
        const saved = await updateProject(id, revised, true); action.status = 'applied';
        record('Brief updated. Previous test results and approval were reset.');
        if (saved.resumeStage === 'plan') {
          await resumeRun(id, true); record('Continued planning with the revised brief. Completed intake, research and prepared data are preserved.');
        } else {
          await startRun(id, true); record('Started a fresh build with the revised brief. Previous run files are preserved.');
        }
      } else throw new Error('Invalid project action.');
    } catch (error) {
      if (action.status === 'applied') record('The brief was updated, but work could not continue: ' + (error instanceof Error ? error.message : String(error)));
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
  handle('fleet:codex-goal:launch', (id: string) => {
    if (quitting) throw new Error('AppYard is closing. Reopen it to start a Codex goal.');
    requireIdle(id);
    requireRunCapacity();
    return codexGoals.launch(id);
  });
  handle('fleet:codex-goal:stop', (id: string) => codexGoals.stop(id));
  handle('fleet:codex-goal:open', async (id: string) => {
    const error = await shell.openPath(await codexGoals.workspace(id));
    if (error) throw new Error('Could not open the Codex workspace: ' + error);
  });
  handle('fleet:start', (id: string) => startRun(id));
  handle('fleet:resume', (id: string) => startRun(id, false, true));
  handle('fleet:stop', async (id: string) => {
    const delivery = deliveries.get(id); delivery?.controller.abort();
    await stopPreview(id);
    await Promise.all([stopRun(id), delivery?.done]);
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
  // Reload can arrive while the last request is still starting. Cancel that start and take turns,
  // so one request's cleanup can never stop the next request's preview.
  const previewQueue = new Map<string, Promise<unknown>>();
  handle('fleet:preview', (id: string) => {
    const earlier = previewQueue.get(id);
    if (earlier) {
      previewStarts.get(id)?.abort();
      const workspace = store.project(id).workspace;
      if (workspace) previews.cancel?.(workspace);
    }
    const current = (earlier ?? Promise.resolve()).catch(() => {}).then(() => trackPreview(() => openPreview(id)));
    previewQueue.set(id, current);
    const forget = () => { if (previewQueue.get(id) === current) previewQueue.delete(id); };
    current.then(forget, forget);
    return current;
  });
  const openPreview = async (id: string) => {
    try {
      if (storageMutations.size) throw new Error('Wait for the storage action to finish before opening a preview.');
      const request = ++previewRequestGeneration;
      previewBoundary.setPreview(null);
      await stopPreview(id);
      const p = requireIdle(id);
      if (!p.workspace) return null;
      if (p.qualityVersion === 4) {
        await closeLegacyPreviews();
        const url = await experiments.previewSelected(p);
        if (request !== previewRequestGeneration || storageMutations.size) return null;
        previewBoundary.setPreview(url); return url;
      }
      await experiments.closeCandidatePreview();
      if (request !== previewRequestGeneration || storageMutations.size) return null;
      if (!p.runId || !p.processScope) throw new Error('Start a new build before opening a runtime preview.');
      const scope = new RunProcessSweep({ marker: p.processScope.marker });
      const starting = new AbortController(); previewStarts.set(id, starting);
      p.processScope.cleanup = 'pending'; previewing.add(id);
      try {
        await store.save();
        if (starting.signal.aborted || previewStarts.get(id) !== starting || quitting) return null;
        const url = await scope.run(() => p.demo?.kind === 'mailmcp'
          ? mailMcpPreview().url(p.workspace!, starting.signal) : previews.url(p.workspace!));
        if (request !== previewRequestGeneration || storageMutations.size) { await stopPreview(id); return null; }
        previewBoundary.setPreview(url, { allowShellEmbedding: p.demo?.kind === 'mailmcp' }); return url;
      }
      catch (error) { await stopPreview(id); throw error; }
      finally { if (previewStarts.get(id) === starting) previewStarts.delete(id); }
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || !store.project(id).workspace) return null; throw error; }
  };
  handle('fleet:open', async (id: string) => {
    const p = store.project(id); if (!p.workspace) throw new Error('This challenge has no workspace yet.');
    const error = await shell.openPath(p.workspace); if (error) throw new Error(error);
  });
  handle('fleet:approve', async (id: string, feedback: string, acceptJudgeGaps?: boolean) => {
    reviewFeedback(feedback);
    await stopPreview(id);
    const p = requireIdle(id);
    let finish!: () => void;
    const done = new Promise<void>(resolve => { finish = resolve; }); approvals.set(id, done);
    try { await assertVerified(id, p); await recordReview(store, p, 'approved', feedback, acceptJudgeGaps); notify(); }
    finally { approvals.delete(id); finish(); }
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
      await experiments.assertSelectedVerified(p);
      controller.signal.throwIfAborted();
      const result = await dialog.showOpenDialog(window!, { title: 'Choose a delivery folder', properties: ['openDirectory', 'createDirectory'] });
      if (result.canceled) return null;
      controller.signal.throwIfAborted();
      destination = await exportVerifiedBundle({ workspace: p.workspace!, parent: result.filePaths[0], title: p.title,
        reference: await experiments.exportReference(p),
        verifiedRuntime: p.report!.quality?.solutionEvaluation?.runtime.runtime,
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
            'Requirement coverage: ' + (p.report!.quality.requirementsMet ? 'all recorded requirements have their required evidence.' : 'unverified requirements remain; approval does not complete them.'),
            ...p.report!.quality.criteria.filter(criterion => criterion.status !== 'passed').map(criterion => '- ' + criterion.criterionId + ' (' + criterion.status + '): ' + criterion.requirement + ': ' + criterion.detail)
          ] : ['Browser journeys and requirement coverage were not recorded for this legacy run.']),
          ...(p.approval?.judgeGapsAccepted ? ['The reviewer read and accepted these independent check gaps for this prototype:',
            ...p.approval.acceptedJudgeGaps!.map(gap => '- ' + gap.requirement + ': ' + gap.evidence + ' Fix: ' + gap.fix)] : []),
          ...(p.report!.independentJudge?.humanSteps?.length ? ['Steps for a person:', ...p.report!.independentJudge.humanSteps.map(step => '- ' + step)] : []),
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
      await experiments.assertSelectedVerified(p);
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
      await runPackageWorker({ ...staged, archive, output: path.join(temporary, 'output'), electronVersion: process.versions.electron,
        runtimeDirectory: app.isPackaged ? path.join(process.resourcesPath, 'electron-runtime') : undefined }, process.execPath, controller.signal);
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
  for (const method of storageMethodNames) handle('fleet:storage:' + method, async (...args: unknown[]) => {
    if (quitting) throw new Error('AppYard is closing.');
    if (method === 'storageOpen') {
      const target = await dataStorage.resolveTarget(args[0] as string, args[1] as string | undefined);
      if (target.directory) { const error = await shell.openPath(target.path); if (error) throw new Error(error); }
      else shell.showItemInFolder(target.path);
      return;
    }
    if (method === 'storageExport') {
      const [id, file] = args as [string, string | undefined];
      const target = await dataStorage.resolveTarget(id, file);
      const result = target.directory
        ? await dialog.showOpenDialog(window!, { title: 'Export a copy', buttonLabel: 'Export here', properties: ['openDirectory', 'createDirectory'] })
        : await dialog.showSaveDialog(window!, { title: 'Export a file copy', defaultPath: target.name, buttonLabel: 'Export copy' });
      if (result.canceled) return null;
      const destination = 'filePaths' in result ? result.filePaths[0] : result.filePath;
      if (!destination) return null;
      return dataStorage.exportTo(id, destination, file);
    }
    return Reflect.apply(dataStorage[method], dataStorage, args);
  });
  const requireNoRuns = () => { if (backend.active.size || startingRuns.size || experimentReservations.size || codexGoals?.activeIds().length || storageMutations.size || approvals.size || experiments.activeCount || lead.active.size || conversationActions.size) throw new Error('Stop active builds and project lead replies before changing model settings or accounts.'); };
  for (const method of experimentMethodNames) handle('fleet:experiment:' + method, async (...args: unknown[]) => {
    if (quitting) throw new Error('AppYard is closing.');
    if (method === 'saveIntegrationOperation' || method === 'removeIntegrationOperation') requireNoRuns();
    if (method === 'previewCandidate' && storageMutations.size) throw new Error('Wait for the storage action to finish before opening a preview.');
    const request = method === 'previewCandidate' || method === 'closeCandidatePreview' ? ++previewRequestGeneration : previewRequestGeneration;
    if (method === 'previewCandidate') { await closeLegacyPreviews(); previewBoundary.setPreview(null); }
    if (method === 'closeCandidatePreview') previewBoundary.setPreview(null);
    const result = method === 'previewCandidate'
      ? await trackPreview(() => Reflect.apply(experiments[method], experiments, args))
      : await Reflect.apply(experiments[method], experiments, args);
    if (method === 'previewCandidate') {
      if (request !== previewRequestGeneration || storageMutations.size) return null;
      previewBoundary.setPreview(result as string | null);
    }
    return result;
  });
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
    const selectedModel = backend.models().find(model => (model.backend ?? 'pi') === (settings.backend ?? 'pi') && model.provider === settings.provider && model.id === settings.model);
    const reasoningEffort = savedReasoningEffort(selectedModel, settings.reasoningEffort, store.state.settings.reasoningEffort);
    if (settings.provider === GENAI_MIL_PROVIDER) {
      if (key) throw new Error('Save the key in the GenAI.mil tab.');
      genAiMil.assertModel(settings.backend ?? 'pi', settings.model);
      store.state.settings = { backend: 'pi', provider: GENAI_MIL_PROVIDER, model: settings.model, rememberKey: true, developerMode: store.state.settings.developerMode === true,
        ...(reasoningEffort ? { reasoningEffort } : {}) };
      await store.save(); notify(); return bootstrap();
    }
    if (settings.backend === 'codex') {
      if (key?.trim()) throw new Error('Use the Codex API-key sign-in control before saving model settings.');
      if (codex.account.status !== 'connected' || (codex.account.authType !== 'apiKey' && !codex.account.planUsageEnabled) || !codex.models.some(m => (!settings.model || m.id === settings.model) && m.configured) || settings.provider !== 'chatgpt') throw new Error('Connect ChatGPT or an API key and select a Codex model first.');
      store.state.settings = { backend: 'codex', provider: 'chatgpt', model: settings.model, rememberKey: false, developerMode: store.state.settings.developerMode === true,
        ...(reasoningEffort ? { reasoningEffort } : {}) };
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
    store.state.settings = { backend: 'pi', provider: settings.provider, model: settings.model, rememberKey: settings.rememberKey, developerMode: store.state.settings.developerMode === true,
      ...(reasoningEffort ? { reasoningEffort } : {}) };
    await store.save(); notify(); return bootstrap();
  });
}
async function createWindow() {
  window = new BrowserWindow({
    width: 1512, height: 982, minWidth: 1120, minHeight: 720, title: appName,
    icon: iconPath,
    titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 18 }, backgroundColor: '#ebe9e2',
    webPreferences: { preload: path.join(dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: false, webviewTag: false }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'https://mss.data.mil/' || url === 'https://mss.data.mil') {
      void shell.openExternal('https://mss.data.mil/').catch(() => {
        console.error('Could not open MSS Ontology in the system browser.');
      });
    }
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.webContents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
  previewBoundary.install(window.webContents);
  window.on('closed', () => { window = null; });
  const current = window;
  // WebRTC TCP transports bypass webRequest. The fixed proxy rejects CONNECT,
  // and removing Chromium's implicit loopback bypass keeps TURN confined too.
  desktopProxy ??= await createPreviewProxy(origin => previewBoundary.allows(origin, true));
  await current.webContents.session.setProxy({ mode: 'fixed_servers', proxyRules: desktopProxy.url, proxyBypassRules: '<-loopback>' });
  if (current.isDestroyed()) return;
  const devURL = !app.isPackaged && process.env.VITE_DEV_SERVER_URL;
  if (devURL) await current.loadURL(devURL);
  else await current.loadFile(path.join(dirname, '../../dist/index.html'));
}
if (ownsInstance) app.whenReady().then(async () => {
  try {
    if (process.platform === 'darwin' && !app.isPackaged) app.dock?.setIcon(iconPath);
    if (demoBundle) await seedMailMcpDemo(app.getPath('userData'), demoBundle);
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
    codexGoals = new CodexGoalService(store, { connectorStore: connectors.store, changed: notify });
    await codexGoals.init();
    codex = new CodexAccount(store.root, url => shell.openExternal(url));
    clarifications = new ClarificationBroker(store, notify);
    backend = new FleetBackend(store, process.execPath, notify, app.getAppPath(), { codex, clarifications, connectorStore: connectors.store, genAiMil: () => genAiMil });
    await backend.init(); await codex.refresh();
    genAiMil = new GenAiMil(store.root, safeStorage, backend.runtime, { log: line => console.info(line) });
    await genAiMil.load();
    experiments = new ExperimentService({ store, executable: process.execPath, resourcesRoot: app.getAppPath(), runtime: backend.runtime, codex, cipher: safeStorage,
      embeddingOrigin: !app.isPackaged && process.env.VITE_DEV_SERVER_URL ? new URL(process.env.VITE_DEV_SERVER_URL).origin : 'file:',
      notify, assertIdle: id => { requireIdle(id); }, acquire: async (projectId, experimentId) => {
        if (quitting) throw new Error('AppYard is closing.');
        // These synchronous checks and reservation form one admission transaction.
        if (store.project(projectId).archivedAt) throw new Error('Restore this archived project in Data & storage before starting a build.');
        if (backend.active.has(projectId) || startingRuns.has(projectId) || experimentReservations.has(projectId) || deliveries.has(projectId) || storageMutations.has(projectId) || approvals.has(projectId) || codexGoals.isActive(projectId)) throw new Error('This project already has an active build, delivery or storage action.');
        requireRunCapacity(); experimentReservations.set(projectId, experimentId);
        return () => { if (experimentReservations.get(projectId) === experimentId) experimentReservations.delete(projectId); };
      } });
    await experiments.init();
    lead = new ProjectLead(store, backend.runtime, notify, { codex });
    dataStorage = new DataStorageService({
      store, changed: notify,
      isActive: id => backend.active.has(id) || startingRuns.has(id) || experimentReservations.has(id) || codexGoals.isActive(id)
        || deliveries.has(id) || storageMutations.has(id) || approvals.has(id) || conversationActions.has(id) || lead.active.has(id) || experiments.isActive(id),
      beforeMutation: async id => {
        if (quitting) throw new Error('AppYard is closing.');
        if (store.state.projects.some(project => project.id === id)) { await stopPreview(id); requireIdle(id); }
        let finish!: () => void;
        const done = new Promise<void>(resolve => { finish = resolve; });
        storageMutations.set(id, done);
        previewRequestGeneration++;
        try {
          await lead.cancel(id);
          await Promise.allSettled([...previewRequests]);
          await closeLegacyPreviews(); previewBoundary.setPreview(null); await experiments.closeCandidatePreview();
        }
        catch (error) { storageMutations.delete(id); finish(); throw error; }
        return () => { storageMutations.delete(id); finish(); };
      },
      candidateProjects: () => experiments.learning.listExperiments().flatMap(experiment => [
        { projectId: experiment.projectId, workspace: experiment.sharedWorkspace, scopedProjectId: `shared-${experiment.id}`, experimentId: experiment.id, name: 'Shared planning', protected: true },
        ...(experiment.sourceProject?.workspace ? [{ projectId: experiment.projectId, workspace: experiment.sourceProject.workspace, experimentId: experiment.id, protected: true }] : []),
        ...experiments.learning.listCandidates(experiment.id).map(candidate => ({ projectId: experiment.projectId, workspace: candidate.workspace,
          scopedProjectId: candidate.id, experimentId: experiment.id, name: candidate.baseline ? 'Baseline candidate' : 'Alternative candidate', protected: true })),
      ]),
    });
    await dataStorage.init();
    try {
      const encrypted = await fs.readFile(path.join(store.root, 'credentials.enc'));
      const { provider, key } = JSON.parse(safeStorage.decryptString(encrypted));
      registerCredential(key);
      await backend.runtime.setRuntimeApiKey(provider, key);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Saved credential could not be loaded. Reconnect in Model settings.'); }
    registerIPC();
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: appName, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] },
      { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }
    ]));
    await createWindow();
    app.on('activate', () => { if (!window) void createWindow().catch(error => { dialog.showErrorBox('AppYard could not open', String(error)); }); });
  } catch (error) { dialog.showErrorBox('AppYard could not start', String(error)); app.quit(); }
});
let quitting = false;
app.on('before-quit', event => {
  if (!quitting && (experiments || connectors?.busy || previewing.size || backend?.active.size || codexGoals?.activeIds().length || lead?.active.size || deliveries.size || startingRuns.size || conversationActions.size || storageMutations.size || approvals.size)) {
    event.preventDefault(); quitting = true;
    for (const delivery of deliveries.values()) delivery.controller.abort();
    void Promise.allSettled([connectors?.shutdown(), ...[...previewing].map(id => stopPreview(id)), backend?.stopAll(), codexGoals?.stopAll(), lead?.stopAll(), experiments?.close(), desktopProxy?.close(), ...startingRuns.values(), ...conversationActions.values(), ...storageMutations.values(), ...approvals.values(), ...[...deliveries.values()].map(d => d.done)]).then(async () => {
      try { await store.save(); } catch { console.error('Could not save the final workspace state while closing.'); }
      app.quit();
    });
  }
  else if (!quitting) void connectors?.shutdown();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { void previews.close().catch(() => {}); codex?.dispose(); });
