import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { request } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { startWorker } from '../dist-electron/electron/worker-server.js';

test('worker authenticates, persists projects, streams state and separates previews', {timeout:90000},async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'appyard-worker-'));
  const options={root,token:randomBytes(32).toString('hex'),encryptionKey:randomBytes(32).toString('hex'),origins:['https://builder.example.com'],previewDomain:'localhost',previewScheme:'http',host:'127.0.0.1',port:0,previewPort:0};
  let worker=await startWorker(options);
  const address=()=>`http://127.0.0.1:${worker.api.address().port}`;
  const rpc=async(method,args=[])=>{const response=await fetch(address()+'/api/rpc',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+options.token,Origin:options.origins[0]},body:JSON.stringify({method,args})});return {status:response.status,...await response.json()};};
  try {
    assert.equal((await fetch(address()+'/health')).status,200);
    assert.equal((await fetch(address()+'/api/rpc',{method:'POST'})).status,401);
    assert.equal((await fetch(address()+'/api/rpc',{method:'POST',headers:{Origin:'https://untrusted.example.com'}})).status,403);
    const controller=new AbortController();
    const stream=await fetch(address()+'/api/events',{headers:{Authorization:'Bearer '+options.token},signal:controller.signal});
    const reader=stream.body.getReader();assert.match(new TextDecoder().decode((await reader.read()).value),/"projects"/);
    const saved=await rpc('createProject',[{title:'Inventory tracker',description:'Track stock changes and show low inventory with a searchable list.',criteria:[]}]);
    assert.equal(saved.status,200);const id=saved.result.id;
    assert.match(new TextDecoder().decode((await reader.read()).value),/Inventory tracker/);controller.abort();
    assert.equal((await rpc('__proto__')).status,400);
    assert.equal((await rpc('saveSettings',[{backend:'codex',provider:'chatgpt',model:'invalid',rememberKey:false}])).status,400);
    const workspace=path.join(root,'fixture-app');await mkdir(workspace);await writeFile(path.join(workspace,'index.html'),'<h1>Working inventory app</h1>');worker.store.project(id).workspace=workspace;await worker.store.save();
    const pair=await Promise.all([rpc('preview',[id]),rpc('preview',[id])]);assert.deepEqual(pair.map(result=>result.status),[200,200]);const preview=pair[0];assert.equal(preview.status,200);assert.match(preview.result,/localhost/);
    const host=new URL(preview.result).host, previewPath=new URL(preview.result).pathname;
    const proxy=(host,path='/')=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:worker.preview.address().port,path,headers:{Host:host}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,text}));});req.on('error',reject);req.end();});
    assert.equal((await proxy('unlisted.localhost')).status,404);
    assert.match((await proxy(host,previewPath)).text,/Working inventory app/);
    assert.equal((await proxy(host,'http://example.com/')).status,403);
    assert.equal((await rpc('readArtifact',[id,'../state.json'])).status,400);
    await worker.close();worker=await startWorker(options);
    const restored=await rpc('bootstrap');assert.equal(restored.result.state.projects.find(project=>project.id===id).title,'Inventory tracker');
    assert.equal(restored.result.capabilities.experiments,false);
  }finally{await worker.close();await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
});
