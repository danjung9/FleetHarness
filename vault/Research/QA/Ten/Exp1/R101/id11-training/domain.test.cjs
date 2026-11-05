'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');const source=html.match(/<script id="pb4t-core">([\s\S]*?)<\/script>/)[1];const context=vm.createContext({});vm.runInContext(source+';globalThis.app=PB4TCore;',context);const C=context.app;const plain=x=>JSON.parse(JSON.stringify(x));
test('UC11-1 SCH-01 DELIVERABLE11-1: five participants negotiate baseline, independent interval/load oracle',()=>{let w=C.fixture(),before=JSON.stringify(w),r=C.solve(w,50000);assert.equal(r.status,'feasible');assert.equal(JSON.stringify(w),before);assert.deepEqual(plain(r.assignments.map(a=>[a.id,a.start,a.end,a.people[0]])),[['ENG-1',480,600,'C01'],['COMBAT-1',600,660,'C03'],['DC-1',660,780,'C04'],['FLIGHT-1',780,840,'C06'],['WEAPONS-1',1980,2040,'C02']]);assert.equal(new Set(r.logs.map(l=>l.id)).size,5);assert.ok(r.logs.some(l=>l.id==='DC-1'&&!l.accepted&&l.reasons.some(s=>s.includes('C01 and Training Room'))));let totals=Object.fromEntries(w.people.map(p=>[p.id,0]));for(let i=0;i<r.assignments.length;i++){let a=r.assignments[i];for(let p of a.people)totals[p]+=a.end-a.start;for(let b of r.assignments.slice(i+1))if(a.start<b.end&&b.start<a.end){assert.ok(!a.people.some(p=>b.people.includes(p)));assert.notEqual(a.resource,b.resource);}}assert.deepEqual(totals,{C01:120,C02:60,C03:60,C04:120,C05:0,C06:60});assert.deepEqual(plain(C.check(w,r.assignments).errors),[]);});
test('SCH-02 missing qualification and unavailable person recover via actual input changes',()=>{let w=C.fixture('missing-eoow');assert.equal(C.solve(w).status,'infeasible');w.people[0].qualifications.push('EOOW');assert.equal(C.solve(w).status,'feasible');w=C.fixture('unavailable-flight');assert.match(C.solve(w).error,/no available crew/);w.people[5].windows=[{start:780,end:840}];assert.equal(C.solve(w).status,'feasible');});
test('SCH-03 impossible versus exhausted versus invalid input',()=>{assert.equal(C.solve(C.fixture('impossible-deadline')).status,'infeasible');assert.match(C.solve(C.fixture('impossible-deadline')).error,/cannot finish by Mon 09 Nov 09:00/);assert.equal(C.solve(C.fixture(),1).status,'budget_exhausted');for(const n of [0,-1,1.5,200001])assert.equal(C.solve(C.fixture(),n).status,'invalid_input');});
test('SCH-04 four repeated cycles include cross-week deadline; overdue history must be explicit',()=>{let w=C.fixture('two-day-dc'),r=C.solve(w);assert.equal(r.status,'feasible');assert.equal(r.assignments.length,8);assert.deepEqual(plain(r.assignments.filter(a=>a.id.startsWith('DC')).map(a=>a.start)),[660,3540,6420,10740]);assert.equal(w.requests.find(r=>r.id==='DC-4').deadline,11520);assert.equal(C.coverage(w,r.assignments).covered,8);w=C.fixture('overdue-history');r=C.solve(w);assert.deepEqual(plain(C.coverage(w,r.assignments)),{required:6,covered:5,overdue:1,uncovered:1});w.history['DC-0']=C.time('2026-11-07T11:00');assert.equal(C.coverage(w,r.assignments).covered,6);w.history['DC-0']=0;assert.equal(C.coverage(w,r.assignments).uncovered,1);});
test('SCH-02 daily boundary includes prior duty and policy change',()=>{let w=C.fixture('fatigue-overload');assert.match(C.solve(w).error,/4.5h exceeds daily limit 4h/);w.policy.daily=270;let r=C.solve(w);assert.equal(r.status,'feasible');assert.equal(C.duty(w,r.assignments).totals.C01,270);w.policy.daily=269;assert.equal(C.solve(w).status,'infeasible');});
test('SCH-02 block span, exact rest boundary, midnight and weekly accounting',()=>{let w=C.fixture(),p=w.people[0];p.prior=[{start:0,end:60},{start:780,end:840}];assert.equal(C.duty(w,[]).violations.length,0);p.prior[1]={start:779,end:839};assert.match(C.duty(w,[]).violations.join(),/duty block/);p.prior=[{start:1410,end:1470}];let d=C.duty(w,[]);assert.equal(d.daily.C01[0],30);assert.equal(d.daily.C01[1],30);p.prior=Array.from({length:4},(_,i)=>({start:i*1440,end:i*1440+240}));assert.match(C.duty(w,[]).violations.join(),/weekly/);});
test('SCH-01 SCH-05 edited collision is rejected, corrected allocation validates',()=>{let w=C.fixture(),r=C.solve(w);let as=plain(r.assignments),dc=as.find(a=>a.id==='DC-1');dc.start=480;dc.end=600;dc.people=['C01'];assert.equal(C.check(w,as).errors[0],'DC-1 conflicts with ENG-1: C01 and Training Room.');dc.start=660;dc.end=780;dc.people=['C04'];assert.equal(C.check(w,as).errors.length,0);});
test('SCH-02 resources, qualification validity, distinct role count and alternate crew',()=>{let w=C.fixture();w.resources[0].windows=[];assert.equal(C.solve(w).status,'infeasible');w=C.fixture();w.people[0].valid.end=500;assert.equal(C.solve(w).status,'infeasible');w.requests[0].candidates.push({start:480,people:['C05']});assert.equal(C.solve(w).status,'feasible');w.requests[0].count=2;assert.equal(C.solve(w).status,'infeasible');});
test('actual rendered export strings use core assignments and counted duty',()=>{let w=C.fixture();w.assignments=C.solve(w).assignments;assert.equal(C.boardText(w,w.assignments[2]),'Damage Control drill | Mon 09 Nov 11:00–13:00 | C04 Riley Marsh | Training Room');assert.equal(C.loads(w),'Weekly counted duty: C01 2h; C02 1h; C03 1h; C04 2h; C05 0h; C06 1h.');});

