import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from './compute.mjs';

test('transfer ties use timestamp instant then code-unit id; completion and stop preserve ordering',()=>{
 const item=(id,createdAt,offset=0)=>({id,sizeBytes:3,acknowledgedOffset:offset,priority:1,createdAt});
 const items=[item('b','2027-04-01T01:00:00+01:00'),item('A','2027-04-01T00:00:00Z'),item('done','2026-01-01T00:00:00Z',3)];
 const before=structuredClone(items);
 assert.deepEqual(compute({action:'plan',items,budgetBytes:4,acknowledge:true}),{status:'ok',chunks:[{id:'A',offset:0,bytes:3},{id:'b',offset:0,bytes:1}],usedBytes:4,remainingBudgetBytes:0,offsets:[{id:'A',acknowledgedOffset:3},{id:'b',acknowledgedOffset:1},{id:'done',acknowledgedOffset:3}],pendingIds:['b']});
 assert.deepEqual(items,before);
 assert.deepEqual(compute({action:'plan',items,budgetBytes:4,acknowledge:true,stopped:true}),{status:'ok',chunks:[],usedBytes:0,remainingBudgetBytes:4,offsets:[{id:'A',acknowledgedOffset:0},{id:'b',acknowledgedOffset:0},{id:'done',acknowledgedOffset:3}],pendingIds:['A','b']});
 for(const patch of [{acknowledgedOffset:4},{createdAt:'2027-02-30T00:00:00Z'},{priority:6}])assert.deepEqual(compute({action:'plan',items:[{...items[0],...patch}],budgetBytes:2}),{status:'error',error:'INVALID_INPUT'});
});

test('review gates reject unresolved conflicts before approval; same-content revision invalidates approval',()=>{
 const base={action:'workflow',actor:'synthetic-reviewer',timestamp:'2027-01-01T12:30:00Z'};
 const state={revisionId:'r1',approvedRevision:'r1',valid:true,conflicted:true,routeState:'approved'};
 for(const command of ['approve','queue','route'])assert.deepEqual(compute({...base,state,command,online:true}),{status:'error',error:'CONFLICT_REVIEW_REQUIRED'});
 assert.deepEqual(compute({...base,state:{...state,valid:false},command:'route',online:true}),{status:'error',error:'VALIDATION_REQUIRED'});
 assert.deepEqual(compute({...base,state:{...state,conflicted:false},command:'edit',newRevisionId:'r2'}),{status:'ok',state:{revisionId:'r2',approvedRevision:null,valid:true,conflicted:false,routeState:'draft'},event:{revisionId:'r2',action:'edited',actor:base.actor,timestamp:base.timestamp}});
});

test('graph boundary rejects duplicate ancestry and preserves deletion after idempotent replay',()=>{
 const root={id:'root',recordId:'r',parents:[],actor:'synthetic',value:'saved'};
 const deleted={...root,id:'deleted',parents:['root'],value:null};
 assert.deepEqual(compute({action:'reconcile',local:[root,deleted],remote:[deleted,root]}),{status:'ok',operations:[deleted,root],records:[{recordId:'r',heads:['deleted'],status:'deleted',value:null}],conflicts:0});
 assert.deepEqual(compute({action:'reconcile',local:[root,{...deleted,parents:['root','root']}],remote:[]}),{status:'error',error:'INVALID_INPUT'});
 assert.deepEqual(compute({action:'reconcile',local:[],remote:[]}),{status:'ok',operations:[],records:[],conflicts:0});
});
