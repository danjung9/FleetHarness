import test from 'node:test';
import assert from 'node:assert/strict';
import { withDesktopCompatibility, storageRestartMessage } from '../dist-electron/shared/desktop-api.js';
import { storageMethodNames } from '../dist-electron/shared/data-storage.js';

test('storage offers a restart recovery on old preload or main process', async () => {
  const absent = withDesktopCompatibility({});
  for (const name of storageMethodNames) await assert.rejects(absent[name]('item'), error => error.message === storageRestartMessage);
  const mismatched = withDesktopCompatibility({ storageOverview: async () => { throw new Error("No handler registered for 'fleet:storage:storageOverview'"); } });
  await assert.rejects(mismatched.storageOverview(), error => error.message === storageRestartMessage);
});

test('storage compatibility preserves selectors, results and actionable host errors', async () => {
  const calls = [];
  const bridge = Object.fromEntries(storageMethodNames.map(name => [name, async (...args) => { calls.push({ name, args }); return 'saved'; }]));
  const api = withDesktopCompatibility(bridge);
  assert.equal(await api.storageTrash('build-1', 'data/example.csv'), 'saved');
  assert.deepEqual(calls, [{ name: 'storageTrash', args: ['build-1', 'data/example.csv'] }]);
  bridge.storageRestore = async () => { throw new Error('A file already exists at the original location.'); };
  await assert.rejects(api.storageRestore('trash-1'), /already exists/);
});