test('SCH-03 malformed mandatory inputs are invalid, never feasible or silently dropped',()=>{
  const changes=[w=>w.requests=[],w=>w.requests.push(plain(w.requests[0])),w=>w.people.push(plain(w.people[0])),w=>w.resources.push(plain(w.resources[0])),w=>w.requests[0].duration=-1,w=>w.requests[0].duration=1.5,w=>w.requests[0].candidates[0].people=['UNKNOWN'],w=>w.requests[0].resource='UNKNOWN',w=>w.requests[0].candidates[0].start=480.5,w=>w.requests[0].release=w.requests[0].deadline+1,w=>w.policy.daily=NaN,w=>delete w.policy,w=>w.people[0].windows=[{start:10,end:9}],w=>w.people[0].prior=[{start:0,end:60},{start:30,end:90}],w=>w.history['DC-1']='not a timestamp',w=>w.history.UNKNOWN=0];
  for(const change of changes){let w=C.fixture();change(w);let before=JSON.stringify(w);assert.equal(C.solve(w).status,'invalid_input',String(change));assert.equal(JSON.stringify(w),before);}
});
test('SCH-01 board audit rejects duplicate occurrences and substituted resources',()=>{
  const w=C.fixture(),as=plain(C.solve(w).assignments);let copy=plain(as[0]);copy.start=480+2880;copy.end=600+2880;assert.ok(C.check(w,[...as,copy]).errors.length,'same mandatory ID cannot be fulfilled twice');
  as[0].resource='Engineering Simulator';assert.ok(C.check(w,as).errors.length,'board cannot substitute an unrequested resource');
});
test('SCH-01 SCH-02 touching intervals and independent personnel/resource collisions',()=>{
  const w=C.fixture(),as=plain(C.solve(w).assignments);assert.equal(C.check(w,as).counts.resource,0);
  let dc=as.find(a=>a.id==='DC-1');dc.start=599;dc.end=719;assert.ok(C.check(w,as).counts.resource>0);
  dc.resource='Engineering Simulator';dc.people=['C01'];assert.ok(C.check(w,as).counts.personnel>0);
  dc.people=['C04'];assert.equal(C.check(w,as).counts.personnel,0);
});
test('SCH-02 exact duty budgets and block boundaries including adjacent weeks',()=>{
  let w=C.fixture(),p=w.people[0];
  p.prior=[{start:0,end:240}];assert.equal(C.duty(w,[]).violations.length,0);p.prior[0].end=241;assert.match(C.duty(w,[]).violations.join(),/daily/);
  p.prior=[0,1,2].map(d=>({start:d*1440,end:d*1440+240}));assert.equal(C.duty(w,[]).violations.length,0);p.prior.push({start:4320,end:4321});assert.match(C.duty(w,[]).violations.join(),/weekly/);
  w.policy.daily=1440;p.prior=[{start:0,end:480}];assert.equal(C.duty(w,[]).violations.length,0);p.prior[0].end=481;assert.match(C.duty(w,[]).violations.join(),/block/);
  p.prior=[{start:0,end:60},{start:779,end:839}];assert.match(C.duty(w,[]).violations.join(),/block/);p.prior[1]={start:780,end:840};assert.equal(C.duty(w,[]).violations.length,0);p.prior[1]={start:781,end:841};assert.equal(C.duty(w,[]).violations.length,0);
  p.prior=[{start:-30,end:30},{start:10050,end:10110}];const d=C.duty(w,[]);assert.equal(d.weekly.C01[-1],30);assert.equal(d.weekly.C01[0],60);assert.equal(d.weekly.C01[1],30);
});
test('SCH-04 exact occurrence set, due boundary and missing occurrence coverage',()=>{
  let w=C.fixture('two-day-dc'),r=C.solve(w);assert.deepEqual(plain(r.assignments.map(a=>a.id)).sort(),['COMBAT-1','DC-1','DC-2','DC-3','DC-4','ENG-1','FLIGHT-1','WEAPONS-1']);assert.equal(C.coverage(w,r.assignments.slice(1)).uncovered,1);
  w=C.fixture();r=C.solve(w);w.requests[0].deadline=600;assert.equal(C.check(w,r.assignments).errors.length,0);w.requests[0].deadline=599;assert.ok(C.check(w,r.assignments).errors.length);
});

