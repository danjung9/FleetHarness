import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  foundationCatalog, recommendFoundation, foundationRuntime, validateFoundationPlan,
  prepareFoundationPacket, materializeFoundation, assertFoundationIntegrity
} from '../dist-electron/harness/foundations.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';

const resourcesRoot = fileURLToPath(new URL('..', import.meta.url));
const selected = (computePack = 'scheduling', templateId = 'node-service') => ({
  schemaVersion: 1, templateId, version: '1.0.0', computePack,
  reason: 'Use the versioned service and implement the challenge on its shared computation boundary.'
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function workspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-foundation-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }), { timeout: 5000 });
  return root;
}
async function materialize(t, plan = selected()) {
  const root = await workspace(t);
  await fs.writeFile(path.join(root, 'foundation-plan.json'), JSON.stringify(plan, null, 2) + '\n');
  const snapshot = await materializeFoundation({ workspace: root, resourcesRoot, selection: plan });
  return { root, plan, snapshot, manifest: foundationRuntime(plan) };
}
async function start(t, foundation) {
  const runtime = await prepareSolutionRuntime(foundation.root, foundation.manifest, process.execPath,
    t.signal, { totalTimeoutMs: 45_000, startupTimeoutMs: 10_000, invocationTimeoutMs: 5000 });
  t.after(() => runtime.close(), { timeout: 5000 });
  assert.notEqual(runtime.root, foundation.root);
  for (const file of foundation.manifest.files) assert.ok((await fs.stat(path.join(runtime.root, file))).isFile(), file);
  for (const privateFile of ['.fleet', 'foundation-plan.json', 'evaluation-plan.json']) {
    await assert.rejects(fs.access(path.join(runtime.root, privateFile)), /ENOENT/);
  }
  return runtime;
}

const scheduleInput = {
  windows: [{ start: 0, end: 60 }],
  people: [{ id: 'operator', qualifications: ['inspection'], windows: [{ start: 0, end: 60 }], maxMinutes: 40, restMinutes: 10 }],
  requests: ['inspect-a', 'inspect-b'].map(id => ({
    id, duration: 20, starts: [0, 20, 30], people: ['operator'], resources: ['bay'], qualifications: ['inspection']
  })), maxNodes: 100
};

test('recipe recommendations choose a versioned foundation and the matching computation pack', () => {
  assert.ok(Array.isArray(foundationCatalog) && foundationCatalog.length >= 2);
  const expected = {
    messages: 'messages', scheduling: 'scheduling', offline: 'offline', knowledge: 'evidence',
    readiness: 'readiness', cyber: 'evidence', workflow: 'offline', governance: 'custom',
    physics: 'custom', fielding: 'custom'
  };
  for (const [recipe, computePack] of Object.entries(expected)) {
    const recommendation = recommendFoundation(recipe);
    assert.equal(recommendation.computePack, computePack, recipe);
    assert.equal(recommendation.version, '1.0.0', recipe);
    assert.ok(recommendation.reason.trim().length > 0, recipe);
    assert.ok(['node-service', 'python-service', 'custom'].includes(recommendation.templateId), recipe);
    assert.deepEqual(recommendFoundation(recipe), recommendation, 'Selection should not depend on time or randomness.');
  }
});

test('foundation plans reject unsupported versions, invalid choices and incompatible runtime contracts', () => {
  const plan = selected();
  assert.deepEqual(validateFoundationPlan(plan, foundationRuntime(plan)), plan);
  for (const update of [
    { schemaVersion: 2 }, { templateId: '../outside' }, { version: 'latest' },
    { version: '9.9.9' }, { computePack: 'invented' }, { computePack: ['scheduling'] }, { templateId: ['node-service'] }, { reason: '' }
  ]) assert.throws(() => validateFoundationPlan({ ...plan, ...update }), /foundation|template|version|compute|reason|schema/i);
  assert.throws(() => validateFoundationPlan(selected('scheduling', 'python-service')), /compute|pack|python|template/i);
  const runtime = foundationRuntime(plan);
  for (const wrong of [
    { ...runtime, profile: 'browser' },
    { ...runtime, command: { runtime: 'python', entrypoint: 'server.mjs', args: [] } },
    { ...runtime, files: runtime.files.filter(file => file !== 'compute.mjs') }
  ]) assert.throws(() => validateFoundationPlan(plan, wrong), /runtime|service|command|foundation|file|template/i);
});

