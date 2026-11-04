// Run against Vite with VITE_HOSTED=true and placeholder Supabase URL/anon key.
// Auth and API responses are fixtures: this checks the browser contract, not the cloud worker.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.HOSTED_TEST_URL || 'http://127.0.0.1:5182';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const errors = [], calls = [];
page.on('pageerror', error => errors.push(error.message));
page.on('requestfailed', request => console.error('Request failed:', request.url(), request.failure()?.errorText));
page.on('console', message => { if (message.type() === 'error') console.error('Browser console:', message.text()); });
const stages = ['intake', 'research', 'plan', 'build', 'verify', 'review', 'deliver'];
const accounts = Object.fromEntries(['a', 'b'].map(id => [id, { projects: [], connected: false, settings: { backend: 'pi', provider: 'openai', model: '', rememberKey: true } }]));
const token = id => `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test-signature`;
const users = Object.fromEntries(['a', 'b'].map(id => [id, { id, email: `${id}@demo.test`, aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {} }]));
let unsafePreview = false;
const cors = { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,x-supabase-api-version', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' };
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: cors });
const bootstrap = id => ({ state: { version: 1, projects: accounts[id].projects, settings: accounts[id].settings }, models: [{ id: 'test-model', name: 'Test model' }, { id: 'alternate-model', name: 'Alternate model' }].map(model => ({ ...model, provider: 'openai', backend: 'pi', configured: accounts[id].connected })), runtime: 'Hosted demo', storagePath: 'Private account storage', credentialStatus: accounts[id].connected ? 'API key saved for this account.' : 'No key saved.' });

