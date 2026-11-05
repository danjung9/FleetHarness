import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const directory = await mkdtemp(resolve('.hosted-journey-test-'));
after(() => rm(directory, { recursive: true, force: true }));
await build({ entryPoints: ['shared/hosted-journey.ts'], outfile: `${directory}/journey.mjs`, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
const { getHostedJourneyState, getHostedResumeStage, hostedPhaseState } = await import(pathToFileURL(`${directory}/journey.mjs`));
const stages = ['intake', 'research', 'plan', 'build', 'verify'];
const paused = () => ({ status: 'paused', runId: 'saved-run', canResume: true, checkpointStage: 'intake', stages: stages.map(id => ({ id, status: id === 'intake' ? 'complete' : id === 'research' ? 'failed' : 'queued' })) });

test('hosted review opens evidence without a desktop workspace or desktop report schema', () => {
  for (const report of [undefined, { passed: 10, failed: 0, quality: { schemaVersion: 1 } }, { passed: 0, failed: 1 }]) {
    assert.equal(getHostedJourneyState({ status: 'review', report, stages: [] }).current, 'review');
  }
  assert.equal(getHostedJourneyState({ status: 'delivered', stages: [] }).current, 'deliver');
  assert.equal(getHostedJourneyState({ status: 'draft', runId: 'old', stages: [] }).current, 'brief');
});

test('paused builds retain completed phases and resume the interrupted phase', () => {
  const project = paused();
  assert.equal(hostedPhaseState(project, 'intake'), 'complete');
  assert.equal(hostedPhaseState(project, 'research'), 'paused');
  assert.equal(stages.filter(id => hostedPhaseState(project, id) === 'complete').length, 1);
  assert.equal(getHostedResumeStage(project), 'research');
  assert.equal(getHostedJourneyState(project).resumeStage, 'research');
  project.status = 'pausing';
  assert.equal(hostedPhaseState(project, 'research'), 'pausing');
  assert.equal(getHostedResumeStage(project), undefined);
  project.status = 'running';
  assert.equal(getHostedJourneyState(project).current, 'build');
  assert.equal(getHostedResumeStage(project), undefined);
});

test('a final verification checkpoint does not erase completed stages', () => {
  const project = { ...paused(), checkpointStage: 'verify', stages: stages.map(id => ({ id, status: 'complete' })) };
  assert.equal(getHostedResumeStage(project), 'verify');
  assert.equal(stages.filter(id => hostedPhaseState(project, id) === 'complete').length, 5);
  project.canResume = false;
  assert.equal(getHostedResumeStage(project), undefined);
});
