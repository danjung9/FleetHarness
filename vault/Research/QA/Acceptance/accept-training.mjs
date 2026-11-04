#!/usr/bin/env node
// Independent synthetic training acceptance. No candidate module is imported into Node.
// Usage: node accept-training.mjs CANDIDATE OUTPUT --deps EXISTING_PROJECT [--chrome EXECUTABLE]
// Pure evaluator check: node accept-training.mjs --self-check
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const SCRIPT = fileURLToPath(import.meta.url);
const CONTRACT = path.resolve(path.dirname(SCRIPT), '../Officer/Acceptance-11.md');
const KEY = path.resolve(path.dirname(SCRIPT), '../Officer/11-Training-Golden.md');
const clone = value => structuredClone(value);
const sha = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, function (_key, v) {
  return v && !Array.isArray(v) && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v;
});
const equal = (a, b) => canonical(a) === canonical(b);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = {
  windows: [{ start: 0, end: 240 }, { start: 1440, end: 1680 }],
  people: [
    { id: 'P01', qualifications: ['Q-A'], windows: [{ start: 0, end: 240 }, { start: 1440, end: 1680 }], maxMinutes: 120, restMinutes: 30 },
    { id: 'P02', qualifications: ['Q-B'], windows: [{ start: 0, end: 240 }, { start: 1440, end: 1680 }], maxMinutes: 120, restMinutes: 0 }
  ],
  requests: [
    { id: 'A', duration: 60, starts: [0], people: ['P01'], resources: ['Room-1'], qualifications: ['Q-A'] },
    { id: 'B', duration: 60, starts: [0, 90], people: ['P01'], resources: ['Room-1'], qualifications: ['Q-A'] },
    { id: 'C', duration: 60, starts: [0], people: ['P02'], resources: ['Room-2'], qualifications: ['Q-B'] },
    { id: 'D', duration: 60, starts: [1440], people: ['P02'], resources: ['Room-2'], qualifications: ['Q-B'] }
  ],
  maxNodes: 50000
};
const at = (input, id) => input.requests.find(r => r.id === id);
const person = (input, id) => input.people.find(p => p.id === id);
function answer(input, starts) {
  return input.requests.map(r => ({
    id: r.id, start: starts[r.id], end: starts[r.id] + r.duration,
    people: clone(r.people), resources: clone(r.resources)
  }));
}
function makeCase(id, edit, status, starts, reason = '') {
  const input = clone(base); edit(input);
  return { id, input, expected: { status, assignments: starts ? answer(input, starts) : [] }, reason };
}
const baseStarts = { A: 0, B: 90, C: 0, D: 1440 };
const cases = [
  makeCase('G01', () => {}, 'feasible', baseStarts),
  makeCase('G02', i => { at(i, 'A').starts = [30]; at(i, 'B').starts = [0, 90, 120]; }, 'feasible', { A: 30, B: 120, C: 0, D: 1440 }),
  makeCase('G03', i => { at(i, 'B').starts = [0]; }, 'infeasible', null, 'P01 and Room-1 overlap'),
  makeCase('G04', i => { at(i, 'B').starts = [60]; }, 'infeasible', null, 'P01 has zero rest rather than 30'),
  makeCase('G05', i => { at(i, 'B').starts = [90]; }, 'feasible', baseStarts),
  makeCase('G06', i => { person(i, 'P01').maxMinutes = 119; }, 'infeasible', null, 'P01 requires 120 minutes, exceeding 119'),
  makeCase('G07', i => { person(i, 'P01').qualifications = []; }, 'infeasible', null, 'P01 lacks Q-A'),
  makeCase('G08', i => { at(i, 'D').id = 'C'; }, 'invalid_input', null, 'Duplicate request ID C'),
  makeCase('G09', i => { at(i, 'B').starts = ['0900']; }, 'invalid_input', null, 'A quoted start is not an integer minute'),
  makeCase('G10', i => { i.maxNodes = 1; }, 'budget_exhausted', null, 'Interrupted search is not proof of infeasibility'),
  makeCase('G11', i => { person(i, 'P02').windows = [{ start: 0, end: 240 }]; }, 'infeasible', null, 'D lies outside P02 availability'),
  makeCase('G12a', i => { i.windows[1].end = 1499; }, 'infeasible', null, 'D ends at 1500 beyond operating end 1499'),
  makeCase('G12b', i => { i.windows[1].end = 1500; }, 'feasible', baseStarts),
  makeCase('V13', i => { at(i, 'A').duration = 45; at(i, 'B').starts = [60, 75]; }, 'feasible', { A: 0, B: 75, C: 0, D: 1440 }),
  makeCase('V14', i => { at(i, 'C').resources = ['Room-1']; at(i, 'C').starts = [0, 60, 150]; }, 'feasible', { A: 0, B: 90, C: 150, D: 1440 }),
  makeCase('V15', i => { person(i, 'P02').maxMinutes = 119; }, 'infeasible', null, 'P02 requires 120 minutes across both days'),
  makeCase('V16', i => { at(i, 'A').starts = [120]; at(i, 'B').starts = [30, 60]; }, 'feasible', { A: 120, B: 30, C: 0, D: 1440 })
];

