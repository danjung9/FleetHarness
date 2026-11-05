import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { Store, newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { PiBackend } from '../dist-electron/electron/pi-backend.js';
import { reportPassed, verifyWorkspace } from '../dist-electron/electron/verification.js';
import { qualityFixture, qualityFixtureHtml, qualityFixtureProject } from '../scripts/quality-fixture.mjs';
import { RunProcessSweep, runProcessEnvironment } from '../dist-electron/electron/process-sweep.js';

import { solutionFixture, solutionFixtureEvaluator } from '../scripts/solution-fixture.mjs';
import { syntheticDataFiles } from '../scripts/data-fixture.mjs';
import { foundationRuntime } from '../dist-electron/harness/foundations.js';
import { ClarificationBroker } from '../dist-electron/electron/clarifications.js';
import { completeFixtureVisualReview } from '../scripts/visual-review-fixture.mjs';
import { verifyApplication } from '../dist-electron/electron/quality.js';

const resourcesRoot = path.resolve('.');
// Full functional workflows launch real Node tests and Chromium. Keep their
// scheduling allowance separate from deliberately short timeout/cancel limits.
const functionalTimeout = 60_000;
const workflowTimeout = functionalTimeout;
const never = () => new Promise(() => {});
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const stageOf = prompt => prompt.includes('The independent test run failed') || prompt.includes('repairing gaps from an independent') ? 'repair'
  : prompt.includes('You are the synthetic data agent') ? 'synthetic-data'
  : prompt.includes('You are the intake agent') ? 'intake'
  : prompt.includes('You are the research agent') ? 'research'
  : prompt.includes('You are the implementation agent') ? 'build'
  : prompt.includes('You are the verification agent') ? 'verify' : 'plan';
// Scripted fixtures opt in explicitly. Production retains the native sandbox.
function plainLauncher(_root, executable, args) {
  const ready = 'synthetic-verification-ready\n';
  const bootstrap = `process.stdout.write(${JSON.stringify(ready)});const child=require('node:child_process').spawn(process.execPath,${JSON.stringify(args)},{stdio:'inherit'});child.once('error',e=>{console.error(e.code);process.exitCode=1});child.once('exit',code=>{process.exitCode=code??1});`;
  return { runner: executable, args: ['--input-type=commonjs', '-e', bootstrap], ready, command: 'plain Node test launcher' };
}
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
  store.state.projects[0] = newProject(options.project ?? qualityFixtureProject);
  store.state.settings = { provider: 'fixture', model: 'fixture', rememberKey: false, ...options.settings };
  const project = store.state.projects[0], sessions = [], judgeSessions = [], snapshots = [];
  const broker = options.clarifications ? new ClarificationBroker(store, () => snapshots.push(structuredClone(project))) : undefined;
  const backend = new PiBackend(store, process.execPath, () => snapshots.push(structuredClone(project)), options.resourcesRoot ?? resourcesRoot, {
    clarifications: broker,
    budgetClock: options.budgetClock,
    verifyApplication: options.verifyApplication,
    codex: options.codex,
    createCodexSession: options.createCodexSession,
    cancellationGraceMs: options.cancellationGraceMs ?? 20,
    // Discovery is injected for synthetic orchestration. Native discovery and
    // detached-worker shutdown require the separate permitted-host receipt.
    processSweep: options.processSweep ?? (() => new RunProcessSweep({ scan: async () => [] })),
    agentLimits: options.agentLimits ?? { idleMs: 10_000, timeoutMs: 25_000, maxTurns: 40 },
    shutdownTimeoutMs: options.shutdownTimeoutMs ?? 150,
    verificationLimits: { launcher: plainLauncher, browserTimeoutMs: 45_000, browserStepTimeoutMs: 2500, ...options.verificationLimits },
    createSession: async ({ cwd, customTools, tools, resourceLoader }) => {
      if (tools.includes('judge_read')) {
        assert.deepEqual(tools, ['judge_read']);
        assert.deepEqual(customTools.map(tool => tool.name), ['judge_read']);
        const listeners = new Set();
        const judge = { disposed: false, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
          async prompt() {
            for (const name of ['requirements.md', 'index.html', 'test-report.json']) await customTools[0].execute('judge', { path: name });
            const evidence = JSON.parse((await customTools[0].execute('baseline', { path: 'test-report.json' })).content[0].text);
            const baseline = JSON.parse(evidence.text).testBaseline;
            assert.ok(Object.keys(baseline.hashes).length);
            assert.match(baseline.policy, /explicit contract revision/);
            for (const fn of listeners) fn({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop',
              usage: options.usage,
              content: [{ type: 'text', text: JSON.stringify(options.judgeAnswers?.[judgeSessions.indexOf(this)] ?? { verdict: 'SATISFACTORY', gaps: [] }) }] } });
          }, abort() {}, dispose() { this.disposed = true; }
        };
        judgeSessions.push(judge); return { session: judge };
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
          this.emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop', usage: options.usage } });
          this.emit({ type: 'turn_end' });
        },
        abort() { this.aborts++; return options.abort ? options.abort(this) : Promise.resolve(); },
        dispose() { this.disposed = true; disposal.resolve(); }
      };
      sessions.push(s); return { session: s };
    }
  });
  backend.runtime = { getModel: () => ({ input: options.modelInput ?? ['text', 'image'] }), hasConfiguredAuth: () => true };
  // Synthetic host-verification results isolate orchestration from browser startup.
  // Existing tests continue to use real verification unless explicitly supplied.
  if (options.verify) backend.verify = options.verify;
  t.after(async () => { await backend.stopAll(); await fs.rm(root, { recursive: true, force: true }); });
  const settle = async () => { await backend.active.get(project.id)?.done; };
  const run = async () => { await backend.start(project.id); await settle(); };
  const assertSettled = async status => {
    assert.equal(project.status, status, JSON.stringify({ error: project.error, report: project.report, logs: project.logs }));
    assert.equal(backend.active.has(project.id), false);
    assert.equal(project.stages.some(s => s.status === 'active'), false);
    const saved = JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8')).projects.find(p => p.id === project.id);
    assert.equal(saved.status, status); assert.equal(saved.error, project.error);
  };
  return { root, store, project, backend, broker, sessions, judgeSessions, snapshots, run, settle, assertSettled };
}

async function syntheticReport(p, run, failed = false, detail = 'step 3: expected inspect pump, received wrong result') {
  // Only host-result computation is synthetic. The phase still records real
  // browser captures and visual reviews before reaching this injected boundary.
  const status = failed ? 'failed' : 'passed';
  const filesHash = run.visualReview?.filesHash ?? 'synthetic-cli-runtime';
  const runtime = { profile: run.quality.solution.runtime.profile, filesHash, runtime: 'node', environmentNames: [] };
  const capabilities = run.quality.solution.capabilities.map(capability => ({ ...capability, status, detail: 'Synthetic host result' }));
  const journeys = run.quality.plan.journeys.flatMap(journey => ['desktop', 'narrow'].map(viewport => ({ id: journey.id,
    title: journey.title, viewport, status, detail, screenshot: '.quality-evidence/failed-narrow.png', trace: '.quality-evidence/failed-trace.json' })));
  return { time: new Date().toISOString(), command: 'synthetic verification fixture', exitCode: failed ? 1 : 0,
    passed: failed ? 0 : 2, failed: failed ? 1 : 0, skipped: 0, total: 2,
    output: failed ? 'Synthetic Node failure: empty input should return null' : 'Synthetic passing verification',
    durationMs: 1, sourceHash: await sourceHash(p.workspace), quality: { schemaVersion: 3, contractHash: run.quality.hash,
      status, requirementsMet: !failed, errors: [], expectedJourneys: journeys.length, journeys, capabilities,
      criteria: run.quality.plan.criteria.map(criterion => ({ criterionId: criterion.criterionId,
        requirement: 'Synthetic orchestration check', status: criterion.disposition === 'implemented' ? status : 'unverified',
        capabilityIds: criterion.capabilityIds, detail: 'Synthetic host result' })),
      package: { status, cleanCopy: true, profile: runtime.profile, filesHash, detail: 'Synthetic package result' },
      solutionEvaluation: { schemaVersion: 1, status, errors: [], runtime, durationMs: 1,
        capabilities: capabilities.map(({ id, required }) => ({ id, required, status })),
        evaluations: run.quality.evaluation.evaluations.map(evaluation => ({ ...evaluation, status,
          metric: 'synthetic accuracy', actual: failed ? 0 : 1,
          cases: Array.from({ length: evaluation.trials }, (_, trial) => evaluation.cases.map(item => ({ id: item.id,
            trial: trial + 1, passed: !failed, score: failed ? 0 : 1, durationMs: 1, detail: 'Synthetic host result' }))).flat() })) },
      visualReview: run.visualReview } };
}

const measuredUsage = { input: 70, cacheRead: 30, cacheWrite: 0, output: 20, totalTokens: 120 };
const judgeNot = { verdict: 'NOT', gaps: [{ requirement: 'Synthetic task output', evidence: 'Output is missing.', fix: 'Implement the missing output.' }] };