test('agent packets contain deterministic catalog and concise foundation instructions', async () => {
  const first = await prepareFoundationPacket('scheduling', resourcesRoot);
  const second = await prepareFoundationPacket('scheduling', resourcesRoot);
  assert.ok(first instanceof Map);
  assert.deepEqual([...first], [...second]);
  assert.ok(first.has('foundation-catalog.json'));
  assert.ok(first.has('foundation-guide.md'));
  const catalog = JSON.parse(first.get('foundation-catalog.json'));
  assert.match(JSON.stringify(catalog), /node-service/);
  assert.match(JSON.stringify(catalog), /python-service/);
  assert.match(first.get('foundation-guide.md'), /foundation-plan\.json/);
  assert.match(first.get('foundation-guide.md'), /comput|backend/i);
});

test('fresh workspaces receive identical bytes and deterministic provenance without a model generating scaffolding', async t => {
  const first = await materialize(t), second = await materialize(t);
  assert.deepEqual(first.snapshot, second.snapshot);
  assert.match(first.snapshot.templateHash, /^[a-f0-9]{64}$/);
  assert.ok(first.snapshot.files > 0 && first.snapshot.bytes > 0);
  assert.equal(await fs.readFile(path.join(first.root, 'foundation-plan.json'), 'utf8'), first.snapshot.planText);
  assert.equal(await fs.readFile(path.join(first.root, 'foundation-lock.json'), 'utf8'), first.snapshot.lockText);
  const lock = JSON.parse(first.snapshot.lockText);
  assert.equal(lock.templateHash, first.snapshot.templateHash);
  assert.deepEqual(lock.selection, first.plan);
  for (const [file, digest] of Object.entries(lock.files)) assert.equal(hash(await fs.readFile(path.join(first.root, file))), digest, file);
  assert.deepEqual(await materializeFoundation({ workspace: first.root, resourcesRoot, selection: first.plan }), first.snapshot);
  assert.equal(first.manifest.profile, 'service');
  assert.deepEqual(first.manifest.requiredEnv, []);
  assert.ok(first.manifest.files.includes('foundation-lock.json'));
  for (const file of first.manifest.files) {
    const left = await fs.readFile(path.join(first.root, file));
    const right = await fs.readFile(path.join(second.root, file));
    assert.equal(hash(left), hash(right), file);
  }
  await assertFoundationIntegrity(first.root, first.snapshot);
  await assertFoundationIntegrity(second.root, second.snapshot);
});

test('pinned templates reject changed bundled bytes and symlinked source assets before copying', async t => {
  const plan = selected('custom'), destination = await workspace(t), resources = await workspace(t);
  await fs.writeFile(path.join(destination, 'foundation-plan.json'), JSON.stringify(plan));
  await fs.cp(path.join(resourcesRoot, 'templates'), path.join(resources, 'templates'), { recursive: true });
  const source = path.join(resources, 'templates', 'node-service', 'server.mjs');
  await fs.appendFile(source, '\n// changed without a template version update\n');
  await assert.rejects(materializeFoundation({ workspace: destination, resourcesRoot: resources, selection: plan }), /checksum|hash|pinned/i);
  await assert.rejects(fs.access(path.join(destination, 'server.mjs')), /ENOENT/);
  if (process.platform === 'win32') {
    // Real source bytes behind a junction ancestor exercise the source guard
    // without requiring Windows file-symlink privileges.
    const external = path.join(resources, 'external-template');
    assert.equal(path.dirname(external), resources);
    await fs.rename(path.dirname(source), external);
    await fs.copyFile(path.join(resourcesRoot, 'templates', 'node-service', 'server.mjs'), path.join(external, 'server.mjs'));
    await fs.symlink(external, path.dirname(source), 'junction');
    assert.equal(await fs.readFile(source, 'utf8'), await fs.readFile(path.join(external, 'server.mjs'), 'utf8'));
  } else {
    const external = path.join(resources, 'external-server.mjs');
    await fs.copyFile(path.join(resourcesRoot, 'templates', 'node-service', 'server.mjs'), external);
    await fs.rm(source);
    await fs.symlink(external, source);
  }
  await assert.rejects(materializeFoundation({ workspace: destination, resourcesRoot: resources, selection: plan }), /symlink|ordinary/i);
  await assert.rejects(fs.access(path.join(destination, 'foundation-lock.json')), /ENOENT/);
});

