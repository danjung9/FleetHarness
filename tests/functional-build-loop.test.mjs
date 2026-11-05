import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Store, newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { PiBackend } from '../dist-electron/electron/pi-backend.js';
import { readRunCheckpoint } from '../dist-electron/electron/run-checkpoint.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { qualityFixtureHtml } from '../scripts/quality-fixture.mjs';
import { structuredSolutionFixture, solutionFixtureEvaluator } from '../scripts/solution-fixture.mjs';
import { completeFixtureUiFlow, completeFixtureVisualReview } from '../scripts/visual-review-fixture.mjs';
import { createFixturePlanningReviewSession } from '../scripts/planning-review-fixture.mjs';

const digest = body => createHash('sha256').update(body).digest('hex');
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const frozenFiles = ['requirements.md', 'solution-contract.json', 'acceptance-plan.json', 'ux-spec.json', 'foundation-plan.json', '.fleet/packet.json'];
const disconnected = qualityFixtureHtml.replace('result.textContent=task;', "result.textContent='Disconnected interface';");
const wrongCore = qualityFixtureHtml.replace("return text.startsWith('TASK: ')?text.slice(6):null;", "return 'Incorrect computation';");
const wrongFinal = cases => qualityFixtureHtml.replace("function parseTask(text){", `function parseTask(text){if(${JSON.stringify(cases)}.includes(text))return 'Final computation defect';`);
const coreWrapper = String.raw`const fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('index.html','utf8').match(/\/\* CORE_START \*\/([\s\S]*?)\/\* CORE_END \*\//)?.[1];
if(!code)throw new Error('Delivered parser missing');exports.parse=vm.runInNewContext(code+';parseTask',{}, {timeout:1000});`;
const developerTests = String.raw`const test=require('node:test'),assert=require('node:assert/strict'),{parse}=require('./core.cjs');
test('extract pump',()=>assert.equal(parse('TASK: inspect pump'),'inspect pump'));
test('extract valve',()=>assert.equal(parse('TASK: close valve'),'close valve'));
test('reject non-task',()=>assert.equal(parse('STATUS: ready'),null));
test('empty input',()=>assert.equal(parse(''),null));`;
const guide = '# Task parser\n\nOpen index.html in a browser. Enter TASK: inspect pump in Message and select Parse message. The result is inspect pump and persists after reload. Empty input shows Enter a message; enter a task and press Enter on the button to recover. Data stays in localStorage. No service or credentials are required. For developer verification install Node and run `node --test app.test.cjs`; it evaluates the actual inline parser used by the UI. The synthetic examples establish only the described parser behavior. See verification.md and path-to-fleet.md for limitations.\n';
const exists = file => fs.stat(file).then(() => true, () => false);
const writeFiles = async (root, files) => {
  for (const [file, body] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), body);
  }
};
const promptStep = text => text.startsWith('Implementation is complete.') ? 'guide'
  : text.startsWith('Implement the first complete user workflow now:') ? 'workflow'
  : text.startsWith('The primary user workflow checkpoint failed.') ? 'workflow-repair'
  : text.startsWith('The independent core evaluation failed.') ? 'core-repair'
  : text.includes('The independent test run failed.') ? 'final-repair'
  : text.includes('You are the implementation agent') ? 'build'
  : text.includes('You are the verification agent') ? 'verify'
  : text.includes('You are the intake agent') ? 'intake'
  : text.includes('You are the research agent') ? 'research' : undefined;

