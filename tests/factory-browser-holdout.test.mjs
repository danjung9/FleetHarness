import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { factoryBrowserInterface, factoryBrowserHoldoutPlan, factoryBrowserHoldoutPassed,
  runFactoryBrowserHoldout } from '../scripts/factory-browser-holdout.mjs';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';

const expectedKeys = ['host-changed-inputs:desktop', 'host-changed-inputs:narrow', 'host-recovery:desktop', 'host-recovery:narrow'];
const core = 'export const solve = input => ({total:input.values.reduce((sum,value)=>sum+value,0)});\n';
const engine = 'import {readFileSync} from "node:fs";import {solve} from "./core.mjs";process.stdout.write(JSON.stringify(solve(JSON.parse(readFileSync(0,"utf8")))));\n';

function page(variant, service = false) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Independent calculator fixture</title><style>*{box-sizing:border-box}body{font:16px system-ui;margin:16px}textarea{display:block;width:100%;max-width:32rem;min-height:6rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>
  <main><h1>Calculator</h1><label for="input">Input JSON</label><textarea id="input" ${variant === 'missing-interface' ? '' : 'data-testid="factory-input"'}></textarea>
  <button data-testid="factory-submit">Calculate</button><pre data-testid="factory-result" aria-live="polite">Ready</pre></main>
  <script type="module">${service ? '' : "import {solve} from './core.mjs';"}
  const output=document.querySelector('[data-testid="factory-result"]');let hadError=false;
  document.querySelector('[data-testid="factory-submit"]').addEventListener('click',async()=>{
    try {
      const input=JSON.parse(document.querySelector('#input').value);
      ${variant === 'stale-error' ? 'if(hadError)return;' : ''}
      const computed=${service ? "await (await fetch('/calculate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)})).json()" : 'solve(input)'};
      output.textContent=JSON.stringify(${variant === 'constant' ? '{total:3}' : variant === 'narrow-only' ? 'innerWidth<600?{total:3}:computed' : 'computed'});
    } catch {
      hadError=true;
      ${variant === 'stale-success' ? '' : 'output.textContent=JSON.stringify({error:"Enter valid JSON."});'}
    }
  });</script></html>`;
}

async function fixture(t, variant = 'correct', service = false) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-browser-holdout-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const workspace = path.join(directory, 'candidate'), evidenceRoot = path.join(directory, 'independent-evidence');
  await fs.mkdir(workspace);
  const files = { 'index.html': page(variant, service), 'core.mjs': core, 'engine.mjs': engine };
  if (service) files['server.mjs'] = `import {createServer} from 'node:http';import {readFileSync} from 'node:fs';import {solve} from './core.mjs';
    const html=readFileSync(new URL('./index.html',import.meta.url));let poisoned=false;
    createServer(async(request,response)=>{
      if(request.url==='/health'){response.writeHead(200,{'content-type':'application/json'}).end('{"ok":true}');return;}
      if(request.url==='/state'){response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({poisoned,pid:process.pid}));return;}
      if(request.url==='/core'||request.url==='/calculate'){
        let body='';for await(const chunk of request)body+=chunk;
        const input=JSON.parse(body);if(request.url==='/core')poisoned=true;
        response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(request.url==='/calculate'&&poisoned?{total:999}:solve(input)));return;
      }
      if(request.url==='/'){response.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(html);return;}
      response.writeHead(404).end('Not found');
    }).listen(Number(process.env.PORT),process.env.HOST);\n`;
  for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), content);
  const manifest = service
    ? { profile: 'service', files: Object.keys(files), requiredEnv: [], command: { runtime: 'node', entrypoint: 'server.mjs', args: [] }, healthPath: '/health', invokePath: '/core' }
    : { profile: 'browser', files: Object.keys(files), requiredEnv: [], entrypoint: 'index.html', evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
  return { workspace, evidenceRoot, manifest, files };
}

async function assertEvidence(app, report) {
  const saved = JSON.parse(await fs.readFile(path.join(app.evidenceRoot, 'browser-holdout-report.json'), 'utf8'));
  assert.deepEqual(saved, report, 'The saved report must contain the observed verdict and evidence.');
  assert.deepEqual(report.plan, factoryBrowserHoldoutPlan());
  assert.deepEqual(report.journeys.map(journey => `${journey.id}:${journey.viewport}`), expectedKeys);
  assert.deepEqual(report.errors, []);
  assert.match(report.runtime.filesHash, /^[a-f0-9]{64}$/);
  for (const journey of report.journeys) {
    assert.match(journey.screenshot, /^\.quality-evidence\/.+\.png$/);
    assert.match(journey.trace, /^\.quality-evidence\/.+\.zip$/);
    const screenshot = await fs.readFile(path.join(app.evidenceRoot, journey.screenshot));
    assert.deepEqual([...screenshot.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(screenshot.readUInt32BE(16), journey.viewport === 'desktop' ? 1280 : 390);
    assert.equal(screenshot.readUInt32BE(20), journey.viewport === 'desktop' ? 800 : 844);
    const trace = await fs.readFile(path.join(app.evidenceRoot, journey.trace));
    assert.equal(trace.readUInt32LE(0), 0x04034b50, 'Browser traces must be real ZIP archives.');
  }
  await assert.rejects(fs.access(path.join(app.workspace, '.quality-evidence')), /ENOENT/,
    'Independent browser evidence belongs outside the generated workspace.');
  for (const [file, content] of Object.entries(app.files)) assert.equal(await fs.readFile(path.join(app.workspace, file), 'utf8'), content);
}

test('the public interface discloses all selectors and result serialization without holdout inputs', () => {
  for (const selector of ['factory-input', 'factory-submit', 'factory-result']) assert.ok(factoryBrowserInterface.includes(selector));
  assert.match(factoryBrowserInterface, /compact JSON\.stringify/);
  assert.ok(factoryBrowserInterface.includes('{"error":"Enter valid JSON."}'));
  for (const input of factoryBrowserHoldoutPlan().journeys.flatMap(journey => journey.steps)
    .filter(step => step.action === 'fill').map(step => step.value)) assert.ok(!factoryBrowserInterface.includes(input));
  const modified = factoryBrowserHoldoutPlan();
  modified.journeys[0].steps[0].value = 'mutated';
  assert.notEqual(factoryBrowserHoldoutPlan().journeys[0].steps[0].value, 'mutated', 'Callers cannot mutate future host plans.');
});

for (const [variant, passes] of [
  ['correct', [true, true, true, true]],
  ['constant', [false, false, false, false]],
  ['stale-success', [true, true, false, false]],
  ['stale-error', [true, true, false, false]],
  ['narrow-only', [true, false, true, false]],
  ['missing-interface', [false, false, false, false]]
]) test(`independent browser holdouts ${variant === 'correct' ? 'accept connected behavior' : 'reject ' + variant + ' UI'} with real browser evidence`,
  { timeout: 60_000 }, async t => {
    const app = await fixture(t, variant);
    const report = await runFactoryBrowserHoldout(app);
    assert.equal(report.status, variant === 'correct' ? 'passed' : 'failed', JSON.stringify(report));
    assert.equal(factoryBrowserHoldoutPassed(report), variant === 'correct');
    assert.deepEqual(report.journeys.map(journey => journey.status === 'passed'), passes,
      'Changed-input and recovery behavior must be checked independently at both widths.');
    await assertEvidence(app, report);
  });

test('independent service browser checks use a fresh runtime after core evaluation changes process state',
  { timeout: 40_000 }, async t => {
    const app = await fixture(t, 'correct', true);
    const evaluatedRuntime = await prepareSolutionRuntime(app.workspace, app.manifest, process.execPath);
    t.after(() => evaluatedRuntime.close());
    assert.deepEqual(await evaluatedRuntime.invoke({ values: [2, 3] }), { total: 5 });
    const state = await (await fetch(new URL('/state', evaluatedRuntime.url))).json();
    assert.equal(state.poisoned, true);
    const poisoned = await (await fetch(new URL('/calculate', evaluatedRuntime.url), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"values":[2,3]}'
    })).json();
    assert.deepEqual(poisoned, { total: 999 }, 'Reusing the core-evaluation service would produce incorrect browser results.');
    const report = await runFactoryBrowserHoldout(app);
    assert.equal(report.status, 'passed', JSON.stringify(report));
    assert.equal(factoryBrowserHoldoutPassed(report), true);
    assert.equal(report.runtime.profile, 'service');
    assert.equal(report.runtime.filesHash, evaluatedRuntime.provenance.filesHash, 'The fresh process must run the same declared source.');
    assert.deepEqual(await (await fetch(new URL('/state', evaluatedRuntime.url))).json(), state,
      'Browser verification must not reset or reuse the preceding core process.');
    await assertEvidence(app, report);
  });

function passingReport() {
  const plan = factoryBrowserHoldoutPlan();
  return { schemaVersion: 1, status: 'passed', contractHash: createHash('sha256').update(JSON.stringify(plan)).digest('hex'),
    plan, expectedJourneys: 4, runtime: { profile: 'browser', filesHash: 'a'.repeat(64) }, errors: [],
    journeys: expectedKeys.map(key => { const [id, viewport] = key.split(':'); return { id, viewport, status: 'passed' }; }) };
}

test('browser holdout grading fails closed for incomplete, duplicate or malformed evidence', async t => {
  assert.equal(factoryBrowserHoldoutPassed(passingReport()), true);
  const changes = [
    ['null report', () => null], ['missing report', () => undefined],
    ['old schema', report => { report.schemaVersion = 0; }],
    ['failed status', report => { report.status = 'failed'; }],
    ['wrong plan hash', report => { report.contractHash = '0'.repeat(64); }],
    ['missing plan', report => { delete report.plan; }],
    ['malformed plan', report => { report.plan = null; }],
    ['changed holdout input', report => { report.plan.journeys[0].steps[0].value = '{"values":[1,2]}'; }],
    ['changed expected result', report => { report.plan.journeys[0].steps[2].text = '{"total":3}'; }],
    ['missing expected count', report => { delete report.expectedJourneys; }],
    ['wrong expected count', report => { report.expectedJourneys = 3; }],
    ['missing errors', report => { delete report.errors; }],
    ['malformed errors', report => { report.errors = {}; }],
    ['recorded browser error', report => { report.errors.push('Failed to load'); }],
    ['missing runtime', report => { delete report.runtime; }],
    ['wrong runtime profile', report => { report.runtime.profile = 'cli'; }],
    ['missing runtime hash', report => { delete report.runtime.filesHash; }],
    ['empty runtime hash', report => { report.runtime.filesHash = ''; }],
    ['malformed runtime hash', report => { report.runtime.filesHash = 1; }],
    ['missing journeys', report => { delete report.journeys; }],
    ['malformed journeys', report => { report.journeys = {}; }],
    ['empty journeys', report => { report.journeys = []; }],
    ['missing narrow journey', report => { report.journeys.pop(); }],
    ['extra journey', report => { report.journeys.push({ ...report.journeys[0] }); }],
    ['duplicate journey replacing recovery', report => { report.journeys[3] = { ...report.journeys[0] }; }],
    ['planner journey replacing holdout', report => { report.journeys[0].id = 'planner-primary'; }],
    ['wrong viewport', report => { report.journeys[0].viewport = 'mobile'; }],
    ['failed journey', report => { report.journeys[0].status = 'failed'; }],
    ['truthy status', report => { report.journeys[0].status = true; }],
    ['missing status', report => { delete report.journeys[0].status; }],
    ['null journey', report => { report.journeys[0] = null; }],
    ['empty journey', report => { report.journeys[0] = {}; }]
  ];
  for (const [name, change] of changes) await t.test(name, () => {
    const report = passingReport();
    const replacement = change(report);
    assert.equal(factoryBrowserHoldoutPassed(name === 'null report' || name === 'missing report' ? replacement : report), false);
  });
});

test('unsupported delivered profiles save a failed independent browser report without claiming journeys', async t => {
  const app = await fixture(t);
  app.manifest = { profile: 'cli', files: ['engine.mjs', 'core.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
  const report = await runFactoryBrowserHoldout(app);
  assert.equal(report.status, 'failed');
  assert.equal(factoryBrowserHoldoutPassed(report), false);
  assert.equal(report.runtime, null);
  assert.deepEqual(report.journeys, []);
  assert.equal(report.errors.length, 1);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(app.evidenceRoot, 'browser-holdout-report.json'), 'utf8')), report);
});
