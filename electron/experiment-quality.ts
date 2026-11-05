import { createHash, randomUUID } from 'node:crypto';
import { constants, promises as fs } from 'node:fs';
import { isUtf8 } from 'node:buffer';
import path from 'node:path';
import type { AcceptanceCriterion } from '../harness/types.js';
import type { BehavioralContract, CandidateExecutionContract, ExperimentContractIdentity } from '../shared/experiment-contract.js';
import type { EvaluationPlan } from '../shared/solution.js';
import type { TestReport } from '../shared/types.js';
import { reportPassed } from '../shared/verification.js';
import { compilePublicContracts, experimentContractBody, experimentContractHash, parseBehavioralContract, parseCandidateExecutionContract, parseExperimentEvaluationPlan } from '../harness/experiment-contract.js';
import { assertQualityContract, verifyApplication, type ApplicationVerificationOptions, type QualityContract } from './quality.js';
import { sourceHash } from './storage.js';

export const experimentPublicFiles = ['behavior-contract.json', 'execution-contract.json', 'solution-contract.json', 'acceptance-plan.json', 'ux-spec.json', 'foundation-plan.json', 'system-design.json'] as const;
export interface CompiledExperimentContracts extends ExperimentContractIdentity {
  behavior: BehavioralContract;
  execution: CandidateExecutionContract;
  /** Private host data: never serialize this object to renderer state or agent context. */
  evaluation: EvaluationPlan;
  quality: QualityContract;
  bodies: { behavior: string; execution: string; solution: string; acceptance: string; ux: string; foundation: string; systemDesign: string };
}
export interface ExperimentVerification {
  schemaVersion: 1;
  experimentId: string;
  candidateId: string;
  identity: ExperimentContractIdentity;
  report: TestReport;
}
export function compileExperimentContracts(behaviorInput: unknown, executionInput: unknown, evaluationInput: unknown, acceptance: AcceptanceCriterion[]): CompiledExperimentContracts {
  const behavior = parseBehavioralContract(behaviorInput, acceptance);
  const execution = parseCandidateExecutionContract(executionInput, behavior, acceptance);
  const evaluation = parseExperimentEvaluationPlan(evaluationInput, behavior);
  const { solution, plan, ux } = compilePublicContracts(behavior, execution);
  const evaluationBody = experimentContractBody(evaluation);
  const bodies = { behavior: experimentContractBody(behavior), execution: experimentContractBody(execution), solution: experimentContractBody(solution),
    acceptance: experimentContractBody(plan), ux: experimentContractBody(ux), foundation: experimentContractBody(execution.foundation), systemDesign: experimentContractBody(execution.systemDesign) };
  // Match quality.ts's existing frozen-contract hash exactly, including the sealed body.
  const names = ['acceptance-plan.json', 'ux-spec.json', 'solution-contract.json', 'evaluation-plan.json'];
  const raw = [bodies.acceptance, bodies.ux, bodies.solution, evaluationBody];
  const qualityContractHash = createHash('sha256').update(raw.map((body, i) => names[i] + '\0' + body).join('\0')).digest('hex');
  const behaviorHash = experimentContractHash(behavior), evaluationSetHash = experimentContractHash(evaluation);
  const executionHash = experimentContractHash({ schemaVersion: 1, behaviorHash, evaluationSetHash, execution });
  return { behavior, execution, evaluation, bodies, behaviorHash, evaluationSetHash, executionHash, qualityContractHash,
    quality: { plan, ux, hash: qualityContractHash, acceptance: structuredClone(acceptance), solution, evaluation, evaluationBody, sealedEvaluation: true } };
}
export function experimentContractIdentity(compiled: CompiledExperimentContracts): ExperimentContractIdentity {
  return { behaviorHash: compiled.behaviorHash, evaluationSetHash: compiled.evaluationSetHash, executionHash: compiled.executionHash, qualityContractHash: compiled.qualityContractHash };
}
function publicBodies(compiled: CompiledExperimentContracts): Record<typeof experimentPublicFiles[number], string> {
  return { 'behavior-contract.json': compiled.bodies.behavior, 'execution-contract.json': compiled.bodies.execution, 'solution-contract.json': compiled.bodies.solution,
    'acceptance-plan.json': compiled.bodies.acceptance, 'ux-spec.json': compiled.bodies.ux, 'foundation-plan.json': compiled.bodies.foundation, 'system-design.json': compiled.bodies.systemDesign };
}
async function ordinaryRoot(root: string): Promise<string> {
  const stat = await fs.lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Experiment workspace must be an ordinary directory.');
  return fs.realpath(root);
}
async function readPublic(root: string, name: string): Promise<string> {
  const file = await fs.open(path.join(root, name), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > 2_000_000) throw new Error('Experiment contract must be a bounded ordinary file: ' + name);
    const bytes = await file.readFile();
    if (!isUtf8(bytes)) throw new Error(`${name} must contain valid UTF-8.`);
    return bytes.toString('utf8');
  } finally { await file.close(); }
}
async function assertNoEvaluation(root: string) {
  try { await fs.lstat(path.join(root, 'evaluation-plan.json')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  throw new Error('Evaluation answer keys must remain outside every candidate workspace.');
}
/** Host-only transition immediately after candidate planning, before any builder starts. */
export async function materializeExperimentContracts(root: string, compiled: CompiledExperimentContracts): Promise<void> {
  const base = await ordinaryRoot(root);
  await assertNoEvaluation(base);
  for (const [name, body] of Object.entries(publicBodies(compiled))) {
    // Planner-authored public JSON is canonicalized once at freeze time. Reject aliases.
    try {
      const stat = await fs.lstat(path.join(base, name));
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('Cannot freeze an aliased experiment contract: ' + name);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const temporary = path.join(base, '.contract-' + randomUUID() + '.tmp');
    try {
      await fs.writeFile(temporary, body, { flag: 'wx', mode: 0o600 });
      await fs.rename(temporary, path.join(base, name));
    } finally { await fs.rm(temporary, { force: true }); }
  }
  await assertExperimentContracts(base, compiled);
}
export async function assertExperimentContracts(root: string, compiled: CompiledExperimentContracts): Promise<void> {
  const base = await ordinaryRoot(root);
  await assertNoEvaluation(base);
  for (const [name, body] of Object.entries(publicBodies(compiled))) if (await readPublic(base, name) !== body) throw new Error('Frozen experiment contract changed: ' + name);
  await assertQualityContract(base, compiled.quality);
}
export async function verifyExperimentCandidate(root: string, executable: string, compiled: CompiledExperimentContracts,
  identity: { experimentId: string; candidateId: string }, signal?: AbortSignal, options: ApplicationVerificationOptions = {}): Promise<ExperimentVerification> {
  if (!identity.experimentId || !identity.candidateId) throw new Error('Experiment verification requires both experiment and candidate identities.');
  await assertExperimentContracts(root, compiled);
  const report = await verifyApplication(root, executable, compiled.quality, signal, { ...options, requireVisualReview: true });
  if (!report.quality) throw new Error('Experiment verification requires a host quality report.');
  report.quality.schemaVersion = 4;
  report.quality.experiment = { ...identity, behaviorHash: compiled.behaviorHash, evaluationSetHash: compiled.evaluationSetHash, executionHash: compiled.executionHash };
  await assertExperimentContracts(root, compiled);
  return { schemaVersion: 1, ...identity, identity: experimentContractIdentity(compiled), report };
}
function sameIds(actual: string[], expected: string[]): boolean { return actual.length === expected.length && new Set(actual).size === actual.length && [...actual].sort().join('\0') === [...expected].sort().join('\0'); }
/** Eligibility checks exact expected evidence, not only self-consistency of report counts. */
export function experimentVerificationPassed(value: ExperimentVerification | undefined, compiled: CompiledExperimentContracts,
  expected: { experimentId: string; candidateId: string }): boolean {
  if (!value || value.schemaVersion !== 1 || value.experimentId !== expected.experimentId || value.candidateId !== expected.candidateId
    || experimentContractHash(value.identity) !== experimentContractHash(experimentContractIdentity(compiled)) || !reportPassed(value.report, 4)) return false;
  const quality = value.report.quality!, evaluation = quality.solutionEvaluation!;
  if (experimentContractHash(quality.experiment) !== experimentContractHash({ ...expected, behaviorHash: compiled.behaviorHash,
    evaluationSetHash: compiled.evaluationSetHash, executionHash: compiled.executionHash })) return false;
  if (quality.contractHash !== compiled.quality.hash || quality.package?.profile !== compiled.execution.runtime.profile
    || !sameIds(quality.criteria.map(item => item.criterionId), compiled.behavior.criteria.map(item => item.criterionId))
    || !sameIds(quality.capabilities!.map(item => item.id), compiled.behavior.capabilities.map(item => item.id))
    || !sameIds(evaluation.capabilities.map(item => item.id), compiled.behavior.capabilities.map(item => item.id))
    || !sameIds(evaluation.evaluations.map(item => item.id), compiled.evaluation.evaluations.map(item => item.id))
    || !sameIds(quality.journeys.map(item => item.id + '/' + item.viewport), compiled.behavior.scenarios.flatMap(item => ['desktop', 'narrow'].map(viewport => item.id + '/' + viewport)))) return false;
  for (const criterion of compiled.behavior.criteria) {
    const result = quality.criteria.find(item => item.criterionId === criterion.criterionId)!;
    if (result.status !== (criterion.disposition === 'implemented' ? 'passed' : 'unverified') || !sameIds(result.capabilityIds ?? [], criterion.capabilityIds)) return false;
  }
  for (const definition of compiled.behavior.capabilities) {
    const result = quality.capabilities!.find(item => item.id === definition.id)!;
    const evaluated = evaluation.capabilities.find(item => item.id === definition.id)!;
    if (result.required !== definition.required || evaluated.required !== definition.required || !sameIds(result.criterionIds, definition.criterionIds) || !sameIds(result.evaluationIds, definition.evaluationIds)) return false;
  }
  for (const definition of compiled.evaluation.evaluations) {
    const result = evaluation.evaluations.find(item => item.id === definition.id)!;
    if (result.capabilityId !== definition.capabilityId || result.evaluator !== definition.evaluator || result.threshold !== definition.threshold
      || result.trials !== definition.trials || result.baseline !== definition.baseline || experimentContractHash(result.dataset) !== experimentContractHash(definition.dataset)
      || !sameIds(result.cases.map(item => item.id + '/' + item.trial), definition.cases.flatMap(item => Array.from({ length: definition.trials }, (_, i) => item.id + '/' + (i + 1))))) return false;
  }
  return true;
}
export async function assertExperimentCandidateVerified(root: string, evidence: ExperimentVerification, compiled: CompiledExperimentContracts,
  expected: { experimentId: string; candidateId: string }): Promise<void> {
  if (!experimentVerificationPassed(evidence, compiled, expected)) throw new Error('Candidate lacks passing evidence for this experiment and execution contract.');
  await assertExperimentContracts(root, compiled);
  if (await sourceHash(root) !== evidence.report.sourceHash) throw new Error('Candidate source changed after experiment verification.');
}
