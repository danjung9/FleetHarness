import type { RunUsageObservation, RunUsageSummary, UsageAmounts, UsageMetric } from '../shared/run-usage.js';
export type { RunUsageSummary } from '../shared/run-usage.js';

const keys = ['tokens', 'inputTokens', 'outputTokens', 'cachedInputTokens', 'cacheWriteTokens', 'reasoningTokens', 'costUsd'] as const;
const unavailable = (): UsageMetric => ({ value: null, state: 'unavailable' });
const valid = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const count = (value: unknown): value is number => valid(value) && Number.isSafeInteger(value);
const metric = (value: unknown, state: UsageMetric['state'] = 'measured', source: UsageMetric['source'] = 'provider'): UsageMetric =>
  valid(value) ? { value, state, source } : unavailable();
const empty = (): UsageAmounts => Object.fromEntries(keys.map(key => [key, unavailable()])) as unknown as UsageAmounts;

/** Pi normalizes cache input into additive buckets; reasoning and 1h-cache are subsets. */
export function normalizePiUsage(usage: any, options: { catalogModelMatches?: boolean } = {}): UsageAmounts {
  const result = empty();
  if (valid(usage?.cost?.total) && usage.cost.totalFromProvider === true) result.costUsd = metric(usage.cost.total);
  if (!usage || ![usage.input, usage.output, usage.cacheRead, usage.cacheWrite, usage.totalTokens].some(n => count(n) && n > 0)) return result;
  const complete = [usage.input, usage.output, usage.cacheRead, usage.cacheWrite].every(count);
  // Some adapters populate only totalTokens while leaving every bucket at its zero default.
  // The positive total is evidence of consumption, not evidence of zero input/output.
  const missingBreakdown = count(usage.totalTokens) && usage.totalTokens > 0
    && ![usage.input, usage.output, usage.cacheRead, usage.cacheWrite].some(n => count(n) && n > 0);
  const total = complete && !missingBreakdown ? usage.input + usage.output + usage.cacheRead + usage.cacheWrite : count(usage.totalTokens) ? usage.totalTokens : null;
  const consistent = complete && !missingBreakdown && (!count(usage.totalTokens) || usage.totalTokens === total);
  result.tokens = metric(total, consistent ? 'measured' : 'partial');
  if (!missingBreakdown) {
    result.inputTokens = [usage.input, usage.cacheRead, usage.cacheWrite].every(count)
      ? metric(usage.input + usage.cacheRead + usage.cacheWrite) : unavailable();
    result.outputTokens = count(usage.output) ? metric(usage.output) : unavailable();
    result.cachedInputTokens = count(usage.cacheRead) ? metric(usage.cacheRead) : unavailable();
    result.cacheWriteTokens = count(usage.cacheWrite) ? metric(usage.cacheWrite) : unavailable();
    result.reasoningTokens = count(usage.reasoning) && (!count(usage.output) || usage.reasoning <= usage.output) ? metric(usage.reasoning) : unavailable();
  }
  if (valid(usage.cost?.total)) {
    if (usage.cost.totalFromProvider === true) result.costUsd = metric(usage.cost.total);
    // An absent/zero catalog price does not establish that this request was free.
    else if (usage.cost.total > 0 && options.catalogModelMatches !== false) result.costUsd = metric(usage.cost.total, 'estimated', 'catalog');
  }
  return result;
}

