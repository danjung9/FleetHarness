import test from 'node:test';
import assert from 'node:assert/strict';
import { getJourneyState, getResumeStage, resumeLabel } from '../dist-electron/shared/journey.js';
import { stageDefinitions } from '../dist-electron/shared/types.js';

const report = (overrides = {}) => ({
  time: '2026-11-04T12:00:00Z', command: 'node --test app.test.cjs', exitCode: 0,
  passed: 2, failed: 0, skipped: 0, total: 2, output: '', durationMs: 100, sourceHash: 'verified-source',
  ...overrides
});
const quality = (overrides = {}) => ({
  schemaVersion: 1, contractHash: 'frozen-contract', status: 'passed', requirementsMet: false,
  errors: [], journeys: [{ id: 'main', title: 'Main flow', viewport: 'desktop', status: 'passed', detail: 'Passed' }],
  criteria: [
    { criterionId: 'app', requirement: 'Use the app', status: 'passed', detail: 'Verified' },
    { criterionId: 'integration', requirement: 'Connect an external service', status: 'unverified', detail: 'Deferred' }
  ],
  ...overrides
});
const project = (overrides = {}) => ({
  id: 'challenge', title: 'Challenge', description: 'Build a useful app', criteria: [],
  createdAt: '2026-11-04T12:00:00Z', updatedAt: '2026-11-04T12:00:00Z',
  status: 'draft', stages: structuredClone(stageDefinitions), logs: [], feedback: '',
  ...overrides
});
const atStage = (id, status = 'active') => stageDefinitions.map(stage => ({ ...stage, status: stage.id === id ? status : 'queued' }));
const executable = (status, overrides = {}) => ({ status, platform: 'darwin', arch: 'arm64', fileName: 'app.zip', ...overrides });

test('saving a changed brief resets the journey despite a retained workspace and old stage records', () => {
  const state = getJourneyState(project({
    runId: 'previous-run', workspace: '/old-workspace', stages: atStage('deliver', 'complete'),
    report: report(), approvedAt: '2026-11-04T12:01:00Z', exportedTo: '/old-export',
    executable: executable('ready', { savedTo: '/old-app.zip' })
  }));
  assert.equal(state.current, 'brief');
  assert.deepEqual(state.completed, []);
  assert.equal(state.activeStage, undefined);
  assert.equal(state.stale, true);
  assert.match(state.message, /Start a new build/);
  assert.equal(getJourneyState(project()).stale, false);
});

test('the live phase remains authoritative while earlier stages are complete', () => {
  const stages = atStage('research').map(stage => stage.id === 'intake' ? { ...stage, status: 'complete' } : stage);
  const state = getJourneyState(project({ status: 'running', runId: 'run', stages }));
  assert.equal(state.current, 'build');
  assert.equal(state.activeStage, 'research');
  assert.deepEqual(state.completed, ['brief']);
  assert.match(state.message, /Researching.*Planning comes next automatically/);
});

test('a failed report during verification describes automatic repair without exposing a review gate', () => {
  const state = getJourneyState(project({ status: 'running', stages: atStage('verify'), report: report({ failed: 1, passed: 1, exitCode: 1 }) }));
  assert.equal(state.current, 'build');
  assert.equal(state.activeStage, 'verify');
  assert.match(state.message, /Repairing.*again automatically/);
  assert.deepEqual(state.completed, ['brief']);
});

test('passing verification still waits for the backend review transition', () => {
  const state = getJourneyState(project({ status: 'running', report: report(), stages: atStage('review', 'review') }));
  assert.equal(state.current, 'build');
  assert.equal(state.activeStage, undefined);
  assert.match(state.message, /Preparing your review/);
});

test('stopped and failed runs stay in Build even if a passing report was retained', () => {
  for (const status of ['stopped', 'failed']) {
    const state = getJourneyState(project({ status, report: report(), stages: atStage('verify', 'failed'), workspace: '/workspace' }));
    assert.equal(state.current, 'build');
    assert.equal(state.activeStage, 'verify');
    assert.deepEqual(state.completed, ['brief']);
    assert.match(state.message, /start a new build/i);
    assert.doesNotMatch(state.message, /automatically/);
  }
});

test('failed and stopped phases offer resume with saved work and preserve the Build milestone', () => {
  for (const status of ['failed', 'stopped']) {
    for (const stage of ['intake', 'research', 'plan', 'build', 'verify']) {
      const state = getJourneyState(project({ status, runId: 'same-run', workspace: '/workspace', resumeStage: stage,
        stages: atStage(stage, 'failed'), report: report() }));
      assert.equal(state.current, 'build');
      assert.equal(state.activeStage, stage);
      assert.equal(state.resumeStage, stage);
      assert.deepEqual(state.completed, ['brief']);
      assert.match(state.message, new RegExp(resumeLabel(stage)));
      assert.match(state.message, /saved work/);
      assert.doesNotMatch(state.message, /new build|automatically/);
    }
  }
});