test('verification, host repair, judge and judge repair share persisted usage and timing', async t => {
  let verifications = 0;
  const h = await harness(t, { usage: measuredUsage, judgeAnswers: [judgeNot],
    verify: (p, run) => syntheticReport(p, run, ++verifications === 1) });
  const measured = [], record = h.backend.recordInference.bind(h.backend);
  h.backend.recordInference = (p, stage, receipt) => { measured.push({ stage, ...receipt }); record(p, stage, receipt); };
  await h.run(); await h.assertSettled('review');
  assert.equal(h.project.runCheckpoint.repairAttempts, 2);
  assert.equal(h.sessions.filter(s => s.stage === 'repair').length, 2);
  assert.equal(h.judgeSessions.length, 2);
  assert.equal(verifications, 3, 'Judge repair must use the guarded host verifier');
  const verify = h.project.stages.find(s => s.id === 'verify').metrics;
  assert.equal(verify.agentAttempts, 5);
  assert.equal(verify.usage.totalTokens, 600);
  assert.equal(verify.usage.cachedInputTokens, 150);
  assert.equal(verify.usage.uncachedPlusOutputTokens, 450);
  assert.equal(verify.inferenceDurationMs, measured.filter(m => m.stage === 'verify').reduce((sum, m) => sum + m.durationMs, 0));
  assert.ok(verify.finishedAt);
  assert.ok(verify.durationMs >= verify.inferenceDurationMs - verify.agentAttempts);
  const report = JSON.parse(await fs.readFile(path.join(h.project.workspace, 'test-report.json'), 'utf8'));
  assert.deepEqual(report.stageMetrics, h.project.report.stageMetrics);
  assert.deepEqual(report.stageMetrics.find(s => s.stage === 'verify'), { stage: 'verify', ...verify });
});

test('an exhausted host repair budget cannot start another fixer for a negative judge', async t => {
  let verifications = 0;
  const h = await harness(t, { judgeAnswers: [judgeNot], verify: (p, run) => syntheticReport(p, run, ++verifications < 3),
    scenario: async ({ stage, cwd, sessions }) => {
      if (stage === 'repair') await fs.writeFile(path.join(cwd, 'repair-progress.txt'), String(sessions.length));
    } });
  await h.run(); await h.assertSettled('review');
  assert.equal(h.project.runCheckpoint.repairAttempts, 2);
  assert.equal(h.sessions.filter(s => s.stage === 'repair').length, 2);
  assert.equal(h.judgeSessions.length, 1);
  assert.equal(h.project.report.independentJudge.verdict, 'NOT');
  assert.equal(h.project.report.independentJudge.repairLimitReached, true);
});

test('resume keeps failed-attempt usage and timing and adds the resumed attempt', async t => {
  let interrupted = false;
  const h = await harness(t, { usage: measuredUsage, verify: syntheticReport,
    scenario: async ({ stage, session }) => {
      if (stage === 'research' && !interrupted) {
        interrupted = true;
        session.emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop', usage: measuredUsage } });
        throw new Error('Synthetic interruption');
      }
    } });
  await h.run(); await h.assertSettled('failed');
  const first = structuredClone(h.project.stages.find(s => s.id === 'research').metrics);
  assert.equal(first.usage.totalTokens, 120);
  assert.equal(first.agentAttempts, 1);
  const reloaded = new Store(h.root); await reloaded.init();
  h.store.state = reloaded.state;
  const project = h.store.project(h.project.id);
  await h.backend.resume(project.id); await h.settle();
  assert.equal(project.status, 'review', project.error);
  const resumed = project.stages.find(s => s.id === 'research').metrics;
  assert.equal(resumed.startedAt, first.startedAt);
  assert.equal(resumed.usage.totalTokens, 240);
  assert.equal(resumed.agentAttempts, 2);
  assert.ok(resumed.durationMs >= first.durationMs);
  assert.ok(resumed.inferenceDurationMs >= first.inferenceDurationMs);
  assert.equal(project.stages.find(s => s.id === 'intake').metrics.usage.totalTokens, 120);
  assert.deepEqual(project.report.stageMetrics.find(s => s.stage === 'research'), { stage: 'research', ...resumed });
});

test('a transient judge repair retry spends the remaining budget before the next judgment', async t => {
  let repairs = 0;
  const h = await harness(t, { judgeAnswers: [judgeNot, judgeNot], verify: syntheticReport,
    scenario: async ({ stage }) => { if (stage === 'repair' && ++repairs === 1) throw new Error('503 temporary interruption'); } });
  await h.run(); await h.assertSettled('review');
  assert.equal(repairs, 2);
  assert.equal(h.project.runCheckpoint.repairAttempts, 2);
  assert.equal(h.judgeSessions.length, 2);
  assert.equal(h.project.report.independentJudge.verdict, 'NOT');
  assert.equal(h.project.report.independentJudge.repairLimitReached, true);
});

test('cleanup integration: resumed stages and verifier launches retain a new run process scope', { timeout: workflowTimeout }, async t => {
  const markers = [], verifierMarkers = [], scans = [];
  let interrupted = false;
  const h = await harness(t, {
    processSweep: () => new RunProcessSweep({ scan: async marker => { scans.push(marker); return []; } }),
    verify: async (p, run) => ({ ...await syntheticReport(p, run), ...await verifyWorkspace(p.workspace, process.execPath, () => {}, undefined, {
      launcher: (...args) => { verifierMarkers.push(runProcessEnvironment({}).APPYARD_RUN_PROCESS); return plainLauncher(...args); }
    }) }),
    scenario: async ({ stage, cwd }) => {
      const marker = runProcessEnvironment({}).APPYARD_RUN_PROCESS;
      markers.push(marker);
      if (stage === 'research' && !interrupted) { interrupted = true; throw new Error('Synthetic interruption'); }
      if (stage === 'verify') await fs.writeFile(path.join(cwd, 'marker.test.cjs'),
        'require("node:test")("synthetic process marker",()=>require("node:assert/strict").equal(process.env.APPYARD_RUN_PROCESS,' + JSON.stringify(marker) + '));');
    }
  });
  await h.run(); await h.assertSettled('failed');
  const first = markers[0];
  assert.ok(first, 'Initial stages need the run process marker');
  assert.ok(markers.every(marker => marker === first));
  markers.length = 0;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  const resumed = markers[0];
  assert.ok(resumed, 'Resumed stages lost the run process scope');
  assert.notEqual(resumed, first);
  assert.ok(markers.every(marker => marker === resumed));
  assert.deepEqual(verifierMarkers, [resumed]);
  assert.ok(scans.includes(first) && scans.includes(resumed), 'Both scopes must finish cleanup');
});

test('cleanup integration: failed process cleanup persists an unsafe checkpoint and refuses resume', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, {
    processSweep: () => ({ run: work => work(), stop: async () => { throw new Error('Synthetic cleanup denial'); } }),
    scenario: async () => { throw new Error('Synthetic interruption'); }
  });
  await h.run(); await h.assertSettled('failed');
  assert.match(h.project.error, /Process cleanup could not be confirmed/);
  assert.equal(h.project.runCheckpoint.writerState, 'unconfirmed');
  const saved = new Store(h.root); await saved.init();
  assert.equal(saved.project(h.project.id).runCheckpoint.writerState, 'unconfirmed');
  const count = h.sessions.length;
  await assert.rejects(h.backend.resume(h.project.id), /shutdown was not confirmed/);
  assert.equal(h.sessions.length, count);
});

