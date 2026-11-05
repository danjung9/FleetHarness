import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import { defaultAgentLimits } from '../dist-electron/electron/agent-runner.js';
import { RunProcessSweep } from '../dist-electron/electron/process-sweep.js';
import { loadQualityContract } from '../dist-electron/electron/quality.js';
import { createExecutionBudget } from '../dist-electron/electron/execution-budget.js';
import { retainCoreReport } from '../dist-electron/electron/core-evidence.js';
import { ClarificationBroker } from '../dist-electron/electron/clarifications.js';
import { solutionFixture } from '../scripts/solution-fixture.mjs';
import { syntheticDataFiles } from '../scripts/data-fixture.mjs';
import { fixturePlanningReviewPaths } from '../scripts/planning-review-fixture.mjs';

const resourcesRoot = path.resolve('.');
const timeout = 30_000;
const buildReached = 'Fixture reached implementation after independent planning approval.';
const reviewTools = ['fleet_read_planning_artifact', 'fleet_submit_planning_review'];
const gap = 'Mandatory invalid-input rejection is deferred, and the evaluation lacks invalid and empty cases.';
const never = () => new Promise(() => {});
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function readArtifact(session, name) {
  const tool = session.customTools.find(tool => tool.name === 'fleet_read_planning_artifact');
  let offset = 0, body = '';
  for (;;) {
    const result = await tool.execute('read-' + name, { path: name, offset });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    const page = JSON.parse(result.content.find(item => item.type === 'text').text);
    assert.equal(page.path, name);
    assert.equal(page.offset, offset);
    body += page.text;
    if (page.nextOffset === null || page.nextOffset === undefined) return body;
    assert.ok(page.nextOffset > offset, 'The snapshot reader must make progress.');
    offset = page.nextOffset;
  }
}

async function reviewRecord(session) {
  const reader = session.customTools.find(tool => tool.name === 'fleet_read_planning_artifact');
  const documents = {};
  for (const name of fixturePlanningReviewPaths(reader.parameters)) documents[name] = await readArtifact(session, name);
  session.reviewedDocuments = documents;
  const plan = JSON.parse(documents['acceptance-plan.json']);
  const evaluation = JSON.parse(documents['evaluation-plan.json']);
  return makeReviewRecord(plan, evaluation);
}

function makeReviewRecord(plan, evaluation) {
  const weak = evaluation.evaluations[0].cases.length < 4;
  return {
    verdict: weak ? 'revise' : 'approved',
    minimumUsefulOutcome: 'Extract supplied task text and reject messages without the required prefix, including blank input.',
    scope: plan.criteria.map(item => ({ criterionId: item.criterionId,
      assessment: weak ? 'gap' : 'covered',
      reason: weak ? 'The plan claims input rejection but its implementation narrative and examples omit it.' : 'The required parser capability covers this outcome.' })),
    evaluations: evaluation.evaluations.map(item => ({ evaluationId: item.id,
      assessment: weak ? 'gap' : 'adequate',
      reason: weak ? 'Only ordinary inputs are checked; rejection behavior is untested.' : 'Independent examples cover ordinary, blank and non-task inputs.' })),
    recovery: { assessment: 'not-applicable', reason: 'This stateless CLI has no browser journey; callers can correct input and invoke it again.' },
    findings: weak ? [gap] : []
  };
}

async function writePlanningArtifacts(workspace, acceptance, weak) {
  const ids = acceptance.map(item => item.id), files = solutionFixture(['R1']);
  const plan = JSON.parse(files['acceptance-plan.json']);
  const solution = JSON.parse(files['solution-contract.json']);
  const evaluation = JSON.parse(files['evaluation-plan.json']);
  plan.criteria = ids.map(criterionId => ({ ...structuredClone(plan.criteria[0]), criterionId }));
  solution.runtime = { profile: 'cli', command: { runtime: 'node', entrypoint: 'evaluate.cjs', args: [] },
    files: ['evaluate.cjs', 'core.cjs'], requiredEnv: [] };
  plan.journeys = [];
  plan.criteria.forEach(item => { item.journeyIds = []; });
  if (weak) evaluation.evaluations[0].cases = evaluation.evaluations[0].cases.slice(0, 2);
  {
    solution.capabilities[0].criterionIds = ids;
    plan.criteria.forEach(item => {
      item.disposition = 'implemented'; item.capabilityIds = ['parse'];
      item.expectedOutcome = 'Extract task text and return null for blank or non-task messages.';
      delete item.reason;
      delete item.syntheticCoverage;
    });
  }
  Object.assign(files, {
    'plan.md': weak ? 'Implement extraction only; defer input rejection.' : 'Implement extraction and input rejection in the shared CLI parser.',
    'test-matrix.md': weak ? 'Test two ordinary messages.' : 'Test ordinary messages, blank input and the wrong prefix.',
    'foundation-plan.json': JSON.stringify({ schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom',
      reason: 'A stateless JSON stdin/stdout CLI needs no service or browser starter.' }),
    'acceptance-plan.json': JSON.stringify(plan),
    'solution-contract.json': JSON.stringify(solution),
    'evaluation-plan.json': JSON.stringify(evaluation)
  });
  await Promise.all(Object.entries(files).map(([name, body]) => fs.writeFile(path.join(workspace, name), body)));
  // The semantic review must reject a weak plan even though structural validation succeeds.
  return loadQualityContract(workspace, acceptance, true);
}

