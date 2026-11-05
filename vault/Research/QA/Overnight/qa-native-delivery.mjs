// Native delivery checker. Main owns runtime execution.
import assert from 'node:assert/strict';
import { promises as fs, constants, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

// node qa-native-delivery.mjs REPO EXISTING_OUTPUT [--chrome EXECUTABLE]
// No fixed commit. Local provider AND judge are deterministic fixtures.
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const self = fileURLToPath(import.meta.url), stamp = () => new Date().toISOString();
const need = (condition, message) => { if (!condition) throw new Error(message); };
const inside = (root, file) => { const r = path.relative(root, file); return r !== '' && r !== '..' && !r.startsWith('..' + path.sep) && !path.isAbsolute(r); };
const fixtureNames = ['mock-provider.mjs', 'quality-fixture.mjs', 'solution-fixture.mjs', 'data-fixture.mjs', 'visual-review-fixture.mjs'];
const rowIds = ['NATIVE-COMPLETE-BUILD', 'REVIEW-EVIDENCE', 'NATIVE-PREVIEW-CHANGED-INPUTS', 'HUMAN-REVIEW-GATES', 'STALE-APPROVAL-DENIED', 'RESTORED-SOURCE-APPROVED', 'STALE-EXPORT-DENIED', 'ACTUAL-SOURCE-EXPORT', 'FRESH-EXPORTED-COPY', 'FINAL-NATIVE-STATE'];
const denialText = 'Artifacts changed after verification. Start a new run before approving or exporting.';
const acknowledgment = 'I inspected the application, test evidence, and limitations.';
const reviewNotes = 'Exercised changed synthetic TASK inputs, empty-input recovery, persisted draft behavior and visible evidence. This approves only the local prototype fixture; operational readiness remains unverified.';
// Independently authored literals. No generated test, solver or report supplies answers.
const previewCases = [
  { id: 'P1', input: 'TASK: inspect synthetic valve 47', output: 'inspect synthetic valve 47', draft: 'Synthetic review draft: inspect synthetic valve 47. Publication requires owner approval.' },
  { id: 'P2', input: 'TASK: stage blue training crates', output: 'stage blue training crates', draft: 'Synthetic review draft: stage blue training crates. Publication requires owner approval.' },
  { id: 'P3', input: '', output: 'Enter a message.' },
  { id: 'P4', input: 'TASK: audit training row 19', output: 'audit training row 19', draft: 'Synthetic review draft: audit training row 19. Publication requires owner approval.' }
];
const exportCases = [
  { id: 'E1', input: 'TASK: count fictional orange bins 28', output: 'count fictional orange bins 28', draft: 'Synthetic review draft: count fictional orange bins 28. Publication requires owner approval.' },
  { id: 'E2', input: 'TASK: label synthetic pallet 63', output: 'label synthetic pallet 63', draft: 'Synthetic review draft: label synthetic pallet 63. Publication requires owner approval.' },
  { id: 'E3', input: '', output: 'Enter a message.' },
  { id: 'E4', input: 'TASK: inspect invented panel 91', output: 'inspect invented panel 91', draft: 'Synthetic review draft: inspect invented panel 91. Publication requires owner approval.' }
];
function checkObservations(cases, observations) {
  assert.equal(observations.length, cases.length, 'Every independent input needs an observation.');
  for (let i = 0; i < cases.length; i++) {
    const expected = cases[i], actual = observations[i];
    assert.equal(actual.id, expected.id); assert.equal(actual.input, expected.input);
    assert.equal(actual.output, expected.output, 'Incorrect current result for ' + expected.id);
    assert.equal(actual.draftImmediatelyAfterParse, '', 'Parsing must invalidate the previous review draft.');
    if (expected.draft !== undefined) assert.equal(actual.draftAfterPrepare, expected.draft);
  }
}
const reviewGate = (notes, ack) => typeof notes === 'string' && notes.trim().length >= 10 && ack === true;
function guardState(p) { return { id: p.id, runId: p.runId, workspace: p.workspace, status: p.status, report: p.report, verification: p.verification, approval: p.approval, approvedAt: p.approvedAt, exportedTo: p.exportedTo, reviewHistory: p.reviewHistory, feedback: p.feedback, stages: p.stages }; }
function assertDenied(before, after, error, chooserDelta, destinations) {
  assert.ok(typeof error === 'string' && error.includes(denialText), 'Expected explicit stale-source denial.');
  assert.deepEqual(guardState(after), guardState(before), 'A denied action must not approve, export or change its evidence.');
  assert.equal(chooserDelta, 0, 'Deny stale evidence before the folder chooser.'); assert.deepEqual(destinations, [], 'Denied export must not create a delivery directory.');
}
function behaviorVerdict(rows) { if (rows.some(r => r.result === 'FAIL')) return 'FAIL'; return rows.length === rowIds.length && rows.every(r => r.result === 'PASS') ? 'PASS' : 'ERROR'; }
const finalVerdict = (behavior, errors, stable, cleanup) => errors.length || stable !== true || cleanup !== 'PASS' ? 'ERROR' : behavior;
// Independent v2 source-record framing, for byte identity only.
function sourceHasher() {
  const h = createHash('sha256').update('AppYard source hash v2\0');
  return { add(name, bytes) { const key = Buffer.from(name), lengths = Buffer.alloc(8); lengths.writeUInt32BE(key.length, 0); lengths.writeUInt32BE(bytes.length, 4); h.update(lengths).update(key).update(bytes); }, finish: () => h.digest('hex') };
}
function sourceDigest(files) { const h = sourceHasher(); for (const f of files) h.add(f.path, f.contents); return h.finish(); }
function summarizeRequest(body, index) {
  const text = m => typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map(p => p?.text || '').join('\n') : '';
  const prompt = (body.messages || []).filter(m => m?.role === 'user' && !(Array.isArray(m.content) && m.content.some(p => p?.type === 'image_url'))).map(text).join('\n');
  let phase = 'unknown';
  if (body.tools?.some(t => t.function?.name === 'judge_read')) phase = 'judge';
  else if (prompt.includes('Implementation is complete.')) phase = 'guide';
  else if (prompt.includes('The independent test run failed')) phase = 'repair';
  else for (const [marker, name] of [['implementation', 'build'], ['verification', 'verify'], ['synthetic data', 'data'], ['intake', 'intake'], ['research', 'research'], ['planning', 'plan']]) if (prompt.includes('You are the ' + marker + ' agent')) { phase = name; break; }
  return { index, phase, model: body.model, sha256: sha(JSON.stringify(body)), messageCount: body.messages?.length, deterministicLocalProvider: true };
}
if (process.argv[2] === '--validate-only') {
  for (const cases of [previewCases, exportCases]) {
    const good = cases.map(c => ({ id: c.id, input: c.input, output: c.output, draftImmediatelyAfterParse: '', ...(c.draft ? { draftAfterPrepare: c.draft } : {}) })); checkObservations(cases, good);
    for (const override of [{ output: 'inspect pump' }, { output: good[0].output }, { draftImmediatelyAfterParse: 'old draft' }, { draftAfterPrepare: 'constant draft' }, { output: undefined }]) assert.throws(() => checkObservations(cases, good.map(o => ({ ...o, ...override }))));
    assert.throws(() => checkObservations(cases, good.slice(1)));
  }
  for (const [notes, ack, expected] of [['', false, false], ['', true, false], ['short', true, false], [reviewNotes, false, false], [reviewNotes, true, true]]) assert.equal(reviewGate(notes, ack), expected);
  const p = { id: 'p', runId: 'r', status: 'review', stages: [{ id: 'review', status: 'review' }], report: { sourceHash: 'a' } };
  assertDenied(p, structuredClone(p), denialText, 0, []);
  assert.throws(() => assertDenied(p, { ...p, status: 'approved' }, denialText, 0, [])); assert.throws(() => assertDenied(p, p, 'Export failed.', 0, []));
  assert.throws(() => assertDenied(p, p, denialText, 1, [])); assert.throws(() => assertDenied(p, p, denialText, 0, ['copy']));
  const a = sourceDigest([{ path: 'ab', contents: Buffer.from('c') }]); assert.notEqual(a, sourceDigest([{ path: 'a', contents: Buffer.from('bc') }])); assert.notEqual(a, sourceDigest([{ path: 'ab', contents: Buffer.from('changed') }]));
  assert.equal(inside('/owned', '/owned/work'), true); assert.equal(inside('/owned', '/owned-other/work'), false);
  const passes = rowIds.map(id => ({ id, result: 'PASS' })); assert.equal(behaviorVerdict(passes), 'PASS'); assert.equal(behaviorVerdict(passes.slice(1)), 'ERROR'); assert.equal(behaviorVerdict([...passes.slice(1), { result: 'FAIL' }]), 'FAIL');
  assert.equal(finalVerdict('PASS', [], true, 'PASS'), 'PASS'); assert.equal(finalVerdict('FAIL', [], true, 'PASS'), 'FAIL');
  for (const args of [['PASS', ['setup'], true, 'PASS'], ['PASS', [], false, 'PASS'], ['FAIL', [], true, 'UNCONFIRMED']]) assert.equal(finalVerdict(...args), 'ERROR');
  console.log(JSON.stringify({ validationOnly: true, passed: true, nativeExecuted: false, listenersOpened: false, controls: ['literal independent parser answers', 'canned/stale/missing result rejection', 'draft invalidation', 'notes and acknowledgment', 'denial/no mutation', 'source framing', 'ownership', 'verdict sensitivity'] })); process.exit(0);
}
