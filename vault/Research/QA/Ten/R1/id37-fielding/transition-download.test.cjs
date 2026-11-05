'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const C=require('./transition-core.cjs');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
// Execute the delivered UI download handler with controlled browser APIs.
// This tests application behavior; real browser downloads remain a host gate.
function setup(){
  const elements=Object.fromEntries(['export-package','export-playbook','download-status'].map(id=>[id,{disabled:false,textContent:''}]));
  const timers=[],requests=[],revoked=[],blobs=[];
  let allowed=true,fail=false;
  const context={
    $:id=>elements[id],guarded:()=>allowed,Blob,
    URL:{createObjectURL:blob=>{if(fail)throw Error('browser refused');blobs.push(blob);return 'blob:synthetic-'+blobs.length;},revokeObjectURL:url=>revoked.push(url)},
    document:{body:{append:()=>{}},createElement:()=>({click(){requests.push({href:this.href,filename:this.download});},remove(){}})},
    setTimeout:(callback,delay)=>{timers.push({callback,delay});}
  };
  vm.createContext(context);
  const start=html.indexOf('let downloadBusy=');
  const end=html.indexOf("download('export-package'",start);
  vm.runInContext(html.slice(start,end),context);
  context.download('export-package','transition-package.md',()=>C.buildPackage(C.createSample(),1));
  context.download('export-playbook','fielding-playbook.md',()=>C.buildPlaybook());
  return {elements,timers,requests,blobs,revoked,setAllowed:v=>{allowed=v;},setFail:v=>{fail=v;},release:()=>{const i=timers.findIndex(t=>t.delay===250);assert.ok(i>=0);timers.splice(i,1)[0].callback();}};
}
test('UI exports preserve real documents and pace repeated cross-control requests',async()=>{
  const s=setup();
  for(let i=0;i<18;i++){
    const id=i%2?'export-playbook':'export-package';
    s.elements[id].onclick();
    assert.equal(s.requests.length,i+1);
    assert.equal(s.elements['export-package'].disabled,true);
    assert.equal(s.elements['export-playbook'].disabled,true);
    // Programmatic re-entry must not bypass the shared cooldown either.
    s.elements['export-package'].onclick();s.elements['export-playbook'].onclick();
    assert.equal(s.requests.length,i+1);
    assert.equal(s.requests[i].filename,i%2?'fielding-playbook.md':'transition-package.md');
    assert.equal(await s.blobs[i].text(),i%2?C.buildPlaybook():C.buildPackage(C.createSample(),1));
    s.release();
    assert.equal(s.elements[id].disabled,false);
  }
  for(const timer of s.timers)timer.callback();
  assert.equal(s.revoked.length,18);
});
test('UI failed download keeps retry available after the cooldown',()=>{
  const s=setup();s.setFail(true);s.elements['export-package'].onclick();
  assert.equal(s.requests.length,0);
  assert.equal(s.elements['download-status'].textContent,'Download could not start. Your saved revision is intact; retry this download.');
  s.release();s.setFail(false);s.elements['export-package'].onclick();
  assert.equal(s.requests.length,1);
  assert.equal(s.elements['download-status'].textContent,'Download requested: transition-package.md. Check your browser downloads.');
});
test('UI rejected saved-content guard issues no download and does not lock controls',()=>{
  const s=setup();s.setAllowed(false);s.elements['export-package'].onclick();
  assert.equal(s.requests.length,0);assert.equal(s.timers.length,0);
  s.setAllowed(true);s.elements['export-playbook'].onclick();assert.equal(s.requests.length,1);
});
