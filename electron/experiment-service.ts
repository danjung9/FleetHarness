import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import type { ModelRuntime } from '@earendil-works/pi-coding-agent';
import type { ExperimentAPI, ExperimentAvailability } from '../shared/experiments.js';
import type { ArchitectureProfile, CandidateRecord, ExperimentSummary, LearningSettings, PromotionOutboxRecord } from '../shared/learning.js';
import type { Project } from '../shared/types.js';
import { validateIntegrationOperation, type IntegrationOperation } from '../shared/integration.js';
import { ExperimentCoordinator } from './experiment-coordinator.js';
import { ExperimentWorkers, experimentProfiles } from './experiment-workers.js';
import { LearningStore } from './learning-store.js';
import { IntegrationBroker, IntegrationCredentialVault, type CredentialCipher, type IntegrationCallBudget } from './integration-broker.js';
import { executeIsolatedProcess } from './isolated-executor.js';
import type { RunRepository } from './scoped-run-store.js';
import type { CodexAccount } from './codex-account.js';
import type { SolutionRuntime } from './solution-runtime.js';
import { listArtifacts, safeFile, sourceHash } from './storage.js';
import { experimentContractHash } from '../harness/experiment-contract.js';
import { runExperimentRegressionChecks } from './experiment-regression.js';
import { briefFingerprint } from './run-checkpoint.js';

type WorkerServices = Pick<ExperimentWorkers, 'sharedPlanner' | 'candidateWorker' | 'selectProfiles' | 'verifyCandidate' | 'compiled' | 'shared' | 'evidence' | 'preview'>;
interface SelectionReceipt { schemaVersion: 1; projectId: string; candidate: CandidateRecord; metadata: NonNullable<NonNullable<Project['report']>['quality']>['experiment'] }
export interface ExperimentServiceOptions {
  store: RunRepository; executable: string; resourcesRoot: string; runtime: ModelRuntime; codex?: CodexAccount;
  /** The trusted desktop shell origin, used only for manual preview embedding. */
  embeddingOrigin?: string;
  cipher: CredentialCipher; notify(): void;
  acquire(projectId: string, experimentId: string): Promise<() => void | Promise<void>>;
  assertIdle(projectId: string): void;
  /** Trusted test hooks; never reachable from renderer requests. */
  workers?: WorkerServices; profiles?: ArchitectureProfile[]; readiness?: () => Promise<ExperimentAvailability>;
}
const identity = (value: unknown) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(value)) throw new Error('Invalid experiment or candidate identity.');
  return value;
};
const summaryFields = (project: Project) => {
  const { id, title, status, stages, logs, runId, model, report, visualReview, runtimeProfile, systemDesign, error } = project;
  return structuredClone({ id, title, status, stages, logs, runId, model, report, visualReview, runtimeProfile, systemDesign, error });
};

/** A real smoke probe makes unsupported or ineffective OS confinement fail closed. */
export async function probeExperimentIsolation(executable: string, signal?: AbortSignal): Promise<ExperimentAvailability> {
  if (!['darwin', 'linux'].includes(process.platform)) return { available: false, reason: 'Architecture comparisons require macOS or Linux process isolation.' };
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-isolation-probe-'))), workspace = path.join(directory, 'candidate');
  const server = createServer(socket => socket.destroy());
  try {
    await fs.mkdir(workspace); await fs.writeFile(path.join(directory, 'private.txt'), 'host-only');
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Could not prepare the network isolation probe.');
    const script = `const fs=require('node:fs'),net=require('node:net');let escaped=false;try{fs.readFileSync(${JSON.stringify(path.join(directory, 'private.txt'))});escaped=true}catch{}try{fs.writeFileSync(${JSON.stringify(path.join(directory, 'escape.txt'))},'x');escaped=true}catch{}if(escaped)process.exit(71);const s=net.connect(${address.port},'127.0.0.1');s.once('connect',()=>process.exit(72));s.once('error',()=>{console.log('isolated');process.exit(0)});setTimeout(()=>process.exit(73),2000);`;
    const result = await executeIsolatedProcess({ workspace, command: [executable, '-e', script], timeoutMs: 10_000, maxOutputBytes: 20_000, signal });
    if (result.exitCode !== 0 || result.stdout.trim() !== 'isolated') throw new Error('The OS sandbox did not pass filesystem and network isolation checks.');
    return { available: true };
  } catch (error) { return { available: false, reason: error instanceof Error ? error.message : 'OS isolation is unavailable.' }; }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); await fs.rm(directory, { recursive: true, force: true }); }
}