test('combined prerequisite: persisted resume retains the original build-test baseline and reverted changes', { timeout: workflowTimeout }, async t => {
  let original, interrupt = true;
  const h = await harness(t, { verify: syntheticReport, scenario: async ({ cwd, stage }) => {
    if (stage === 'verify' && interrupt) {
      original = await fs.readFile(path.join(cwd, 'app.test.cjs'), 'utf8');
      await fs.appendFile(path.join(cwd, 'app.test.cjs'), '\n// Synthetic verification edit');
      await fs.writeFile(path.join(cwd, 'added.test.mjs'), 'import test from "node:test"; test("synthetic added case", () => {});');
      throw new Error('Synthetic verification interruption');
    }
    if (stage === 'verify') {
      await fs.writeFile(path.join(cwd, 'app.test.cjs'), original);
      await fs.rm(path.join(cwd, 'added.test.mjs'));
    }
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  const baseline = structuredClone(h.project.runCheckpoint.buildTests);
  assert.ok(baseline?.['app.test.cjs'], 'The completed build must persist its original test digest');
  const restored = new Store(h.root); await restored.init();
  assert.deepEqual(restored.project(h.project.id).runCheckpoint.buildTests, baseline);
  interrupt = false;
  const resumed = new PiBackend(restored, process.execPath, () => {}, resourcesRoot, h.backend.options);
  resumed.runtime = h.backend.runtime; resumed.verify = syntheticReport;
  await resumed.resume(h.project.id); await resumed.active.get(h.project.id)?.done;
  const p = restored.project(h.project.id);
  assert.equal(p.status, 'review', p.error);
  assert.deepEqual(p.runCheckpoint.buildTests, baseline);
  assert.equal(p.runCheckpoint.testChanges.length, 2);
  assert.match(p.runCheckpoint.testChanges[0], /modified: app\.test\.cjs.*added: added\.test\.mjs|added: added\.test\.mjs.*modified: app\.test\.cjs/);
  assert.match(p.runCheckpoint.testChanges[1], /removed: added\.test\.mjs.*restored to build snapshot/);
  assert.match(p.report.output, /Post-build test changes[\s\S]*restored to build snapshot/);
  assert.equal(p.report.sourceHash, await sourceHash(p.workspace));
});

test('combined prerequisite: resume refuses a completed build with a missing evidence baseline', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { verify: () => { throw new Error('Synthetic host interruption'); } });
  await h.run(); await h.assertSettled('failed');
  delete h.project.runCheckpoint.buildTests;
  await h.store.save();
  const count = h.sessions.length;
  await assert.rejects(h.backend.resume(h.project.id), /build.test baseline.*missing/i);
  assert.equal(h.sessions.length, count);
});

test('combined prerequisite: foreground policy blocks advancement and persisted resume after a background launch', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { verify: syntheticReport, scenario: ({ stage, session }) => {
    if (stage === 'intake') session.emit({ type: 'tool_execution_start', toolName: 'bash', toolCallId: 'synthetic-background', args: { command: 'sleep 60 &' } });
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  assert.match(h.sessions[0].prompts[0], /Do not start background or detached jobs/);
  assert.match(h.project.error, /background.*operator/i);
  assert.equal(h.sessions.length, 1);
  const restored = new Store(h.root); await restored.init();
  const resumed = new PiBackend(restored, process.execPath, () => {}, resourcesRoot, h.backend.options);
  resumed.runtime = h.backend.runtime;
  await assert.rejects(resumed.resume(h.project.id), /background.*operator/i);
  assert.equal(h.sessions.length, 1);
});

test('combined prerequisite: foreground chaining, quoted ampersands and literal HTML do not block progress', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { verify: syntheticReport, scenario: ({ stage, session }) => {
    if (stage === 'intake') session.emit({ type: 'tool_execution_start', toolName: 'bash', toolCallId: 'synthetic-foreground', args: { command: "printf '%s' 'A & B' > version.txt 2>&1 && cat version.txt\ncat > app.html <<'HTML'\n<p>A &amp; B</p>\nHTML" } });
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(h.project.logs.some(log => /Possible background job/.test(log.text)), false);
});

test('combined prerequisite: transient build recovery and both repairs share registered execution and retain test history', { timeout: workflowTimeout }, async t => {
  let builds = 0, repairs = 0, launches = 0, original;
  const h = await harness(t, { brokenBuild: true,
    verificationLimits: { launcher: (...args) => { launches++; return plainLauncher(...args); } },
    verify: async (p, run) => ({ ...await syntheticReport(p, run),
      ...await verifyWorkspace(p.workspace, process.execPath, () => {}, run.controller.signal, h.backend.options.verificationLimits) }),
    scenario: async ({ cwd, stage, session }) => {
      if (stage === 'build' && ++builds === 1) {
        await fs.writeFile(path.join(cwd, 'earlier-artifact.txt'), 'Synthetic artifact from interrupted build');
        throw new Error('503 synthetic transport failure');
      }
      if (stage === 'build') assert.equal(await fs.readFile(path.join(cwd, 'earlier-artifact.txt'), 'utf8'), 'Synthetic artifact from interrupted build');
      if (stage === 'verify') {
        original = await fs.readFile(path.join(cwd, 'app.test.cjs'), 'utf8');
        await fs.appendFile(path.join(cwd, 'app.test.cjs'), '\n// Synthetic verification edit');
        await fs.writeFile(path.join(cwd, 'added.test.cjs'), 'require("node:test")("synthetic added case", () => {});');
      }
      if (stage === 'repair') {
        repairs++;
        assert.match(session.prompts[0], /AssertionError/);
        assert.match(session.prompts[0], /Post-build test changes/);
        if (repairs === 1) {
          await fs.writeFile(path.join(cwd, 'app.test.cjs'), original);
          await fs.rm(path.join(cwd, 'added.test.cjs'));
        }
        await artifacts(cwd, stage, repairs === 1); return true;
      }
      return false;
    } });
  await h.run(); await h.assertSettled('review');
  assert.equal(builds, 2); assert.equal(repairs, 2); assert.equal(launches, 3);
  assert.equal(h.project.runCheckpoint.repairAttempts, 2);
  assert.equal(h.project.runCheckpoint.testChanges.length, 2);
  assert.deepEqual(h.project.runCheckpoint.lastTests, h.project.runCheckpoint.buildTests);
  assert.match(h.project.report.output, /restored to build snapshot/);
  assert.deepEqual(h.project.report.registeredTests, [{ file: 'app.test.cjs', tests: 2 }]);
  assert.equal(h.project.report.sourceHash, await sourceHash(h.project.workspace));
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects.find(p => p.id === h.project.id);
  assert.deepEqual(saved.runCheckpoint, h.project.runCheckpoint);
});

test('combined prerequisite: host verification persists an active writer until cancellation settles', { timeout: workflowTimeout }, async t => {
  const entered = deferred(), release = deferred();
  const h = await harness(t, { verificationLimits: { launcher: async (...args) => {
    entered.resolve(); await release.promise; return plainLauncher(...args);
  } } });
  await h.backend.start(h.project.id); await entered.promise;
  try {
    assert.equal(h.project.runCheckpoint.writerState, 'active');
    const persisted = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects.find(p => p.id === h.project.id);
    assert.equal(persisted.runCheckpoint.writerState, 'active');
  } finally { release.resolve(); await h.backend.stop(h.project.id); }
  await h.assertSettled('stopped');
  assert.equal(h.project.runCheckpoint.writerState, 'idle');
});

test('combined prerequisite: an unconfirmed verifier shutdown blocks retry and persisted resume', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { verificationLimits: { timeoutMs: 1000 } });
  const originalSpawn = childProcess.spawn;
  const mocked = t.mock.method(childProcess, 'spawn', (...args) => {
    const child = originalSpawn(...args), once = child.once;
    // The actual fixture exits; only its close acknowledgement is withheld.
    // This simulates missing shutdown evidence on both POSIX and Windows.
    child.once = function (event, listener) { return event === 'close' ? this : once.call(this, event, listener); };
    return child;
  });
  syncBuiltinESMExports();
  try { await h.run(); } finally { mocked.mock.restore(); syncBuiltinESMExports(); }
  await h.assertSettled('failed');
  assert.match(h.project.error, /verification shutdown was not confirmed/i);
  assert.equal(h.project.runCheckpoint.writerState, 'unconfirmed');
  const restored = new Store(h.root); await restored.init();
  const resumed = new PiBackend(restored, process.execPath, () => {}, resourcesRoot, h.backend.options);
  resumed.runtime = h.backend.runtime;
  await assert.rejects(resumed.resume(h.project.id), /shutdown.*not confirmed/i);
});

test('review regression: timeout retry waits for the old prompt and abort before verifying actual files', { timeout: workflowTimeout }, async t => {
  const pendingWrite = deferred(), abortRequested = deferred(), abortConfirmed = deferred(); let attempts = 0;
  const h = await harness(t, { agentLimits: { idleMs: 100, timeoutMs: 3000 }, shutdownTimeoutMs: 2000,
    verify: syntheticReport, abort: () => { abortRequested.resolve(); return abortConfirmed.promise; },
    scenario: async ({ cwd, stage }) => {
      if (stage !== 'build' || ++attempts !== 1) return false;
      await pendingWrite.promise;
      await fs.writeFile(path.join(cwd, 'core.cjs'), 'Synthetic old writer finished');
      return true;
    } });
  await h.backend.start(h.project.id); await abortRequested.promise;
  assert.equal(attempts, 1, 'No same-workspace retry while the original writer remains active');
  assert.equal(h.project.report, undefined);
  pendingWrite.resolve();
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(attempts, 1, 'Prompt completion alone is insufficient until abort confirms idle');
  abortConfirmed.resolve(); await h.settle(); await h.assertSettled('review');
  assert.equal(attempts, 2);
  assert.match(await fs.readFile(path.join(h.project.workspace, 'core.cjs'), 'utf8'), /exports.parse/);
  assert.equal(h.project.report.sourceHash, await sourceHash(h.project.workspace));
});

test('review regression: unconfirmed writer blocks retry and persisted resume even after a late file write', { timeout: workflowTimeout }, async t => {
  const pendingWrite = deferred(), wrote = deferred(); let attempts = 0;
  const h = await harness(t, { agentLimits: { idleMs: 80, timeoutMs: 3000 }, shutdownTimeoutMs: 80,
    verify: syntheticReport, abort: never,
    scenario: async ({ cwd, stage }) => {
      if (stage !== 'build' || ++attempts !== 1) return false;
      await pendingWrite.promise;
      await fs.writeFile(path.join(cwd, 'core.cjs'), 'Synthetic late write after failed shutdown');
      wrote.resolve(); return true;
    } });
  await h.run();
  assert.equal(h.project.status, 'failed', 'A timed-out writer cannot reach review through a retry');
  assert.match(h.project.error, /shutdown.*not confirmed/i);
  assert.equal(attempts, 1); assert.equal(h.project.report, undefined);
  pendingWrite.resolve(); await wrote.promise;
  const restored = new Store(h.root); await restored.init();
  const resumed = new PiBackend(restored, process.execPath, () => {}, resourcesRoot, h.backend.options);
  resumed.runtime = h.backend.runtime;
  await assert.rejects(resumed.resume(h.project.id), /shutdown.*not confirmed/i);
  assert.equal(attempts, 1); assert.equal(resumed.active.size, 0);
  assert.match(await fs.readFile(path.join(h.project.workspace, 'core.cjs'), 'utf8'), /late write/);
});

for (const abort of [() => Promise.resolve(), () => Promise.reject(new Error('Synthetic abort failed'))]) {
  test(`shutdown refuses recovery when ${abort.toString().includes('reject') ? 'abort rejects' : 'abort resolves but the prompt is still writing'}`, { timeout: workflowTimeout }, async t => {
    const h = await harness(t, { agentLimits: { idleMs: 60, timeoutMs: 3000 }, shutdownTimeoutMs: 60,
      verify: syntheticReport, abort, scenario: ({ stage }) => stage === 'build' ? never() : false });
    await h.run(); await h.assertSettled('failed');
    assert.match(h.project.error, /shutdown.*not confirmed/i);
    assert.equal(h.sessions.filter(s => s.stage === 'build').length, 1);
    await assert.rejects(h.backend.resume(h.project.id), /shutdown.*not confirmed/i);
  });
}

test('review regression: repeated persisted resume cannot add fixing agents after the repair budget', { timeout: workflowTimeout }, async t => {
  let repairs = 0;
  const h = await harness(t, { verify: (p, run) => syntheticReport(p, run, true),
    scenario: async ({ cwd, stage }) => {
      if (stage === 'repair') await fs.writeFile(path.join(cwd, 'repair-progress.txt'), String(++repairs));
      return false;
    } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(h.project.runCheckpoint.repairAttempts, 2);
  const count = h.sessions.length;
  for (let i = 0; i < 3; i++) {
    const restored = new Store(h.root); await restored.init();
    const resumed = new PiBackend(restored, process.execPath, () => {}, resourcesRoot, h.backend.options);
    resumed.runtime = h.backend.runtime; resumed.verify = (p, run) => syntheticReport(p, run, true);
    await resumed.resume(h.project.id); await resumed.active.get(h.project.id)?.done;
    assert.equal(restored.project(h.project.id).status, 'failed');
    assert.equal(h.sessions.length, count, 'Resume cannot launch another defect-fixing verification agent');
    assert.equal(restored.project(h.project.id).runCheckpoint.repairAttempts, 2);
  }
});

test('completed verification agent resumes host checks without another fixing pass', { timeout: workflowTimeout }, async t => {
  let fail = true;
  const h = await harness(t, { verify: (p, run) => {
    if (fail) throw new Error('Synthetic host verification failure');
    return syntheticReport(p, run);
  } });
  await h.run(); await h.assertSettled('failed');
  const count = h.sessions.length; fail = false;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  assert.equal(h.sessions.length, count); assert.equal(h.project.runCheckpoint.repairAttempts, 0);
});

test('interrupted verification continuations and transient repair retries spend the repair budget', { timeout: workflowTimeout }, async t => {
  let attempts = 0;
  const h = await harness(t, { verify: (p, run) => syntheticReport(p, run, true), scenario: ({ stage }) => {
    if (stage === 'verify' || stage === 'repair') { attempts++; throw new Error('Provider error: 503'); }
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('failed');
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('failed');
  assert.equal(attempts, 3, 'Only the initial fixing pass plus two additional attempts may execute');
  assert.equal(h.project.runCheckpoint.repairAttempts, 2);
});

test('late session initialization is quarantined and cannot authorize persisted resume', { timeout: workflowTimeout }, async t => {
  const created = deferred(), disposed = deferred(); let prompts = 0, aborts = 0;
  const h = await harness(t, { agentLimits: { idleMs: 60, timeoutMs: 3000 }, shutdownTimeoutMs: 60,
    createSession: () => created.promise });
  await h.run(); await h.assertSettled('failed');
  assert.match(h.project.error, /shutdown.*not confirmed/i);
  created.resolve({ session: { subscribe: () => () => {}, prompt: async () => { prompts++; },
    abort: async () => { aborts++; }, dispose: () => disposed.resolve() } });
  await disposed.promise;
  assert.equal(prompts, 0); assert.equal(aborts, 1);
  await assert.rejects(h.backend.resume(h.project.id), /shutdown.*not confirmed/i);
});

test('resume refuses a checkpoint without saved shutdown evidence', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'build') throw new Error('Synthetic build failure'); return false; } });
  await h.run(); delete h.project.runCheckpoint.writerState;
  const count = h.sessions.length;
  await assert.rejects(h.backend.resume(h.project.id), /shutdown.*not confirmed/i);
  assert.equal(h.sessions.length, count);
});

test('resume preserves latest failure details after an interrupted repair and counts its retry', { timeout: workflowTimeout }, async t => {
  let repairs = 0, fail = true;
  const h = await harness(t, { verify: (p, run) => syntheticReport(p, run, repairs < 2, 'step 3: persisted latest failure'),
    scenario: async ({ cwd, stage, session }) => {
      if (stage !== 'repair') return false;
      repairs++;
      assert.match(session.prompts[0], /persisted latest failure/);
      if (fail) throw new Error('Synthetic repair interrupted');
      await fs.writeFile(path.join(cwd, 'repair-progress.txt'), 'Synthetic second repair'); return false;
    } });
  await h.run(); await h.assertSettled('failed'); assert.equal(h.project.runCheckpoint.repairAttempts, 1);
  fail = false; await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  assert.equal(repairs, 2); assert.equal(h.sessions.filter(s => s.stage === 'verify').length, 1);
  assert.equal(h.project.runCheckpoint.repairAttempts, 2);
});

test('transient repair retries consume remaining budget before starting another fixing session', { timeout: workflowTimeout }, async t => {
  let repairs = 0;
  const h = await harness(t, { verify: (p, run) => syntheticReport(p, run, true), scenario: ({ stage }) => {
    if (stage === 'repair') { repairs++; throw new Error('Provider error: 503'); }
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(repairs, 2); assert.equal(h.project.runCheckpoint.repairAttempts, 2);
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('failed');
  assert.equal(repairs, 2); assert.equal(h.sessions.filter(s => s.stage === 'verify').length, 1);
});

test('an unchanged repair remains stopped across explicit resumes', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { verify: (p, run) => syntheticReport(p, run, true), scenario: ({ stage }) => stage === 'repair' });
  await h.run(); await h.assertSettled('failed');
  const count = h.sessions.length;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('failed');
  assert.equal(h.sessions.length, count, 'An unchanged repair must stop further automatic fixing passes');
  assert.equal(h.project.runCheckpoint.repairAttempts, 1);
  assert.match(h.project.error, /no source changes/i);
});

test('Stop reports unconfirmed shutdown and refuses resume while preserving the saved artifacts', { timeout: workflowTimeout }, async t => {
  const entered = deferred();
  const h = await harness(t, { verify: syntheticReport, scenario: ({ stage }) => {
    if (stage === 'build') { entered.resolve(); return never(); } return false;
  } });
  await h.backend.start(h.project.id); await entered.promise; await h.backend.stop(h.project.id);
  await h.assertSettled('stopped'); assert.match(h.project.error, /stopped by you/);
  assert.match(h.project.error, /shutdown.*not confirmed/i);
  assert.match(h.project.error, /clean up.*workers/i);
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'research.md'), 'utf8'), 'Local fixture research');
  await assert.rejects(h.backend.resume(h.project.id), /shutdown.*not confirmed/i);
});

