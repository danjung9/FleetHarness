import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { registerCredential, redactSecrets, redactValue, secretTextBuffer, redactPartialSecrets } from '../dist-electron/electron/secrets.js';
import { protectRuntimeCredentials } from '../dist-electron/electron/pi-credentials.js';
import { Store, newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';
import { stageExecutable } from '../dist-electron/electron/executable.js';
import { redactedSessionManager } from '../dist-electron/electron/session-logs.js';
import { reportHash, deliveryEvidence, verifiedManifest } from '../dist-electron/electron/delivery.js';
import { judgeAccepted, judgeGaps } from '../dist-electron/shared/verification.js';

async function fixture(t) {
  const parent = path.resolve('output/secrets-tests'); await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'case-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'); await fs.mkdir(workspace); return { root, workspace };
}

function bindApproval(project) {
  project.runId = 'synthetic-run';
  project.processScope = { runId: project.runId, marker: 'synthetic-marker', cleanup: 'confirmed' };
  project.stages.find(stage => stage.id === 'review').status = 'complete';
  project.verification = { runId: project.runId, reportHash: reportHash(project.report) };
  project.approval = { runId: project.runId, sourceHash: project.report.sourceHash,
    reportHash: project.verification.reportHash, approvedAt: project.approvedAt, feedback: project.feedback,
    ...(!judgeAccepted(project.report) ? { judgeGapsAccepted: true, acceptedJudgeGaps: structuredClone(judgeGaps(project.report)) } : {}) };
}

test('one redactor removes configured values, escaped values and authorization fields', () => {
  const secret = 'synthetic-configured-credential'; registerCredential(secret);
  const escaped = 'synthetic-quoted-"credential\\value'; registerCredential(escaped);
  for (const input of [secret, JSON.stringify({ detail: escaped }), encodeURIComponent(escaped), 'Authorization: Bearer synthetic-other-token',
    JSON.stringify({ detail: JSON.stringify({ Authorization: 'Bearer synthetic-other-token' }) }),
    '{"authorization":"Bearer synthetic-other-token"}', "{'X-API-Key': 'synthetic-other-token'}", 'Proxy-Authorization: Basic synthetic-other-token',
    'Cookie: session=synthetic-other-token; flag=yes', 'Set-Cookie: session=synthetic-other-token; Secure']) {
    const result = redactSecrets(input);
    assert.ok(result.includes('[REDACTED]')); assert.ok(!result.includes('synthetic-other-token')); assert.ok(!result.includes(secret));
    assert.ok(!result.includes(JSON.stringify(escaped).slice(1, -1)));
  }
  assert.deepEqual(redactValue({ nested: { Authorization: 'synthetic-unconfigured-token' }, count: 3 }), { nested: { Authorization: '[REDACTED]' }, count: 3 });
  assert.equal(redactSecrets('No credentials in this diagnostic.'), 'No credentials in this diagnostic.');
});

test('runtime key registration and resolved auth are covered without a provider call', async () => {
  const runtime = protectRuntimeCredentials({ setRuntimeApiKey: async () => { throw new Error('synthetic-key-rejected'); },
    getAuth: async () => ({ auth: { apiKey: 'synthetic-resolved-key', headers: { Authorization: 'Bearer synthetic-resolved-header' } } }) });
  await assert.rejects(runtime.setRuntimeApiKey('fixture', 'synthetic-key-before-failure'));
  assert.equal(redactSecrets('synthetic-key-before-failure'), '[REDACTED]');
  await runtime.getAuth('fixture');
  assert.equal(redactSecrets('synthetic-resolved-key'), '[REDACTED]');
  assert.equal(redactSecrets('synthetic-resolved-header'), '[REDACTED]');
});

test('document redaction picks up newly configured credentials on each save', () => {
  const name = 'FLEET_REDACTION_TEST_API_KEY';
  const previous = process.env[name];
  try {
    for (const value of ['synthetic-first-save-key', 'synthetic-next-save-key']) {
      process.env[name] = value;
      assert.deepEqual(redactValue({ rows: [{ detail: value }, { [value]: value }] }),
        { rows: [{ detail: '[REDACTED]' }, { '[REDACTED]': '[REDACTED]' }] });
    }
    assert.equal(redactValue({ previous: 'synthetic-first-save-key' }).previous, '[REDACTED]');
  } finally { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; }
});

test('credential-like filenames preserve hashes and encoded baseline bytes while real credential fields stay redacted', () => {
  const secret = 'synthetic-baseline-field-credential'; registerCredential(secret);
  const digest = 'a'.repeat(64), bytes = Buffer.from('require("node:test")("synthetic case", () => {});').toString('base64');
  const baseline = { buildTests: { 'token.test.cjs': digest, 'tests/password.test.cjs': digest },
    buildTestContents: { 'token.test.cjs': bytes, 'tests/password.test.cjs': bytes },
    headers: { Authorization: 'Bearer synthetic-unregistered-value' }, apiKey: secret, output: secret };
  const redacted = redactValue(baseline);
  assert.deepEqual(redacted.buildTests, baseline.buildTests);
  assert.deepEqual(redacted.buildTestContents, baseline.buildTestContents);
  assert.equal(redacted.headers.Authorization, '[REDACTED]'); assert.equal(redacted.apiKey, '[REDACTED]');
  assert.equal(redacted.output, '[REDACTED]');
});

