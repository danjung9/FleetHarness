import { disclosure, idPattern, validDay, parseDocument, scanLines } from './lib/messages.js';
import { compareText } from './lib/validation.js';
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const keys = (x, allowed, required) => obj(x) && Object.keys(x).every(k => allowed.includes(k)) && required.every(k => Object.hasOwn(x, k));
export async function compute(input, { signal } = {}) {
  const envelope = (status, error, events = [], reviewItems = [], headers = []) => ({ status, error, disclosure, events, reviewItems, headers });
  const fail = e => envelope('error', e);
  if (!keys(input, ['documents','selectedDay','shipId','decisions'], ['documents','selectedDay']) || !Array.isArray(input.documents) || input.documents.length > 32 || typeof input.selectedDay !== 'string' || (input.shipId !== undefined && input.shipId !== null && typeof input.shipId !== 'string') || (input.decisions !== undefined && !Array.isArray(input.decisions))) return fail('INVALID_REQUEST');
  if (input.documents.some(d => !keys(d, ['documentId','rawText'], ['documentId','rawText']) || typeof d.documentId !== 'string' || !d.documentId.length || d.documentId.length > 80 || !idPattern.test(d.documentId) || typeof d.rawText !== 'string' || d.rawText.length > 500000)) return fail('INVALID_REQUEST');
  const decisions = input.decisions ?? [];
  if (decisions.some(d => !keys(d, ['documentId','eventId','decision'], ['documentId','eventId','decision']) || typeof d.documentId !== 'string' || typeof d.eventId !== 'string' || typeof d.decision !== 'string')) return fail('INVALID_REQUEST');
  if (!input.documents.length || input.documents.some(d => !d.rawText.trim())) return fail('EMPTY_INPUT');
  if (!validDay(input.selectedDay)) return fail('INVALID_DAY');
  if (input.shipId != null && !idPattern.test(input.shipId)) return fail('INVALID_SHIP');
  let events = []; const headers = []; const reviewItems = []; const unique = new Map(); const conflicts = new Set(); const order = new Map();
  for (const d of input.documents) {
    if (signal?.aborted) throw signal.reason;
    if (!unique.has(d.documentId)) { unique.set(d.documentId, d); order.set(d.documentId, order.size); }
    else if (unique.get(d.documentId).rawText !== d.rawText) conflicts.add(d.documentId);
  }
  for (const d of unique.values()) {
    if (conflicts.has(d.documentId)) { reviewItems.push({ documentId: d.documentId, line: 1, code: 'DOCUMENT_ID_CONFLICT', source: scanLines(d.rawText)[0].range }); continue; }
    const p = parseDocument(d, input.selectedDay); events.push(...p.events); reviewItems.push(...p.reviewItems); if (p.header) headers.push(p.header);
  }
  const chosen = new Map();
  for (const d of decisions) {
    const key = d.documentId + ':' + d.eventId;
    if (!idPattern.test(d.documentId) || !idPattern.test(d.eventId) || !['include','exclude'].includes(d.decision) || chosen.has(key) || events.filter(e => e.documentId === d.documentId && e.eventId === d.eventId).length !== 1) return fail('INVALID_DECISIONS');
    chosen.set(key, d.decision);
  }
  const groups = new Map();
  for (const e of events) {
    const groupKey = JSON.stringify([e.messageId, e.shipId, e.eventId]);
    if (!groups.has(groupKey)) groups.set(groupKey, []); groups.get(groupKey).push(e);
    const decision = chosen.get(e.documentId + ':' + e.eventId); if (decision) e.reviewStatus = decision === 'include' ? 'included' : 'excluded';
  }
  for (const group of groups.values()) {
    if (new Set(group.map(e => e.revision)).size < 2) continue;
    const resolved = group.every(e => chosen.has(e.documentId + ':' + e.eventId)) && group.filter(e => e.reviewStatus === 'included').length === 1;
    if (!resolved) for (const e of group) { e.reviewStatus = 'revision_review'; reviewItems.push({ documentId: e.documentId, line: e.source.line, code: 'REVISION_REVIEW', source: e.source.range }); }
  }
  events = events.filter(e => input.shipId == null || e.shipId === input.shipId);
  events.sort((a,b) => compareText(a.normalized.startUtc, b.normalized.startUtc) || compareText(a.documentId,b.documentId) || a.source.line-b.source.line);
  reviewItems.sort((a,b) => order.get(a.documentId)-order.get(b.documentId) || a.line-b.line || compareText(a.code,b.code));
  return envelope(reviewItems.length || events.some(e => ['unreviewed','revision_review'].includes(e.reviewStatus)) ? 'review' : 'ok', null, events, reviewItems, headers);
}
