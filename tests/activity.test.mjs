import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActivity, resultText } from '../dist-electron/shared/activity.js';

const log = (id, text, overrides = {}) => ({ id, text, time: '2026-11-04T12:00:00Z', stage: 'build', kind: 'tool', ...overrides });
const tool = (callId, phase) => ({ callId, phase, name: 'write' });

test('legacy tool starts and results become one action without losing raw records', () => {
  const start = log('a', 'write\n{"path":"index.html","content":"<h1>Test</h1>"}');
  const end = log('b', 'write completed\n{"content":[{"type":"text","text":"Saved index.html"}]}', { time: '2026-11-04T12:00:02Z' });
  const [item] = buildActivity([start, end], 'review');
  assert.equal(item.text, 'Write file'); assert.equal(item.target, 'index.html');
  assert.equal(item.status, 'complete'); assert.equal(item.durationMs, 2000);
  assert.deepEqual(item.records, [start, end]); assert.equal(resultText(item.output), 'Saved index.html');
});

test('overlapping tools are matched by call identity, even when results arrive out of order', () => {
  const items = buildActivity([
    log('a', 'write\n{"path":"a.html"}', { tool: tool('call-a', 'start') }),
    log('b', 'write\n{"path":"b.html"}', { tool: tool('call-b', 'start') }),
    log('c', 'write failed\n{"content":[{"type":"text","text":"Permission denied"}]}', { kind: 'error', tool: tool('call-b', 'error') }),
    log('d', 'write completed\n{}', { tool: tool('call-a', 'complete') })
  ], 'running', 'build');
  assert.equal(items.length, 2); assert.equal(items[0].status, 'complete');
  assert.equal(items[1].status, 'failed'); assert.equal(items[1].target, 'b.html');
});

test('missing results never imply success, and finished stages never appear live', () => {
  const logs = [log('a', 'bash\n{"command":"npm test"}')];
  assert.equal(buildActivity(logs, 'running', 'build')[0].status, 'running');
  assert.equal(buildActivity(logs, 'running', 'verify')[0].status, 'unavailable');
  assert.equal(buildActivity(logs, 'review')[0].status, 'unavailable');
  assert.equal(buildActivity(logs, 'stopped')[0].status, 'interrupted');
  assert.equal(buildActivity(logs, 'failed')[0].status, 'interrupted');
});

test('truncated JSON and missing starts retain inspectable output', () => {
  const input = 'write\n{"path":"index.html","content":"<html>';
  const start = log('a', input, { tool: { ...tool('a', 'start'), target: 'index.html' } });
  const result = log('b', 'read completed\n{"content":[{"text":"cut off');
  const items = buildActivity([start, result], 'stopped');
  assert.equal(items[0].target, 'index.html'); assert.equal(items[0].input, input.slice(6));
  assert.equal(items[1].status, 'complete'); assert.equal(resultText(items[1].output), '{"content":[{"text":"cut off');
});

test('legacy pairing does not cross stages or invent matches for overlapping names', () => {
  const items = buildActivity([
    log('a', 'write\n{}'), log('b', 'write\n{}'), log('c', 'write completed\n{}'),
    log('d', 'write completed\n{}', { stage: 'verify' })
  ], 'review');
  assert.equal(items.length, 4); assert.equal(items[0].status, 'unavailable'); assert.equal(items[1].status, 'unavailable');
  assert.equal(items[3].stage, 'verify');
});

test('unknown tools, ordinary errors, messages, and streamed text remain readable', () => {
  const logs = [log('a', 'fleet_schedule_check\n{"query":"conflicts"}'), log('b', 'Provider disconnected.', { kind: 'error' }), log('c', '## Plan\nUse **local** storage.', { kind: 'text' })];
  const items = buildActivity(logs, 'failed');
  assert.equal(items[0].text, 'Schedule check'); assert.equal(items[0].target, 'conflicts');
  assert.equal(items[1].kind, 'error'); assert.equal(items[2].kind, 'message');
  assert.equal(items[2].text, logs[2].text);
});

test('result decoder handles structured text, nulls, and non-text attachments', () => {
  assert.equal(resultText('{"content":[{"type":"text","text":"{\\"passed\\":3}"}]}'), '{"passed":3}');
  assert.equal(resultText('null'), 'null');
  assert.equal(resultText('{"content":[{"type":"image","data":"private-base64"}]}'), '[Image output — inspect original record]');
  assert.equal(resultText('"Plain result"'), 'Plain result');
});
