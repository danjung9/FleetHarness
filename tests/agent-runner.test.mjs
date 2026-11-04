import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { Store } from '../dist-electron/electron/storage.js';
import { createCodexSession } from '../dist-electron/electron/codex-session.js';
import { runAgentStage } from '../dist-electron/electron/agent-runner.js';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const never = () => new Promise(() => {});
const assistant = (stopReason = 'stop', errorMessage) => ({ type: 'message_end', message: { role: 'assistant', stopReason, errorMessage } });
function session(handler = never) {
  const listeners = new Set();
  return {
    prompts: [], aborts: 0, disposals: 0,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    emit(event) { for (const listener of listeners) listener(event); },
    async prompt(text) { this.prompts.push(text); await handler(this); },
    abort() { this.aborts++; return never(); }, // Deliberately ignores cancellation.
    dispose() { this.disposals++; },
    get listeners() { return listeners.size; }
  };
}
function run(s, overrides = {}) {
  return runAgentStage({ label: 'Test agent', signal: new AbortController().signal,
    limits: { idleMs: 100, timeoutMs: 1000, maxTurns: 3 }, create: async () => s,
    work: prompt => prompt('Complete the stage'), onEvent() {}, ...overrides });
}

test('a silent prompt times out and releases a session whose abort never settles', { timeout: 3000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const s = session();
  const rejected = assert.rejects(run(s), /no progress.*waiting for the model/);
  await setImmediate(); t.mock.timers.tick(100); await rejected;
  assert.equal(s.aborts, 1); assert.equal(s.disposals, 1); assert.equal(s.listeners, 0);
});

test('initialization is bounded and a session arriving after timeout is disposed without prompting', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = deferred(), s = session();
  const rejected = assert.rejects(run(s, { create: () => pending.promise }), /initializing/);
  t.mock.timers.tick(100); await rejected;
  pending.resolve(s); await setImmediate();
  assert.equal(s.aborts, 1); assert.equal(s.disposals, 1); assert.equal(s.prompts.length, 0);
});

test('thinking and tool activity refresh inactivity without exhausting a productive stage', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = deferred(), s = session(() => pending.promise);
  const completion = run(s); await setImmediate();
  for (const event of [
    { type: 'message_update', assistantMessageEvent: { type: 'thinking_delta', delta: 'reasoning' } },
    { type: 'tool_execution_start', toolName: 'bash' },
    { type: 'tool_execution_update', toolName: 'bash' },
    { type: 'tool_execution_end', toolName: 'bash' },
    { type: 'compaction_start', reason: 'threshold' },
    { type: 'compaction_end', reason: 'threshold' }
  ]) { t.mock.timers.tick(90); s.emit(event); }
  pending.resolve(); await completion;
  t.mock.timers.tick(2000);
  assert.equal(s.aborts, 0); assert.equal(s.disposals, 1); assert.equal(s.listeners, 0);
});

test('continuous activity cannot bypass the absolute deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const s = session();
  const rejected = assert.rejects(run(s), /exceeded.*minute limit/); await setImmediate();
  for (let i = 0; i < 11; i++) { t.mock.timers.tick(90); s.emit({ type: 'tool_execution_update' }); }
  t.mock.timers.tick(10); await rejected;
  assert.equal(s.aborts, 1); assert.equal(s.disposals, 1);
});

test('a looping agent is terminated at its turn budget even if prompt and abort hang', async () => {
  const s = session(); const rejected = assert.rejects(run(s), /3-turn limit/); await setImmediate();
  for (let i = 0; i < 4; i++) s.emit({ type: 'turn_start' });
  await rejected; assert.equal(s.aborts, 1); assert.equal(s.listeners, 0);
});

test('the last allowed turn may finish successfully', async () => {
  const s = session(s => { for (let i = 0; i < 3; i++) { s.emit({ type: 'turn_start' }); s.emit(assistant()); s.emit({ type: 'turn_end' }); } });
  await run(s); assert.equal(s.aborts, 0);
});

