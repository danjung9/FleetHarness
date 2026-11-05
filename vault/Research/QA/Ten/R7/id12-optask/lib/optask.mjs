export const disclaimer = 'Synthetic, not validated against the real USMTF format.';
const reasons = {EMPTY_INPUT:'Enter a synthetic message.',HEADER_INVALID:'Use the three SYN-OPTASK/1 header lines.',UNSUPPORTED_SET:'Unsupported set requires review.',MISSING_FIELD:'A required field is missing.',MALFORMED_SET:'Use the documented set field order and syntax.',INVALID_FREQUENCY:'Use a positive decimal MHz literal.',MISSING_TIMEZONE:'Supply an explicit timezone.',INVALID_DATE:'Supply a valid explicit Gregorian timestamp.',REVERSED_WINDOW:'End must be after start.',DUPLICATE_ID:'Duplicate ID requires review.'};
const specs = {FREQ:['ID','SHIP','LABEL','NET','CHANNEL','FREQUENCY','UNIT','START','END'],CRYPTO:['ID','SHIP','LABEL','CHANGEOVER','START','END'],FLIGHT:['ID','SHIP','LABEL','AT']};
function dayValid(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const [y,m,d]=s.split('-').map(Number); const leap=y%4===0&&(y%100!==0||y%400===0);
 return y>=1&&y<=9998&&m>=1&&m<=12&&d>=1&&d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
}
const iso = ms=>new Date(ms).toISOString().replace('.000Z','Z');
function timestamp(s){
 const m=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(00)(Z|[+-]\d{2}:\d{2})$/.exec(s);
 if(!m||!dayValid(m[1])||+m[2]>23||+m[3]>59)return null;
 let offset=0;if(m[5]!=='Z'){const h=+m[5].slice(1,3),n=+m[5].slice(4);if(h>23||n>59)return null;offset=(h*60+n)*(m[5][0]==='+'?1:-1);}
 const ms=Date.parse(`${m[1]}T${m[2]}:${m[3]}:00Z`)-offset*60000;
 const y=new Date(ms).getUTCFullYear();return y>=1&&y<=9998?ms:null;
}
export function invoke(input){
 const fail=error=>({status:'error',error,result:null});
 if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.rawText!=='string')return fail('INVALID_INPUT_TYPE');
 const action=input.action===undefined?'parse':input.action;
 if(!['parse','export'].includes(action))return fail('INVALID_ACTION');
 const {rawText,selectedDate,selectedShip}=input;
 if(!dayValid(selectedDate)||typeof selectedShip!=='string'||!selectedShip.length||(input.displayTimezone!==undefined&&input.displayTimezone!=='UTC')||(input.reviewed!==undefined&&typeof input.reviewed!=='boolean'))return fail('INVALID_SELECTION');
 if(action==='export'&&input.reviewed!==true)return fail('REVIEW_REQUIRED');
 const events=[],reviewFlags=[],ids=new Set();let messageId=null;
 const lines=[];let offset=0;
 if(rawText!=='')for(const physical of rawText.split('\n')){const text=physical.replace(/\r$/,'');lines.push({text,start:offset,end:offset+text.length,line:lines.length+1});offset+=physical.length+1;}
 const flag=(code,evidence)=>reviewFlags.push({code,reason:reasons[code],evidence:{...evidence}});
 let header=true;
 if(!rawText){flag('EMPTY_INPUT',{text:'',start:0,end:0,line:0});header=false;}
 else for(let i=0;i<3;i++){
 const t=lines[i]?.text;const ok=i===0?t==='SYN-OPTASK/1//':i===1?typeof t==='string'&&/^MSGID\/[^/\r\n]+\/\/$/.test(t):t==='NOTICE/SYNTHETIC-NOT-REAL-USMTF//';
 if(!ok){flag('HEADER_INVALID',lines[i]||{text:'',start:rawText.length,end:rawText.length,line:i+1});header=false;break;}
 }
 const midnight=Date.parse(selectedDate+'T00:00:00Z'),next=midnight+86400000;
 if(header){messageId=lines[1].text.slice(6,-2);
 for(const line of lines.slice(3)){
 const t=line.text;if(t===''||/^RMKS\/[^/\r\n]*\/\/$/.test(t))continue;
 const token=t.split('/')[0],keys=specs[token];if(!keys){flag('UNSUPPORTED_SET',line);continue;}
 const parts=t.slice(token.length+1).replace(/\/\/$/,'').split('/');
 const pairs=parts.map(p=>{const n=p.indexOf('=');return n<0?[p,null]:[p.slice(0,n),p.slice(n+1)];});
 if(keys.some(k=>!pairs.some(([a])=>a===k)||pairs.some(([a,b])=>a===k&&(b===null||b==='')))){flag('MISSING_FIELD',line);continue;}
 if(!t.endsWith('//')||pairs.length!==keys.length||pairs.some(([k,v],i)=>k!==keys[i]||v===null||/[\r\n]/.test(v))){flag('MALFORMED_SET',line);continue;}
 const fields={},evidence={};let cursor=line.start+token.length+1;
 for(const [k,v] of pairs){const key=k.toLowerCase();fields[key]=v;evidence[key]={text:v,start:cursor+k.length+1,end:cursor+k.length+1+v.length,line:line.line};cursor+=k.length+1+v.length+1;}
 if(token==='FREQ'&&(fields.unit!=='MHz'||!/^\d+(\.\d+)?$/.test(fields.frequency)||!(Number(fields.frequency)>0))){flag('INVALID_FREQUENCY',line);continue;}
 const times=token==='FLIGHT'?[fields.at]:[fields.start,fields.end];
 if(times.some(s=>!/(Z|[+-]\d{2}:\d{2})$/.test(s))){flag('MISSING_TIMEZONE',line);continue;}
 const values=times.map(timestamp);if(values.some(v=>v===null)){flag('INVALID_DATE',line);continue;}
 const [start,end=null]=values;if(end!==null&&end<=start){flag('REVERSED_WINDOW',line);continue;}
 if(ids.has(fields.id)){flag('DUPLICATE_ID',line);continue;}ids.add(fields.id);
 const visibleSegments=[];
 if(end===null?start>=midnight&&start<next:end>midnight&&start<next){const a=Math.max(start,midnight),b=end===null?null:Math.min(end,next);visibleSegments.push({startUtc:iso(a),endUtc:b===null?null:iso(b),startMinute:(a-midnight)/60000,endMinute:b===null?null:(b-midnight)/60000,continuesBefore:start<midnight,continuesAfter:end!==null&&end>next});}
 events.push({id:fields.id,messageId,category:{FREQ:'frequency-plan',CRYPTO:'crypto-changeover',FLIGHT:'flight-quarters'}[token],fields,evidence,startUtc:iso(start),endUtc:end===null?null:iso(end),derivedFrom:{startUtc:token==='FLIGHT'?'at':'start',endUtc:token==='FLIGHT'?null:'end',visibleSegments:['startUtc','endUtc','selectedDate']},visibleSegments});
 }}
 const timelineOrder=events.filter(e=>e.fields.ship===selectedShip&&e.visibleSegments.length).sort((a,b)=>a.startUtc<b.startUtc?-1:a.startUtc>b.startUtc?1:a.id<b.id?-1:a.id>b.id?1:0).map(e=>e.id);
 return {status:reviewFlags.length?'review':'ok',error:null,result:{messageId,rawText,selectedDate,selectedShip,displayTimezone:'UTC',lineCount:lines.length,events,reviewFlags,timelineOrder,disclaimer,reviewed:action==='export'}};
}
