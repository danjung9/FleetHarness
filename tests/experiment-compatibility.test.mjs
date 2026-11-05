import test from 'node:test';
import assert from 'node:assert/strict';
import { withDesktopCompatibility, experimentRestartMessage } from '../dist-electron/shared/desktop-api.js';
import { experimentMethodNames } from '../dist-electron/shared/experiments.js';

test('older desktop bridges expose comparison availability with a useful restart message', async () => {
  const api = withDesktopCompatibility({ bootstrap: async () => ({ capabilities: {} }) });
  const state = await api.experimentState('project');
  assert.equal(state.availability.available, false); assert.equal(state.availability.reason, experimentRestartMessage);
  await assert.rejects(api.startExperiment('project'), error => error.message === experimentRestartMessage);
  await api.closeCandidatePreview();
});

test('a hot-reloaded renderer tolerates new preload methods before main handlers restart', async () => {
  const bridge = Object.fromEntries(experimentMethodNames.map(name => [name, async () => { throw new Error("No handler registered for 'fleet:experiments:state'"); }]));
  const api = withDesktopCompatibility(bridge);
  assert.equal((await api.experimentState('project')).availability.available, false);
  await assert.rejects(api.saveLearningSettings({}), error => error.message === experimentRestartMessage);
});

test('current comparison bridges preserve arguments and ordinary host errors', async () => {
  const calls = [];
  const bridge = Object.fromEntries(experimentMethodNames.map(name => [name, async (...args) => { calls.push({ name, args }); return name; }]));
  const api = withDesktopCompatibility(bridge);
  assert.equal(await api.selectCandidate('experiment', 'candidate', 'hash'), 'selectCandidate');
  assert.deepEqual(calls, [{ name: 'selectCandidate', args: ['experiment', 'candidate', 'hash'] }]);
  bridge.previewCandidate = async () => { throw new Error('Candidate integrity check failed.'); };
  await assert.rejects(api.previewCandidate('experiment', 'candidate'), /integrity check/);
});
