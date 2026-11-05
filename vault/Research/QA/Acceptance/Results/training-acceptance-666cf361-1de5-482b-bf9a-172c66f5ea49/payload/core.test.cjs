'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const C = require('./core.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
const fixture = C.defaultInput;
const request = (input, id) => input.requests.find(r => r.id === id);
const person = (input, id) => input.people.find(p => p.id === id);

// Test-side audit derives the constraints directly from the input and every interval pair.
// It does not call the application's checker, candidate builder or search helpers.
function independentlyAudit(input, result) {
  assert.equal(result.status, 'feasible');
  assert.equal(result.assignments.length, input.requests.length);
  assert.equal(new Set(result.assignments.map(a => a.id)).size, input.requests.length);
  for (const r of input.requests) {
    const a = result.assignments.find(a => a.id === r.id);
    assert.ok(a, 'every request is scheduled');
    assert.ok(r.starts.includes(a.start));
    assert.equal(a.end, a.start + r.duration);
    assert.deepEqual(a.people, r.people);
    assert.deepEqual(a.resources, r.resources);
    assert.ok(input.windows.some(w => w.start <= a.start && a.end <= w.end));
    for (const id of r.people) assert.ok(person(input, id).windows.some(w => w.start <= a.start && a.end <= w.end));
    for (const q of r.qualifications) assert.ok(r.people.some(id => person(input, id).qualifications.includes(q)));
  }
  for (const p of input.people) {
    const assigned = result.assignments.filter(a => a.people.includes(p.id));
    assert.ok(assigned.reduce((n, a) => n + a.end - a.start, 0) <= p.maxMinutes);
    for (let i = 0; i < assigned.length; i++) for (let j = i + 1; j < assigned.length; j++) {
      const [earlier, later] = [assigned[i], assigned[j]].sort((a, b) => a.start - b.start);
      assert.ok(later.start - earlier.end >= p.restMinutes, 'rest and person exclusivity');
    }
  }
  for (let i = 0; i < result.assignments.length; i++) for (let j = i + 1; j < result.assignments.length; j++) {
    const a = result.assignments[i], b = result.assignments[j];
    if (a.resources.some(room => b.resources.includes(room))) assert.ok(a.end <= b.start || b.end <= a.start, 'room exclusivity');
  }
}

test('BRIEF fixture: all four requests, B at 90 and combined totals of 120 each', () => {
  const input = fixture();
  const result = C.evaluate(input);
  assert.deepEqual(result.assignments.map(a => [a.id, a.start, a.end]), [
    ['A', 0, 60], ['B', 90, 150], ['C', 0, 60], ['D', 1440, 1500]
  ]);
  independentlyAudit(input, result);
  assert.deepEqual(C.checkDraft(input, result.assignments, true), []);
  assert.deepEqual(C.totals(input, result.assignments), [
    { id: 'P01', requested: 120, draft: 120, limit: 120 },
    { id: 'P02', requested: 120, draft: 120, limit: 120 }
  ]);
});

test('packet scheduling fixture is computed by the actual application solver', () => {
  const input = require('./packet/.fleet/fixtures.json').fixtures.fleet_solve_schedule;
  const result = C.solveSchedule(input);
  independentlyAudit(input, result);
  assert.deepEqual(result.assignments.map(a => [a.id, a.start, a.end]), [
    ['drill-a', 540, 600], ['drill-b', 630, 690]
  ]);
  assert.deepEqual(C.checkDraft(input, result.assignments), []);
});

test('edits recompute from current inputs without mutating constraints or requests', () => {
  const input = fixture(); request(input, 'B').starts = [120];
  const before = copy(input);
  const result = C.evaluate(input);
  independentlyAudit(input, result);
  assert.equal(result.assignments.find(a => a.id === 'B').start, 120);
  assert.deepEqual(input, before);
  const shorter = fixture(); request(shorter, 'A').duration = 45; request(shorter, 'B').starts = [75];
  independentlyAudit(shorter, C.evaluate(shorter));
  assert.equal(C.totals(shorter)[0].requested, 105);
});

