import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentBrowserSession } from '../dist-electron/electron/agent-browser.js';
import { verifyBrowserJourneys } from '../dist-electron/electron/browser-verification.js';
import { performBrowserStep } from '../dist-electron/electron/browser-actions.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { parseQualityPlan } from '../dist-electron/harness/quality-contract.js';
import { parseBehavioralContract, parseCandidateExecutionContract, compilePublicContracts, experimentContractHash } from '../dist-electron/harness/experiment-contract.js';

const acceptance = [{ id: 'R1', requirement: 'Saved tasks survive a service restart.', method: 'automated', scenario: 'Save in the interface, restart and observe the backend.' }];
const manifest = { profile: 'service', files: ['server.mjs', 'index.html'], requiredEnv: [],
  command: { runtime: 'node', entrypoint: 'server.mjs', args: [] }, healthPath: '/health', invokePath: '/invoke' };
const capability = { id: 'storage', kind: 'stateful', required: true, description: 'Persist tasks.', criterionIds: ['R1'], evaluationIds: ['storage-cases'] };
const solution = profile => ({ schemaVersion: 1, objective: 'Persist saved tasks.', capabilities: [capability], runtime: { ...manifest, profile } });
const state = () => ({ action: 'expectServiceState', input: { action: 'read' }, expected: { task: 'Inspect pump' } });
const steps = () => [
  { action: 'fill', selector: '#task', value: 'Inspect pump' },
  { action: 'click', selector: '#save' },
  { action: 'expectText', selector: '#result', text: 'Saved: Inspect pump' },
  state(), { action: 'restartRuntime' },
  { action: 'expectText', selector: '#result', text: 'Saved: Inspect pump' },
  { action: 'expectText', selector: '#session', text: 'Same browser session' },
  state()
];
const journey = () => ({ id: 'persist', title: 'Save and recover after process replacement', kind: 'primary', steps: steps() });
function plan() {
  return { schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'The backend and interface retain the saved task.', capabilityIds: ['storage'], journeyIds: ['persist', 'recover'] }],
    journeys: [journey(), { ...journey(), id: 'recover', kind: 'recovery' }] };
}

test('lifecycle steps require a service contract and bounded host JSON without selectors or commands', () => {
  const parsed = parseQualityPlan(plan(), acceptance, solution('service'));
  assert.deepEqual(parsed.journeys[0].steps, steps());
  for (const profile of ['browser', 'cli']) assert.throws(() => parseQualityPlan(plan(), acceptance, solution(profile)), /declared service runtime/);
  const legacy = plan(); legacy.schemaVersion = 1; delete legacy.criteria[0].capabilityIds;
  assert.throws(() => parseQualityPlan(legacy, acceptance), /declared service runtime/);
  for (const invalid of [
    { action: 'restartRuntime', command: 'restart' }, { action: 'restartRuntime', selector: '#restart' },
    { ...state(), expected: { task: Infinity } }, { ...state(), expected: 'x'.repeat(100_001) },
    { ...state(), input: undefined }, { ...state(), expected: { get task() { throw new Error('Must not execute getters'); } } }
  ]) {
    const value = plan(); value.journeys[0].steps[3] = invalid;
    assert.throws(() => parseQualityPlan(value, acceptance, solution('service')), /unknown field|finite JSON|JSON limit|ordinary JSON/);
  }
});

