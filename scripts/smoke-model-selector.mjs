import { _electron as electron, chromium } from 'playwright';
import { preview } from 'vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { startFixtureProvider } from './mock-provider.mjs';
import { qualityFixtureProject } from './quality-fixture.mjs';
import { Store, newProject } from '../dist-electron/electron/storage.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-model-selector-'));
const store = new Store(path.join(root, 'state')); await store.init();
store.state.projects[0] = newProject(qualityFixtureProject); await store.save();
const piDir = path.join(root, 'pi');
const output = path.resolve('output/playwright/model-selector');
await fs.mkdir(piDir);
await fs.mkdir(output, { recursive: true });
const fixture = await startFixtureProvider();
const model = (id, name) => ({ id, name, reasoning: false, input: ['text'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } });
const provider = models => ({ baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only', models });
await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: {
  'fleet-fixture': provider([model('fixture-a', 'Fixture model A'), model('fixture-b', 'Fixture model B')]),
  'fleet-second': provider([model('fixture-a', 'Fixture model A via second provider')])
} }));
const value = (provider, id) => JSON.stringify([provider, id]);
const first = value('fleet-fixture', 'fixture-a');
const second = value('fleet-fixture', 'fixture-b');
const otherProvider = value('fleet-second', 'fixture-a');
const errors = [];
let app, browser, server;
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, name), scale: 'css', animations: 'disabled' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const box = await page.getByRole('combobox', { name: 'Build model', exact: true }).boundingBox();
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height);
}
try {
  app = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: piDir, VITE_DEV_SERVER_URL: '' } });
  const page = await app.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  const selector = page.getByRole('combobox', { name: 'Build model', exact: true });
  await selector.waitFor();
  assert.equal(await selector.inputValue(), '');
  await selector.selectOption('settings');
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
  await page.getByRole('radio', { name: 'Pi Model providers' }).check();
  await page.getByLabel('Provider', { exact: true }).selectOption('fleet-fixture');
  await page.getByLabel('Model', { exact: true }).selectOption('fixture-a');
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Model settings saved.', { exact: true }).waitFor();
  assert.equal(await selector.inputValue(), first);

  // A toolbar change must update an already-open Settings form.
  await selector.selectOption(second);
  await page.getByText('Model changed to Fixture model B.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Model', { exact: true }).inputValue(), 'fixture-b');
  await selector.selectOption(otherProvider);
  await page.getByText('Model changed to Fixture model A via second provider.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Provider', { exact: true }).inputValue(), 'fleet-second');
  assert.equal(await page.getByLabel('Model', { exact: true }).inputValue(), 'fixture-a');
  await selector.selectOption(second);
  await page.getByText('Model changed to Fixture model B.', { exact: true }).waitFor();
  await page.reload();
  await selector.waitFor();
  assert.equal(await selector.inputValue(), second);
  await capture(page, 'home-desktop.png');

  await page.getByRole('button', { name: 'Preview — generated app', exact: true }).click();
  const screens = ['Build', 'Preview — generated app', 'Activity — agent work', 'Review', 'Brief', 'Deliver', 'Files — artifacts', 'Settings', 'Home — challenge portfolio'];
  for (const screen of screens) {
    const navigation = ['Build', 'Review', 'Brief', 'Deliver'].includes(screen) ? page.getByRole('navigation', { name: 'Challenge progress', exact: true }) : page;
    await navigation.getByRole('button', { name: screen, exact: true }).click();
    assert.equal(await selector.isVisible(), true, screen);
    assert.equal(await selector.inputValue(), second, screen);
  }
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 720));
  await capture(page, 'home-minimum.png');
  await page.getByRole('button', { name: 'Preview — generated app', exact: true }).click();
  await page.getByRole('navigation', { name: 'Challenge progress', exact: true }).getByRole('button', { name: 'Build', exact: true }).click();
  await selector.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await selector.evaluate(element => element.matches(':focus-visible')), true);
  await capture(page, 'flow-minimum.png');

  fixture.setDelay(2000);
  const id = (await page.evaluate(() => window.fleetHarness.bootstrap())).state.projects[0].id;
  await page.getByRole('button', { name: 'Start build', exact: true }).click();
  await page.getByRole('dialog', { name: 'Start build', exact: true }).getByRole('button', { name: 'Start automatic build', exact: true }).click();
  await page.getByRole('button', { name: 'Stop build', exact: true }).waitFor();
  assert.equal(await selector.isDisabled(), true);
  assert.match(await selector.getAttribute('title'), /Stop active builds/);
  assert.equal((await page.evaluate(() => window.fleetHarness.bootstrap())).state.projects[0].model, 'fleet-fixture/fixture-b');
  await assert.rejects(page.evaluate(() => window.fleetHarness.saveSettings({ backend: 'pi', provider: 'fleet-fixture', model: 'fixture-a', rememberKey: false })), /Stop active runs/);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const developerMode = page.getByRole('switch', { name: 'Developer mode', exact: true });
  assert.equal(await developerMode.isEnabled(), true, 'Developer mode remains available during a build');
  await developerMode.click();
  await page.getByRole('switch', { name: 'Developer mode', exact: true, checked: true }).waitFor();
  assert.equal((await page.evaluate(() => window.fleetHarness.bootstrap())).state.settings.developerMode, true);
  assert.equal(await selector.isDisabled(), true, 'Changing developer mode does not unlock the build model');
  await page.evaluate(id => window.fleetHarness.stopRun(id), id);
  await page.waitForFunction(() => !document.querySelector('[aria-label="Build model"]').disabled);

  // A failed save leaves the previous model selected and reports the failure.
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('fleet:settings');
    ipcMain.handle('fleet:settings', () => { throw new Error('Fixture settings save failed.'); });
  });
  await selector.selectOption(first);
  await page.getByRole('alert').getByText('Fixture settings save failed.', { exact: true }).waitFor();
  assert.equal(await selector.inputValue(), second);
  const boot = await page.evaluate(() => window.fleetHarness.bootstrap());
  assert.equal(boot.state.settings.model, 'fixture-b');
  await app.close(); app = undefined;

  // Small browser viewport and unavailable-model states use explicit renderer fixtures.
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  browser = await chromium.launch({ channel: process.env.FLEET_BROWSER_CHANNEL || 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(boot => {
    window.fleetHarness = { bootstrap: async () => boot, onState: () => () => {} };
  }, boot);
  const mobile = await context.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await mobile.getByRole('combobox', { name: 'Build model', exact: true }).waitFor();
  await capture(mobile, 'home-mobile.png');
  await context.close();
  const disconnected = await browser.newContext();
  await disconnected.addInitScript(boot => {
    boot.models = [];
    window.fleetHarness = { bootstrap: async () => boot, onState: () => () => {} };
  }, boot);
  const empty = await disconnected.newPage();
  empty.on('pageerror', error => errors.push(error.message));
  await empty.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  const unavailable = empty.getByRole('combobox', { name: 'Build model', exact: true });
  await unavailable.waitFor();
  assert.match(await unavailable.locator('option:checked').textContent(), /fixture-b · not connected/);
  await unavailable.selectOption('settings');
  await empty.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, allScreens: screens.length, modelAndProviderSwitching: true, settingsSync: true, persistence: true, keyboardFocus: true, runningBuildLock: true, developerModeDuringBuild: true, failedSavePreservesModel: true, unavailableModelSetup: true, rendererErrors: 0, screenshots: output }, null, 2));
} finally {
  await app?.close(); await browser?.close(); await server?.close(); await fixture.close();
  await fs.rm(root, { recursive: true, force: true });
}
