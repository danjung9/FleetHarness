import { createHash } from 'node:crypto';
import { timestamp, compareText } from './lib/validation.js';
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const str = x => typeof x === 'string';
const nonblank = x => str(x) && !!x.trim();
const utc = x => str(x) && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(x) && !!timestamp(x);
const norm = x => x.trim().toLowerCase();
const named = (r,n) => [r.name,...r.aliases].some(x=>norm(x)===norm(n));
const families = {AIS:48,registry:720,OFAC:168,EU_sanctions:168,port_log:336};
const empty = (status='validation_error') => ({status,candidateIds:[],selectedVesselId:null,includedSnapshotIds:[],excludedSnapshotIds:[],rejectedIdentitySnapshotIds:[],supportedFacts:[],unknownFields:[],staleSnapshotIds:[],conflicts:[]});
const distinct = a => [...new Set(a)];
const linked = (s,r) => (s.identity.imo===r.imo || s.identity.mmsi===r.mmsi) && (!s.identity.imo || s.identity.imo===r.imo) && (!s.identity.mmsi || s.identity.mmsi===r.mmsi);
export async function compute(input, {signal}={}) {
  signal?.throwIfAborted();
  const bad=empty();
  if (!obj(input) || Object.keys(input).some(k=>!['records','queryType','queryValue','asOf','selectedVesselId','nameConstraint','question','inspectSnapshotId'].includes(k))) return bad;
  const {records,queryType,queryValue}=input;
  if (!Array.isArray(records)||!records.length||records.length>200 || !str(queryType)||!str(queryValue)) return bad;
  if (['selectedVesselId','nameConstraint','question','inspectSnapshotId','asOf'].some(k=>input[k]!=null&&!str(input[k]))) return bad;
  const ids=new Set(), snaps=new Set(); let total=0;
  for (const r of records) {
    if (!obj(r)||['vesselId','name','imo','mmsi','provenance'].some(k=>!nonblank(r[k]))||r.provenance!=='synthetic'||!Array.isArray(r.aliases)||r.aliases.some(x=>!str(x))||!Array.isArray(r.snapshots)||!obj(r.policy)||r.policy.schemaVersion!==1||!utc(r.policy.asOf)||['provenance','identity','freshness','conflict','sanctions','permission','integrity','format','availability'].some(k=>!str(r.policy[k]))||ids.has(r.vesselId)) return bad;
    ids.add(r.vesselId);
    for (const s of r.snapshots) {
      if (++total>200||!obj(s)||['snapshotId','sourceFamily','publisher','title','location','localCitation','provenance'].some(k=>!str(s[k]))||s.provenance!=='synthetic'||typeof s.permitted!=='boolean'||!obj(s.identity)||['vesselId','name','imo','mmsi'].some(k=>!str(s.identity[k]))||!Array.isArray(s.claims)||snaps.has(s.snapshotId)||(str(s.content)&&Array.from(s.content).length>100000)) return bad;
      snaps.add(s.snapshotId);
    }
  }
  let q=queryValue.trim();
  if(queryType==='IMO') q=q.replace(/^IMO\s*/i,'');
  if (!['Name','IMO','MMSI'].includes(queryType)||!q||(queryType==='IMO'&&!/^\d{7}$/.test(q))||(queryType==='MMSI'&&!/^\d{9}$/.test(q))) return bad;
  const asOf=input.asOf??'2026-11-05T12:00:00Z'; if(!utc(asOf)) return bad;
  const candidates=records.filter(r=>queryType==='Name'?named(r,q):r[queryType.toLowerCase()]===q).sort((a,b)=>compareText(a.vesselId,b.vesselId));
  if(input.selectedVesselId!=null&&!candidates.some(r=>r.vesselId===input.selectedVesselId)) return bad;
  const out=empty(); out.candidateIds=candidates.map(r=>r.vesselId);
  if(queryType!=='Name'&&input.nameConstraint?.trim()&&candidates.length&&!candidates.some(r=>named(r,input.nameConstraint))) {out.status='identity_conflict';out.candidateIds=[];out.unknownFields=['identity'];return out;}
  if(!candidates.length) {out.status='not_found';out.unknownFields=['identity','sanctions','intent'];return out;}
  if(candidates.length>1&&!input.selectedVesselId) {out.status='ambiguous';out.unknownFields=['identity','intent'];return out;}
  const r=candidates.find(r=>r.vesselId===input.selectedVesselId)??candidates[0];out.selectedVesselId=r.vesselId;
  const excluded=[],valid=[],invalid=[];
  for(const s of r.snapshots){
    if(!s.permitted||(utc(s.capturedAt)&&s.capturedAt>asOf)){excluded.push(s.snapshotId);continue;}
    const chars=str(s.content)?Array.from(s.content):[];
    let ok=utc(s.capturedAt)&&nonblank(s.content)&&str(s.sha256)&&/^[a-f0-9]{64}$/.test(s.sha256)&&createHash('sha256').update(s.content).digest('hex')===s.sha256&&Object.hasOwn(families,s.sourceFamily)&&['eventAt','publishedAt'].every(k=>s[k]==null||utc(s[k]));
    for(const c of s.claims){
      const t=c?.citation;
      if(!obj(c)||!str(c.field)||!str(c.value)||!obj(t)||t.snapshotId!==s.snapshotId||!Number.isInteger(t.start)||!Number.isInteger(t.end)||t.start<0||t.end<=t.start||t.end>chars.length||chars.slice(t.start,t.end).join('')!==t.excerpt||t.excerpt!==`${c.field}=${c.value}`||(t.start>0&&chars[t.start-1]!=='\n')||(t.end<chars.length&&chars[t.end]!=='\n')) ok=false;
    }
    if(!ok){invalid.push(s);excluded.push(s.snapshotId);}else if(linked(s,r))valid.push(s);
  }
  out.excludedSnapshotIds=excluded;
  if(invalid.length){out.status='evidence_error';out.unknownFields=distinct(invalid.flatMap(s=>s.sourceFamily==='AIS'?['current_position','speed_knots','navigation_status']:s.sourceFamily==='port_log'?['port','port_event_time']:['evidence']).concat('intent'));return out;}
  out.status='resolved';out.includedSnapshotIds=valid.map(s=>s.snapshotId);
  out.supportedFacts=valid.flatMap(s=>s.claims.filter(c=>!['note','instruction_text'].includes(c.field)).map(c=>({field:c.field,value:c.value,citation:{...c.citation},eventAt:s.eventAt??null,capturedAt:s.capturedAt})));
  out.staleSnapshotIds=valid.filter(s=>s.eventAt&&(Date.parse(asOf)-Date.parse(s.eventAt))/3600000>families[s.sourceFamily]).map(s=>s.snapshotId);
  const ais=valid.filter(s=>s.sourceFamily==='AIS'),ports=valid.filter(s=>s.sourceFamily==='port_log');
  if(ais.length&&ais.every(s=>out.staleSnapshotIds.includes(s.snapshotId))){
    const other=records.filter(x=>x!==r&&norm(x.name)===norm(r.name)).flatMap(x=>x.snapshots).filter(s=>s.permitted&&utc(s.capturedAt)&&s.capturedAt<=asOf&&!linked(s,r));
    if(other.some(s=>['OFAC','EU_sanctions'].includes(s.sourceFamily)))out.rejectedIdentitySnapshotIds=other.map(s=>s.snapshotId);
  }
  const groups=new Map();
  for(const s of valid)for(const c of s.claims){
    if(['name','imo','mmsi','vesselId','note','instruction_text'].includes(c.field))continue;
    const key=['entry_id','listing_date','listed_status'].includes(c.field)?`${c.field}:${s.sourceFamily}`:c.field;
    if(!groups.has(key))groups.set(key,{field:c.field,values:[],snapshotIds:[]});
    const g=groups.get(key);g.values=distinct([...g.values,c.value]);g.snapshotIds=distinct([...g.snapshotIds,s.snapshotId]);
  }
  out.conflicts=[...groups.values()].filter(g=>g.values.length>1);
  const has=f=>valid.some(s=>s.sourceFamily===f),fact=f=>out.supportedFacts.some(c=>c.field===f);
  const reg=r.snapshots.filter(s=>s.sourceFamily==='registry'&&s.permitted);
  if(reg.length&&reg.every(s=>utc(s.capturedAt)&&s.capturedAt>asOf))out.unknownFields=['registry_at_query_time','sanctions','intent'];
  else {
    if(has('OFAC')&&!has('EU_sanctions'))out.unknownFields.push('EU_sanctions');
    if((ais.length&&!ais.some(s=>s.eventAt&&!out.staleSnapshotIds.includes(s.snapshotId)))||(!ais.length&&!ports.length))out.unknownFields.push('current_position');
    if(ports.some(s=>s.eventAt==null))out.unknownFields.push('port_event_time','port_freshness');
    if(!fact('owner')||out.conflicts.some(c=>c.field==='owner'))out.unknownFields.push('owner');
    if(!has('OFAC')&&!has('EU_sanctions'))out.unknownFields.push('sanctions');
    if(!fact('cargo'))out.unknownFields.push('cargo');out.unknownFields.push('intent');
  }
  return out;
}
