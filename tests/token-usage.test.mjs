import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setImmediate as tick } from 'node:timers/promises';
import { normalizeTokenTotals, piTokenTotals, mergeTokenUsage, summarizeTokenUsage } from '../dist-electron/shared/token-usage.js';
import { runAgentStage } from '../dist-electron/electron/agent-runner.js';
import { createCodexSession } from '../dist-electron/electron/codex-session.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { ProjectLead } from '../dist-electron/electron/conversation.js';
import { Store } from '../dist-electron/electron/storage.js';

const totals = (inputTokens, outputTokens, cachedInputTokens = 0) => ({ inputTokens, outputTokens, cachedInputTokens, totalTokens: inputTokens + outputTokens });
const usage = (id, value, runId = 'run-a') => ({ version: 1, startedAt: '2026-11-05T12:00:00Z', sessions: [{ id, source: 'build', model: 'fixture', runId,
  startedAt: '2026-11-05T12:00:00Z', updatedAt: '2026-11-05T12:00:00Z', ...(value ? { totals: value } : {}) }] });
function fakeSession(handler) {
  const listeners = new Set();
  return { subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, emit(event) { for (const fn of listeners) fn(event); },
    prompt(text) { return handler(this, text); }, abort() {}, dispose() {} };
}
const assistant = value => ({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop', content: [], ...(value ? { usage: value } : {}) } });
const run = (session, options = {}) => runAgentStage({ label: 'Usage fixture', signal: new AbortController().signal,
  create: async () => session, work: prompt => prompt('Go'), onEvent() {}, ...options });

test('cache reads and writes count once; invalid and unknown usage stays unknown', () => {
  assert.deepEqual(piTokenTotals({ input: 20, output: 8, cacheRead: 60, cacheWrite: 12, reasoning: 4 }), totals(92, 8, 60));
  assert.deepEqual(normalizeTokenTotals({ ...totals(92, 8, 60), reasoningOutputTokens: 4 }), totals(92, 8, 60));
  for (const value of [undefined, { inputTokens: -1, outputTokens: 1 }, { inputTokens: NaN, outputTokens: 1 }, { inputTokens: 1, outputTokens: Infinity }, { inputTokens: 1, outputTokens: 1, cachedInputTokens: 2 }]) assert.equal(normalizeTokenTotals(value), undefined);
  assert.equal(summarizeTokenUsage([undefined]).hasUsage, false);
  assert.equal(summarizeTokenUsage([usage('unknown')]).unreportedSessions, 1);
  assert.equal(summarizeTokenUsage([usage('zero', totals(0, 0))]).hasUsage, true);
});

test('cumulative snapshots deduplicate across project and candidate copies and filter by run', () => {
  let ledger = mergeTokenUsage(usage('same', totals(10, 5)), usage('same', totals(20, 10)));
  ledger = mergeTokenUsage(ledger, usage('same', totals(10, 5)));
  ledger = mergeTokenUsage(ledger, usage('next', totals(7, 3), 'run-b'));
  assert.equal(summarizeTokenUsage([ledger, usage('same', totals(20, 10))]).totalTokens, 40);
  assert.equal(summarizeTokenUsage([ledger], { runId: 'run-b' }).totalTokens, 10);
  assert.equal(mergeTokenUsage(ledger, structuredClone(ledger)), ledger);
});

test('Pi totals are read after message persistence and include compaction without replay inflation', async () => {
  let tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, prompts = 0;
  const session = fakeSession(async s => {
    s.emit(assistant({ input: 10, output: 5, cacheRead: 20, cacheWrite: 0 }));
    tokens = { input: 10 * ++prompts, output: 5 * prompts, cacheRead: 20 * prompts, cacheWrite: 0 };
    s.emit({ type: 'turn_end' }); await tick();
    if (prompts === 2) { tokens.input += 6; tokens.output += 4; s.emit({ type: 'compaction_end' }); }
  });
  session.getSessionStats = () => ({ tokens });
  const observed = [];
  await run(session, { work: async prompt => { await prompt('First'); await prompt('Second'); }, onUsage: value => observed.push(value) });
  assert.deepEqual(observed.at(-1), totals(66, 14, 40));
  assert.equal(observed.filter(value => value?.totalTokens === 35).length, 1);
});

test('Pi reports true zero distinctly from a session whose provider never reports', async () => {
  for (const reported of [true, false]) {
    const session = fakeSession(async s => { s.emit(assistant(reported ? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } : undefined)); });
    session.getSessionStats = () => ({ tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } });
    const observed = []; await run(session, { onUsage: value => observed.push(value) });
    assert.deepEqual(observed.at(-1), reported ? totals(0, 0) : undefined);
  }
});

test('Pi initialized zero on provider error or abort remains unknown while positive partial usage counts', async () => {
  for (const stopReason of ['error', 'aborted']) for (const withStats of [true, false]) for (const input of [0, 5]) {
    const reported = { input, output: 0, cacheRead: 0, cacheWrite: 0 };
    const session = fakeSession(async s => { s.emit({ ...assistant(reported), message: { ...assistant(reported).message, stopReason } }); });
    if (withStats) session.getSessionStats = () => ({ tokens: reported });
    const observed = [];
    await assert.rejects(run(session, { onUsage: value => observed.push(value) }));
    assert.deepEqual(observed.at(-1), input ? totals(5, 0) : undefined);
  }
});

