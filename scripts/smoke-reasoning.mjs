import { _electron as electron, chromium } from 'playwright';
import { preview } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { startFixtureProvider } from './mock-provider.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-reasoning-'));
const piDir = path.join(root, 'pi');
const output = path.resolve('output/playwright/reasoning');
const review = path.resolve('.impeccable/review/reasoning');
await fs.mkdir(piDir);
await fs.mkdir(output, { recursive: true });
await fs.mkdir(review, { recursive: true });
const fixture = await startFixtureProvider();
const model = (id, name, reasoning, extra = {}) => ({ id, name, reasoning, input: ['text', 'image'],
  contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  compat: { supportsReasoningEffort: true, thinkingFormat: 'openai' }, ...extra });
await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: {
  'fleet-fixture': { baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only', models: [
    model('reasoning-model', 'Reasoning fixture', true),
    model('limited-model', 'Limited reasoning fixture', true, { thinkingLevelMap: { high: null } }),
    model('plain-model', 'Plain fixture', false)
  ] }
} }));
const value = id => JSON.stringify(['fleet-fixture', id]);
const errors = [];
let app, browser, server;
const slider = page => page.getByRole('slider', { name: 'Reasoning effort', exact: true });
const selector = page => page.getByRole('combobox', { name: 'Build model', exact: true });
async function saved(page, effort) {
  await page.waitForFunction(async expected => (await window.fleetHarness.bootstrap()).state.settings.reasoningEffort === expected, effort);
  await page.waitForFunction(() => !document.querySelector('[aria-label="Build model"]').disabled);
}
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, name), scale: 'css', animations: 'disabled' });
  await fs.copyFile(path.join(output, name), path.join(review, name));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: no horizontal overflow`);
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  const boxes = await Promise.all([selector(page), slider(page)].map(control => control.boundingBox()));
  for (const box of boxes) assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height, `${name}: controls fit the viewport`);
  const [modelBox, effortBox] = boxes;
  assert.ok(modelBox.x + modelBox.width <= effortBox.x || effortBox.x + effortBox.width <= modelBox.x
    || modelBox.y + modelBox.height <= effortBox.y || effortBox.y + effortBox.height <= modelBox.y, `${name}: controls do not overlap`);
}

try {
  app = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: piDir, VITE_DEV_SERVER_URL: '' } });
  const page = await app.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  await slider(page).waitFor();
  assert.equal(await slider(page).isDisabled(), true, 'unconfigured models cannot adjust reasoning');
  await page.evaluate(() => window.fleetHarness.saveSettings({ backend: 'pi', provider: 'fleet-fixture', model: 'reasoning-model', rememberKey: false }));
  await page.reload();
  await slider(page).waitFor();
  assert.equal(await slider(page).isEnabled(), true);
  assert.equal(await slider(page).getAttribute('aria-valuetext'), 'Medium');

  // Native keyboard navigation saves a real preference that survives reload.
  await slider(page).press('End');
  await saved(page, 'high');
  assert.equal(await slider(page).getAttribute('aria-valuetext'), 'High');
  await page.reload();
  await slider(page).waitFor();
  assert.equal(await slider(page).getAttribute('aria-valuetext'), 'High');
  await slider(page).press('ArrowLeft');
  await saved(page, 'medium');
  await slider(page).press('Home');
  await saved(page, 'none');
  assert.equal(await slider(page).getAttribute('aria-valuetext'), 'Off');

  // Pointer release commits the selected stop, using the same persistence path.
  const track = await slider(page).boundingBox();
  assert.ok(track);
  await page.mouse.click(track.x + track.width - 4, track.y + track.height / 2);
  await saved(page, 'high');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1512, 982));
  await capture(page, 'desktop1512.png');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1120, 720));
  await selector(page).focus();
  await page.keyboard.press('Tab');
  assert.equal(await slider(page).evaluate(element => element.matches(':focus-visible')), true, 'reasoning follows the model in keyboard order');
  await capture(page, 'minimum1120.png');

  // Changing model must reconcile the previous level with its actual capabilities.
  await selector(page).selectOption(value('limited-model'));
  await saved(page, 'medium');
  assert.equal(await slider(page).getAttribute('aria-valuetext'), 'Medium');
  assert.equal(await slider(page).getAttribute('max'), '3');
  await selector(page).selectOption(value('plain-model'));
  await saved(page, undefined);
  assert.equal(await slider(page).isDisabled(), true);
  assert.equal(await slider(page).getAttribute('aria-valuetext'), 'Off');
  await selector(page).selectOption(value('reasoning-model'));
  await page.waitForFunction(expected => document.querySelector('[aria-label="Build model"]').value === expected, value('reasoning-model'));
  await saved(page, undefined);
  assert.equal(await slider(page).getAttribute('aria-valuetext'), 'Medium');
  await slider(page).press('End');
  await saved(page, 'high');

  // A real Pi SDK request proves the visible setting reaches the provider.
  fixture.setDelay(2000);
  const boot = await page.evaluate(() => window.fleetHarness.bootstrap());
  const projectId = boot.state.projects[0].id;
  await page.evaluate(id => window.fleetHarness.startRun(id), projectId);
  await page.waitForFunction(() => document.querySelector('[aria-label="Reasoning effort"]').disabled);
  assert.equal(await selector(page).isDisabled(), true);
  await assert.rejects(page.evaluate(() => window.fleetHarness.saveSettings({ backend: 'pi', provider: 'fleet-fixture', model: 'reasoning-model', rememberKey: false, reasoningEffort: 'low' })), /Stop active (runs|builds)/i);
  const deadline = Date.now() + 10_000;
  while (!fixture.requests.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(fixture.requests.length, 'the SDK must reach the local provider');
  assert.equal(fixture.requests[0].reasoning_effort, 'high');
  await page.evaluate(id => window.fleetHarness.stopRun(id), projectId);
  await saved(page, 'high');

  // A pending save locks both controls, and a rejected save restores the old stop.
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('fleet:settings');
    ipcMain.handle('fleet:settings', async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      throw new Error('Fixture reasoning save failed.');
    });
  });
  await slider(page).press('ArrowLeft');
  assert.equal(await slider(page).isDisabled(), true);
  assert.equal(await selector(page).isDisabled(), true);
  await page.getByRole('alert').getByText('Fixture reasoning save failed.', { exact: true }).waitFor();
  assert.equal(await slider(page).getAttribute('aria-valuetext'), 'High');
  assert.equal((await page.evaluate(() => window.fleetHarness.bootstrap())).state.settings.reasoningEffort, 'high');
  await app.close(); app = undefined;

  // Explicit renderer fixtures allow the small viewport and disconnected states.
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  browser = await chromium.launch({ channel: process.env.FLEET_BROWSER_CHANNEL || 'chrome', headless: true });
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(boot => {
    window.fleetHarness = { bootstrap: async () => boot, onState: () => () => {},
      saveSettings: async settings => { boot.state.settings = settings; return boot; } };
  }, boot);
  const mobile = await context.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(url);
  await slider(mobile).waitFor();
  await slider(mobile).press('ArrowLeft');
  await saved(mobile, 'medium');
  await capture(mobile, 'mobile390.png');
  await context.close();
  const disconnected = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await disconnected.addInitScript(boot => {
    boot.models = [];
    window.fleetHarness = { bootstrap: async () => boot, onState: () => () => {} };
  }, boot);
  const empty = await disconnected.newPage();
  empty.on('pageerror', error => errors.push(error.message));
  await empty.goto(url);
  await slider(empty).waitFor();
  assert.equal(await slider(empty).isDisabled(), true);
  assert.equal(await slider(empty).getAttribute('aria-valuetext'), 'Model default');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, keyboardAndPointer: true, persistence: true, modelCapabilityFallback: true,
    nonReasoningAndMissingModel: true, pendingAndRunningLock: true, failedSaveRestoresEffort: true,
    providerRequestEffort: fixture.requests[0].reasoning_effort, rendererErrors: 0, screenshots: output, review }, null, 2));
} finally {
  await app?.close(); await browser?.close(); await server?.close(); await fixture.close();
  await fs.rm(root, { recursive: true, force: true });
}