/** Codex input/output already include cached/reasoning tokens. Never add the breakdown twice. */
export function normalizeCodexUsage(usage: any): UsageAmounts {
  const result = empty();
  if (!usage || ![usage.inputTokens, usage.outputTokens, usage.totalTokens].some(n => count(n) && n > 0)) return result;
  const complete = count(usage.inputTokens) && count(usage.outputTokens);
  const missingBreakdown = count(usage.totalTokens) && usage.totalTokens > 0
    && ![usage.inputTokens, usage.outputTokens].some(n => count(n) && n > 0);
  const total = complete && !missingBreakdown ? usage.inputTokens + usage.outputTokens : count(usage.totalTokens) ? usage.totalTokens : null;
  result.tokens = metric(total, complete && !missingBreakdown && (!count(usage.totalTokens) || total === usage.totalTokens) ? 'measured' : 'partial');
  if (missingBreakdown) return result;
  result.inputTokens = count(usage.inputTokens) ? metric(usage.inputTokens) : unavailable();
  result.outputTokens = count(usage.outputTokens) ? metric(usage.outputTokens) : unavailable();
  for (const [target, source] of [['cachedInputTokens', 'cachedInputTokens'], ['cacheWriteTokens', 'cacheWriteInputTokens'], ['reasoningTokens', 'reasoningOutputTokens']] as const) {
    const bound = target === 'reasoningTokens' ? usage.outputTokens : usage.inputTokens;
    result[target] = count(usage[source]) && (!count(bound) || usage[source] <= bound) ? metric(usage[source]) : unavailable();
  }
  // ChatGPT allowance has no per-run USD conversion.
  return result;
}

function totals(records: RunUsageObservation[]): UsageAmounts {
  return Object.fromEntries(keys.map(key => {
    const values = records.map(record => record[key]).filter(value => value.value !== null);
    if (!values.length) return [key, unavailable()];
    const sources = new Set(values.map(value => value.source));
    return [key, { value: values.reduce((sum, value) => sum + value.value!, 0), state: 'partial',
      source: sources.size === 1 ? values[0].source : 'mixed' }];
  })) as unknown as UsageAmounts;
}

