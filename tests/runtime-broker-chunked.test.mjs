import { syntheticRuntimeExport } from './helpers/exported-runtime-fixture.mjs';
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
const MAX = 2_000_000;
const value = { text: 'Keep every byte: café ☃ 😀', answer: 42 };
const nodeApplication = `export const invoke = value => value;
let calls = 0;
export const handleHttp = request => {
  if (request.path === '/calls') return {status:200,body:JSON.stringify({calls})};
  calls++;
  return {status:200,headers:{'content-type':'application/json'},body:JSON.stringify({
    body:request.path === '/count' ? undefined : request.body,
    bytes:Buffer.byteLength(request.body),calls
  })};
};
`;
const pythonApplication = `import json
def invoke(value):
    return value
calls = 0
def handle_http(request):
    global calls
    if request["path"] == "/calls":
        return {"status":200,"body":json.dumps({"calls":calls})}
    calls += 1
    result = {"bytes":len(request["body"].encode("utf-8")),"calls":calls}
    if request["path"] != "/count":
        result["body"] = request["body"]
    return {"status":200,"headers":{"content-type":"application/json"},"body":json.dumps(result)}
`;

function executionFor(t, runtime) {
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

async function fixture(t, runtime, surface, custom = true) {
  const execution = executionFor(t, runtime);
  if (!execution) return undefined;
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-chunked-parity-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'source'), entrypoint = runtime === 'node' ? 'app.mjs' : 'app.py';
  const adapter = 'runtime-broker/' + (runtime === 'node' ? 'node.mjs' : 'python.py');
  await fs.mkdir(path.join(workspace, 'runtime-broker'), { recursive: true });
  const source = custom ? runtime === 'node' ? nodeApplication : pythonApplication
    : runtime === 'node' ? 'export const invoke = value => value;\n' : 'def invoke(value):\n    return value\n';
  await fs.writeFile(path.join(workspace, entrypoint), source);
  // A frozen original adapter can run the identical behavioral regressions.
  const adapterSource = runtime === 'python' && process.env.FLEET_TEST_PYTHON_ADAPTER
    ? process.env.FLEET_TEST_PYTHON_ADAPTER : path.resolve('templates', adapter);
  await fs.copyFile(adapterSource, path.join(workspace, adapter));
  if (surface === 'host') {
    const broker = await RuntimeBroker.start({ workspace, runtime, entrypoint, ...execution,
      adapterPath: path.join(workspace, adapter), requestTimeoutMs: 5_000 });
    t.after(() => broker.close());
    const lease = await broker.listen();
    const response = await fetch(lease, { redirect: 'manual', signal: AbortSignal.timeout(5_000) });
    assert.equal(response.status, 302);
    const cookie = response.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie, 'The host grants a lease before accepting dynamic requests.');
    await response.arrayBuffer();
    return { origin: new URL(lease).origin, cookie };
  }
  const destination = await exportVerifiedBundle({ ...syntheticRuntimeExport(runtime, entrypoint, [entrypoint, adapter]), workspace, parent: root, title: 'Chunked transport',
    verifiedHash: await sourceHash(workspace), deliveryMarkdown: 'Run the included standalone adapter.' });
  const origin = await standalone(t, execution.executable, [...(runtime === 'python' ? ['-I', '-B'] : []),
    path.join(destination, adapter), '--serve', path.join(destination, entrypoint)]);
  return { origin };
}

function request(server, body, framing = 'chunked', route = '/capture') {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(route, server.origin), { method: 'POST', agent: false,
      headers: { 'Content-Type': 'application/json; charset=UTF-8',
        ...(framing === 'content-length' ? { 'Content-Length': String(body.length) } : {}),
        ...(server.cookie ? { cookie: server.cookie } : {}) }, signal: AbortSignal.timeout(5_000)
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.once('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      response.once('error', reject);
    });
    req.once('error', reject);
    // Ordinary HTTP clients automatically use chunked framing for write() with
    // unknown length. Split inside every UTF-8 codepoint in the small fixture.
    const width = body.length < 1_000 ? 1 : 65_537;
    for (let offset = 0; offset < body.length; offset += width) req.write(body.subarray(offset, offset + width));
    req.end();
  });
}

async function callCount(server) {
  const response = await fetch(new URL('/calls', server.origin), { signal: AbortSignal.timeout(5_000) });
  assert.equal(response.status, 200);
  return (await response.json()).calls;
}

function rawRequest(server, headers, body) {
  const url = new URL(server.origin);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: url.hostname, port: Number(url.port), allowHalfOpen: true });
    const chunks = [];
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('HTTP request did not settle after its body ended.')); }, 5_000);
    socket.on('data', chunk => chunks.push(chunk));
    socket.once('error', error => { clearTimeout(timer); reject(error); });
    socket.once('end', () => {
      clearTimeout(timer); socket.destroy();
      const wire = Buffer.concat(chunks).toString('utf8');
      const boundary = wire.indexOf('\r\n\r\n');
      resolve({ status: Number(/^HTTP\/1\.[01] (\d+)/.exec(wire)?.[1] ?? 0), body: wire.slice(boundary + 4) });
    });
    socket.once('connect', () => socket.end(Buffer.concat([
      Buffer.from('POST /capture HTTP/1.1\r\nHost: ' + url.host + '\r\nConnection: close\r\n' + headers + '\r\n\r\n'),
      Buffer.isBuffer(body) ? body : Buffer.from(body)
    ])));
  });
}

