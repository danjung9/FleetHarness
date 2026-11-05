import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { atomicHostWrite } from '../shared/host-files.js';
import type { Project, ReviewRecord, StageId } from '../shared/types.js';
import type { AcceptanceCriterion } from '../harness/types.js';
import type { PhaseContract } from '../harness/phases.js';
import type { FoundationSnapshot } from '../harness/foundations.js';
import type { BriefDataSnapshot } from './brief-data.js';
import type { QualityContract } from './quality.js';
import { validateExecutionBudget } from './execution-budget.js';
import type { PlanningReviewRecord } from './planning-review.js';
import { validateFunctionalRepairState, type FunctionalRepairState } from './functional-repair.js';

/** Each review can request another automatic revision; interruption preserves the pending work. */
export interface PlanningReviewProgress {
  /** rejected is retained for checkpoints saved before automatic review cycling. */
  phase: 'reviewing' | 'revision' | 'rereview' | 'rejected' | 'approved';
  /** Historical marker for saved checkpoint compatibility, not a revision limit. */
  revisionUsed: boolean;
  review?: PlanningReviewRecord;
}

/** Private host state. Never add this body to Project or renderer IPC responses. */
export interface RunCheckpoint {
  version: 1;
  projectId: string;
  runId: string;
  workspace: string;
  briefHash: string;
  stage: StageId;
  context: string;
  phases: PhaseContract[];
  globalTools: string[];
  packetHash: string;
  requirements: string;
  acceptance: AcceptanceCriterion[];
  data: BriefDataSnapshot;
  quality?: QualityContract;
  planningAudit?: import('./independent-judge.js').PlanningAuditRecord;
  planningSnapshot?: { files: [string, string][]; systemDesign?: Project['systemDesign'] };
  planningReview?: PlanningReviewProgress;
  foundation?: FoundationSnapshot;
  foundationPlan?: string;
  repairUsed?: boolean;
  /** Host-owned functional repair allowances persist across interruption and resume. */
  functionalRepair?: FunctionalRepairState;
  coreReportHash?: string;
  workflowReportHash?: string;
  clarifications?: string;
  /** Exact answered-clarification bodies inherited from earlier planning attempts. */
  priorClarifications?: string[];
  review?: ReviewRecord;
  reviewSourceHash?: string;
  visualReview?: import('../shared/visual-review.js').VisualReviewReport;
  answerCorrections?: import('./independent-judge.js').AnswerCorrection[];
  /** Experimental workers preserve their pinned configuration and budget on recovery. */
  executionBudget?: import('./execution-budget.js').ExecutionBudgetState;
  modelConfig?: { backend: import('../shared/types.js').AgentBackend; provider: string; model: string };
}

export const maxPriorClarificationsBytes = 100_000;

/** Historical answers stay bounded, structured data and never reopen old questions. */
export function validatePriorClarifications(value: unknown): asserts value is string[] | undefined {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 64) throw new Error('Invalid prior clarification history in the planning checkpoint.');
  let bytes = 0;
  for (const body of value) {
    if (typeof body !== 'string' || !body.trim()) throw new Error('Invalid prior clarification history in the planning checkpoint.');
    bytes += Buffer.byteLength(body, 'utf8');
    if (bytes > maxPriorClarificationsBytes) throw new Error('Prior clarification history exceeds the 100,000-byte planning continuation limit. Preserve the answers in a reviewed brief before continuing.');
    let parsed: unknown;
    try { parsed = JSON.parse(body); }
    catch { throw new Error('Invalid prior clarification history in the planning checkpoint.'); }
    const record = parsed as { runId?: unknown; scope?: unknown; questions?: unknown } | null;
    if (!record || typeof record !== 'object' || Array.isArray(record)
      || typeof record.runId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(record.runId)
      || typeof record.scope !== 'string' || !record.scope.trim() || !Array.isArray(record.questions)
      || record.questions.length > 12 || record.questions.some(question => !question || typeof question !== 'object'
        || Array.isArray(question) || question.runId !== record.runId || question.status !== 'answered'
        || !['research', 'plan'].includes(question.phase) || typeof question.question !== 'string' || !question.question.trim()
        || typeof question.answer !== 'string' || !question.answer.trim())) {
      throw new Error('Prior clarification history must contain only recorded, answered research or planning questions.');
    }
  }
}

export function briefFingerprint(project: Project) {
  // SQLite persistence sorts object keys. Use the original normalized field
  // order so unchanged attachments retain their existing recovery hashes.
  const dataInputs = (project.dataInputs ?? []).map(({ name, kind, content }) => ({ name, kind, content }));
  return createHash('sha256').update(JSON.stringify({ title: project.title, description: project.description,
    criteria: project.criteria, inputs: project.inputs ?? '', outputs: project.outputs ?? '', resources: project.resources ?? '',
    links: project.links ?? [], dataInputs, challengeId: project.challengeId ?? null,
    sourceChallenge: project.sourceChallenge ?? null, ...(project.connectedData?.length ? { connectedData: project.connectedData.map(({ id, digest, includeInApp }) => ({ id, digest, includeInApp })) } : {}) })).digest('hex');
}

