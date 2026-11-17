import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { createReadToolDefinition, createWriteToolDefinition, createEditToolDefinition, createBashToolDefinition,
  createPowerShellToolDefinition, createGrepToolDefinition, createFindToolDefinition, createLsToolDefinition, type ToolDefinition } from '@earendil-works/pi-coding-agent';
import { runProcessEnvironment } from './process-sweep.js';
export function openCodeWorkspaceTools(cwd: string, names: string[]): ToolDefinition[] {
  const factories = { read: createReadToolDefinition, write: createWriteToolDefinition, edit: createEditToolDefinition,
    grep: createGrepToolDefinition, find: createFindToolDefinition, ls: createLsToolDefinition,
    bash: (cwd: string) => createBashToolDefinition(cwd, { spawnHook: context => ({ ...context, env: runProcessEnvironment(context.env) }) }),
    powershell: (cwd: string) => createPowerShellToolDefinition(cwd, { spawnHook: context => ({ ...context, env: runProcessEnvironment(context.env) }) }) };
  return names.flatMap(name => name in factories ? [factories[name as keyof typeof factories](cwd)] : []) as unknown as ToolDefinition[];
}
import type { StageEvent, StageSession } from './agent-runner.js';
import type { StageTokenUsage } from '../shared/types.js';
import type { TokenTotals } from '../shared/token-usage.js';
import { launchOpenCode, type OpenCodeRuntime } from './opencode-runtime.js';
import { genAiModelBridge } from './genai-model-bridge.js';
import { registerCredential } from './secrets.js';

/** Bridge only the phase's host tools. AppYard's native tools remain disabled. */
export async function openCodeToolBridge(tools: ToolDefinition[], signal: AbortSignal, onEvent: (event: object) => void) {
  const token = randomUUID();
  const server = createServer(async (request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) { response.writeHead(401).end(); return; }
    if (request.method !== 'POST' || request.url !== '/mcp') { response.writeHead(405).end(); return; }
    const mcp = new Server({ name: 'appyard', version: '1.0.0' }, { capabilities: { tools: {} } });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    mcp.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: tools.map(tool => ({ name: tool.name, description: tool.description, inputSchema: tool.parameters as Tool['inputSchema'] })) }));
    mcp.setRequestHandler(CallToolRequestSchema, async request => {
      signal.throwIfAborted();
      const tool = tools.find(tool => tool.name === request.params.name);
      if (!tool) throw new Error('This tool is not assigned to this phase.');
      const id = randomUUID();
      onEvent({ type: 'tool_execution_start', toolCallId: id, toolName: tool.name, args: request.params.arguments ?? {} });
      try {
        const result = await (tool.execute as unknown as (id: string, args: unknown, signal: AbortSignal) => Promise<{ content: import('@modelcontextprotocol/sdk/types.js').CallToolResult['content']; isError?: boolean }>)(id, request.params.arguments ?? {}, signal);
        onEvent({ type: 'tool_execution_end', toolCallId: id, toolName: tool.name, result, isError: result.isError === true });
        return { content: result.content, isError: result.isError === true };
      } catch (error) {
        const result = { content: [{ type: 'text' as const, text: error instanceof Error ? error.message : 'The tool failed.' }] };
        onEvent({ type: 'tool_execution_end', toolCallId: id, toolName: tool.name, result, isError: true });
        return { ...result, isError: true };
      }
    });
    try { await mcp.connect(transport); await transport.handleRequest(request, response); }
    catch { if (!response.headersSent) response.writeHead(500).end(); }
    finally { await mcp.close(); }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not open the AppYard tool bridge.');
  return { url: `http://127.0.0.1:${address.port}/mcp`, token, close: () => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }) };
}

