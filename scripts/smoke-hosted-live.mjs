/** Explicit paid workflow smoke. Nothing runs without --check or --execute. */
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';

const repo = fileURLToPath(new URL('..', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
export class SmokeFailure extends Error {}

/** Inspect the bounded ZIP in memory. Never extract or execute generated files. */
export function inspectZip(bytes) {
  if (bytes.length > 40 * 1024 * 1024) throw new SmokeFailure('The export exceeds the smoke limit.');
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) { end = i; break; }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) throw new SmokeFailure('The export is not a supported ZIP.');
  const count = bytes.readUInt16LE(end + 10); let position = bytes.readUInt32LE(end + 16);
  if (count < 1 || count > 2002 || position + bytes.readUInt32LE(end + 12) > end) throw new SmokeFailure('The export ZIP directory is invalid.');
  const files = new Map(); let total = 0;
  for (let index = 0; index < count; index++) {
    if (position + 46 > end || bytes.readUInt32LE(position) !== 0x02014b50) throw new SmokeFailure('The ZIP directory is truncated.');
    const flags = bytes.readUInt16LE(position + 8), method = bytes.readUInt16LE(position + 10);
    const compressed = bytes.readUInt32LE(position + 20), size = bytes.readUInt32LE(position + 24);
    const nameLength = bytes.readUInt16LE(position + 28), extraLength = bytes.readUInt16LE(position + 30), commentLength = bytes.readUInt16LE(position + 32);
    const offset = bytes.readUInt32LE(position + 42), name = bytes.subarray(position + 46, position + 46 + nameLength).toString('utf8');
    if (flags & 1 || size > 10 * 1024 * 1024 || files.has(name) || !name || /[\\\x00-\x1f\x7f]/.test(name) || name.split('/').some(part => !part || part === '.' || part === '..')) throw new SmokeFailure('An exported ZIP entry is invalid.');
    if (offset + 30 > bytes.length || bytes.readUInt32LE(offset) !== 0x04034b50) throw new SmokeFailure('An exported ZIP entry is truncated.');
    const start = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
    if (start + compressed > bytes.length) throw new SmokeFailure('An exported ZIP entry exceeds the archive.');
    const data = bytes.subarray(start, start + compressed);
    const content = method === 0 ? Buffer.from(data) : method === 8 ? inflateRawSync(data, { maxOutputLength: Math.max(1, size + 1) }) : null;
    if (!content || content.length !== size || (total += size) > 40 * 1024 * 1024) throw new SmokeFailure('An exported ZIP entry failed decompression.');
    files.set(name, content); position += 46 + nameLength + extraLength + commentLength;
  }
  const source = createHash('sha256');
  for (const [name, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) if (!['test-report.json', 'review.json', 'DELIVERY.md'].includes(name)) { source.update(name); source.update(content); }
  return { files, sourceHash: source.digest('hex') };
}

export function parseOptions(args) {
  return parseArgs({ args, options: {
    help: { type: 'boolean' }, check: { type: 'boolean' }, execute: { type: 'boolean' },
    credentials: { type: 'string', default: 'output/hosted-demo-accounts.json' }, account: { type: 'string', default: 'Demo A' },
    brief: { type: 'string', default: 'scripts/fixtures/hosted-demo-brief.json' },
    'timeout-minutes': { type: 'string', default: '60' }, 'poll-seconds': { type: 'string', default: '5' },
    'signed-out-seconds': { type: 'string', default: '20' },
  } }).values;
}

export async function runLiveSmoke(options, environment = process.env) {
  if (options.help || (!options.check && !options.execute)) {
    console.log('Readiness only: node --env-file=.env.supabase-staging.local scripts/smoke-hosted-live.mjs --check\nReal workflow (requires explicit go): add --execute instead of --check.\nOptions: --account="Demo A" --brief=scripts/fixtures/hosted-demo-brief.json --timeout-minutes=60\nUses only the publishable Supabase key and demo login; never reads an OpenAI key.');
    return;
  }
  if (options.check && options.execute) throw new SmokeFailure('Choose --check or --execute.');
  const credentialsPath = resolve(repo, options.credentials);
  execFileSync('git', ['check-ignore', '--quiet', '--', credentialsPath], { cwd: repo, stdio: 'ignore' });
  const stat = await lstat(credentialsPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077) throw new SmokeFailure('Demo credentials must be an ignored regular file with mode 600.');
  const credentials = JSON.parse(await readFile(credentialsPath, 'utf8'));
  const account = credentials.accounts.find(item => item.label === options.account);
  const origin = new URL(credentials.appOrigin), authOrigin = new URL(credentials.supabaseUrl);
  if (!account || !uuid(account.id) || origin.protocol !== 'https:' || !/(?:^|[.-])staging(?:[.-]|$)/.test(origin.hostname) || origin.origin !== credentials.appOrigin || authOrigin.protocol !== 'https:' || !authOrigin.hostname.endsWith('.supabase.co')) throw new SmokeFailure('The credentials file must identify a confirmed staging demo account.');
  const publicKey = environment.VITE_SUPABASE_ANON_KEY ?? environment.SUPABASE_ANON_KEY;
  if (!publicKey) throw new SmokeFailure('The Supabase publishable key is missing.');
  const secrets = credentials.accounts.map(item => item.password), sessions = new Set();
  let session, output, report;
  async function auth(path, body, bearer) {
    const response = await fetch(`${authOrigin.origin}/auth/v1/${path}`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { apikey: publicKey, 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) { await response.body?.cancel(); throw new SmokeFailure(`Demo authentication failed (HTTP ${response.status}).`); }
    return response.status === 204 ? null : await response.json();
  }
  async function login(who) {
    const result = await auth('token?grant_type=password', { email: who.email, password: who.password });
    if (result.user?.id !== who.id || !result.access_token) throw new SmokeFailure('Sign-in returned an unexpected account.');
    const value = { accountId: who.id, access: result.access_token, refresh: result.refresh_token, expiresAt: Date.now() + result.expires_in * 1000 };
    secrets.push(value.access, value.refresh); sessions.add(value); return value;
  }
  async function logout(value) {
    if (!value) return;
    await auth('logout?scope=local', undefined, value.access); sessions.delete(value);
  }
  async function request(path, { method = 'GET', body, format = 'json', as = session } = {}) {
    if (!as) throw new SmokeFailure('No active demo session.');
    if (as.expiresAt < Date.now() + 60_000) {
      const refreshed = await auth('token?grant_type=refresh_token', { refresh_token: as.refresh });
      as.access = refreshed.access_token; as.refresh = refreshed.refresh_token; as.expiresAt = Date.now() + refreshed.expires_in * 1000; secrets.push(as.access, as.refresh);
    }
    const response = await fetch(`${origin.origin}/api${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(90_000), headers: { Authorization: `Bearer ${as.access}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) { await response.body?.cancel(); throw new SmokeFailure(`${method} ${path.split('?')[0]} failed (HTTP ${response.status}).`); }
    if (format === 'bytes') return Buffer.from(await response.arrayBuffer());
    const text = await response.text();
    if (secrets.some(value => value && text.includes(value))) throw new SmokeFailure('An API response contains a login credential.');
    return JSON.parse(text);
  }
  async function save() { if (output) await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 }); }
  try {
    session = await login(account);
    const initial = await request('/bootstrap');
    const model = initial.state.settings.model;
    const connected = !!model && initial.models.some(item => item.id === model && item.configured);
    const active = initial.state.projects.filter(project => ['running', 'pausing'].includes(project.status)).map(project => ({ id: project.id, status: project.status }));
    if (options.check) { console.log(JSON.stringify({ account: account.label, connected, model: model || null, activeProjects: active })); return; }
    if (!connected) throw new SmokeFailure('Connect and test the account OpenAI key in Settings before running this driver.');
    if (active.length) throw new SmokeFailure('The demo account already has an active build.');
    const timeout = Number(options['timeout-minutes']) * 60_000, poll = Number(options['poll-seconds']) * 1000, signedOut = Number(options['signed-out-seconds']) * 1000;
    if (![timeout, poll, signedOut].every(Number.isFinite) || timeout < 60_000 || timeout > 90 * 60_000 || poll < 1000 || poll > 30_000 || signedOut < 1000 || signedOut > 60_000) throw new SmokeFailure('Invalid smoke timing options.');
    const deadline = Date.now() + timeout;
    const brief = JSON.parse(await readFile(resolve(repo, options.brief), 'utf8'));
    output = resolve(repo, 'output', 'hosted-live-smoke', randomUUID());
    await mkdir(output, { recursive: true, mode: 0o700 });
    report = { version: 1, startedAt: new Date().toISOString(), origin: origin.origin, account: account.label, model, passed: false, checks: {}, observations: [] };
    const project = await request('/projects', { method: 'POST', body: brief });
    if (!uuid(project.id)) throw new SmokeFailure('Project creation returned an invalid ID.');
    report.projectId = project.id; await save(); console.log(`Demo project created: ${project.id}`);
    const base = `/projects/${project.id}`;
    let runId, lastSummary;
    const fingerprint = value => JSON.stringify([value.checkpointStage, value.stages.map(stage => [stage.id, stage.status]), value.logs?.at(-1)?.id, value.logs?.at(-1)?.text]);
    async function current() {
      const state = await request('/bootstrap'), value = state.state.projects.find(item => item.id === project.id);
      if (!value) throw new SmokeFailure('The demo project disappeared from its account.');
      if (runId && value.runId !== runId) throw new SmokeFailure('The run ID changed unexpectedly.');
      const summary = JSON.stringify({ status: value.status, checkpoint: value.checkpointStage ?? null, stages: value.stages.map(stage => ({ id: stage.id, status: stage.status })) });
      if (summary !== lastSummary) { lastSummary = summary; report.observations.push({ at: new Date().toISOString(), ...JSON.parse(summary) }); await save(); console.log(`Build ${value.status}; checkpoint ${value.checkpointStage ?? 'not yet saved'}.`); }
      if (value.status === 'failed') throw new SmokeFailure(`The hosted build failed; inspect project ${project.id} in the app.`);
      return value;
    }
    async function waitFor(predicate, label) {
      while (Date.now() < deadline) { const value = await current(); if (await predicate(value)) return value; await sleep(poll); }
      throw new SmokeFailure(`Timed out while waiting for ${label}; the project has been left in its current state.`);
    }
    await request(`${base}/start`, { method: 'POST' });
    const started = await waitFor(value => value.runId && (value.logs.length || value.stages.some(stage => stage.status === 'active') || value.checkpointStage), 'worker progress');
    runId = started.runId; report.runId = runId; report.checks.started = true; await save();
    let continued = false, returned = started;
    for (let attempt = 0; attempt < 3 && !continued; attempt++) {
      const before = fingerprint(returned); const leftAt = new Date().toISOString();
      await logout(session); session = null; console.log('Driver session signed out while the build remains in the cloud.');
      if (attempt === 0) {
        const other = credentials.accounts.find(item => item.id !== account.id);
        if (other) { const alternate = await login(other); const hidden = await request('/bootstrap', { as: alternate }); if (hidden.state.projects.some(item => item.id === project.id)) throw new SmokeFailure('Another account can see the running project.'); await logout(alternate); report.checks.crossAccountHidden = true; }
      }
      await sleep(signedOut); session = await login(account); returned = await current();
      continued = fingerprint(returned) !== before;
      report.observations.push({ signedOutAt: leftAt, signedBackInAt: new Date().toISOString(), progressChanged: continued }); await save();
    }
    if (!continued) throw new SmokeFailure('Progress during the signed-out interval could not be demonstrated.');
    report.checks.continuedWhileSignedOut = true;
    const checkpoint = await waitFor(value => {
      if (value.status === 'review') throw new SmokeFailure('The build reached review before the pause demonstration.');
      return value.checkpointStage && value.stages.some(stage => stage.id === value.checkpointStage && stage.status === 'complete');
    }, 'the first completed-stage checkpoint');
    await request(`${base}/pause`, { method: 'POST' });
    const paused = await waitFor(value => value.status === 'paused', 'a durable paused checkpoint');
    if (!paused.canResume || !paused.checkpointStage) throw new SmokeFailure('Pause did not retain a resumable completed-stage checkpoint.');
    const retained = paused.stages.filter(stage => stage.status === 'complete').map(stage => stage.id);
    const packetHash = hash(await request(`${base}/artifact?path=${encodeURIComponent('.fleet/packet.json')}`));
    report.checks.pausedAtCheckpoint = true; report.retainedStages = retained; report.pauseCheckpoint = paused.checkpointStage; await save();
    await request(`${base}/resume`, { method: 'POST' });
    const review = await waitFor(value => {
      if (retained.some(id => value.stages.find(stage => stage.id === id)?.status !== 'complete')) throw new SmokeFailure('A completed stage was lost after resume.');
      return value.status === 'review';
    }, 'independent verification and review');
    if (hash(await request(`${base}/artifact?path=${encodeURIComponent('.fleet/packet.json')}`)) !== packetHash) throw new SmokeFailure('The protected checkpoint packet changed after resume.');
    report.checks.resumedWithCompletedStages = true;
    const verification = review.report, quality = verification?.quality;
    if (!verification || verification.exitCode !== 0 || verification.passed <= 0 || verification.total !== verification.passed || verification.failed || verification.skipped || quality?.status !== 'passed' || quality.errors?.length || !quality.journeys?.length || quality.journeys.some(item => item.status !== 'passed') || !quality.criteria?.length || quality.criteria.some(item => item.status !== 'passed')) throw new SmokeFailure('Independent verification did not establish every demo criterion.');
    report.checks.verified = true; report.verification = { sourceHash: verification.sourceHash, nodeTests: verification.passed, browserJourneys: quality.journeys.length, criteria: quality.criteria.length }; await save();
    await request(`${base}/approve`, { method: 'POST', body: { feedback: 'Staging API smoke: accepted after independent Node and browser evidence passed all demo criteria.' } });
    report.checks.approved = true;
    const zip = await request(`${base}/export`, { format: 'bytes' }), inspected = inspectZip(zip);
    if (inspected.sourceHash !== verification.sourceHash) throw new SmokeFailure('Exported source differs from the approved verified version.');
    const exportReport = JSON.parse(inspected.files.get('test-report.json')?.toString() ?? 'null'), approval = JSON.parse(inspected.files.get('review.json')?.toString() ?? 'null');
    if (exportReport?.sourceHash !== verification.sourceHash || approval?.sourceHash !== verification.sourceHash || approval.runId !== runId || !approval.approvedAt || !inspected.files.has('index.html')) throw new SmokeFailure('Exported verification or approval evidence is missing.');
    await writeFile(resolve(output, 'source-and-evidence.zip'), zip, { mode: 0o600 }); report.checks.downloadVerified = true;
    const shared = await request(`${base}/share`, { method: 'POST' }), share = new URL(shared.url);
    if (share.origin !== origin.origin || !/^\/api\/share\/[A-Za-z0-9_-]{43}$/.test(share.pathname)) throw new SmokeFailure('Unexpected public share URL.');
    const redirect = await fetch(share, { redirect: 'manual', signal: AbortSignal.timeout(90_000) });
    const location = redirect.headers.get('location'); await redirect.body?.cancel();
    if (redirect.status !== 302 || !location) throw new SmokeFailure('The public share did not redirect to a preview without authentication.');
    const preview = new URL(location);
    if (preview.protocol !== 'https:' || preview.origin === origin.origin || !preview.hostname.endsWith('.vercel.run')) throw new SmokeFailure('Shared application is not on an isolated Sandbox origin.');
    const response = await fetch(preview, { redirect: 'error', signal: AbortSignal.timeout(30_000) }), html = Buffer.from(await response.arrayBuffer());
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html') || !response.headers.get('content-security-policy') || hash(html) !== hash(inspected.files.get('index.html'))) throw new SmokeFailure('The unauthenticated preview does not match the approved application.');
    report.checks.unauthenticatedShareVerified = true; report.shareUrl = share.href; report.previewUrl = preview.href; report.finishedAt = new Date().toISOString(); report.passed = true; await save();
    console.log(`PASS: live workflow, sign-out, checkpoint pause/resume, approval, ZIP and unauthenticated share.\nEvidence: ${resolve(output, 'report.json')}\nProject left available: ${project.id}`);
  } catch (error) {
    if (report) { report.finishedAt = new Date().toISOString(); report.failure = error instanceof SmokeFailure ? error.message : 'The driver failed unexpectedly; inspect staging without assuming completion.'; await save(); }
    throw error;
  } finally {
    await Promise.allSettled([...sessions].map(logout));
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runLiveSmoke(parseOptions(process.argv.slice(2))).catch(error => { console.error(error instanceof SmokeFailure ? error.message : 'Live smoke failed unexpectedly. No credentials have been printed.'); process.exitCode = 1; });
}
