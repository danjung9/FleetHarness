import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { tokenUsage, type StageEvent, type StageSession } from './agent-runner.js';
import { CodexRpc, type RpcMessage } from './codex-rpc.js';
import { runProcessEnvironment } from './process-sweep.js';

type Tool = Pick<ToolDefinition, 'name' | 'description' | 'parameters'> & { execute: (id: string, args: any, signal?: AbortSignal) => Promise<{ content: { type: string; text?: string }[] }> };
export async function createCodexSession(options: {
  home: string; cwd: string; model: string; signal: AbortSignal; tools: ToolDefinition[]; skillPaths?: string[];
  launch?: (home: string) => CodexRpc;
}): Promise<StageSession> {
  const rpc = (options.launch ?? CodexRpc.launch)(options.home);
  const listeners = new Set<(event: StageEvent) => void>();
  // Reuse the factory's existing activity contract; Codex never starts a Pi session.
  const emit = (event: object) => { for (const listener of listeners) listener(event as StageEvent); };
  let threadId = '', turnId = '', disposed = false;
  let currentTurn: { id: string; hasUsage: boolean } | undefined;
  const previousTurns = new Set<string>();
  const earlyUsage = new Map<string, unknown>();
  const reportUsage = (total: unknown) => {
    currentTurn!.hasUsage = true;
    emit({ type: 'usage_update', usage: tokenUsage(total, 'codex') });
  };
  const identifyTurn = (id: string) => {
    if (!currentTurn) return;
    currentTurn.id = id; turnId = id;
    if (earlyUsage.has(id)) reportUsage(earlyUsage.get(id));
    earlyUsage.clear();
  };
  let pending: { resolve: () => void; reject: (error: Error) => void } | undefined;
  const settle = (error?: Error) => { const current = pending; pending = undefined; turnId = ''; if (error) current?.reject(error); else current?.resolve(); };
  const tools = options.tools as unknown as Tool[];
  const controller = new AbortController();
  const stop = () => { controller.abort(); settle(new Error('Codex run stopped.')); rpc.dispose(); };
  options.signal.addEventListener('abort', stop, { once: true });
  rpc.onClose(error => settle(error));
  async function serverRequest(message: RpcMessage) {
    const params = message.params;
    if (message.method !== 'item/tool/call' || params?.threadId !== threadId || !pending || controller.signal.aborted) {
      rpc.send({ id: message.id, error: { code: -32601, message: 'This unattended workflow does not support this request.' } }); return;
    }
    try {
      const tool = tools.find(t => t.name === params.tool);
      if (!tool) throw new Error('Unknown AppYard tool: ' + params.tool);
      const result = await tool.execute(params.callId, params.arguments, controller.signal);
      controller.signal.throwIfAborted();
      rpc.send({ id: message.id, result: { contentItems: result.content.filter(c => c.type === 'text').map(c => ({ type: 'inputText', text: c.text || '' })), success: true } });
    } catch (error) { rpc.send({ id: message.id, result: { contentItems: [{ type: 'inputText', text: error instanceof Error ? error.message : String(error) }], success: false } }); }
  }
  rpc.subscribe(message => {
    if (message.id !== undefined && message.method) { void serverRequest(message); return; }
    const p = message.params;
    if (disposed || controller.signal.aborted || p?.threadId !== threadId) return;
    if (message.method === 'thread/tokenUsage/updated') {
      // Each stage owns a fresh thread. Replace cumulative totals, never sum them.
      // Accept a final receipt immediately following turn/completed as well.
      if (!currentTurn || typeof p.turnId !== 'string') return;
      if (!currentTurn.id && previousTurns.has(p.turnId)) return;
      if (!currentTurn.id) earlyUsage.set(p.turnId, p.tokenUsage?.total);
      else if (p.turnId === currentTurn.id) reportUsage(p.tokenUsage?.total);
      return;
    }
    if (!pending) return;
    if (!currentTurn?.id && p.turn?.id && previousTurns.has(p.turn.id)) return;
    switch (message.method) {
      case 'turn/started':
        if (currentTurn?.id && p.turn.id !== currentTurn.id) return;
        identifyTurn(p.turn.id); emit({ type: 'turn_start' }); break;
      case 'item/agentMessage/delta': emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: p.delta } }); break;
      case 'item/commandExecution/outputDelta':
      case 'item/reasoning/summaryTextDelta':
      case 'item/reasoning/textDelta': emit({ type: 'tool_execution_update' }); break;
      case 'item/started':
      case 'item/completed': {
        const item = p.item;
        if (['commandExecution', 'fileChange', 'dynamicToolCall', 'mcpToolCall', 'webSearch'].includes(item.type)) {
          const start = message.method === 'item/started';
          const name = item.tool || (item.type === 'commandExecution' ? 'bash' : item.type === 'fileChange' ? 'edit' : item.type);
          if (start) emit({ type: 'tool_execution_start', toolCallId: item.id, toolName: name, args: item.arguments ?? { command: item.command, path: item.changes?.map((c: any) => c.path).join(', ') } });
          else emit({ type: 'tool_execution_end', toolCallId: item.id, toolName: name, result: item.aggregatedOutput ?? item.contentItems ?? item.changes ?? item.status, isError: ['failed', 'declined'].includes(item.status) || item.success === false });
        } else emit({ type: 'tool_execution_update' });
        break;
      }
      case 'error': if (!p.willRetry) settle(new Error(p.error?.message || 'Codex could not complete the turn.')); break;
      case 'turn/completed':
        if (turnId && p.turn.id !== turnId) return;
        identifyTurn(p.turn.id);
        emit({ type: 'turn_end' });
        settle(p.turn.status === 'completed' ? undefined : new Error(p.turn.error?.message || `Codex turn ${p.turn.status}. Check your ChatGPT connection and usage in Settings.`)); break;
    }
  });
  try {
    options.signal.throwIfAborted(); await rpc.initialize(); options.signal.throwIfAborted();
    const { account } = await rpc.request('account/read', { refreshToken: false });
    if (account?.type !== 'chatgpt') throw new Error('Sign in with ChatGPT in Model settings before running Codex.');
    const skills = await Promise.all((options.skillPaths ?? []).map(async dir => fs.readFile(path.join(dir, 'SKILL.md'), 'utf8')));
    const result = await rpc.request('thread/start', {
      cwd: options.cwd, model: options.model, modelProvider: 'openai', approvalPolicy: 'never', sandbox: 'workspace-write',
      config: { 'sandbox_workspace_write.network_access': false, web_search: 'disabled',
        'shell_environment_policy.set': runProcessEnvironment({}) },
      developerInstructions: [
        'You are a AppYard software-factory agent. Work only inside the provided workspace. Never access credentials or unrelated files, publish, deploy, or contact operational systems. Use synthetic examples. Write working artifacts and report limitations honestly. Use the fleet tools for domain logic and architecture updates. Do not spawn other agents. This is an unattended build: resolve routine choices yourself and document limitations.',
        ...skills
      ].join('\n\n'),
      dynamicTools: tools.map(tool => ({ type: 'function', name: tool.name, description: tool.description, inputSchema: tool.parameters }))
    });
    threadId = result.thread.id; options.signal.throwIfAborted();
  } catch (error) { options.signal.removeEventListener('abort', stop); rpc.dispose(); throw error; }
  return {
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async prompt(text: string) {
      if (disposed || controller.signal.aborted) throw new Error('Codex session is closed.');
      if (pending) throw new Error('Codex already has an active turn.');
      if (currentTurn?.id) previousTurns.add(currentTurn.id);
      const promptTurn = currentTurn = { id: '', hasUsage: false };
      earlyUsage.clear();
      const completion = new Promise<void>((resolve, reject) => { pending = { resolve, reject }; });
      // Handle early connection failure while the turn/start request is still pending.
      void completion.catch(() => {});
      try {
        const result = await rpc.request('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }] });
        if (pending) identifyTurn(result.turn.id);
        await completion;
      } catch (error) { settle(error instanceof Error ? error : new Error(String(error))); throw error; }
      finally {
        // A missing receipt for a follow-up must not reuse the prior turn's total.
        if (!promptTurn.hasUsage) emit({ type: 'usage_update', usage: null });
      }
    },
    async abort() {
      if (turnId) void rpc.request('turn/interrupt', { threadId, turnId }).catch(() => {});
      stop();
    },
    dispose() { if (disposed) return; disposed = true; options.signal.removeEventListener('abort', stop); listeners.clear(); stop(); }
  };
}