/** Observational ledger: no event here authorizes a request or promises a hard token/spend cap. */
export class RunUsageLedger {
  private records = new Map<string, RunUsageObservation>();
  private prompts = new Map<string, number>();
  private sessionRecords = new Map<string, number>();
  private sequences = new Map<string, number>();
  private responses = new Map<string, { id: string; started: boolean }>();
  private compactions = new Map<string, string>();
  private unframedEvents = new Map<string, WeakMap<object, string>>();
  constructor(private backend: 'pi' | 'codex', previous?: RunUsageSummary) {
    if (previous?.version === 1 && previous.backend === backend) {
      for (const record of previous.observations) {
        this.records.set(record.id, structuredClone(record));
        const local = /^(.*):(response|compaction):local:(\d+)$/.exec(record.id);
        if (local) this.sequences.set(local[1], Math.max(this.sequences.get(local[1]) ?? 0, Number(local[3])));
      }
      for (const phase of previous.phases) this.prompts.set(phase.phase, phase.prompts);
    }
  }
  beginPrompt(phase: string) { this.prompts.set(phase, (this.prompts.get(phase) ?? 0) + 1); }
  private localId(sessionKey: string, kind: 'response' | 'compaction') {
    const serial = (this.sequences.get(sessionKey) ?? 0) + 1;
    this.sequences.set(sessionKey, serial);
    return `${sessionKey}:${kind}:local:${serial}`;
  }
  private unframedId(sessionKey: string, kind: 'response' | 'compaction', value: object) {
    // Real Pi streams supply start boundaries. An end-only adapter can provide a responseId,
    // or repeat the same object; equal content alone is never evidence of request identity.
    let events = this.unframedEvents.get(sessionKey);
    if (!events) { events = new WeakMap(); this.unframedEvents.set(sessionKey, events); }
    let id = events.get(value);
    if (!id) { id = this.localId(sessionKey, kind); events.set(value, id); }
    return id;
  }
  event(phase: string, event: any, sessionKey = phase) {
    if (this.backend === 'codex') {
      if (event?.type !== 'usage_update' || typeof event.threadId !== 'string') return;
      const id = `${sessionKey}:codex:${event.threadId}`, amounts = normalizeCodexUsage(event.usage);
      const previous = this.records.get(id);
      if (previous) {
        // Replace a cumulative report atomically. Per-field maxima would mix breakdowns
        // from different reports and can make input + output exceed the supplied total.
        // Missing totals and stale reports cannot erase already observed consumption.
        if (previous.tokens.value !== null && (amounts.tokens.value === null || amounts.tokens.value < previous.tokens.value)) return;
      }
      this.records.set(id, { id, phase, kind: 'codex-thread', ...amounts });
      this.sessionRecords.set(sessionKey, (this.sessionRecords.get(sessionKey) ?? 0) + 1);
      return;
    }
    if (event?.type === 'turn_start') {
      this.responses.set(sessionKey, { id: this.localId(sessionKey, 'response'), started: false }); return;
    }
    if (event?.type === 'message_start' && event.message?.role === 'assistant') {
      const current = this.responses.get(sessionKey);
      this.responses.set(sessionKey, current && !current.started ? { ...current, started: true }
        : { id: this.localId(sessionKey, 'response'), started: true });
      return;
    }
    if (event?.type === 'compaction_start') {
      this.compactions.set(sessionKey, this.localId(sessionKey, 'compaction')); return;
    }
    const message = event?.type === 'message_end' && event.message?.role === 'assistant' ? event.message : undefined;
    const compaction = event?.type === 'compaction_end';
    if (!message && !compaction) return;
    const kind = message ? 'response' : event.result ? 'compaction' : 'missing';
    const id = message ? typeof message.responseId === 'string' && message.responseId
      ? `${sessionKey}:response:provider:${message.responseId}`
      : this.responses.get(sessionKey)?.id ?? this.unframedId(sessionKey, 'response', message)
      : this.compactions.get(sessionKey) ?? this.unframedId(sessionKey, 'compaction', event);
    if (message && this.responses.has(sessionKey)) this.responses.get(sessionKey)!.started = true;
    if (this.records.has(id)) return;
    const amounts = normalizePiUsage(message?.usage ?? event.result?.usage, {
      // Compaction's aggregate loses response-model attribution. Retain only a provider-reported cost there.
      catalogModelMatches: !!message && (!message.responseModel || message.responseModel === message.model)
    });
    this.records.set(id, { id, phase, kind, ...amounts });
    this.sessionRecords.set(sessionKey, (this.sessionRecords.get(sessionKey) ?? 0) + 1);
  }
  endSession(phase: string, sessionKey = phase, interrupted = false) {
    if (interrupted || !this.sessionRecords.has(sessionKey)) {
      const id = `${sessionKey}:unreported`;
      this.records.set(id, { id, phase, kind: 'missing', ...empty() });
    }
  }
  snapshot(): RunUsageSummary {
    const observations = [...this.records.values()];
    const phases = [...new Set([...this.prompts.keys(), ...observations.map(record => record.phase)])];
    const requestCount = (records: RunUsageObservation[]): UsageMetric => {
      const observed = records.filter(record => record.kind === 'response' || record.kind === 'compaction').length;
      return this.backend === 'pi' && observed > 0 ? { value: observed, state: 'partial' } : unavailable();
    };
    return structuredClone({
      version: 1, backend: this.backend, ...totals(observations),
      prompts: [...this.prompts.values()].reduce((sum, value) => sum + value, 0), requests: requestCount(observations),
      phases: phases.map(phase => { const records = observations.filter(record => record.phase === phase); const amount = totals(records);
        return { phase, prompts: this.prompts.get(phase) ?? 0, requests: requestCount(records), tokens: amount.tokens, costUsd: amount.costUsd }; }),
      limitations: this.backend === 'pi' ? [
        'Requests count observed assistant and compaction responses, not all network attempts. Provider transport retries may be hidden.',
        'Tokens and cost are partial observations. Missing, canceled and unreported work can consume additional usage. Catalog costs are estimates, not a bill.'
      ] : [
        'Codex reports cumulative thread tokens, not a complete public request count. Submitted prompts are not model requests.',
        'Tokens are partial observations; interrupted work may not report usage. ChatGPT subscription allowance has no per-run dollar cost.'
      ], observations
    });
  }
}
