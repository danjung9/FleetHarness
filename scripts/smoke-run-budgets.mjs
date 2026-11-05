import { chromium } from 'playwright';
import { preview } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { stageDefinitions } from '../dist-electron/shared/types.js';

// Renderer-only fixtures: no credentials or model requests.
const output = path.resolve('output/playwright/run-budgets');
await fs.mkdir(output, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 0, strictPort: false } });
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
const now = Date.parse('2026-11-04T15:00:00Z');
const iso = milliseconds => new Date(milliseconds).toISOString();
const unknown = () => ({ value: null, state: 'unavailable' });
const measured = value => ({ value, state: 'measured', source: 'provider' });
const partial = value => ({ value, state: 'partial', source: 'provider' });
const project = {
  id: 'budget-fixture', runId: 'previous-run', title: 'Build budget fixture', description: 'Synthetic build for testing time and usage presentation.',
  criteria: ['Show usage honestly.'], status: 'stopped', createdAt: iso(now), updatedAt: iso(now),
  stages: structuredClone(stageDefinitions), logs: [], feedback: '', model: 'fixture/model', backend: 'pi'
};
const state = { version: 1, projects: [project], settings: { backend: 'pi', provider: 'fixture', model: 'model', rememberKey: false } };
const boot = { state, models: [{ backend: 'pi', provider: 'fixture', id: 'model', name: 'Fixture model', configured: true }], storagePath: 'Local UI fixture', credentialStatus: 'Fixture only', runtime: 'UI fixture' };
const errors = [];
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.FLEET_BROWSER_CHANNEL ? { channel: process.env.FLEET_BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  await context.addInitScript(boot => {
    let current = boot;
    const listeners = new Set();
    window.fleetHarness = {
      bootstrap: async () => structuredClone(current),
      onState: fn => { listeners.add(fn); return () => listeners.delete(fn); },
      saveSettings: async settings => {
        current.state.settings = settings;
        window.savedBudgetSettings = structuredClone(settings);
        for (const fn of listeners) fn(structuredClone(current.state));
        return structuredClone(current);
      },
      preview: async () => null, artifacts: async () => []
    };
    window.updateBudgetFixture = state => { current.state = state; for (const fn of listeners) fn(structuredClone(state)); };
  }, boot);
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  await page.clock.install({ time: new Date(now) });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button', { name: 'Model settings', exact: true }).click();
  const limit = page.getByRole('spinbutton', { name: 'Whole-build time limit (minutes)', exact: true });
  assert.equal(await limit.inputValue(), '60', 'Legacy settings must display the default limit');
  await limit.fill('0');
  assert.equal(await limit.evaluate(input => input.validity.rangeUnderflow), true);
  await limit.fill('181');
  assert.equal(await limit.evaluate(input => input.validity.rangeOverflow), true);
  await limit.fill('15.5');
  assert.equal(await limit.evaluate(input => input.validity.stepMismatch), true);
  await limit.fill('15');
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Model settings saved.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.savedBudgetSettings.buildTimeLimitMinutes), 15);
  state.settings.buildTimeLimitMinutes = 15;
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, 'settings.png'), fullPage: true });

  const flow = () => page.getByRole('button', { name: 'Flow — build pipeline', exact: true }).click();
  await flow();
  await page.getByText('Time and usage were not recorded for this earlier build.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Start new build', exact: true }).first().click();
  await page.getByText('15-minute whole-build limit.', { exact: true }).waitFor();
  assert.match(await page.getByRole('dialog').innerText(), /Human review, export and app packaging are separate/);
  await page.screenshot({ path: path.join(output, 'start.png') });
  await page.getByRole('button', { name: 'Change time limit in Settings', exact: true }).click();
  await limit.waitFor();
  assert.equal(await limit.inputValue(), '15');

  project.status = 'running';
  project.runId = 'current-run';
  project.stages[0].status = 'active';
  project.runSummary = {
    runId: project.runId, backend: 'pi', model: project.model, startedAt: iso(now), deadlineAt: iso(now + 900_000), timeLimitMs: 900_000, elapsedMs: 0,
    phases: [{ id: 'setup', label: 'Setup', startedAt: iso(now), durationMs: 0 }],
    usage: { version: 1, backend: 'pi', prompts: 1, requests: unknown(), tokens: unknown(), inputTokens: unknown(), outputTokens: unknown(), cachedInputTokens: unknown(), cacheWriteTokens: unknown(), reasoningTokens: unknown(), costUsd: unknown(), phases: [], limitations: ['Transport retries may be missing from observed requests.'] }
  };
  await page.evaluate(state => window.updateBudgetFixture(state), state);
  await page.waitForFunction(() => document.querySelector('#build-time-limit').disabled);
  assert.equal(await limit.isDisabled(), true, 'Active builds cannot change their limit');
  await flow();
  const disclosure = page.locator('.run-budget-status');
  const status = disclosure.locator(':scope > summary > strong');
  await status.waitFor();
  const before = await status.textContent();
  await page.clock.fastForward(2000);
  assert.notEqual(await status.textContent(), before, 'Remaining time must tick without backend events');
  assert.match(await status.textContent(), /left$/);
  assert.equal(await disclosure.locator('.run-budget-token-summary').textContent(), 'Tokens: Unavailable');
  await disclosure.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await disclosure.locator('.run-budget-details').waitFor();
  assert.equal(await disclosure.getByText('Observed model responses', { exact: true }).locator('..').innerText(), 'Observed model responses\nUnavailable');
  assert.equal(await disclosure.getByText('Cost', { exact: true }).locator('..').innerText(), 'Cost\nUnavailable');
  await page.screenshot({ path: path.join(output, 'running.png') });

  project.status = 'stopped';
  project.error = 'Whole-build time budget exhausted. Artifacts and usage are saved.';
  project.stages[0].status = 'failed';
  Object.assign(project.runSummary, { elapsedMs: 900_000, finishedAt: iso(now + 900_000), terminalReason: 'time_budget_exhausted' });
  project.runSummary.phases = [{ id: 'intake', label: 'Intake', startedAt: iso(now), durationMs: 900_000, finishedAt: iso(now + 900_000) }];
  Object.assign(project.runSummary.usage, { prompts: 3, requests: partial(4), tokens: partial(1500), inputTokens: measured(1000), outputTokens: measured(500), cachedInputTokens: measured(100), costUsd: { value: 0.0024, state: 'estimated', source: 'catalog' } });
  await page.evaluate(state => window.updateBudgetFixture(state), state);
  await page.getByText('Time budget exhausted', { exact: true }).waitFor();
  assert.equal(await status.textContent(), 'Time budget exhausted');
  assert.match(await disclosure.locator('.run-budget-token-summary').textContent(), /1,500 \(partial\)/);
  assert.match(await disclosure.getByText('Cost', { exact: true }).locator('..').innerText(), /\$0\.0024 \(catalog estimate\)/);
  const finalTime = await disclosure.getByText('Build time', { exact: true }).locator('..').innerText();
  await page.clock.fastForward(60_000);
  assert.equal(await disclosure.getByText('Build time', { exact: true }).locator('..').innerText(), finalTime, 'Terminal time must stop ticking');
  await page.screenshot({ path: path.join(output, 'exhausted.png') });

  project.runSummary.usage.costUsd = { value: 0.003, state: 'partial', source: 'mixed' };
  await page.evaluate(state => window.updateBudgetFixture(state), state);
  await disclosure.getByText('$0.003 (partial; includes estimates)', { exact: true }).waitFor();

  project.backend = 'codex';
  project.runSummary.backend = 'codex';
  Object.assign(project.runSummary.usage, { backend: 'codex', requests: unknown(), costUsd: unknown(), limitations: ['ChatGPT subscription allowance has no per-build dollar cost.'] });
  await page.evaluate(state => window.updateBudgetFixture(state), state);
  await page.getByText('ChatGPT subscription allowance has no per-build dollar cost.', { exact: true }).waitFor();
  assert.match(await disclosure.getByText('Observed model responses', { exact: true }).locator('..').innerText(), /Unavailable/);
  assert.equal(await disclosure.getByText('Cost', { exact: true }).locator('..').innerText(), 'Cost\nUnavailable');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.move(389, 843);
  await page.clock.fastForward(1000);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await disclosure.evaluate(element => element.scrollWidth > element.clientWidth), false);
  await page.screenshot({ path: path.join(output, 'narrow.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, defaultAndSavedLimit: true, validation: true, startDisclosure: true, liveCountdown: true, finalTimeFrozen: true, partialAndMissingUsage: true, subscriptionCostUnavailable: true, legacyRun: true, keyboardDisclosure: true, narrowLayout: true, screenshots: output }, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
