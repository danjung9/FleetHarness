import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { getJourneyState } from '../dist-electron/shared/journey.js';
import { newProject, sourceHash, Store } from '../dist-electron/electron/storage.js';
import { assertExecutableSource, stageExecutable } from '../dist-electron/electron/executable.js';

function passingReport(version) {
  const report = {
    time: '2026-11-05T12:00:00Z', command: 'node --test app.test.mjs', exitCode: 0,
    passed: 2, failed: 0, skipped: 0, total: 2, output: '', durationMs: 10, sourceHash: 'verified-source'
  };
  if (version === undefined) return report;
  const quality = {
    schemaVersion: version, contractHash: 'frozen-contract', status: 'passed', requirementsMet: true, errors: [],
    criteria: [{ criterionId: 'R1', requirement: 'Calculate totals', status: 'passed', detail: 'Verified' }],
    journeys: [{ id: 'primary', title: 'Calculate totals', viewport: 'desktop', status: 'passed', detail: 'Verified' }]
  };
  if (version >= 2) {
    const runtime = { profile: 'cli', filesHash: 'verified-files', runtime: 'node', environmentNames: [] };
    Object.assign(quality, {
      expectedJourneys: 0, journeys: [],
      criteria: [{ ...quality.criteria[0], capabilityIds: ['total'] }],
      package: { status: 'passed', cleanCopy: true, profile: runtime.profile, filesHash: runtime.filesHash, detail: 'Clean copy' },
      capabilities: [{ id: 'total', required: true, criterionIds: ['R1'], evaluationIds: ['reference'], status: 'passed', detail: 'Verified' }],
      solutionEvaluation: {
        schemaVersion: 1, status: 'passed', errors: [], runtime, durationMs: 5,
        capabilities: [{ id: 'total', required: true, status: 'passed' }],
        evaluations: [{
          id: 'reference', capabilityId: 'total', evaluator: 'exact',
          dataset: { name: 'Independent totals', version: '1', provenance: 'reviewed' },
          metric: 'case_pass_rate', threshold: 1, actual: 1, trials: 1, status: 'passed',
          cases: ['ordinary', 'empty'].map(id => ({ id, trial: 1, passed: true, score: 1, durationMs: 1, detail: 'Matches' }))
        }]
      }
    });
  }
  if (version === 4) quality.experiment = {
    experimentId: 'experiment-1', candidateId: 'candidate-1',
    behaviorHash: 'a'.repeat(64), evaluationSetHash: 'b'.repeat(64), executionHash: 'c'.repeat(64)
  };
  return { ...report, quality };
}

for (const requiredVersion of [1, 2, 3, 4]) {
  test(`quality version ${requiredVersion} accepts only equally strong or newer valid evidence`, () => {
    for (const evidenceVersion of [1, 2, 3, 4]) {
      assert.equal(reportPassed(passingReport(evidenceVersion), requiredVersion), evidenceVersion >= requiredVersion,
        `Evidence version ${evidenceVersion} must ${evidenceVersion >= requiredVersion ? 'satisfy' : 'not satisfy'} requirement ${requiredVersion}.`);
    }
    assert.equal(reportPassed(passingReport(), requiredVersion), false, 'Node-only legacy evidence cannot satisfy a numeric quality requirement.');
  });
}

test('boolean and default quality requirements preserve legacy compatibility', () => {
  assert.equal(reportPassed(passingReport()), true);
  assert.equal(reportPassed(passingReport(), false), true);
  assert.equal(reportPassed(passingReport(), true), false);
  for (const version of [1, 2, 3, 4]) {
    assert.equal(reportPassed(passingReport(version)), true, `Default requirement accepts valid version ${version}.`);
    assert.equal(reportPassed(passingReport(version), false), true, `Optional quality accepts valid version ${version}.`);
    assert.equal(reportPassed(passingReport(version), true), true, `Boolean true accepts valid version ${version}.`);
  }
  for (const required of [undefined, false, true, 1, 2, 3, 4]) {
    assert.equal(reportPassed(undefined, required), false);
    assert.equal(reportPassed({ ...passingReport(4), exitCode: 1 }, required), false);
  }
});

