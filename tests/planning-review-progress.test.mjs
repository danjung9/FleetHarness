import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanningReviewProgress } from '../dist-electron/electron/planning-review-progress.js';

function harness() {
  const messages = [];
  return { messages, onEvent: createPlanningReviewProgress(message => messages.push(message)) };
}
const secret = 'SEALED-review-answer-and-provider-secret';
const sealed = () => { throw new Error('Progress must not read sealed content.'); };

test('streaming model activity produces state changes, not per-token output', () => {
  const { messages, onEvent } = harness();
  onEvent({ type: 'turn_start' });
  for (let index = 0; index < 1000; index++) {
    onEvent({ type: 'message_update', get message() { return sealed(); }, get assistantMessageEvent() { return sealed(); } });
    onEvent({ type: 'tool_execution_update' }); // Codex reasoning activity.
  }
  onEvent({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop', get content() { return sealed(); } } });
  onEvent({ type: 'turn_end' });
  onEvent({ type: 'turn_start' });
  assert.deepEqual(messages, [
    'Planning review is waiting for the model.',
    'Planning review is receiving a model response.',
    'Planning review is waiting for the model.'
  ]);
});

test('read progress counts successful operations and flushes the total before verdict submission', () => {
  const { messages, onEvent } = harness();
  for (let index = 0; index < 7; index++) {
    onEvent({ type: 'tool_execution_start', toolName: 'fleet_read_planning_artifact', get args() { return sealed(); } });
    onEvent({ type: 'tool_execution_end', toolName: 'fleet_read_planning_artifact', isError: false, get result() { return sealed(); } });
  }
  onEvent({ type: 'tool_execution_end', toolName: 'fleet_read_planning_artifact', isError: true, get result() { return sealed(); } });
  onEvent({ type: 'tool_execution_start', toolName: 'fleet_submit_planning_review', get args() { return sealed(); } });
  onEvent({ type: 'tool_execution_end', toolName: 'fleet_submit_planning_review', isError: false, get result() { return sealed(); } });
  assert.deepEqual(messages, [
    'Planning review completed 1 input read.',
    'Planning review completed 5 input reads.',
    'Planning review input read failed.',
    'Planning review completed 7 input reads.',
    'Planning review is submitting its verdict.',
    'Planning review submitted its verdict.'
  ]);
  assert.equal(messages.some(message => message.includes('approved')), false, 'Only the host ledger determines approval.');
});

test('progress does not require synthetic tool events or expose event payloads and unknown tool names', () => {
  const { messages, onEvent } = harness();
  const events = [
    { type: 'message_update', assistantMessageEvent: { type: 'thinking_delta', delta: secret } },
    { type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: secret } },
    { type: 'tool_execution_start', toolName: secret, args: { filename: secret, verdict: secret } },
    { type: 'tool_execution_update', toolName: secret, partialResult: secret },
    { type: 'tool_execution_end', toolName: secret, result: secret, isError: false },
    { type: 'tool_execution_end', toolName: secret, result: secret, isError: true },
    { type: 'tool_execution_end', toolName: 'fleet_submit_planning_review', result: secret, isError: true },
    { type: 'auto_retry_start', attempt: secret, maxAttempts: secret, delayMs: secret, errorMessage: secret },
    { type: 'auto_retry_end', success: false, finalError: secret },
    { type: 'auto_retry_start', errorMessage: secret },
    { type: 'auto_retry_end', success: true, finalError: secret },
    { type: 'message_end', message: { role: 'assistant', stopReason: 'error', errorMessage: secret, content: secret } }
  ];
  events.forEach(onEvent);
  assert.deepEqual(messages, [
    'Planning review is receiving a model response.',
    'Planning review operation failed.',
    'Planning review verdict submission failed.',
    'Planning review provider is retrying the model request.',
    'Planning review provider retries were exhausted.',
    'Planning review provider is retrying the model request.',
    'Planning review provider retry recovered.',
    'Planning review model request failed.'
  ]);
  assert.equal(messages.join('\n').includes(secret), false);
  assert.ok(messages.every(message => message.length < 100));
});

test('interrupted responses and context compaction retain safe diagnostic milestones', () => {
  const { messages, onEvent } = harness();
  onEvent({ type: 'message_end', message: { role: 'toolResult', content: secret } });
  for (const stopReason of ['aborted', 'length']) onEvent({ type: 'message_end', message: { role: 'assistant', stopReason, errorMessage: secret } });
  onEvent({ type: 'compaction_start', reason: secret });
  onEvent({ type: 'compaction_end', aborted: true, errorMessage: secret, result: secret });
  onEvent({ type: 'compaction_start', reason: secret });
  onEvent({ type: 'compaction_end', aborted: false, result: secret });
  assert.deepEqual(messages, [
    'Planning review model response was interrupted.',
    'Planning review model response reached its output limit.',
    'Planning review is compacting its context.',
    'Planning review context compaction was interrupted.',
    'Planning review is compacting its context.',
    'Planning review is waiting for the model.'
  ]);
});
