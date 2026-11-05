import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { createPreviewProxy } from '../dist-electron/electron/preview-proxy.js';

async function fixture(t, handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return 'http://127.0.0.1:' + server.address().port;
}

function through(proxy, target, options = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = request(proxy, { method: options.method ?? 'GET', path: target, headers: options.headers }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    });
    outgoing.on('error', reject);
    outgoing.end(options.body);
  });
}

test('preview proxy forwards only current numeric-loopback origins and preserves API bodies', async t => {
  let deniedRequests = 0;
  const denied = await fixture(t, (_req, response) => { deniedRequests++; response.end('escaped'); });
  const allowed = await fixture(t, async (incoming, response) => {
    if (incoming.url === '/redirect') { response.writeHead(302, { location: denied }).end(); return; }
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ method: incoming.method, body: Buffer.concat(chunks).toString(), host: incoming.headers.host, proxyAuth: incoming.headers['proxy-authorization'] }));
  });
  let live = true, calls = 0;
  const proxy = await createPreviewProxy(origin => { calls++; return live && origin === allowed; });
  t.after(() => proxy.close());
  const result = await through(proxy.url, allowed + '/api', { method: 'POST', body: '{"sum":5}', headers: { 'proxy-authorization': 'must-not-forward', 'content-type': 'application/json' } });
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(result.body), { method: 'POST', body: '{"sum":5}', host: new URL(allowed).host });
  assert.equal(calls, 1, 'Each request takes one policy snapshot');
  const redirect = await through(proxy.url, allowed + '/redirect');
  assert.equal(redirect.status, 302);
  assert.equal((await through(proxy.url, redirect.headers.location)).status, 403);
  for (const target of [allowed.replace('127.0.0.1', 'localhost'), allowed.replace('http:', 'https:'), allowed.replace('http://', 'http://user:password@')]) {
    assert.equal((await through(proxy.url, target)).status, 403);
  }
  live = false;
  assert.equal((await through(proxy.url, allowed)).status, 403, 'Revocation applies to subsequent requests');
  assert.equal(deniedRequests, 0);
});

test('preview proxy denies CONNECT, upgrades, and policy failures without opening a target connection', async t => {
  let connections = 0;
  const target = await fixture(t, (_req, response) => { connections++; response.end('escaped'); });
  const proxy = await createPreviewProxy(() => { throw new Error('Lease revoked'); });
  t.after(() => proxy.close());
  assert.equal((await through(proxy.url, target)).status, 403);
  for (const options of [{ method: 'CONNECT', path: new URL(target).host }, { method: 'GET', path: target, headers: { connection: 'upgrade', upgrade: 'websocket' } }]) {
    await new Promise((resolve, reject) => {
      const outgoing = request(proxy.url, options);
      outgoing.on('connect', () => reject(new Error('CONNECT was accepted')));
      outgoing.on('upgrade', () => reject(new Error('Upgrade was accepted')));
      outgoing.on('response', () => reject(new Error('Unsupported transport was accepted')));
      outgoing.on('error', error => error.code === 'ECONNRESET' ? resolve() : reject(error));
      outgoing.setTimeout(1000, () => { outgoing.destroy(); reject(new Error('Proxy failed to close unsupported transport')); });
      outgoing.end();
    });
  }
  assert.equal(connections, 0);
});
