/* Application core: also embedded verbatim in index.html. */
const MooringCore = (() => {
  const clone = x => JSON.parse(JSON.stringify(x));
  const fields = ['name','classification','craft','pier','line','observations','wind','gust','current','windUnit','gustUnit','currentUnit','phase','x','y'];
  const emptyDraft = () => ({name:'',classification:'synthetic',craft:'',pier:'',line:'',observations:'',wind:'',gust:'',current:'',windUnit:'m/s',gustUnit:'m/s',currentUnit:'m/s',phase:'ebb',x:'50',y:'50'});
  const initial = () => ({schemaVersion:1,draft:emptyDraft(),saved:null,revision:0,reviewedRevision:null});
  const sample = () => ({...emptyDraft(),name:'Synthetic berth Alpha',craft:'Demo craft A',pier:'Demo pier 1',line:'Demo line A',observations:'Synthetic observations only. Wind 12 m/s; gust 15 m/s; current 0.5 m/s, ebb. Direction convention unconfirmed.',wind:'12',gust:'15',current:'0.5'});
  const decimal = s => typeof s === 'string' && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s.trim()) && Number.isFinite(Number(s)) && Number(s)>=0;
  function validateScenario(d) {
    const errors=[];
    const add=(field,message)=>errors.push({field,message});
    if (!d || fields.some(k=>typeof d[k]!=='string')) return {errors:[{field:'name',message:'Scenario data is malformed.'}],value:null};
    if (!d.name.trim() || d.name.trim().length>120) add('name','Enter a scenario name of 1–120 characters.');
    if(d.classification!=='synthetic') add('name','Only synthetic scenarios are supported.');
    for(const [key,value] of [['craft','Demo craft A'],['pier','Demo pier 1'],['line','Demo line A']]) if(d[key]!==value) add(key,'Select a supported synthetic '+key+'.');
    if(d.observations.length>2000) add('observations','Keep raw observations within 2000 characters.');
    for(const key of ['wind','gust','current']) {
      if(!decimal(d[key])) add(key,`Enter ${key} speed as a finite non-negative number.`);
      if(d[key+'Unit']!=='m/s') add(key+'Unit',`Unsupported ${key} unit. Enter explicitly supplied m/s data; no conversion is available.`);
    }
    if(!['ebb','flood'].includes(d.phase)) add('phase','Select ebb or flood; direction remains unconfirmed.');
    for(const key of ['x','y']) if(!decimal(d[key]) || Number(d[key])>100) add(key,'Enter a display position from 0 to 100.');
    const value=errors.length?null:{...clone(d),name:d.name.trim(),confirmed:{wind:Number(d.wind),gust:Number(d.gust),current:Number(d.current)}};
    return {errors,value};
  }
  const content = d => Object.fromEntries(fields.map(k=>[k,d[k]]));
  const equal = (a,b) => JSON.stringify(content(a))===JSON.stringify(content(b));
  const dirty = s => !s.saved ? !equal(s.draft,emptyDraft()) : !equal(s.draft,s.saved);
  function save(s) {
    const v=validateScenario(s.draft); if(v.errors.length) return {state:s,errors:v.errors};
    const next=clone(s);
    if(!s.saved || !equal(v.value,s.saved)) {next.revision++;next.reviewedRevision=null;}
    next.saved=v.value; next.draft=content(v.value);
    return {state:next,errors:[]};
  }
  function discard(s) {return {...clone(s),draft:s.saved?content(s.saved):emptyDraft()};}
  const authority = () => ({engineering:'Engineering assessment unavailable',uncertainty:'Uncertainty unknown: authoritative model, limits and signed reference cases are missing.',approval:'Operational approval unavailable. Qualified engineering review is required.'});
  function reviewStatus(s) {
    if(!s.saved) return 'Review unavailable: save a complete scenario first.';
    if(dirty(s)) return 'Review blocked: save or discard unsaved changes.';
    return s.reviewedRevision===s.revision?`Synthetic review recorded for saved revision ${s.revision}. No operational approval.`:`Saved revision ${s.revision} requires synthetic review.`;
  }
  function review(s,ack) {
    if(!s.saved || dirty(s) || !ack || validateScenario(s.saved).errors.length) throw Error('Save a complete scenario, resolve edits and acknowledge synthetic-only review.');
    return {...clone(s),reviewedRevision:s.revision};
  }
  const scenarioSummary = d => `${d.name} | ${d.craft} | ${d.pier} | ${d.line}`;
  const environmentSummary = d => `Wind ${d.confirmed.wind} m/s; gust ${d.confirmed.gust} m/s; current ${d.confirmed.current} m/s; ${d.phase}. Direction convention unconfirmed.`;
  function serialize(s) { return JSON.stringify(s); }
  function restore(raw) {
    const s=JSON.parse(raw);
    if(!s || s.schemaVersion!==1 || !Number.isSafeInteger(s.revision) || s.revision<0 || !s.draft || fields.some(k=>typeof s.draft[k]!=='string') || s.draft.classification!=='synthetic') throw Error('Invalid local scenario data.');
    // Drafts may be incomplete; structural catalog and unit values must still be recognizable.
    for(const [k,values] of [['craft',['','Demo craft A']],['pier',['','Demo pier 1']],['line',['','Demo line A']],['phase',['ebb','flood']],...['windUnit','gustUnit','currentUnit'].map(k=>[k,['m/s','knots']])]) if(!values.includes(s.draft[k])) throw Error('Unsupported stored selection.');
    if(s.draft.name.length>120 || s.draft.observations.length>2000) throw Error('Stored text exceeds limits.');
    if(s.saved!==null) {
      const v=validateScenario(s.saved);
      if(v.errors.length || s.revision<1 || JSON.stringify(v.value.confirmed)!==JSON.stringify(s.saved.confirmed)) throw Error('Invalid saved scenario.');
    } else if(s.revision!==0) throw Error('Missing saved revision.');
    if(s.reviewedRevision!==null && (!s.saved || s.reviewedRevision!==s.revision)) throw Error('Mismatched review revision.');
    return clone(s);
  }
  function exportSummary(s) {
    if(!s.saved) throw Error('Save a scenario before export.');
    const d=s.saved,a=authority();
    return ['SYNTHETIC — UNVALIDATED — NOT FOR OPERATIONAL USE',scenarioSummary(d),`Saved revision ${s.revision}`,environmentSummary(d),'Raw observations: '+d.observations,`Raw numeric inputs: wind ${d.wind} ${d.windUnit}; gust ${d.gust} ${d.gustUnit}; current ${d.current} ${d.currentUnit}`,`Illustrative layout: x ${d.x}%, y ${d.y}%; no physical scale.`,a.engineering,a.uncertainty,a.approval,'Forces, safety margins, MSI, tug horsepower, line sequences and gust thresholds: unavailable.',s.reviewedRevision===s.revision?`Synthetic review recorded for saved revision ${s.revision}. No operational approval.`:'Synthetic review not recorded.','Unsaved draft excluded.'].join('\n');
  }
  return {initial,sample,validateScenario,dirty,save,discard,authority,reviewStatus,review,scenarioSummary,environmentSummary,serialize,restore,exportSummary};
})();
if(typeof module!=='undefined' && module.exports) module.exports=MooringCore;
