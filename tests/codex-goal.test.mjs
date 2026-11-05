import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { CodexGoalService } from '../dist-electron/electron/codex-goal.js';
import { RunProcessSweep } from '../dist-electron/electron/process-sweep.js';
import { registerCredential } from '../dist-electron/electron/secrets.js';

const input = {
  title: 'Messages $(touch NEVER_RUN)', description: 'Build a local parser that extracts tasks from attached messages.',
  inputs: 'CSV message rows', outputs: 'Validated tasks and source references', resources: 'Preserve attribution.',
  criteria: ['Parse valid tasks.', 'Reject invalid records with actionable errors.'], links: ['https://example.com/reference'],
  dataInputs: [{ name: 'source.csv', kind: 'file', content: 'task\r\n"inspect pump"\r\n' }, { name: 'notes.txt', kind: 'text', content: '  Keep source whitespace.\n' }]
};
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
async function eventually(check) {
  for (let i = 0; i < 200; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.ok(check(), 'condition did not settle');
}
async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-goal-test-'));
  const store = new Store(root); await store.init();
  const project = newProject(input); store.state.projects = [project]; await store.save();
  const workers = [], snapshots = [];
  const service = new CodexGoalService(store, {
    executable: () => '/bin/sh',
    processSweep: marker => new RunProcessSweep({ ...(marker ? { marker } : {}), scan: async () => [] }),
    changed: () => snapshots.push(structuredClone(project.codexGoal)),
    runThread: async args => {
      const done = deferred();
      const thread = { args, ...done, event(method, params) { args.onEvent({ method, params: { threadId: 'thread-fixture', ...params } }); } };
      workers.push(thread); args.onThread('thread-fixture');
      args.signal.addEventListener('abort', () => done.resolve({ status: 'stopped' }), { once: true });
      if (args.signal.aborted) done.resolve({ status: 'stopped' });
      return done.promise;
    }, ...options
  });
  t.after(async () => { await service.stopAll(); await fs.rm(root, { recursive: true, force: true }); });
  const start = async () => { const launch = await service.launch(project.id); await eventually(() => workers.length || launch.finishedAt); return launch; };
  const settle = async () => { await Promise.all(service.pending()); };
  return { root, store, project, service, workers, snapshots, start, settle };
}

test('headless goal snapshots the complete brief and pushes activity while preserving the previous pipeline result', async t => {
  const { store, project, service, workers, snapshots, start, settle } = await fixture(t);
  Object.assign(project, { status: 'review', workspace: '/previous/build', runId: 'previous-run', report: { passed: true } });
  const previous = structuredClone({ status: project.status, workspace: project.workspace, runId: project.runId, report: project.report, stages: project.stages });
  const launch = await start();
  assert.equal(launch.status, 'running'); assert.equal(launch.threadId, 'thread-fixture');
  assert.equal(service.isActive(project.id), true);
  assert.equal(workers[0].args.workspace, launch.workspace);
  assert.ok(workers[0].args.home); assert.match(workers[0].args.objective, /complete, runnable application/);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(launch.workspace, 'brief.json'), 'utf8')), input);
  for (const [file, value] of [['001-source.csv', input.dataInputs[0].content], ['002-notes.txt', input.dataInputs[1].content]]) {
    assert.equal(await fs.readFile(path.join(launch.workspace, 'inputs', file), 'utf8'), value);
  }
  const requirements = await fs.readFile(path.join(launch.workspace, 'requirements.md'), 'utf8');
  for (const text of [input.description, input.inputs, input.outputs, input.resources, ...input.criteria, ...input.links]) assert.ok(requirements.includes(text));
  assert.match(await fs.readFile(path.join(launch.workspace, 'GOAL.md'), 'utf8'), /verification.md/);
  assert.equal(await service.workspace(project.id), launch.workspace);
  assert.equal(await fs.stat(path.join(launch.workspace, 'Open Codex.command')).catch(error => error.code), 'ENOENT');
  workers[0].event('item/agentMessage/delta', { itemId: 'message-1', delta: 'Building the parser.' });
  workers[0].event('item/started', { item: { type: 'commandExecution', id: 'command-1', command: 'node --test' } });
  workers[0].event('item/commandExecution/outputDelta', { itemId: 'command-1', delta: '\nOne test passed.' });
  assert.ok(snapshots.some(snapshot => snapshot?.activity?.some(item => item.text.includes('Building the parser.'))), 'push happens before completion');
  assert.match(launch.activity.find(item => item.id === 'command-1').text, /node --test\nOne test passed/);
  await new Promise(resolve => setTimeout(resolve, 350));
  const during = JSON.parse(await fs.readFile(path.join(store.root, 'state.json'), 'utf8')).projects[0].codexGoal;
  assert.equal(during.status, 'running'); assert.ok(during.activity.length);
  workers[0].event('item/completed', { item: { type: 'agentMessage', id: 'message-1', text: 'Built and tested. Start with npm start.' } });
  workers[0].resolve({ status: 'completed' }); await settle();
  assert.equal(launch.status, 'completed'); assert.equal(launch.processScope.cleanup, 'confirmed');
  assert.equal(service.isActive(project.id), false); assert.ok(launch.finishedAt);
  for (const [key, value] of Object.entries(previous)) assert.deepEqual(project[key], value, key);
  assert.equal(JSON.parse(await fs.readFile(path.join(store.root, 'state.json'), 'utf8')).projects[0].codexGoal.status, 'completed');
});

