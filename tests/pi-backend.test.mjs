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

const resourcesRoot = path.resolve('.');
// Full functional workflows launch real Node tests and Chromium. Keep their
// scheduling allowance separate from deliberately short timeout/cancel limits.
const functionalTimeout = 60_000;
const never = () => new Promise(() => {});
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const stageOf = prompt => prompt.includes('The independent test run failed') || prompt.includes('repairing gaps from an independent') ? 'repair'
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
    : stage === 'research' ? { 'research.md': 'Local fixture research' }
    : stage === 'plan' ? { 'scope.md': 'Synthetic scope', 'research.md': 'Local fixture research', 'plan.md': 'Implement task extraction', 'test-matrix.md': 'Exact task extraction and empty input' }
    : stage === 'build' ? { 'index.html': qualityFixtureHtml,
      'path-to-fleet.md': 'Domain review required',
      'core.cjs': broken ? 'exports.parse = () => "defect";' : 'exports.parse = text => text.startsWith("TASK: ") ? text.slice(6) : null;',
      'app.test.cjs': 'const test = require("node:test"), assert = require("node:assert/strict"), {parse} = require("./core.cjs"); test("extract task", () => assert.equal(parse("TASK: inspect pump"), "inspect pump")); test("empty input", () => assert.equal(parse(""), null));' }
    : stage === 'guide' ? { 'README.md': '# Task parser\n\nOpen index.html in a browser. No installation is required. Enter TASK: inspect pump in Message and select Parse message. The task appears and survives reload. Empty input shows Enter a message; replace it with a task to recover.\n\nFor developers: install Node and run `node --test app.test.cjs`. The core parses `TASK: inspect pump` into `inspect pump` and returns null for empty input.\n\nSee [verification notes](verification.md) and [field validation](path-to-fleet.md).' }
    : stage === 'repair' ? { 'core.cjs': broken ? 'exports.parse = () => "still broken";' : 'exports.parse = text => text.startsWith("TASK: ") ? text.slice(6) : null;', 'verification.md': 'Repair completed; domain review still required' }
    : { 'verification.md': 'Task extraction and empty input are tested; domain review required' };
  if (stage === 'plan') Object.assign(files, qualityFixture(JSON.parse(await fs.readFile(path.join(cwd, '.fleet/packet.json'), 'utf8')).acceptance.map(criterion => criterion.id)));
  for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(cwd, name), content);
}

async function harness(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-flow-'));
  const store = new Store(root); await store.init();
  store.state.projects[0] = newProject(qualityFixtureProject);
  store.state.settings = { provider: 'fixture', model: 'fixture', rememberKey: false };
  const project = store.state.projects[0], sessions = [], judgeSessions = [], snapshots = [];
  const backend = new PiBackend(store, process.execPath, () => snapshots.push(structuredClone(project)), options.resourcesRoot ?? resourcesRoot, {
    // Discovery is injected for synthetic orchestration. Native discovery and
    // detached-worker shutdown require the separate permitted-host receipt.
    processSweep: options.processSweep ?? (() => new RunProcessSweep({ scan: async () => [] })),
    agentLimits: options.agentLimits ?? { idleMs: 2000, timeoutMs: 5000, maxTurns: 40 },
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
            for (const fn of listeners) fn({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop',
              usage: options.usage,
              content: [{ type: 'text', text: JSON.stringify(options.judgeAnswers?.[judgeSessions.indexOf(this)] ?? { verdict: 'SATISFACTORY', gaps: [] }) }] } });
          }, abort() {}, dispose() { this.disposed = true; }
        };
        judgeSessions.push(judge); return { session: judge };
      }
      if (options.createSession) return options.createSession({ cwd, sessions });
      const listeners = new Set();
      const s = { tools, customTools, skills: resourceLoader.getSkills().skills.map(skill => skill.name), stage: undefined, prompts: [], aborts: 0, disposed: false,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        emit(event) { for (const listener of listeners) listener(event); },
        async prompt(text) {
          this.stage ??= stageOf(text); this.prompts.push(text); this.emit({ type: 'turn_start' });
          if (this.stage === 'plan' && !project.systemDesign) await customTools.find(tool => tool.name === 'fleet_system_design').execute('design', {
            title: 'Task parser', description: 'Local fixture application',
            components: [{ id: 'parser', label: 'Parser', description: 'Extract task text', kind: 'logic', files: ['core.cjs'] }], connections: []
          });
          if (text.startsWith('Implementation is complete.')) this.writingGuide = true;
          const step = this.writingGuide ? 'guide' : this.stage;
          const handled = await options.scenario?.({ cwd, stage: step, session: this, sessions, project, store });
          if (!handled) await artifacts(cwd, step, options.brokenBuild && (this.stage === 'build' || options.brokenRepair));
          if (['build', 'verify', 'repair'].includes(this.stage)) await customTools.find(tool => tool.name === 'fleet_component_progress').execute('progress', { componentId: 'parser', status: 'generated', detail: 'Source written; harness tests follow.' });
          this.emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop', usage: options.usage } });
          this.emit({ type: 'turn_end' });
        },
        abort() { this.aborts++; return options.abort ? options.abort(this) : Promise.resolve(); },
        dispose() { this.disposed = true; }
      };
      sessions.push(s); return { session: s };
    }
  });
  backend.runtime = { getModel: () => ({}), hasConfiguredAuth: () => true };
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
  return { root, store, project, backend, sessions, judgeSessions, snapshots, run, settle, assertSettled };
}