async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-functional-build-'));
  const store = new Store(root); await store.init();
  const project = newProject({ title: 'Local task parser', description: 'Parse TASK: messages in a browser, save the last result and recover from empty input.',
    criteria: ['Display the parsed task and retain it after reload.'] });
  project.dataInputs = [{ name: 'message.txt', kind: 'text', content: 'TASK: inspect pump' }];
  store.state.projects = [project]; store.state.settings = { provider: 'fixture', model: 'fixture', rememberKey: false };
  const steps = [], failures = [], reports = [], backends = [];
  const frozen = new Map(); let evaluationBody, initialBuilds = 0, workflowRepairs = 0, finalRepairs = 0, resumedEvidence;
  const readCheckpoint = () => readRunCheckpoint(root, project);
  const assertFrozen = async cwd => {
    for (const name of frozenFiles) {
      const body = await fs.readFile(path.join(cwd, name), 'utf8');
      if (!frozen.has(name)) frozen.set(name, body);
      else assert.equal(body, frozen.get(name), `${name} must retain its frozen bytes.`);
    }
    const saved = await readCheckpoint();
    evaluationBody ??= saved.quality.evaluationBody;
    assert.equal(saved.quality.evaluationBody, evaluationBody);
  };
  const createSession = async ({ cwd, customTools, tools }) => {
    if (customTools.some(tool => tool.name === 'fleet_submit_planning_review')) return { session: createFixturePlanningReviewSession(customTools) };
    if (tools.includes('judge_read')) {
      const listeners = new Set();
      const read = async name => {
        let text = '', offset = 0;
        do {
          const page = JSON.parse((await customTools[0].execute('judge', { path: name, offset })).content[0].text);
          text += page.text; offset = page.nextOffset;
        } while (offset !== null);
        return text;
      };
      return { session: {
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        async prompt() {
          await read('requirements.md'); await read('test-report.json');
          const contract = JSON.parse(await read('solution-contract.json'));
          for (const file of contract.runtime.files) await read(file);
          for (const listener of listeners) listener({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop',
            content: [{ type: 'text', text: JSON.stringify({ verdict: 'SATISFACTORY', gaps: [] }) }] } });
        }, abort() {}, dispose() { listeners.clear(); }
      } };
    }
    const listeners = new Set();
    const emit = event => { for (const listener of listeners) listener(event); };
    const session = {
      step: undefined,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      async prompt(text) {
        this.step = promptStep(text) ?? this.step ?? 'plan';
        const step = this.step; steps.push(step); emit({ type: 'turn_start' });
        if (['build', 'core-repair', 'workflow', 'workflow-repair', 'guide', 'verify', 'final-repair'].includes(step)) await assertFrozen(cwd);
        if (['build', 'core-repair', 'workflow', 'workflow-repair'].includes(step)) {
          assert.equal(await exists(path.join(cwd, 'application-expanded.marker')), false, 'Application expansion cannot precede the independent primary checkpoint.');
          assert.equal(await exists(path.join(cwd, 'README.md')), false, 'The final guide must wait for the primary checkpoint.');
        }
        if (step === 'intake') await writeFiles(cwd, { 'scope.md': 'Parse supplied task messages locally and preserve the last successful result.' });
        else if (step === 'research') await writeFiles(cwd, { 'research.md': 'A pure prefix parser and localStorage implement the specified task workflow.' });
        else if (step === 'plan') {
          const ids = JSON.parse(await fs.readFile(path.join(cwd, '.fleet/packet.json'), 'utf8')).acceptance.map(item => item.id);
          await writeFiles(cwd, { ...structuredSolutionFixture(ids), 'plan.md': 'Implement the shared parser, connect the primary browser flow, then complete recovery and documentation.',
            'test-matrix.md': 'Independent parser cases; primary save/reload journey; empty-input recovery at desktop and narrow widths.' });
          await customTools.find(tool => tool.name === 'fleet_system_design').execute('design', {
            title: 'Task parser', description: 'One parser shared by the interface, runtime adapter and developer tests.',
            components: [{ id: 'parser', label: 'Parser', description: 'Parse and retain task messages.', kind: 'logic', files: ['index.html', 'core.cjs', 'evaluate.cjs'] }], connections: []
          });
        } else if (step === 'build') {
          initialBuilds++;
          if (initialBuilds > 1 && options.expectedResumeBody) {
            resumedEvidence = await fs.readFile(path.join(cwd, '.quality-evidence/workflow-report.json'), 'utf8');
            assert.equal(resumedEvidence, options.expectedResumeBody, 'The host must restore its private report before the resumed agent reads evidence.');
          }
          if (initialBuilds === 1) await writeFiles(cwd, {
            'index.html': options.brokenCore === false ? disconnected : wrongCore,
            'core.cjs': coreWrapper, 'evaluate.cjs': solutionFixtureEvaluator, 'app.test.cjs': developerTests,
            'path-to-fleet.md': 'Synthetic local fixture. Operational formats and field acceptance need independent review.'
          });
        } else if (step === 'core-repair') {
          const saved = await readCheckpoint(), report = JSON.parse(await fs.readFile(path.join(cwd, '.quality-evidence/core-report.json'), 'utf8'));
          assert.equal(saved.functionalRepair.active.gate, 'core'); assert.equal(saved.functionalRepair.gates.core.attempts, 1);
          assert.equal(report.status, 'failed'); failures.push({ gate: 'core', report });
          await fs.writeFile(path.join(cwd, 'index.html'), disconnected);
        } else if (step === 'workflow') {
          const saved = await readCheckpoint();
          assert.ok(saved.coreReportHash); assert.equal(saved.workflowReportHash === undefined || initialBuilds > 1, true);
          // Deliberately leave the disconnected UI for the independent host gate.
          if (options.discoverOnRepairOnly) await fs.writeFile(path.join(cwd, 'index.html'), qualityFixtureHtml);
        } else if (step === 'workflow-repair') {
          workflowRepairs++;
          const saved = await readCheckpoint(), report = JSON.parse(await fs.readFile(path.join(cwd, '.quality-evidence/workflow-report.json'), 'utf8'));
          assert.equal(saved.functionalRepair.active.gate, 'workflow');
          assert.equal(saved.functionalRepair.gates.workflow.attempts, workflowRepairs);
          assert.equal(report.status, 'failed'); assert.equal(report.journeys.length, 2);
          assert.ok(report.journeys.every(journey => journey.status === (options.discoverOnRepairOnly ? 'passed' : 'failed')));
          if (options.discoverOnRepairOnly) assert.ok(report.uiFlow.errors.length, 'Passing scripts cannot replace actual UI exploration.');
          failures.push({ gate: 'workflow', report });
          await options.onWorkflowRepair?.({ attempt: workflowRepairs, cwd });
          if (options.interruptWorkflowOnce && workflowRepairs === 1) {
            await fs.writeFile(path.join(cwd, 'partial-repair.md'), 'Interrupted repair work must survive resume.');
            throw new Error('Fixture interrupted the first reserved workflow repair.');
          }
          if (!options.unchangedWorkflow) await fs.writeFile(path.join(cwd, 'index.html'), qualityFixtureHtml);
        } else if (step === 'guide') {
          const saved = await readCheckpoint(), body = await fs.readFile(path.join(cwd, '.quality-evidence/workflow-report.json'), 'utf8'), report = JSON.parse(body);
          assert.equal(digest(body), saved.workflowReportHash); assert.equal(report.status, 'passed');
          assert.deepEqual(report.journeys.map(journey => [journey.viewport, journey.status]), [['desktop', 'passed'], ['narrow', 'passed']]);
          reports.push(report);
          await writeFiles(cwd, { 'README.md': guide, 'application-expanded.marker': 'Only written after the independent primary checkpoint passed.' });
        } else if (step === 'verify') {
          if (options.finalDefects) await fs.writeFile(path.join(cwd, 'index.html'), wrongFinal(['STATUS: ready', 'TASK: close valve']));
          await writeFiles(cwd, { 'verification.md': 'Developer tests invoke the actual UI parser. Independent host cases and browser journeys must pass before review.' });
        } else if (step === 'final-repair') {
          finalRepairs++;
          const saved = await readCheckpoint(), report = JSON.parse(await fs.readFile(path.join(cwd, 'test-report.json'), 'utf8'));
          assert.equal(saved.functionalRepair.active.gate, 'final');
          assert.equal(saved.functionalRepair.gates.final.attempts, finalRepairs);
          assert.equal(reportPassed(report, true), false);
          assert.equal(report.quality.solutionEvaluation.status, 'failed');
          assert.ok(report.failed > 0); failures.push({ gate: 'final', report });
          await fs.writeFile(path.join(cwd, 'index.html'), finalRepairs === 1 ? wrongFinal(['STATUS: ready']) : qualityFixtureHtml);
          await fs.writeFile(path.join(cwd, 'verification.md'), 'Repaired the actual shared parser; rerun all independent tests and browser acceptance before review.');
        }
        if (['build', 'core-repair', 'workflow', 'workflow-repair', 'guide', 'verify', 'final-repair'].includes(step)) {
          await customTools.find(tool => tool.name === 'fleet_component_progress').execute('progress', {
            componentId: 'parser', status: 'generated', detail: 'Shared implementation written; host verification determines correctness.'
          });
        }
        if (step === 'workflow-repair' || (step === 'workflow' && !options.discoverOnRepairOnly)) await completeFixtureUiFlow(customTools, { emit });
        if (['guide', 'verify', 'final-repair'].includes(step)) await completeFixtureVisualReview(customTools, { emit });
        emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } }); emit({ type: 'turn_end' });
      },
      async abort() {}, dispose() { listeners.clear(); }
    };
    return { session };
  };
  const makeBackend = () => {
    const backend = new PiBackend(store, process.execPath, () => {}, path.resolve('.'), {
      createSession, agentLimits: { idleMs: 15_000, timeoutMs: 45_000 },
      verificationLimits: { browserTimeoutMs: 20_000, browserStepTimeoutMs: 500 }
    });
    backend.runtime = { getModel: () => ({ input: ['text', 'image'] }), hasConfiguredAuth: () => true };
    backends.push(backend); return backend;
  };
  const backend = makeBackend();
  t.after(async () => { await Promise.all(backends.map(item => item.stopAll())); await fs.rm(root, { recursive: true, force: true }); });
  const settle = async backend => { await backend.active.get(project.id)?.done; };
  return { root, store, project, backend, options, steps, failures, reports, frozen, readCheckpoint, makeBackend, settle,
    get resumedEvidence() { return resumedEvidence; },
    run: async () => { await backend.start(project.id); await settle(backend); } };
}

