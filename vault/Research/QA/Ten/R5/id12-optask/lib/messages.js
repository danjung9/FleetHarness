import { timestamp } from './validation.js';
export const disclosure = 'Synthetic, not validated against the real USMTF format.';
export const idPattern = /^[A-Z0-9-]+$/;
export function validDay(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && timestamp(s + 'T00:00Z') !== null;
}
export function scanLines(raw) {
  const lines = []; let start = 0;
  for (const part of raw.split('\n')) {
    const text = part.endsWith('\r') ? part.slice(0, -1) : part;
    lines.push({ line: lines.length + 1, range: { start, end: start + text.length, text } });
    start += part.length + 1;
  }
  return lines;
}
const span = (line, start, text) => ({ start: line.range.start + start, end: line.range.start + start + text.length, text });
const stamp = s => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(s) ? timestamp(s)?.replace('.000Z', 'Z') || null : null;
const stampError = s => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? 'MISSING_ZONE' : 'INVALID_DATE';
export function parseDocument({ documentId, rawText }, selectedDay) {
  const lines = scanLines(rawText); const reviewItems = []; const events = [];
  const diagnostic = (line, code) => reviewItems.push({ documentId, line: line.line, code, source: line.range });
  const nonempty = lines.filter(l => l.range.text !== '');
  const fallback = lines[lines.length - 1];
  const bad = i => { diagnostic(lines[i] || fallback, 'INVALID_HEADER'); return { events, reviewItems, header: null }; };
  if (lines[0]?.range.text !== 'SYNTHETIC / NOT VALIDATED AGAINST REAL USMTF') return bad(0);
  const msg = /^MSGID\/OPTASK\/([A-Z0-9-]+)\/REV=([1-9]\d*)\/\/$/.exec(lines[1]?.range.text || '');
  if (!msg || !Number.isSafeInteger(+msg[2])) return bad(1);
  const unit = /^UNIT\/([A-Z0-9-]+)\/\/$/.exec(lines[2]?.range.text || '');
  if (!unit) return bad(2);
  const day = /^DAY\/(\d{4}-\d{2}-\d{2})\/ZONE=Z\/\/$/.exec(lines[3]?.range.text || '');
  if (!day || !validDay(day[1])) return bad(3);
  const last = nonempty.at(-1);
  const earlyEnd = lines.slice(4).find(l => l.range.text === 'ENDMSG//' && l !== last);
  if (earlyEnd) { diagnostic(earlyEnd, 'INVALID_HEADER'); return { events, reviewItems, header: null }; }
  if (!last || last.line < 5 || last.range.text !== 'ENDMSG//') { diagnostic(last || fallback, 'INVALID_HEADER'); return { events, reviewItems, header: null }; }
  const header = { documentId, fields: {
    messageId: span(lines[1], 13, msg[1]), shipId: span(lines[2], 5, unit[1]),
    revision: span(lines[1], 13 + msg[1].length + 5, msg[2]),
    selectedDay: span(lines[3], 4, day[1]), displayZone: span(lines[3], 20, 'Z')
  } };
  const body = lines.slice(4, last.line - 1).filter(l => l.range.text);
  const ids = new Map();
  for (const l of body) {
    const m = /^(?:FREQPLAN|CRYPTO|FLIGHTQ)\/ID=([^/]*)\//.exec(l.range.text);
    if (m && idPattern.test(m[1])) ids.set(m[1], (ids.get(m[1]) || 0) + 1);
  }
  for (const l of body) {
    const text = l.range.text;
    if (text.startsWith('REMARK/') && text.endsWith('//')) continue;
    const category = text.split('/')[0];
    if (!['FREQPLAN', 'CRYPTO', 'FLIGHTQ'].includes(category)) { diagnostic(l, 'UNSUPPORTED_LINE'); continue; }
    const localId = /\/ID=([^/]*)\//.exec(text)?.[1];
    if (ids.get(localId) > 1) { diagnostic(l, 'DUPLICATE_ID'); continue; }
    if (category !== 'FLIGHTQ' && !/\/END=/.test(text)) { diagnostic(l, 'MISSING_END'); continue; }
    const expected = category === 'FREQPLAN' ? ['ID','PLAN','NET','MHZ','UNIT','START','END'] : category === 'CRYPTO' ? ['ID','REF','START','END'] : ['ID','CONTEXT','START', ...(text.includes('/END=') ? ['END'] : [])];
    const parts = text.endsWith('//') ? text.slice(0, -2).split('/').slice(1) : [];
    const fields = { category: span(l, 0, category) }; const originalFields = {}; let pos = category.length + 1; let malformed = parts.length !== expected.length;
    for (let i = 0; i < parts.length; i++) {
      const key = expected[i]; const part = parts[i];
      if (!key || !part.startsWith(key + '=') || part.length === key.length + 1) { malformed = true; continue; }
      const val = part.slice(key.length + 1); if (/[\r\n]/.test(val)) malformed = true; originalFields[key] = val;
      fields[key] = span(l, pos + key.length + 1, val); pos += part.length + 1;
    }
    if (!idPattern.test(originalFields.ID || '') || (category === 'FREQPLAN' && originalFields.UNIT !== 'MHz')) malformed = true;
    if (malformed) { diagnostic(l, 'MALFORMED_RECORD'); continue; }
    let frequencyMHz = null;
    if (category === 'FREQPLAN') {
      frequencyMHz = +originalFields.MHZ;
      if (!/^\d+(\.\d+)?$/.test(originalFields.MHZ) || !Number.isFinite(frequencyMHz) || frequencyMHz <= 0) { diagnostic(l, 'INVALID_FREQUENCY'); continue; }
    }
    const startUtc = stamp(originalFields.START); const endUtc = originalFields.END === undefined ? null : stamp(originalFields.END);
    if (!startUtc) { diagnostic(l, stampError(originalFields.START)); continue; }
    if (originalFields.END !== undefined && !endUtc) { diagnostic(l, stampError(originalFields.END)); continue; }
    if (endUtc && Date.parse(endUtc) <= Date.parse(startUtc)) { diagnostic(l, 'END_BEFORE_START'); continue; }
    const midnight = Date.parse(selectedDay + 'T00:00Z');
    const startMinute = (Date.parse(startUtc) - midnight) / 60000;
    const endMinute = endUtc ? (Date.parse(endUtc) - midnight) / 60000 : startMinute;
    const visible = endUtc ? startMinute < 1440 && endMinute > 0 : startMinute >= 0 && startMinute < 1440;
    events.push({ eventId: originalFields.ID, documentId, category, messageId: msg[1], shipId: unit[1], revision: +msg[2], originalFields,
      normalized: { startUtc, endUtc, frequencyMHz }, kind: endUtc ? 'interval' : 'point', durationMinutes: endMinute - startMinute,
      selectedDay: { startMinute, endMinute, visible, clippedStartMinute: visible ? Math.max(0, startMinute) : null, clippedEndMinute: visible ? Math.min(1440, endMinute) : null },
      reviewStatus: 'unreviewed', source: { line: l.line, range: l.range, fields } });
  }
  return { events, reviewItems, header };
}
