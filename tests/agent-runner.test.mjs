import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
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

for (const [description, limits] of [['omitted limits', undefined], ['an undefined timeout', { timeoutMs: undefined }]]) {
  test(`productive initial and artifact prompts can each exceed thirty minutes with ${description}`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let elapsed = 0;
    const s = session(s => {
      for (let i = 0; i < 8; i++) {
        t.mock.timers.tick(4 * 60_000); elapsed += 4 * 60_000;
        s.emit({ type: 'tool_execution_update' });
      }
    });
    await runAgentStage({ label: 'Test agent', signal: new AbortController().signal,
      ...(limits === undefined ? {} : { limits }), create: async () => s, onEvent() {},
      work: async prompt => { await prompt('Implementation'); await prompt('Complete missing artifacts'); } });
    assert.equal(elapsed, 64 * 60_000);
    assert.deepEqual(s.prompts, ['Implementation', 'Complete missing artifacts']);
    t.mock.timers.tick(60 * 60_000);
    assert.equal(s.aborts, 0); assert.equal(s.disposals, 1); assert.equal(s.listeners, 0);
  });
}

test('a default stage still fails after five idle minutes following more than thirty minutes of activity', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const s = session();
  const rejected = assert.rejects(run(s, { limits: undefined }), /no progress for 300 seconds.*waiting for the model/);
  await setImmediate();
  for (let i = 0; i < 8; i++) { t.mock.timers.tick(4 * 60_000); s.emit({ type: 'tool_execution_update' }); }
  t.mock.timers.tick(5 * 60_000 - 1); await setImmediate();
  assert.equal(s.aborts, 0); assert.equal(s.disposals, 0); assert.equal(s.listeners, 1);
  t.mock.timers.tick(1); await rejected;
  assert.equal(s.aborts, 1); assert.equal(s.disposals, 1); assert.equal(s.listeners, 0);
});

test('a default stage remains cancellable after more than thirty minutes of activity', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const controller = new AbortController(), s = session(), events = [];
  const rejected = assert.rejects(run(s, { limits: undefined, signal: controller.signal, onEvent: event => events.push(event) }), /stopped by you/);
  await setImmediate();
  for (let i = 0; i < 8; i++) { t.mock.timers.tick(4 * 60_000); s.emit({ type: 'tool_execution_update' }); }
  assert.equal(events.length, 8); assert.equal(s.aborts, 0);
  controller.abort(); await rejected;
  s.emit(assistant()); assert.equal(events.length, 8);
  assert.equal(s.aborts, 1); assert.equal(s.disposals, 1); assert.equal(s.listeners, 0);
});

test('worker agents can exceed 40 turns across prompts without an explicit turn budget', async () => {
  for (const limits of [undefined, { idleMs: 1000, timeoutMs: 10_000 }, { maxTurns: undefined }]) {
    let turns = 0;
    const s = session(s => {
      for (let i = 0; i < 80; i++) { s.emit({ type: 'turn_start' }); s.emit(assistant()); s.emit({ type: 'turn_end' }); }
    });
    await run(s, { limits, onEvent: event => { if (event.type === 'turn_start') turns++; },
      work: async prompt => { await prompt('Implementation'); await prompt('Complete the user guide'); } });
    assert.equal(turns, 160); assert.equal(s.prompts.length, 2);
    assert.equal(s.aborts, 0); assert.equal(s.disposals, 1); assert.equal(s.listeners, 0);
  }
});

test('an explicit turn budget still terminates a looping agent even if prompt and abort hang', async () => {
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

test('artifact completion shares an explicitly configured turn budget', async () => {
  const s = session(s => { s.emit({ type: 'turn_start' }); s.emit({ type: 'turn_start' }); });
  await assert.rejects(run(s, { work: async prompt => { await prompt('Initial'); await prompt('Missing artifacts'); } }), /3-turn limit/);
  assert.equal(s.prompts.length, 2);
});

test('prompt rejection and invalid limits fail clearly without leaking listeners', async () => {
  const s = session(() => { throw new Error('Transport failed'); });
  await assert.rejects(run(s), /Transport failed/); assert.equal(s.listeners, 0); assert.equal(s.disposals, 1);
  await assert.rejects(run(s, { limits: { idleMs: 0 } }), /Invalid agent limit/);
});

test('optional deadlines reject invalid explicit values before initializing a session', async () => {
  for (const timeoutMs of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null, '30000']) {
    await assert.rejects(run(session(), { limits: { timeoutMs }, create: () => assert.fail('Must not initialize') }), /Invalid agent limit: timeoutMs/);
  }
});

test('private activity masks synchronous and asynchronous session setup errors', async () => {
  for (const create of [() => { throw new Error('SEALED-private-setup'); }, async () => { throw new Error('SEALED-private-setup'); }]) {
    await assert.rejects(run(session(), { create, privateActivity: true, recoveryHint: 'Resume planning with saved files.' }), error => {
      assert.match(error.message, /could not initialize its model session.*Resume planning/);
      assert.doesNotMatch(error.message, /SEALED/);
      return true;
    });
  }
});