test('failed initialization without a session handle cannot confirm writer shutdown', { timeout: workflowTimeout }, async t => {
  let creations = 0;
  const h = await harness(t, { createSession: async () => { creations++; throw new Error('Provider error: 503 during initialization'); } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(creations, 1, 'A rejected initializer provides no shutdown evidence for a same-workspace retry');
  assert.match(h.project.error, /shutdown.*not confirmed/i);
  await assert.rejects(h.backend.resume(h.project.id), /shutdown.*not confirmed/i);
});

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
  const entered = deferred(), releaseWriter = deferred(); let pause = true;
  const h = await harness(t, { abort: () => { releaseWriter.resolve(); }, scenario: async ({ cwd, stage }) => {
    if (stage === 'build' && pause) {
      await fs.writeFile(path.join(cwd, 'partial-work.md'), 'Work before Stop'); entered.resolve(); await releaseWriter.promise;
      return true;
    }
    return false;
  } });
  await h.backend.start(h.project.id); await entered.promise;
  const oldSession = h.sessions.at(-1), sessionCount = h.sessions.length, { runId, workspace } = h.project;
  await h.backend.stop(h.project.id); await h.assertSettled('stopped');
  assert.equal(h.project.resumeStage, 'build'); assert.equal(oldSession.disposed, true);
  assert.equal(h.project.runCheckpoint.writerState, 'idle', 'Resume requires observed writer settlement after Stop');
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
  await assert.rejects(h.backend.resume(h.project.id), /no (?:saved|trusted) recovery checkpoint.*(?:new build|new run)/);
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
  assert.deepEqual(h.sessions.slice(count).map(session => session.stage), [], 'A completed verifier resumes host checks without another fixing agent');
  assert.equal(reportPassed(h.project.report), true);
});

test('resume after failed verification cannot replenish exhausted repair work', { timeout: workflowTimeout * 2 }, async t => {
  let broken = true;
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (broken && ['verify', 'repair'].includes(stage)) {
      await artifacts(cwd, stage, true);
      await fs.writeFile(path.join(cwd, 'core.cjs'), 'exports.parse = () => "verification defect";');
      if (stage === 'repair') await fs.writeFile(path.join(cwd, 'repair-progress.txt'), String(Date.now()));
      return true;
    }
    return false;
  } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(h.project.resumeStage, 'verify'); assert.equal(reportPassed(h.project.report), false);
  const count = h.sessions.length, { runId, workspace } = h.project;
  const attempts = h.project.runCheckpoint.repairAttempts;
  assert.equal(attempts, 2);
  broken = false;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('failed');
  assert.equal(h.project.runId, runId); assert.equal(h.project.workspace, workspace);
  assert.equal(h.sessions.length, count, 'A new verifier session would also be an unauthorized fixing pass');
  assert.equal(h.project.runCheckpoint.repairAttempts, attempts);
  assert.equal(reportPassed(h.project.report), false);
  assert.match(await fs.readFile(path.join(workspace, 'core.cjs'), 'utf8'), /verification defect/);
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
  assert.deepEqual(h.sessions.map(session => session.prompts.length), [1, 1, 1, 2, 1]);
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
  assert.equal(h.sessions.find(session => session.stage === 'build').prompts.length, 2);
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
  assert.equal(logs.length, 12);
  assert.ok(logs.every(log => log.text.includes('Image delivered to the agent')));
  assert.ok(logs.every(log => !log.text.includes('iVBORw0KGgo')));
  const stale = await browserTool.execute('late-screenshot', { action: 'screenshot' });
  assert.equal(stale.isError, true);
  await assert.rejects(fetch(openedUrl));
  assert.equal(h.project.report.command.includes('.browser-observations'), false);
});

