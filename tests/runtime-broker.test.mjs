import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { RuntimeBroker } from '../dist-electron/electron/runtime-broker.js';
import { IntegrationBroker } from '../dist-electron/electron/integration-broker.js';

const supported = ['darwin', 'linux'].includes(process.platform);
const adapter = path.resolve('templates/runtime-broker/node.mjs');
async function fixture(t, source, name = 'app.mjs') {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-broker-test-')));
  await fs.writeFile(path.join(workspace, name), source);
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  return { workspace, name, start: async options => {
    const broker = await RuntimeBroker.start({ workspace, executable: process.execPath, runtime: 'node', entrypoint: name, requestTimeoutMs: 3000, ...options });
    t.after(() => broker.close()); return broker;
  } };
}
function standalone(command, args, input, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; });
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(stderr)));
    child.stdin.end(JSON.stringify(input));
  });
}

async function standaloneServer(t, command, args) {
  const child = spawn(command, args, { env: { ...process.env, HOST: '127.0.0.1', PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (child.exitCode === null) { child.kill('SIGKILL'); await new Promise(resolve => child.once('close', resolve)); } });
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Standalone service did not become ready')); }, 5000);
    let text = '';
    child.stderr.on('data', chunk => { text += chunk; const found = /Application server ready: (http:\/\/127\.0\.0\.1:\d+)/.exec(text); if (found) { clearTimeout(timeout); resolve(found[1]); } });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('close', () => { clearTimeout(timeout); reject(new Error(text)); });
  });
}

test('Node worker correlates concurrent invocations and HTTP with shared standalone computation', { skip: !supported }, async t => {
  const f = await fixture(t, `export async function invoke(value) { await new Promise(resolve=>setTimeout(resolve,value.delay??0));return {answer:value.x*2}; }`);
  const broker = await f.start();
  assert.deepEqual(await Promise.all([broker.invoke({ x: 2, delay: 30 }), broker.invoke({ x: 4 })]), [{ answer: 4 }, { answer: 8 }]);
  const http = await broker.http({ method: 'POST', path: '/api/invoke', headers: {}, body: '{"x":7}' });
  assert.equal(http.status, 200); assert.deepEqual(JSON.parse(http.body), { answer: 14 });
  assert.deepEqual(await standalone(process.execPath, [adapter, '--invoke', path.join(f.workspace, f.name)], { x: 7 }), { answer: 14 });
});

test('framed external API operations reach only the host broker and never disclose its credential', { skip: !supported }, async t => {
  const f = await fixture(t, `export async function invoke(value,context){return {response:await context.integrations.invoke('api',{body:value}),ambient:process.env.PRIVATE_API_KEY??null};}`);
  let request;
  const integrations = new IntegrationBroker({ candidateId: 'test', operations: [{ id: 'api', origin: 'https://api.example.com', path: '/v1/query', method: 'POST', responseType: 'json', auth: { type: 'header-key', credentialId: 'api', envName: 'PRIVATE_API_KEY', headerName: 'X-Api-Key' } }], credentials: { get: async () => 'host-only-secret' }, transport: async input => { request = input; return { status: 200, contentType: 'application/json', body: JSON.stringify({ credential: input.headers['x-api-key'], answer: 42 }) }; } });
  const broker = await f.start({ integrations });
  assert.deepEqual(await broker.invoke({ question: 'value' }), { response: { credential: '[redacted]', answer: 42 }, ambient: null });
  assert.equal(request.url.href, 'https://api.example.com/v1/query'); assert.equal(request.headers['x-api-key'], 'host-only-secret');
  await broker.close(); assert.equal(integrations.revoked, true);
});