test('materialization refuses to overwrite user files or follow workspace and destination symlinks', async t => {
  const plan = selected();
  const root = await workspace(t);
  await fs.writeFile(path.join(root, 'foundation-plan.json'), JSON.stringify(plan));
  await fs.writeFile(path.join(root, 'server.mjs'), 'existing application');
  await assert.rejects(materializeFoundation({ workspace: root, resourcesRoot, selection: plan }), /exist|overwrite|conflict/i);
  assert.equal(await fs.readFile(path.join(root, 'server.mjs'), 'utf8'), 'existing application');

  const outside = await workspace(t);
  await fs.writeFile(path.join(outside, 'index.html'), 'outside content');
  const linked = await workspace(t);
  await fs.writeFile(path.join(linked, 'foundation-plan.json'), JSON.stringify(plan));
  await fs.symlink(outside, path.join(linked, 'public'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(materializeFoundation({ workspace: linked, resourcesRoot, selection: plan }), /symlink|ordinary|real|directory/i);
  assert.equal(await fs.readFile(path.join(outside, 'index.html'), 'utf8'), 'outside content');

  const parent = await workspace(t);
  await fs.symlink(linked, path.join(parent, 'linked-workspace'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(materializeFoundation({ workspace: path.join(parent, 'linked-workspace'), resourcesRoot, selection: plan }), /symlink|ordinary|real|directory/i);
});

test('computation packs must match the pinned compiled-module hashes before files are copied', async t => {
  const plan = selected('scheduling'), destination = await workspace(t), resources = await workspace(t);
  await fs.writeFile(path.join(destination, 'foundation-plan.json'), JSON.stringify(plan));
  await fs.cp(path.join(resourcesRoot, 'templates'), path.join(resources, 'templates'), { recursive: true });
  const registryPath = path.join(resources, 'templates', 'registry.json');
  const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
  registry.computation.files['scheduling.js'] = '0'.repeat(64);
  await fs.writeFile(registryPath, JSON.stringify(registry));
  await assert.rejects(materializeFoundation({ workspace: destination, resourcesRoot: resources, selection: plan }), /computation checksum mismatch/i);
  assert.deepEqual(await fs.readdir(destination), ['foundation-plan.json']);
});

test('materialization is bound to the accepted plan and later plan or provenance changes fail integrity checks', async t => {
  const root = await workspace(t), plan = selected();
  await fs.writeFile(path.join(root, 'foundation-plan.json'), JSON.stringify(selected('messages')));
  await assert.rejects(materializeFoundation({ workspace: root, resourcesRoot, selection: plan }), /plan|selection|match|changed/i);
  for (const file of ['foundation-plan.json', 'foundation-lock.json']) {
    const foundation = await materialize(t);
    await fs.appendFile(path.join(foundation.root, file), '\n ');
    await assert.rejects(assertFoundationIntegrity(foundation.root, foundation.snapshot), /changed|integrity|foundation|plan|lock/i);
  }
});

test('packaged scheduling performs real feasibility computation from a clean service copy', { timeout: 60_000 }, async t => {
  const foundation = await materialize(t, selected('scheduling'));
  await fs.mkdir(path.join(foundation.root, '.fleet'));
  await fs.writeFile(path.join(foundation.root, '.fleet', 'packet.json'), '{"private":"must not be packaged"}');
  const runtime = await start(t, foundation);
  await fs.rm(foundation.root, { recursive: true, force: true });
  const result = await runtime.invoke(scheduleInput);
  assert.equal(result.status, 'feasible');
  assert.deepEqual(result.assignments, [
    { id: 'inspect-a', start: 0, end: 20, people: ['operator'], resources: ['bay'] },
    { id: 'inspect-b', start: 30, end: 50, people: ['operator'], resources: ['bay'] }
  ]);
  const impossible = structuredClone(scheduleInput);
  impossible.people[0].maxMinutes = 39;
  assert.equal((await runtime.invoke(impossible)).status, 'infeasible');
  assert.equal((await runtime.invoke({ ...scheduleInput, maxNodes: 1 })).status, 'budget_exhausted');
  await runtime.assertIntegrity();
});

test('packaged messages retain exact offsets and flag unsupported or ambiguous source content', { timeout: 60_000 }, async t => {
  const runtime = await start(t, await materialize(t, selected('messages')));
  const text = 'TASK/T1/2026-11-04T09:00-05:00/Team/Inspect pump//\nTASK/T2/tomorrow/Team/Inspect valve//\nunsupported';
  const result = await runtime.invoke({ sourceId: 'test-source', text });
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].due, '2026-11-04T14:00:00.000Z');
  assert.equal(result.items[1].due, null);
  assert.equal(result.needsReview, true);
  assert.equal(result.warnings.length, 1);
  for (const item of result.items) {
    for (const span of [item.source, ...Object.values(item.fields)]) assert.equal(text.slice(span.start, span.end), span.text);
  }
});

test('packaged dependency analysis distinguishes late work, unknown estimates and invalid graphs', { timeout: 60_000 }, async t => {
  const runtime = await start(t, await materialize(t, selected('readiness')));
  const input = { deadline: 10, targets: ['finish'], nodes: [
    { id: 'parts', duration: 7, readyAt: 0, dependencies: [], source: 'fixture:parts' },
    { id: 'staff', duration: 2, readyAt: 0, dependencies: [], source: 'fixture:staff' },
    { id: 'finish', duration: 5, readyAt: 0, dependencies: ['parts', 'staff'], source: 'fixture:finish' }
  ] };
  const result = (await runtime.invoke(input)).targets[0];
  assert.equal(result.finish, 12);
  assert.equal(result.margin, -2);
  assert.equal(result.status, 'late');
  assert.deepEqual(result.path, ['parts', 'finish']);
  const unknown = structuredClone(input);
  unknown.nodes[0].duration = null;
  assert.equal((await runtime.invoke(unknown)).targets[0].status, 'unknown');
  assert.equal((await runtime.invoke(unknown)).targets[0].finish, null);
  const cycle = structuredClone(input);
  cycle.nodes[0].dependencies = ['finish'];
  await assert.rejects(runtime.invoke(cycle), /HTTP request failed/);
});

test('packaged evidence excludes unapproved documents and returns actual source spans', { timeout: 60_000 }, async t => {
  const runtime = await start(t, await materialize(t, selected('evidence')));
  const document = { id: 'approved', title: 'Pump maintenance', source: 'fixture:pump',
    text: 'Inspect the pump seal before release.', approved: true, updatedAt: '2026-10-01T00:00:00Z' };
  const input = { query: 'pump seal', asOf: '2026-11-04T00:00:00Z', maxAgeDays: 10, documents: [
    document, { ...document, id: 'excluded', approved: false, text: 'pump seal pump seal' }
  ] };
  const result = await runtime.invoke(input);
  assert.equal(result.status, 'matches');
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].id, 'approved');
  assert.equal(result.results[0].stale, true);
  const span = result.results[0].excerpt;
  assert.equal(span.text, document.text.slice(span.start, span.end));
  const absent = await runtime.invoke({ ...input, query: 'nonexistent' });
  assert.equal(absent.status, 'unknown');
  assert.deepEqual(absent.results, []);
});

