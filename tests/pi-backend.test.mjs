import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { PiBackend } from '../dist-electron/electron/pi-backend.js';
import { reportPassed, verifyWorkspace } from '../dist-electron/electron/verification.js';
import { qualityFixtureHtml } from '../scripts/quality-fixture.mjs';
import { structuredSolutionFixture as solutionFixture, solutionFixtureEvaluator } from '../scripts/solution-fixture.mjs';
import { syntheticDataFiles } from '../scripts/data-fixture.mjs';
import { foundationRuntime } from '../dist-electron/harness/foundations.js';
import { ClarificationBroker } from '../dist-electron/electron/clarifications.js';
import { completeFixtureVisualReview, fixtureVisualReviewInput } from '../scripts/visual-review-fixture.mjs';
import { createFixturePlanningReviewSession } from '../scripts/planning-review-fixture.mjs';
import { createHash } from 'node:crypto';
import { qualityContractGuide } from '../dist-electron/harness/quality-contract.js';
import { readRunCheckpoint, writeRunCheckpoint } from '../dist-electron/electron/run-checkpoint.js';
import { assertFleetPacketIntegrity } from '../dist-electron/harness/integration.js';

const resourcesRoot = path.resolve('.');
// Each workflow prepares independent packages and launches real browser contexts.
// This outer test budget is separate from the explicitly tested agent/runtime deadlines.
const workflowTimeout = 45_000;
const never = () => new Promise(() => {});
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const stageOf = prompt => prompt.includes('The independent test run failed') ? 'repair'
  : prompt.includes('You are the synthetic data agent') ? 'synthetic-data'
  : prompt.includes('You are the intake agent') ? 'intake'
  : prompt.includes('You are the research agent') ? 'research'
  : prompt.includes('You are the implementation agent') ? 'build'
  : prompt.includes('You are the verification agent') ? 'verify' : 'plan';
async function artifacts(cwd, stage, broken = false) {
  const files = stage === 'intake' ? { 'scope.md': 'Synthetic scope' }
    : stage === 'synthetic-data' ? syntheticDataFiles
    : stage === 'research' ? { 'research.md': 'Local fixture research' }
    : stage === 'plan' ? { 'scope.md': 'Synthetic scope', 'research.md': 'Local fixture research', 'plan.md': 'Implement task extraction', 'test-matrix.md': 'Exact task extraction and empty input' }
    : stage === 'build' ? { 'index.html': qualityFixtureHtml, 'evaluate.cjs': solutionFixtureEvaluator,
      'path-to-fleet.md': 'Domain review required',
      'core.cjs': broken ? 'exports.parse = () => "defect";' : 'exports.parse = text => text.startsWith("TASK: ") ? text.slice(6) : null;',
      'app.test.cjs': 'const test = require("node:test"), assert = require("node:assert/strict"), {parse} = require("./core.cjs"); test("extract task", () => assert.equal(parse("TASK: inspect pump"), "inspect pump")); test("empty input", () => assert.equal(parse(""), null));' }
    : stage === 'guide' ? { 'README.md': '# Task parser\n\nOpen index.html in a browser. No installation is required. Enter TASK: inspect pump in Message and select Parse message. The task appears and survives reload. Empty input shows Enter a message; replace it with a task to recover.\n\nFor developers: install Node and run `node --test app.test.cjs`. The core parses `TASK: inspect pump` into `inspect pump` and returns null for empty input.\n\nSee [verification notes](verification.md) and [field validation](path-to-fleet.md).' }
    : stage === 'repair' ? { 'core.cjs': broken ? 'exports.parse = () => "still broken";' : 'exports.parse = text => text.startsWith("TASK: ") ? text.slice(6) : null;', 'verification.md': 'Repair completed; domain review still required' }
    : { 'verification.md': 'Task extraction and empty input are tested; domain review required' };
  if (stage === 'plan') Object.assign(files, solutionFixture(JSON.parse(await fs.readFile(path.join(cwd, '.fleet/packet.json'), 'utf8')).acceptance.map(criterion => criterion.id)));
  for (const [name, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(cwd, name)), { recursive: true });
    await fs.writeFile(path.join(cwd, name), content);
  }
}

async function harness(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-flow-'));
  const store = new Store(root); await store.init();
  store.state.settings = { provider: 'fixture', model: 'fixture', rememberKey: false };
  const project = store.state.projects[0], sessions = [], snapshots = [];
  const broker = options.clarifications ? new ClarificationBroker(store, () => snapshots.push(structuredClone(project))) : undefined;
  const backend = new PiBackend(store, process.execPath, () => snapshots.push(structuredClone(project)), options.resourcesRoot ?? resourcesRoot, {
    clarifications: broker,
    agentLimits: options.agentLimits ?? { idleMs: 10_000, timeoutMs: 25_000 },
    verificationLimits: { browserTimeoutMs: 20_000, browserStepTimeoutMs: 2000, ...options.verificationLimits },
    createSession: async ({ cwd, customTools, tools, resourceLoader }) => {
      // Keep phase lifecycle assertions scoped to workflow sessions. The separate
      // planning-review backend suite covers reviewer lifecycle and rejection.
      if (customTools.some(tool => tool.name === 'fleet_submit_planning_review')) {
        return { session: createFixturePlanningReviewSession(customTools) };
      }
      if (options.createSession) return options.createSession({ cwd, sessions });
      const listeners = new Set();
      const disposal = deferred();
      const s = { tools, customTools, skills: resourceLoader.getSkills().skills.map(skill => skill.name), stage: undefined, prompts: [], aborts: 0, disposed: false, whenDisposed: disposal.promise,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        emit(event) { for (const listener of listeners) listener(event); },
        async prompt(text) {
          this.stage ??= stageOf(text); this.prompts.push(text); this.emit({ type: 'turn_start' });
          if (this.stage === 'plan' && !project.systemDesign) await customTools.find(tool => tool.name === 'fleet_system_design').execute('design', {
            title: 'Task parser', description: 'Local fixture application',
            components: [{ id: 'parser', label: 'Parser', description: 'Extract task text', kind: 'logic', files: [options.componentFile ?? 'core.cjs'] }], connections: []
          });
          if (text.startsWith('Implementation is complete.')) this.writingGuide = true;
          const step = this.writingGuide ? 'guide' : this.stage;
          const handled = await options.scenario?.({ cwd, stage: step, session: this, sessions, project, store });
          if (!handled) await artifacts(cwd, step, options.brokenBuild && (this.stage === 'build' || options.brokenRepair));
          if (['build', 'verify', 'repair'].includes(this.stage) && !(options.deferComponentProgress && this.stage === 'build' && !this.writingGuide)) await customTools.find(tool => tool.name === 'fleet_component_progress').execute('progress', { componentId: 'parser', status: 'generated', detail: 'Source written; harness tests follow.' });
          if (['guide', 'verify', 'repair'].includes(step) && project.runtimeProfile !== 'cli') {
            const skipReview = await options.visualReview?.({ cwd, stage: step, session: this, project });
            if (!skipReview) await completeFixtureVisualReview(customTools, { emit: event => this.emit(event) });
            await options.afterVisualReview?.({ cwd, stage: step, session: this, project });
          }
          this.emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } });
          this.emit({ type: 'turn_end' });
        },
        abort() { this.aborts++; return never(); },
        dispose() { this.disposed = true; disposal.resolve(); }
      };
      sessions.push(s); return { session: s };
    }
  });
  backend.runtime = { getModel: () => ({ input: options.modelInput ?? ['text', 'image'] }), hasConfiguredAuth: () => true };
  t.after(async () => { await backend.stopAll(); await fs.rm(root, { recursive: true, force: true }); });
  const settle = async () => { await backend.active.get(project.id)?.done; };
  const run = async () => { await backend.start(project.id); await settle(); };
  const assertSettled = async status => {
    assert.equal(project.status, status, project.error);
    assert.equal(backend.active.has(project.id), false);
    assert.equal(project.stages.some(s => s.status === 'active'), false);
    const saved = JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8')).projects.find(p => p.id === project.id);
    assert.equal(saved.status, status); assert.equal(saved.error, project.error);
  };
  return { root, store, project, backend, broker, sessions, snapshots, run, settle, assertSettled };
}

for (const failedStage of ['intake', 'research', 'plan', 'build', 'verify']) {
  test(`resume continues a failed ${failedStage} phase in its existing workspace`, { timeout: workflowTimeout }, async t => {
    let interrupt = true;
    const h = await harness(t, { scenario: ({ stage }) => {
      if (interrupt && stage === failedStage) { interrupt = false; throw new Error('Recoverable fixture failure'); }
      return false;
    } });
    h.project.dataInputs = [{ name: 'message.txt', kind: 'text', content: 'TASK: inspect pump' }];
    await h.run(); await h.assertSettled('failed');
    assert.equal(h.project.resumeStage, failedStage);
    const { runId, workspace } = h.project;
    const previousLogs = h.project.logs.map(log => log.id), sessionCount = h.sessions.length;
    const completed = h.project.stages.filter(stage => stage.status === 'complete').map(stage => stage.id);
    await fs.writeFile(path.join(workspace, 'saved-work.md'), 'Preserve my work');
    const checkpoint = JSON.parse(await fs.readFile(path.join(h.root, 'run-checkpoints', runId + '.json'), 'utf8'));
    assert.equal(checkpoint.stage, failedStage);
    assert.equal(JSON.stringify(h.project).includes('evaluationBody'), false, 'Host-only checkpoint stays out of renderer state');
    await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
    assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
    assert.equal(await fs.readFile(path.join(workspace, 'saved-work.md'), 'utf8'), 'Preserve my work');
    assert.ok(previousLogs.every(id => h.project.logs.some(log => log.id === id)));
    for (const id of completed) assert.equal(h.project.stages.find(stage => stage.id === id).status, 'complete');
    const phases = ['intake', 'research', 'plan', 'build', 'verify'];
    assert.deepEqual(h.sessions.slice(sessionCount).map(session => session.stage), phases.slice(phases.indexOf(failedStage)));
    assert.equal(h.project.resumeStage, undefined); assert.equal(reportPassed(h.project.report), true);
  });
}

test('resume after Stop uses a fresh session and keeps partial implementation files', { timeout: workflowTimeout }, async t => {
  const entered = deferred(); let pause = true;
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (stage === 'build' && pause) {
      await fs.writeFile(path.join(cwd, 'partial-work.md'), 'Work before Stop'); entered.resolve(); await never();
    }
    return false;
  } });
  await h.backend.start(h.project.id); await entered.promise;
  const oldSession = h.sessions.at(-1), sessionCount = h.sessions.length, { runId, workspace } = h.project;
  await h.backend.stop(h.project.id); await h.assertSettled('stopped');
  assert.equal(h.project.resumeStage, 'build'); assert.equal(oldSession.disposed, true);
  pause = false;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.equal(await fs.readFile(path.join(workspace, 'partial-work.md'), 'utf8'), 'Work before Stop');
  assert.deepEqual(h.sessions.slice(sessionCount).map(session => session.stage), ['build', 'verify']);
  const logs = structuredClone(h.project.logs);
  oldSession.emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'Late event from stopped session' } });
  assert.deepEqual(h.project.logs, logs);
});

