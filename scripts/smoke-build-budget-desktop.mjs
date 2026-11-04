import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { stageDefinitions } from '../dist-electron/shared/types.js';
import { startFixtureProvider } from './mock-provider.mjs';

// Actual desktop IPC, storage and Pi lifecycle against a loopback-only provider.
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-build-budget-desktop-'));
const piDir = path.join(root, 'pi'), stateDir = path.join(root, 'state');
const output = path.resolve('output/playwright/build-budget-desktop');
await Promise.all([fs.mkdir(piDir), fs.mkdir(stateDir), fs.mkdir(output, { recursive: true })]);
const fixture = await startFixtureProvider();
fixture.setDelay(100);
await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: { 'fleet-fixture': {
  baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only', models: [{
    id: 'fixture-model', name: 'Local budget fixture', reasoning: false, input: ['text'], contextWindow: 64000, maxTokens: 8000,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  }]
} } }));
const time = new Date().toISOString();
const legacy = { id: 'legacy-budget-build', runId: 'legacy-run', title: 'Legacy build', description: 'Earlier build without usage accounting.', criteria: [], createdAt: time, updatedAt: time, status: 'stopped', stages: structuredClone(stageDefinitions), logs: [], feedback: '' };
await fs.writeFile(path.join(stateDir, 'state.json'), JSON.stringify({ version: 1, projects: [legacy], settings: { provider: '', model: '', rememberKey: false } }));
const errors = [];
const environment = { ...process.env, FLEET_USER_DATA: stateDir, PI_CODING_AGENT_DIR: piDir, VITE_DEV_SERVER_URL: '' };
let app;
async function open() {
  app = await electron.launch({ args: ['.'], env: environment, timeout: 45_000 });
  const page = await app.firstWindow();
  page.setDefaultTimeout(15_000);
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('.app-shell').waitFor({ timeout: 45_000 });
  return page;
}
try {
  let page = await open();
  await page.getByRole('button', { name: 'Flow — build pipeline', exact: true }).click();
  await page.getByText('Time and usage were not recorded for this earlier build.', { exact: true }).waitFor();
  const legacySaved = await page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(project => project.id === id), legacy.id);
  assert.equal(legacySaved.runSummary, undefined);

  await page.getByRole('button', { name: 'Model settings', exact: true }).click();
  await page.getByRole('radio', { name: 'Pi Model providers' }).check();
  await page.getByLabel('Provider', { exact: true }).selectOption('fleet-fixture');
  const limit = page.getByRole('spinbutton', { name: 'Whole-build time limit (minutes)', exact: true });
  assert.equal(await limit.inputValue(), '60');
  await limit.fill('1');
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Model settings saved.', { exact: true }).waitFor();
  const settings = (await page.evaluate(() => window.fleetHarness.bootstrap())).state.settings;
  assert.equal(settings.buildTimeLimitMinutes, 1);
  for (const invalid of [0, 181, 1.5]) {
    await assert.rejects(page.evaluate(settings => window.fleetHarness.saveSettings(settings), { ...settings, buildTimeLimitMinutes: invalid }), /whole number from 1 to 180/);
  }
  assert.equal((await page.evaluate(() => window.fleetHarness.bootstrap())).state.settings.buildTimeLimitMinutes, 1);
  await page.reload();
  await page.locator('.app-shell').waitFor();
  assert.equal((await page.evaluate(() => window.fleetHarness.bootstrap())).state.settings.buildTimeLimitMinutes, 1);

  const project = await page.evaluate(() => window.fleetHarness.createProject({ title: 'Whole-build budget desktop fixture', description: 'Parse synthetic task messages locally and preserve the output across reloads.', criteria: ['Extract a task from TASK: inspect pump.'] }));
  await page.getByRole('button', { name: 'Flow — build pipeline', exact: true }).click();
  await page.getByRole('combobox', { name: 'Current challenge', exact: true }).selectOption(project.id);
  await page.getByRole('button', { name: 'Start build', exact: true }).first().click();
  await page.getByText('1-minute whole-build limit.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Run Pi agents', exact: true }).click();
  const summary = page.locator('.run-budget-status > summary');
  await summary.waitFor();
  assert.match(await summary.innerText(), /1 min limit/);
  await page.screenshot({ path: path.join(output, 'running.png'), scale: 'css' });
  await page.locator('.run-header .badge.review, .run-header .badge.failed, .run-header .badge.stopped').waitFor({ timeout: 70_000 });
  // Stop awaits terminal persistence even if a renderer update arrived during finalization.
  await page.evaluate(id => window.fleetHarness.stopRun(id), project.id);
  const final = await page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(project => project.id === id), project.id);
  await fs.writeFile(path.join(output, 'fixture-run.json'), JSON.stringify(final, null, 2));
  assert.equal(final.status, 'review', final.error);
  assert.equal(final.runSummary.timeLimitMs, 60_000);
  assert.equal(final.runSummary.terminalReason, 'completed');
  assert.ok(final.runSummary.elapsedMs > 0 && final.runSummary.elapsedMs < 60_000);
  assert.equal(Date.parse(final.runSummary.deadlineAt) - Date.parse(final.runSummary.startedAt), 60_000);
  assert.ok(final.runSummary.phases.some(phase => phase.id === 'setup'));
  assert.ok(final.runSummary.phases.some(phase => phase.id === 'repair'));
  assert.ok(final.runSummary.phases.every(phase => phase.finishedAt && phase.durationMs >= 0));
  assert.ok(final.runSummary.usage.prompts >= 7);
  assert.equal(final.runSummary.usage.phases.find(phase => phase.phase === 'repair').prompts, 1);
  assert.ok(final.runSummary.usage.requests.value > 0);
  assert.equal(final.runSummary.usage.requests.state, 'partial');
  assert.equal(final.runSummary.usage.tokens.value, null, 'The mock provider intentionally omits usage');
  assert.equal(final.runSummary.usage.tokens.state, 'unavailable');
  assert.equal(final.runSummary.usage.costUsd.value, null, 'An unpriced fixture must not become a measured free build');
  const runSummaryFile = JSON.parse(await fs.readFile(path.join(final.workspace, 'run-summary.json'), 'utf8'));
  assert.deepEqual(runSummaryFile, final.runSummary);
  const saved = JSON.parse(await fs.readFile(path.join(stateDir, 'state.json'), 'utf8'));
  assert.deepEqual(saved.projects.find(item => item.id === final.id).runSummary, final.runSummary);
  await summary.click();
  await page.getByText('Observed model responses', { exact: true }).waitFor();
  assert.equal(await page.locator('.run-budget-token-summary').textContent(), 'Tokens: Unavailable');
  await page.screenshot({ path: path.join(output, 'completed.png'), scale: 'css' });

  await app.close(); app = undefined;
  page = await open();
  const restarted = await page.evaluate(() => window.fleetHarness.bootstrap());
  assert.equal(restarted.state.settings.buildTimeLimitMinutes, 1);
  assert.deepEqual(restarted.state.projects.find(item => item.id === final.id).runSummary, final.runSummary);
  assert.equal(restarted.state.projects.find(item => item.id === legacy.id).runSummary, undefined);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, actualDesktopIPC: true, savedSettings: true, invalidBudgetsRejected: true, fullLocalBuild: true, repairSharedDeadline: true, missingUsagePreserved: true, summaryFile: true, restartPersistence: true, legacyCompatibility: true, localRequests: fixture.requests.length, rendererErrors: errors.length, screenshots: output }, null, 2));
} finally {
  await app?.close();
  await fixture.close();
  const resolved = path.resolve(root);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('fleet-build-budget-desktop-')) throw new Error('Refusing to remove an unexpected test directory.');
  await fs.rm(resolved, { recursive: true, force: true, maxRetries: 3 });
}
