import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { ExperimentWorkers, experimentProfiles } from '../dist-electron/electron/experiment-workers.js';
import { parseBehavioralContract, experimentContractHash } from '../dist-electron/harness/experiment-contract.js';
import { prepareBriefData } from '../dist-electron/electron/brief-data.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';

const acceptance = [{ id: 'R1', requirement: 'Sum supplied values and recover from invalid input.', method: 'automated', scenario: 'Calculate the total, reject invalid input and retry.' }];
const resources = {
  'assets/tasks.csv': Buffer.from('task,count\ninspect valve,3\n'),
  'assets/notes.txt': Buffer.from('Read the supplied task data.\n'),
  'assets/model.bin': Buffer.from([0, 255, 128, 10]),
  'assets/custom.fleetdata': Buffer.from([9, 0, 254]),
  'assets/LICENSE': Buffer.from('Fixture data license'),
  'assets/empty.bin': Buffer.alloc(0),
  'assets/photo.jpg': Buffer.from([255, 216, 255, 217]),
  'assets/engine.wasm': Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]),
  'assets/data.json': Buffer.from('{"count":3}')
};
const write = async (root, relative, contents) => {
  const file = path.join(root, relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof contents === 'string' || Buffer.isBuffer(contents) ? contents : JSON.stringify(contents));
};

