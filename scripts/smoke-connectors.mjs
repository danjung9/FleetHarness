import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { startFixtureProvider } from './mock-provider.mjs';
import { qualityFixtureProject } from './quality-fixture.mjs';
import { assertContext } from '../dist-electron/electron/connectors/snapshot.js';
import { assertBriefDataIntegrity } from '../dist-electron/electron/brief-data.js';
import { startConnectorServers } from '../tests/fixtures/connector-servers.mjs';
import { startDataServiceServer } from '../tests/fixtures/data-service-server.mjs';

const electronBinary = createRequire(import.meta.url)('electron');
// Run after npm run build, on a host permitted to launch Electron, Chrome,
// and ps. No live model, account or data-service calls.
const output = path.resolve('output/connectors-smoke'); await fs.mkdir(output, { recursive: true });
const root = await fs.mkdtemp(path.join(output, 'run-'));
const piDir = path.join(root, 'pi'); await fs.mkdir(piDir);
const stateDir = path.join(root, 'state');
const fixture = await startFixtureProvider();
const accounts = await startConnectorServers({ echoSecrets: true });
const serviceKey = 'synthetic-smoke-service-' + randomUUID();
const testEncryptionKey = randomBytes(32).toString('hex');
const dataService = await startDataServiceServer({ key: serviceKey, mode: 'header', description: 'openapi' });
const env = { ...process.env, FLEET_USER_DATA: stateDir, PI_CODING_AGENT_DIR: piDir, NODE_ENV: 'test', APPYARD_CONNECTOR_TEST_MODE: '1',
  APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY: testEncryptionKey,
  APPYARD_CONNECTOR_TEST_SERVERS: JSON.stringify({ accounts: accounts.base, dataService: dataService.origin }) };
