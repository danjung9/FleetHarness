import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { ChildProcess } from 'node:child_process';
import type { AcceptanceCriterion } from '../harness/types.js';
import type { QualityPlan, UxSpec, QualityReport } from '../shared/quality.js';
import { parseQualityPlan, parseUxSpec } from '../harness/quality-contract.js';
import { safeFile, sourceHash } from './storage.js';
import { verifyWorkspace, type VerificationLimits } from './verification.js';
import { verifyBrowserJourneys } from './browser-verification.js';

export interface QualityContract { plan: QualityPlan; ux: UxSpec; hash: string; acceptance: AcceptanceCriterion[] }
export interface ApplicationVerificationLimits extends VerificationLimits { browserTimeoutMs: number; browserStepTimeoutMs: number }
const contractFiles = ['acceptance-plan.json', 'ux-spec.json'] as const;
async function readContract(root: string) {
  const bodies: string[] = [];
  for (const name of contractFiles) {
    const file = await safeFile(root, name);
    if ((await fs.stat(file)).size > 250_000) throw new Error(`${name} exceeds the 250 KB contract limit.`);
    bodies.push(await fs.readFile(file, 'utf8'));
  }
  return { bodies, hash: createHash('sha256').update(bodies.map((body, i) => contractFiles[i] + '\0' + body).join('\0')).digest('hex') };
}
export async function loadQualityContract(root: string, acceptance: AcceptanceCriterion[]): Promise<QualityContract> {
  const { bodies, hash } = await readContract(root);
  return { plan: parseQualityPlan(JSON.parse(bodies[0]), acceptance), ux: parseUxSpec(JSON.parse(bodies[1])), hash, acceptance: structuredClone(acceptance) };
}
export async function assertQualityContract(root: string, contract: QualityContract) {
  if ((await readContract(root)).hash !== contract.hash) throw new Error('The acceptance plan or UX specification changed after planning. Restore the planned expectations; implementation and repair cannot weaken the contract.');
}

export async function verifyApplication(root: string, executable: string, contract: QualityContract,
  signal?: AbortSignal, options: Partial<ApplicationVerificationLimits> = {}, onProcess: (child: ChildProcess) => void = () => {}) {
  const started = performance.now();
  const { browserTimeoutMs, browserStepTimeoutMs, ...nodeLimits } = options;
  await assertQualityContract(root, contract);
  const report = await verifyWorkspace(root, executable, onProcess, signal, nodeLimits);
  const before = await sourceHash(root, { excludeEvidence: true });
  const browser = await verifyBrowserJourneys({ root, plan: contract.plan, contractHash: contract.hash, signal,
    timeoutMs: browserTimeoutMs, stepTimeoutMs: browserStepTimeoutMs });
  signal?.throwIfAborted();
  await assertQualityContract(root, contract);
  if (before !== await sourceHash(root, { excludeEvidence: true })) throw new Error('Source files changed during browser verification. Run verification again before review.');
  const criteria: QualityReport['criteria'] = contract.plan.criteria.map(item => {
    const requirement = contract.acceptance.find(criterion => criterion.id === item.criterionId)!.requirement;
    if (item.disposition === 'deferred') return { criterionId: item.criterionId, requirement, status: 'unverified', detail: item.reason! };
    const passed = browser.errors.length === 0 && item.journeyIds.every(id =>
      ['desktop', 'narrow'].every(viewport => browser.journeys.some(journey => journey.id === id && journey.viewport === viewport && journey.status === 'passed')));
    return { criterionId: item.criterionId, requirement, status: passed ? 'passed' : 'failed', detail: passed
      ? item.expectedOutcome + ' — demonstrated by ' + item.journeyIds.join(', ') + ' at both viewport sizes.'
      : 'Required browser evidence did not pass: ' + item.journeyIds.join(', ') + '. ' + browser.errors.join(' ') };
  });
  const quality: QualityReport = { schemaVersion: 1, contractHash: contract.hash,
    status: browser.errors.length === 0 && browser.journeys.length === contract.plan.journeys.length * 2
      && browser.journeys.every(journey => journey.status === 'passed') && !criteria.some(criterion => criterion.status === 'failed') ? 'passed' : 'failed',
    requirementsMet: criteria.length > 0 && criteria.every(criterion => criterion.status === 'passed'), criteria, journeys: browser.journeys, errors: browser.errors };
  const summary = [
    `Browser journeys: ${quality.journeys.filter(journey => journey.status === 'passed').length}/${contract.plan.journeys.length * 2} passed.`,
    ...quality.journeys.filter(journey => journey.status === 'failed').map(journey => `${journey.id} (${journey.viewport}): ${journey.detail}`),
    ...quality.errors,
    `Requirements: ${criteria.filter(criterion => criterion.status === 'passed').length} demonstrated, ${criteria.filter(criterion => criterion.status === 'failed').length} failed, ${criteria.filter(criterion => criterion.status === 'unverified').length} unverified.`
  ].join('\n');
  return { ...report, quality, output: report.output + '\n' + summary,
    durationMs: Math.round(performance.now() - started), sourceHash: await sourceHash(root) };
}