async function harness(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-planning-review-'));
  let store = new Store(root); await store.init();
  const backendKind = options.backend ?? 'pi';
  store.state.settings = { backend: backendKind, provider: backendKind === 'codex' ? 'chatgpt' : 'fixture', model: 'fixture', rememberKey: false };
  let project = newProject({ title: 'Task extraction CLI', description: 'Extract TASK messages and reject blank or unrelated input through a stateless JSON CLI.',
    criteria: ['Extract the complete task text after the TASK prefix.', 'Return null for blank input or messages without the TASK prefix.'] });
  project.dataInputs = options.dataInputs ?? [{ name: 'message.txt', kind: 'text', content: 'TASK: inspect pump' }];
  store.state.projects = [project]; await store.save();
  const sessions = [], backends = [], plans = [], reviews = [];
  let planCalls = 0, reviewCalls = 0;
  const context = session => ({ root, store, project, workspace: project.workspace, session, sessions, planCalls, reviewCalls });
  const create = async sessionOptions => {
    const customTools = sessionOptions.customTools ?? sessionOptions.tools;
    const reviewing = customTools.some(tool => tool.name === 'fleet_submit_planning_review');
    const listeners = new Set();
    const aborted = deferred();
    const session = {
      options: sessionOptions, cwd: sessionOptions.cwd, customTools, stage: reviewing ? 'planning-review' : undefined,
      prompts: [], disposed: false, aborts: 0,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      emit(event) { for (const listener of listeners) listener(event); },
      async prompt(prompt) {
        this.stage ??= prompt.includes('You are the synthetic data agent') ? 'synthetic'
          : prompt.includes('You are the intake agent') ? 'intake'
          : prompt.includes('You are the research agent') ? 'research'
          : prompt.includes('You are the implementation agent') ? 'build' : 'plan';
        this.prompts.push(prompt); this.emit({ type: 'turn_start' });
        if (this.stage === 'plan') planCalls++;
        if (this.stage === 'planning-review') reviewCalls++;
        const handled = await Promise.race([Promise.resolve(options.onPrompt?.({ ...context(this), stage: this.stage, prompt })), aborted.promise]);
        if (this.aborts) throw new Error('Run stopped');
        if (!handled) {
          if (this.stage === 'intake') await fs.writeFile(path.join(this.cwd, 'scope.md'), 'A useful parser extracts task text and rejects blank or non-task messages.');
          else if (this.stage === 'synthetic') {
            await fs.mkdir(path.join(this.cwd, 'data'), { recursive: true });
            await Promise.all(Object.entries(syntheticDataFiles).map(([name, body]) => fs.writeFile(path.join(this.cwd, name), body)));
          }
          else if (this.stage === 'research') await fs.writeFile(path.join(this.cwd, 'research.md'), 'Use a shared pure parser and stateless JSON stdin/stdout invocation; no remote integration is needed.');
          else if (this.stage === 'plan') {
            if (!project.systemDesign) await customTools.find(tool => tool.name === 'fleet_system_design').execute('design', {
              title: 'Task parser', description: 'Shared parser behind a JSON CLI.',
              components: [{ id: 'parser', label: 'Parser', description: 'Extract or reject task messages.', kind: 'logic', files: ['core.cjs'] }], connections: []
            });
            const packet = JSON.parse(await fs.readFile(path.join(this.cwd, '.fleet', 'packet.json'), 'utf8'));
            const weak = options.initialWeak === true && (planCalls <= (options.weakPlanCalls ?? 1) || options.correctOnRevision === false);
            plans.push(await writePlanningArtifacts(this.cwd, packet.acceptance, weak));
            await options.afterPlan?.(context(this));
          } else if (this.stage === 'planning-review') {
            const record = await reviewRecord(this);
            if (record.verdict === 'revise' && options.reviseFindings) record.findings = options.reviseFindings(context(this));
            const result = await customTools.find(tool => tool.name === 'fleet_submit_planning_review').execute('review', record);
            assert.notEqual(result.isError, true, JSON.stringify(result));
            reviews.push(structuredClone(record));
            await options.afterReview?.({ ...context(this), record });
          } else if (this.stage === 'build') throw new Error(buildReached);
          else throw new Error('Unexpected fixture phase: ' + this.stage);
        }
        this.emit({ type: 'message_end', message: options.finalAssistantMessage?.({ ...context(this), stage: this.stage })
          ?? { role: 'assistant', stopReason: 'stop' } });
        this.emit({ type: 'turn_end' });
      },
      async abort() { this.aborts++; aborted.resolve(true); },
      dispose() { this.disposed = true; }
    };
    sessions.push(session); return session;
  };
  const backendOptions = {
    // These fixtures launch no child process. Native process inspection has its own integration checks.
    processSweep: () => new RunProcessSweep({ scan: async () => [] }),
    agentLimits: Object.hasOwn(options, 'agentLimits') ? options.agentLimits : { idleMs: 5000, timeoutMs: 15_000 },
    createSession: async sessionOptions => ({ session: await create(sessionOptions) }),
    createCodexSession: create,
    codex: { home: path.join(root, 'codex'), account: { status: 'connected', planUsageEnabled: true },
      models: [{ id: 'fixture', name: 'Fixture', provider: 'chatgpt', backend: 'codex', configured: true }], async refresh() {}, async credentials() { return { accessToken: 'fixture', expiresAt: Date.now() + 60_000 }; } }
  };
  const makeBackend = () => {
    const value = new FleetBackend(store, process.execPath, () => {}, resourcesRoot, backendOptions);
    value.runtime = { getModel: () => ({ input: ['text'] }), hasConfiguredAuth: () => true };
    backends.push(value); return value;
  };
  let backend = makeBackend();
  const settle = () => backend.active.get(project.id)?.done;
  const checkpointFile = () => path.join(root, 'run-checkpoints', project.runId + '.json');
  t.after(async () => { await Promise.all(backends.map(value => value.stopAll())); await fs.rm(root, { recursive: true, force: true }); });
  return {
    root, sessions, plans, reviews,
    get backend() { return backend; }, get store() { return store; }, get project() { return project; },
    get planCalls() { return planCalls; }, get reviewCalls() { return reviewCalls; },
    checkpointFile, checkpoint: async () => JSON.parse(await fs.readFile(checkpointFile(), 'utf8')),
    settle,
    async run() { await backend.start(project.id); await settle(); },
    async resume() { await backend.resume(project.id); await settle(); },
    async continuePlanning() { await backend.continuePlanning(project.id); await settle(); },
    async restart() {
      await backend.stopAll();
      const restored = new Store(root); await restored.init();
      project = restored.project(project.id); store = restored; backend = makeBackend();
    }
  };
}

async function assertUnfrozen(h) {
  assert.equal(h.project.resumeStage, 'plan');
  assert.equal(h.sessions.some(session => session.stage === 'build'), false);
  const checkpoint = await h.checkpoint();
  assert.equal(checkpoint.quality, undefined);
  assert.equal(checkpoint.foundation, undefined);
  await fs.access(path.join(h.project.workspace, 'evaluation-plan.json'));
  await assert.rejects(fs.access(path.join(h.project.workspace, 'foundation-lock.json')), { code: 'ENOENT' });
  await assert.rejects(fs.access(path.join(h.root, 'evaluations', h.project.runId + '.json')), { code: 'ENOENT' });
  return checkpoint;
}

async function assertReachedBuild(h) {
  assert.equal(h.project.status, 'failed');
  assert.ok(h.project.logs.some(log => /Fixture reached implementation/.test(log.text)), h.project.error);
  assert.equal(h.project.resumeStage, 'build');
  const checkpoint = await h.checkpoint();
  assert.equal(checkpoint.planningReview.phase, 'approved');
  assert.equal(checkpoint.planningReview.review.verdict, 'approved');
  assert.equal(checkpoint.planningReview.review.contractHash, checkpoint.quality.hash);
  assert.match(checkpoint.planningReview.review.inputHash, /^[a-f0-9]{64}$/);
  assert.ok(checkpoint.planningReview.review.reviewerVersion);
  assert.ok(Number.isFinite(Date.parse(checkpoint.planningReview.review.reviewedAt)));
  assert.equal(checkpoint.quality.sealedEvaluation, true);
  assert.ok(checkpoint.foundation);
  await fs.access(path.join(h.project.workspace, 'foundation-lock.json'));
  await assert.rejects(fs.access(path.join(h.project.workspace, 'evaluation-plan.json')), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(h.root, 'evaluations', h.project.runId + '.json'), 'utf8'), checkpoint.quality.evaluationBody);
  return checkpoint;
}

test('a rejected ordinary plan pauses until explicit resume grants one correction and fresh review in the saved workspace', { timeout }, async t => {
  const h = await harness(t, { initialWeak: true, correctOnRevision: false });
  await h.run();
  assert.equal(h.project.status, 'failed');
  const checkpoint = await assertUnfrozen(h);
  const { runId, workspace } = h.project;
  const completedFiles = ['scope.md', 'research.md'];
  const savedFiles = await Promise.all(completedFiles.map(file => fs.readFile(path.join(workspace, file), 'utf8')));
  await fs.writeFile(path.join(workspace, 'saved-planning-note.md'), 'Keep this work for the next correction.');
  assert.equal(h.plans.length, 2, 'Both weak versions are structurally valid.');
  assert.equal(h.planCalls, 2, 'The planner has one semantic correction attempt.');
  assert.equal(h.reviewCalls, 2, 'The correction receives a fresh independent review.');
  assert.equal(checkpoint.planningReview.phase, 'rejected');
  assert.equal(checkpoint.planningReview.revisionUsed, true);
  assert.equal(checkpoint.planningReview.review.verdict, 'revise');
  assert.match(h.project.error, /Continue planning to revise the saved plan/);
  assert.doesNotMatch(h.project.error, /start a new build/i);
  for (const continuation of [1, 2]) {
    const count = h.sessions.length;
    await h.restart();
    assert.equal(h.sessions.length, count, 'Restart alone cannot dispatch another correction.');
    await h.resume();
    assert.equal(h.project.status, 'failed');
    assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
    assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['plan', 'planning-review']);
    assert.equal(h.planCalls, 2 + continuation, 'Each explicit continuation grants exactly one correction.');
    assert.equal(h.reviewCalls, 2 + continuation, 'Every correction receives one new independent review.');
    const rejected = await assertUnfrozen(h);
    assert.equal(rejected.planningReview.phase, 'rejected');
    assert.equal(rejected.planningReview.revisionUsed, true);
    assert.equal(rejected.planningReview.review.verdict, 'revise');
    assert.ok(h.sessions.slice(count)[0].prompts[0].includes(gap), 'The saved independent findings reach the next planner.');
    for (const stage of ['intake', 'research']) {
      assert.equal(h.project.stages.find(item => item.id === stage).status, 'complete');
      assert.equal(h.sessions.filter(session => session.stage === stage).length, 1);
    }
    assert.deepEqual(await Promise.all(completedFiles.map(file => fs.readFile(path.join(workspace, file), 'utf8'))), savedFiles);
    assert.equal(await fs.readFile(path.join(workspace, 'saved-planning-note.md'), 'utf8'), 'Keep this work for the next correction.');
  }
});