test('a sufficient version never substitutes for complete passing computational evidence', () => {
  const defects = [
    ['failed quality', quality => { quality.status = 'failed'; }],
    ['recorded error', quality => { quality.errors.push('Runtime failed.'); }],
    ['missing engine evaluation', quality => { delete quality.solutionEvaluation; }],
    ['missing clean package', quality => { delete quality.package; }],
    ['different package files', quality => { quality.package.filesHash = 'different-files'; }],
    ['missing capability', quality => { quality.capabilities = []; }],
    ['missing independent cases', quality => { quality.solutionEvaluation.evaluations[0].cases = []; }],
    ['failed independent case', quality => { quality.solutionEvaluation.evaluations[0].cases[0].passed = false; }]
  ];
  for (const version of [2, 3, 4]) for (const [label, mutate] of defects) {
    const report = passingReport(version);
    mutate(report.quality);
    for (const required of [undefined, false, true, 1, 2, 3, 4]) {
      assert.equal(reportPassed(report, required), false, `Version ${version}, ${label}, requirement ${required}.`);
    }
  }
  for (const mutate of [quality => { delete quality.experiment; }, quality => { quality.experiment.evaluationSetHash = 'invalid'; }]) {
    const report = passingReport(4);
    mutate(report.quality);
    assert.equal(reportPassed(report, 4), false, 'Experiment identity is still required for version 4 evidence.');
  }
});

async function workspaceFixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-verification-version-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(workspace);
  await fs.writeFile(path.join(workspace, 'index.html'), '<h1>Verified offline application</h1>');
  const project = {
    ...newProject({ title: 'Offline totals', description: 'Calculate useful totals in an offline application.', criteria: ['Calculate totals correctly.'] }),
    workspace, qualityVersion: 2, status: 'review', report: passingReport(1)
  };
  project.report.sourceHash = await sourceHash(workspace);
  return { root, project };
}

test('saved version 2 projects cannot reach review with only version 1 evidence', async t => {
  const { root, project } = await workspaceFixture(t);
  const legacy = { ...structuredClone(project), id: project.id + '-legacy', qualityVersion: 1 };
  const store = new Store(path.join(root, 'store'));
  await store.init();
  store.state.projects = [project, legacy];
  await store.save();
  const restored = new Store(store.root);
  await restored.init();
  const saved = restored.project(project.id);
  assert.equal(saved.qualityVersion, 2);
  assert.equal(saved.report.quality.schemaVersion, 1);
  assert.equal(await sourceHash(saved.workspace), saved.report.sourceHash, 'The saved evidence matches unchanged application files.');
  const state = getJourneyState(saved);
  assert.equal(state.current, 'build');
  assert.deepEqual(state.completed, ['brief']);
  assert.match(state.message, /Verification needs attention/);
  assert.equal(getJourneyState(restored.project(legacy.id)).current, 'review', 'A genuine version 1 project retains its review flow.');
});

test('approved version 2 projects need computational evidence before executable source approval', async t => {
  const { project } = await workspaceFixture(t);
  project.status = 'approved';
  project.approvedAt = '2026-11-05T12:01:00Z';
  assert.equal(await sourceHash(project.workspace), project.report.sourceHash);
  await assert.rejects(assertExecutableSource(project), /Passing required capability, runtime and application checks/);
});

test('executable staging rejects a downgraded version 2 report before writing package files', async t => {
  const { root, project } = await workspaceFixture(t);
  project.status = 'approved';
  project.approvedAt = '2026-11-05T12:01:00Z';
  assert.equal(await sourceHash(project.workspace), project.report.sourceHash);
  await assert.rejects(stageExecutable(project, root), /Passing required capability, runtime and application checks/);
  await assert.rejects(fs.access(path.join(root, 'source')), { code: 'ENOENT' });
});

test('a genuine version 1 project still stages its verified standalone application', async t => {
  const { root, project } = await workspaceFixture(t);
  project.qualityVersion = 1;
  project.status = 'approved';
  project.approvedAt = '2026-11-05T12:01:00Z';
  await assertExecutableSource(project);
  const staged = await stageExecutable(project, root);
  assert.equal(await fs.readFile(path.join(staged.source, 'index.html'), 'utf8'), '<h1>Verified offline application</h1>');
  assert.deepEqual((await fs.readdir(staged.source)).sort(), ['index.html', 'main.cjs', 'package.json']);
  assert.equal(await sourceHash(project.workspace), project.report.sourceHash);
});
