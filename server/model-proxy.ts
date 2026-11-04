import { createHmac, timingSafeEqual } from 'node:crypto';
import { db, type HostedDatabase } from './data.js';
import { decryptKey } from './credentials.js';
import { HttpError, readJson, requireUuid } from './http.js';

interface Capability { runId: string; epoch: number; expires: number }
function signature(payload: string, key = process.env.CREDENTIAL_ENCRYPTION_KEY): string {
  const bytes = Buffer.from(key ?? '', 'base64');
  if (bytes.length !== 32 || bytes.toString('base64') !== key) throw new HttpError(503, 'Model access is not configured.');
  return createHmac('sha256', bytes).update('fleet-model-v1:' + payload).digest('base64url');
}
export function modelToken(runId: string, epoch: number, expires = Date.now() + 42 * 60_000, key?: string): string {
  if (!Number.isSafeInteger(epoch) || epoch < 1 || !Number.isSafeInteger(expires)) throw new HttpError(400, 'Invalid build capability.');
  const payload = Buffer.from(JSON.stringify({ runId: requireUuid(runId), epoch, expires })).toString('base64url');
  return payload + '.' + signature(payload, key);
}
export function verifyModelToken(token: string, runId: string, now = Date.now(), key?: string): Capability {
  const [payload, supplied, extra] = token.split('.');
  if (!payload || !supplied || extra || token.length > 1000 || !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(supplied)) throw new HttpError(401, 'Invalid build credential.');
  const expected = signature(payload, key);
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new HttpError(401, 'Invalid build credential.');
  let value: Capability;
  try { value = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new HttpError(401, 'Invalid build credential.'); }
  if (!value || typeof value !== 'object' || value.runId !== runId || !Number.isSafeInteger(value.epoch) || value.epoch < 1 || !Number.isSafeInteger(value.expires) || value.expires <= now) throw new HttpError(401, 'Build credential expired.');
  return value;
}

const responseHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const failureMessage = 'OpenAI could not complete this build request. Retry or check the account model connection.';
function providerError(status = 502, message = failureMessage): Response {
  return new Response(JSON.stringify({ error: { message, type: 'provider_error', code: 'provider_error' } }), { status, headers: responseHeaders });
}

function validateInlineInput(input: unknown): void {
  if (typeof input === 'string') return;
  if (!Array.isArray(input)) throw new HttpError(400, 'Provide a self-contained build conversation.');
  for (const item of input) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new HttpError(400, 'Invalid build conversation.');
    const type = item.type ?? 'message';
    if (!['message', 'reasoning', 'function_call', 'function_call_output', 'configuration_update'].includes(type)) throw new HttpError(400, 'Stored or hosted input items are not supported by build credentials.');
    const parts = type === 'function_call_output' ? item.output : item.content;
    if (parts !== undefined && typeof parts !== 'string') {
      if (!Array.isArray(parts)) throw new HttpError(400, 'Invalid build message content.');
      for (const part of parts) {
        if (!part || typeof part !== 'object' || !['input_text', 'output_text', 'input_image', 'refusal'].includes(part.type)) throw new HttpError(400, 'Build messages may contain only inline text and images.');
        if (part.type === 'input_image' && (typeof part.image_url !== 'string' || !/^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(part.image_url) || part.file_id)) throw new HttpError(400, 'Build images must be supplied inline.');
      }
    }
  }
}

