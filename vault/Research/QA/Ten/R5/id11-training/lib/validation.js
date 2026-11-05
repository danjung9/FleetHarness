export function object(value, label = 'input') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(`${label} must be an object.`);
    return value;
}
export function text(value, label, max = 1000) {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
        throw new Error(`${label} must be a nonempty string of at most ${max} characters.`);
    return value;
}
export function integer(value, label, min = 0, max = 1_000_000_000) {
    if (!Number.isSafeInteger(value) || value < min || value > max)
        throw new Error(`${label} must be an integer between ${min} and ${max}.`);
    return value;
}
export function array(value, label, max = 1000) {
    if (!Array.isArray(value) || value.length > max)
        throw new Error(`${label} must be an array of at most ${max} items.`);
    return value;
}
export function strings(value, label, max = 100) {
    const result = array(value, label, max).map((x, i) => text(x, `${label}[${i}]`, 200));
    if (new Set(result).size !== result.length)
        throw new Error(`${label} cannot contain duplicates.`);
    return result;
}
export function unique(items, label) {
    if (new Set(items.map(x => x.id)).size !== items.length)
        throw new Error(`${label} contains duplicate IDs.`);
    return items;
}
/** Strict ISO timestamp with an explicit timezone, rejecting JS Date rollover. */
export function timestamp(value) {
    if (typeof value !== 'string')
        return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match)
        return null;
    const [, y, m, d, h, n, s = '0', zone] = match;
    const year = +y, month = +m, day = +d;
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || +h > 23 || +n > 59 || +s > 59)
        return null;
    if (zone !== 'Z' && (+zone.slice(1, 3) > 14 || +zone.slice(4) > 59 || (+zone.slice(1, 3) === 14 && +zone.slice(4) !== 0)))
        return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}
export function canonical(value) {
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object')
        return `{${Object.entries(value).sort(([a], [b]) => compareText(a, b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
    return JSON.stringify(value);
}
/** Code-unit order is stable across device locales, unlike localeCompare. */
export function compareText(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

// Public fictional-pb4t-1 schema. Explanatory policy prose is data, never executed.
export function validatePackage(p) {
 const check=(v)=>{if(!v)throw Error('INVALID_PACKAGE');};
 const str=v=>text(v,'field',10000),int=(v,min=0)=>integer(v,'field',min,Number.MAX_SAFE_INTEGER);
 const arr=(v,max=10000)=>array(v,'field',max);
 const ts=v=>{check(typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d-05:00$/.test(v)&&timestamp(v));return Date.parse(v)/60000;};
 const win=v=>{object(v);check(ts(v.start)<ts(v.end));};
 const wins=v=>arr(v).forEach(win);
 const list=v=>strings(v,'IDs',100);
 const entities=(v,max=10000)=>{arr(v,max);unique(v,'entities');v.forEach(x=>{object(x);str(x.id);});return new Set(v.map(x=>x.id));};
 object(p);object(p.metadata);const m=p.metadata;
 check(m.schemaVersion==='fictional-pb4t-1'&&m.classification==='synthetic'&&m.timezone==='fixed UTC-05:00');
 ['ship','policyVersion','notice'].forEach(k=>str(m[k]));win(m.horizon);check(ts(m.horizon.end)-ts(m.horizon.start)<=10080);int(m.resolutionMinutes,1);check(1440%m.resolutionMinutes===0);
 const dep=entities(p.departments),qual=entities(p.qualificationCatalog),people=entities(p.roster,200),resources=entities(p.resources),requirements=entities(p.trainingRequirements),requests=entities(p.requests,24);entities(p.operationalWindows);entities(p.fixedDuties);
 const ref=(set,id)=>{str(id);check(set.has(id));};
 p.departments.forEach(d=>{str(d.agent);str(d.responsibility);});p.qualificationCatalog.forEach(q=>str(q.name));
 p.roster.forEach(r=>{str(r.name);ref(dep,r.departmentId);wins(r.availability);arr(r.qualifications).forEach(q=>{ref(qual,q.id);check(ts(q.validFrom)<ts(q.validUntil));});});
 p.resources.forEach(r=>{int(r.capacity,1);wins(r.availability);});
 p.operationalWindows.forEach(w=>{win(w.interval);list(w.prohibitedFamilies);list(w.prohibitedResourceIds).forEach(id=>ref(resources,id));});
 const policy=object(p.policy);check(policy.classification==='synthetic'&&policy.version===m.policyVersion&&policy.samePersonMultipleRoles===false&&policy.deadlineEqualityAllowed===true);
 ['minRestMinutes','maxDutyMinutesPerCalendarDay','maxDutyMinutesPerHorizon'].forEach(k=>integer(policy[k],`policy.${k}`,0,Number.MAX_SAFE_INTEGER));
 ['counting','restAppliesTo','recurrence','missingPolicyBehavior','horizonCarryOver'].forEach(k=>str(policy[k]));
 p.trainingRequirements.forEach(r=>{str(r.family);int(r.intervalDays,1);check(typeof r.mandatory==='boolean');});
 arr(p.completionHistory).forEach(h=>{ref(requirements,h.requirementId);check(ts(h.completedEnd)<ts(m.horizon.start));});
 for(const id of requirements)check(p.completionHistory.some(h=>h.requirementId===id));
 p.fixedDuties.forEach(d=>{ref(people,d.personId);str(d.dutyClass);win(d.interval);});
 const links=new Set();
 p.requests.forEach(r=>{
  ref(dep,r.departmentId);ref(requirements,r.requirementId);str(r.family);str(r.occurrenceId);check(!links.has(r.occurrenceId));links.add(r.occurrenceId);
  check(p.trainingRequirements.find(t=>t.id===r.requirementId).family===r.family);
  int(r.durationMinutes,1);check(r.durationMinutes%m.resolutionMinutes===0);check(Number.isSafeInteger(r.priority));ts(r.preferredStart);wins(r.allowedStartWindows);
  arr(r.candidateStarts,100);check(new Set(r.candidateStarts).size===r.candidateStarts.length);r.candidateStarts.forEach(s=>check((ts(s)-ts(m.horizon.start))%m.resolutionMinutes===0));
  check(arr(r.roles).length>0);r.roles.forEach(role=>{ref(qual,role.qualificationId);int(role.count,1);list(role.candidatePersonIds).forEach(id=>ref(people,id));});
  list(r.preferredPersonIds).forEach(id=>ref(people,id));arr(r.resourceDemands);check(new Set(r.resourceDemands.map(d=>d.resourceId)).size===r.resourceDemands.length);r.resourceDemands.forEach(d=>{ref(resources,d.resourceId);int(d.units,1);});
 });
 object(p.candidateOrder);check(p.candidateOrder.requests==='array order'&&p.candidateOrder.starts==='candidateStarts array order'&&p.candidateOrder.persons==='candidatePersonIds array order');int(p.searchBudget);
 return p;
}
