import { randomUUID } from 'node:crypto';
import type { Project } from '../shared/types.js';
import type { ProjectTokenUsage } from '../shared/token-usage.js';
import { stageDefinitions } from '../shared/types.js';
import type { ArchitectureProfile, CandidateOutcome, CandidateRecord, ExperimentRecord, ExperimentSummary, LearningPartition,
  MemorySnapshot, PinnedModelConfig, PolicySnapshot, PreferenceRecord, PromotionAssessment, PromotionOutboxRecord } from '../shared/learning.js';
import { briefFingerprint } from './run-checkpoint.js';
import { LearningStore, candidateSucceeded } from './learning-store.js';
import { LessonMemory, memoryPolicyVersion } from './lesson-memory.js';
import { cohortKey, evaluatePromotion, fitPolicy, promotedPolicy, proposeDecision, selectCandidate, successEstimate } from './learning-policy.js';

export interface ExperimentWorker<Result> {
  start(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  wait(): Promise<void>;
  result(): Promise<Result>;
}
export interface SharedPlanResult {
  workspace: string; objectiveHash: string; taskFamily: string; runtimeConstraints: string[]; budgetTier: string; checkpointRef?: string;
}
export interface SharedPlannerContext {
  experiment: ExperimentRecord; project: Project; modelConfig: PinnedModelConfig; signal: AbortSignal;
  saveProjection(project: Project): Promise<void>;
}
export interface CandidateWorkerContext extends SharedPlannerContext {
  candidate: CandidateRecord; profile: ArchitectureProfile; shared: SharedPlanResult; memory?: MemorySnapshot;
}
export interface ExperimentCoordinatorOptions {
  store: LearningStore; profiles: ArchitectureProfile[];
  project(projectId: string): Project;
  modelConfig(): PinnedModelConfig;
  readiness(): Promise<{ supported: boolean; reason?: string }>;
  /** Reserve the parent and a host-global run slot atomically. */
  acquire(projectId: string, experimentId: string): Promise<() => void | Promise<void>>;
  sharedPlanner(context: SharedPlannerContext): Promise<ExperimentWorker<SharedPlanResult>>;
  candidateWorker(context: CandidateWorkerContext): Promise<ExperimentWorker<CandidateOutcome>>;
  /** Resolve delivery/behavior constraints against the registry frozen at experiment start. */
  selectProfiles?(shared: SharedPlanResult, registry: ArchitectureProfile[]): ArchitectureProfile[] | Promise<ArchitectureProfile[]>;
  /** Rehash current files and validate the host quality report; never trust stored success alone. */
  verifyCandidate(candidate: CandidateRecord): Promise<void>;
  /** Idempotently project the selected run into state.json, clearing earlier approval and exports. */
  applyPromotion(record: PromotionOutboxRecord): Promise<void>;
  /** Merge host-observed usage into the parent independently of which candidate wins. */
  recordUsage?(projectId: string, usage: ProjectTokenUsage | undefined): Promise<void>;
  notify?(): void;
  regressionCheck?(policy: PolicySnapshot): Promise<boolean>;
  random?: () => number;
  now?: () => Date;
  timeZone?: string;
  evaluatorVersion?: string;
  classifyFailure?(error: unknown): 'infrastructure' | 'build-failed' | 'gate-defect' | 'isolation-defect' | 'budget-defect';
}
export interface StartExperimentOptions {
  mode?: 'paired' | 'adaptive'; partition?: LearningPartition; lineageId?: string;
  /** Ordinary Run earns comparison credits; an explicit comparison always builds the pair. */
  automatic?: boolean;
  requestId?: string; validationPolicyId?: string;
}
interface ActiveExperiment { controller: AbortController; done: Promise<void>; worker?: ExperimentWorker<unknown>; release: () => void | Promise<void> }
const safeError = (error: unknown) => error instanceof Error ? error.message.slice(0, 1000) : 'The experiment failed.';
const cloneProject = (source: Project, id: string): Project => ({ ...structuredClone(source), id, status: 'draft', stages: structuredClone(stageDefinitions), logs: [],
  tokenUsage: undefined,
  runId: undefined, workspace: undefined, report: undefined, visualReview: undefined, systemDesign: undefined, resumeStage: undefined,
  approvedAt: undefined, exportedTo: undefined, executable: undefined, error: undefined, executionFailure: undefined,
  experiment: undefined, qualityVersion: undefined, runtimeProfile: undefined });
const executionProjection = (source: Project, resuming: boolean): Project => {
  const project = structuredClone(source);
  // A crashed process cannot still be running. Retain its checkpoint and budget,
  // while giving the backend the interrupted state required for resume().
  if (resuming && project.status === 'running') project.status = 'stopped';
  return project;
};

/** Host coordinator: scoped workers never mutate the parent's project until a verified selection is promoted. */
export class ExperimentCoordinator {
  readonly active = new Map<string, ActiveExperiment>();
  private readonly startingProjects = new Set<string>();
  private readonly selectionWrites = new Map<string, Promise<unknown>>();
  private readonly memory: LessonMemory;
  constructor(readonly options: ExperimentCoordinatorOptions) { this.memory = new LessonMemory(options.store); }
  private get store() { return this.options.store; }
  private now() { return (this.options.now?.() ?? new Date()).toISOString(); }
  private draw() {
    const result = this.options.random?.() ?? Math.random();
    if (!Number.isFinite(result) || result < 0 || result >= 1) throw new Error('Random draw must be in [0,1).'); return result;
  }
  private notify() { this.options.notify?.(); }
  private assertIdle(projectId: string) {
    if (this.startingProjects.has(projectId) || [...this.active.keys()].some(id => this.store.getExperiment(id)?.projectId === projectId)) throw new Error('This project already has an active experiment.');
  }
  private async requireReady() {
    const readiness = await this.options.readiness();
    if (!readiness.supported) throw new Error(readiness.reason ?? 'Architecture experiments require supported process isolation.');
  }
  inspect(id: string): ExperimentSummary { const summary = this.store.summary(id); if (!summary) throw new Error('Experiment not found.'); return summary; }
  list(projectId: string): ExperimentSummary[] { return this.store.listExperiments(projectId).map(item => this.store.summary(item.id)!); }
  async start(projectId: string, input: StartExperimentOptions = {}): Promise<ExperimentSummary> {
    const settings = this.store.getSettings(), mode = input.mode ?? (settings.mode === 'adaptive' ? 'adaptive' : 'paired');
    if (input.requestId && !/^[a-zA-Z0-9_-]{1,128}$/.test(input.requestId)) throw new Error('Invalid experiment request id.');
    const id = input.requestId ? `experiment-${input.requestId}` : `experiment-${randomUUID()}`;
    const previous = this.store.getExperiment(id);
    if (previous) { if (previous.projectId !== projectId) throw new Error('Experiment request belongs to another project.'); return this.inspect(id); }
    this.assertIdle(projectId); this.startingProjects.add(projectId);
    let release: (() => void | Promise<void>) | undefined;
    try {
      await this.requireReady();
      const source = structuredClone(this.options.project(projectId));
      if (source.status === 'running') throw new Error('Wait for the current project build before comparing architectures.');
      if (this.options.profiles.length < 2 || new Set(this.options.profiles.map(item => item.id)).size !== this.options.profiles.length) throw new Error('At least two distinct versioned architecture profiles are required.');
      const modelConfig = structuredClone(this.options.modelConfig());
      if (!modelConfig.model || !modelConfig.provider) throw new Error('Choose a configured model before starting an experiment.');
      const lineageId = input.lineageId ?? `brief-${briefFingerprint(source)}`;
      const partition = input.partition ?? this.store.getLineagePartition(lineageId) ?? 'development';
      // A repeat of a held-out task remains excluded from training, but is not a
      // thirteenth member of its original validation batch.
      const validation = partition !== 'development' && (input.partition !== undefined || input.validationPolicyId !== undefined);
      if (validation && !input.validationPolicyId) throw new Error('Held-out experiments require a frozen policy snapshot.');
      if (validation) {
        const frozen = this.store.getPolicy(input.validationPolicyId!);
        if (!frozen || ['invalidated', 'rolled-back'].includes(frozen.status)) throw new Error('The frozen validation policy is unavailable.');
        if (this.store.listExperiments().filter(item => item.mode === 'holdout' && item.policySnapshotId === frozen.id).length >= 12) throw new Error('This frozen policy already has its twelve validation tasks. Use a newly frozen policy for another batch.');
      }
      release = await this.options.acquire(projectId, id);
      const createdAt = this.now();
      const value: ExperimentRecord = { id, projectId, lineageId, partition, cohortKey: 'pending-shared-planning',
        mode: validation ? 'holdout' : input.automatic && mode === 'paired' ? 'single' : mode, status: 'queued', baselineProfileId: this.options.profiles[0].id,
        candidateIds: [], createdAt, updatedAt: createdAt, briefFingerprint: briefFingerprint(source), modelConfig,
        settingsSnapshot: structuredClone(settings), profileSnapshots: structuredClone(this.options.profiles), sourceProject: source,
        policySnapshotId: input.validationPolicyId };
      this.store.createExperiment(value);
      this.launch(id, release, false); release = undefined; this.notify(); return this.inspect(id);
    } finally { this.startingProjects.delete(projectId); if (release) await release(); }
  }
  private launch(id: string, release: () => void | Promise<void>, resume: boolean) {
    const active: ActiveExperiment = { controller: new AbortController(), release, done: Promise.resolve() };
    this.active.set(id, active);
    active.done = Promise.resolve().then(() => this.run(id, active, resume)).catch(error => {
      const experiment = this.store.getExperiment(id);
      if (experiment) this.store.updateExperiment(id, { status: active.controller.signal.aborted ? 'stopped' : 'failed', error: safeError(error) });
      this.notify();
    }).finally(async () => { this.active.delete(id); await release(); this.notify(); });
    // The public wait method observes any release failure; background dispatch never leaks an unhandled rejection.
    void active.done.catch(() => {});
  }
  async wait(id: string): Promise<void> { await this.active.get(id)?.done; }
  async stop(id: string): Promise<ExperimentSummary> {
    const active = this.active.get(id); if (!active) return this.inspect(id);
    active.controller.abort(new Error('Experiment stopped by the user.'));
    try { await active.worker?.stop(); } finally { await active.done; }
    return this.inspect(id);
  }
  async stopAll(): Promise<void> { await Promise.all([...this.active.keys()].map(id => this.stop(id))); }
  async resume(id: string): Promise<ExperimentSummary> {
    const experiment = this.store.getExperiment(id); if (!experiment) throw new Error('Experiment not found.');
    if (this.active.has(id)) return this.inspect(id);
    if (!['stopped', 'failed'].includes(experiment.status)) throw new Error('Only interrupted experiments can be resumed.');
    const candidates = this.store.listCandidates(id);
    if (experiment.status === 'failed' && candidates.length && candidates.every(candidate => candidate.outcome)) throw new Error('This attempt has finalized outcomes. Start a new experiment for additional attempts.');
    if (briefFingerprint(this.options.project(experiment.projectId)) !== experiment.briefFingerprint) throw new Error('The brief changed; start a new experiment to preserve the frozen comparison.');
    this.assertIdle(experiment.projectId); this.startingProjects.add(experiment.projectId);
    let release: (() => void | Promise<void>) | undefined;
    try {
      await this.requireReady(); release = await this.options.acquire(experiment.projectId, id);
      this.store.updateExperiment(id, { error: undefined, status: 'queued' });
      this.launch(id, release, true); release = undefined; return this.inspect(id);
    } finally { this.startingProjects.delete(experiment.projectId); if (release) await release(); }
  }
  /** Startup marks incomplete dispatches recoverable and replays already committed selections. */
  async recover(): Promise<void> {
    for (const experiment of this.store.listExperiments()) if (['queued', 'planning', 'running', 'comparing'].includes(experiment.status) && !this.active.has(experiment.id)) {
      this.store.updateExperiment(experiment.id, { status: 'stopped', error: 'The previous app session was interrupted. Resume to keep the pinned profiles and remaining budget.' });
      for (const candidate of this.store.listCandidates(experiment.id)) if (candidate.status === 'running' && !candidate.outcome) this.store.updateCandidate(candidate.id, { status: 'stopped' });
    }
    await this.recoverPromotions();
  }
  private assertBrief(experiment: ExperimentRecord) {
    if (briefFingerprint(this.options.project(experiment.projectId)) !== experiment.briefFingerprint) throw new Error('The project brief changed during the experiment.');
  }
  private async execute<Result>(worker: ExperimentWorker<Result>, active: ActiveExperiment, resuming: boolean, project: Project, terminalCandidateFailure = false): Promise<Result> {
    active.worker = worker; active.controller.signal.throwIfAborted();
    // Completion may have been saved before the coordinator committed its result.
    // Collect and reverify that evidence without allocating another run or budget.
    // Classified candidate failures also have a final outcome, even though their
    // checkpoint retains the failed stage. Shared planning failures remain resumable.
    if (!(resuming && ((project.status === 'review' && !project.resumeStage) || terminalCandidateFailure))) {
      if (resuming && project.resumeStage) await worker.resume(); else await worker.start();
      await worker.wait();
    }
    active.controller.signal.throwIfAborted();
    const result = await worker.result();
    active.controller.signal.throwIfAborted();
    return result;
  }
  private async run(id: string, active: ActiveExperiment, resuming: boolean) {
    let experiment = this.store.getExperiment(id)!;
    this.assertBrief(experiment);
    if (!experiment.objectiveHash || !experiment.sharedWorkspace) {
      this.store.updateExperiment(id, { status: 'planning' }); this.notify();
      const project = executionProjection(experiment.sharedExecutionState ?? cloneProject(experiment.sourceProject!, `shared-${id}`), resuming);
      const worker = await this.options.sharedPlanner({ experiment, project, modelConfig: experiment.modelConfig!, signal: active.controller.signal,
        saveProjection: async projection => {
          this.store.updateExperiment(id, { sharedExecutionState: structuredClone(projection), sharedWorkspace: projection.workspace });
          await this.options.recordUsage?.(experiment.projectId, projection.tokenUsage); this.notify();
        } });
      const shared = await this.execute(worker, active, resuming, project);
      if (!shared.workspace || !shared.objectiveHash || !shared.taskFamily) throw new Error('Shared planning did not freeze a behavioral contract.');
      this.store.updateExperiment(id, { sharedWorkspace: shared.workspace, objectiveHash: shared.objectiveHash, checkpointRef: shared.checkpointRef,
        taskFamily: shared.taskFamily, runtimeConstraints: shared.runtimeConstraints, budgetTier: shared.budgetTier });
      experiment = this.store.getExperiment(id)!;
    }
    this.assertBrief(experiment); active.controller.signal.throwIfAborted();
    const shared: SharedPlanResult = { workspace: experiment.sharedWorkspace!, objectiveHash: experiment.objectiveHash!, checkpointRef: experiment.checkpointRef,
      taskFamily: experiment.taskFamily!, runtimeConstraints: experiment.runtimeConstraints ?? [], budgetTier: experiment.budgetTier ?? 'bounded' };
    if (!experiment.eligibleProfileIds) {
      const registry = experiment.profileSnapshots!;
      const eligible = await this.options.selectProfiles?.(shared, structuredClone(registry)) ?? registry;
      active.controller.signal.throwIfAborted();
      if (eligible.length < 2 || new Set(eligible.map(item => item.id)).size !== eligible.length || eligible.some(item => !registry.some(profile => profile.id === item.id && profile.version === item.version))) throw new Error('The shared behavior requires at least two compatible architectures from the frozen registry.');
      // The registry may contain five architectures. This initial router validates one selected pair
      // per cohort; it does not claim joint optimization across untested registry entries.
      this.store.updateExperiment(id, { eligibleProfileIds: eligible.map(item => item.id), comparisonProfileIds: [eligible[0].id, eligible[1].id], baselineProfileId: eligible[0].id });
      experiment = this.store.getExperiment(id)!;
    }
    if (!experiment.decisionId) this.prepareDecision(experiment);
    experiment = this.store.getExperiment(id)!;
    for (const candidateId of experiment.executionOrder ?? experiment.candidateIds) {
      active.controller.signal.throwIfAborted();
      let candidate = this.store.getCandidate(candidateId)!;
      if (candidate.outcome) continue;
      this.assertBrief(experiment);
      const profile = experiment.profileSnapshots!.find(item => item.id === candidate.profileId)!;
      const memory = experiment.memorySnapshotId ? this.store.getMemorySnapshot(experiment.memorySnapshotId) : undefined;
      if (experiment.memorySnapshotId && !memory) throw new Error('Pinned memory was forgotten; start a new experiment.');
      this.store.updateExperiment(id, { status: 'running' });
      this.store.updateCandidate(candidateId, { status: 'running', error: undefined }); this.notify();
      const started = Date.now();
      try {
        const project = executionProjection(candidate.executionState ?? cloneProject(experiment.sourceProject!, candidate.id), resuming);
        const worker = await this.options.candidateWorker({ experiment, candidate, profile: structuredClone(profile), shared, memory,
          project, modelConfig: experiment.modelConfig!, signal: active.controller.signal,
          saveProjection: async projection => {
            this.store.updateCandidate(candidateId, { executionState: structuredClone(projection), workspace: projection.workspace,
              stage: projection.stages.find(stage => stage.status === 'active')?.id ?? projection.resumeStage });
            await this.options.recordUsage?.(experiment.projectId, projection.tokenUsage); this.notify();
          } });
        const terminalFailure = project.status === 'failed' && (project.executionFailure === 'implementation' || project.executionFailure === 'budget');
        const result = await this.execute(worker, active, resuming, project, terminalFailure);
        candidate = this.store.getCandidate(candidateId)!;
        if (candidateSucceeded(result) === null) {
          this.store.updateCandidate(candidateId, { status: 'stopped', error: 'The worker was interrupted; its outcome remains unscored.' });
          this.store.updateExperiment(id, { status: 'stopped' }); return;
        }
        if (candidateSucceeded(result)) await this.options.verifyCandidate({ ...candidate, outcome: result, status: 'passed' });
        active.controller.signal.throwIfAborted();
        this.store.recordOutcome(candidateId, result);
      } catch (error) {
        if (active.controller.signal.aborted) { this.store.updateCandidate(candidateId, { status: 'stopped', error: 'Stopped by the user; the consumed budget is retained.' }); throw error; }
        const classification = this.options.classifyFailure?.(error) ?? 'build-failed';
        const infrastructure = classification === 'infrastructure';
        if (infrastructure) {
          this.store.updateCandidate(candidateId, { status: 'stopped', error: safeError(error) });
          this.store.updateExperiment(id, { status: 'stopped', error: safeError(error) });
          return;
        }
        if (['gate-defect', 'isolation-defect', 'budget-defect'].includes(classification)) this.store.rollbackContext(experiment.cohortKey, classification);
        this.store.recordOutcome(candidateId, { mandatoryPassed: false, requiredScopePassed: false, withinBudget: true, terminalReason: 'build-failed',
          durationMs: Date.now() - started, costUsd: null, repairCount: 0, evaluatorVersion: this.options.evaluatorVersion ?? 'host-v1', recordedAt: this.now() });
        this.store.updateCandidate(candidateId, { error: safeError(error) });
      }
      this.notify();
    }
    active.controller.signal.throwIfAborted();
    this.store.updateExperiment(id, { status: 'comparing' });
    this.learn(this.store.getExperiment(id)!);
    const selection = selectCandidate(this.store.listCandidates(id));
    this.store.updateExperiment(id, { status: selection.candidateId ? 'review' : 'failed', error: selection.candidateId ? undefined : selection.reason });
    await this.assessCompletedValidation(this.store.getExperiment(id)!, active.controller.signal);
    active.controller.signal.throwIfAborted();
    this.requestFeedback(); this.notify();
  }
  private prepareDecision(experiment: ExperimentRecord) {
    const profiles = experiment.comparisonProfileIds!.map(id => experiment.profileSnapshots!.find(item => item.id === id)!);
    const key = cohortKey({ taskFamily: experiment.taskFamily!, runtimeConstraints: experiment.runtimeConstraints ?? [], budgetTier: experiment.budgetTier ?? 'bounded',
      ...experiment.modelConfig!, profileVersions: Object.fromEntries(profiles.map(item => [item.id, item.version])),
      evaluatorVersion: this.options.evaluatorVersion ?? 'host-v1', memoryPolicyVersion: memoryPolicyVersion + (experiment.settingsSnapshot?.memoryEnabled === false ? '-disabled' : '-enabled') });
    this.store.transaction(() => {
      this.store.updateExperiment(experiment.id, { cohortKey: key });
      experiment = this.store.getExperiment(experiment.id)!;
      if (this.store.canEnrollValidation(experiment.id)) {
        const development = this.store.listExperiments().filter(item => item.partition === 'development').map(item => ({ experiment: item, candidates: this.store.listCandidates(item.id) }));
        const policies = this.store.listPolicies(key).filter(item => item.status === 'shadow' && !item.validation && Date.parse(item.createdAt) <= Date.parse(experiment.createdAt)
          && evaluatePromotion(item, development, []).warmupPairs >= 8);
        const batchSize = (policyId: string) => this.store.listExperiments().filter(item => item.mode === 'holdout' && item.policySnapshotId === policyId).length;
        const proposal = policies.find(item => batchSize(item.id) > 0 && batchSize(item.id) < 12) ?? policies.filter(item => batchSize(item.id) === 0).at(-1);
        if (proposal) experiment = this.store.enrollValidation(experiment.id, proposal.id);
      }
      const heldout = experiment.mode === 'holdout';
      let policy = heldout ? this.store.getPolicy(experiment.policySnapshotId!)
        : experiment.mode === 'adaptive' ? this.store.listPolicies(key).filter(item => item.status === 'active').at(-1) : undefined;
      if (heldout && (!policy || policy.cohortKey !== key)) throw new Error('Held-out policy does not match the pinned model, profiles, task context and budget.');
      if (!policy) {
        const memory = this.memory.snapshot({ taskFamily: experiment.taskFamily!, query: experiment.taskFamily!, profileIds: profiles.map(item => item.id),
          cohortKey: key, excludeLineageIds: [experiment.lineageId], enabled: experiment.settingsSnapshot?.memoryEnabled, createdAt: this.now() });
        policy = fitPolicy(this.store, { cohortKey: key, baselineProfileId: experiment.baselineProfileId, profileIds: profiles.map(item => item.id), memorySnapshotId: memory.id, createdAt: this.now() });
        this.store.savePolicy(policy);
      }
      if (policy.memorySnapshotId && !this.store.getMemorySnapshot(policy.memorySnapshotId)) throw new Error('Policy memory snapshot is unavailable.');
      const routing = this.store.getRoutingState(key);
      const decision = proposeDecision(policy, { experimentId: experiment.id, credit: routing.credit,
        mode: heldout || experiment.mode === 'paired' ? 'paired' : 'adaptive', prospectiveValidation: heldout,
        automaticComparisons: experiment.settingsSnapshot?.automaticComparisons, comparisonBudgetAvailable: true,
        rolledBack: routing.rolledBack, random: () => this.draw(), createdAt: this.now() });
      this.store.recordDecision(decision);
      const selected = profiles.filter(profile => decision.compare || profile.id === decision.selectedProfileId);
      if (selected.length === 2 && this.draw() < 0.5) selected.reverse();
      const order: string[] = [];
      for (const profile of selected) {
        const candidate: CandidateRecord = { id: `candidate-${randomUUID()}`, experimentId: experiment.id, profileId: profile.id, profileVersion: profile.version,
          baseline: profile.id === experiment.baselineProfileId, status: 'queued', createdAt: this.now(), updatedAt: this.now(), budget: structuredClone(profile.budget) };
        this.store.putCandidate(candidate); order.push(candidate.id);
      }
      this.store.updateExperiment(experiment.id, { executionOrder: order });
    });
  }
  private learn(experiment: ExperimentRecord) {
    if (experiment.partition !== 'development') return;
    this.memory.recordComparison(experiment.id, experiment.taskFamily!);
    const prior = this.store.listPolicies(experiment.cohortKey).filter(item => item.status === 'active').at(-1);
    const profileIds = [...experiment.comparisonProfileIds!];
    const memory = this.memory.snapshot({ taskFamily: experiment.taskFamily!, query: experiment.taskFamily!, profileIds, cohortKey: experiment.cohortKey,
      enabled: experiment.settingsSnapshot?.memoryEnabled, createdAt: this.now() });
    const update = fitPolicy(this.store, { cohortKey: experiment.cohortKey, baselineProfileId: prior?.baselineProfileId ?? experiment.baselineProfileId, profileIds,
      memorySnapshotId: memory.id, createdAt: this.now() });
    // New outcomes and preferences change the distribution. The existing active
    // snapshot keeps routing until this new shadow policy passes its own batch.
    this.store.savePolicy(update);
  }
  private async assessCompletedValidation(experiment: ExperimentRecord, signal: AbortSignal): Promise<void> {
    if (experiment.mode !== 'holdout' || !['validation', 'holdout'].includes(experiment.partition) || !experiment.policySnapshotId) return;
    const policy = this.store.getPolicy(experiment.policySnapshotId);
    // Retiring learning does not discard successfully completed applications.
    if (!policy || ['invalidated', 'rolled-back'].includes(policy.status)) return;
    const batch = this.store.listExperiments().filter(item => item.mode === 'holdout' && ['validation', 'holdout'].includes(item.partition) && item.policySnapshotId === experiment.policySnapshotId);
    if (batch.length !== 12 || batch.some(item => this.store.listCandidates(item.id).length !== 2
      || this.store.listCandidates(item.id).some(candidate => candidateSucceeded(candidate.outcome) === null))) return;
    await this.validatePolicy(experiment.policySnapshotId, batch.map(item => item.id), signal);
  }
  async validatePolicy(policyId: string, experimentIds: string[], signal?: AbortSignal): Promise<PromotionAssessment> {
    signal?.throwIfAborted();
    const policy = this.store.getPolicy(policyId); if (!policy || ['invalidated', 'rolled-back'].includes(policy.status)) throw new Error('Frozen policy is unavailable.');
    const registered = this.store.listExperiments().filter(item => item.mode === 'holdout' && ['validation', 'holdout'].includes(item.partition) && item.policySnapshotId === policyId).map(item => item.id);
    if (registered.length !== 12 || experimentIds.length !== 12 || new Set(experimentIds).size !== 12 || registered.some(id => !experimentIds.includes(id))) throw new Error('Validate the complete registered twelve-task batch; outcomes cannot be selected after inspection.');
    const development = this.store.listExperiments().filter(item => item.partition === 'development').map(experiment => ({ experiment, candidates: this.store.listCandidates(experiment.id) }));
    const validation = experimentIds.map(id => {
      const experiment = this.store.getExperiment(id), decision = experiment?.decisionId ? this.store.getDecision(experiment.decisionId) : undefined;
      if (!experiment || !decision) throw new Error('Validation experiment lacks a prospective decision.');
      return { experiment, decision, candidates: this.store.listCandidates(id) };
    });
    const assessment = evaluatePromotion(policy, development, validation);
    if (this.store.listPolicies(policy.cohortKey).some(item => item.validation?.eligible && item.validation.policySnapshotId === policyId)) return assessment;
    if (assessment.eligible && !(await this.options.regressionCheck?.(policy))) { assessment.eligible = false; assessment.reasons.push('Host regression checks have not been confirmed.'); }
    signal?.throwIfAborted();
    if (assessment.eligible) this.store.transaction(() => {
      // Source authority can be revoked while regression checks await. Recheck
      // it before writing either promotion record.
      const current = this.store.getPolicy(policyId);
      if (!current || ['invalidated', 'rolled-back'].includes(current.status)) {
        assessment.eligible = false; assessment.reasons.push('The frozen policy was rolled back or invalidated during validation.'); return;
      }
      // Concurrent assessments of the same batch must not activate duplicates.
      if (this.store.listPolicies(policy.cohortKey).some(item => item.validation?.eligible && item.validation.policySnapshotId === policyId)) return;
      const promoted = promotedPolicy(current, assessment); this.store.savePolicy(promoted); this.store.activatePolicy(promoted.id);
    });
    this.notify(); return assessment;
  }
  private localDay(): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: this.options.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(this.now()));
    return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
  }
  /** One random audit and one targeted request per local day, recorded before display. */
  requestFeedback(): void {
    const max = this.store.getSettings().maxHumanRequestsPerDay; if (!max) return;
    const day = this.localDay();
    this.store.transaction(() => {
      const all = this.store.listExperiments(), requests = all.flatMap(item => item.preferenceRequest ? [item.preferenceRequest] : []);
      let available = max - requests.filter(item => item.localDay === day).length;
      if (available <= 0 || requests.filter(item => item.status === 'pending').length >= 2) return;
      for (const sampling of ['targeted', 'random-audit'] as const) {
        if (!available || requests.filter(item => item.status === 'pending').length >= 2) break;
        if (requests.some(item => item.localDay === day && item.sampling === sampling)) continue;
        const eligible = this.store.listExperiments().filter(item => item.partition === 'development' && ['review', 'complete'].includes(item.status)
          && !item.preferenceRequest && !this.store.listPreferences(item.id).length && this.store.listCandidates(item.id).filter(candidate => candidateSucceeded(candidate.outcome)).length === 2);
        if (!eligible.length) break;
        const uncertainty = (item: ExperimentRecord) => {
          const policy = item.policySnapshotId ? this.store.getPolicy(item.policySnapshotId) : undefined;
          return policy?.arms.length === 2 ? Math.abs(successEstimate(policy.arms[0]) - successEstimate(policy.arms[1])) : 0;
        };
        const selected = sampling === 'random-audit' ? eligible[Math.floor(this.draw() * eligible.length)]
          : [...eligible].sort((a, b) => uncertainty(a) - uncertainty(b) || b.createdAt.localeCompare(a.createdAt))[0];
        const candidates = this.store.listCandidates(selected.id);
        if (this.draw() < 0.5) candidates.reverse();
        const request = { id: `feedback-${randomUUID()}`, experimentId: selected.id, createdAt: this.now(), localDay: day, sampling,
          samplingProbability: sampling === 'random-audit' ? 1 / eligible.length : null,
          presentationOrder: candidates.map(item => item.id) as [string, string], sourceHashes: candidates.map(item => item.outcome!.sourceHash!) as [string, string], status: 'pending' as const };
        this.store.updateExperiment(selected.id, { preferenceRequest: request, humanRequestAt: request.createdAt });
        requests.push(request); available--;
      }
    }); this.notify();
  }
  async recordPreference(experimentId: string, input: { requestId: string; choice: PreferenceRecord['choice']; reasonTags?: string[]; note?: string }): Promise<ExperimentSummary> {
    const experiment = this.store.getExperiment(experimentId), request = experiment?.preferenceRequest;
    if (!experiment || !request || request.id !== input.requestId) throw new Error('Preference request not found.');
    if (request.status === 'answered') {
      if (this.store.listPreferences(experimentId)[0]?.choice !== input.choice) throw new Error('This request already has a different recorded preference.');
      return this.inspect(experimentId);
    }
    if (request.status !== 'pending') throw new Error('This preference request was skipped.');
    const a = this.store.getCandidate(request.presentationOrder[0])!, b = this.store.getCandidate(request.presentationOrder[1])!;
    await this.options.verifyCandidate(a); await this.options.verifyCandidate(b);
    const label: PreferenceRecord = { id: request.id, experimentId, candidateAId: a.id, candidateBId: b.id,
      sourceHashA: request.sourceHashes[0], sourceHashB: request.sourceHashes[1], choice: input.choice, reasonTags: input.reasonTags ?? [], note: input.note,
      createdAt: this.now(), presentationOrder: request.presentationOrder, sampling: request.sampling, samplingProbability: request.samplingProbability };
    this.store.transaction(() => { this.store.recordPreference(label); this.store.updateExperiment(experimentId, { preferenceRequest: { ...request, status: 'answered' } }); });
    this.learn(this.store.getExperiment(experimentId)!); this.notify(); return this.inspect(experimentId);
  }
  skipPreference(experimentId: string, requestId: string): ExperimentSummary {
    const experiment = this.store.getExperiment(experimentId), request = experiment?.preferenceRequest;
    if (!request || request.id !== requestId) throw new Error('Preference request not found.');
    if (request.status === 'pending') this.store.updateExperiment(experimentId, { preferenceRequest: { ...request, status: 'skipped' } });
    this.notify(); return this.inspect(experimentId);
  }
  async select(experimentId: string, candidateId: string, expectedSourceHash?: string): Promise<ExperimentSummary> {
    const previous = this.selectionWrites.get(experimentId) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      if (this.active.has(experimentId)) throw new Error('Wait for this experiment to finish before selecting an architecture.');
      await this.recoverPromotions();
      const candidate = this.store.getCandidate(candidateId), experiment = this.store.getExperiment(experimentId);
      if (!candidate || !experiment || candidate.experimentId !== experimentId || !candidateSucceeded(candidate.outcome)) throw new Error('Select a passing candidate from this experiment.');
      if (expectedSourceHash !== undefined && candidate.outcome?.sourceHash !== expectedSourceHash) throw new Error('The selected source revision changed. Refresh the comparison before selecting it.');
      this.assertBrief(experiment); await this.options.verifyCandidate(candidate);
      if (!candidate.executionState) throw new Error('The candidate has no verified project projection.');
      const record = this.store.promoteCandidate(experimentId, candidateId, { projectId: experiment.projectId, candidateId, experimentId,
        sourceHash: candidate.outcome!.sourceHash, project: structuredClone(candidate.executionState) });
      if (record.status === 'pending') { await this.options.applyPromotion(record); this.store.ackPromotion(record.id); }
      this.notify(); return this.inspect(experimentId);
    });
    this.selectionWrites.set(experimentId, operation);
    try { return await operation; } finally { if (this.selectionWrites.get(experimentId) === operation) this.selectionWrites.delete(experimentId); }
  }
  async recoverPromotions(): Promise<void> {
    for (const record of this.store.pendingPromotions()) {
      const candidate = this.store.getCandidate(record.candidateId);
      if (!candidate) throw new Error('Pending promotion lost its candidate.');
      const experiment = this.store.getExperiment(record.experimentId); if (!experiment) throw new Error('Pending promotion lost its experiment.');
      this.assertBrief(experiment);
      await this.options.verifyCandidate(candidate); await this.options.applyPromotion(record); this.store.ackPromotion(record.id);
    }
  }
  async forgetProject(projectId: string) {
    this.assertIdle(projectId);
    if (this.store.pendingPromotions().some(item => this.store.getExperiment(item.experimentId)?.projectId === projectId)) throw new Error('Recover the pending selection before forgetting its history.');
    const result = this.store.forgetProject(projectId); this.notify(); return result;
  }
}
