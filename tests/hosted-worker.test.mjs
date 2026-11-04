import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { collectArtifacts, restoreArtifacts, validateBundle, digest } from '../dist-worker/worker/files.js';
import { runWorker, createRuntime } from '../dist-worker/worker/runner.js';
import { newProject, sourceHash } from '../dist-worker/electron/storage.js';
import { qualityFixture, qualityFixtureHtml } from '../scripts/quality-fixture.mjs';

const resourcesRoot = path.resolve('dist-worker');
const never = () => new Promise(() => {});
async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-hosted-worker-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const stageOf = text => text.startsWith('Implementation is complete.') ? 'guide'
  : text.includes('You are the intake agent') ? 'intake'
  : text.includes('You are the research agent') ? 'research'
  : text.includes('You are the planning agent') ? 'plan'
  : text.includes('You are the implementation agent') ? 'build' : 'verify';
function fixture(options = {}) {
  const stages = [];
  return { stages, runtime: { getModel: () => ({}), hasConfiguredAuth: () => true },
    backendOptions: {
      agentLimits: { timeoutMs: 10_000, idleMs: 5_000, maxTurns: 40 },
      verificationLimits: { browserTimeoutMs: 20_000, browserStepTimeoutMs: 2000 },
      createSession: async ({ cwd, customTools }) => {
        const listeners = new Set();
        const emit = event => { for (const listener of listeners) listener(event); };
        return { session: {
          subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
          abort() {}, dispose() {},
          async prompt(text) {
            const stage = stageOf(text); stages.push(stage);
            emit({ type: 'turn_start' });
            if (options.scenario && await options.scenario({ stage, cwd, emit })) return;
            const files = stage === 'intake' ? { 'scope.md': 'Synthetic scope' }
              : stage === 'research' ? { 'research.md': 'Fixture research' }
              : stage === 'plan' ? { 'plan.md': 'Parse tasks', 'test-matrix.md': 'Test exact parsing and recovery',
                ...qualityFixture(JSON.parse(await fs.readFile(path.join(cwd, '.fleet/packet.json'), 'utf8')).acceptance.map(c => c.id)) }
              : stage === 'build' ? { 'index.html': qualityFixtureHtml, 'path-to-fleet.md': 'Synthetic-only; review required',
                'core.cjs': 'exports.parse = text => text.startsWith("TASK: ") ? text.slice(6) : null;',
                'app.test.cjs': 'const t=require("node:test"),a=require("node:assert/strict"),{parse}=require("./core.cjs");t("parse task",()=>a.equal(parse("TASK: inspect pump"),"inspect pump"));t("empty input",()=>a.equal(parse(""),null));' }
              : stage === 'guide' ? { 'README.md': '# Task parser\nOpen index.html. Enter TASK: inspect pump and select Parse message. The result survives reload. Empty input shows an error. Tests: node --test app.test.cjs.' }
              : { 'verification.md': 'Real Node and browser checks are performed by the host.' };
            for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(cwd, name), body);
            if (stage === 'plan') await customTools.find(tool => tool.name === 'fleet_system_design').execute('design', {
              title: 'Task parser', description: 'Synthetic task parser', components: [{ id: 'parser', label: 'Parser', description: 'Parses task text', kind: 'logic', files: ['core.cjs'] }], connections: [] });
            if (stage === 'build' || stage === 'verify') await customTools.find(tool => tool.name === 'fleet_component_progress').execute('component', { componentId: 'parser', status: 'generated', detail: 'Written; host verifies next.' });
            emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } }); emit({ type: 'turn_end' });
          }
        } };
      }
    }
  };
}
function inputFor(project) {
  return { version: 1, runId: randomUUID(), epoch: 1, mode: 'start', project,
    settings: { backend: 'pi', provider: 'openai', model: 'gpt-5.2', rememberKey: false },
    providerBaseUrl: 'https://example.com/model/v1', providerToken: 'fixture-scoped-proxy-token-never-an-openai-key' };
}
async function writeInput(root, input) {
  const file = path.join(root, 'control/input.json');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(input));
  return file;
}