for (const stage of ['guide', 'verify']) for (const recover of [true, false]) {
  test(`${stage} visual review ${recover ? 'recovers once from omitted comparisons' : 'cannot be skipped after one completion attempt'}`, { timeout: workflowTimeout }, async t => {
    let attempts = 0;
    const h = await harness(t, { visualReview: ({ stage: current }) => current === stage && (++attempts === 1 || !recover) });
    await h.run(); await h.assertSettled(recover ? 'review' : 'failed');
    assert.equal(attempts, 2, 'Missing comparison gets exactly one completion prompt.');
    const session = h.sessions.find(session => session.stage === (stage === 'guide' ? 'build' : 'verify'));
    assert.match(session.prompts.at(-1), /visual|screenshot/i);
    if (recover) assert.equal(reportPassed(h.project.report), true);
    else {
      assert.match(h.project.error, /visual|screenshot/i);
      assert.equal(h.project.report, undefined);
      if (stage === 'guide') assert.equal(h.sessions.some(session => session.stage === 'verify'), false);
    }
  });
}

test('editing runtime source after every visual recheck blocks the stage instead of accepting old screenshots', { timeout: workflowTimeout }, async t => {
  let edits = 0;
  const h = await harness(t, { afterVisualReview: async ({ cwd, stage }) => {
    if (stage === 'guide') await fs.appendFile(path.join(cwd, 'index.html'), `\n<!-- source edit after visual review ${++edits} -->`);
  } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(edits, 2);
  assert.match(h.project.error, /visual|screenshot|changed|current/i);
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

test('a Codex abort acknowledgement cannot authorize recovery without worker exit evidence', { timeout: workflowTimeout }, async t => {
  let creations = 0;
  const h = await harness(t);
  h.store.state.settings = { backend: 'codex', provider: 'chatgpt', model: 'fixture', rememberKey: false };
  h.backend.options.codex = { home: h.root, refresh: async () => {}, models: [{ id: 'fixture', configured: true }] };
  h.backend.options.createCodexSession = async () => {
    creations++;
    return { subscribe: () => () => {}, prompt: async () => { throw new Error('Provider error: 503'); },
      abort: async () => {}, dispose: () => {} };
  };
  await h.run(); await h.assertSettled('failed');
  assert.equal(creations, 1); assert.match(h.project.error, /shutdown.*not confirmed/i);
  await assert.rejects(h.backend.resume(h.project.id), /shutdown.*not confirmed/i);
});

for (const failure of ['Provider error: 503 service unavailable', 'Connection lost: ECONNRESET', 'Request timed out']) {
  test(`transient build failure retries once in the same workspace: ${failure}`, { timeout: workflowTimeout }, async t => {
    let attempts = 0, workspace, earlier;
    const h = await harness(t, { verify: syntheticReport, scenario: async ({ cwd, stage }) => {
      if (stage !== 'build') return false;
      if (++attempts === 1) {
        workspace = cwd; earlier = await fs.readFile(path.join(cwd, 'research.md'), 'utf8');
        await fs.writeFile(path.join(cwd, 'partial-build.txt'), 'Synthetic retained work');
        throw new Error(failure);
      }
      assert.equal(cwd, workspace);
      assert.equal(await fs.readFile(path.join(cwd, 'research.md'), 'utf8'), earlier);
      assert.equal(await fs.readFile(path.join(cwd, 'partial-build.txt'), 'utf8'), 'Synthetic retained work');
      return false;
    } });
    await h.run(); await h.assertSettled('review');
    assert.equal(attempts, 2);
    assert.deepEqual(h.sessions.map(s => s.stage), ['intake', 'synthetic-data', 'research', 'plan', 'build', 'build', 'verify']);
    assert.ok(h.sessions.every(s => s.disposed));
  });
}

test('transient retries stop after two stage executions and preserve completed stages', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'build') throw new Error('Provider error: 503'); return false; } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(h.sessions.filter(s => s.stage === 'build').length, 2);
  assert.ok(h.project.stages.slice(0, 3).every(s => s.status === 'complete'));
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'research.md'), 'utf8'), 'Local fixture research');
});

for (const stage of ['intake', 'research', 'plan', 'build', 'verify']) {
  test(`resume continues from first incomplete ${stage} stage using a persisted checkpoint`, { timeout: workflowTimeout }, async t => {
    let fail = true;
    const h = await harness(t, { verify: syntheticReport, scenario: ({ stage: current }) => {
      if (fail && current === stage) throw new Error('Synthetic stage defect, requires explicit resume'); return false;
    } });
    await h.run(); await h.assertSettled('failed');
    const workspace = h.project.workspace, runId = h.project.runId, count = h.sessions.length;
    const restored = new Store(h.root); await restored.init();
    const p = restored.project(h.project.id);
    assert.ok(p.runCheckpoint?.requirementsHash); assert.ok(p.runCheckpoint?.packetHash);
    if (['build', 'verify'].includes(stage)) assert.ok(p.runCheckpoint?.planHash);
    const resumed = new PiBackend(restored, process.execPath, () => {}, resourcesRoot, h.backend.options);
    resumed.runtime = h.backend.runtime; resumed.verify = syntheticReport; fail = false;
    await resumed.resume(p.id); await resumed.active.get(p.id)?.done;
    assert.equal(p.status, 'review', p.error); assert.equal(p.workspace, workspace); assert.equal(p.runId, runId);
    assert.equal(h.sessions[count].stage, stage);
    assert.ok(h.sessions.slice(count).every(s => s.disposed));
    assert.equal(p.approvedAt, undefined);
  });
}

test('resume continues a stopped build without restarting its completed plan', { timeout: workflowTimeout }, async t => {
  const entered = deferred(), finished = deferred(); let stop = true;
  const h = await harness(t, { verify: syntheticReport, abort: async () => { finished.resolve(false); }, scenario: ({ stage }) => {
    if (stop && stage === 'build') { entered.resolve(); return finished.promise; } return false;
  } });
  await h.backend.start(h.project.id); await entered.promise; await h.backend.stop(h.project.id);
  await h.assertSettled('stopped'); const workspace = h.project.workspace; stop = false;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  assert.equal(h.project.workspace, workspace); assert.equal(h.sessions.filter(s => s.stage === 'plan').length, 1);
});

for (const field of ['title', 'description', 'criteria', 'resources', 'links', 'challengeId', 'sourceChallenge']) {
  test(`resume refuses a changed brief field: ${field}`, { timeout: workflowTimeout }, async t => {
    const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'build') throw new Error('Synthetic stage defect'); return false; } });
    await h.run(); const count = h.sessions.length;
    h.project[field] = field === 'criteria' || field === 'links' ? ['Changed synthetic value'] : field === 'sourceChallenge' ? { id: 'changed' } : 'Changed synthetic value';
    await assert.rejects(h.backend.resume(h.project.id), /brief.*changed|changed.*brief/i);
    assert.equal(h.sessions.length, count); assert.equal(h.backend.active.size, 0);
    assert.equal(h.project.status, 'failed');
  });
}

for (const file of ['requirements.md', '.fleet/packet.json', '.fleet/README.md', 'acceptance-plan.json', 'ux-spec.json', 'plan.md', 'test-matrix.md']) {
  test(`resume refuses changed frozen inputs: ${file}`, { timeout: workflowTimeout }, async t => {
    const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'build') throw new Error('Synthetic stage defect'); return false; } });
    await h.run(); const count = h.sessions.length;
    await fs.appendFile(path.join(h.project.workspace, file), '\nChanged synthetic input');
    await assert.rejects(h.backend.resume(h.project.id), /requirements.*changed|integrity failed|changed after planning|plan.*changed/i);
    assert.equal(h.sessions.length, count); assert.equal(h.backend.active.size, 0);
  });
}

test('resume requires an eligible status and a host checkpoint', { timeout: workflowTimeout }, async t => {
  const h = await harness(t);
  await assert.rejects(h.backend.resume(h.project.id), /failed or stopped/);
  h.project.status = 'failed';
  await assert.rejects(h.backend.resume(h.project.id), /checkpoint|new run/i);
  assert.equal(h.backend.active.size, 0);
});