async function plannedExport(t, runtime) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-experiment-resource-parity-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sharedRoot = path.join(root, 'shared'), workspace = path.join(root, 'candidate');
  await fs.mkdir(sharedRoot); await fs.mkdir(workspace);
  const data = await prepareBriefData(sharedRoot, [{ name: 'sample.json', kind: 'text', content: '{"values":[1,2]}' }]);
  const seed = Object.fromEntries(await Promise.all(data.files.map(async file => [file, await fs.readFile(path.join(sharedRoot, file), 'utf8')])));
  const behavior = parseBehavioralContract({ schemaVersion: 1, objective: 'Sum supplied values in a browser.', surface: 'browser',
    delivery: { profiles: ['node-service', 'python-service'], network: 'offline', operationIds: [] },
    invocation: { input: 'Object with values: finite number[].', output: 'Exactly {total:number}.', rules: ['Sum every value; an empty array returns zero.'] },
    capabilities: [{ id: 'sum', kind: 'algorithm', description: 'Sum all supplied values.', criterionIds: ['R1'], required: true, evaluationIds: ['sum-cases'] }],
    criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'The sum is displayed and invalid input can be corrected.', capabilityIds: ['sum'], scenarioIds: ['primary', 'recovery'] }],
    ux: { audience: 'An operator', primaryTask: 'Sum values', successOutcome: 'A correct total', states: { empty: 'Explain input', loading: 'Show progress', error: 'Explain validation', success: 'Show total' }, persistence: 'No persistence required.', recovery: 'Correct invalid input and retry.', keyboard: 'Every control supports keyboard input.' },
    scenarios: [
      { id: 'primary', title: 'Calculate total', kind: 'primary', steps: [{ id: 'values', action: 'input', value: '1,2' }, { id: 'submit', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }] },
      { id: 'recovery', title: 'Correct invalid values', kind: 'recovery', steps: [{ id: 'invalid', action: 'input', value: 'invalid' }, { id: 'reject', action: 'activate' }, { id: 'error', action: 'expectText', text: 'Enter numbers' }, { id: 'correct', action: 'input', value: '1,2' }, { id: 'retry', action: 'activate' }, { id: 'result', action: 'expectText', text: '3' }] }
    ] }, acceptance);
  const evaluation = { schemaVersion: 1, evaluations: [{ id: 'sum-cases', capabilityId: 'sum', description: 'Independent reference sums.', dataset: { name: 'sums', version: '1', provenance: 'reviewed' }, evaluator: 'numeric', tolerance: 0, threshold: 1, trials: 1,
    cases: [{ id: 'ordinary', input: { values: [2, 3] }, expected: { total: 5 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }] }] };
  const experiment = { id: 'resource-experiment' }, candidate = { id: 'resource-candidate', experimentId: experiment.id };
  await write(root, 'experiments/' + experiment.id + '/shared.json', { schemaVersion: 1, experimentId: experiment.id, behavior, evaluation, acceptance,
    data, seed, operations: [], behaviorHash: experimentContractHash(behavior), evaluationSetHash: experimentContractHash(evaluation), taskFamily: 'algorithm', workspace: sharedRoot });
  const profile = experimentProfiles.find(item => item.id === runtime + '-service');
  const application = runtime === 'python' ? 'app.py' : 'app.mjs', adapter = 'runtime-broker/' + (runtime === 'python' ? 'python.py' : 'node.mjs');
  const files = ['index.html', application, adapter, 'integration-config.json', 'foundation-lock.json', ...Object.keys(resources), 'engine.cjs', 'assets/hidden.CJS'];
  const execution = { schemaVersion: 2, behaviorHash: experimentContractHash(behavior), architectureId: profile.id,
    runtime: { profile: 'service', command: { runtime, entrypoint: application, args: [] }, healthPath: '/health', invokePath: '/api/invoke', requiredEnv: [], files },
    foundation: { schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'Host adapter with a shared sum implementation.' },
    systemDesign: { title: 'Sum application', description: 'A sum engine and browser interface.', components: [{ id: 'core', label: 'Core', description: 'Sum supplied values.', kind: 'logic', files: [application] }], connections: [] },
    structure: { pattern: 'single-task', rationale: 'One short form completes the sum task.', entryScreenId: 'calculator', navigation: 'Calculate and correct values in the same focused view.', persistentElements: 'Application title remains above the form.' },
    screens: [{ id: 'calculator', name: 'Calculator', purpose: 'Input values and display the sum.', primaryAction: 'Calculate', route: '/', selector: '#calculator-screen',
      layout: 'Place the values field above its calculate action and result.', secondaryContent: 'No secondary settings are needed.', narrowLayout: 'Use a single column with controls and results in reading order.' }],
    bindings: behavior.scenarios.map(scenario => ({ scenarioId: scenario.id, steps: scenario.steps.map(step => ({ stepId: step.id,
      selector: step.action === 'input' ? '#values' : step.action === 'activate' ? '#calculate' : step.id === 'error' ? '#validation-error' : '#result',
      ...(step.action === 'input' ? { action: 'fill' } : step.action === 'activate' ? { action: 'click', screenId: 'calculator' } : {}) })) })) };
  const workers = new ExperimentWorkers({ root, executable: process.execPath, resourcesRoot: path.resolve('.'), operations: () => [],
    runtime: {}, integrations: () => { throw new Error('Planning must not create runtime integrations.'); } });
  // Capture the real production scoped workflow at the backend dispatch boundary.
  // Its initializer, planner, contract validation and configuration writer run unchanged.
  workers.makeWorker = (_context, scoped) => scoped;
  const project = { id: candidate.id, workspace, phasePlan: [{ id: 'plan' }], systemDesign: { definition: execution.systemDesign } };
  const scoped = await workers.candidateWorker({ experiment, candidate, profile, project, signal: new AbortController().signal });
  await scoped.initialize(project);
  await write(workspace, ".fleet/packet.json", { acceptance });
  const planned = await scoped.plan({ project, acceptance, agent: async (_prompt, _outputs, _phase, validate) => {
    await write(workspace, 'execution-contract.json', execution); await validate();
  } });
  assert.equal(planned.quality.ux.schemaVersion, 2);
  assert.deepEqual(planned.quality.plan.journeys[0].steps, [
    { action: 'expectScreen', screenId: 'calculator' },
    { action: 'fill', selector: '#values', value: '1,2' },
    { action: 'click', selector: '#calculate' },
    { action: 'expectScreen', screenId: 'calculator' },
    { action: 'expectText', selector: '#result', text: '3' }
  ]);
  const configuration = JSON.parse(await fs.readFile(path.join(workspace, 'integration-config.json'), 'utf8'));
  await write(workspace, application, runtime === 'python'
    ? 'def invoke(value, context):\n    return {"total": sum(value["values"])}\n'
    : 'export const invoke=value=>({total:value.values.reduce((sum,item)=>sum+item,0)});');
  await write(workspace, 'index.html', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Exported resource fixture</title>
<body><header><h1>Exported resource fixture</h1></header><main id="calculator-screen"><form id="calculator-form"><label for="values">Values separated by commas</label><input id="values" name="values"><button id="calculate" type="submit">Calculate</button><p id="validation-error" role="alert"></p><output id="result" aria-live="polite"></output></form></main>
<script type="module">
const input = document.querySelector('#values'), error = document.querySelector('#validation-error'), result = document.querySelector('#result');
document.querySelector('#calculator-form').addEventListener('submit', async event => {
  event.preventDefault();
  const tokens = input.value.split(','), values = tokens.map(value => Number(value.trim()));
  error.textContent = ''; result.textContent = '';
  if (tokens.some(value => !value.trim()) || values.some(value => !Number.isFinite(value))) { error.textContent = 'Enter numbers'; return; }
  try {
    const response = await fetch('/api/invoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values }) });
    if (!response.ok) throw new Error('Calculation failed');
    const data = await response.json(); result.textContent = String(data.total);
  } catch { error.textContent = 'Calculation failed. Try again.'; }
});
</script></body></html>`);
  await write(workspace, 'foundation-lock.json', '{}');
  for (const [name, bytes] of Object.entries(resources)) await write(workspace, name, bytes);
  for (const name of ['engine.cjs', 'assets/hidden.CJS', 'undeclared.csv']) await write(workspace, name, 'must not be served');
  await scoped.assertInputs(project);
  const destination = await exportVerifiedBundle({ evidence: { report: 'Synthetic host verification', review: 'Synthetic human review' },  workspace, parent: root, title: 'Resource parity', verifiedHash: await sourceHash(workspace), deliveryMarkdown: 'Run the bundled runtime adapter.' });
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(destination, 'integration-config.json'), 'utf8')), configuration);
  return { destination, configuration, adapter, application };
}

async function serve(t, command, args) {
  const child = spawn(command, args, { env: { ...process.env, HOST: '127.0.0.1', PORT: '0' }, stdio: ['ignore', 'ignore', 'pipe'] });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = new Promise(resolve => child.once('close', resolve)); child.kill('SIGKILL'); await closed;
    }
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Exported adapter did not start.')); }, 5_000);
    let text = '';
    child.stderr.on('data', chunk => {
      text += chunk;
      const match = /Application server ready: (http:\/\/127\.0\.0\.1:\d+)/.exec(text);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', () => { clearTimeout(timer); reject(new Error(text)); });
  });
}

for (const runtime of ['node', 'python']) test(`planned ${runtime} service exports declared resources through its real standalone adapter`, { timeout: 30_000 }, async t => {
  let command = process.execPath;
  if (runtime === 'python') {
    try { command = execFileSync('python3', ['-I', '-c', 'import sys;print(sys.executable)'], { encoding: 'utf8' }).trim(); }
    catch { t.skip('Python is not installed.'); return; }
  }
  const { destination, configuration, adapter, application } = await plannedExport(t, runtime);
  const origin = await serve(t, command, [...(runtime === 'python' ? ['-I', '-B'] : []), path.join(destination, adapter), '--serve', path.join(destination, application), path.join(destination, 'integration-config.json')]);
  const page = await fetch(origin + '/', { signal: AbortSignal.timeout(5_000) });
  assert.equal(page.status, 200);
  const html = await page.text();
  for (const id of ['calculator-screen', 'values', 'calculate', 'validation-error', 'result']) assert.ok(html.includes('id="' + id + '"'), 'The exported page contains its planned ' + id + ' element.');
  for (const [name, bytes] of Object.entries(resources)) await t.test(name, async () => {
    assert.ok(configuration.static.files.includes(name), 'The actual planned export must declare ' + name);
    const response = await fetch(origin + '/' + name, { signal: AbortSignal.timeout(5_000) });
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    if (name.endsWith('.jpg')) assert.equal(response.headers.get('content-type'), 'image/jpeg');
    if (name.endsWith('.wasm')) assert.equal(response.headers.get('content-type'), 'application/wasm');
  });
  for (const name of ['engine.cjs', 'assets/hidden.CJS', adapter, 'undeclared.csv']) {
    assert.ok(!configuration.static.files.includes(name), name + ' must stay outside the static allowlist');
    const response = await fetch(origin + '/' + name, { signal: AbortSignal.timeout(5_000) });
    assert.equal(response.status, 404); await response.arrayBuffer();
  }
  const posted = await fetch(origin + '/assets/tasks.csv', { method: 'POST', body: '{}', signal: AbortSignal.timeout(5_000) });
  assert.equal(posted.status, 404); await posted.arrayBuffer();
  const invoked = await fetch(origin + '/api/invoke', { method: 'POST', body: '{"values":[2,3]}', signal: AbortSignal.timeout(5_000) });
  assert.equal(invoked.status, 200); assert.deepEqual(await invoked.json(), { total: 5 });
});
