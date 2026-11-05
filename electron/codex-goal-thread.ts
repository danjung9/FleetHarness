import { spawn } from 'node:child_process';
import { CodexRpc, codexExecutable, type RpcMessage } from './codex-rpc.js';
import { runProcessEnvironment } from './process-sweep.js';
import type { ReasoningEffort } from '../shared/reasoning.js';

export interface CodexGoalThreadOptions {
  workspace: string;
  objective: string;
  executable?: string;
  /** Defaults to the user's existing Codex home, including its model and sign-in. */
  home?: string;
  env?: NodeJS.ProcessEnv;
  reasoningEffort?: ReasoningEffort;
  signal: AbortSignal;
  onThread?: (threadId: string) => void;
  onEvent?: (message: RpcMessage) => void;
}

export interface CodexGoalThreadResult {
  status: 'completed' | 'blocked' | 'stopped' | 'failed';
  error?: string;
}

async function checkGoalReasoningEffort(rpc: CodexRpc, model: string, effort: ReasoningEffort) {
  let cursor: string | undefined;
  const seen = new Set<string>();
  do {
    const page = await rpc.request('model/list', { includeHidden: true, ...(cursor ? { cursor } : {}) });
    const found = page.data?.find((entry: { id: string; model: string }) => entry.model === model || entry.id === model);
    if (found) {
      if (found.supportedReasoningEfforts?.some((option: { reasoningEffort: string }) => option.reasoningEffort === effort)) return;
      throw new Error(`Codex's configured model (${model}) does not support ${effort} reasoning. Choose another reasoning level or change the model in Codex.`);
    }
    cursor = typeof page.nextCursor === 'string' ? page.nextCursor : undefined;
    if (cursor && seen.has(cursor)) break;
    if (cursor) seen.add(cursor);
  } while (cursor);
  throw new Error(`Could not verify reasoning support for Codex's configured model (${model}). Refresh or update Codex, then try again.`);
}

