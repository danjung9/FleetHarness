export type UsageState = 'measured' | 'estimated' | 'partial' | 'unavailable';
export interface UsageMetric {
  /** null means unknown. A missing provider report is never a measured zero. */
  value: number | null;
  state: UsageState;
  source?: 'provider' | 'catalog' | 'mixed';
}
export interface UsageAmounts {
  tokens: UsageMetric;
  /** Includes cached and cache-write input. The cache fields below are subsets. */
  inputTokens: UsageMetric;
  /** Includes reasoning output. */
  outputTokens: UsageMetric;
  cachedInputTokens: UsageMetric;
  cacheWriteTokens: UsageMetric;
  reasoningTokens: UsageMetric;
  costUsd: UsageMetric;
}
export interface RunUsageObservation extends UsageAmounts {
  id: string;
  phase: string;
  kind: 'response' | 'compaction' | 'codex-thread' | 'missing';
}
export interface RunPhaseUsage {
  phase: string;
  prompts: number;
  requests: UsageMetric;
  tokens: UsageMetric;
  costUsd: UsageMetric;
}
export interface RunUsageSummary extends UsageAmounts {
  version: 1;
  backend: 'pi' | 'codex';
  prompts: number;
  /** Lower bound of observed Pi responses, not transport attempts. Codex does not expose this count. */
  requests: UsageMetric;
  phases: RunPhaseUsage[];
  limitations: string[];
  /** Compact accounting evidence, retained to deduplicate after reloading saved state. No prompt contents. */
  observations: RunUsageObservation[];
}
