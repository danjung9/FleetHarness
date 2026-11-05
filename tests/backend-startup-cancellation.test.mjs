import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { ExperimentWorkers } from '../dist-electron/electron/experiment-workers.js';

const resourcesRoot = path.resolve('.');
const immediate = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function observe(promise) {
  const observed = { settled: false, promise: undefined };
  observed.promise = promise.then(value => ({ status: 'fulfilled', value }), error => ({ status: 'rejected', error }))
    .then(result => { observed.settled = true; return result; });
  return observed;
}
async function promptly(observed, message) {
  let timer;
  try {
    return await Promise.race([observed.promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), 250);
    })]);
  } finally { clearTimeout(timer); }
}
function cancelled(result) {
  assert.equal(result.status, 'rejected', 'A cancelled start must reject.');
  assert.match(result.error.message, /stopped/i);
}
function rejected(result, pattern) {
  assert.equal(result.status, 'rejected');
  assert.match(result.error.message, pattern);
}

async function fixture(t, { previousBuild = false } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-start-auth-'));
  const store = new Store(root); await store.init();
  store.state.settings = { backend: 'codex', provider: 'chatgpt', model: 'fixture', rememberKey: false };
  store.state.projects = Array.from({ length: 4 }, (_, index) => newProject({
    title: `Startup fixture ${index}`, description: 'Build a local parser.', criteria: ['Parse supplied text.'],
    dataInputs: [{ name: 'sample.txt', kind: 'text', content: 'TASK: inspect pump' }]
  }));
  if (previousBuild) {
    const project = store.state.projects[0], time = '2026-11-04T12:00:00.000Z';
    project.runId = 'previous-approved-run'; project.workspace = path.join(root, 'workspaces', project.id, project.runId);
    await fs.mkdir(project.workspace, { recursive: true });
    await fs.writeFile(path.join(project.workspace, 'core.cjs'), 'exports.parse = text => text.trim();\n');
    project.report = { time, command: 'node --test app.test.cjs', exitCode: 0, passed: 1, failed: 0, skipped: 0, total: 1,
      output: 'Saved independent verification evidence', durationMs: 5, sourceHash: await sourceHash(project.workspace) };
    project.status = 'approved'; project.approvedAt = time; project.feedback = 'Keep this approved version.';
    project.exportedTo = path.join(root, 'previous-delivery.zip');
    project.executable = { status: 'ready', platform: 'darwin', arch: 'arm64', fileName: 'previous-app.zip' };
    project.reviewHistory = [{ id: 'previous-review', runId: project.runId, decision: 'approved', feedback: project.feedback,
      createdAt: time, sourceHash: project.report.sourceHash }];
    project.stages.forEach(stage => { stage.status = 'complete'; });
    await fs.writeFile(path.join(project.workspace, 'test-report.json'), JSON.stringify(project.report, null, 2));
  }
  await store.save();
  const authentications = [], starts = [], executions = [];
  const codex = {
    account: { status: 'connected', planUsageEnabled: true }, models: [{ id: 'fixture', configured: true }],
    refresh() { const pending = deferred(); authentications.push(pending); return pending.promise; }
  };
  const backend = new FleetBackend(store, process.execPath, () => {}, resourcesRoot, { codex });
  backend.runtime = { getModel: () => ({ input: ['text', 'image'] }), hasConfiguredAuth: () => true };
  // Retain the real public authentication and workspace preparation path. The
  // execution boundary is observed without making a model call or building an app.
  backend.execute = async (project, run) => {
    executions.push({ id: project.id, runId: project.runId, workspace: project.workspace });
    project.status = 'review'; await backend.finish(project, run);
  };
  t.after(async () => {
    for (const auth of authentications) auth.resolve();
    await Promise.all(starts.map(start => start.promise));
    await backend.stopAll();
    await fs.rm(root, { recursive: true, force: true });
  });
  const start = (project = store.state.projects[0]) => {
    const pending = observe(backend.start(project.id)); starts.push(pending); return pending;
  };
  const saved = await fs.readFile(path.join(root, 'state.json'), 'utf8');
  const before = structuredClone(store.state.projects);
  const workspaces = async () => fs.readdir(path.join(root, 'workspaces'), { recursive: true }).then(files => files.sort(), error => {
    if (error.code !== 'ENOENT') throw error; return [];
  });
  const originalWorkspaceFiles = await workspaces();
  const unchanged = async () => {
    assert.deepEqual(store.state.projects, before, 'Authentication must not overwrite the previous project.');
    assert.equal(await fs.readFile(path.join(root, 'state.json'), 'utf8'), saved, 'Authentication must not persist a new run.');
    assert.deepEqual(await workspaces(), originalWorkspaceFiles, 'Authentication must not allocate a workspace.');
    assert.deepEqual(executions, [], 'Authentication must not dispatch execution.');
  };
  return { root, store, backend, codex, authentications, executions, start, unchanged, projects: store.state.projects };
}