// The evaluator is independent arithmetic, not the candidate's solver or harness toolkit.
function validateAssignments(input, assignments) {
  const errors = [];
  const ids = input.requests.map(r => r.id);
  if (new Set(ids).size !== ids.length) errors.push('Duplicate input request IDs');
  for (const r of input.requests) {
    if (!Number.isSafeInteger(r.duration) || r.duration <= 0 ||
        !Array.isArray(r.starts) || r.starts.some(s => !Number.isSafeInteger(s))) errors.push('Invalid numeric input for ' + r.id);
  }
  if (!Array.isArray(assignments)) return { valid: false, errors: ['Assignments are not an array'], totals: {}, rest: {} };
  const returned = assignments.map(a => a?.id);
  if (!equal([...ids].sort(), [...returned].sort())) errors.push('Required and returned ID multisets differ');
  const totals = Object.fromEntries(input.people.map(p => [p.id, 0]));
  const sessions = Object.fromEntries(input.people.map(p => [p.id, []]));
  const sameMembers = (a, b) => Array.isArray(a) && Array.isArray(b) && equal([...a].sort(), [...b].sort());
  const contained = (a, windows) => windows.some(w => a.start >= w.start && a.end <= w.end);
  const overlap = (a, b) => Math.max(a.start, b.start) < Math.min(a.end, b.end);
  for (const a of assignments) {
    const r = input.requests.find(r => r.id === a?.id);
    if (!r) { errors.push('Unknown assignment'); continue; }
    if (!Number.isSafeInteger(a.start) || !Number.isSafeInteger(a.end)) { errors.push('Noninteger assignment ' + r.id); continue; }
    if (a.end - a.start !== r.duration) errors.push('Wrong duration ' + r.id);
    if (!r.starts.includes(a.start)) errors.push('Unpermitted start ' + r.id);
    if (!sameMembers(a.people, r.people) || !sameMembers(a.resources, r.resources)) errors.push('Changed assignment identity ' + r.id);
    if (!contained(a, input.windows)) errors.push('Operating window ' + r.id);
    const qualified = new Set(r.people.flatMap(id => person(input, id)?.qualifications || []));
    if (r.qualifications.some(q => !qualified.has(q))) errors.push('Qualification ' + r.id);
    for (const id of r.people) {
      const p = person(input, id);
      if (!p || !contained(a, p.windows)) errors.push('Person window ' + r.id);
      if (p) { totals[id] += a.end - a.start; sessions[id].push(a); }
    }
  }
  for (let x = 0; x < assignments.length; x++) for (let y = x + 1; y < assignments.length; y++) {
    const a = assignments[x], b = assignments[y];
    if (!a || !b || !overlap(a, b)) continue;
    if ((a.people || []).some(p => (b.people || []).includes(p))) errors.push('Person overlap');
    if ((a.resources || []).some(r => (b.resources || []).includes(r))) errors.push('Resource overlap');
  }
  const rest = {};
  for (const p of input.people) {
    const ordered = sessions[p.id].sort((a, b) => a.start - b.start);
    rest[p.id] = ordered.slice(1).map((a, n) => a.start - ordered[n].end);
    if (rest[p.id].some(g => g < p.restMinutes)) errors.push('Insufficient rest ' + p.id);
    if (totals[p.id] > p.maxMinutes) errors.push('Horizon minutes ' + p.id);
  }
  return { valid: !errors.length, errors, totals, rest };
}
function selfCheck() {
  for (const c of cases.filter(c => c.expected.status === 'feasible')) {
    assert.equal(validateAssignments(c.input, c.expected.assignments).valid, true, c.id);
  }
  const valid = answer(base, baseStarts);
  const n1 = clone(valid); Object.assign(n1.find(a => a.id === 'B'), { start: 0, end: 60 });
  const n2 = valid.filter(a => a.id !== 'D');
  const n3 = clone(valid); Object.assign(n3.find(a => a.id === 'B'), { start: 60, end: 120 });
  for (const [name, bad] of [['N1', n1], ['N2', n2], ['N3', n3]]) assert.equal(validateAssignments(base, bad).valid, false, name);
  const strings = clone(valid); strings[0].start = '0';
  assert.equal(validateAssignments(base, strings).valid, false, 'Numeric strings must not pass');
  const duplicate = clone(valid); duplicate[3] = clone(duplicate[2]);
  assert.equal(validateAssignments(base, duplicate).valid, false, 'Duplicate returned IDs');
  assert.deepEqual(validateAssignments(cases.find(c => c.id === 'V13').input, cases.find(c => c.id === 'V13').expected.assignments).totals, { P01: 105, P02: 120 });
  return { status: 'PASS', validCases: cases.filter(c => c.expected.status === 'feasible').length, rejected: ['N1', 'N2', 'N3', 'numeric strings', 'duplicate returned IDs'], scope: 'Pure evaluator controls only, no candidate acceptance' };
}

