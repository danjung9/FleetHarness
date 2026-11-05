import { object, text, timestamp } from './validation.js';

export interface SourceSpan { start: number; end: number; text: string }
export interface MessageItem {
  id: string; kind: 'EVENT' | 'TASK'; owner: string; description: string;
  start: string | null; end: string | null; due: string | null;
  sourceId: string; source: SourceSpan; fields: Record<string, SourceSpan>; reviewReasons: string[];
}
/** Synthetic format only. Offsets are UTF-16 string indices, not bytes. */
export function extractMessages(input: unknown) {
  const data = object(input);
  const sourceId = text(data.sourceId, 'sourceId', 200);
  if (typeof data.text !== 'string' || data.text.length > 200_000) throw new Error('text must be a string of at most 200,000 characters.');
  const original = data.text;
  const items: MessageItem[] = [], warnings: { line: number; reason: string; source: SourceSpan }[] = [];
  const ids = new Set<string>();
  let offset = 0;
  for (const [lineIndex, raw] of original.split('\n').entries()) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const start = offset; offset += raw.length + 1;
    if (!line.trim()) continue;
    const source = { start, end: start + line.length, text: line };
    const tokens = line.endsWith('//') ? line.slice(0, -2).split('/') : [];
    const kind = tokens[0];
    if (!((kind === 'EVENT' && tokens.length === 6) || (kind === 'TASK' && tokens.length === 5))) {
      warnings.push({ line: lineIndex + 1, reason: 'Unsupported line: expected documented EVENT or TASK synthetic grammar.', source }); continue;
    }
    const names = kind === 'EVENT' ? ['kind','id','start','end','owner','description'] : ['kind','id','due','owner','description'];
    const fields: Record<string, SourceSpan> = {};
    let fieldOffset = start;
    names.forEach((name, i) => { fields[name] = { start: fieldOffset, end: fieldOffset + tokens[i].length, text: tokens[i] }; fieldOffset += tokens[i].length + 1; });
    const reasons: string[] = [];
    const id = tokens[1];
    if (!id.trim()) reasons.push('Missing identifier.');
    else if (ids.has(id)) reasons.push('Duplicate identifier; retain both source records for review.');
    ids.add(id);
    if (!fields.owner.text.trim()) reasons.push('Missing owner.');
    if (!fields.description.text.trim()) reasons.push('Missing description.');
    const item: MessageItem = { id, kind, owner: fields.owner.text, description: fields.description.text,
      start: null, end: null, due: null, sourceId, source, fields, reviewReasons: reasons };
    for (const name of (kind === 'EVENT' ? ['start', 'end'] : ['due']) as ('start'|'end'|'due')[]) {
      item[name] = timestamp(fields[name].text);
      if (!item[name]) reasons.push(`${name}: missing or invalid date/time, or timezone not explicit.`);
    }
    if (item.start && item.end && item.end <= item.start) reasons.push('Event end must be later than start.');
    items.push(item);
  }
  return { sourceId, grammar: 'fleet-synthetic-message/v1', offsetUnit: 'UTF-16', items, warnings,
    needsReview: warnings.length > 0 || items.some(item => item.reviewReasons.length > 0) };
}