/** Run a native Codex goal while keeping its app-server connection alive for UI updates. */
export async function runCodexGoalThread(options: CodexGoalThreadOptions): Promise<CodexGoalThreadResult> {
  if (!options.objective.trim()) throw new Error('A goal objective is required.');
  if (options.signal.aborted) return { status: 'stopped' };
  const env = runProcessEnvironment({ ...(options.env ?? process.env), ...(options.home ? { CODEX_HOME: options.home } : {}) });
  const rpc = new CodexRpc(spawn(options.executable ?? codexExecutable(), [
    'app-server', '--listen', 'stdio://', '--enable', 'goals'
  ], { cwd: options.workspace, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true }));
  let threadId: string | undefined;
  let turnId: string | undefined;
  let goalRequested = false;
  let outcome: CodexGoalThreadResult | undefined;
  let terminalGoal: CodexGoalThreadResult | undefined;
  let systemErrorTimer: ReturnType<typeof setTimeout> | undefined;
  let resolveDone!: (result: CodexGoalThreadResult) => void;
  const done = new Promise<CodexGoalThreadResult>(resolve => { resolveDone = resolve; });
  const finish = (result: CodexGoalThreadResult) => {
    if (outcome) return;
    outcome = result;
    clearTimeout(systemErrorTimer);
    resolveDone(result);
  };
  const onAbort = () => finish({ status: 'stopped' });
  options.signal.addEventListener('abort', onAbort, { once: true });
  const stopWatchingClose = rpc.onClose(error => finish({ status: 'failed', error: error.message }));
  const handleGoal = (goal: { status?: string }) => {
    switch (goal.status) {
      case 'active': terminalGoal = undefined; return;
      case 'complete': terminalGoal = { status: 'completed' }; break;
      case 'blocked': terminalGoal = { status: 'blocked', error: 'Codex needs help to continue this goal.' }; break;
      case 'usageLimited': terminalGoal = { status: 'blocked', error: 'Codex reached its usage limit before completing the goal.' }; break;
      case 'budgetLimited': terminalGoal = { status: 'blocked', error: 'Codex reached the goal token budget before completing the goal.' }; break;
      case 'paused': terminalGoal = { status: 'blocked', error: 'The Codex goal was paused before completion.' }; break;
      default: finish({ status: 'failed', error: 'Codex returned an unsupported goal status.' }); return;
    }
    // A model can complete its goal from a tool call before writing its final
    // answer. Keep streaming the current turn instead of killing that answer.
    if (!turnId) finish(terminalGoal);
  };
  const handleMessage = (message: RpcMessage) => {
    const params = message.params;
    const eventThread = params?.threadId ?? params?.thread?.id ?? params?.conversationId;
    const matchesThread = threadId !== undefined && eventThread === threadId;
    if (message.id !== undefined && message.method) {
      // No interactive client is attached. Never leave a server request pending
      // indefinitely or manufacture a human response/approval.
      rpc.send({ id: message.id, error: { code: -32601, message: 'This headless Codex session cannot answer interactive client requests.' } });
      if (!outcome && (!eventThread || matchesThread)) {
        if (matchesThread) options.onEvent?.(message);
        finish({ status: 'blocked', error: message.method === 'account/chatgptAuthTokens/refresh'
          ? 'Codex needs you to sign in again before continuing.'
          : 'Codex requested input or approval. Review its latest activity before retrying.' });
      }
      return;
    }
    if (!matchesThread || outcome) return;
    options.onEvent?.(message);
    if (message.method === 'turn/started') { turnId = params.turn?.id; clearTimeout(systemErrorTimer); }
    else if (message.method === 'thread/goal/updated') handleGoal(params.goal ?? {});
    else if (message.method === 'thread/goal/cleared') finish({ status: 'blocked', error: 'The Codex goal was cleared before completion.' });
    else if (message.method === 'turn/completed') {
      if (params.turn?.id === turnId) turnId = undefined;
      if (params.turn?.status === 'failed' || params.turn?.status === 'interrupted') {
        finish({ status: 'failed', error: params.turn.error?.message ?? `Codex's turn was ${params.turn.status} before the goal completed.` });
      } else if (params.turn?.status === 'completed' && terminalGoal) finish(terminalGoal);
      // A completed turn alone is not goal completion: Codex owns continuation.
    } else if (message.method === 'error') {
      clearTimeout(systemErrorTimer);
      if (params.willRetry !== true) finish({ status: 'failed', error: params.error?.message ?? 'Codex could not continue the goal.' });
    } else if (message.method === 'thread/status/changed' && params.status?.type === 'systemError') {
      // Codex emits this state before its detailed error notification. Give the
      // error/turn result a chance to arrive, with a fallback for broken servers.
      clearTimeout(systemErrorTimer);
      systemErrorTimer = setTimeout(() => finish({ status: 'failed', error: 'Codex encountered a system error while running the goal.' }), 250);
    } else if (message.method === 'thread/closed') {
      finish({ status: 'failed', error: 'Codex closed the goal session before completion.' });
    }
  };
  const unsubscribe = rpc.subscribe(message => {
    try { handleMessage(message); }
    catch (error) { finish({ status: 'failed', error: error instanceof Error ? error.message : 'Could not process a Codex update.' }); }
  });
  try {
    // Racing against completion also makes Stop work during initialization or
    // a stuck setup request, without waiting for the RPC's normal 30s timeout.
    void (async () => {
      await rpc.initialize();
      if (outcome) return;
      const started = await rpc.request('thread/start', { cwd: options.workspace, ephemeral: false,
        sandbox: 'danger-full-access', approvalPolicy: 'never',
        ...(options.reasoningEffort === undefined ? {} : { config: { model_reasoning_effort: options.reasoningEffort } }) });
      if (outcome) return;
      threadId = started.thread?.id;
      if (typeof threadId !== 'string' || !threadId) throw new Error('Codex did not create a goal session.');
      if (options.reasoningEffort !== undefined) {
        await checkGoalReasoningEffort(rpc, started.model, options.reasoningEffort);
        if (outcome) return;
        if (started.reasoningEffort !== options.reasoningEffort) throw new Error('Codex did not apply the selected reasoning level. Choose another reasoning level or change the model in Codex.');
      }
      options.onThread?.(threadId);
      if (outcome) return;
      goalRequested = true;
      const result = await rpc.request('thread/goal/set', { threadId, objective: options.objective, status: 'active', origin: 'user' });
      if (outcome) return;
      if (result.goal?.objective !== options.objective) throw new Error('Codex did not save the requested goal.');
      if (result.goal?.status !== 'active') handleGoal(result.goal);
    })().catch(error => finish({ status: 'failed', error: error instanceof Error ? error.message : 'Could not start the Codex goal.' }));
    return await done;
  } finally {
    options.signal.removeEventListener('abort', onAbort);
    clearTimeout(systemErrorTimer);
    if (outcome?.status === 'stopped' && threadId && goalRequested) {
      // Send pause before interrupt so an interrupted turn cannot restart active
      // goal pursuit. An unresponsive server must not prevent Stop from working.
      const stopping = [rpc.request('thread/goal/set', { threadId, status: 'paused', origin: 'user' })];
      if (turnId) stopping.push(rpc.request('turn/interrupt', { threadId, turnId }));
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([Promise.allSettled(stopping), new Promise<void>(resolve => { timer = setTimeout(resolve, 2000); })]);
      } finally { clearTimeout(timer); }
    }
    unsubscribe();
    stopWatchingClose();
    await rpc.dispose();
  }
}