function behavior() {
  return { schemaVersion: 1, objective: 'Persist saved tasks.', surface: 'browser',
    delivery: { profiles: ['node-service', 'python-service'], network: 'offline', operationIds: [] },
    invocation: { input: 'Object with action: read or save and task on save.', output: 'Object with task: string or null.', rules: ['Read returns the saved task; save stores task durably.'] },
    capabilities: [capability],
    criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Saved tasks survive a process restart.', capabilityIds: ['storage'], scenarioIds: ['persist', 'recover'] }],
    ux: { audience: 'Operators', primaryTask: 'Save a task', successOutcome: 'Task survives restart',
      states: { empty: 'No tasks', loading: 'Saving', error: 'Correct task', success: 'Saved task' }, persistence: 'Durable backend state.', recovery: 'Correct invalid task.', keyboard: 'Native controls.' },
    scenarios: ['persist', 'recover'].map((id, i) => ({ id, title: id, kind: i ? 'recovery' : 'primary', steps: [
      { id: 'task', action: 'input', value: 'Inspect pump' }, { id: 'save', action: 'activate' },
      { id: 'saved', action: 'expectText', text: 'Saved: Inspect pump' }, { id: 'restart', action: 'restartRuntime' },
      { id: 'backend', ...state() }, { id: 'restored', action: 'expectText', text: 'Saved: Inspect pump' }
    ] })) };
}
function execution(shared) {
  return { schemaVersion: 1, behaviorHash: experimentContractHash(shared), architectureId: 'node-service', runtime: manifest,
    foundation: { schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'Lifecycle contract regression fixture.' },
    systemDesign: { title: 'Persistent tasks', description: 'Save tasks durably.', components: [{ id: 'service', label: 'Storage service', description: 'Own task persistence.', kind: 'logic', files: ['server.mjs'] }], connections: [] },
    screens: [{ name: 'Tasks', purpose: 'Save tasks', primaryAction: 'Save' }],
    bindings: shared.scenarios.map(scenario => ({ scenarioId: scenario.id, steps: scenario.steps.map(step => ({ stepId: step.id,
      ...(['restartRuntime', 'expectServiceState'].includes(step.action) ? {} : { selector: '#' + step.id }),
      ...(step.action === 'input' ? { action: 'fill' } : step.action === 'activate' ? { action: 'click' } : {}) })) })) };
}

test('experiments freeze service lifecycle inputs and answers across compatible architectures', () => {
  const shared = parseBehavioralContract(behavior(), acceptance), candidate = execution(shared);
  const parsed = parseCandidateExecutionContract(candidate, shared, acceptance);
  const compiled = compilePublicContracts(shared, parsed);
  assert.deepEqual(compiled.plan.journeys[0].steps[3], { action: 'restartRuntime' });
  assert.deepEqual(compiled.plan.journeys[0].steps[4], state());
  for (const profiles of [undefined, ['browser-js'], ['node-service', 'browser-js']]) {
    const value = behavior();
    if (profiles) value.delivery.profiles = profiles; else delete value.delivery;
    assert.throws(() => parseBehavioralContract(value, acceptance), /only node-service/);
  }
  for (const injected of [{ selector: '#restart' }, { before: [{ action: 'click', selector: '#restart' }] }, { input: { action: 'reset' } }, { expected: { task: null } }]) {
    const value = execution(shared); Object.assign(value.bindings[0].steps[4], injected);
    assert.throws(() => parseCandidateExecutionContract(value, shared, acceptance), /unknown field/);
  }
});

test('unsupported runtime hooks fail explicitly and exact state matching ignores object key order only', async () => {
  await assert.rejects(performBrowserStep({}, { action: 'restartRuntime' }, 100), /host-managed service runtime/);
  await assert.rejects(performBrowserStep({}, state(), 100), /host-managed service invocation/);
  const expected = { task: 'Pump', tags: ['a', 'b'] }, input = { action: 'read' };
  await performBrowserStep({}, { action: 'expectServiceState', input, expected }, 100, undefined, undefined, undefined,
    { invokeService: async received => { assert.deepEqual(received, input); return { tags: ['a', 'b'], task: 'Pump' }; } });
  await assert.rejects(performBrowserStep({}, { action: 'expectServiceState', input, expected }, 100, undefined, undefined, undefined,
    { invokeService: async () => ({ tags: ['b', 'a'], task: 'Pump' }) }), /expectServiceState: expected/);
});