test('a resumed correction restores its latest valid plan after invalid output without another correction turn', { timeout }, async t => {
  const h = await harness(t, { initialWeak: true, correctOnRevision: false, afterPlan: async ({ workspace, planCalls }) => {
    if (planCalls === 2) await fs.appendFile(path.join(workspace, 'plan.md'), '\nRetain this second-version planning note.');
    if (planCalls === 3) await fs.writeFile(path.join(workspace, 'acceptance-plan.json'), '{invalid correction');
  } });
  await h.run(); await assertUnfrozen(h);
  const before = await fs.readFile(path.join(h.project.workspace, 'plan.md'), 'utf8');
  const acceptance = await fs.readFile(path.join(h.project.workspace, 'acceptance-plan.json'), 'utf8');
  await h.restart(); await h.resume();
  const interrupted = await assertUnfrozen(h);
  assert.equal(interrupted.planningReview.phase, 'rereview');
  assert.equal(h.planCalls, 3); assert.equal(h.reviewCalls, 2);
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'plan.md'), 'utf8'), before);
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'acceptance-plan.json'), 'utf8'), acceptance);
  await h.restart(); await h.resume();
  const checkpoint = await assertUnfrozen(h);
  assert.equal(h.planCalls, 3); assert.equal(h.reviewCalls, 3, h.project.logs.filter(log => log.kind === 'error').map(log => log.text).join('\n'));
  assert.equal(checkpoint.planningReview.phase, 'rejected');
  assert.ok(checkpoint.planningAudit.correctionDiscarded);
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'plan.md'), 'utf8'), before);
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'acceptance-plan.json'), 'utf8'), acceptance);
  assert.equal(checkpoint.planningSnapshot.files.find(([name]) => name === 'plan.md')[1], before);
});

for (const backend of ['pi', 'codex']) test(`${backend} manual planning continuation preserves findings and waits for fresh approval before freezing`, { timeout }, async t => {
  const entered = deferred(), release = deferred(); let continuing = false, previousReview;
  const options = { backend, initialWeak: true, correctOnRevision: false, onPrompt: async ({ stage, workspace, prompt }) => {
    if (!continuing) return false;
    if (stage === 'plan') {
      const checkpoint = await h.checkpoint();
      assert.equal(checkpoint.planningReview.phase, 'revision');
      assert.equal(checkpoint.planningReview.revisionUsed, true);
      assert.deepEqual(checkpoint.planningReview.review, previousReview, 'Manual continuation retains the last trusted findings.');
      assert.ok(prompt.includes(gap));
      assert.equal(await fs.readFile(path.join(workspace, 'plan.md'), 'utf8'), 'Implement extraction only; defer input rejection.');
    }
    if (stage === 'planning-review') { entered.resolve(); await release.promise; }
    return false;
  } };
  const h = await harness(t, options);
  await h.run();
  const rejected = await assertUnfrozen(h), { runId, workspace } = h.project;
  previousReview = rejected.planningReview.review;
  const count = h.sessions.length;
  continuing = true; options.correctOnRevision = true;
  await h.restart();
  const resumed = h.resume();
  await Promise.race([entered.promise, resumed.then(() => { throw new Error('Expected fresh review before freeze: ' + h.project.error); })]);
  const pending = await assertUnfrozen(h);
  assert.equal(pending.planningReview.phase, 'rereview');
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.equal(h.planCalls, 3); assert.equal(h.reviewCalls, 3);
  assert.equal(h.project.status, 'running');
  release.resolve(); await resumed;
  const approved = await assertReachedBuild(h);
  assert.equal(approved.planningReview.revisionUsed, true);
  assert.deepEqual(h.reviews.map(record => record.verdict), ['revise', 'revise', 'approved']);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['plan', 'planning-review', 'build']);
  assert.notEqual(h.sessions.filter(session => session.stage === 'planning-review').at(-1), h.sessions.filter(session => session.stage === 'planning-review').at(-2));
});

for (const dataMode of ['provided', 'synthetic']) test(`a revised brief continues saved ${dataMode} planning work without repeating completed phases`, { timeout }, async t => {
  const entered = deferred(), release = deferred(); let continuing = false, source;
  const newCriterion = 'Preserve punctuation and spacing in the task payload.';
  const options = { initialWeak: true, correctOnRevision: false, ...(dataMode === 'synthetic' ? { dataInputs: [] } : {}),
    onPrompt: async ({ stage, workspace, prompt }) => {
      if (!continuing) return false;
      if (stage === 'plan') {
        const checkpoint = await h.checkpoint();
        assert.equal(checkpoint.planningReview.phase, 'revision');
        assert.equal(checkpoint.planningReview.revisionUsed, true);
        assert.deepEqual(checkpoint.planningReview.review, source.planningReview.review);
        assert.ok(prompt.includes(gap));
        assert.ok(prompt.includes('Planning continuation'));
        assert.equal(await fs.readFile(path.join(workspace, 'plan.md'), 'utf8'), 'Implement extraction only; defer input rejection.');
        assert.ok((await fs.readFile(path.join(workspace, 'requirements.md'), 'utf8')).includes(newCriterion));
        const packet = JSON.parse(await fs.readFile(path.join(workspace, '.fleet', 'packet.json'), 'utf8'));
        assert.ok(packet.acceptance.some(criterion => criterion.requirement === newCriterion));
        assert.deepEqual(checkpoint.data, source.data);
        for (const file of ['scope.md', 'research.md', ...source.data.files]) {
          assert.deepEqual(await fs.readFile(path.join(workspace, file)), await fs.readFile(path.join(source.workspace, file)));
        }
      }
      if (stage === 'planning-review') { entered.resolve(); await release.promise; }
      return false;
    } };
  const h = await harness(t, options);
  await h.run();
  source = await assertUnfrozen(h);
  const sourceCheckpoint = await fs.readFile(h.checkpointFile(), 'utf8');
  const sourceFiles = ['requirements.md', '.fleet/packet.json', 'plan.md', 'acceptance-plan.json', 'evaluation-plan.json'];
  const originalBodies = await Promise.all(sourceFiles.map(file => fs.readFile(path.join(source.workspace, file))));
  const count = h.sessions.length;
  h.project.criteria.push(newCriterion);
  h.project.status = dataMode === 'provided' ? 'draft' : 'stopped';
  await h.store.save();
  options.correctOnRevision = true; continuing = true;
  const running = h.continuePlanning();
  await Promise.race([entered.promise, running.then(() => { throw new Error('Expected continued planning review: ' + h.project.error); })]);
  const pending = await assertUnfrozen(h);
  assert.notEqual(h.project.runId, source.runId); assert.notEqual(h.project.workspace, source.workspace);
  assert.equal(pending.planningReview.phase, 'rereview');
  assert.equal(pending.data.hash, source.data.hash);
  assert.notEqual(pending.briefHash, source.briefHash);
  assert.notEqual(pending.packetHash, source.packetHash);
  assert.notDeepEqual(pending.acceptance, source.acceptance);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['plan', 'planning-review']);
  for (const stage of ['intake', 'research']) assert.equal(h.project.stages.find(item => item.id === stage).status, 'complete');
  release.resolve(); await running;
  await assertReachedBuild(h);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['plan', 'planning-review', 'build']);
  assert.deepEqual(h.reviews.map(review => review.verdict), ['revise', 'revise', 'approved']);
  assert.deepEqual(await Promise.all(sourceFiles.map(file => fs.readFile(path.join(source.workspace, file)))), originalBodies);
  assert.equal(await fs.readFile(path.join(h.root, 'run-checkpoints', source.runId + '.json'), 'utf8'), sourceCheckpoint);
});