test('packaged offline reconciliation preserves concurrent edits and converges across order and retries', { timeout: 60_000 }, async t => {
  const runtime = await start(t, await materialize(t, selected('offline')));
  const base = { id: 'base', recordId: 'record', parents: [], actor: 'a', value: 'draft' };
  const local = [base, { ...base, id: 'local', parents: ['base'], value: 'changed' }];
  const remote = [base, { ...base, id: 'deleted', parents: ['base'], actor: 'b', value: null }];
  const forward = await runtime.invoke({ local, remote });
  assert.equal(forward.conflicts, 1);
  assert.equal(forward.records[0].status, 'conflict');
  assert.deepEqual(forward.records[0].heads.map(head => head.id), ['deleted', 'local']);
  assert.deepEqual(await runtime.invoke({ local: remote, remote: local }), forward);
  assert.deepEqual(await runtime.invoke({ local: forward.operations, remote }), forward);
});

test('the starter UI posts input to the delivered backend and renders its computed result', { timeout: 60_000 }, async t => {
  const foundation = await materialize(t, selected('scheduling'));
  const runtime = await start(t, foundation);
  const browser = await chromium.launch({ headless: true, timeout: 10_000 })
    .catch(() => chromium.launch({ channel: 'chrome', headless: true, timeout: 10_000 }));
  const cancelBrowser = () => { void browser.close().catch(() => {}); };
  t.signal.addEventListener('abort', cancelBrowser, { once: true });
  t.after(async () => { t.signal.removeEventListener('abort', cancelBrowser); await browser.close(); }, { timeout: 10_000 });
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(10_000);
  await page.goto(runtime.url);
  await page.locator('#input').fill(JSON.stringify(scheduleInput));
  const [response] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === foundation.manifest.invokePath),
    page.locator('#run').click()
  ]);
  assert.equal(response.request().method(), 'POST');
  assert.deepEqual(response.request().postDataJSON(), scheduleInput);
  assert.equal(response.status(), 200);
  const result = await response.json();
  assert.equal(result.status, 'feasible');
  await page.waitForFunction(() => document.querySelector('#result').textContent.includes('inspect-b'));
  assert.deepEqual(JSON.parse(await page.locator('#result').innerText()), result);
  await page.locator('#input').fill('{ invalid JSON');
  await page.locator('#run').click();
  await page.locator('#error').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#input').getAttribute('aria-invalid'), 'true');
  await page.locator('#input').fill(JSON.stringify({ ...scheduleInput, maxNodes: 1 }));
  await page.locator('#run').click();
  await page.waitForFunction(() => document.querySelector('#result').textContent.includes('budget_exhausted'));
  assert.equal(JSON.parse(await page.locator('#result').innerText()).status, 'budget_exhausted');
});

