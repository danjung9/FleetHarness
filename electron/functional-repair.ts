import type { QualityReport } from '../shared/quality.js';
import type { SolutionEvaluationReport } from '../shared/solution.js';
import type { TestReport } from '../shared/types.js';
import { reportPassed } from '../shared/verification.js';

export type FunctionalRepairGate = 'core' | 'workflow' | 'final';
export interface FunctionalRepairObservation {
  /** Stable host identities only. Never use diagnostic prose, hashes or timestamps. */
  failures: string[];
  /** Higher is better; only an existing metric can establish progress. */
  metrics: Record<string, number>;
}
export type RepairObservation = FunctionalRepairObservation;
export interface FunctionalRepairGateState {
  attempts: number;
  consumedMs: number;
  noProgress: number;
  previous?: FunctionalRepairObservation;
}
export interface FunctionalRepairState {
  version: 1;
  gates: Record<FunctionalRepairGate, FunctionalRepairGateState>;
  /** Elapsed time is observed by the caller's monotonic clock, never from saved wall time. */
  active?: { gate: FunctionalRepairGate; attempt: number; allowanceMs: number; elapsedMs: number };
}
export const functionalRepairLimits = { attemptsPerGate: 3, activeMsPerGate: 15 * 60_000, noProgress: 2 } as const;
export type FunctionalRepairDecision =
  | { allowed: true; attempt: number; allowanceMs: number }
  | { allowed: false; reason: 'passed' | 'attempt-limit' | 'time-limit' | 'no-progress' };

