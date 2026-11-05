import { chromium } from 'playwright';
import { createServer } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { stageDefinitions } from '../dist-electron/shared/types.js';
import { experimentMethodNames } from '../dist-electron/shared/experiments.js';

// Deterministic UI fixtures validate the review flow, not model quality or live APIs.
const output = path.resolve('output/playwright/experiments'); await fs.mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: false } }); await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
const time = '2026-11-05T18:00:00Z';
const report = { time, command: 'node --test', exitCode: 0, passed: 6, failed: 0, skipped: 0, total: 6, output: 'Six deterministic fixture checks passed.', durationMs: 1200, sourceHash: 'fixture-project' };
const project = { id: 'comparison-fixture', runId: 'fixture-run', title: 'Candidate comparison · UI fixture', description: 'Compare two synthetic results without model or external API calls.', criteria: ['Produce the expected result.'], status: 'review', runtimeProfile: 'service', createdAt: time, updatedAt: time, workspace: '/synthetic-fixture', stages: stageDefinitions.map(stage => ({ ...stage, status: stage.id === 'review' ? 'review' : stage.id === 'deliver' ? 'queued' : 'complete' })), logs: [], feedback: '', report };
const experiment = { id: 'comparison-1', projectId: project.id, mode: 'paired', status: 'review', createdAt: time, updatedAt: time,
  candidates: [{ id: 'node-candidate', profileId: 'node-service', profileVersion: '1', baseline: true, status: 'passed', success: true, durationMs: 62000, costUsd: null }, { id: 'python-candidate', profileId: 'python-service', profileVersion: '1', baseline: false, status: 'passed', success: true, durationMs: 75000, costUsd: 0.04 }],
  preferenceRequest: { id: 'preference-1', experimentId: 'comparison-1', createdAt: time, localDay: '2026-11-05', sampling: 'targeted', samplingProbability: null, presentationOrder: ['python-candidate', 'node-candidate'], sourceHashes: ['python-hash', 'node-hash'], status: 'pending' } };
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.FLEET_BROWSER_CHANNEL || 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ project, experiment, names }) => {
    const settings = { schemaVersion: 1, mode: 'paired', memoryEnabled: true, automaticComparisons: true, maxHumanRequestsPerDay: 2 };
    let current = structuredClone(experiment), operations = [], learning = settings;
    const failure = new URLSearchParams(location.search).get('comparison');
    if (failure) { current.status = 'failed'; if (failure === 'planning-failed') current.candidates = []; }
    project.experiment = structuredClone(current);
    window.experimentCalls = [];
    const methods = Object.fromEntries(names.map(name => [name, async (...args) => { window.experimentCalls.push({ name, args }); }]));
    window.fleetHarness = {
      ...methods,
      bootstrap: async () => ({ state: { version: 1, settings: { backend: 'pi', provider: '', model: '', rememberKey: false }, projects: [project] }, models: [], storagePath: 'Synthetic UI fixture', credentialStatus: 'Fixture only', runtime: 'Fixture only', capabilities: { experiments: true, projectConversation: false } }),
      onState: () => () => {}, preview: async () => null, artifacts: async () => [],
      experimentState: async () => ({ experiments: [structuredClone(current)], settings: learning, availability: { available: true } }),
      inspectCandidate: async (_id, candidateId) => ({ experimentId: current.id, candidateId, sourceHash: candidateId === 'python-candidate' ? 'python-hash' : 'node-hash', project: { ...project, title: candidateId } }),
      candidateArtifacts: async (_id, candidateId) => [{ path: candidateId === 'python-candidate' ? 'app.py' : 'app.mjs', size: 100 }],
      readCandidateArtifact: async (_id, candidateId) => 'Synthetic artifact for ' + candidateId,
      previewCandidate: async (_id, candidateId) => { window.experimentCalls.push({ name: 'previewCandidate', args: [_id, candidateId] }); return 'data:text/html,<h1>Preview fixture</h1>'; },
      selectCandidate: async (...args) => { window.experimentCalls.push({ name: 'selectCandidate', args }); current.selectedCandidateId = args[1]; current.status = 'complete'; project.experiment = structuredClone(current); return current; },
      submitExperimentPreference: async (...args) => { window.experimentCalls.push({ name: 'submitExperimentPreference', args }); current.preferenceRequest.status = 'answered'; return current; },
      skipExperimentPreference: async (...args) => { window.experimentCalls.push({ name: 'skipExperimentPreference', args }); current.preferenceRequest.status = 'skipped'; return current; },
      saveLearningSettings: async value => { learning = value; window.experimentCalls.push({ name: 'saveLearningSettings', args: [value] }); return value; },
      integrationOperations: async () => operations,
      saveIntegrationOperation: async (...args) => { window.experimentCalls.push({ name: 'saveIntegrationOperation', args }); operations = [args[0]]; return operations; },
      removeIntegrationOperation: async () => { operations = []; return []; },
    };
  }, { project, experiment, names: experimentMethodNames });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button', { name: 'Activity — agent work', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('heading', { name: 'Compare approaches', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Use candidate A', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).count(), 0, 'Retained previous evidence cannot approve an unselected candidate');
  await page.getByText('Your previous build remains saved', { exact: false }).waitFor();
  assert.equal(await page.getByText('1m 15s', { exact: true }).count(), 1, 'Presentation A is Python despite generation order');
  await page.getByRole('button', { name: 'Open candidate preview', exact: true }).click();
  assert.equal(await page.locator('.candidate-preview iframe').count(), 1);
  assert.deepEqual(await page.evaluate(() => window.experimentCalls.find(call => call.name === 'previewCandidate').args), ['comparison-1', 'python-candidate']);
  const b = page.getByRole('button', { name: 'Candidate B Passed', exact: true });
  await b.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Use candidate B', exact: true }).waitFor();
  assert.equal(await page.locator('.candidate-preview iframe').count(), 0, 'Switching closes the previous candidate lease');
  await page.getByRole('button', { name: 'Candidate A Passed', exact: true }).click();
  await page.getByLabel('Candidate A', { exact: true }).check();
  await page.getByLabel('Ease of use', { exact: true }).check();
  await page.getByLabel('What made the difference?', { exact: false }).fill('The main workflow is easier to understand.');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, 'comparison-desktop.png'), animations: 'disabled', fullPage: false });
  await page.locator('.review-workspace').evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: path.join(output, 'comparison-overview-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 1120, height: 720 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(output, 'comparison-minimum.png'), animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await page.getByRole('button', { name: 'Save preference', exact: true }).click();
  await page.getByText('Your preference is recorded.', { exact: false }).waitFor();
  const preference = await page.evaluate(() => window.experimentCalls.find(call => call.name === 'submitExperimentPreference'));
  assert.equal(preference.args[1].choice, 'a'); assert.deepEqual(preference.args[1].reasonTags, ['Ease of use']);
  assert.equal(await page.evaluate(() => window.experimentCalls.some(call => call.name === 'selectCandidate')), false, 'Preference never selects the build');
  assert.equal(await page.getByRole('button', { name: 'Approve prototype', exact: true }).count(), 0, 'Preference alone cannot unlock approval of retained evidence');
  await page.getByRole('button', { name: 'Use candidate A', exact: true }).click();
  await page.getByRole('button', { name: 'Selected for review', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Approve prototype', exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.experimentCalls.find(call => call.name === 'selectCandidate').args), ['comparison-1', 'python-candidate', 'python-hash']);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Comparisons & learning', { exact: true }).click();
  await page.getByRole('radio', { name: 'Adaptive Use validated lessons to choose an approach.', exact: true }).check();
  await page.getByLabel('Optional feedback requests per day').selectOption('1');
  await page.getByRole('button', { name: 'Save learning settings', exact: true }).click();
  await page.getByText('External API operations', { exact: true }).click();
  await page.getByLabel('Operation name', { exact: true }).fill('document_search');
  await page.getByLabel('HTTPS origin', { exact: true }).fill('https://api.example.com');
  await page.getByLabel('Fixed path', { exact: true }).fill('/v1/search');
  await page.getByLabel('Environment name for exported source', { exact: true }).fill('DOCUMENT_API_KEY');
  await page.getByLabel('Credential', { exact: true }).fill('synthetic-test-key');
  await page.getByRole('button', { name: 'Save operation', exact: true }).click();
  assert.equal(await page.getByLabel('Credential', { exact: true }).inputValue(), '', 'Saved secret is cleared from the renderer input');
  await page.getByText('Comparisons & learning', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'learning-settings-minimum.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(output, 'learning-settings-desktop.png'), animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  for (const failure of ['finalized', 'planning-failed']) {
    await page.goto(url + '?comparison=' + failure);
    await page.getByRole('button', { name: 'Activity — agent work', exact: true }).click();
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await page.getByText('Needs attention', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Resume comparison', exact: true }).count(), failure === 'finalized' ? 0 : 1, 'Only incomplete candidate execution is resumable');
    if (failure === 'finalized') await page.getByText('All candidate outcomes are final.', { exact: false }).waitFor();
  }
  assert.deepEqual(errors, []);
  console.log('Experiment UI smoke passed: stable mapping, keyboard access, preview lease, independent feedback/selection, retained evidence approval guard, resumable states, settings, encrypted credential handoff. Screenshots: ' + output);
} finally { await browser?.close(); await server.close(); }
