import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { startFixtureProvider } from './mock-provider.mjs';
import { qualityFixtureProject } from './quality-fixture.mjs';
import { assertContext } from '../dist-electron/electron/connectors/snapshot.js';

// Run after npm run build, on a host permitted to launch Electron, Chrome,
// sandbox-exec and ps. No live model, account or data-service calls.
const output = path.resolve('output/connectors-smoke'); await fs.mkdir(output, { recursive: true });
const root = await fs.mkdtemp(path.join(output, 'run-'));
const piDir = path.join(root, 'pi'); await fs.mkdir(piDir);
const stateDir = path.join(root, 'state');
const fixture = await startFixtureProvider();
await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: { 'fleet-fixture': {
  baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
  models: [{ id: 'fixture-model', name: 'Local test fixture', reasoning: false, input: ['text'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }]
} } }));
let app;
try {
  app = await electron.launch({ args: ['.'], env: { ...process.env, FLEET_USER_DATA: stateDir, PI_CODING_AGENT_DIR: piDir }, timeout: 45_000 });
  const page = await app.firstWindow(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.locator('.app-shell').waitFor();
  await page.getByRole('button', { name: 'Connectors', exact: true }).click();
  await page.getByRole('heading', { name: 'Connectors', exact: true }).waitFor();
  assert.equal(await page.locator('.connector-card').count(), 7);
  for (const name of ['Gmail', 'Google Calendar', 'Google Drive', 'Outlook', 'Outlook Calendar', 'OneDrive', 'Your own data service']) {
    const card = page.getByRole('article', { name, exact: true });
    assert.equal(await card.getByRole('button', { name: 'Connect', exact: true }).isDisabled(), true);
    await card.getByRole('button', { name: 'Try sample data', exact: true }).click();
    await card.getByRole('heading', { name: 'Check it', exact: true }).waitFor();
    const preview = await card.locator('.connector-preview').innerText();
    assert.match(preview, /2 items ready/);
    if (name === 'Gmail' || name === 'Outlook') {
      assert.match(preview, /1 item with restricted markings was left out/);
      assert.match(preview, /ignore previous instructions/);
      assert.equal(preview.includes('Synthetic banner check'), false);
      assert.equal(preview.includes('training.desk@example.invalid'), false);
      assert.equal(preview.includes('202-555-0147'), false);
    }
    if (name === 'Your own data service') {
      assert.equal(await card.getByRole('table').count(), 2);
      assert.match(preview, /Available training seats/);
    }
    await card.getByRole('button', { name: 'Use this', exact: true }).click();
    await card.getByRole('status').filter({ hasText: 'Sample data ready: 2 items.' }).waitFor();
  }
  await page.screenshot({ path: path.join(output, 'connectors.png'), scale: 'css' });
  await page.reload(); await page.locator('.app-shell').waitFor();
  await page.getByRole('button', { name: 'Connectors', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.connector-saved').length === 7);

  // Exercise the real OS encryption implementation through the real store.
  // Return only booleans, never the distinctive synthetic value or ciphertext.
  const nativeStorage = await app.evaluate(async ({ safeStorage }, args) => {
    const { ConnectorStore } = await import(args.module);
    const crypto = await import('node:crypto'), fs = await import('node:fs/promises'), path = await import('node:path');
    const id = crypto.randomUUID(), value = 'synthetic-native-secret-' + crypto.randomUUID();
    const store = new ConnectorStore(args.root, safeStorage); await store.init();
    const secrets = store.secrets(id); await secrets.set('access', value);
    const restored = await secrets.get('access');
    const names = await fs.readdir(path.join(args.root, 'secrets', id));
    const encrypted = await fs.readFile(path.join(args.root, 'secrets', id, names[0]));
    await store.remove(id);
    return { restored: restored === value, encrypted: !encrypted.includes(Buffer.from(value)), removed: (await secrets.get('access')) === undefined };
  }, { module: pathToFileURL(path.resolve('dist-electron/electron/connectors/store.js')).href, root: path.join(root, 'native-storage-check') });
  assert.deepEqual(nativeStorage, { restored: true, encrypted: true, removed: true });

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: 'Pi Model providers' }).check();
  await page.getByLabel('Provider', { exact: true }).selectOption('fleet-fixture');
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Model settings saved.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'New challenge', exact: true }).click();
  const brief = page.getByRole('dialog', { name: 'New challenge', exact: true });
  await brief.getByLabel('Challenge title', { exact: true }).fill(qualityFixtureProject.title);
  await brief.getByLabel(/^Problem statement(?:\s|$)/).fill(qualityFixtureProject.description);
  await brief.getByLabel('Evaluation criteria (optional)', { exact: false }).fill(qualityFixtureProject.criteria.join('\n'));
  await brief.getByRole('group', { name: 'Use connected data', exact: true }).waitFor();
  const selections = ['Gmail', 'Google Calendar', 'Google Drive', 'Your own data service'];
  for (const label of selections) {
    const checkbox = brief.getByLabel(label + ' (2 sample items)', { exact: true });
    assert.equal(await checkbox.isChecked(), false); await checkbox.check();
  }
  assert.match(await brief.locator('.connected-data-section').innerText(), /Local test fixture/);
  await brief.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await page.getByText('Challenge saved.', { exact: true }).waitFor();
  const id = await page.evaluate(async () => (await window.fleetHarness.bootstrap()).state.projects[0].id);
  await page.getByRole('button', { name: 'Start build', exact: true }).click();
  await page.getByRole('dialog', { name: 'Start build', exact: true }).getByRole('button', { name: 'Start automatic build', exact: true }).click();
  await page.waitForFunction(async id => ['review', 'failed', 'stopped'].includes((await window.fleetHarness.bootstrap()).state.projects.find(project => project.id === id)?.status), id, { timeout: 120_000 });
  const final = await page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(project => project.id === id), id);
  assert.equal(final.status, 'review', final.error);
  assert.equal(final.report.passed, 1); assert.equal(final.connectedData.length, 4);
  assert.ok(final.runCheckpoint.connectedContextHash); await assertContext(final.workspace, final.runCheckpoint.connectedContextHash);
  const requirements = await fs.readFile(path.join(final.workspace, 'requirements.md'), 'utf8');
  assert.match(requirements, /## Connected data/);
  const readme = await fs.readFile(path.join(final.workspace, 'context/README.md'), 'utf8');
  assert.match(readme, /UNTRUSTED DATA/);
  for (const label of selections) { assert.ok(readme.includes(label)); assert.ok(final.logs.some(log => log.text.includes('This build uses sample data from') && log.text.includes(label))); }
  for (const selected of final.connectedData) {
    const context = JSON.parse(await fs.readFile(path.join(final.workspace, 'context', selected.id + '.json'), 'utf8'));
    assert.equal(context.digest, selected.digest); assert.equal(context.sample, true); assert.equal(context.items.length, 2);
    const text = JSON.stringify(context);
    for (const hidden of ['Synthetic banner check', 'training.desk@example.invalid', '202-555-0147', '000-12-3456']) assert.equal(text.includes(hidden), false);
  }
  assert.ok(fixture.requests.length > 0); assert.deepEqual(errors, []);
  await page.getByRole('button', { name: 'Connectors', exact: true }).click();
  const gmail = page.getByRole('article', { name: 'Gmail', exact: true });
  await gmail.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await page.waitForFunction(async () => !(await window.fleetHarness.connectors.list()).find(card => card.kind === 'gmail').connection);
  const receipt = { passed: true, sampleCards: 7, selectedSources: 4, workspaceContext: true, nativeEncryption: nativeStorage, nativeProcessCleanup: true, fixtureBuild: final.status, rendererErrors: errors.length };
  await fs.writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await app?.close(); await fixture.close(); await fs.rm(root, { recursive: true, force: true });
}