test('host preview requires a lease and serves only explicit assets with fixed security headers', { skip: !supported }, async t => {
  const f = await fixture(t, `export const invoke=value=>value; export const handleHttp=()=>({status:200,headers:{'content-type':'text/plain','set-cookie':'stolen=1','content-security-policy':'default-src *','refresh':'0;url=https://evil.example'},body:'dynamic'});`);
  await fs.writeFile(path.join(f.workspace, 'index.html'), '<h1>Preview</h1>');
  const broker = await f.start(); const url = await broker.listen({ staticRoot: f.workspace, files: ['index.html'] });
  const origin = new URL(url).origin;
  assert.equal((await fetch(origin + '/')).status, 403);
  const entry = await fetch(url, { redirect: 'manual' }); assert.equal(entry.status, 302);
  const cookie = entry.headers.get('set-cookie').split(';')[0];
  const home = await fetch(origin + '/', { headers: { cookie } }); assert.equal(await home.text(), '<h1>Preview</h1>');
  const dynamic = await fetch(origin + '/api', { headers: { cookie } }); assert.equal(await dynamic.text(), 'dynamic');
  assert.equal(dynamic.headers.get('set-cookie'), null); assert.equal(dynamic.headers.get('refresh'), null);
  assert.match(dynamic.headers.get('content-security-policy'), /connect-src 'self'/);
  assert.match(dynamic.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal((await fetch(origin + '/', { headers: { cookie, origin: 'https://evil.example' } })).status, 403);
  await broker.close(); await assert.rejects(fetch(url));
});

test('embedding requires a host desktop origin and uses a partitioned cross-site lease', { skip: !supported }, async t => {
  const f = await fixture(t, 'export const invoke=value=>value;');
  await fs.writeFile(path.join(f.workspace, 'index.html'), '<h1>Embedded preview</h1>');
  const broker = await f.start();
  for (const embeddingOrigin of ['*', 'https://evil.example', 'http://localhost:5173', "http://127.0.0.1:5173; frame-ancestors *", 'file:///untrusted.html']) {
    await assert.rejects(broker.listen({ embeddingOrigin }));
  }
  for (const embeddingOrigin of ['file:', 'http://127.0.0.1:5173']) {
    const url = await broker.listen({ staticRoot: f.workspace, files: ['index.html'], embeddingOrigin });
    const entry = await fetch(url, { redirect: 'manual' }), cookie = entry.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly; SameSite=None; Secure; Partitioned/);
    const page = await fetch(new URL(url).origin + '/', { headers: { cookie: cookie.split(';')[0] } });
    assert.equal(await page.text(), '<h1>Embedded preview</h1>');
    assert.match(page.headers.get('content-security-policy'), new RegExp('frame-ancestors ' + embeddingOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
  }
});

test('malformed correlated frames reject pending requests and revoke the worker', { skip: !supported }, async t => {
  const f = await fixture(t, 'export const invoke=value=>value;');
  const malformed = path.join(f.workspace, 'malformed.mjs');
  await fs.writeFile(malformed, `console.log(JSON.stringify({version:1,type:'ready'}));process.stdin.on('data',chunk=>{const value=JSON.parse(chunk);console.log(JSON.stringify({version:1,type:'response',id:value.id,ok:'invalid'}));});`);
  const broker = await f.start({ adapterPath: malformed });
  await assert.rejects(broker.invoke(1), /Invalid runtime response/);
  await assert.rejects(broker.invoke(2), /Invalid runtime response/);
});

test('deadline cancels a hanging worker and pending invocations', { skip: !supported }, async t => {
  const f = await fixture(t, 'export async function invoke(){await new Promise(()=>{});}');
  const broker = await f.start({ requestTimeoutMs: 300 });
  await assert.rejects(broker.invoke(null), /deadline/);
});

test('Python worker shares invoke and HTTP logic and supports host-brokered APIs', { skip: !supported }, async t => {
  let runtime;
  try { runtime = JSON.parse(execFileSync('python3', ['-I', '-c', 'import json,sys;print(json.dumps({"executable":sys.executable,"prefix":sys.base_prefix}))'], { encoding: 'utf8' })); }
  catch { t.skip('Python 3 is not installed.'); return; }
  const f = await fixture(t, `def invoke(value, context):\n    return {"answer":value["x"]*3,"external":context["integrations"]["invoke"]("api",{})}\n`, 'app.py');
  const integrations = new IntegrationBroker({ candidateId: 'python', operations: [{ id: 'api', origin: 'https://api.example.com', path: '/answer', method: 'GET', responseType: 'json' }], transport: async () => ({ status: 200, contentType: 'application/json', body: '7' }) });
  const broker = await f.start({ runtime: 'python', executable: runtime.executable, readPaths: [runtime.prefix], integrations });
  assert.deepEqual(await broker.invoke({ x: 4 }), { answer: 12, external: 7 });
  const http = await broker.http({ method: 'POST', path: '/api/invoke', headers: {}, body: '{"x":5}' });
  assert.deepEqual(JSON.parse(http.body), { answer: 15, external: 7 });
});

test('exported Node and Python services preserve shared compute and configured browser assets', async t => {
  const f = await fixture(t, 'export const invoke=value=>({answer:value.x+1});');
  await fs.mkdir(path.join(f.workspace, 'public')); await fs.writeFile(path.join(f.workspace, 'public/index.html'), '<h1>Exported application</h1>');
  const config = path.join(f.workspace, 'integration-config.json');
  await fs.writeFile(config, JSON.stringify({ operations: [], static: { root: 'public', files: ['index.html'], index: 'index.html' } }));
  const nodeUrl = await standaloneServer(t, process.execPath, [adapter, '--serve', path.join(f.workspace, f.name), config]);
  assert.equal(await (await fetch(nodeUrl)).text(), '<h1>Exported application</h1>');
  assert.deepEqual(await (await fetch(nodeUrl + '/api/invoke', { method: 'POST', body: '{"x":8}' })).json(), { answer: 9 });
  let python;
  try { python = execFileSync('python3', ['-I', '-c', 'import sys;print(sys.executable)'], { encoding: 'utf8' }).trim(); } catch { return; }
  await fs.writeFile(path.join(f.workspace, 'app.py'), 'def invoke(value):\n    return {"answer":value["x"]+1}\n');
  const pythonUrl = await standaloneServer(t, python, ['-I', '-B', path.resolve('templates/runtime-broker/python.py'), '--serve', path.join(f.workspace, 'app.py'), config]);
  assert.equal(await (await fetch(pythonUrl)).text(), '<h1>Exported application</h1>');
  assert.deepEqual(await (await fetch(pythonUrl + '/api/invoke', { method: 'POST', body: '{"x":8}' })).json(), { answer: 9 });
});
