import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadQualityContract, verifyApplication } from '../dist-electron/electron/quality.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { prepareIsolatedSolutionRuntime, verifyIsolatedWorkspace } from '../dist-electron/electron/isolated-solution-runtime.js';
import { ClassifiedExecutionFailure } from '../dist-electron/electron/execution-failure.js';
import { reportPassed } from '../dist-electron/electron/verification.js';

const acceptance = [{ id: 'R1', requirement: 'Create one record and recover from invalid input.', method: 'automated', scenario: 'Create, reload and correct invalid input.' }];
const primary = [
  { action: 'expectText', selector: '#count', text: 'Records: 0' },
  { action: 'fill', selector: '#name', value: 'Pump' }, { action: 'click', selector: '#save' },
  { action: 'expectText', selector: '#count', text: 'Records: 1' }, { action: 'reload' },
  { action: 'expectText', selector: '#count', text: 'Records: 1' }
];
const recovery = [
  { action: 'click', selector: '#save' }, { action: 'expectText', selector: '#error', text: 'Enter a name.' },
  { action: 'fill', selector: '#name', value: 'Valve' }, { action: 'click', selector: '#save' },
  { action: 'expectText', selector: '#count', text: 'Records: 1' }
];
const html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Records</title>
<label>Name <input id="name"></label><button id="save">Save</button><p id="error"></p><p id="count">Loading</p>
<script>
const call=async value=>(await fetch('/api/invoke',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)})).json();
const show=value=>{document.querySelector('#count').textContent='Records: '+value.count;document.querySelector('#error').textContent=value.error||'';};
call({action:'read'}).then(show);
document.querySelector('#save').onclick=async()=>show(await call({action:'create',name:document.querySelector('#name').value}));
</script>`;

async function fixture(t, { isolated = false, disk = false, broken = false } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-quality-state-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = {
    'index.html': html,
    'app.mjs': `${disk ? "import {existsSync,readFileSync,writeFileSync} from 'node:fs';" : ''}
let count=0;export function invoke(value){
if(value.values)return {total:value.values.reduce((a,b)=>a+b,0)};
${disk ? "count=existsSync('records.json')?JSON.parse(readFileSync('records.json','utf8')):0;" : ''}
if(value.action==='create'){if(!value.name.trim())return {count,error:'Enter a name.'};count+=${broken ? 2 : 1};
${disk ? "writeFileSync('records.json',JSON.stringify(count));" : ''}}
return {count};}`,
    'server.mjs': `import {createServer} from 'node:http';import {readFileSync} from 'node:fs';import {invoke} from './app.mjs';
