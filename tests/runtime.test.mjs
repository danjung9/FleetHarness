import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, validateInput, safeFile, listArtifacts, sourceHash } from '../dist-electron/electron/storage.js';
import { verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';
import { PreviewServers } from '../dist-electron/electron/preview.js';

const temp = () => fs.mkdtemp(path.join(os.tmpdir(), 'fleet-test-'));
test('saved challenges survive reload and interrupted runs become stopped', async () => {
  const dir=await temp(); try {
    const store=new Store(dir);await store.init();
    assert.equal(store.state.projects.length,3);
    store.state.projects[0].status='running';await store.save();
    const restored=new Store(dir);await restored.init();
    assert.equal(restored.state.projects[0].status,'stopped');
    assert.equal(restored.state.projects[0].criteria.length,5);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
test('corrupt state is preserved and reported instead of reset', async () => {
  const dir=await temp();try {
    await fs.writeFile(path.join(dir,'state.json'),'{broken');
    await assert.rejects(new Store(dir).init());
    assert.equal(await fs.readFile(path.join(dir,'state.json'),'utf8'),'{broken');
  } finally {await fs.rm(dir,{recursive:true,force:true});}
});
test('validation rejects empty criteria and unknown source IDs', () => {
  assert.throws(()=>validateInput({title:'A',description:'A'.repeat(30),criteria:[]}));
  assert.throws(()=>validateInput({title:'A',description:'A'.repeat(30),criteria:['valid'],challengeId:'999'}));
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
