import { chromium } from 'playwright';
import { preview } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { newProject } from '../dist-electron/electron/storage.js';

// Renderer-only evidence fixtures. Actual browser execution is tested separately.
const output = path.resolve('output/playwright/quality');
await fs.mkdir(output, { recursive: true });
const project = { ...newProject({ title: 'Task review · evidence fixture', description: 'Synthetic UI fixture for reviewing application quality evidence.', criteria: ['Parse a synthetic task.', 'Connect to an approved operational source.'] }),
  status: 'review', workspace: '/synthetic/quality-ui-fixture', runId: 'quality-ui-fixture', qualityVersion: 1, report: { time: new Date().toISOString(), command: 'node --test app.test.cjs', exitCode: 0, passed: 2, failed: 0, skipped: 0, total: 2, durationMs: 1200, sourceHash: 'fixture', output: '2 Node tests passed. Browser task failed.',
    quality: { schemaVersion: 1, contractHash: 'fixture', status: 'failed', requirementsMet: false, errors: [],
      criteria: [{ criterionId: 'TASK-1', requirement: 'Parse a synthetic task.', status: 'failed', detail: 'Expected inspect pump, received placeholder.' }, { criterionId: 'INTEGRATION-1', requirement: 'Connect to an approved operational source.', status: 'unverified', detail: 'An authorized connector and domain validation are required.' }],
      journeys: [{ id: 'parse', title: 'Parse a synthetic task', viewport: 'desktop', status: 'failed', detail: 'Expected inspect pump, received placeholder.', screenshot: '.quality-evidence/fixture/parse-desktop.png' }, { id: 'parse', title: 'Parse a synthetic task', viewport: 'narrow', status: 'passed', detail: 'Task completed.' }] } } };
const state = { version: 1, projects: [project], settings: { provider: '', model: '', rememberKey: false } };