test('a fresh backend resumes from the private checkpoint after an application restart', { timeout: workflowTimeout }, async t => {
  let fail = true;
  const h = await harness(t, { scenario: ({ stage }) => {
    if (stage === 'build' && fail) { fail = false; throw new Error('App closed during implementation'); }
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  const { runId, workspace } = h.project, count = h.sessions.length;
  // Drop all backend run state. The replacement has only persisted host state and files.
  const restored = new Store(h.root); await restored.init();
  Object.assign(h.project, restored.project(h.project.id));
  const restarted = new PiBackend(h.store, process.execPath, () => {}, resourcesRoot, h.backend.options);
  restarted.runtime = h.backend.runtime;
  t.after(() => restarted.stopAll());
  await restarted.resume(h.project.id); await restarted.active.get(h.project.id)?.done;
  assert.equal(h.project.status, 'review', h.project.error);
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['build', 'verify']);
  assert.equal(reportPassed(h.project.report), true);
});

test('resume rejects changed frozen inputs and authentication failures without replacing the saved run', { timeout: workflowTimeout }, async t => {
  let fail = true;
  const h = await harness(t, { scenario: ({ stage }) => {
    if (stage === 'build' && fail) { fail = false; throw new Error('Needs repair'); }
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  const saved = structuredClone(h.project), checkpoint = path.join(h.root, 'run-checkpoints', h.project.runId + '.json');
  const savedCheckpoint = await fs.readFile(checkpoint, 'utf8');
  const rejectsWithoutMutation = async pattern => {
    await assert.rejects(h.backend.resume(h.project.id), pattern);
    assert.deepEqual(h.project, saved); assert.equal(h.backend.active.has(h.project.id), false);
    assert.equal(await fs.readFile(checkpoint, 'utf8'), savedCheckpoint);
  };
  h.backend.runtime.hasConfiguredAuth = () => false;
  await rejectsWithoutMutation(/connect its provider/); h.backend.runtime.hasConfiguredAuth = () => true;
  for (const name of ['requirements.md', 'acceptance-plan.json', 'solution-contract.json', '.fleet/packet.json', 'data/synthetic-data.json', 'foundation-plan.json']) {
    const target = path.join(h.project.workspace, name), body = await fs.readFile(target, 'utf8');
    await fs.writeFile(target, body + '\n');
    await rejectsWithoutMutation(/changed|preserve|modified|contract|hash|packet/i);
    await fs.writeFile(target, body);
  }
  h.project.description += ' Changed requirements';
  await assert.rejects(h.backend.resume(h.project.id), /brief or attached inputs changed/);
  h.project.description = saved.description;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
});

test('legacy runs without a private checkpoint keep their files and receive new-build guidance', async t => {
  const h = await harness(t);
  h.project.status = 'failed'; h.project.runId = 'legacy-run'; h.project.workspace = path.join(h.root, 'legacy');
  await fs.mkdir(h.project.workspace); await fs.writeFile(path.join(h.project.workspace, 'saved.md'), 'Legacy work');
  const saved = structuredClone(h.project);
  await assert.rejects(h.backend.resume(h.project.id), /no trusted recovery checkpoint.*files are preserved.*new build/);
  assert.deepEqual(h.project, saved); assert.equal(h.backend.active.has(h.project.id), false);
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'saved.md'), 'utf8'), 'Legacy work');
});

test('a final state-save failure retains the verification checkpoint and can resume', { timeout: workflowTimeout }, async t => {
  const h = await harness(t);
  const save = h.store.save.bind(h.store); let fail = true;
  h.store.save = () => {
    if (fail && h.project.status === 'review') { fail = false; return Promise.reject(new Error('Temporary state-save failure')); }
    return save();
  };
  await h.run();
  assert.equal(h.project.status, 'failed'); assert.match(h.project.error, /Temporary state-save failure/);
  assert.equal(h.project.resumeStage, 'verify'); assert.equal(h.backend.active.has(h.project.id), false);
  const { runId, workspace } = h.project, count = h.sessions.length;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['verify']);
  assert.equal(reportPassed(h.project.report), true);
});

test('resume preserves exhausted repair allowances but accepts a verifier fix after passing fresh checks', { timeout: workflowTimeout * 2 }, async t => {
  let broken = true;
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (!broken && stage === 'verify') { await artifacts(cwd, 'repair'); return false; }
    if (broken && ['verify', 'repair'].includes(stage)) {
      await artifacts(cwd, stage, true);
      await fs.writeFile(path.join(cwd, 'core.cjs'), 'exports.parse = () => "verification defect";');
      return true;
    }
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(h.project.resumeStage, 'verify'); assert.equal(reportPassed(h.project.report), false);
  const count = h.sessions.length, { runId, workspace } = h.project;
  broken = false;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['verify']);
  const repairedCheckpoint = await readRunCheckpoint(h.root, h.project);
  assert.equal(repairedCheckpoint.functionalRepair.gates.final.attempts, 2, 'Resume preserves consumed attempts');
  assert.equal(reportPassed(h.project.report), true);
});

test('resuming a stopped clarification reopens the question and freezes an immediate answer before continuing', { timeout: workflowTimeout }, async t => {
  const entered = deferred(); let asked = false;
  const h = await harness(t, { clarifications: true, scenario: async ({ stage, session, project, cwd }) => {
    if (stage === 'research' && !asked) {
      asked = true;
      await session.customTools.find(tool => tool.name === 'fleet_request_clarification').execute('ask', {
        questions: [{ question: 'Which audience comes first?', context: 'Determines the main workflow.', options: ['Operator', 'Analyst'], recommendation: 'Operator' }]
      });
      entered.resolve(); return true;
    }
    if (stage === 'research' && asked) {
      assert.match(session.prompts[0], /Operator/);
      const answers = JSON.parse(await fs.readFile(path.join(cwd, 'clarifications.json'), 'utf8'));
      assert.equal(answers.questions[0].answer, 'Operator');
      assert.equal(project.conversation.questions.length, 1);
    }
    return false;
  } });
  await h.backend.start(h.project.id); await entered.promise;
  await h.backend.stop(h.project.id); await h.assertSettled('stopped');
  const question = h.project.conversation.questions[0];
  assert.equal(question.status, 'cancelled'); assert.equal(h.project.resumeStage, 'research');
  const reopen = h.broker.resume.bind(h.broker);
  h.broker.resume = async (...args) => { await reopen(...args); await h.broker.answer(h.project.id, question.id, 'Operator'); };
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  assert.equal(question.status, 'answered');
  assert.equal(h.project.conversation.questions.length, 1);
});

test('Stop cancels resume while authentication is pending and a late refresh cannot start agents', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'build') throw new Error('Paused implementation'); return false; } });
  await h.run(); await h.assertSettled('failed');
  const entered = deferred(), authentication = deferred(), saved = structuredClone(h.project), count = h.sessions.length;
  h.store.state.settings = { backend: 'codex', provider: 'chatgpt', model: 'fixture', rememberKey: false };
  h.backend.options.codex = {
    account: { status: 'connected', planUsageEnabled: true }, models: [{ id: 'fixture', configured: true }],
    async refresh() { entered.resolve(); await authentication.promise; }
  };
  const resumed = assert.rejects(h.backend.resume(h.project.id), /stopped/i);
  await entered.promise;
  await h.backend.stop(h.project.id); await resumed;
  assert.deepEqual(h.project, saved); assert.equal(h.sessions.length, count); assert.equal(h.backend.active.size, 0);
  authentication.resolve(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.project, saved); assert.equal(h.sessions.length, count); assert.equal(h.backend.active.size, 0);
});

test('duplicate resume and start requests cannot replace a pending recovery', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'research') throw new Error('Temporary research failure'); return false; } });
  await h.run(); await h.assertSettled('failed');
  const entered = deferred(), authentication = deferred(), saved = structuredClone(h.project);
  h.store.state.settings = { backend: 'codex', provider: 'chatgpt', model: 'fixture', rememberKey: false };
  h.backend.options.codex = {
    account: { status: 'connected', planUsageEnabled: true }, models: [{ id: 'fixture', configured: true }],
    async refresh() { entered.resolve(); await authentication.promise; }
  };
  const resumed = assert.rejects(h.backend.resume(h.project.id), /stopped/i);
  await entered.promise;
  await assert.rejects(h.backend.resume(h.project.id), /already preparing/);
  await assert.rejects(h.backend.start(h.project.id), /already has an active run/);
  assert.deepEqual(h.project, saved);
  await h.backend.stopAll(); await resumed;
  authentication.resolve();
  assert.equal(h.backend.active.size, 0); assert.deepEqual(h.project, saved);
});

test('resume republishes and reseals the exact answer key before launching a fresh builder', { timeout: workflowTimeout }, async t => {
  let recovering = false, expected;
  const h = await harness(t, { scenario: async ({ stage, cwd }) => {
    if (stage === 'build' && !recovering) throw new Error('Interrupted build');
    if (stage === 'build' && recovering) {
      await assert.rejects(fs.access(path.join(cwd, 'evaluation-plan.json')), /ENOENT/);
      assert.equal(await fs.readFile(path.join(h.root, 'evaluations', h.project.runId + '.json'), 'utf8'), expected);
      assert.equal((await fs.readdir(cwd)).some(name => name.startsWith('.evaluation-')), false, 'Answer-key staging files stay outside the builder workspace');
    }
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  const checkpoint = JSON.parse(await fs.readFile(path.join(h.root, 'run-checkpoints', h.project.runId + '.json'), 'utf8'));
  expected = checkpoint.quality.evaluationBody;
  // Model the complete-file states around a shutdown during final key restoration.
  await fs.writeFile(path.join(h.project.workspace, 'evaluation-plan.json'), expected);
  await fs.rm(path.join(h.root, 'evaluations', h.project.runId + '.json'));
  recovering = true;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'evaluation-plan.json'), 'utf8'), expected);
  assert.equal(reportPassed(h.project.report), true);
});

test('review changes start another verified iteration with the comments and previous source', { timeout: workflowTimeout * 2 }, async t => {
  const h = await harness(t);
  h.project.dataInputs = [{ name: 'message.txt', kind: 'text', content: 'TASK: inspect pump' }];
  await h.run(); await h.assertSettled('review');
  const oldRunId = h.project.runId, oldWorkspace = h.project.workspace, oldSource = await fs.readFile(path.join(oldWorkspace, 'core.cjs'), 'utf8');
  const oldSessionCount = h.sessions.length;
  const comments = 'Keep the entered message visible when validation fails.';
  await h.backend.requestChanges(h.project.id, comments); await h.settle(); await h.assertSettled('review');
  assert.notEqual(h.project.runId, oldRunId); assert.notEqual(h.project.workspace, oldWorkspace);
  assert.equal(h.project.reviewHistory[0].decision, 'changes_requested');
  assert.equal(h.project.reviewHistory[0].runId, oldRunId);
  assert.equal(h.project.reviewHistory[0].nextRunId, h.project.runId);
  assert.equal(h.project.approvedAt, undefined); assert.equal(h.project.exportedTo, undefined); assert.equal(h.project.executable, undefined);
  assert.equal(await fs.readFile(path.join(oldWorkspace, 'core.cjs'), 'utf8'), oldSource);
  assert.equal(await fs.readFile(path.join(h.project.workspace, '.review-source', 'core.cjs'), 'utf8'), oldSource);
  assert.ok((await fs.readFile(path.join(h.project.workspace, 'requirements.md'), 'utf8')).includes(comments));
  for (const session of h.sessions.slice(oldSessionCount)) assert.ok(session.prompts[0].includes(comments), session.stage + ' received reviewer comments');
  assert.equal(h.project.report.command.includes('.review-source'), false);
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects.find(project => project.id === h.project.id);
  assert.equal(saved.reviewHistory[0].feedback, comments);
});

