import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AcceptanceCriterion } from '../harness/types.js';
import { validateFoundationPlan } from '../harness/foundations.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { loadQualityContract, type QualityContract } from './quality.js';
import { safeFile } from './storage.js';

export const planDocuments = {
  acceptance: 'acceptance-plan.json',
  ux: 'ux-spec.json',
  solution: 'solution-contract.json',
  evaluation: 'evaluation-plan.json',
  foundation: 'foundation-plan.json',
} as const;

type PlanSection = keyof typeof planDocuments;
const planSections = Object.keys(planDocuments) as PlanSection[];
export type PlanParts = Partial<Record<PlanSection, string>>;

export function collectPlanParts(input: unknown): PlanParts {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).length) {
    throw new Error('Submit at least one named plan section.');
  }
  const parts: PlanParts = {};
  for (const [name, value] of Object.entries(input)) {
    if (!Object.hasOwn(planDocuments, name)) throw new Error('Unknown plan section: ' + name);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(name + ' must be a JSON object.');
    const section = name as PlanSection;
    const limit = section === 'evaluation' ? 2_000_000 : 250_000;
    // Preserve the contract size limit even when indentation adds substantial overhead.
    const readable = JSON.stringify(value, null, 2) + '\n';
    const body = Buffer.byteLength(readable) <= limit ? readable : JSON.stringify(value) + '\n';
    if (Buffer.byteLength(body) > limit) throw new Error(planDocuments[section] + ' exceeds the contract size limit.');
    parts[section] = body;
  }
  return parts;
}

export function missingPlanSections(parts: PlanParts) {
  return planSections.filter(section => parts[section] === undefined);
}

export async function writeCompactPlan(root: string, parts: PlanParts, signal: AbortSignal) {
  for (const section of planSections) {
    const body = parts[section];
    if (body === undefined) throw new Error('Missing plan section: ' + section);
    await atomicHostWrite(root, planDocuments[section], body, { signal });
  }
}

export async function validateCompactPlan(parts: PlanParts, acceptance: AcceptanceCriterion[], signal: AbortSignal) {
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-plan-'));
  try {
    await writeCompactPlan(stage, parts, signal);
    const contract = await loadQualityContract(stage, acceptance, true);
    await loadBuildFoundation(stage, contract);
    signal.throwIfAborted();
    return contract;
  } finally { await fs.rm(stage, { recursive: true, force: true }); }
}

/** Older plans without a claimed starter can still run or resume. */
export async function loadBuildFoundation(root: string, contract: QualityContract) {
  const runtime = contract.solution!.runtime;
  const claimsStarter = runtime.files.includes('foundation-lock.json');
  try { await fs.lstat(path.join(root, planDocuments.foundation)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || claimsStarter) throw error;
    return undefined;
  }
  const file = await safeFile(root, planDocuments.foundation);
  if ((await fs.stat(file)).size > 250_000) throw new Error('foundation-plan.json exceeds the contract size limit.');
  const selection = validateFoundationPlan(JSON.parse(await fs.readFile(file, 'utf8')), runtime);
  if (selection.templateId === 'custom' && claimsStarter) throw new Error('A custom runtime cannot declare the bundled foundation-lock.json.');
  return selection;
}
