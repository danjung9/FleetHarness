import test from 'node:test';
import assert from 'node:assert/strict';
import { withDesktopCompatibility, codexGoalRestartMessage } from '../dist-electron/shared/desktop-api.js';

for (const [method, channel] of [['launchCodexGoal', 'launch'], ['stopCodexGoal', 'stop'], ['openCodexGoalWorkspace', 'open']]) {
  test(`${method} explains an absent or stale desktop bridge`, async () => {
    for (const bridge of [{}, { [method]: true }, { [method]: async () => { throw new Error(`Error invoking remote method 'fleet:codex-goal:${channel}': Error: No handler registered for 'fleet:codex-goal:${channel}'`); } }]) {
      await assert.rejects(withDesktopCompatibility(bridge)[method]('saved-project'), error => error.message === codexGoalRestartMessage);
    }
  });

  test(`${method} forwards the saved project and preserves host results and errors`, async () => {
    const result = { id: 'launch', workspace: '/goal', createdAt: '2026-11-05T17:00:00Z', status: 'running' };
    const calls = [];
    assert.equal(await withDesktopCompatibility({ [method]: async id => { calls.push(id); return result; } })[method]('saved-project'), result);
    assert.deepEqual(calls, ['saved-project']);
    const failure = new Error('Codex is unavailable.');
    await assert.rejects(withDesktopCompatibility({ [method]: async () => { throw failure; } })[method]('saved-project'), error => error === failure);
  });
}