test('user cancellation settles immediately and late events cannot update the run', async () => {
  const controller = new AbortController(), s = session(), events = [];
  const rejected = assert.rejects(run(s, { signal: controller.signal, onEvent: e => events.push(e) }), /stopped by you/);
  await setImmediate(); controller.abort(); await rejected;
  s.emit(assistant()); assert.deepEqual(events, []); assert.equal(s.disposals, 1);
});

test('cancellation during setup releases a late session; an already cancelled stage never initializes', async () => {
  const pending = deferred(), controller = new AbortController(), s = session();
  const rejected = assert.rejects(run(s, { signal: controller.signal, create: () => pending.promise }), /stopped by you/);
  controller.abort(); await rejected; pending.resolve(s); await setImmediate();
  assert.equal(s.prompts.length, 0); assert.equal(s.disposals, 1);
  await assert.rejects(run(s, { signal: controller.signal, create: () => assert.fail('Must not initialize') }), /stopped by you/);
});

test('a recovered provider error does not poison a successful stage', async () => {
  const s = session(s => {
    s.emit(assistant('error', '503 overloaded'));
    s.emit({ type: 'auto_retry_start', attempt: 1, maxAttempts: 2 });
    s.emit(assistant()); s.emit({ type: 'auto_retry_end', success: true });
  });
  await run(s); assert.equal(s.aborts, 0);
});

for (const [reason, expected] of [['error', /provider unavailable/], ['aborted', /stopped before completing/], ['length', /response limit/]]) {
  test(`a terminal ${reason} response fails instead of advancing`, async () => {
    const s = session(s => s.emit(assistant(reason, 'provider unavailable')));
    await assert.rejects(run(s), expected); assert.equal(s.disposals, 1);
  });
}

test('artifact completion shares the original deadline and turn budget', async () => {
  const s = session(s => { s.emit({ type: 'turn_start' }); s.emit({ type: 'turn_start' }); });
  await assert.rejects(run(s, { work: async prompt => { await prompt('Initial'); await prompt('Missing artifacts'); } }), /3-turn limit/);
  assert.equal(s.prompts.length, 2);
});

test('prompt rejection and invalid limits fail clearly without leaking listeners', async () => {
  const s = session(() => { throw new Error('Transport failed'); });
  await assert.rejects(run(s), /Transport failed/); assert.equal(s.listeners, 0); assert.equal(s.disposals, 1);
  await assert.rejects(run(s, { limits: { idleMs: 0 } }), /Invalid agent limit/);
});

const piUsage = { input: 70, output: 20, cacheRead: 100, cacheWrite: 10, reasoning: 5, totalTokens: 200 };
const expectedUsage = { inputTokens: 180, cachedInputTokens: 100, uncachedInputTokens: 80,
  outputTokens: 20, reasoningOutputTokens: 5, totalTokens: 200, uncachedPlusOutputTokens: 100 };