test('streamed text is redacted across every possible credential and header split', () => {
  const credential = 'synthetic-split-credential'; registerCredential(credential);
  for (const input of [credential, 'Authorization: Bearer synthetic-split-header']) for (let split = 1; split < input.length; split++) {
    const logs = [], buffer = secretTextBuffer(text => logs.push(text));
    buffer.append(input.slice(0, split)); assert.equal(logs.length, 0);
    buffer.append(input.slice(split)); buffer.flush();
    assert.equal(logs.length, 1); assert.ok(logs[0].includes('[REDACTED]'));
    assert.ok(!logs[0].includes(credential)); assert.ok(!logs[0].includes('synthetic-split-header'));
  }
});

test('project lead can stream ordinary text without exposing partial credentials', () => {
  const secret = 'synthetic-streaming-conversation-key'; registerCredential(secret);
  assert.equal(redactPartialSecrets('Planning is underway.'), 'Planning is underway.');
  for (let length = 1; length < secret.length; length++) assert.equal(redactPartialSecrets(secret.slice(0, length)), '');
  assert.equal(redactPartialSecrets(secret), '[REDACTED]');
  for (let length = 1; length <= 'Authorization: Bearer synthetic-header-key'.length; length++) {
    assert.equal(redactPartialSecrets('Authorization: Bearer synthetic-header-key'.slice(0, length)), '');
  }
});

test('production log, tool metadata, saved state and report redact synthetic credentials', async t => {
  const { root, workspace } = await fixture(t);
  const secret = 'synthetic-persisted-credential'; registerCredential(secret);
  const store = new Store(root); await store.init(); const project = store.state.projects[0];
  const backend = new FleetBackend(store, process.execPath, () => {}, root);
  backend.log(project, 'build', 'tool', 'bash completed\n' + secret, { target: secret, name: 'bash', callId: 'synthetic', phase: 'complete' });
  backend.log(project, 'build', 'error', 'Authorization: Bearer synthetic-diagnostic-credential');
  backend.log(project, 'build', 'text', secret.slice(0, 13)); backend.log(project, 'build', 'text', secret.slice(13));
  assert.ok(!JSON.stringify(project.logs).includes(secret)); assert.ok(!JSON.stringify(project.logs).includes('synthetic-diagnostic-credential'));
  project.workspace = workspace; project.error = secret; project.report = { output: secret };
  await backend.finish(project, { processes: { stop: async () => {} }, controller: new AbortController(), outcome: 'failed', resolve() {} });
  for (const file of [path.join(root, 'state.json'), path.join(workspace, 'test-report.json')]) {
    const body = await fs.readFile(file, 'utf8'); assert.ok(!body.includes(secret)); assert.ok(body.includes('[REDACTED]'));
  }
});

test('source and executable delivery refuse a configured credential even with a matching approved hash', async t => {
  const { root, workspace } = await fixture(t);
  const secret = 'synthetic-delivery-credential'; registerCredential(secret);
  await fs.writeFile(path.join(workspace, 'index.html'), '<p>' + secret + '</p>');
  const hash = await sourceHash(workspace);
  const project = { ...newProject({ title: 'Synthetic delivery', description: 'Synthetic credential refusal.', criteria: [] }),
    workspace, status: 'approved', approvedAt: 'synthetic-approval', report: { exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0, sourceHash: hash } };
  bindApproval(project);
  const evidence = { report: '{"output":"Synthetic host evidence"}', review: '{"feedback":"Synthetic approval"}' };
  await assert.rejects(stageExecutable(project, root), /configured credential/);
  await assert.rejects(exportVerifiedBundle({ workspace, parent: root, title: project.title, verifiedHash: hash, deliveryMarkdown: 'Synthetic delivery', evidence }), /configured credential/);
  await fs.writeFile(path.join(workspace, 'index.html'), '<p>Safe synthetic page</p>');
  const cleanHash = await sourceHash(workspace);
  await assert.rejects(exportVerifiedBundle({ workspace, parent: root, title: project.title, verifiedHash: cleanHash, deliveryMarkdown: secret, evidence }), /configured credential/);
  await fs.writeFile(path.join(workspace, 'test-report.json'), JSON.stringify({ output: secret }));
  // Export now takes authoritative receipt bytes from its host argument.
  for (const field of ['report', 'review']) await assert.rejects(exportVerifiedBundle({ workspace, parent: root, title: project.title,
    verifiedHash: cleanHash, deliveryMarkdown: 'Synthetic', evidence: { ...evidence, [field]: await fs.readFile(path.join(workspace, 'test-report.json'), 'utf8') } }), /configured credential/);
  await fs.rm(path.join(workspace, 'test-report.json'));
  project.report.sourceHash = cleanHash;
  bindApproval(project);
  const staged = await stageExecutable(project, root); assert.equal(await fs.readFile(path.join(staged.source, 'index.html'), 'utf8'), '<p>Safe synthetic page</p>');
});

