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
// Checked-in synthetic fixtures explicitly select their host launcher. This is
// test wiring only; production uses its own direct Node launcher.
function fixtureLauncher(_root, executable, args) {
  const ready = 'synthetic-runtime-verification-ready\n';
  const bootstrap = `process.stdout.write(${JSON.stringify(ready)});const child=require('node:child_process').spawn(process.execPath,${JSON.stringify(args)},{stdio:'inherit'});child.once('error',e=>{console.error(e.code);process.exitCode=1});child.once('exit',code=>{process.exitCode=code??1});`;
  return { runner: executable, args: ['--input-type=commonjs', '-e', bootstrap], ready, command: 'synthetic runtime fixture launcher' };
}
function verifyFixture(root, launcher = fixtureLauncher) {
  return verifyWorkspace(root, process.execPath, () => {}, undefined, { launcher });
}
test('runtime evidence fixtures explicitly launch each source revision exactly once', async () => {
  const dir = await temp(); let launches = 0;
  const launcher = (...args) => { launches++; return fixtureLauncher(...args); };
  try {
    const file = path.join(dir, 'synthetic.test.cjs');
    for (const value of [1, 2]) {
      await fs.writeFile(file, `require('node:test')('synthetic revision ${value}', () => require('node:assert/strict').equal(${value}, 2));`);
      const report = await verifyFixture(dir, launcher);
      assert.equal(launches, value);
      assert.equal(report.command, 'synthetic runtime fixture launcher');
      assert.deepEqual(report.registeredTests, [{ file: 'synthetic.test.cjs', tests: 1 }]);
      assert.equal(report.failed, value === 1 ? 1 : 0);
      assert.equal(reportPassed(report), value === 2);
      assert.equal(report.sourceHash, await sourceHash(dir));
    }
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('saved challenges survive reload and interrupted runs without markers remain blocked', async () => {
  const dir=await temp(); try {
    const store=new Store(dir);await store.init();
    assert.equal(store.state.projects.length,3);
    const dataInputs = [{ name: 'messages.csv', kind: 'file', content: 'message\nTASK: inspect pump\n' },
      { name: 'review-notes.txt', kind: 'text', content: ' Retain spacing in the source input.\n' }];
    Object.assign(store.state.projects[0], validateInput({ title: 'Optional context', description: 'Build a local workflow for synthetic records.', criteria: [], inputs: 'Images', outputs: 'Classification of images', resources: 'Sample records', links: ['https://example.com/reference'], dataInputs }));
    delete store.state.projects[1].inputs; delete store.state.projects[1].outputs;
    store.state.projects[0].status='running';await store.save();
    const restored=new Store(dir);await restored.init();
    assert.equal(restored.state.projects[0].status,'failed');
    assert.equal(restored.state.projects[0].processScope.cleanup,'unconfirmed');
    assert.deepEqual(restored.state.projects[0].criteria,[]);
    assert.equal(restored.state.projects[0].inputs,'Images');
    assert.equal(restored.state.projects[0].outputs,'Classification of images');
    assert.equal(restored.state.projects[0].resources,'Sample records');
    assert.deepEqual(restored.state.projects[0].links,['https://example.com/reference']);
    assert.deepEqual(restored.state.projects[0].dataInputs, dataInputs);
    assert.equal(restored.state.projects[1].criteria.length,4);
    assert.equal(restored.state.projects[1].inputs,undefined);
    assert.equal(restored.state.projects[1].outputs,undefined);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
test('interrupted checkpointed builds keep their recovery stage, saved work and completed phases on reload', async t => {
  const dir = await temp(); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = new Store(dir); await store.init();
  const project = store.state.projects[0];
  project.status = 'running'; project.runId = 'saved-run'; project.resumeStage = 'build';
  project.processScope = { runId: project.runId, marker: 'synthetic-reload-marker', cleanup: 'pending' };
  project.workspace = path.join(dir, 'workspaces', project.id, project.runId);
  await fs.mkdir(project.workspace, { recursive: true });
  await fs.writeFile(path.join(project.workspace, 'app.mjs'), 'export const draft = "saved implementation";');
  for (const stage of project.stages) stage.status = ['intake', 'research', 'plan'].includes(stage.id) ? 'complete' : stage.id === 'build' ? 'active' : 'queued';
  project.logs.push({ id: 'saved-log', stage: 'build', kind: 'info', time: '2026-01-01T00:00:00.000Z', text: 'Implementation was in progress.' });
  await store.save();
  const recoveredMarkers = [];
  const restored = new Store(dir, async marker => { recoveredMarkers.push(marker); }); await restored.init();
  const recovered = restored.project(project.id);
  assert.deepEqual(recoveredMarkers, ['synthetic-reload-marker']);
  assert.equal(recovered.processScope.cleanup, 'confirmed');
  assert.equal(recovered.status, 'stopped');
  assert.equal(recovered.resumeStage, 'build');
  assert.equal(recovered.runId, project.runId); assert.equal(recovered.workspace, project.workspace);
  assert.deepEqual(recovered.stages.map(stage => stage.status), ['complete', 'complete', 'complete', 'failed', 'queued', 'queued', 'queued']);
  assert.match(recovered.error, /Resume the phase/);
  assert.doesNotMatch(recovered.error, /older run|start a new build/);
  assert.deepEqual(recovered.logs, project.logs);
  assert.match(await fs.readFile(path.join(recovered.workspace, 'app.mjs'), 'utf8'), /saved implementation/);
  const saved = JSON.parse(await fs.readFile(path.join(dir, 'state.json'), 'utf8')).projects.find(item => item.id === project.id);
  assert.equal(saved.status, 'stopped'); assert.equal(saved.resumeStage, 'build');
});

test('interrupted legacy builds without a checkpoint keep their artifacts and explain the new-build fallback', async t => {
  const dir = await temp(); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const store = new Store(dir); await store.init();
  const project = store.state.projects[0];
  project.status = 'running'; project.runId = 'legacy-run';
  project.processScope = { runId: project.runId, marker: 'synthetic-legacy-marker', cleanup: 'pending' };
  project.workspace = path.join(dir, 'workspaces', project.id, project.runId);
  await fs.mkdir(project.workspace, { recursive: true });
  await fs.writeFile(path.join(project.workspace, 'plan.md'), 'Preserved older planning output.');
  project.stages.find(stage => stage.id === 'intake').status = 'complete';
  project.stages.find(stage => stage.id === 'research').status = 'active';
  await store.save();
  const recoveredMarkers = [];
  const restored = new Store(dir, async marker => { recoveredMarkers.push(marker); }); await restored.init();
  const recovered = restored.project(project.id);
  assert.deepEqual(recoveredMarkers, ['synthetic-legacy-marker']);
  assert.equal(recovered.processScope.cleanup, 'confirmed');
  assert.equal(recovered.status, 'stopped'); assert.equal(recovered.resumeStage, undefined);
  assert.equal(recovered.runId, project.runId); assert.equal(recovered.workspace, project.workspace);
  assert.equal(recovered.stages.find(stage => stage.id === 'intake').status, 'complete');
  assert.equal(recovered.stages.find(stage => stage.id === 'research').status, 'failed');
  assert.match(recovered.error, /no recovery checkpoint; start a new build/);
  assert.equal(await fs.readFile(path.join(recovered.workspace, 'plan.md'), 'utf8'), 'Preserved older planning output.');
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
  assert.deepEqual(validateInput(input), {...input, inputs:'', outputs:'', resources:'', links:[], dataInputs:[], challengeId:undefined});
  assert.deepEqual(validateInput({...input, criteria:['  ', ' Works offline. '], inputs:' Images \n', outputs:' Classification of images \n', resources:' Sample records \n', links:[' ', ' https://example.com/reference ']}),
    {...input, criteria:['Works offline.'], inputs:'Images', outputs:'Classification of images', resources:'Sample records', links:['https://example.com/reference'], dataInputs:[], challengeId:undefined});
  const cleared = validateInput({...input, inputs:' \n ', outputs:'\t'});
  assert.equal(cleared.inputs,''); assert.equal(cleared.outputs,'');
  for (const invalid of [{title:' '}, {description:'Too short'}, {criteria:['x'.repeat(2001)]}, {criteria:Array(101).fill('criterion')},
    {inputs:123}, {inputs:null}, {outputs:[]}, {outputs:null}, {inputs:'x'.repeat(16001)}, {outputs:'x'.repeat(16001)},
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
    await assert.rejects(listArtifacts(inner), /symlinks/);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('test evidence records actual failures, success, skipped cases and source changes', async () => {
  const dir=await temp();try {
    const file=path.join(dir,'behavior.test.cjs');
    await fs.writeFile(file,'require("node:test")("fails",()=>require("node:assert/strict").equal(1,2));');
    let report=await verifyFixture(dir);
    assert.equal(report.failed,1);assert.equal(reportPassed(report),false);
    await fs.writeFile(file,'require("node:test")("passes",()=>require("node:assert/strict").equal(2,2));');
    report=await verifyFixture(dir);
    assert.equal(reportPassed(report),true);
    assert.equal(report.sourceHash,await sourceHash(dir));
    await fs.writeFile(file,'require("node:test")("skipped",{skip:true},()=>{});');
    assert.notEqual(report.sourceHash,await sourceHash(dir));
    report=await verifyFixture(dir);
    assert.equal(report.skipped,1);assert.equal(reportPassed(report),false);
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('empty workspaces never count as verified', async () => {
  const dir=await temp();try {await assert.rejects(verifyWorkspace(dir,process.execPath,()=>{}),/did not produce/);}
  finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('preview has a dedicated origin and token route without a network restriction', async () => {
  const dir=await temp();const previews=new PreviewServers();try {
    await fs.writeFile(path.join(dir,'index.html'),'<h1>Preview</h1>');
    const url=await previews.url(dir);const response=await fetch(url);
    assert.equal(await response.text(),'<h1>Preview</h1>');
    assert.equal(response.headers.get('content-security-policy'), null);
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
  assert.equal(script.headers.get('content-security-policy'), null);
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