test('a review change request preserves the current build and saved comments when startup fails', { timeout: workflowTimeout }, async t => {
  const h = await harness(t);
  await h.run(); await h.assertSettled('review');
  const current = { runId: h.project.runId, workspace: h.project.workspace, report: structuredClone(h.project.report) };
  h.backend.runtime.hasConfiguredAuth = () => false;
  await assert.rejects(h.backend.requestChanges(h.project.id, 'Keep the entered message visible.'), /comments were saved.*could not start.*connect its provider/);
  assert.equal(h.project.status, 'review'); assert.equal(h.project.runId, current.runId); assert.equal(h.project.workspace, current.workspace); assert.deepEqual(h.project.report, current.report);
  assert.equal(h.project.feedback, 'Keep the entered message visible.');
  assert.equal(h.project.reviewHistory[0].nextRunId, undefined);
  assert.equal(h.backend.active.has(h.project.id), false);
  h.backend.runtime.hasConfiguredAuth = () => true;
  h.backend.resourcesRoot = path.join(h.root, 'missing-resources');
  await assert.rejects(h.backend.requestChanges(h.project.id, 'Also explain how to correct invalid messages.'), /comments were saved.*could not start/);
  assert.equal(h.project.status, 'review'); assert.equal(h.project.runId, current.runId); assert.equal(h.project.workspace, current.workspace); assert.deepEqual(h.project.report, current.report);
  assert.equal(h.project.reviewHistory.length, 2); assert.equal(h.project.reviewHistory[1].nextRunId, undefined);
  assert.equal(h.backend.active.has(h.project.id), false);
});

test('failed verification can request changes, while incomplete or approved builds cannot', { timeout: workflowTimeout }, async t => {
  const h = await harness(t);
  await assert.rejects(h.backend.requestChanges(h.project.id, 'Fix the application workflow.'), /completed, unapproved/);
  await h.run(); await h.assertSettled('review');
  for (const status of ['draft', 'running', 'approved', 'delivered']) {
    h.project.status = status;
    await assert.rejects(h.backend.requestChanges(h.project.id, 'Fix the application workflow.'), /completed, unapproved/);
  }
  h.project.status = 'failed'; h.project.report.failed = 1;
  h.backend.runtime.hasConfiguredAuth = () => false;
  await assert.rejects(h.backend.requestChanges(h.project.id, 'Fix the application workflow.'), /comments were saved/);
  assert.equal(h.project.status, 'failed'); assert.equal(h.project.reviewHistory.length, 1);
});

test('iteration agents cannot change preserved review source', { timeout: workflowTimeout }, async t => {
  let changeSource = false;
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (changeSource && stage === 'research') await fs.writeFile(path.join(cwd, '.review-source', 'core.cjs'), 'Altered reference source');
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  changeSource = true;
  await h.backend.requestChanges(h.project.id, 'Keep the entered message visible.'); await h.settle(); await h.assertSettled('failed');
  assert.match(h.project.error, /previous build source changed/);
});

test('clarification-enabled automatic builds do not create extra model sessions or prompts', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { clarifications: true });
  h.project.dataInputs = [{ name: 'message.txt', kind: 'text', content: 'TASK: inspect pump' }];
  await h.run(); await h.assertSettled('review');
  assert.deepEqual(h.sessions.map(session => session.stage), ['intake', 'research', 'plan', 'build', 'verify']);
  assert.deepEqual(h.sessions.map(session => session.prompts.length), [1, 1, 1, 3, 1]);
  for (const session of h.sessions) {
    const enabled = ['research', 'plan'].includes(session.stage);
    assert.equal(session.customTools.some(tool => tool.name === 'fleet_request_clarification'), enabled);
    assert.equal(session.tools.includes('fleet_request_clarification'), enabled, 'The Pi active tool allowlist includes the registered clarification tool');
  }
  assert.equal(h.project.conversation?.questions.length ?? 0, 0);
  await assert.rejects(fs.access(path.join(h.project.workspace, 'clarifications.json')), /ENOENT/);
});

test('factory build agents continue beyond 40 model turns and complete independent verification', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: ({ stage, session }) => {
    if (stage === 'build') for (let turn = 0; turn < 60; turn++) {
      session.emit({ type: 'turn_start' }); session.emit({ type: 'turn_end' });
    }
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(h.sessions.find(session => session.stage === 'build').prompts.length, 3);
  assert.equal(reportPassed(h.project.report), true);
  assert.ok(h.sessions.every(session => session.disposed));
});

