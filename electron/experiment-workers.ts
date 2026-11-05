import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { CreateAgentSessionOptions, ModelRuntime } from '@earendil-works/pi-coding-agent';
import type { Project, TestReport } from '../shared/types.js';
import type { ArchitectureProfile, CandidateOutcome, CandidateRecord } from '../shared/learning.js';
import type { BehavioralContract } from '../shared/experiment-contract.js';
import type { ExperimentContractIdentity } from '../shared/experiment-contract.js';
import type { EvaluationPlan } from '../shared/solution.js';
import { exportIntegrationOperations, validateIntegrationOperation, type IntegrationOperation } from '../shared/integration.js';
import type { AcceptanceCriterion } from '../harness/types.js';
import { behavioralContractGuide, candidateExecutionGuide, experimentContractBody, experimentContractHash, parseBehavioralContract, parsePlannedBehavioralContract, parsePlannedCandidateExecutionContract, parseExperimentEvaluationPlan } from '../harness/experiment-contract.js';
import type { BriefDataSnapshot } from './brief-data.js';
import { assertBriefDataIntegrity } from './brief-data.js';
import { FleetBackend, type ScopedWorkflow } from './pi-backend.js';
import { ScopedRunStore } from './scoped-run-store.js';
import { readRunCheckpoint } from './run-checkpoint.js';
import { functionalRepairAttempts } from './functional-repair.js';
import { sourceHash } from './storage.js';
import type { StageSession } from './agent-runner.js';
import type { CodexAccount } from './codex-account.js';
import type { createCodexSession } from './codex-session.js';
import type { IntegrationBroker } from './integration-broker.js';
import { isolatedRuntimeFactory, verifyIsolatedWorkspace } from './isolated-solution-runtime.js';
import { assertExperimentCandidateVerified, assertExperimentContracts, compileExperimentContracts, experimentContractIdentity, experimentVerificationPassed,
  materializeExperimentContracts, type CompiledExperimentContracts, type ExperimentVerification } from './experiment-quality.js';
import type { CandidateWorkerContext, ExperimentWorker, SharedPlannerContext, SharedPlanResult } from './experiment-coordinator.js';
import type { ExecutionBudgetState } from './execution-budget.js';
import { candidateSucceeded } from './learning-store.js';
import { createSharedPlanningReviewSnapshot, assertSharedPlanningReviewSnapshot, type PlanningReviewRecord } from './planning-review.js';

