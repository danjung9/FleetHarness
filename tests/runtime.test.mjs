import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, validateInput, safeFile, listArtifacts, sourceHash } from '../dist-electron/electron/storage.js';
import { verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';
import { PreviewServers } from '../dist-electron/electron/preview.js';

const temp = () => fs.mkdtemp(path.join(os.tmpdir(), 'fleet-test-'));
// Checked-in synthetic fixtures explicitly select their host launcher. This is
// test wiring only; generated application tests retain the production sandbox.
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
    Object.assign(store.state.projects[0], validateInput({ title: 'Optional context', description: 'Build a local workflow for synthetic records.', criteria: [], resources: 'Sample records', links: ['https://example.com/reference'] }));
    store.state.projects[0].status='running';await store.save();
    const restored=new Store(dir);await restored.init();
    assert.equal(restored.state.projects[0].status,'failed');
    assert.equal(restored.state.projects[0].processScope.cleanup,'unconfirmed');
    assert.deepEqual(restored.state.projects[0].criteria,[]);
    assert.equal(restored.state.projects[0].resources,'Sample records');
    assert.deepEqual(restored.state.projects[0].links,['https://example.com/reference']);
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
  assert.deepEqual(validateInput(input), {...input, resources:'', links:[], challengeId:undefined});
  assert.deepEqual(validateInput({...input, criteria:['  ', ' Works offline. '], resources:' Sample records \n', links:[' ', ' https://example.com/reference ']}),
    {...input, criteria:['Works offline.'], resources:'Sample records', links:['https://example.com/reference'], challengeId:undefined});
  for (const invalid of [{title:' '}, {description:'Too short'}, {criteria:['x'.repeat(2001)]}, {criteria:Array(101).fill('criterion')},
    {resources:123}, {resources:'x'.repeat(16001)}, {links:'https://example.com'}, {links:[null]}, {links:['javascript:alert(1)']},
    {links:['example.com']}, {links:Array(31).fill('https://example.com')}, {links:['https://example.com/'+'x'.repeat(2000)]}, {challengeId:'999'}]) {
    assert.throws(()=>validateInput({...input,...invalid}));
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