const gates: FunctionalRepairGate[] = ['core', 'workflow', 'final'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const identity = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 1600;

function validateObservation(value: unknown): asserts value is FunctionalRepairObservation {
  if (!record(value) || !Array.isArray(value.failures) || !value.failures.every(identity)
    || value.failures.length !== new Set(value.failures).size || !record(value.metrics)
    || Object.entries(value.metrics).some(([key, metric]) => !identity(key) || typeof metric !== 'number' || !Number.isFinite(metric))) {
    throw new Error('Invalid functional repair observation.');
  }
}

/** Validate host checkpoint state before deciding whether another repair is permitted. */
export function validateFunctionalRepairState(value: unknown): asserts value is FunctionalRepairState {
  if (!record(value) || value.version !== 1 || !record(value.gates)
    || Object.keys(value.gates).length !== gates.length || !gates.every(gate => Object.hasOwn(value.gates as object, gate))) {
    throw new Error('Invalid saved functional repair state.');
  }
  for (const gate of gates) {
    const state = value.gates[gate];
    if (!record(state) || !integer(state.attempts) || state.attempts > functionalRepairLimits.attemptsPerGate
      || !integer(state.consumedMs) || state.consumedMs > functionalRepairLimits.activeMsPerGate
      || !integer(state.noProgress) || state.noProgress > functionalRepairLimits.noProgress
      || state.noProgress > state.attempts || (state.attempts === 0 && state.consumedMs !== 0)
      || (state.noProgress > 0 && state.previous === undefined)) throw new Error('Invalid saved functional repair gate.');
    if (state.previous !== undefined) validateObservation(state.previous);
  }
  if (value.active !== undefined) {
    const active = value.active;
    if (!record(active) || !gates.includes(active.gate as FunctionalRepairGate) || !integer(active.attempt)
      || !integer(active.allowanceMs) || active.allowanceMs === 0 || !integer(active.elapsedMs)
      || active.elapsedMs > active.allowanceMs) throw new Error('Invalid saved functional repair lease.');
    const state = value.gates[active.gate as FunctionalRepairGate] as unknown as FunctionalRepairGateState;
    if (active.attempt === 0 || active.attempt !== state.attempts || !state.previous
      || active.allowanceMs !== functionalRepairLimits.activeMsPerGate - state.consumedMs) {
      throw new Error('Invalid saved functional repair lease.');
    }
  }
}

/** Older checkpoints used one shared attempt. Conservatively debit its original phase. */
export function createFunctionalRepairState(options: { legacyRepairUsed?: boolean; legacyGate?: 'core' | 'final' } = {}): FunctionalRepairState {
  const state: FunctionalRepairState = { version: 1, gates: {
    core: { attempts: 0, consumedMs: 0, noProgress: 0 },
    workflow: { attempts: 0, consumedMs: 0, noProgress: 0 },
    final: { attempts: 0, consumedMs: 0, noProgress: 0 }
  } };
  if (options.legacyRepairUsed) state.gates[options.legacyGate ?? 'core'].attempts = 1;
  return state;
}

/** Public telemetry receives only the count, never private failure identities or scores. */
export function functionalRepairAttempts(state?: unknown, legacyRepairUsed?: unknown): number {
  if (state !== undefined) {
    validateFunctionalRepairState(state);
    return gates.reduce((total, gate) => total + state.gates[gate].attempts, 0);
  }
  if (legacyRepairUsed !== undefined && typeof legacyRepairUsed !== 'boolean') throw new Error('Invalid legacy functional repair evidence.');
  return Number(legacyRepairUsed === true);
}

function improved(previous: FunctionalRepairObservation, current: FunctionalRepairObservation): boolean {
  const priorFailures = new Set(previous.failures);
  // Changing which things fail is not evidence that the application is closer to working.
  if (current.failures.some(failure => !priorFailures.has(failure))) return false;
  const priorMetrics = Object.entries(previous.metrics);
  if (priorMetrics.some(([key, value]) => !Object.hasOwn(current.metrics, key) || current.metrics[key] < value)) return false;
  return current.failures.length < previous.failures.length || priorMetrics.some(([key, value]) => current.metrics[key] > value);
}

/**
 * Call once per newly completed independent evaluation, then persist before invoking
 * the model. Each gate owns its allowance, so early core work cannot spend final repair.
 */
export function beginFunctionalRepair(state: FunctionalRepairState, gate: FunctionalRepairGate,
  observation: FunctionalRepairObservation): FunctionalRepairDecision {
  validateFunctionalRepairState(state); validateObservation(observation);
  if (!gates.includes(gate)) throw new Error('Invalid functional repair gate.');
  if (state.active) throw new Error('Finish the current functional repair lease before starting another repair.');
  if (!observation.failures.length) return { allowed: false, reason: 'passed' };
  const current = state.gates[gate];
  if (current.previous) current.noProgress = improved(current.previous, observation) ? 0
    : Math.min(functionalRepairLimits.noProgress, current.noProgress + 1);
  current.previous = { failures: [...observation.failures].sort(), metrics: { ...observation.metrics } };
  if (current.noProgress >= functionalRepairLimits.noProgress) return { allowed: false, reason: 'no-progress' };
  if (current.attempts >= functionalRepairLimits.attemptsPerGate) return { allowed: false, reason: 'attempt-limit' };
  const allowanceMs = functionalRepairLimits.activeMsPerGate - current.consumedMs;
  if (allowanceMs <= 0) return { allowed: false, reason: 'time-limit' };
  current.attempts++;
  state.active = { gate, attempt: current.attempts, allowanceMs, elapsedMs: 0 };
  return { allowed: true, attempt: current.attempts, allowanceMs };
}

/** Supply elapsed milliseconds since this lease began; backward samples never refill it. */
export function observeFunctionalRepair(state: FunctionalRepairState, elapsedMs: number): number {
  validateFunctionalRepairState(state);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('Invalid functional repair elapsed time.');
  if (!state.active) throw new Error('No active functional repair lease.');
  state.active.elapsedMs = Math.min(state.active.allowanceMs, Math.max(state.active.elapsedMs, Math.ceil(elapsedMs)));
  return state.active.allowanceMs - state.active.elapsedMs;
}

/** Always settle in finally, including cancellation. Time spent stopped is not charged. */
export function finishFunctionalRepair(state: FunctionalRepairState, elapsedMs?: number): void {
  validateFunctionalRepairState(state);
  if (!state.active) return;
  if (elapsedMs !== undefined) observeFunctionalRepair(state, elapsedMs);
  state.gates[state.active.gate].consumedMs += state.active.elapsedMs;
  delete state.active;
}

/**
 * An unclean interruption cannot prove its unobserved active time. Consume the
 * pending allowance conservatively; a normal stop must instead settle in finally.
 * This charge is independent of how long the process remained stopped.
 */
export function recoverFunctionalRepair(state: FunctionalRepairState): void {
  validateFunctionalRepairState(state);
  if (state.active) finishFunctionalRepair(state, state.active.allowanceMs);
}

const key = (...parts: (string | number)[]) => parts.map(part => encodeURIComponent(String(part))).join('/');
const score = (value: number) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
function normalized(failures: string[], metrics: Record<string, number>): FunctionalRepairObservation {
  return { failures: [...new Set(failures)].sort(), metrics };
}

export function solutionRepairObservation(report?: SolutionEvaluationReport): FunctionalRepairObservation {
  if (!report) return { failures: ['core/missing-report'], metrics: {} };
  const failures: string[] = [], metrics: Record<string, number> = {};
  for (const evaluation of report.evaluations) {
    const evaluationKey = key('evaluation', evaluation.capabilityId, evaluation.id);
    if (evaluation.status !== 'passed') failures.push(evaluationKey);
    metrics[evaluationKey] = score(evaluation.actual);
    for (const entry of evaluation.cases) {
      const caseKey = key('case', evaluation.capabilityId, evaluation.id, entry.id, entry.trial);
      // Thresholded evaluations may pass with imperfect individual scores.
      if (evaluation.status !== 'passed' && !entry.passed) failures.push(caseKey);
      metrics[caseKey] = score(entry.score);
    }
  }
  for (const capability of report.capabilities) if (capability.required && capability.status !== 'passed') failures.push(key('capability', capability.id));
  if (report.errors.length) failures.push('core/errors');
  if (!report.evaluations.length) failures.push('core/no-evaluations');
  if (!report.capabilities.some(capability => capability.required)) failures.push('core/no-required-capability');
  if (report.status !== 'passed' && !failures.length) failures.push('core/incomplete-evidence');
  return normalized(failures, metrics);
}

export function qualityRepairObservation(quality?: QualityReport): FunctionalRepairObservation {
  if (!quality) return { failures: ['quality/missing-report'], metrics: {} };
  const failures: string[] = [], metrics: Record<string, number> = {};
  for (const criterion of quality.criteria) if (criterion.status === 'failed') failures.push(key('criterion', criterion.criterionId));
  if (!quality.criteria.some(criterion => criterion.status === 'passed')) failures.push('quality/no-verified-criterion');
  for (const journey of quality.journeys) {
    const journeyKey = key('journey', journey.id, journey.viewport);
    if (journey.status !== 'passed') failures.push(journeyKey);
    if (Number.isSafeInteger(journey.completedSteps) && journey.completedSteps! >= 0
      && Number.isSafeInteger(journey.totalSteps) && journey.totalSteps! > 0 && journey.completedSteps! <= journey.totalSteps!) {
      metrics[journeyKey] = journey.completedSteps! / journey.totalSteps!;
    }
  }
  if (quality.expectedJourneys !== undefined && quality.expectedJourneys !== quality.journeys.length) failures.push('quality/missing-journeys');
  for (const capability of quality.capabilities ?? []) {
    const used = quality.criteria.some(criterion => criterion.capabilityIds?.includes(capability.id));
    if ((capability.required || used) && capability.status !== 'passed') failures.push(key('capability', capability.id));
  }
  if (quality.schemaVersion >= 2) {
    const core = solutionRepairObservation(quality.solutionEvaluation);
    failures.push(...core.failures); Object.assign(metrics, core.metrics);
    if (!quality.package || quality.package.status !== 'passed' || !quality.package.cleanCopy) failures.push('quality/package');
    if (quality.schemaVersion >= 3 && quality.package?.profile !== 'cli' && quality.visualReview?.status !== 'passed') failures.push('quality/visual-review');
  }
  if (quality.errors.length) failures.push('quality/errors');
  if (quality.status !== 'passed' && !failures.length) failures.push('quality/incomplete-evidence');
  return normalized(failures, metrics);
}

export function verificationRepairObservation(report?: TestReport, requireQuality: boolean | 1 | 2 | 3 | 4 = true): FunctionalRepairObservation {
  if (!report) return { failures: ['verification/missing-report'], metrics: {} };
  if (reportPassed(report, requireQuality)) return { failures: [], metrics: {} };
  const failures: string[] = [], metrics: Record<string, number> = {};
  if (report.exitCode !== 0) failures.push('application/exit');
  if (report.failed > 0) failures.push('application/failed');
  if (report.skipped > 0) failures.push('application/skipped');
  if (report.total <= 0 || report.passed <= 0) failures.push('application/empty');
  if (report.passed + report.failed + report.skipped !== report.total) failures.push('application/incomplete');
  metrics['application/failed'] = -score(report.failed);
  metrics['application/skipped'] = -score(report.skipped);
  if (report.quality || requireQuality) {
    const quality = qualityRepairObservation(report.quality);
    failures.push(...quality.failures); Object.assign(metrics, quality.metrics);
  }
  if (!failures.length) failures.push('verification/incomplete-evidence');
  return normalized(failures, metrics);
}
