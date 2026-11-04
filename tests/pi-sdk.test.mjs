import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { PiBackend } from '../dist-electron/electron/pi-backend.js';
import { Store, sourceHash } from '../dist-electron/electron/storage.js';
import { startFixtureProvider } from '../scripts/mock-provider.mjs';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function provider(t, respond) {
  const entered = deferred(), requests = [];
  const server = createServer(async (req, res) => {
    try {
      let raw = ''; for await (const chunk of req) raw += chunk;
      requests.push(JSON.parse(raw)); entered.resolve(); await respond(req, res, raw, requests.length);
    } catch (error) { if (!res.destroyed) res.writeHead(500).end(String(error)); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return { baseUrl: `http://127.0.0.1:${server.address().port}/v1`, entered: entered.promise, requests };
}
async function backend(t, baseUrl, limits = { idleMs: 10000, timeoutMs: 20000 }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-sdk-'));
  const store = new Store(root); await store.init();
  const runtime = await ModelRuntime.create({ authPath: path.join(root, 'auth.json'), modelsPath: null, modelsStorePath: path.join(root, 'models'), refreshOnCreate: false, allowModelNetwork: false });
  runtime.registerProvider('fleet-fixture', { baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
    models: [{ id: 'fixture-model', name: 'Local test fixture', reasoning: false, input: ['text'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }] });
  store.state.settings = { provider: 'fleet-fixture', model: 'fixture-model', rememberKey: false };
  const pi = new PiBackend(store, process.execPath, () => {}, path.resolve('.'), { agentLimits: limits }); pi.runtime = runtime;
  t.after(async () => { await pi.stopAll(); await fs.rm(root, { recursive: true, force: true }); });
  return { pi, store, root, project: store.state.projects[0], settle: async () => { await pi.active.get(store.state.projects[0].id)?.done; } };
}

test('real Pi SDK recovers a 503, executes file tools, repairs a failing test and reaches review', { timeout: 30000 }, async t => {
  const fixture = await startFixtureProvider(); t.after(() => fixture.close());
  const proxy = await provider(t, async (req, res, raw, count) => {
    if (count === 1) { res.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { message: '503 temporarily overloaded' } })); return; }
    const response = await fetch(fixture.baseUrl + '/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw });
    res.writeHead(response.status, { 'content-type': 'text/event-stream' });
    for await (const chunk of response.body) res.write(chunk);
    res.end();
  });
  const h = await backend(t, proxy.baseUrl); await h.pi.start(h.project.id); await h.settle();
  assert.equal(h.project.status, 'review', h.project.error); assert.equal(h.pi.active.size, 0);
  assert.ok(h.project.logs.some(l => l.text.includes('Provider retry 1/2')));
  assert.ok(h.project.logs.some(l => l.text.includes('Starting one Pi repair attempt')));
  assert.ok(h.project.logs.some(l => l.kind === 'tool' && l.text.startsWith('write')));
  assert.equal(h.project.report.passed, 1); assert.equal(h.project.report.failed, 0);
  assert.equal(h.project.report.sourceHash, await sourceHash(h.project.workspace));
  assert.ok((await fs.readdir(path.join(h.root, 'sessions', h.project.id))).filter(name => name.endsWith('.jsonl')).length >= 4);
});

test('real Pi provider that never responds is bounded by the inactivity watchdog', { timeout: 10000 }, async t => {
  const stalled = await provider(t, () => {});
  const h = await backend(t, stalled.baseUrl, { idleMs: 500, timeoutMs: 3000 });
  await h.pi.start(h.project.id); await h.settle();
  assert.equal(stalled.requests.length, 1); assert.equal(h.project.status, 'failed');
  assert.match(h.project.error, /no progress/); assert.equal(h.pi.active.size, 0);
  assert.equal(h.project.stages.some(s => s.status === 'active'), false);
});

test('Stop cancels a real stalled provider and leaves a persisted stopped run', { timeout: 10000 }, async t => {
  const stalled = await provider(t, () => {}), h = await backend(t, stalled.baseUrl);
  await h.pi.start(h.project.id); await stalled.entered; await h.pi.stop(h.project.id);
  assert.equal(h.project.status, 'stopped'); assert.equal(h.pi.active.size, 0);
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8'));
  assert.equal(saved.projects[0].status, 'stopped');
});

test('a permanent real provider error stops before implementation without false completion', { timeout: 10000 }, async t => {
  const denied = await provider(t, (_req, res) => res.writeHead(401, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { message: 'Fixture credentials rejected' } })));
  const h = await backend(t, denied.baseUrl); await h.pi.start(h.project.id); await h.settle();
  assert.equal(h.project.status, 'failed'); assert.match(h.project.error, /Fixture credentials rejected/);
  assert.equal(h.project.stages.find(s => s.id === 'build').status, 'queued'); assert.equal(h.pi.active.size, 0);
});