test('duplicate starts share the live build; stopping settles it and a new build preserves earlier files', async t => {
  const { project, service, workers, start } = await fixture(t);
  const first = service.launch(project.id), duplicate = service.launch(project.id);
  assert.equal(first, duplicate); assert.equal(service.isLaunching(project.id), true);
  const launch = await first; await eventually(() => workers.length === 1);
  assert.equal(service.launch(project.id), first); assert.deepEqual(service.activeIds(), [project.id]);
  await service.stop(project.id);
  assert.equal(workers[0].args.signal.aborted, true); assert.equal(launch.status, 'stopped');
  assert.equal(service.isActive(project.id), false);
  const next = await start(); assert.notEqual(launch.workspace, next.workspace);
  assert.ok((await fs.stat(path.join(launch.workspace, 'brief.json'))).isFile());
});

test('the reasoning selection is fixed before asynchronous workspace preparation', async t => {
  const { store, project, service, workers } = await fixture(t);
  store.state.settings.reasoningEffort = 'high';
  const launch = service.launch(project.id);
  store.state.settings.reasoningEffort = 'low';
  await launch; await eventually(() => workers.length === 1);
  assert.equal(workers[0].args.reasoningEffort, 'high');
});

test('worker failures are pushed and persisted asynchronously, retain their workspace, and can retry', async t => {
  const { project, service, store, workers, start, settle } = await fixture(t);
  const launch = await start();
  workers[0].reject(new Error('Codex sign-in is required.')); await settle();
  assert.equal(launch.status, 'failed'); assert.match(launch.error, /sign-in/);
  const failedWorkspace = await service.workspace(project.id);
  const reloaded = new Store(store.root); await reloaded.init();
  assert.equal(reloaded.project(project.id).codexGoal.status, 'failed');
  await start(); assert.ok((await fs.stat(failedWorkspace)).isDirectory());
});

test('Stop during preparation prevents any worker startup and releases the reservation', async t => {
  const { project, service, workers } = await fixture(t);
  const started = service.launch(project.id);
  await service.stop(project.id);
  assert.equal((await started).status, 'stopped', 'cancelled preparation returns its stopped state without a spurious launch error');
  assert.equal(workers.length, 0); assert.equal(service.isActive(project.id), false);
  assert.equal(project.codexGoal.status, 'stopped');
});

test('shutdown stops every live worker and rejects subsequent launches', async t => {
  const { project, service, start, workers } = await fixture(t);
  await start(); await service.stopAll();
  assert.equal(project.codexGoal.status, 'stopped'); assert.equal(workers[0].args.signal.aborted, true);
  await assert.rejects(service.launch(project.id), /closing/);
});

test('startup reconciles interrupted goals but preserves completed and legacy Terminal history', async t => {
  const { store, project, service } = await fixture(t);
  project.codexGoal = { id: 'old', workspace: '/old', createdAt: 'old', status: 'running',
    processScope: { marker: 'old-marker', cleanup: 'pending' }, activity: [{ id: 'message', kind: 'message', at: 'old', text: 'Working', status: 'running' }] };
  await service.init();
  assert.equal(project.codexGoal.status, 'stopped'); assert.equal(project.codexGoal.processScope.cleanup, 'confirmed');
  assert.equal(project.codexGoal.activity[0].status, 'failed');
  project.codexGoal = { id: 'legacy-prepared', workspace: '/old', createdAt: 'old', status: 'prepared' };
  await service.init();
  assert.equal(project.codexGoal.status, 'failed');
  assert.match(project.codexGoal.error, /cannot track this earlier goal/);
  for (const status of ['completed', 'opened']) {
    project.codexGoal = { id: 'legacy', workspace: '/old', createdAt: 'old', status };
    await service.init(); assert.equal(project.codexGoal.status, status);
  }
  assert.ok(store.state.projects.length);
});