const totalLimitMs = 90 * 60_000, phaseLimitMs = 30 * 60_000;
export const experimentProfiles: ArchitectureProfile[] = [
  { id: 'browser-js', label: 'Browser JavaScript', instructions: 'A static browser interface imports and uses the same browser-compatible JavaScript core evaluated by the host.' },
  { id: 'node-service', label: 'Node service', instructions: 'A browser interface calls a Node module through the host HTTP bridge.' },
  { id: 'python-service', label: 'Python service', instructions: 'A browser interface calls a Python module through the host HTTP bridge.' },
  { id: 'node-cli', label: 'Node command line', instructions: 'A Node computational module has a JSON command-line adapter.' },
  { id: 'python-cli', label: 'Python command line', instructions: 'A Python computational module has a JSON command-line adapter.' },
].map(profile => ({ ...profile, version: '1.0.0', budget: { timeoutMs: totalLimitMs } }));
export { experimentProfiles as profiles };
interface SharedArtifact {
  schemaVersion: 1; experimentId: string; behavior: BehavioralContract; evaluation: EvaluationPlan; acceptance: AcceptanceCriterion[];
  data: BriefDataSnapshot; seed: Record<string, string>; operations: IntegrationOperation[];
  behaviorHash: string; evaluationSetHash: string; taskFamily: string; workspace: string;
  /** New shared plans retain private independent approval; legacy frozen plans stay readable. */
  planningReview?: PlanningReviewRecord;
}
interface SharedPlanningProgress {
  schemaVersion: 1; experimentId: string; runId: string; workspace: string; acceptanceHash: string;
  phase: 'reviewing' | 'revision' | 'rereview' | 'rejected' | 'approved';
  /** Historical marker retained for compatibility, not a limit on correction cycles. */
  revisionUsed: boolean; review?: PlanningReviewRecord;
}
interface CandidateArtifact {
  schemaVersion: 1; experimentId: string; candidateId: string; profileId: string; profileVersion: string;
  compiled: CompiledExperimentContracts; immutable: Record<string, string>;
}
/** Host-only negative evidence. It contains hashes and typed facts, never model text or reference answers. */
export interface ExperimentFailureEvidence {
  schemaVersion: 1; kind: 'candidate-failure'; experimentId: string; candidateId: string;
  profileId: string; profileVersion: string; runId: string; sourceHash: string;
  identity: Pick<ExperimentContractIdentity, 'behaviorHash' | 'evaluationSetHash'> & Partial<ExperimentContractIdentity>;
  failure: { classification: 'implementation' | 'budget'; terminalReason: 'build-failed' | 'verification-failed' | 'timeout'; stage: Project['resumeStage'] };
  budget?: ExecutionBudgetState; coreReportHash?: string; repairCount: number; evaluatorVersion: 'experiment-host-v4';
}
export interface ExperimentWorkersOptions {
  root: string; executable: string; resourcesRoot: string; runtime: ModelRuntime; codex?: CodexAccount;
  operations(): IntegrationOperation[] | Promise<IntegrationOperation[]>;
  /** Each returned broker must share this candidate's durable call counter; definitions are frozen. */
  integrations(candidateId: string, operations: readonly IntegrationOperation[]): IntegrationBroker;
  createSession?: (options: CreateAgentSessionOptions) => Promise<{ session: StageSession }>;
  createCodexSession?: typeof createCodexSession;
  classifyFailure?(error: unknown): 'infrastructure' | 'integrity' | 'implementation';
  notify?: () => void;
}
/** Preserves host failure provenance after the backend has durably saved its projection. */
export class ExperimentWorkerFailure extends Error {
  constructor(readonly classification: 'infrastructure' | 'integrity' | 'implementation', message: string) { super(message); this.name = 'ExperimentWorkerFailure'; }
}
async function classified<T>(classification: ExperimentWorkerFailure['classification'], work: () => Promise<T>): Promise<T> {
  try { return await work(); } catch (error) {
    if (error instanceof ExperimentWorkerFailure) throw error;
    throw new ExperimentWorkerFailure(classification, error instanceof Error ? error.message : 'Experimental execution failed.');
  }
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const key = (value: string) => { if (!/^[A-Za-z0-9_-]{1,200}$/.test(value)) throw new Error('Invalid host experiment identity.'); return value; };
const adapterFile = (python: boolean) => `runtime-broker/${python ? 'python.py' : 'node.mjs'}`;
const moduleFile = (python: boolean) => python ? 'app.py' : 'app.mjs';
async function readOrdinary(file: string, max = 8_000_000): Promise<string> {
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { const stat = await handle.stat(); if (!stat.isFile() || stat.nlink !== 1 || stat.size > max) throw new Error('Host artifacts require bounded ordinary files.'); return await handle.readFile('utf8'); }
  finally { await handle.close(); }
}
async function exists(file: string): Promise<boolean> { try { await fs.lstat(file); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; } }
async function immutableFile(file: string, value: unknown) {
  const body = experimentContractBody(value); await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  try { await fs.writeFile(file, body, { flag: 'wx', mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || await readOrdinary(file) !== body) throw new Error('Frozen host artifact cannot be replaced: ' + path.basename(file)); }
}
async function savePlanningProgress(file: string, value: SharedPlanningProgress, signal: AbortSignal) {
  signal.throwIfAborted();
  const temporary = file + '.' + randomUUID() + '.tmp';
  try {
    await fs.writeFile(temporary, experimentContractBody(value), { flag: 'wx', mode: 0o600 });
    signal.throwIfAborted();
    await fs.rename(temporary, file);
  } finally { await fs.rm(temporary, { force: true }); }
}
async function writePublic(root: string, file: string, body: string) {
  const target = path.join(root, file); await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  if (await exists(target)) { if (await readOrdinary(target) !== body) throw new Error('Frozen public seed changed: ' + file); return; }
  await fs.writeFile(target, body, { flag: 'wx', mode: 0o600 });
}

export class ExperimentWorkers {
  constructor(readonly options: ExperimentWorkersOptions) {}
  private directory(experimentId: string) { return path.join(this.options.root, 'experiments', key(experimentId)); }
  private sharedPath(experimentId: string) { return path.join(this.directory(experimentId), 'shared.json'); }
  private candidatePath(candidate: Pick<CandidateRecord, 'experimentId' | 'id'>) { return path.join(this.directory(candidate.experimentId), key(candidate.id) + '.json'); }
  private evidencePath(candidate: Pick<CandidateRecord, 'experimentId' | 'id'>) { return path.join(this.directory(candidate.experimentId), key(candidate.id) + '-verification.json'); }
  private failurePath(candidate: Pick<CandidateRecord, 'experimentId' | 'id'>) { return path.join(this.directory(candidate.experimentId), key(candidate.id) + '-failure.json'); }
  async shared(experimentId: string): Promise<SharedArtifact> {
    return classified('integrity', async () => {
    const value = JSON.parse(await readOrdinary(this.sharedPath(experimentId))) as SharedArtifact;
    if (value.schemaVersion !== 1 || value.experimentId !== experimentId || experimentContractHash(value.behavior) !== value.behaviorHash
      || experimentContractHash(value.evaluation) !== value.evaluationSetHash) throw new Error('Frozen shared contract identity is invalid.');
    if (value.planningReview !== undefined && (!value.planningReview || value.planningReview.reviewerVersion !== 1
      || (value.planningReview.preparedDataHash !== undefined && (!/^[a-f0-9]{64}$/.test(value.planningReview.preparedDataHash)
        || value.planningReview.preparedDataHash !== value.data?.hash))
      || value.planningReview.verdict !== 'approved' || !/^[a-f0-9]{64}$/.test(value.planningReview.inputHash)
      || !Number.isFinite(Date.parse(value.planningReview.reviewedAt))
      || value.planningReview.contractHash !== experimentContractHash({ behavior: value.behavior, evaluation: value.evaluation }))) {
      throw new Error('Frozen shared planning approval does not match its contracts.');
    }
    parseBehavioralContract(value.behavior, value.acceptance); parseExperimentEvaluationPlan(value.evaluation, value.behavior);
    this.validateDelivery(value.behavior, value.operations); return value;
    });
  }
  async compiled(candidate: Pick<CandidateRecord, 'experimentId' | 'id'>): Promise<CompiledExperimentContracts> {
    return (await this.artifact(candidate)).compiled;
  }
  private async artifact(candidate: Pick<CandidateRecord, 'experimentId' | 'id'>): Promise<CandidateArtifact> {
    return classified('integrity', async () => {
    const value = JSON.parse(await readOrdinary(this.candidatePath(candidate))) as CandidateArtifact;
    if (value.schemaVersion !== 1 || value.experimentId !== candidate.experimentId || value.candidateId !== candidate.id) throw new Error('Candidate host contract identity is invalid.');
    const shared = await this.shared(candidate.experimentId);
    const rebuilt = compileExperimentContracts(shared.behavior, value.compiled.execution, shared.evaluation, shared.acceptance);
    if (experimentContractHash(rebuilt) !== experimentContractHash(value.compiled)) throw new Error('Candidate compiled contract changed.');
    return value;
    });
  }
  async evidence(candidate: Pick<CandidateRecord, 'experimentId' | 'id'>): Promise<ExperimentVerification> {
    return classified('integrity', async () => JSON.parse(await readOrdinary(this.evidencePath(candidate))) as ExperimentVerification);
  }
  async failureEvidence(candidate: Pick<CandidateRecord, 'experimentId' | 'id'>): Promise<ExperimentFailureEvidence> {
    return classified('integrity', async () => {
      const evidence = JSON.parse(await readOrdinary(this.failurePath(candidate))) as ExperimentFailureEvidence;
      if (evidence.schemaVersion !== 1 || evidence.kind !== 'candidate-failure' || evidence.experimentId !== candidate.experimentId || evidence.candidateId !== candidate.id) throw new Error('Failure evidence belongs to another candidate.');
      return evidence;
    });
  }
  private validateDelivery(behavior: BehavioralContract, operations: readonly IntegrationOperation[]) {
    if (!behavior.delivery) throw new Error('Shared behavior requires explicit delivery profiles, network policy and operation IDs.');
    if (behavior.delivery.profiles.length < 2) throw new Error('A comparison requires at least two compatible delivery profiles.');
    const ids = new Set(operations.map(operation => validateIntegrationOperation(operation).id));
    if (behavior.delivery.operationIds.some(id => !ids.has(id))) throw new Error('Shared behavior references an unconfigured external operation.');
  }
  async selectProfiles(shared: SharedPlanResult, registry: ArchitectureProfile[]): Promise<ArchitectureProfile[]> {
    if (!shared.checkpointRef) throw new Error('Shared planning has no private contract reference.');
    const artifact = JSON.parse(await readOrdinary(shared.checkpointRef)) as SharedArtifact;
    this.validateDelivery(artifact.behavior, artifact.operations);
    return registry.filter(profile => artifact.behavior.delivery!.profiles.includes(profile.id as NonNullable<BehavioralContract['delivery']>['profiles'][number]));
  }
  private runtimeGuide(profile: ArchitectureProfile, operations: readonly IntegrationOperation[]) {
    const python = profile.id.startsWith('python'), file = moduleFile(python), adapter = adapterFile(python);
    return `# Frozen runtime adapter\n${profile.instructions}\nImplement ${file} as a module exporting ${python ? 'def invoke(value, context)' : 'async function invoke(input, context)'}. Do not listen on a port, read stdin, launch a server or open network sockets. The host owns HTTP and stdio in the comparison.\nThe public output protocol is behavior-contract.json. The shared core is invoked in a fresh isolated process; the application and tests must call this same module. Browser JavaScript imports app.mjs directly; service UIs POST JSON to /api/invoke.\nUse a custom foundation: {"schemaVersion":1,"templateId":"custom","version":"1.0.0","computePack":"custom","reason":"Host-pinned isolated runtime adapter with a task-specific computational core."}. Include foundation-lock.json, ${file}, ${adapter}, integration-config.json and every application file in runtime.files. Set requiredEnv:[] and command/evaluator args:[]. ${profile.id === 'browser-js' ? 'Use profile browser, entrypoint index.html, evaluator {runtime:"node",entrypoint:"app.mjs",args:[]}.' : `Use profile ${profile.id.endsWith('cli') ? 'cli' : 'service'} and command {runtime:"${python ? 'python' : 'node'}",entrypoint:"${file}",args:[]}. ${profile.id.endsWith('service') ? 'Use healthPath /health and invokePath /api/invoke; include index.html.' : ''}`}\nConfigured operations: ${operations.map(operation => operation.id).join(', ') || 'none'}. Call ${python ? "context['integrations']['invoke']('operation-id', {'body': value})" : "await context.integrations.invoke('operation-id', {body: value})"}; credentials are held by the host. Never generate credentials, environment loading or alternate network clients.\nStandalone startup after source export uses ${python ? 'python3 -I -B' : 'node'} ${adapter} ${profile.id.endsWith('cli') ? '--invoke' : '--serve'} ${file} integration-config.json. Declare required integration environment names in README.md, never values. The adapter handles static files and HTTP after export; browser-js may also be served as static browser assets.\nThe host owns ${adapter}, integration-config.json, runtime-guide.md and memory-context.md. Never edit them. Do not implement source during planning.\n`;
  }
  private makeWorker<Result>(context: SharedPlannerContext, scoped: ScopedWorkflow, result: (project: Project) => Promise<Result>): ExperimentWorker<Result> {
    scoped.classifyFailure = error => error instanceof ExperimentWorkerFailure ? error.classification : this.options.classifyFailure?.(error) ?? 'infrastructure';
    const repository = new ScopedRunStore(this.options.root, context.project, { ...context.modelConfig, rememberKey: false }, context.saveProjection);
    const backend = new FleetBackend(repository, this.options.executable, this.options.notify ?? (() => {}), this.options.resourcesRoot,
      { scoped, codex: this.options.codex, createSession: this.options.createSession, createCodexSession: this.options.createCodexSession });
    backend.runtime = this.options.runtime;
    const project = () => repository.project(context.project.id);
    let done: Promise<void> = Promise.resolve();
    const invoke = async (resume: boolean) => {
      context.signal.throwIfAborted();
      if (resume) await backend.resume(context.project.id); else await backend.start(context.project.id);
      done = backend.active.get(context.project.id)?.done ?? Promise.resolve();
    };
    return { start: () => invoke(false), resume: () => invoke(true), stop: () => backend.stop(context.project.id), wait: () => done,
      result: async () => { await done; await repository.save(); return result(project()); } };
  }
  async sharedPlanner(context: SharedPlannerContext): Promise<ExperimentWorker<SharedPlanResult>> {
    const operationPath = path.join(this.directory(context.experiment.id), 'operations.json');
    const operations = await exists(operationPath) ? JSON.parse(await readOrdinary(operationPath)) as IntegrationOperation[]
      : (await this.options.operations()).map(validateIntegrationOperation);
    await immutableFile(operationPath, operations);
    const available = experimentContractBody(exportIntegrationOperations(operations));
    const guide = behavioralContractGuide + '\n\nRequired delivery: {profiles:[at least two compatible IDs from browser-js,node-service,python-service,node-cli,python-cli],network:"offline"|"configured-services",operationIds:[]}. Choose according to the brief. Browser surface permits browser-js/node-service/python-service; CLI permits node-cli/python-cli. Configured services exclude browser-js. Select only IDs in available-operations.json; offline requires no operations. Do not put external endpoint credentials or evaluation answers into public files. Preserve scope.md, research.md and prepared data.\n';
    let frozen: SharedArtifact | undefined;
    const scoped: ScopedWorkflow = { stopAfterPlan: true, budget: { totalLimitMs, phaseLimitMs },
      initialize: async project => {
        await writePublic(project.workspace!, 'experiment-guide.md', guide); await writePublic(project.workspace!, 'available-operations.json', available);
        return { context: 'Shared architecture-neutral planning. Read experiment-guide.md and available-operations.json. Do not select a runtime foundation or write an implementation.' };
      },
      immutablePaths: stage => ['.fleet', 'requirements.md', 'inputs', 'experiment-guide.md', 'available-operations.json', ...(stage === 'plan' ? ['scope.md', 'research.md', 'data'] : [])],
      plan: async ({ project, acceptance, signal, agent, review }) => {
        // The host commit precedes the workflow checkpoint. Recovery must not ask a
        // new model session to replace already frozen answers in that crash window.
        if (await exists(this.sharedPath(context.experiment.id))) {
          frozen = await this.shared(context.experiment.id);
          if (frozen.workspace !== project.workspace || experimentContractHash(frozen.acceptance) !== experimentContractHash(acceptance)) throw new Error('Frozen shared plan belongs to another workspace or brief.');
          for (const [file, body] of Object.entries(frozen.seed)) if (await readOrdinary(path.join(project.workspace!, file), 2_000_000) !== body) throw new Error('Shared planning modified frozen input: ' + file);
          if (experimentContractHash(JSON.parse(await readOrdinary(path.join(project.workspace!, 'behavior-contract.json')))) !== frozen.behaviorHash) throw new Error('Frozen shared behavior changed.');
          const evaluationFile = path.join(project.workspace!, 'evaluation-plan.json');
          if (await exists(evaluationFile)) {
            if (experimentContractHash(JSON.parse(await readOrdinary(evaluationFile))) !== frozen.evaluationSetHash) throw new Error('Frozen evaluation answers changed.');
            await fs.rm(evaluationFile);
          }
          return {};
        }
        const checkpoint = await readRunCheckpoint(this.options.root, project), data = checkpoint.data;
        const seed: Record<string, string> = {};
        for (const file of ['scope.md', 'research.md', ...data.files]) seed[file] = await readOrdinary(path.join(project.workspace!, file), 2_000_000);
        const phase = structuredClone(project.phasePlan!.find(phase => phase.id === 'plan')!);
        phase.role = 'Shared behavioral contract planner'; phase.tools = []; phase.outputs = ['behavior-contract.json', 'evaluation-plan.json'];
        const progressPath = path.join(this.directory(context.experiment.id), 'planning-review-state.json');
        const identity = { schemaVersion: 1 as const, experimentId: context.experiment.id, runId: project.runId!, workspace: project.workspace!, acceptanceHash: experimentContractHash(acceptance) };
        let progress: SharedPlanningProgress | undefined;
        if (await exists(progressPath)) {
          progress = await classified('integrity', async () => {
            const value = JSON.parse(await readOrdinary(progressPath, 500_000)) as SharedPlanningProgress, verdict = value.review;
            if (Object.entries(identity).some(([key, item]) => value[key as keyof SharedPlanningProgress] !== item)
              || !['reviewing', 'revision', 'rereview', 'rejected', 'approved'].includes(value.phase) || typeof value.revisionUsed !== 'boolean'
              || (verdict !== undefined && (!verdict || verdict.reviewerVersion !== 1 || !/^[a-f0-9]{64}$/.test(verdict.inputHash)
                || (verdict.preparedDataHash !== undefined && !/^[a-f0-9]{64}$/.test(verdict.preparedDataHash))
                || !/^[a-f0-9]{64}$/.test(verdict.contractHash) || !Number.isFinite(Date.parse(verdict.reviewedAt)) || !['approved', 'revise'].includes(verdict.verdict)))
              || (value.phase === 'reviewing' && (value.revisionUsed || verdict !== undefined))
              || (['revision', 'rereview', 'rejected'].includes(value.phase) && (!value.revisionUsed || verdict?.verdict !== 'revise'))
              || (value.phase === 'approved' && verdict?.verdict !== 'approved')) throw new Error('Invalid shared planning review recovery state.');
            return value;
          });
        }
        // Keep the persisted guide stable so older interrupted/frozen runs can resume.
        // Current planning requirements belong in this new-plan prompt only.
        const recoveryInstruction = 'Every recovery scenario must act to induce a failure, observe it with expectVisible, expectText or expectValue, then perform a later input/correction, activation, check, reload or download retry and verify a literal success with expectText, expectValue or expectDownload.text. A content-checked download may combine retry and final outcome. Opening help or observing an error alone is insufficient. Use a real failure observation and independent successful result; the host checks sequence structure, not semantic truth.';
        const validatePlan = async () => classified('implementation', async () => {
          const behavior = parsePlannedBehavioralContract(JSON.parse(await readOrdinary(path.join(project.workspace!, 'behavior-contract.json'), 2_000_000)), acceptance);
          this.validateDelivery(behavior, operations);
          const evaluation = parseExperimentEvaluationPlan(JSON.parse(await readOrdinary(path.join(project.workspace!, 'evaluation-plan.json'), 2_000_000)), behavior);
          for (const [file, body] of Object.entries(seed)) if (await readOrdinary(path.join(project.workspace!, file), 2_000_000) !== body) throw new ExperimentWorkerFailure('integrity', 'Shared planning modified frozen input: ' + file);
          const packet = JSON.parse(await readOrdinary(path.join(project.workspace!, '.fleet/packet.json')));
          const taskFamily = String(packet.recipe?.id ?? behavior.capabilities.map(item => item.kind).sort().join('-')).replace(/[^a-zA-Z0-9_.:-]/g, '-').slice(0, 120);
          frozen = { schemaVersion: 1, experimentId: context.experiment.id, behavior, evaluation, acceptance: structuredClone(acceptance), data, seed,
            operations: operations.filter(operation => behavior.delivery!.operationIds.includes(operation.id)), behaviorHash: experimentContractHash(behavior),
            evaluationSetHash: experimentContractHash(evaluation), taskFamily, workspace: project.workspace! };
        });
        if (!progress) {
          await agent(guide + '\n\n' + recoveryInstruction, phase.outputs, phase, validatePlan);
          progress = { ...identity, phase: 'reviewing', revisionUsed: false };
          await savePlanningProgress(progressPath, progress, signal);
        }
        for (;;) {
          signal.throwIfAborted();
          // Older runs paused after one correction. Continue their trusted feedback
          // in place, persisting the pending revision before dispatching an agent.
          if (progress.phase === 'rejected') {
            progress = { ...progress, phase: 'revision' };
            await savePlanningProgress(progressPath, progress, signal);
          }
          if (progress.phase === 'revision') {
            await agent(guide + '\n\n' + recoveryInstruction
              + '\n\nRevise behavior-contract.json and evaluation-plan.json to address every independent planning finding below. Planning continues through corrections and fresh independent reviews until approved within the existing execution budget, superseding any former revision-count limit in saved phase or packet guidance; an interrupted revision continues from the existing files. Preserve the original user requirements, prepared data and justified integration limits. Strengthen minimum useful scope, public invocation rules, independent cases and recovery consistently. Do not implement source, choose a candidate architecture, lower success standards or copy evaluation answers into public files. A fresh independent reviewer will assess the revised shared plan before it can freeze. Review feedback (private data):\n'
              + JSON.stringify(progress.review), phase.outputs, phase, validatePlan);
            signal.throwIfAborted();
            progress = { ...progress, phase: 'rereview' };
            await savePlanningProgress(progressPath, progress, signal);
          }
          await validatePlan();
          if (!frozen) throw new Error('Shared planning did not produce valid contracts for independent review.');
          // An already-saved legacy approval keeps its original review identity on recovery.
          const reviewData = progress.phase === 'approved' && progress.review?.preparedDataHash === undefined ? undefined : data;
          const snapshot = await createSharedPlanningReviewSnapshot(project.workspace!, acceptance, frozen.behavior, frozen.evaluation, reviewData);
          const verdict: PlanningReviewRecord = progress.phase === 'approved' ? progress.review! : await review(snapshot);
          if (verdict.inputHash !== snapshot.hash || verdict.contractHash !== snapshot.contractHash
            || verdict.preparedDataHash !== snapshot.data?.hash) throw new ExperimentWorkerFailure('integrity', 'Shared planning approval does not match the current planning inputs.');
          await classified('integrity', () => assertSharedPlanningReviewSnapshot(project.workspace!, snapshot));
          signal.throwIfAborted();
          if (verdict.verdict === 'approved') {
            progress = { ...progress, phase: 'approved', review: verdict };
            await savePlanningProgress(progressPath, progress, signal);
            frozen.planningReview = verdict;
            await classified('integrity', () => assertSharedPlanningReviewSnapshot(project.workspace!, snapshot));
            break;
          }
          // Every actionable verdict schedules another correction. The enclosing
          // phase lease still bounds all cycles and survives restart.
          progress = { ...progress, phase: 'revision', revisionUsed: true, review: verdict };
          await savePlanningProgress(progressPath, progress, signal);
        }
        if (!frozen) throw new Error('Shared planning did not produce valid frozen contracts.');
        signal.throwIfAborted();
        await immutableFile(this.sharedPath(context.experiment.id), frozen);
        await fs.rm(path.join(project.workspace!, 'evaluation-plan.json'));
        return {};
      },
      assertInputs: async project => classified('integrity', async () => {
        if (await readOrdinary(path.join(project.workspace!, 'experiment-guide.md')) !== guide || await readOrdinary(path.join(project.workspace!, 'available-operations.json')) !== available) throw new Error('Shared planning guidance changed.');
      }),
    };
    return this.makeWorker(context, scoped, async project => {
      if (project.status !== 'review') throw new ExperimentWorkerFailure(project.executionFailure === 'integrity' ? 'integrity' : project.executionFailure === 'implementation' ? 'implementation' : 'infrastructure', project.error ?? 'Shared planning did not complete.');
      const artifact = await this.shared(context.experiment.id);
      return { workspace: artifact.workspace, objectiveHash: artifact.behaviorHash, taskFamily: artifact.taskFamily,
        runtimeConstraints: [artifact.behavior.surface, artifact.behavior.delivery!.network, `operations-${experimentContractHash(artifact.operations)}`],
        budgetTier: 'candidate-90m-phase-30m', checkpointRef: this.sharedPath(context.experiment.id) };
    });
  }
  async candidateWorker(context: CandidateWorkerContext): Promise<ExperimentWorker<CandidateOutcome>> {
    const shared = await this.shared(context.experiment.id), python = context.profile.id.startsWith('python'), adapter = adapterFile(python);
    if (!shared.behavior.delivery!.profiles.includes(context.profile.id as NonNullable<BehavioralContract['delivery']>['profiles'][number])) throw new Error('Candidate architecture is not allowed by the frozen delivery contract.');
    const seedPath = path.join(this.directory(context.experiment.id), key(context.candidate.id) + '-seed.json');
    let seed: Record<string, string>;
    if (await exists(seedPath)) seed = JSON.parse(await readOrdinary(seedPath));
    else {
      const adapterBody = await readOrdinary(path.join(this.options.resourcesRoot, 'templates', adapter).replace(/\.asar([\\/])/, '.asar.unpacked$1'));
      seed = { ...shared.seed, 'behavior-contract.json': experimentContractBody(shared.behavior), [adapter]: adapterBody,
        'runtime-guide.md': this.runtimeGuide(context.profile, shared.operations), 'memory-context.md': context.memory?.text ?? '' };
      await immutableFile(seedPath, seed);
    }
    let compiled: CompiledExperimentContracts | undefined;
    if (await exists(this.candidatePath(context.candidate))) compiled = await this.compiled(context.candidate);
    const integrations = () => this.options.integrations(context.candidate.id, structuredClone(shared.operations));
    const prepareRuntime = isolatedRuntimeFactory({ integrations });
    const assertSeed = async (project: Project) => classified('integrity', async () => {
      for (const [file, body] of Object.entries(seed)) if (await readOrdinary(path.join(project.workspace!, file), 2_000_000) !== body) throw new Error('Frozen candidate seed changed: ' + file);
      if (await exists(path.join(project.workspace!, 'evaluation-plan.json'))) throw new Error('Reference answers cannot enter a candidate workspace.');
      if (compiled) {
        await assertExperimentContracts(project.workspace!, compiled);
        const artifact = await this.artifact(context.candidate);
        for (const [file, body] of Object.entries(artifact.immutable)) if (await readOrdinary(path.join(project.workspace!, file), 2_000_000) !== body) throw new Error('Frozen runtime adapter changed: ' + file);
      }
    });
    const scoped: ScopedWorkflow = { startAt: 'plan', budget: { totalLimitMs: context.profile.budget.timeoutMs, phaseLimitMs }, prepareRuntime,
      verification: { prepareRuntime, verifyTests: verifyIsolatedWorkspace, isolateNetwork: true },
      initialize: async project => {
        for (const [file, body] of Object.entries(seed)) await writePublic(project.workspace!, file, body);
        await assertBriefDataIntegrity(project.workspace!, shared.data);
        return { data: structuredClone(shared.data), context: 'This candidate starts after shared intake and research. Read behavior-contract.json, runtime-guide.md and memory-context.md. Architecture: ' + context.profile.id + '@' + context.profile.version + '. ' + this.runtimeGuide(context.profile, shared.operations) };
      },
      immutablePaths: stage => ['.fleet', 'requirements.md', ...Object.keys(seed), 'integration-config.json',
        ...(['build', 'verify'].includes(stage) ? ['execution-contract.json', 'solution-contract.json', 'acceptance-plan.json', 'ux-spec.json', 'foundation-plan.json', 'foundation-lock.json', 'system-design.json'] : [])],
      assertInputs: assertSeed,
      plan: async ({ project, acceptance, agent }) => {
        if (experimentContractHash(acceptance) !== experimentContractHash(shared.acceptance)) throw new Error('Candidate acceptance differs from shared acceptance.');
        if (compiled && await exists(this.candidatePath(context.candidate))) {
          await assertSeed(project);
          if (!project.systemDesign || experimentContractHash(project.systemDesign.definition) !== experimentContractHash(compiled.execution.systemDesign)) throw new Error('Frozen candidate system design changed.');
          return { quality: compiled.quality, foundationPlan: compiled.bodies.foundation };
        }
        const phase = structuredClone(project.phasePlan!.find(phase => phase.id === 'plan')!);
        phase.outputs = ['execution-contract.json', 'plan.md', 'test-matrix.md', 'system-design.json'];
        await agent(candidateExecutionGuide(shared.behaviorHash, context.profile.id) + '\n\n' + this.runtimeGuide(context.profile, shared.operations)
          + '\nPublish the same systemDesign using fleet_system_design before completing this candidate plan.', phase.outputs, phase, async () => classified('implementation', async () => {
          const execution = parsePlannedCandidateExecutionContract(JSON.parse(await readOrdinary(path.join(project.workspace!, 'execution-contract.json'), 2_000_000)), shared.behavior, acceptance);
          this.assertArchitecture(context.profile, execution);
          if (!project.systemDesign || experimentContractHash(project.systemDesign.definition) !== experimentContractHash(execution.systemDesign)) throw new Error('Publish exactly the execution contract systemDesign using fleet_system_design.');
          compiled = compileExperimentContracts(shared.behavior, execution, shared.evaluation, acceptance);
        }), true);
        if (!compiled) throw new Error('Candidate planning did not produce a valid execution contract.');
        const staticFiles = compiled.execution.runtime.files.filter(file => !/\.cjs$/i.test(file) && !file.startsWith('runtime-broker/'));
        const integrationConfig = experimentContractBody({ operations: exportIntegrationOperations(shared.operations), ...(shared.behavior.surface === 'browser' ? { static: { root: '.', files: staticFiles, index: 'index.html' } } : {}) });
        await writePublic(project.workspace!, 'integration-config.json', integrationConfig);
        await materializeExperimentContracts(project.workspace!, compiled);
        await immutableFile(this.candidatePath(context.candidate), { schemaVersion: 1, experimentId: context.experiment.id, candidateId: context.candidate.id,
          profileId: context.profile.id, profileVersion: context.profile.version, compiled, immutable: { [adapter]: seed[adapter], 'integration-config.json': integrationConfig } } satisfies CandidateArtifact);
        return { quality: compiled.quality, foundationPlan: compiled.bodies.foundation };
      },
      decorateReport: async (project, report) => {
        compiled ??= await this.compiled(context.candidate);
        if (!report.quality) throw new Error('Experimental verification requires a quality report.');
        report.quality.schemaVersion = 4; report.quality.experiment = { experimentId: context.experiment.id, candidateId: context.candidate.id,
          behaviorHash: compiled.behaviorHash, evaluationSetHash: compiled.evaluationSetHash, executionHash: compiled.executionHash };
        project.qualityVersion = 4;
      },
    };
    return this.makeWorker(context, scoped, async project => {
      if (project.executionFailure === 'infrastructure' || project.executionFailure === 'integrity') throw new ExperimentWorkerFailure(project.executionFailure, project.error ?? 'Experimental execution was interrupted.');
      const checkpoint = await readRunCheckpoint(this.options.root, project);
      const repairCount = functionalRepairAttempts(checkpoint.functionalRepair, checkpoint.repairUsed);
      const budget = checkpoint.executionBudget;
      const withinBudget = !!budget && project.executionFailure !== 'budget' && budget.consumedMs <= budget.totalLimitMs;
      const report = project.report;
      compiled ??= await exists(this.candidatePath(context.candidate)) ? await this.compiled(context.candidate) : undefined;
      let evidenceHash: string | undefined, source: string | undefined, mandatoryPassed = false;
      if (compiled && report) {
        const evidence: ExperimentVerification = { schemaVersion: 1, experimentId: context.experiment.id, candidateId: context.candidate.id, identity: experimentContractIdentity(compiled), report };
        mandatoryPassed = project.status === 'review' && experimentVerificationPassed(evidence, compiled, { experimentId: context.experiment.id, candidateId: context.candidate.id });
        if (mandatoryPassed) await assertExperimentCandidateVerified(project.workspace!, evidence, compiled, { experimentId: context.experiment.id, candidateId: context.candidate.id });
        await immutableFile(this.evidencePath(context.candidate), evidence); evidenceHash = experimentContractHash(evidence); source = report.sourceHash;
      } else if (project.workspace) source = await sourceHash(project.workspace);
      const requiredScopePassed = !!compiled && !!report?.quality
        && compiled.behavior.criteria.filter(criterion => criterion.disposition === 'implemented').every(criterion => report.quality!.criteria.some(result => result.criterionId === criterion.criterionId && result.status === 'passed'))
        && compiled.behavior.capabilities.filter(capability => capability.required).every(capability => report.quality!.capabilities?.some(result => result.id === capability.id && result.status === 'passed'));
      const terminalReason = project.status === 'stopped' ? 'cancelled' : !withinBudget ? 'timeout' : mandatoryPassed ? 'completed' : report ? 'verification-failed' : 'build-failed';
      if (!evidenceHash && source && ['timeout', 'build-failed', 'verification-failed'].includes(terminalReason)) {
        const evidence: ExperimentFailureEvidence = { schemaVersion: 1, kind: 'candidate-failure', experimentId: context.experiment.id,
          candidateId: context.candidate.id, profileId: context.profile.id, profileVersion: context.profile.version, runId: project.runId!, sourceHash: source,
          identity: compiled ? experimentContractIdentity(compiled) : { behaviorHash: shared.behaviorHash, evaluationSetHash: shared.evaluationSetHash },
          failure: { classification: terminalReason === 'timeout' ? 'budget' : 'implementation', terminalReason: terminalReason as ExperimentFailureEvidence['failure']['terminalReason'], stage: checkpoint.stage },
          ...(budget ? { budget: structuredClone(budget) } : {}), ...(checkpoint.coreReportHash ? { coreReportHash: checkpoint.coreReportHash } : {}),
          repairCount, evaluatorVersion: 'experiment-host-v4' };
        await immutableFile(this.failurePath(context.candidate), evidence); evidenceHash = experimentContractHash(evidence);
      }
      return { mandatoryPassed, requiredScopePassed, withinBudget,
        terminalReason,
        durationMs: budget?.consumedMs ?? 0, costUsd: null, repairCount, sourceHash: source,
        contractHash: compiled?.qualityContractHash, evidenceHash, evaluatorVersion: 'experiment-host-v4', recordedAt: new Date().toISOString() };
    });
  }
  private assertArchitecture(profile: ArchitectureProfile, execution: CompiledExperimentContracts['execution']) {
    const python = profile.id.startsWith('python'), expectedRuntime = python ? 'python' : 'node';
    const expectedProfile = profile.id === 'browser-js' ? 'browser' : profile.id.endsWith('cli') ? 'cli' : 'service';
    const command = execution.runtime.profile === 'browser' ? execution.runtime.evaluator : execution.runtime.command;
    if (execution.architectureId !== profile.id || execution.runtime.profile !== expectedProfile || command?.runtime !== expectedRuntime
      || command.entrypoint !== moduleFile(python) || command.args.length || execution.runtime.requiredEnv.length
      || execution.foundation.templateId !== 'custom' || execution.foundation.computePack !== 'custom') throw new Error('Execution does not match the assigned isolated architecture profile.');
    if (execution.runtime.files.includes('memory-context.md')) throw new Error('Private learning guidance cannot be a delivered runtime file.');
    for (const file of [moduleFile(python), adapterFile(python), 'integration-config.json', 'foundation-lock.json', ...(expectedProfile === 'cli' ? [] : ['index.html'])])
      if (!execution.runtime.files.includes(file)) throw new Error('Execution manifest is missing required adapter/application file: ' + file);
    if (expectedProfile === 'service' && (execution.runtime.healthPath !== '/health' || execution.runtime.invokePath !== '/api/invoke')) throw new Error('Isolated service profiles use /health and /api/invoke.');
  }
  async verifyCandidate(candidate: CandidateRecord): Promise<void> {
    if (candidateSucceeded(candidate.outcome) !== true) throw new Error('Only a candidate with passing host gates within budget has verified runtime evidence.');
    if (!candidate.workspace || !candidate.outcome?.sourceHash || !candidate.outcome.evidenceHash) throw new Error('Candidate has no frozen verified runtime evidence.');
    const artifact = await this.artifact(candidate), evidence = await this.evidence(candidate);
    if (artifact.profileId !== candidate.profileId || artifact.profileVersion !== candidate.profileVersion || experimentContractHash(evidence) !== candidate.outcome.evidenceHash
      || evidence.report.sourceHash !== candidate.outcome.sourceHash || artifact.compiled.qualityContractHash !== candidate.outcome.contractHash) throw new Error('Candidate evidence does not match this saved architecture outcome.');
    await assertExperimentCandidateVerified(candidate.workspace, evidence, artifact.compiled, { experimentId: candidate.experimentId, candidateId: candidate.id });
    for (const [file, body] of Object.entries(artifact.immutable)) if (await readOrdinary(path.join(candidate.workspace, file), 2_000_000) !== body) throw new Error('Frozen runtime adapter changed.');
  }
  async preview(candidate: CandidateRecord, embeddingOrigin?: string) {
    await this.verifyCandidate(candidate);
    const compiled = await this.compiled(candidate); if (compiled.execution.runtime.profile === 'cli') return undefined;
    const shared = await this.shared(candidate.experimentId);
    return isolatedRuntimeFactory({ integrations: () => this.options.integrations(candidate.id, structuredClone(shared.operations)), embeddingOrigin })(candidate.workspace!, compiled.execution.runtime, this.options.executable,
      undefined, { totalTimeoutMs: 30 * 60_000 });
  }
}