async function fixture(t, persistent) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-service-lifecycle-browser-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const html = `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Saved tasks</title>
    <label>Task <input id="task"></label><button id="save">Save</button><p id="result">No saved task</p><p id="session">New browser session</p>
    <script>
    const show=task=>document.querySelector('#result').textContent=task?'Saved: '+task:'No saved task';
    show(localStorage.getItem('task'));
    if(sessionStorage.getItem('seen'))document.querySelector('#session').textContent='Same browser session';
    document.querySelector('#save').onclick=async()=>{
      const task=document.querySelector('#task').value;
      const response=await fetch('/invoke',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'save',task})});
      const saved=await response.json();localStorage.setItem('task',saved.task);sessionStorage.setItem('seen','yes');show(saved.task);
    };
    </script></html>`;
  await fs.writeFile(path.join(root, 'index.html'), html);
  await fs.writeFile(path.join(root, 'server.mjs'), `import {createServer} from 'node:http';import {readFileSync,writeFileSync,existsSync} from 'node:fs';
    const file='.runtime-data/task.json';let task=${persistent ? "existsSync(file)?JSON.parse(readFileSync(file,'utf8')):null" : 'null'};
    createServer(async(req,res)=>{
      if(req.url==='/health'){res.end('ready');return;}
      if(req.url==='/invoke'){
        let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body);
        if(input.action==='save'){task=input.task;${persistent ? 'writeFileSync(file,JSON.stringify(task));' : ''}}
        res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify({task}));return;
      }
      res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'}).end(readFileSync('index.html'));
    }).listen(Number(process.env.PORT),process.env.HOST);`);
  return { root, prepare: signal => prepareSolutionRuntime(root, manifest, process.execPath, signal) };
}

for (const persistent of [true, false]) {
  const label = persistent ? 'durable backend' : 'memory-only backend masked by localStorage';
  test(`final browser verification checks ${label} after an actual service restart`, { timeout: 30_000 }, async t => {
    const app = await fixture(t, persistent), prepared = [], restarts = [];
    const result = await verifyBrowserJourneys({ root: app.root, plan: { ...plan(), journeys: [journey()] }, contractHash: 'lifecycle',
      timeoutMs: 25_000, stepTimeoutMs: 3000, allowSameOrigin: true,
      prepareRuntime: async signal => {
        const runtime = await app.prepare(signal); prepared.push(runtime);
        return { ...runtime, restart: async () => {
          const before = { url: runtime.url, root: runtime.root, hash: runtime.provenance.filesHash };
          await runtime.restart();
          assert.deepEqual({ url: runtime.url, root: runtime.root, hash: runtime.provenance.filesHash }, before);
          restarts.push(before);
        } };
      } });
    assert.deepEqual(result.errors, []);
    assert.equal(result.journeys.length, 2);
    assert.equal(restarts.length, 2);
    for (const outcome of result.journeys) {
      assert.equal(outcome.status, persistent ? 'passed' : 'failed', outcome.detail);
      assert.equal(outcome.totalSteps, steps().length);
      assert.equal(outcome.completedSteps, persistent ? steps().length : steps().length - 1);
      assert.ok(outcome.screenshot && outcome.trace);
      if (!persistent) assert.match(outcome.detail, /expectServiceState: expected.*Inspect pump.*received.*null/);
    }
    assert.notEqual(prepared[0].root, prepared[1].root, 'Each viewport must still use an independent clean package.');
    for (const runtime of prepared) await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
    await assert.rejects(fs.access(path.join(app.root, '.runtime-data')), { code: 'ENOENT' });
  });

  test(`development journeys check ${label} through the same host lifecycle actions`, { timeout: 20_000 }, async t => {
    const app = await fixture(t, persistent), controller = new AbortController(), invocations = [];
    const browser = new AgentBrowserSession({ root: app.root, signal: controller.signal, journeys: [journey()], timeoutMs: 15_000, stepTimeoutMs: 3000,
      prepare: async signal => {
        const runtime = await app.prepare(signal);
        return { url: runtime.url, restart: runtime.restart, invokeService: async input => { invocations.push(input); return runtime.invoke(input); },
          close: runtime.close, assertIntegrity: runtime.assertIntegrity, filesHash: runtime.provenance.filesHash, redactMessage: runtime.redactMessage };
      } });
    t.after(() => browser.close());
    const tool = browser.tools()[0];
    const result = await tool.execute('lifecycle-test', { action: 'journey', journeyId: 'persist' });
    assert.equal(result.isError, !persistent, JSON.stringify(result.details));
    assert.equal(result.details.journey.status, persistent ? 'passed' : 'failed');
    assert.equal(result.details.journey.completedSteps, persistent ? steps().length : steps().length - 1);
    assert.deepEqual(invocations, [{ action: 'read' }, { action: 'read' }]);
    assert.match(result.details.pageText, /Saved: Inspect pump/);
    assert.match(result.details.pageText, /Same browser session/);
    if (!persistent) assert.match(result.details.journey.detail, /expectServiceState: expected.*received.*null/);
    assert.equal((await tool.execute('injected', { action: 'restartRuntime' })).isError, true, 'Only a frozen journey may invoke lifecycle actions.');
  });
}

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