test('Stop cancels a pending fresh start before authentication settles and ignores late success', { timeout: 6000 }, async t => {
  const h = await fixture(t), started = h.start();
  assert.equal(h.authentications.length, 1); await h.unchanged();
  await h.backend.stop(h.projects[0].id);
  cancelled(await promptly(started, 'Stop returned while the fresh start remained blocked on authentication.'));
  await h.unchanged(); assert.equal(h.backend.active.size, 0);
  h.authentications[0].resolve(); await immediate();
  await h.unchanged(); assert.equal(h.backend.active.size, 0);
});

test('StopAll cancels every pending fresh authentication without waiting for the account service', { timeout: 6000 }, async t => {
  const h = await fixture(t), starts = h.projects.slice(0, 3).map(h.start);
  await h.unchanged();
  await h.backend.stopAll();
  for (const start of starts) cancelled(await promptly(start, 'StopAll left an authentication request able to start a run.'));
  await h.unchanged(); assert.equal(h.backend.active.size, 0);
  for (const auth of h.authentications) auth.resolve();
  await immediate(); await h.unchanged();
});

test('a late rejected authentication is consumed after Stop and cannot change the project', { timeout: 6000 }, async t => {
  const h = await fixture(t), started = h.start();
  await h.backend.stop(h.projects[0].id);
  cancelled(await promptly(started, 'Cancelled start still waits for a rejected account request.'));
  h.authentications[0].reject(new Error('Late account failure'));
  await immediate(); await h.unchanged(); assert.equal(h.backend.active.size, 0);
});

test('a pending fresh authentication reserves the project against duplicate starts', { timeout: 6000 }, async t => {
  const h = await fixture(t); h.start();
  const duplicate = h.start();
  rejected(await promptly(duplicate, 'A duplicate fresh start was allowed to wait for authentication.'), /already.*active|already.*prepar/i);
  assert.equal(h.authentications.length, 1, 'Duplicate dispatch must be refused before another refresh.');
  await h.unchanged();
});

test('a pending fresh start cannot be replaced by a resume request', { timeout: 6000 }, async t => {
  const h = await fixture(t); h.start();
  await assert.rejects(h.backend.resume(h.projects[0].id), /already.*active|already.*prepar/i);
  await h.unchanged();
});

test('pending fresh authentications reserve all three backend capacity slots', { timeout: 6000 }, async t => {
  const h = await fixture(t); h.projects.slice(0, 3).forEach(h.start);
  const fourth = h.start(h.projects[3]);
  rejected(await promptly(fourth, 'A fourth fresh start entered authentication without a capacity slot.'), /Three runs/);
  assert.equal(h.authentications.length, 3); await h.unchanged();
});

test('failed authentication releases its reservation and preserves the saved project', { timeout: 6000 }, async t => {
  const h = await fixture(t), first = h.start();
  h.authentications[0].reject(new Error('Account service unavailable'));
  rejected(await first.promise, /Account service unavailable/);
  await h.unchanged();
  const next = h.start(); assert.equal(h.authentications.length, 2);
  h.authentications[1].resolve();
  assert.equal((await next.promise).status, 'fulfilled');
  await h.backend.active.get(h.projects[0].id)?.done;
  assert.equal(h.executions.length, 1); assert.equal(h.backend.active.size, 0);
});

test('an unusable authenticated account releases its reservation without replacing the project', { timeout: 6000 }, async t => {
  const h = await fixture(t), first = h.start(); h.codex.account.planUsageEnabled = false;
  h.authentications[0].resolve();
  rejected(await first.promise, /sign in with ChatGPT/); await h.unchanged();
  h.codex.account.planUsageEnabled = true;
  const next = h.start(); h.authentications[1].resolve();
  assert.equal((await next.promise).status, 'fulfilled');
  await h.backend.active.get(h.projects[0].id)?.done;
  assert.equal(h.executions.length, 1);
});

test('an uncancelled authenticated start prepares its real workspace and dispatches exactly once', { timeout: 6000 }, async t => {
  const h = await fixture(t), started = h.start(); await h.unchanged();
  h.authentications[0].resolve(); assert.equal((await started.promise).status, 'fulfilled');
  await h.backend.active.get(h.projects[0].id)?.done;
  assert.equal(h.executions.length, 1); assert.equal(h.backend.active.size, 0);
  assert.equal(h.projects[0].status, 'review');
  assert.match(await fs.readFile(path.join(h.projects[0].workspace, 'requirements.md'), 'utf8'), /Parse supplied text/);
  assert.ok(JSON.parse(await fs.readFile(path.join(h.projects[0].workspace, '.fleet/packet.json'), 'utf8')).acceptance
    .some(criterion => criterion.requirement === 'Parse supplied text.'));
});

test('late authentication from a cancelled attempt cannot release or replace a newer reservation', { timeout: 6000 }, async t => {
  const h = await fixture(t), first = h.start();
  await h.backend.stop(h.projects[0].id);
  cancelled(await promptly(first, 'Cancelled attempt still holds its authentication wait.'));
  const next = h.start(); assert.equal(h.authentications.length, 2);
  h.authentications[0].resolve(); await immediate(); await h.unchanged();
  const duplicate = h.start();
  rejected(await promptly(duplicate, 'Late authentication released the newer reservation.'), /already.*active|already.*prepar/i);
  assert.equal(h.authentications.length, 2);
  h.authentications[1].resolve(); assert.equal((await next.promise).status, 'fulfilled');
  await h.backend.active.get(h.projects[0].id)?.done; assert.equal(h.executions.length, 1);
});