test('artifact bundles are canonical, bounded, and restore only authenticated bytes', async t => {
  const root = await temporary(t), workspace = path.join(root, 'workspace');
  await fs.mkdir(workspace); await fs.mkdir(path.join(workspace, '.fleet'));
  await fs.writeFile(path.join(workspace, '.fleet/context.json'), '{}');
  await fs.writeFile(path.join(workspace, 'index.html'), '<p>Synthetic</p>');
  const runId = randomUUID(), bundle = await collectArtifacts(workspace, runId, 1);
  assert.equal(bundle.sourceHash, await sourceHash(workspace));
  assert.deepEqual(bundle.files.map(file => file.path), ['.fleet/context.json', 'index.html']);
  await fs.writeFile(path.join(workspace, 'partial.txt'), 'interrupted stage');
  await restoreArtifacts(workspace, bundle, runId);
  await assert.rejects(fs.stat(path.join(workspace, 'partial.txt')), { code: 'ENOENT' });
  assert.equal(await sourceHash(workspace), bundle.sourceHash);
  for (const mutate of [
    b => { b.files[0].path = '../escape'; },
    b => { b.files[0].base64 = Buffer.from('modified').toString('base64'); },
    b => { b.files.push(b.files[0]); },
    b => { b.files[0].size = 10 * 1024 * 1024 + 1; },
    b => { b.runId = 'another-run'; }
  ]) {
    const bad = structuredClone(bundle); mutate(bad);
    assert.throws(() => validateBundle(bad, runId));
  }
  await fs.writeFile(path.join(workspace, 'secret.txt'), 'token-that-must-never-leave-runtime');
  await assert.rejects(collectArtifacts(workspace, runId, 1, ['token-that-must-never-leave-runtime']), /credential/);
  await fs.rm(path.join(workspace, 'secret.txt'));
  const outside = path.join(root, 'outside-files');
  await fs.mkdir(outside); await fs.writeFile(path.join(outside, 'secret.txt'), 'outside-workspace');
  // Junctions exercise the same link rejection without Windows administrator or
  // Developer Mode privileges; the target contains a real out-of-workspace file.
  await fs.symlink(process.platform === 'win32' ? outside : path.join(outside, 'secret.txt'),
    path.join(workspace, 'outside'), process.platform === 'win32' ? 'junction' : 'file');
  await assert.rejects(collectArtifacts(workspace, runId, 1), /Symbolic links/);
});

test('pause rolls back an interrupted phase and resume preserves completed phases through real verification', { timeout: 30_000 }, async t => {
  const root = await temporary(t);
  const input = inputFor(newProject({ title: 'Task parser', description: 'Parse a task from a synthetic message.', criteria: ['Parse a task and recover from empty input.'] }));
  const controller = new AbortController();
  const first = fixture({ scenario: async ({ stage, cwd, emit }) => {
    if (stage !== 'build') return false;
    await fs.writeFile(path.join(cwd, 'partial.txt'), 'A partial build must be discarded on resume.');
    emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: input.providerToken } });
    controller.abort();
    await never();
  } });
  const paused = await runWorker(await writeInput(root, input), { resourcesRoot, signal: controller.signal, ...first });
  assert.equal(paused.status, 'paused', paused.error);
  assert.equal(paused.project.canResume, true);
  assert.equal(paused.checkpoint.completedStage, 'plan');
  assert.deepEqual(first.stages, ['intake', 'research', 'plan', 'build']);
  assert.equal(JSON.stringify(paused).includes(input.providerToken), false);
  assert.equal((await fs.readFile(path.join(root, 'control/state.json'), 'utf8')).includes(input.providerToken), false);
  const metadata = await fs.readFile(path.join(root, 'control', paused.checkpoint.metadataPath));
  assert.equal(digest(metadata), paused.checkpoint.metadataSha256);
  const second = fixture();
  const completed = await runWorker(await writeInput(root, { ...input, epoch: 2, mode: 'resume', project: paused.project, checkpoint: paused.checkpoint }), { resourcesRoot, ...second });
  assert.equal(completed.status, 'review', completed.error);
  assert.deepEqual(second.stages, ['build', 'guide', 'verify']);
  await assert.rejects(fs.stat(path.join(root, 'workspace/partial.txt')), { code: 'ENOENT' });
  const bundle = JSON.parse(await fs.readFile(path.join(root, 'control/artifacts.json'), 'utf8'));
  validateBundle(bundle, input.runId);
  assert.equal(bundle.sourceHash, completed.project.report.sourceHash);
  assert.equal(completed.project.report.passed, 2);
  assert.equal(completed.project.report.quality.status, 'passed');
  assert.equal(completed.project.report.quality.journeys.length, 4);
  assert.equal(completed.checkpoint.completedStage, 'verify');
  const repair = fixture();
  const reverified = await runWorker(await writeInput(root, { ...input, epoch: 3, mode: 'resume', project: completed.project, checkpoint: completed.checkpoint, retryVerification: true }), { resourcesRoot, ...repair });
  assert.equal(reverified.status, 'review', reverified.error);
  assert.deepEqual(repair.stages, ['verify'], 'A failed independent verification retries verification/repair without rebuilding completed phases.');
});

