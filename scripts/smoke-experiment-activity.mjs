import { chromium } from 'playwright';
import { createServer } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { stageDefinitions } from '../dist-electron/shared/types.js';
import { experimentMethodNames } from '../dist-electron/shared/experiments.js';

// Ordinary Run uses a detached candidate; parent artifacts remain unchanged until selection.
const output = path.resolve('output/playwright/experiment-activity'); await fs.mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: false } }); await server.listen();
const time = '2026-11-05T18:00:00Z';
const project = { id: 'ordinary-fixture', title: 'Ordinary candidate run · UI fixture', description: 'Build a local parser with independent candidate checks.', criteria: ['Keep the source text.'], status: 'draft',
  createdAt: time, updatedAt: time, stages: structuredClone(stageDefinitions), logs: [], feedback: '' };
let browser;
try {
  browser = await chromium.launch({ headless: true, channel: process.env.FLEET_BROWSER_CHANNEL || 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 }, reducedMotion: 'reduce' });
  await context.addInitScript(({ project, names, time }) => {
    const listeners = new Set();
    const state = { version: 1, settings: { backend: 'pi', provider: 'fixture', model: 'fixture', rememberKey: false }, projects: [project] };
    const settings = { schemaVersion: 1, mode: 'paired', memoryEnabled: true, automaticComparisons: true, maxHumanRequestsPerDay: 2 };
    const models = [{ id: 'fixture', provider: 'fixture', backend: 'pi', name: 'UI fixture', configured: true }];
    let current;
    const emit = () => { project.experiment = current && structuredClone(current); for (const listener of listeners) listener(structuredClone(state)); };
    window.experimentCalls = [];
    window.completeCandidateFixture = () => { current.status = 'review'; current.candidates[0].status = 'passed'; current.candidates[0].stage = 'review'; current.candidates[0].success = true; emit(); };
    const methods = Object.fromEntries(names.map(name => [name, async (...args) => { window.experimentCalls.push({ name, args }); }]));
    window.fleetHarness = {
      ...methods,
      bootstrap: async () => ({ state: structuredClone(state), models, storagePath: 'Synthetic UI fixture', credentialStatus: 'Fixture only', runtime: 'Fixture only', capabilities: { experiments: true, projectConversation: false } }),
      onState: listener => { listeners.add(listener); return () => listeners.delete(listener); }, preview: async () => null, artifacts: async () => [],
      startRun: async id => { window.experimentCalls.push({ name: 'startRun', args: [id] }); current = { id: 'ordinary-experiment', projectId: id, mode: 'single', status: 'running', createdAt: time, updatedAt: time,
        candidates: [{ id: 'ordinary-candidate', profileId: 'node-cli', profileVersion: '1', baseline: true, status: 'running', stage: 'build', success: null }] }; emit(); },
      stopRun: async id => { window.experimentCalls.push({ name: 'stopRun', args: [id] }); current.status = 'stopped'; current.candidates[0].status = 'stopped'; emit(); },
      resumeExperiment: async id => { window.experimentCalls.push({ name: 'resumeExperiment', args: [id] }); current.status = 'running'; current.candidates[0].status = 'running'; emit(); return structuredClone(current); },
      experimentState: async () => ({ experiments: current ? [structuredClone(current)] : [], settings, availability: { available: true } }),
      inspectCandidate: async (_id, candidateId) => ({ experimentId: current.id, candidateId, sourceHash: current.status === 'review' ? 'verified-source' : undefined,
        project: { ...project, id: candidateId, status: current.status === 'running' ? 'running' : current.status === 'stopped' ? 'stopped' : 'review',
          logs: [{ id: 'candidate-log', kind: 'text', stage: 'build', time, text: 'Implementing source-preserving parsing in the candidate workspace.' }] } }),
      candidateArtifacts: async () => [], integrationOperations: async () => [],
      selectCandidate: async (...args) => { window.experimentCalls.push({ name: 'selectCandidate', args }); current.selectedCandidateId = args[1]; current.status = 'complete'; emit(); return structuredClone(current); },
    };
  }, { project, names: experimentMethodNames, time });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.getByRole('button', { name: 'Activity — agent work', exact: true }).click();
  await page.getByRole('button', { name: 'Start build', exact: true }).click();
  await page.getByRole('button', { name: 'Start automatic build', exact: true }).click();
  await page.getByRole('heading', { name: 'Candidate activity', exact: true }).waitFor();
  await page.getByText('Implementing source-preserving parsing in the candidate workspace.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Start build', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Stop build', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Activity — agent work', exact: true }).click();
  await page.getByRole('heading', { name: 'Candidate activity', exact: true }).waitFor();
  await page.mouse.move(900, 400);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, 'candidate-running-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 1120, height: 720 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(output, 'candidate-running-minimum.png'), animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('button', { name: 'Stop build', exact: true }).click();
  await page.locator('.journey-message').filter({ hasText: 'Candidate build stopped.' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Start build', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Review candidates', exact: true }).click();
  await page.getByRole('button', { name: 'Resume comparison', exact: true }).click();
  await page.getByRole('button', { name: 'Stop build', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Activity — agent work', exact: true }).click();
  await page.evaluate(() => window.completeCandidateFixture());
  await page.getByRole('button', { name: 'Review candidates', exact: true }).click();
  await page.getByRole('button', { name: 'Use candidate A', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Approve app', exact: true }).count(), 0, 'Reviewing a candidate does not approve or promote it');
  assert.equal(await page.evaluate(() => window.experimentCalls.some(call => call.name === 'selectCandidate')), false);
  await page.getByRole('button', { name: 'Use candidate A', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.experimentCalls.find(call => call.name === 'selectCandidate').args), ['ordinary-experiment', 'ordinary-candidate', 'verified-source']);
  assert.deepEqual(await page.evaluate(() => window.experimentCalls.filter(call => ['startRun', 'stopRun', 'resumeExperiment'].includes(call.name)).map(call => call.name)), ['startRun', 'stopRun', 'resumeExperiment']);
  assert.deepEqual(errors, []);
  console.log('Ordinary experimental Run smoke passed: live scoped activity, stop/resume, review discovery, explicit selection and separate approval. Screenshots: ' + output);
} finally { await browser?.close(); await server.close(); }