test('unconfirmed cleanup blocks a new build until Stop can confirm the old worker exited', async t => {
  let fail = true;
  const { project, service, start, workers, settle } = await fixture(t, { processSweep: () => ({ marker: 'scope', run: work => work(), stop: async () => { if (fail) throw new Error('Process cleanup could not be confirmed.'); } }) });
  await start(); workers[0].resolve({ status: 'completed' }); await settle();
  assert.equal(project.codexGoal.status, 'failed'); assert.equal(project.codexGoal.processScope.cleanup, 'unconfirmed');
  assert.equal(service.isActive(project.id), true);
  await assert.rejects(service.launch(project.id), /Stop the previous/);
  fail = false; await service.stop(project.id); assert.equal(service.isActive(project.id), false);
});

test('activity ignores other threads, bounds output and redacts secrets split across streamed deltas', async t => {
  const { project, start, workers } = await fixture(t); await start();
  const worker = workers[0], secret = 'goal-fixture-secret-123456'; registerCredential(secret);
  worker.event('item/agentMessage/delta', { threadId: 'other-thread', itemId: 'other', delta: 'Not this build' });
  worker.event('item/agentMessage/delta', { itemId: 'message', delta: 'Working ' + secret.slice(0, 10) });
  assert.equal(project.codexGoal.activity[0].text, 'Working ');
  worker.event('item/agentMessage/delta', { itemId: 'message', delta: secret.slice(10) + ' safely.' });
  assert.equal(project.codexGoal.activity[0].text, 'Working [REDACTED] safely.');
  worker.event('item/agentMessage/delta', { itemId: 'message', delta: 'a'.repeat(7990) });
  assert.ok(project.codexGoal.activity[0].text.startsWith('Working [REDACTED] safely.'), 'truncation cannot expose an earlier credential tail');
  assert.ok(!project.codexGoal.activity[0].text.includes('123456'));
  for (let index = 0; index < 150; index++) worker.event('item/completed', { item: { id: 'file-' + index, type: 'fileChange', changes: [{ path: 'a'.repeat(20_000) }] } });
  assert.equal(project.codexGoal.activity.length, 100);
  assert.ok(project.codexGoal.activity.every(item => item.text.length <= 8001));
});

test('archived projects and unsafe IDs fail before worker startup', async t => {
  const { service, project, workers } = await fixture(t);
  await assert.rejects(service.launch('../escape'), /Invalid project ID/);
  project.archivedAt = new Date().toISOString();
  await assert.rejects(service.launch(project.id), /archived project/);
  assert.equal(workers.length, 0); assert.equal(project.codexGoal, undefined);
});

test('workspace opening rejects a launch directory replaced with a symlink', async t => {
  const { service, project, root, start } = await fixture(t);
  const launch = await start(); await service.stop(project.id);
  await fs.rename(launch.workspace, launch.workspace + '-original');
  await fs.symlink(root, launch.workspace);
  await assert.rejects(service.workspace(project.id), /ordinary folder/);
});

test('Stop during final persistence waits without restoring an active status', async t => {
  const { service, project, store, workers, start } = await fixture(t), saving = deferred(), release = deferred();
  t.after(() => release.resolve());
  const launch = await start(), save = store.save.bind(store);
  store.save = async () => {
    if (launch.status === 'completed') { saving.resolve(); await release.promise; }
    await save();
  };
  workers[0].resolve({ status: 'completed' });
  await saving.promise;
  let stopped = false;
  const stopping = service.stop(project.id).then(() => { stopped = true; });
  await Promise.resolve(); assert.equal(stopped, false);
  release.resolve(); await stopping;
  assert.equal(launch.status, 'completed'); assert.equal(service.isActive(project.id), false);
  assert.equal(JSON.parse(await fs.readFile(path.join(store.root, 'state.json'), 'utf8')).projects[0].codexGoal.status, 'completed');
});
