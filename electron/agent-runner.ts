import type { AgentSession, AgentSessionEvent } from '@earendil-works/pi-coding-agent';
import { normalizeTokenTotals, piTokenTotals, type TokenTotals } from '../shared/token-usage.js';
import type { StageTokenUsage } from '../shared/types.js';

export type StageEvent = AgentSessionEvent | { type: 'usage_update'; usage: StageTokenUsage | null };
export type StageSession = Pick<AgentSession, 'prompt' | 'abort' | 'dispose'> & {
  getSessionStats?: AgentSession['getSessionStats'];
  getTokenUsage?(): TokenTotals | undefined;
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
export interface AgentLimits {
  /** Optional total deadline; productive worker phases have no elapsed-time cap by default. */
  timeoutMs?: number;
  idleMs: number;
  maxTurns?: number;
}
export const defaultAgentLimits: AgentLimits = { idleMs: 5 * 60_000 };
export const stoppedMessage = 'Run stopped by you. Source and session logs are saved.';

/** Enforce inactivity, cancellation and optional budgets even when the SDK ignores abort. */
export async function runAgentStage(options: {
  label: string;
  signal: AbortSignal;
  limits?: Partial<AgentLimits>;
  /** Recovery guidance for stages that can retry from a saved checkpoint. */
  recoveryHint?: string;
  /** Keep model/session errors and event-supplied tool names out of public failures. */
  privateActivity?: boolean;
  create: (signal: AbortSignal) => Promise<StageSession>;
  work: (prompt: (text: string) => Promise<void>, signal: AbortSignal, hostWork: <T>(work: () => Promise<T>) => Promise<T>) => Promise<void>;
  onEvent: (event: StageEvent) => void;
  onMetrics?: (metrics: { durationMs: number; usage: StageTokenUsage | null }) => void;
  /** Cumulative totals for this session; undefined marks an unreported request. */
  onUsage?: (totals: TokenTotals | undefined) => Promise<void> | void;
}) {
  const started = performance.now();
  let usage: StageTokenUsage | null = null, sawUsage = false, receipts = 0;
  let pendingPromptReceipts: number | undefined;
  const accumulate = (next: StageTokenUsage | null) => {
    usage = sawUsage ? sumTokenUsage(usage, next) : next; sawUsage = true;
  };
  const limits = { ...defaultAgentLimits, ...options.limits };
  for (const [key, value] of Object.entries(limits)) {
    if ((key === 'timeoutMs' || key === 'maxTurns') && value === undefined) continue;
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid agent limit: ${key}`);
  }
  if (options.signal.aborted) throw new Error(stoppedMessage);
  const controller = new AbortController();
  let session: StageSession | undefined, unsubscribe: (() => void) | undefined;
  let closed = false, succeeded = false, failure: Error | undefined, assistantError = '', turns = 0;
  let usageWrites = Promise.resolve(), lastUsage = '', usageStarted = false;
  let usageWriteError: unknown, providerReportedUsage = false;
  let observedUsage: TokenTotals | undefined;
  let activeMessage: { baseline?: TokenTotals } | undefined;
  const completedMessages = new WeakSet<object>();
  const measuredMessages = new WeakSet<object>();
  const retainUsage = (totals: TokenTotals | undefined) => {
    if (totals && (!observedUsage || totals.totalTokens >= observedUsage.totalTokens)) observedUsage = totals;
  };
  const publishUsage = (totals: TokenTotals | undefined) => {
    if (!options.onUsage || (!totals && usageStarted)) return;
    const key = JSON.stringify(totals) ?? 'unreported';
    if (key === lastUsage) return;
    usageStarted = true; lastUsage = key;
    usageWrites = usageWrites.then(() => options.onUsage?.(totals)).catch(error => { usageWriteError ??= error; });
  };
  const readUsage = () => {
    if (!session || !usageStarted) return;
    if (session.getTokenUsage) { const totals = normalizeTokenTotals(session.getTokenUsage()); if (totals) publishUsage(totals); }
    else if (session.getSessionStats) {
      const totals = piTokenTotals(session.getSessionStats().tokens);
      if (totals && (totals.totalTokens > 0 || providerReportedUsage)) retainUsage(totals);
      if (observedUsage) publishUsage(observedUsage);
    } else if (observedUsage) publishUsage(observedUsage);
  };
  let lastActivity = 'initializing the agent session';
  let hostWorking = false;
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
    if (hostWorking) return;
    idleTimer = setTimeout(() => fail(`${options.label} made no progress for ${limits.idleMs / 1000} seconds while ${lastActivity}. ${options.recoveryHint ?? 'Inspect the saved activity and start a new run.'}`), limits.idleMs);
  };
  const abort = () => fail(stoppedMessage);
  const check = () => { if (failure) throw failure; controller.signal.throwIfAborted(); };
  const modelFailure = (error: unknown, activity: string) => options.privateActivity
    ? new Error(`Agent stage failure: ${options.label} ${activity}. ${options.recoveryHint ?? 'Check the model connection and retry.'}`)
    : error;
  const release = (target: StageSession, cancel: boolean) => {
    // abort() waits for idle in Pi. Cleanup must not depend on that promise settling.
    if (cancel) { try { void Promise.resolve(target.abort()).catch(() => {}); } catch {} }
    try { void Promise.resolve(target.dispose()).catch(() => {}); } catch {}
  };
  options.signal.addEventListener('abort', abort, { once: true });
  const timeoutMs = limits.timeoutMs;
  const deadline = timeoutMs === undefined ? undefined : setTimeout(() => fail(`${options.label} exceeded the ${timeoutMs / 60_000}-minute limit. ${options.recoveryHint ?? 'Inspect the saved artifacts before retrying.'}`), timeoutMs);
  heartbeat();
  const work = (async () => {
    let created: StageSession;
    try { created = await options.create(controller.signal); }
    catch (error) { check(); throw modelFailure(error, 'could not initialize its model session'); }
    if (closed || failure) { release(created, true); check(); return; }
    session = created;
    unsubscribe = created.subscribe(event => {
      if (closed || failure) return;
      if (event.type === 'usage_update' || event.type === 'compaction_end' || (event.type === 'message_end' && event.message.role === 'assistant')) receipts++;
      if (event.type === 'usage_update') {
        usage = event.usage; sawUsage = true;
        if (!created.getTokenUsage) publishUsage(normalizeTokenTotals(event.usage));
      }
      // Pi compaction uses a separate model call, outside assistant messages.
      if (event.type === 'compaction_end') accumulate(tokenUsage(event.result?.usage, 'pi'));
      if (!created.getTokenUsage && ['message_start', 'message_update', 'message_end'].includes(event.type)
        && 'message' in event && (event.message.role === 'assistant' || event.message.role === 'toolResult')
        && !completedMessages.has(event.message)) {
        if (event.type === 'message_start' || !activeMessage) {
          if (event.type === 'message_start') readUsage();
          activeMessage = { baseline: observedUsage };
        }
        let totals = piTokenTotals(event.message.usage);
        // Pi initializes usage to zero before the provider responds. Failed or
        // aborted zero-usage messages cannot establish that zero was reported.
        if (totals?.totalTokens === 0 && (event.type !== 'message_end' || (event.message.role === 'assistant'
          && ['error', 'aborted'].includes(event.message.stopReason)))) totals = undefined;
        if (totals) providerReportedUsage = true;
        if (totals) {
          // Streaming usage is cumulative for one response. Keep a lower bound
          // before onEvent can cancel and dispose Pi before its final append.
          // Persisted session totals reconcile via max, so finalization does not
          // add that same response again and retries start a new baseline.
          retainUsage(normalizeTokenTotals({
            inputTokens: (activeMessage.baseline?.inputTokens ?? 0) + totals.inputTokens,
            outputTokens: (activeMessage.baseline?.outputTokens ?? 0) + totals.outputTokens,
            cachedInputTokens: (activeMessage.baseline?.cachedInputTokens ?? 0) + totals.cachedInputTokens
          }));
          if (observedUsage) publishUsage(observedUsage);
        }
        if (event.type === 'message_end') { completedMessages.add(event.message); activeMessage = undefined; }
      }
      if (created.getTokenUsage || ['message_end', 'turn_end', 'agent_end', 'compaction_end', 'entry_appended'].includes(event.type)) {
        // Pi publishes message_end before appending it to the persisted session.
        queueMicrotask(() => { if (!closed) readUsage(); });
      }
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
          lastActivity = options.privateActivity ? 'running an agent tool' : `running ${event.toolName}`; heartbeat(); break;
        case 'turn_start':
          if (limits.maxTurns !== undefined && ++turns > limits.maxTurns) { fail(`${options.label} reached the ${limits.maxTurns}-turn limit. ${options.recoveryHint ?? 'Inspect its artifacts before retrying.'}`); return; }
          lastActivity = 'waiting for the model'; heartbeat(); break;
      }
      // A transient provider error can be followed by a successful SDK retry or compaction.
      // Only the final assistant outcome of this prompt determines its result.
      if (event.type === 'message_end' && event.message.role === 'assistant') {
        if (!measuredMessages.has(event.message)) {
          measuredMessages.add(event.message);
          accumulate(tokenUsage(event.message.usage, 'pi'));
        }
        const reason = event.message.stopReason;
        assistantError = reason === 'error' ? (!options.privateActivity && event.message.errorMessage) || 'The model provider returned an error.'
          : reason === 'aborted' ? 'The model stopped before completing this stage.'
          : reason === 'length' ? 'The model exhausted its response limit before completing this stage.' : '';
      }
      options.onEvent(event);
    });
    await options.work(async text => {
      check(); assistantError = ''; lastActivity = 'waiting for the model'; heartbeat();
      publishUsage(undefined);
      const before = receipts;
      pendingPromptReceipts = before;
      try { await created.prompt(text); }
      catch (error) { check(); throw modelFailure(error, 'could not complete the model request'); }
      finally {
        if (!closed && receipts === before) accumulate(null);
        pendingPromptReceipts = undefined;
        readUsage();
      }
      check();
      if (assistantError) throw options.privateActivity
        ? new Error(`Agent stage failure: ${options.label}: ${assistantError} ${options.recoveryHint ?? 'Check the model connection and retry.'}`)
        : new Error(assistantError);
      lastActivity = 'checking stage artifacts'; heartbeat();
    }, controller.signal, async hostWork => {
      check(); hostWorking = true; clearTimeout(idleTimer);
      try { return await hostWork(); }
      finally { hostWorking = false; if (!closed && !failure) heartbeat(); }
    });
    check();
  })();
  try { await Promise.race([work, interrupted]); succeeded = true; }
  finally {
    // Cancellation can win the race before prompt() settles. Invalidate a missing
    // current receipt now, before publishing metrics from earlier completed turns.
    if (pendingPromptReceipts !== undefined && pendingPromptReceipts === receipts) accumulate(null);
    readUsage();
    closed = true;
    controller.abort(failure ?? new Error('Agent stage closed.'));
    clearTimeout(deadline); clearTimeout(idleTimer!);
    options.signal.removeEventListener('abort', abort);
    // A session that finishes initialization after cancellation is released above.
    try { unsubscribe?.(); } finally {
      if (session) release(session, !succeeded);
      options.onMetrics?.({ durationMs: Math.round(performance.now() - started), usage });
    }
    await usageWrites;
    if (usageWriteError) throw usageWriteError;
  }
}
