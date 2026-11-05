// Values stay in memory only. Call registerCredential when accepting a configured key.
const credentials = new Set<string>();
const sensitiveName = /(?:api[_-]?key|secret|token|password|credential|authorization|cookie)/i;
const environmentCredentialName = /(?:^|_)(?:API_?KEY|SECRET|TOKEN|PASSWORD|CREDENTIALS?|ACCESS_KEY_ID|SECRET_ACCESS_KEY|PRIVATE_KEY|AUTHORIZATION)$/i;
const replacement = '[REDACTED]';

export function registerCredential(value: unknown): void {
  if (typeof value === 'string' && value) credentials.add(value);
}
export function configuredCredentialValues(): string[] {
  for (const [name, value] of Object.entries(process.env)) if (environmentCredentialName.test(name)) registerCredential(value);
  return [...credentials].sort((a, b) => b.length - a.length);
}
function textRedactor() {
  const forms = new Set<string>();
  for (const value of configuredCredentialValues()) {
    let encoded = value;
    try { encoded = encodeURIComponent(value); } catch { /* Malformed Unicode still has literal and JSON forms. */ }
    for (const form of [value, JSON.stringify(value).slice(1, -1), encoded]) forms.add(form);
  }
  return (text: string): string => {
    for (const form of forms) text = text.split(form).join(replacement);
    // JSON fields, quoted headers, and plain HTTP diagnostic lines.
    return text.replace(/(\\+"(?:authorization|proxy-authorization|x-api-key|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|cookie|set-cookie)\\+"\s*:\s*\\+")[\s\S]*?(\\+")/gi, '$1[REDACTED]$2')
      .replace(/(["'](?:authorization|proxy-authorization|x-api-key|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|cookie|set-cookie)["']\s*:\s*)("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/gi, '$1"[REDACTED]"')
      .replace(/(\b(?:authorization|proxy-authorization|x-api-key|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)\s*[:=]\s*)[^\r\n,}]+/gi, '$1[REDACTED]')
      .replace(/(\b(?:cookie|set-cookie)\s*:\s*)[^\r\n]+/gi, '$1[REDACTED]');
  };
}
export function redactSecrets(text: string): string { return textRedactor()(text); }
export function redactValue<T>(value: T): T {
  // Capture credential forms once per synchronous document traversal, not once
  // per key and leaf in every saved project, test report and session message.
  const redact = textRedactor();
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') return redact(item);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([key, entry]) =>
      // Filenames in hash/content maps are data, not credential field names.
      // Configured credential values are still redacted within every value/key.
      [redact(key), !/[./\\]/.test(key) && sensitiveName.test(key) && typeof entry === 'string' ? replacement : visit(entry)]));
    return item;
  };
  return visit(value) as T;
}
export function assertNoCredentials(contents: string | Buffer): void {
  if (configuredCredentialValues().some(value => typeof contents === 'string' ? contents.includes(value) : contents.includes(Buffer.from(value)))) {
    throw new Error('Delivery blocked: an artifact contains a configured credential. Remove it and run verification again.');
  }
}

/** Redact complete messages so split credentials and split headers cannot leak as deltas. */
export function secretTextBuffer(log: (text: string) => void) {
  let pending = '';
  return {
    append(delta: string) { pending += delta; },
    flush() { if (pending) { log(redactSecrets(pending)); pending = ''; } }
  };
}

/** Keep ordinary conversation streaming while withholding incomplete secrets. */
export function redactPartialSecrets(text: string): string {
  let end = text.length;
  const headers = ['authorization', 'proxy-authorization', 'x-api-key', 'api_key', 'apiKey', 'access_token', 'refresh_token', 'password', 'secret', 'cookie'];
  for (const prefix of [...configuredCredentialValues(), ...headers]) {
    const value = headers.includes(prefix) ? text.toLowerCase() : text;
    const candidate = headers.includes(prefix) ? prefix.toLowerCase() : prefix;
    for (let length = 1; length < candidate.length && length <= text.length; length++) {
      if (value.endsWith(candidate.slice(0, length))) end = Math.min(end, text.length - length);
    }
  }
  // A header may contain an unregistered credential. Wait for the whole message
  // before exposing that tail, including when the header itself arrives in pieces.
  const header = /(?:authorization|proxy-authorization|x-api-key|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|cookie)["']?(?:\s*[:=]|\s*$)/i.exec(text);
  if (header) end = Math.min(end, header.index);
  return redactSecrets(text.slice(0, end));
}
