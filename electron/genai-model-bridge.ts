import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import type { GenAiMil } from './genai-mil.js';

/** Per-session loopback gateway, restricted to the selected model and chat route. */
export async function genAiModelBridge(provider: Pick<GenAiMil, 'assertModel' | 'buildRequest'>, model: string, signal: AbortSignal,
  endpoint = '/v1/chat/completions', name = 'GenAI.mil') {
  signal.throwIfAborted();
  provider.assertModel('opencode', model);
  const token = randomUUID();
  const server = createServer(async (request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) { response.writeHead(401).end(); return; }
    if (request.method !== 'POST' || request.url !== endpoint) { response.writeHead(404).end(); return; }
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    response.on('close', abort);
    try {
      if (signal.aborted) controller.abort();
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 8_000_000) { response.writeHead(413).end(); return; }
        chunks.push(Buffer.from(chunk));
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || Array.isArray(body) || body.model !== model) { response.writeHead(400).end(); return; }
      const result = await provider.buildRequest(model, body, controller.signal);
      response.writeHead(result.status, { 'Content-Type': result.headers.get('content-type') ?? 'application/json', 'x-should-retry': 'false' });
      if (result.body) for await (const chunk of result.body) {
        if (response.destroyed) break;
        if (!response.write(chunk)) await new Promise<void>(resolve => {
          const done = () => { response.off('drain', done); response.off('close', done); resolve(); };
          response.once('drain', done); response.once('close', done);
        });
      }
      response.end();
    } catch {
      if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'application/json', 'x-should-retry': 'false' });
      response.end(JSON.stringify({ error: { message: `The ${name} model request failed. Check the connection in Settings.` } }));
    } finally { signal.removeEventListener('abort', abort); response.off('close', abort); }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('The model connection could not start.');
  let closing: Promise<void> | undefined;
  const close = () => closing ??= new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); });
  return { config: { npm: endpoint === '/v1/responses' ? '@ai-sdk/openai' : '@ai-sdk/openai-compatible', name,
    options: { baseURL: `http://127.0.0.1:${address.port}/v1`, apiKey: token },
    models: { [model]: { name: model, limit: { context: 32768, output: 4096 } } } }, close };
}
