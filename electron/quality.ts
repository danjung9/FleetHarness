import { redactValue } from './secrets.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { ChildProcess } from 'node:child_process';
import type { AcceptanceCriterion } from '../harness/types.js';
import type { QualityPlan, UxSpec, QualityReport, CapabilityResult, PackageEvidence, JourneyResult } from '../shared/quality.js';
import type { SolutionContract, EvaluationPlan, SolutionEvaluationReport } from '../shared/solution.js';
import type { TestReport } from '../shared/types.js';
import { parseQualityPlan, parseUxSpec } from '../harness/quality-contract.js';
import { safeFile, sourceHash, artifactManifest } from './storage.js';
import { verifyWorkspace, type VerificationOptions } from './verification.js';
import { parseSolutionContract, parseEvaluationPlan } from '../harness/solution-contract.js';
import { applicationTestFiles } from './verification.js';
import { verifyBrowserJourneys } from './browser-verification.js';
import { prepareSolutionRuntime, type SolutionRuntime } from './solution-runtime.js';
import { runSolutionEvaluation } from './solution-evaluation.js';

export interface QualityContract {
  plan: QualityPlan;
  ux: UxSpec;
  hash: string;
  acceptance: AcceptanceCriterion[];
  solution?: SolutionContract;
  evaluation?: EvaluationPlan;
  /** Host-owned raw body preserves the original hash while answer keys are sealed. */
  evaluationBody?: string;
  sealedEvaluation?: boolean;
}
export interface ApplicationVerificationLimits extends VerificationOptions { browserTimeoutMs: number; browserStepTimeoutMs: number }
const legacyFiles = ['acceptance-plan.json', 'ux-spec.json'];
const solutionFiles = ['solution-contract.json', 'evaluation-plan.json'];
const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 4000);

