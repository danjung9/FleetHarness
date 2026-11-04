(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Practice = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
    : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}'
    : JSON.stringify(value);
  const WINDOWS = [{ start: 0, end: 240 }, { start: 1440, end: 1680 }];
  const FIXTURE = {
    windows: WINDOWS,
    people: [
      { id: 'P01', qualifications: ['Q-A'], windows: WINDOWS, maxMinutes: 120, restMinutes: 30 },
      { id: 'P02', qualifications: ['Q-B'], windows: WINDOWS, maxMinutes: 120, restMinutes: 0 }
    ],
    requests: [
      { id: 'A', duration: 60, starts: [0], people: ['P01'], resources: ['Room-1'], qualifications: ['Q-A'] },
      { id: 'B', duration: 60, starts: [0, 90], people: ['P01'], resources: ['Room-1'], qualifications: ['Q-A'] },
      { id: 'C', duration: 60, starts: [0], people: ['P02'], resources: ['Room-2'], qualifications: ['Q-B'] },
      { id: 'D', duration: 60, starts: [1440], people: ['P02'], resources: ['Room-2'], qualifications: ['Q-B'] }
    ],
    maxNodes: 50000
  };
  function object(v, label) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(label + ' must be an object.');
  }
  function list(v, label, max, min = 0) {
    if (!Array.isArray(v) || v.length < min || v.length > max) throw new Error(label + ' must contain ' + min + ' to ' + max + ' items.');
  }
  function integer(v, label, min = 0, max = 1000000000) {
    if (!Number.isSafeInteger(v) || v < min || v > max) throw new Error(label + ' must be a whole number from ' + min + ' to ' + max + '.');
  }
  function text(v, label) {
    if (typeof v !== 'string' || !v.trim() || v.length > 200) throw new Error(label + ' must be a nonempty name up to 200 characters.');
  }
  function unique(values, label) {
    if (new Set(values).size !== values.length) throw new Error(label + ' cannot contain duplicates.');
  }
  function strings(v, label, min = 0) {
    list(v, label, 100, min);
    v.forEach(x => text(x, label));
    unique(v, label);
  }
  function windows(v, label) {
    list(v, label, 100);
    v.forEach((w, i) => {
      object(w, label);
      integer(w.start, label + ' window ' + (i + 1) + ' start');
      integer(w.end, label + ' window ' + (i + 1) + ' end');
      if (w.end <= w.start) throw new Error(label + ' window ' + (i + 1) + ': end must be after start.');
    });
  }
  function validate(input, fixed = false) {
    object(input, 'Input');
    windows(input.windows, 'Operating');
    list(input.people, 'People', 200, 1);
    input.people.forEach(p => {
      object(p, 'Person'); text(p.id, 'Person ID');
      strings(p.qualifications, p.id + ' qualifications');
      windows(p.windows, p.id + ' availability');
      integer(p.maxMinutes, p.id + ' whole-horizon limit');
      integer(p.restMinutes, p.id + ' rest gap');
    });
    unique(input.people.map(p => p.id), 'People IDs');
    list(input.requests, 'Requests', 24, 1);
    input.requests.forEach(r => {
      object(r, 'Request'); text(r.id, 'Request ID');
      integer(r.duration, r.id + ' duration', 1, 10080);
      list(r.starts, r.id + ' allowed starts', 100);
      r.starts.forEach(s => integer(s, r.id + ' allowed start'));
      unique(r.starts, r.id + ' allowed starts');
      strings(r.people, r.id + ' assigned people', 1);
      strings(r.resources, r.id + ' assigned rooms', 1);
      strings(r.qualifications, r.id + ' required qualifications');
      r.people.forEach(id => {
        if (!input.people.some(p => p.id === id)) throw new Error(r.id + ': unknown assigned person ' + id + '.');
      });
    });
    unique(input.requests.map(r => r.id), 'Request IDs');
    integer(input.maxNodes === undefined ? 50000 : input.maxNodes, 'Search allowance', 1, 200000);
    if (fixed) {
      if (input.requests.length !== 4 || FIXTURE.requests.some(r => !input.requests.some(x => x.id === r.id))) {
        throw new Error('Keep all four requests A, B, C and D exactly once. No request may be dropped or added.');
      }
      if (input.people.length !== 2 || FIXTURE.people.some(p => !input.people.some(x => x.id === p.id))) {
        throw new Error('Keep the supplied people P01 and P02 exactly once.');
      }
      for (const r of input.requests) {
        const source = FIXTURE.requests.find(x => x.id === r.id);
        for (const key of ['people', 'resources', 'qualifications']) {
          if (canonical(r[key]) !== canonical(source[key])) throw new Error(r.id + ': keep the supplied assigned person, room and required qualification.');
        }
      }
    }
    return input;
  }
  const overlap = (a, b) => a.start < b.end && b.start < a.end;
  const fits = (a, ws) => ws.some(w => a.start >= w.start && a.end <= w.end);
  function baseResult(status, input, explanations = [], assignments = [], explored = 0, method = 'search') {
    return { status, assignments: clone(assignments), explanations, explored,
      maxNodes: Number.isSafeInteger(input && input.maxNodes) ? input.maxNodes : 50000, method };
  }
  function solveSchedule(input, fixed = false) {
    try { validate(input, fixed); }
    catch (error) { return baseResult('invalid_input', input, [error.message]); }
    const maxNodes = input.maxNodes === undefined ? 50000 : input.maxNodes;
    const roster = new Map(input.people.map(p => [p.id, p]));
    const reasons = new Set();
    const choices = new Map();
    for (const r of input.requests) {
      const qualified = r.qualifications.every(q => r.people.some(id => roster.get(id).qualifications.includes(q)));
      if (!qualified) reasons.add(r.id + ': assigned people lack required qualification ' + r.qualifications.join(', ') + '.');
      const candidates = [];
      for (const start of r.starts.slice().sort((a, b) => a - b)) {
        const a = { id: r.id, start, end: start + r.duration, people: r.people.slice(), resources: r.resources.slice() };
        if (!fits(a, input.windows)) { reasons.add(r.id + ': candidate ' + start + ' does not fit a complete operating window.'); continue; }
        const unavailable = r.people.find(id => !fits(a, roster.get(id).windows));
        if (unavailable) { reasons.add(r.id + ': candidate ' + start + ' does not fit ' + unavailable + ' availability.'); continue; }
        if (qualified) candidates.push(a);
      }
      if (!candidates.length) reasons.add(r.id + ': no allowed start meets qualification and full-session availability. Keep this request and correct its inputs.');
      choices.set(r.id, candidates);
    }
    for (const p of input.people) {
      const total = input.requests.filter(r => r.people.includes(p.id)).reduce((n, r) => n + r.duration, 0);
      if (total > p.maxMinutes) reasons.add(p.id + ': all requests total ' + total + ' minutes, exceeding the ' + p.maxMinutes + '-minute whole-horizon limit.');
      if (total > p.maxMinutes) return baseResult('infeasible', input, [...reasons]);
    }
    if (input.requests.some(r => !choices.get(r.id).length)) return baseResult('infeasible', input, [...reasons]);
    const ordered = input.requests.slice().sort((a, b) => choices.get(a.id).length - choices.get(b.id).length || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const assigned = [];
    let explored = 0, exhausted = false;
    function search(i) {
      if (i === ordered.length) return true;
      for (const a of choices.get(ordered[i].id)) {
        if (explored >= maxNodes) { exhausted = true; return false; }
        explored++;
        const collision = assigned.find(b => overlap(a, b) && a.resources.some(room => b.resources.includes(room)));
        if (collision) { reasons.add(a.id + ' and ' + collision.id + ': shared room overlaps in an explored choice.'); continue; }
        let conflict = false;
        for (const id of a.people) {
          const p = roster.get(id);
          const previous = assigned.filter(b => b.people.includes(id));
          const near = previous.find(b => a.start < b.end + p.restMinutes && b.start < a.end + p.restMinutes);
          if (near) {
            reasons.add(a.id + ' and ' + near.id + ': ' + id + ' overlaps or lacks the supplied ' + p.restMinutes + '-minute rest gap.');
            conflict = true; break;
          }
        }
        if (conflict) continue;
        assigned.push(a);
        if (search(i + 1)) return true;
        assigned.pop();
        if (exhausted) return false;
      }
      return false;
    }
    const feasible = search(0);
    const assignments = feasible ? input.requests.map(r => assigned.find(a => a.id === r.id)) : [];
    return baseResult(feasible ? 'feasible' : exhausted ? 'search_limit_reached' : 'infeasible', input,
      feasible ? [] : [...reasons].slice(0, 100), assignments, explored);
  }
  const evaluate = input => solveSchedule(input, true);

  // Independent complete-draft audit. This does not call the search or use its candidate filtering.
  function checkDraft(input, assignments, fixed = false) {
    const errors = [];
    try {
      validate(input, fixed);
      list(assignments, 'Draft assignments', 24);
      if (assignments.length !== input.requests.length) errors.push('Draft must contain every request exactly once.');
      const seen = new Set();
      for (const a of assignments) {
        object(a, 'Draft assignment'); text(a.id, 'Draft request ID');
        if (seen.has(a.id)) errors.push('Draft repeats request ' + a.id + '.');
        seen.add(a.id);
        const r = input.requests.find(r => r.id === a.id);
        if (!r) { errors.push('Draft has unknown request ' + a.id + '.'); continue; }
        integer(a.start, a.id + ' draft start'); integer(a.end, a.id + ' draft end');
        if (a.end !== a.start + r.duration) errors.push(a.id + ': draft end must equal start plus duration.');
        if (!r.starts.includes(a.start)) errors.push(a.id + ': draft start must be one of its allowed starts.');
        if (canonical(a.people) !== canonical(r.people) || canonical(a.resources) !== canonical(r.resources)) errors.push(a.id + ': assigned people and room must remain unchanged.');
        if (!input.windows.some(w => w.start <= a.start && a.end <= w.end)) errors.push(a.id + ': complete draft session is outside operating windows.');
        for (const id of r.people) {
          const p = input.people.find(p => p.id === id);
          if (!p.windows.some(w => w.start <= a.start && a.end <= w.end)) errors.push(a.id + ': complete draft session is outside ' + id + ' availability.');
        }
        for (const q of r.qualifications) {
          if (!r.people.some(id => input.people.find(p => p.id === id).qualifications.includes(q))) errors.push(a.id + ': assigned people lack qualification ' + q + '.');
        }
      }
      for (const r of input.requests) if (!seen.has(r.id)) errors.push('Draft is missing request ' + r.id + '.');
      for (const p of input.people) {
        const sessions = assignments.filter(a => input.requests.find(r => r.id === a.id)?.people.includes(p.id));
        const total = sessions.reduce((n, a) => n + a.end - a.start, 0);
        if (total > p.maxMinutes) errors.push(p.id + ': draft total exceeds the whole-horizon limit.');
        for (let i = 0; i < sessions.length; i++) for (let j = i + 1; j < sessions.length; j++) {
          const a = sessions[i], b = sessions[j];
          const gap = a.start <= b.start ? b.start - a.end : a.start - b.end;
          if (gap < p.restMinutes) errors.push(a.id + ' and ' + b.id + ': ' + p.id + ' needs at least ' + p.restMinutes + ' minutes between sessions.');
        }
      }
      for (let i = 0; i < assignments.length; i++) for (let j = i + 1; j < assignments.length; j++) {
        const a = assignments[i], b = assignments[j];
        const ar = input.requests.find(r => r.id === a.id), br = input.requests.find(r => r.id === b.id);
        if (ar && br && a.start < b.end && b.start < a.end && ar.resources.some(room => br.resources.includes(room))) errors.push(a.id + ' and ' + b.id + ': shared room overlaps.');
      }
    } catch (error) { errors.push(error.message); }
    return [...new Set(errors)];
  }
  function totals(input, assignments = []) {
    return input.people.map(p => ({
      id: p.id, limit: p.maxMinutes,
      requested: input.requests.filter(r => r.people.includes(p.id)).every(r => Number.isSafeInteger(r.duration) && r.duration > 0)
        ? input.requests.filter(r => r.people.includes(p.id)).reduce((sum, r) => sum + r.duration, 0) : null,
      draft: assignments.length === input.requests.length && checkDraft(input, assignments, true).length === 0
        ? assignments.filter(a => a.people.includes(p.id)).reduce((sum, a) => sum + a.end - a.start, 0) : null
    }));
  }
  function createState(input = clone(FIXTURE)) { return { input: clone(input), result: evaluate(input), review: null }; }
  function updateInput(state, input) { return createState(input); }
  function regenerate(state) { return createState(state.input); }
  function selectedResult(input, assignments) {
    const errors = checkDraft(input, assignments, true);
    return baseResult(errors.length ? 'invalid_input' : 'feasible', input, errors, assignments, 0, 'selected');
  }
  function replaceDraft(state, assignments) {
    return { input: clone(state.input), result: selectedResult(state.input, assignments), review: null };
  }
  function selectStart(state, id, start) {
    if (state.result.assignments.length !== state.input.requests.length) throw new Error('Find a complete draft before selecting its times.');
    if (!state.input.requests.some(r => r.id === id)) throw new Error('Unknown request.');
    const next = clone(state.result.assignments);
    const a = next.find(a => a.id === id), r = state.input.requests.find(r => r.id === id);
    a.start = start; a.end = start + r.duration;
    return replaceDraft(state, next);
  }
  const snapshot = state => canonical({ input: state.input, result: state.result });
  function isReviewed(state) { return !!state.review && state.review.snapshot === snapshot(state); }
  function markReviewed(state) {
    if (state.result.status !== 'feasible' || checkDraft(state.input, state.result.assignments, true).length) throw new Error('Only a complete, valid feasible draft can be marked reviewed.');
    return { input: clone(state.input), result: clone(state.result), review: { snapshot: snapshot(state) } };
  }
  function verifySavedResult(input, result) {
    object(result, 'Saved result');
    if (result.method !== 'search' && result.method !== 'selected') throw new Error('Saved result method is unsupported.');
    const expected = result.method === 'search' ? evaluate(input) : selectedResult(input, result.assignments);
    if (canonical(expected) !== canonical(result)) throw new Error('Saved inputs and draft do not match an independently rechecked result. Keep the original file and correct the draft in the app.');
  }
  // Portable files must be editable by this four-request screen, even when numeric input is invalid.
  function editableShape(input) {
    object(input, 'Saved input');
    const scalar = (value, label) => {
      if (!(typeof value === 'number' && Number.isFinite(value)) && !(typeof value === 'string' && value.length <= 1000)) throw new Error(label + ' must be a number or editable text.');
    };
    const ws = (value, label) => {
      list(value, label, 100);
      value.forEach(w => { object(w, label); scalar(w.start, label + ' start'); scalar(w.end, label + ' end'); });
    };
    ws(input.windows, 'Saved operating windows');
    list(input.people, 'Saved people', 2, 2);
    unique(input.people.map(p => p.id), 'Saved people IDs');
    input.people.forEach(p => {
      object(p, 'Saved person');
      if (!FIXTURE.people.some(x => x.id === p.id)) throw new Error('Saved people must be P01 and P02.');
      strings(p.qualifications, p.id + ' qualifications'); ws(p.windows, p.id + ' windows');
      scalar(p.maxMinutes, p.id + ' limit'); scalar(p.restMinutes, p.id + ' rest');
    });
    list(input.requests, 'Saved requests', 4, 4);
    unique(input.requests.map(r => r.id), 'Saved request IDs');
    input.requests.forEach(r => {
      object(r, 'Saved request');
      const source = FIXTURE.requests.find(x => x.id === r.id);
      if (!source) throw new Error('Saved requests must be A, B, C and D.');
      for (const key of ['people', 'resources', 'qualifications']) if (canonical(r[key]) !== canonical(source[key])) throw new Error(r.id + ': saved fixed assignment or required qualification changed.');
      scalar(r.duration, r.id + ' duration'); list(r.starts, r.id + ' starts', 100);
      r.starts.forEach(s => scalar(s, r.id + ' start'));
    });
    if (input.maxNodes !== undefined) scalar(input.maxNodes, 'Search allowance');
  }
  function exportState(state) {
    editableShape(state.input);
    verifySavedResult(state.input, state.result);
    return JSON.stringify({ format: 'synthetic-practice-draft', version: 1, input: state.input, result: state.result }, null, 2);
  }
  function importState(source) {
    if (typeof source !== 'string' || source.length > 1000000) throw new Error('Choose a draft JSON file smaller than 1,000,000 characters.');
    let doc;
    try { doc = JSON.parse(source); } catch (_) { throw new Error('Cannot read JSON. Choose an unchanged file made with Save draft file.'); }
    object(doc, 'Saved file');
    if (doc.format !== 'synthetic-practice-draft' || doc.version !== 1) throw new Error('Unsupported file. Choose a version 1 synthetic practice draft.');
    editableShape(doc.input);
    verifySavedResult(doc.input, doc.result);
    return { input: clone(doc.input), result: clone(doc.result), review: null };
  }
  return { defaultInput: () => clone(FIXTURE), validate, solveSchedule, evaluate, checkDraft, totals,
    createState, updateInput, regenerate, replaceDraft, selectStart, markReviewed, isReviewed, exportState, importState, canonical };
});