test('revised planning preserves answered clarification history through successive continuations without reopening old questions', { timeout }, async t => {
  const gates = [null, { entered: deferred(), release: deferred() }, { entered: deferred(), release: deferred() }];
  const question = 'Should task payload punctuation and whitespace be preserved?';
  const answer = 'Preserve the entire task payload exactly after the required prefix, including punctuation and whitespace.';
  let asked = false, continuation = 0, broker;
  const options = { initialWeak: true, correctOnRevision: false,
    onPrompt: async ({ stage, session, project }) => {
      if (!asked && stage === 'research') {
        asked = true;
        const request = session.customTools.find(tool => tool.name === 'fleet_request_clarification');
        assert.ok(request, 'The actual clarification broker is available in research.');
        await request.execute('request-payload-rule', { questions: [{ question, context: 'The parser needs an exact payload-preservation rule.', answerType: 'text' }] });
        await broker.answer(project.id, project.conversation.questions.at(-1).id, answer);
        return true;
      }
      if (continuation && stage === 'plan') {
        gates[continuation].entered.resolve(); await gates[continuation].release.promise;
      }
      return false;
    } };
  const h = await harness(t, options);
  broker = new ClarificationBroker(h.store, () => {});
  h.backend.options.clarifications = broker;
  await h.run();
  const source = await assertUnfrozen(h), sourceRunId = h.project.runId;
  const body = source.clarifications, historical = JSON.parse(body);
  assert.equal(historical.runId, sourceRunId);
  assert.equal(historical.questions.length, 1);
  assert.equal(historical.questions[0].status, 'answered');
  assert.equal(historical.questions[0].answer, answer);
  const originalQuestions = structuredClone(h.project.conversation.questions);
  for (continuation = 1; continuation <= 2; continuation++) {
    const count = h.sessions.length;
    h.project.criteria.push(`Retain exact task payload semantics in planning continuation ${continuation}.`);
    h.project.status = 'draft'; await h.store.save();
    options.correctOnRevision = continuation === 2;
    const running = h.continuePlanning();
    await Promise.race([gates[continuation].entered.promise, running.then(() => { throw new Error('Expected saved-history planning session: ' + h.project.error); })]);
    const checkpoint = await assertUnfrozen(h);
    assert.deepEqual(checkpoint.priorClarifications, [body], 'Inherited answered context survives without accumulating duplicate history.');
    assert.equal(checkpoint.clarifications, undefined, 'Historical answers are not represented as answers from the new run.');
    const requirements = await fs.readFile(path.join(h.project.workspace, 'requirements.md'), 'utf8');
    assert.ok(requirements.includes(body.trim()), 'Revised requirements retain the exact historical answered JSON.');
    assert.ok(requirements.includes(answer));
    assert.notEqual(h.project.runId, sourceRunId);
    assert.deepEqual(h.project.conversation.questions, originalQuestions, 'Continuation never reopens or duplicates the old human questions.');
    await assert.rejects(fs.access(path.join(h.project.workspace, 'clarifications.json')), { code: 'ENOENT' });
    assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['plan']);
    gates[continuation].release.resolve(); await running;
    const completed = await h.checkpoint();
    assert.deepEqual(completed.priorClarifications, [body]);
    assert.deepEqual(h.sessions.slice(count).map(session => session.stage), continuation === 1 ? ['plan', 'planning-review'] : ['plan', 'planning-review', 'build']);
    const reviewer = h.sessions.filter(session => session.stage === 'planning-review').at(-1);
    assert.ok(reviewer.reviewedDocuments['requirements.md'].includes(answer), 'Independent reviewers receive the inherited human decision.');
    if (continuation === 1) assert.equal((await assertUnfrozen(h)).planningReview.phase, 'rejected');
    else await assertReachedBuild(h);
  }
  assert.equal(await fs.readFile(path.join(source.workspace, 'clarifications.json'), 'utf8'), body);
});

for (const failure of ['authentication', 'setup']) test(`failed revised-brief ${failure} preserves the previous planning workspace and project`, { timeout }, async t => {
  const h = await harness(t, { initialWeak: true, correctOnRevision: false });
  await h.run();
  const source = await assertUnfrozen(h), count = h.sessions.length;
  const sourceCheckpoint = await fs.readFile(h.checkpointFile(), 'utf8');
  const sourceRequirements = await fs.readFile(path.join(source.workspace, 'requirements.md'), 'utf8');
  h.project.criteria.push('Keep punctuation in the extracted task text.'); h.project.status = 'draft';
  await h.store.save();
  const before = structuredClone(h.project);
  if (failure === 'authentication') h.backend.runtime.hasConfiguredAuth = () => false;
  else {
    const rename = fs.rename.bind(fs);
    t.mock.method(fs, 'rename', async (from, file, ...args) => {
      if (String(file).endsWith('/requirements.md') && file !== path.join(source.workspace, 'requirements.md')) {
        throw new Error('Fixture revised planning setup failed.');
      }
      return rename(from, file, ...args);
    });
  }
  await assert.rejects(h.continuePlanning(), error => {
    assert.match(String(error.cause ?? error), failure === 'authentication' ? /connect it in Model settings/ : /Fixture revised planning setup failed/); return true;
  });
  assert.deepEqual(JSON.parse(JSON.stringify(h.project)), JSON.parse(JSON.stringify(before)), 'The persisted project is restored, including its revised brief.');
  assert.equal(h.backend.active.size, 0);
  assert.equal(h.backend.active.has(h.project.id), false, 'Startup reservations share the active-run registry.');
  assert.equal(h.sessions.length, count);
  assert.equal(await fs.readFile(h.checkpointFile(), 'utf8'), sourceCheckpoint);
  assert.equal(await fs.readFile(path.join(source.workspace, 'requirements.md'), 'utf8'), sourceRequirements);
});

for (const backend of ['pi', 'codex']) test(`${backend} uses fresh isolated reviewers and freezes only the corrected, independently approved plan`, { timeout }, async t => {
  const h = await harness(t, { backend, initialWeak: true });
  await h.run();
  const checkpoint = await assertReachedBuild(h);
  assert.equal(h.planCalls, 2);
  assert.equal(h.reviewCalls, 2);
  assert.equal(checkpoint.planningReview.revisionUsed, true);
  assert.deepEqual(h.reviews.map(record => record.verdict), ['revise', 'approved']);
  assert.notEqual(h.plans[0].hash, h.plans[1].hash);
  assert.equal(checkpoint.quality.hash, h.plans[1].hash);
  const planners = h.sessions.filter(session => session.stage === 'plan');
  assert.ok(planners.flatMap(session => session.prompts).slice(1).some(prompt => prompt.includes(gap)), 'The correction receives the independent finding.');
  const reviewers = h.sessions.filter(session => session.stage === 'planning-review');
  assert.equal(reviewers.length, 2);
  assert.notEqual(reviewers[0], reviewers[1]);
  for (const session of reviewers) {
    assert.deepEqual(session.customTools.map(tool => tool.name).sort(), reviewTools);
    assert.ok(session.cwd !== h.project.workspace && !session.cwd.startsWith(h.project.workspace + path.sep), 'The reviewer runs outside the writable agent workspace.');
    assert.equal(session.prompts.length, 1);
    assert.equal(session.disposed, true);
    if (backend === 'pi') {
      assert.deepEqual([...session.options.tools].sort(), reviewTools);
      assert.deepEqual(session.options.resourceLoader.getSkills().skills, []);
      assert.equal(session.options.sessionManager.getSessionFile(), undefined, 'Review context is in memory, separate from planner history.');
    } else {
      assert.deepEqual(session.options.skillPaths ?? [], []);
      assert.ok(session.options.conversationInstructions, 'Read-only Codex mode must disable native shell, apps and helper tools.');
    }
  }
  assert.ok(h.sessions.every(session => session.disposed));
  assert.equal(JSON.stringify(h.project).includes('"evaluationBody"'), false);
  assert.equal(h.project.planningReview, undefined, 'Trusted planning evidence remains in the host checkpoint.');
});

