import type { ContextItem } from './types.js';

// Public marking names used only as detector rules. No restricted documents.
// The item is excluded as a whole before any text is redacted or persisted.
const bannerNames = ['CUI', 'CONTROLLED', 'CONTROLLED UNCLASSIFIED INFORMATION', 'FOUO', 'FOR OFFICIAL USE ONLY', 'CONFIDENTIAL', 'SECRET', 'TOP SECRET'];
export function hasMarking(item: ContextItem): boolean {
  return Object.values(item).some(value => typeof value === 'string' && (
    value.split(/\r?\n/).some(line => {
      const banner = line.trim().toUpperCase().replace(/^UNCLASSIFIED\s*\/\/\s*/, '');
      return bannerNames.some(name => banner === name || banner.startsWith(name + '//') || banner.startsWith(name + ' //') || banner.startsWith(name + ' '));
    }) || /\((?:CUI(?:\/\/[^)\n]*)?|TS|S|C|FOUO)\)/.test(value) || /\bNOFORN\b|\bREL TO USA\b/i.test(value)
  ));
}
export function redact(text: string): string {
  return text.replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email hidden]')
    .replace(/\b\d{3}[- ]\d{2}[- ]\d{4}\b/g, '[number hidden]')
    .replace(/(?<!\w)(?:\+\d{1,3}[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}(?!\w)/g, '[phone hidden]');
}
export function sanitizeItems(input: ContextItem[], maxItems = 100, maxBytes = 512_000) {
  if (!Array.isArray(input) || input.length > 10_000) throw new Error('This source returned too much data. Choose a smaller set.');
  const items: ContextItem[] = []; let excluded = 0, redacted = 0, limited = 0, bytes = 2;
  for (const raw of input) {
    if (!raw || typeof raw !== 'object' || typeof raw.body !== 'string' || typeof raw.title !== 'string' || !['email', 'event', 'file', 'record'].includes(raw.kind)) throw new Error('This source returned unreadable data. Try sample data.');
    if (hasMarking(raw)) { excluded++; continue; }
    // No arbitrary provider fields, remote IDs or signed source links are copied.
    const item: ContextItem = { id: 'item-' + (items.length + 1), kind: raw.kind, title: redact(raw.title), body: redact(raw.body) };
    if (raw.when && /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z)?$/.test(raw.when)) item.when = raw.when;
    if (raw.from) item.from = '[sender hidden]';
    if (item.title !== raw.title || item.body !== raw.body || raw.from) redacted++;
    const size = Buffer.byteLength(JSON.stringify(item)) + 1;
    if (items.length >= maxItems || bytes + size > maxBytes) { limited++; continue; }
    bytes += size; items.push(item);
  }
  return { items, excluded, redacted, limited };
}
