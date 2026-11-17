import { chromium } from 'playwright';
import { preview } from 'vite';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('output/playwright/model-connections');
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  const connection = { address: 'https://api.genai.mil/v1', hasKey: false, connected: false, models: [] };
  const data = { state: { version: 1, projects: [], settings: { backend: 'opencode', provider: '', model: '', rememberKey: false } },
    models: [ { backend: 'opencode', provider: 'fixture', id: 'fixture-a', name: 'Fixture A', configured: true },
      { backend: 'opencode', provider: 'fixture', id: 'fixture-b', name: 'Fixture B', configured: true },
      { backend: 'opencode', provider: 'second-provider', id: 'other', name: 'Other model', configured: false } ],
    genAiMil: connection, chatgpt: { status: 'disconnected' }, storagePath: 'Synthetic fixture', runtime: 'AppYard', credentialStatus: 'Connect a provider' };
  let failSave = false;
  window.modelTest = { data, fail: () => { failSave = true; } };
  window.fleetHarness = {
    bootstrap: async () => structuredClone(data), onState: () => () => {},
    connectChatGPT: async () => { data.chatgpt = { status: 'connected', authType: 'chatgpt', planUsageEnabled: true, email: 'synthetic@example.test' }; data.models.push({ backend:'opencode', provider:'chatgpt', id:'chatgpt-fixture', name:'ChatGPT fixture', configured:true }); return structuredClone(data); },
    saveSettings: async settings => { if (failSave) { failSave = false; throw Error('Fixture save failed.'); } data.state.settings = settings; return structuredClone(data); },
    saveGenAiMil: async (address, key) => { connection.address = address; connection.hasKey = !!key; return structuredClone(data); },
    connectGenAiMil: async () => { connection.connected = true; connection.models = ['fixture-withtools']; return structuredClone(data); },
    clearGenAiMil: async () => { connection.connected = false; connection.hasKey = false; connection.models = []; return structuredClone(data); }
  };
});
try {
  await page.goto(server.resolvedUrls.local[0]);
  await page.getByRole('button', { name: 'Build model', exact: true }).click();
  await page.getByRole('heading', { name: 'Connect a model', exact: true }).waitFor();
  assert.equal(await page.getByRole('tab').count(), 5);
  assert.equal(await page.locator('select[aria-label="Build model"],select[aria-label="Provider"],select[aria-label="Model"]').count(), 0);
  assert.doesNotMatch(await page.locator('body').innerText(), /opencode/i);
  await page.getByRole('tab', { name: /^ChatGPT Sign/ }).click();
  const signIn = page.getByRole('button', { name: 'Continue with ChatGPT', exact: true });
  assert.ok((await signIn.getAttribute('class')).includes('siwc-continue'));
  await signIn.click();
  await page.getByRole('radio', { name: 'ChatGPT fixture chatgpt-fixture', exact:true }).check();
  await page.getByRole('button', { name:'Save model settings', exact:true }).click();
  assert.equal(await page.evaluate(() => window.modelTest.data.state.settings.backend), 'opencode');
  assert.equal(await page.evaluate(() => window.modelTest.data.state.settings.provider), 'chatgpt');
  await page.getByRole('button', { name:'Build model', exact:true }).click();
  const providerTab = page.getByRole('tab', { name: /^Provider API/ });
  await providerTab.focus(); await page.keyboard.press('ArrowLeft');
  assert.equal(await page.getByRole('tab', { name: /^GenAI.mil/ }).getAttribute('aria-selected'), 'true');
  await providerTab.click();
  await page.getByRole('radio', { name: 'fixture Connected', exact: true }).check();
  await page.getByRole('radio', { name: 'Fixture B fixture-b', exact: true }).check();
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Model settings saved.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.modelTest.data.state.settings.model), 'fixture-b');
  await page.getByRole('button', { name: 'Build model', exact: true }).click();
  await page.getByRole('radio', { name: 'Fixture A fixture-a', exact: true }).check();
  await page.evaluate(() => window.modelTest.fail());
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Fixture save failed.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.modelTest.data.state.settings.model), 'fixture-b');
  await page.getByRole('tab', { name: /^GenAI.mil/ }).click();
  await page.getByPlaceholder('GenAI.mil key', { exact: true }).fill('synthetic-ui-key');
  await page.getByRole('button', { name: 'Save and connect', exact: true }).click();
  await page.getByRole('radio', { name: 'fixture-withtools', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Use model for builds', exact: true }).click();
  assert.equal(await page.evaluate(() => window.modelTest.data.state.settings.backend), 'opencode');
  assert.equal(await page.evaluate(() => window.modelTest.data.state.settings.provider), 'genai-mil');
  await page.getByRole('button', { name: 'Build model', exact: true }).click();
  await providerTab.click();
  await page.getByRole('radio', { name: 'fixture Connected', exact: true }).check();
  await page.getByRole('heading', { name: 'Connect a model', exact: true }).scrollIntoViewIfNeeded();
  await page.evaluate(() => { for (const element of document.querySelectorAll('*')) if (element.scrollTop) element.scrollTop = 0; });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
  for (const [width,height] of [[1120,720],[390,844]]) {
    await page.setViewportSize({ width, height });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, width === 390 ? 'mobile.png' : 'compact.png'), fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log('Model connection choices, keyboard navigation, save/failure, GenAI routing, and responsive layouts passed.');
} finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