for (const backend of ['pi', 'codex']) test(`${backend} reviewer receives the exact supplied data and provenance through immutable pages`, { timeout }, async t => {
  const dataInputs = [
    { name: 'messages.txt', kind: 'file', content: 'TASK: ' + 'inspect é🧪\r\n'.repeat(2400) + 'final attached obligation' },
    { name: 'messages.txt', kind: 'text', content: 'TASK: preserve the second source\n' }
  ];
  const h = await harness(t, { backend, dataInputs, afterPlan: async ({ workspace }) => {
    await fs.writeFile(path.join(workspace, 'inputs/unlisted.txt'), 'This file was not attached to the brief.');
  } });
  await h.run();
  const checkpoint = await assertReachedBuild(h);
  const reviewer = h.sessions.find(session => session.stage === 'planning-review');
  const documents = reviewer.reviewedDocuments;
  assert.deepEqual(Object.keys(documents).filter(name => name.startsWith('inputs/')).sort(),
    ['inputs/001-messages.txt', 'inputs/002-messages.txt', 'inputs/manifest.json']);
  assert.deepEqual(checkpoint.data.files.slice().sort(), Object.keys(documents).filter(name => name.startsWith('inputs/')).sort());
  const manifest = JSON.parse(documents['inputs/manifest.json']);
  assert.equal(manifest.mode, 'provided');
  assert.deepEqual(manifest.sources.map(source => ({ name: source.name, kind: source.kind, bytes: source.bytes })),
    dataInputs.map(input => ({ name: input.name, kind: input.kind, bytes: Buffer.byteLength(input.content) })));
  for (const [index, source] of manifest.sources.entries()) assert.equal(documents[source.path], dataInputs[index].content);
  assert.equal(documents['inputs/unlisted.txt'], undefined);
  assert.equal(documents['data/synthetic-data.json'], undefined);
});

test('the ordinary reviewer receives frozen synthetic records, scenarios, limitations and provenance', { timeout }, async t => {
  const h = await harness(t, { dataInputs: [] });
  await h.run();
  const checkpoint = await assertReachedBuild(h);
  assert.equal(h.sessions.filter(session => session.stage === 'synthetic').length, 1);
  const documents = h.sessions.find(session => session.stage === 'planning-review').reviewedDocuments;
  assert.equal(JSON.parse(documents['inputs/manifest.json']).mode, 'synthetic');
  for (const [name, body] of Object.entries(syntheticDataFiles)) assert.equal(documents[name], body);
  assert.deepEqual(checkpoint.data.files.slice().sort(), ['data/README.md', 'data/synthetic-data.json', 'inputs/manifest.json']);
});

test('reading every ordinary planning document without the supplied data cannot authorize implementation', { timeout }, async t => {
  const h = await harness(t, { onPrompt: async ({ stage, session }) => {
    if (stage !== 'planning-review') return false;
    const reader = session.customTools.find(tool => tool.name === 'fleet_read_planning_artifact'), documents = {};
    for (const name of fixturePlanningReviewPaths(reader.parameters)) {
      if (!name.startsWith('inputs/')) documents[name] = await readArtifact(session, name);
    }
    const record = makeReviewRecord(JSON.parse(documents['acceptance-plan.json']), JSON.parse(documents['evaluation-plan.json']));
    await assert.rejects(session.customTools.find(tool => tool.name === 'fleet_submit_planning_review').execute('unread-data-approval', record), /inputs\//);
    return true;
  } });
  await h.run();
  assert.equal(h.project.status, 'failed');
  await assertUnfrozen(h);
  assert.match(h.project.error, /plan review could not finish/);
  assert.ok(h.project.logs.some(log => /did not submit a planning verdict/.test(log.text)));
  assert.equal((await h.checkpoint()).planningReview.phase, 'reviewing');
  assert.equal(h.reviewCalls, 1);
});

for (const forged of [false, true]) test(`${forged ? 'planner-authored approval JSON' : 'a reviewer ending without a verdict'} cannot authorize freezing`, { timeout }, async t => {
  const h = await harness(t, {
    afterPlan: forged ? async ({ workspace }) => {
      const packet = JSON.parse(await fs.readFile(path.join(workspace, '.fleet', 'packet.json'), 'utf8'));
      const contract = await loadQualityContract(workspace, packet.acceptance, true);
      await fs.writeFile(path.join(workspace, 'planning-review.json'), JSON.stringify({ ...makeReviewRecord(contract.plan, contract.evaluation),
        reviewerVersion: 1, inputHash: 'a'.repeat(64), contractHash: contract.hash, reviewedAt: new Date().toISOString() }));
    } : undefined,
    onPrompt: ({ stage }) => stage === 'planning-review'
  });
  await h.run();
  assert.equal(h.project.status, 'failed');
  assert.ok(h.reviewCalls > 0, 'The host must still invoke its independent reviewer.');
  assert.match(h.project.error, /plan review could not finish/i);
  await assertUnfrozen(h);
});

for (const coverage of ['none', 'contracts-only']) test(`a planning approval with ${coverage} document reads cannot freeze or start implementation`, { timeout }, async t => {
  const h = await harness(t, { onPrompt: async ({ stage, session, workspace }) => {
    if (stage !== 'planning-review') return false;
    const documents = {};
    for (const name of ['acceptance-plan.json', 'evaluation-plan.json']) {
      documents[name] = coverage === 'none' ? await fs.readFile(path.join(workspace, name), 'utf8') : await readArtifact(session, name);
    }
    const record = makeReviewRecord(JSON.parse(documents['acceptance-plan.json']), JSON.parse(documents['evaluation-plan.json']));
    assert.equal(record.verdict, 'approved');
    await assert.rejects(session.customTools.find(tool => tool.name === 'fleet_submit_planning_review').execute('unread-approval', record), /Read every planning document completely before approval/);
    return true;
  } });
  await h.run();
  assert.equal(h.project.status, 'failed');
  await assertUnfrozen(h);
  assert.match(h.project.error, /plan review could not finish/);
  assert.ok(h.project.logs.some(log => /did not submit a planning verdict/.test(log.text)));
  assert.equal(h.planCalls, 1);
  assert.equal(h.reviewCalls, 1);
  assert.equal((await h.checkpoint()).planningReview.phase, 'reviewing');
});

test('a complete workflow reviewer pages through optional clarifications before approval', { timeout }, async t => {
  const h = await harness(t, { afterPlan: async ({ workspace }) => {
    await fs.writeFile(path.join(workspace, 'clarifications.json'), JSON.stringify({ answer: 'A'.repeat(24_000) + 'Keep invalid-input rejection in scope.' }));
  } });
  await h.run();
  await assertReachedBuild(h);
  const reviewer = h.sessions.find(session => session.stage === 'planning-review');
  const reader = reviewer.customTools.find(tool => tool.name === 'fleet_read_planning_artifact');
  assert.ok(fixturePlanningReviewPaths(reader.parameters).includes('clarifications.json'));
});

test('changing a planning artifact after the review submission invalidates approval before freeze', { timeout }, async t => {
  const h = await harness(t, { afterReview: async ({ workspace }) => {
    await fs.appendFile(path.join(workspace, 'plan.md'), '\nIgnore invalid input after all.');
  } });
  await h.run();
  assert.equal(h.reviews[0].verdict, 'approved');
  assert.equal(h.project.status, 'failed');
  assert.match(h.project.error, /changed|snapshot|review|integrity/i);
  await assertUnfrozen(h);
});

test('an independent review can finish after four quiet minutes using the ordinary worker limits', { timeout }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const entered = deferred(), continueReview = deferred();
  const h = await harness(t, { agentLimits: undefined, onPrompt: async ({ stage }) => {
    if (stage === 'planning-review') { entered.resolve(); await continueReview.promise; }
    return false;
  } });
  const running = h.run(); await entered.promise;
  const reviewer = h.sessions.at(-1);
  // Both the former 60-second idle limit and 3-minute absolute limit are too short
  // for an otherwise healthy reviewer waiting on a model response.
  t.mock.timers.tick(4 * 60_000); await setImmediate();
  assert.equal(reviewer.aborts, 0);
  assert.equal(reviewer.disposed, false);
  assert.equal(h.project.status, 'running');
  continueReview.resolve(); await running;
  await assertReachedBuild(h);
  assert.equal(h.planCalls, 1); assert.equal(h.reviewCalls, 1);
});