/** Main-process facade. Only summaries and explicit candidate review projections cross IPC. */
export class ExperimentService implements ExperimentAPI {
  readonly learning: LearningStore;
  readonly coordinator: ExperimentCoordinator;
  readonly workers: WorkerServices;
  private readonly vault: IntegrationCredentialVault;
  private operations: IntegrationOperation[] = [];
  private readonly budgets = new Map<string, IntegrationCallBudget>();
  private readonly receipts = new Map<string, SelectionReceipt>();
  private readonly mutations = new Set<string>();
  private readiness?: Promise<ExperimentAvailability>;
  private recoveryFailure?: string;
  private preview?: { candidateId: string; runtime: SolutionRuntime };
  private previewWrites: Promise<unknown> = Promise.resolve();
  private operationWrites: Promise<unknown> = Promise.resolve();
  private closed = false;
  private readonly lifetime = new AbortController();
  constructor(readonly options: ExperimentServiceOptions) {
    this.learning = new LearningStore(path.join(options.store.root, 'learning'));
    this.vault = new IntegrationCredentialVault(this.learning.root, options.cipher);
    this.workers = options.workers ?? new ExperimentWorkers({ root: this.learning.root, executable: options.executable, resourcesRoot: options.resourcesRoot,
      runtime: options.runtime, codex: options.codex, operations: async () => { await this.operationWrites; return structuredClone(this.operations); },
      integrations: (candidateId, operations) => this.integrationLease(candidateId, operations), notify: () => this.changed() });
    this.coordinator = new ExperimentCoordinator({ store: this.learning, profiles: options.profiles ?? experimentProfiles,
      project: id => options.store.project(id), modelConfig: () => ({ backend: options.store.state.settings.backend ?? 'pi', provider: options.store.state.settings.provider, model: options.store.state.settings.model }),
      readiness: async () => { const value = await this.availability(); return { supported: value.available, reason: value.reason }; },
      acquire: (projectId, experimentId) => options.acquire(projectId, experimentId),
      sharedPlanner: context => this.workers.sharedPlanner(context), candidateWorker: context => this.workers.candidateWorker(context),
      selectProfiles: (shared, registry) => this.workers.selectProfiles(shared, registry), verifyCandidate: candidate => this.workers.verifyCandidate(candidate),
      applyPromotion: record => this.applyPromotion(record), notify: () => this.changed(), evaluatorVersion: 'experiment-host-v4',
      regressionCheck: async policy => (await probeExperimentIsolation(options.executable, this.lifetime.signal)).available
        && runExperimentRegressionChecks(options.executable, policy.profileIds, this.lifetime.signal),
      classifyFailure: error => (error as { classification?: string })?.classification === 'integrity' ? 'gate-defect' : 'infrastructure' });
  }
  async init() {
    await this.learning.init();
    try {
      const file = path.join(this.learning.root, 'operations.json'), stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 1_000_000) throw new Error('Invalid host operation registry.');
      const value: unknown = JSON.parse(await fs.readFile(file, 'utf8'));
      if (!Array.isArray(value) || value.length > 100) throw new Error('Invalid host operation registry.');
      this.operations = value.map(validateIntegrationOperation);
      if (new Set(this.operations.map(operation => operation.id)).size !== this.operations.length) throw new Error('Duplicate configured operation.');
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    for (const project of this.options.store.state.projects) {
      try {
        const file = this.receiptFile(project.id), stat = await fs.lstat(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 2_000_000) throw new Error('Invalid selected verification receipt.');
        const receipt = JSON.parse(await fs.readFile(file, 'utf8')) as SelectionReceipt;
        if (receipt.schemaVersion !== 1 || receipt.projectId !== project.id || !receipt.candidate || !receipt.metadata
          || receipt.candidate.experimentId !== receipt.metadata.experimentId || receipt.candidate.id !== receipt.metadata.candidateId) throw new Error('Selected verification receipt identity is invalid.');
        this.receipts.set(project.id, receipt);
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    try { await this.coordinator.recover(); }
    catch (error) { this.recoveryFailure = 'An interrupted selection needs recovery: ' + (error instanceof Error ? error.message : String(error)); }
    this.changed(); await this.options.store.save();
  }
  private changed() {
    this.refreshProjectSummaries();
    this.options.notify();
  }
  /** Host state may change through ordinary builds or conversations as well. */
  refreshProjectSummaries() {
    if (this.closed) return;
    for (const project of this.options.store.state.projects) {
      const record = this.learning.listExperiments(project.id).at(-1);
      const latest = record && this.learning.summary(record.id);
      const active = latest && ['queued', 'planning', 'running', 'comparing', 'promoting'].includes(latest.status);
      const selected = latest?.status === 'complete' && !!latest.selectedCandidateId;
      const current = record && record.briefFingerprint === briefFingerprint(project) && record.sourceProject?.runId === project.runId;
      if (latest && (active || selected || current)) project.experiment = latest; else delete project.experiment;
    }
  }
  private checkOpen() { if (this.closed) throw new Error('Architecture experiments are closing.'); }
  isActive(projectId: string) {
    return this.mutations.has(projectId) || [...this.coordinator.active.keys()].some(id => this.learning.getExperiment(id)?.projectId === projectId);
  }
  get activeCount() { return this.coordinator.active.size + this.mutations.size; }
  activeExperiment(projectId: string) { return [...this.coordinator.active.keys()].find(id => this.learning.getExperiment(id)?.projectId === projectId); }
  async availability(): Promise<ExperimentAvailability> {
    if (this.recoveryFailure) return { available: false, reason: this.recoveryFailure };
    this.readiness ??= this.options.readiness?.() ?? probeExperimentIsolation(this.options.executable, this.lifetime.signal);
    return this.readiness;
  }
  async experimentState(projectId: string) {
    this.options.store.project(projectId);
    return { experiments: this.coordinator.list(projectId), settings: this.learning.getSettings(), availability: await this.availability() };
  }
  async startExperiment(projectId: string, input: { mode?: 'paired' | 'adaptive'; requestId?: string } = {}) {
    this.checkOpen(); this.options.assertIdle(projectId);
    if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['mode', 'requestId'].includes(key)) || (input.mode !== undefined && !['paired', 'adaptive'].includes(input.mode))) throw new Error('Invalid comparison request.');
    // The explicit Compare button always spends an explicit two-build request.
    return this.coordinator.start(projectId, { ...input, mode: 'paired' });
  }
  /** Ordinary Run respects the persisted automatic-comparison quota; Off keeps the legacy path. */
  async startOrdinary(projectId: string): Promise<boolean> {
    this.checkOpen(); const settings = this.learning.getSettings(); if (settings.mode === 'off') return false;
    await this.coordinator.start(projectId, { mode: settings.mode, automatic: true }); return true;
  }
  async resumeExperiment(experimentId: string) {
    this.checkOpen(); const experiment = this.learning.getExperiment(identity(experimentId)); if (!experiment) throw new Error('Experiment not found.');
    this.options.assertIdle(experiment.projectId); return this.coordinator.resume(experimentId);
  }
  async stopExperiment(experimentId: string) { this.checkOpen(); await this.closeCandidatePreview(); return this.coordinator.stop(identity(experimentId)); }
  private candidate(experimentId: string, candidateId: string) {
    const experiment = this.learning.getExperiment(identity(experimentId)), candidate = this.learning.getCandidate(identity(candidateId));
    if (!experiment || !candidate || candidate.experimentId !== experiment.id) throw new Error('Candidate does not belong to this experiment.');
    this.options.store.project(experiment.projectId); return candidate;
  }
  async inspectCandidate(experimentId: string, candidateId: string) {
    const candidate = this.candidate(experimentId, candidateId);
    if (!candidate.executionState) throw new Error('Candidate planning has not produced review evidence yet.');
    return { experimentId, candidateId, sourceHash: candidate.outcome?.sourceHash, project: summaryFields(candidate.executionState) };
  }
  async candidateArtifacts(experimentId: string, candidateId: string) {
    const candidate = this.candidate(experimentId, candidateId);
    return candidate.workspace ? (await listArtifacts(candidate.workspace)).filter(file => file.path !== 'evaluation-plan.json') : [];
  }
  async readCandidateArtifact(experimentId: string, candidateId: string, file: string) {
    const candidate = this.candidate(experimentId, candidateId);
    if (!candidate.workspace || typeof file !== 'string' || file === 'evaluation-plan.json') throw new Error('Choose an available candidate artifact.');
    const resolved = await safeFile(candidate.workspace, file), handle = await fs.open(resolved, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const stat = await handle.stat(); if (!stat.isFile() || stat.nlink !== 1 || stat.size > 2_000_000) throw new Error('Candidate artifact must be a bounded ordinary file.');
      return await handle.readFile('utf8');
    } finally { await handle.close(); }
  }
  async previewCandidate(experimentId: string, candidateId: string): Promise<string | null> {
    this.checkOpen(); const candidate = this.candidate(experimentId, candidateId);
    const operation = this.previewWrites.catch(() => {}).then(async () => {
      if (this.preview) { await this.preview.runtime.close(); this.preview = undefined; }
      const runtime = await this.workers.preview(candidate, this.options.embeddingOrigin);
      if (!runtime) return null;
      this.preview = { candidateId, runtime }; return runtime.url ?? null;
    });
    this.previewWrites = operation; return operation;
  }
  async closeCandidatePreview(): Promise<void> {
    const operation = this.previewWrites.catch(() => {}).then(async () => { if (this.preview) { const prior = this.preview; this.preview = undefined; await prior.runtime.close(); } });
    this.previewWrites = operation; return operation;
  }
  async selectCandidate(experimentId: string, candidateId: string, expectedSourceHash: string) {
    this.checkOpen(); const candidate = this.candidate(experimentId, candidateId), experiment = this.learning.getExperiment(experimentId)!;
    if (typeof expectedSourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(expectedSourceHash)) throw new Error('Selection requires the reviewed source hash.');
    this.options.assertIdle(experiment.projectId);
    if (this.mutations.has(experiment.projectId)) throw new Error('A selection is already being saved for this project.');
    this.mutations.add(experiment.projectId);
    try { await this.closeCandidatePreview(); return await this.coordinator.select(experimentId, candidate.id, expectedSourceHash); }
    finally { this.mutations.delete(experiment.projectId); }
  }
  private async applyPromotion(record: PromotionOutboxRecord) {
    const experiment = this.learning.getExperiment(record.experimentId), candidate = this.learning.getCandidate(record.candidateId);
    if (!experiment || !candidate || candidate.experimentId !== experiment.id || !candidate.executionState) throw new Error('Selection lost its verified candidate.');
    const parent = this.options.store.project(experiment.projectId), selected = candidate.executionState;
    if (record.payload.projectId !== parent.id || record.payload.sourceHash !== candidate.outcome?.sourceHash
      || experimentContractHash(record.payload.project) !== experimentContractHash(selected)) throw new Error('Selection projection does not match its committed outbox record.');
    await this.workers.verifyCandidate(candidate);
    const current = parent.report?.quality?.experiment;
    if (current?.experimentId === experiment.id && current.candidateId === candidate.id && parent.report?.sourceHash === candidate.outcome?.sourceHash
      && parent.workspace === candidate.workspace) return; // A crash after state.json is saved must not reset subsequent approval.
    const previous = structuredClone(parent);
    const fields = ['runId', 'workspace', 'model', 'backend', 'report', 'qualityVersion', 'visualReview', 'runtimeProfile', 'systemDesign', 'phasePlan', 'globalTools', 'logs', 'stages', 'processScope', 'runCheckpoint', 'verification'] as const;
    for (const field of fields) (parent as unknown as Record<string, unknown>)[field] = structuredClone(selected[field]);
    parent.status = 'review'; parent.approvedAt = undefined; parent.approval = undefined; parent.exportedTo = undefined; parent.executable = undefined;
    parent.error = undefined; parent.resumeStage = undefined; parent.updatedAt = new Date().toISOString();
    parent.experiment = this.learning.summary(experiment.id);
    try { await this.options.store.save(); }
    catch (error) { for (const name of Object.keys(parent)) delete (parent as unknown as Record<string, unknown>)[name]; Object.assign(parent, previous); throw error; }
    this.options.notify();
  }
  async submitExperimentPreference(experimentId: string, input: Parameters<ExperimentAPI['submitExperimentPreference']>[1]) {
    this.checkOpen(); identity(experimentId);
    if (!input || typeof input !== 'object' || typeof input.requestId !== 'string' || input.requestId.length > 200 || !['a', 'b', 'tie', 'neither'].includes(input.choice)
      || (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 4_000))
      || (input.reasonTags !== undefined && (!Array.isArray(input.reasonTags) || input.reasonTags.length > 20 || input.reasonTags.some(tag => typeof tag !== 'string' || tag.length > 100)))) throw new Error('Invalid comparison preference.');
    return this.coordinator.recordPreference(experimentId, input);
  }
  async skipExperimentPreference(experimentId: string, requestId: string) { this.checkOpen(); return this.coordinator.skipPreference(identity(experimentId), identity(requestId)); }
  async saveLearningSettings(settings: LearningSettings) {
    this.checkOpen();
    if (!settings || typeof settings !== 'object' || settings.schemaVersion !== 1 || Object.keys(settings).some(key => !['schemaVersion', 'mode', 'memoryEnabled', 'automaticComparisons', 'maxHumanRequestsPerDay'].includes(key))) throw new Error('Invalid learning settings.');
    const result = this.learning.setSettings(settings); this.changed(); return result;
  }
  async forgetProjectLearning(projectId: string) {
    this.checkOpen(); this.options.assertIdle(projectId); await this.closeCandidatePreview();
    const project = this.options.store.project(projectId), selected = this.selected(project);
    if (selected) {
      await this.workers.verifyCandidate(selected);
      // Retain only delivery provenance. This receipt is never exposed to the learner.
      const { executionState: _projection, budget: _budget, checkpointRef: _checkpoint, error: _error, ...candidate } = selected;
      await this.writeReceipt({ schemaVersion: 1, projectId, candidate, metadata: structuredClone(project.report!.quality!.experiment) });
    }
    await this.coordinator.forgetProject(projectId); this.changed(); await this.options.store.save();
  }
  async rollbackLearningPolicy(projectId: string) {
    this.options.store.project(projectId);
    for (const cohort of new Set(this.learning.listExperiments(projectId).map(item => item.cohortKey))) this.learning.rollbackContext(cohort, 'Rolled back by the user.');
    this.changed();
  }
  async integrationOperations() { await this.operationWrites; return structuredClone(this.operations); }
  private integrationLease(candidateId: string, operations: readonly IntegrationOperation[]) {
    const receipt = [...this.receipts.values()].find(item => item.candidate.id === candidateId);
    const candidate = this.learning.getCandidate(candidateId) ?? receipt?.candidate; if (!candidate) throw new Error('Integration candidate is unavailable.');
    let budget = this.budgets.get(candidateId);
    if (!budget) { budget = { calls: candidate.integrationCalls ?? 0 }; this.budgets.set(candidateId, budget); }
    return new IntegrationBroker({ candidateId, operations, credentials: this.vault, budget,
      onConsume: async state => {
        if (this.learning.getCandidate(candidateId)) this.learning.updateCandidate(candidateId, { integrationCalls: state.calls });
        else if (receipt) await this.writeReceipt({ ...receipt, candidate: { ...receipt.candidate, integrationCalls: state.calls } });
        else throw new Error('Integration budget provenance is unavailable.');
      } });
  }
  private async writeOperations(next: IntegrationOperation[]) {
    const file = path.join(this.learning.root, 'operations.json'), temporary = file + '.' + randomUUID() + '.tmp';
    try { await fs.writeFile(temporary, JSON.stringify(next, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); await fs.rename(temporary, file); this.operations = next; }
    finally { await fs.rm(temporary, { force: true }); }
  }
  async saveIntegrationOperation(input: IntegrationOperation, secret?: string) {
    this.checkOpen(); if (this.activeCount) throw new Error('Stop comparisons before changing integration operations.');
    const operation = validateIntegrationOperation(input);
    if (secret !== undefined && !operation.auth) throw new Error('Choose authentication before saving a credential.');
    const pending = this.operationWrites.catch(() => {}).then(async () => {
      if (secret !== undefined) await this.vault.set(operation.auth!.credentialId, secret);
      const next = this.operations.filter(item => item.id !== operation.id); if (next.length >= 100) throw new Error('At most 100 operations can be configured.');
      next.push(operation); await this.writeOperations(next); return structuredClone(this.operations);
    });
    this.operationWrites = pending; return pending;
  }
  async removeIntegrationOperation(operationId: string) {
    this.checkOpen(); identity(operationId); if (this.activeCount) throw new Error('Stop comparisons before changing integration operations.');
    const pending = this.operationWrites.catch(() => {}).then(async () => { await this.writeOperations(this.operations.filter(operation => operation.id !== operationId)); return structuredClone(this.operations); });
    // Frozen historical runs retain their credential references for reproducible preview/export.
    this.operationWrites = pending; return pending;
  }
  private receiptFile(projectId: string) { return path.join(this.learning.root, 'selected-receipts', identity(projectId) + '.json'); }
  private async writeReceipt(receipt: SelectionReceipt) {
    const file = this.receiptFile(receipt.projectId), directory = path.dirname(file), temporary = file + '.' + randomUUID() + '.tmp';
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    if ((await fs.lstat(directory)).isSymbolicLink()) throw new Error('Selected receipts require an ordinary host directory.');
    try { await fs.writeFile(temporary, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); await fs.rename(temporary, file); this.receipts.set(receipt.projectId, structuredClone(receipt)); }
    finally { await fs.rm(temporary, { force: true }); }
  }
  private selected(project: Project) {
    const metadata = project.report?.quality?.experiment;
    if (project.qualityVersion !== 4 || !metadata) return undefined;
    const experiment = this.learning.getExperiment(metadata.experimentId), receipt = this.receipts.get(project.id);
    const candidate = this.learning.getCandidate(metadata.candidateId) ?? (receipt?.metadata && experimentContractHash(receipt.metadata) === experimentContractHash(metadata) ? receipt.candidate : undefined);
    if (!candidate || candidate.experimentId !== metadata.experimentId || (experiment && (experiment.projectId !== project.id || experiment.selectedCandidateId !== candidate.id))
      || candidate.workspace !== project.workspace || candidate.outcome?.sourceHash !== project.report?.sourceHash) throw new Error('Project no longer matches its selected experiment revision.');
    return candidate;
  }
  async assertSelectedVerified(project: Project) {
    const candidate = this.selected(project); if (!candidate) { if (project.report?.quality?.schemaVersion === 4) throw new Error('Experiment provenance is missing.'); return; }
    await this.workers.verifyCandidate(candidate);
    const evidence = await this.workers.evidence(candidate);
    if (experimentContractHash(project.report) !== experimentContractHash(evidence.report)) throw new Error('Project verification does not match the selected host report.');
    if (await sourceHash(project.workspace!) !== project.report!.sourceHash) throw new Error('Selected candidate files changed after verification.');
  }
  async previewSelected(project: Project) {
    const candidate = this.selected(project); if (!candidate) return null;
    if (!this.learning.getCandidate(candidate.id)) {
      const operation = this.previewWrites.catch(() => {}).then(async () => {
        if (this.preview) { await this.preview.runtime.close(); this.preview = undefined; }
        const runtime = await this.workers.preview(candidate, this.options.embeddingOrigin); if (!runtime) return null;
        this.preview = { candidateId: candidate.id, runtime }; return runtime.url ?? null;
      });
      this.previewWrites = operation; return operation;
    }
    return this.previewCandidate(candidate.experimentId, candidate.id);
  }
  async exportReference(project: Project) {
    const candidate = this.selected(project); if (!candidate) return undefined;
    await this.assertSelectedVerified(project);
    const compiled = await this.workers.compiled(candidate), shared = await this.workers.shared(candidate.experimentId);
    return { runtime: compiled.execution.runtime, operations: shared.operations, experiment: { experimentId: candidate.experimentId, candidateId: candidate.id,
      behaviorHash: compiled.behaviorHash, evaluationSetHash: compiled.evaluationSetHash, executionHash: compiled.executionHash } };
  }
  async stopAll() { await this.coordinator.stopAll(); await this.closeCandidatePreview(); }
  async close() { if (this.closed) return; this.closed = true; this.lifetime.abort(); await this.stopAll(); await this.readiness?.catch(() => {}); await this.operationWrites.catch(() => {}); this.learning.close(); }
}
