export function object(value, label = 'input') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(`${label} must be an object.`);
    return value;
}
export function text(value, label, max = 1000) {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
        throw new Error(`${label} must be a nonempty string of at most ${max} characters.`);
    return value;
}
export function integer(value, label, min = 0, max = 1_000_000_000) {
    if (!Number.isSafeInteger(value) || value < min || value > max)
        throw new Error(`${label} must be an integer between ${min} and ${max}.`);
    return value;
}
export function array(value, label, max = 1000) {
    if (!Array.isArray(value) || value.length > max)
        throw new Error(`${label} must be an array of at most ${max} items.`);
    return value;
}
export function strings(value, label, max = 100) {
    const result = array(value, label, max).map((x, i) => text(x, `${label}[${i}]`, 200));
    if (new Set(result).size !== result.length)
        throw new Error(`${label} cannot contain duplicates.`);
    return result;
}
export function unique(items, label) {
    if (new Set(items.map(x => x.id)).size !== items.length)
        throw new Error(`${label} contains duplicate IDs.`);
    return items;
}
/** Strict ISO timestamp with an explicit timezone, rejecting JS Date rollover. */
export function timestamp(value) {
    if (typeof value !== 'string')
        return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match)
        return null;
    const [, y, m, d, h, n, s = '0', zone] = match;
    const year = +y, month = +m, day = +d;
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || +h > 23 || +n > 59 || +s > 59)
        return null;
    if (zone !== 'Z' && (+zone.slice(1, 3) > 14 || +zone.slice(4) > 59 || (+zone.slice(1, 3) === 14 && +zone.slice(4) !== 0)))
        return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}
export function canonical(value) {
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object')
        return `{${Object.entries(value).sort(([a], [b]) => compareText(a, b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
    return JSON.stringify(value);
}
/** Code-unit order is stable across device locales, unlike localeCompare. */
export function compareText(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