const usageMessage = usage => ({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop', usage } });

test('stage measurements sum Pi message usage across completion prompts without counting reasoning twice', async () => {
  const measured = [], s = session(s => s.emit(usageMessage(piUsage)));
  await run(s, { onMetrics: m => measured.push(m), work: async prompt => { await prompt('Initial'); await prompt('Complete'); } });
  assert.equal(measured.length, 1);
  assert.ok(measured[0].durationMs >= 0);
  assert.deepEqual(measured[0].usage, Object.fromEntries(Object.entries(expectedUsage).map(([k, v]) => [k, v * 2])));
});

test('stage measurements keep missing and invalid usage unknown and retain usage on failure', async () => {
  for (const usage of [undefined, { ...piUsage, output: undefined }, { ...piUsage, input: -1 }]) {
    let measured;
    const s = session(s => { s.emit(usageMessage(usage)); throw new Error('Synthetic failure'); });
    await assert.rejects(run(s, { onMetrics: m => { measured = m; } }), /Synthetic failure/);
    assert.ok(measured.durationMs >= 0);
    if (!usage) assert.equal(measured.usage, null);
    else if (usage.output === undefined) {
      assert.equal(measured.usage.outputTokens, null);
      assert.equal(measured.usage.uncachedPlusOutputTokens, null);
      assert.equal(measured.usage.inputTokens, 180);
    } else assert.equal(measured.usage.uncachedInputTokens, null);
  }
  let measured;
  const s = session(s => { s.emit(usageMessage(piUsage)); s.emit(assistant()); });
  await run(s, { onMetrics: m => { measured = m; } });
  assert.equal(measured.usage.totalTokens, null, 'A missing message receipt must not become a zero');
});

test('stage measurements include Pi compaction usage and keep an unreported compaction unknown', async () => {
  for (const reported of [true, false]) {
    let measured;
    const s = session(s => {
      s.emit(usageMessage(piUsage));
      s.emit({ type: 'compaction_end', result: reported ? { usage: piUsage } : undefined });
    });
    await run(s, { onMetrics: m => { measured = m; } });
    assert.equal(measured.usage.totalTokens, reported ? 400 : null);
  }
});

test('a follow-up with no usage receipt cannot reuse the previous prompt total', async () => {
  let measured, prompts = 0;
  const s = session(s => { if (++prompts === 1) s.emit(usageMessage(piUsage)); });
  await run(s, { onMetrics: m => { measured = m; }, work: async prompt => { await prompt('Initial'); await prompt('No receipt'); } });
  assert.equal(measured.usage.totalTokens, null);
});

function rpcFixture() {
  let listener, turn = 0;
  const calls = [];
  return { calls, initialize: async () => {}, onClose() {}, dispose() {}, send() {},
    subscribe(fn) { listener = fn; },
    get turnId() { return `turn-${turn}`; },
    emit(method, params) { listener({ method, params: { threadId: 'thread', turnId: this.turnId, ...params } }); },
    async request(method, params) {
      calls.push({ method, params });
      if (method === 'account/read') return { account: { type: 'chatgpt' } };
      if (method === 'thread/start') return { thread: { id: 'thread' } };
      return { turn: { id: `turn-${++turn}` } };
    }
  };
}

test('Codex stage measurements use cumulative thread totals once', async () => {
  const rpc = rpcFixture(); let measured;
  const s = await createCodexSession({ home: '.', cwd: '.', model: 'fixture', tools: [], signal: new AbortController().signal,
    launch: () => rpc });
  const total = { inputTokens: 180, cachedInputTokens: 100, outputTokens: 20, reasoningOutputTokens: 5, totalTokens: 200 };
  await run(s, { onMetrics: m => { measured = m; }, work: async prompt => {
    for (let i = 0; i < 2; i++) {
      const pending = prompt('Synthetic prompt'); await setImmediate();
      rpc.emit('thread/tokenUsage/updated', { tokenUsage: { total, last: total } });
      rpc.emit('thread/tokenUsage/updated', { tokenUsage: { total, last: total } });
      rpc.emit('turn/completed', { turn: { id: rpc.turnId, status: 'completed' } }); await pending;
    }
  } });
  assert.deepEqual(measured.usage, expectedUsage);
});

test('Codex accepts a final usage receipt after turn completion and keeps a missing follow-up receipt unknown', async () => {
  for (const late of [true, false]) {
    const rpc = rpcFixture(); let measured;
    const s = await createCodexSession({ home: '.', cwd: '.', model: 'fixture', tools: [], signal: new AbortController().signal, launch: () => rpc });
    await run(s, { onMetrics: m => { measured = m; }, work: async prompt => {
      const first = prompt('Initial'); await setImmediate();
      rpc.emit('thread/tokenUsage/updated', { tokenUsage: { total: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5, totalTokens: 15 } } });
      rpc.emit('turn/completed', { turn: { id: rpc.turnId, status: 'completed' } }); await first;
      const second = prompt('Follow-up'); await setImmediate();
      rpc.emit('turn/completed', { turn: { id: rpc.turnId, status: 'completed' } });
      if (late) rpc.emit('thread/tokenUsage/updated', { tokenUsage: { total: { inputTokens: 20, cachedInputTokens: 0, outputTokens: 10, totalTokens: 30 } } });
      await second;
    } });
    assert.equal(measured.usage?.totalTokens ?? null, late ? 30 : null);
  }
});


test('review regression: a previous-turn receipt cannot make missing follow-up usage known', async () => {
  const rpc = rpcFixture(); let measured, turn = 0;
  const request = rpc.request;
  rpc.request = async (method, params) => {
    const result = await request(method, params);
    return method === 'turn/start' ? { turn: { id: `turn-${++turn}` } } : result;
  };
  const s = await createCodexSession({ home: '.', cwd: '.', model: 'fixture', tools: [],
    signal: new AbortController().signal, launch: () => rpc });
  const total = { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5, reasoningOutputTokens: 0, totalTokens: 15 };
  await run(s, { onMetrics: value => { measured = value; }, work: async prompt => {
    const first = prompt('Initial'); await setImmediate();
    rpc.emit('thread/tokenUsage/updated', { turnId: 'turn-1', tokenUsage: { total, last: total } });
    rpc.emit('turn/completed', { turn: { id: 'turn-1', status: 'completed' } }); await first;
    const second = prompt('Follow-up'); await setImmediate();
    // A late receipt still describes the completed first turn. The follow-up
    // emits no usage of its own, so its cost must stay unknown.
    rpc.emit('thread/tokenUsage/updated', { turnId: 'turn-1', tokenUsage: { total, last: total } });
    rpc.emit('turn/completed', { turn: { id: 'turn-2', status: 'completed' } }); await second;
  } });
  assert.equal(measured.usage?.totalTokens ?? null, null,
    'A receipt for turn-1 must not satisfy the usage requirement for turn-2');
});

for (const late of [false, true]) test(`turn-correlated usage survives a delayed start response (${late ? 'after' : 'before'} completion)`, async () => {
  const rpc = rpcFixture(), reply = deferred();
  const request = rpc.request;
  rpc.request = (method, params) => method === 'turn/start' ? reply.promise : request(method, params);
  const s = await createCodexSession({ home: '.', cwd: '.', model: 'fixture', tools: [], signal: new AbortController().signal, launch: () => rpc });
  const total = { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5, totalTokens: 15 };
  let measured;
  await run(s, { onMetrics: m => { measured = m; }, work: async prompt => {
    const pending = prompt('Synthetic turn'); await setImmediate();
    if (!late) rpc.emit('thread/tokenUsage/updated', { turnId: 'delayed', tokenUsage: { total } });
    rpc.emit('turn/completed', { turn: { id: 'delayed', status: 'completed' } });
    if (late) rpc.emit('thread/tokenUsage/updated', { turnId: 'delayed', tokenUsage: { total } });
    reply.resolve({ turn: { id: 'delayed' } });
    await pending;
  } });
  assert.equal(measured.usage.totalTokens, 15);
});

for (const reason of ['Stop', 'timeout']) for (const reported of [false, true]) {
  test(`${reason} during a follow-up ${reported ? 'retains its observed' : 'invalidates missing'} usage before persisting metrics`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'interrupted-metrics-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const store = new Store(root); await store.init();
    const project = store.state.projects[0]; project.workspace = root;
    const backend = new FleetBackend(store, process.execPath, () => {}, path.resolve('.'));
    const controller = new AbortController(), rpc = rpcFixture();
    const s = await createCodexSession({ home: '.', cwd: '.', model: 'fixture', tools: [], signal: controller.signal, launch: () => rpc });
    const active = { controller, outcome: 'failed', processes: { async stop() {} }, resolve() {} };
    backend.active.set(project.id, active); project.status = 'running';
    await backend.stage(project, 'build', 'active');
    let measured;
    const rejected = assert.rejects(run(s, { signal: controller.signal,
      onMetrics: value => { measured = value; backend.recordInference(project, 'build', value); },
      work: async prompt => {
        const first = prompt('Initial'); await setImmediate();
        rpc.emit('thread/tokenUsage/updated', { tokenUsage: { total: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5, totalTokens: 15 } } });
        rpc.emit('turn/completed', { turn: { id: rpc.turnId, status: 'completed' } }); await first;
        const followup = prompt('Follow-up'); await setImmediate();
        if (reported) rpc.emit('thread/tokenUsage/updated', { tokenUsage: { total: { inputTokens: 20, cachedInputTokens: 0, outputTokens: 10, totalTokens: 30 } } });
        if (reason === 'Stop') controller.abort(); else t.mock.timers.tick(100);
        await followup;
      }
    }), reason === 'Stop' ? /Run stopped/ : /no progress/);
    await rejected;
    assert.equal(rpc.calls.filter(c => c.method === 'turn/start').length, 2);
    assert.equal(measured.usage?.totalTokens ?? null, reported ? 30 : null);
    project.report = { time: 'synthetic', command: 'synthetic', exitCode: 1, passed: 0, failed: 1,
      skipped: 0, total: 1, output: 'Synthetic failure', durationMs: 1, sourceHash: 'synthetic' };
    await backend.finish(project, active);
    const saved = JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8')).projects[0];
    assert.equal(saved.status, reason === 'Stop' ? 'stopped' : 'failed');
    assert.equal(saved.stages.find(s => s.id === 'build').metrics.usage?.totalTokens ?? null, reported ? 30 : null);
    assert.equal(saved.report.stageMetrics.find(s => s.stage === 'build').usage?.totalTokens ?? null, reported ? 30 : null);
  });
}

