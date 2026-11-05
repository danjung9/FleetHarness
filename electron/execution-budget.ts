import type { StageId } from '../shared/types.js';

export interface ExecutionBudgetState {
  version: 1;
  totalLimitMs: number;
  phaseLimitMs: number;
  consumedMs: number;
  phases: Partial<Record<StageId, number>>;
  active?: { stage: StageId; startedAt: number; allowanceMs: number; observedAt?: number };
}

export class ExecutionBudgetExceeded extends Error {
  constructor() { super('This candidate exhausted its frozen execution budget. Start a new attempt to grant additional time.'); }
}

const bounded = (value: number) => Number.isSafeInteger(value) && value > 0;

export function createExecutionBudget(totalLimitMs = 90 * 60_000, phaseLimitMs = 30 * 60_000): ExecutionBudgetState {
  if (!bounded(totalLimitMs) || !bounded(phaseLimitMs) || phaseLimitMs > totalLimitMs) throw new Error('Invalid execution budget.');
  return { version: 1, totalLimitMs, phaseLimitMs, consumedMs: 0, phases: {} };
}

export function validateExecutionBudget(state: ExecutionBudgetState): void {
  if (!state || state.version !== 1 || !bounded(state.totalLimitMs) || !bounded(state.phaseLimitMs)
    || state.phaseLimitMs > state.totalLimitMs || !Number.isSafeInteger(state.consumedMs) || state.consumedMs < 0
    || state.consumedMs > state.totalLimitMs || !state.phases || typeof state.phases !== 'object') throw new Error('Invalid saved execution budget.');
  const entries = Object.entries(state.phases);
  if (entries.some(([stage, used]) => !['plan', 'build', 'verify'].includes(stage) || !Number.isSafeInteger(used) || used! < 0 || used! > state.phaseLimitMs)
    || entries.reduce((sum, [, used]) => sum + used!, 0) !== state.consumedMs) throw new Error('Invalid saved phase budget.');
  if (state.active && (!['plan', 'build', 'verify'].includes(state.active.stage) || !Number.isSafeInteger(state.active.startedAt)
    || state.active.startedAt < 0 || !bounded(state.active.allowanceMs)
    || (state.active.observedAt !== undefined && (!Number.isSafeInteger(state.active.observedAt) || state.active.observedAt < state.active.startedAt))
    || state.active.allowanceMs > Math.min(state.phaseLimitMs - (state.phases[state.active.stage] ?? 0), state.totalLimitMs - state.consumedMs))) {
    throw new Error('Invalid saved execution lease.');
  }
}

/** A persisted wall-clock lease cannot be reset by reconnecting or restarting. */
export function executionBudgetRemaining(state: ExecutionBudgetState, stage: StageId, now = Date.now()): number {
  validateExecutionBudget(state);
  if (state.active) {
    if (state.active.stage !== stage) throw new Error('Finish the current budget lease before starting another phase.');
    state.active.observedAt = Math.max(state.active.startedAt, state.active.observedAt ?? state.active.startedAt, Math.ceil(now));
    return Math.max(0, state.active.allowanceMs - (state.active.observedAt - state.active.startedAt));
  }
  return Math.max(0, Math.min(state.phaseLimitMs - (state.phases[stage] ?? 0), state.totalLimitMs - state.consumedMs));
}

export function beginExecutionPhase(state: ExecutionBudgetState, stage: StageId, now = Date.now()): number {
  if (!['plan', 'build', 'verify'].includes(stage)) throw new Error('Only candidate planning, build and verification consume this budget.');
  const remaining = executionBudgetRemaining(state, stage, now);
  if (!remaining) throw new ExecutionBudgetExceeded();
  state.active ??= { stage, startedAt: now, allowanceMs: remaining };
  return remaining;
}

export function finishExecutionPhase(state: ExecutionBudgetState, now = Date.now()): void {
  validateExecutionBudget(state);
  if (!state.active) return;
  const { stage, startedAt, allowanceMs, observedAt = startedAt } = state.active;
  const consumed = Math.min(allowanceMs, Math.max(0, Math.ceil(Math.max(now, observedAt) - startedAt)));
  state.phases[stage] = (state.phases[stage] ?? 0) + consumed;
  state.consumedMs += consumed;
  delete state.active;
}
