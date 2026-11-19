import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { AppBuilder } from '../dist-electron/electron/app-builder.js';
import { ClarificationBroker } from '../dist-electron/electron/clarifications.js';
import { RunProcessSweep } from '../dist-electron/electron/process-sweep.js';
import { ApplicationPreviews } from '../dist-electron/electron/solution-preview.js';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { foundationRuntime } from '../dist-electron/harness/foundations.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { cliFixtureProject, qualityFixtureHtml, qualityFixtureProject } from '../scripts/quality-fixture.mjs';
import { cliSolutionFixture, solutionFixtureEvaluator, structuredSolutionFixture } from '../scripts/solution-fixture.mjs';

const previewTurn = 'Implement the first preview workflow';
const planTurn = 'Stop after planning';
const finalRepair = 'Host verification failed';

async function writeFiles(cwd, files) {
  for (const [name, body] of Object.entries(files)) await writeFile(path.join(cwd, name), body);
}

async function fixture(t, { brief = qualityFixtureProject, plan = structuredSolutionFixture, prompt, notify = () => {}, clarify = false, onDispose = () => {}, ...options }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'appyard-continuation-'));
  const store = new Store(root);
  await store.init();
  const project = newProject(brief);
  store.state.projects.push(project);
  Object.assign(store.state.settings, { backend: 'codex', provider: 'fixture', model: 'fixture' });

  const prompts = [];
  let sessions = 0;
  const broker = clarify ? new ClarificationBroker(store, () => notify(project)) : undefined;
  const backend = new AppBuilder(store, process.execPath, () => notify(project), process.cwd(), {
    clarifications: broker,
    codex: { async refresh() {}, models: [{ id: 'fixture', configured: true }] },
    async closeInProgressPreview() {},
    createCodexSession: async ({ cwd, tools, signal }) => {
      sessions++;
      let observe;
      const call = (name, args = {}) => {
        const tool = tools.find(item => item.name === name);
        assert.ok(tool, 'Tool exposed to the session: ' + name);
        return tool.execute('fixture', args, signal);
      };
      return {
        subscribe(listener) { observe = listener; return () => { observe = undefined; }; },
        async prompt(text) {
          prompts.push(text);
          if (plan && text.includes(planTurn)) {
            const packet = JSON.parse(await readFile(path.join(cwd, '.fleet', 'packet.json'), 'utf8'));
            await writeFiles(cwd, plan(packet.acceptance.map(criterion => criterion.id)));
          }
          await prompt(text, cwd, () => observe({ type: 'message_end', message: { role: 'assistant', stopReason: 'length' } }), call);
        },
        async abort() {},
        async dispose() { onDispose(); },
      };
    },
    ...options,
  });
  t.after(async () => {
    await backend.stopAll();
    await rm(root, { recursive: true, force: true });
  });
  return { project, backend, broker, store, prompts, sessions: () => sessions,
    async run() { await backend.start(project.id); await backend.active.get(project.id)?.done; } };
}

const failedReport = { exitCode: 1, total: 1, passed: 0, failed: 1, skipped: 0, output: 'Fixture check failed.' };
const parserCore = String.raw`const fs = require('node:fs'), vm = require('node:vm');
const code = fs.readFileSync('index.html', 'utf8').match(/\/\* CORE_START \*\/([\s\S]*?)\/\* CORE_END \*\//)[1];
exports.parse = vm.runInNewContext(code + ';parseTask');`;
const runtimeFiles = { 'index.html': qualityFixtureHtml, 'core.cjs': parserCore, 'evaluate.cjs': solutionFixtureEvaluator };

// At the preview milestone only the primary workflow works. The final build adds recovery.
const previewHtml = qualityFixtureHtml.replace("'Enter a message.'", "''");
const appTest = `const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('./core.cjs');
test('extracts the task', () => assert.equal(parse('TASK: inspect pump'), 'inspect pump'));`;

