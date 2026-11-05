import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Serve current source so this check cannot accidentally pass against stale dist files.
const output = path.resolve('output/playwright/token-usage');
await fs.mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0, strictPort: false } });
await server.listen();
const { stageDefinitions } = await server.ssrLoadModule('/shared/types.ts');
const time = '2026-11-05T18:00:00.000Z';
const totals = (inputTokens, outputTokens, cachedInputTokens = 0) => ({ inputTokens, outputTokens, cachedInputTokens, totalTokens: inputTokens + outputTokens });
const session = (id, source, counts, runId) => ({ id, source, model: 'fixture', startedAt: time, updatedAt: time, ...(counts && { totals: counts }), ...(runId && { runId }) });
const usage = sessions => ({ version: 1, startedAt: time, sessions });
const project = (id, title, tokenUsage, extra = {}) => ({ id, title, description: 'Synthetic token usage smoke fixture.', criteria: ['Preserve recorded usage.'],
  status: 'draft', createdAt: time, updatedAt: time, stages: structuredClone(stageDefinitions), logs: [], feedback: '', tokenUsage, ...extra });
// Deliberately unsorted; previous runs, a project lead and an archived project all contribute.
const projects = [
  project('zero', 'Zero reported', usage([session('zero-session', 'build', totals(0, 0))])),
  project('archive', 'Archived scheduler', usage([session('archive-session', 'build', totals(30_000, 2_000, 10_000))]), { archivedAt: time }),
  project('pending', 'Awaiting provider', usage([session('pending-session', 'build')])),
  project('parser', 'Message parser', usage([
    session('parser-old', 'build', totals(60_000, 10_000, 25_000), 'previous-run'),
    session('parser-current', 'build', totals(37_000, 12_000, 15_000), 'current-run'),
    session('parser-lead', 'conversation', totals(3_000, 1_456), 'current-run'),
  ]), { runId: 'current-run' }),
  project('legacy', 'Legacy brief'),
];
let browser, page;
const errors = [];
try {
  browser = await chromium.launch({ headless: true, channel: process.env.FLEET_BROWSER_CHANNEL || 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1512, height: 982 }, locale: 'en-US', reducedMotion: 'reduce' });
  await context.addInitScript(({ projects }) => {
    const listeners = new Set();
    const state = { version: 1, settings: { backend: 'pi', provider: 'fixture', model: 'fixture', rememberKey: false }, projects: structuredClone(projects) };
    const models = [{ id: 'fixture', provider: 'fixture', backend: 'pi', name: 'Fixture model', configured: true }];
    window.setTokenUsageFixture = mode => {
      state.projects = structuredClone(projects);
      if (mode === 'live') {
        const current = state.projects.find(item => item.id === 'parser').tokenUsage.sessions.find(item => item.id === 'parser-current');
        current.totals = { inputTokens: 42_000, outputTokens: 14_000, cachedInputTokens: 17_000, totalTokens: 56_000 };
        current.updatedAt = '2026-11-05T18:01:00.000Z';
      } else if (mode === 'unknown') {
        state.projects = state.projects.filter(item => item.id === 'pending' || item.id === 'legacy');
      } else if (mode === 'zero') {
        state.projects = state.projects.filter(item => item.id === 'zero');
      } else if (mode === 'empty') {
        state.projects = [];
      }
      for (const listener of listeners) listener(structuredClone(state));
    };
    window.fleetHarness = {
      bootstrap: async () => ({ state: structuredClone(state), models, storagePath: 'Synthetic UI fixture', credentialStatus: 'Fixture only', runtime: 'Fixture only', capabilities: { projectConversation: false, experiments: false } }),
      onState: listener => { listeners.add(listener); return () => listeners.delete(listener); },
      preview: async () => null,
      artifacts: async () => [],
    };
  }, { projects });
  page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  const trigger = page.getByRole('button', { name: /^Token usage:/ });
  const panel = page.getByRole('dialog', { name: 'Token usage', exact: true });
  const rows = panel.locator('.token-project');
  const row = title => rows.filter({ has: page.locator('.token-project-title', { hasText: title }) });
  const definition = (scope, label) => scope.locator('dl > div').filter({ has: page.locator('dt', { hasText: label }) }).locator('dd');
  const expectText = async (locator, expected) => assert.equal((await locator.innerText()).trim(), expected);
  const waitForTotal = async total => {
    await page.getByRole('button', { name: `Token usage: ${total} tokens recorded. Show workspace breakdown`, exact: true }).waitFor();
    await expectText(panel.locator('.token-total strong'), total);
  };
  async function assertInsideViewport(locator, description) {
    const box = await locator.boundingBox();
    const viewport = page.viewportSize();
    assert.ok(box && box.width > 0 && box.height > 0 && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1,
      `${description} must fit inside ${viewport.width}×${viewport.height}: ${JSON.stringify(box)}`);
  }
  async function capture(name, viewport) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await assertInsideViewport(trigger, 'Token trigger');
    await assertInsideViewport(panel, 'Token panel');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'The token control must not cause horizontal page overflow');
    assert.equal(await panel.evaluate(element => element.scrollWidth > element.clientWidth), false, 'The token panel must not clip its content horizontally');
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled', scale: 'css' });
  }
  async function assertShares(expected) {
    const actual = await rows.evaluateAll(elements => elements.map(element => {
      const track = element.querySelector('.token-project-track');
      return track.firstElementChild.getBoundingClientRect().width / track.getBoundingClientRect().width;
    }));
    assert.equal(actual.length, expected.length);
    actual.forEach((share, index) => assert.ok(Math.abs(share - expected[index]) < 0.002, `Project ${index} share ${share} differs from ${expected[index]}`));
  }

  // The top-bar control is keyboard reachable, opens a named dialog, and exposes exact usage.
  await trigger.focus();
  await page.keyboard.press('Enter');
  await panel.waitFor({ state: 'visible' });
  await waitForTotal('155,456');
  assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
  await panel.getByRole('img', { name: '130,000 input tokens and 25,456 output tokens', exact: true }).waitFor();
  assert.deepEqual(await rows.locator('.token-project-title').allInnerTexts(), ['Message parser', 'Archived scheduler\nArchived', 'Awaiting provider', 'Legacy brief', 'Zero reported']);
  assert.deepEqual(await rows.locator('.token-project-count').allInnerTexts(), ['123,456', '32,000', 'Not recorded', 'Not recorded', '0']);
  await assertShares([123_456 / 155_456, 32_000 / 155_456, 0, 0, 0]);
  await panel.getByText('Some sessions haven’t reported usage. The total includes reported tokens only.', { exact: true }).waitFor();

  // Per-project details distinguish cache from extra tokens and preserve previous-run totals.
  await row('Message parser').locator('summary').focus();
  await page.keyboard.press('Enter');
  await expectText(definition(row('Message parser'), /^Input/), '100,000');
  await expectText(definition(row('Message parser'), /^Output$/), '23,456');
  await expectText(definition(row('Message parser'), /^Cached input$/), '40,000');
  await expectText(definition(row('Message parser'), /^Current run/), '53,456');
  await expectText(definition(row('Message parser'), /^Project lead/), '4,456');

  // An onState notification changes the open panel, exact counter and proportional bars.
  await page.evaluate(() => window.setTokenUsageFixture('live'));
  await waitForTotal('162,456');
  await expectText(row('Message parser').locator('.token-project-count'), '130,456');
  await expectText(definition(row('Message parser'), /^Input/), '105,000');
  await expectText(definition(row('Message parser'), /^Output$/), '25,456');
  await expectText(definition(row('Message parser'), /^Cached input$/), '42,000');
  await expectText(definition(row('Message parser'), /^Current run/), '60,456');
  await expectText(definition(row('Message parser'), /^Project lead/), '4,456');
  await panel.getByRole('img', { name: '135,000 input tokens and 27,456 output tokens', exact: true }).waitFor();
  await assertShares([130_456 / 162_456, 32_000 / 162_456, 0, 0, 0]);
  await capture('desktop', { width: 1512, height: 982 });
  await capture('minimum', { width: 1120, height: 720 });
  await capture('mobile', { width: 390, height: 844 });
  await panel.locator('.token-footnote').scrollIntoViewIfNeeded();
  await assertInsideViewport(panel.locator('.token-footnote'), 'Panel footer after scrolling');
  await row('Awaiting provider').locator('summary').click();
  await row('Awaiting provider').getByText('Waiting for usage from 1 session.', { exact: true }).waitFor();

  // Escape and the explicit close control restore focus to the trigger.
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'hidden' });
  assert.equal(await trigger.evaluate(element => document.activeElement === element), true, 'Escape must restore trigger focus');
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  await page.keyboard.press('Enter');
  await panel.getByRole('button', { name: 'Close token usage', exact: true }).click();
  await panel.waitFor({ state: 'hidden' });
  assert.equal(await trigger.evaluate(element => document.activeElement === element), true, 'Close must restore trigger focus');
  await page.keyboard.press('Enter');
  await panel.waitFor({ state: 'visible' });

  // Missing reports are unknown, while a provider's recorded zero is an actual zero.
  await page.evaluate(() => window.setTokenUsageFixture('unknown'));
  await page.getByRole('button', { name: 'Token usage: no usage recorded. Show workspace breakdown', exact: true }).waitFor();
  await panel.getByText('No usage recorded yet', { exact: true }).waitFor();
  assert.deepEqual(await rows.locator('.token-project-count').allInnerTexts(), ['Not recorded', 'Not recorded']);
  await capture('unreported', { width: 1512, height: 982 });
  await page.evaluate(() => window.setTokenUsageFixture('zero'));
  await waitForTotal('0');
  await expectText(row('Zero reported').locator('.token-project-count'), '0');
  assert.equal(await panel.getByText('No usage recorded yet', { exact: true }).count(), 0);
  await assertShares([0]);
  await page.evaluate(() => window.setTokenUsageFixture('empty'));
  await panel.getByText('No usage recorded yet', { exact: true }).waitFor();
  assert.equal(await rows.count(), 0);
  await capture('empty', { width: 1512, height: 982 });
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('Token usage smoke passed: workspace totals, live updates, cached/input/output counts, project shares, archived projects, unknown/zero states, keyboard focus and three viewport sizes. Screenshots: ' + output);
} catch (error) {
  await page?.screenshot({ path: path.join(output, 'failure.png'), animations: 'disabled' }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
