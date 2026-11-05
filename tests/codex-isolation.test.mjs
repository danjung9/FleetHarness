import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createCodexSession, candidateCodexProcessConfig } from '../dist-electron/electron/codex-session.js';
import { createIsolatedAgentTools } from '../dist-electron/electron/isolated-agent-tools.js';
import { CodexRpc, codexExecutable, codexProcessConfig, CHATGPT_MODEL_PROVIDER } from '../dist-electron/electron/codex-rpc.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
const policy = () => ({ filesystem: { ':root': 'deny', ':minimal': 'read', '/tmp/candidate': 'write' }, network: { enabled: false } });
class FakeRpc {
  listeners = new Set(); closers = new Set(); calls = []; disposed = false;
  profile = 'fleet-candidate';
  async initialize() {}
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onClose(fn) { this.closers.add(fn); return () => this.closers.delete(fn); }
  send() {}
  dispose() { this.disposed = true; for (const fn of this.closers) fn(new Error('Process closed')); }
  emit(method, params) { for (const fn of this.listeners) fn({ method, params }); }
  async request(method, params) {
    this.calls.push({ method, params });
    if (method === 'thread/start' || method === 'thread/resume') return { thread: { id: 'candidate-thread' }, ...(this.profile ? { activePermissionProfile: { id: this.profile } } : {}) };
    if (method === 'turn/start') return { turn: { id: 'turn-1' } };
    return {};
  }
}
function options(overrides = {}) { return { home: '/tmp/candidate-home', cwd: '/tmp/candidate', model: 'fixture', signal: new AbortController().signal, tools: [], permissionProfile: policy(), getCredentials: async () => ({ accessToken: 'synthetic-token', expiresAt: Date.now() + 3600_000 }), ...overrides }; }
async function complete(session, rpc) { const turn = session.prompt('Build'); await tick(); rpc.emit('turn/completed', { threadId: 'candidate-thread', turn: { id: 'turn-1', status: 'completed' } }); await turn; }

test('candidate profile is explicit, frozen, and retained across credential rotation', async t => {
  const processes = [], supplied = policy(); let token = 'first';
  const session = await createCodexSession(options({ permissionProfile: supplied, getCredentials: async () => ({ accessToken: token, expiresAt: Date.now() + 3600_000 }), launch: () => { const rpc = new FakeRpc(); processes.push(rpc); return rpc; } }));
  t.after(() => session.dispose());
  supplied.filesystem[':root'] = 'write'; supplied.network.enabled = true;
  const first = processes[0].calls.find(call => call.method === 'thread/start').params;
  assert.equal(first.permissions, 'fleet-candidate'); assert.equal(Object.hasOwn(first, 'sandbox'), false);
  assert.deepEqual(first.runtimeWorkspaceRoots, ['/tmp/candidate']);
  assert.deepEqual(first.config['permissions.fleet-candidate'], policy());
  for (const feature of ['shell_tool', 'view_image', 'multi_agent', 'apps', 'plugins', 'hooks', 'browser_use', 'in_app_browser', 'computer_use', 'image_generation', 'code_mode_tool_search']) assert.equal(first.config['features.' + feature], false);
  await complete(session, processes[0]);
  token = 'second'; const turn = session.prompt('Continue'); await tick();
  const resumed = processes[1].calls.find(call => call.method === 'thread/resume').params;
  assert.equal(resumed.permissions, 'fleet-candidate'); assert.equal(Object.hasOwn(resumed, 'sandbox'), false);
  assert.deepEqual(resumed.config, first.config);
  processes[1].emit('turn/completed', { threadId: 'candidate-thread', turn: { id: 'turn-1', status: 'completed' } }); await turn;
});

test('missing or substituted active profiles fail closed before model work', async () => {
  for (const active of [undefined, ':workspace', ':full-access']) {
    const rpc = new FakeRpc(); rpc.profile = active;
    await assert.rejects(createCodexSession(options({ launch: () => rpc })), /required candidate isolation/);
    assert.equal(rpc.disposed, true);
    assert.equal(rpc.calls.some(call => call.method === 'turn/start'), false);
  }
});

test('profile drift on refreshed threads cannot start another model turn', async t => {
  const processes = []; let token = 'first';
  const session = await createCodexSession(options({ getCredentials: async () => ({ accessToken: token, expiresAt: Date.now() + 3600_000 }), launch: () => { const rpc = new FakeRpc(); if (processes.length) rpc.profile = ':workspace'; processes.push(rpc); return rpc; } }));
  t.after(() => session.dispose()); await complete(session, processes[0]); token = 'second';
  await assert.rejects(session.prompt('Continue'), /required candidate isolation/);
  assert.equal(processes[1].disposed, true);
  assert.equal(processes[1].calls.some(call => call.method === 'turn/start'), false);
});

test('unsafe candidate policy is rejected before starting Codex', async () => {
  for (const invalid of [{ ...policy(), network: { enabled: true } }, { ...policy(), filesystem: { ':root': 'read' } }, { ...policy(), filesystem: { ':root': 'deny', relative: 'write' } }]) {
    let launched = false;
    await assert.rejects(createCodexSession(options({ permissionProfile: invalid, launch: () => { launched = true; return new FakeRpc(); } })), /profile|permission/);
    assert.equal(launched, false);
  }
});

