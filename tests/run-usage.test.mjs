import test from 'node:test';
import assert from 'node:assert/strict';
import { RunUsageLedger, normalizePiUsage, normalizeCodexUsage } from '../dist-electron/electron/run-usage.js';

const piUsage = overrides => ({ input: 100, output: 20, cacheRead: 30, cacheWrite: 10, cacheWrite1h: 4, reasoning: 8, totalTokens: 160,
  cost: { input: .001, output: .002, cacheRead: .0001, cacheWrite: .0002, total: .0033 }, ...overrides });
const response = (id, usage = piUsage()) => ({ type: 'message_end', message: { role: 'assistant', responseId: id, provider: 'fixture', model: 'fixture-model', usage } });
const codexUsage = (input = 140, output = 20) => ({ inputTokens: input, outputTokens: output, totalTokens: input + output,
  cachedInputTokens: 30, cacheWriteInputTokens: 10, reasoningOutputTokens: 8 });

test('Pi additive cache buckets and Codex nested cache/reasoning fields reconcile to the same total', () => {
  const pi = normalizePiUsage(piUsage()), codex = normalizeCodexUsage(codexUsage());
  for (const normalized of [pi, codex]) {
    assert.deepEqual(normalized.tokens, { value: 160, state: 'measured', source: 'provider' });
    assert.equal(normalized.inputTokens.value, 140);
    assert.equal(normalized.outputTokens.value, 20);
    assert.equal(normalized.reasoningTokens.value, 8);
    assert.equal(normalized.cacheWriteTokens.value, 10);
  }
  assert.equal(pi.costUsd.state, 'estimated');
  assert.equal(codex.costUsd.value, null);
});

test('missing and SDK zero-initialized usage is unavailable, with malformed breakdowns retained as partial', () => {
  for (const usage of [undefined, {}, piUsage({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 }), { input: -2, totalTokens: NaN }]) {
    assert.deepEqual(normalizePiUsage(usage).tokens, { value: null, state: 'unavailable' });
  }
  assert.equal(normalizePiUsage({ totalTokens: 20 }).tokens.state, 'partial');
  assert.equal(normalizePiUsage(piUsage({ totalTokens: 200 })).tokens.value, 160);
  assert.equal(normalizePiUsage(piUsage({ totalTokens: 200 })).tokens.state, 'partial');
  assert.equal(normalizeCodexUsage({ inputTokens: 100, totalTokens: 120 }).tokens.state, 'partial');
  assert.equal(normalizeCodexUsage(codexUsage(0, 0)).tokens.value, null);
});

test('cost preserves provider measurements and catalog estimates without assigning zero or mismatched model prices', () => {
  assert.deepEqual(normalizePiUsage(piUsage({ cost: { total: 0, totalFromProvider: true } })).costUsd, { value: 0, state: 'measured', source: 'provider' });
  assert.equal(normalizePiUsage(piUsage({ cost: { total: 0 } })).costUsd.value, null);
  assert.equal(normalizePiUsage(piUsage(), { catalogModelMatches: false }).costUsd.value, null);
  assert.equal(normalizePiUsage(piUsage({ cost: { total: .2, totalFromProvider: true } }), { catalogModelMatches: false }).costUsd.value, .2);
  assert.equal(normalizePiUsage({ cost: { total: .2, totalFromProvider: true } }).costUsd.value, .2);
  assert.equal(normalizePiUsage({ cost: { total: .2, totalFromProvider: true } }).tokens.value, null);
});

test('positive total-only usage survives zero-initialized buckets without inventing zero breakdowns', () => {
  const pi = normalizePiUsage({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, totalTokens: 100 });
  const codex = normalizeCodexUsage({ inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, cacheWriteInputTokens: 0, reasoningOutputTokens: 0, totalTokens: 100 });
  for (const normalized of [pi, codex]) {
    assert.deepEqual(normalized.tokens, { value: 100, state: 'partial', source: 'provider' });
    for (const field of ['inputTokens', 'outputTokens', 'cachedInputTokens', 'cacheWriteTokens', 'reasoningTokens']) {
      assert.deepEqual(normalized[field], { value: null, state: 'unavailable' }, field);
    }
  }
});

test('ledger deduplicates reports, includes compaction, preserves missing requests and survives serialization', () => {
  const ledger = new RunUsageLedger('pi');
  ledger.beginPrompt('build');
  ledger.event('build', response('r1'), 'build-1');
  ledger.event('build', response('r1'), 'build-1');
  ledger.event('build', response('failed', null), 'build-1');
  ledger.event('build', { type: 'message_end', message: { role: 'assistant', responseId: 'missing' } }, 'build-1');
  ledger.event('build', { type: 'compaction_end', result: { summary: 'compact', usage: piUsage() } }, 'build-1');
  ledger.endSession('build', 'build-1', true);
  const saved = JSON.parse(JSON.stringify(ledger.snapshot()));
  const restored = new RunUsageLedger('pi', saved);
  restored.event('build', response('r1'), 'build-1');
  assert.deepEqual(restored.snapshot(), saved);
  assert.equal(saved.prompts, 1);
  assert.equal(saved.requests.value, 4);
  assert.equal(saved.tokens.value, 320);
  assert.equal(saved.tokens.state, 'partial');
  assert.equal(saved.observations.find(record => record.id.includes('missing')).tokens.value, null);
  assert.equal(saved.observations.find(record => record.kind === 'compaction').costUsd.value, null);
  assert.ok(saved.observations.some(record => record.kind === 'missing'));
});