function inputShape(v) {
  return v && typeof v === 'object' && !Array.isArray(v) &&
    Array.isArray(v.windows) && Array.isArray(v.people) && Array.isArray(v.requests) &&
    Object.hasOwn(v, 'maxNodes');
}
function findInputs(value, prefix = [], found = []) {
  if (prefix.length > 12 || !value || typeof value !== 'object') return found;
  if (inputShape(value)) found.push({ path: prefix, value });
  else for (const [k, v] of Object.entries(value)) findInputs(v, [...prefix, k], found);
  return found;
}
function inputFields(value) {
  return Object.fromEntries(['windows', 'people', 'requests', 'maxNodes'].map(k => [k, value[k]]));
}
function replaceInput(document, keys, input) {
  if (!keys.length) return clone(input);
  const next = clone(document); let cursor = next;
  for (const key of keys.slice(0, -1)) cursor = cursor[key];
  cursor[keys.at(-1)] = clone(input); return next;
}
function normalizedStatus(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_');
  return ['feasible', 'infeasible', 'invalid_input', 'budget_exhausted'].includes(s) ? s : s === 'invalid' ? 'invalid_input' : null;
}
const sortedAnswer = rows => [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
function judge(c, observed) {
  if (!observed) return { status: 'NOT CHECKED', detail: 'No unambiguous current rendered result schema' };
  if (c.id === 'G10' && observed.status !== 'budget_exhausted' && observed.status !== 'infeasible') {
    return { status: 'NOT CHECKED', detail: 'Equivalent search interruption is unestablished for this solver', observed };
  }
  if (observed.status !== c.expected.status) return { status: 'FAIL', detail: 'Wrong explicit result status', observed };
  if (!Array.isArray(observed.assignments)) return { status: 'NOT CHECKED', detail: 'Accepted assignment list is not identifiable', observed };
  if (c.expected.status !== 'feasible') return {
    status: observed.assignments.length ? 'FAIL' : 'PASS',
    detail: observed.assignments.length ? 'Nonfeasible result exposes accepted assignments' : 'Expected status and empty accepted assignment list',
    observed
  };
  const arithmetic = validateAssignments(c.input, observed.assignments);
  const exact = equal(sortedAnswer(observed.assignments), sortedAnswer(c.expected.assignments));
  return { status: arithmetic.valid && exact ? 'PASS' : 'FAIL', detail: exact ? 'Independent constraint calculation' : 'Unique expected assignment differs', observed, arithmetic };
}

// Payload staging excludes hidden paths, credential-like names, and symlinks before reading bytes.
function excluded(name) {
  return name.startsWith('.') || ['node_modules', 'credentials', 'secrets', 'auth'].includes(name.toLowerCase()) ||
    /(?:^|[._-])(?:credentials?|secrets?|passwords?|tokens?|auth|private[-_]?key)(?:[._-]|$)/i.test(name) ||
    /\.(?:pem|key|p12|pfx|keystore|jks)$/i.test(name);
}
async function payload(root, copyTo) {
  const files = [], skipped = []; let total = 0;
  async function walk(relative) {
    for (const entry of (await fs.readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const rel = path.join(relative, entry.name), full = path.join(root, rel);
      if (excluded(entry.name)) { skipped.push({ path: rel, reason: 'Excluded name' }); continue; }
      const stat = await fs.lstat(full);
      if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) { skipped.push({ path: rel, reason: 'Nonregular or symlink' }); continue; }
      if (stat.isDirectory()) { await walk(rel); continue; }
      if (stat.size > 10_000_000 || (total += stat.size) > 50_000_000 || files.length >= 2000) throw new Error('Payload exceeds bounded file limits');
      // O_NOFOLLOW is unavailable on some platforms. Recheck identity after opening.
      const handle = await fs.open(full, 'r');
      let bytes;
      try {
        const opened = await handle.stat();
        if (opened.dev !== stat.dev || opened.ino !== stat.ino || !opened.isFile()) throw new Error('Payload changed during open: ' + rel);
        bytes = await handle.readFile();
      } finally { await handle.close(); }
      files.push({ path: rel.split(path.sep).join('/'), size: bytes.length, sha256: sha(bytes) });
      if (copyTo) { await fs.mkdir(path.dirname(path.join(copyTo, rel)), { recursive: true }); await fs.writeFile(path.join(copyTo, rel), bytes); }
    }
  }
  await walk('');
  return { files, skipped, manifestSha256: sha(canonical(files)) };
}
async function resolvedFuture(target) {
  let current = path.resolve(target), parts = [];
  while (true) {
    try { return path.join(await fs.realpath(current), ...parts.reverse()); }
    catch (e) { if (e.code !== 'ENOENT') throw e; const next = path.dirname(current); if (next === current) throw e; parts.push(path.basename(current)); current = next; }
  }
}

async function observe(page) {
  return page.evaluate(() => {
    const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' &&
      getComputedStyle(el).display !== 'none' && !el.closest('[aria-hidden="true"]');
    const label = el => el.getAttribute('aria-label') || (el.labels ? [...el.labels].map(l => l.innerText).join(' ') : '') || el.innerText || el.value || '';
    const capped = s => String(s || '').slice(0, 30000);
    const editors = [...document.querySelectorAll('textarea')].map((el, index) => ({
      index, visible: visible(el), readOnly: el.readOnly, disabled: el.disabled, label: capped(label(el)), value: capped(el.value)
    }));
    const buttons = [...document.querySelectorAll('button,input[type=button],input[type=submit]')].map((el, index) => ({
      index, visible: visible(el), disabled: el.disabled, name: capped(label(el)).trim()
    }));
    const outputs = [...document.querySelectorAll('pre,code,output,textarea[readonly],[role=status],[role=alert]')]
      .filter(visible).map(el => ({ tag: el.tagName, role: el.getAttribute('role'), text: capped(el.tagName === 'TEXTAREA' ? el.value : el.innerText) }));
    const tables = [...document.querySelectorAll('table')].filter(visible).map(table =>
      [...table.rows].map(row => [...row.cells].map(cell => capped(cell.innerText).trim())));
    const review = [...document.querySelectorAll('input[type=checkbox]')].map((el, index) => ({
      index, visible: visible(el), disabled: el.disabled, label: capped(label(el)), checked: el.checked
    }));
    const statusTexts = [...document.querySelectorAll('[role=status],[role=alert],output,[class*="status"],[id*="status"],[class*="review"],[id*="review"]')]
      .filter(el => visible(el) && !['BUTTON', 'INPUT', 'TEXTAREA'].includes(el.tagName)).map(el => capped(el.innerText).trim());
    const imports = [...document.querySelectorAll('input[type=file]')].map((el, index) => ({
      index, label: capped(label(el)), accept: el.accept, multiple: el.multiple, disabled: el.disabled
    }));
    return { url: location.href, body: capped(document.body.innerText), editors, buttons, outputs, tables, review, statusTexts, imports };
  });
}
function tableResult(observation) {
  const statuses = [...new Set(observation.statusTexts.map(normalizedStatus).filter(Boolean))];
  if (statuses.length !== 1) return null;
  const candidates = [];
  const header = s => s.toLowerCase().replace(/[^a-z]/g, '');
  const integer = s => /^-?\d+$/.test(s) && Number.isSafeInteger(Number(s)) ? Number(s) : null;
  for (const table of observation.tables) {
    if (!table.length) continue;
    const h = table[0].map(header);
    const col = names => { const matches = h.map((x, n) => names.includes(x) ? n : -1).filter(n => n >= 0); return matches.length === 1 ? matches[0] : -1; };
    const indexes = [col(['id', 'request', 'requestid']), col(['start', 'startminute', 'startminutes']), col(['end', 'endminute', 'endminutes']), col(['person', 'people', 'assignedperson', 'assignedpeople']), col(['room', 'resource', 'resources'])];
    if (indexes.some(n => n < 0)) continue;
    const rows = table.slice(1).filter(r => r.some(Boolean));
    const assignments = rows.map(r => ({
      id: r[indexes[0]], start: integer(r[indexes[1]] || ''), end: integer(r[indexes[2]] || ''),
      people: (r[indexes[3]] || '').split(/[,;]/).map(s => s.trim()).filter(Boolean),
      resources: (r[indexes[4]] || '').split(/[,;]/).map(s => s.trim()).filter(Boolean)
    }));
    if (assignments.some(a => a.start === null || a.end === null)) continue;
    candidates.push({ status: statuses[0], assignments, source: 'visible table with explicit numeric-minute headers' });
  }
  return candidates.length === 1 ? candidates[0] : null;
}
function renderedResult(observation) {
  const found = [];
  for (const output of observation.outputs) {
    try {
      const value = JSON.parse(output.text);
      if (value && normalizedStatus(value.status) && Array.isArray(value.assignments)) {
        found.push({ status: normalizedStatus(value.status), assignments: value.assignments, source: 'visible ' + output.tag, diagnostics: Object.fromEntries(['message', 'reason', 'reasons', 'errors', 'conflicts'].filter(k => Object.hasOwn(value, k)).map(k => [k, value[k]])) });
      }
    } catch {}
  }
  // Nested code/pre elements may repeat the same JSON; differing results are ambiguous.
  const unique = [...new Map(found.map(r => [canonical({ status: r.status, assignments: r.assignments }), r])).values()];
  if (unique.length > 1) return null;
  const fromTable = tableResult(observation);
  if (unique.length && fromTable && !equal({ status: unique[0].status, assignments: sortedAnswer(unique[0].assignments) }, { status: fromTable.status, assignments: sortedAnswer(fromTable.assignments) })) return null;
  return unique[0] || fromTable;
}
function chooseButton(observation, pattern) {
  const options = observation.buttons.filter(b => b.visible && !b.disabled && pattern.test(b.name));
  return options.length === 1 ? options[0] : null;
}
const CHECK = /^(?:check|check draft|check schedule|check constraints|validate|validate draft|validate schedule|solve|solve schedule|generate schedule|generate draft|run check)$/i;
const SAVE = /^(?:save|export|download) (?:draft|json|draft json|schedule json)$/i;
const SUMMARY = /^(?:save|export|download) (?:summary|readable summary|text summary)$/i;
const REVIEW = /^(?:mark (?:as )?reviewed|review draft|approve draft|mark draft reviewed)$/i;
function reviewState(observation) {
  const checkboxes = observation.review.filter(c => c.visible && /reviewed|review complete|i (?:have )?reviewed/i.test(c.label));
  const texts = observation.statusTexts.map(s => s.trim().toLowerCase());
  const values = texts.flatMap(s => /^(reviewed|approved|review complete)$/.test(s) ? [true] : /^(not reviewed|unreviewed|needs review|awaiting review|review required)$/.test(s) ? [false] : []);
  if (checkboxes.length === 1) values.push(checkboxes[0].checked);
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : null;
}
function editor(observation) {
  const options = observation.editors.filter(e => e.visible && !e.readOnly && !e.disabled).filter(e => {
    try { return inputShape(JSON.parse(e.value)); } catch { return false; }
  });
  return options.length === 1 ? options[0] : null;
}
function importControl(observation) {
  const options = observation.imports.filter(i => !i.disabled && !i.multiple &&
    (!i.accept || /json/i.test(i.accept)) && /import|load|open|draft|json/i.test(i.label));
  return options.length === 1 ? options[0] : null;
}
function displayedTotals(observation) {
  const found = [];
  for (const table of observation.tables) {
    if (!table.length) continue;
    const h = table[0].map(s => s.toLowerCase().replace(/[^a-z]/g, ''));
    const p = h.findIndex(s => ['person', 'personid', 'people'].includes(s));
    const t = h.findIndex(s => ['totalminutes', 'trainingminutes', 'totaltrainingminutes', 'minutes'].includes(s));
    if (p < 0 || t < 0) continue;
    const values = {};
    for (const row of table.slice(1)) if (/^-?\d+$/.test(row[t] || '')) {
      if (Object.hasOwn(values, row[p])) { values.duplicate = true; break; }
      values[row[p]] = Number(row[t]);
    }
    if (Object.hasOwn(values, 'P01') && Object.hasOwn(values, 'P02') && !values.duplicate) found.push(values);
  }
  return found.length === 1 ? found[0] : null;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 1 && argv[0] === '--self-check') { console.log(JSON.stringify(selfCheck(), null, 2)); return; }
  const positional = [], flags = {};
  for (let n = 0; n < argv.length; n++) {
    if (argv[n].startsWith('--')) {
      if (!['--deps', '--chrome'].includes(argv[n]) || !argv[n + 1] || argv[n + 1].startsWith('--')) throw new Error('Unknown or missing option');
      flags[argv[n++]] = argv[n];
    } else positional.push(argv[n]);
  }
  if (positional.length !== 2 || !flags['--deps']) throw new Error('Usage: node accept-training.mjs CANDIDATE OUTPUT --deps EXISTING_PROJECT [--chrome EXECUTABLE]');
  const candidateArgument = path.resolve(positional[0]);
  if ((await fs.lstat(candidateArgument)).isSymbolicLink()) throw new Error('Candidate root must not be a symlink');
  const candidate = await fs.realpath(candidateArgument);
  const outputBase = await resolvedFuture(positional[1]);
  if (outputBase === candidate || outputBase.startsWith(candidate + path.sep)) throw new Error('Evidence output must be outside candidate');
  const output = path.join(outputBase, 'training-acceptance-' + randomUUID());
  await fs.mkdir(output, { recursive: true });
  const receipt = {
    version: 1, startedAt: new Date().toISOString(), candidate, output, checks: [],
    provenance: 'Independent browser observations of a staged synthetic candidate; no live generation claim',
    variants: 'Independent undisclosed-before-build inputs, not security-isolated holdouts',
    limits: { harnessWatchdogMs: 300000, browserActionMs: 5000, maxPayloadBytes: 50000000 },
    scopeExclusions: ['Factory consent and Stop', 'Executable packaging', 'Operational policy', 'Human approval decision', 'Complete security isolation'],
    selfCheck: selfCheck(), status: 'ERROR'
  };
  let browser, context, page, timer, sequence = 0, setupError = false;
  const record = (id, status, detail, extra = {}) => {
    const row = { id, status, detail, at: new Date().toISOString(), ...extra }; receipt.checks.push(row); return row;
  };
  const persist = async () => fs.writeFile(path.join(output, 'result.json'), JSON.stringify(receipt, null, 2));
  const capture = async label => {
    const name = String(++sequence).padStart(3, '0') + '-' + label.replace(/[^a-z0-9_-]/gi, '_');
    const observation = await observe(page);
    await fs.writeFile(path.join(output, name + '.dom.json'), JSON.stringify(observation, null, 2));
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, timeout: 5000 });
    return { observation, evidence: [name + '.dom.json', name + '.png'] };
  };
  const click = button => page.locator('button,input[type=button],input[type=submit]').nth(button.index).click();
  async function download(pattern, label) {
    const observation = await observe(page), button = chooseButton(observation, pattern);
    if (!button) return null;
    const event = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await click(button);
    const item = await event;
    if (!item) return null;
    if (await item.failure()) return null;
    const filename = String(++sequence).padStart(3, '0') + '-' + label + '-' + path.basename(item.suggestedFilename()).replace(/[^a-z0-9_.-]/gi, '_');
    const target = path.join(output, filename);
    await item.saveAs(target);
    const stat = await fs.stat(target);
    if (stat.size > 2_000_000) throw new Error('Downloaded evidence exceeds 2 MB bound');
    const bytes = await fs.readFile(target); let json = null;
    try { json = JSON.parse(bytes.toString('utf8')); } catch {}
    return { filename, target, bytes, json, sha256: sha(bytes), size: bytes.length };
  }
  let adapter;
  async function discoverAdapter() {
    const observation = await observe(page), edit = editor(observation);
    if (edit) return { kind: 'canonical-json-editor', index: edit.index };
    const upload = importControl(observation);
    if (!upload) return null;
    const saved = await download(SAVE, 'schema-discovery');
    const inputs = saved?.json ? findInputs(saved.json) : [];
    if (inputs.length !== 1) return null;
    return { kind: 'exported-json-and-file-import', importIndex: upload.index, template: saved.json, inputPath: inputs[0].path, schemaEvidence: saved.filename };
  }
  async function applyInput(input, label) {
    if (!adapter) return { ok: false, reason: 'No unambiguous supported input boundary' };
    if (adapter.kind === 'canonical-json-editor') {
      const locator = page.locator('textarea').nth(adapter.index);
      await locator.fill(JSON.stringify(input, null, 2)); await locator.blur();
      let echoed;
      try { echoed = JSON.parse(await locator.inputValue()); } catch {}
      return { ok: equal(echoed, input), kind: 'Editor value roundtrip only', reason: 'Editor readback does not by itself establish full semantic ingestion' };
    }
    const document = replaceInput(adapter.template, adapter.inputPath, input);
    await page.locator('input[type=file]').nth(adapter.importIndex).setInputFiles({ name: label + '.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)) });
    await sleep(250);
    const saved = await download(SAVE, label + '-roundtrip');
    const inputs = saved?.json ? findInputs(saved.json) : [];
    return { ok: inputs.length === 1 && equal(inputFields(inputs[0].value), input), kind: 'Actual import then export roundtrip', evidence: saved?.filename };
  }
  async function compute(c, label) {
    const entered = await applyInput(c.input, label);
    const before = await capture(label + '-entered');
    if (!entered.ok) return { entered, ...before, judged: { status: 'NOT CHECKED', detail: 'Input roundtrip could not be established' } };
    const button = chooseButton(before.observation, CHECK);
    if (!button) return { entered, ...before, judged: { status: 'NOT CHECKED', detail: 'No unique actual check/solve control' } };
    await click(button);
    // Wait for two equal observable result snapshots; no app-private state is read.
    let observation, previous = '', stable = 0;
    const deadline = Date.now() + 4000;
    do {
      await sleep(150); observation = await observe(page);
      const value = canonical(renderedResult(observation));
      stable = value === previous ? stable + 1 : 0; previous = value;
      if (value !== 'null' && stable >= 2) break;
    } while (Date.now() < deadline);
    const after = await capture(label + '-result');
    const observed = renderedResult(after.observation);
    return { entered, ...after, judged: judge(c, observed) };
  }
  async function markReviewed() {
    const observation = await observe(page), button = chooseButton(observation, REVIEW);
    if (button) await click(button);
    else {
      const controls = observation.review.filter(c => c.visible && !c.disabled && /reviewed|review complete|i (?:have )?reviewed/i.test(c.label));
      if (controls.length !== 1) return null;
      await page.locator('input[type=checkbox]').nth(controls[0].index).check();
    }
    return reviewState((await capture('explicit-review')).observation);
  }
  async function newContext(entry) {
    const next = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await next.setOffline(true);
    await next.route('**/*', route => {
      const protocol = new URL(route.request().url()).protocol;
      if (['http:', 'https:', 'ws:', 'wss:'].includes(protocol)) return route.abort('blockedbyclient');
      return route.continue();
    });
    if (typeof next.routeWebSocket === 'function') await next.routeWebSocket(/.*/, socket => socket.close());
    const opened = await next.newPage(); opened.setDefaultTimeout(5000); opened.setDefaultNavigationTimeout(10000);
    opened.on('dialog', dialog => { void dialog.dismiss(); });
    opened.on('pageerror', error => { receipt.rendererErrors ||= []; receipt.rendererErrors.push(String(error.message).slice(0, 1000)); });
    await opened.goto(pathToFileURL(entry).href, { waitUntil: 'load', timeout: 10000 });
    return { next, opened };
  }
  try {
    timer = setTimeout(() => {
      receipt.status = 'ERROR'; receipt.error = 'Harness watchdog expired'; receipt.finishedAt = new Date().toISOString();
      void persist().finally(async () => {
        const stop = setTimeout(() => process.exit(2), 5000);
        try { await browser?.close(); } catch {}
        clearTimeout(stop); process.exit(2);
      });
    }, receipt.limits.harnessWatchdogMs);
    const keyBytes = await fs.readFile(KEY), contractBytes = await fs.readFile(CONTRACT);
    const keyBlock = /~~~json\s*([\s\S]*?)~~~/g; // Markdown may use either fence style.
    const fenced = keyBytes.toString('utf8').match(/(?:\x60{3}|~{3})json\s*([\s\S]*?)(?:\x60{3}|~{3})/);
    if (!fenced || !equal(JSON.parse(fenced[1]), base)) throw new Error('Frozen golden input differs from evaluator base; review contract revision');
    receipt.contracts = { acceptanceSha256: sha(contractBytes), goldenSha256: sha(keyBytes), scriptSha256: sha(await fs.readFile(SCRIPT)) };
    receipt.cases = cases;
    const staged = path.join(output, 'payload');
    receipt.payloadBefore = await payload(candidate, staged);
    if (!receipt.payloadBefore.files.some(f => f.path === 'index.html')) throw new Error('Candidate has no eligible regular index.html');
    record('PAYLOAD-SCOPE', receipt.payloadBefore.skipped.length ? 'NOT CHECKED' : 'PASS', receipt.payloadBefore.skipped.length ? 'Excluded entries mean complete original payload scope is not established' : 'All bounded regular candidate payload files copied', { skipped: receipt.payloadBefore.skipped });
    const deps = await fs.realpath(flags['--deps']);
    const require = createRequire(path.join(deps, 'package.json'));
    const { chromium } = require('playwright');
    const options = flags['--chrome'] ? [path.resolve(flags['--chrome'])] : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome'];
    let executablePath;
    for (const option of options) { try { await fs.access(option); executablePath = option; break; } catch {} }
    if (!executablePath) throw new Error('Existing Chrome not found; provide --chrome. No browser will be installed');
    receipt.runtime = { node: process.version, platform: process.platform, chromePath: executablePath, playwrightVersion: require('playwright/package.json').version };
    browser = await chromium.launch({ executablePath, headless: true, timeout: 20000, args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run'] });
    receipt.runtime.chromeVersion = browser.version();
    const launched = await newContext(path.join(staged, 'index.html')); context = launched.next; page = launched.opened;
    await capture('cold-offline-launch');
    adapter = await discoverAdapter();
    receipt.adapter = adapter ? { kind: adapter.kind, schemaEvidence: adapter.schemaEvidence, inputPath: adapter.inputPath } : null;
    const fresh = cases.find(c => c.id === 'G02'), original = cases.find(c => c.id === 'G01');
    let calibration = false;
    if (adapter) {
      const one = await compute(fresh, 'calibration-fresh'), two = await compute(original, 'calibration-base');
      calibration = one.entered.ok && two.entered.ok && one.judged.status === 'PASS' && two.judged.status === 'PASS' &&
        !equal(one.judged.observed.assignments, two.judged.observed.assignments);
      record('CAUSAL-INPUT-OUTPUT', calibration ? 'PASS' : 'NOT CHECKED', calibration ? 'Two distinct entered inputs produced their distinct independently expected outputs' : 'Cannot establish current output responsiveness; default/example content is insufficient', { first: one, second: two });
    } else record('CAUSAL-INPUT-OUTPUT', 'NOT CHECKED', 'No unique canonical JSON editor or actual export/import schema discovered');
    for (const c of cases) {
      if (!adapter || !calibration) { record(c.id, 'NOT CHECKED', 'Input/output boundary not established'); continue; }
      const run = await compute(c, c.id);
      record(c.id, run.judged.status, run.judged.detail, { input: c.input, expected: c.expected, entered: run.entered, observed: run.judged.observed, independentArithmetic: run.judged.arithmetic, evidence: run.evidence });
      if (c.expected.status === 'feasible' && run.judged.status === 'PASS') {
        const actual = displayedTotals(run.observation), expected = run.judged.arithmetic.totals;
        record(c.id + '-VISIBLE-TOTALS', actual ? (equal(actual, expected) ? 'PASS' : 'FAIL') : 'NOT CHECKED', actual ? 'Visible numeric personnel totals compared separately' : 'No unique visible personnel-total table; calculated totals do not establish displayed totals', { actual, expected, evidence: run.evidence });
      }
      if (c.expected.status !== 'feasible') {
        record(c.id + '-EXPLANATION', 'NOT CHECKED', 'Officer must assess plain-language conflict explanation and retained editable requests', { expectedReason: c.reason, observedDiagnostics: run.judged.observed?.diagnostics, evidence: run.evidence });
      }
    }
    let reviewedBase, savedBase, savedFresh;
    if (adapter && calibration) {
      const prepared = await compute(original, 'review-base');
      if (prepared.judged.status === 'PASS') reviewedBase = await markReviewed();
      if (reviewedBase === true) {
        savedBase = await download(SAVE, 'reviewed-base-draft');
        const entered = await applyInput(fresh.input, 'review-edit');
        const immediate = await capture('review-immediately-after-edit');
        const immediateState = reviewState(immediate.observation);
        record('REVIEW-EDIT', entered.ok && immediateState !== null ? (immediateState ? 'FAIL' : 'PASS') : 'NOT CHECKED', 'Review state checked after edit and before recheck', { state: immediateState, entered, evidence: immediate.evidence });
        const recalculated = await compute(fresh, 'review-recheck');
        const afterCheck = reviewState(recalculated.observation);
        record('REVIEW-RECHECK', recalculated.judged.status === 'PASS' && afterCheck !== null ? (afterCheck ? 'FAIL' : 'PASS') : 'NOT CHECKED', 'Recheck alone must not approve edited draft', { state: afterCheck, evidence: recalculated.evidence });
        const explicitlyReviewed = await markReviewed();
        record('REVIEW-FRESH', explicitlyReviewed === true ? 'PASS' : 'NOT CHECKED', 'Explicit review of changed, recalculated G02', { state: explicitlyReviewed });
        if (explicitlyReviewed === true) savedFresh = await download(SAVE, 'reviewed-fresh-draft');
      } else {
        for (const id of ['REVIEW-EDIT', 'REVIEW-RECHECK', 'REVIEW-FRESH']) record(id, 'NOT CHECKED', 'No unambiguous established reviewed state/action');
      }
      if (!savedFresh) savedFresh = await download(SAVE, 'fresh-draft-unreviewed');
    } else {
      for (const id of ['REVIEW-EDIT', 'REVIEW-RECHECK', 'REVIEW-FRESH']) record(id, 'NOT CHECKED', 'Input/output boundary not established');
    }
    const summary = adapter ? await download(SUMMARY, 'readable-summary') : null;
    record('READABLE-SUMMARY', 'NOT CHECKED', summary ? 'Actual summary downloaded; independent officer readability and value comparison required' : 'No unambiguous readable-summary download discovered', { file: summary?.filename, sha256: summary?.sha256 });
    const savedInputs = savedFresh?.json ? findInputs(savedFresh.json) : [];
    const exactSaved = savedInputs.length === 1 && equal(inputFields(savedInputs[0].value), fresh.input);
    record('SAVE-INPUT-ROUNDTRIP', savedFresh ? (exactSaved ? 'PASS' : 'NOT CHECKED') : 'NOT CHECKED', exactSaved ? 'Actual downloaded draft preserves all canonical G02 input fields' : 'Complete input acceptance is unestablished; editor echo alone is insufficient', { file: savedFresh?.filename, sha256: savedFresh?.sha256 });
    if (savedFresh && exactSaved) {
      await context.close();
      const reopened = await newContext(path.join(staged, 'index.html')); context = reopened.next; page = reopened.opened;
      const empty = await capture('fresh-context-before-import');
      const upload = importControl(empty.observation);
      if (upload) {
        await page.locator('input[type=file]').nth(upload.index).setInputFiles(savedFresh.target);
        await sleep(300);
        const restored = await capture('fresh-context-after-import');
        const exported = await download(SAVE, 'reimported-roundtrip');
        const values = exported?.json ? findInputs(exported.json) : [];
        const inputsMatch = values.length === 1 && equal(inputFields(values[0].value), fresh.input);
        const judged = judge(fresh, renderedResult(restored.observation));
        record('OFFLINE-FRESH-IMPORT', inputsMatch ? judged.status : 'NOT CHECKED', inputsMatch ? 'Fresh offline context imported exact downloaded draft; rendered values checked before any recompute' : 'Could not establish complete input roundtrip after fresh-context import', { observed: judged.observed, file: savedFresh.filename, roundtrip: exported?.filename, evidence: restored.evidence });
        record('IMPORTED-REVIEW-BINDING', 'NOT CHECKED', 'Visible reviewed state alone cannot prove version binding; inspect record identity and edited-import check', { observedReviewState: reviewState(restored.observation) });
        const oldInputs = savedBase?.json ? findInputs(savedBase.json) : [];
        if (oldInputs.length === 1) {
          const changed = replaceInput(savedBase.json, oldInputs[0].path, fresh.input);
          await page.locator('input[type=file]').nth(upload.index).setInputFiles({ name: 'edited-previously-reviewed.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(changed)) });
          await sleep(300);
          const edited = await capture('edited-reviewed-metadata-import');
          const echo = await download(SAVE, 'edited-import-roundtrip');
          const v = echo?.json ? findInputs(echo.json) : [];
          const accepted = v.length === 1 && equal(inputFields(v[0].value), fresh.input);
          const state = reviewState(edited.observation);
          record('EDITED-IMPORT-REVIEW', accepted && state !== null ? (state ? 'FAIL' : 'PASS') : 'NOT CHECKED', 'Changed input imported in original reviewed draft envelope without changing its other metadata', { acceptedInputRoundtrip: accepted, reviewState: state, evidence: edited.evidence, roundtrip: echo?.filename });
        } else record('EDITED-IMPORT-REVIEW', 'NOT CHECKED', 'Reviewed-base download has no unique full input schema');
      } else {
        for (const id of ['OFFLINE-FRESH-IMPORT', 'IMPORTED-REVIEW-BINDING', 'EDITED-IMPORT-REVIEW']) record(id, 'NOT CHECKED', 'No unique ordinary file-import control in fresh context');
      }
    } else {
      for (const id of ['OFFLINE-FRESH-IMPORT', 'IMPORTED-REVIEW-BINDING', 'EDITED-IMPORT-REVIEW']) record(id, 'NOT CHECKED', 'No exact saved G02 draft available');
    }
    record('GUIDE-AND-HUMAN-DECISION', 'NOT CHECKED', 'Officer must follow the delivered guide and decide on this exact artifact scope; automation does not grant approval');
    receipt.payloadAfter = await payload(candidate);
    receipt.stagedAfter = await payload(staged);
    record('PAYLOAD-BYTES', equal(receipt.payloadBefore.files, receipt.payloadAfter.files) && equal(receipt.payloadBefore.files, receipt.stagedAfter.files) ? 'PASS' : 'FAIL', 'Original before/after and staged payload byte manifests compared');
    if (receipt.rendererErrors?.length) record('RENDERER-ERRORS', 'FAIL', 'Uncaught browser errors observed', { errors: receipt.rendererErrors });
  } catch (error) {
    setupError = true; receipt.error = String(error?.stack || error).slice(0, 4000);
    record('HARNESS', 'ERROR', String(error?.message || error));
  } finally {
    clearTimeout(timer);
    if (browser) {
      try {
        await Promise.race([browser.close(), sleep(5000).then(() => { throw new Error('Owned browser close exceeded five seconds'); })]);
        receipt.browserCleanup = 'PASS';
      } catch (error) { receipt.browserCleanup = 'UNCONFIRMED'; setupError = true; receipt.cleanupError = String(error.message); }
    }
    const failed = receipt.checks.some(c => c.status === 'FAIL');
    const incomplete = receipt.checks.some(c => c.status === 'NOT CHECKED');
    receipt.status = setupError ? 'ERROR' : failed ? 'FAIL' : incomplete ? 'INCOMPLETE' : 'PASS';
    receipt.finishedAt = new Date().toISOString();
    await persist();
    const exit = setupError ? 2 : failed ? 1 : incomplete ? 3 : 0;
    console.log(JSON.stringify({ status: receipt.status, exit, output, counts: Object.fromEntries(['PASS', 'FAIL', 'NOT CHECKED', 'ERROR'].map(s => [s, receipt.checks.filter(c => c.status === s).length])) }));
    process.exitCode = exit;
    if (receipt.browserCleanup === 'UNCONFIRMED') process.exit(exit);
  }
}
main().catch(error => { console.error('Acceptance setup error: ' + String(error?.message || error)); process.exitCode = 2; });
