import {validatePackage} from './lib/validation.js';
import {recurrence} from './domain/policy.mjs';
import {schedule} from './domain/schedule.mjs';
export async function compute(input,context={}) {
 let p;
 try {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==2||!['allocate','report'].includes(input.action)||!Object.hasOwn(input,'package'))throw Error();
  p=validatePackage(input.package);
  const rec=recurrence(p);
  for(const r of p.requests){const o=rec.occurrences.find(o=>o.occurrenceId===r.occurrenceId);if(!o||o.requirementId!==r.requirementId)throw Error();}
 }catch(error){if(context.diagnostics)context.diagnostics.error=error?.message||'INVALID_PACKAGE';return {status:'invalid_input',error:'INVALID_PACKAGE'};}
 const result=await schedule(p,context.signal,context.diagnostics);
 return input.action==='allocate'?{status:result.status,allocations:result.allocations}:result;
}