test('infeasible retains every original request and returns no misleading partial draft', () => {
  const input = fixture(); request(input, 'B').starts = [0];
  const before = copy(input), result = C.evaluate(input);
  assert.equal(result.status, 'infeasible');
  assert.deepEqual(result.assignments, []);
  assert.ok(result.explanations.some(s => /room overlaps/.test(s)));
  assert.deepEqual(input, before);
  assert.equal(input.requests.length, 4);
  assert.deepEqual(C.totals(input).map(p => p.requested), [120, 120]);
});

test('30-minute rest boundary: 29 fails, 30 and 31 pass', () => {
  for (const [start, expected] of [[89, 'infeasible'], [90, 'feasible'], [91, 'feasible']]) {
    const input = fixture(); request(input, 'B').starts = [start];
    const result = C.evaluate(input);
    assert.equal(result.status, expected);
    if (expected === 'feasible') independentlyAudit(input, result);
    else assert.match(result.explanations.join(' '), /30-minute rest/);
  }
});

test('half-open room and person intervals allow touching when supplied rest is zero', () => {
  const input = fixture(); person(input, 'P01').restMinutes = 0; request(input, 'B').starts = [60];
  const result = C.evaluate(input);
  independentlyAudit(input, result);
  assert.deepEqual(C.checkDraft(input, result.assignments, true), []);
});

test('person conflict is enforced even with different rooms', () => {
  const input = copy(require('./packet/.fleet/fixtures.json').fixtures.fleet_solve_schedule);
  input.requests.forEach(r => { r.starts = [540]; });
  input.requests[1].resources = ['different-room'];
  const result = C.solveSchedule(input);
  assert.equal(result.status, 'infeasible');
  assert.match(result.explanations.join(' '), /person-a overlaps/);
});

test('room conflict is enforced even with different people', () => {
  const input = copy(require('./packet/.fleet/fixtures.json').fixtures.fleet_solve_schedule);
  input.requests.forEach(r => { r.starts = [540]; });
  input.requests[1].people = ['person-b']; input.requests[1].qualifications = ['observer'];
  assert.equal(C.solveSchedule(input).status, 'infeasible');
  input.requests[1].starts = [600];
  independentlyAudit(input, C.solveSchedule(input));
});

test('whole session must fit operating window; an exact end is allowed', () => {
  for (const [start, expected] of [[180, 'feasible'], [181, 'infeasible'], [230, 'infeasible']]) {
    const input = fixture(); request(input, 'A').starts = [start];
    const result = C.evaluate(input);
    assert.equal(result.status, expected);
    if (expected === 'feasible') independentlyAudit(input, result);
    else assert.match(result.explanations.join(' '), /complete operating window/);
  }
});

test('assigned person availability also requires complete containment', () => {
  const input = fixture(); person(input, 'P01').windows[0].end = 59;
  assert.equal(C.evaluate(input).status, 'infeasible');
  assert.match(C.evaluate(input).explanations.join(' '), /P01 availability/);
  const none = fixture(); person(none, 'P02').windows = [];
  assert.equal(C.evaluate(none).status, 'infeasible');
});

test('missing qualification is infeasible and never filled in by search', () => {
  const input = fixture(); person(input, 'P01').qualifications = [];
  const before = copy(input), result = C.evaluate(input);
  assert.equal(result.status, 'infeasible');
  assert.match(result.explanations.join(' '), /qualification Q-A/);
  assert.deepEqual(input, before);
});

test('120-minute maximum spans both days, with exact and excess boundaries', () => {
  const exact = fixture(); independentlyAudit(exact, C.evaluate(exact));
  const lower = fixture(); person(lower, 'P02').maxMinutes = 119;
  assert.equal(C.evaluate(lower).status, 'infeasible');
  assert.match(C.evaluate(lower).explanations.join(' '), /P02.*120.*119.*whole-horizon/);
  const longer = fixture(); request(longer, 'B').duration = 61;
  assert.equal(C.evaluate(longer).status, 'infeasible');
  assert.equal(C.totals(longer)[0].requested, 121);
});