// Event-handler checks use the actual inline controller with a small DOM adapter.
// This verifies state/control wiring, not browser layout, semantics or download behavior.
function ui(saved){
  class Element{
    constructor(tag='div'){this.tagName=tag;this.value='';this.textContent='';this.children=[];this.listeners={};this.disabled=false;this.hidden=false;this.checked=false;}
    append(x){this.children.push(x);}replaceChildren(...xs){this.children=xs;if(this.tagName==='select')this.value=xs[0]?.value||'';}
    addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}focus(){}click(){if(!this.disabled)this.onclick?.();}
    createTHead(){return this;}insertRow(){const x=new Element('tr');this.append(x);return x;}insertCell(){const x=new Element('td');this.append(x);return x;}
  }
  const elements={};for(const m of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g))elements[m[2]]=new Element(m[1]);
  const storage=new Map(saved?[['pb4t-v1',saved]]:[]),queue=[];
  const document={getElementById:id=>elements[id],createElement:tag=>new Element(tag),querySelectorAll:()=>Object.values(elements).filter(e=>['input','select','button'].includes(e.tagName))};
  const sandbox=vm.createContext({document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:f=>queue.push(f),location:{reload(){}},URL:{},Blob});
  const scripts=[...html.matchAll(/<script(?: id="pb4t-core")?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);vm.runInContext(scripts.join('\n'),sandbox);
  const get=id=>elements[id],click=id=>get(id).click(),input=(id,value)=>{get(id).value=value;get(id).oninput?.();for(const fn of get(id).listeners.input||[])fn();},select=(id,value)=>{get(id).value=value;get(id).onchange?.();},flush=()=>{let limit=10000;while(queue.length&&limit--)queue.shift()();assert.ok(limit>0);};
  function baseline(){select('sample-case','baseline');click('load-sample');click('optimize');flush();}
  return {get,click,input,select,flush,baseline,stored:()=>storage.get('pb4t-v1')};
}
test('SCH-05 actual controller preserves independent editor drafts and blocks acceptance',()=>{
  const u=ui();u.baseline();u.input('crew-qualifications','EOOW');u.input('policy-reason','pending reason');u.input('policy-daily-hours','4.5');
  u.click('save-crew');assert.equal(u.get('policy-daily-hours').value,'4.5');u.click('accept-schedule');assert.equal(u.get('review-error').textContent,'Save or discard the draft before accepting a schedule.');assert.equal(JSON.parse(u.stored()).inputDirty,true);
  u.click('save-policy');assert.equal(JSON.parse(u.stored()).inputDirty,false);assert.equal(JSON.parse(u.stored()).policy.daily,270);
});
test('SCH-05 actual controller prevents switching away from unsaved crew values',()=>{
  const u=ui();u.baseline();u.input('crew-qualifications','EOOW');u.select('crew-person','C06');assert.equal(u.get('crew-person').value,'C01');assert.equal(u.get('crew-qualifications').value,'EOOW');assert.match(u.get('input-error').textContent,/Save crew/);
});
test('SCH-03 actual controller locks mutating controls, stops without committing, then recovers',()=>{
  const u=ui();u.select('sample-case','baseline');u.click('load-sample');u.click('optimize');assert.equal(u.get('save-policy').disabled,true);assert.equal(u.get('load-sample').disabled,true);assert.equal(u.get('accept-schedule').disabled,true);assert.equal(u.get('stop-search').disabled,false);
  u.click('stop-search');u.flush();assert.equal(JSON.parse(u.stored()).assignments.length,0);assert.equal(u.get('search-status').textContent,'Stopped by operator — no new schedule accepted. Inputs preserved.');assert.equal(u.get('save-policy').disabled,false);
  u.click('optimize');u.flush();assert.equal(JSON.parse(u.stored()).assignments.length,5);
});
test('SCH-05 controller acceptance binds revision, restores, rejects draft and saved conflict',()=>{
  const u=ui();u.baseline();u.input('reviewer','Alex Demo');u.get('review-confirm').checked=true;u.click('accept-schedule');assert.equal(u.get('review-status').textContent,'Accepted synthetic revision 1 by Alex Demo. Not authorization to execute drills.');
  const restored=ui(u.stored());assert.equal(restored.get('review-status').textContent,u.get('review-status').textContent);
  u.select('edit-person','C01');u.input('edit-start','2026-11-09T08:00');u.click('preview-edit');assert.equal(u.get('edit-comparison').textContent,'Saved: DC-1 Mon 11:00 C04. Draft: DC-1 Mon 08:00 C01.');
  u.click('accept-schedule');assert.match(u.get('review-error').textContent,/Save or discard/);u.click('save-edit');u.click('validate-board');assert.equal(u.get('board-error').textContent,'DC-1 conflicts with ENG-1: C01 and Training Room.');
  u.input('edit-start','2026-11-09T11:00');u.select('edit-person','C04');u.click('save-edit');u.click('validate-board');assert.equal(u.get('review-status').textContent,'Revision 3 valid; awaiting synthetic review.');assert.equal(u.get('review-confirm').checked,false);
});
test('SCH-05 saving another editor preserves an allocation draft and reload restores it',()=>{
  const u=ui();u.baseline();u.select('edit-occurrence','ENG-1');u.input('edit-start','2026-11-10T08:00');u.input('policy-reason','Synthetic test');u.input('policy-daily-hours','4.5');u.click('save-policy');assert.equal(u.get('edit-occurrence').value,'ENG-1');assert.equal(u.get('edit-start').value,'2026-11-10T08:00');
  const restored=ui(u.stored());assert.equal(restored.get('edit-occurrence').value,'ENG-1');assert.equal(restored.get('edit-start').value,'2026-11-10T08:00');restored.select('edit-occurrence','DC-1');assert.equal(restored.get('edit-occurrence').value,'ENG-1');
});
test('UC11-1 SCH-01 SCH-02 SCH-04 independent allocation oracle across feasible samples',()=>{
  for(const name of ['baseline','two-day-dc','overdue-history']){
    const w=C.fixture(name),as=plain(C.solve(w).assignments),daily={},weekly={};
    const contains=(windows,a)=>windows.some(x=>x.start<=a.start&&x.end>=a.end);
    assert.equal(new Set(as.map(a=>a.id)).size,as.length);
    for(let i=0;i<as.length;i++){
      const a=as[i],r=w.requests.find(r=>r.id===a.id);
      assert.equal(a.end-a.start,r.duration);assert.ok(a.start>=r.release&&a.end<=r.deadline);assert.equal(a.resource,r.resource);assert.ok(contains(w.windows,a));assert.ok(contains(r.allowed,a));assert.ok(contains(w.resources.find(x=>x.id===a.resource).windows,a));
      for(const id of a.people){const p=w.people.find(p=>p.id===id);assert.ok(p.qualifications.includes(r.role));assert.ok(p.valid.start<=a.start&&p.valid.end>=a.end);assert.ok(contains(p.windows,a));}
      for(const b of as.slice(i+1))if(a.start<b.end&&b.start<a.end){assert.notEqual(a.resource,b.resource);assert.ok(!a.people.some(id=>b.people.includes(id)));}
    }
    for(const p of w.people){const all=[...p.prior,...as.filter(a=>a.people.includes(p.id))].sort((a,b)=>a.start-b.start);let blockStart=null,blockEnd=null;
      for(const a of all){for(let m=a.start;m<a.end;){let day=Math.floor(m/1440),end=Math.min(a.end,(day+1)*1440),dk=p.id+':'+day,wk=p.id+':'+Math.floor(day/7);daily[dk]=(daily[dk]||0)+end-m;weekly[wk]=(weekly[wk]||0)+end-m;m=end;}
        if(blockEnd===null||a.start-blockEnd>=w.policy.gap)blockStart=a.start;blockEnd=Math.max(blockEnd??a.end,a.end);assert.ok(blockEnd-blockStart<=w.policy.block);
      }
    }
    assert.ok(Object.values(daily).every(m=>m<=w.policy.daily));assert.ok(Object.values(weekly).every(m=>m<=w.policy.weekly));
  }
});
