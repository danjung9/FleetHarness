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
  foundation?: FoundationSnapshot;
  foundationPlan?: string;
  repairUsed?: boolean;
  clarifications?: string;
  review?: ReviewRecord;
  reviewSourceHash?: string;
  visualReview?: import('../shared/visual-review.js').VisualReviewReport;
}

export function briefFingerprint(project: Project) {
  return createHash('sha256').update(JSON.stringify({ title: project.title, description: project.description,
    criteria: project.criteria, inputs: project.inputs ?? '', outputs: project.outputs ?? '', resources: project.resources ?? '',
    links: project.links ?? [], dataInputs: project.dataInputs ?? [], challengeId: project.challengeId ?? null,
    sourceChallenge: project.sourceChallenge ?? null })).digest('hex');
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

export async function writeRunCheckpoint(root: string, project: Project, checkpoint: RunCheckpoint) {
  const body = JSON.stringify(checkpoint);
  if (Buffer.byteLength(body, 'utf8') > 8 * 1024 * 1024) throw new Error('Run checkpoint exceeded the 8 MB recovery limit. Saved evidence was not replaced.');
  const destination = await checkpointPath(root, project, true);
  await atomicHostWrite(root, path.relative(root, destination), body);
}

export async function readRunCheckpoint(root: string, project: Project): Promise<RunCheckpoint> {
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
    if (checkpoint.briefHash !== briefFingerprint(project)) throw new Error('The brief or attached inputs changed since this build started. Start a new build with the updated requirements.');
    return checkpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('This build has no trusted recovery checkpoint. Its files are preserved; start a new build to continue.');
    throw error;
  } finally { await file?.close(); }
}
