import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { AppBuilder } from '../dist-electron/electron/app-builder.js';
import { RunProcessSweep } from '../dist-electron/electron/process-sweep.js';
import { ApplicationPreviews } from '../dist-electron/electron/solution-preview.js';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { cliFixtureProject, qualityFixtureHtml, qualityFixtureProject } from '../scripts/quality-fixture.mjs';
import { cliSolutionFixture, solutionFixtureEvaluator, structuredSolutionFixture } from '../scripts/solution-fixture.mjs';

const previewTurn = 'Implement the first preview workflow';
const previewRepair = 'The first preview workflow check failed.';
const finalRepair = 'Host verification failed';

async function writeFiles(cwd, files) {
  for (const [name, body] of Object.entries(files)) await writeFile(path.join(cwd, name), body);
}

async function fixture(t, { brief = qualityFixtureProject, plan = structuredSolutionFixture, prompt, notify = () => {}, ...options }) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'appyard-continuation-'));
  const store = new Store(root);
  await store.init();
  const project = newProject(brief);
  store.state.projects.push(project);
  Object.assign(store.state.settings, { backend: 'codex', provider: 'fixture', model: 'fixture' });

  const prompts = [];
  let sessions = 0;
  const backend = new AppBuilder(store, process.execPath, () => notify(project), process.cwd(), {
    codex: { async refresh() {}, models: [{ id: 'fixture', configured: true }] },
    async closeInProgressPreview() {},
    createCodexSession: async ({ cwd }) => {
      sessions++;
      let observe;
      return {
        subscribe(listener) { observe = listener; return () => { observe = undefined; }; },
        async prompt(text) {
          prompts.push(text);
          if (text.includes('Stop after planning')) {
            const packet = JSON.parse(await readFile(path.join(cwd, '.fleet', 'packet.json'), 'utf8'));
            await writeFiles(cwd, plan(packet.acceptance.map(criterion => criterion.id)));
          }
          await prompt(text, cwd, () => observe({ type: 'message_end', message: { role: 'assistant', stopReason: 'length' } }));
        },
        async abort() {},
        async dispose() {},
      };
    },
    ...options,
  });
  t.after(async () => {
    await backend.stopAll();
    await rm(root, { recursive: true, force: true });
  });
  return { project, backend, prompts, sessions: () => sessions,
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

test('a real first workflow preview opens during the build and full evidence still gates review', { timeout: 45_000 }, async t => {
  const flow = [];
  let snapshot, previewUrl, tokenAt, openAt, reviewAt;
  const previews = new ApplicationPreviews(process.execPath);
  t.after(() => previews.close());
  const sweep = new RunProcessSweep();
  const stop = sweep.stop.bind(sweep);
  t.mock.method(sweep, 'stop', async () => { await stop(); flow.push('cleanup'); });
  const { project, backend, run, prompts, sessions } = await fixture(t, {
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
    async prompt(text, cwd) {
      if (text.includes('Stop after planning')) {
        flow.push('plan');
      } else if (text.startsWith(previewTurn)) {
        flow.push('slice');
        assert.match(text, /parse-task/);
        await writeFiles(cwd, { ...runtimeFiles, 'index.html': previewHtml, 'agent-notes.txt': 'Private workspace notes.' });
      } else {
        flow.push('remaining');
        assert.match(text, /Implement the complete application/);
        assert.equal(project.status, 'running');
        assert.equal(project.report, undefined);
        assert.equal(project.verification, undefined);
        assert.ok(project.inProgressPreview);
        snapshot = backend.inProgressPreview(project.id);
        assert.ok(snapshot);
        assert.notEqual(snapshot, cwd);
        previewUrl = await previews.url(snapshot);
        const response = await fetch(previewUrl, { headers: { connection: 'close' } });
        assert.equal(response.status, 200);
        assert.equal(await response.text(), previewHtml);
        openAt = performance.now();
        await assert.rejects(access(path.join(snapshot, 'agent-notes.txt')), { code: 'ENOENT' });
        await assert.rejects(access(path.join(snapshot, 'evaluation-plan.json')), { code: 'ENOENT' });
        await writeFiles(cwd, { 'index.html': qualityFixtureHtml, 'app.test.cjs': appTest });
        assert.equal(await readFile(path.join(snapshot, 'index.html'), 'utf8'), previewHtml);
      }
    },
  });

  const start = performance.now();
  await run();
  assert.equal(project.status, 'review', project.error);
  assert.equal(sessions(), 1);
  assert.equal(prompts.length, 3);
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
  assert.equal(backend.inProgressPreview(project.id), undefined);
  assert.equal(previews.allows(previewUrl), false);
  await assert.rejects(access(snapshot), { code: 'ENOENT' });
});

test('failed early checks stay private and a final repair reruns the first observed browser failure', async t => {
  const flow = [];
  let verifies = 0;
  const { project, run, prompts } = await fixture(t, {
    notify(project) { if (project.inProgressPreview) flow.push('unexpected preview'); },
    async prompt(text, cwd, truncate) {
      if (text.includes('Stop after planning')) {
        flow.push('plan');
      } else if (text.startsWith(previewTurn)) {
        flow.push('slice');
        await writeFiles(cwd, runtimeFiles);
        truncate();
      } else if (text.includes('previous response was cut off')) {
        flow.push('continue slice');
        assert.equal(await readFile(path.join(cwd, 'index.html'), 'utf8'), qualityFixtureHtml);
      } else if (text.startsWith(previewRepair)) {
        flow.push('slice repair');
      } else if (text.startsWith(finalRepair)) {
        flow.push('full repair');
      } else {
        flow.push('remaining');
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
  assert.match(prompts.find(text => text.startsWith(previewRepair)), /Fixture browser could not reach the saved result/);
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
    async prompt(text, cwd) {
      if (text.startsWith(previewTurn)) {
        assert.match(text, /Use app-relative URLs/);
        await writeFiles(cwd, {
          ...runtimeFiles, 'index.html': html('/'),
          'panel.css': 'button { cursor: pointer; }',
          'setup.mjs': "document.querySelector('#message').hidden = false;",
        });
      } else if (text.startsWith(previewRepair)) {
        assert.equal(project.inProgressPreview, undefined);
        assert.match(text, /Expected the application to load\. Observed HTTP 404/);
        assert.match(text, /HTTP 404 loading script "\/setup\.mjs"/);
        assert.match(text, /HTTP 404 loading stylesheet "\/panel\.css"/);
        assert.match(text, /Use an app-relative asset URL/);
        assert.doesNotMatch(text, /omit-this|Browser step exceeded/);
        await writeFile(path.join(cwd, 'index.html'), html('./'));
      } else if (!text.includes('Stop after planning')) {
        assert.ok(project.inProgressPreview, 'The relative asset paths allow the checked preview to open.');
        await writeFile(path.join(cwd, 'app.test.cjs'), appTest);
      }
    },
  });

  await run();
  assert.equal(project.status, 'review', project.error);
  assert.equal(prompts.filter(text => text.startsWith(previewRepair)).length, 1);
  assert.equal(project.runCheckpoint.repairAttempts, 0);
  assert.equal(reportPassed(project.report, 2), true);
});

test('stopping during the preview check invalidates a late pass and removes its snapshot', async t => {
  const checking = Promise.withResolvers();
  const finished = Promise.withResolvers();
  const flow = [];
  const { project, backend } = await fixture(t, {
    notify(project) { if (project.inProgressPreview) flow.push('unexpected preview'); },
    async prompt(text, cwd) {
      if (text.startsWith(previewTurn)) await writeFiles(cwd, runtimeFiles);
      else if (!text.includes('Stop after planning')) flow.push('unexpected build continuation');
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
