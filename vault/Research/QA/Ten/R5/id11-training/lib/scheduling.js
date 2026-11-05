import { array, compareText, integer, object, strings, text, unique } from './validation.js';
const overlap = (a, b) => a.start < b.end && b.start < a.end;
function windows(value, label) {
    return array(value, label, 100).map(v => { const w = object(v, label); const start = integer(w.start, `${label}.start`), end = integer(w.end, `${label}.end`); if (end <= start)
        throw new Error(`${label} end must follow start.`); return { start, end }; });
}
/** Minutes are relative to a caller-defined epoch; budgets apply to the whole supplied horizon. */
export function solveSchedule(input, signal) {
    const data = object(input);
    const operationalWindows = windows(data.windows, 'windows');
    const people = unique(array(data.people, 'people', 200).map(p => {
        const v = object(p, 'person');
        return { id: text(v.id, 'person.id', 200), qualifications: strings(v.qualifications, 'qualifications'),
            windows: windows(v.windows, 'person.windows'), maxMinutes: integer(v.maxMinutes, 'person.maxMinutes'), restMinutes: integer(v.restMinutes, 'person.restMinutes') };
    }), 'people');
    const requests = unique(array(data.requests, 'requests', 24).map(r => {
        const v = object(r, 'request');
        return { id: text(v.id, 'request.id', 200), duration: integer(v.duration, 'duration', 1, 10_080),
            starts: [...new Set(array(v.starts, 'starts', 100).map(n => integer(n, 'start')))].sort((a, b) => a - b),
            people: strings(v.people, 'request.people'), resources: strings(v.resources, 'resources'), qualifications: strings(v.qualifications, 'required qualifications') };
    }), 'requests');
    const roster = new Map(people.map(p => [p.id, p]));
    for (const r of requests)
        for (const id of r.people)
            if (!roster.has(id))
                throw new Error(`Unknown person ${id} in ${r.id}.`);
    const maxNodes = integer(data.maxNodes ?? 50_000, 'maxNodes', 1, 200_000);
    const reasons = new Set();
    const candidates = new Map();
    for (const r of requests) {
        const qualified = r.qualifications.every(q => r.people.some(id => roster.get(id).qualifications.includes(q)));
        if (!qualified)
            reasons.add(`${r.id}: assigned people do not cover required qualifications.`);
        const choices = qualified ? r.starts.flatMap(start => {
            const a = { id: r.id, start, end: start + r.duration, people: r.people, resources: r.resources };
            const fits = (ws) => ws.some(w => start >= w.start && a.end <= w.end);
            if (!fits(operationalWindows) || r.people.some(id => !fits(roster.get(id).windows)))
                return [];
            return [a];
        }) : [];
        if (!choices.length)
            reasons.add(`${r.id}: no candidate satisfies qualifications and availability.`);
        candidates.set(r.id, choices);
    }
    const ordered = [...requests].sort((a, b) => candidates.get(a.id).length - candidates.get(b.id).length || compareText(a.id, b.id));
    const assigned = [];
    let explored = 0, exhausted = false;
    function search(i) {
        if (signal?.aborted)
            throw new Error('Schedule search cancelled.');
        if (i === ordered.length)
            return true;
        for (const a of candidates.get(ordered[i].id)) {
            if (++explored > maxNodes) {
                exhausted = true;
                return false;
            }
            const resourceConflict = assigned.find(b => overlap(a, b) && a.resources.some(id => b.resources.includes(id)));
            if (resourceConflict) {
                reasons.add(`${a.id} / ${resourceConflict.id}: shared-resource collision in searched allocation.`);
                continue;
            }
            let invalid = false;
            for (const id of a.people) {
                const p = roster.get(id);
                const previous = assigned.filter(b => b.people.includes(id));
                if (previous.some(b => a.start < b.end + p.restMinutes && b.start < a.end + p.restMinutes)) {
                    reasons.add(`${a.id}: ${id} overlaps another assignment or its required rest interval.`);
                    invalid = true;
                    break;
                }
                if (previous.reduce((sum, b) => sum + b.end - b.start, a.end - a.start) > p.maxMinutes) {
                    reasons.add(`${a.id}: ${id} exceeds the supplied horizon duty budget.`);
                    invalid = true;
                    break;
                }
            }
            if (invalid)
                continue;
            assigned.push(a);
            if (search(i + 1))
                return true;
            assigned.pop();
            if (exhausted)
                return false;
        }
        return false;
    }
    const feasible = search(0);
    return { status: feasible ? 'feasible' : exhausted ? 'budget_exhausted' : 'infeasible',
        assignments: feasible ? [...assigned].sort((a, b) => a.start - b.start || compareText(a.id, b.id)) : [],
        explored: Math.min(explored, maxNodes), maxNodes,
        explanations: feasible ? [] : [...reasons].slice(0, 100),
        note: 'Feasibility over explicit candidate starts only. Explanations are observed conflicts, not a minimal unsatisfiable core. No recurrence rules are inferred.' };
}

/** Ordered candidate search shared by the PB4T adapter. Counts rejected candidates too. */
export async function solveOrdered({requests,candidates,reject,budget,signal}) {
 const assigned=[],rejections=new Set();let attempts=0,exhausted=false;
 async function search(i) {
  if(signal?.aborted)throw signal.reason??Error('Cancelled');
  if(i===requests.length)return true;
  const r=requests[i];
  for(const a of candidates(r)) {
   if(attempts>=budget){exhausted=true;return false;}attempts++;
   if(attempts%128===0)await new Promise(resolve=>setTimeout(resolve,0));
   if(signal?.aborted)throw signal.reason??Error('Cancelled');
   const reason=reject(r,a,assigned);
   if(reason){rejections.add(r.id+': '+reason);continue;}
   assigned.push(a);if(await search(i+1))return true;assigned.pop();if(exhausted)return false;
  }return false;
 }
 const feasible=await search(0);
 return {feasible,exhausted,assigned:feasible?assigned:[],attempts,rejections:[...rejections]};
}