test('real application traverses independent core, primary workflow and final repair gates before review', { timeout: 90_000 }, async t => {
  const h = await fixture(t, { finalDefects: true }); await h.run();
  assert.equal(h.project.status, 'review', h.project.error);
  assert.deepEqual(h.steps, ['intake', 'research', 'plan', 'build', 'core-repair', 'workflow', 'workflow-repair', 'guide', 'verify', 'final-repair', 'final-repair']);
  assert.deepEqual(h.failures.map(item => item.gate), ['core', 'workflow', 'final', 'final']);
  assert.ok(h.failures[1].report.journeys.every(journey => journey.completedSteps < journey.totalSteps));
  assert.ok(h.failures[3].report.failed < h.failures[2].report.failed, 'The second final retry requires independently measured progress.');
  const saved = await h.readCheckpoint();
  assert.deepEqual(Object.values(saved.functionalRepair.gates).map(gate => gate.attempts), [1, 1, 2]);
  assert.equal(saved.functionalRepair.active, undefined);
  assert.equal(reportPassed(h.project.report, 3), true);
  assert.equal(h.project.report.sourceHash, await sourceHash(h.project.workspace));
  const quality = h.project.report.quality;
  assert.equal(quality.package.cleanCopy, true); assert.equal(quality.package.filesHash, quality.solutionEvaluation.runtime.filesHash);
  assert.equal(quality.contractHash, h.reports[0].contractHash); assert.equal(quality.package.filesHash, h.reports[0].filesHash);
  assert.deepEqual(h.reports[0].uiFlow.errors, [], 'The early checkpoint requires observed Playwright flow at both widths.');
  assert.equal(quality.journeys.length, 4); assert.ok(quality.journeys.every(journey => journey.status === 'passed'));
  for (const [name, body] of h.frozen) assert.equal(await fs.readFile(path.join(h.project.workspace, name), 'utf8'), body);
  await assert.rejects(fs.access(path.join(h.project.workspace, 'evaluation-plan.json')), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(h.root, 'evaluations', h.project.runId + '.json'), 'utf8'), saved.quality.evaluationBody);
  assert.equal(h.project.runCheckpoint.coreRepairAttempts, 1);
  assert.equal(h.project.runCheckpoint.repairAttempts, 2);
  assert.ok(h.project.report.testBaseline.hashes['app.test.cjs']);
});

