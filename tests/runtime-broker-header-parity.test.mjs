import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { RuntimeBroker } from '../dist-electron/electron/runtime-broker.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';

const supported = ['darwin', 'linux'].includes(process.platform);
const nodeApplication = `export const invoke = value => value;
export const handleHttp = request => {
  const headers = request.headers, contentType = headers['content-type'];
  if ((contentType ?? '').split(';')[0] !== 'application/json') return {status:415,body:'Expected application/json'};
  return {status:200,headers:{'content-type':'application/json'},body:JSON.stringify({
    contentType, requestId:headers['x-request-id'], token:headers['x-fleet-token'],
    value:JSON.parse(request.body)
  })};
};
`;
const pythonApplication = `import json
def invoke(value):
    return value
def handle_http(request):
    headers = request["headers"]
    content_type = headers.get("content-type")
    if (content_type or "").split(";")[0] != "application/json":
        return {"status":415,"body":"Expected application/json"}
    return {"status":200,"headers":{"content-type":"application/json"},"body":json.dumps({
        "contentType":content_type,"requestId":headers.get("x-request-id"),
        "token":headers.get("x-fleet-token"),"value":json.loads(request["body"])
    })}
`;

async function runtimeFor(t, runtime) {
  if (runtime === 'node') return { executable: process.execPath, readPaths: [] };
  try {
    const python = JSON.parse(execFileSync('python3', ['-I', '-c', 'import json,sys;print(json.dumps({"executable":sys.executable,"prefix":sys.base_prefix}))'],
      { encoding: 'utf8', timeout: 5_000 }));
    return { executable: python.executable, readPaths: [python.prefix] };
  } catch { t.skip('Python 3 is not installed.'); return undefined; }
}

async function standalone(t, command, args) {
  const child = spawn(command, args, { env: { ...process.env, HOST: '127.0.0.1', PORT: '0' }, stdio: ['ignore', 'ignore', 'pipe'] });
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

// A raw header list retains caller casing and duplicate fields. Explicit byte
// length keeps transfer-encoding behavior independent of this header contract.
function request(origin, headers, cookie) {
  const value = { text: 'Keep JSON values: café', answer: 42 }, body = Buffer.from(JSON.stringify(value));
  const url = new URL('/api/invoke', origin);
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST', agent: false,
      headers: [...headers, 'Content-Length', String(body.length), 'Host', url.host, 'Connection', 'close', ...(cookie ? ['Cookie', cookie] : [])],
      signal: AbortSignal.timeout(5_000)
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.once('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      response.once('error', reject);
    });
    req.once('error', reject);
    req.end(body);
  });
}

async function fixture(t, runtime, surface, execution) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-header-parity-')));
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
  const exported = await exportVerifiedBundle({ workspace, parent: root, title: 'Header parity',
    verifiedHash: await sourceHash(workspace), deliveryMarkdown: 'Run the included standalone adapter.' });
  const origin = await standalone(t, execution.executable, [...(runtime === 'python' ? ['-I', '-B'] : []),
    path.join(exported, adapter), '--serve', path.join(exported, entrypoint)]);
  return { origin };
}

const contentType = 'application/json; charset=UTF-8';
const requestId = 'Keep-MiXeD_123', token = 'CaseSensitive TOKEN+/?=AbC; Mixed';
const expected = { contentType, requestId, token, value: { text: 'Keep JSON values: café', answer: 42 } };
const cases = [
  ['lowercase', ['content-type', contentType, 'x-request-id', requestId, 'x-fleet-token', token]],
  ['title case', ['Content-Type', contentType, 'X-Request-Id', requestId, 'X-Fleet-Token', token]],
  ['arbitrary case', ['cOnTeNt-TyPe', contentType, 'x-ReQuEsT-iD', requestId, 'X-fLeEt-ToKeN', token]],
  ['duplicate Content-Type keeps its first value', ['Content-Type', contentType, 'cOnTeNt-TyPe', 'text/plain', 'X-Request-Id', requestId, 'X-Fleet-Token', token]]
];

for (const runtime of ['node', 'python']) for (const surface of ['host', 'exported']) {
  test(`${runtime} ${surface} HTTP handlers receive lowercase header keys with original values`,
    { skip: surface === 'host' && !supported, timeout: 30_000 }, async t => {
      const execution = await runtimeFor(t, runtime);
      if (!execution) return;
      const server = await fixture(t, runtime, surface, execution);
      for (const [name, headers] of cases) await t.test(name, async () => {
        const response = await request(server.origin, headers, server.cookie);
        assert.equal(response.status, 200, response.body);
        assert.deepEqual(JSON.parse(response.body), expected);
      });
      for (const [name, headers] of [
        ['missing Content-Type', ['X-Request-Id', requestId]],
        ['wrong Content-Type', ['Content-Type', 'text/plain']],
        ['duplicate Content-Type does not override a rejected first value', ['Content-Type', 'text/plain', 'cOnTeNt-TyPe', contentType]]
      ]) await t.test(name, async () => {
        const response = await request(server.origin, headers, server.cookie);
        assert.equal(response.status, 415);
        assert.equal(response.body, 'Expected application/json');
      });
      await t.test('valid request succeeds after rejected media types', async () => {
        const response = await request(server.origin, cases[1][1], server.cookie);
        assert.equal(response.status, 200, response.body);
        assert.deepEqual(JSON.parse(response.body), expected);
      });
    });
}