test('an early pause saves a prepared checkpoint and tampered metadata is rejected on resume', async t => {
  const root = await temporary(t), controller = new AbortController(); controller.abort();
  const input = inputFor(newProject({ title: 'Task parser', description: 'Parse synthetic tasks.', criteria: [] }));
  const first = fixture();
  const paused = await runWorker(await writeInput(root, input), { resourcesRoot, signal: controller.signal, ...first });
  assert.equal(paused.status, 'paused'); assert.equal(paused.checkpoint.completedStage, 'prepared');
  assert.deepEqual(first.stages, []);
  await fs.appendFile(path.join(root, 'control', paused.checkpoint.metadataPath), ' ');
  const second = fixture();
  const rejected = await runWorker(await writeInput(root, { ...input, epoch: 2, mode: 'resume', checkpoint: paused.checkpoint }), { resourcesRoot, ...second });
  assert.equal(rejected.status, 'failed'); assert.match(rejected.error, /integrity/);
  assert.deepEqual(second.stages, []);
});

test('OpenAI runtime uses only the scoped broker endpoint and in-memory broker credential', async t => {
  const root = await temporary(t), control = path.join(root, 'control'); await fs.mkdir(control);
  const input = inputFor(newProject({ title: 'Fixture', description: 'A synthetic hosted worker fixture.', criteria: [] }));
  const runtime = await createRuntime(input, control);
  const model = runtime.getModel('openai', input.settings.model);
  assert.equal(model.baseUrl, input.providerBaseUrl); assert.equal(model.api, 'openai-responses');
  assert.equal((await runtime.getAuth(model)).auth.apiKey, input.providerToken);
  const files = await fs.readdir(control);
  for (const name of files) if ((await fs.stat(path.join(control, name))).isFile()) assert.equal((await fs.readFile(path.join(control, name), 'utf8')).includes(input.providerToken), false);
});

test('a hosted phase waits for durable acknowledgement before the next agent starts', { timeout: 10_000 }, async t => {
  const root = await temporary(t), controller = new AbortController(), agent = fixture();
  const input = { ...inputFor(newProject({ title: 'Checkpoint fixture', description: 'Verify durable phase acknowledgement.', criteria: [] })), requireCheckpointAck: true };
  const finished = runWorker(await writeInput(root, input), { resourcesRoot, signal: controller.signal, ...agent });
  const checkpoint = async phase => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const pointer = await fs.readFile(path.join(root, 'control/checkpoint.json'), 'utf8').then(JSON.parse).catch(() => undefined);
      if (pointer?.completedStage === phase) return pointer;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('Checkpoint did not arrive: ' + phase);
  };
  try {
    const prepared = await checkpoint('prepared');
    assert.deepEqual(agent.stages, []);
    await fs.writeFile(path.join(root, 'control/checkpoint-ack.json'), JSON.stringify(prepared));
    await checkpoint('intake');
    assert.deepEqual(agent.stages, ['intake']);
  } finally { controller.abort(); }
  const paused = await finished;
  assert.equal(paused.status, 'paused'); assert.equal(paused.checkpoint.completedStage, 'intake');
});
