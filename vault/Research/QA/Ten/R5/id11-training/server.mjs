import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { compute as applicationCompute } from './compute.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};
const problem = (statusCode, message) => Object.assign(new Error(message), { statusCode });

function validateJson(value) {
  const pending = [[value, 0]];
  let count = 0;
  while (pending.length) {
    const [item, depth] = pending.pop();
    if (++count > 100_000 || depth > 64) throw new TypeError('JSON exceeds its structural limits.');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') continue;
    if (typeof item === 'number' && Number.isFinite(item)) continue;
    if (typeof item !== 'object' || (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype)) {
      throw new TypeError('Computation must use JSON values with finite numbers.');
    }
    for (const value of Object.values(item)) pending.push([value, depth + 1]);
  }
}

function readJson(request, maxInputBytes, timeoutMs) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    const cleanup = () => {
      clearTimeout(timer);
      request.off('data', onData).off('end', onEnd).off('error', onError).off('aborted', onAborted);
    };
    const fail = error => { cleanup(); request.pause(); reject(error); };
    const onData = chunk => {
      bytes += chunk.length;
      if (bytes > maxInputBytes) return fail(problem(413, 'Input exceeds the request size limit.'));
      chunks.push(chunk);
    };
    const onError = () => fail(problem(400, 'Could not read the request.'));
    const onAborted = () => fail(problem(400, 'The request was interrupted.'));
    const onEnd = () => {
      cleanup();
      try {
        const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
        validateJson(value);
        resolve(value);
      } catch { reject(problem(400, 'Send valid UTF-8 JSON within the structural limits.')); }
    };
    const timer = setTimeout(() => fail(problem(408, 'The request body took too long to arrive.')), timeoutMs);
    timer.unref();
    request.on('data', onData).once('end', onEnd).once('error', onError).once('aborted', onAborted);
  });
}

/** Transport only: keep domain logic in compute.mjs and its imported modules. */
export function createApplication({ compute = applicationCompute, publicDirectory = path.join(root, 'public'),
  maxInputBytes = 1_000_000, maxOutputBytes = 2_000_000, timeoutMs = 10_000, maxConcurrent = 4 } = {}) {
  for (const value of [maxInputBytes, maxOutputBytes, timeoutMs, maxConcurrent]) {
    if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('Service limits must be positive integers.');
  }
  let active = 0;
  const controllers = new Set();
  const server = createServer(async (request, response) => {
    const send = (status, value, type = 'application/json; charset=utf-8', extra = {}) => {
      if (response.destroyed || response.writableEnded) return;
      const body = type.startsWith('application/json') ? Buffer.from(JSON.stringify(value)) : value;
      response.writeHead(status, { ...securityHeaders, 'Content-Type': type, 'Content-Length': body.length, ...extra });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    try {
      const address = server.address();
      const authority = `127.0.0.1:${address.port}`;
      if (request.headers.host !== authority) throw problem(403, 'Use the assigned loopback address.');
      // Browser preview navigation can be cross-site; computation must be same-origin.
      if (request.method === 'POST') {
        if (request.headers.origin && request.headers.origin !== `http://${authority}`) throw problem(403, 'Cross-origin computation is not allowed.');
        const site = request.headers['sec-fetch-site'];
        if (site && site !== 'same-origin' && site !== 'none') throw problem(403, 'Cross-origin computation is not allowed.');
      }
      const route = request.url.split('?')[0];
      if (route === '/health' && ['GET', 'HEAD'].includes(request.method)) return send(200, { status: 'ok' });
      if (routes.has(route) && ['GET', 'HEAD'].includes(request.method)) {
        const [file, type] = routes.get(route);
        return send(200, await readFile(path.join(publicDirectory, file)), type);
      }
      if (route !== '/api/invoke') throw problem(404, 'Route not found.');
      if (request.method !== 'POST') return send(405, { error: { message: 'Use POST for computation.' } }, undefined, { Allow: 'POST' });
      if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') throw problem(415, 'Send Content-Type: application/json.');
      if (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') throw problem(415, 'Compressed request bodies are not supported.');
      if (Number(request.headers['content-length']) > maxInputBytes) throw problem(413, 'Input exceeds the request size limit.');
      const input = await readJson(request, maxInputBytes, timeoutMs);
      if (active >= maxConcurrent) throw problem(503, 'The service is busy. Try again when a computation finishes.');
      const controller = new AbortController();
      controllers.add(controller);
      const disconnected = () => controller.abort(problem(499, 'The client disconnected.'));
      response.once('close', disconnected);
      const timer = setTimeout(() => controller.abort(problem(504, 'Computation exceeded its time limit.')), timeoutMs);
      timer.unref();
      active++;
      const diagnostics = {};
      const work = Promise.resolve().then(() => compute(input, { signal: controller.signal, diagnostics }));
      // Timed-out work retains its slot until it stops, preventing an unbounded queue.
      work.then(() => active--, () => active--);
      try {
        const output = await Promise.race([work, new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true }))]);
        validateJson(output);
        const encoded = JSON.stringify(output);
        if (Buffer.byteLength(encoded) > maxOutputBytes) throw problem(500, 'Computation output exceeds the response size limit.');
        send(200, output, undefined, {'X-Package-Diagnostic': encodeURIComponent(diagnostics.error ?? ''), 'X-Candidate-Attempts': String(diagnostics.attempts ?? 0), 'X-Candidate-Rejections': encodeURIComponent(JSON.stringify(diagnostics.rejections ?? []))});
      } finally {
        clearTimeout(timer);
        controllers.delete(controller);
        response.off('close', disconnected);
      }
    } catch (error) {
      const status = Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode <= 599
        ? error.statusCode : error instanceof TypeError || error instanceof RangeError ? 422 : 500;
      send(status, status === 400 ? {status:'invalid_input',error:'INVALID_JSON'} : { error: { message: String(error?.message || 'Computation failed.').slice(0, 2000) } }, undefined, { Connection: 'close' });
    }
  });
  server.requestTimeout = timeoutMs;
  server.headersTimeout = timeoutMs;
  server.keepAliveTimeout = 5000;
  server.maxRequestsPerSocket = 100;
  server.on('close', () => { for (const controller of controllers) controller.abort(problem(503, 'Service stopped.')); });
  return server;
}

export async function start({ host = process.env.HOST || '127.0.0.1', port = Number(process.env.PORT || 3000), ...options } = {}) {
  if (host !== '127.0.0.1') throw new Error('HOST must be 127.0.0.1.');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be a valid TCP port.');
  const server = createApplication(options);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  return {
    server,
    url: `http://${host}:${server.address().port}/`,
    close: () => new Promise((resolve, reject) => {
      const force = setTimeout(() => server.closeAllConnections(), 1000);
      force.unref();
      server.close(error => { clearTimeout(force); error ? reject(error) : resolve(); });
    }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const application = await start();
  console.log(`Application listening at ${application.url}`);
  const stop = () => { void application.close().then(() => process.exit(0), () => process.exit(1)); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
