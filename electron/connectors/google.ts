import type { ContextItem, FetchOptions, SecretStore } from './types.js';
import { OAuthConnector, ItemBudget, array, object, string, plainText, readableFile, fileText, since, testEndpoint, ConnectorError } from './oauth.js';
import type { Json, OAuthProvider, OAuthTestOptions } from './oauth.js';

export type GoogleKind = 'gmail' | 'google-calendar' | 'google-drive';
export interface GoogleConfig { clientId?: string }
export interface GoogleTestOptions extends OAuthTestOptions { gmailBaseUrl?: string; calendarBaseUrl?: string; driveBaseUrl?: string }
const DETAILS = {
  gmail: { label: 'Gmail', scope: 'gmail.readonly', noun: 'email' },
  'google-calendar': { label: 'Google Calendar', scope: 'calendar.readonly', noun: 'calendar' },
  'google-drive': { label: 'Google Drive', scope: 'drive.readonly', noun: 'files' },
} as const;
const escapeQuery = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
function url(base: string, path: string, params: Record<string, string> = {}): string {
  const result = new URL(`${base}/${path}`);
  for (const [key, value] of Object.entries(params)) if (value) result.searchParams.set(key, value);
  return result.href;
}
async function emailText(part: Json, attachment: (id: string) => Promise<string>, depth = 0): Promise<string> {
  if (depth > 12 || string(part.filename)) return '';
  const mime = string(part.mimeType).toLowerCase();
  if (mime === 'text/plain' || mime === 'text/html') {
    const body = object(part.body);
    const data = string(body.data) || (string(body.attachmentId) ? await attachment(body.attachmentId) : '');
    if (!data || !/^[A-Za-z0-9_-]*={0,2}$/.test(data)) return '';
    const contentType = string(array(part.headers).find(header => string(header.name).toLowerCase() === 'content-type')?.value);
    const charset = contentType.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1] || 'utf-8';
    let decoded: string;
    try { decoded = new TextDecoder(charset, { fatal: true }).decode(Buffer.from(data, 'base64url')); }
    catch { throw new ConnectorError('An email uses a text format AppYard could not read. Exclude that message or provide a plain-text copy.'); }
    return mime === 'text/html' ? plainText(decoded) : decoded;
  }
  const parts = array(part.parts).slice(0, 100);
  if (mime === 'multipart/alternative') {
    const plain = parts.find(child => child.mimeType === 'text/plain' && !string(child.filename));
    if (plain) return emailText(plain, attachment, depth + 1);
    const html = parts.find(child => child.mimeType === 'text/html' && !string(child.filename));
    if (html) return emailText(html, attachment, depth + 1);
  }
  const bodies: string[] = [];
  for (const child of parts) bodies.push(await emailText(child, attachment, depth + 1));
  return bodies.filter(Boolean).join('\n\n');
}

