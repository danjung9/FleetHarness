import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, validateInput, safeFile, listArtifacts, sourceHash } from '../dist-electron/electron/storage.js';
import { verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';
import { PreviewServers } from '../dist-electron/electron/preview.js';
import { normalizeDataInputs } from '../dist-electron/shared/project-input.js';
import { getJourneyState } from '../dist-electron/shared/journey.js';
import { verifyBrowserJourneys } from '../dist-electron/electron/browser-verification.js';

const temp = () => fs.mkdtemp(path.join(os.tmpdir(), 'fleet-test-'));
test('saved challenges survive reload and interrupted runs become stopped', async () => {
  const dir=await temp(); try {
    const store=new Store(dir);await store.init();
    assert.equal(store.state.projects.length,3);
    const dataInputs = [{ name: 'messages.csv', kind: 'file', content: 'message\nTASK: inspect pump\n' },
      { name: 'review-notes.txt', kind: 'text', content: ' Retain spacing in the source input.\n' }];
    Object.assign(store.state.projects[0], validateInput({ title: 'Optional context', description: 'Build a local workflow for synthetic records.', criteria: [], resources: 'Sample records', links: ['https://example.com/reference'], dataInputs }));
    store.state.projects[0].status='running';await store.save();
    const restored=new Store(dir);await restored.init();
    assert.equal(restored.state.projects[0].status,'stopped');
    assert.deepEqual(restored.state.projects[0].criteria,[]);
    assert.equal(restored.state.projects[0].resources,'Sample records');
    assert.deepEqual(restored.state.projects[0].links,['https://example.com/reference']);
    assert.deepEqual(restored.state.projects[0].dataInputs, dataInputs);
    assert.equal(restored.state.projects[1].criteria.length,4);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
test('corrupt state is preserved and reported instead of reset', async () => {
  const dir=await temp();try {
    await fs.writeFile(path.join(dir,'state.json'),'{broken');
    await assert.rejects(new Store(dir).init());
    assert.equal(await fs.readFile(path.join(dir,'state.json'),'utf8'),'{broken');
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('optional brief fields accept blanks, normalize supplied context and reject invalid data', () => {
  const input = {title:'A',description:'A'.repeat(30),criteria:[]};
  assert.deepEqual(validateInput(input), {...input, resources:'', links:[], dataInputs:[], challengeId:undefined});
  assert.deepEqual(validateInput({...input, criteria:['  ', ' Works offline. '], resources:' Sample records \n', links:[' ', ' https://example.com/reference ']}),
    {...input, criteria:['Works offline.'], resources:'Sample records', links:['https://example.com/reference'], dataInputs:[], challengeId:undefined});
  for (const invalid of [{title:' '}, {description:'Too short'}, {criteria:['x'.repeat(2001)]}, {criteria:Array(101).fill('criterion')},
    {resources:123}, {resources:'x'.repeat(16001)}, {links:'https://example.com'}, {links:[null]}, {links:['javascript:alert(1)']},
    {links:['example.com']}, {links:Array(31).fill('https://example.com')}, {links:['https://example.com/'+'x'.repeat(2000)]}, {challengeId:'999'}]) {
    assert.throws(()=>validateInput({...input,...invalid}));
  }
});
test('connected inputs preserve contents and normalize labels without mutating the source', () => {
  const input = [{ name: ' records.csv ', kind: 'file', content: 'message\r\n TASK: inspect pump \r\n' },
    { name: ' notes.txt ', kind: 'text', content: '  Check this example.\n\n' }];
  assert.deepEqual(normalizeDataInputs(undefined), []);
  const normalized = normalizeDataInputs(input);
  assert.deepEqual(normalized, [{ ...input[0], name: 'records.csv' }, { ...input[1], name: 'notes.txt' }]);
  assert.notEqual(normalized[0], input[0]);
  assert.equal(input[0].name, ' records.csv ');
  assert.equal(normalizeDataInputs([{ name: 'boundary.txt', kind: 'file', content: 'é'.repeat(128 * 1024) }])[0].content.length, 128 * 1024);
});
test('connected inputs reject malformed entries, unsafe filenames, binary content and oversized payloads', () => {
  const entry = { name: 'records.csv', kind: 'file', content: 'message\nTASK: inspect pump\n' };
  for (const input of [null, {}, 'records.csv', [null], [42], [{ ...entry, name: '' }], [{ ...entry, name: 'a'.repeat(121) }],
    [{ ...entry, name: '../records.csv' }], [{ ...entry, name: '/tmp/records.csv' }], [{ ...entry, name: 'folder\\records.csv' }],
    [{ ...entry, name: 'program.exe' }], [{ ...entry, kind: 'url' }], [{ ...entry, content: '' }], [{ ...entry, content: ' \n ' }],
    [{ ...entry, content: 42 }], [{ ...entry, content: 'a\0b' }], [{ ...entry, content: 'é'.repeat(128 * 1024 + 1) }],
    Array.from({ length: 11 }, (_, i) => ({ ...entry, name: `records-${i}.csv` })),
    Array.from({ length: 5 }, (_, i) => ({ ...entry, name: `records-${i}.csv`, content: 'x'.repeat(256 * 1024) }))]) {
    assert.throws(() => normalizeDataInputs(input));
  }
});
test('artifact access rejects traversal and symlink escapes', async () => {
  const dir=await temp();try {
    const inner=path.join(dir,'workspace');await fs.mkdir(inner);await fs.writeFile(path.join(dir,'secret'),'private');
    await fs.symlink(path.join(dir,'secret'),path.join(inner,'escape'));
    await assert.rejects(safeFile(inner,'../secret'));
    await assert.rejects(safeFile(inner,'escape'));
    assert.deepEqual(await listArtifacts(inner),[]);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('test evidence records actual failures, success, skipped cases and source changes', async () => {
  const dir=await temp();try {
    const file=path.join(dir,'behavior.test.cjs');
    await fs.writeFile(file,'require("node:test")("fails",()=>require("node:assert/strict").equal(1,2));');
    let report=await verifyWorkspace(dir,process.execPath,()=>{});
    assert.equal(report.failed,1);assert.equal(reportPassed(report),false);
    await fs.writeFile(file,'require("node:test")("passes",()=>require("node:assert/strict").equal(2,2));');
    report=await verifyWorkspace(dir,process.execPath,()=>{});
    assert.equal(reportPassed(report),true);
    assert.equal(report.sourceHash,await sourceHash(dir));
    await fs.writeFile(file,'require("node:test")("skipped",{skip:true},()=>{});');
    assert.notEqual(report.sourceHash,await sourceHash(dir));
    report=await verifyWorkspace(dir,process.execPath,()=>{});
    assert.equal(report.skipped,1);assert.equal(reportPassed(report),false);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('empty workspaces never count as verified', async () => {
  const dir=await temp();try {await assert.rejects(verifyWorkspace(dir,process.execPath,()=>{}),/did not produce/);}
  finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('preview has a dedicated origin, token route, and restrictive network policy', async () => {
  const dir=await temp();const previews=new PreviewServers();try {
    await fs.writeFile(path.join(dir,'index.html'),'<h1>Preview</h1>');
    const url=await previews.url(dir);const response=await fetch(url);
    assert.equal(await response.text(),'<h1>Preview</h1>');
    assert.match(response.headers.get('content-security-policy'),/connect-src 'none'/);
    assert.equal((await fetch(new URL('/wrong-token',url))).status,404);
    assert.equal(await previews.url(dir),url);
  } finally {previews.close();await fs.rm(dir,{recursive:true,force:true});}
});

test('version 2 review requires computational quality evidence even when developer tests pass', () => {
  const project = { status: 'review', workspace: '/workspace', qualityVersion: 2, stages: [],
    report: { exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0 } };
  assert.equal(getJourneyState(project).current, 'build');
  assert.match(getJourneyState(project).message, /Verification needs attention/);
  assert.equal(getJourneyState({ ...project, qualityVersion: undefined }).current, 'review');
});

test('declared static resources are served on a unique origin without exposing undeclared files or arbitrary routes', async t => {
  const root = await temp(), other = await temp(), previews = new PreviewServers();
  t.after(async () => { previews.close(); await fs.rm(root, { recursive: true, force: true }); await fs.rm(other, { recursive: true, force: true }); });
  await fs.mkdir(path.join(root, 'assets'));
  await fs.writeFile(path.join(root, 'index.html'), '<h1>Declared app</h1>');
  await fs.writeFile(path.join(other, 'index.html'), '<h1>Other app</h1>');
  await fs.writeFile(path.join(root, 'assets/core.mjs'), 'export const sum = values => values.reduce((a,b) => a+b,0);');
  await fs.writeFile(path.join(root, 'assets/data.json'), '{"scale":2}');
  await fs.writeFile(path.join(root, '.env'), 'SECRET=hidden');
  await fs.writeFile(path.join(root, 'evaluation-plan.json'), '{"answer":"hidden"}');
  const files = ['index.html', 'assets/core.mjs', 'assets/data.json'];
  const url = await previews.url(root, files), otherUrl = await previews.url(other, ['index.html']);
  assert.notEqual(new URL(url).origin, new URL(otherUrl).origin);
  assert.equal(await previews.url(root, files), url);
  const script = await fetch(new URL('./assets/core.mjs', url));
  assert.equal(script.status, 200); assert.match(script.headers.get('content-type'), /javascript/);
  assert.match(script.headers.get('content-security-policy'), /script-src 'self'/);
  assert.match(script.headers.get('content-security-policy'), /connect-src 'self'/);
  assert.equal(script.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(await (await fetch(new URL('./assets/data.json', url))).json(), { scale: 2 });
  for (const address of ['./.env', './evaluation-plan.json', '/index.html', './assets/missing.mjs', '../index.html']) {
    assert.equal((await fetch(new URL(address, url))).status, 404, address);
  }
  assert.equal((await fetch(url, { method: 'POST' })).status, 404);
  await fs.symlink(path.join(other, 'index.html'), path.join(root, 'escape.html'));
  const escaped = await previews.url(root, ['index.html', 'escape.html']);
  assert.equal((await fetch(new URL('./escape.html', escaped))).status, 404);
});

test('browser journeys exercise imported engine modules and same-origin JSON in a declared static package', { timeout: 30_000 }, async t => {
  const root = await temp(), previews = new PreviewServers();
  t.after(async () => { previews.close(); await fs.rm(root, { recursive: true, force: true }); });
  await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><meta name="viewport" content="width=device-width"><label>Values <input id="values"></label><button id="run">Calculate</button><p id="result"></p><script type="module" src="./app.mjs"></script>');
  await fs.writeFile(path.join(root, 'core.mjs'), 'export const sum = values => values.reduce((a,b) => a+b,0);');
  await fs.writeFile(path.join(root, 'data.json'), '{"scale":2}');
  await fs.writeFile(path.join(root, 'app.mjs'), `import { sum } from './core.mjs';
document.querySelector('#run').onclick=async()=>{const value=document.querySelector('#values').value,result=document.querySelector('#result');if(!value.trim()){result.textContent='Enter numbers.';return;}const config=await fetch('./data.json').then(response=>response.json());result.textContent=String(sum(value.split(',').map(Number))*config.scale);};`);
  const url = await previews.url(root, ['index.html', 'core.mjs', 'app.mjs', 'data.json']);
  const plan = { schemaVersion: 2, criteria: [], journeys: [
    { id: 'compute', title: 'Compute using imported engine', kind: 'primary', steps: [
      { action: 'fill', selector: '#values', value: '1,2,3' }, { action: 'click', selector: '#run' }, { action: 'expectText', selector: '#result', text: '12' }
    ] },
    { id: 'recover', title: 'Recover missing input', kind: 'recovery', steps: [
      { action: 'click', selector: '#run' }, { action: 'expectText', selector: '#result', text: 'Enter numbers.' },
      { action: 'fill', selector: '#values', value: '4,5' }, { action: 'click', selector: '#run' }, { action: 'expectText', selector: '#result', text: '18' }
    ] }
  ] };
  const result = await verifyBrowserJourneys({ root, plan, contractHash: 'static-modules', url, allowSameOrigin: true, timeoutMs: 20_000, stepTimeoutMs: 2_000 });
  assert.deepEqual(result.errors, []);
  assert.equal(result.journeys.length, 4);
  assert.ok(result.journeys.every(journey => journey.status === 'passed'), JSON.stringify(result.journeys));
});
