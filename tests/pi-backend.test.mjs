import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { PiBackend } from '../dist-electron/electron/pi-backend.js';
import { reportPassed } from '../dist-electron/electron/verification.js';
import { verifyApplication } from '../dist-electron/electron/quality.js';
import { qualityFixture, qualityFixtureHtml } from '../scripts/quality-fixture.mjs';

const resourcesRoot = path.resolve('.');
const never = () => new Promise(() => {});
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const stageOf = prompt => prompt.includes('The independent test run failed') ? 'repair'
  : prompt.includes('You are the intake agent') ? 'intake'
  : prompt.includes('You are the research agent') ? 'research'
  : prompt.includes('You are the implementation agent') ? 'build'
  : prompt.includes('You are the verification agent') ? 'verify' : 'plan';
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
  store.state.settings = { provider: 'fixture', model: 'fixture', rememberKey: false, ...options.settings };
  const project = store.state.projects[0], sessions = [], snapshots = [];
  const backend = new PiBackend(store, process.execPath, () => snapshots.push(structuredClone(project)), options.resourcesRoot ?? resourcesRoot, {
    budgetClock: options.budgetClock,
    verifyApplication: options.verifyApplication,
    codex: options.codex,
    createCodexSession: options.createCodexSession,
    cancellationGraceMs: options.cancellationGraceMs ?? 20,
    agentLimits: options.agentLimits ?? { idleMs: 2000, timeoutMs: 5000, maxTurns: 40 },
    verificationLimits: { browserTimeoutMs: 20_000, browserStepTimeoutMs: 2000, ...options.verificationLimits },
    createSession: async ({ cwd, customTools, tools, resourceLoader }) => {
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
          this.emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } });
          this.emit({ type: 'turn_end' });
        },
        abort() { this.aborts++; return never(); },
        dispose() { this.disposed = true; }
      };
      sessions.push(s); return { session: s };
    }
  });
  backend.runtime = { getModel: () => ({}), hasConfiguredAuth: () => true };
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
  return { root, store, project, backend, sessions, snapshots, run, settle, assertSettled };
}