for (const recover of [true, false]) {
  test(`a failing journey gets two detailed repairs and ${recover ? 'recovers' : 'stops at the limit'}`, { timeout: workflowTimeout }, async t => {
    let checks = 0, repairs = 0;
    const h = await harness(t, { verify: (p, run) => syntheticReport(p, run, ++checks < (recover ? 3 : 10), `step 3: synthetic failure ${checks}`),
      scenario: async ({ cwd, stage, session }) => {
        if (stage !== 'repair') return false;
        repairs++;
        assert.match(session.prompts[0], /empty input should return null/);
        assert.match(session.prompts[0], new RegExp(`step 3: synthetic failure ${repairs}`));
        assert.match(session.prompts[0], /failed-narrow\.png/); assert.match(session.prompts[0], /failed-trace\.json/);
        assert.match(session.prompts[0], /expectText/);
        const report = JSON.parse(await fs.readFile(path.join(cwd, 'test-report.json'), 'utf8'));
        assert.equal(report.quality.journeys[0].detail, `step 3: synthetic failure ${repairs}`);
        await artifacts(cwd, stage); await fs.writeFile(path.join(cwd, 'repair-progress.txt'), `Synthetic repair ${repairs}`); return true;
      } });
    await h.run(); await h.assertSettled(recover ? 'review' : 'failed');
    assert.equal(repairs, 2); assert.equal(checks, 3);
    assert.equal(h.project.runCheckpoint.repairAttempts, 2);
    if (!recover) {
      await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('failed');
      assert.equal(repairs, 2, 'Resume cannot reset the repair budget');
    }
  });
}

test('repair stops early when source does not change', { timeout: workflowTimeout }, async t => {
  let checks = 0, repairs = 0;
  const h = await harness(t, { verify: (p, run) => { checks++; return syntheticReport(p, run, true); },
    scenario: ({ stage }) => { if (stage === 'repair') { repairs++; return true; } return false; } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(repairs, 1); assert.equal(checks, 1); assert.match(h.project.error, /repair.*no.*change/i);
});

test('resume is exposed through the trusted IPC and preload bridge', async () => {
  const main = await fs.readFile(path.join(resourcesRoot, 'electron/main.ts'), 'utf8');
  const preload = await fs.readFile(path.join(resourcesRoot, 'electron/preload.cts'), 'utf8');
  assert.match(main, /handle\('fleet:resume'/); assert.match(main, /backend\.resume\(id\)/);
  assert.match(preload, /resumeRun:.*ipcRenderer\.invoke\('fleet:resume', id\)/);
});

test('real Node failures get a second repair with the latest exact output', { timeout: workflowTimeout }, async t => {
  let checks = 0, repairs = 0, latest;
  const h = await harness(t, { brokenBuild: true,
    verify: async (p, run) => {
      checks++;
      latest = await verifyWorkspace(p.workspace, process.execPath, () => {}, run.controller.signal, { launcher: plainLauncher });
      return { ...await syntheticReport(p, run), ...latest };
    },
    scenario: async ({ cwd, stage, session }) => {
      if (stage !== 'repair') return false;
      repairs++;
      assert.equal(latest.failed, 2); assert.match(latest.output, /AssertionError/);
      assert.ok(session.prompts[0].includes(JSON.stringify(latest.output)), 'Pass the exact current Node output to each repair');
      assert.match(latest.output, repairs === 1 ? /defect/ : /still broken/);
      await artifacts(cwd, stage, repairs === 1); return true;
    } });
  await h.run(); await h.assertSettled('review');
  assert.equal(checks, 3); assert.equal(repairs, 2); assert.equal(h.project.report.passed, 2);
  assert.equal(h.project.report.sourceHash, await sourceHash(h.project.workspace));
});

test('a stage timeout retries once and late events from the old attempt stay ignored', { timeout: workflowTimeout }, async t => {
  let attempts = 0; const finished = deferred();
  const h = await harness(t, { agentLimits: { idleMs: 80, timeoutMs: 3000 }, verify: syntheticReport,
    abort: async () => { finished.resolve(false); },
    scenario: ({ stage, sessions }) => {
      if (stage !== 'build') return false;
      if (++attempts === 1) return finished.promise;
      const old = sessions.filter(s => s.stage === 'build')[0];
      assert.equal(old.aborts, 1); assert.equal(old.disposed, true);
      old.emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'Synthetic stale timeout event' } });
      return false;
    } });
  await h.run(); await h.assertSettled('review'); assert.equal(attempts, 2);
  assert.ok(!h.project.logs.some(log => log.text.includes('Synthetic stale timeout event')));
});

test('a transient error never retries over modified frozen inputs', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (stage !== 'build') return false;
    await fs.appendFile(path.join(cwd, 'requirements.md'), '\nSynthetic forbidden change');
    throw new Error('Provider error: 503');
  } });
  await h.run(); await h.assertSettled('failed'); assert.match(h.project.error, /requirements changed/);
  assert.equal(h.sessions.filter(s => s.stage === 'build').length, 1);
});

test('permanent provider authentication errors do not trigger a stage retry', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: ({ stage }) => {
    if (stage === 'build') throw new Error('Provider error: 401 unauthorized'); return false;
  } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(h.sessions.filter(s => s.stage === 'build').length, 1);
});

test('resume after Stop at the review boundary rechecks evidence without repeating completed agents', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { verify: syntheticReport }); let interrupt = true;
  h.backend.notify = () => {
    if (interrupt && h.project.stages.find(s => s.id === 'verify').status === 'complete') {
      interrupt = false; h.backend.active.get(h.project.id)?.controller.abort();
    }
  };
  await h.run(); await h.assertSettled('stopped');
  const count = h.sessions.length, workspace = h.project.workspace;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('review');
  assert.equal(h.sessions.length, count); assert.equal(h.project.workspace, workspace);
  assert.equal(h.project.approvedAt, undefined); assert.ok(h.project.report);
});

test('builds accept optional criteria and hand resources and links to agents', { timeout: functionalTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ stage, cwd }) => {
    if (stage !== 'plan') return;
    await artifacts(cwd, 'plan');
    const filename = path.join(cwd, 'acceptance-plan.json');
    const plan = JSON.parse(await fs.readFile(filename, 'utf8'));
    // With no supplied criteria, this fixture must implement a provisional recipe
    // outcome. Deferring every recipe outcome is correctly rejected by the host.
    plan.criteria = plan.criteria.map(criterion => criterion.criterionId === 'WFL-03'
      ? { criterionId: 'WFL-03', disposition: 'implemented',
        expectedOutcome: 'Parse a synthetic task, recover from empty input, and retain its review draft across reload. Publication still requires owner approval.',
        journeyIds: ['parse-task', 'recover-empty'], capabilityIds: ['parse'] } : { ...criterion, capabilityIds: [] });
    await fs.writeFile(filename, JSON.stringify(plan));
    const solutionFile = path.join(cwd, 'solution-contract.json');
    const solution = JSON.parse(await fs.readFile(solutionFile, 'utf8'));
    solution.capabilities[0].criterionIds = ['WFL-03'];
    await fs.writeFile(solutionFile, JSON.stringify(solution));
    return true;
  } });
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

