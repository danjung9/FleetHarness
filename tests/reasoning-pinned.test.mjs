import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { readRunCheckpoint } from '../dist-electron/electron/run-checkpoint.js';

async function fixture(t, engine, scoped = true) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-pinned-reasoning-'));
  const store = new Store(root); await store.init();
  const project = newProject({ title: 'Pinned reasoning', description: 'Preserve the comparison configuration.',
    criteria: ['Use the pinned effort.'], dataInputs: [{ name: 'input.txt', kind: 'text', content: 'supplied test input' }] });
  store.state.projects = [project];
  store.state.settings = { backend: engine, provider: engine === 'codex' ? 'chatgpt' : 'fixture', model: 'fixture-model', rememberKey: false, reasoningEffort: 'high' };
  const codexModel = { id: 'fixture-model', configured: true, reasoningEfforts: ['low', 'medium', 'high'], defaultReasoningEffort: 'medium' };
  const piModel = { id: 'fixture-model', provider: 'fixture', reasoning: true, input: ['text', 'image'] };
  let refreshed = () => {};
  const codex = { account: { status: 'connected', planUsageEnabled: true }, models: [codexModel], async refresh() { refreshed(); } };
  const backend = new FleetBackend(store, process.execPath, () => {}, path.resolve('.'), {
    codex, ...(scoped ? { scoped: { async plan() { throw new Error('This admission test must not plan an application.'); } } } : {})
  });
  backend.runtime = { getModel: () => piModel, hasConfiguredAuth: () => true };
  const executions = [];
  // Keep real admission, preparation, persistence, and recovery validation. Stop
  // at the execution boundary instead of starting agents or browser workflows.
  backend.execute = async (value, run) => {
    executions.push({ reasoningEffort: run.reasoningEffort, modelConfig: structuredClone(run.modelConfig) });
    value.status = 'stopped';
    await backend.finish(value, run);
  };
  async function launch(method) {
    await backend[method](project.id);
    await backend.active.get(project.id)?.done;
  }
  function capabilities(state) {
    const change = () => {
      if (engine === 'codex') {
        if (state === 'unknown') delete codexModel.reasoningEfforts;
        else codexModel.reasoningEfforts = state === 'removed' ? ['low', 'medium'] : ['low', 'medium', 'high'];
        codexModel.defaultReasoningEffort = 'low';
      } else {
        piModel.reasoning = state !== 'unknown';
        piModel.thinkingLevelMap = state === 'removed' ? { high: null } : undefined;
      }
    };
    if (engine === 'codex') refreshed = change;
    else change();
  }
  t.after(async () => { await backend.stopAll(); await fs.rm(root, { recursive: true, force: true }); });
  return { root, store, project, backend, executions, launch, capabilities };
}

for (const engine of ['pi', 'codex']) {
  for (const state of ['removed', 'unknown']) {
    test(`${engine} scoped start rejects ${state} pinned effort before replacing project state`, async t => {
      const h = await fixture(t, engine);
      const before = structuredClone(h.project);
      h.capabilities(state);
      await assert.rejects(h.launch('start'), /experiment is pinned to high reasoning effort.*no longer reports as supported/i);
      assert.deepEqual(h.project, before);
      assert.deepEqual(h.executions, []);
      assert.equal(h.backend.active.size, 0);
      await assert.rejects(fs.access(path.join(h.root, 'run-checkpoints')), { code: 'ENOENT' });
    });

    test(`${engine} scoped resume rejects ${state} pinned effort and preserves its checkpoint`, async t => {
      const h = await fixture(t, engine);
      await h.launch('start');
      const checkpoint = await readRunCheckpoint(h.root, h.project);
      assert.equal(checkpoint.modelConfig.reasoningEffort, 'high');
      const before = structuredClone(h.project);
      h.store.state.settings.reasoningEffort = 'low';
      h.capabilities(state);
      await assert.rejects(h.launch('resume'), /experiment is pinned to high reasoning effort.*no longer reports as supported/i);
      assert.deepEqual(h.project, before);
      assert.deepEqual(await readRunCheckpoint(h.root, h.project), checkpoint);
      assert.equal(h.executions.length, 1, 'rejected resume must not reach execution');
      assert.equal(h.backend.active.size, 0);
    });
  }

  test(`${engine} scoped start and resume retain supported effort despite new defaults and current settings`, async t => {
    const h = await fixture(t, engine);
    h.capabilities('supported');
    await h.launch('start');
    h.store.state.settings.reasoningEffort = 'low';
    await h.launch('resume');
    assert.equal(h.executions.length, 2);
    for (const execution of h.executions) {
      assert.equal(execution.reasoningEffort, 'high');
      assert.equal(execution.modelConfig.reasoningEffort, 'high');
    }
    assert.equal((await readRunCheckpoint(h.root, h.project)).reasoningEffort, 'high');
  });

  test(`${engine} ordinary start and resume still remap preferences to supported levels`, async t => {
    const h = await fixture(t, engine, false);
    h.capabilities('removed');
    await h.launch('start');
    assert.equal(h.executions[0].reasoningEffort, engine === 'codex' ? 'low' : 'medium');
    h.capabilities('supported');
    h.store.state.settings.reasoningEffort = 'low';
    await h.launch('resume');
    assert.equal(h.executions[1].reasoningEffort, 'low');
    assert.equal(h.executions[1].modelConfig, undefined);
  });
}