test('build agents interact with their declared app, see images, reopen changed source, and release the browser at stage end', { timeout: workflowTimeout * 2 }, async t => {
  let openedUrl, browserTool;
  const h = await harness(t, { agentLimits: { idleMs: 20_000, timeoutMs: 40_000 }, scenario: async ({ cwd, stage, session }) => {
    if (stage !== 'build') return false;
    await artifacts(cwd, stage);
    browserTool = session.customTools.find(tool => tool.name === 'fleet_browser');
    assert.ok(browserTool);
    const act = async args => {
      const id = 'browser-' + args.action;
      session.emit({ type: 'tool_execution_start', toolCallId: id, toolName: 'fleet_browser', args });
      const result = await browserTool.execute(id, args);
      session.emit({ type: 'tool_execution_end', toolCallId: id, toolName: 'fleet_browser', result, isError: result.isError });
      assert.notEqual(result.isError, true, JSON.stringify(result.content.filter(item => item.type === 'text')));
      const image = result.content.find(item => item.type === 'image');
      assert.equal(image.mimeType, 'image/png');
      assert.equal(Buffer.from(image.data, 'base64').subarray(1, 4).toString(), 'PNG');
      const observation = JSON.parse(result.content.find(item => item.type === 'text').text);
      assert.match(observation.screenshot, /^\.browser-observations\//);
      assert.ok((await fs.stat(path.join(cwd, observation.screenshot))).size > 0);
      return observation;
    };
    const opened = await act({ action: 'open' });
    assert.match(opened.pageText, /Fixture parser/);
    assert.ok(opened.controls.some(item => item.selector === '#message'));
    await act({ action: 'type', selector: '#message', text: 'TASK: inspect screenshot loop' });
    assert.match((await act({ action: 'click', selector: '#parse' })).pageText, /inspect screenshot loop/);
    await fs.writeFile(path.join(cwd, 'index.html'), qualityFixtureHtml.replace('Fixture parser</h1>', 'Updated parser</h1>'));
    const refreshed = await act({ action: 'open', viewport: 'narrow' });
    assert.match(refreshed.pageText, /Updated parser/);
    openedUrl = refreshed.url;
    return true;
  } });
  await h.run(); await h.assertSettled('review');
  for (const session of h.sessions) {
    assert.equal(session.tools.includes('fleet_browser'), ['build', 'verify'].includes(session.stage));
    assert.equal(session.customTools.some(tool => tool.name === 'fleet_browser'), ['build', 'verify'].includes(session.stage));
  }
  const logs = h.project.logs.filter(log => log.tool?.name === 'fleet_browser' && log.tool?.phase === 'complete');
  assert.equal(logs.length, 20, 'Core and primary-workflow construction both exercise manual interactions; every frozen journey also delivers its screenshots.');
  assert.ok(logs.every(log => log.text.includes('Image delivered to the agent')));
  assert.ok(logs.every(log => !log.text.includes('iVBORw0KGgo')));
  const stale = await browserTool.execute('late-screenshot', { action: 'screenshot' });
  assert.equal(stale.isError, true);
  await assert.rejects(fetch(openedUrl));
  assert.equal(h.project.report.command.includes('.browser-observations'), false);
});

for (const stage of ['guide', 'verify']) for (const recover of [true, false]) {
  test(`${stage} visual review ${recover ? 'recovers from omitted comparisons' : 'stops after a completion attempt makes no progress'}`, { timeout: workflowTimeout }, async t => {
    let attempts = 0;
    const h = await harness(t, { visualReview: ({ stage: current }) => current === stage && (++attempts === 1 || !recover) });
    await h.run(); await h.assertSettled(recover ? 'review' : 'failed');
    assert.equal(attempts, 2, 'A first completion prompt can recover; unchanged evidence must not cause more prompts.');
    const session = h.sessions.find(session => session.stage === (stage === 'guide' ? 'build' : 'verify'));
    assert.match(session.prompts.at(-1), /visual|screenshot/i);
    if (recover) assert.equal(reportPassed(h.project.report), true);
    else {
      assert.match(h.project.error, /visual review made no progress/i);
      assert.equal(h.project.report, undefined);
      if (stage === 'guide') assert.equal(h.sessions.some(session => session.stage === 'verify'), false);
    }
  });
}

test('visual completion continues through useful findings and fixes before all frozen journeys pass', { timeout: workflowTimeout * 2 }, async t => {
  let attempts = 0, findingId;
  const h = await harness(t, { visualReview: async ({ cwd, stage, session }) => {
    if (stage !== 'guide') return false;
    attempts++;
    if (attempts > 2) return false;
    const browser = session.customTools.find(tool => tool.name === 'fleet_browser');
    const reviewer = session.customTools.find(tool => tool.name === 'fleet_visual_review');
    const captureAndReview = async (args, changes = {}) => {
      const capture = await browser.execute('iteration-capture', args);
      assert.equal(capture.isError, false, JSON.stringify(capture.details));
      const review = await reviewer.execute('iteration-review', { ...fixtureVisualReviewInput(capture.details), ...changes });
      assert.equal(review.isError, false, JSON.stringify(review.details));
      return review.details.review;
    };
    if (attempts === 1) {
      findingId = (await captureAndReview({ action: 'open', viewport: 'desktop' }, {
        findings: ['The primary button needs an explicit 44 pixel minimum target height.']
      })).findings[0].id;
      await captureAndReview({ action: 'screenshot', viewport: 'narrow' });
    } else {
      assert.match(session.prompts.at(-1), new RegExp(findingId));
      assert.match(session.prompts.at(-1), /parse-task.*recover-empty/);
      assert.match(session.prompts.at(-1), /action journey.*BOTH desktop and narrow/);
      await fs.appendFile(path.join(cwd, 'index.html'), '\n<style>#parse{min-height:44px}</style>');
      await captureAndReview({ action: 'open', viewport: 'desktop' }, {
        resolutions: [{ findingId, change: 'Added min-height:44px to the primary parse button.' }]
      });
    }
    return true;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(attempts, 3, 'The changed source and new comparison earn a second visual completion prompt.');
  assert.equal(h.project.visualReview.reviews.some(review => review.resolutions.some(resolution => resolution.findingId === findingId)), true);
  assert.equal(h.project.logs.filter(log => log.text.includes('Starting visual review iteration')).length, 2);
  assert.equal(h.sessions.some(session => session.stage === 'repair'), false, 'Visual completion does not consume the independent repair attempt.');
  assert.equal(reportPassed(h.project.report), true);
});

test('Stop cancels a pending visual completion iteration without entering verification', { timeout: workflowTimeout }, async t => {
  const entered = deferred(); let attempts = 0;
  const h = await harness(t, { visualReview: async ({ stage }) => {
    if (stage !== 'guide') return false;
    if (++attempts === 2) { entered.resolve(); await never(); }
    return true;
  } });
  await h.backend.start(h.project.id); await entered.promise;
  const session = h.sessions.at(-1);
  await h.backend.stop(h.project.id); await h.assertSettled('stopped');
  assert.equal(attempts, 2);
  assert.equal(session.disposed, true);
  assert.equal(h.sessions.some(session => session.stage === 'verify'), false);
  assert.equal(h.project.stages.find(stage => stage.id === 'review').status, 'queued');
});

test('changed runtime files cannot extend visual completion beyond three retries', { timeout: workflowTimeout }, async t => {
  let attempts = 0, edits = 0;
  const h = await harness(t, {
    visualReview: ({ stage }) => {
      if (stage !== 'guide') return false;
      attempts++;
      // Real source changes exercise progress accounting without repeated browser work.
      return true;
    },
    afterVisualReview: async ({ cwd, stage }) => {
      if (stage === 'guide') await fs.appendFile(path.join(cwd, 'index.html'), `\n<!-- incomplete visual attempt ${++edits} -->`);
    }
  });
  await h.run(); await h.assertSettled('failed');
  assert.equal(attempts, 4, 'The initial attempt and three retries execute the same production completion loop.');
  assert.equal(edits, 4, 'Three useful but still incomplete visual iterations are the bounded maximum.');
  assert.equal(h.project.logs.filter(log => log.text.includes('Starting visual review iteration')).length, 3);
  assert.equal(h.sessions.find(session => session.stage === 'build').prompts.filter(prompt => prompt.startsWith('The stage is incomplete.')).length, 3);
  assert.deepEqual(h.project.visualReview.captures, []);
  assert.deepEqual(h.project.visualReview.reviews, []);
  assert.match(h.project.error, /after 3 visual review iterations/);
  assert.doesNotMatch(h.project.error, /exceeded|no progress/i);
  assert.equal(h.sessions.some(session => session.stage === 'verify'), false);
  assert.equal(h.project.report, undefined);
});

test('editing runtime source after visual rechecks rejects stale screenshots and journeys at both widths', { timeout: workflowTimeout }, async t => {
  let attempts = 0, edits = 0;
  const h = await harness(t, {
    visualReview: ({ stage }) => {
      if (stage !== 'guide') return false;
      return ++attempts > 1;
    },
    afterVisualReview: async ({ cwd, stage }) => {
      if (stage === 'guide' && attempts === 1) {
        await fs.appendFile(path.join(cwd, 'index.html'), `\n<!-- source edit after visual review ${++edits} -->`);
      }
    }
  });
  await h.run(); await h.assertSettled('failed');
  assert.equal(attempts, 2, 'The stale review prompts one retry; unchanged evidence then makes no progress.');
  assert.equal(edits, 1);
  assert.equal(h.project.logs.filter(log => log.text.includes('Starting visual review iteration')).length, 1);
  const visual = h.project.visualReview;
  assert.equal(visual.captures.length, 6, 'Only the first attempt obtains real host browser captures.');
  assert.equal(visual.reviews.length, 6);
  assert.equal(visual.reviews.filter(review => review.round === 'initial').length, 2);
  assert.equal(visual.reviews.filter(review => review.round === 'recheck').length, 4);
  assert.equal(visual.captures.filter(capture => capture.journey?.status === 'passed').length, 4);
  assert.ok(visual.captures.every(capture => capture.filesHash !== visual.filesHash), 'Every retained capture predates the source edit.');
  assert.match(h.project.error, /visual review made no progress/i);
  for (const viewport of ['desktop', 'narrow']) {
    assert.match(h.project.error, new RegExp(`The final ${viewport} screenshot is stale`));
    for (const journeyId of ['parse-task', 'recover-empty']) {
      assert.match(h.project.error, new RegExp(`Journey ${journeyId} at ${viewport} is stale`));
    }
  }
  assert.equal(h.sessions.some(session => session.stage === 'verify'), false);
  assert.equal(h.project.report, undefined);
});

test('source changes while restoring the sealed answer key cannot be blessed by the final report hash', { timeout: workflowTimeout }, async t => {
  const h = await harness(t);
  const checkpoint = h.backend.checkpoint.bind(h.backend);
  let edited = false;
  h.backend.checkpoint = async (project, run, stage) => {
    await checkpoint(project, run, stage);
    if (!edited && project.report && run.quality?.sealedEvaluation === false) {
      edited = true;
      await fs.appendFile(path.join(project.workspace, 'index.html'), '\n<!-- edit after independent verification -->');
    }
  };
  await h.run(); await h.assertSettled('failed');
  assert.equal(edited, true, 'The source edit occurs after the frozen answer key is restored.');
  assert.match(h.project.error, /changed while finalizing verification/);
  assert.equal(h.project.resumeStage, 'verify');
  assert.notEqual(h.project.report.sourceHash, await sourceHash(h.project.workspace));
  assert.equal(h.project.stages.find(stage => stage.id === 'review').status, 'queued');
});

test('a text-only Pi model cannot complete a browser build without receiving screenshot pixels', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { modelInput: ['text'] });
  await h.run(); await h.assertSettled('failed');
  assert.match(h.project.error, /image|screenshot/i);
  assert.equal(h.sessions.some(session => session.stage === 'build'), false);
  assert.equal(h.project.stages.find(stage => stage.id === 'verify').status, 'queued');
  assert.equal(h.project.report, undefined);
});

test('research and planning resume with recorded answers before contracts freeze, including an immediate answer', { timeout: workflowTimeout }, async t => {
  const question = { question: 'Which audience comes first?', context: 'This determines workflow detail.', options: ['Operator', 'Analyst'], recommendation: 'Operator' };
  const waiting = deferred();
  let h;
  h = await harness(t, { clarifications: true, scenario: async ({ stage, session, sessions, project }) => {
    if (['research', 'plan'].includes(stage) && sessions.filter(item => item.stage === stage).length === 1) {
      await session.customTools.find(tool => tool.name === 'fleet_request_clarification').execute('question', { questions: [question] });
      const q = project.conversation.questions.at(-1);
      if (stage === 'research') waiting.resolve();
      // Planning exercises an answer arriving before disposal and wait() registration.
      else await h.broker.answer(project.id, q.id, 'Keep the existing task list workflow');
      return true;
    }
    if (['research', 'plan', 'build', 'verify'].includes(stage)) {
      assert.match(session.prompts[0], /User clarification answers for this run/);
      assert.match(session.prompts[0], /Operator/);
    }
    if (stage === 'build') assert.match(session.prompts[0], /Keep the existing task list workflow/);
    return false;
  } });
  h.project.dataInputs = [{ name: 'message.txt', kind: 'text', content: 'TASK: inspect pump' }];
  await h.backend.start(h.project.id); await waiting.promise;
  await h.sessions.at(-1).whenDisposed;
  assert.equal(h.sessions.at(-1).disposed, true);
  assert.equal(h.project.status, 'running');
  await h.broker.answer(h.project.id, h.project.conversation.questions[0].id, 'Operator');
  await h.settle(); await h.assertSettled('review');
  assert.deepEqual(h.sessions.map(session => session.stage), ['intake', 'research', 'research', 'plan', 'plan', 'build', 'verify']);
  assert.ok(h.sessions.every(session => session.disposed));
  assert.equal(h.sessions.filter(session => ['research', 'plan'].includes(session.stage)).every(session => session.prompts.length === 1), true, 'Asking does not invoke an artifact completion retry');
  const recorded = JSON.parse(await fs.readFile(path.join(h.project.workspace, 'clarifications.json'), 'utf8'));
  assert.equal(recorded.questions.length, 2);
  assert.ok(recorded.questions.every(question => question.status === 'answered'));
  assert.equal(h.project.conversation.messages.filter(message => message.role === 'user').length, 2);
  const requirements = await fs.readFile(path.join(h.project.workspace, 'requirements.md'), 'utf8');
  assert.equal(requirements.includes('Which audience comes first?'), false);
});

test('human clarification waits outlive agent idle and total deadlines; Stop cancels and releases the run', { timeout: workflowTimeout }, async t => {
  const entered = deferred();
  // Real skill-packet I/O must finish before this test reaches the human wait.
  // Keep the wait longer than both stage deadlines, including under suite load.
  const h = await harness(t, { clarifications: true, agentLimits: { idleMs: 1000, timeoutMs: 1500 }, scenario: async ({ stage, session }) => {
    if (stage !== 'research') return false;
    await session.customTools.find(tool => tool.name === 'fleet_request_clarification').execute('question', { questions: [{ question: 'Who is this for?', context: 'The audience is missing.' }] });
    entered.resolve(); return true;
  } });
  h.project.dataInputs = [{ name: 'message.txt', kind: 'text', content: 'TASK: inspect pump' }];
  await h.backend.start(h.project.id); await entered.promise;
  await new Promise(resolve => setTimeout(resolve, 1800));
  assert.equal(h.project.status, 'running');
  assert.equal(h.sessions.at(-1).disposed, true);
  assert.equal(h.sessions.at(-1).prompts.length, 1);
  assert.equal(h.project.stages.find(stage => stage.id === 'plan').status, 'queued');
  const q = h.project.conversation.questions[0];
  await h.backend.stop(h.project.id); await h.assertSettled('stopped');
  assert.equal(q.status, 'cancelled');
  await assert.rejects(h.broker.answer(h.project.id, q.id, 'Operator'), /no longer waiting/);
});

test('a model failure after requesting clarification cancels pending questions', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { clarifications: true, scenario: async ({ stage, session }) => {
    if (stage !== 'research') return false;
    await session.customTools.find(tool => tool.name === 'fleet_request_clarification').execute('question', { questions: [{ question: 'Who is this for?', context: 'The audience is missing.' }] });
    throw new Error('Provider disconnected after asking');
  } });
  await h.run(); await h.assertSettled('failed');
  assert.match(h.project.error, /Provider disconnected/);
  assert.equal(h.project.conversation.questions[0].status, 'cancelled');
  assert.equal(h.sessions.some(session => session.stage === 'plan'), false);
});

test('clarification rounds are bounded and never freeze unanswered planning contracts', { timeout: workflowTimeout }, async t => {
  let h;
  h = await harness(t, { clarifications: true, scenario: async ({ stage, session, project }) => {
    if (stage !== 'plan') return false;
    await session.customTools.find(tool => tool.name === 'fleet_request_clarification').execute('question', { questions: [{ question: 'Which workflow is primary?', context: 'A required planning decision.' }] });
    await h.broker.answer(project.id, project.conversation.questions.at(-1).id, 'The existing task list');
    return true;
  } });
  await h.run(); await h.assertSettled('failed');
  assert.match(h.project.error, /two clarification rounds/);
  assert.equal(h.sessions.filter(session => session.stage === 'plan').length, 3);
  assert.equal(h.sessions.some(session => session.stage === 'build'), false);
  assert.deepEqual(h.project.conversation.questions.map(question => question.round), [1, 2]);
  await assert.rejects(fs.access(path.join(h.root, 'evaluations', h.project.runId + '.json')), /ENOENT/);
});

