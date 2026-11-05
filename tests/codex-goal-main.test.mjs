import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { briefHash } from '../dist-electron/electron/conversation.js';
import { mainHarness } from './helpers/main-harness.mjs';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-goal-main-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new Store(root); await store.init();
  const project = newProject({ title: 'Headless build', description: 'Build a local task board.', criteria: ['Save tasks locally.'] });
  store.state.projects = [project]; await store.save();
  const active = new Set(), calls = [];
  const goals = {
    isActive: id => active.has(id), activeIds: () => [...active], pending: () => [],
    async launch(id) {
      calls.push(['launch', id]); active.add(id);
      return store.project(id).codexGoal = { id: 'goal-1', workspace: path.join(root, 'goal'), createdAt: new Date().toISOString(), status: 'running' };
    },
    async stop(id) { calls.push(['stop', id]); active.delete(id); },
    async stopAll() { calls.push(['stopAll']); active.clear(); },
  };
  return { store, project, active, goals, calls };
}

test('a launched headless goal protects the project and account until it stops', async t => {
  const { store, project, goals, calls } = await fixture(t);
  const main = await mainHarness(store, undefined, 'electron/main.ts', { hostCodexGoals: goals });
  const launch = await main.invoke('fleet:codex-goal:launch', project.id);
  assert.equal(launch.status, 'running');
  for (const channel of ['fleet:start', 'fleet:resume', 'fleet:update', 'fleet:approve', 'fleet:codex-goal:launch']) {
    await assert.rejects(main.invoke(channel, project.id, 'Reviewed the generated application.'), /Stop this Codex build/);
  }
  await assert.rejects(main.invoke('fleet:chatgpt:disconnect'), /Stop active builds/);
  await main.invoke('fleet:codex-goal:stop', project.id);
  await main.invoke('fleet:codex-goal:launch', project.id);
  assert.deepEqual(calls, [['launch', project.id], ['stop', project.id], ['launch', project.id]]);
});

test('headless goals share the three-build limit with pipeline runs', async t => {
  const { store, project, goals, active, calls } = await fixture(t);
  active.add('goal-a'); active.add('goal-b');
  const backend = { active: new Map([['pipeline-c', {}]]), async start() { assert.fail('Capacity must be checked before starting a pipeline.'); } };
  const main = await mainHarness(store, backend, 'electron/main.ts', { hostCodexGoals: goals });
  await assert.rejects(main.invoke('fleet:codex-goal:launch', project.id), /Three builds/);
  await assert.rejects(main.invoke('fleet:start', project.id), /Three builds/);
  assert.deepEqual(calls, []);
  active.delete('goal-b');
  assert.equal((await main.invoke('fleet:codex-goal:launch', project.id)).status, 'running');
});

test('goal preparation reserves capacity before another launch can start', async t => {
  const { store, project, goals, active } = await fixture(t), prepared = deferred();
  t.after(() => prepared.resolve());
  active.add('goal-a'); active.add('goal-b');
  const second = newProject({ title: 'Second build', description: 'Build another local task board.', criteria: ['Save tasks.'] });
  store.state.projects.push(second);
  goals.launch = async id => { active.add(id); await prepared.promise; return { id: 'prepared-goal', status: 'running' }; };
  const main = await mainHarness(store, undefined, 'electron/main.ts', { hostCodexGoals: goals });
  const starting = main.invoke('fleet:codex-goal:launch', project.id);
  await assert.rejects(main.invoke('fleet:codex-goal:launch', second.id), /Three builds/);
  await assert.rejects(main.invoke('fleet:update', project.id), /Stop this Codex build/);
  prepared.resolve(); await starting;
});

for (const channel of ['fleet:stop', 'fleet:codex-goal:stop']) test(`${channel} waits for headless cancellation without stopping the pipeline`, async t => {
  const { store, project, goals, active } = await fixture(t), entered = deferred(), released = deferred();
  t.after(() => released.resolve());
  active.add(project.id);
  goals.stop = async id => { assert.equal(id, project.id); entered.resolve(); await released.promise; active.delete(id); };
  const backend = { active: new Map(), async stop() { assert.fail('A headless goal must use its own cancellation.'); } };
  const main = await mainHarness(store, backend, 'electron/main.ts', { hostCodexGoals: goals });
  let stopped = false;
  const stopping = main.invoke(channel, project.id).then(() => { stopped = true; });
  await entered.promise;
  assert.equal(stopped, false);
  assert.equal(active.has(project.id), true);
  released.resolve(); await stopping;
  assert.equal(stopped, true); assert.equal(active.has(project.id), false);
});

test('a conversation Stop proposal recognizes a headless goal', async t => {
  const { store, project, goals, active, calls } = await fixture(t);
  active.add(project.id);
  const action = { id: 'stop-goal', type: 'stop', title: 'Stop build', reason: 'Stop the current build.', status: 'proposed', baseBriefHash: briefHash(project), runId: project.runId };
  project.conversation = { status: 'idle', messages: [], actions: [action], questions: [] };
  const main = await mainHarness(store, undefined, 'electron/main.ts', {
    hostCodexGoals: goals, briefHash, randomUUID, hostLead: { active: new Map(), async cancel() {} },
  });
  await main.invoke('fleet:conversation:apply', project.id, action.id);
  assert.equal(action.status, 'applied');
  assert.deepEqual(calls, [['stop', project.id]]);
});

test('quitting cancels headless work and waits for cleanup instead of goal completion', { timeout: 3000 }, async t => {
  const { store, project, goals, active } = await fixture(t), entered = deferred(), released = deferred(), quit = deferred();
  t.after(() => released.resolve());
  active.add(project.id);
  goals.pending = () => [new Promise(() => {})];
  goals.stopAll = async () => { entered.resolve(); await released.promise; active.clear(); };
  const events = new Map(); let quitCalls = 0;
  const app = {
    commandLine: { appendSwitch() {} }, isPackaged: false, getAppPath: () => process.cwd(), getPath: () => store.root,
    setPath() {}, setName() {}, requestSingleInstanceLock: () => true, whenReady: () => ({ then() {} }),
    on: (name, callback) => events.set(name, callback), quit() { quitCalls++; quit.resolve(); },
  };
  await mainHarness(store, { active: new Map(), async stopAll() {} }, 'electron/main.ts', {
    app, hostCodexGoals: goals, hostExperiments: undefined, hostLead: { active: new Map(), async stopAll() {} },
  });
  let prevented = false;
  events.get('before-quit')({ preventDefault() { prevented = true; } });
  await entered.promise;
  assert.equal(prevented, true); assert.equal(quitCalls, 0);
  released.resolve(); await quit.promise;
  assert.equal(active.size, 0); assert.equal(quitCalls, 1);
});