function computationalQuality() {
  const runtime = { profile: 'browser', filesHash: 'computational-fixture-files', runtime: 'node-fixture', environmentNames: [] };
  return { schemaVersion: 2, contractHash: 'computational-fixture', status: 'failed', requirementsMet: false, errors: [], expectedJourneys: 4,
    criteria: [{ criterionId: 'SCHEDULE-1', requirement: 'Produce a feasible schedule without overlapping assignments.', status: 'failed', capabilityIds: ['schedule'], detail: 'The engine overlaps a technician on the conflict case.' },
      { criterionId: 'INTEGRATION-1', requirement: 'Connect to an approved operational source.', status: 'unverified', capabilityIds: [], detail: 'An authorized connector and domain validation are required.' }],
    journeys: ['schedule', 'recover'].flatMap(id => ['desktop', 'narrow'].map(viewport => ({ id, title: id === 'schedule' ? 'Create a schedule' : 'Recover from invalid input', viewport, status: 'passed', detail: 'Declared browser interactions completed.' }))),
    capabilities: [{ id: 'schedule', required: true, criterionIds: ['SCHEDULE-1'], evaluationIds: ['constraint-cases'], status: 'failed', detail: 'Required constraint evaluation did not pass.' }],
    package: { status: 'passed', cleanCopy: true, profile: runtime.profile, filesHash: runtime.filesHash, detail: 'Declared files and locked dependencies were prepared for verification.' },
    solutionEvaluation: { schemaVersion: 1, status: 'failed', runtime, durationMs: 240, errors: [],
      capabilities: [{ id: 'schedule', required: true, status: 'failed' }],
      evaluations: [{ id: 'constraint-cases', capabilityId: 'schedule', evaluator: 'schedule', metric: 'Constraint satisfaction', threshold: 1, baseline: 0.5, actual: 0.5, trials: 2,
        status: 'failed', dataset: { name: 'Maintenance scheduling reference', version: '2026-11', provenance: 'synthetic' },
        cases: [1, 2].flatMap(trial => [
          { id: 'ordinary', trial, passed: true, score: 1, durationMs: 10, detail: 'All assignment constraints satisfied.' },
          { id: 'overlap', trial, passed: false, score: 0, durationMs: 10, detail: 'Technician Lee is assigned to two overlapping jobs.' }
        ]) }]
    }
  };
}

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 }, reducedMotion: 'reduce' });
  await context.addInitScript(state => {
    let current = state; const listeners = new Set();
    window.qualityFixtureCalls = { approvals: [], exports: [], downloads: [] };
    window.fleetHarness = { bootstrap: async () => ({ state: current, models: [], storagePath: 'UI fixture', credentialStatus: '', runtime: 'UI fixture' }),
      onState: listener => { listeners.add(listener); return () => listeners.delete(listener); }, preview: async () => null, artifacts: async () => [],
      approve: async (id, feedback) => {
        window.qualityFixtureCalls.approvals.push(id);
        const project = current.projects.find(project => project.id === id);
        project.status = 'approved'; project.approvedAt = new Date().toISOString(); project.feedback = feedback;
        current = structuredClone(current); for (const listener of listeners) listener(current);
      },
      exportProject: async id => { window.qualityFixtureCalls.exports.push(id); return '/synthetic/runnable-package.zip'; },
      downloadExecutable: async id => { window.qualityFixtureCalls.downloads.push(id); return '/synthetic/app.zip'; }
    };
    window.setQualityFixture = value => { current = value; for (const listener of listeners) listener(value); };
  }, state);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.getByRole('button', { name: 'Preview — generated app', exact: true }).click();
  await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByText('Verification needs attention', { exact: true }).waitFor();
  await page.getByLabel('Review notes').fill('Reviewed the synthetic fixture, including the explicit integration gap.');
  await page.getByLabel('I inspected the application, test evidence, and limitations.').check();
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).isEnabled(), false);
  await page.locator('.page').evaluate(element => { element.scrollTop = 0; });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, 'failed-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 1120, height: 720 });
  await page.screenshot({ path: path.join(output, 'failed-minimum.png'), animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  project.report.quality.status = 'passed'; project.report.quality.criteria[0].status = 'passed'; project.report.quality.criteria[0].detail = 'The expected task appeared at both viewport sizes.';
  project.report.quality.journeys[0].status = 'passed'; project.report.quality.journeys[0].detail = 'Task completed.';
  await page.evaluate(value => window.setQualityFixture(value), state);
  await page.getByText('Automated checks passed', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).isEnabled(), true);
  const evidence = page.locator('.review-evidence');
  if (await evidence.getAttribute('open') === null) await evidence.locator(':scope > summary').click();
  assert.equal(await page.getByText('Unverified', { exact: true }).count(), 1);
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.locator('.page').evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: path.join(output, 'partial-desktop.png'), animations: 'disabled' });
  delete project.report.quality;
  await page.evaluate(value => window.setQualityFixture(value), state);
  await page.getByText('This older report contains Node test results only.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).isEnabled(), false, 'Quality-enabled runs cannot approve Node-only reports');

  project.title = 'Scheduling engine · computational evidence';
  project.runId = 'computational-ui-fixture'; project.qualityVersion = 2; project.runtimeProfile = 'browser';
  project.report.quality = computationalQuality(); project.report.output = '2 Node tests and 4 browser journeys passed. Required scheduling constraint evaluation failed.';
  await page.evaluate(value => window.setQualityFixture(value), state);
  await page.getByText('Verification needs attention', { exact: true }).waitFor();
  await page.getByLabel('Review notes').fill('Reviewed the constraint examples, failure details, baseline, and explicit integration limitation.');
  await page.getByLabel('I inspected the application, test evidence, and limitations.').check();
  await page.getByRole('heading', { name: 'Computational capabilities', exact: true }).waitFor();
  await page.getByText('Constraint satisfaction: 0.500 · required 1.000 · baseline 0.500', { exact: true }).waitFor();
  await page.getByText('Maintenance scheduling reference · version 2026-11 · synthetic · 4 trial results', { exact: true }).waitFor();
  await page.getByText('The declared package ran in a fresh environment.', { exact: false }).waitFor();
  await page.getByText('Browser journeys · 4 / 4 passed', { exact: true }).waitFor();
  await page.getByText('Failed cases', { exact: true }).click();
  await page.getByText('overlap, trial 2: Technician Lee is assigned to two overlapping jobs.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).isEnabled(), false, 'Green Node and browser checks cannot conceal a required computational failure');
  await page.getByRole('heading', { name: 'Computational capabilities', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'computational-failed-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 1120, height: 720 });
  await page.getByRole('heading', { name: 'Computational capabilities', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'computational-failed-minimum.png'), animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.locator('.review-evidence-content').evaluate(element => element.scrollWidth > element.clientWidth + 1), false);

  const quality = project.report.quality;
  quality.status = 'passed'; quality.criteria[0].status = 'passed'; quality.criteria[0].detail = 'Independent cases satisfy all scheduling constraints.';
  quality.solutionEvaluation.status = 'passed'; quality.solutionEvaluation.capabilities[0].status = 'passed';
  const evaluation = quality.solutionEvaluation.evaluations[0];
  evaluation.status = 'passed'; evaluation.actual = 1;
  evaluation.cases.forEach(result => { result.passed = true; result.score = 1; result.detail = 'All assignment constraints satisfied.'; });
  await page.evaluate(value => window.setQualityFixture(value), state);
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).isEnabled(), false, 'A required capability must pass even when aggregate evaluation labels say passed');
  quality.capabilities[0].status = 'passed'; quality.capabilities[0].detail = 'All required host evaluations passed.';
  quality.criteria[0].status = 'unverified';
  await page.evaluate(value => window.setQualityFixture(value), state);
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).isEnabled(), false, 'A core requirement cannot be deferred');
  quality.criteria[0].status = 'passed';
  await page.evaluate(value => window.setQualityFixture(value), state);
  await page.getByText('Automated checks passed', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).isEnabled(), true);
  if (await evidence.getAttribute('open') === null) await evidence.locator(':scope > summary').click();
  await page.getByText('Constraint satisfaction: 1.000 · required 1.000 · baseline 0.500', { exact: true }).waitFor();
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.getByRole('heading', { name: 'Computational capabilities', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'computational-passed-desktop.png'), animations: 'disabled' });

  quality.solutionEvaluation.evaluations = [];
  await page.evaluate(value => window.setQualityFixture(value), state);
  await page.getByText('Verification needs attention', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).isEnabled(), false, 'Missing required evaluation results cannot pass');
  quality.solutionEvaluation.evaluations = [evaluation]; quality.package.cleanCopy = false;
  await page.evaluate(value => window.setQualityFixture(value), state);
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).isEnabled(), false, 'An unverified clean runtime cannot pass');
  quality.package.cleanCopy = true;
  project.runtimeProfile = 'cli'; quality.package.profile = 'cli'; quality.solutionEvaluation.runtime.profile = 'cli';
  quality.journeys = []; quality.expectedJourneys = 0;
  await page.evaluate(value => window.setQualityFixture(value), state);
  await page.getByText('Automated checks passed', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).isEnabled(), true, 'A CLI with required computational evidence needs no browser journeys');
  await page.getByRole('button', { name: 'Approve prototype', exact: true }).click();
  const exportButton = page.getByRole('button', { name: 'Export runnable package', exact: true });
  await exportButton.waitFor();
  assert.equal(await exportButton.isEnabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Download app', exact: true }).count(), 0);
  await page.getByText('Includes the command-line engine, dependency files, startup instructions, and verification evidence.', { exact: false }).waitFor();
  await page.screenshot({ path: path.join(output, 'cli-delivery-desktop.png'), animations: 'disabled' });
  await exportButton.click();
  await page.waitForFunction(() => window.qualityFixtureCalls.exports.length === 1);
  assert.deepEqual(await page.evaluate(() => window.qualityFixtureCalls), { approvals: [project.id], exports: [project.id], downloads: [] });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, browserFailureBlocksApproval: true, explicitRequirementGaps: true, missingQualityBlocksApproval: true,
    requiredCapabilityBlocksApproval: true, coreDeferralBlocksApproval: true, missingEvaluationBlocksApproval: true, cleanRuntimeRequired: true,
    evaluationMetricsAndProvenance: true, cliApprovesWithoutBrowserJourneys: true, cliExportsRunnablePackage: true, screenshots: output }));
} finally { await browser?.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
