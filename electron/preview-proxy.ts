import { createServer, request as httpRequest, type ClientRequest, type OutgoingHttpHeaders } from 'node:http';
import type { Socket } from 'node:net';

/** Chromium's route handlers do not intercept every redirect hop. A proxy enforces
 * the same origin at the transport layer, including redirects and CONNECT, while
 * retaining streaming responses and normal same-origin navigation semantics. */
export async function createPreviewProxy(allowed: (origin: string) => boolean) {
  const sockets = new Set<Socket>(), requests = new Set<ClientRequest>();
  const server = createServer((incoming, outgoing) => {
    let target: URL;
    try { target = new URL(incoming.url ?? ''); }
    catch { outgoing.writeHead(400).end(); return; }
    let permitted = false;
    try {
      permitted = target.protocol === 'http:' && target.hostname === '127.0.0.1' && !!target.port
        && !target.username && !target.password && allowed(target.origin);
    } catch { /* A failed or revoked origin lookup must deny the request. */ }
    if (!permitted) {
      outgoing.writeHead(403, { 'Content-Type': 'text/plain' }).end('Browser access is limited to the application origin.');
      return;
    }
    const headers: OutgoingHttpHeaders = { ...incoming.headers, host: target.host };
    delete headers['proxy-authorization']; delete headers['proxy-connection'];
    const upstream = httpRequest(target, { method: incoming.method, headers, agent: false }, response => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.on('error', () => outgoing.destroy());
      response.pipe(outgoing);
    });
    requests.add(upstream);
    upstream.on('close', () => requests.delete(upstream));
    upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
    upstream.setTimeout(30_000, () => upstream.destroy());
    incoming.on('aborted', () => upstream.destroy());
    outgoing.on('close', () => upstream.destroy());
    incoming.pipe(upstream);
  });
  server.on('connection', socket => {
    if (sockets.size >= 64) { socket.destroy(); return; }
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
  });
  server.on('connect', (_request, socket) => socket.destroy());
  server.on('upgrade', (_request, socket) => socket.destroy());
  server.on('clientError', (_error, socket) => socket.destroy());
  server.requestTimeout = 30_000;
  try { await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); }
  catch (error) { server.close(); throw error; }
  const address = server.address();
  if (!address || typeof address === 'string') { server.close(); throw new Error('Browser proxy failed to start.'); }
  return {
    url: 'http://127.0.0.1:' + address.port,
    close: async () => {
      for (const request of requests) request.destroy();
      for (const socket of sockets) socket.destroy();
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}

