import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX = 2_000_000, TIMEOUT = 30_000;
const output = process.stdout.write.bind(process.stdout);
const frame = value => {
  const text = JSON.stringify(value) + '\n';
  if (Buffer.byteLength(text) > MAX) throw new Error('Runtime response exceeds 2 MB.');
  output(text);
};
const [mode, entrypoint, configFile] = process.argv.slice(2);
if (!['--stdio', '--serve', '--invoke'].includes(mode) || !entrypoint) throw new Error('Usage: node node.mjs --stdio|--serve|--invoke app.mjs [integration-config.json]');
if (mode !== '--serve') console.log = (...values) => console.error(...values);
const implementation = await import(pathToFileURL(path.resolve(entrypoint)).href);
if (typeof implementation.invoke !== 'function') throw new Error('Runtime module must export invoke(input, context).');
let sequence = 0, calls = 0;
const pending = new Map();
const configuration = mode === '--stdio' || !configFile ? [] : JSON.parse(await readFile(configFile, 'utf8'));
const operations = Array.isArray(configuration) ? configuration : configuration.operations;
if (!Array.isArray(operations)) throw new Error('Integration configuration must be an operation array.');
const staticConfig = !Array.isArray(configuration) && configuration.static;
const staticRoot = staticConfig ? await realpath(path.resolve(path.dirname(path.resolve(configFile)), staticConfig.root)) : undefined;
const staticFiles = new Set(staticConfig?.files ?? []);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

async function readInput(stream) {
  const chunks = []; let bytes = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX) throw new Error('Input exceeds 2 MB.');
    chunks.push(buffer);
  }
  // Decode only after joining bytes: stream chunks can split a UTF-8 character.
  return Buffer.concat(chunks, bytes).toString('utf8');
}

async function staticResponse(method, route) {
  if (!staticRoot || method !== 'GET') return;
  const relative = decodeURIComponent(new URL(route, 'http://localhost').pathname).replace(/^\//, '') || staticConfig.index || 'index.html';
  if (!staticFiles.has(relative)) return;
  const file = await realpath(path.join(staticRoot, relative));
  if (!file.startsWith(staticRoot + path.sep)) throw new Error('Invalid static file path.');
  const bytes = await readFile(file); if (bytes.length > MAX) throw new Error('Static file exceeds 2 MB.');
  return { status: 200, headers: { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream' }, body: bytes };
}

async function standaloneIntegration(operationId, input = {}) {
  const operation = operations.find(item => item.id === operationId);
  if (!operation) throw new Error('Integration operation is not configured.');
  const origin = new URL(operation.origin);
  if (origin.protocol !== 'https:' || origin.origin !== operation.origin || origin.username || origin.password
    || !origin.hostname.includes('.') || /[\[\]:]/.test(origin.hostname) || /^\d+(?:\.\d+){3}$/.test(origin.hostname) || /(?:^|\.)(?:localhost|local|internal)$/.test(origin.hostname)
    || !operation.path?.startsWith('/') || operation.path.startsWith('//') || /[\\?#\u0000-\u0020]/.test(operation.path) || /%2f|%5c|%2e/i.test(operation.path)
    || new URL(operation.path, origin).pathname !== operation.path || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(operation.method)) throw new Error('Invalid fixed HTTPS integration endpoint.');
  const url = new URL(operation.path, origin);
  if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['query', 'body'].includes(key))) throw new Error('Invalid integration input.');
  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (!operation.queryKeys?.includes(key) || typeof value !== 'string' || value.length > 10_000) throw new Error('Integration query key is not allowed.');
    url.searchParams.set(key, value);
  }
  if (operation.method === 'GET' && input.body !== undefined) throw new Error('GET integrations cannot contain a body.');
  const body = input.body === undefined ? undefined : JSON.stringify(input.body);
  if (Buffer.byteLength(body ?? '') + Buffer.byteLength(url.search) > MAX || ++calls > 100) throw new Error('Integration budget exceeded.');
  const headers = { accept: operation.responseType === 'json' ? 'application/json' : 'text/plain', ...(body === undefined ? {} : { 'content-type': 'application/json' }) };
  let secret;
  if (operation.auth) {
    if (!['bearer', 'header-key'].includes(operation.auth.type) || !/^[A-Z][A-Z0-9_]{0,99}$/.test(operation.auth.envName ?? '')) throw new Error('Unsupported integration authentication.');
    secret = process.env[operation.auth.envName];
    if (!secret || /[\r\n\0]/.test(secret)) throw new Error('Set ' + operation.auth.envName + ' before calling this integration.');
    const name = operation.auth.type === 'bearer' ? 'authorization' : operation.auth.headerName;
    if (!/^[A-Za-z][A-Za-z0-9-]{0,99}$/.test(name ?? '') || /^(?:host|connection|content-length|transfer-encoding|cookie|proxy-.*|sec-.*)$/i.test(name)) throw new Error('Invalid integration authentication header.');
    headers[name] = operation.auth.type === 'bearer' ? 'Bearer ' + secret : secret;
  }
  try {
    const response = await fetch(url, { method: operation.method, headers, body, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT) });
    if (!response.ok) throw new Error('Integration returned HTTP ' + response.status + '.');
    const contentType = response.headers.get('content-type') ?? '';
    if (operation.responseType === 'json' ? !/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(contentType) : !/^text\/|^application\/(?:json|xml)(?:\s*;|$)/i.test(contentType)) throw new Error('Unsupported integration response type.');
    const chunks = []; let bytes = 0;
    for await (const chunk of response.body) { bytes += chunk.length; if (bytes > MAX) throw new Error('Integration response exceeds 2 MB.'); chunks.push(Buffer.from(chunk)); }
    const redact = value => {
      if (typeof value === 'string') return secret ? value.split(secret).join('[redacted]') : value;
      if (value === null || typeof value !== 'object') return secret && String(value) === secret ? '[redacted]' : value;
      if (Array.isArray(value)) return value.map(redact);
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [redact(key), redact(item)]));
    };
    const text = Buffer.concat(chunks).toString('utf8');
    return redact(operation.responseType === 'json' ? JSON.parse(text) : text);
  } catch (error) { throw new Error(secret ? String(error.message).split(secret).join('[redacted]') : error.message); }
}

