import type { AgentSession, AgentSessionEvent } from '@earendil-works/pi-coding-agent';

export type StageSession = Pick<AgentSession, 'prompt' | 'subscribe' | 'abort' | 'dispose'>;
export interface AgentLimits { timeoutMs: number; idleMs: number; maxTurns?: number }
export const defaultAgentLimits: AgentLimits = { timeoutMs: 30 * 60_000, idleMs: 5 * 60_000 };
export const stoppedMessage = 'Run stopped by you. Source and session logs are saved.';

/** Bound setup, model/tool work and artifact recovery even when the SDK ignores abort. */
export async function runAgentStage(options: {
  label: string;
  signal: AbortSignal;
  limits?: Partial<AgentLimits>;
  create: (signal: AbortSignal) => Promise<StageSession>;
  work: (prompt: (text: string) => Promise<void>, signal: AbortSignal) => Promise<void>;
  onEvent: (event: AgentSessionEvent) => void;
}) {
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
        const reason = event.message.stopReason;
        assistantError = reason === 'error' ? event.message.errorMessage || 'The model provider returned an error.'
          : reason === 'aborted' ? 'The model stopped before completing this stage.'
          : reason === 'length' ? 'The model exhausted its response limit before completing this stage.' : '';
      }
      options.onEvent(event);
    });
    await options.work(async text => {
      check(); assistantError = ''; lastActivity = 'waiting for the model'; heartbeat();
      await created.prompt(text);
      check();
      if (assistantError) throw new Error(assistantError);
      lastActivity = 'checking stage artifacts'; heartbeat();
    }, controller.signal);
    check();
  })();
  try { await Promise.race([work, interrupted]); succeeded = true; }
  finally {
    closed = true;
    controller.abort(failure ?? new Error('Agent stage closed.'));
    clearTimeout(deadline); clearTimeout(idleTimer!);
    options.signal.removeEventListener('abort', abort);
    // A session that finishes initialization after cancellation is released above.
    try { unsubscribe?.(); } finally { if (session) release(session, !succeeded); }
  }
}