test('connected file and pasted inputs reach agents unchanged and skip the synthetic-data specialist', { timeout: functionalTimeout }, async t => {
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
  const h = await harness(t, { project: runtimeProfile === 'cli' ? {
    title: 'Synthetic task parser CLI fixture', description: 'Extract task text from a synthetic TASK: prefix.',
    criteria: ['Parse a synthetic task and recover from empty input.']
  } : undefined, modelInput: runtimeProfile === 'cli' ? ['text'] : ['text', 'image'], scenario: runtimeProfile === 'cli' ? async ({ cwd, stage }) => {
    if (!['plan', 'build', 'guide'].includes(stage)) return false;
    await artifacts(cwd, stage);
    if (stage === 'plan') {
      const solution = JSON.parse(await fs.readFile(path.join(cwd, 'solution-contract.json'), 'utf8'));
      solution.runtime = { profile: 'cli', files: ['evaluate.cjs', 'core.cjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'evaluate.cjs', args: [] } };
      const plan = JSON.parse(await fs.readFile(path.join(cwd, 'acceptance-plan.json'), 'utf8'));
      plan.journeys = [];
      for (const criterion of plan.criteria) {
        criterion.journeyIds = [];
        criterion.capabilityIds = criterion.disposition === 'implemented' ? ['parse'] : [];
      }
      solution.capabilities[0].criterionIds = plan.criteria.filter(criterion => criterion.disposition === 'implemented').map(criterion => criterion.criterionId);
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
    assert.equal(visual.captures.length, 8);
    assert.equal(visual.reviews.filter(review => review.round === 'initial').length, 4);
    assert.equal(visual.reviews.filter(review => review.round === 'recheck').length, 4);
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
  assert.equal(h.judgeSessions.length, 1); assert.ok(h.judgeSessions[0].disposed);
  assert.equal(h.project.report.independentJudge.verdict, 'SATISFACTORY');
  assert.equal(h.sessions.find(s => s.stage === 'build').prompts.length, 2);
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
    assert.deepEqual(session.customTools.map(tool => tool.name).sort(), [...phase.tools, 'fleet_helpers', 'fleet_run_helper', ...(packet.globalTools.includes('bash') ? ['bash'] : [])].sort());
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
      plan.journeys = [
        { id: 'parse-task', title: 'Parse using the backend', kind: 'primary', steps: [
          { action: 'fill', selector: '#input', value: '"TASK: inspect pump"' }, { action: 'click', selector: '#run' },
          { action: 'expectText', selector: '#result', text: '"inspect pump"' }
        ] },
        { id: 'recover-empty', title: 'Recover from invalid JSON', kind: 'recovery', steps: [
          { action: 'fill', selector: '#input', value: '{ invalid' }, { action: 'click', selector: '#run' },
          { action: 'expectVisible', selector: '#error' },
          { action: 'fill', selector: '#input', value: '"TASK: inspect pump"' }, { action: 'click', selector: '#run' },
          { action: 'expectText', selector: '#result', text: '"inspect pump"' }
        ] }
      ];
      for (const [name, value] of Object.entries({ 'solution-contract.json': solution, 'acceptance-plan.json': plan, 'foundation-plan.json': selection })) {
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

test('core evaluation precedes completed application component tracking', { timeout: workflowTimeout }, async t => {
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
  assert.equal(h.sessions.find(session => session.stage === 'build').prompts.length, 2, 'Incomplete UI components must not trigger artifact repair before the core gate');
  assert.equal(reportPassed(h.project.report, true), true);
});

for (const repair of [true, false]) test(`required core evaluation ${repair ? 'repairs the engine' : 'blocks application completion'}`, { timeout: workflowTimeout }, async t => {
  let coreAttempts = 0;
  const h = await harness(t, { scenario: async ({ cwd, stage, session }) => {
    if (stage !== 'build') return false;
    coreAttempts++;
    await assert.rejects(fs.access(path.join(cwd, 'evaluation-plan.json')), /ENOENT/, 'The builder must not receive the answer key');
    await artifacts(cwd, stage);
    if (coreAttempts === 1 || !repair) await fs.writeFile(path.join(cwd, 'evaluate.cjs'), 'process.stdin.resume();process.stdin.on("end",()=>process.stdout.write(JSON.stringify("constant answer")));');
    else assert.match(session.prompts.at(-1), /independent core evaluation failed/);
    return true;
  } });
  await h.run(); await h.assertSettled(repair ? 'review' : 'failed');
  assert.equal(coreAttempts, 2);
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

for (const repair of [true, false]) test(`passing Node tests cannot hide a static browser app (${repair ? 'repairs UI' : 'blocks review'})`, { timeout: functionalTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (stage === 'build') {
      await artifacts(cwd, stage);
      await fs.writeFile(path.join(cwd, 'index.html'), '<!doctype html><title>Placeholder</title><main>Works</main><script>' + qualityFixtureHtml.match(/\/\* CORE_START \*\/[\s\S]*?\/\* CORE_END \*\//)[0] + '</script>');
      return true;
    }
    if (stage === 'repair' && repair) await fs.writeFile(path.join(cwd, 'index.html'), qualityFixtureHtml);
    return false;
  } });
  await h.run(); await h.assertSettled(repair ? 'review' : 'failed');
  assert.equal(h.project.report.passed, 2);
  assert.equal(h.project.report.failed, 0);
  assert.equal(reportPassed(h.project.report, true), repair, JSON.stringify(h.project.report));
  assert.equal(h.sessions.filter(session => session.stage === 'repair').length, repair ? 1 : 2);
  assert.equal(h.project.report.quality.status, repair ? 'passed' : 'failed');
  assert.ok(h.project.logs.some(log => log.text.includes('Browser journeys: 0/4 passed')));
});

test('builder cannot weaken a planned browser expectation', { timeout: workflowTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (stage !== 'build') return false;
    await artifacts(cwd, stage);
    const file = path.join(cwd, 'acceptance-plan.json');
    const plan = JSON.parse(await fs.readFile(file, 'utf8'));
    plan.journeys[0].steps[2].text = 'incorrect result';
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

for (const brokenRepair of [false, true]) {
  // Real Node/browser verification needs scheduling room on Windows.
  // This outer budget preserves the agent and verification deadlines.
  test(`independent test failure ${brokenRepair ? 'stops after a second unchanged repair' : 'gets exactly one repair and advances after re-verification'}`, { timeout: functionalTimeout }, async t => {
    const h = await harness(t, { brokenBuild: true, brokenRepair }); await h.run();
    await h.assertSettled(brokenRepair ? 'failed' : 'review');
    assert.deepEqual(h.sessions.map(s => s.stage), ['intake', 'synthetic-data', 'research', 'plan', 'build', 'verify', 'repair', ...(brokenRepair ? ['repair'] : [])], JSON.stringify(h.project.logs));
    assert.equal(reportPassed(h.project.report), !brokenRepair, JSON.stringify(h.project.report));
    assert.deepEqual(h.sessions.at(-1).skills, h.sessions.find(session => session.stage === 'verify').skills);
    assert.ok(h.sessions.at(-1).skills.includes('ponytail'));
    assert.ok(h.sessions.at(-1).skills.includes('impeccable'));
    assert.equal(h.project.logs.filter(l => l.text.includes('Starting one Pi repair attempt')).length, 1);
    if (brokenRepair) { assert.match(h.project.error, /Verification did not pass/); assert.equal(h.project.report.failed, 2); }
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

test('missing artifacts get one targeted completion prompt within the same stage', { timeout: functionalTimeout }, async t => {
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

test('missing application tests are recovered before verification starts', { timeout: functionalTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage, session }) => {
    if (stage !== 'build') return false;
    await artifacts(cwd, stage); if (session.prompts.length === 1) await fs.rm(path.join(cwd, 'app.test.cjs')); return true;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(h.sessions.find(s => s.stage === 'build').prompts.length, 3); assert.match(h.sessions.find(s => s.stage === 'build').prompts[1], /application.*test/);
});

test('the user guide is requested after implementation and checked before verification', { timeout: functionalTimeout }, async t => {
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
  test(`an empty user guide ${recover ? 'gets one completion attempt' : 'blocks verification after one completion attempt'}`, { timeout: recover ? functionalTimeout : 10000 }, async t => {
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

test('repair updates the user guide before independent verification fingerprints the source', { timeout: functionalTimeout }, async t => {
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

test('stopped runs can restart in fresh workspaces and late old events cannot corrupt the new run', { timeout: functionalTimeout }, async t => {
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

test('a hung generated test is bounded, repaired once, then reaches review on actual passing evidence', { timeout: functionalTimeout }, async t => {
  const original = 'require("node:test")("invalid prefix", () => require("node:assert/strict").equal(require("./core.cjs").parse("INVALID"), null));';
  const h = await harness(t, { verificationLimits: { timeoutMs: 500 }, scenario: async ({ cwd, stage }) => {
    if (stage === 'build') {
      await artifacts(cwd, stage);
      await fs.appendFile(path.join(cwd, 'core.cjs'), '\nsetInterval(() => {}, 1000);');
      await fs.writeFile(path.join(cwd, 'hang.test.cjs'), original); return true;
    }
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'hang.test.cjs'), 'utf8'), original);
  assert.equal(h.project.report.total, 3);
  assert.ok(h.project.logs.some(l => l.text.includes('Verification exceeded'))); assert.equal(h.sessions.at(-1).stage, 'repair');
});

function budgetClock() {
  let elapsed = 0, sequence = 0;
  const origin = Date.parse('2026-11-04T15:00:00.000Z'), timers = new Map();
  return {
    now: () => elapsed, wallNow: () => origin + elapsed,
    setTimeout(callback, milliseconds) { const id = ++sequence; timers.set(id, { at: elapsed + milliseconds, callback }); return id; },
    clearTimeout(id) { timers.delete(id); },
    advance(milliseconds) {
      const target = elapsed + milliseconds;
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        elapsed = next[1].at; timers.delete(next[0]); next[1].callback();
      }
      elapsed = target;
    }
  };
}

async function assertBudgetExhausted(h) {
  await h.assertSettled('stopped');
  assert.match(h.project.error, /time.*budget|budget.*exhaust|whole.build/i);
  assert.equal(h.project.runSummary.terminalReason, 'time_budget_exhausted');
  assert.equal(h.project.runSummary.timeLimitMs, 60_000);
  assert.equal(h.project.runSummary.elapsedMs, 60_000);
  assert.ok(h.project.runSummary.finishedAt);
  const state = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8'));
  assert.deepEqual(state.projects.find(p => p.id === h.project.id).runSummary, h.project.runSummary);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(h.project.workspace, 'run-summary.json'), 'utf8')), h.project.runSummary);
}

test('the whole-build deadline survives a phase boundary and persists artifacts and elapsed usage', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock();
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, scenario: async ({ cwd, stage }) => {
    if (stage === 'intake') { clock.advance(45_000); return false; }
    if (stage === 'research') { await artifacts(cwd, stage); clock.advance(15_000); return never(); }
    return false;
  } });
  await h.run(); await assertBudgetExhausted(h);
  assert.deepEqual(h.sessions.map(session => session.stage), ['intake', 'synthetic-data', 'research']);
  assert.equal(h.sessions[2].aborts, 1); assert.equal(h.sessions[2].disposed, true);
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'scope.md'), 'utf8'), 'Synthetic scope');
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'research.md'), 'utf8'), 'Local fixture research');
  assert.equal(h.project.runSummary.phases.reduce((sum, phase) => sum + phase.durationMs, 0), 60_000);
  assert.equal(h.project.runSummary.usage.prompts, 3, 'The separate synthetic-data agent consumes a prompt in the same build');
});

test('a hung session setup exhausts the whole-build deadline and releases the run slot', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock(), entered = deferred();
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, createSession: () => { entered.resolve(); return never(); } });
  await h.backend.start(h.project.id); await entered.promise;
  clock.advance(60_000); await h.settle(); await assertBudgetExhausted(h);
  assert.equal(h.sessions.length, 0);
  assert.equal(h.project.runSummary.usage.prompts, 0);
});

test('Codex account setup is inside the build deadline before any session can start', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock(), entered = deferred(); let sessionCalls = 0;
  const h = await harness(t, { budgetClock: clock,
    settings: { backend: 'codex', provider: 'chatgpt', buildTimeLimitMinutes: 1 },
    codex: { models: [{ id: 'fixture', configured: true }], refresh: () => { entered.resolve(); return never(); } },
    createCodexSession: () => { sessionCalls++; return never(); }
  });
  const rejected = assert.rejects(h.backend.start(h.project.id), /time.*budget|budget.*exhaust|whole.build/i);
  await entered.promise; clock.advance(60_000); await rejected; await assertBudgetExhausted(h);
  assert.equal(sessionCalls, 0);
  assert.equal(h.project.runSummary.usage.prompts, 0);
});

test('a stalled state save cannot retain capacity forever after the build budget expires', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock(), saving = deferred();
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 } });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  h.store.save = () => { saving.resolve(); return never(); };
  const rejected = assert.rejects(h.backend.start(h.project.id), /time.*budget|budget.*exhaust|whole.build/i);
  await saving.promise; clock.advance(60_000);
  await new Promise(resolve => setImmediate(resolve));
  t.mock.timers.tick(5000); await rejected;
  assert.equal(h.backend.active.has(h.project.id), false);
  assert.equal(h.project.status, 'stopped');
  assert.equal(h.project.runSummary.terminalReason, 'time_budget_exhausted');
  assert.match(h.project.error, /Could not save run state.*5 seconds/);
  assert.equal(h.sessions.length, 0);
});

test('late session initialization after budget expiry is disposed without model dispatch', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock(), entered = deferred(), sessionReady = deferred();
  const lateSession = { prompts: 0, aborts: 0, disposed: 0,
    subscribe() { return () => {}; }, prompt() { this.prompts++; return never(); },
    abort() { this.aborts++; return never(); }, dispose() { this.disposed++; }
  };
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, createSession: () => { entered.resolve(); return sessionReady.promise; } });
  await h.backend.start(h.project.id); await entered.promise;
  clock.advance(60_000); await h.settle(); await assertBudgetExhausted(h);
  assert.equal(h.project.runCheckpoint.writerState, 'unconfirmed', 'An expired budget cannot establish shutdown of a pending initializer');
  await assert.rejects(h.backend.resume(h.project.id), /shutdown.*not confirmed|budget.*exhaust/i);
  const saved = structuredClone(h.project);
  sessionReady.resolve({ session: lateSession });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(lateSession.prompts, 0); assert.equal(lateSession.aborts, 1); assert.equal(lateSession.disposed, 1);
  assert.deepEqual(h.project, saved);
});

