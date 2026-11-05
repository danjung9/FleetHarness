import test from 'node:test';
import assert from 'node:assert/strict';
import { createCodexSession } from '../dist-electron/electron/codex-session.js';
import { RunUsageLedger } from '../dist-electron/electron/run-usage.js';

test('Codex forwards only its cumulative usage, including a late completion update, and stops observing on disposal', async () => {
  const listeners = new Set(), closers = new Set();
  const rpc = {
    async initialize() {}, send() {},
    onClose(listener) { closers.add(listener); },
    subscribe(listener) { listeners.add(listener); },
    dispose() { for (const listener of closers) listener(new Error('Closed')); },
    async request(method) {
      if (method === 'account/read') return { account: { type: 'chatgpt' } };
      if (method === 'thread/start') return { thread: { id: 'mine' } };
      if (method === 'turn/start') return { turn: { id: 'turn' } };
      return {};
    }
  };
  const session = await createCodexSession({ home: '.', cwd: '.', model: 'fixture', tools: [], signal: new AbortController().signal, launch: () => rpc });
  const emit = (method, params) => { for (const listener of listeners) listener({ method, params }); };
  const usage = (inputTokens, outputTokens) => ({ inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, cachedInputTokens: 4, reasoningOutputTokens: 2 });
  const ledger = new RunUsageLedger('codex'); session.subscribe(event => ledger.event('build', event, 'session'));
  ledger.beginPrompt('build'); const prompt = session.prompt('fixture');
  await new Promise(resolve => setImmediate(resolve));
  emit('thread/tokenUsage/updated', { threadId: 'other', tokenUsage: { total: usage(900, 90) } });
  emit('thread/tokenUsage/updated', { threadId: 'mine', tokenUsage: { total: usage(10, 5), last: usage(10, 5) } });
  emit('turn/completed', { threadId: 'mine', turn: { id: 'turn', status: 'completed' } });
  await prompt;
  emit('thread/tokenUsage/updated', { threadId: 'mine', tokenUsage: { total: usage(30, 10), last: usage(20, 5) } });
  assert.equal(ledger.snapshot().tokens.value, 40);
  session.dispose();
  emit('thread/tokenUsage/updated', { threadId: 'mine', tokenUsage: { total: usage(100, 50) } });
  assert.equal(ledger.snapshot().tokens.value, 40);
});