test('Codex cumulative updates replace snapshots, ignore stale reports and keep independent sessions separate', () => {
  const ledger = new RunUsageLedger('codex');
  ledger.beginPrompt('build');
  const report = usage => ({ type: 'usage_update', threadId: 'thread-1', usage });
  ledger.event('build', report(codexUsage()), 'build-1');
  ledger.event('build', report(codexUsage()), 'build-1');
  ledger.event('build', report(codexUsage(200, 30)), 'build-1');
  ledger.event('build', report(codexUsage()), 'build-1');
  ledger.event('verify', report(codexUsage()), 'verify-1');
  const summary = ledger.snapshot();
  assert.equal(summary.tokens.value, 390);
  assert.equal(summary.inputTokens.value, 340);
  assert.equal(summary.outputTokens.value, 50);
  assert.equal(summary.requests.value, null);
  assert.equal(summary.costUsd.value, null);
  assert.equal(summary.phases.find(phase => phase.phase === 'build').tokens.value, 230);
});

test('newer Codex totals replace changing breakdowns atomically and leave missing breakdowns unavailable', () => {
  const ledger = new RunUsageLedger('codex');
  const report = usage => ledger.event('build', { type: 'usage_update', threadId: 'thread', usage }, 'session');
  report(codexUsage(100, 100));
  report(codexUsage(200, 40));
  let summary = ledger.snapshot();
  assert.equal(summary.tokens.value, 240);
  assert.equal(summary.inputTokens.value, 200);
  assert.equal(summary.outputTokens.value, 40);
  assert.equal(summary.inputTokens.value + summary.outputTokens.value, summary.tokens.value);
  report({ inputTokens: 0, outputTokens: 0, totalTokens: 300 });
  report(codexUsage(100, 100)); // stale
  report({}); // unavailable
  summary = ledger.snapshot();
  assert.equal(summary.tokens.value, 300);
  assert.equal(summary.inputTokens.value, null);
  assert.equal(summary.outputTokens.value, null);
});

test('identical Pi responses and compactions are distinct across start boundaries but repeated ends count once', () => {
  const ledger = new RunUsageLedger('pi');
  const message = { role: 'assistant', timestamp: 1000, content: [{ type: 'text', text: 'Same response' }], usage: piUsage() };
  const compaction = { type: 'compaction_end', result: { summary: 'Same summary', usage: piUsage() } };
  for (let index = 0; index < 2; index++) {
    ledger.event('build', { type: 'turn_start' }, 'session');
    ledger.event('build', { type: 'message_start', message: structuredClone(message) }, 'session');
    ledger.event('build', { type: 'message_end', message: structuredClone(message) }, 'session');
    ledger.event('build', { type: 'message_end', message: structuredClone(message) }, 'session');
    ledger.event('build', { type: 'compaction_start' }, 'session');
    ledger.event('build', structuredClone(compaction), 'session');
    ledger.event('build', structuredClone(compaction), 'session');
  }
  assert.equal(ledger.snapshot().requests.value, 4);
  assert.equal(ledger.snapshot().tokens.value, 640);
  const restored = new RunUsageLedger('pi', JSON.parse(JSON.stringify(ledger.snapshot())));
  restored.event('build', { type: 'message_start', message }, 'session');
  restored.event('build', { type: 'message_end', message }, 'session');
  assert.equal(restored.snapshot().requests.value, 5);
  assert.equal(restored.snapshot().tokens.value, 800);
});

test('end-only adapters do not conflate equal messages or reused objects across sessions', () => {
  const ledger = new RunUsageLedger('pi');
  const event = { type: 'message_end', message: { role: 'assistant', usage: piUsage() } };
  ledger.event('build', event, 'first'); ledger.event('build', event, 'first');
  ledger.event('build', structuredClone(event), 'first');
  ledger.event('build', event, 'second');
  assert.equal(ledger.snapshot().requests.value, 3);
  assert.equal(ledger.snapshot().tokens.value, 480);
});

test('partial cost totals retain mixed estimate/measurement provenance and individual states', () => {
  const ledger = new RunUsageLedger('pi');
  ledger.event('build', response('estimate'), 'session');
  ledger.event('build', response('measured', piUsage({ cost: { total: .2, totalFromProvider: true } })), 'session');
  ledger.event('build', response('unknown', null), 'session');
  const summary = ledger.snapshot();
  assert.equal(summary.costUsd.state, 'partial');
  assert.equal(summary.costUsd.source, 'mixed');
  assert.equal(summary.observations[0].costUsd.state, 'estimated');
  assert.equal(summary.observations[1].costUsd.state, 'measured');
  assert.equal(summary.observations[2].costUsd.state, 'unavailable');
});

test('no usage events and interrupted sessions stay unavailable, while submitted prompts remain measured', () => {
  for (const backend of ['pi', 'codex']) {
    const ledger = new RunUsageLedger(backend);
    ledger.beginPrompt('intake'); ledger.endSession('intake', 'session', true);
    const summary = ledger.snapshot();
    assert.equal(summary.tokens.value, null);
    assert.equal(summary.requests.value, null);
    assert.equal(summary.costUsd.value, null);
    assert.equal(summary.prompts, 1);
  }
});
