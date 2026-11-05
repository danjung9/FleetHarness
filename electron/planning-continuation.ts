import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { Project } from '../shared/types.js';
import { normalizeDataInputs } from '../shared/project-input.js';
import { assertFleetPacketIntegrity } from '../harness/integration.js';
import { assertBriefDataIntegrity, syntheticDataFiles, type BriefDataSnapshot } from './brief-data.js';
import { briefFingerprint, readPlanningContinuationCheckpoint, validatePriorClarifications, type RunCheckpoint } from './run-checkpoint.js';

const requiredArtifacts = ['scope.md', 'research.md'];
const planningArtifacts = ['plan.md', 'test-matrix.md', 'system-design.json', 'foundation-plan.json',
  'acceptance-plan.json', 'ux-spec.json', 'solution-contract.json', 'evaluation-plan.json'];
const maxFileBytes = 2 * 1024 * 1024;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const sameInventory = (left: string[], right: string[]) => left.length === right.length
  && new Set(left).size === left.length && left.every(file => right.includes(file));

/** Keep inherited answers and this attempt's answers as exact, deduplicated host bodies. */
export function getPlanningContinuationClarifications(source: Pick<RunCheckpoint, 'priorClarifications' | 'clarifications'>): string[] {
  validatePriorClarifications(source.priorClarifications);
  const history = [...new Set([...(source.priorClarifications ?? []),
    ...(source.clarifications === undefined ? [] : [source.clarifications])])];
  validatePriorClarifications(history);
  return history;
}

/** Read only bounded ordinary files; neither intermediate nor final links may be followed. */
async function readFile(workspace: string, relative: string) {
  if (!relative || path.isAbsolute(relative) || relative.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error('Invalid planning continuation artifact path.');
  }
  const root = await fs.lstat(workspace);
  if (!root.isDirectory() || root.isSymbolicLink()) throw new Error('Planning continuation requires an ordinary workspace directory.');
  const parts = relative.split('/');
  for (let index = 1; index < parts.length; index++) {
    const stat = await fs.lstat(path.join(workspace, ...parts.slice(0, index)));
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Planning continuation cannot copy linked directories.');
  }
  const target = path.join(workspace, relative), original = await fs.lstat(target);
  if (!original.isFile() || original.isSymbolicLink()) throw new Error('Planning continuation requires ordinary files: ' + relative);
  const file = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maxFileBytes) throw new Error('Planning continuation requires bounded ordinary files: ' + relative);
    const bytes = Buffer.alloc(maxFileBytes + 1);
    let length = 0;
    while (length < bytes.length) {
      const result = await file.read(bytes, length, bytes.length - length, null);
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    if (length > maxFileBytes) throw new Error('Planning continuation artifact exceeds its size limit: ' + relative);
    return bytes.subarray(0, length);
  } finally { await file.close(); }
}

function assertDataInventory(data: BriefDataSnapshot) {
  if (!data || !['provided', 'synthetic'].includes(data.mode) || !/^[a-f0-9]{64}$/.test(data.hash)
    || !Array.isArray(data.files) || !data.files.length || data.files.length > 11
    || new Set(data.files).size !== data.files.length || !data.files.includes('inputs/manifest.json')
    || data.files.some(file => typeof file !== 'string' || !syntheticDataFiles.includes(file)
      && !/^inputs\/[^/\\\u0000-\u001f]+$/.test(file))) {
    throw new Error('Planning continuation has an invalid prepared data inventory.');
  }
}

async function assertSource(source: RunCheckpoint) {
  if (source.stage !== 'plan' || source.quality !== undefined || source.foundation !== undefined
    || source.foundationPlan !== undefined || source.coreReportHash !== undefined
    || source.modelConfig !== undefined || source.executionBudget !== undefined
    || source.planningReview?.phase === 'approved') {
    throw new Error('Only ordinary, unfrozen planning artifacts can be copied into a continuation.');
  }
  getPlanningContinuationClarifications(source);
  assertDataInventory(source.data);
  await assertFleetPacketIntegrity(source.workspace, source.packetHash);
  if (!(await readFile(source.workspace, 'requirements.md')).equals(Buffer.from(source.requirements))) {
    throw new Error('The original requirements changed; planning continuation cannot reuse this workspace.');
  }
  if (source.clarifications !== undefined
    && !(await readFile(source.workspace, 'clarifications.json')).equals(Buffer.from(source.clarifications))) {
    throw new Error('The original clarification answers changed; planning continuation cannot reuse them.');
  }
  await assertBriefDataIntegrity(source.workspace, source.data);
  for (const name of requiredArtifacts) {
    if (!(await readFile(source.workspace, name)).toString('utf8').trim()) {
      throw new Error('Planning continuation requires completed intake and research: ' + name);
    }
  }
}