test('only a persisted build-stage checkpoint on a stopped or failed run offers resume', () => {
  const saved = project({ status: 'failed', runId: 'run', workspace: '/workspace', resumeStage: 'build', stages: atStage('build', 'failed') });
  assert.equal(getResumeStage(saved), 'build');
  for (const changes of [
    { resumeStage: undefined }, { resumeStage: 'review' }, { resumeStage: 'deliver' },
    { workspace: undefined }, { runId: undefined },
    ...['draft', 'running', 'review', 'approved', 'delivered'].map(status => ({ status }))
  ]) assert.equal(getResumeStage({ ...saved, ...changes }), undefined, JSON.stringify(changes));
  const changedBrief = getJourneyState({ ...saved, status: 'draft' });
  assert.equal(changedBrief.resumeStage, undefined);
  assert.match(changedBrief.message, /new build/);
  const legacy = getJourneyState({ ...saved, resumeStage: undefined });
  assert.equal(legacy.resumeStage, undefined);
  assert.match(legacy.message, /new build/);
});

test('Review requires usable verification evidence for the applicable quality contract', () => {
  const review = project({ status: 'review', workspace: '/workspace', report: report() });
  assert.equal(getJourneyState(review).current, 'review');
  for (const changes of [
    { report: undefined }, { workspace: undefined }, { report: report({ total: 0, passed: 0 }) },
    { report: report({ failed: 1, passed: 1 }) }, { qualityVersion: 1 },
    { qualityVersion: 1, report: report({ quality: quality({ status: 'failed' }) }) }
  ]) {
    const state = getJourneyState({ ...review, ...changes });
    assert.equal(state.current, 'build');
    assert.deepEqual(state.completed, ['brief']);
  }
  const ready = getJourneyState({ ...review, qualityVersion: 1, report: report({ quality: quality() }) });
  assert.equal(ready.current, 'review');
  assert.deepEqual(ready.completed, ['brief', 'build']);
  assert.match(ready.message, /Your review is needed/);
});

test('approval opens Deliver but does not claim a download or completed delivery', () => {
  for (const status of ['approved', 'delivered']) {
    const state = getJourneyState(project({ status, approvedAt: '2026-11-04T12:01:00Z' }));
    assert.equal(state.current, 'deliver');
    assert.deepEqual(state.completed, ['brief', 'build', 'review']);
    assert.match(state.message, /Build approved.*Download the app/);
  }
});

test('negative or unavailable independent checks need review after automatic checks pass', () => {
  for (const independentJudge of [undefined, { verdict: 'NOT', gaps: [] }, { verdict: 'NOT', evaluationError: 'Synthetic error', gaps: [] }]) {
    const state = getJourneyState(project({ status: 'review', workspace: '/synthetic', qualityVersion: 1,
      report: report({ quality: quality(), independentJudge }) }));
    assert.equal(state.current, 'review'); assert.equal(state.activeStage, 'review');
    assert.match(state.message, /review is needed.*independent check gaps/);
    assert.doesNotMatch(state.message, /failed|Verification needs attention/);
  }
});

test('source export and a saved app are distinct delivery outcomes', () => {
  const approved = project({ status: 'delivered', approvedAt: '2026-11-04T12:01:00Z' });
  const source = getJourneyState({ ...approved, exportedTo: '/delivery' });
  assert.match(source.message, /Source and evidence exported/);
  assert.doesNotMatch(source.message, /App saved/);
  assert.deepEqual(source.completed, ['brief', 'build', 'review', 'deliver']);
  const app = getJourneyState({ ...approved, executable: executable('ready', { savedTo: '/app.zip' }) });
  assert.match(app.message, /App saved/);
  assert.doesNotMatch(app.message, /evidence exported/);
  assert.ok(app.completed.includes('deliver'));
  const missingPath = getJourneyState({ ...approved, executable: executable('ready') });
  assert.doesNotMatch(missingPath.message, /App saved/);
  assert.equal(missingPath.completed.includes('deliver'), false);
});

test('a packaging retry or failure preserves an already completed source export', () => {
  const approved = project({ status: 'delivered', exportedTo: '/delivery' });
  for (const status of ['packaging', 'failed']) {
    const state = getJourneyState({ ...approved, executable: executable(status) });
    assert.equal(state.current, 'deliver');
    assert.ok(state.completed.includes('deliver'));
    assert.match(state.message, /Source and evidence exported/);
    assert.match(state.message, status === 'packaging' ? /Packaging your app/ : /download failed.*retry/);
    assert.doesNotMatch(state.message, /App saved/);
    const withoutExport = getJourneyState({ ...approved, exportedTo: undefined, executable: executable(status) });
    assert.equal(withoutExport.completed.includes('deliver'), false);
  }
});