test('the worker idle limit stops only the reviewer and Resume planning reuses its saved plan', { timeout }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const entered = deferred(); let pause = true;
  const h = await harness(t, { agentLimits: undefined, onPrompt: ({ stage }) => {
    if (pause && stage === 'planning-review') { entered.resolve(); return never(); }
    return false;
  } });
  const running = h.run(); await entered.promise;
  const reviewer = h.sessions.at(-1), { runId, workspace } = h.project;
  const files = ['plan.md', 'test-matrix.md', 'acceptance-plan.json', 'solution-contract.json', 'evaluation-plan.json'];
  const saved = await Promise.all(files.map(file => fs.readFile(path.join(workspace, file), 'utf8')));
  t.mock.timers.tick(defaultAgentLimits.idleMs - 1); await setImmediate();
  assert.equal(reviewer.aborts, 0); assert.equal(reviewer.disposed, false);
  t.mock.timers.tick(1); await running;
  assert.equal(h.project.status, 'failed');
  assert.ok(h.project.logs.some(log => log.text.includes('Independent planning review made no progress for ' + defaultAgentLimits.idleMs / 1000 + ' seconds')));
  assert.match(h.project.error, /Planning files are saved\. Resume planning/);
  assert.doesNotMatch(h.project.error, /start a new run/i);
  const interrupted = await assertUnfrozen(h);
  assert.equal(interrupted.planningReview.phase, 'reviewing');
  assert.equal(interrupted.planningReview.revisionUsed, false);
  assert.equal(reviewer.aborts, 1); assert.equal(reviewer.disposed, true);
  assert.deepEqual(await Promise.all(files.map(file => fs.readFile(path.join(workspace, file), 'utf8'))), saved);
  for (const stage of ['intake', 'research']) assert.equal(h.project.stages.find(item => item.id === stage).status, 'complete');
  pause = false; await h.restart(); await h.resume();
  await assertReachedBuild(h);
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.equal(h.planCalls, 1); assert.equal(h.reviewCalls, 2);
  assert.notEqual(h.sessions.filter(session => session.stage === 'planning-review').at(-1), reviewer);
});

test('review activity is visible without publishing reviewer prose, tool payloads or provider errors', { timeout }, async t => {
  const secret = 'SEALED_REVIEW_CONTENT_MUST_NOT_REACH_PUBLIC_ACTIVITY';
  let progress = [];
  const h = await harness(t, { onPrompt: async ({ stage, session, project }) => {
    if (stage !== 'planning-review') return false;
    const before = project.logs.length;
    for (const type of ['text_delta', 'thinking_delta', 'toolcall_delta']) {
      session.emit({ type: 'message_update', assistantMessageEvent: { type, delta: secret } });
    }
    session.emit({ type: 'tool_execution_start', toolCallId: 'read', toolName: 'fleet_read_planning_artifact', args: { path: secret, offset: 0 } });
    session.emit({ type: 'tool_execution_end', toolCallId: 'read', toolName: 'fleet_read_planning_artifact',
      result: { content: [{ type: 'text', text: secret }] }, isError: false });
    session.emit({ type: 'tool_execution_start', toolCallId: 'unknown', toolName: secret, args: { private: secret } });
    session.emit({ type: 'tool_execution_end', toolCallId: 'unknown', toolName: secret, result: secret, isError: true });
    session.emit({ type: 'auto_retry_start', attempt: 1, maxAttempts: 2, errorMessage: secret });
    session.emit({ type: 'auto_retry_end', success: true, errorMessage: secret });
    const record = await reviewRecord(session);
    record.minimumUsefulOutcome += ' ' + secret;
    session.emit({ type: 'tool_execution_start', toolCallId: 'verdict', toolName: 'fleet_submit_planning_review', args: record });
    const result = await session.customTools.find(tool => tool.name === 'fleet_submit_planning_review').execute('verdict', record);
    session.emit({ type: 'tool_execution_end', toolCallId: 'verdict', toolName: 'fleet_submit_planning_review', result, isError: false });
    progress = project.logs.slice(before);
    return true;
  } });
  await h.run();
  const checkpoint = await assertReachedBuild(h);
  assert.ok(checkpoint.planningReview.review.minimumUsefulOutcome.includes(secret), 'Private checkpoint retains the complete reviewer verdict.');
  assert.ok(progress.some(log => log.kind === 'info' && /receiving a model response/i.test(log.text)));
  assert.ok(progress.some(log => log.kind === 'info' && /completed 1 input read/i.test(log.text)));
  assert.ok(progress.some(log => log.kind === 'info' && /provider is retrying/i.test(log.text)));
  assert.ok(progress.some(log => log.kind === 'info' && /submitted its verdict/i.test(log.text)));
  assert.equal(JSON.stringify(h.project).includes(secret), false, 'Public project activity must never include private reviewer content.');
});

for (const failure of ['prompt rejection', 'terminal assistant error', 'unknown tool timeout']) {
  test(`a reviewer ${failure} preserves private content and offers recovery`, { timeout }, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const secret = 'SEALED_REVIEW_FAILURE_MUST_NOT_REACH_PUBLIC_STATE', entered = deferred();
    const h = await harness(t, {
      agentLimits: { idleMs: 100, timeoutMs: 1000 },
      onPrompt: ({ stage, session }) => {
        if (stage !== 'planning-review') return false;
        entered.resolve();
        if (failure === 'prompt rejection') throw new Error(secret);
        if (failure === 'unknown tool timeout') {
          session.emit({ type: 'tool_execution_start', toolCallId: 'private-tool', toolName: secret, args: { private: secret } });
          return never();
        }
        return false;
      },
      finalAssistantMessage: ({ stage }) => stage === 'planning-review' && failure === 'terminal assistant error'
        ? { role: 'assistant', stopReason: 'error', errorMessage: secret, content: [{ type: 'text', text: secret }] }
        : undefined
    });
    const running = h.run(); await entered.promise;
    if (failure === 'unknown tool timeout') t.mock.timers.tick(100);
    await running;
    assert.equal(h.project.status, 'failed');
    assert.match(h.project.error, /Resume planning/);
    assert.doesNotMatch(h.project.error, /start a new run/i);
    assert.equal(JSON.stringify(h.project).includes(secret), false, 'Reviewer failure details must remain out of public errors and activity.');
    const checkpoint = await assertUnfrozen(h);
    assert.equal(checkpoint.planningReview.phase, 'reviewing');
    assert.equal(checkpoint.planningReview.revisionUsed, false);
    assert.equal(h.planCalls, 1); assert.equal(h.reviewCalls, 1);
    assert.equal(h.sessions.at(-1).disposed, true);
  });
}

test('an interrupted first review resumes in a fresh reviewer without replaying the planner', { timeout }, async t => {
  const entered = deferred(); let pause = true;
  const h = await harness(t, { onPrompt: ({ stage }) => {
    if (pause && stage === 'planning-review') { entered.resolve(); return never(); }
    return false;
  } });
  await h.backend.start(h.project.id); await entered.promise;
  const oldReviewer = h.sessions.at(-1), { runId, workspace } = h.project;
  await h.backend.stop(h.project.id);
  assert.equal(h.project.status, 'stopped');
  const stopped = await assertUnfrozen(h);
  assert.equal(stopped.planningReview.phase, 'reviewing');
  assert.equal(stopped.planningReview.revisionUsed, false);
  assert.equal(oldReviewer.aborts, 1); assert.equal(oldReviewer.disposed, true);
  pause = false; await h.restart(); await h.resume();
  await assertReachedBuild(h);
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.equal(h.planCalls, 1);
  assert.equal(h.reviewCalls, 2);
  assert.notEqual(h.sessions.filter(session => session.stage === 'planning-review').at(-1), oldReviewer);
});

