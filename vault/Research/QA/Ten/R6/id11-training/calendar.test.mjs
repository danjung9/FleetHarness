import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calendarDays,guidedUpdate} from './public/app.js';
import {run} from './domain.mjs';
const base=()=>structuredClone(JSON.parse(readFileSync(new URL('./data/synthetic-data.json',import.meta.url))).scenarios[0].input);
test('Wednesday-start headings align with assignments and daily personnel load',()=>{
 const d=guidedUpdate(base(),'week','','2026-11-11');
 assert.deepEqual(calendarDays(d),[
  {day:0,date:'2026-11-11',weekday:'Wed'},{day:1,date:'2026-11-12',weekday:'Thu'},
  {day:2,date:'2026-11-13',weekday:'Fri'},{day:3,date:'2026-11-14',weekday:'Sat'},
  {day:4,date:'2026-11-15',weekday:'Sun'},{day:5,date:'2026-11-16',weekday:'Mon'},
  {day:6,date:'2026-11-17',weekday:'Tue'}]);
 const result=run({data:d});assert.equal(result.status,'feasible');
 const eng=result.assignments.find(a=>a.requestId==='ENG-1');
 assert.equal(new Date(Date.parse(d.weekStart)+eng.startMinute*60000).toISOString(),'2026-11-12T09:00:00.000Z');
 assert.equal(calendarDays(d)[Math.floor(eng.startMinute/1440)].weekday,'Thu');
 assert.deepEqual(result.loads.find(p=>p.personId==='P1').drillMinutesByDay,[60,60,0,0,0,0,0]);
});
test('calendar labels follow partial, negative and year-crossing horizons in UTC',()=>{
 const d={weekStart:'2026-12-31T00:00:00Z',horizonMinutes:[-60,1500]};
 assert.deepEqual(calendarDays(d),[{day:-1,date:'2026-12-30',weekday:'Wed'},{day:0,date:'2026-12-31',weekday:'Thu'},{day:1,date:'2027-01-01',weekday:'Fri'}]);
});