test('builds accept optional criteria and hand resources and links to agents', { timeout: 10000 }, async t => {
  const h = await harness(t);
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

test('the complete workflow advances in order and persists real test evidence before human review', { timeout: 10000 }, async t => {
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
    assert.deepEqual(session.customTools.map(tool => tool.name).sort(), [...phase.tools].sort());
    assert.match(session.prompts[0], /Global workspace tools inherited by every agent phase/);
  }
});

for (const repair of [true, false]) test(`passing Node tests cannot hide a static browser app (${repair ? 'repairs UI' : 'blocks review'})`, { timeout: 30000 }, async t => {
  const h = await harness(t, { verificationLimits: { browserStepTimeoutMs: 1000 }, scenario: async ({ cwd, stage }) => {
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
  assert.equal(reportPassed(h.project.report, true), repair);
  assert.equal(h.sessions.filter(session => session.stage === 'repair').length, 1);
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
  test(`independent test failure gets exactly one repair and ${brokenRepair ? 'fails clearly' : 'advances after re-verification'}`, { timeout: 10000 }, async t => {
    const h = await harness(t, { brokenBuild: true, brokenRepair }); await h.run();
    await h.assertSettled(brokenRepair ? 'failed' : 'review');
    assert.deepEqual(h.sessions.map(s => s.stage), ['intake', 'research', 'plan', 'build', 'verify', 'repair']);
    assert.equal(reportPassed(h.project.report), !brokenRepair);
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

test('missing artifacts get one targeted completion prompt within the same stage', { timeout: 10000 }, async t => {
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

test('missing application tests are recovered before verification starts', { timeout: 10000 }, async t => {
  const h = await harness(t, { scenario: async ({ cwd, stage, session }) => {
    if (stage !== 'build') return false;
    await artifacts(cwd, stage); if (session.prompts.length === 1) await fs.rm(path.join(cwd, 'app.test.cjs')); return true;
  } });
  await h.run(); await h.assertSettled('review');
  assert.equal(h.sessions.find(s => s.stage === 'build').prompts.length, 3); assert.match(h.sessions.find(s => s.stage === 'build').prompts[1], /application.*test/);
});

test('the user guide is requested after implementation and checked before verification', { timeout: 10000 }, async t => {
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
  test(`an empty user guide ${recover ? 'gets one completion attempt' : 'blocks verification after one completion attempt'}`, { timeout: 10000 }, async t => {
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

test('repair updates the user guide before independent verification fingerprints the source', { timeout: 10000 }, async t => {
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

test('stopped runs can restart in fresh workspaces and late old events cannot corrupt the new run', { timeout: 10000 }, async t => {
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

test('a hung generated test is bounded, repaired once, then reaches review on actual passing evidence', { timeout: 10000 }, async t => {
  const h = await harness(t, { verificationLimits: { timeoutMs: 500 }, scenario: async ({ cwd, stage }) => {
    if (stage === 'build') { await artifacts(cwd, stage); await fs.writeFile(path.join(cwd, 'hang.test.cjs'), 'setInterval(() => {}, 1000);'); return true; }
    if (stage === 'repair') await fs.writeFile(path.join(cwd, 'hang.test.cjs'), 'require("node:test")("invalid prefix", () => require("node:assert/strict").equal(require("./core.cjs").parse("INVALID"), null));');
    return false;
  } });
  await h.run(); await h.assertSettled('review');
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

test('the whole-build deadline survives a phase boundary and persists artifacts and elapsed usage', { timeout: 10000 }, async t => {
  const clock = budgetClock();
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, scenario: async ({ cwd, stage }) => {
    if (stage === 'intake') { clock.advance(45_000); return false; }
    if (stage === 'research') { await artifacts(cwd, stage); clock.advance(15_000); return never(); }
    return false;
  } });
  await h.run(); await assertBudgetExhausted(h);
  assert.deepEqual(h.sessions.map(session => session.stage), ['intake', 'research']);
  assert.equal(h.sessions[1].aborts, 1); assert.equal(h.sessions[1].disposed, true);
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'scope.md'), 'utf8'), 'Synthetic scope');
  assert.equal(await fs.readFile(path.join(h.project.workspace, 'research.md'), 'utf8'), 'Local fixture research');
  assert.equal(h.project.runSummary.phases.reduce((sum, phase) => sum + phase.durationMs, 0), 60_000);
  assert.equal(h.project.runSummary.usage.prompts, 2);
});

test('a hung session setup exhausts the whole-build deadline and releases the run slot', { timeout: 10000 }, async t => {
  const clock = budgetClock(), entered = deferred();
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, createSession: () => { entered.resolve(); return never(); } });
  await h.backend.start(h.project.id); await entered.promise;
  clock.advance(60_000); await h.settle(); await assertBudgetExhausted(h);
  assert.equal(h.sessions.length, 0);
  assert.equal(h.project.runSummary.usage.prompts, 0);
});

test('Codex account setup is inside the build deadline before any session can start', { timeout: 10000 }, async t => {
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

test('a stalled state save cannot retain capacity forever after the build budget expires', { timeout: 10000 }, async t => {
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

test('late session initialization after budget expiry is disposed without model dispatch', { timeout: 10000 }, async t => {
  const clock = budgetClock(), entered = deferred(), sessionReady = deferred();
  const lateSession = { prompts: 0, aborts: 0, disposed: 0,
    subscribe() { return () => {}; }, prompt() { this.prompts++; return never(); },
    abort() { this.aborts++; return never(); }, dispose() { this.disposed++; }
  };
  const h = await harness(t, { budgetClock: clock, settings: { buildTimeLimitMinutes: 1 }, createSession: () => { entered.resolve(); return sessionReady.promise; } });
  await h.backend.start(h.project.id); await entered.promise;
  clock.advance(60_000); await h.settle(); await assertBudgetExhausted(h);
  const saved = structuredClone(h.project);
  sessionReady.resolve({ session: lateSession });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(lateSession.prompts, 0); assert.equal(lateSession.aborts, 1); assert.equal(lateSession.disposed, 1);
  assert.deepEqual(h.project, saved);
});

test('retry and compaction activity cannot postpone the build deadline', { timeout: 10000 }, async t => {
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

for (const recovery of ['artifact', 'guide']) test(`${recovery} recovery shares the existing build allowance`, { timeout: 10000 }, async t => {
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

test('host verification shares the build deadline and cancellation signal', { timeout: 10000 }, async t => {
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

test('verification teardown completes before a budget-exhausted run releases capacity', { timeout: 10000 }, async t => {
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

test('budget expiry terminates the verification worker and descendants before releasing capacity', { timeout: 15000 }, async t => {
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

test('repair consumes the remaining allowance and cannot begin another verification after expiry', { timeout: 10000 }, async t => {
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

test('human review freezes the build summary and a fresh run preserves the prior run summary', { timeout: 15000 }, async t => {
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
