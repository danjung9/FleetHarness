import type { AgentSession, AgentSessionEvent } from '@earendil-works/pi-coding-agent';
import type { StageTokenUsage } from '../shared/types.js';

export type StageEvent = AgentSessionEvent | { type: 'usage_update'; usage: StageTokenUsage | null };
export type StageSession = Pick<AgentSession, 'prompt' | 'abort' | 'dispose'> & {
  subscribe: (listener: (event: StageEvent) => void) => () => void;
};
const count = (n: unknown): number | null => Number.isSafeInteger(n) && (n as number) >= 0 ? n as number : null;
const add = (...values: (number | null)[]) => values.every(v => v !== null) ? count(values.reduce<number>((sum, n) => sum + n!, 0)) : null;

export function sumTokenUsage(a: StageTokenUsage | null, b: StageTokenUsage | null): StageTokenUsage | null {
  if (!a && !b) return null;
  return Object.fromEntries(Object.keys(a ?? b!).map(key => [key, add(a?.[key as keyof StageTokenUsage] ?? null, b?.[key as keyof StageTokenUsage] ?? null)])) as unknown as StageTokenUsage;
}

/** Pi input excludes both cache reads and cache writes; Codex input includes cache reads. */
export function tokenUsage(raw: unknown, engine: 'pi' | 'codex'): StageTokenUsage | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  const cachedInputTokens = count(engine === 'pi' ? u.cacheRead : u.cachedInputTokens);
  const inputTokens = engine === 'pi' ? add(count(u.input), cachedInputTokens, count(u.cacheWrite)) : count(u.inputTokens);
  const uncachedInputTokens = engine === 'pi' ? add(count(u.input), count(u.cacheWrite))
    : inputTokens !== null && cachedInputTokens !== null ? count(inputTokens - cachedInputTokens) : null;
  const outputTokens = count(engine === 'pi' ? u.output : u.outputTokens);
  return { inputTokens, cachedInputTokens, uncachedInputTokens, outputTokens,
    reasoningOutputTokens: count(engine === 'pi' ? u.reasoning : u.reasoningOutputTokens), totalTokens: count(u.totalTokens),
    uncachedPlusOutputTokens: add(uncachedInputTokens, outputTokens) };
}
export interface AgentLimits { timeoutMs: number; idleMs: number; maxTurns: number }
export const defaultAgentLimits: AgentLimits = { timeoutMs: 30 * 60_000, idleMs: 5 * 60_000, maxTurns: 40 };
export const stoppedMessage = 'Run stopped by you. Source and session logs are saved.';