test('structured planning validates the whole contract and installs the selected service starter before implementation', async t => {
  const { project, run, prompts } = await fixture(t, {
    plan: null,
    async prompt(text, cwd, _truncate, call) {
      if (text.includes(planTurn)) {
        assert.match(text, /submit_build_plan/);
        const packet = JSON.parse(await readFile(path.join(cwd, '.fleet', 'packet.json'), 'utf8'));
        const files = structuredSolutionFixture(packet.acceptance.map(criterion => criterion.id));
        const acceptance = JSON.parse(files['acceptance-plan.json']);
        const ux = JSON.parse(files['ux-spec.json']);
        const solution = JSON.parse(files['solution-contract.json']);
        const evaluation = JSON.parse(files['evaluation-plan.json']);
        const foundation = { schemaVersion: 1, templateId: 'node-service', version: '1.0.0', computePack: 'offline', reason: 'Exercise the bundled service.' };
        assert.equal((await call('submit_build_plan', { ux })).isError, false);
        assert.equal(project.inProgressPlan.primaryTask, ux.primaryTask);
        await assert.rejects(access(path.join(cwd, 'ux-spec.json')), { code: 'ENOENT' });
        const mismatch = await call('submit_build_plan', { acceptance, solution, evaluation, foundation });
        assert.equal(mismatch.isError, true);
        assert.match(mismatch.content[0].text, /runtime does not match/);
        assert.match(mismatch.content[0].text, /Retained sections: ux, acceptance, solution, evaluation, foundation/);
        await assert.rejects(access(path.join(cwd, 'solution-contract.json')), { code: 'ENOENT' });
        solution.runtime = foundationRuntime(foundation);
        assert.equal((await call('submit_build_plan', { solution })).isError, false);
      } else {
        assert.match(text, new RegExp(previewTurn));
        assert.equal((await call('submit_build_plan', {})).isError, true);
        assert.equal(project.runtimeProfile, 'service');
        const solutionText = await readFile(path.join(cwd, 'solution-contract.json'), 'utf8');
        assert.match(solutionText, /^\{\n  "schemaVersion"/);
        const { runtime } = JSON.parse(solutionText);
        await Promise.all(runtime.files.map(file => access(path.join(cwd, file))));
        const lock = JSON.parse(await readFile(path.join(cwd, 'foundation-lock.json'), 'utf8'));
        assert.equal(lock.selection.templateId, 'node-service');
        assert.equal(lock.selection.computePack, 'offline');
        assert.ok(lock.files['lib/offline.js']);
      }
    },
    async verify() { throw new Error('Fixture reached final verification with a complete starter.'); },
  });
  await run();
  assert.equal(prompts.length, 2);
  assert.equal(project.error, 'Fixture reached final verification with a complete starter.');
  assert.ok(project.logs.some(entry => entry.text.includes('structured submission')));
});

test('AppBuilder continues truncated implementation and repair turns before running verification', async t => {
  const flow = [];
  let checks = 0;
  const { project, run } = await fixture(t, {
    brief: cliFixtureProject,
    plan: cliSolutionFixture,
    async prompt(text, cwd, truncate) {
      if (text.includes('Stop after planning')) {
        flow.push('plan');
      } else if (text.includes('previous response was cut off')) {
        flow.push(text.includes('verification repair') ? 'continue repair' : 'continue implementation');
        assert.equal(await readFile(path.join(cwd, 'progress.txt'), 'utf8'), 'saved');
      } else {
        flow.push(text.startsWith(finalRepair) ? 'repair' : 'implementation');
        await writeFile(path.join(cwd, 'progress.txt'), 'saved');
        truncate();
      }
    },
    async checkBuildPreview() { flow.push('unexpected CLI preview check'); },
    async verify() {
      flow.push('verify');
      if (++checks === 2) throw new Error('Verification reached again');
      return failedReport;
    },
  });

  await run();
  assert.deepEqual(flow, ['plan', 'implementation', 'continue implementation', 'verify', 'repair', 'continue repair', 'verify']);
  assert.equal(project.runCheckpoint.repairAttempts, 1);
  assert.equal(project.error, 'Verification reached again');
});

test('one implementation turn opens a checked preview, keeps earlier snapshots, and still gates full review', { timeout: 45_000 }, async t => {
  const flow = [];
  let snapshot, updatedSnapshot, previewUrl, tokenAt, openAt, reviewAt;
  const previews = new ApplicationPreviews(process.execPath);
  t.after(() => previews.close());
  const sweep = new RunProcessSweep();
  const stop = sweep.stop.bind(sweep);
  t.mock.method(sweep, 'stop', async () => { await stop(); flow.push('cleanup'); });
  const { project, backend, run, prompts, sessions } = await fixture(t, {
    clarify: true,
    processSweep: () => sweep,
    async closeInProgressPreview(id) {
      assert.equal(id, project.id);
      await previews.stop(snapshot);
      flow.push('preview closed');
    },
    notify(project) {
      if (project.inProgressPreview && tokenAt === undefined) {
        tokenAt = performance.now();
        flow.push('published');
      }
      if (project.status === 'review' && reviewAt === undefined) {
        reviewAt = performance.now();
        flow.push('review');
      }
    },
    async prompt(text, cwd, _truncate, call) {
      if (text.includes(planTurn)) {
        flow.push('plan');
        assert.match(text, /show_build_plan/);
        await assert.rejects(access(path.join(cwd, 'index.html')), { code: 'ENOENT' });
        assert.equal((await call('check_preview')).isError, true);
        const spec = path.join(cwd, 'ux-spec.json');
        const frozenUx = await readFile(spec, 'utf8');
        await writeFile(spec, '{');
        assert.equal((await call('show_build_plan')).isError, true);
        assert.equal(project.inProgressPlan, undefined);
        const draftUx = JSON.parse(frozenUx);
        draftUx.primaryTask = 'Draft task to replace at the plan gate.';
        await writeFile(spec, JSON.stringify(draftUx));
        assert.equal((await call('show_build_plan', null)).isError, false);
        assert.equal(project.inProgressPlan.primaryTask, draftUx.primaryTask);
        assert.ok(project.inProgressPlan.screens[0].name);
        await writeFile(spec, frozenUx);
      } else {
        flow.push('slice');
        assert.match(text, new RegExp(previewTurn));
        assert.match(text, /parse-task/);
        assert.match(text, /check_preview/);
        assert.equal(project.runtimeProfile, 'browser');
        assert.match(await readFile(path.join(cwd, 'plan.md'), 'utf8'), /Implementation plan/);
        assert.match(await readFile(path.join(cwd, 'test-matrix.md'), 'utf8'), /parse-task/);
        assert.notEqual(project.inProgressPlan.primaryTask, 'Draft task to replace at the plan gate.');
        await writeFiles(cwd, { ...runtimeFiles, 'index.html': previewHtml, 'agent-notes.txt': 'Private workspace notes.' });
        assert.equal((await call('check_preview', { path: '/tmp/outside' })).isError, true);
        assert.equal((await call('show_build_plan')).isError, true);
        assert.equal((await call('check_preview')).isError, false);
        flow.push('remaining');
        assert.equal(project.status, 'running');
        assert.equal(project.report, undefined);
        assert.equal(project.verification, undefined);
        const firstToken = project.inProgressPreview;
        assert.ok(firstToken);
        snapshot = backend.inProgressPreview(project.id, firstToken);
        assert.ok(snapshot);
        assert.equal(backend.inProgressPreview(project.id, 'unknown'), undefined);
        assert.notEqual(snapshot, cwd);
        previewUrl = await previews.url(snapshot);
        const response = await fetch(previewUrl, { headers: { connection: 'close' } });
        assert.equal(response.status, 200);
        assert.equal(await response.text(), previewHtml);
        openAt = performance.now();
        await assert.rejects(access(path.join(snapshot, 'agent-notes.txt')), { code: 'ENOENT' });
        await assert.rejects(access(path.join(snapshot, 'evaluation-plan.json')), { code: 'ENOENT' });
        assert.equal((await call('check_preview')).isError, false);
        assert.equal(project.inProgressPreview, firstToken);
        await writeFiles(cwd, { 'index.html': qualityFixtureHtml, 'app.test.cjs': appTest });
        assert.equal((await call('check_preview')).isError, false);
        assert.notEqual(project.inProgressPreview, firstToken);
        assert.equal(backend.inProgressPreview(project.id, firstToken), snapshot);
        updatedSnapshot = backend.inProgressPreview(project.id);
        assert.notEqual(updatedSnapshot, snapshot);
        assert.equal(await readFile(path.join(snapshot, 'index.html'), 'utf8'), previewHtml);
        assert.equal(await readFile(path.join(updatedSnapshot, 'index.html'), 'utf8'), qualityFixtureHtml);
        assert.equal(await (await fetch(previewUrl, { headers: { connection: 'close' } })).text(), previewHtml);
        const newerToken = project.inProgressPreview;
        await writeFile(path.join(cwd, 'index.html'), qualityFixtureHtml.replace('#parse', '#missing').replace('id="parse"', 'id="missing"'));
        assert.equal((await call('check_preview')).isError, true);
        assert.equal(project.inProgressPreview, newerToken, 'A failed update keeps the last passing preview.');
        await writeFile(path.join(cwd, 'index.html'), qualityFixtureHtml);
        const limited = await call('check_preview');
        assert.equal(limited.isError, true);
        assert.match(limited.content[0].text, /preview check limit/);
      }
    },
  });

  const start = performance.now();
  await run();
  assert.equal(project.status, 'review', project.error);
  assert.equal(sessions(), 1);
  assert.equal(prompts.length, 2);
  assert.deepEqual(flow, ['plan', 'slice', 'published', 'remaining', 'preview closed', 'cleanup', 'review']);
  assert.match(prompts[0], /workflow first/i);
  assert.equal(project.processScope.cleanup, 'confirmed');
  assert.equal(project.runCheckpoint.writerState, 'idle');
  assert.equal(project.verification.runId, project.runId);
  assert.equal(reportPassed(project.report, 2), true);
  assert.deepEqual(project.report.quality.journeys.map(journey => [journey.id, journey.viewport]).sort(), [
    ['parse-task', 'desktop'], ['parse-task', 'narrow'], ['recover-empty', 'desktop'], ['recover-empty', 'narrow'],
  ]);
  assert.ok(start <= tokenAt && tokenAt <= openAt && openAt < reviewAt);
  t.diagnostic(`Fixture from Start Build to snapshot ${Math.round(tokenAt - start)} ms, opened ${Math.round(openAt - start)} ms, automated review ${Math.round(reviewAt - start)} ms`);
  assert.equal(project.inProgressPreview, undefined);
  assert.equal(project.inProgressPlan, undefined);
  assert.equal(backend.inProgressPreview(project.id), undefined);
  assert.equal(previews.allows(previewUrl), false);
  await assert.rejects(access(snapshot), { code: 'ENOENT' });
  await assert.rejects(access(updatedSnapshot), { code: 'ENOENT' });
});

test('a material planning question releases the model session and continues from the recorded answer', async t => {
  const waiting = Promise.withResolvers();
  const question = { question: 'Who approves a checkout?', context: 'Approval changes the workflow.',
    options: ['Staff self-serve', 'Supervisor approval'], recommendation: 'Staff self-serve is simpler.' };
  let disposed = 0;
  const { project, backend, broker, prompts, sessions } = await fixture(t, {
    clarify: true,
    onDispose() { disposed++; },
    notify(project) { if (disposed && project.resumeStage === 'plan' && project.conversation?.questions.some(item => item.status === 'pending')) waiting.resolve(); },
    async prompt(text, cwd, _truncate, call) {
      if (text.includes(planTurn) && !text.includes('User clarification answers for this run')) {
        assert.match(text, /For clear briefs and routine decisions, proceed directly/);
        await call('fleet_request_clarification', { questions: [question] });
      } else if (text.includes(planTurn)) {
        assert.match(text, /Warehouse leads can approve too/);
      } else {
        const { questions } = JSON.parse(await readFile(path.join(cwd, 'clarifications.json'), 'utf8'));
        assert.deepEqual(questions[0].response, { selectedOptions: ['Supervisor approval'], text: 'Warehouse leads can approve too' });
        await writeFiles(cwd, { ...runtimeFiles, 'app.test.cjs': appTest });
      }
    },
    async verify() { throw new Error('Full verification reached after clarification.'); },
  });
  await backend.start(project.id);
  const done = backend.active.get(project.id).done;
  await Promise.race([waiting.promise, done.then(() => assert.fail(project.error))]);
  const [{ id, runId }] = project.conversation.questions;
  assert.equal(disposed, 1);
  assert.equal(sessions(), 1);
  assert.equal(prompts.length, 1);
  assert.equal(project.stages.find(stage => stage.id === 'plan').status, 'active');
  await broker.answer(project.id, id, { selectedOptions: ['Supervisor approval'], text: 'Warehouse leads can approve too' });
  await done;
  assert.equal(project.runId, runId);
  assert.equal(project.conversation.questions[0].status, 'answered');
  assert.equal(sessions(), 2);
  assert.equal(prompts.length, 3);
  assert.equal(project.error, 'Full verification reached after clarification.');
});

test('Stop closes a pending planning question and Resume waits for the saved question', async t => {
  let waiting = Promise.withResolvers();
  const { project, backend, broker, sessions } = await fixture(t, {
    clarify: true,
    notify(project) { if (project.conversation?.questions.some(item => item.status === 'pending')) waiting.resolve(); },
    async prompt(text, cwd, _truncate, call) {
      if (text.includes(planTurn) && !text.includes('User clarification answers for this run')) {
        await call('fleet_request_clarification', { questions: [{ question: 'Which calendar?', context: 'Choose the source.' }] });
      } else if (!text.includes(planTurn)) {
        await writeFiles(cwd, runtimeFiles);
      }
    },
    async verify() { throw new Error('Full verification reached after resume.'); },
  });
  await backend.start(project.id);
  await Promise.race([waiting.promise, backend.active.get(project.id).done.then(() => assert.fail(project.error))]);
  const [question] = project.conversation.questions;
  await backend.stop(project.id);
  assert.equal(project.status, 'stopped');
  assert.equal(question.status, 'cancelled');
  await assert.rejects(broker.answer(project.id, question.id, 'Operations'), /no longer waiting/);
  waiting = Promise.withResolvers();
  await backend.resume(project.id);
  const done = backend.active.get(project.id).done;
  await Promise.race([waiting.promise, done.then(() => assert.fail(project.error))]);
  assert.equal(question.status, 'pending');
  assert.equal(sessions(), 1);
  await broker.answer(project.id, question.id, 'Operations calendar');
  await done;
  assert.equal(project.runId, question.runId);
  assert.equal(project.error, 'Full verification reached after resume.');
});

test('Resume recovers a saved clarification file from before the checkpoint write', async t => {
  const waiting = Promise.withResolvers();
  const { project, store, backend } = await fixture(t, {
    clarify: true,
    notify(project) { if (project.conversation?.questions.some(item => item.status === 'pending')) waiting.resolve(); },
    async prompt(text, cwd, _truncate, call) {
      if (text.includes(planTurn) && !text.includes('User clarification answers for this run')) {
        await call('fleet_request_clarification', { questions: [{ question: 'Which calendar?', context: 'Choose the source.' }] });
      } else if (!text.includes(planTurn)) {
        await writeFiles(cwd, runtimeFiles);
      }
    },
    async verify() { throw new Error('Full verification reached after checkpoint recovery.'); },
  });
  await backend.start(project.id);
  await Promise.race([waiting.promise, backend.active.get(project.id).done.then(() => assert.fail(project.error))]);
  await backend.stop(project.id);
  const [question] = project.conversation.questions;
  Object.assign(question, { status: 'answered', answer: 'Operations calendar', response: { selectedOptions: [], text: 'Operations calendar' } });
  await store.save();
  const file = path.join(project.workspace, 'clarifications.json');
  await writeFile(file, '{}');
  await assert.rejects(backend.resume(project.id), /saved brief or source changed/);
  await writeFile(file, JSON.stringify({ runId: project.runId, questions: [question] }, null, 2));
  await backend.resume(project.id);
  await backend.active.get(project.id).done;
  assert.equal(project.error, 'Full verification reached after checkpoint recovery.');
});

test('an omitted preview tool call still reaches full verification in the same build', async t => {
  const { project, run, prompts } = await fixture(t, {
    async prompt(text, cwd) {
      if (text.includes(previewTurn)) await writeFiles(cwd, { ...runtimeFiles, 'app.test.cjs': appTest });
    },
    async checkBuildPreview() { assert.fail('No diagnostic check should run without a tool call.'); },
    async verify() { throw new Error('Full host verification reached without a preview.'); },
  });
  await run();
  assert.equal(prompts.length, 2);
  assert.equal(project.inProgressPreview, undefined);
  assert.equal(project.inProgressPlan, undefined);
  assert.equal(project.error, 'Full host verification reached without a preview.');
});

test('an integrity failure during the tool call still stops the build if the backend returns it to the agent', async t => {
  const { project, run } = await fixture(t, {
    async prompt(text, cwd, _truncate, call) {
      if (!text.includes(previewTurn)) return;
      await writeFiles(cwd, runtimeFiles);
      const spec = path.join(cwd, 'ux-spec.json');
      const originalSpec = await readFile(spec, 'utf8');
      await writeFile(spec, originalSpec + '\n');
      await assert.rejects(call('check_preview'), /changed after planning/);
      await writeFile(spec, originalSpec);
    },
    async checkBuildPreview() { assert.fail('Changing the frozen contract must prevent the browser check.'); },
    async verify() { assert.fail('Changing the frozen contract must prevent full verification.'); },
  });
  await run();
  assert.equal(project.status, 'failed');
  assert.equal(project.report, undefined);
  assert.match(project.error, /changed after planning/);
});

test('failed early checks stay private and a final repair reruns the first observed browser failure', async t => {
  const flow = [];
  let verifies = 0;
  const { project, run, prompts } = await fixture(t, {
    notify(project) { if (project.inProgressPreview) flow.push('unexpected preview'); },
    async prompt(text, cwd, truncate, call) {
      if (text.includes(planTurn)) {
        flow.push('plan');
      } else if (text.includes(previewTurn)) {
        flow.push('slice');
        await writeFiles(cwd, runtimeFiles);
        truncate();
      } else if (text.includes('previous response was cut off')) {
        flow.push('continue slice');
        assert.equal(await readFile(path.join(cwd, 'index.html'), 'utf8'), qualityFixtureHtml);
        const failed = await call('check_preview');
        assert.equal(failed.isError, true);
        assert.match(failed.content[0].text, /Fixture browser could not reach the saved result/);
        flow.push('slice repair');
        assert.equal((await call('check_preview')).isError, true);
        flow.push('remaining');
      } else if (text.startsWith(finalRepair)) {
        flow.push('full repair');
        assert.equal((await call('check_preview')).isError, true);
      }
    },
    async checkBuildPreview(_root, _executable, contract, journeyId, _signal, viewport = 'desktop') {
      flow.push(`check ${journeyId}/${viewport}`);
      assert.deepEqual(contract.plan.journeys.map(journey => journey.id), ['parse-task', 'recover-empty']);
      return { passed: journeyId === 'recover-empty', detail: 'Fixture browser could not reach the saved result.' };
    },
    async verify() {
      flow.push('verify');
      if (++verifies === 2) throw new Error('Full verification reached again');
      return { ...failedReport, quality: { journeys: [
        { id: 'parse-task', viewport: 'desktop', status: 'passed' },
        { id: 'parse-task', viewport: 'narrow', status: 'failed', detail: 'Not executed: fixture could not start.' },
        { id: 'recover-empty', viewport: 'desktop', status: 'passed' },
        { id: 'recover-empty', viewport: 'narrow', status: 'failed', detail: 'Step 4: expected a recovery message.' },
      ] } };
    },
  });

  await run();
  assert.deepEqual(flow, ['plan', 'slice', 'continue slice', 'check parse-task/desktop', 'slice repair', 'check parse-task/desktop',
    'remaining', 'verify', 'full repair', 'check recover-empty/narrow', 'verify']);
  assert.match(prompts.find(text => text.startsWith(finalRepair)), /recover-empty \(narrow\): Step 4/);
  assert.equal(project.runCheckpoint.repairAttempts, 1);
  assert.equal(project.error, 'Full verification reached again');
});

test('the first preview repair reports real asset 404s from the prefixed browser package', { timeout: 45_000 }, async t => {
  const html = prefix => qualityFixtureHtml.replace('<textarea id="message"', '<textarea id="message" hidden')
    .replace('</head>', `<link rel="stylesheet" href="${prefix}panel.css"><script type="module" src="${prefix}setup.mjs?testMarker=omit-this"></script></head>`);
  const { project, run, prompts } = await fixture(t, {
    plan(ids) {
      const plan = structuredSolutionFixture(ids);
      const contract = JSON.parse(plan['solution-contract.json']);
      contract.runtime.files.push('panel.css', 'setup.mjs');
      plan['solution-contract.json'] = JSON.stringify(contract);
      return plan;
    },
    async prompt(text, cwd, _truncate, call) {
      if (text.includes(previewTurn)) {
        assert.match(text, /Use app-relative URLs/);
        await writeFiles(cwd, {
          ...runtimeFiles, 'index.html': html('/'),
          'panel.css': 'button { cursor: pointer; }',
          'setup.mjs': "document.querySelector('#message').hidden = false;",
        });
        const failed = await call('check_preview');
        assert.equal(failed.isError, true);
        assert.equal(project.inProgressPreview, undefined);
        const detail = failed.content[0].text;
        assert.match(detail, /Expected the application to load\. Observed HTTP 404/);
        assert.match(detail, /HTTP 404 loading script "\/setup\.mjs"/);
        assert.match(detail, /HTTP 404 loading stylesheet "\/panel\.css"/);
        assert.match(detail, /Use an app-relative asset URL/);
        assert.doesNotMatch(detail, /omit-this|Browser step exceeded/);
        await writeFile(path.join(cwd, 'index.html'), html('./'));
        assert.equal((await call('check_preview')).isError, false);
        assert.ok(project.inProgressPreview, 'The relative asset paths allow the checked preview to open.');
        await writeFile(path.join(cwd, 'app.test.cjs'), appTest);
      }
    },
  });

  await run();
  assert.equal(project.status, 'review', project.error);
  assert.equal(prompts.length, 2);
  assert.equal(project.runCheckpoint.repairAttempts, 0);
  assert.equal(reportPassed(project.report, 2), true);
});

test('stopping during the preview check invalidates a late pass and removes its snapshot', async t => {
  const checking = Promise.withResolvers();
  const finished = Promise.withResolvers();
  const flow = [];
  const { project, backend } = await fixture(t, {
    notify(project) { if (project.inProgressPreview) flow.push('unexpected preview'); },
    async prompt(text, cwd, _truncate, call) {
      if (text.includes(previewTurn)) {
        await writeFiles(cwd, runtimeFiles);
        const check = call('check_preview');
        const concurrent = await call('check_preview');
        assert.equal(concurrent.isError, true);
        assert.match(concurrent.content[0].text, /active host check/);
        await check;
        flow.push('unexpected build continuation');
      }
    },
    async checkBuildPreview(snapshot, _executable, _contract, _journeyId, signal) {
      checking.resolve({ snapshot, signal });
      await finished.promise;
      return { passed: true, detail: 'Fixture completed after Stop.' };
    },
    async verify() { flow.push('unexpected verification'); },
  });

  await backend.start(project.id);
  const done = backend.active.get(project.id)?.done;
  try {
    const { snapshot, signal } = await Promise.race([checking.promise, done.then(() => assert.fail(project.error))]);
    assert.equal(backend.inProgressPreview(project.id), undefined);
    const stopped = backend.stop(project.id);
    assert.equal(signal.aborted, true);
    finished.resolve();
    await stopped;
    assert.equal(project.status, 'stopped');
    assert.equal(project.inProgressPreview, undefined);
    assert.equal(backend.inProgressPreview(project.id), undefined);
    await assert.rejects(access(snapshot), { code: 'ENOENT' });
    assert.deepEqual(flow, []);
  } finally { finished.resolve(); }
});