test('downstream agents cannot overwrite the recorded user answers', { timeout: workflowTimeout }, async t => {
  let h;
  h = await harness(t, { clarifications: true, scenario: async ({ cwd, stage, session, sessions, project }) => {
    if (stage === 'research' && sessions.filter(item => item.stage === 'research').length === 1) {
      await session.customTools.find(tool => tool.name === 'fleet_request_clarification').execute('question', { questions: [{ question: 'Who is this for?', context: 'The audience is missing.' }] });
      await h.broker.answer(project.id, project.conversation.questions.at(-1).id, 'Operator'); return true;
    }
    if (stage === 'build') await fs.writeFile(path.join(cwd, 'clarifications.json'), '{"answer":"invented"}');
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  assert.match(h.project.error, /clarification answers changed/);
  assert.equal(h.sessions.some(session => session.stage === 'verify'), false);
});

test('builds accept optional criteria and hand input/output descriptions, resources and links to agents', { timeout: workflowTimeout }, async t => {
  const h = await harness(t);
  h.project.criteria = [];
  h.project.inputs = 'Synthetic operational messages';
  h.project.outputs = 'Structured tasks, events and deadlines';
  h.project.resources = 'Synthetic task messages and a blank report template.';
  h.project.links = ['https://example.com/reference'];
  await h.run(); await h.assertSettled('review');
  const requirements = await fs.readFile(path.join(h.project.workspace, 'requirements.md'), 'utf8');
  assert.match(requirements, /No evaluation criteria supplied/);
  assert.ok(requirements.includes('## Inputs\n\n' + h.project.inputs));
  assert.ok(requirements.includes('## Outputs\n\n' + h.project.outputs));
  assert.ok(requirements.includes(h.project.resources));
  assert.ok(requirements.includes(h.project.links[0]));
  const packet = JSON.parse(await fs.readFile(path.join(h.project.workspace, '.fleet/packet.json'), 'utf8'));
  assert.deepEqual(packet.userScope.criteria, []);
  assert.equal(packet.userScope.inputs, h.project.inputs);
  assert.equal(packet.userScope.outputs, h.project.outputs);
  assert.equal(packet.userScope.resources, h.project.resources);
  assert.deepEqual(packet.userScope.links, h.project.links);
  assert.equal(h.sessions.filter(session => session.stage === 'synthetic-data').length, 1, 'Input/output descriptions, resource notes and reference links do not count as connected data');
  assert.equal(reportPassed(h.project.report), true);
});

test('connected file and pasted inputs reach agents unchanged and skip the synthetic-data specialist', { timeout: workflowTimeout }, async t => {
  const h = await harness(t);
  h.project.dataInputs = [
    { name: 'messages.csv', kind: 'file', content: 'message\r\nTASK: inspect pump\r\n' },
    { name: 'message-notes.txt', kind: 'text', content: '  TASK: check valve\n' }
  ];
  await h.run(); await h.assertSettled('review');
  assert.deepEqual(h.sessions.map(session => session.stage), ['intake', 'research', 'plan', 'build', 'verify']);
  for (const [index, input] of h.project.dataInputs.entries()) {
    assert.equal(await fs.readFile(path.join(h.project.workspace, 'inputs', `${String(index + 1).padStart(3, '0')}-${input.name}`), 'utf8'), input.content);
  }
  const packet = JSON.parse(await fs.readFile(path.join(h.project.workspace, '.fleet/packet.json'), 'utf8'));
  assert.deepEqual(packet.userScope.dataInputs, h.project.dataInputs.map(({ name, kind, content }) => ({ name, kind, bytes: Buffer.byteLength(content, 'utf8') })));
  assert.equal(packet.dataPolicy, 'user-provided-or-synthetic');
  const requirements = await fs.readFile(path.join(h.project.workspace, 'requirements.md'), 'utf8');
  assert.match(requirements, /messages\.csv/);
  assert.match(h.sessions.find(session => session.stage === 'build').prompts[0], /inputs\/manifest\.json/);
  await assert.rejects(fs.access(path.join(h.project.workspace, 'data/synthetic-data.json')), /ENOENT/);
});

test('the no-data specialist finishes within intake before downstream agents receive its dataset', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage, project }) => {
    if (stage === 'synthetic-data') {
      assert.equal(project.stages.find(item => item.id === 'intake').status, 'active');
      assert.equal(project.stages.find(item => item.id === 'research').status, 'queued');
      await fs.access(path.join(cwd, 'scope.md'));
    }
    if (stage === 'research') assert.equal(JSON.parse(await fs.readFile(path.join(cwd, 'data/synthetic-data.json'), 'utf8')).classification, 'synthetic');
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  const specialist = h.sessions.find(session => session.stage === 'synthetic-data');
  assert.ok(specialist);
  assert.notEqual(specialist, h.sessions[0], 'Data generation gets its own agent session');
  assert.match(specialist.prompts[0], /requirements\.md/);
  assert.match(specialist.prompts[0], /scope\.md/);
  assert.match(h.sessions.find(session => session.stage === 'build').prompts[0], /data\/synthetic-data\.json/);
  assert.equal(specialist.disposed, true);
  assert.deepEqual(specialist.tools, ['read', 'write', 'edit', 'bash', 'fleet_helpers', 'fleet_run_helper']);
  assert.deepEqual(specialist.customTools.map(tool => tool.name), ['fleet_helpers', 'fleet_run_helper']);
  assert.deepEqual(specialist.skills, ['fleet-data']);
  assert.equal(h.project.stages.length, 7, 'The specialist does not add a user-facing build phase');
});

for (const recover of [true, false]) {
  test(`invalid synthetic data ${recover ? 'gets one completion attempt' : 'blocks research after one completion attempt'}`, { timeout: workflowTimeout }, async t => {
    const h = await harness(t, { scenario: async ({ cwd, stage, session }) => {
      if (stage !== 'synthetic-data') return false;
      if (recover && session.prompts.length === 2) return false;
      await fs.mkdir(path.join(cwd, 'data'), { recursive: true });
      await fs.writeFile(path.join(cwd, 'data/synthetic-data.json'), JSON.stringify({ classification: 'synthetic', records: [] }));
      await fs.writeFile(path.join(cwd, 'data/README.md'), 'Invented examples.');
      return true;
    } });
    await h.run(); await h.assertSettled(recover ? 'review' : 'failed');
    assert.equal(h.sessions.find(session => session.stage === 'synthetic-data').prompts.length, 2);
    if (!recover) {
      assert.equal(h.sessions.some(session => session.stage === 'research'), false);
      assert.equal(h.project.stages.find(item => item.id === 'intake').status, 'failed');
      assert.equal(h.project.report, undefined);
    }
  });
}

for (const supplied of [false, true]) {
  test(`downstream agents cannot change ${supplied ? 'connected inputs' : 'the generated synthetic dataset'}`, { timeout: workflowTimeout }, async t => {
    const h = await harness(t, { scenario: async ({ cwd, stage }) => {
      if (stage === 'plan') await fs.appendFile(path.join(cwd, supplied ? 'inputs/001-messages.csv' : 'data/synthetic-data.json'), '\nChanged by the planner');
      return false;
    } });
    if (supplied) h.project.dataInputs = [{ name: 'messages.csv', kind: 'file', content: 'message\nTASK: inspect pump\n' }];
    await h.run(); await h.assertSettled('failed');
    assert.equal(h.sessions.some(session => session.stage === 'build'), false);
    assert.equal(h.project.report, undefined);
    assert.match(h.project.error, /input|data|integrity|changed/i);
  });
}

for (const runtimeProfile of ['browser', 'cli']) test(`the complete ${runtimeProfile} workflow routes skills by role and persists real test evidence before human review`, { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { modelInput: runtimeProfile === 'cli' ? ['text'] : ['text', 'image'], scenario: runtimeProfile === 'cli' ? async ({ cwd, stage }) => {
    if (!['plan', 'build', 'guide'].includes(stage)) return false;
    await artifacts(cwd, stage);
    if (stage === 'plan') {
      const solution = JSON.parse(await fs.readFile(path.join(cwd, 'solution-contract.json'), 'utf8'));
      solution.runtime = { profile: 'cli', files: ['evaluate.cjs', 'core.cjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'evaluate.cjs', args: [] } };
      const plan = JSON.parse(await fs.readFile(path.join(cwd, 'acceptance-plan.json'), 'utf8'));
      plan.journeys = [];
      for (const criterion of plan.criteria) criterion.journeyIds = [];
      await fs.writeFile(path.join(cwd, 'solution-contract.json'), JSON.stringify(solution));
      await fs.writeFile(path.join(cwd, 'acceptance-plan.json'), JSON.stringify(plan));
    } else if (stage === 'build') {
      await fs.rm(path.join(cwd, 'index.html'));
      await fs.writeFile(path.join(cwd, 'evaluate.cjs'), 'const {readFileSync} = require("node:fs"), {parse} = require("./core.cjs"); process.stdout.write(JSON.stringify(parse(JSON.parse(readFileSync(0, "utf8")))));');
    } else await fs.writeFile(path.join(cwd, 'README.md'), '# Task parser\nNo installation is required beyond Node. Pipe a JSON message into `node evaluate.cjs`; the input `"TASK: inspect pump"` returns `"inspect pump"`, while an empty JSON string returns null. Run `node --test app.test.cjs` for developer tests.');
    return true;
  } : undefined });
  await h.run(); await h.assertSettled('review');
  assert.deepEqual(h.sessions.map(s => s.stage), ['intake', 'synthetic-data', 'research', 'plan', 'build', 'verify'], h.project.logs.filter(log => log.stage === 'verify').map(log => log.text).join('\n'));
  for (const id of ['intake', 'research', 'plan', 'build', 'verify']) {
    const changes = h.snapshots.map(p => p.stages.find(s => s.id === id).status).filter((s, i, all) => !i || s !== all[i - 1]);
    assert.deepEqual(changes, ['queued', 'active', 'complete'], id);
  }
  assert.equal(reportPassed(h.project.report), true); assert.equal(h.project.report.passed, 2);
  assert.equal(h.project.qualityVersion, 3);
  assert.equal(h.project.report.quality.status, 'passed');
  assert.equal(h.project.runtimeProfile, runtimeProfile);
  assert.equal(h.project.report.quality.journeys.length, runtimeProfile === 'browser' ? 4 : 0);
  assert.equal(h.project.report.quality.visualReview?.status, runtimeProfile === 'browser' ? 'passed' : undefined);
  if (runtimeProfile === 'browser') {
    const visual = h.project.report.quality.visualReview;
    assert.equal(visual.captures.length, 12);
    assert.equal(visual.reviews.filter(review => review.round === 'initial').length, 4);
    assert.equal(visual.reviews.filter(review => review.round === 'recheck').length, 8);
    assert.equal(visual.captures.filter(capture => capture.journey?.status === 'passed').length, 8, 'Every frozen journey is exercised in both viewports by both agents.');
    assert.deepEqual(visual.sessions.map(session => session.stage), ['build', 'verify']);
    assert.ok(visual.sessions.every(session => session.status === 'passed'));
    assert.deepEqual(h.project.visualReview, visual);
  }
  assert.equal(h.project.report.quality.requirementsMet, false);
  assert.ok(h.project.report.quality.criteria.some(criterion => criterion.status === 'unverified'));
  assert.equal(h.project.report.sourceHash, await sourceHash(h.project.workspace));
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(h.project.workspace, 'test-report.json'), 'utf8')), h.project.report);
  assert.equal(h.project.stages.find(s => s.id === 'review').status, 'review');
  assert.equal(h.project.stages.find(s => s.id === 'deliver').status, 'queued');
  assert.equal(h.project.approvedAt, undefined); assert.ok(h.sessions.every(s => s.disposed));
  assert.equal(h.sessions.find(s => s.stage === 'build').prompts.length, runtimeProfile === 'cli' ? 2 : 3);
  assert.match(await fs.readFile(path.join(h.project.workspace, 'README.md'), 'utf8'), /No installation is required/);
  assert.ok(h.snapshots.every(p => p.stages.filter(s => s.status === 'active').length <= 1), 'Only one phase may execute at a time');
  assert.deepEqual(h.project.globalTools, ['read', 'write', 'edit', 'bash', 'fleet_helpers', 'fleet_run_helper']);
  const packet = JSON.parse(await fs.readFile(path.join(h.project.workspace, '.fleet/packet.json'), 'utf8'));
  const expectedPhases = packet.stages.map(phase => runtimeProfile === 'cli' && ['build', 'verify'].includes(phase.id)
    ? { ...phase, tools: phase.tools.filter(tool => tool !== 'fleet_visual_review'), skills: phase.skills.filter(skill => skill !== 'impeccable') } : phase);
  assert.deepEqual(h.project.phasePlan, expectedPhases);
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects.find(project => project.id === h.project.id);
  assert.deepEqual(saved.phasePlan, h.project.phasePlan);
  assert.deepEqual(h.project.globalTools, packet.globalTools);
  for (const session of h.sessions) {
    assert.equal(session.skills.includes('ponytail'), ['research', 'plan', 'build', 'verify'].includes(session.stage), `${session.stage} Ponytail access`);
    assert.equal(session.skills.includes('impeccable'), session.stage === 'plan' || runtimeProfile === 'browser' && ['build', 'verify'].includes(session.stage), `${session.stage} Impeccable access`);
    if (session.stage === 'synthetic-data') continue;
    const phase = h.project.phasePlan.find(phase => phase.id === session.stage);
    assert.deepEqual(session.tools, [...packet.globalTools, ...phase.tools]);
    assert.deepEqual(session.skills.sort(), [...phase.skills].sort());
    assert.deepEqual(session.customTools.map(tool => tool.name).sort(), [...phase.tools, 'fleet_helpers', 'fleet_run_helper'].sort());
    assert.match(session.prompts[0], /Global workspace tools inherited by every agent phase/);
  }
});

