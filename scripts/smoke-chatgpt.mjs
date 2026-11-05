import { _electron as electron, chromium } from 'playwright';
import { preview } from 'vite';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-chatgpt-ui-'));
const output = path.resolve('output/playwright/chatgpt'); await fs.mkdir(output, { recursive: true });
const errors = [];
let app, browser, server;
async function capture(page, name) { await page.evaluate(() => document.fonts.ready); await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await page.screenshot({ path: path.join(output, name), fullPage: false, animations: 'disabled', scale: 'css' }); }
try {
  app = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: root, VITE_DEV_SERVER_URL: '' } });
  const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('heading', { name: 'Codex account', exact: true }).waitFor();
  assert.equal(await page.getByRole('tab', { name: 'ChatGPT', exact: true }).getAttribute('aria-selected'), 'true');
  await page.getByRole('tab', { name: 'ChatGPT', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: 'API key', exact: true }).getAttribute('aria-selected'), 'true');
  await page.keyboard.press('End');
  assert.equal(await page.getByRole('tab', { name: 'Other providers', exact: true }).getAttribute('aria-selected'), 'true');
  await page.getByLabel('Provider', { exact: true }).waitFor();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.getByRole('tab', { name: 'GenAI.mil', exact: true }).getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Home');
  assert.equal(await page.getByRole('tab', { name: 'ChatGPT', exact: true }).getAttribute('aria-selected'), 'true');
  assert.equal(await page.getByRole('button', { name: 'Save model settings' }).isDisabled(), true);
  assert.equal(await page.getByLabel('Model', { exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Continue with ChatGPT' }).getAttribute('data-oai-siwc-button'), '');
  await capture(page, 'desktop-disconnected.png');
  await app.evaluate(({ shell }) => {
    globalThis.fleetTestOpenings = [];
    shell.openExternal = async value => {
      const url = new URL(value);
      globalThis.fleetTestOpenings.push({ protocol: url.protocol, host: url.hostname, path: url.pathname });
      if (url.searchParams.has('redirect_uri')) globalThis.fleetTestRedirect = url.searchParams.get('redirect_uri');
    };
  });
  await page.getByRole('button', { name: 'Continue with ChatGPT' }).click();
  await page.getByRole('button', { name: 'Cancel sign-in' }).waitFor();
  const authOpening = await app.evaluate(() => globalThis.fleetTestOpenings[0]);
  assert.equal(authOpening.protocol, 'https:');
  assert.equal(authOpening.host, 'auth.openai.com');
  const callback = new URL(await app.evaluate(() => globalThis.fleetTestRedirect));
  assert.equal(callback.protocol, 'http:');
  assert.ok(['localhost', '127.0.0.1'].includes(callback.hostname));
  // Unknown paths prove the real loopback server is listening without completing an authorization.
  const loopbackProbe = new URL('/__fleet_smoke__', callback);
  loopbackProbe.hostname = '127.0.0.1';
  assert.equal((await fetch(loopbackProbe)).status, 404);
  const connectingBoot = await page.evaluate(() => window.fleetHarness.bootstrap());
  assert.equal(connectingBoot.chatgpt.status, 'connecting');
  for (const key of Object.keys(connectingBoot.chatgpt)) assert.ok(['status', 'email', 'plan', 'error', 'activeAccountId', 'accounts', 'planUsageEnabled', 'limits'].includes(key), `Unexpected renderer account field: ${key}`);
  for (const account of connectingBoot.chatgpt.accounts ?? []) for (const key of Object.keys(account)) assert.ok(['id', 'label', 'email', 'connected'].includes(key), `Unexpected renderer registration field: ${key}`);
  assert.equal(/authUrl|access_token|refresh_token|code_verifier|code_challenge/.test(JSON.stringify(connectingBoot.chatgpt)), false);
  await page.getByRole('button', { name: 'Reopen browser' }).click();
  assert.equal(await app.evaluate(() => globalThis.fleetTestOpenings.length), 2);
  await capture(page, 'desktop-connecting.png');
  assert.equal(await page.getByRole('tab', { name: 'ChatGPT', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('tab', { name: 'Other providers', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('tab', { name: 'API key', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('tab', { name: 'GenAI.mil', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Cancel sign-in' }).click();
  await page.getByRole('button', { name: 'Cancel sign-in' }).waitFor({ state: 'hidden' });
  const boot = await page.evaluate(() => window.fleetHarness.bootstrap());
  assert.equal(boot.chatgpt.status, 'disconnected');
  await assert.rejects(fetch(loopbackProbe));
  await assert.rejects(page.evaluate(() => window.fleetHarness.selectChatGPTAccount(42)), /valid saved ChatGPT account/);
  await assert.rejects(page.evaluate(() => window.fleetHarness.connectChatGPT({ id: 'bad' })), /valid saved ChatGPT account/);
  await page.evaluate(() => window.fleetHarness.manageChatGPTUsage());
  assert.deepEqual(await app.evaluate(() => globalThis.fleetTestOpenings.at(-1)), { protocol: 'https:', host: 'chatgpt.com', path: '/settings/usage' });
  await assert.rejects(page.evaluate(() => window.fleetHarness.saveSettings({ backend: 'codex', provider: 'chatgpt', model: 'bad', rememberKey: false })), /Connect ChatGPT or an API key and select a Codex model first\./);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 720));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await capture(page, 'desktop-minimum.png');
  await page.getByRole('tab', { name: 'Other providers', exact: true }).click();
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
    const registrations = [
      { id: 'primary', label: 'Builder workspace', email: 'builder@example.test', connected: true },
      { id: 'secondary', label: 'reviewer@example.test', email: 'reviewer@example.test', connected: false },
      { id: 'identity-only', label: 'identity@example.test', email: 'identity@example.test', connected: true }
    ];
    const select = id => {
      const account = registrations.find(candidate => candidate.id === id);
      const planUsageEnabled = account.connected && id !== 'identity-only';
      data.chatgpt = { status: account.connected ? 'connected' : 'disconnected', activeAccountId: id, accounts: registrations, email: account.email, plan: account.connected ? 'plus' : undefined, planUsageEnabled };
      data.models[0].configured = planUsageEnabled;
    };
    data.models = [{ backend: 'codex', provider: 'chatgpt', id: 'fixture-codex', name: 'Fixture model', configured: true }];
    select('primary');
    window.fleetHarness = {
      bootstrap: async () => structuredClone(data),
      saveSettings: async settings => { data.state.settings = settings; window.savedEngine = settings.backend; return structuredClone(data); },
      selectChatGPTAccount: async id => { select(id); return structuredClone(data); },
      connectChatGPT: async id => { window.lastConnectedAccount = id ?? 'new'; data.chatgpt.status = 'connecting'; return structuredClone(data); },
      cancelChatGPTLogin: async () => { select(data.chatgpt.activeAccountId); return structuredClone(data); },
      reopenChatGPTLogin: async () => structuredClone(data),
      manageChatGPTUsage: async () => { window.managedUsage = true; },
      disconnectChatGPT: async () => { registrations.find(account => account.id === data.chatgpt.activeAccountId).connected = false; select(data.chatgpt.activeAccountId); return structuredClone(data); },
      refreshChatGPT: async () => structuredClone(data),
      onState: () => () => {}
    };
  }, { boot });
  const p = await ctx.newPage(); p.setDefaultTimeout(15000); p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://127.0.0.1:${address.port}/`);
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  await p.getByText('You’re using your ChatGPT plan', { exact: true }).waitFor();
  assert.equal(await p.getByRole('combobox', { name: 'Saved ChatGPT account' }).inputValue(), 'primary');
  assert.equal(await p.getByRole('option', { name: 'Builder workspace · builder@example.test', exact: true }).count(), 1);
  await p.getByRole('button', { name: 'Manage ChatGPT usage' }).click();
  assert.equal(await p.evaluate(() => window.managedUsage), true);
  await p.getByRole('button', { name: 'Save model settings' }).click();
  await p.getByText('Model settings saved.', { exact: true }).waitFor();
  assert.equal(await p.evaluate(() => window.savedEngine), 'codex');
  await capture(p, 'desktop-connected.png');
  await p.setViewportSize({ width: 1120, height: 720 });
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await capture(p, 'desktop-connected-minimum.png');
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.getByRole('combobox', { name: 'Saved ChatGPT account' }).selectOption('secondary');
  assert.equal(await p.getByRole('button', { name: 'Save model settings' }).isDisabled(), true);
  assert.equal(await p.getByRole('combobox', { name: 'Model', exact: true }).isDisabled(), true);
  await capture(p, 'desktop-saved-account.png');
  await p.getByRole('button', { name: 'Reconnect account' }).click();
  assert.equal(await p.evaluate(() => window.lastConnectedAccount), 'secondary');
  await p.getByRole('button', { name: 'Cancel sign-in' }).click();
  await p.getByRole('combobox', { name: 'Saved ChatGPT account' }).selectOption('identity-only');
  assert.equal(await p.getByRole('button', { name: 'Save model settings' }).isDisabled(), true);
  assert.equal(await p.getByRole('combobox', { name: 'Model', exact: true }).isDisabled(), true);
  await p.getByRole('button', { name: 'Enable ChatGPT plan usage' }).click();
  assert.equal(await p.evaluate(() => window.lastConnectedAccount), 'identity-only');
  await p.getByRole('button', { name: 'Cancel sign-in' }).click();
  await p.getByRole('combobox', { name: 'Saved ChatGPT account' }).selectOption('primary');
  await p.getByText('You’re using your ChatGPT plan', { exact: true }).waitFor();
  assert.equal(await p.getByRole('button', { name: 'Save model settings' }).isEnabled(), true);
  await p.getByRole('button', { name: 'Add account' }).click();
  assert.equal(await p.evaluate(() => window.lastConnectedAccount), 'new');
  await p.getByRole('button', { name: 'Cancel sign-in' }).click();
  await p.getByRole('button', { name: 'Sign out', exact: true }).click();
  await p.getByRole('button', { name: 'Reconnect account' }).waitFor();
  assert.equal(await p.getByRole('button', { name: 'Save model settings' }).isDisabled(), true);
  await ctx.close(); await server.close(); server = undefined;
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, realLoopbackLoginStartedAndCancelled: true, browserOpeningIntercepted: true, reopenAndManageUsage: true, authenticatedRendererFixture: true, savedAccountSwitchingAndReconnect: true, explicitPlanUsageRequired: true, screenshots: output, rendererErrors: errors }, null, 2));
} finally { await app?.close(); await browser?.close(); await server?.close(); await fs.rm(root, { recursive: true, force: true }); }