export class GoogleConnector extends OAuthConnector {
  readonly label: string;
  readonly plainSummary: string;
  private readonly clientId: string;
  private readonly endpoints: { gmail: string; calendar: string; drive: string };
  constructor(readonly kind: GoogleKind, config: GoogleConfig = {}, testOnly?: GoogleTestOptions) {
    super(testOnly);
    this.clientId = string(config.clientId).trim();
    this.label = DETAILS[kind].label;
    this.plainSummary = `Reads your ${DETAILS[kind].noun}. It cannot send, change or delete anything.`;
    this.endpoints = {
      gmail: testEndpoint('https://gmail.googleapis.com/gmail/v1', testOnly?.gmailBaseUrl),
      calendar: testEndpoint('https://www.googleapis.com/calendar/v3', testOnly?.calendarBaseUrl),
      drive: testEndpoint('https://www.googleapis.com/drive/v3', testOnly?.driveBaseUrl),
    };
    this.provider(); // Validate every test address before any sign-in is possible.
  }
  available(): boolean { return !!this.clientId; }
  protected provider(): OAuthProvider {
    return {
      clientId: this.clientId,
      authorizationUrl: testEndpoint('https://accounts.google.com/o/oauth2/v2/auth', this.testOnly?.authorizationUrl),
      tokenUrl: testEndpoint('https://oauth2.googleapis.com/token', this.testOnly?.tokenUrl),
      revokeUrl: testEndpoint('https://oauth2.googleapis.com/revoke', this.testOnly?.revokeUrl),
      scopes: [`https://www.googleapis.com/auth/${DETAILS[this.kind].scope}`],
      accountLabel: 'Google account', authorizationParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false' },
    };
  }
  protected async read(secrets: SecretStore, options: FetchOptions): Promise<ContextItem[]> {
    if (this.kind === 'gmail') return this.mail(secrets, options);
    if (this.kind === 'google-calendar') return this.calendar(secrets, options);
    return this.files(secrets, options);
  }
  private async pages(secrets: SecretStore, options: FetchOptions, base: string, path: string, params: Record<string, string>, field: string,
    visit: (entry: Json) => Promise<void>, budget: ItemBudget): Promise<void> {
    let pageToken = '';
    const seen = new Set<string>();
    for (let page = 0; page < 100; page++) {
      const data = await this.api(secrets, url(base, path, { ...params, pageToken }), base, options);
      if (!Array.isArray(data[field]) && data[field] !== undefined) throw new ConnectorError('The service returned an unreadable list. Try again in a moment.');
      for (const entry of array(data[field])) { if (budget.full) return; await visit(entry); }
      pageToken = string(data.nextPageToken);
      if (!pageToken || budget.full) return;
      if (seen.has(pageToken)) throw new ConnectorError('The service repeated a page of results. Try a narrower search.');
      seen.add(pageToken);
    }
    throw new ConnectorError('There are too many pages to read at once. Choose a folder or a narrower search.');
  }
  private async mail(secrets: SecretStore, options: FetchOptions): Promise<ContextItem[]> {
    const budget = new ItemBudget(options), base = this.endpoints.gmail;
    const cutoff = since(options);
    const params = { maxResults: String(Math.min(100, options.maxItems)), labelIds: options.folder ?? '',
      q: `${options.query ? `(${options.query}) ` : ''}after:${Math.floor(Date.parse(cutoff) / 1000)}` };
    await this.pages(secrets, options, base, 'users/me/messages', params, 'messages', async summary => {
      const id = string(summary.id);
      if (!id) return;
      const message = await this.api(secrets, url(base, `users/me/messages/${encodeURIComponent(id)}`, { format: 'full' }), base, options);
      const payload = object(message.payload), headers = array(payload.headers);
      const header = (name: string) => string(headers.find(entry => string(entry.name).toLowerCase() === name)?.value);
      const stamp = Number(message.internalDate), when = Number.isFinite(stamp) && stamp > 0 ? new Date(stamp).toISOString() : header('date');
      if (Number.isFinite(Date.parse(when)) && Date.parse(when) < Date.parse(cutoff)) return;
      const body = await emailText(payload, async attachmentId => {
        const attached = await this.api(secrets, url(base, `users/me/messages/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`), base, options);
        return string(attached.data);
      });
      budget.add({ id: `gmail:${id}`, kind: 'email', title: header('subject') || 'Email', from: header('from'), when,
        body: body || (message.snippet ? `Message preview: ${string(message.snippet)}` : '') });
    }, budget);
    return budget.items;
  }
  private async calendar(secrets: SecretStore, options: FetchOptions): Promise<ContextItem[]> {
    const budget = new ItemBudget(options), base = this.endpoints.calendar;
    await this.pages(secrets, options, base, `calendars/${encodeURIComponent(options.folder || 'primary')}/events`, {
      maxResults: String(Math.min(100, options.maxItems)), timeMin: since(options), singleEvents: 'true', orderBy: 'startTime', q: options.query ?? '',
    }, 'items', async event => {
      if (event.status === 'cancelled' || !string(event.id)) return;
      const start = object(event.start), end = object(event.end);
      const when = string(start.dateTime) || string(start.date);
      const until = string(end.dateTime) || string(end.date);
      if (until && Date.parse(until) < Date.parse(since(options))) return;
      budget.add({ id: `google-calendar:${event.id}`, kind: 'event', title: string(event.summary) || 'Calendar event', when,
        body: [plainText(string(event.description)), string(event.location), until && `Ends: ${until}`].filter(Boolean).join('\n') });
    }, budget);
    return budget.items;
  }
  private async files(secrets: SecretStore, options: FetchOptions): Promise<ContextItem[]> {
    const budget = new ItemBudget(options), base = this.endpoints.drive;
    const terms = ['trashed = false', `modifiedTime >= '${since(options)}'`];
    if (options.folder) terms.push(`'${escapeQuery(options.folder)}' in parents`);
    if (options.query) terms.push(`fullText contains '${escapeQuery(options.query)}'`);
    await this.pages(secrets, options, base, 'files', { q: terms.join(' and '), pageSize: String(Math.min(100, options.maxItems)),
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime)', orderBy: 'modifiedTime desc' }, 'files', async file => {
      const id = string(file.id), name = string(file.name), mime = string(file.mimeType);
      const nativeDoc = mime === 'application/vnd.google-apps.document';
      if (!id || (!nativeDoc && !readableFile(name, mime)) || Number(file.size) > Math.min(options.maxBytes, 8 * 1024 * 1024)) return;
      if (file.modifiedTime && Date.parse(file.modifiedTime) < Date.parse(since(options))) return;
      const address = nativeDoc ? url(base, `files/${encodeURIComponent(id)}/export`, { mimeType: 'text/plain' }) : url(base, `files/${encodeURIComponent(id)}`, { alt: 'media' });
      const raw = await this.api(secrets, address, base, options, true, {}, Math.min(options.maxBytes, 8 * 1024 * 1024));
      const body = fileText(raw, nativeDoc ? 'document.txt' : name, nativeDoc ? 'text/plain' : mime);
      if (body !== undefined) budget.add({ id: `google-drive:${id}`, kind: 'file', title: name || 'Document', when: string(file.modifiedTime), body });
    }, budget);
    return budget.items;
  }
}
export class GmailConnector extends GoogleConnector { constructor(config: GoogleConfig = {}, testOnly?: GoogleTestOptions) { super('gmail', config, testOnly); } }
export class GoogleCalendarConnector extends GoogleConnector { constructor(config: GoogleConfig = {}, testOnly?: GoogleTestOptions) { super('google-calendar', config, testOnly); } }
export class GoogleDriveConnector extends GoogleConnector { constructor(config: GoogleConfig = {}, testOnly?: GoogleTestOptions) { super('google-drive', config, testOnly); } }