test('atomic redacted receipts retain authoritative evidence through saveProject, reload and export', async t => {
  const { root, workspace } = await fixture(t), secret = 'synthetic-merged-evidence-credential'; registerCredential(secret);
  const store = new Store(root); await store.init();
  const project = store.state.projects[0];
  project.workspace = workspace; project.runId = 'synthetic-run'; project.status = 'running';
  project.processScope = { runId: project.runId, marker: 'synthetic-marker', cleanup: 'pending' };
  project.stages.find(stage => stage.id === 'review').status = 'review';
  await fs.writeFile(path.join(workspace, 'index.html'), '<p>Synthetic clean delivery</p>');
  project.report = { exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0,
    sourceHash: await sourceHash(workspace), output: secret + '\nAuthorization: Bearer synthetic-merged-header' };
  const canary = path.join(root, 'outside-receipt'); await fs.writeFile(canary, 'Synthetic canary');
  await fs.symlink(canary, path.join(workspace, 'test-report.json'));
  const backend = new FleetBackend(store, process.execPath, () => {}, root);
  // No worker is launched here. Lifecycle tests separately exercise real cleanup.
  await backend.finish(project, { processes: { marker: 'synthetic-marker', stop: async () => {} },
    controller: new AbortController(), outcome: 'review', resolve() {} });
  assert.equal(project.status, 'review'); assert.equal(await fs.readFile(canary, 'utf8'), 'Synthetic canary');
  assert.equal((await fs.lstat(path.join(workspace, 'test-report.json'))).isSymbolicLink(), false);
  const report = await fs.readFile(path.join(workspace, 'test-report.json'), 'utf8');
  assert.ok(!report.includes(secret)); assert.ok(!report.includes('synthetic-merged-header'));
  assert.equal(reportHash(JSON.parse(report)), project.verification.reportHash);
  const approved = structuredClone(project); approved.status = 'approved'; approved.approvedAt = 'synthetic-approval';
  approved.feedback = secret; bindApproval(approved);
  await store.saveProject(approved);
  const state = await fs.readFile(path.join(root, 'state.json'), 'utf8');
  assert.ok(!state.includes(secret)); assert.ok(!state.includes('synthetic-merged-header'));
  const restored = new Store(root); await restored.init(); const saved = restored.project(project.id);
  await verifiedManifest(saved, true);
  assert.equal(saved.verification.reportHash, project.verification.reportHash);
  const evidence = deliveryEvidence(saved);
  assert.equal(evidence.report, report); assert.ok(!evidence.review.includes(secret));
  // Workspace receipts remain untrusted mirrors, including any later secret injection.
  await fs.writeFile(path.join(workspace, 'test-report.json'), secret);
  const destination = await exportVerifiedBundle({ workspace, parent: root, title: saved.title,
    verifiedHash: saved.report.sourceHash, deliveryMarkdown: 'Synthetic clean delivery', evidence });
  assert.equal(await fs.readFile(path.join(destination, 'test-report.json'), 'utf8'), evidence.report);
  assert.equal(await fs.readFile(path.join(destination, 'review.json'), 'utf8'), evidence.review);
  assert.equal(await sourceHash(destination), saved.report.sourceHash);
});

test('real SDK session entries retain context but persist only sanitized diagnostics', async t => {
  const { root, workspace } = await fixture(t);
  const secret = 'synthetic-session-credential'; registerCredential(secret);
  const directory = path.join(root, 'sessions'), manager = redactedSessionManager(workspace, directory);
  manager.appendMessage({ role: 'user', content: secret, timestamp: Date.now() });
  manager.appendMessage({ role: 'toolResult', toolCallId: 'synthetic', toolName: 'bash', content: [{ type: 'text', text: 'Authorization: Bearer synthetic-session-header' }], isError: false, timestamp: Date.now() });
  assert.ok(JSON.stringify(manager.getEntries()).includes(secret), 'Redaction must not silently alter active model context.');
  const files = await fs.readdir(directory); assert.equal(files.length, 1);
  const saved = await fs.readFile(path.join(directory, files[0]), 'utf8');
  assert.ok(!saved.includes(secret)); assert.ok(!saved.includes('synthetic-session-header'));
  assert.ok(saved.includes('[REDACTED]')); assert.equal(saved.trim().split('\n').length, 3);
});