test('an empty allowed-start list is explicitly infeasible, never an omitted request', () => {
  const input = fixture(); request(input, 'B').starts = [];
  assert.equal(C.evaluate(input).status, 'infeasible');
  assert.match(C.evaluate(input).explanations.join(' '), /B: no allowed start/);
  assert.equal(input.requests.length, 4);
});

test('invalid durations retain actionable request-specific errors', () => {
  for (const duration of [0, -1, 60.5, '60', '', null, NaN, Infinity, 10081]) {
    const input = fixture(); request(input, 'B').duration = duration;
    const result = C.evaluate(input);
    assert.equal(result.status, 'invalid_input');
    assert.match(result.explanations[0], /B duration.*whole number/);
    assert.deepEqual(result.assignments, []);
  }
});

test('invalid starts, windows, budgets and search allowances are not infeasibility', () => {
  const cases = [
    x => { request(x, 'B').starts = [0, 0]; },
    x => { request(x, 'B').starts = [-1]; },
    x => { request(x, 'B').starts = [1.5]; },
    x => { request(x, 'B').starts = ['bad']; },
    x => { request(x, 'B').starts = [1000000001]; },
    x => { x.windows[0].end = 0; },
    x => { person(x, 'P01').restMinutes = -1; },
    x => { person(x, 'P02').maxMinutes = ''; },
    x => { x.maxNodes = 0; },
    x => { x.maxNodes = 1.5; },
    x => { x.maxNodes = 200001; }
  ];
  for (const change of cases) {
    const input = fixture(); change(input);
    const result = C.evaluate(input);
    assert.equal(result.status, 'invalid_input');
    assert.ok(result.explanations[0].length > 15);
  }
  assert.equal(C.evaluate(null).status, 'invalid_input');
});

test('all four identities, supplied people, rooms and required qualifications are enforced', () => {
  const changes = [
    x => { x.requests.pop(); },
    x => { x.requests.push(copy(x.requests[0])); },
    x => { request(x, 'B').id = 'A'; },
    x => { request(x, 'B').people = ['P02']; },
    x => { request(x, 'B').people = ['unknown']; },
    x => { request(x, 'B').resources = ['Room-2']; },
    x => { request(x, 'B').qualifications = []; },
    x => { x.people.pop(); }
  ];
  for (const change of changes) {
    const input = fixture(); change(input);
    assert.equal(C.evaluate(input).status, 'invalid_input');
  }
});

test('search limit reached is inconclusive and distinct from infeasible and invalid', () => {
  const input = fixture(); input.maxNodes = 1;
  const result = C.evaluate(input);
  assert.equal(result.status, 'search_limit_reached');
  assert.equal(result.explored, 1); assert.equal(result.maxNodes, 1);
  assert.deepEqual(result.assignments, []);
  assert.equal(input.requests.length, 4);
  delete input.maxNodes;
  assert.equal(C.evaluate(input).maxNodes, 50000);
  independentlyAudit(input, C.evaluate(input));
});

test('exact search allowance boundaries do not mislabel completion or full exhaustion', () => {
  const input = fixture(); input.maxNodes = 4;
  assert.equal(C.evaluate(input).status, 'search_limit_reached');
  input.maxNodes = 5;
  const complete = C.evaluate(input);
  assert.equal(complete.explored, 5); independentlyAudit(input, complete);
  request(input, 'B').starts = [0]; input.maxNodes = 2;
  assert.equal(C.evaluate(input).status, 'infeasible');
  input.maxNodes = 1;
  assert.equal(C.evaluate(input).status, 'search_limit_reached');
});

test('small candidate grid agrees with a separate specification-derived feasibility oracle', () => {
  for (const duration of [30, 60, 61]) for (const starts of [[0], [59, 60], [89, 90], [179, 180], [1440]]) {
    const input = fixture(); request(input, 'B').duration = duration; request(input, 'B').starts = starts;
    // A is fixed at [0,60), B shares P01 and Room-1, rest is 30, total limit is 120.
    const expected = duration <= 60 && starts.some(s => s >= 90 && ((s + duration <= 240) || (s >= 1440 && s + duration <= 1680)));
    const result = C.evaluate(input);
    assert.equal(result.status, expected ? 'feasible' : 'infeasible', JSON.stringify({ duration, starts }));
    if (expected) independentlyAudit(input, result);
  }
});