test('partial Pi usage replaces repeated updates and reconciles with persistence across retries', async () => {
  let tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const session = fakeSession(async s => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const message = assistant({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }).message;
      s.emit({ type: 'message_start', message });
      message.usage = { input: 10, output: 5, cacheRead: 20, cacheWrite: 0 };
      for (let i = 0; i < 3; i++) s.emit({ type: 'message_update', message, assistantMessageEvent: { type: 'text_delta', delta: 'text' } });
      message.stopReason = attempt === 1 ? 'error' : 'stop';
      s.emit({ type: 'message_end', message });
      tokens = { input: 10 * attempt, output: 5 * attempt, cacheRead: 20 * attempt, cacheWrite: 0 };
      s.emit({ type: 'turn_end' }); await tick();
      // Repeated delivery of an already finalized message cannot add its usage.
      s.emit({ type: 'message_end', message });
    }
  });
  session.getSessionStats = () => ({ tokens });
  const observed = []; let measured;
  await run(session, { onUsage: value => observed.push(value), onMetrics: value => { measured = value; } });
  assert.deepEqual(observed.at(-1), totals(60, 10, 40));
  assert.equal(measured.usage.inputTokens, 60);
  assert.equal(measured.usage.outputTokens, 10);
  assert.equal(observed.filter(value => value?.totalTokens === 35).length, 1);
  assert.equal(observed.filter(value => value?.totalTokens === 70).length, 1);
});

test('cancellation retains reported usage and a failed save does not discard later snapshots', async () => {
  const controller = new AbortController(), observed = [];
  const session = fakeSession(async s => {
    s.emit(assistant({ input: 4, output: 3, cacheRead: 2, cacheWrite: 0 })); await tick();
    controller.abort(); await new Promise(() => {});
  });
  await assert.rejects(run(session, { signal: controller.signal, onUsage: value => observed.push(value) }), /stopped by you/);
  assert.deepEqual(observed.at(-1), totals(6, 3, 2));
  const saved = [];
  await assert.rejects(run(fakeSession(async s => { s.emit(assistant({ input: 5, output: 2 })); }), {
    onUsage(value) { if (!value) throw new Error('disk unavailable'); saved.push(value); }
  }), /disk unavailable/);
  assert.deepEqual(saved.at(-1), totals(5, 2));
});

class Rpc {
  listeners = new Set();
  async initialize() {}
  onClose() {}
  subscribe(fn) { this.listeners.add(fn); }
  dispose() {}
  emit(method, params) { for (const listener of this.listeners) listener({ method, params }); }
  async request(method) { return method.startsWith('thread/') ? { thread: { id: 'thread-1' } } : { turn: { id: 'turn-1' } }; }
}
test('Codex cumulative reports survive repeated notifications and credential reconnection', async t => {
  const processes = [], controller = new AbortController(); let credential = 'first';
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-token-rpc-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const session = await createCodexSession({ home: root, cwd: root, model: 'fixture', signal: controller.signal, tools: [],
    getCredentials: async () => ({ accessToken: credential, expiresAt: Date.now() + 60000 }), launch: () => { const rpc = new Rpc(); processes.push(rpc); return rpc; } });
  const publish = (rpc, value, threadId = 'thread-1') => rpc.emit('thread/tokenUsage/updated', { threadId, turnId: 'turn-1', tokenUsage: { total: { ...value, reasoningOutputTokens: 3 }, last: value } });
  try {
    const first = session.prompt('First'); await tick();
    publish(processes[0], totals(100, 20, 60)); publish(processes[0], totals(100, 20, 60));
    publish(processes[0], totals(999, 20), 'other-thread');
    processes[0].emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await first;
    assert.deepEqual(session.getTokenUsage(), totals(100, 20, 60));
    credential = 'refreshed'; const second = session.prompt('Second'); await tick();
    publish(processes[1], totals(100, 20, 60)); publish(processes[0], totals(999, 99)); publish(processes[1], totals(140, 30, 70));
    processes[1].emit('turn/completed', { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed' } }); await second;
    assert.deepEqual(session.getTokenUsage(), totals(140, 30, 70));
  } finally { session.dispose(); }
});

test('build and conversation usage survives failed builds, fresh runs, and app reload', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-token-usage-'));
  const store = new Store(root); await store.init();
  store.state.settings = { provider: 'fixture', model: 'fixture', rememberKey: false };
  const project = store.state.projects[0], runtime = { getModel: () => ({ input: ['text', 'image'] }), hasConfiguredAuth: () => true };
  const backend = new FleetBackend(store, process.execPath, () => {}, process.cwd(), { createSession: async () => ({ session: fakeSession(async s => {
    s.emit(assistant({ input: 10, output: 5, cacheRead: 5, cacheWrite: 0 })); throw new Error('Fixture stops after measured response');
  }) }) }); backend.runtime = runtime;
  const lead = new ProjectLead(store, runtime, () => {}, { createSession: async () => ({ session: fakeSession(async s => {
    s.emit(assistant({ input: 4, output: 2, cacheRead: 0, cacheWrite: 0 }));
  }) }) });
  t.after(async () => { await lead.stopAll(); await backend.stopAll(); await fs.rm(root, { recursive: true, force: true }); });
  await backend.start(project.id); await backend.active.get(project.id)?.done;
  const firstRun = project.runId;
  assert.equal(project.status, 'failed'); assert.equal(summarizeTokenUsage([project.tokenUsage]).totalTokens, 20);
  await backend.start(project.id); await backend.active.get(project.id)?.done;
  assert.notEqual(project.runId, firstRun);
  await lead.send(project.id, 'Explain this build'); await lead.active.get(project.id)?.done;
  assert.equal(summarizeTokenUsage([project.tokenUsage]).totalTokens, 46);
  assert.equal(summarizeTokenUsage([project.tokenUsage], { runId: project.runId }).totalTokens, 26);
  assert.equal(summarizeTokenUsage([project.tokenUsage], { source: 'conversation' }).totalTokens, 6);
  const reloaded = new Store(root); await reloaded.init();
  assert.deepEqual(reloaded.project(project.id).tokenUsage, project.tokenUsage);
});
