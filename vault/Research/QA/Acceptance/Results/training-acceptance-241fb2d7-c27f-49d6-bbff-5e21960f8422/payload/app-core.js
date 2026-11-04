/* Synthetic Training Draft core v1. Independently written, no runtime dependencies. */
(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  function canonical(v) {
    if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
    return JSON.stringify(v);
  }
  function fail(path, message) { throw new Error(path + ': ' + message); }
  function object(v, path, keys) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) fail(path, 'supply an object');
    for (const k of Object.keys(v)) if (!keys.includes(k)) fail(path + '.' + k, 'unknown field; remove it');
    for (const k of keys) if (!Object.hasOwn(v, k)) fail(path + '.' + k, 'required field is missing');
  }
  function integer(v, path, min = 0, max = 2880) {
    if (!Number.isSafeInteger(v) || v < min || v > max) fail(path, 'supply an integer from ' + min + ' to ' + max);
  }
  function text(v, path) {
    if (typeof v !== 'string' || !v.trim() || v.length > 200) fail(path, 'supply nonempty text, at most 200 characters');
  }
  function list(v, path, min = 0) {
    if (!Array.isArray(v) || v.length < min || v.length > 100) fail(path, 'supply an array of ' + min + '–100 items');
  }
  function unique(v, path) { if (new Set(v).size !== v.length) fail(path, 'remove duplicate values'); }
  function windows(v, path) {
    list(v, path);
    v.forEach((w, i) => {
      if (!Array.isArray(w) || w.length !== 2) fail(path + '[' + i + ']', 'supply [start,end]');
      w.forEach((n, j) => integer(n, path + '[' + i + '][' + j + ']'));
      if (w[0] >= w[1]) fail(path + '[' + i + ']', 'end must follow start');
    });
  }
  function validate(v) {
    object(v, 'input', ['schemaVersion','epoch','operatingWindows','people','requests','maxNodes']);
    if (v.schemaVersion !== 1) fail('schemaVersion', 'only version 1 is supported');
    object(v.epoch, 'epoch', ['label','day2Minute']); text(v.epoch.label, 'epoch.label');
    if (v.epoch.day2Minute !== 1440) fail('epoch.day2Minute', 'must be 1440 for this two-day demonstration');
    windows(v.operatingWindows, 'operatingWindows');
    integer(v.maxNodes, 'maxNodes', 1, 200000);
    list(v.people, 'people', 2);
    if (v.people.length !== 2) fail('people', 'retain exactly P01 and P02');
    v.people.forEach((p, i) => {
      const path = 'people[' + i + ']';
      object(p, path, ['id','qualifications','availability','maxMinutes','restMinutes']);
      text(p.id, path + '.id'); list(p.qualifications, path + '.qualifications');
      p.qualifications.forEach((q,j) => text(q,path + '.qualifications['+j+']')); unique(p.qualifications,path+'.qualifications');
      windows(p.availability,path+'.availability'); integer(p.maxMinutes,path+'.maxMinutes'); integer(p.restMinutes,path+'.restMinutes');
    });
    if (canonical(v.people.map(p=>p.id).sort()) !== '["P01","P02"]') fail('people', 'retain unique IDs P01 and P02');
    list(v.requests, 'requests', 4);
    if (v.requests.length !== 4) fail('requests', 'retain exactly A, B, C and D');
    v.requests.forEach((r,i) => {
      const path='requests['+i+']';
      object(r,path,['id','duration','allowedStarts','personId','roomId','requiredQualification']);
      text(r.id,path+'.id'); integer(r.duration,path+'.duration',1);
      text(r.personId,path+'.personId'); if (!v.people.some(p=>p.id===r.personId)) fail(path+'.personId','choose P01 or P02');
      text(r.roomId,path+'.roomId'); text(r.requiredQualification,path+'.requiredQualification');
      list(r.allowedStarts,path+'.allowedStarts',1); unique(r.allowedStarts,path+'.allowedStarts');
      r.allowedStarts.forEach((n,j)=> {integer(n,path+'.allowedStarts['+j+']'); if(n+r.duration>2880) fail(path+'.allowedStarts['+j+']','session end must be at most 2880');});
    });
    if (canonical(v.requests.map(r=>r.id).sort()) !== '["A","B","C","D"]') fail('requests','retain unique IDs A, B, C and D');
    return v;
  }
  function defaults() {
    const ws = [[0,240],[1440,1680]];
    return {schemaVersion:1,epoch:{label:'Synthetic day one at minute 0',day2Minute:1440},operatingWindows:clone(ws),
      people:[{id:'P01',qualifications:['Q-A'],availability:clone(ws),maxMinutes:120,restMinutes:30},{id:'P02',qualifications:['Q-B'],availability:clone(ws),maxMinutes:120,restMinutes:0}],
      requests:[['A',[0],'P01','Room-1','Q-A'],['B',[0,90],'P01','Room-1','Q-A'],['C',[0],'P02','Room-2','Q-B'],['D',[1440],'P02','Room-2','Q-B']].map(([id,allowedStarts,personId,roomId,requiredQualification])=>({id,duration:60,allowedStarts,personId,roomId,requiredQualification})),maxNodes:50000};
  }
  const assignment = (r,start) => ({requestId:r.id,start,end:start+r.duration,personId:r.personId,roomId:r.roomId});
  const fits = (a,ws) => ws.some(w=>a.start>=w[0] && a.end<=w[1]);
  function conflicts(input, a, assigned) {
    const r=input.requests.find(r=>r.id===a.requestId), p=input.people.find(p=>p.id===a.personId), out=[];
    if (!p.qualifications.includes(r.requiredQualification)) out.push(r.id+': '+p.id+' lacks qualification '+r.requiredQualification);
    if (!fits(a,input.operatingWindows)) out.push(r.id+': whole session is outside operating windows');
    if (!fits(a,p.availability)) out.push(r.id+': '+p.id+' is unavailable for the whole session');
    if (r.duration+assigned.filter(b=>b.personId===p.id).reduce((s,b)=>s+b.end-b.start,0)>p.maxMinutes) out.push(r.id+': '+p.id+' exceeds whole-horizon duty cap '+p.maxMinutes);
    for (const b of assigned) {
      const overlap=a.start<b.end && b.start<a.end;
      if (a.roomId===b.roomId && overlap) out.push(r.id+' / '+b.requestId+': room '+a.roomId+' collision');
      if (a.personId===b.personId && a.start<b.end+p.restMinutes && b.start<a.end+p.restMinutes) out.push(r.id+' / '+b.requestId+': '+p.id+' overlap or required rest '+p.restMinutes+' minutes');
    }
    return out;
  }
  function loads(input, assignments) {
    return input.people.map(p=>({personId:p.id,proposedMinutes:input.requests.filter(r=>r.personId===p.id).reduce((n,r)=>n+r.duration,0),scheduledMinutes:assignments.length===4?assignments.filter(a=>a.personId===p.id).reduce((n,a)=>n+a.end-a.start,0):null,maxMinutes:p.maxMinutes}));
  }
  function invalid(message, revision=0) {return {status:'invalid_input',origin:'search',assignments:[],loads:[],diagnostics:[message],explored:0,inputRevision:revision};}
  function solve(input, revision=0) {
    try {validate(input);} catch(e) {return invalid(e.message,revision);}
    let explored=0, exhausted=false; const assigned=[], reasons=new Set();
    function search(i) {
      if(i===input.requests.length) return true;
      const r=input.requests[i];
      for(const start of r.allowedStarts) {
        if(explored===input.maxNodes) {exhausted=true; return false;}
        explored++;
        const a=assignment(r,start), errors=conflicts(input,a,assigned);
        if(errors.length) {errors.forEach(e=>{if(reasons.size<100) reasons.add(e);}); continue;}
        assigned.push(a); if(search(i+1)) return true; assigned.pop(); if(exhausted) return false;
      }
      return false;
    }
    const ok=search(0), assignments=ok?clone(assigned):[];
    // A separate full-draft pass guards the search result before review/display.
    if(ok) {const checked=checkDraft(input,Object.fromEntries(assignments.map(a=>[a.requestId,a.start])),revision); if(checked.status!=='feasible') throw new Error('Internal draft consistency failure');}
    return {status:ok?'feasible':exhausted?'budget_exhausted':'infeasible',origin:'search',assignments,loads:loads(input,assignments),diagnostics:ok?[]:[...reasons],explored,inputRevision:revision};
  }
  function checkDraft(input, selectedStarts, revision=0) {
    validate(input); object(selectedStarts,'selectedStarts',input.requests.map(r=>r.id));
    const assigned=[], diagnostics=[];
    for(const r of input.requests) {
      const start=selectedStarts[r.id];
      if(!r.allowedStarts.includes(start)) fail('selectedStarts.'+r.id,'choose a listed allowed start');
      const a=assignment(r,start); diagnostics.push(...conflicts(input,a,assigned)); assigned.push(a);
    }
    const ok=diagnostics.length===0, assignments=ok?assigned:[];
    return {status:ok?'feasible':'infeasible',origin:'manual',assignments,loads:loads(input,assignments),diagnostics,explored:0,inputRevision:revision,selectedStarts:clone(selectedStarts)};
  }
  function fromText(inputText, revision=0) {
    let inputs; try {inputs=JSON.parse(inputText);} catch(e) {return {inputText,inputs:null,result:invalid('JSON: '+e.message,revision),revision,review:null,historicalReview:null};}
    return {inputText,inputs,result:solve(inputs,revision),revision,review:null,historicalReview:null};
  }
  function createState() {return fromText(JSON.stringify(defaults(),null,2));}
  function editText(state,text) {return fromText(text,state.revision+1);}
  function selectStart(state,id,start) {
    if(state.result.status==='invalid_input') fail('draft','correct the input first');
    const selected=state.result.origin==='manual'?clone(state.result.selectedStarts):Object.fromEntries(state.result.assignments.map(a=>[a.requestId,a.start]));
    if(Object.keys(selected).length!==4) fail('draft','generate a complete draft before selecting starts');
    selected[id]=start; const revision=state.revision+1;
    return {...state,revision,review:null,historicalReview:null,result:checkDraft(state.inputs,selected,revision)};
  }
  function markReviewed(state, reviewer, timestamp=new Date().toISOString()) {
    text(reviewer,'reviewer');
    if(state.result.status!=='feasible') fail('review','only a complete feasible draft can be reviewed');
    const checked=checkDraft(state.inputs,Object.fromEntries(state.result.assignments.map(a=>[a.requestId,a.start])));
    if(checked.status!=='feasible') fail('review','draft is no longer valid');
    return {...state,review:{reviewer,timestamp,inputRevision:state.revision}};
  }
  function snapshot(state) {
    return JSON.stringify({schemaVersion:1,kind:'synthetic-training-draft',inputText:state.inputText,inputs:state.inputs,result:state.result,draftReview:state.review||state.historicalReview},null,2);
  }
  function importSnapshot(serialized) {
    if(typeof serialized!=='string' || new TextEncoder().encode(serialized).length>1048576) fail('snapshot','file must be at most 1 MiB');
    let s; try{s=JSON.parse(serialized);}catch(e){fail('snapshot','invalid JSON: '+e.message);}
    object(s,'snapshot',['schemaVersion','kind','inputText','inputs','result','draftReview']);
    if(s.schemaVersion!==1 || s.kind!=='synthetic-training-draft') fail('snapshot','unsupported format/version');
    if(typeof s.inputText!=='string') fail('snapshot.inputText','must be text');
    if(!s.result || !Number.isSafeInteger(s.result.inputRevision) || s.result.inputRevision<0) fail('snapshot.result','missing valid revision');
    const revision=s.result.inputRevision;
    const restored=fromText(s.inputText,revision);
    if(canonical(restored.inputs)!==canonical(s.inputs)) fail('snapshot.inputs','does not match saved editor text');
    let expected=restored.result;
    if(s.result.origin==='manual') {
      if(expected.status==='invalid_input') fail('snapshot.result','manual draft requires valid input');
      expected=checkDraft(restored.inputs,s.result.selectedStarts,revision);
    }
    if(canonical(expected)!==canonical(s.result)) fail('snapshot.result','stale or tampered result; regenerate from exact inputs');
    if(s.draftReview!==null) {
      object(s.draftReview,'snapshot.draftReview',['reviewer','timestamp','inputRevision']); text(s.draftReview.reviewer,'snapshot.draftReview.reviewer');
      if(typeof s.draftReview.timestamp!=='string' || !Number.isFinite(Date.parse(s.draftReview.timestamp))) fail('snapshot.draftReview.timestamp','invalid timestamp');
      if(s.draftReview.inputRevision!==revision || expected.status!=='feasible') fail('snapshot.draftReview','inconsistent review');
    }
    return {...restored,result:clone(s.result),historicalReview:clone(s.draftReview),review:null};
  }
  const api={defaults,validate,solve,checkDraft,loads,createState,fromText,editText,selectStart,markReviewed,snapshot,importSnapshot,canonical};
  if(typeof module==='object' && module.exports) module.exports=api;
  root.TrainingDraft=api;
})(typeof globalThis!=='undefined'?globalThis:this);
