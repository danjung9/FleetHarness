import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } from '@earendil-works/pi-coding-agent';
import { PiBackend } from '../dist-electron/electron/pi-backend.js';
import { Store, sourceHash, newProject } from '../dist-electron/electron/storage.js';
import { qualityFixtureProject } from '../scripts/quality-fixture.mjs';
import { startFixtureProvider } from '../scripts/mock-provider.mjs';

// Public errors are plain instructions; the original diagnostics remain testable in the log.
function rawError(project) {
  assert.equal(typeof project.error, 'string');
  assert.doesNotMatch(project.error, /\b(stage|session|SDK|Codex turn|thread|artifact)\b/i);
  return project.logs.filter(log => log.kind === 'error').map(log => log.text).join('\n');
}

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
  store.state.projects[0] = newProject(qualityFixtureProject);
  const runtime = await ModelRuntime.create({ authPath: path.join(root, 'fixture-credentials.json'), modelsPath: null, modelsStorePath: path.join(root, 'models'), refreshOnCreate: false, allowModelNetwork: false });
  runtime.registerProvider('fleet-fixture', { baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
    models: [{ id: 'fixture-model', name: 'Local test fixture', reasoning: false, input: ['text', 'image'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }] });
  store.state.settings = { provider: 'fleet-fixture', model: 'fixture-model', rememberKey: false };
  const pi = new PiBackend(store, process.execPath, () => {}, path.resolve('.'), { agentLimits: limits, preflight: { browser: async () => {}, freeBytes: async () => 1024 ** 3 } }); pi.runtime = runtime;
  t.after(async () => { await pi.stopAll(); await fs.rm(root, { recursive: true, force: true }); });
  return { pi, store, root, project: store.state.projects[0], settle: async () => { await pi.active.get(store.state.projects[0].id)?.done; } };
}

test('real Pi SDK sends browser tool screenshot pixels and console errors to an image-capable model', { timeout: 10000 }, async t => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==';
  const consoleText = 'Console error: synthetic browser fixture failure.';
  const toolCalls = [];
  const fixture = await provider(t, (_req, res, _raw, count) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const send = (delta, finish_reason = null) => res.write('data: ' + JSON.stringify({
      id: 'chatcmpl-browser-fixture', object: 'chat.completion.chunk', created: 1, model: 'fixture-vision',
      choices: [{ index: 0, delta, finish_reason }]
    }) + '\n\n');
    send({ role: 'assistant', content: '' });
    if (count === 1) {
      send({ tool_calls: [{ index: 0, id: 'call_browser_fixture', type: 'function', function: { name: 'fleet_browser', arguments: '{"action":"screenshot"}' } }] });
      send({}, 'tool_calls');
    } else {
      send({ content: 'Screenshot and console received.' });
      send({}, 'stop');
    }
    res.end('data: [DONE]\n\n');
  });
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-sdk-browser-'));
  let session;
  t.after(async () => { await session?.abort(); session?.dispose(); await fs.rm(root, { recursive: true, force: true }); });
  const runtime = await ModelRuntime.create({ authPath: path.join(root, 'fixture-credentials.json'), modelsPath: null, modelsStorePath: path.join(root, 'models'), refreshOnCreate: false, allowModelNetwork: false });
  runtime.registerProvider('fleet-vision-fixture', { baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
    models: [{ id: 'fixture-vision', name: 'Local vision fixture', reasoning: false, input: ['text', 'image'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }] });
  const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false } });
  const loader = new DefaultResourceLoader({ cwd: root, agentDir: path.join(root, 'pi'), settingsManager,
    noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true });
  await loader.reload();
  ({ session } = await createAgentSession({ cwd: root, agentDir: path.join(root, 'pi'), modelRuntime: runtime,
    model: runtime.getModel('fleet-vision-fixture', 'fixture-vision'), thinkingLevel: 'off',
    tools: ['fleet_browser'], excludeTools: ['mcp__*'], resourceLoader: loader, settingsManager, sessionManager: SessionManager.inMemory(root),
    customTools: [{ name: 'fleet_browser', label: 'Browser', description: 'Inspect the synthetic local app.',
      parameters: { type: 'object', properties: { action: { type: 'string', enum: ['screenshot'] } }, required: ['action'], additionalProperties: false },
      async execute(_id, args) {
        toolCalls.push(args);
        return { content: [{ type: 'text', text: consoleText }, { type: 'image', mimeType: 'image/png', data: png }], details: {} };
      }
    }]
  }));
  await session.prompt('Inspect the local app screenshot and console errors.');
  assert.deepEqual(toolCalls, [{ action: 'screenshot' }]);
  assert.equal(fixture.requests.length, 2);
  const messages = fixture.requests[1].messages;
  const resultIndex = messages.findIndex(message => message.role === 'tool' && message.tool_call_id === 'call_browser_fixture');
  assert.ok(resultIndex >= 0, 'the next model request must include the browser tool result');
  assert.equal(messages[resultIndex].content, consoleText);
  const attachments = messages.slice(resultIndex + 1).flatMap(message => message.role === 'user' && Array.isArray(message.content) ? message.content : []).filter(part => part.type === 'image_url');
  assert.deepEqual(attachments, [{ type: 'image_url', image_url: { url: `data:image/png;base64,${png}` } }]);
});