function stream(response, item) {
  response.writeHead(200, { 'Content-Type': 'text/event-stream' });
  for (const data of [
    { type: 'response.created', response: { id: 'resp_isolation', status: 'in_progress', output: [] } },
    { type: 'response.output_item.added', output_index: 0, item: { ...item, status: 'in_progress', ...(item.type === 'function_call' ? { arguments: '' } : item.type === 'custom_tool_call' ? { input: '' } : { content: [] }) } },
    ...(item.type === 'function_call' ? [{ type: 'response.function_call_arguments.delta', item_id: item.id, output_index: 0, delta: item.arguments }] : item.type === 'custom_tool_call' ? [{ type: 'response.custom_tool_call_input.delta', item_id: item.id, output_index: 0, delta: item.input }] : [{ type: 'response.output_text.delta', item_id: item.id, output_index: 0, content_index: 0, delta: 'Isolation fixture complete.' }]),
    { type: 'response.output_item.done', output_index: 0, item },
    { type: 'response.completed', response: { id: 'resp_isolation', status: 'completed', output: [item], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } } }
  ]) response.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`);
  response.end();
}

test('bundled Codex disables native execution and uses bounded candidate shell tools', { skip: !['darwin', 'linux'].includes(process.platform), timeout: 20_000 }, async () => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-native-isolation-'))), home = path.join(root, 'home'), workspace = path.join(root, 'candidate'), sibling = path.join(root, 'sibling');
  await Promise.all([home, workspace, sibling].map(dir => fs.mkdir(dir)));
  await fs.writeFile(path.join(sibling, 'answer-key.txt'), 'PRIVATE_SIBLING_MARKER');
  await fs.writeFile(path.join(workspace, 'public.txt'), 'PUBLIC_CANDIDATE_MARKER');
  await fs.writeFile(path.join(workspace, 'probe.sh'), [
    '#!/bin/sh', 'cat public.txt', `cat '${path.join(sibling, 'answer-key.txt')}'`, `printf leaked > '${path.join(sibling, 'overwritten.txt')}'`, 'printf built > result.txt'
  ].join('\n'));
  const requests = [], closures = []; let session, serverError;
  const server = createServer(async (request, response) => {
    try {
      let raw = ''; for await (const chunk of request) raw += chunk;
      if (request.url !== '/v1/responses') { response.writeHead(404); response.end(); return; }
      const body = JSON.parse(raw); requests.push(body);
      if (requests.length === 1) {
        const declared = [...(body.tools ?? []), ...(body.input ?? []).filter(item => item.type === 'additional_tools').flatMap(item => item.tools ?? [])];
        const names = declared.flatMap(tool => tool.type === 'namespace' ? tool.tools.map(entry => entry.name) : [tool.name]);
        const described = declared.flatMap(tool => tool.type === 'namespace' ? tool.tools : [tool]).map(tool => tool.description ?? '').join('\n');
        const nested = [...described.matchAll(/### `([^`]+)`/g)].map(match => match[1]);
        for (const unused of ['exec_command', 'write_stdin', 'shell', 'shell_command', 'view_image', 'web_search', 'image_gen']) assert.equal([...names, ...nested].includes(unused), false, unused + ' must be disabled. Actual: ' + [...names, ...nested].join(','));
        assert.ok([...names, ...nested].includes('bash'), 'The isolated host shell tool must be available.');
        stream(response, { id: 'fc_forbidden', type: 'custom_tool_call', call_id: 'forbidden-1', name: 'exec', namespace: 'functions', input: 'try { text(await tools.apply_patch(' + JSON.stringify('*** Begin Patch\n*** Add File: ' + path.join(sibling, 'native-patch.txt') + '\n+escaped\n*** End Patch') + ')); } catch(error) { text(String(error)); } text(await tools.exec_command({ cmd: \"echo escaped > native-escape.txt\" }));', status: 'completed' });
      } else if (requests.length === 2) {
        stream(response, { id: 'fc_probe', type: 'custom_tool_call', call_id: 'probe-1', name: 'exec', namespace: 'functions', input: 'text(await tools.bash({ command: \"/bin/sh ./probe.sh\", timeout: 5 }));', status: 'completed' });
      } else stream(response, { id: 'msg_done', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Isolation fixture complete.', annotations: [] }] });
    } catch (error) { serverError = error; response.writeHead(500); response.end('Fixture error'); }
  });
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    session = await createCodexSession(options({ home, cwd: workspace, model: 'gpt-6.1-sol', tools: createIsolatedAgentTools({ workspace, executable: process.execPath }), permissionProfile: { filesystem: { ':root': 'deny', ':minimal': 'read', [workspace]: 'write' }, network: { enabled: false } }, launch: (directory, credentials) => {
      const { args, env } = candidateCodexProcessConfig(directory, credentials);
      args.push('-c', `model_providers.${CHATGPT_MODEL_PROVIDER}.base_url="http://127.0.0.1:${server.address().port}/v1"`);
      const child = spawn(codexExecutable(), args, { cwd: directory, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
      closures.push(new Promise(resolve => child.once('close', resolve))); return new CodexRpc(child);
    } }));
    await session.prompt('Run the local synthetic isolation probe.');
    if (serverError) throw serverError;
    assert.ok(requests.length >= 3);
    await assert.rejects(fs.stat(path.join(workspace, 'native-escape.txt')), { code: 'ENOENT' });
    await assert.rejects(fs.stat(path.join(sibling, 'native-patch.txt')), { code: 'ENOENT' });
    const toolEvidence = JSON.stringify((requests.at(-1).input ?? []).filter(item => /output/.test(item.type)));
    assert.match(toolEvidence, /PUBLIC_CANDIDATE_MARKER/);
    assert.equal(toolEvidence.includes('PRIVATE_SIBLING_MARKER'), false);
    assert.match(toolEvidence, /[Oo]peration not permitted|[Pp]ermission denied/);
    assert.equal(await fs.readFile(path.join(workspace, 'result.txt'), 'utf8'), 'built');
    await assert.rejects(fs.stat(path.join(sibling, 'overwritten.txt')), { code: 'ENOENT' });
  } finally {
    session?.dispose(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await Promise.all(closures); await fs.rm(root, { recursive: true, force: true });
  }
});
