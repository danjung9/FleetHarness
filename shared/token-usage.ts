import type { StageId } from './types.js';

/** Input includes cached tokens. Cache reads are a subset, never added twice. */
export interface TokenTotals {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  totalTokens: number;
}
export type TokenUsageSource = 'build' | 'planning-review' | 'conversation';
export interface TokenUsageSession {
  id: string;
  runId?: string;
  source: TokenUsageSource;
  stage?: StageId;
  model: string;
  startedAt: string;
  updatedAt: string;
  /** Absent until the provider reports usage; absence does not mean zero. */
  totals?: TokenTotals;
}
export interface ProjectTokenUsage {
  version: 1;
  startedAt: string;
  sessions: TokenUsageSession[];
}

const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export function normalizeTokenTotals(value: unknown): TokenTotals | undefined {
  if (!value || typeof value !== 'object') return;
  const { inputTokens, outputTokens, cachedInputTokens = 0 } = value as Partial<TokenTotals>;
  if (!count(inputTokens) || !count(outputTokens) || !count(cachedInputTokens) || cachedInputTokens > inputTokens || !count(inputTokens + outputTokens)) return;
  return { inputTokens, outputTokens, cachedInputTokens, totalTokens: inputTokens + outputTokens };
}
/** Pi reports uncached input, cache reads and cache writes as disjoint counts. */
export function piTokenTotals(value: unknown): TokenTotals | undefined {
  if (!value || typeof value !== 'object') return;
  const { input, output, cacheRead = 0, cacheWrite = 0 } = value as Record<string, unknown>;
  if (!count(input) || !count(output) || !count(cacheRead) || !count(cacheWrite)) return;
  return normalizeTokenTotals({ inputTokens: input + cacheRead + cacheWrite, outputTokens: output, cachedInputTokens: cacheRead });
}

/** Cumulative snapshots replace the same session; repeated notifications are idempotent. */
export function mergeTokenUsage(target: ProjectTokenUsage | undefined, incoming: ProjectTokenUsage | undefined): ProjectTokenUsage | undefined {
  if (!incoming) return target;
  const sessions = new Map((target?.sessions ?? []).map(session => [session.id, session]));
  let changed = !target || incoming.startedAt < target.startedAt;
  for (const session of incoming.sessions) {
    const previous = sessions.get(session.id);
    // A stale worker snapshot must not rewind an already reported total.
    if ((!previous || (session.totals?.totalTokens ?? -1) >= (previous.totals?.totalTokens ?? -1)) && JSON.stringify(previous) !== JSON.stringify(session)) {
      sessions.set(session.id, structuredClone(session)); changed = true;
    }
  }
  if (!changed) return target;
  return { version: 1, startedAt: target && target.startedAt < incoming.startedAt ? target.startedAt : incoming.startedAt, sessions: [...sessions.values()] };
}

export function summarizeTokenUsage(usages: readonly (ProjectTokenUsage | undefined)[], filter?: { runId?: string; source?: TokenUsageSource }) {
  let merged: ProjectTokenUsage | undefined;
  for (const usage of usages) merged = mergeTokenUsage(merged, usage);
  const sessions = (merged?.sessions ?? []).filter(session => (!filter?.runId || session.runId === filter.runId) && (!filter?.source || session.source === filter.source));
  const summary = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, totalTokens: 0,
    hasUsage: false, sessionCount: sessions.length, unreportedSessions: 0, startedAt: merged?.startedAt };
  for (const session of sessions) {
    const totals = normalizeTokenTotals(session.totals);
    if (!totals) { summary.unreportedSessions++; continue; }
    summary.hasUsage = true;
    summary.inputTokens += totals.inputTokens; summary.outputTokens += totals.outputTokens;
    summary.cachedInputTokens += totals.cachedInputTokens; summary.totalTokens += totals.totalTokens;
  }
  return summary;
}