test('retry and compaction activity cannot postpone the build deadline', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock();
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, scenario: ({ stage, session }) => {
    if (stage !== 'intake') return false;
    clock.advance(20_000); session.emit({ type: 'auto_retry_start', attempt: 1, maxAttempts: 2, delayMs: 1000, errorMessage: 'fixture transient failure' });
    clock.advance(20_000); session.emit({ type: 'compaction_start', reason: 'threshold' });
    session.emit({ type: 'compaction_end', reason: 'threshold' });
    clock.advance(20_000); return never();
  } });
  await h.run(); await assertBudgetExhausted(h);
  assert.equal(h.sessions.length, 1); assert.equal(h.sessions[0].aborts, 1);
  assert.ok(h.project.logs.some(log => log.text.includes('Provider retry')));
  assert.ok(h.project.logs.some(log => log.text.includes('compaction completed')));
});

for (const recovery of ['artifact', 'guide']) test(`${recovery} recovery shares the existing build allowance`, { timeout: workflowTimeout }, async t => {
  const clock = budgetClock();
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, scenario: async ({ cwd, stage, session }) => {
    if (recovery === 'artifact' && stage === 'intake') {
      clock.advance(session.prompts.length === 1 ? 50_000 : 10_000);
      return session.prompts.length === 1 ? true : never();
    }
    if (recovery === 'guide' && stage === 'build') clock.advance(50_000);
    if (recovery === 'guide' && stage === 'guide') {
      await fs.writeFile(path.join(cwd, 'README.md'), '');
      if (session.prompts.length === 2) { clock.advance(9000); return true; }
      clock.advance(1000); return never();
    }
    return false;
  } });
  await h.run(); await assertBudgetExhausted(h);
  const active = h.sessions.at(-1);
  assert.equal(active.stage, recovery === 'artifact' ? 'intake' : 'build');
  assert.equal(active.prompts.length, recovery === 'artifact' ? 2 : 3);
  assert.equal(active.aborts, 1);
  assert.ok(!h.sessions.some(session => session.stage === 'verify'));
});

test('host verification shares the build deadline and cancellation signal', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock(), entered = deferred(); let verificationSignal;
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 },
    scenario: ({ stage }) => { if (stage === 'build') clock.advance(55_000); return false; },
    verifyApplication: async (_root, _executable, _quality, signal) => { verificationSignal = signal; entered.resolve(); return never(); }
  });
  await h.backend.start(h.project.id); await entered.promise;
  clock.advance(5000); await h.settle(); await assertBudgetExhausted(h);
  assert.equal(verificationSignal.aborted, true);
  assert.equal(h.sessions.at(-1).stage, 'verify');
  assert.equal(h.project.report, undefined);
});

test('verification teardown completes before a budget-exhausted run releases capacity', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock(), entered = deferred(), cleaning = deferred(), release = deferred();
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, cancellationGraceMs: 1000,
    verifyApplication: (_root, _executable, _quality, signal) => new Promise((_resolve, reject) => {
      entered.resolve();
      signal.addEventListener('abort', () => { cleaning.resolve(); void release.promise.then(() => reject(signal.reason)); }, { once: true });
    })
  });
  await h.backend.start(h.project.id); await entered.promise; clock.advance(60_000); await cleaning.promise;
  assert.equal(h.backend.active.has(h.project.id), true, 'capacity must remain reserved during verification cleanup');
  release.resolve(); await h.settle(); await assertBudgetExhausted(h);
});

test('budget expiry terminates the verification worker and descendants before releasing capacity', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock(), pids = []; let observed = '', closed = false;
  const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } };
  t.after(() => { for (const pid of pids) { try { process.kill(pid, 'SIGKILL'); } catch {} } });
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, cancellationGraceMs: 11_000,
    scenario: async ({ cwd, stage }) => {
      if (stage !== 'build') return false;
      await artifacts(cwd, stage);
      await fs.writeFile(path.join(cwd, 'app.test.cjs'), `
        const descendant = require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
        console.log('TREE_PIDS=' + process.pid + ',' + descendant.pid);
        setInterval(() => {}, 1000);
      `);
      return true;
    },
    verifyApplication: (root, executable, contract, signal, limits) => verifyApplication(root, executable, contract, signal, limits, child => {
      pids.push(child.pid); child.once('close', () => { closed = true; });
      child.stdout.on('data', chunk => {
        observed += chunk.toString();
        const match = observed.match(/TREE_PIDS=(\d+),(\d+)/);
        if (match && pids.length === 1) { pids.push(Number(match[1]), Number(match[2])); clock.advance(60_000); }
      });
    })
  });
  await h.run(); await assertBudgetExhausted(h);
  assert.equal(pids.length, 3, 'fixture must start the coordinator, worker and descendant');
  assert.equal(closed, true, 'the run slot was freed before verification teardown completed');
  const reapDeadline = Date.now() + 2000;
  while (pids.some(alive) && Date.now() < reapDeadline) await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(pids.filter(alive), [], 'a verification worker outlived budget cancellation');
});

test('repair consumes the remaining allowance and cannot begin another verification after expiry', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock(); let verifications = 0;
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 },
    scenario: ({ stage }) => {
      if (stage === 'build') clock.advance(30_000);
      if (stage === 'repair') { clock.advance(10_000); return never(); }
      return false;
    },
    verifyApplication: async () => {
      verifications++; clock.advance(20_000);
      return { time: new Date().toISOString(), command: 'fixture', exitCode: 1, passed: 0, failed: 1, skipped: 0, total: 1,
        output: 'Fixture verification failed.', durationMs: 20_000, sourceHash: 'fixture' };
    }
  });
  await h.run(); await assertBudgetExhausted(h);
  assert.equal(h.sessions.at(-1).stage, 'repair');
  assert.equal(h.sessions.at(-1).aborts, 1); assert.equal(verifications, 1);
  assert.equal(h.project.runSummary.usage.phases.find(phase => phase.phase === 'repair').prompts, 1);
  assert.equal(h.project.report.failed, 1);
  assert.equal(JSON.parse(await fs.readFile(path.join(h.project.workspace, 'test-report.json'), 'utf8')).failed, 1);
});

test('human review freezes the build summary and a fresh run preserves the prior run summary', { timeout: workflowTimeout }, async t => {
  const clock = budgetClock(); let exhaustNext = false;
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, scenario: ({ stage }) => {
    if (stage === 'intake') { clock.advance(exhaustNext ? 60_000 : 1000); if (exhaustNext) return never(); }
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  const oldWorkspace = h.project.workspace, oldSummary = structuredClone(h.project.runSummary);
  assert.equal(oldSummary.terminalReason, 'completed'); assert.equal(oldSummary.elapsedMs, 1000);
  clock.advance(3_600_000);
  assert.deepEqual(h.project.runSummary, oldSummary);
  exhaustNext = true; await h.run(); await assertBudgetExhausted(h);
  assert.notEqual(h.project.workspace, oldWorkspace);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(oldWorkspace, 'run-summary.json'), 'utf8')), oldSummary);
});
