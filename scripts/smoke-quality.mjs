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
const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 }, reducedMotion: 'reduce' });
  await context.addInitScript(state => {
    let current = state; const listeners = new Set();
    window.fleetHarness = { bootstrap: async () => ({ state: current, models: [], storagePath: 'UI fixture', credentialStatus: '', runtime: 'UI fixture' }),
      onState: listener => { listeners.add(listener); return () => listeners.delete(listener); }, preview: async () => null, artifacts: async () => [] };
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
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, browserFailureBlocksApproval: true, explicitRequirementGaps: true, missingQualityBlocksApproval: true, screenshots: output }));
} finally { await browser?.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