const context = { integrations: { invoke(operationId, input = {}) {
  if (mode !== '--stdio') return standaloneIntegration(operationId, input);
  if (++calls > 100) return Promise.reject(new Error('Integration budget exceeded.'));
  const id = 'integration_' + (++sequence);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Integration request timed out.')); }, TIMEOUT);
    pending.set(id, { resolve, reject, timer });
    try { frame({ version: 1, type: 'integration', id, operationId, input }); }
    catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
  });
} } };
async function handle(kind, input) {
  if (kind === 'invoke') return implementation.invoke(input, context);
  if (kind !== 'http') throw new Error('Unsupported runtime request.');
  if (typeof implementation.handleHttp === 'function') return implementation.handleHttp(input, context);
  if (input.method === 'GET' && input.path === '/health') return { status: 200, headers: { 'content-type': 'application/json' }, body: '{"ok":true}' };
  if (input.method === 'POST' && input.path === '/api/invoke') return { status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(await implementation.invoke(JSON.parse(input.body), context)) };
  return { status: 404, headers: { 'content-type': 'text/plain' }, body: 'Not found' };
}

if (mode === '--stdio') {
  let active = 0, input = Buffer.alloc(0);
  const requests = new Set();
  process.stdin.on('data', chunk => {
    input = Buffer.concat([input, chunk]);
    for (;;) {
      const end = input.indexOf(10);
      if (end < 0) { if (input.length > MAX) process.exit(2); break; }
      if (end > MAX) process.exit(2);
      const text = input.subarray(0, end).toString('utf8'); input = input.subarray(end + 1);
      let message;
      try { message = JSON.parse(text); } catch { process.exit(2); }
      if (message.version !== 1 || typeof message.id !== 'string') process.exit(2);
      if (message.type === 'integration-result') {
        const request = pending.get(message.id); if (!request) process.exit(2);
        pending.delete(message.id); clearTimeout(request.timer);
        if (message.ok) request.resolve(message.value); else request.reject(new Error(message.error));
      } else if (message.type === 'request' && !requests.has(message.id) && active < 32) {
        requests.add(message.id); active++;
        Promise.resolve().then(() => handle(message.kind, message.input)).then(value => frame({ version: 1, type: 'response', id: message.id, ok: true, value }),
          error => frame({ version: 1, type: 'response', id: message.id, ok: false, error: String(error.message ?? error).slice(0, 2000) })).catch(() => process.exit(2)).finally(() => { active--; });
      } else process.exit(2);
    }
  });
  process.stdin.on('end', () => { for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Runtime channel closed.')); } process.exit(0); });
  frame({ version: 1, type: 'ready' });
} else if (mode === '--invoke') {
  const text = await readInput(process.stdin);
  output(JSON.stringify(await handle('invoke', JSON.parse(text))) + '\n');
} else {
  const server = createServer(async (request, response) => {
    try {
      const body = await readInput(request);
      const result = await staticResponse(request.method, request.url) ?? await handle('http', { method: request.method, path: request.url, headers: request.headers, body });
      if (!result || !Number.isInteger(result.status) || !(typeof result.body === 'string' || Buffer.isBuffer(result.body)) || Buffer.byteLength(result.body) > MAX) throw new Error('Invalid HTTP response.');
      response.writeHead(result.status, result.headers ?? {}).end(result.body);
    } catch (error) { response.writeHead(500, { 'content-type': 'text/plain' }).end(error.message); }
  });
  server.requestTimeout = TIMEOUT;
  server.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '127.0.0.1', () => console.error('Application server ready: http://' + (process.env.HOST ?? '127.0.0.1') + ':' + server.address().port));
}