test('independent complete-draft checker rejects missing, duplicate, reassigned and altered intervals', () => {
  const input = fixture(), original = C.evaluate(input).assignments;
  const cases = [
    a => { a.pop(); }, a => { a[1] = copy(a[0]); },
    a => { a[0].people = ['P02']; }, a => { a[0].resources = ['Room-2']; },
    a => { a[0].end = 59; }, a => { a[1].start = 89; a[1].end = 149; },
    a => { a[1].start = 0; a[1].end = 60; }
  ];
  for (const change of cases) {
    const draft = copy(original); change(draft);
    assert.ok(C.checkDraft(input, draft, true).length > 0);
  }
  const noQualification = fixture(); person(noQualification, 'P01').qualifications = [];
  assert.match(C.checkDraft(noQualification, original, true).join(' '), /qualification/);
  const lowLimit = fixture(); person(lowLimit, 'P02').maxMinutes = 119;
  assert.match(C.checkDraft(lowLimit, original, true).join(' '), /whole-horizon/);
});

test('review requires a valid complete feasible draft and is invalidated by input edits', () => {
  const state = C.markReviewed(C.createState());
  assert.equal(C.isReviewed(state), true);
  const input = copy(state.input); request(input, 'B').starts = [120];
  const changed = C.updateInput(state, input);
  assert.equal(C.isReviewed(changed), false);
  assert.equal(changed.result.assignments.find(a => a.id === 'B').start, 120);
  assert.equal(C.isReviewed(C.regenerate(state)), false);
  request(input, 'B').duration = '';
  const invalid = C.updateInput(state, input);
  assert.equal(invalid.result.status, 'invalid_input');
  assert.throws(() => C.markReviewed(invalid), /Only a complete/);
});

test('review detects direct relevant input and result mutation as stale', () => {
  const state = C.markReviewed(C.createState());
  state.input.people[0].restMinutes = 31;
  assert.equal(C.isReviewed(state), false);
  const resultChanged = C.markReviewed(C.createState());
  resultChanged.result.assignments[1].start = 0;
  assert.equal(C.isReviewed(resultChanged), false);
  assert.throws(() => C.markReviewed(resultChanged), /Only a complete/);
});

test('person-selected draft is rechecked, clears review and never calls a conflict infeasible', () => {
  let state = C.markReviewed(C.createState());
  state = C.selectStart(state, 'B', 0);
  assert.equal(state.result.method, 'selected');
  assert.equal(state.result.status, 'invalid_input');
  assert.equal(state.result.assignments.length, 4);
  assert.equal(C.isReviewed(state), false);
  assert.throws(() => C.markReviewed(state), /Only a complete/);
  state = C.selectStart(state, 'B', 90);
  independentlyAudit(state.input, state.result);
  assert.equal(C.isReviewed(state), false);
  assert.equal(C.isReviewed(C.markReviewed(state)), true);
});

test('portable round trip preserves a valid alternate draft rather than overwriting with first solution', () => {
  const input = fixture(); request(input, 'B').starts = [90, 120];
  let state = C.createState(input);
  assert.equal(state.result.assignments.find(a => a.id === 'B').start, 90);
  state = C.markReviewed(C.selectStart(state, 'B', 120));
  const saved = C.exportState(state);
  const reopened = C.importState(saved);
  assert.deepEqual(reopened.input, state.input);
  assert.deepEqual(reopened.result, state.result);
  assert.equal(reopened.result.assignments.find(a => a.id === 'B').start, 120);
  assert.equal(C.isReviewed(reopened), false);
  independentlyAudit(reopened.input, reopened.result);
});