interface Reply { info: { finish?: string; error?: { data?: { message?: string }; name?: string }; tokens?: { input: number; output: number; reasoning?: number; cache: { read: number; write: number } } }; parts: { type: string; text?: string }[] }
export async function createOpenCodeSession(options: {
  runtime: OpenCodeRuntime; cwd: string; provider: string; model: string; signal: AbortSignal; tools: ToolDefinition[];
  conversationInstructions?: string; skillPaths?: string[];
}): Promise<StageSession> {
  options.signal.throwIfAborted();
  const listeners = new Set<(event: StageEvent) => void>();
  const emit = (event: object) => { for (const listener of listeners) listener(event as StageEvent); };
  const controller = new AbortController();
  const abortStartup = () => controller.abort();
  options.signal.addEventListener('abort', abortStartup, { once: true });
  const bridge = await openCodeToolBridge(options.tools, controller.signal, emit);
  let modelBridge: Awaited<ReturnType<typeof genAiModelBridge>> | undefined;
  let connection: Awaited<ReturnType<typeof launchOpenCode>>;
  try {
    const config = options.runtime.config();
    if (options.provider === 'genai-mil') {
      const provider = options.runtime.genAiMil?.();
      if (!provider) throw new Error('Connect GenAI.mil in Settings before building.');
      modelBridge = await genAiModelBridge(provider, options.model, controller.signal);
      config.provider['genai-mil'] = { ...modelBridge.config, models: { [options.model]: { ...modelBridge.config.models[options.model],
        modalities: { input: options.runtime.supportsImages(options.provider, options.model) ? ['text', 'image'] : ['text'], output: ['text'] } } } };
    }
    if (options.provider === 'chatgpt') {
      const account = options.runtime.chatGPT?.();
      if (!account) throw new Error('Connect ChatGPT in Settings before building.');
      modelBridge = await genAiModelBridge({
        assertModel: (_backend, model) => {
          if (!account.models.some(item => item.id === model && item.configured && item.backend === 'opencode')) throw new Error('Select an available ChatGPT model.');
        },
        buildRequest: async (model, body, signal) => {
          const credential = await account.credentials(); registerCredential(credential.accessToken);
          const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', redirect: 'error', signal,
            headers: { Authorization: `Bearer ${credential.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, model, store: false }) });
          if (!response.ok) { await response.body?.cancel(); return Response.json({ error: { message: 'ChatGPT could not complete the request. Check plan usage and reconnect in Settings.' } }, { status: response.status }); }
          return new Response(response.body, { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') ?? 'text/event-stream' } });
        }
      }, options.model, controller.signal, '/v1/responses', 'ChatGPT');
      config.provider.chatgpt = { ...modelBridge.config, models: { [options.model]: { name: options.model, modalities: { input: ['text', 'image'], output: ['text'] }, limit: { context: 32768, output: 4096 } } } };
    }
    connection = await launchOpenCode({ root: options.runtime.root, cwd: options.cwd, signal: controller.signal, config: {
    ...config, mcp: { fleet: { type: 'remote', url: bridge.url, headers: { Authorization: `Bearer ${bridge.token}` }, oauth: false } },
    tools: { '*': false, 'fleet_*': true, task: false }, ...(options.skillPaths?.length ? { skills: { paths: options.skillPaths } } : {})
  } }); } catch (error) { options.signal.removeEventListener('abort', abortStartup); await bridge.close(); await modelBridge?.close(); throw error; }
  let sessionID = '', disposed = false, prompting = false;
  let disposal: Promise<void> | undefined;
  let totals: TokenTotals | undefined;
  const stop = () => { controller.abort(); if (sessionID) void connection.request(`/session/${sessionID}/abort`, {}).catch(() => {}); void connection.close(); void modelBridge?.close(); };
  options.signal.addEventListener('abort', stop, { once: true });
  if (options.signal.aborted) { stop(); await bridge.close(); throw new Error('AppYard run stopped.'); }
  return {
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getTokenUsage: () => totals,
    async prompt(text: string) {
      if (disposed || controller.signal.aborted) throw new Error('AppYard run stopped.');
      if (prompting) throw new Error('AppYard is already responding.');
      prompting = true;
      const streamController = new AbortController();
      let stream: Promise<void> | undefined, streamedText = '';
      try {
        if (!sessionID) sessionID = (await connection.request<{ id: string }>('/session', { title: 'AppYard build' }, controller.signal)).id;
        emit({ type: 'turn_start' });
        const response = await connection.events(streamController.signal);
        if (response.ok && response.body) stream = (async () => {
          const reader = response.body!.getReader(), decoder = new TextDecoder(); let buffer = '';
          for (;;) {
            const next = await reader.read(); if (next.done) break;
            buffer += decoder.decode(next.value, { stream: true });
            let boundary: number;
            while ((boundary = buffer.indexOf('\n\n')) >= 0) {
              const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
              const data = block.split('\n').find(line => line.startsWith('data:'))?.slice(5).trim();
              if (!data) continue;
              const event = JSON.parse(data) as { type: string; properties: { sessionID?: string; field?: string; delta?: string } };
              if (event.type === 'message.part.delta' && event.properties.sessionID === sessionID && event.properties.field === 'text' && event.properties.delta) {
                streamedText += event.properties.delta;
                emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: event.properties.delta } });
              }
            }
          }
        })().catch(() => {});
        const reply = await connection.request<Reply>(`/session/${sessionID}/message`, {
          model: { providerID: options.provider, modelID: options.model },
          system: 'You are the sole AppYard coding agent for this session. Do all work yourself. Do not spawn subagents, delegate to other agents, or send agent-to-agent messages. If a skill requests delegation or a separate reviewer agent, perform that work yourself inline.\n\n' + (options.conversationInstructions ?? 'You are an AppYard app builder. Build working software from the user brief. Use only the tools assigned to this phase. Keep secrets out of artifacts and logs. Use real empty states for unconfigured integrations. Never publish without owner approval.'),
          tools: { '*': false, 'fleet_*': true, task: false }, parts: [{ type: 'text', text }]
        }, controller.signal);
        if (reply.info.error) throw new Error(reply.info.error.data?.message || 'AppYard could not complete the model request.');
        const finalText = reply.parts.filter(part => part.type === 'text').map(part => part.text ?? '').join('');
        if (finalText.startsWith(streamedText) && finalText.length > streamedText.length) emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: finalText.slice(streamedText.length) } });
        const tokens = reply.info.tokens;
        let usage: StageTokenUsage | undefined;
        if (tokens) {
          const input = tokens.input + tokens.cache.read + tokens.cache.write;
          const output = tokens.output;
          totals = { inputTokens: (totals?.inputTokens ?? 0) + input, outputTokens: (totals?.outputTokens ?? 0) + output,
            cachedInputTokens: (totals?.cachedInputTokens ?? 0) + tokens.cache.read, totalTokens: (totals?.totalTokens ?? 0) + input + output };
          usage = { ...totals, uncachedInputTokens: totals.inputTokens - totals.cachedInputTokens,
            reasoningOutputTokens: null, uncachedPlusOutputTokens: totals.inputTokens - totals.cachedInputTokens + totals.outputTokens };
        }
        emit({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: finalText }], stopReason: reply.info.finish === 'length' ? 'length' : 'stop' } });
        if (usage) emit({ type: 'usage_update', usage });
      } finally { streamController.abort(); await stream; prompting = false; }
    },
    async abort() { stop(); await Promise.all([connection.close(),bridge.close(),modelBridge?.close()]); },
    dispose() { if (disposal) return disposal; disposed = true; options.signal.removeEventListener('abort', stop); options.signal.removeEventListener('abort', abortStartup); listeners.clear(); stop(); return disposal = Promise.all([connection.close(),bridge.close(),modelBridge?.close()]).then(() => {}); }
  };
}