/** Bound setup, model/tool work and artifact recovery even when the SDK ignores abort. */
export async function runAgentStage(options: {
  label: string;
  signal: AbortSignal;
  limits?: Partial<AgentLimits>;
  create: (signal: AbortSignal) => Promise<StageSession>;
  work: (prompt: (text: string) => Promise<void>, signal: AbortSignal) => Promise<void>;
  onEvent: (event: StageEvent) => void;
  onMetrics?: (metrics: { durationMs: number; usage: StageTokenUsage | null }) => void;
}) {
  const started = performance.now();
  let usage: StageTokenUsage | null = null, sawUsage = false, receipts = 0;
  let pendingPromptReceipts: number | undefined;
  const accumulate = (next: StageTokenUsage | null) => {
    usage = sawUsage ? sumTokenUsage(usage, next) : next; sawUsage = true;
  };
  const limits = { ...defaultAgentLimits, ...options.limits };
  for (const [key, value] of Object.entries(limits)) {
    if (key === 'maxTurns' && value === undefined) continue;
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid agent limit: ${key}`);
  }
  if (options.signal.aborted) throw new Error(stoppedMessage);
  const controller = new AbortController();
  let session: StageSession | undefined, unsubscribe: (() => void) | undefined;
  let closed = false, succeeded = false, failure: Error | undefined, assistantError = '', turns = 0;
  let lastActivity = 'initializing the agent session';
  let idleTimer: ReturnType<typeof setTimeout>;
  let rejectInterrupted!: (error: Error) => void;
  const interrupted = new Promise<never>((_resolve, reject) => { rejectInterrupted = reject; });
  const fail = (message: string) => {
    if (closed || failure) return;
    failure = new Error(message);
    rejectInterrupted(failure);
    controller.abort(failure);
  };
  const heartbeat = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => fail(`${options.label} made no progress for ${limits.idleMs / 1000} seconds while ${lastActivity}. Inspect the saved activity and start a new run.`), limits.idleMs);
  };
  const abort = () => fail(stoppedMessage);
  const check = () => { if (failure) throw failure; controller.signal.throwIfAborted(); };
  const release = (target: StageSession, cancel: boolean) => {
    // abort() waits for idle in Pi. Cleanup must not depend on that promise settling.
    if (cancel) { try { void Promise.resolve(target.abort()).catch(() => {}); } catch {} }
    try { target.dispose(); } catch {}
  };
  options.signal.addEventListener('abort', abort, { once: true });
  const deadline = setTimeout(() => fail(`${options.label} exceeded the ${limits.timeoutMs / 60_000}-minute limit. Inspect the saved artifacts before retrying.`), limits.timeoutMs);
  heartbeat();
  const work = (async () => {
    const created = await options.create(controller.signal);
    if (closed || failure) { release(created, true); check(); return; }
    session = created;
    unsubscribe = created.subscribe(event => {
      if (closed || failure) return;
      if (event.type === 'usage_update' || event.type === 'compaction_end' || (event.type === 'message_end' && event.message.role === 'assistant')) receipts++;
      if (event.type === 'usage_update') { usage = event.usage; sawUsage = true; }
      // Pi compaction uses a separate model call, outside assistant messages.
      if (event.type === 'compaction_end') accumulate(tokenUsage(event.result?.usage, 'pi'));
      switch (event.type) {
        case 'message_update':
          lastActivity = 'receiving the model response'; heartbeat(); break;
        case 'tool_execution_update':
          heartbeat(); break;
        case 'tool_execution_end':
        case 'turn_end':
        case 'message_end':
          lastActivity = 'waiting for the model'; heartbeat(); break;
        case 'auto_retry_start':
          lastActivity = 'waiting for a provider retry'; heartbeat(); break;
        case 'auto_retry_end':
        case 'compaction_end':
          lastActivity = 'waiting for the model'; heartbeat(); break;
        case 'compaction_start':
        case 'summarization_retry_scheduled':
        case 'summarization_retry_attempt_start':
        case 'summarization_retry_finished':
          lastActivity = 'compacting the agent context'; heartbeat(); break;
        case 'tool_execution_start':
          lastActivity = `running ${event.toolName}`; heartbeat(); break;
        case 'turn_start':
          if (limits.maxTurns !== undefined && ++turns > limits.maxTurns) { fail(`${options.label} reached the ${limits.maxTurns}-turn limit. Inspect its artifacts before retrying.`); return; }
          lastActivity = 'waiting for the model'; heartbeat(); break;
      }
      // A transient provider error can be followed by a successful SDK retry or compaction.
      // Only the final assistant outcome of this prompt determines its result.
      if (event.type === 'message_end' && event.message.role === 'assistant') {
        accumulate(tokenUsage(event.message.usage, 'pi'));
        const reason = event.message.stopReason;
        assistantError = reason === 'error' ? event.message.errorMessage || 'The model provider returned an error.'
          : reason === 'aborted' ? 'The model stopped before completing this stage.'
          : reason === 'length' ? 'The model exhausted its response limit before completing this stage.' : '';
      }
      options.onEvent(event);
    });
    await options.work(async text => {
      check(); assistantError = ''; lastActivity = 'waiting for the model'; heartbeat();
      const before = receipts;
      pendingPromptReceipts = before;
      try { await created.prompt(text); }
      finally {
        if (!closed && receipts === before) accumulate(null);
        pendingPromptReceipts = undefined;
      }
      check();
      if (assistantError) throw new Error(assistantError);
      lastActivity = 'checking stage artifacts'; heartbeat();
    }, controller.signal);
    check();
  })();
  try { await Promise.race([work, interrupted]); succeeded = true; }
  finally {
    // Cancellation can win the race before prompt() settles. Invalidate a missing
    // current receipt now, before publishing metrics from earlier completed turns.
    if (pendingPromptReceipts !== undefined && pendingPromptReceipts === receipts) accumulate(null);
    closed = true;
    controller.abort(failure ?? new Error('Agent stage closed.'));
    clearTimeout(deadline); clearTimeout(idleTimer!);
    options.signal.removeEventListener('abort', abort);
    // A session that finishes initialization after cancellation is released above.
    try { unsubscribe?.(); } finally {
      if (session) release(session, !succeeded);
      options.onMetrics?.({ durationMs: Math.round(performance.now() - started), usage });
    }
  }
}