for (const runner of ['final', 'development']) {
  test(`${runner} lifecycle operations use runtime deadlines instead of the shorter DOM step timeout`, { timeout: 25_000 }, async t => {
    const app = await fixture(t, true), controller = new AbortController();
    const prepare = async signal => {
      const runtime = await app.prepare(signal);
      return { ...runtime,
        restart: async () => { await pause(1200); await runtime.restart(); },
        invoke: async input => { await pause(1200); return runtime.invoke(input); }
      };
    };
    if (runner === 'final') {
      const result = await verifyBrowserJourneys({ root: app.root, plan: { ...plan(), journeys: [journey()] }, contractHash: 'delayed-lifecycle',
        timeoutMs: 20_000, stepTimeoutMs: 1000, allowSameOrigin: true, prepareRuntime: prepare });
      assert.deepEqual(result.errors, []);
      assert.ok(result.journeys.every(outcome => outcome.status === 'passed'), JSON.stringify(result));
    } else {
      const browser = new AgentBrowserSession({ root: app.root, signal: controller.signal, journeys: [journey()], timeoutMs: 15_000, stepTimeoutMs: 1000,
        prepare: async signal => { const runtime = await prepare(signal); return { ...runtime, invokeService: runtime.invoke, filesHash: runtime.provenance.filesHash }; } });
      t.after(() => browser.close());
      const result = await browser.tools()[0].execute('delayed-lifecycle', { action: 'journey', journeyId: 'persist' });
      assert.equal(result.isError, false, JSON.stringify(result.details));
      assert.equal(result.details.journey.completedSteps, steps().length);
    }
  });

  for (const interruption of ['deadline', 'cancellation']) {
    test(`${runner} stalled restart still obeys ${interruption} and releases its runtime`, { timeout: 15_000 }, async t => {
      const app = await fixture(t, true), controller = new AbortController();
      let entered, closed = 0;
      const restarting = new Promise(resolve => { entered = resolve; });
      const prepare = async signal => {
        const runtime = await app.prepare(signal);
        return { ...runtime, restart: async () => { entered(); await new Promise(() => {}); }, close: async () => { closed++; await runtime.close(); } };
      };
      const onlyRestart = { ...journey(), steps: [{ action: 'restartRuntime' }] };
      let execution;
      if (runner === 'final') {
        execution = verifyBrowserJourneys({ root: app.root, plan: { ...plan(), journeys: [onlyRestart] }, contractHash: 'stalled-restart',
          timeoutMs: 3000, stepTimeoutMs: 1000, allowSameOrigin: true, prepareRuntime: prepare, signal: controller.signal });
      } else {
        const browser = new AgentBrowserSession({ root: app.root, signal: controller.signal, journeys: [onlyRestart], timeoutMs: 3000, stepTimeoutMs: 1000,
          prepare: async signal => { const runtime = await prepare(signal); return { ...runtime, filesHash: runtime.provenance.filesHash }; } });
        t.after(() => browser.close());
        execution = browser.tools()[0].execute('stalled-lifecycle', { action: 'journey', journeyId: 'persist' });
      }
      // Attach rejection handling before cancellation to keep the test process clean.
      const settled = execution.then(value => ({ value }), error => ({ error }));
      await restarting;
      if (interruption === 'cancellation') controller.abort();
      const result = await settled;
      assert.equal(closed, 1, 'The runtime must be closed even when its restart hook never settles.');
      if (runner === 'final' && interruption === 'cancellation') assert.match(result.error?.message ?? '', /stopped|abort/i);
      else if (runner === 'final') {
        assert.match(result.value.journeys[0].detail, /exceeded.*limit/i, JSON.stringify(result));
        assert.ok(result.value.journeys.every(outcome => outcome.status === 'failed'));
      } else {
        assert.equal(result.value.isError, true);
        assert.match(result.value.details.error, interruption === 'deadline' ? /exceeded.*limit/i : /stopped|abort|closed/i);
      }
    });
  }
}