/** Preserve incremental SDK events, but never relay provider diagnostics verbatim. */
function safeResponseStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = source.getReader(), decoder = new TextDecoder(), encoder = new TextEncoder();
  const queue: Uint8Array[] = [];
  let pending = '', terminal = false, closed = false, received = 0;
  const safeError = () => ({ type: 'error', code: 'provider_error', message: failureMessage, param: null });
  const enqueue = (event: unknown) => queue.push(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  function frame(text: string) {
    const raw = text.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!raw) return;
    if (raw === '[DONE]') { if (!terminal) enqueue(safeError()); terminal = true; return; }
    let event = JSON.parse(raw) as Record<string, any>;
    if (!event || typeof event.type !== 'string') throw new Error('Invalid event');
    if (event.type === 'error' || event.type === 'response.failed' || event.response?.error) { event = safeError(); terminal = true; }
    if (event.type === 'response.completed' || event.type === 'response.incomplete') terminal = true;
    enqueue(event);
  }
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (!queue.length && !closed) {
          if (terminal) { closed = true; await reader.cancel().catch(() => {}); break; }
          const { value, done } = await reader.read();
          if (done) {
            pending += decoder.decode();
            if (pending.trim()) frame(pending);
            if (!terminal) enqueue(safeError());
            closed = true; break;
          }
          received += value.byteLength;
          pending += decoder.decode(value, { stream: true });
          if (received > 32 * 1024 * 1024 || pending.length > 4 * 1024 * 1024) throw new Error('Response exceeds limit');
          let boundary: RegExpExecArray | null;
          while (!terminal && (boundary = /\r?\n\r?\n/.exec(pending))) {
            frame(pending.slice(0, boundary.index)); pending = pending.slice(boundary.index + boundary[0].length);
          }
        }
      } catch {
        queue.length = 0; enqueue(safeError()); closed = true;
        await reader.cancel().catch(() => {});
      }
      if (queue.length) controller.enqueue(queue.shift()!);
      else controller.close();
    },
    async cancel(reason) { closed = true; await reader.cancel(reason).catch(() => {}); },
  });
}

/** The sandbox gets a bounded run capability; the account's OpenAI key never enters it. */
export async function proxyModel(request: Request, runId: string, database: HostedDatabase = db(), fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
  const authorization = request.headers.get('authorization') ?? '';
  if (!/^Bearer [A-Za-z0-9_.-]+$/i.test(authorization)) throw new HttpError(401, 'Invalid build credential.');
  const capability = verifyModelToken(authorization.slice(7), requireUuid(runId));
  const run = await database.getRun(runId);
  if (run.epoch !== capability.epoch || !['running', 'pausing'].includes(run.status)) throw new HttpError(409, 'This build is no longer active.');
  const body = await readJson<Record<string, unknown>>(request, 3 * 1024 * 1024);
  if (body.model !== run.model) throw new HttpError(403, 'This build can only use its selected model.');
  if (body.stream !== true) throw new HttpError(400, 'Hosted builds use streaming Responses.');
  if (body.background || body.previous_response_id || body.conversation) throw new HttpError(400, 'Only self-contained build requests are supported.');
  if (body.tools !== undefined && (!Array.isArray(body.tools) || body.tools.some(tool => !tool || typeof tool !== 'object' || (tool as { type?: string }).type !== 'function'))) throw new HttpError(400, 'Only local function tools are supported.');
  validateInlineInput(body.input);
  // Unknown fields cannot activate account resources or future hosted tools.
  const allowed = new Set(['model', 'input', 'stream', 'max_output_tokens', 'tools', 'tool_choice', 'reasoning', 'include', 'temperature', 'top_p', 'parallel_tool_calls', 'truncation', 'text', 'instructions', 'prompt_cache_key', 'prompt_cache_retention', 'prompt_cache_options']);
  for (const field of Object.keys(body)) if (!allowed.has(field)) delete body[field];
  body.store = false;
  body.max_output_tokens = Math.max(16, Math.min(16_384, typeof body.max_output_tokens === 'number' && Number.isSafeInteger(body.max_output_tokens) && body.max_output_tokens > 0 ? body.max_output_tokens : 16_384));
  const encrypted = await database.getCredential(run.userId);
  if (!encrypted) throw new HttpError(409, 'Reconnect the account OpenAI key to continue.');
  if (!await database.claimModelRequest(run.id, run.epoch, 120)) throw new HttpError(429, 'The build reached its model request limit or is no longer active.');
  let response: Response;
  try {
    response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${decryptKey(run.userId, encrypted)}` },
      body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.any([request.signal, AbortSignal.timeout(270_000)]),
    });
  } catch { throw new HttpError(502, 'OpenAI could not complete the build request.'); }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    const message = response.status === 429 ? 'OpenAI rate or credit limit reached.' : response.status === 401 ? 'OpenAI rejected the account key.' : 'OpenAI could not complete this request.';
    return providerError(response.status >= 400 && response.status <= 599 ? response.status : 502, message);
  }
  if (!response.body || !response.headers.get('content-type')?.toLowerCase().startsWith('text/event-stream')) {
    await response.body?.cancel().catch(() => {}); return providerError();
  }
  return new Response(safeResponseStream(response.body), { headers: { ...responseHeaders, 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Accel-Buffering': 'no' } });
}
