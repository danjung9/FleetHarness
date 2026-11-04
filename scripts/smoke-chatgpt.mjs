import { _electron as electron, chromium } from 'playwright';
import { preview } from 'vite';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-chatgpt-ui-'));
const output = path.resolve('.impeccable/review/chatgpt'); await fs.mkdir(output, { recursive: true });
const errors = [];
let app, browser, server;
async function capture(page, name) { await page.evaluate(() => document.fonts.ready); await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await page.screenshot({ path: path.join(output, name), fullPage: false, animations: 'disabled', scale: 'css' }); }
try {
  app = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: root, VITE_DEV_SERVER_URL: '' } });
  const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
  await page.getByRole('button', { name: 'Model settings', exact: true }).click();
  await page.getByRole('heading', { name: 'ChatGPT account' }).waitFor();
  assert.equal(await page.getByRole('radio', { name: 'Codex ChatGPT subscription' }).isChecked(), true);
  await page.getByRole('radio', { name: 'Codex ChatGPT subscription' }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('radio', { name: 'Pi Model providers' }).isChecked(), true);
  await page.getByLabel('Provider', { exact: true }).waitFor();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.getByRole('radio', { name: 'Codex ChatGPT subscription' }).isChecked(), true);
  assert.equal(await page.getByRole('button', { name: 'Save model settings' }).isDisabled(), true);
  assert.equal(await page.getByLabel('Model', { exact: true }).isDisabled(), true);
  await capture(page, 'desktop-disconnected.png');
  await app.evaluate(({ shell }) => { shell.openExternal = async url => { globalThis.fleetTestAuthHost = new URL(url).hostname; }; });
  await page.getByRole('button', { name: 'Continue with ChatGPT' }).click();
  await page.getByRole('button', { name: 'Cancel sign-in' }).waitFor();
  assert.equal(await app.evaluate(() => globalThis.fleetTestAuthHost), 'auth.openai.com');
  await capture(page, 'desktop-connecting.png');
  assert.equal(await page.getByRole('radio', { name: 'Codex ChatGPT subscription' }).isDisabled(), true);
  assert.equal(await page.getByRole('radio', { name: 'Pi Model providers' }).isDisabled(), true);
  await page.getByRole('button', { name: 'Cancel sign-in' }).click();
  await page.getByRole('button', { name: 'Continue with ChatGPT' }).waitFor();
  const boot = await page.evaluate(() => window.fleetHarness.bootstrap());
  assert.equal(boot.chatgpt.status, 'disconnected');
  await assert.rejects(page.evaluate(() => window.fleetHarness.saveSettings({ backend: 'codex', provider: 'chatgpt', model: 'bad', rememberKey: false })), /Sign in with ChatGPT/);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 720));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await capture(page, 'desktop-minimum.png');
  await page.getByRole('radio', { name: 'Pi Model providers' }).check();
  await page.getByLabel('API key', { exact: false }).waitFor();
  await capture(page, 'desktop-pi.png');
  await app.close(); app = undefined;

  // Renderer-only fixture exercises authenticated UI without using anyone's subscription.
  browser = await chromium.launch({ channel: process.env.FLEET_BROWSER_CHANNEL || 'chrome', headless: true });
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  const address = server.httpServer.address();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(({ boot }) => {
    const data = structuredClone(boot);
    data.chatgpt = { status: 'connected', email: 'builder@example.test', plan: 'plus', limits: [{ label: '5-hour usage', usedPercent: 18, resetsAt: 1900000000 }] };
    data.models = [{ backend: 'codex', provider: 'chatgpt', id: 'fixture-codex', name: 'Fixture model', configured: true }];
    window.fleetHarness = {
      bootstrap: async () => structuredClone(data),
      saveSettings: async settings => { data.state.settings = settings; window.savedEngine = settings.backend; return structuredClone(data); },
      disconnectChatGPT: async () => { data.chatgpt = { status: 'disconnected' }; data.models[0].configured = false; return structuredClone(data); },
      refreshChatGPT: async () => structuredClone(data),
      onState: () => () => {}
    };
  }, { boot });
  const p = await ctx.newPage(); p.setDefaultTimeout(15000); p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://127.0.0.1:${address.port}/`);
  await p.getByRole('button', { name: 'Model settings', exact: true }).click();
  await p.getByText('builder@example.test', { exact: false }).waitFor();
  await p.getByRole('button', { name: 'Save model settings' }).click();
  await p.getByText('Model settings saved.', { exact: true }).waitFor();
  assert.equal(await p.evaluate(() => window.savedEngine), 'codex');
  await capture(p, 'desktop-connected.png');
  await p.getByRole('button', { name: 'Sign out', exact: true }).click();
  await p.getByRole('button', { name: 'Continue with ChatGPT' }).waitFor();
  assert.equal(await p.getByRole('button', { name: 'Save model settings' }).isDisabled(), true);
  await ctx.close(); await server.close(); server = undefined;
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, realCodexLoginStartedAndCancelled: true, browserOpeningIntercepted: true, authenticatedRendererFixture: true, screenshots: output, rendererErrors: errors }, null, 2));
} finally { await app?.close(); await browser?.close(); await server?.close(); await fs.rm(root, { recursive: true, force: true }); }