const errors = [], logs = [];
function assertNoSecrets(value) {
  for (const secret of [serviceKey, accounts.distinctive, testEncryptionKey]) assert.equal(value.includes(secret), false, 'A synthetic credential escaped its encrypted store.');
}
async function scanSaved(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'auth.json' || entry.isSymbolicLink()) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await scanSaved(file);
    else if (entry.isFile()) assertNoSecrets((await fs.readFile(file)).toString());
  }
}
await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: { 'fleet-fixture': {
  baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
  models: [{ id: 'fixture-model', name: 'Local test fixture', reasoning: false, input: ['text', 'image'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }]
} } }));
let app;
async function launch() {
  const application = await electron.launch({ args: ['.'], env, timeout: 45_000 });
  application.on('console', message => logs.push(message.text()));
  for (const stream of [application.process().stdout, application.process().stderr]) stream?.on('data', chunk => logs.push(chunk.toString()));
  const page = await application.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => logs.push(message.text()));
  await page.locator('.app-shell').waitFor();
  assert.equal(await application.evaluate(() => process.env.APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY === undefined), true);
  return { application, page };
}
async function openConnectors(page) {
  await page.getByRole('button', { name: 'Connectors', exact: true }).click();
  await page.getByRole('heading', { name: 'Connectors', exact: true }).waitFor();
}
async function question(card, label, value) {
  const input = card.getByLabel(label); await input.waitFor();
  if (await input.evaluate(element => element.tagName === 'SELECT')) await input.selectOption(value);
  else await input.fill(value);
  await card.getByRole('button', { name: 'Continue', exact: true }).click();
}
async function checkAndSave(card) {
  const choices = card.locator('.connector-choices');
  if (!(await choices.evaluate(element => element.open))) await choices.locator('summary').click();
  await card.getByRole('button', { name: 'Check data', exact: true }).click();
  await card.getByRole('heading', { name: 'Check it', exact: true }).waitFor({ timeout: 15_000 }).catch(async error => {
    console.log('Card at failure:', (await card.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 900));
    throw error;
  });
  const text = await card.locator('.connector-preview').innerText(); assertNoSecrets(text);
  assert.match(text, /2 items ready/);
  await card.getByRole('button', { name: 'Use this', exact: true }).click();
  await card.locator('.connector-preview').waitFor({ state: 'hidden' });
  await card.getByRole('status').filter({ hasText: 'Sample data ready: 2 items.' }).waitFor();
}
const step = name => console.log(new Date().toISOString().slice(11, 19), name);
try {
  step('launch');
  let launched = await launch(); app = launched.application; let page = launched.page;
  await openConnectors(page);
  await page.locator('.connector-card').first().waitFor();
  assert.equal(await page.locator('.connector-card').count(), 7);
  for (const name of ['Gmail', 'Google Calendar', 'Google Drive', 'Outlook', 'Outlook Calendar', 'OneDrive', 'Your own data service']) {
    const card = page.getByRole('article', { name, exact: true });
    assert.equal(await card.getByRole('button', { name: 'Connect', exact: true }).isEnabled(), true);
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

  step('sample cards done');
  // Exercise the real OS encryption implementation through the real store.
  // Return only booleans, never the distinctive synthetic value or ciphertext.
  // Opt-in only. The real keychain can open a system prompt, which would hang an unattended run.
  let nativeStorage = { exercised: false, reason: 'set APPYARD_NATIVE_KEYCHAIN_CHECK=1 to exercise the real keychain' };
  if (process.env.APPYARD_NATIVE_KEYCHAIN_CHECK === '1') {
  const nativeRun = await new Promise(resolve => execFile(electronBinary, [path.resolve('scripts/connector-native-check.mjs'), path.join(root, 'native-storage-check')],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }, timeout: 60_000 }, (error, stdout) => resolve({ error, stdout: String(stdout) })));
  assertNoSecrets(nativeRun.stdout);
  const reports = [...nativeRun.stdout.matchAll(/^NATIVE (.*)$/gm)];
  assert.equal(reports.length, 1, 'The native storage check must return one result.');
  const nativeResult = JSON.parse(reports[0][1]);
  if (nativeResult.error === 'Secure storage is unavailable. Use sample data.') {
    assert.deepEqual(nativeResult, { error: 'Secure storage is unavailable. Use sample data.' });
    assert.equal(nativeRun.error?.code, 1); assert.equal(nativeRun.error?.killed, false); assert.equal(nativeRun.error?.signal, null);
    nativeStorage = { exercised: false, reason: 'OS secure storage is unavailable' };
    console.log('Native secure storage check not exercised: OS secure storage is unavailable. Connector fixtures use test-only encryption.');
  } else {
    assert.equal(nativeRun.error, null, 'The native storage check failed.');
    assert.deepEqual(nativeResult, { restored: true, encrypted: true, removed: true });
    nativeStorage = nativeResult;
  }

  step('native storage done');
  }
  // All actions below go through the real screen, preload, IPC and adapters.
  // Sign-in opens the ordinary system browser. The local provider redirects to
  // the adapter's real loopback callback and checks its authorization proof.
  let serviceCard = page.getByRole('article', { name: 'Your own data service', exact: true });
  await serviceCard.getByLabel('Service address or documentation link').fill(dataService.origin + '/docs');
  await serviceCard.getByRole('button', { name: 'Connect', exact: true }).click();
  await question(serviceCard, 'Is this an internal service you want AppYard to read?', 'yes');
  const keyLabel = 'This service needs a key. Paste it here.';
  await serviceCard.getByLabel(keyLabel).waitFor();
  assert.equal(await serviceCard.getByLabel(keyLabel).getAttribute('type'), 'password');
  await serviceCard.getByRole('button', { name: 'Cancel', exact: true }).click();
  await serviceCard.locator('.connector-progress').waitFor({ state: 'hidden' });
  assert.equal(await serviceCard.getByText('Connected. Choose what to include below.', { exact: true }).count(), 0);
  await serviceCard.getByRole('status').filter({ hasText: 'Sample data ready: 2 items.' }).waitFor();
  await serviceCard.getByRole('button', { name: 'Connect', exact: true }).click();
  await question(serviceCard, 'Is this an internal service you want AppYard to read?', 'yes');
  await question(serviceCard, keyLabel, serviceKey);
  await serviceCard.getByText('Connected. Choose what to include below.', { exact: true }).waitFor();
  assert.equal(await serviceCard.locator('input[type=password]').count(), 0);
  dataService.setMode('leak');
  await serviceCard.getByRole('button', { name: 'Check data', exact: true }).click();
  await serviceCard.getByRole('heading', { name: 'Check it', exact: true }).waitFor();
  const echoed = await serviceCard.locator('.connector-preview').innerText();
  assert.match(echoed, /1 item ready/); assertNoSecrets(echoed);
  await serviceCard.getByRole('button', { name: 'Cancel', exact: true }).click();
  dataService.setMode('header'); await checkAndSave(serviceCard);
  step('data service done');
  for (const name of ['Gmail', 'Outlook']) {
    step('sign-in ' + name);
    const card = page.getByRole('article', { name, exact: true });
    await card.getByRole('button', { name: 'Connect', exact: true }).click();
    if (name === 'Outlook') await question(card, 'Which Microsoft account?', 'commercial');
    await card.getByText('Connected. Choose what to include below.', { exact: true }).waitFor({ timeout: 30_000 });
    await checkAndSave(card);
  }
  assert.equal(accounts.state.pkceVerified, 2);
  assert.ok(dataService.requests.some(request => request.path === '/openapi.json'));
  assert.ok(dataService.requests.some(request => request.path === '/ships'));
  assert.ok(dataService.requests.every(request => request.method === 'GET'));
  const connectedIds = await page.evaluate(async () => (await window.fleetHarness.connectors.list()).filter(card => card.signedIn).map(card => ({ kind: card.kind, id: card.signedIn.id })));
  assert.equal(connectedIds.length, 3);
  step('sign-ins done');
  // Restart the actual process, retaining native encrypted credentials.
  await app.close(); app = undefined;
  await scanSaved(stateDir); assertNoSecrets(JSON.stringify(logs));
  launched = await launch(); app = launched.application; page = launched.page;
  await openConnectors(page);
  await page.waitForFunction(() => document.querySelectorAll('.connector-saved').length === 7);
  assert.deepEqual(await page.evaluate(async () => (await window.fleetHarness.connectors.list()).filter(card => card.signedIn).map(card => ({ kind: card.kind, id: card.signedIn.id }))), connectedIds);
  accounts.state.apiOnceStatus = 401;
  await checkAndSave(page.getByRole('article', { name: 'Gmail', exact: true }));
  assert.equal(accounts.state.refreshes, 1);
  serviceCard = page.getByRole('article', { name: 'Your own data service', exact: true });
  await checkAndSave(serviceCard);
  assert.equal(accounts.state.pkceVerified, 2);

  step('restart and refresh done');
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
  assert.match(await brief.locator('.brief-data-empty').innerText(), /Your build will use the connected data selected below/);
  await brief.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await page.getByText('Challenge saved.', { exact: true }).waitFor();
  const id = await page.evaluate(async () => (await window.fleetHarness.bootstrap()).state.projects[0].id);
  step('starting fixture build');
  await page.getByRole('button', { name: 'Start build', exact: true }).click();
  await page.getByRole('dialog', { name: 'Start build', exact: true }).getByRole('button', { name: 'Start automatic build', exact: true }).click();
  for (let waited = 0; waited < 240; waited++) {
    const status = await page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(project => project.id === id)?.status, id);
    if (['review', 'failed', 'stopped'].includes(status)) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  step('fixture build finished');
  const final = await page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(project => project.id === id), id);
  assertNoSecrets(JSON.stringify(final));
  console.log('Build result:', final.status, String(final.error ?? '').slice(0, 400), (final.stages ?? []).map(stage => stage.id + ':' + stage.status).join(' '));
  for (const log of (final.logs ?? []).slice(-6)) console.log(' log', log.stage, log.kind, String(log.text).slice(0, 240));
  assert.equal(final.status, 'review', String(final.error ?? 'no error recorded'));
  assert.equal(final.report.passed, 1); assert.equal(final.connectedData.length, 4);
  assert.ok(final.runCheckpoint.connectedContextHash); await assertContext(final.workspace, final.runCheckpoint.connectedContextHash);
  assert.equal(final.runCheckpoint.data.mode, 'provided');
  assert.equal(final.runCheckpoint.data.connectedContextHash, final.runCheckpoint.connectedContextHash);
  await assertBriefDataIntegrity(final.workspace, final.runCheckpoint.data);
  const manifest = JSON.parse(await fs.readFile(path.join(final.workspace, 'inputs/manifest.json'), 'utf8'));
  assert.equal(manifest.mode, 'provided'); assert.equal(manifest.sources.length, 4);
  assert.equal(manifest.generated, undefined);
  assert.deepEqual(manifest.sources.map(source => source.connectedSource), final.runCheckpoint.data.connectedSources);
  assert.deepEqual(manifest.sources.map(source => source.connectedSource.digest), final.connectedData.map(source => source.digest));
  await assert.rejects(fs.access(path.join(final.workspace, 'data/synthetic-data.json')), { code: 'ENOENT' });
  assert.equal(fixture.requests.some(request => request.messages.some(message => message.role === 'user' &&
    (typeof message.content === 'string' ? message.content : JSON.stringify(message.content)).includes('You are the synthetic data agent.'))), false);
  const plan = JSON.parse(await fs.readFile(path.join(final.workspace, 'acceptance-plan.json'), 'utf8'));
  assert.equal(plan.schemaVersion, 2);
  const solution = JSON.parse(await fs.readFile(path.join(final.workspace, 'solution-contract.json'), 'utf8'));
  assert.equal(solution.runtime.profile, 'browser'); assert.equal(solution.capabilities.length, 1);
  assert.equal(final.report.quality.status, 'passed');
  assert.equal(final.report.quality.capabilities.find(capability => capability.id === 'parse').status, 'passed');
  const requirements = await fs.readFile(path.join(final.workspace, 'requirements.md'), 'utf8');
  assert.match(requirements, /## Connected data/);
  const readme = await fs.readFile(path.join(final.workspace, 'context/README.md'), 'utf8');
  assert.match(readme, /UNTRUSTED DATA/);
  for (const label of selections) { assert.ok(readme.includes(label)); assert.ok(final.logs.some(log => log.text.includes('This build uses supplied data from') && log.text.includes(label))); }
  for (const selected of final.connectedData) {
    const context = JSON.parse(await fs.readFile(path.join(final.workspace, 'context', selected.id + '.json'), 'utf8'));
    assert.equal(context.digest, selected.digest); assert.equal(context.sample, true); assert.equal(context.items.length, 2);
    assert.ok(selections.includes(context.source));
    const text = JSON.stringify(context);
    assertNoSecrets(text);
    if (context.source === 'Gmail') assert.match(text, /Synthetic maintenance/);
    if (context.source === 'Your own data service') assert.match(text, /Sample Harbor/);
    for (const hidden of ['Synthetic banner check', 'training.desk@example.invalid', '202-555-0147', '000-12-3456']) assert.equal(text.includes(hidden), false);
  }
  assert.ok(fixture.requests.length > 0); assert.deepEqual(errors, []);
  await page.getByRole('button', { name: 'Connectors', exact: true }).click();
  for (const name of ['Gmail', 'Outlook', 'Your own data service']) await page.getByRole('article', { name, exact: true }).getByRole('button', { name: 'Disconnect', exact: true }).click();
  await page.waitForFunction(async () => (await window.fleetHarness.connectors.list()).filter(card => ['gmail', 'outlook', 'custom-api'].includes(card.kind)).every(card => !card.connection && !card.signedIn));
  for (const { id } of connectedIds) {
    for (const file of [path.join('secrets', id), path.join('connections', id + '.json'), path.join('snapshots', id + '.json')]) await assert.rejects(fs.access(path.join(stateDir, 'connectors', file)), { code: 'ENOENT' });
  }
  assert.equal(accounts.state.revocations, 1); assert.equal(accounts.state.revokedKnownToken, true);
  await app.close(); app = undefined;
  await scanSaved(stateDir); await scanSaved(final.workspace); assertNoSecrets(JSON.stringify({ logs, errors }));
  assert.deepEqual(errors, []);
  const receipt = { passed: true, sampleCards: 7, selectedSources: 4, workspaceContext: true, providedData: true, acceptancePlanVersion: plan.schemaVersion, solutionContract: true, signIns: accounts.state.pkceVerified, dataService: true, restart: true, cancellation: true, noLeakedCredentials: true, nativeEncryption: nativeStorage, nativeProcessCleanup: true, fixtureBuild: final.status, rendererErrors: errors.length };
  await fs.writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await app?.close(); await Promise.all([fixture.close(), accounts.close(), dataService.close()]); await fs.rm(root, { recursive: true, force: true });
}