createServer(async(req,res)=>{
if(req.url==='/health'){res.end('ready');return;}
if(req.url==='/api/invoke'){let body='';for await(const chunk of req)body+=chunk;res.setHeader('content-type','application/json');res.end(JSON.stringify(invoke(JSON.parse(body))));return;}
res.setHeader('content-type','text/html');res.end(readFileSync('index.html'));
}).listen(Number(process.env.PORT),'127.0.0.1');`,
    'app.test.mjs': "import test from 'node:test';import assert from 'node:assert/strict';import {invoke} from './app.mjs';test('sum',()=>assert.deepEqual(invoke({values:[2,3]}),{total:5}));",
    'solution-contract.json': JSON.stringify({ schemaVersion: 1, objective: 'Create records reliably.',
      capabilities: [{ id: 'total', kind: 'algorithm', description: 'Calculate record totals.', required: true, criterionIds: ['R1'], evaluationIds: ['sums'] }],
      runtime: { profile: 'service', files: ['app.mjs', 'server.mjs', 'index.html'], requiredEnv: [],
        command: { runtime: 'node', entrypoint: isolated ? 'app.mjs' : 'server.mjs', args: [] }, healthPath: '/health', invokePath: '/api/invoke' } }),
    'evaluation-plan.json': JSON.stringify({ schemaVersion: 1, evaluations: [{ id: 'sums', capabilityId: 'total', description: 'Independent arithmetic cases.',
      dataset: { name: 'sums', version: '1', provenance: 'synthetic' }, evaluator: 'exact', threshold: 1, trials: 1,
      cases: [{ id: 'positive', input: { values: [2, 3] }, expected: { total: 5 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }] }] }),
    'acceptance-plan.json': JSON.stringify({ schemaVersion: 2,
      criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'One record survives reload and invalid input can be corrected.', journeyIds: ['create', 'recover'], capabilityIds: ['total'] }],
      journeys: [{ id: 'create', title: 'Create one record', kind: 'primary', steps: primary }, { id: 'recover', title: 'Recover invalid input', kind: 'recovery', steps: recovery }] }),
    'ux-spec.json': JSON.stringify({ schemaVersion: 1, audience: 'Operators', primaryTask: 'Create a record', successOutcome: 'One saved record',
      screens: [{ name: 'Records', purpose: 'Create and count records', primaryAction: 'Save' }],
      states: { empty: 'No records', loading: 'Loading', error: 'Enter a name', success: 'Saved record' },
      persistence: 'Records survive a page reload.', recovery: 'Correct a blank name and retry.', keyboard: 'Labeled input and native button.' })
  };
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(root, name), body);
  return { root, contract: await loadQualityContract(root, acceptance, true) };
}

function trackFactory(factory, alter = () => {}) {
  const prepared = [], active = new Set();
  return { prepared, active, factory: async (...args) => {
    assert.equal(active.size, 0, 'Previous package must close before the next starts.');
    const runtime = await factory(...args), close = runtime.close;
    prepared.push(runtime); active.add(runtime);
    runtime.close = async () => { try { await close(); } finally { active.delete(runtime); } };
    alter(runtime, prepared.length);
    return runtime;
  } };
}

for (const mode of ['ordinary memory', 'ordinary files', 'isolated memory']) {
  test(`final verification isolates ${mode} state between journey viewports`, { timeout: 45_000, skip: mode.startsWith('isolated') && !['darwin', 'linux'].includes(process.platform) }, async t => {
    const isolated = mode.startsWith('isolated');
    const { root, contract } = await fixture(t, { isolated, disk: mode.endsWith('files') });
    const tracked = trackFactory(isolated ? prepareIsolatedSolutionRuntime : prepareSolutionRuntime);
    const report = await verifyApplication(root, process.execPath, contract, undefined, {
      prepareRuntime: tracked.factory, isolateNetwork: isolated, ...(isolated ? { verifyTests: verifyIsolatedWorkspace } : {}), browserTimeoutMs: 30_000, browserStepTimeoutMs: 2_000
    });
    assert.equal(reportPassed(report, true), true, report.output);
    assert.equal(report.quality.journeys.length, 4);
    assert.ok(report.quality.journeys.every(journey => journey.status === 'passed'), JSON.stringify(report.quality));
    assert.equal(tracked.prepared.length, 6, 'Core, four browser attempts, and developer tests each get a clean package.');
    assert.equal(new Set(tracked.prepared.map(runtime => runtime.root)).size, 6);
    assert.equal(tracked.active.size, 0);
    for (const runtime of tracked.prepared) await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
    await assert.rejects(fs.access(path.join(root, 'records.json')), { code: 'ENOENT' });
  });
}

test('fresh service state does not conceal an incorrect create result', { timeout: 30_000 }, async t => {
  const { root, contract } = await fixture(t, { broken: true });
  const report = await verifyApplication(root, process.execPath, contract, undefined, { browserTimeoutMs: 20_000, browserStepTimeoutMs: 400 });
  assert.equal(report.quality.solutionEvaluation.status, 'passed');
  assert.equal(report.passed, 1);
  assert.equal(reportPassed(report, true), false);
  assert.equal(report.quality.journeys.length, 4);
  assert.ok(report.quality.journeys.every(journey => journey.status === 'failed'), JSON.stringify(report.quality));
});

test('a later browser package hash mismatch stops verification and closes every package', { timeout: 30_000 }, async t => {
  const { root, contract } = await fixture(t);
  const tracked = trackFactory(prepareSolutionRuntime, (runtime, ordinal) => { if (ordinal === 3) runtime.provenance.filesHash = 'different-files'; });
  await assert.rejects(verifyApplication(root, process.execPath, contract, undefined, {
    prepareRuntime: tracked.factory, browserTimeoutMs: 20_000, browserStepTimeoutMs: 2_000
  }), error => error instanceof ClassifiedExecutionFailure && error.classification === 'integrity' && /Deployment files changed/.test(error.message));
  assert.equal(tracked.prepared.length, 3, 'The second browser attempt must be checked before navigation or developer tests.');
  const evidenceDirectories = await fs.readdir(path.join(root, '.quality-evidence'));
  const screenshots = (await Promise.all(evidenceDirectories.map(directory => fs.readdir(path.join(root, '.quality-evidence', directory)))))
    .flat().filter(name => name.endsWith('.png'));
  assert.deepEqual(screenshots, ['create-desktop.png'], 'Only the first browser attempt may execute before the mismatched package is rejected.');
  assert.equal(tracked.active.size, 0);
  for (const runtime of tracked.prepared) await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
});
