import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { plainError } from '../dist-electron/electron/plain-errors.js';
import { newProject } from '../dist-electron/electron/storage.js';
import { ExperimentWorkers } from '../dist-electron/electron/experiment-workers.js';
import { experimentContractHash } from '../dist-electron/harness/experiment-contract.js';
import { createSharedPlanningReviewSnapshot } from '../dist-electron/electron/planning-review.js';
import { fixturePlanningReviewPaths } from '../scripts/planning-review-fixture.mjs';

const timeout = 30_000;
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const never = () => new Promise(() => {});
const write = async (cwd, file, value) => fs.writeFile(path.join(cwd, file), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
function contracts(acceptance, weak) {
  return {
    behavior: { schemaVersion: 1, objective: 'Compute the total of supplied numbers.', surface: 'cli',
      delivery: { profiles: ['node-cli', 'python-cli'], network: 'offline', operationIds: [] },
      invocation: { input: 'Object with values: finite number[].', output: 'Exactly {total:number}.', rules: ['Sum every supplied value; an empty array returns zero.'] },
      capabilities: [{ id: 'total', kind: 'algorithm', description: 'Sum supplied values.', criterionIds: acceptance.map(value => value.id), required: true, evaluationIds: ['sum-cases'] }],
      criteria: acceptance.map(value => ({ criterionId: value.id, disposition: 'implemented', expectedOutcome: 'The independently calculated sum is returned.', capabilityIds: ['total'], scenarioIds: [] })),
      ux: { audience: 'An operator', primaryTask: 'Sum numbers', successOutcome: 'A correct total', states: { empty: 'Explain input', loading: 'Show progress', error: 'Explain validation', success: 'Show total' }, persistence: 'No persistence required.', recovery: 'Correct invalid input and retry.', keyboard: 'All controls usable by keyboard.' }, scenarios: [] },
    evaluation: { schemaVersion: 1, evaluations: [{ id: 'sum-cases', capabilityId: 'total', description: 'Independent reference sums.',
      dataset: { name: 'sums', version: '1', provenance: 'synthetic' }, evaluator: 'numeric', tolerance: 0, threshold: 1, trials: 1,
      cases: weak ? [{ id: 'first', input: { values: [2, 3] }, expected: { total: 5 } }, { id: 'second', input: { values: [1, 4] }, expected: { total: 5 } }]
        : [{ id: 'ordinary', input: { values: [23, 31] }, expected: { total: 54 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }] }] }
  };
}
async function readReviewDocument(tools, name) {
  const read = tools.find(tool => tool.name === 'fleet_read_planning_artifact');
  let offset = 0, body = '';
  for (;;) {
    const result = await read.execute('read', { path: name, offset });
    const page = JSON.parse(result.content.filter(item => item.type === 'text').map(item => item.text).join('\n'));
    body += page.text;
    if (page.nextOffset === null) return body;
    offset = page.nextOffset;
  }
}
function verdict(behavior, evaluation, weak) {
  return { verdict: weak ? 'revise' : 'approved', minimumUsefulOutcome: 'Return the actual sum for arbitrary valid numeric arrays, including empty arrays.',
    scope: behavior.criteria.map(item => ({ criterionId: item.criterionId, assessment: 'covered', reason: item.expectedOutcome })),
    evaluations: evaluation.evaluations.map(item => ({ evaluationId: item.id, assessment: weak ? 'gap' : 'adequate',
      reason: weak ? 'A constant total of 5 passes both examples. Add an empty array, whose public result is zero.' : 'Distinct ordinary and empty-array totals reject a constant-output shortcut.' })),
    recovery: { assessment: 'not-applicable', reason: 'The shared product surface is command line.' },
    findings: weak ? ['A constant total of 5 passes both examples. Add an empty array expecting total 0 before freezing the shared plan.'] : [] };
}
async function harness(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-shared-review-')), sessions = [], projections = new Map();
  const source = newProject({ title: 'Sum supplied numbers', description: 'Build a local command-line tool that sums finite numbers.', criteria: ['Compute the total of every supplied value.'] });
  source.dataInputs = options.dataInputs ?? [{ name: 'sample.json', kind: 'text', content: '{"values":[1,2]}' }];
  const experiment = { id: 'experiment-review-fixture', projectId: source.id, lineageId: 'fixture', partition: 'development', cohortKey: 'pending', mode: 'paired', status: 'planning', baselineProfileId: 'node-cli', candidateIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const initial = { ...structuredClone(source), id: 'shared-review-fixture' };
  const backend = options.backend ?? 'pi', provider = backend === 'codex' ? 'chatgpt' : 'fixture';
  let planCalls = 0, reviewCalls = 0, worker;
  const createSession = async sessionOptions => {
    const { cwd } = sessionOptions, customTools = sessionOptions.customTools ?? sessionOptions.tools;
    const reviewing = customTools.some(tool => tool.name === 'fleet_submit_planning_review'), listeners = new Set();
    const aborted = deferred();
    const session = { options: sessionOptions, cwd, customTools, stage: reviewing ? 'review' : undefined, disposed: false, aborts: 0,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      async prompt(prompt) {
        this.stage ??= prompt.includes('You are the intake agent') ? 'intake' : prompt.includes('You are the research agent') ? 'research' : 'plan';
        if (this.stage === 'plan') planCalls++;
        if (this.stage === 'review') reviewCalls++;
        for (const listener of listeners) listener({ type: 'turn_start' });
        const handled = await Promise.race([Promise.resolve(options.onPrompt?.({ stage: this.stage, session: this, planCalls, reviewCalls, prompt })), aborted.promise]);
        if (this.aborts) throw new Error('Run stopped');
        if (handled) return;
        if (this.stage === 'intake') await write(cwd, 'scope.md', 'Return the sum of all supplied numbers.');
        else if (this.stage === 'research') await write(cwd, 'research.md', 'A reduction over a numeric array is sufficient.');
        else if (this.stage === 'plan') {
          const packet = JSON.parse(await fs.readFile(path.join(cwd, '.fleet/packet.json'), 'utf8'));
          const weak = options.initialWeak && (planCalls < (options.correctOnPlan ?? 2) || options.correctOnRevision === false);
          const { behavior, evaluation } = contracts(packet.acceptance, weak);
          await write(cwd, 'behavior-contract.json', behavior); await write(cwd, 'evaluation-plan.json', evaluation);
        } else if (this.stage === 'review' && !options.omitVerdict) {
          const reader = customTools.find(tool => tool.name === 'fleet_read_planning_artifact'), documents = {};
          for (const name of fixturePlanningReviewPaths(reader.parameters)) documents[name] = await readReviewDocument(customTools, name);
          this.reviewedDocuments = documents;
          const behavior = JSON.parse(documents['behavior-contract.json']), evaluation = JSON.parse(documents['evaluation-plan.json']);
          const weak = evaluation.evaluations[0].cases.every(item => item.expected.total === 5);
          const record = verdict(behavior, evaluation, weak); options.transformVerdict?.(record);
          await customTools.find(tool => tool.name === 'fleet_submit_planning_review').execute('verdict', record);
          await options.afterVerdict?.({ behavior, evaluation, session: this, workspace: projections.get(initial.id)?.workspace });
        }
        for (const listener of listeners) { listener({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } }); listener({ type: 'turn_end' }); }
      }, async abort() { this.aborts++; aborted.resolve(true); }, dispose() { this.disposed = true; listeners.clear(); } };
    sessions.push(session); return { session };
  };
  const workers = new ExperimentWorkers({ root, executable: process.execPath, resourcesRoot: path.resolve('.'),
    runtime: { getModel: () => ({ input: ['text', 'image'] }), hasConfiguredAuth: () => true }, operations: () => [],
    integrations: () => { throw new Error('Shared planning cannot use candidate runtime integrations.'); }, createSession,
    createCodexSession: async options => (await createSession(options)).session,
    codex: { home: path.join(root, 'codex'), account: { status: 'connected', planUsageEnabled: true },
      models: [{ id: 'fixture-v1', name: 'Fixture', provider: 'chatgpt', backend: 'codex', configured: true }], async refresh() {}, async credentials() { return { accessToken: 'fixture', expiresAt: Date.now() + 60_000 }; } } });
  const context = project => ({ experiment, project, modelConfig: { backend, provider, model: 'fixture-v1' }, signal: new AbortController().signal,
    saveProjection: value => projections.set(value.id, structuredClone(value)) });
  worker = await workers.sharedPlanner(context(initial));
  t.after(async () => { await worker.stop(); await fs.rm(root, { recursive: true, force: true }); });
  const start = async () => { await worker.start(); await worker.wait(); };
  const resume = async () => { worker = await workers.sharedPlanner(context(projections.get(initial.id))); await worker.resume(); await worker.wait(); };
  return { root, experiment, sessions, source, workers, start, resume, context,
    get worker() { return worker; }, get project() { return projections.get(initial.id); }, get planCalls() { return planCalls; }, get reviewCalls() { return reviewCalls; },
    progress: async () => JSON.parse(await fs.readFile(path.join(root, 'experiments', experiment.id, 'planning-review-state.json'), 'utf8')),
    artifact: async () => workers.shared(experiment.id),
    sharedPath: path.join(root, 'experiments', experiment.id, 'shared.json') };
}
async function assertUnfrozen(h) {
  await assert.rejects(fs.stat(h.sharedPath), { code: 'ENOENT' });
  assert.notEqual(h.project.status, 'review');
  assert.equal(h.project.planningReview, undefined, 'Private review findings must not cross the public project projection.');
}

test('a semantically weak shared plan is corrected before it freezes for either architecture', { timeout }, async t => {
  const h = await harness(t, { initialWeak: true }); await h.start();
  assert.equal(h.project.status, 'review', h.project.error);
  assert.equal(h.planCalls, 2, 'The constant-output shortcut must trigger one planner correction.');
  assert.equal(h.reviewCalls, 2, 'The corrected plan needs a fresh independent reviewer.');
  const artifact = await h.artifact(), progress = await h.progress();
  assert.equal(artifact.evaluation.evaluations[0].cases[1].expected.total, 0);
  assert.equal(progress.phase, 'approved'); assert.equal(progress.revisionUsed, true);
  assert.deepEqual(artifact.planningReview, progress.review);
  assert.equal(artifact.planningReview.contractHash, experimentContractHash({ behavior: artifact.behavior, evaluation: artifact.evaluation }));
  assert.ok(!JSON.stringify(h.project).includes('A constant total of 5 passes both examples.'));
  await assert.rejects(fs.stat(path.join(h.project.workspace, 'evaluation-plan.json')), { code: 'ENOENT' });
  const reviewers = h.sessions.filter(session => session.stage === 'review');
  assert.notEqual(reviewers[0], reviewers[1]);
  for (const reviewer of reviewers) {
    assert.notEqual(reviewer.cwd, h.project.workspace);
    assert.deepEqual(reviewer.customTools.map(tool => tool.name).sort(), ['fleet_read_planning_artifact', 'fleet_submit_planning_review']);
    assert.equal(reviewer.disposed, true);
  }
});

test('successive shared planning rejections automatically revise until independent approval', { timeout }, async t => {
  let h;
  h = await harness(t, { initialWeak: true, correctOnPlan: 4,
    onPrompt: async ({ stage, planCalls, reviewCalls, prompt }) => {
      if (stage !== 'plan' || planCalls === 1) return false;
      await assertUnfrozen(h);
      assert.equal(h.project.status, 'running');
      const progress = await h.progress();
      assert.equal(progress.phase, 'revision');
      assert.equal(progress.review.verdict, 'revise');
      assert.equal(progress.revisionUsed, true);
      assert.equal(reviewCalls, planCalls - 1);
      assert.match(prompt, /A constant total of 5 passes both examples/);
      assert.doesNotMatch(prompt, /one permitted|only.*revision/);
      return false;
    } });
  await h.start();
  assert.equal(h.project.status, 'review', h.project.error);
  assert.equal(h.planCalls, 4); assert.equal(h.reviewCalls, 4);
  const progress = await h.progress();
  assert.equal(progress.phase, 'approved'); assert.equal(progress.revisionUsed, true);
  assert.equal((await h.artifact()).planningReview.verdict, 'approved');
  const reviewers = h.sessions.filter(session => session.stage === 'review');
  assert.equal(new Set(reviewers).size, 4, 'Every changed plan receives a fresh reviewer session.');
  assert.ok(reviewers.every(reviewer => reviewer.disposed));
  assert.ok(!h.project.logs.some(log => /Planning is paused|after its one revision/.test(log.text)));
});

test('the selected Codex backend independently reviews and rereviews the shared architecture-neutral plan', { timeout }, async t => {
  const h = await harness(t, { backend: 'codex', initialWeak: true, correctOnPlan: 3 }); await h.start();
  assert.equal(h.project.status, 'review', h.project.error); assert.equal(h.planCalls, 3); assert.equal(h.reviewCalls, 3);
  assert.equal((await h.artifact()).planningReview.verdict, 'approved');
  for (const reviewer of h.sessions.filter(session => session.stage === 'review')) {
    assert.equal(reviewer.options.customTools, undefined);
    assert.equal(reviewer.options.model, 'fixture-v1');
    assert.equal(reviewer.options.skillPaths, undefined);
    assert.match(reviewer.options.conversationInstructions, /independent shared-planning reviewer/);
    assert.match(reviewer.options.conversationInstructions, /without choosing or assuming an architecture/);
    assert.notEqual(reviewer.cwd, h.project.workspace);
    assert.deepEqual(reviewer.customTools.map(tool => tool.name).sort(), ['fleet_read_planning_artifact', 'fleet_submit_planning_review']);
  }
});

for (const backend of ['pi', 'codex']) test(`${backend} shared reviewer receives exact supplied data without candidate files`, { timeout }, async t => {
  const dataInputs = [
    { name: 'sample.json', kind: 'file', content: JSON.stringify({ values: [23, 31], note: 'é🧪'.repeat(13_000) }) },
    { name: 'sample.json', kind: 'text', content: '{"values":[],"note":"second attached source"}\n' }
  ];
  const h = await harness(t, { backend, dataInputs });
  await h.start();
  assert.equal(h.project.status, 'review', h.project.error);
  const artifact = await h.artifact();
  const reviewer = h.sessions.find(session => session.stage === 'review'), documents = reviewer.reviewedDocuments;
  const inputNames = Object.keys(documents).filter(name => name.startsWith('inputs/')).sort();
  assert.deepEqual(inputNames, ['inputs/001-sample.json', 'inputs/002-sample.json', 'inputs/manifest.json']);
  assert.deepEqual(inputNames, artifact.data.files.slice().sort());
  const manifest = JSON.parse(documents['inputs/manifest.json']);
  assert.equal(manifest.mode, 'provided');
  assert.deepEqual(manifest.sources.map(source => ({ name: source.name, kind: source.kind, bytes: source.bytes })),
    dataInputs.map(input => ({ name: input.name, kind: input.kind, bytes: Buffer.byteLength(input.content) })));
  for (const [index, source] of manifest.sources.entries()) {
    assert.equal(documents[source.path], dataInputs[index].content);
    assert.equal(documents[source.path], artifact.seed[source.path]);
  }
  for (const name of ['solution-contract.json', 'execution-contract.json', 'foundation-plan.json', 'data/synthetic-data.json']) {
    assert.equal(documents[name], undefined);
  }
});

test('reading every shared planning document without supplied data cannot freeze a comparison', { timeout }, async t => {
  const h = await harness(t, { onPrompt: async ({ stage, session }) => {
    if (stage !== 'review') return false;
    const reader = session.customTools.find(tool => tool.name === 'fleet_read_planning_artifact'), documents = {};
    for (const name of fixturePlanningReviewPaths(reader.parameters)) {
      if (!name.startsWith('inputs/')) documents[name] = await readReviewDocument(session.customTools, name);
    }
    const record = verdict(JSON.parse(documents['behavior-contract.json']), JSON.parse(documents['evaluation-plan.json']), false);
    await assert.rejects(session.customTools.find(tool => tool.name === 'fleet_submit_planning_review').execute('unread-data-approval', record), /inputs\//);
    return true;
  } });
  await h.start();
  await assertUnfrozen(h);
  assert.match(h.project.error, /plan review could not finish/);
  assert.ok(h.project.logs.some(log => /did not submit a planning verdict/.test(log.text)));
  assert.equal((await h.progress()).phase, 'reviewing');
  assert.equal(h.reviewCalls, 1);
});

for (const invalid of ['missing', 'incomplete']) test(`${invalid} shared review verdict cannot freeze the plan`, { timeout }, async t => {
  const h = await harness(t, invalid === 'missing' ? { omitVerdict: true } : { transformVerdict: value => { value.evaluations = []; } });
  await h.start(); await assertUnfrozen(h);
  assert.equal(h.planCalls, 1); assert.equal(h.reviewCalls, 1); assert.equal((await h.progress()).phase, 'reviewing');
});

for (const coverage of ['none', 'contracts-only']) test(`a shared approval with ${coverage} document reads cannot freeze the plan`, { timeout }, async t => {
  const h = await harness(t, { onPrompt: async ({ stage, session, prompt }) => {
    if (stage !== 'review') return false;
    let behavior, evaluation;
    if (coverage === 'none') {
      const match = /Canonical acceptance criteria \(data\):\n([^\n]+)/.exec(prompt);
      assert.ok(match, 'The reviewer prompt provides canonical criteria, not the document bodies.');
      ({ behavior, evaluation } = contracts(JSON.parse(match[1]), false));
    } else {
      behavior = JSON.parse(await readReviewDocument(session.customTools, 'behavior-contract.json'));
      evaluation = JSON.parse(await readReviewDocument(session.customTools, 'evaluation-plan.json'));
    }
    const record = verdict(behavior, evaluation, false);
    await assert.rejects(session.customTools.find(tool => tool.name === 'fleet_submit_planning_review').execute('unread-approval', record), /read|complete|coverage/i);
    return true;
  } });
  await h.start();
  await assertUnfrozen(h);
  assert.match(h.project.error, /plan review could not finish/);
  assert.ok(h.project.logs.some(log => /did not submit a planning verdict/.test(log.text)));
  assert.equal(h.planCalls, 1);
  assert.equal(h.reviewCalls, 1);
  assert.equal((await h.progress()).phase, 'reviewing');
});

test('a changed shared planning document invalidates the submitted approval', { timeout }, async t => {
  const h = await harness(t, { afterVerdict: async ({ workspace }) => fs.appendFile(path.join(workspace, 'behavior-contract.json'), '\n ') });
  await h.start(); await assertUnfrozen(h);
  assert.equal(h.project.executionFailure, 'integrity');
  assert.match(h.project.error, /changed|review|snapshot/i);
});

for (const interrupted of ['reviewing', 'revision', 'rereview']) test(`restart during shared ${interrupted} preserves pending work and continues automatic corrections`, { timeout }, async t => {
  const entered = deferred(); let pause = true;
  const h = await harness(t, { initialWeak: interrupted !== 'reviewing', correctOnPlan: interrupted === 'rereview' ? 3 : 2,
    onPrompt: ({ stage, planCalls, reviewCalls }) => {
      const target = interrupted === 'reviewing' ? stage === 'review' && reviewCalls === 1
        : interrupted === 'revision' ? stage === 'plan' && planCalls === 2 : stage === 'review' && reviewCalls === 2;
      if (pause && target) { entered.resolve(); return never(); }
      return false;
    } });
  await h.worker.start(); await entered.promise; const oldSession = h.sessions.at(-1); await h.worker.stop();
  await assertUnfrozen(h); assert.equal(h.project.status, 'stopped');
  const progress = await h.progress(); assert.equal(progress.phase, interrupted); assert.equal(progress.revisionUsed, interrupted !== 'reviewing');
  assert.equal(oldSession.disposed, true); assert.equal(oldSession.aborts, 1);
  const { workspace, runId } = h.project; pause = false; await h.resume();
  assert.equal(h.project.workspace, workspace); assert.equal(h.project.runId, runId);
  if (interrupted === 'reviewing') {
    assert.equal(h.project.status, 'review', h.project.error); assert.equal(h.planCalls, 1); assert.equal(h.reviewCalls, 2);
  } else {
    assert.equal(h.project.status, 'review', h.project.error); assert.equal((await h.progress()).phase, 'approved');
    assert.equal(h.planCalls, 3);
    assert.equal(h.reviewCalls, interrupted === 'rereview' ? 4 : 2);
  }
});

for (const interrupted of ['revision', 'rereview']) test(`stop and restart during a later shared ${interrupted} retains the same workspace and review`, { timeout }, async t => {
  const entered = deferred(); let pause = true;
  const h = await harness(t, { initialWeak: true, correctOnPlan: 4,
    onPrompt: ({ stage, planCalls, reviewCalls }) => {
      const target = interrupted === 'revision' ? stage === 'plan' && planCalls === 4 : stage === 'review' && reviewCalls === 3;
      if (pause && target) { entered.resolve(); return never(); }
      return false;
    } });
  await h.worker.start(); await entered.promise;
  const stoppedSession = h.sessions.at(-1); await h.worker.stop();
  await assertUnfrozen(h); assert.equal(h.project.status, 'stopped');
  const progress = await h.progress();
  assert.equal(progress.phase, interrupted); assert.equal(progress.review.verdict, 'revise');
  assert.equal(progress.revisionUsed, true);
  assert.equal(stoppedSession.disposed, true); assert.equal(stoppedSession.aborts, 1);
  const { workspace, runId } = h.project;
  const completedStages = h.project.stages.filter(stage => stage.status === 'complete').map(stage => stage.id);
  pause = false; await h.resume();
  assert.equal(h.project.status, 'review', h.project.error);
  assert.equal(h.project.workspace, workspace); assert.equal(h.project.runId, runId);
  for (const id of completedStages) assert.equal(h.project.stages.find(stage => stage.id === id).status, 'complete');
  assert.equal(h.sessions.filter(session => session.stage === 'intake').length, 1);
  assert.equal(h.sessions.filter(session => session.stage === 'research').length, 1);
  assert.equal(h.planCalls, interrupted === 'revision' ? 5 : 4);
  assert.equal(h.reviewCalls, interrupted === 'revision' ? 4 : 5);
  assert.equal((await h.progress()).phase, 'approved');
});

test('a legacy rejected shared plan resumes its saved findings before running more review cycles', { timeout }, async t => {
  const entered = deferred(); let pause = true, legacy, h;
  h = await harness(t, { initialWeak: true, correctOnPlan: 5,
    onPrompt: async ({ stage, planCalls, prompt }) => {
      if (stage !== 'plan' || planCalls < 3) return false;
      if (pause && planCalls === 3) { entered.resolve(); return never(); }
      if (planCalls === 4) {
        const saved = await h.progress();
        assert.equal(saved.phase, 'revision', 'Legacy rejection is durably migrated before dispatch.');
        assert.deepEqual(saved.review, legacy.review);
        assert.match(prompt, /A constant total of 5 passes both examples/);
      }
      return false;
    } });
  await h.worker.start(); await entered.promise; await h.worker.stop();
  legacy = await h.progress(); legacy.phase = 'rejected';
  await fs.writeFile(path.join(h.root, 'experiments', h.experiment.id, 'planning-review-state.json'), JSON.stringify(legacy));
  h.project.status = 'failed'; h.project.error = 'Independent shared planning review still requires changes after its one revision.';
  const { runId, workspace } = h.project; pause = false; await h.resume();
  assert.equal(h.project.status, 'review', h.project.error);
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.equal(h.planCalls, 5); assert.equal(h.reviewCalls, 4);
  assert.equal((await h.progress()).phase, 'approved');
});

test('repeated shared planning reviews still stop on a provider failure without freezing', { timeout }, async t => {
  const h = await harness(t, { initialWeak: true, correctOnRevision: false,
    onPrompt: ({ stage, reviewCalls }) => {
      if (stage === 'review' && reviewCalls === 3) throw new Error('Fixture provider unavailable.');
      return false;
    } });
  await h.start(); await assertUnfrozen(h);
  assert.equal(h.project.status, 'failed'); assert.equal(h.project.executionFailure, 'infrastructure');
  assert.equal(h.planCalls, 3); assert.equal(h.reviewCalls, 3);
  assert.equal((await h.progress()).phase, 'rereview');
  assert.ok(h.sessions.every(session => session.disposed));
});

test('automatic shared planning corrections retain and exhaust the saved phase budget', { timeout }, async t => {
  const entered = deferred(); let pause = true;
  const h = await harness(t, { initialWeak: true, correctOnRevision: false,
    onPrompt: ({ stage, planCalls }) => {
      if (stage === 'plan' && planCalls >= 3) {
        if (pause) entered.resolve();
        return never();
      }
      return false;
    } });
  await h.worker.start(); await entered.promise; await h.worker.stop();
  await assertUnfrozen(h);
  const checkpointPath = path.join(h.root, 'run-checkpoints', h.project.runId + '.json');
  const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
  assert.equal(checkpoint.executionBudget.active, undefined);
  const consumed = checkpoint.executionBudget.phases.plan;
  assert.ok(consumed > 0);
  checkpoint.executionBudget.phaseLimitMs = consumed + 200;
  await fs.writeFile(checkpointPath, JSON.stringify(checkpoint));
  pause = false; await h.resume();
  await assertUnfrozen(h);
  assert.equal(h.project.status, 'failed'); assert.equal(h.project.executionFailure, 'budget');
  assert.match(h.project.logs.filter(log => log.kind === 'error').map(log => log.text).join('\n'), /exhausted.*execution budget/);
  assert.equal(h.project.error, plainError(new Error('This candidate exhausted its frozen execution budget.')).message);
  assert.equal(h.planCalls, 4); assert.equal(h.reviewCalls, 2);
  assert.equal((await h.progress()).phase, 'revision');
  const exhausted = JSON.parse(await fs.readFile(checkpointPath, 'utf8')).executionBudget;
  assert.equal(exhausted.phases.plan, exhausted.phaseLimitMs);
  assert.ok(exhausted.consumedMs >= consumed);
  const count = h.sessions.length; await h.resume();
  assert.equal(h.sessions.length, count, 'Restart cannot reset the consumed phase budget.');
  assert.equal(h.project.executionFailure, 'budget');
});

for (const changed of [false, true]) test(`approved shared review before contract commit ${changed ? 'rejects changed inputs' : 'resumes without another model call'}`, { timeout }, async t => {
  let evaluationBody;
  const h = await harness(t, { afterVerdict: async ({ workspace }) => { evaluationBody = await fs.readFile(path.join(workspace, 'evaluation-plan.json'), 'utf8'); } });
  await h.start(); assert.equal((await h.progress()).phase, 'approved');
  // Recreate the crash window after the durable approval write and before shared.json publication.
  await fs.rm(h.sharedPath); await fs.writeFile(path.join(h.project.workspace, 'evaluation-plan.json'), evaluationBody);
  if (changed) await fs.appendFile(path.join(h.project.workspace, 'behavior-contract.json'), '\n ');
  h.project.status = 'failed'; h.project.resumeStage = 'plan';
  const count = h.sessions.length; await h.resume();
  assert.equal(h.sessions.length, count, 'A durable approval is reused or invalidated before dispatching any model session.');
  if (changed) {
    await assertUnfrozen(h); assert.equal(h.project.executionFailure, 'integrity');
    assert.ok(h.project.logs.some(log => /approval.*inputs/.test(log.text)), h.project.error);
  } else {
    assert.equal(h.project.status, 'review', h.project.error);
    assert.equal((await h.artifact()).planningReview.inputHash, (await h.progress()).review.inputHash);
  }
});

for (const changed of [false, true]) test(`legacy approval before shared commit ${changed ? 'rejects changed inputs' : 'resumes with its original review meaning'}`, { timeout }, async t => {
  let evaluationBody;
  const h = await harness(t, { afterVerdict: async ({ workspace }) => { evaluationBody = await fs.readFile(path.join(workspace, 'evaluation-plan.json'), 'utf8'); } });
  await h.start();
  const artifact = await h.artifact(), progress = await h.progress();
  await fs.rm(h.sharedPath);
  await fs.writeFile(path.join(h.project.workspace, 'evaluation-plan.json'), evaluationBody);
  const legacy = await createSharedPlanningReviewSnapshot(h.project.workspace, artifact.acceptance, artifact.behavior, artifact.evaluation);
  progress.review.inputHash = legacy.hash;
  delete progress.review.preparedDataHash;
  await fs.writeFile(path.join(h.root, 'experiments', h.experiment.id, 'planning-review-state.json'), JSON.stringify(progress));
  if (changed) await fs.appendFile(path.join(h.project.workspace, 'behavior-contract.json'), '\n ');
  h.project.status = 'failed'; h.project.resumeStage = 'plan';
  const count = h.sessions.length;
  await h.resume();
  assert.equal(h.sessions.length, count, 'Previously approved input identity is checked without allocating a new model session.');
  if (changed) {
    await assertUnfrozen(h);
    assert.equal(h.project.executionFailure, 'integrity');
    assert.ok(h.project.logs.some(log => /approval.*inputs/.test(log.text)), h.project.error);
  } else {
    assert.equal(h.project.status, 'review', h.project.error);
    assert.deepEqual((await h.artifact()).planningReview, progress.review);
    assert.equal((await h.artifact()).planningReview.preparedDataHash, undefined);
  }
});

test('legacy frozen shared artifacts resume without retroactive review or answer regeneration', { timeout }, async t => {
  const h = await harness(t); await h.start();
  const artifact = await h.artifact(); delete artifact.planningReview;
  await fs.writeFile(h.sharedPath, JSON.stringify(artifact));
  await fs.rm(path.join(h.root, 'experiments', h.experiment.id, 'planning-review-state.json'));
  const checkpointPath = path.join(h.root, 'run-checkpoints', h.project.runId + '.json');
  const checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8')); checkpoint.stage = 'plan';
  await fs.writeFile(checkpointPath, JSON.stringify(checkpoint));
  h.project.status = 'failed'; h.project.resumeStage = 'plan';
  const count = h.sessions.length; await h.resume();
  assert.equal(h.project.status, 'review', h.project.error); assert.equal(h.sessions.length, count);
  assert.equal((await h.artifact()).planningReview, undefined);
  assert.equal((await h.artifact()).evaluation.evaluations[0].cases[0].expected.total, 54);
});

test('new frozen shared approval is bound to both the behavior and private evaluation set', { timeout }, async t => {
  const h = await harness(t); await h.start();
  const artifact = await h.artifact();
  artifact.evaluation.evaluations[0].cases[0].expected.total = 999;
  artifact.evaluationSetHash = experimentContractHash(artifact.evaluation);
  await fs.writeFile(h.sharedPath, JSON.stringify(artifact));
  await assert.rejects(h.artifact(), /approval.*contracts/);
});

test('a valid-looking changed prepared-data approval hash cannot load frozen shared contracts', { timeout }, async t => {
  const h = await harness(t); await h.start();
  const artifact = await h.artifact(), count = h.sessions.length;
  assert.equal(artifact.planningReview.preparedDataHash, artifact.data.hash);
  artifact.planningReview.preparedDataHash = (artifact.data.hash[0] === '0' ? '1' : '0') + artifact.data.hash.slice(1);
  assert.match(artifact.planningReview.preparedDataHash, /^[a-f0-9]{64}$/);
  const changed = JSON.stringify(artifact);
  await fs.writeFile(h.sharedPath, changed);
  await assert.rejects(h.artifact(), error => {
    assert.equal(error.classification, 'integrity');
    assert.match(error.message, /approval.*contracts/);
    return true;
  });
  assert.equal(h.sessions.length, count);
  assert.equal(await fs.readFile(h.sharedPath, 'utf8'), changed, 'Rejected shared evidence is not silently rewritten.');
});
