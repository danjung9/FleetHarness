/**
 * Copy this module beside connectors.json in a delivered app.
 * Schema: { version: 1, services: [{ id, label, url, auth, sample: [...] }] }
 * auth: { type: 'none' | 'bearer' | 'basic' } or { type: 'header', name }.
 * The JSON contains addresses and frozen sample rows, never credentials.
 *
 * const data = createAppYardConnectors({ ask: async question => showKeyForm(question) });
 * const { rows, source, message } = await data.read('ships');
 * Pass samples: { ships: frozenRows } as well when the app opens through file://,
 * so its frozen rows are available even if the browser blocks connectors.json.
 *
 * Browser fetch cannot inspect DNS answers. Direct reads therefore require an
 * IP address that can be checked here. Named services use the frozen sample;
 * a trusted host must provide DNS-pinned reads before enabling those live.
 * No redirects are followed, including redirects hidden by CORS.
 */
const LIMIT_BYTES = 2 * 1024 * 1024;
const LIMIT_ROWS = 500;
const LIMIT_PAGES = 5;
const LIMIT_TIME = 15_000;
const own = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const stop = message => { throw new Error(message); };
const fallbackMessage = 'This service could not be read, so the saved sample is shown. Ask the service owner to allow this app to read it.';

function words(address) {
  let text = address;
  if (text.includes('.')) {
    const last = text.lastIndexOf(':');
    const bytes = text.slice(last + 1).split('.').map(Number);
    text = text.slice(0, last + 1) + ((bytes[0] << 8) | bytes[1]).toString(16) + ':' + ((bytes[2] << 8) | bytes[3]).toString(16);
  }
  const [a, b] = text.split('::');
  const left = a ? a.split(':').map(v => parseInt(v, 16)) : [];
  const right = b ? b.split(':').map(v => parseInt(v, 16)) : [];
  return b !== undefined ? [...left, ...Array(8 - left.length - right.length).fill(0), ...right] : left;
}
function addressKind(host) {
  let bytes;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) bytes = host.split('.').map(Number);
  else if (host.includes(':')) {
    const v = words(host);
    if (v.length !== 8 || v.some(n => !Number.isInteger(n))) return 'blocked';
    if (v.slice(0, 7).every(n => n === 0) && v[7] <= 1) return v[7] === 1 ? 'internal' : 'blocked';
    if (v.slice(0, 5).every(n => n === 0) && [0, 0xffff].includes(v[5])) bytes = [v[6] >> 8, v[6] & 255, v[7] >> 8, v[7] & 255];
    else {
      if ((v[0] & 0xffc0) === 0xfe80 || (v[0] & 0xff00) === 0xff00 || v[0] === 0x2002 || v[0] === 0x2001 && v[1] === 0
        || v[0] === 0x64 && v[1] === 0xff9b || v[0] === 0xfd00 && v[1] === 0xec2 && v.slice(2, 7).every(n => n === 0) && v[7] === 0x254) return 'blocked';
      return (v[0] & 0xfe00) === 0xfc00 || (v[0] & 0xffc0) === 0xfec0 ? 'internal' : 'public';
    }
  } else return 'named';
  const [a, b, c, d] = bytes;
  if (a === 169 && b === 254 || a === 0 || a >= 224 || a === 100 && b === 100 && c === 100 && d === 200 || a === 168 && b === 63 && c === 129 && d === 16) return 'blocked';
  return a === 127 || a === 10 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127 || a === 198 && [18, 19].includes(b) ? 'internal' : 'public';
}
function checkedUrl(value, base) {
  const url = new URL(value, base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
    || [...url.searchParams.keys()].some(key => /key|token|secret|password|credential|authorization|signature/i.test(key))) stop(fallbackMessage);
  const kind = addressKind(url.hostname.replace(/^\[|\]$/g, ''));
  if (kind === 'blocked') stop('This address is reserved for network controls, so the saved sample is shown. Use a different service address.');
  if (kind === 'named') stop('This browser cannot check the service address safely, so the saved sample is shown. Use a trusted host to enable live data.');
  if (url.protocol !== 'https:' && kind !== 'internal') stop(fallbackMessage);
  url.hash = '';
  return { url, kind };
}
function clean(value, hidden, depth = 0) {
  if (depth > 12) return '[Nested value]';
  if (typeof value === 'string') { for (const part of hidden) value = value.split(part).join('[Hidden]'); return value; }
  if (Array.isArray(value)) return value.map(item => clean(item, hidden, depth + 1));
  if (own(value)) return Object.fromEntries(Object.entries(value).filter(([key]) => !/password|secret|token|authorization|api.?key/i.test(key))
    .map(([key, item]) => [clean(key, hidden, depth + 1), clean(item, hidden, depth + 1)]));
  return value;
}
function parseCsv(text) {
  const records = []; let record = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (!field || quoted) quoted = !quoted;
      else stop(fallbackMessage);
    } else if (c === ',' && !quoted) { record.push(field); field = ''; }
    else if ((c === '\r' || c === '\n') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(field); if (record.some(Boolean)) records.push(record); record = []; field = '';
    } else field += c;
  }
  if (quoted) stop(fallbackMessage);
  if (field || record.length) { record.push(field); records.push(record); }
  const labels = records.shift();
  if (!labels?.length || new Set(labels).size !== labels.length || records.some(row => row.length !== labels.length)) stop(fallbackMessage);
  return records.map(row => Object.fromEntries(labels.map((key, i) => [key, row[i]])));
}
function page(text, type, responseUrl, link) {
  if (/html/i.test(type) || /^\s*<(?:!doctype|html)/i.test(text)) stop(fallbackMessage);
  let data;
  try { data = JSON.parse(text); } catch {
    if (!/csv/i.test(type)) stop(fallbackMessage);
    data = parseCsv(text.replace(/^\uFEFF/, ''));
  }
  let next;
  for (let depth = 0; own(data) && depth < 5; depth++) {
    const candidate = data.next ?? data.next_url ?? data.nextPageUrl ?? data['@odata.nextLink'] ?? data.links?.next ?? data.pagination?.next;
    if (typeof candidate === 'string') next = candidate;
    else if (own(candidate) && typeof candidate.href === 'string') next = candidate.href;
    const cursor = data.next_cursor ?? data.nextCursor;
    if (!next && (typeof cursor === 'string' || typeof cursor === 'number') && cursor !== '') {
      const url = new URL(responseUrl); url.searchParams.set('cursor', String(cursor)); next = url.href;
    }
    if (!next && data.has_more === true && Number.isInteger(data.page)) {
      const url = new URL(responseUrl); url.searchParams.set('page', String(data.page + 1)); next = url.href;
    }
    const arrays = Object.values(data).filter(Array.isArray);
    const nested = ['data', 'results', 'items', 'records', 'value', 'rows'].map(key => data[key]).find(v => Array.isArray(v) || own(v))
      ?? (arrays.length === 1 ? arrays[0] : undefined);
    if (nested === undefined) { data = [data]; break; }
    data = nested;
  }
  if (!Array.isArray(data)) stop(fallbackMessage);
  next = /<([^>]+)>\s*;\s*rel\s*=\s*["']?next\b/i.exec(link ?? '')?.[1] ?? next;
  return { rows: data.map(value => own(value) ? value : { value }), next };
}
function encodeBasic(value) { return btoa(Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join('')); }

export function createAppYardConnectors(options = {}) {
  const configUrl = options.configUrl ?? './connectors.json';
  const memory = new Map();
  const confirmed = new Set();
  const ask = options.ask ?? (async question => globalThis.prompt?.(question.label) ?? '');
  let config;
  let storage;
  try { storage = options.storage ?? globalThis.sessionStorage; } catch { /* Memory still works when storage is disabled. */ }
  const storageKey = service => `appyard:data-service:${service.id}:${service.url}:${JSON.stringify(service.auth ?? { type: 'none' })}`;
  const forget = service => { memory.delete(storageKey(service)); try { storage?.removeItem(storageKey(service)); } catch { /* No persistent entry. */ } };
  async function limitedText(response, controller, budget) {
    if (!response.ok || Number(response.headers.get('content-length')) > budget.left) stop(fallbackMessage);
    if (!response.body) return '';
    const reader = response.body.getReader(); const chunks = []; let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        length += value.byteLength; budget.left -= value.byteLength;
        if (length > LIMIT_BYTES || budget.left < 0) { controller.abort(); stop(fallbackMessage); }
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const combined = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
    return new TextDecoder().decode(combined);
  }
  async function read(id, { signal } = {}) {
    let service; let hidden = []; let timer; const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    const prompt = async question => {
      if (controller.signal.aborted) stop(fallbackMessage);
      let abort;
      try {
        return await Promise.race([ask(question), new Promise((_resolve, reject) => {
          abort = () => reject(new Error(fallbackMessage));
          controller.signal.addEventListener('abort', abort, { once: true });
          if (controller.signal.aborted) abort();
        })]);
      } finally { controller.signal.removeEventListener('abort', abort); }
    };
    try {
      timer = setTimeout(cancel, LIMIT_TIME);
      if (!config) {
        const response = await fetch(configUrl, { method: 'GET', redirect: 'error', credentials: 'omit', signal: controller.signal });
        config = JSON.parse(await limitedText(response, controller, { left: LIMIT_BYTES }));
        if (config.version !== 1 || !Array.isArray(config.services)) stop(fallbackMessage);
      }
      service = config.services.find(value => value.id === id);
      if (!service) stop(fallbackMessage);
      const { url: initial, kind } = checkedUrl(service.url);
      clearTimeout(timer);
      if (kind === 'internal' && !confirmed.has(initial.origin)) {
        if (await prompt({ id: 'internal-address', label: 'Use this internal service to read live data?', options: [{ id: 'no', label: 'No' }, { id: 'yes', label: 'Yes' }] }) !== 'yes') stop(fallbackMessage);
        confirmed.add(initial.origin);
      }
      const auth = service.auth ?? { type: 'none' };
      if (!['none', 'header', 'bearer', 'basic'].includes(auth.type)) stop(fallbackMessage);
      if (auth.type === 'header' && (!/^[a-z0-9_-]{1,80}$/i.test(auth.name) || /^(?:host|cookie|proxy.*|connection|content.*|transfer.*|accept.*|origin|referer|upgrade|te|trailer)$/i.test(auth.name))) stop(fallbackMessage);
      let credential;
      if (auth.type !== 'none') {
        credential = memory.get(storageKey(service));
        try { credential ??= storage?.getItem(storageKey(service)); } catch { /* Ask if storage is unavailable. */ }
        if (!credential) {
          if (auth.type === 'basic') {
            const username = await prompt({ id: 'username', label: 'Enter your username.', secret: true });
            const password = await prompt({ id: 'password', label: 'Enter your password.', secret: true });
            if (!username || !password || username.includes(':')) stop(fallbackMessage);
            credential = encodeBasic(`${username}:${password}`);
            hidden.push(username, password, `${username}:${password}`);
          } else credential = await prompt({ id: 'key', label: auth.type === 'bearer' ? 'Paste your sign-in token.' : 'Paste your service key.', secret: true });
        }
        if (!credential || /[\r\n]/.test(credential)) stop(fallbackMessage);
        if (auth.type === 'basic') {
          const decoded = new TextDecoder().decode(Uint8Array.from(atob(credential), c => c.charCodeAt(0)));
          hidden.push(decoded, ...decoded.split(':'));
        }
        hidden.push(credential);
        hidden = [...new Set(hidden.filter(Boolean).flatMap(value => [value, encodeURIComponent(value), encodeBasic(value)]))].sort((a, b) => b.length - a.length);
      }
      if (controller.signal.aborted) stop(fallbackMessage);
      timer = setTimeout(cancel, LIMIT_TIME);
      const headers = { Accept: 'application/json, text/csv;q=0.9' };
      if (auth.type === 'header') headers[auth.name] = credential;
      if (auth.type === 'bearer') headers.Authorization = `Bearer ${credential}`;
      if (auth.type === 'basic') headers.Authorization = `Basic ${credential}`;
      const rows = []; const seen = new Set(); const budget = { left: LIMIT_BYTES }; let next = initial.href;
      for (let number = 0; next && number < LIMIT_PAGES; number++) {
        const { url } = checkedUrl(next, initial.href);
        if (url.origin !== initial.origin || hidden.some(value => url.href.includes(value))) stop(fallbackMessage);
        if (seen.has(url.href)) break;
        seen.add(url.href);
        const response = await fetch(url, { method: 'GET', headers, redirect: 'error', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal });
        if ([401, 403].includes(response.status)) {
          forget(service);
          stop('This service did not accept the key, so the saved sample is shown. Check the key and try again.');
        }
        const text = await limitedText(response, controller, budget);
        const result = page(text, response.headers.get('content-type') ?? '', url.href, response.headers.get('link'));
        rows.push(...clean(result.rows.slice(0, LIMIT_ROWS - rows.length), hidden));
        next = result.next ? new URL(result.next, url).href : undefined;
        if (rows.length >= LIMIT_ROWS) break;
      }
      if (credential) {
        memory.set(storageKey(service), credential);
        try { storage?.setItem(storageKey(service), credential); } catch { /* Retain only in memory. */ }
      }
      return { rows, source: 'live', message: 'Live records are ready.' };
    } catch (error) {
      // Only our fixed messages are public. Network errors can contain a URL or a key.
      const known = [fallbackMessage,
        'This address is reserved for network controls, so the saved sample is shown. Use a different service address.',
        'This browser cannot check the service address safely, so the saved sample is shown. Use a trusted host to enable live data.',
        'This service did not accept the key, so the saved sample is shown. Check the key and try again.'];
      return { rows: clean((service?.sample ?? options.samples?.[id] ?? []).slice(0, LIMIT_ROWS), hidden), source: 'sample', message: known.includes(error?.message) ? error.message : fallbackMessage };
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  return {
    read,
    disconnect(id) {
      const service = config?.services?.find(value => value.id === id);
      if (service) { forget(service); confirmed.delete(new URL(service.url).origin); }
    },
  };
}