async function syntheticReport(p, run, failed = false, detail = 'step 3: expected inspect pump, received wrong result') {
  return { time: new Date().toISOString(), command: 'synthetic verification fixture', exitCode: failed ? 1 : 0,
    passed: failed ? 0 : 2, failed: failed ? 1 : 0, skipped: 0, total: 2,
    output: failed ? 'Synthetic Node failure: empty input should return null' : 'Synthetic passing verification',
    durationMs: 1, sourceHash: await sourceHash(p.workspace), quality: { schemaVersion: 1, contractHash: run.quality.hash,
      status: failed ? 'failed' : 'passed', requirementsMet: !failed,
      criteria: [{ criterionId: 'SYNTHETIC', requirement: 'Synthetic orchestration check', status: failed ? 'failed' : 'passed', detail: 'Synthetic host result' }], errors: [],
      journeys: [{ id: run.quality.plan.journeys[0].id, title: 'Synthetic parsing journey', viewport: 'narrow',
        status: failed ? 'failed' : 'passed', detail, screenshot: '.quality-evidence/failed-narrow.png', trace: '.quality-evidence/failed-trace.json' }] } };
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

test('cleanup integration: resumed stages and verifier launches retain a new run process scope', { timeout: 10000 }, async t => {
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

test('cleanup integration: failed process cleanup persists an unsafe checkpoint and refuses resume', { timeout: 10000 }, async t => {
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

test('combined prerequisite: persisted resume retains the original build-test baseline and reverted changes', { timeout: 10000 }, async t => {
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

test('combined prerequisite: resume refuses a completed build with a missing evidence baseline', { timeout: 10000 }, async t => {
  const h = await harness(t, { verify: () => { throw new Error('Synthetic host interruption'); } });
  await h.run(); await h.assertSettled('failed');
  delete h.project.runCheckpoint.buildTests;
  await h.store.save();
  const count = h.sessions.length;
  await assert.rejects(h.backend.resume(h.project.id), /build.test baseline.*missing/i);
  assert.equal(h.sessions.length, count);
});

test('combined prerequisite: foreground policy blocks advancement and persisted resume after a background launch', { timeout: 10000 }, async t => {
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

test('combined prerequisite: foreground chaining, quoted ampersands and literal HTML do not block progress', { timeout: 10000 }, async t => {
  const h = await harness(t, { verify: syntheticReport, scenario: ({ stage, session }) => {
    if (stage === 'intake') session.emit({ type: 'tool_execution_start', toolName: 'bash', toolCallId: 'synthetic-foreground', args: { command: "printf '%s' 'A & B' > version.txt 2>&1 && cat version.txt\ncat > app.html <<'HTML'\n<p>A &amp; B</p>\nHTML" } });
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(h.project.logs.some(log => /Possible background job/.test(log.text)), false);
});

test('combined prerequisite: transient build recovery and both repairs share registered execution and retain test history', { timeout: 15000 }, async t => {
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
  assert.equal(Object.hasOwn(h.project.runCheckpoint, 'connectedContextHash'), false);
  assert.deepEqual(h.project.runCheckpoint.lastTests, h.project.runCheckpoint.buildTests);
  assert.match(h.project.report.output, /restored to build snapshot/);
  assert.deepEqual(h.project.report.registeredTests, [{ file: 'app.test.cjs', tests: 2 }]);
  assert.equal(h.project.report.sourceHash, await sourceHash(h.project.workspace));
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects.find(p => p.id === h.project.id);
  assert.deepEqual(saved.runCheckpoint, h.project.runCheckpoint);
});

test('combined prerequisite: host verification persists an active writer until cancellation settles', { timeout: 10000 }, async t => {
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

test('combined prerequisite: an unconfirmed verifier shutdown blocks retry and persisted resume', { timeout: 10000 }, async t => {
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

test('review regression: timeout retry waits for the old prompt and abort before verifying actual files', { timeout: 10000 }, async t => {
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

test('review regression: unconfirmed writer blocks retry and persisted resume even after a late file write', { timeout: 10000 }, async t => {
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
  test(`shutdown refuses recovery when ${abort.toString().includes('reject') ? 'abort rejects' : 'abort resolves but the prompt is still writing'}`, { timeout: 10000 }, async t => {
    const h = await harness(t, { agentLimits: { idleMs: 60, timeoutMs: 3000 }, shutdownTimeoutMs: 60,
      verify: syntheticReport, abort, scenario: ({ stage }) => stage === 'build' ? never() : false });
    await h.run(); await h.assertSettled('failed');
    assert.match(h.project.error, /shutdown.*not confirmed/i);
    assert.equal(h.sessions.filter(s => s.stage === 'build').length, 1);
    await assert.rejects(h.backend.resume(h.project.id), /shutdown.*not confirmed/i);
  });
}

test('review regression: repeated persisted resume cannot add fixing agents after the repair budget', { timeout: 10000 }, async t => {
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

test('completed verification agent resumes host checks without another fixing pass', { timeout: 10000 }, async t => {
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

test('interrupted verification continuations and transient repair retries spend the repair budget', { timeout: 10000 }, async t => {
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

test('late session initialization is quarantined and cannot authorize persisted resume', { timeout: 10000 }, async t => {
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

test('resume refuses a checkpoint without saved shutdown evidence', { timeout: 10000 }, async t => {
  const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'build') throw new Error('Synthetic build failure'); return false; } });
  await h.run(); delete h.project.runCheckpoint.writerState;
  const count = h.sessions.length;
  await assert.rejects(h.backend.resume(h.project.id), /shutdown.*not confirmed/i);
  assert.equal(h.sessions.length, count);
});

test('resume preserves latest failure details after an interrupted repair and counts its retry', { timeout: 10000 }, async t => {
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

test('transient repair retries consume remaining budget before starting another fixing session', { timeout: 10000 }, async t => {
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

test('an unchanged repair remains stopped across explicit resumes', { timeout: 10000 }, async t => {
  const h = await harness(t, { verify: (p, run) => syntheticReport(p, run, true), scenario: ({ stage }) => stage === 'repair' });
  await h.run(); await h.assertSettled('failed');
  const count = h.sessions.length;
  await h.backend.resume(h.project.id); await h.settle(); await h.assertSettled('failed');
  assert.equal(h.sessions.length, count, 'An unchanged repair must stop further automatic fixing passes');
  assert.equal(h.project.runCheckpoint.repairAttempts, 1);
  assert.match(h.project.error, /no source changes/i);
});

test('Stop reports unconfirmed shutdown and refuses resume while preserving the saved artifacts', { timeout: 10000 }, async t => {
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

test('failed initialization without a session handle cannot confirm writer shutdown', { timeout: 10000 }, async t => {
  let creations = 0;
  const h = await harness(t, { createSession: async () => { creations++; throw new Error('Provider error: 503 during initialization'); } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(creations, 1, 'A rejected initializer provides no shutdown evidence for a same-workspace retry');
  assert.match(h.project.error, /shutdown.*not confirmed/i);
  await assert.rejects(h.backend.resume(h.project.id), /shutdown.*not confirmed/i);
});

test('a Codex abort acknowledgement cannot authorize recovery without worker exit evidence', { timeout: 10000 }, async t => {
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
  test(`transient build failure retries once in the same workspace: ${failure}`, { timeout: 10000 }, async t => {
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
    assert.deepEqual(h.sessions.map(s => s.stage), ['intake', 'research', 'plan', 'build', 'build', 'verify']);
    assert.ok(h.sessions.every(s => s.disposed));
  });
}

test('transient retries stop after two stage executions and preserve completed stages', { timeout: 10000 }, async t => {
  const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'build') throw new Error('Provider error: 503'); return false; } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(h.sessions.filter(s => s.stage === 'build').length, 2);
  assert.ok(h.project.stages.slice(0, 3).every(s => s.status === 'complete'));
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'research.md'), 'utf8'), 'Local fixture research');
});

for (const stage of ['intake', 'research', 'plan', 'build', 'verify']) {
  test(`resume continues from first incomplete ${stage} stage using a persisted checkpoint`, { timeout: 10000 }, async t => {
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

test('resume continues a stopped build without restarting its completed plan', { timeout: 10000 }, async t => {
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
  test(`resume refuses a changed brief field: ${field}`, { timeout: 10000 }, async t => {
    const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'build') throw new Error('Synthetic stage defect'); return false; } });
    await h.run(); const count = h.sessions.length;
    h.project[field] = field === 'criteria' || field === 'links' ? ['Changed synthetic value'] : field === 'sourceChallenge' ? { id: 'changed' } : 'Changed synthetic value';
    await assert.rejects(h.backend.resume(h.project.id), /brief.*changed|changed.*brief/i);
    assert.equal(h.sessions.length, count); assert.equal(h.backend.active.size, 0);
    assert.equal(h.project.status, 'failed');
  });
}

for (const file of ['requirements.md', '.fleet/packet.json', '.fleet/README.md', 'acceptance-plan.json', 'ux-spec.json', 'plan.md', 'test-matrix.md']) {
  test(`resume refuses changed frozen inputs: ${file}`, { timeout: 10000 }, async t => {
    const h = await harness(t, { scenario: ({ stage }) => { if (stage === 'build') throw new Error('Synthetic stage defect'); return false; } });
    await h.run(); const count = h.sessions.length;
    await fs.appendFile(path.join(h.project.workspace, file), '\nChanged synthetic input');
    await assert.rejects(h.backend.resume(h.project.id), /requirements.*changed|integrity failed|changed after planning|plan.*changed/i);
    assert.equal(h.sessions.length, count); assert.equal(h.backend.active.size, 0);
  });
}

test('resume requires an eligible status and a host checkpoint', { timeout: 10000 }, async t => {
  const h = await harness(t);
  await assert.rejects(h.backend.resume(h.project.id), /failed or stopped/);
  h.project.status = 'failed';
  await assert.rejects(h.backend.resume(h.project.id), /checkpoint|new run/i);
  assert.equal(h.backend.active.size, 0);
});

for (const recover of [true, false]) {
  test(`a failing journey gets two detailed repairs and ${recover ? 'recovers' : 'stops at the limit'}`, { timeout: 10000 }, async t => {
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

test('repair stops early when source does not change', { timeout: 10000 }, async t => {
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

test('real Node failures get a second repair with the latest exact output', { timeout: 10000 }, async t => {
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

test('a stage timeout retries once and late events from the old attempt stay ignored', { timeout: 10000 }, async t => {
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

test('a transient error never retries over modified frozen inputs', { timeout: 10000 }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (stage !== 'build') return false;
    await fs.appendFile(path.join(cwd, 'requirements.md'), '\nSynthetic forbidden change');
    throw new Error('Provider error: 503');
  } });
  await h.run(); await h.assertSettled('failed'); assert.match(h.project.error, /requirements changed/);
  assert.equal(h.sessions.filter(s => s.stage === 'build').length, 1);
});

test('permanent provider authentication errors do not trigger a stage retry', { timeout: 10000 }, async t => {
  const h = await harness(t, { scenario: ({ stage }) => {
    if (stage === 'build') throw new Error('Provider error: 401 unauthorized'); return false;
  } });
  await h.run(); await h.assertSettled('failed');
  assert.equal(h.sessions.filter(s => s.stage === 'build').length, 1);
});

test('resume after Stop at the review boundary rechecks evidence without repeating completed agents', { timeout: 10000 }, async t => {
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
        journeyIds: ['parse-task', 'recover-empty'] } : criterion);
    await fs.writeFile(filename, JSON.stringify(plan));
    return true;
  } });
  h.project.criteria = [];
  h.project.resources = 'Synthetic task messages and a blank report template.';
  h.project.links = ['https://example.com/reference'];
  await h.run(); await h.assertSettled('review');
  const requirements = await fs.readFile(path.join(h.project.workspace, 'requirements.md'), 'utf8');
  assert.match(requirements, /No evaluation criteria supplied/);
  assert.ok(requirements.includes(h.project.resources));
  assert.ok(requirements.includes(h.project.links[0]));
  const packet = JSON.parse(await fs.readFile(path.join(h.project.workspace, '.fleet/packet.json'), 'utf8'));
  assert.deepEqual(packet.userScope.criteria, []);
  assert.equal(packet.userScope.resources, h.project.resources);
  assert.deepEqual(packet.userScope.links, h.project.links);
  assert.equal(reportPassed(h.project.report), true);
});

test('the complete workflow advances in order and persists real test evidence before human review', { timeout: functionalTimeout }, async t => {
  const h = await harness(t); await h.run(); await h.assertSettled('review');
  assert.deepEqual(h.sessions.map(s => s.stage), ['intake', 'research', 'plan', 'build', 'verify'], h.project.logs.filter(log => log.stage === 'verify').map(log => log.text).join('\n'));
  for (const id of ['intake', 'research', 'plan', 'build', 'verify']) {
    const changes = h.snapshots.map(p => p.stages.find(s => s.id === id).status).filter((s, i, all) => !i || s !== all[i - 1]);
    assert.deepEqual(changes, ['queued', 'active', 'complete'], id);
  }
  assert.equal(reportPassed(h.project.report), true); assert.equal(h.project.report.passed, 2);
  assert.equal(h.project.qualityVersion, 1);
  assert.equal(h.project.report.quality.status, 'passed');
  assert.equal(h.project.report.quality.journeys.length, 4);
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
  assert.deepEqual(h.project.globalTools, ['read', 'write', 'edit', 'bash']);
  const packet = JSON.parse(await fs.readFile(path.join(h.project.workspace, '.fleet/packet.json'), 'utf8'));
  assert.deepEqual(h.project.phasePlan, packet.stages);
  assert.deepEqual(h.project.globalTools, packet.globalTools);
  for (const session of h.sessions) {
    const phase = packet.stages.find(phase => phase.id === session.stage);
    assert.deepEqual(session.tools, [...packet.globalTools, ...phase.tools]);
    assert.deepEqual(session.skills.sort(), [...phase.skills].sort());
    assert.deepEqual(session.customTools.map(tool => tool.name).sort(), [...phase.tools, ...(packet.globalTools.includes('bash') ? ['bash'] : [])].sort());
    assert.match(session.prompts[0], /Global workspace tools inherited by every agent phase/);
  }
});

for (const repair of [true, false]) test(`passing Node tests cannot hide a static browser app (${repair ? 'repairs UI' : 'blocks review'})`, { timeout: functionalTimeout }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage }) => {
    if (stage === 'build') {
      await artifacts(cwd, stage);
      await fs.writeFile(path.join(cwd, 'index.html'), '<!doctype html><title>Placeholder</title><main>Works</main>');
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

test('builder cannot weaken a planned browser expectation', { timeout: 10000 }, async t => {
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

test('invalid acceptance coverage gets one planning completion attempt before build is blocked', { timeout: 10000 }, async t => {
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
    assert.deepEqual(h.sessions.map(s => s.stage), ['intake', 'research', 'plan', 'build', 'verify', 'repair', ...(brokenRepair ? ['repair'] : [])], JSON.stringify(h.project.logs));
    assert.equal(reportPassed(h.project.report), !brokenRepair, JSON.stringify(h.project.report));
    assert.equal(h.project.logs.filter(l => l.text.includes('Starting one Pi repair attempt')).length, 1);
    if (brokenRepair) { assert.match(h.project.error, /Verification did not pass/); assert.equal(h.project.report.failed, 2); }
  });
}

for (const blockedStage of ['intake', 'research', 'plan', 'build', 'verify']) {
  test(`a stalled ${blockedStage} stage fails, clears active stages and frees its run slot`, { timeout: 10000 }, async t => {
    const h = await harness(t, { agentLimits: { idleMs: 200, timeoutMs: 3000 }, scenario: ({ stage }) => stage === blockedStage ? never() : false });
    await h.run(); await h.assertSettled('failed'); assert.match(h.project.error, /no progress/);
    assert.equal(h.sessions.at(-1).stage, blockedStage); assert.equal(h.sessions.at(-1).aborts, 1);
    assert.equal(h.project.report, undefined);
  });

  test(`stopping during ${blockedStage} waits for persisted stopped state, not SDK abort`, { timeout: 10000 }, async t => {
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

test('an agent that keeps omitting artifacts cannot advance or loop forever', { timeout: 10000 }, async t => {
  const h = await harness(t, { scenario: ({ stage }) => stage === 'plan' });
  await h.run(); await h.assertSettled('failed');
  assert.equal(h.sessions.length, 3); assert.equal(h.sessions.find(s => s.stage === 'plan').prompts.length, 2);
  assert.match(h.project.error, /after one completion attempt.*plan\.md/);
});

test('empty files and directories cannot satisfy stage outputs', { timeout: 10000 }, async t => {
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
      assert.match(session.prompts.at(-1), /synthetic sample input and the expected output/);
    }
    if (stage === 'verify') {
      assert.match(await fs.readFile(path.join(cwd, 'README.md'), 'utf8'), /Task parser/);
      assert.match(session.prompts[0], /update README.md/);
    }
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.deepEqual(steps, ['intake', 'research', 'plan', 'build', 'guide', 'verify']);
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

test('stopping while writing the user guide aborts the build and never starts verification', { timeout: 10000 }, async t => {
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
  test(`changes to ${target} stop the workflow at the stage boundary`, { timeout: 10000 }, async t => {
    const h = await harness(t, { scenario: async ({ cwd, stage }) => {
      if (stage === 'plan') await fs.appendFile(path.join(cwd, target), '\nChanged by agent'); return false;
    } });
    await h.run(); await h.assertSettled('failed'); assert.equal(h.sessions.length, 3);
    assert.match(h.project.error, /requirements changed|integrity failed/);
  });
}

test('session initialization errors and preparation errors release capacity', { timeout: 10000 }, async t => {
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

test('Stop during workspace preparation clears prior approval and test evidence', { timeout: 10000 }, async t => {
  const h = await harness(t);
  h.project.status = 'approved'; h.project.approvedAt = 'previous approval';
  h.project.report = { passed: 5 }; h.project.exportedTo = 'previous export';
  const rejected = assert.rejects(h.backend.start(h.project.id), /stopped by you/);
  await h.backend.stop(h.project.id); await rejected; await h.assertSettled('stopped');
  assert.equal(h.project.report, undefined); assert.equal(h.project.approvedAt, undefined);
  assert.equal(h.project.exportedTo, undefined); assert.equal(h.sessions.length, 0);
});

test('duplicate starts and the concurrency limit are enforced; stopAll drains and persists every run', { timeout: 10000 }, async t => {
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
  const h = await harness(t, { verificationLimits: { timeoutMs: 500 }, scenario: async ({ cwd, stage }) => {
    if (stage === 'build') { await artifacts(cwd, stage); await fs.writeFile(path.join(cwd, 'hang.test.cjs'), 'setInterval(() => {}, 1000);'); return true; }
    if (stage === 'repair') await fs.writeFile(path.join(cwd, 'hang.test.cjs'), 'require("node:test")("invalid prefix", () => require("node:assert/strict").equal(require("./core.cjs").parse("INVALID"), null));');
    return false;
  } });
  await h.run(); await h.assertSettled('review');
  assert.ok(h.project.logs.some(l => l.text.includes('Verification exceeded'))); assert.equal(h.sessions.at(-1).stage, 'repair');
});
