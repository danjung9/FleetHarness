import {reconcileRecords,planUploads} from './lib/offline.js';
import {extract,validate,classify,workflow,benchmark,tasks} from './domain.mjs';
export function compute(input){
 const actions={reconcile:reconcileRecords,plan:planUploads,extract,validate,classify,workflow,benchmark,tasks};
 if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.action!=='string'||!Object.hasOwn(actions,input.action))return {status:'error',error:'INVALID_ACTION'};
 try{return {status:'ok',...actions[input.action](input)}}catch(e){return {status:'error',error:['ID_COLLISION','MISSING_PARENT','CROSS_RECORD_PARENT','CYCLE','VALIDATION_REQUIRED','CONFLICT_REVIEW_REQUIRED','APPROVAL_REQUIRED','QUEUE_REQUIRED','OFFLINE','SOURCE_MISSING'].includes(e.message)?e.message:'INVALID_INPUT'}}
}
