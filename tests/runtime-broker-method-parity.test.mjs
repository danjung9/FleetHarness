import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { RuntimeBroker } from '../dist-electron/electron/runtime-broker.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';

const supported = ['darwin', 'linux'].includes(process.platform);
const nodeApplication = `export const invoke = value => value;
export const handleHttp = request => ({status:200,
  headers:{'content-type':'text/plain; charset=utf-8','x-application-method':request.method,'allow':'GET, HEAD, OPTIONS'},
  body:request.method + ': resource available — café'});
`;
const pythonApplication = `def invoke(value):
    return value
def handle_http(request):
    return {"status":200,
        "headers":{"content-type":"text/plain; charset=utf-8","x-application-method":request["method"],"allow":"GET, HEAD, OPTIONS"},
        "body":request["method"] + ": resource available — café"}
`;

async function executionFor(t, runtime) {
  if (runtime === 'node') return { executable: process.execPath, readPaths: [] };
  try {
    const python = JSON.parse(execFileSync('python3', ['-I', '-c', 'import json,sys;print(json.dumps({"executable":sys.executable,"prefix":sys.base_prefix}))'],
      { encoding: 'utf8', timeout: 5_000 }));
    return { executable: python.executable, readPaths: [python.prefix] };
  } catch { t.skip('Python 3 is not installed.'); return undefined; }
}

async function standalone(t, executable, args) {
  const child = spawn(executable, args, { env: { ...process.env, HOST: '127.0.0.1', PORT: '0' }, stdio: ['ignore', 'ignore', 'pipe'] });
  let diagnostics = '', closed = false;
  const done = new Promise(resolve => child.once('close', () => { closed = true; resolve(); }));
  t.after(async () => { if (!closed) child.kill('SIGKILL'); await done; });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Standalone adapter startup timed out: ' + diagnostics)); }, 5_000);
    child.stderr.on('data', chunk => {
      diagnostics = (diagnostics + chunk.toString('utf8')).slice(-8_000);
      const match = /Application server ready: (http:\/\/127\.0\.0\.1:\d+)/.exec(diagnostics);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', () => { clearTimeout(timer); reject(new Error('Standalone adapter exited: ' + diagnostics)); });
  });
}

async function fixture(t, runtime, surface, execution) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-method-parity-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'source'), entrypoint = runtime === 'node' ? 'app.mjs' : 'app.py';
  const adapter = 'runtime-broker/' + (runtime === 'node' ? 'node.mjs' : 'python.py');
  await fs.mkdir(path.join(workspace, 'runtime-broker'), { recursive: true });
  await fs.writeFile(path.join(workspace, entrypoint), runtime === 'node' ? nodeApplication : pythonApplication);
  await fs.copyFile(path.resolve('templates', adapter), path.join(workspace, adapter));
  if (surface === 'host') {
    const broker = await RuntimeBroker.start({ workspace, runtime, entrypoint, ...execution, requestTimeoutMs: 5_000,
      adapterPath: path.join(workspace, adapter) });
    t.after(() => broker.close());
    const lease = await broker.listen();
    const response = await fetch(lease, { redirect: 'manual', signal: AbortSignal.timeout(5_000) });
    assert.equal(response.status, 302);
    const cookie = response.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie, 'The host must grant a lease before dynamic requests.');
    await response.arrayBuffer();
    return { origin: new URL(lease).origin, cookie };
  }
  const exported = await exportVerifiedBundle({ workspace, parent: root, title: 'Method parity',
    verifiedHash: await sourceHash(workspace), deliveryMarkdown: 'Run the included standalone adapter.' });
  const origin = await standalone(t, execution.executable, [...(runtime === 'python' ? ['-I', '-B'] : []),
    path.join(exported, adapter), '--serve', path.join(exported, entrypoint)]);
  return { origin };
}

function request(server, method) {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL('/resource?probe=available', server.origin), { method, agent: false,
      headers: server.cookie ? { cookie: server.cookie } : {}, signal: AbortSignal.timeout(5_000)
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.once('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
      response.once('error', reject);
    });
    req.once('error', reject);
    req.end();
  });
}

// HTTP clients suppress HEAD bodies themselves. Read the wire to prove that the
// adapter does not send bytes that can corrupt a subsequent response stream.
function headOnWire(server) {
  const url = new URL(server.origin);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: url.hostname, port: Number(url.port) });
    const chunks = [];
    let bytes = 0;
    socket.setTimeout(5_000, () => socket.destroy(new Error('HEAD response timed out.')));
    socket.once('connect', () => socket.write([
      'HEAD /resource?probe=available HTTP/1.1', 'Host: ' + url.host, 'Connection: close',
      ...(server.cookie ? ['Cookie: ' + server.cookie] : []), '', ''
    ].join('\r\n')));
    socket.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 64_000) socket.destroy(new Error('Unexpectedly large HEAD response.'));
      else chunks.push(chunk);
    });
    socket.once('error', reject);
    socket.once('end', () => {
      const wire = Buffer.concat(chunks), boundary = wire.indexOf('\r\n\r\n');
      if (boundary < 0) { reject(new Error('HEAD response has no complete headers.')); return; }
      const [statusLine, ...fields] = wire.subarray(0, boundary).toString('latin1').split('\r\n');
      const status = /^HTTP\/1\.[01] (\d{3}) /.exec(statusLine);
      if (!status) { reject(new Error('HEAD response has no HTTP status.')); return; }
      const headers = Object.fromEntries(fields.map(field => {
        const colon = field.indexOf(':');
        return [field.slice(0, colon).toLowerCase(), field.slice(colon + 1).trim()];
      }));
      resolve({ status: Number(status[1]), headers, body: wire.subarray(boundary + 4) });
    });
  });
}

for (const runtime of ['node', 'python']) for (const surface of ['host', 'exported']) {
  test(`${runtime} ${surface} preserves custom HEAD and OPTIONS behavior`,
    { skip: surface === 'host' && !supported, timeout: 30_000 }, async t => {
      const execution = await executionFor(t, runtime);
      if (!execution) return;
      const server = await fixture(t, runtime, surface, execution);
      for (const method of ['GET', 'HEAD', 'OPTIONS']) await t.test(method, async () => {
        const response = method === 'HEAD' ? await headOnWire(server) : await request(server, method);
        assert.equal(response.status, 200, `${method} must reach the application handler.`);
        assert.equal(response.headers['x-application-method'], method);
        assert.equal(response.headers.allow, 'GET, HEAD, OPTIONS');
        assert.equal(response.headers['content-type'], 'text/plain; charset=utf-8');
        if (method === 'HEAD') assert.equal(response.body.length, 0, 'A HEAD response must contain no body bytes on the wire.');
        else assert.equal(response.body, method + ': resource available — café');
      });
      await t.test('ordinary requests still work after method probes', async () => {
        const response = await request(server, 'GET');
        assert.equal(response.status, 200);
        assert.equal(response.body, 'GET: resource available — café');
      });
    });
}
