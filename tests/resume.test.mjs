import test from 'node:test';
import assert from 'node:assert/strict';
import { withDesktopCompatibility, resumeRestartMessage } from '../dist-electron/shared/desktop-api.js';

test('resume on an older preload bridge explains that a full app restart is required', async () => {
  for (const bridge of [{}, { resumeRun: undefined }, { resumeRun: true }]) {
    await assert.rejects(withDesktopCompatibility(bridge).resumeRun('project-id'), error => error.message === resumeRestartMessage);
  }
});

test('resume translates a missing Electron handler into the restart guidance', async () => {
  for (const message of ["No handler registered for 'fleet:resume'", 'Error invoking remote method \'fleet:resume\': Error: No handler registered for "fleet:resume"']) {
    const bridge = { resumeRun: async () => { throw new Error(message); } };
    await assert.rejects(withDesktopCompatibility(bridge).resumeRun('project-id'), error => error.message === resumeRestartMessage);
  }
});

test('resume preserves host failures so the user sees the actual recovery problem', async () => {
  for (const failure of [new Error('The frozen acceptance contract changed.'), new Error("No handler registered for 'fleet:other'"), 'Connection closed']) {
    const bridge = { resumeRun: async () => { throw failure; } };
    await assert.rejects(withDesktopCompatibility(bridge).resumeRun('project-id'), error => error === failure);
  }
});

test('resume forwards the selected project once and waits for the host to accept it', async () => {
  const calls = [];
  let release;
  const accepted = new Promise(resolve => { release = resolve; });
  const bridge = { resumeRun: async id => { calls.push(id); await accepted; } };
  let completed = false;
  const result = withDesktopCompatibility(bridge).resumeRun('saved-project-id').then(() => { completed = true; });
  await Promise.resolve();
  assert.deepEqual(calls, ['saved-project-id']);
  assert.equal(completed, false);
  release(); await result;
  assert.equal(completed, true);
});