for (const recover of [true, false]) {
  test(`new planning ${recover ? 'repairs' : 'rejects'} a missing public invocation protocol before sealing answers`, { timeout: workflowTimeout }, async t => {
    const h = await harness(t, { scenario: async ({ cwd, stage, session }) => {
      if (stage === 'plan') {
        await artifacts(cwd, stage);
        if (!recover || session.prompts.length === 1) {
          const file = path.join(cwd, 'solution-contract.json');
          const contract = JSON.parse(await fs.readFile(file, 'utf8'));
          delete contract.invocation;
          await fs.writeFile(file, JSON.stringify(contract));
        }
        return true;
      }
      if (stage === 'build') {
        const contract = JSON.parse(await fs.readFile(path.join(cwd, 'solution-contract.json'), 'utf8'));
        assert.match(contract.invocation.rules[0], /TASK:/);
        await assert.rejects(fs.access(path.join(cwd, 'evaluation-plan.json')), /ENOENT/);
      }
      return false;
    } });
    await h.run();
    await h.assertSettled(recover ? 'review' : 'failed');
    const planner = h.sessions.find(session => session.stage === 'plan');
    assert.equal(planner.prompts.length, 2);
    assert.match(planner.prompts[1], /requires invocation/);
    if (!recover) {
      assert.equal(h.sessions.some(session => session.stage === 'build'), false);
      await fs.access(path.join(h.project.workspace, 'evaluation-plan.json'));
      await assert.rejects(fs.access(path.join(h.root, 'evaluations', h.project.runId + '.json')), /ENOENT/);
    }
  });
}

test('the host materializes a service foundation before implementation and verifies its shared backend', { timeout: 45000 }, async t => {
  let sawFoundation = false;
  const selection = { schemaVersion: 1, templateId: 'node-service', version: '1.0.0', computePack: 'custom', reason: 'Use a real backend task parser with the bundled service and browser client.' };
  const h = await harness(t, { componentFile: 'compute.mjs', scenario: async ({ cwd, stage }) => {
    if (stage === 'plan') {
      await artifacts(cwd, stage);
      const solution = JSON.parse(await fs.readFile(path.join(cwd, 'solution-contract.json'), 'utf8'));
      solution.runtime = foundationRuntime(selection);
      const plan = JSON.parse(await fs.readFile(path.join(cwd, 'acceptance-plan.json'), 'utf8'));
      const ux = JSON.parse(await fs.readFile(path.join(cwd, 'ux-spec.json'), 'utf8'));
      ux.screens[0].route = '/';
      ux.screens[0].primaryAction = 'Run computation';
      ux.screens[0].layout = 'A labeled JSON input and Run computation action precede the backend result and validation feedback.';
      plan.journeys = [
        { id: 'parse-task', title: 'Parse using the backend', kind: 'primary', steps: [
          { action: 'expectScreen', screenId: ux.structure.entryScreenId },
          { action: 'fill', selector: '#input', value: '"TASK: inspect pump"' }, { action: 'click', selector: '#run' },
          { action: 'expectText', selector: '#result', text: '"inspect pump"' }
        ] },
        { id: 'recover-empty', title: 'Recover from invalid JSON', kind: 'recovery', steps: [
          { action: 'expectScreen', screenId: ux.structure.entryScreenId },
          { action: 'fill', selector: '#input', value: '{ invalid' }, { action: 'click', selector: '#run' },
          { action: 'expectVisible', selector: '#error' },
          { action: 'fill', selector: '#input', value: '"TASK: inspect pump"' }, { action: 'click', selector: '#run' },
          { action: 'expectText', selector: '#result', text: '"inspect pump"' }
        ] }
      ];
      for (const [name, value] of Object.entries({ 'solution-contract.json': solution, 'acceptance-plan.json': plan, 'ux-spec.json': ux, 'foundation-plan.json': selection })) {
        await fs.writeFile(path.join(cwd, name), JSON.stringify(value));
      }
      return true;
    }
    if (stage === 'build') {
      assert.ok((await fs.stat(path.join(cwd, 'server.mjs'))).size > 0);
      const lock = JSON.parse(await fs.readFile(path.join(cwd, 'foundation-lock.json'), 'utf8'));
      assert.equal(lock.selection.templateId, 'node-service');
      assert.ok(lock.copiedFiles >= 7);
      sawFoundation = true;
      await fs.writeFile(path.join(cwd, 'compute.mjs'), 'export async function compute(text) { return text.startsWith("TASK: ") ? text.slice(6) : null; }');
      await fs.writeFile(path.join(cwd, 'app.test.mjs'), 'import test from "node:test"; import assert from "node:assert/strict"; import {compute} from "./compute.mjs"; test("actual backend parser", async()=>{assert.equal(await compute("TASK: inspect pump"),"inspect pump");assert.equal(await compute("TASK: close valve"),"close valve");assert.equal(await compute(""),null);});');
      await fs.writeFile(path.join(cwd, 'path-to-fleet.md'), 'Synthetic grammar only; domain validation required.');
      return true;
    }
    if (stage === 'guide') {
      await fs.writeFile(path.join(cwd, 'README.md'), '# Task parser\nRun node server.mjs and open the printed loopback URL. Paste a JSON task string and select Run computation. The actual backend parser returns the task. Developer checks: node --test app.test.mjs.');
      return true;
    }
    return false;
  } });
  await h.run();
  assert.equal(h.project.status, 'review', JSON.stringify({ error: h.project.error, report: h.project.report }, null, 2));
  await h.assertSettled('review');
  assert.equal(sawFoundation, true);
  assert.equal(h.project.runtimeProfile, 'service');
  for (const stage of ['plan', 'build', 'verify']) {
    const session = h.sessions.find(session => session.stage === stage);
    assert.ok(session.skills.includes('ponytail'), `${stage} receives Ponytail`);
    assert.ok(session.skills.includes('impeccable'), `${stage} receives Impeccable for the service UI`);
  }
  assert.equal(reportPassed(h.project.report, true), true);
  assert.ok(h.project.logs.some(log => log.text.includes('Foundation node-service@1.0.0')));
});