const pythonAvailable = spawnSync('python3', ['--version'], { timeout: 5000 }).status === 0;
test('Python foundation fails explicitly before customization and runs the delivered core afterward', {
  timeout: 60_000, skip: !pythonAvailable && 'python3 is not installed'
}, async t => {
  const foundation = await materialize(t, selected('custom', 'python-service'));
  const unimplemented = await start(t, foundation);
  const response = await fetch(new URL(foundation.manifest.invokePath, unimplemented.url), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: [2, 3] }),
    signal: AbortSignal.any([t.signal, AbortSignal.timeout(5000)])
  });
  assert.equal(response.status, 501);
  assert.match(await response.text(), /implement|not implemented/i);
  await assert.rejects(unimplemented.invoke({ values: [2, 3] }), /HTTP request failed with status 501/);
  await unimplemented.close();
  await fs.writeFile(path.join(foundation.root, 'compute.py'), 'def compute(input_value):\n    return {"total": sum(input_value["values"])}\n');
  const customized = await start(t, foundation);
  await fs.rm(foundation.root, { recursive: true, force: true });
  assert.deepEqual(await customized.invoke({ values: [2, 3, -1] }), { total: 4 });
  assert.deepEqual(await customized.invoke({ values: [] }), { total: 0 });
  await customized.assertIntegrity();
});