test('passing frozen journeys cannot advance the primary gate until Playwright discovers the UI flow', { timeout: 90_000 }, async t => {
  const h = await fixture(t, { brokenCore: false, discoverOnRepairOnly: true }); await h.run();
  assert.equal(h.project.status, 'review', h.project.error);
  const failures = h.failures.filter(item => item.gate === 'workflow');
  assert.equal(failures.length, 1);
  assert.ok(failures[0].report.journeys.every(journey => journey.status === 'passed'));
  assert.ok(failures[0].report.uiFlow.errors.length);
  assert.equal(h.reports[0].filesHash, failures[0].report.filesHash, 'The repair supplies missing real exploration without changing the already-working application.');
  assert.deepEqual(h.reports[0].uiFlow.errors, []);
  assert.equal((await h.readCheckpoint()).functionalRepair.gates.workflow.attempts, 1);
  assert.ok(h.steps.indexOf('workflow-repair') < h.steps.indexOf('guide'));
});

test('resume preserves workflow reservations and restores tampered diagnostic evidence before model work', { timeout: 90_000 }, async t => {
  const h = await fixture(t, { brokenCore: false, interruptWorkflowOnce: true }); await h.run();
  assert.equal(h.project.status, 'failed'); assert.match(h.project.logs.filter(log => log.kind === 'error').map(log => log.text).join('\n'), /interrupted the first reserved workflow repair/);
  assert.equal(h.project.resumeStage, 'build'); assert.equal(h.steps.includes('guide'), false);
  const before = await h.readCheckpoint(), { runId, workspace } = h.project;
  assert.equal(before.functionalRepair.gates.workflow.attempts, 1); assert.equal(before.functionalRepair.active, undefined);
  const body = await fs.readFile(path.join(h.root, 'workflow-reports', before.workflowReportHash + '.json'), 'utf8');
  h.options.expectedResumeBody = body;
  await fs.writeFile(path.join(workspace, '.quality-evidence/workflow-report.json'), JSON.stringify({ status: 'passed', journeys: [], invented: true }));
  const replacement = h.makeBackend(); await replacement.resume(h.project.id); await h.settle(replacement);
  assert.equal(h.resumedEvidence, body);
  assert.equal(h.project.status, 'review', h.project.error); assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.equal(await fs.readFile(path.join(workspace, 'partial-repair.md'), 'utf8'), 'Interrupted repair work must survive resume.');
  const after = await h.readCheckpoint();
  assert.equal(after.functionalRepair.gates.workflow.attempts, 2);
  assert.ok(after.functionalRepair.gates.workflow.consumedMs >= before.functionalRepair.gates.workflow.consumedMs);
  assert.equal(after.functionalRepair.gates.final.attempts, 0); assert.equal(reportPassed(h.project.report, 3), true);
});