test('core evaluation precedes completed application component tracking', { timeout: 20000 }, async t => {
  let completedApplication = false;
  const h = await harness(t, { deferComponentProgress: true, scenario: async ({ cwd, stage, project }) => {
    if (stage === 'guide') {
      const core = JSON.parse(await fs.readFile(path.join(cwd, '.quality-evidence/core-report.json'), 'utf8'));
      assert.equal(core.status, 'passed');
      assert.equal(project.systemDesign.progress.parser.status, 'planned');
      completedApplication = true;
    }
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(completedApplication, true);
  assert.equal(h.sessions.find(session => session.stage === 'build').prompts.length, 3, 'Core and primary workflow checkpoints precede full component completion');
  assert.equal(reportPassed(h.project.report, true), true);
});

test('host core evidence survives agent edits and deletion through guide, verification and repair', { timeout: workflowTimeout }, async t => {
  let original;
  const h = await harness(t, { brokenBuild: true, scenario: async ({ cwd, stage }) => {
    const target = path.join(cwd, '.quality-evidence/core-report.json');
    if (stage === 'guide') {
      original = await fs.readFile(target, 'utf8');
      const report = JSON.parse(original);
      report.status = 'local-tests-passed-host-core-pass-reported';
      report.tests = report.passed = 7;
      await fs.writeFile(target, JSON.stringify(report));
    } else if (stage === 'verify' || stage === 'repair') {
      assert.equal(await fs.readFile(target, 'utf8'), original, 'The next agent must receive exact host evidence');
      if (stage === 'verify') await fs.rm(target);
      else await fs.writeFile(target, '{"status":"agent-claimed-pass"}');
    }
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(await fs.readFile(path.join(h.project.workspace, '.quality-evidence/core-report.json'), 'utf8'), original);
  assert.equal(h.project.logs.filter(log => log.text.includes('Restored host core evaluation evidence')).length, 3);
  assert.equal(h.sessions.filter(session => session.stage === 'repair').length, 1);
  assert.equal(h.sessions.find(session => session.stage === 'build').prompts.length, 3);
  assert.equal(reportPassed(h.project.report, true), true);
  assert.equal(await sourceHash(h.project.workspace), h.project.report.sourceHash);
});

test('resuming verification restores host core evidence from private storage after a restart', { timeout: workflowTimeout }, async t => {
  let original, interrupt = true;
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (stage !== 'verify') return false;
    const target = path.join(cwd, '.quality-evidence/core-report.json');
    if (interrupt) {
      interrupt = false;
      original = await fs.readFile(target, 'utf8');
      await fs.writeFile(target, '{"status":"agent-claimed-pass"}');
      throw new Error('Interrupted verification after editing evidence');
    }
    assert.equal(await fs.readFile(target, 'utf8'), original);
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  const count = h.sessions.length, { runId, workspace } = h.project;
  const restored = new Store(h.root); await restored.init();
  Object.assign(h.project, restored.project(h.project.id));
  const restarted = new PiBackend(h.store, process.execPath, () => {}, resourcesRoot, h.backend.options);
  restarted.runtime = h.backend.runtime;
  t.after(() => restarted.stopAll());
  await restarted.resume(h.project.id); await restarted.active.get(h.project.id)?.done;
  assert.equal(h.project.status, 'review', h.project.error);
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['verify']);
  assert.equal(await fs.readFile(path.join(workspace, '.quality-evidence/core-report.json'), 'utf8'), original);
  assert.equal(reportPassed(h.project.report, true), true);
});

test('a timed-out core evaluation cannot publish evidence or overwrite its recovery checkpoint', { timeout: workflowTimeout }, async t => {
  const finished = deferred();
  const h = await harness(t, { agentLimits: { idleMs: 500, timeoutMs: 10_000 }, scenario: async ({ cwd, stage }) => {
    if (stage !== 'build') return false;
    await artifacts(cwd, stage);
    await fs.writeFile(path.join(cwd, 'evaluate.cjs'), 'setTimeout(() => {\n' + solutionFixtureEvaluator + '\n}, 1000);');
    return true;
  } });
  const evaluate = h.backend.evaluateCore.bind(h.backend);
  h.backend.evaluateCore = async (...args) => {
    try { return await evaluate(...args); }
    finally { finished.resolve(); }
  };
  await h.run(); await h.assertSettled('failed');
  assert.match(h.project.error, /build agent made no progress/);
  const checkpoint = path.join(h.root, 'run-checkpoints', h.project.runId + '.json');
  const saved = await fs.readFile(checkpoint, 'utf8');
  await finished.promise;
  assert.equal(await fs.readFile(checkpoint, 'utf8'), saved, 'Late work must not replace settled recovery state');
  await assert.rejects(fs.access(path.join(h.project.workspace, '.quality-evidence/core-report.json')), { code: 'ENOENT' });
});

for (const repair of [true, false]) test(`required core evaluation ${repair ? 'repairs the engine' : 'blocks application completion'}`, { timeout: 20000 }, async t => {
  let coreAttempts = 0;
  const h = await harness(t, { scenario: async ({ cwd, stage, session }) => {
    if (stage !== 'build' || session.prompts.at(-1).startsWith('Implement the first complete user workflow')) return false;
    coreAttempts++;
    await assert.rejects(fs.access(path.join(cwd, 'evaluation-plan.json')), /ENOENT/, 'The builder must not receive the answer key');
    await artifacts(cwd, stage);
    if (coreAttempts === 1 || !repair) await fs.writeFile(path.join(cwd, 'evaluate.cjs'), 'process.stdin.resume();process.stdin.on("end",()=>process.stdout.write(JSON.stringify("constant answer")));');
    else assert.match(session.prompts.at(-1), /independent core evaluation failed/);
    return true;
  } });
  await h.run(); await h.assertSettled(repair ? 'review' : 'failed');
  assert.equal(coreAttempts, repair ? 2 : 3);
  assert.equal(h.sessions.some(session => session.stage === 'verify'), repair);
  assert.equal(h.sessions.some(session => session.stage === 'repair'), false);
  const evidence = JSON.parse(await fs.readFile(path.join(h.project.workspace, '.quality-evidence/core-report.json'), 'utf8'));
  assert.equal(evidence.status, repair ? 'passed' : 'failed');
  if (repair) {
    assert.equal(reportPassed(h.project.report, true), true);
    await fs.access(path.join(h.project.workspace, 'evaluation-plan.json'));
    assert.equal(await sourceHash(h.project.workspace), h.project.report.sourceHash);
  } else assert.ok(!h.sessions.find(session => session.stage === 'build').writingGuide);
});

for (const repair of [true, false]) test(`passing Node tests and an early workflow cannot hide a later static browser app (${repair ? 'repairs UI' : 'blocks review'})`, { timeout: 30000 }, async t => {
  let attempts = 0, findingId, nodeReport;
  const h = await harness(t, { verificationLimits: { browserStepTimeoutMs: 1000 }, scenario: async ({ cwd, stage }) => {
    if (stage === 'guide' && attempts === 0) {
      await artifacts(cwd, stage);
      await fs.writeFile(path.join(cwd, 'index.html'), '<!doctype html><title>Placeholder</title><main>Works</main><script>' + qualityFixtureHtml.match(/\/\* CORE_START \*\/[\s\S]*?\/\* CORE_END \*\//)[0] + '</script>');
      return true;
    }
    return false;
  }, visualReview: async ({ cwd, stage, session }) => {
    if (stage !== 'guide') return false;
    attempts++;
    if (attempts > 1 && !repair) return true;
    const browser = session.customTools.find(tool => tool.name === 'fleet_browser');
    const reviewer = session.customTools.find(tool => tool.name === 'fleet_visual_review');
    if (attempts === 1) nodeReport = await verifyWorkspace(cwd, process.execPath, () => {});
    else await fs.writeFile(path.join(cwd, 'index.html'), qualityFixtureHtml);
    const result = await browser.execute('exercise-static-app', { action: 'journey', journeyId: 'parse-task', viewport: 'desktop' });
    assert.equal(result.isError, attempts === 1);
    assert.equal(result.details.journey.status, attempts === 1 ? 'failed' : 'passed');
    const comparison = await reviewer.execute('review-static-app', {
      ...fixtureVisualReviewInput(result.details),
      ...(attempts === 1 ? { findings: ['The rendered application has no message input or Parse message action.'] }
        : { resolutions: [{ findingId, change: 'Implemented the message input, parse action and persistent result in index.html.' }] })
    });
    assert.equal(comparison.isError, false, JSON.stringify(comparison.details));
    if (attempts === 1) findingId = comparison.details.review.findings[0].id;
    return attempts === 1;
  } });
  await h.run(); await h.assertSettled(repair ? 'review' : 'failed');
  assert.equal(nodeReport.passed, 2);
  assert.equal(nodeReport.failed, 0);
  assert.equal(reportPassed(h.project.report, true), repair);
  assert.equal(attempts, 2);
  assert.equal(h.sessions.filter(session => session.stage === 'repair').length, 0, 'The development journey gate catches the broken UI before independent verification.');
  assert.equal(h.project.visualReview.captures.some(capture => capture.journey?.status === 'failed'), true);
  if (repair) assert.equal(h.project.report.quality.status, 'passed');
  else {
    assert.equal(h.project.report, undefined);
    assert.equal(h.sessions.some(session => session.stage === 'verify'), false);
    assert.match(h.project.error, /visual review made no progress/);
  }
});

test('builder cannot weaken a planned browser expectation', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (stage !== 'build') return false;
    await artifacts(cwd, stage);
    const file = path.join(cwd, 'acceptance-plan.json');
    const plan = JSON.parse(await fs.readFile(file, 'utf8'));
    plan.journeys[0].steps.find(step => step.action === 'expectText').text = 'incorrect result';
    await fs.writeFile(file, JSON.stringify(plan));
    return true;
  } });
  await h.run(); await h.assertSettled('failed');
  assert.match(h.project.error, /changed after planning/);
  assert.equal(h.project.report, undefined);
  assert.ok(!h.sessions.some(session => session.stage === 'verify'));
});

test('invalid acceptance coverage gets one planning completion attempt before build is blocked', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (stage !== 'plan') return false;
    await artifacts(cwd, stage);
    const file = path.join(cwd, 'acceptance-plan.json');
    const plan = JSON.parse(await fs.readFile(file, 'utf8')); plan.criteria.pop();
    await fs.writeFile(file, JSON.stringify(plan)); return true;
  } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(h.sessions.find(session => session.stage === 'plan').prompts.length, 2);
  assert.match(h.project.error, /quality contract/);
  assert.ok(!h.sessions.some(session => session.stage === 'build'));
});

test('planners validate and correct saved contracts before the single completion attempt is needed', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage, session }) => {
    if (stage !== 'plan') return false;
    assert.ok(session.tools.includes('fleet_validate_plan'));
    assert.ok(session.prompts[0].includes(qualityContractGuide), 'The prompt carries the guide from the current host build.');
    await artifacts(cwd, stage);
    const file = path.join(cwd, 'ux-spec.json');
    const ux = JSON.parse(await fs.readFile(file, 'utf8'));
    const persistentElements = ux.structure.persistentElements;
    delete ux.structure.persistentElements;
    ux.screens[0].rootSelector = ux.screens[0].selector;
    delete ux.screens[0].selector;
    await fs.writeFile(file, JSON.stringify(ux));
    const validate = session.customTools.find(tool => tool.name === 'fleet_validate_plan');
    let result = await validate.execute('missing-persistent', {});
    assert.equal(result.isError, true);
    assert.match(result.details.errors.join(), /ux-spec\.json: structure\.persistentElements/);
    ux.structure.persistentElements = persistentElements;
    await fs.writeFile(file, JSON.stringify(ux));
    result = await validate.execute('wrong-selector', {});
    assert.equal(result.isError, true);
    assert.match(result.details.errors.join(), /rootSelector.*Allowed fields:.*selector/);
    ux.screens[0].selector = ux.screens[0].rootSelector;
    delete ux.screens[0].rootSelector;
    await fs.writeFile(file, JSON.stringify(ux));
    result = await validate.execute('valid', {});
    assert.equal(result.isError, false);
    assert.equal(result.details.status, 'passed');
    await fs.access(path.join(cwd, 'evaluation-plan.json'));
    return true;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(h.sessions.find(session => session.stage === 'plan').prompts.length, 1);
  assert.equal(h.project.logs.some(log => log.text.includes('Starting one artifact completion attempt')), false);
  for (const session of h.sessions.filter(session => session.stage !== 'plan')) {
    assert.equal(session.tools.includes('fleet_validate_plan'), false);
    assert.equal(session.customTools.some(tool => tool.name === 'fleet_validate_plan'), false);
    assert.equal(session.prompts.some(prompt => prompt.includes('Current host planning contract:')), false);
  }
});