for (const status of ['failed', 'stopped']) test(`review regression: report-write failure still persists ${status} project state and metrics`, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'review-report-save-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new Store(root); await store.init();
  const project = store.state.projects[0];
  project.workspace = path.join(root, 'workspace');
  await fs.mkdir(project.workspace);
  const backend = new FleetBackend(store, process.execPath, () => {}, path.resolve('.'));
  project.status = 'running';
  await backend.stage(project, 'verify', 'active');
  let cleaned = false;
  const active = { controller: new AbortController(), outcome: status,
    processes: { async stop() { cleaned = true; } }, resolve() {} };
  if (status === 'stopped') active.controller.abort();
  backend.active.set(project.id, active);
  project.report = { time: new Date().toISOString(), command: 'synthetic', exitCode: 1,
    passed: 0, failed: 1, skipped: 0, total: 1, output: 'Synthetic failure', durationMs: 1, sourceHash: 'fixture' };
  project.status = status;
  project.stages.find(stage => stage.id === 'verify').status = 'failed';
  project.stages.find(stage => stage.id === 'verify').metrics.usage = expectedUsage;
  // Deterministic local write failure. State.json remains writable.
  await fs.mkdir(path.join(project.workspace, 'test-report.json'));
  await backend.finish(project, active);
  assert.equal(backend.active.has(project.id), false);
  assert.equal(cleaned, true, 'Process cleanup precedes terminal persistence');
  const saved = JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8')).projects.find(p => p.id === project.id);
  assert.equal(saved.status, status, 'Terminal state must survive an independent report-write failure');
  assert.ok(saved.stages.find(stage => stage.id === 'verify').metrics.finishedAt);
  assert.deepEqual(saved.stages.find(stage => stage.id === 'verify').metrics.usage, expectedUsage);
  assert.match(saved.error, /Could not save.*report/);
  assert.deepEqual(saved.report.stageMetrics, project.report.stageMetrics);
});