for (const manuallyContinued of [false, true]) for (const interrupted of ['revision', 'rereview']) test(`restart during ${manuallyContinued ? 'manually continued' : 'initial'} ${interrupted} preserves the single planning correction allowance`, { timeout }, async t => {
  const entered = deferred(); let pause = !manuallyContinued;
  const correctionCall = manuallyContinued ? 3 : 2;
  const h = await harness(t, { initialWeak: true, correctOnRevision: false, onPrompt: ({ stage, planCalls, reviewCalls }) => {
    if (pause && (interrupted === 'revision' ? stage === 'plan' && planCalls === correctionCall : stage === 'planning-review' && reviewCalls === correctionCall)) {
      entered.resolve(); return never();
    }
    return false;
  } });
  if (manuallyContinued) {
    await h.run();
    assert.equal((await h.checkpoint()).planningReview.phase, 'rejected');
    pause = true;
    await h.backend.resume(h.project.id);
  } else await h.backend.start(h.project.id);
  await entered.promise; await h.backend.stop(h.project.id);
  assert.equal(h.project.status, 'stopped');
  const stopped = await assertUnfrozen(h);
  assert.equal(stopped.planningReview.phase, interrupted);
  assert.equal(stopped.planningReview.revisionUsed, true);
  assert.equal(stopped.planningReview.review.verdict, 'revise');
  pause = false; await h.restart(); await h.resume();
  assert.equal(h.project.status, 'failed');
  const rejected = await assertUnfrozen(h);
  assert.equal(rejected.planningReview.phase, 'rejected');
  assert.equal(rejected.planningReview.revisionUsed, true);
  assert.equal(h.planCalls, correctionCall + (interrupted === 'revision' ? 1 : 0), 'Only an interrupted correction may be resumed; rereview never replays it.');
  assert.equal(h.reviews.length, correctionCall, 'Resuming an interrupted correction cannot grant another completed attempt.');
});

for (const stage of ['plan', 'build']) test(`resuming an already frozen ${stage} checkpoint preserves its approval and contracts without another correction`, { timeout }, async t => {
  const h = await harness(t);
  await h.run();
  const frozen = await assertReachedBuild(h), count = h.sessions.length;
  const { runId, workspace } = h.project;
  if (stage === 'plan') {
    frozen.stage = 'plan';
    await fs.writeFile(h.checkpointFile(), JSON.stringify(frozen));
  }
  await h.restart(); await h.resume();
  const resumed = await assertReachedBuild(h);
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['build']);
  assert.deepEqual(resumed.planningReview, frozen.planningReview);
  assert.deepEqual(resumed.quality, frozen.quality);
  assert.deepEqual(resumed.foundation, frozen.foundation);
});

test('scoped recovery does not grant the ordinary manual planning correction allowance', { timeout }, async t => {
  const h = await harness(t, { initialWeak: true, correctOnRevision: false });
  await h.run();
  const rejected = await assertUnfrozen(h), count = h.sessions.length;
  // Exercise the shared resume path with a pinned scoped checkpoint. Its scoped
  // planner owns the revision allowance; ordinary recovery must not reopen it.
  rejected.modelConfig = { backend: 'pi', provider: 'fixture', model: 'fixture' };
  rejected.executionBudget = createExecutionBudget();
  await fs.writeFile(h.checkpointFile(), JSON.stringify(rejected));
  await h.restart();
  let observed;
  h.backend.options.scoped = { async plan() {
    observed = structuredClone(h.backend.active.get(h.project.id).planningReview);
    throw new Error('Fixture scoped planning remains paused.');
  } };
  await h.resume();
  assert.deepEqual(observed, rejected.planningReview);
  assert.deepEqual((await h.checkpoint()).planningReview, rejected.planningReview);
  assert.equal(h.sessions.length, count, 'Scoped recovery cannot dispatch an ordinary planning correction.');
  assert.ok(h.project.logs.some(log => /Fixture scoped planning remains paused/.test(log.text)), h.project.error);
  await assertUnfrozen(h);
});

for (const retained of ['foundationPlan', 'coreReportHash']) test(`rejected planning with retained ${retained} cannot reopen mutable planning`, { timeout }, async t => {
  const h = await harness(t, { initialWeak: true, correctOnRevision: false });
  await h.run();
  const saved = await assertUnfrozen(h), count = h.sessions.length;
  const plan = await fs.readFile(path.join(h.project.workspace, 'plan.md'), 'utf8');
  saved[retained] = retained === 'foundationPlan'
    ? await fs.readFile(path.join(h.project.workspace, 'foundation-plan.json'), 'utf8')
    : await retainCoreReport(h.root, h.project.workspace, JSON.stringify({ passed: true, summary: 'Retained host evaluation evidence.' }));
  await fs.writeFile(h.checkpointFile(), JSON.stringify(saved));
  await h.restart(); await h.resume();
  const resumed = await h.checkpoint();
  assert.equal(h.sessions.length, count, 'Existing frozen evidence must not grant a mutable planning correction.');
  assert.deepEqual(resumed.planningReview, saved.planningReview);
  assert.equal(resumed[retained], saved[retained]);
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'plan.md'), 'utf8'), plan);
  await assertUnfrozen(h);
});

test('a valid-looking changed prepared-data approval hash cannot resume a frozen ordinary build', { timeout }, async t => {
  const h = await harness(t);
  await h.run();
  const checkpoint = await assertReachedBuild(h), count = h.sessions.length;
  assert.equal(checkpoint.planningReview.review.preparedDataHash, checkpoint.data.hash);
  checkpoint.planningReview.review.preparedDataHash = (checkpoint.data.hash[0] === '0' ? '1' : '0') + checkpoint.data.hash.slice(1);
  assert.match(checkpoint.planningReview.review.preparedDataHash, /^[a-f0-9]{64}$/);
  const changed = JSON.stringify(checkpoint);
  await fs.writeFile(h.checkpointFile(), changed);
  await h.restart();
  await assert.rejects(h.resume(), error => { assert.match(String(error.cause ?? error), /independent planning review checkpoint/); return true; });
  assert.equal(h.sessions.length, count, 'A mismatched approval cannot allocate another model session.');
  assert.equal(await fs.readFile(h.checkpointFile(), 'utf8'), changed, 'Invalid recovery evidence remains preserved.');
});

test('an already frozen legacy checkpoint resumes implementation without retroactive planning review', { timeout }, async t => {
  const h = await harness(t);
  await h.run();
  const checkpoint = await assertReachedBuild(h);
  const count = h.sessions.length, { runId, workspace } = h.project;
  delete checkpoint.planningReview;
  await fs.writeFile(h.checkpointFile(), JSON.stringify(checkpoint));
  await h.restart(); await h.resume();
  assert.equal(h.project.status, 'failed');
  assert.ok(h.project.logs.some(log => /Fixture reached implementation/.test(log.text)), h.project.error);
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['build']);
  assert.equal((await h.checkpoint()).quality.hash, checkpoint.quality.hash);
});

for (const backend of ['pi', 'codex']) test(`${backend} continues planning with explicit authorization and reviews each correction before approval`, { timeout }, async t => {
  const entered = deferred(), release = deferred();
  const h = await harness(t, { backend, initialWeak: true, weakPlanCalls: 3,
    reviseFindings: ({ reviewCalls }) => [`${gap} Independent review ${reviewCalls}.`],
    onPrompt: async ({ stage, planCalls, reviewCalls, prompt, project }) => {
      if (!['plan', 'planning-review'].includes(stage)) return false;
      assert.equal(project.status, 'running', 'Review findings must keep planning running.');
      assert.equal(project.stages.find(item => item.id === 'plan').status, 'active');
      if (stage === 'plan' && planCalls > 1) {
        const checkpoint = await assertUnfrozen(h);
        assert.equal(checkpoint.planningReview.phase, 'revision', 'Persist each revision before invoking the planner.');
        assert.equal(checkpoint.planningReview.revisionUsed, true);
        assert.deepEqual(checkpoint.planningReview.review.findings, [`${gap} Independent review ${reviewCalls}.`]);
        assert.ok(prompt.includes(`${gap} Independent review ${reviewCalls}.`), 'Each correction receives the newest findings.');
      }
      if (stage === 'planning-review') {
        const checkpoint = await assertUnfrozen(h);
        assert.equal(checkpoint.planningReview.phase, reviewCalls === 1 ? 'reviewing' : 'rereview');
        if (reviewCalls === 4) { entered.resolve(); await release.promise; }
      }
      return false;
    }
  });
  await h.run();
  assert.equal(h.planCalls, 2); assert.equal(h.reviewCalls, 2);
  assert.equal(h.project.status, 'failed');
  await h.resume();
  assert.equal(h.planCalls, 3); assert.equal(h.reviewCalls, 3);
  assert.equal(h.project.status, 'failed');
  const running = h.resume();
  await Promise.race([entered.promise, running.then(() => { throw new Error('Expected fourth independent review: ' + h.project.error); })]);
  const pending = await assertUnfrozen(h);
  assert.equal(pending.planningReview.phase, 'rereview');
  assert.equal(h.project.status, 'running');
  assert.equal(h.planCalls, 4); assert.equal(h.reviewCalls, 4);
  assert.deepEqual(h.reviews.map(record => record.verdict), ['revise', 'revise', 'revise']);
  release.resolve(); await running;
  const approved = await assertReachedBuild(h);
  assert.equal(approved.planningReview.revisionUsed, true);
  assert.deepEqual(h.reviews.map(record => record.verdict), ['revise', 'revise', 'revise', 'approved']);
  assert.equal(approved.quality.hash, h.plans[3].hash);
  for (const stage of ['intake', 'research']) assert.equal(h.sessions.filter(session => session.stage === stage).length, 1);
  const reviewers = h.sessions.filter(session => session.stage === 'planning-review');
  assert.equal(new Set(reviewers).size, 4, 'Every revision gets a fresh independent reviewer.');
  assert.ok(reviewers.every(session => session.disposed));
});