/** Validate old planning evidence independently of the newly saved brief. Never modifies its source. */
export async function readPlanningContinuation(root: string, project: Project): Promise<RunCheckpoint> {
  if (!['draft', 'failed', 'stopped'].includes(project.status) || project.approvedAt) {
    throw new Error('Planning can continue only from an idle, unapproved build.');
  }
  const source = await readPlanningContinuationCheckpoint(root, project);
  try {
    await fs.lstat(path.join(root, 'evaluations', source.runId + '.json'));
    throw new Error('A sealed host evaluation cannot be reused for a revised planning brief.');
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await assertSource(source);
  const packet = JSON.parse((await readFile(source.workspace, '.fleet/packet.json')).toString('utf8'));
  const manifest = JSON.parse((await readFile(source.workspace, 'inputs/manifest.json')).toString('utf8'));
  const inputs = normalizeDataInputs(project.dataInputs);
  if (!object(manifest) || manifest.version !== 1 || manifest.mode !== source.data.mode || !Array.isArray(manifest.sources)
    || manifest.sources.length !== inputs.length || (source.data.mode === 'provided') !== (inputs.length > 0)) {
    throw new Error('Attached inputs changed; planning continuation requires the original input data.');
  }
  const expectedFiles = ['inputs/manifest.json'];
  for (const [index, input] of inputs.entries()) {
    const entry = manifest.sources[index];
    if (!object(entry) || entry.name !== input.name || entry.kind !== input.kind || typeof entry.path !== 'string'
      || !/^inputs\/[^/\\\u0000-\u001f]+$/.test(entry.path) || entry.path === 'inputs/manifest.json'
      || entry.bytes !== Buffer.byteLength(input.content, 'utf8')
      || !(await readFile(source.workspace, entry.path)).equals(Buffer.from(input.content, 'utf8'))) {
      throw new Error('Attached input names, kinds, order or bytes changed; retain the original data to continue planning.');
    }
    expectedFiles.push(entry.path);
  }
  if (source.data.mode === 'synthetic') expectedFiles.push(...syntheticDataFiles);
  if (!sameInventory(source.data.files, expectedFiles)) throw new Error('Planning continuation requires the complete original prepared data.');
  const userScope = packet?.userScope;
  if (!object(packet?.challenge) || !object(userScope)
    || typeof userScope.title !== 'string' || typeof userScope.description !== 'string'
    || !Array.isArray(userScope.criteria) || userScope.criteria.some(item => typeof item !== 'string')
    || ['inputs', 'outputs', 'resources'].some(field => userScope[field] !== undefined && typeof userScope[field] !== 'string')
    || userScope.links !== undefined && (!Array.isArray(userScope.links) || userScope.links.some(item => typeof item !== 'string'))) {
    throw new Error('The original planning packet is incomplete.');
  }
  const originalChallengeId = packet.challenge.id === 'custom' && packet.challenge.sourceScope === 'user'
    ? undefined : packet.challenge.id;
  if (project.challengeId !== originalChallengeId
    || project.sourceChallenge !== undefined && !isDeepStrictEqual(project.sourceChallenge, packet.challenge)) {
    throw new Error('The source challenge changed; completed intake and research cannot be reused.');
  }
  // Reconstruct the original brief from authenticated packet bytes and prepared inputs.
  // Its fingerprint also detects adding/removing an original sourceChallenge snapshot.
  const original = { ...project, title: userScope.title, description: userScope.description,
    criteria: userScope.criteria, inputs: userScope.inputs ?? '', outputs: userScope.outputs ?? '',
    resources: userScope.resources ?? '', links: userScope.links ?? [], dataInputs: inputs,
    sourceChallenge: project.sourceChallenge === undefined ? undefined : packet.challenge } as Project;
  if (briefFingerprint(original) !== source.briefHash) {
    throw new Error('The original brief or source challenge does not match its trusted planning checkpoint.');
  }
  await assertSource(source);
  return source;
}

/** Seed a separate empty workspace with prior work, without carrying approval or runtime evidence. */
export async function copyPlanningContinuation(source: RunCheckpoint, destination: string): Promise<BriefDataSnapshot> {
  await assertSource(source);
  const target = await fs.lstat(destination);
  if (!target.isDirectory() || target.isSymbolicLink() || (await fs.readdir(destination)).length) {
    throw new Error('Planning continuation needs an empty ordinary destination workspace.');
  }
  const [from, to] = await Promise.all([fs.realpath(source.workspace), fs.realpath(destination)]);
  if (from === to || to.startsWith(from + path.sep) || from.startsWith(to + path.sep)) {
    throw new Error('Planning continuation must preserve its original workspace separately.');
  }
  const captured = new Map<string, Buffer>();
  for (const file of [...source.data.files, ...requiredArtifacts, ...planningArtifacts]) {
    try { captured.set(file, await readFile(source.workspace, file)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || !planningArtifacts.includes(file)) throw error; }
  }
  await assertSource(source);
  for (const [file, bytes] of captured) {
    await fs.mkdir(path.dirname(path.join(destination, file)), { recursive: true, mode: 0o700 });
    await fs.writeFile(path.join(destination, file), bytes, { flag: 'wx', mode: 0o600 });
  }
  await assertBriefDataIntegrity(destination, source.data);
  await assertSource(source);
  return structuredClone(source.data);
}