async function exists(root: string, name: string) {
  try { await fs.lstat(path.join(root, name)); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}

async function readContract(root: string, requireSolution = false, sealedBody?: string) {
  const hasSolution = requireSolution || await exists(root, solutionFiles[0]) || await exists(root, solutionFiles[1]);
  const names = [...legacyFiles, ...(hasSolution ? solutionFiles : [])];
  const bodies: string[] = [];
  for (const name of names) {
    if (name === 'evaluation-plan.json' && sealedBody !== undefined) {
      if (await exists(root, name)) throw new Error('The sealed evaluation plan was recreated in the builder workspace. Remove it; answer keys are host-owned during implementation.');
      bodies.push(sealedBody);
      continue;
    }
    if (!await exists(root, name)) throw new Error(`Missing required quality contract: ${name}.`);
    const file = await safeFile(root, name);
    const maxBytes = name === 'evaluation-plan.json' ? 2_000_000 : 250_000;
    if ((await fs.stat(file)).size > maxBytes) throw new Error(`${name} exceeds the ${maxBytes} byte contract limit.`);
    bodies.push(await fs.readFile(file, 'utf8'));
  }
  return { names, bodies, hash: createHash('sha256').update(bodies.map((body, i) => names[i] + '\0' + body).join('\0')).digest('hex') };
}

export async function loadQualityContract(root: string, acceptance: AcceptanceCriterion[], requireSolution = false, sealedBody?: string): Promise<QualityContract> {
  const { bodies, hash } = await readContract(root, requireSolution, sealedBody);
  const solution = bodies[2] === undefined ? undefined : parseSolutionContract(JSON.parse(bodies[2]), acceptance);
  const evaluation = solution ? parseEvaluationPlan(JSON.parse(bodies[3]), solution) : undefined;
  return { plan: parseQualityPlan(JSON.parse(bodies[0]), acceptance, solution), ux: parseUxSpec(JSON.parse(bodies[1])), hash,
    acceptance: structuredClone(acceptance), ...(solution ? { solution, evaluation, evaluationBody: bodies[3], ...(sealedBody !== undefined ? { sealedEvaluation: true } : {}) } : {}) };
}

export async function assertQualityContract(root: string, contract: QualityContract) {
  if ((await readContract(root, !!contract.solution, contract.sealedEvaluation ? contract.evaluationBody : undefined)).hash !== contract.hash) {
    throw new Error('The acceptance plan, UX specification, solution contract or evaluation plan changed after planning. Restore the planned expectations; implementation and repair cannot weaken the contract.');
  }
}

/** Keep final answer keys outside the workspace exposed to the implementation agent. */
export async function sealEvaluationPlan(root: string, contract: QualityContract, hostPath: string) {
  if (!contract.solution || contract.evaluationBody === undefined) throw new Error('Only a solution quality contract has an evaluation plan to seal.');
  if (contract.sealedEvaluation) throw new Error('The evaluation plan is already sealed.');
  await assertQualityContract(root, contract);
  const base = await fs.realpath(root), destination = path.resolve(hostPath);
  if (destination === base || destination.startsWith(base + path.sep)) throw new Error('The sealed evaluation plan must be stored outside the builder workspace.');
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const parent = await fs.realpath(path.dirname(destination));
  if (parent === base || parent.startsWith(base + path.sep)) throw new Error('The sealed evaluation directory must stay outside the builder workspace.');
  await atomicHostWrite(parent, path.basename(destination), contract.evaluationBody, { exclusive: true });
  await fs.unlink(path.join(root, 'evaluation-plan.json'));
  contract.sealedEvaluation = true;
  await assertQualityContract(root, contract);
}

export async function restoreEvaluationPlan(root: string, contract: QualityContract) {
  if (!contract.sealedEvaluation) return;
  await assertQualityContract(root, contract);
  await atomicHostWrite(root, 'evaluation-plan.json', contract.evaluationBody!, { exclusive: true });
  contract.sealedEvaluation = false;
  await assertQualityContract(root, contract);
}

function capabilityResults(contract: QualityContract, evaluation?: SolutionEvaluationReport): CapabilityResult[] {
  return (contract.solution?.capabilities ?? []).map(capability => {
    const expected = capability.evaluationIds;
    const declared = evaluation?.capabilities.find(item => item.id === capability.id);
    const passed = !!evaluation && evaluation.errors.length === 0 && declared?.status === 'passed' && expected.length > 0
      && expected.every(id => evaluation.evaluations.some(item => item.id === id && item.capabilityId === capability.id && item.status === 'passed'));
    return { id: capability.id, required: capability.required, criterionIds: [...capability.criterionIds], evaluationIds: [...expected],
      status: passed ? 'passed' : !capability.required && expected.length === 0 ? 'unverified' : 'failed',
      detail: passed ? `Host evaluation passed: ${expected.join(', ')}.` : expected.length ? `Required host evaluation evidence did not pass: ${expected.join(', ')}.` : 'No evaluation was declared for this optional capability.' };
  });
}

/** Complete coverage and successful contract evidence are independently required. */
export function requirementsMet(acceptance: AcceptanceCriterion[], criteria: QualityReport['criteria'], contractEvidencePassed: boolean) {
  return contractEvidencePassed && acceptance.length > 0 && criteria.length === acceptance.length
    && new Set(criteria.map(criterion => criterion.criterionId)).size === criteria.length
    && acceptance.every(obligation => criteria.some(criterion => criterion.criterionId === obligation.id && criterion.status === 'passed'));
}

async function copyApplicationTests(source: string, runtimeRoot: string) {
  const base = await fs.realpath(runtimeRoot);
  for (const relative of await applicationTestFiles(source)) {
    const target = path.resolve(base, relative);
    if (!target.startsWith(base + path.sep)) throw new Error('Application tests must stay in the clean runtime.');
    let directory = base;
    for (const part of path.relative(base, path.dirname(target)).split(path.sep).filter(Boolean)) {
      directory = path.join(directory, part);
      try { await fs.mkdir(directory); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      const stat = await fs.lstat(directory);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Application test directories must be ordinary directories.');
    }
    const bytes = await fs.readFile(await safeFile(source, relative));
    try { await atomicHostWrite(base, relative, bytes, { exclusive: true }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const stat = await fs.lstat(target);
      if (stat.isSymbolicLink() || !stat.isFile() || !bytes.equals(await fs.readFile(target))) {
        throw new Error('Application tests cannot replace files in the declared runtime: ' + relative);
      }
    }
  }
}

export async function verifyApplication(root: string, executable: string, contract: QualityContract,
  signal?: AbortSignal, options: Partial<ApplicationVerificationLimits> = {}, onProcess: (child: ChildProcess) => void = () => {}) {
  const started = performance.now();
  const { browserTimeoutMs, browserStepTimeoutMs, ...nodeLimits } = options;
  await artifactManifest(root, { requireEntryPoint: !contract.solution });
  await assertQualityContract(root, contract);
  const before = await sourceHash(root, { excludeEvidence: true });
  let report: TestReport = { time: new Date().toISOString(), command: 'node --test (clean runtime)', exitCode: null,
    passed: 0, failed: 0, skipped: 0, total: 0, output: 'Application tests did not execute because clean runtime preparation failed.', durationMs: 0, sourceHash: before };
  let browser: { journeys: JourneyResult[]; errors: string[] } = { journeys: [], errors: [] };
  let solutionEvaluation: SolutionEvaluationReport | undefined;
  let packageEvidence: PackageEvidence | undefined;
  const errors: string[] = [];
  if (contract.solution && contract.evaluation) {
    let runtime: SolutionRuntime | undefined;
    packageEvidence = { status: 'failed', cleanCopy: false, profile: contract.solution.runtime.profile, detail: 'Clean package verification did not run.' };
    try {
      runtime = await prepareSolutionRuntime(root, contract.solution.runtime, executable, signal);
      packageEvidence = { status: 'passed', cleanCopy: true, profile: contract.solution.runtime.profile, filesHash: runtime.provenance.filesHash,
        detail: 'Host evaluation, browser journeys and developer tests use separate fresh packages with matching declared files, dependencies and runtime configuration.' };
      // Host checks must not inherit state or helper files created by developer tests.
      solutionEvaluation = await runSolutionEvaluation(runtime, contract.solution, contract.evaluation, signal);
      await runtime.assertIntegrity();
      await runtime.close(); runtime = undefined;
      if (contract.plan.journeys.length) {
        runtime = await prepareSolutionRuntime(root, contract.solution.runtime, executable, signal);
        if (runtime.provenance.filesHash !== packageEvidence.filesHash) throw new Error('Deployment files changed between independent verification packages.');
        if (!runtime.url) throw new Error('The declared delivery runtime did not provide a browser URL.');
        browser = await verifyBrowserJourneys({ root, plan: contract.plan, contractHash: contract.hash, signal,
          url: runtime.url, allowSameOrigin: true, timeoutMs: browserTimeoutMs, stepTimeoutMs: browserStepTimeoutMs });
        browser.errors = browser.errors.map(error => runtime!.redactMessage(error));
        browser.journeys = browser.journeys.map(journey => ({ ...journey, detail: runtime!.redactMessage(journey.detail) }));
        await runtime.assertIntegrity();
        await runtime.close(); runtime = undefined;
      }
      runtime = await prepareSolutionRuntime(root, contract.solution.runtime, executable, signal);
      if (runtime.provenance.filesHash !== packageEvidence.filesHash) throw new Error('Deployment files changed between independent verification packages.');
      await copyApplicationTests(root, runtime.root);
      report = await verifyWorkspace(runtime.root, executable, onProcess, signal, nodeLimits, runtime.testEnvironment);
      report.output = runtime.redactMessage(report.output);
      await runtime.assertIntegrity();
    } catch (error) {
      signal?.throwIfAborted();
      const detail = 'Clean package verification: ' + (runtime ? runtime.redactMessage(message(error)) : message(error));
      errors.push(detail);
      packageEvidence = { ...packageEvidence, status: 'failed', detail };
    } finally { if (runtime) await runtime.close(); }
    errors.push(...(solutionEvaluation?.errors ?? []));
  } else {
    report = await verifyWorkspace(root, executable, onProcess, signal, nodeLimits);
    browser = await verifyBrowserJourneys({ root, plan: contract.plan, contractHash: contract.hash, signal,
      timeoutMs: browserTimeoutMs, stepTimeoutMs: browserStepTimeoutMs });
  }
  errors.push(...browser.errors);
  signal?.throwIfAborted();
  await assertQualityContract(root, contract);
  if (before !== await sourceHash(root, { excludeEvidence: true })) throw new Error('Source files changed during application verification. Run verification again before review.');
  const capabilities = capabilityResults(contract, solutionEvaluation);
  const criteria: QualityReport['criteria'] = contract.plan.criteria.map(item => {
    const requirement = contract.acceptance.find(criterion => criterion.id === item.criterionId)!.requirement;
    const capabilityIds = item.capabilityIds ?? [];
    const references = contract.plan.schemaVersion === 2 ? { capabilityIds: [...capabilityIds] } : {};
    if (item.disposition === 'deferred') return { criterionId: item.criterionId, requirement, status: 'unverified', detail: item.reason!, ...references };
    const browserPassed = browser.errors.length === 0 && item.journeyIds.every(id =>
      ['desktop', 'narrow'].every(viewport => browser.journeys.some(journey => journey.id === id && journey.viewport === viewport && journey.status === 'passed')));
    const capabilityPassed = capabilityIds.every(id => capabilities.some(capability => capability.id === id && capability.status === 'passed'));
    const passed = errors.length === 0 && browserPassed && capabilityPassed;
    const evidence = [...(item.journeyIds.length ? ['browser journeys ' + item.journeyIds.join(', ') + ' at both viewport sizes'] : []),
      ...(capabilityIds.length ? ['host evaluations for ' + capabilityIds.join(', ')] : [])].join('; ');
    return { criterionId: item.criterionId, requirement, status: passed ? 'passed' : 'failed', ...references,
      detail: passed ? item.expectedOutcome + ' - demonstrated by ' + evidence + '.' : 'Required evidence did not pass: ' + evidence + '. ' + errors.join(' ') };
  });
  const passed = errors.length === 0 && browser.journeys.length === contract.plan.journeys.length * 2
    && browser.journeys.every(journey => journey.status === 'passed') && !criteria.some(criterion => criterion.status === 'failed')
    && (!contract.solution || (packageEvidence?.status === 'passed' && solutionEvaluation?.status === 'passed'
      && capabilities.some(capability => capability.required) && capabilities.filter(capability => capability.required).every(capability => capability.status === 'passed')));
  const quality: QualityReport = { schemaVersion: contract.solution ? 2 : 1, contractHash: contract.hash,
    status: passed ? 'passed' : 'failed', requirementsMet: requirementsMet(contract.acceptance, criteria,
      passed && report.exitCode === 0 && report.total > 0 && report.passed === report.total && report.failed === 0 && report.skipped === 0),
    criteria, journeys: browser.journeys, errors,
    ...(contract.solution ? { expectedJourneys: contract.plan.journeys.length * 2, capabilities, solutionEvaluation, package: packageEvidence } : {}) };
  const summary = [
    ...(contract.solution ? [`Clean package: ${packageEvidence?.status ?? 'failed'}.`,
      `Capabilities: ${capabilities.filter(capability => capability.status === 'passed').length}/${capabilities.length} passed.`,
      ...capabilities.filter(capability => capability.status !== 'passed').map(capability => `${capability.id}: ${capability.detail}`),
      ...(solutionEvaluation?.evaluations ?? []).filter(evaluation => evaluation.status !== 'passed').map(evaluation => `${evaluation.id}: score ${evaluation.actual}, threshold ${evaluation.threshold}; ${evaluation.cases.filter(item => !item.passed).map(item => `${item.id}: ${item.detail}`).join(' ')}`)] : []),
    `Browser journeys: ${quality.journeys.filter(journey => journey.status === 'passed').length}/${contract.plan.journeys.length * 2} passed.`,
    ...quality.journeys.filter(journey => journey.status === 'failed').map(journey => `${journey.id} (${journey.viewport}): ${journey.detail}`),
    ...quality.errors,
    `Requirements: ${criteria.filter(criterion => criterion.status === 'passed').length} demonstrated, ${criteria.filter(criterion => criterion.status === 'failed').length} failed, ${criteria.filter(criterion => criterion.status === 'unverified').length} unverified.`
  ].join('\n');
  return { ...report, quality, output: report.output + '\n' + summary,
    durationMs: Math.round(performance.now() - started), sourceHash: await sourceHash(root) };
}
