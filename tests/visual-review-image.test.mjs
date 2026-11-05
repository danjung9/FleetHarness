import test from 'node:test';
import assert from 'node:assert/strict';
import { withDesktopCompatibility, visualReviewRestartMessage } from '../dist-electron/shared/desktop-api.js';

test('screenshot viewing explains an older preload or missing image handler', async () => {
  for (const bridge of [{}, { visualReviewImage: async () => { throw new Error("No handler registered for 'fleet:visual-review-image'"); } }]) {
    await assert.rejects(withDesktopCompatibility(bridge).visualReviewImage('project', 'capture'), error => error.message === visualReviewRestartMessage);
  }
});

test('screenshot viewing preserves integrity errors and forwards only project and capture identities', async () => {
  const calls = [], bytes = 'data:image/png;base64,fixture';
  const bridge = withDesktopCompatibility({ visualReviewImage: async (...args) => { calls.push(args); return bytes; } });
  assert.equal(await bridge.visualReviewImage('selected-project', 'recorded-capture'), bytes);
  assert.deepEqual(calls, [['selected-project', 'recorded-capture']]);
  const failure = new Error('Screenshot content changed after its host capture.');
  await assert.rejects(withDesktopCompatibility({ visualReviewImage: async () => { throw failure; } }).visualReviewImage('project', 'capture'), error => error === failure);
});
