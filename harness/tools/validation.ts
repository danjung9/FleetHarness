export function object(value: unknown, label = 'input'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
export function text(value: unknown, label: string, max = 1000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} must be a nonempty string of at most ${max} characters.`);
  return value;
}
export function integer(value: unknown, label: string, min = 0, max = 1_000_000_000): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  return value as number;
}
export function array(value: unknown, label: string, max = 1000): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${label} must be an array of at most ${max} items.`);
  return value;
}
export function strings(value: unknown, label: string, max = 100): string[] {
  const result = array(value, label, max).map((x, i) => text(x, `${label}[${i}]`, 200));
  if (new Set(result).size !== result.length) throw new Error(`${label} cannot contain duplicates.`);
  return result;
}
export function unique<T extends {id: string}>(items: T[], label: string): T[] {
  if (new Set(items.map(x => x.id)).size !== items.length) throw new Error(`${label} contains duplicate IDs.`);
  return items;
}
/** Strict ISO timestamp with an explicit timezone, rejecting JS Date rollover. */
export function timestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d, h, n, s = '0', zone] = match;
  const year = +y, month = +m, day = +d;
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || +h > 23 || +n > 59 || +s > 59) return null;
  if (zone !== 'Z' && (+zone.slice(1,3) > 14 || +zone.slice(4) > 59 || (+zone.slice(1,3) === 14 && +zone.slice(4) !== 0))) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b]) => compareText(a,b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
/** Code-unit order is stable across device locales, unlike localeCompare. */
export function compareText(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