test('unchanged primary failures stop expansion after two repairs and resume cannot reset the allowance', { timeout: 90_000 }, async t => {
  const h = await fixture(t, { brokenCore: false, unchangedWorkflow: true }); await h.run();
  assert.equal(h.project.status, 'failed'); assert.match(h.project.logs.filter(log => log.kind === 'error').map(log => log.text).join('\n'), /workflow repair stopped: no-progress/);
  const before = await h.readCheckpoint();
  assert.equal(before.functionalRepair.gates.workflow.attempts, 2); assert.equal(before.functionalRepair.gates.workflow.noProgress, 2);
  assert.equal(before.functionalRepair.gates.final.attempts, 0);
  assert.equal(h.steps.filter(step => step === 'workflow-repair').length, 2);
  assert.equal(h.steps.includes('guide'), false); assert.equal(h.steps.includes('verify'), false);
  assert.equal(await exists(path.join(h.project.workspace, 'README.md')), false);
  const replacement = h.makeBackend(); await replacement.resume(h.project.id); await h.settle(replacement);
  assert.equal(h.project.status, 'failed'); assert.match(h.project.logs.filter(log => log.kind === 'error').map(log => log.text).join('\n'), /workflow repair stopped: no-progress/);
  assert.equal((await h.readCheckpoint()).functionalRepair.gates.workflow.attempts, 2);
  assert.equal(h.steps.filter(step => step === 'workflow-repair').length, 2);
  assert.equal(h.steps.includes('guide'), false); assert.equal(h.steps.includes('verify'), false);
});

test('Stop settles a hanging repair and its late completion cannot overwrite the resumed checkpoint', { timeout: 90_000 }, async t => {
  const entered = deferred(), release = deferred(), lateSettled = deferred();
  const h = await fixture(t, { brokenCore: false, onWorkflowRepair: async ({ attempt }) => {
    if (attempt !== 1) return;
    entered.resolve(); await release.promise; lateSettled.resolve();
    throw new Error('Cancelled fixture provider settled after a replacement run.');
  } });
  t.after(() => release.resolve());
  await h.backend.start(h.project.id); await entered.promise;
  await h.backend.stop(h.project.id);
  assert.equal(h.project.status, 'stopped');
  const stopped = await h.readCheckpoint();
  assert.equal(stopped.functionalRepair.active, undefined, 'A clean Stop must settle even when the provider prompt does not settle.');
  assert.equal(stopped.functionalRepair.gates.workflow.attempts, 1);
  assert.ok(stopped.functionalRepair.gates.workflow.consumedMs < 900_000, 'Clean Stop charges actual active time, not the entire interrupted allowance.');
  const replacement = h.makeBackend(); await replacement.resume(h.project.id); await h.settle(replacement);
  assert.equal(h.project.status, 'review', h.project.error);
  assert.equal((await h.readCheckpoint()).functionalRepair.gates.workflow.attempts, 2);
  const checkpointFile = path.join(h.root, 'run-checkpoints', h.project.runId + '.json');
  const completed = await fs.readFile(checkpointFile, 'utf8'), projection = structuredClone(h.project);
  release.resolve(); await lateSettled.promise; await delay(100);
  assert.equal(await fs.readFile(checkpointFile, 'utf8'), completed, 'Late cleanup must not replace the newer private checkpoint.');
  assert.deepEqual(h.project, projection, 'Late cleanup must not change the completed projection.');
});
