import test from 'node:test';
import assert from 'node:assert/strict';
import { reasoningEfforts, isReasoningEffort, supportedReasoningEfforts, resolveReasoningEffort, savedReasoningEffort } from '../dist-electron/shared/reasoning.js';
import { codexReasoningMetadata, piReasoningMetadata, piThinkingLevel } from '../dist-electron/electron/reasoning.js';
import { createCodexSession } from '../dist-electron/electron/codex-session.js';

test('reasoning capabilities expose only known levels in increasing order', () => {
  assert.deepEqual(reasoningEfforts, ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
  for (const effort of reasoningEfforts) assert.equal(isReasoningEffort(effort), true);
  for (const invalid of [undefined, null, '', 'HIGH', 'off', 'automatic', 3, {}]) assert.equal(isReasoningEffort(invalid), false);
  const model = { reasoningEfforts: ['high', 'low', 'future-level', 'low', 'none', 'medium'] };
  const original = structuredClone(model);
  assert.deepEqual(supportedReasoningEfforts(model), ['none', 'low', 'medium', 'high']);
  assert.deepEqual(model, original, 'normalization must not mutate a provider catalog');
});

test('missing metadata does not invent adjustable reasoning support', () => {
  for (const model of [undefined, {}, { reasoningEfforts: [] }, { defaultReasoningEffort: 'high' }]) {
    assert.deepEqual(supportedReasoningEfforts(model), []);
    assert.equal(resolveReasoningEffort(model, 'high'), undefined);
  }
  assert.equal(resolveReasoningEffort({ reasoningEfforts: ['none'] }, 'high'), 'none');
});

test('model switches preserve supported preferences and use the new model default otherwise', () => {
  const model = { reasoningEfforts: ['low', 'medium', 'high'], defaultReasoningEffort: 'low' };
  assert.equal(resolveReasoningEffort(model, 'high'), 'high');
  assert.equal(resolveReasoningEffort(model, 'ultra'), 'low');
  assert.equal(resolveReasoningEffort(model), 'low');
  assert.equal(resolveReasoningEffort({ reasoningEfforts: ['high', 'medium'], defaultReasoningEffort: 'ultra' }), 'medium');
  assert.equal(resolveReasoningEffort({ reasoningEfforts: ['high', 'low'] }, 'max'), 'low');
});

test('saving accepts explicit valid levels and safely migrates omitted legacy preferences', () => {
  const model = { reasoningEfforts: ['low', 'medium', 'high'] };
  assert.equal(savedReasoningEffort(model, undefined, 'high'), 'high');
  assert.equal(savedReasoningEffort(model, undefined, 'ultra'), 'medium');
  assert.equal(savedReasoningEffort(model, 'low', 'high'), 'low');
  assert.equal(savedReasoningEffort(model, 'ultra', 'high'), 'medium');
  assert.equal(savedReasoningEffort(model, undefined), undefined, 'legacy settings keep provider defaults until adjusted');
  assert.equal(savedReasoningEffort({ reasoningEfforts: ['none'] }, 'high', 'high'), undefined, 'fixed models clear the adjustable override');
  assert.equal(savedReasoningEffort({}, undefined, 'high'), undefined);
  for (const invalid of [null, '', 'off', 'HIGH', 4, {}]) assert.throws(() => savedReasoningEffort(model, invalid, 'high'), /valid reasoning effort/i);
});

test('Codex account and app-server catalog shapes normalize known capabilities', () => {
  assert.deepEqual(codexReasoningMetadata({ supported_reasoning_levels: [
    { effort: 'low' }, { effort: 'high' }, { effort: 'high' }, { effort: 'future-level' }, null
  ], default_reasoning_level: 'high' }), { reasoningEfforts: ['low', 'high'], defaultReasoningEffort: 'high' });
  assert.deepEqual(codexReasoningMetadata({ supportedReasoningEfforts: [
    { reasoningEffort: 'medium', description: 'Balanced' }, { reasoningEffort: 'xhigh' }, 'ultra'
  ], defaultReasoningEffort: 'low' }), { reasoningEfforts: ['medium', 'xhigh', 'ultra'] });
  for (const model of [undefined, null, {}, { supportedReasoningEfforts: 'high' }]) assert.deepEqual(codexReasoningMetadata(model), {});
});

test('Pi exposes model-supported levels and maps no reasoning to its off setting', () => {
  const model = { reasoning: true, thinkingLevelMap: { off: null, minimal: null, high: null, max: 'max' } };
  assert.deepEqual(piReasoningMetadata(model), { reasoningEfforts: ['low', 'medium', 'max'], defaultReasoningEffort: 'medium' });
  assert.equal(piThinkingLevel(model, 'max'), 'max');
  assert.equal(piThinkingLevel(model, 'ultra'), 'medium');
  assert.equal(piThinkingLevel(model, undefined, 'low'), 'low');
  assert.deepEqual(piReasoningMetadata({ reasoning: false }), { reasoningEfforts: ['none'], defaultReasoningEffort: 'none' });
  assert.equal(piThinkingLevel({ reasoning: false }, 'high'), 'off');
  assert.equal(piThinkingLevel({ reasoning: true }, 'none'), 'off');
});

class RecordingRpc {
  calls = []; listeners = new Set(); closers = new Set();
  async initialize() {}
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onClose(listener) { this.closers.add(listener); return () => this.closers.delete(listener); }
  send() {}
  dispose() { for (const listener of this.closers) listener(new Error('Fixture closed')); }
  async request(method, params) {
    this.calls.push({ method, params });
    return method.startsWith('thread/') ? { thread: { id: 'reasoning-thread' } } : { turn: { id: 'reasoning-turn' } };
  }
  finish() {
    for (const listener of this.listeners) listener({ method: 'turn/completed', params: {
      threadId: 'reasoning-thread', turn: { id: 'reasoning-turn', status: 'completed' }
    } });
  }
}

for (const effort of ['high', 'none', undefined]) test(`Codex sends ${effort ?? 'provider-default'} effort on each turn and credential refresh`, async t => {
  const processes = [];
  let token = 'first-fixture-token';
  const session = await createCodexSession({ home: '/tmp', cwd: '/tmp', model: 'reasoning-fixture',
    signal: new AbortController().signal, tools: [], reasoningEffort: effort,
    getCredentials: async () => ({ accessToken: token, expiresAt: Date.now() + 3600_000 }),
    launch: () => { const rpc = new RecordingRpc(); processes.push(rpc); return rpc; }
  });
  t.after(() => session.dispose());
  for (const iteration of [0, 1]) {
    if (iteration) token = 'refreshed-fixture-token';
    const pending = session.prompt('Explain the current plan.');
    void pending.catch(() => {});
    for (let attempt = 0; attempt < 50 && !processes[iteration]?.calls.some(call => call.method === 'turn/start'); attempt++) {
      await new Promise(resolve => setImmediate(resolve));
    }
    const rpc = processes[iteration];
    assert.ok(rpc, 'refreshed credentials must reconnect');
    const thread = rpc.calls.find(call => call.method === (iteration ? 'thread/resume' : 'thread/start'));
    const turn = rpc.calls.find(call => call.method === 'turn/start');
    assert.ok(thread && turn, 'thread and turn requests must both reach the transport');
    assert.equal(thread.params.config.model_reasoning_effort, effort);
    assert.equal(turn.params.effort, effort);
    if (effort === undefined) {
      assert.equal(Object.hasOwn(thread.params.config, 'model_reasoning_effort'), false);
      assert.equal(Object.hasOwn(turn.params, 'effort'), false);
    }
    rpc.finish();
    await pending;
  }
});