test('cancelling one authentication frees its capacity slot while other starts are still pending', { timeout: 6000 }, async t => {
  const h = await fixture(t), starts = h.projects.slice(0, 3).map(h.start);
  await h.backend.stop(h.projects[0].id);
  cancelled(await promptly(starts[0], 'Cancelled authentication did not release its capacity slot.'));
  const replacement = h.start(h.projects[3]); assert.equal(h.authentications.length, 4);
  h.authentications[3].resolve(); assert.equal((await replacement.promise).status, 'fulfilled');
  await h.backend.active.get(h.projects[3].id)?.done;
  assert.deepEqual(h.executions.map(value => value.id), [h.projects[3].id]);
  assert.equal(starts[1].settled, false); assert.equal(starts[2].settled, false);
});

test('a real shared experiment worker can stop during account refresh without launching a late session', { timeout: 6000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-worker-auth-'));
  const authentication = deferred(), controller = new AbortController(), snapshots = [], sessions = [];
  const source = newProject({ title: 'Shared startup', description: 'Build a local parser.', criteria: ['Parse supplied text.'],
    dataInputs: [{ name: 'sample.txt', kind: 'text', content: 'TASK: inspect pump' }] });
  const experiment = { id: 'experiment-startup', projectId: source.id, lineageId: 'startup', partition: 'development', cohortKey: 'pending',
    mode: 'paired', status: 'planning', baselineProfileId: 'node-cli', candidateIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  let refreshes = 0;
  const workers = new ExperimentWorkers({ root, executable: process.execPath, resourcesRoot,
    runtime: { getModel: () => ({ input: ['text', 'image'] }), hasConfiguredAuth: () => true },
    codex: { account: { status: 'connected', planUsageEnabled: true }, models: [{ id: 'fixture', configured: true }],
      refresh() { refreshes++; return authentication.promise; } },
    operations: () => [], integrations() { throw new Error('The startup fixture never invokes integrations.'); },
    createCodexSession: async options => {
      sessions.push({ aborted: options.signal.aborted });
      return { subscribe: () => () => {}, prompt: async () => { throw new Error('Unexpected late model dispatch'); }, abort: async () => {}, dispose() {} };
    }
  });
  const worker = await workers.sharedPlanner({ experiment, project: source,
    modelConfig: { backend: 'codex', provider: 'chatgpt', model: 'fixture' }, signal: controller.signal,
    saveProjection: value => snapshots.push(structuredClone(value)) });
  const started = observe(worker.start());
  t.after(async () => {
    authentication.resolve(); await started.promise; await worker.wait(); await worker.stop();
    await fs.rm(root, { recursive: true, force: true });
  });
  assert.equal(refreshes, 1); controller.abort(new Error('Experiment stopped by the user.'));
  await worker.stop();
  cancelled(await promptly(started, 'The experiment worker remains blocked on authentication after Stop.'));
  authentication.resolve(); await immediate();
  assert.deepEqual(sessions, [], 'A stopped experiment must never start a model session.');
  assert.deepEqual(snapshots, [], 'A stopped authentication must not publish a running projection.');
  assert.equal(await fs.stat(path.join(root, 'workspaces')).then(() => true, error => {
    if (error.code !== 'ENOENT') throw error; return false;
  }), false);
});

test('cancelling fresh authentication preserves an approved workspace, saved report and delivery state', { timeout: 6000 }, async t => {
  const h = await fixture(t, { previousBuild: true }), project = h.projects[0], workspace = project.workspace;
  const source = await fs.readFile(path.join(workspace, 'core.cjs'));
  const report = await fs.readFile(path.join(workspace, 'test-report.json'));
  const approvedSourceHash = project.report.sourceHash;
  const started = h.start(); await h.unchanged();
  await h.backend.stop(project.id);
  cancelled(await promptly(started, 'Stopping new authentication left the approved build at risk of replacement.'));
  await h.unchanged();
  h.authentications[0].resolve(); await immediate(); await h.unchanged();
  assert.deepEqual(await fs.readFile(path.join(workspace, 'core.cjs')), source);
  assert.deepEqual(await fs.readFile(path.join(workspace, 'test-report.json')), report);
  assert.equal(await sourceHash(workspace), approvedSourceHash);
});

test('Stop wins when authentication fulfills immediately before cancellation is requested', { timeout: 6000 }, async t => {
  const h = await fixture(t), started = h.start();
  h.authentications[0].resolve();
  const stopped = h.backend.stop(h.projects[0].id);
  cancelled(await promptly(started, 'Fulfilled authentication dispatched after Stop was requested.'));
  await stopped; await h.unchanged(); assert.equal(h.backend.active.size, 0);
});
