import { syntheticRuntimeExport } from './helpers/exported-runtime-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { RuntimeBroker } from '../dist-electron/electron/runtime-broker.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';

const supported = ['darwin', 'linux'].includes(process.platform);
const assets = [
  ['index.html', 'text/html; charset=utf-8', Buffer.from('<!doctype html><html lang="en"><title>Résumé</title><h1>Café — résumé ☃</h1></html>\n')],
  ['legacy.html', 'text/html; charset=utf-8', Buffer.from('<!doctype html><html lang="en"><meta charset="windows-1252"><title>Résumé</title><h1>Café — résumé ☃</h1></html>\n')],
  ['theme.css', 'text/css; charset=utf-8', Buffer.from('h1::after { content: "Café — résumé ☃"; }\n')],
  ['classic.js', 'text/javascript; charset=utf-8', Buffer.from('globalThis.classicGreeting = "Café — résumé ☃";\n')],
  ['module.mjs', 'text/javascript; charset=utf-8', Buffer.from('export const greeting = "Café — résumé ☃";\n')],
  ['pixel.png', 'image/png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6tXsAAAAASUVORK5CYII=', 'base64')],
  // The font sample checks binary transport, not font validity or rendering.
  ['sample.woff2', 'font/woff2', Buffer.concat([Buffer.from('wOF2'), Buffer.from([0, 1, 0, 0, 0, 0, 0, 16, 0x80, 0xff, 0xc3, 0xa9])])],
  ['empty.wasm', 'application/wasm', Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0])]
];
const hidden = Buffer.from('This existing file is outside the static allowlist.');

async function executionFor(t, runtime) {
  if (runtime === 'node') return { executable: process.execPath, readPaths: [] };
  try {
    const python = JSON.parse(execFileSync('python3', ['-I', '-c', 'import json,sys;print(json.dumps({"executable":sys.executable,"prefix":sys.base_prefix}))'],
      { encoding: 'utf8', timeout: 5_000 }));
    return { executable: python.executable, readPaths: [python.prefix] };
  } catch { t.skip('Python 3 is not installed.'); return undefined; }
}

async function standalone(cleanup, executable, args) {
  const child = spawn(executable, args, { env: { ...process.env, HOST: '127.0.0.1', PORT: '0' }, stdio: ['ignore', 'ignore', 'pipe'] });
  let diagnostics = '', closed = false;
  const done = new Promise(resolve => child.once('close', () => { closed = true; resolve(); }));
  cleanup.push(async () => { if (!closed) child.kill('SIGKILL'); await done; });
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
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-static-charset-'))), cleanup = [];
  t.after(async () => {
    try { for (const close of cleanup) await close(); }
    finally { await fs.rm(root, { recursive: true, force: true }); }
  });
  const workspace = path.join(root, 'source'), entrypoint = runtime === 'node' ? 'app.mjs' : 'app.py';
  const adapter = 'runtime-broker/' + (runtime === 'node' ? 'node.mjs' : 'python.py');
  await fs.mkdir(path.join(workspace, 'runtime-broker'), { recursive: true });
  await fs.mkdir(path.join(workspace, 'public'));
  await fs.writeFile(path.join(workspace, entrypoint), runtime === 'node'
    ? 'export const invoke = value => value;\n' : 'def invoke(value):\n    return value\n');
  await fs.copyFile(path.resolve('templates', adapter), path.join(workspace, adapter));
  for (const [file, , bytes] of assets) await fs.writeFile(path.join(workspace, 'public', file), bytes);
  await fs.writeFile(path.join(workspace, 'public', 'undeclared.txt'), hidden);
  const files = assets.map(([file]) => file);
  await fs.writeFile(path.join(workspace, 'integration-config.json'), JSON.stringify({
    operations: [], static: { root: 'public', files, index: 'index.html' }
  }));
  if (surface === 'host') {
    const broker = await RuntimeBroker.start({ workspace, runtime, entrypoint, ...execution, requestTimeoutMs: 5_000,
      adapterPath: path.join(workspace, adapter) });
    cleanup.push(() => broker.close());
    const lease = await broker.listen({ staticRoot: path.join(workspace, 'public'), files, index: 'index.html' });
    const response = await fetch(lease, { redirect: 'manual', signal: AbortSignal.timeout(5_000) });
    assert.equal(response.status, 302);
    const cookie = response.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie, 'The host must grant a lease before static or dynamic requests.');
    await response.arrayBuffer();
    return { origin: new URL(lease).origin, cookie };
  }
  const exported = await exportVerifiedBundle({ ...syntheticRuntimeExport(runtime, entrypoint, [entrypoint, adapter]), workspace, parent: root, title: 'Static charset parity',
    verifiedHash: await sourceHash(workspace), deliveryMarkdown: 'Run the included standalone adapter and integration-config.json.' });
  const origin = await standalone(cleanup, execution.executable, [...(runtime === 'python' ? ['-I', '-B'] : []),
    path.join(exported, adapter), '--serve', path.join(exported, entrypoint), path.join(exported, 'integration-config.json')]);
  return { origin };
}

async function request(server, pathname, init = {}) {
  const response = await fetch(new URL(pathname, server.origin), { ...init,
    headers: { ...(server.cookie ? { cookie: server.cookie } : {}), ...init.headers }, signal: AbortSignal.timeout(5_000) });
  return { status: response.status, contentType: response.headers.get('content-type'), body: Buffer.from(await response.arrayBuffer()) };
}

for (const runtime of ['node', 'python']) for (const surface of ['host', 'exported']) {
  test(`${runtime} ${surface} static assets preserve UTF-8 declarations and binary bytes`,
    { skip: surface === 'host' && !supported, timeout: 30_000 }, async t => {
      const execution = await executionFor(t, runtime);
      if (!execution) return;
      const server = await fixture(t, runtime, surface, execution);
      for (const [file, contentType, bytes] of assets) await t.test(file, async () => {
        const response = await request(server, file === 'index.html' ? '/' : '/' + file);
        assert.equal(response.status, 200, file);
        assert.deepEqual(response.body, bytes, 'Serving and exporting must preserve the exact file bytes.');
        assert.equal(response.contentType, contentType, 'The HTTP declaration must agree across host preview and standalone delivery.');
      });
      await t.test('existing undeclared static file remains inaccessible', async () => {
        const response = await request(server, '/undeclared.txt');
        assert.equal(response.status, 404);
        assert.equal(response.body.toString('utf8'), 'Not found');
        assert.notDeepEqual(response.body, hidden);
      });
      await t.test('dynamic invocation still works after static requests and denial', async () => {
        const value = { text: 'Café — résumé ☃', answer: 42 };
        const response = await request(server, '/api/invoke', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
        assert.equal(response.status, 200);
        assert.equal(response.contentType, 'application/json');
        assert.deepEqual(JSON.parse(response.body.toString('utf8')), value);
      });
    });
}
