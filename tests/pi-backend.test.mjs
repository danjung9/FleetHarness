import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { PiBackend } from '../dist-electron/electron/pi-backend.js';
import { reportPassed } from '../dist-electron/electron/verification.js';
import { qualityFixtureHtml } from '../scripts/quality-fixture.mjs';
import { solutionFixture, solutionFixtureEvaluator } from '../scripts/solution-fixture.mjs';
import { syntheticDataFiles } from '../scripts/data-fixture.mjs';
import { foundationRuntime } from '../dist-electron/harness/foundations.js';

const resourcesRoot = path.resolve('.');
// Each workflow prepares independent packages and launches real browser contexts.
// This outer test budget is separate from the explicitly tested agent/runtime deadlines.
const workflowTimeout = 30_000;
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
  const backend = new PiBackend(store, process.execPath, () => snapshots.push(structuredClone(project)), options.resourcesRoot ?? resourcesRoot, {
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
            components: [{ id: 'parser', label: 'Parser', description: 'Extract task text', kind: 'logic', files: [options.componentFile ?? 'core.cjs'] }], connections: []
          });
          if (text.startsWith('Implementation is complete.')) this.writingGuide = true;
          const step = this.writingGuide ? 'guide' : this.stage;
          const handled = await options.scenario?.({ cwd, stage: step, session: this, sessions, project, store });
          if (!handled) await artifacts(cwd, step, options.brokenBuild && (this.stage === 'build' || options.brokenRepair));
          if (['build', 'verify', 'repair'].includes(this.stage) && !(options.deferComponentProgress && this.stage === 'build' && !this.writingGuide)) await customTools.find(tool => tool.name === 'fleet_component_progress').execute('progress', { componentId: 'parser', status: 'generated', detail: 'Source written; harness tests follow.' });
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

test('builds accept optional criteria and hand resources and links to agents', { timeout: workflowTimeout }, async t => {
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
  assert.equal(h.sessions.filter(session => session.stage === 'synthetic-data').length, 1, 'Resource notes and reference links do not count as connected data');
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
  assert.deepEqual(specialist.tools, ['read', 'write', 'edit', 'bash']);
  assert.deepEqual(specialist.customTools, []);
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

test('the complete workflow advances in order and persists real test evidence before human review', { timeout: workflowTimeout }, async t => {
  const h = await harness(t); await h.run(); await h.assertSettled('review');
  assert.deepEqual(h.sessions.map(s => s.stage), ['intake', 'synthetic-data', 'research', 'plan', 'build', 'verify'], h.project.logs.filter(log => log.stage === 'verify').map(log => log.text).join('\n'));
  for (const id of ['intake', 'research', 'plan', 'build', 'verify']) {
    const changes = h.snapshots.map(p => p.stages.find(s => s.id === id).status).filter((s, i, all) => !i || s !== all[i - 1]);
    assert.deepEqual(changes, ['queued', 'active', 'complete'], id);
  }
  assert.equal(reportPassed(h.project.report), true); assert.equal(h.project.report.passed, 2);
  assert.equal(h.project.qualityVersion, 2);
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
    if (session.stage === 'synthetic-data') continue;
    const phase = packet.stages.find(phase => phase.id === session.stage);
    assert.deepEqual(session.tools, [...packet.globalTools, ...phase.tools]);
    assert.deepEqual(session.skills.sort(), [...phase.skills].sort());
    assert.deepEqual(session.customTools.map(tool => tool.name).sort(), [...phase.tools].sort());
    assert.match(session.prompts[0], /Global workspace tools inherited by every agent phase/);
  }
});

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
  assert.equal(h.sessions.find(session => session.stage === 'build').prompts.length, 2, 'Incomplete UI components must not trigger artifact repair before the core gate');
  assert.equal(reportPassed(h.project.report, true), true);
});

for (const repair of [true, false]) test(`required core evaluation ${repair ? 'repairs the engine' : 'blocks application completion'}`, { timeout: 20000 }, async t => {
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

for (const repair of [true, false]) test(`passing Node tests cannot hide a static browser app (${repair ? 'repairs UI' : 'blocks review'})`, { timeout: 30000 }, async t => {
  const h = await harness(t, { verificationLimits: { browserStepTimeoutMs: 1000 }, scenario: async ({ cwd, stage }) => {
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
  assert.equal(reportPassed(h.project.report, true), repair);
  assert.equal(h.sessions.filter(session => session.stage === 'repair').length, 1);
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
  test(`independent test failure gets exactly one repair and ${brokenRepair ? 'fails clearly' : 'advances after re-verification'}`, { timeout: workflowTimeout }, async t => {
    const h = await harness(t, { brokenBuild: true, brokenRepair }); await h.run();
    await h.assertSettled(brokenRepair ? 'failed' : 'review');
    assert.deepEqual(h.sessions.map(s => s.stage), ['intake', 'synthetic-data', 'research', 'plan', 'build', 'verify', 'repair']);
    assert.equal(reportPassed(h.project.report), !brokenRepair);
    assert.equal(h.project.logs.filter(l => l.text.includes('Starting one Pi repair attempt')).length, 1);
    if (brokenRepair) { assert.match(h.project.error, /Verification did not pass/); assert.equal(h.project.report.failed, 2); }
  });
}

for (const blockedStage of ['intake', 'synthetic-data', 'research', 'plan', 'build', 'verify']) {
  test(`a stalled ${blockedStage} stage fails, clears active stages and frees its run slot`, { timeout: workflowTimeout }, async t => {
    const h = await harness(t, { agentLimits: { idleMs: 200, timeoutMs: 3000 }, scenario: ({ stage }) => stage === blockedStage ? never() : false });
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
  assert.equal(h.sessions.find(s => s.stage === 'build').prompts.length, 3); assert.match(h.sessions.find(s => s.stage === 'build').prompts[1], /application.*test/);
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