async function checkpointPath(root: string, project: Project, create = false) {
  if (!project.runId || !project.workspace || !/^[a-zA-Z0-9_-]{1,100}$/.test(project.runId)) {
    throw new Error('This build has no recoverable run workspace. Start a new build.');
  }
  const directory = path.join(root, 'run-checkpoints');
  if (create) await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Run checkpoints require an ordinary host directory.');
  const base = await fs.realpath(directory), workspace = await fs.realpath(project.workspace);
  if (base === workspace || base.startsWith(workspace + path.sep)) throw new Error('Run checkpoints must stay outside the agent workspace.');
  return path.join(directory, project.runId + '.json');
}

export async function writeRunCheckpoint(root: string, project: Project, checkpoint: RunCheckpoint, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const body = JSON.stringify(checkpoint);
  if (Buffer.byteLength(body, 'utf8') > 8 * 1024 * 1024) throw new Error('Run checkpoint exceeded the 8 MB recovery limit. Saved evidence was not replaced.');
  const destination = await checkpointPath(root, project, true);
  await atomicHostWrite(root, path.relative(root, destination), body, { signal });
}

export async function readRunCheckpoint(root: string, project: Project): Promise<RunCheckpoint> {
  return readCheckpoint(root, project, false);
}

/** A changed brief may reuse only ordinary planning work that has never been frozen. */
export async function readPlanningContinuationCheckpoint(root: string, project: Project): Promise<RunCheckpoint> {
  return readCheckpoint(root, project, true);
}

async function readCheckpoint(root: string, project: Project, planningContinuation: boolean): Promise<RunCheckpoint> {
  let file: Awaited<ReturnType<typeof fs.open>> | undefined;
  try {
    file = await fs.open(await checkpointPath(root, project), constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('Invalid run checkpoint.');
    const checkpoint = JSON.parse(await file.readFile('utf8')) as RunCheckpoint;
    if (checkpoint.version !== 1 || checkpoint.projectId !== project.id || checkpoint.runId !== project.runId ||
        checkpoint.workspace !== project.workspace || !['intake', 'research', 'plan', 'build', 'verify'].includes(checkpoint.stage) ||
        !checkpoint.packetHash || typeof checkpoint.context !== 'string' || typeof checkpoint.requirements !== 'string' ||
        !Array.isArray(checkpoint.phases) || !Array.isArray(checkpoint.globalTools) || !Array.isArray(checkpoint.acceptance) || !checkpoint.data) {
      throw new Error('The saved run checkpoint does not match this build.');
    }
    if (planningContinuation) {
      if (checkpoint.stage !== 'plan' || checkpoint.quality !== undefined || checkpoint.foundation !== undefined
        || checkpoint.foundationPlan !== undefined || checkpoint.coreReportHash !== undefined || checkpoint.workflowReportHash !== undefined
        || checkpoint.functionalRepair !== undefined
        || checkpoint.modelConfig !== undefined || checkpoint.executionBudget !== undefined
        || checkpoint.planningReview?.phase === 'approved') {
        throw new Error('Only an ordinary, unfrozen planning checkpoint can continue with a revised brief.');
      }
    } else if (checkpoint.briefHash !== briefFingerprint(project)) throw new Error('The brief or attached inputs changed since this build started. Start a new build with the updated requirements.');
    if (checkpoint.executionBudget) validateExecutionBudget(checkpoint.executionBudget);
    if (checkpoint.functionalRepair !== undefined) validateFunctionalRepairState(checkpoint.functionalRepair);
    if (checkpoint.workflowReportHash !== undefined && !/^[a-f0-9]{64}$/.test(checkpoint.workflowReportHash)) throw new Error('Invalid primary workflow checkpoint evidence.');
    if (checkpoint.planningReview !== undefined) {
      const progress = checkpoint.planningReview, review = progress?.review;
      const invalidReview = review !== undefined && (!review || review.reviewerVersion !== 1
        || (review.preparedDataHash !== undefined && (!/^[a-f0-9]{64}$/.test(review.preparedDataHash) || review.preparedDataHash !== checkpoint.data.hash))
        || !/^[a-f0-9]{64}$/.test(review.inputHash) || !/^[a-f0-9]{64}$/.test(review.contractHash)
        || !['approved', 'revise'].includes(review.verdict) || !Number.isFinite(Date.parse(review.reviewedAt)));
      if (!progress || !['reviewing', 'revision', 'rereview', 'rejected', 'approved'].includes(progress.phase)
        || typeof progress.revisionUsed !== 'boolean' || invalidReview
        || (progress.phase === 'reviewing' && (progress.revisionUsed || review !== undefined))
        || (['revision', 'rereview', 'rejected'].includes(progress.phase) && (!progress.revisionUsed || review?.verdict !== 'revise'))
        || (progress.phase === 'approved' && (review?.verdict !== 'approved' || !checkpoint.quality || review.contractHash !== checkpoint.quality.hash))
        || (checkpoint.quality !== undefined && progress.phase !== 'approved')) {
        throw new Error('Invalid independent planning review checkpoint.');
      }
    }
    if (checkpoint.modelConfig && (!['pi', 'codex'].includes(checkpoint.modelConfig.backend)
      || typeof checkpoint.modelConfig.provider !== 'string' || !checkpoint.modelConfig.provider
      || typeof checkpoint.modelConfig.model !== 'string' || !checkpoint.modelConfig.model)) throw new Error('Invalid pinned model configuration.');
    validatePriorClarifications(checkpoint.priorClarifications);
    return checkpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('This build has no trusted recovery checkpoint. Its files are preserved; start a new build to continue.');
    throw error;
  } finally { await file?.close(); }
}