try {
  await context.route('**/auth/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (path.endsWith('/token')) {
      const input = request.postDataJSON(), id = input.email?.split('@')[0];
      if (!users[id] || input.password !== 'demo-password') return json(route, { msg: 'Invalid login credentials' }, 400);
      return json(route, { access_token: token(id), refresh_token: `refresh-${id}`, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: users[id] });
    }
    if (path.endsWith('/logout')) return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    if (path.endsWith('/user')) { const id = ['a', 'b'].find(id => request.headers().authorization === `Bearer ${token(id)}`); return json(route, users[id] || {}, id ? 200 : 401); }
    return json(route, { error: 'Unexpected auth route' }, 404);
  });
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const bearer = request.headers().authorization?.split(' ')[1];
    const id = bearer ? JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url')).sub : null;
    if (!accounts[id]) return json(route, { error: 'Unauthorized' }, 401);
    const account = accounts[id]; calls.push({ id, path: url.pathname, method });
    if (url.pathname === '/api/bootstrap') return json(route, bootstrap(id));
    if (url.pathname === '/api/settings') { const body = request.postDataJSON(); if (body.apiKey) { assert.equal(body.apiKey, 'sk-test-browser-secret'); account.connected = true; } account.settings = body.settings; return json(route, bootstrap(id)); }
    if (url.pathname === '/api/settings/key') { account.connected = false; return json(route, bootstrap(id)); }
    if (url.pathname === '/api/projects') {
      const input = request.postDataJSON(), now = new Date().toISOString();
      const project = { ...input, id: `${id}-${account.projects.length + 1}`, status: 'draft', stages: stages.map(stage => ({ id: stage, label: stage, detail: 'Demo stage', status: 'queued' })), logs: [], feedback: '', createdAt: now, updatedAt: now };
      account.projects.unshift(project); return json(route, project);
    }
    const match = url.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(.*))?$/);
    const project = match && account.projects.find(project => project.id === match[1]);
    if (!project) return json(route, { error: 'Not found' }, 404);
    const action = match[2];
    if (action === 'start' || action === 'resume') { project.status = 'running'; project.model = account.settings.model; project.runId = 'test-run'; project.canResume = false; project.stages[0].status = 'active'; return route.fulfill({ status: 204 }); }
    if (action === 'pause') { project.status = 'paused'; project.canResume = true; project.checkpointStage = 'plan'; return route.fulfill({ status: 204 }); }
    if (action === 'artifacts') return json(route, [{ path: 'app/index.html', size: 100 }]);
    if (action === 'artifact') return json(route, '<h1>Saved private source</h1>');
    if (action === 'preview') return json(route, { url: ['review', 'approved'].includes(project.status) ? unsafePreview ? `${base}/generated` : 'https://preview-test.vercel.run/' : null });
    if (action === 'approve') { project.feedback = request.postDataJSON().feedback; project.status = 'approved'; project.approvedAt = new Date().toISOString(); return route.fulfill({ status: 204 }); }
    if (action === 'share') return json(route, { url: 'https://appyard.test/api/share/fixture-token' });
    if (action === 'export') return route.fulfill({ contentType: 'application/zip', body: Buffer.from([80, 75, 3, 4]) });
    return json(route, { error: 'Unexpected API route' }, 404);
  });
  await context.route('https://preview-test.vercel.run/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><h1>Generated app preview</h1><button>Working example</button></body></html>' }));
  const screenshot = name => page.screenshot({ path: join(tmpdir(), `appyard-hosted-${name}.png`), fullPage: true });
  async function signIn(id) { await page.getByLabel('Email', { exact: true }).fill(`${id}@demo.test`); await page.getByLabel('Password', { exact: true }).fill('demo-password'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor(); }
  async function signOut() { await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor({ state: 'visible' }); await page.getByRole('button', { name: 'Sign in', exact: true }).isEnabled(); }
  async function brief(title) { await page.getByRole('button', { name: 'New challenge', exact: true }).first().click(); const dialog = page.getByRole('dialog'); await dialog.getByLabel('Challenge title').fill(title); await dialog.getByLabel('Problem statement').fill('Build a small local task board with reliable saved tasks and a clear user interface.'); await dialog.getByLabel('Evaluation criteria (optional)').fill('Add and complete a task.'); await dialog.getByRole('button', { name: 'Save challenge', exact: true }).click(); await page.getByRole('heading', { name: title, exact: true }).waitFor(); }
  await page.goto(base); await page.getByRole('heading', { name: 'Welcome back' }).waitFor(); await screenshot('login');
  await signIn('a'); await page.getByRole('button', { name: 'Model settings', exact: true }).click();
  await page.getByLabel('OpenAI API key').fill('sk-test-browser-secret'); await page.getByRole('combobox', { name: 'Model', exact: true }).selectOption('test-model'); await page.getByRole('button', { name: 'Test connection & save', exact: true }).click();
  await page.getByText('OpenAI connected', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes('sk-test-browser-secret')), false);
  await brief('A private build');
  await page.getByRole('button', { name: 'Start build', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start build', exact: true }).click();
  await page.getByRole('button', { name: 'Pause build', exact: true }).waitFor(); await screenshot('workspace');
  const pauseCount = calls.filter(call => call.path.endsWith('/pause')).length;
  await signOut(); assert.equal(calls.filter(call => call.path.endsWith('/pause')).length, pauseCount);
  assert.equal(accounts.a.projects[0].status, 'running');
  await signIn('b'); assert.equal(await page.getByText('A private build', { exact: true }).count(), 0); await brief('B private build'); await signOut();
  await signIn('a'); assert.equal(await page.getByText('B private build', { exact: true }).count(), 0);
  await page.getByRole('button', { name: /A private build/ }).click();
  await page.getByRole('button', { name: 'Pause build', exact: true }).click();
  await page.getByRole('button', { name: 'Resume build', exact: true }).first().waitFor(); await screenshot('paused');
  await page.getByRole('combobox', { name: 'Build model', exact: true }).selectOption(JSON.stringify(['openai', 'alternate-model']));
  await page.getByText('Model changed to Alternate model.', { exact: true }).waitFor();
  const resumeCount = calls.filter(call => call.path.endsWith('/resume')).length;
  await page.getByRole('button', { name: 'Resume build', exact: true }).first().click();
  await page.getByRole('heading', { name: 'Model settings', exact: true }).waitFor();
  assert.equal(calls.filter(call => call.path.endsWith('/resume')).length, resumeCount);
  await page.getByRole('combobox', { name: 'Model', exact: true }).selectOption('test-model');
  await page.getByRole('button', { name: 'Test connection & save', exact: true }).click();
  await page.getByText('OpenAI connection tested and saved.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Flow — build pipeline', exact: true }).click();
  await page.getByRole('button', { name: 'Resume build', exact: true }).first().click();
  await page.getByRole('button', { name: 'Pause build', exact: true }).waitFor();
  const project = accounts.a.projects[0];
  project.status = 'review'; project.stages = project.stages.map(stage => ({ ...stage, status: stage.id === 'review' ? 'review' : stage.id === 'deliver' ? 'queued' : 'complete' }));
  project.report = { time: new Date().toISOString(), command: 'node --test', exitCode: 0, passed: 1, failed: 0, skipped: 0, total: 1, output: 'All tests passed', durationMs: 200, sourceHash: 'fixture-source' };
  await page.getByRole('button', { name: 'Review build', exact: true }).waitFor(); await page.getByRole('button', { name: 'Review build', exact: true }).click();
  await page.getByLabel('Review notes').fill('I tested adding and completing a task. This is a demo prototype.');
  await page.getByLabel('I inspected the application, test evidence, and limitations.').check();
  await page.getByRole('button', { name: 'Approve prototype', exact: true }).click();
  await page.getByRole('button', { name: 'Create result link', exact: true }).click(); await page.getByRole('link', { name: /Open shared app/ }).waitFor();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download source & evidence ZIP', exact: true }).click(); assert.equal((await download).suggestedFilename(), 'appyard-a-1.zip');
  await screenshot('review');
  unsafePreview = true; await page.getByRole('button', { name: 'Open preview', exact: true }).first().click();
  await page.getByText('The preview must use an isolated HTTPS address.', { exact: true }).waitFor();
  unsafePreview = false; await page.getByRole('button', { name: 'Retry preview', exact: true }).click();
  await page.frameLocator('iframe[title="Generated application preview"]').getByRole('heading', { name: 'Generated app preview' }).waitFor();
  await page.getByRole('button', { name: 'Files — artifacts', exact: true }).click(); await page.getByRole('button', { name: /app\/index.html/ }).click();
  await page.getByText('<h1>Saved private source</h1>', { exact: true }).waitFor();
  await signOut(); await page.setViewportSize({ width: 390, height: 844 }); await screenshot('login-mobile');
  assert.equal(await page.evaluate(() => document.querySelector('.auth-shell').scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('PASS: login, account isolation, secret handling, background continuity, pause/resume with original-model guidance, review, sharing, ZIP download, file browsing, preview isolation, mobile login.');
} catch (error) {
  await page.screenshot({ path: join(tmpdir(), 'appyard-hosted-failure.png'), fullPage: true });
  console.error('Browser state:', await page.locator('body').innerText(), 'Runtime errors:', errors, 'API calls:', calls);
  throw error;
} finally { await browser.close(); }