for (const backend of ['pi', 'codex']) test(`${backend} resumes legacy rejected planning with saved findings and fresh approval before freezing`, { timeout }, async t => {
  const entered = deferred(), release = deferred(); let continuing = false, previousReview;
  const options = { backend, initialWeak: true, correctOnRevision: false,
    onPrompt: async ({ stage, workspace, prompt }) => {
      if (!continuing) return false;
      if (stage === 'plan') {
        const checkpoint = await h.checkpoint();
        assert.equal(checkpoint.planningReview.phase, 'revision');
        assert.equal(checkpoint.planningReview.revisionUsed, true);
        assert.deepEqual(checkpoint.planningReview.review, previousReview, 'Legacy continuation retains the last trusted findings.');
        assert.ok(prompt.includes(gap));
        assert.equal(await fs.readFile(path.join(workspace, 'plan.md'), 'utf8'), 'Implement extraction only; defer input rejection.');
      }
      if (stage === 'planning-review') { entered.resolve(); await release.promise; }
      return false;
    }
  };
  const h = await harness(t, options);
  await h.run();
  assert.match(h.project.error, /Independent planning review still requires changes/);
  const rejected = await assertUnfrozen(h), { runId, workspace } = h.project;
  rejected.planningReview.phase = 'rejected';
  await fs.writeFile(h.checkpointFile(), JSON.stringify(rejected));
  previousReview = rejected.planningReview.review;
  const completedFiles = ['scope.md', 'research.md'];
  const savedFiles = await Promise.all(completedFiles.map(file => fs.readFile(path.join(workspace, file), 'utf8')));
  await fs.writeFile(path.join(workspace, 'saved-planning-note.md'), 'Keep this work for the next correction.');
  const count = h.sessions.length;
  continuing = true; options.correctOnRevision = true; options.failPlannerAfterReviews = undefined;
  await h.restart();
  assert.equal(h.sessions.length, count, 'Restart alone cannot dispatch planning work.');
  const resumed = h.resume();
  await Promise.race([entered.promise, resumed.then(() => { throw new Error('Expected fresh review before freeze: ' + h.project.error); })]);
  const pending = await assertUnfrozen(h);
  assert.equal(pending.planningReview.phase, 'rereview');
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.equal(h.planCalls, 3); assert.equal(h.reviewCalls, 3);
  assert.equal(h.project.status, 'running');
  release.resolve(); await resumed;
  const approved = await assertReachedBuild(h);
  assert.equal(approved.planningReview.revisionUsed, true);
  assert.deepEqual(h.reviews.map(record => record.verdict), ['revise', 'revise', 'approved']);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), ['plan', 'planning-review', 'build']);
  for (const stage of ['intake', 'research']) assert.equal(h.sessions.filter(session => session.stage === stage).length, 1);
  assert.deepEqual(await Promise.all(completedFiles.map(file => fs.readFile(path.join(workspace, file), 'utf8'))), savedFiles);
  assert.equal(await fs.readFile(path.join(workspace, 'saved-planning-note.md'), 'utf8'), 'Keep this work for the next correction.');
  assert.notEqual(h.sessions.filter(session => session.stage === 'planning-review').at(-1), h.sessions.filter(session => session.stage === 'planning-review').at(-2));
});

for (const backend of ['pi', 'codex']) for (const interrupted of ['revision', 'rereview']) test(`${backend} restart during a later ${interrupted} resumes explicitly continued planning without replaying completed work`, { timeout }, async t => {
  const entered = deferred(); let pause = true;
  const h = await harness(t, { backend, initialWeak: true, weakPlanCalls: 2,
    onPrompt: ({ stage, planCalls, reviewCalls }) => {
      if (pause && (interrupted === 'revision' ? stage === 'plan' && planCalls === 3 : stage === 'planning-review' && reviewCalls === 3)) {
        entered.resolve(); return never();
      }
      return false;
    }
  });
  await h.run();
  assert.equal(h.planCalls, 2); assert.equal(h.reviewCalls, 2);
  await h.backend.resume(h.project.id); await entered.promise;
  const { runId, workspace } = h.project;
  const oldSession = h.sessions.at(-1);
  await h.backend.stop(h.project.id);
  assert.equal(h.project.status, 'stopped');
  const stopped = await assertUnfrozen(h);
  assert.equal(stopped.planningReview.phase, interrupted);
  assert.equal(stopped.planningReview.revisionUsed, true);
  assert.equal(stopped.planningReview.review.verdict, 'revise');
  assert.equal(oldSession.aborts, 1); assert.equal(oldSession.disposed, true);
  const count = h.sessions.length;
  await setImmediate();
  assert.equal(h.sessions.length, count, 'Cancellation must not dispatch another planning cycle.');
  pause = false; await h.restart();
  assert.equal(h.sessions.length, count, 'Restart preserves the interrupted state until resume.');
  await h.resume();
  const approved = await assertReachedBuild(h);
  assert.equal(approved.planningReview.revisionUsed, true);
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.equal(h.planCalls, interrupted === 'revision' ? 4 : 3, 'Only an interrupted planner is replayed; rereview reuses completed planning work.');
  assert.equal(h.reviewCalls, interrupted === 'revision' ? 3 : 4);
  assert.deepEqual(h.reviews.map(record => record.verdict), ['revise', 'revise', 'approved']);
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), interrupted === 'revision'
    ? ['plan', 'planning-review', 'build'] : ['planning-review', 'build']);
  for (const stage of ['intake', 'research']) assert.equal(h.sessions.filter(session => session.stage === stage).length, 1);
});

test('scoped recovery preserves its own legacy rejected planning state', { timeout }, async t => {
  const h = await harness(t, { initialWeak: true, correctOnRevision: false });
  await h.run();
  const rejected = await assertUnfrozen(h), count = h.sessions.length;
  rejected.planningReview.phase = 'rejected';
  // Exercise the shared resume path with a pinned scoped checkpoint. Its scoped
  // planner owns that review state; ordinary recovery must not reopen it.
  rejected.modelConfig = { backend: 'pi', provider: 'fixture', model: 'fixture' };
  rejected.executionBudget = createExecutionBudget();
  await fs.writeFile(h.checkpointFile(), JSON.stringify(rejected));
  await h.restart();
  let observed;
  h.backend.options.scoped = { async plan() {
    observed = structuredClone(h.backend.active.get(h.project.id).planningReview);
    throw new Error('Fixture scoped planning remains paused.');
  } };
  await h.resume();
  assert.deepEqual(observed, rejected.planningReview);
  assert.deepEqual((await h.checkpoint()).planningReview, rejected.planningReview);
  assert.equal(h.sessions.length, count, 'Scoped recovery cannot dispatch an ordinary planning correction.');
  assert.ok(h.project.logs.some(log => /Fixture scoped planning remains paused/.test(log.text)), h.project.error);
  await assertUnfrozen(h);
});