test('resumed planning gets current schema guidance and validation without changing an older frozen packet', { timeout: workflowTimeout }, async t => {
  let firstAttempt = true;
  const h = await harness(t, { scenario: async ({ cwd, stage, session }) => {
    if (stage !== 'plan') return false;
    if (firstAttempt) {
      firstAttempt = false;
      await artifacts(cwd, stage);
      throw new Error('Fixture interrupted before planning validation.');
    }
    assert.ok(session.prompts[0].includes(qualityContractGuide));
    assert.match(session.prompts[0], /supersedes conflicting schema examples/);
    assert.match(session.prompts[0], /same workspace/);
    assert.ok(session.tools.includes('fleet_validate_plan'));
    const result = await session.customTools.find(tool => tool.name === 'fleet_validate_plan').execute('resume', {});
    assert.equal(result.isError, false, JSON.stringify(result));
    // Continue entirely from the saved planning files, without rewriting them.
    return true;
  } });
  await h.run(); await h.assertSettled('failed');
  const { runId, workspace } = h.project;
  const saved = await readRunCheckpoint(h.root, h.project);
  const guide = '# Legacy quality guide\nux-spec.json uses schemaVersion 1; no structure or screen assertions.\n';
  const packetRoot = path.join(workspace, '.fleet');
  await fs.writeFile(path.join(packetRoot, 'quality-contract.md'), guide);
  const packetFile = path.join(packetRoot, 'packet.json');
  const packet = JSON.parse(await fs.readFile(packetFile, 'utf8'));
  packet.stages.find(phase => phase.id === 'plan').tools = ['fleet_system_design'];
  await fs.writeFile(packetFile, JSON.stringify(packet));
  saved.phases.find(phase => phase.id === 'plan').tools = ['fleet_system_design'];
  // Construct a trusted historical fixture, including its original packet digest.
  const manifestFile = path.join(packetRoot, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  const hash = createHash('sha256');
  for (const name of [...manifest.files].sort()) hash.update(name + '\0').update(await fs.readFile(path.join(packetRoot, name))).update('\0');
  saved.packetHash = manifest.hash = hash.digest('hex');
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  await writeRunCheckpoint(h.root, h.project, saved);
  await assertFleetPacketIntegrity(workspace, saved.packetHash);
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  assert.equal(h.project.runId, runId);
  assert.equal(h.project.workspace, workspace);
  assert.equal(await fs.readFile(path.join(packetRoot, 'quality-contract.md'), 'utf8'), guide);
  await assertFleetPacketIntegrity(workspace, saved.packetHash);
  const plans = h.sessions.filter(session => session.stage === 'plan');
  assert.equal(plans.length, 2);
  assert.equal(plans[1].prompts.length, 1);
  assert.deepEqual(h.sessions.map(session => session.stage), ['intake', 'synthetic-data', 'research', 'plan', 'plan', 'build', 'verify']);
});

for (const brokenRepair of [false, true]) {
  test(`independent test failure uses bounded progress-sensitive repair and ${brokenRepair ? 'fails clearly' : 'advances after re-verification'}`, { timeout: workflowTimeout }, async t => {
    const h = await harness(t, { brokenBuild: true, brokenRepair }); await h.run();
    await h.assertSettled(brokenRepair ? 'failed' : 'review');
    assert.deepEqual(h.sessions.map(s => s.stage), ['intake', 'synthetic-data', 'research', 'plan', 'build', 'verify', ...Array(brokenRepair ? 2 : 1).fill('repair')]);
    assert.deepEqual(h.sessions.at(-1).skills, h.sessions.find(session => session.stage === 'verify').skills);
    assert.ok(h.sessions.at(-1).skills.includes('ponytail'));
    assert.ok(h.sessions.at(-1).skills.includes('impeccable'));
    assert.equal(reportPassed(h.project.report), !brokenRepair);
    assert.equal(h.project.logs.filter(l => l.text.includes('Starting functional final repair')).length, brokenRepair ? 2 : 1);
    if (brokenRepair) { assert.match(h.project.error, /Functional final repair stopped: no-progress/); assert.equal(h.project.report.failed, 2); }
  });
}

for (const blockedStage of ['intake', 'synthetic-data', 'research', 'plan', 'build', 'verify']) {
  test(`a stalled ${blockedStage} stage fails, clears active stages and frees its run slot`, { timeout: workflowTimeout }, async t => {
    // Earlier phases still perform real packet and runtime I/O before this stall.
    const h = await harness(t, { agentLimits: { idleMs: 2000, timeoutMs: 10_000 }, scenario: ({ stage }) => stage === blockedStage ? never() : false });
    await h.run(); await h.assertSettled('failed'); assert.match(h.project.error, /no progress/);
    assert.equal(h.sessions.at(-1).stage, blockedStage); assert.equal(h.sessions.at(-1).aborts, 1);
    assert.equal(h.project.report, undefined);
  });

  test(`stopping during ${blockedStage} waits for persisted stopped state, not SDK abort`, { timeout: workflowTimeout }, async t => {
    const entered = deferred();
    const h = await harness(t, { scenario: ({ stage }) => { if (stage === blockedStage) { entered.resolve(); return never(); } return false; } });
    await h.backend.start(h.project.id); await entered.promise; await h.backend.stop(h.project.id);
    await h.assertSettled('stopped'); assert.match(h.project.error, /stopped by you/);
    assert.equal(h.sessions.at(-1).aborts, 1);
  });
}

test('missing artifacts get one targeted completion prompt within the same stage', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage, session }) => {
    if (stage !== 'plan') return false;
    await artifacts(cwd, stage); if (session.prompts.length === 1) await fs.rm(path.join(cwd, 'plan.md'));
    return true;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(h.sessions.find(s => s.stage === 'plan').prompts.length, 2); assert.match(h.sessions.find(s => s.stage === 'plan').prompts[1], /plan\.md/);
});

test('an agent that keeps omitting artifacts cannot advance or loop forever', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: ({ stage }) => stage === 'plan' });
  await h.run(); await h.assertSettled('failed');
  assert.equal(h.sessions.length, 4); assert.equal(h.sessions.find(s => s.stage === 'plan').prompts.length, 2);
  assert.match(h.project.error, /after one completion attempt.*plan\.md/);
});

test('empty files and directories cannot satisfy stage outputs', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (stage !== 'plan') return false;
    await fs.writeFile(path.join(cwd, 'plan.md'), ''); await fs.mkdir(path.join(cwd, 'test-matrix.md'), { recursive: true }); return true;
  } });
  await h.run(); await h.assertSettled('failed'); assert.match(h.project.error, /plan\.md.*test-matrix\.md/);
});

test('missing application tests are recovered before verification starts', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage, session }) => {
    if (stage !== 'build') return false;
    await artifacts(cwd, stage); if (session.prompts.length === 1) await fs.rm(path.join(cwd, 'app.test.cjs')); return true;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(h.sessions.find(s => s.stage === 'build').prompts.length, 4); assert.match(h.sessions.find(s => s.stage === 'build').prompts[1], /application.*test/);
});

test('the user guide is requested after implementation and checked before verification', { timeout: workflowTimeout }, async t => {
  const steps = [];
  const h = await harness(t, { scenario: async ({ cwd, stage, session, project }) => {
    steps.push(stage);
    if (stage === 'guide') {
      assert.equal(project.stages.find(s => s.id === 'build').status, 'active');
      assert.equal(project.stages.find(s => s.id === 'verify').status, 'queued');
      await fs.access(path.join(cwd, 'index.html'));
      await fs.access(path.join(cwd, 'app.test.cjs'));
      await assert.rejects(fs.access(path.join(cwd, 'README.md')), /ENOENT/);
      assert.match(session.prompts.at(-1), /actual screen, field and button names/);
      assert.match(session.prompts.at(-1), /prepared input or synthetic sample data and the expected output, with accurate provenance/);
    }
    if (stage === 'verify') {
      assert.match(await fs.readFile(path.join(cwd, 'README.md'), 'utf8'), /Task parser/);
      assert.match(session.prompts[0], /update README.md/);
    }
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.deepEqual(steps, ['intake', 'synthetic-data', 'research', 'plan', 'build', 'guide', 'verify']);
});

for (const recover of [true, false]) {
  test(`an empty user guide ${recover ? 'gets one completion attempt' : 'blocks verification after one completion attempt'}`, { timeout: workflowTimeout }, async t => {
    let attempts = 0;
    const h = await harness(t, { scenario: async ({ cwd, stage }) => {
      if (stage !== 'guide') return false;
      if (++attempts === 2 && recover) return false;
      await fs.writeFile(path.join(cwd, 'README.md'), ' \n\t'); return true;
    } });
    await h.run(); await h.assertSettled(recover ? 'review' : 'failed');
    assert.equal(attempts, 2);
    assert.match(h.sessions.find(s => s.stage === 'build').prompts[2], /README.md/);
    if (!recover) {
      assert.match(h.project.error, /after one completion attempt.*README.md/);
      assert.equal(h.project.report, undefined);
      assert.equal(h.project.stages.find(s => s.id === 'verify').status, 'queued');
    }
  });
}

test('stopping while writing the user guide aborts the build and never starts verification', { timeout: workflowTimeout }, async t => {
  const entered = deferred();
  const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'guide') { entered.resolve(); return never(); } return false; } });
  await h.backend.start(h.project.id); await entered.promise; await h.backend.stop(h.project.id);
  await h.assertSettled('stopped');
  assert.equal(h.sessions.at(-1).stage, 'build'); assert.equal(h.sessions.at(-1).aborts, 1);
  assert.equal(h.project.report, undefined);
});

test('repair updates the user guide before independent verification fingerprints the source', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { brokenBuild: true, scenario: async ({ cwd, stage, session }) => {
    if (stage === 'repair') {
      assert.match(session.prompts[0], /Update README.md.*repaired application/);
      await fs.appendFile(path.join(cwd, 'README.md'), '\nThe repaired core handles empty input.');
    }
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.match(await fs.readFile(path.join(h.project.workspace, 'README.md'), 'utf8'), /repaired core/);
  assert.equal(h.project.report.sourceHash, await sourceHash(h.project.workspace));
  await fs.appendFile(path.join(h.project.workspace, 'README.md'), '\nChanged after verification.');
  assert.notEqual(h.project.report.sourceHash, await sourceHash(h.project.workspace));
});

for (const target of ['requirements.md', '.fleet/README.md']) {
  test(`changes to ${target} stop the workflow at the stage boundary`, { timeout: workflowTimeout }, async t => {
    const h = await harness(t, { scenario: async ({ cwd, stage }) => {
      if (stage === 'plan') await fs.appendFile(path.join(cwd, target), '\nChanged by agent'); return false;
    } });
    await h.run(); await h.assertSettled('failed'); assert.equal(h.sessions.length, 4);
    assert.match(h.project.error, /requirements changed|integrity failed/);
  });
}

test('session initialization errors and preparation errors release capacity', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { createSession: () => { throw new Error('Cannot initialize session'); } });
  await h.run(); await h.assertSettled('failed'); assert.match(h.project.error, /Cannot initialize/);
  const bad = await harness(t, { resourcesRoot: path.join(h.root, 'missing-resources') });
  await assert.rejects(bad.backend.start(bad.project.id), /ENOENT/); await bad.assertSettled('failed');
});

test('stopped runs can restart in fresh workspaces and late old events cannot corrupt the new run', { timeout: workflowTimeout }, async t => {
  const entered = deferred(); let stopFirst = true;
  const h = await harness(t, { scenario: () => { if (stopFirst) { entered.resolve(); return never(); } return false; } });
  await h.backend.start(h.project.id); await entered.promise;
  const oldWorkspace = h.project.workspace, oldSession = h.sessions[0];
  await h.backend.stop(h.project.id); stopFirst = false; await h.run();
  await h.assertSettled('review'); assert.notEqual(h.project.workspace, oldWorkspace);
  const snapshot = structuredClone(h.project);
  oldSession.emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'stale activity' } });
  assert.deepEqual(h.project, snapshot);
  assert.ok((await fs.readFile(path.join(oldWorkspace, 'requirements.md'), 'utf8')).includes(h.project.title));
});

test('Stop during workspace preparation clears prior approval and test evidence', { timeout: workflowTimeout }, async t => {
  const h = await harness(t);
  h.project.status = 'approved'; h.project.approvedAt = 'previous approval';
  h.project.report = { passed: 5 }; h.project.exportedTo = 'previous export';
  const rejected = assert.rejects(h.backend.start(h.project.id), /stopped by you/);
  await h.backend.stop(h.project.id); await rejected; await h.assertSettled('stopped');
  assert.equal(h.project.report, undefined); assert.equal(h.project.approvedAt, undefined);
  assert.equal(h.project.exportedTo, undefined); assert.equal(h.sessions.length, 0);
});

test('duplicate starts and the concurrency limit are enforced; stopAll drains and persists every run', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: never });
  h.store.state.projects.push(newProject({ title: 'Fourth run', description: 'Exercise the concurrent agent capacity limit.', criteria: ['Bound active runs'] }));
  for (const p of h.store.state.projects.slice(0, 3)) await h.backend.start(p.id);
  await assert.rejects(h.backend.start(h.project.id), /already has an active run/);
  await assert.rejects(h.backend.start(h.store.state.projects[3].id), /Three runs/);
  await h.backend.stopAll(); assert.equal(h.backend.active.size, 0);
  const restored = new Store(h.root); await restored.init();
  assert.ok(restored.state.projects.slice(0, 3).every(p => p.status === 'stopped' && p.stages.every(s => s.status !== 'active')));
  assert.equal(restored.state.projects[3].status, 'draft');
});

test('a hung generated test is bounded, repaired once, then reaches review on actual passing evidence', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { verificationLimits: { timeoutMs: 500 }, scenario: async ({ cwd, stage }) => {
    if (stage === 'build') { await artifacts(cwd, stage); await fs.writeFile(path.join(cwd, 'hang.test.cjs'), 'setInterval(() => {}, 1000);'); return true; }
    if (stage === 'repair') await fs.writeFile(path.join(cwd, 'hang.test.cjs'), 'require("node:test")("invalid prefix", () => require("node:assert/strict").equal(require("./core.cjs").parse("INVALID"), null));');
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.ok(h.project.logs.some(l => l.text.includes('Verification exceeded'))); assert.equal(h.sessions.at(-1).stage, 'repair');
});
