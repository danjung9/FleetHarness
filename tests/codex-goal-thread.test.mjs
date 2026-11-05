import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CodexRpc, codexExecutable } from '../dist-electron/electron/codex-rpc.js';
import { prepareCodexGoalThread } from '../dist-electron/electron/codex-goal-thread.js';

test('native Codex persists an active goal without model calls, then pursues it on resume', { timeout: 20_000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-goal-thread-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const home = path.join(root, 'codex-home');
  const workspace = path.join(root, "project ' quoted");
  await Promise.all([fs.mkdir(home), fs.mkdir(workspace)]);
  const calls = [];
  let resolveFirstCall;
  const firstCall = new Promise(resolve => { resolveFirstCall = resolve; });
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    calls.push({ url: request.url, body });
    resolveFirstCall();
    response.writeHead(401, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: { message: 'Offline goal test; no real provider.', type: 'authentication_error' } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  await fs.writeFile(path.join(home, 'config.toml'), `
model = "gpt-5.4"
model_provider = "goal_test"
check_for_update_on_startup = false
web_search = "disabled"
[model_providers.goal_test]
name = "Offline goal test"
base_url = "http://127.0.0.1:${server.address().port}/v1"
requires_openai_auth = false
wire_api = "responses"
supports_websockets = false
request_max_retries = 0
stream_max_retries = 0
[features]
plugins = false
apps = false
skill_search = false
browser_use = false
computer_use = false
image_generation = false
multi_agent = false
[analytics]
enabled = false
[projects.${JSON.stringify(workspace)}]
trust_level = "trusted"
`);
  // Explicitly avoid inheriting any real provider credentials or Codex home.
  const env = { PATH: process.env.PATH, HOME: os.homedir(), TMPDIR: process.env.TMPDIR, CODEX_HOME: home };
  const objective = "Build the requested dashboard. Keep the customer's 'quoted' text.\nVerify the result.";
  const threadId = await prepareCodexGoalThread({ workspace, objective, home, env });
  assert.match(threadId, /^[a-f0-9-]{36}$/);
  assert.equal(calls.length, 0, 'preparing the handoff must not call a model');

  const rpc = new CodexRpc(spawn(codexExecutable(), ['app-server', '--listen', 'stdio://', '--enable', 'goals'], {
    cwd: workspace, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true
  }));
  t.after(() => rpc.dispose());
  await rpc.initialize();
  const { goal } = await rpc.request('thread/goal/get', { threadId });
  assert.equal(goal.objective, objective);
  assert.equal(goal.status, 'active');
  assert.equal(goal.tokenBudget, null);
  const { thread } = await rpc.request('thread/read', { threadId, includeTurns: true });
  assert.equal(thread.status.type, 'notLoaded');
  assert.deepEqual(thread.turns, []);
  assert.equal(calls.length, 0, 'the persisted goal must remain idle until resume');

  await rpc.request('thread/resume', { threadId });
  await Promise.race([
    firstCall,
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Resuming did not pursue the goal.')), 8000); timer.unref(); })
  ]);
  assert.ok(calls[0].url.endsWith('/responses'));
  assert.ok(calls[0].body.includes('Build the requested dashboard.'));
});

test('goal preparation rejects an empty objective before launching Codex', async () => {
  await assert.rejects(prepareCodexGoalThread({ workspace: '/unused', objective: '  ', executable: '/does-not-exist' }), /objective is required/);
});
