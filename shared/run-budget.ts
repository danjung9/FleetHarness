import type { AgentBackend } from './types.js';
import type { RunUsageSummary } from './run-usage.js';

export const DEFAULT_BUILD_TIME_LIMIT_MINUTES = 60;
export function normalizeBuildTimeLimitMinutes(value?: number): number {
  if (value === undefined) return DEFAULT_BUILD_TIME_LIMIT_MINUTES;
  if (!Number.isSafeInteger(value) || value < 1 || value > 180) throw new Error('Build time budget must be a whole number from 1 to 180 minutes.');
  return value;
}
export type RunTerminalReason = 'completed' | 'time_budget_exhausted' | 'stopped' | 'failed' | 'interrupted';
export interface RunPhaseDuration {
  id: string; label: string; startedAt: string; finishedAt?: string; durationMs: number;
}
export interface RunSummary {
  runId: string; backend: AgentBackend; model: string;
  startedAt: string; deadlineAt: string; timeLimitMs: number; elapsedMs: number;
  finishedAt?: string; terminalReason?: RunTerminalReason;
  phases: RunPhaseDuration[];
  usage: RunUsageSummary;
}
