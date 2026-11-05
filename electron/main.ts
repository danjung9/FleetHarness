import { app, BrowserWindow, ipcMain, shell, dialog, safeStorage, Menu, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { promises as disk } from 'original-fs';
import { fileURLToPath } from 'node:url';
import { Store, newProject, validateInput, listArtifacts, safeFile, sourceHash } from './storage.js';
import { FleetBackend } from './pi-backend.js';
import { CodexAccount } from './codex-account.js';
import { CodexGoalService, openCodexGoalTerminal } from './codex-goal.js';
import { applicationTestRerunCommand, reportPassed } from './verification.js';
import { ApplicationPreviews } from './solution-preview.js';
import { assertExecutableSource, executableFileName, stageExecutable, runPackageWorker, saveExecutable } from './executable.js';
import type { NewProject, Project, Settings } from '../shared/types.js';
import { challenges, getChallenge, refreshNorfolkCatalog } from '../harness/catalog.js';
import { exportVerifiedBundle } from './source-export.js';
import { ProjectLead, briefHash, projectBrief } from './conversation.js';
import { ClarificationBroker } from './clarifications.js';
import type { ClarificationAnswer } from '../shared/conversation.js';
import { randomUUID } from 'node:crypto';
import { recordReview, reviewFeedback } from './review.js';
import { readVisualCapture } from './visual-review.js';
import { createPreviewProxy } from './preview-proxy.js';
import { PreviewBoundary } from './preview-boundary.js';
import { ExperimentService } from './experiment-service.js';
import { experimentMethodNames } from '../shared/experiments.js';
import { DataStorageService } from './data-storage.js';
import { storageMethodNames } from '../shared/data-storage.js';
import { readPlanningContinuation } from './planning-continuation.js';
import { briefFingerprint } from './run-checkpoint.js';
import { savedReasoningEffort } from '../shared/reasoning.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const iconPath = path.join(app.getAppPath(), app.isPackaged ? 'dist' : 'public', 'app-icon-512.png');
// Preserve existing workspaces and credentials when the display name changes.
app.setPath('userData', process.env.FLEET_USER_DATA ? path.resolve(process.env.FLEET_USER_DATA) : path.join(app.getPath('appData'), 'fleetharness'));
app.setName('AppYard');
app.commandLine.appendSwitch('disable-quic');
app.commandLine.appendSwitch('dns-prefetch-disable');
// A user-data directory has one owner for its rotating ChatGPT credentials.
if (!app.requestSingleInstanceLock()) app.exit(0);
let window: BrowserWindow | null = null;
app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
let store: Store, backend: FleetBackend, codex: CodexAccount;
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
let lead: ProjectLead, clarifications: ClarificationBroker;
const conversationActions = new Map<string, Promise<void>>();
let previews = new ApplicationPreviews(process.execPath);
const previewBoundary = new PreviewBoundary({ fileRoot: path.join(dirname, '../../dist'), developmentURL: !app.isPackaged ? process.env.VITE_DEV_SERVER_URL : undefined });
function closeLegacyPreviews() { previews.close(); previews = new ApplicationPreviews(process.execPath); }
const deliveries = new Map<string, { controller: AbortController; done: Promise<void> }>();
const startingRuns = new Map<string, Promise<void>>();
let norfolkRefresh: ReturnType<typeof refreshNorfolkCatalog> | undefined;
const currentCatalog = () => store.state.norfolkCatalog?.challenges ?? challenges;
let emitTimer: ReturnType<typeof setTimeout> | undefined;
const notify = () => {
  experiments?.refreshProjectSummaries();
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
  capabilities: { projectConversation: true, experiments: true, planningContinuation: true },
  chatgpt: codex.account,
  credentialStatus: store.state.settings.backend === 'codex' ? (codex.account.status === 'connected' && codex.account.planUsageEnabled ? 'Using ChatGPT plan' : 'Connect your ChatGPT plan to run Codex') : store.state.settings.provider && backend.runtime.hasConfiguredAuth(store.state.settings.provider) ? 'Provider connected' : 'Connect a provider to run Pi agents',
  runtime: 'Codex 0.166.0 · Pi SDK 1.5.0 · Electron ' + process.versions.electron
});
function requireIdle(id: string, fromConversation = false) {
  if (codexGoals?.isLaunching(id)) throw new Error('Wait for Codex to open before changing this project.');
  if (approvals.has(id)) throw new Error('Wait for approval to finish before changing this project.');
  if (storageMutations.has(id)) throw new Error('Wait for the storage action to finish before changing this project.');
  if (!fromConversation && conversationActions.has(id)) throw new Error('Wait for the project lead action to finish.');
  if (deliveries.has(id)) throw new Error('Wait for the app download to finish before changing this build.');
  if (backend.active.has(id) || startingRuns.has(id) || experimentReservations.has(id) || experiments?.isActive(id)) throw new Error('Stop this run before changing its requirements or delivery state.');
  return store.project(id);
}
function requireRunCapacity() {
  const projects = new Set([...backend.active.keys(), ...startingRuns.keys(), ...experimentReservations.keys()]);
  if (projects.size >= 3) throw new Error('Three builds or comparisons are already active. Stop one before starting another.');
}
async function stopRun(id: string) {
  const experiment = experiments?.activeExperiment(id);
  if (experiment) await experiments.stopExperiment(experiment); else await backend.stop(id);
}
async function updateProject(id: string, input: NewProject, fromConversation = false) {
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
    report: p.report, visualReview: p.visualReview, approvedAt: p.approvedAt, exportedTo: p.exportedTo, executable: p.executable, error: p.error, resumeStage: p.resumeStage,
    systemDesign: p.systemDesign, phasePlan: p.phasePlan, globalTools: p.globalTools, stages: p.stages, updatedAt: p.updatedAt });
  Object.assign(p, normalized, { sourceChallenge });
  p.status = 'draft'; p.resumeStage = undefined; p.runtimeProfile = undefined; p.report = undefined; p.visualReview = undefined; p.approvedAt = undefined; p.exportedTo = undefined; p.executable = undefined; p.error = undefined;
  p.systemDesign = undefined; p.phasePlan = undefined; p.globalTools = undefined;
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
async function startRun(id: string, fromConversation = false, feedback?: string) {
  if (quitting) throw new Error('AppYard is closing. Reopen it to start a build.');
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
async function assertVerified(id: string, reservedProject?: Project) {
  const p = reservedProject ?? requireIdle(id);
  if (!p.workspace || !reportPassed(p.report, p.qualityVersion ?? false)) throw new Error('Passing required capability, runtime and application checks are required before delivery.');
  if (await sourceHash(p.workspace) !== p.report!.sourceHash) throw new Error('Artifacts changed after verification. Start a new run before approving or exporting.');
  await experiments.assertSelectedVerified(p);
  return p;
}
function registerIPC() {
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
    if (action.type === 'start' && (backend.active.has(id) || experiments.isActive(id))) throw new Error('This build is already running.');
    if (action.type === 'stop' && !backend.active.has(id) && !experiments.isActive(id)) throw new Error('That build is no longer running.');
    if (quitting) throw new Error('AppYard is closing. Reopen it to apply this proposal.');
    let resolve!: () => void;
    const done = new Promise<void>(r => { resolve = r; }); conversationActions.set(id, done);
    const record = (text: string) => p.conversation!.messages.push({ id: randomUUID(), role: 'system', text, createdAt: new Date().toISOString(), runId: p.runId });
    try {
      await lead.cancel(id);
      if (quitting) throw new Error('AppYard is closing. This proposal was not applied.');
      if (p.conversation?.actions.find(item => item.id === actionId) !== action || action.status !== 'proposed'
        || action.baseBriefHash !== briefHash(p) || action.runId !== p.runId) throw new Error('This proposal changed while the reply was finishing. Ask for an updated proposal.');
      if (action.type === 'stop' && !backend.active.has(id) && !experiments.isActive(id)) throw new Error('That build finished before the stop action was applied.');
      if (action.type === 'stop') { await stopRun(id); action.status = 'applied'; record('Build stopped. Saved outputs remain available.'); }
      else if (action.type === 'start') { await startRun(id, true); action.status = 'applied'; record('Started a fresh build from the current brief.'); }
      else if (action.type === 'revise' && action.brief) {
        const revised = validateInput({ ...projectBrief(p), ...action.brief }, p.sourceChallenge ? [p.sourceChallenge, ...currentCatalog()] : currentCatalog());
        if (backend.active.has(id) || experiments.isActive(id)) await stopRun(id);
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
    return codexGoals.launch(id);
  });
  handle('fleet:codex-goal:open', async (id: string) => {
    const error = await shell.openPath(await codexGoals.workspace(id));
    if (error) throw new Error('Could not open the Codex workspace: ' + error);
  });
  handle('fleet:start', (id: string) => startRun(id));
  handle('fleet:resume', (id: string) => resumeRun(id));
  handle('fleet:request-changes', (id: string, feedback: string) => {
    reviewFeedback(feedback); return startRun(id, false, feedback);
  });
  handle('fleet:stop', stopRun);
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
  handle('fleet:preview', (id: string) => trackPreview(async () => {
    try {
      if (storageMutations.size) throw new Error('Wait for the storage action to finish before opening a preview.');
      const request = ++previewRequestGeneration;
      const p = store.project(id);
      previewBoundary.setPreview(null);
      let url: string | null;
      if (p.qualityVersion === 4) { closeLegacyPreviews(); url = await experiments.previewSelected(p); }
      else {
        await experiments.closeCandidatePreview();
        if (request !== previewRequestGeneration || storageMutations.has(id)) return null;
        url = p.workspace ? await previews.url(p.workspace) : null;
      }
      if (request !== previewRequestGeneration || storageMutations.has(id)) return null;
      previewBoundary.setPreview(url); return url;
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || !store.project(id).workspace) return null; throw error; }
  }));
  handle('fleet:open', async (id: string) => {
    const p = store.project(id); if (!p.workspace) throw new Error('This challenge has no workspace yet.');
    const error = await shell.openPath(p.workspace); if (error) throw new Error(error);
  });
  handle('fleet:approve', async (id: string, feedback: string) => {
    reviewFeedback(feedback);
    const p = requireIdle(id);
    let finish!: () => void;
    const done = new Promise<void>(resolve => { finish = resolve; }); approvals.set(id, done);
    try { await assertVerified(id, p); await recordReview(store, p, 'approved', feedback); notify(); }
    finally { approvals.delete(id); finish(); }
  });
  handle('fleet:export', async (id: string) => {
    const project = requireIdle(id), p = structuredClone(project), controller = new AbortController();
    let finish!: () => void;
    const done = new Promise<void>(resolve => { finish = resolve; });
    deliveries.set(id, { controller, done });
    let destination: string | undefined, committed = false;
    try {
      if (!p.approvedAt || !['approved', 'delivered'].includes(p.status)) throw new Error('Review and approve this app before export.');
      if (!p.workspace || !reportPassed(p.report, p.qualityVersion ?? false)) throw new Error('Passing required capability, runtime and application checks are required before delivery.');
      if (await sourceHash(p.workspace) !== p.report!.sourceHash) throw new Error('Artifacts changed after verification. Start a new run before exporting.');
      await experiments.assertSelectedVerified(p);
      controller.signal.throwIfAborted();
      const result = await dialog.showOpenDialog(window!, { title: 'Choose a delivery folder', properties: ['openDirectory', 'createDirectory'] });
      if (result.canceled) return null;
      controller.signal.throwIfAborted();
      destination = await exportVerifiedBundle({ workspace: p.workspace, parent: result.filePaths[0], title: p.title,
        reference: await experiments.exportReference(p),
        verifiedHash: p.report!.sourceHash, deliveryMarkdown: [
          '# ' + p.title, '', 'Follow README.md for the declared runtime, dependency installation, required environment settings and startup command.', '',
          'Developer tests: follow the prerequisites in README.md, then run this from the bundle directory in a POSIX shell (macOS or Linux):', '',
          (await applicationTestRerunCommand(p.workspace)).split('\n').map(line => '    ' + line).join('\n'), '',
          'This reruns the application tests. It does not reproduce AppYard\'s host verification or renew approval. See test-report.json for the checks recorded for this build.', '',
          'Recorded host result: ' + p.report!.passed + '/' + p.report!.total + ' passed.',
          ...(p.report!.quality ? [
            'Browser journeys: ' + p.report!.quality.journeys.filter(journey => journey.status === 'passed').length + '/' + p.report!.quality.journeys.length + ' passed. Evidence: test-report.json and .quality-evidence/.',
            ...(p.report!.quality.schemaVersion >= 2 ? [
              'Runtime profile: ' + p.report!.quality.package?.profile + '. Clean-package check: ' + p.report!.quality.package?.status + '.',
              'Computational evaluation: ' + p.report!.quality.solutionEvaluation?.status + '. Datasets, metrics, thresholds and per-case evidence: test-report.json.'
            ] : []),
            'Requirement coverage: ' + (p.report!.quality.requirementsMet ? 'all recorded requirements have their required evidence.' : 'unverified requirements remain; approval does not complete them.'),
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
  const requireNoRuns = () => { if (backend.active.size || startingRuns.size || experimentReservations.size || storageMutations.size || approvals.size || experiments.activeCount || lead.active.size || conversationActions.size) throw new Error('Stop active builds and project lead replies before changing model settings or accounts.'); };
  for (const method of experimentMethodNames) handle('fleet:experiment:' + method, async (...args: unknown[]) => {
    if (quitting) throw new Error('AppYard is closing.');
    if (method === 'saveIntegrationOperation' || method === 'removeIntegrationOperation') requireNoRuns();
    if (method === 'previewCandidate' && storageMutations.size) throw new Error('Wait for the storage action to finish before opening a preview.');
    const request = method === 'previewCandidate' || method === 'closeCandidatePreview' ? ++previewRequestGeneration : previewRequestGeneration;
    if (method === 'previewCandidate') { closeLegacyPreviews(); previewBoundary.setPreview(null); }
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
    const selectedModel = backend.models().find(model => (model.backend ?? 'pi') === (settings.backend ?? 'pi') && model.provider === settings.provider && model.id === settings.model);
    const reasoningEffort = savedReasoningEffort(selectedModel, settings.reasoningEffort, store.state.settings.reasoningEffort);
    if (settings.backend === 'codex') {
      if (key?.trim()) throw new Error('ChatGPT uses browser sign-in, not an API key.');
      if (codex.account.status !== 'connected' || !codex.account.planUsageEnabled || !codex.models.some(m => m.id === settings.model && m.configured) || settings.provider !== 'chatgpt') throw new Error('Sign in with ChatGPT, allow plan usage, and select a Codex model first.');
      store.state.settings = { backend: 'codex', provider: 'chatgpt', model: settings.model, rememberKey: false, developerMode: store.state.settings.developerMode === true,
        ...(reasoningEffort ? { reasoningEffort } : {}) };
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
    store.state.settings = { backend: 'pi', provider: settings.provider, model: settings.model, rememberKey: settings.rememberKey, developerMode: store.state.settings.developerMode === true,
      ...(reasoningEffort ? { reasoningEffort } : {}) };
    await store.save(); notify(); return bootstrap();
  });
}
async function createWindow() {
  window = new BrowserWindow({
    width: 1512, height: 982, minWidth: 1120, minHeight: 720, title: 'AppYard',
    icon: iconPath,
    titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 18 }, backgroundColor: '#ebe9e2',
    webPreferences: { preload: path.join(dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: false }
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
app.whenReady().then(async () => {
  try {
    if (process.platform === 'darwin' && !app.isPackaged) app.dock?.setIcon(iconPath);
    store = new Store(app.getPath('userData'));
    await store.init();
    codexGoals = new CodexGoalService(store, { changed: notify, openTerminal: async file => {
      if (quitting) throw new Error('AppYard is closing. Your prepared workspace is saved.');
      await openCodexGoalTerminal(file);
    } });
    codex = new CodexAccount(store.root, url => shell.openExternal(url));
    clarifications = new ClarificationBroker(store, notify);
    backend = new FleetBackend(store, process.execPath, notify, app.getAppPath(), { codex, clarifications });
    await backend.init(); await codex.refresh();
    experiments = new ExperimentService({ store, executable: process.execPath, resourcesRoot: app.getAppPath(), runtime: backend.runtime, codex, cipher: safeStorage,
      embeddingOrigin: !app.isPackaged && process.env.VITE_DEV_SERVER_URL ? new URL(process.env.VITE_DEV_SERVER_URL).origin : 'file:',
      notify, assertIdle: id => { requireIdle(id); }, acquire: async (projectId, experimentId) => {
        if (quitting) throw new Error('AppYard is closing.');
        // These synchronous checks and reservation form one admission transaction.
        if (store.project(projectId).archivedAt) throw new Error('Restore this archived project in Data & storage before starting a build.');
        if (backend.active.has(projectId) || startingRuns.has(projectId) || experimentReservations.has(projectId) || deliveries.has(projectId) || storageMutations.has(projectId) || approvals.has(projectId) || codexGoals.isLaunching(projectId)) throw new Error('This project already has an active build, delivery or storage action.');
        requireRunCapacity(); experimentReservations.set(projectId, experimentId);
        return () => { if (experimentReservations.get(projectId) === experimentId) experimentReservations.delete(projectId); };
      } });
    await experiments.init();
    lead = new ProjectLead(store, backend.runtime, notify, { codex });
    dataStorage = new DataStorageService({
      store, changed: notify,
      isActive: id => backend.active.has(id) || startingRuns.has(id) || experimentReservations.has(id) || codexGoals.isLaunching(id)
        || deliveries.has(id) || storageMutations.has(id) || approvals.has(id) || conversationActions.has(id) || lead.active.has(id) || experiments.isActive(id),
      beforeMutation: async id => {
        if (quitting) throw new Error('AppYard is closing.');
        if (store.state.projects.some(project => project.id === id)) requireIdle(id);
        let finish!: () => void;
        const done = new Promise<void>(resolve => { finish = resolve; });
        storageMutations.set(id, done);
        previewRequestGeneration++;
        try {
          await lead.cancel(id);
          await Promise.allSettled([...previewRequests]);
          closeLegacyPreviews(); previewBoundary.setPreview(null); await experiments.closeCandidatePreview();
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
      await backend.runtime.setRuntimeApiKey(provider, key);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Saved credential could not be loaded. Reconnect in Model settings.'); }
    registerIPC();
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'AppYard', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] },
      { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }
    ]));
    await createWindow();
    app.on('activate', () => { if (!window) void createWindow().catch(error => { dialog.showErrorBox('AppYard could not open', String(error)); }); });
  } catch (error) { dialog.showErrorBox('AppYard could not start', String(error)); app.quit(); }
});
let quitting = false;
app.on('before-quit', event => {
  if (!quitting && (experiments || backend?.active.size || lead?.active.size || deliveries.size || startingRuns.size || conversationActions.size || storageMutations.size || approvals.size)) {
    event.preventDefault(); quitting = true;
    for (const delivery of deliveries.values()) delivery.controller.abort();
    void Promise.allSettled([backend?.stopAll(), lead?.stopAll(), experiments?.close(), desktopProxy?.close(), ...codexGoals?.pending() ?? [], ...startingRuns.values(), ...conversationActions.values(), ...storageMutations.values(), ...approvals.values(), ...[...deliveries.values()].map(d => d.done)]).then(async () => {
      try { await store.save(); } catch { console.error('Could not save the final workspace state while closing.'); }
      app.quit();
    });
  }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('will-quit', () => { previews.close(); codex?.dispose(); });
