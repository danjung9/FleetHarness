import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AppBuilder } from '../dist-electron/electron/app-builder.js';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { qualityFixtureProject } from '../scripts/quality-fixture.mjs';
import { solutionFixture } from '../scripts/solution-fixture.mjs';

test('AppBuilder continues truncated implementation and repair turns before running verification', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'appyard-continuation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = new Store(root);
  await store.init();
  const project = newProject(qualityFixtureProject);
  store.state.projects.push(project);
  Object.assign(store.state.settings, { backend: 'codex', provider: 'fixture', model: 'fixture' });

  const flow = [];
  let observe, checks = 0;
  const backend = new AppBuilder(store, process.execPath, () => {}, process.cwd(), {
    codex: { async refresh() {}, models: [{ id: 'fixture', configured: true }] },
    createCodexSession: async ({ cwd }) => ({
      subscribe(listener) { observe = listener; return () => { observe = undefined; }; },
      async prompt(text) {
        if (text.includes('Stop after planning')) {
          flow.push('plan');
          const packet = JSON.parse(await readFile(path.join(cwd, '.fleet', 'packet.json'), 'utf8'));
          const plan = solutionFixture(packet.acceptance.map(criterion => criterion.id));
          for (const [name, body] of Object.entries(plan)) await writeFile(path.join(cwd, name), body);
        } else if (text.includes('previous response was cut off')) {
          flow.push(text.includes('verification repair') ? 'continue repair' : 'continue implementation');
          assert.equal(await readFile(path.join(cwd, 'progress.txt'), 'utf8'), 'saved');
        } else {
          flow.push(text.startsWith('Host verification failed') ? 'repair' : 'implementation');
          await writeFile(path.join(cwd, 'progress.txt'), 'saved');
          observe({ type: 'message_end', message: { role: 'assistant', stopReason: 'length' } });
        }
      },
      async abort() {},
      async dispose() {},
    }),
    async verify() {
      flow.push('verify');
      if (++checks === 2) throw new Error('Verification reached again');
      return { exitCode: 1, total: 1, passed: 0, failed: 1, skipped: 0, output: 'Fixture check failed.' };
    },
  });

  await backend.start(project.id);
  await backend.active.get(project.id)?.done;
  assert.deepEqual(flow, ['plan', 'implementation', 'continue implementation', 'verify', 'repair', 'continue repair', 'verify']);
  assert.equal(project.runCheckpoint.repairAttempts, 1);
  assert.equal(project.error, 'Verification reached again');
});
