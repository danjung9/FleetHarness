import { array, compareText, integer, object, text, timestamp, unique } from './validation.js';

export function searchEvidence(input: unknown) {
  const data = object(input);
  const query = text(data.query, 'query', 1000);
  const asOf = timestamp(data.asOf); if (!asOf) throw new Error('asOf must be an explicit timestamp.');
  const maxAgeDays = integer(data.maxAgeDays ?? 90, 'maxAgeDays', 0, 36500);
  const limit = integer(data.limit ?? 5, 'limit', 1, 20);
  const terms = [...new Set(query.toLocaleLowerCase('en').match(/[\p{L}\p{N}]{2,}/gu) ?? [])];
  const docs = unique(array(data.documents, 'documents', 200).map(x => {
    const d = object(x); const updatedAt = timestamp(d.updatedAt); if (!updatedAt) throw new Error('Document updatedAt is invalid.');
    if (typeof d.approved !== 'boolean') throw new Error('Document approved must be a boolean.');
    return {id: text(d.id, 'document.id', 200), title: text(d.title, 'title', 500),
      source: text(d.source, 'source', 2000), text: text(d.text, 'document.text', 100_000), approved: d.approved, updatedAt};
  }), 'documents');
  const results = docs.filter(d => d.approved && d.updatedAt <= asOf).flatMap(d => {
    const lower = d.text.toLocaleLowerCase('en');
    const found = terms.filter(term => lower.includes(term));
    if (!found.length) return [];
    // Derive source offsets against original text (case folding can change length).
    const escaped = found[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(escaped, 'iu').exec(d.text);
    const at = match?.index ?? 0, start = Math.max(0, at-80), end = Math.min(d.text.length, at+320);
    const ageDays = (Date.parse(asOf)-Date.parse(d.updatedAt))/86_400_000;
    return [{id: d.id, title: d.title, source: d.source, updatedAt: d.updatedAt, score: found.length/terms.length,
      stale: ageDays > maxAgeDays, excerpt: {start, end, text: d.text.slice(start,end)}}];
  }).sort((a,b) => b.score-a.score || compareText(a.id,b.id)).slice(0, limit);
  return { status: results.length ? 'matches' : 'unknown', results, note: 'Lexical retrieval only. A match is evidence to inspect, not a factual answer or applicability judgment.' };
}