test('real local JSON file survives a fresh module load with exact inputs and draft', () => {
  const tempRoot = path.join(__dirname, '.tmp'); fs.mkdirSync(tempRoot, { recursive: true });
  const directory = fs.mkdtempSync(path.join(tempRoot, 'roundtrip-'));
  try {
    const state = C.createState();
    const file = path.join(directory, 'saved-draft.json');
    fs.writeFileSync(file, C.exportState(state));
    delete require.cache[require.resolve('./core.cjs')];
    const fresh = require('./core.cjs');
    const reopened = fresh.importState(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(reopened.input, state.input); assert.deepEqual(reopened.result, state.result);
    assert.equal(fresh.isReviewed(reopened), false);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('infeasible, exhausted and invalid raw inputs retain exact states through portable files', () => {
  const inputs = [fixture(), fixture(), fixture()];
  request(inputs[0], 'B').starts = [0]; inputs[1].maxNodes = 1; request(inputs[2], 'B').duration = '';
  const expected = ['infeasible', 'search_limit_reached', 'invalid_input'];
  inputs.forEach((input, i) => {
    const state = C.createState(input), reopened = C.importState(C.exportState(state));
    assert.equal(reopened.result.status, expected[i]);
    assert.deepEqual(reopened.input, input); assert.deepEqual(reopened.result, state.result);
    assert.equal(C.isReviewed(reopened), false);
  });
  let invalidSelected = C.selectStart(C.createState(), 'B', 0);
  assert.deepEqual(C.importState(C.exportState(invalidSelected)).result, invalidSelected.result);
});

test('import rejects malformed, tampered, stale or incomplete data without changing current state', () => {
  const state = C.markReviewed(C.createState()), before = copy(state), valid = JSON.parse(C.exportState(state));
  const broken = [
    '{bad', JSON.stringify({ format: 'other', version: 1 }),
    JSON.stringify({ ...valid, version: 2 }), 'x'.repeat(1000001)
  ];
  const alterations = [
    d => { d.result.status = 'infeasible'; },
    d => { d.result.assignments.pop(); },
    d => { d.result.assignments[0].people = ['P02']; },
    d => { d.result.assignments[0].end = 61; },
    d => { d.input.requests[1].starts = [120]; },
    d => { d.input.requests.pop(); },
    d => { d.result.method = 'other'; }
  ];
  for (const alter of alterations) { const doc = copy(valid); alter(doc); broken.push(JSON.stringify(doc)); }
  for (const source of broken) assert.throws(() => C.importState(source));
  assert.deepEqual(state, before); assert.equal(C.isReviewed(state), true);
  valid.review = before.review;
  assert.equal(C.isReviewed(C.importState(JSON.stringify(valid))), false);
});

test('inline core is byte-for-byte identical and executes the same functions in an isolated classic-script context', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const prefix = '<script id="app-core">\n', start = html.indexOf(prefix) + prefix.length;
  assert.ok(start >= prefix.length);
  const inline = html.slice(start, html.indexOf('</script>', start));
  assert.deepEqual(Buffer.from(inline), fs.readFileSync(path.join(__dirname, 'core.cjs')));
  const context = vm.createContext({});
  new vm.Script(inline).runInContext(context);
  const result = vm.runInContext('JSON.stringify(Practice.evaluate(Practice.defaultInput()))', context);
  assert.deepEqual(JSON.parse(result), C.evaluate(fixture()));
  const uiPrefix = '<script id="app-ui">\n', uiStart = html.indexOf(uiPrefix) + uiPrefix.length;
  assert.ok(uiStart >= uiPrefix.length);
  new vm.Script(html.slice(uiStart, html.indexOf('</script>', uiStart)));
});

test('HTML carries no external scripts, stylesheets, network calls or runtime imports', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /<script[^>]+src\s*=|<link\b|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bimport\s*\(/i);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /SYNTHETIC DATA/); assert.match(html, /DRAFT ONLY/);
});

test('every original packet file matches the pre-implementation SHA-256 baseline', () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'packet-integrity.json'), 'utf8'));
  const packet = JSON.parse(fs.readFileSync(path.join(__dirname, 'packet/.fleet/manifest.json'), 'utf8'));
  assert.equal(packet.hash, baseline.manifestHash);
  for (const [file, expected] of Object.entries(baseline.files)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex');
    assert.equal(actual, expected, file + ' must remain unchanged');
  }
});