test('real Pi SDK recovers a 503, executes file tools, repairs a failing test and reaches review', { timeout: 90000 }, async t => {
  const fixture = await startFixtureProvider(); t.after(() => fixture.close());
  const proxy = await provider(t, async (req, res, raw, count) => {
    if (count === 1) { res.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { message: '503 temporarily overloaded' } })); return; }
    const response = await fetch(fixture.baseUrl + '/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw });
    res.writeHead(response.status, { 'content-type': 'text/event-stream' });
    for await (const chunk of response.body) res.write(chunk);
    res.end();
  });
  const h = await backend(t, proxy.baseUrl, { idleMs: 30_000, timeoutMs: 60_000 }); await h.pi.start(h.project.id); await h.settle();
  assert.equal(h.project.status, 'review', h.project.error); assert.equal(h.pi.active.size, 0);
  assert.ok(h.project.logs.some(l => l.text.includes('Provider retry 1/2')));
  assert.ok(h.project.logs.some(l => l.text.includes('Starting one Pi repair attempt')));
  assert.ok(h.project.logs.some(l => l.kind === 'tool' && l.text.startsWith('write')));
  const visualCalls = fixture.requests.flatMap(request => request.messages.flatMap(message => message.tool_calls ?? [])).filter(call => call.function?.name === 'fleet_visual_review');
  assert.ok(new Set(visualCalls.map(call => call.id)).size >= 12, 'Build, verification and repair each compare initial and fresh captures at both widths.');
  assert.equal(h.project.report.passed, 1); assert.equal(h.project.report.failed, 0);
  assert.equal(h.project.report.sourceHash, await sourceHash(h.project.workspace));
  assert.ok((await fs.readdir(path.join(h.root, 'sessions', h.project.id))).filter(name => name.endsWith('.jsonl')).length >= 4);
});

test('real Pi provider that never responds is bounded by the inactivity watchdog', { timeout: 10000 }, async t => {
  const stalled = await provider(t, () => {});
  const h = await backend(t, stalled.baseUrl, { idleMs: 500, timeoutMs: 3000 });
  await h.pi.start(h.project.id); await h.settle();
  assert.equal(stalled.requests.length, 3); assert.equal(h.project.status, 'failed');
  assert.equal(h.project.logs.filter(log => log.text.includes('Retrying this stage (1 of 2)')).length, 1);
  assert.match(rawError(h.project), /no progress/); assert.equal(h.pi.active.size, 0);
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
  assert.equal(h.project.status, 'failed'); assert.match(rawError(h.project), /Fixture credentials rejected/);
  assert.equal(h.project.stages.find(s => s.id === 'build').status, 'queued'); assert.equal(h.pi.active.size, 0);
});