for (const runtime of ['node', 'python']) for (const surface of ['host', 'exported']) for (const custom of [false, true]) {
  test(`${runtime} ${surface} ${custom ? 'custom HTTP handler' : 'default invoke'} preserves streamed JSON`,
    { skip: surface === 'host' && !supported, timeout: 30_000 }, async t => {
      const server = await fixture(t, runtime, surface, custom);
      if (!server) return;
      const body = Buffer.from(JSON.stringify(value));
      for (const framing of ['content-length', 'chunked']) await t.test(framing, async () => {
        const response = await request(server, body, framing, custom ? '/capture' : '/api/invoke');
        assert.equal(response.status, 200, response.body);
        const output = JSON.parse(response.body);
        assert.deepEqual(custom ? JSON.parse(output.body) : output, value);
        if (custom) assert.equal(output.bytes, body.length);
      });
    });
}

for (const runtime of ['node', 'python']) {
  test(`${runtime} exported HTTP input limit counts decoded body bytes for both framings`, { timeout: 30_000 }, async t => {
    const server = await fixture(t, runtime, 'exported');
    if (!server) return;
    for (const framing of ['content-length', 'chunked']) {
      await t.test(framing + ' accepts exactly 2 MB', async () => {
        const response = await request(server, Buffer.alloc(MAX, 'x'), framing, '/count');
        assert.equal(response.status, 200, response.body);
        assert.equal(JSON.parse(response.body).bytes, MAX);
      });
      await t.test(framing + ' rejects one excess byte before dispatch', async () => {
        const before = await callCount(server);
        const response = await request(server, Buffer.alloc(MAX + 1, 'x'), framing, '/count').catch(error => {
          if (['ECONNRESET', 'EPIPE'].includes(error.code)) return { status: 0 };
          throw error;
        });
        assert.ok(response.status === 0 || response.status >= 400, 'An over-limit body must never receive a success response.');
        assert.equal(await callCount(server), before);
      });
    }
    const response = await request(server, Buffer.from('recovered'));
    assert.equal(response.status, 200, response.body);
    assert.equal(JSON.parse(response.body).body, 'recovered');
  });
}

test('Python exported chunk extensions and trailers preserve the complete body', { timeout: 15_000 }, async t => {
  const server = await fixture(t, 'python', 'exported');
  if (!server) return;
  const response = await rawRequest(server, 'Transfer-Encoding: ChUnKeD',
    '3;name=token;note="quoted \\"value\\""\r\nabc\r\n2;flag\r\nde\r\n0\r\nX-Checksum: preserved\r\n\r\n');
  assert.equal(response.status, 200, response.body);
  assert.equal(JSON.parse(response.body).body, 'abcde');
});

test('Python exported malformed HTTP bodies never reach application code', { timeout: 30_000 }, async t => {
  const server = await fixture(t, 'python', 'exported');
  if (!server) return;
  const chunked = 'Transfer-Encoding: chunked';
  const cases = [
    ['nonhex chunk size', chunked, 'xyz\r\nabc\r\n0\r\n\r\n'],
    ['negative chunk size', chunked, '-1\r\n0\r\n\r\n'],
    ['chunk without CRLF', chunked, '3\r\nabcXX0\r\n\r\n'],
    ['truncated chunk data', chunked, '5\r\nabc'],
    ['truncated data terminator', chunked, '3\r\nabc\r'],
    ['missing final chunk', chunked, '3\r\nabc\r\n'],
    ['unterminated trailers', chunked, '0\r\nX-Check: yes\r\n'],
    ['invalid trailer field', chunked, '0\r\nnot-a-field\r\n\r\n'],
    ['unterminated extension quote', chunked, '3;note="unfinished\r\nabc\r\n0\r\n\r\n'],
    ['excessive chunk metadata line', chunked, '1;note=' + 'x'.repeat(65_537) + '\r\na\r\n0\r\n\r\n'],
    ['excessive cumulative metadata', chunked, ('0;note=' + 'x'.repeat(1_000) + '\r\n') + 'X-Data: value\r\n'.repeat(5_000) + '\r\n'],
    ['unsupported transfer coding', 'Transfer-Encoding: gzip', 'abc'],
    ['ambiguous length and transfer coding', chunked + '\r\nContent-Length: 3', '3\r\nabc\r\n0\r\n\r\n'],
    ['duplicate content lengths', 'Content-Length: 3\r\nContent-Length: 3', 'abc'],
    ['truncated fixed-length body', 'Content-Length: 5', 'abc'],
    ['invalid UTF-8 in chunked body', chunked, Buffer.concat([Buffer.from('2\r\n'), Buffer.from([0xc3, 0x28]), Buffer.from('\r\n0\r\n\r\n')])],
    ['invalid UTF-8 in fixed-length body', 'Content-Length: 2', Buffer.from([0xc3, 0x28])]
  ];
  for (const [name, headers, body] of cases) await t.test(name, async () => {
    const before = await callCount(server);
    const response = await rawRequest(server, headers, body);
    assert.ok(response.status === 0 || response.status >= 400, 'Malformed framing must reject before invoking the application; got ' + response.status);
    assert.equal(await callCount(server), before);
  });
  const response = await request(server, Buffer.from('still healthy'));
  assert.equal(response.status, 200, response.body);
  assert.equal(JSON.parse(response.body).body, 'still healthy');
});
