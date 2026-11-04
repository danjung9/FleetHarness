import type { ConnectUi, ContextItem, FetchOptions, SecretStore } from './types.js';
import { OAuthConnector, ItemBudget, array, object, string, plainText, readableFile, fileText, since, testEndpoint, interruptible, ConnectorError } from './oauth.js';
import type { Credentials, Json, OAuthProvider, OAuthTestOptions } from './oauth.js';

export type MicrosoftKind = 'outlook' | 'outlook-calendar' | 'onedrive';
export type MicrosoftCloud = 'commercial' | 'government' | 'dod';
export interface MicrosoftConfig {
  clientId?: string;
  tenantId?: string;
  /** Separate public app registrations when more than one cloud is enabled. */
  clouds?: Partial<Record<MicrosoftCloud, { clientId?: string; tenantId?: string }>>;
}
export interface MicrosoftTestOptions extends OAuthTestOptions { graphBaseUrl?: string; downloadBaseUrl?: string }
export const MICROSOFT_CLOUDS = {
  commercial: { label: 'Personal or business', login: 'https://login.microsoftonline.com', graph: 'https://graph.microsoft.com' },
  government: { label: 'US Government', login: 'https://login.microsoftonline.us', graph: 'https://graph.microsoft.us' },
  dod: { label: 'Navy or DoD', login: 'https://login.microsoftonline.us', graph: 'https://dod-graph.microsoft.us' },
} as const;
const DETAILS = {
  outlook: { label: 'Outlook', permission: 'Mail.Read', noun: 'email' },
  'outlook-calendar': { label: 'Outlook Calendar', permission: 'Calendars.Read', noun: 'calendar' },
  onedrive: { label: 'OneDrive', permission: 'Files.Read.All', noun: 'files' },
} as const;
function cloudName(value?: string): MicrosoftCloud {
  if (value === 'commercial' || value === 'government' || value === 'dod') return value;
  throw new ConnectorError('Choose which Microsoft account you use. Connect again and select an account kind.');
}
function url(base: string, path: string, params: Record<string, string> = {}): string {
  const result = new URL(`${base}/${path}`);
  for (const [key, value] of Object.entries(params)) if (value) result.searchParams.set(key, value);
  return result.href;
}
const quote = (value: string) => value.replace(/'/g, "''");

export class MicrosoftConnector extends OAuthConnector {
  readonly label: string;
  readonly plainSummary: string;
  private readonly registrations: Record<MicrosoftCloud, { clientId: string; tenantId: string }>;
  private readonly graphOverride?: string;
  private readonly downloadOverride?: string;
  constructor(readonly kind: MicrosoftKind, config: MicrosoftConfig = {}, testOnly?: MicrosoftTestOptions) {
    super(testOnly);
    this.label = DETAILS[kind].label;
    this.plainSummary = `Reads your ${DETAILS[kind].noun}. It cannot send, change or delete anything.`;
    this.registrations = Object.fromEntries(Object.keys(MICROSOFT_CLOUDS).map(key => {
      const cloud = key as MicrosoftCloud, registration = config.clouds?.[cloud];
      const tenantId = string(registration?.tenantId ?? config.tenantId).trim() || (cloud === 'commercial' ? 'common' : 'organizations');
      if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/.test(tenantId)) throw new ConnectorError('The Microsoft tenant ID is invalid. Ask your administrator to correct it.');
      return [cloud, { clientId: string(registration?.clientId ?? config.clientId).trim(), tenantId }];
    })) as Record<MicrosoftCloud, { clientId: string; tenantId: string }>;
    this.graphOverride = testOnly?.graphBaseUrl === undefined ? undefined : testEndpoint('', testOnly.graphBaseUrl);
    this.downloadOverride = testOnly?.downloadBaseUrl === undefined ? undefined : testEndpoint('', testOnly.downloadBaseUrl);
    for (const cloud of Object.keys(MICROSOFT_CLOUDS)) this.provider(cloud);
  }
  available(): boolean { return Object.values(this.registrations).some(value => !!value.clientId); }
  protected provider(value?: string): OAuthProvider {
    const cloud = cloudName(value), endpoints = MICROSOFT_CLOUDS[cloud], registration = this.registrations[cloud];
    const root = `${endpoints.login}/${registration.tenantId}/oauth2/v2.0`;
    return { clientId: registration.clientId, cloud, accountLabel: `Microsoft account (${endpoints.label})`, deviceFallback: cloud !== 'commercial', redirectHost: 'localhost',
      authorizationUrl: testEndpoint(`${root}/authorize`, this.testOnly?.authorizationUrl),
      tokenUrl: testEndpoint(`${root}/token`, this.testOnly?.tokenUrl),
      deviceCodeUrl: testEndpoint(`${root}/devicecode`, this.testOnly?.deviceCodeUrl),
      scopes: [`${endpoints.graph}/${DETAILS[this.kind].permission}`, `${endpoints.graph}/User.Read`, 'offline_access'],
      authorizationParams: { response_mode: 'query' },
    };
  }
  protected async chooseProvider(ui: ConnectUi, signal: AbortSignal): Promise<OAuthProvider> {
    const cloud = await interruptible(ui.ask({ id: 'microsoft-account-kind', label: 'Which Microsoft account?',
      options: Object.entries(MICROSOFT_CLOUDS).map(([id, value]) => ({ id, label: value.label })) }), signal);
    return this.provider(cloud);
  }
  protected async read(secrets: SecretStore, options: FetchOptions, credentials: Credentials): Promise<ContextItem[]> {
    const cloud = cloudName(this.cloud(credentials));
    const base = this.graphOverride ?? `${MICROSOFT_CLOUDS[cloud].graph}/v1.0`;
    if (this.kind === 'outlook') return this.mail(secrets, options, base);
    if (this.kind === 'outlook-calendar') return this.calendar(secrets, options, base);
    return this.files(secrets, options, base, cloud);
  }
  private async pages(secrets: SecretStore, options: FetchOptions, base: string, first: string, budget: ItemBudget,
    visit: (entry: Json) => Promise<void>, headers: Record<string, string> = {}): Promise<void> {
    let next = first;
    const seen = new Set<string>();
    for (let page = 0; page < 100; page++) {
      if (seen.has(next)) throw new ConnectorError('The service repeated a page of results. Try a narrower search.');
      seen.add(next);
      const data = await this.api(secrets, next, base, options, false, headers);
      if (!Array.isArray(data.value)) throw new ConnectorError('The service returned an unreadable list. Try again in a moment.');
      for (const entry of array(data.value)) { if (budget.full) return; await visit(entry); }
      next = string(data['@odata.nextLink']);
      if (!next || budget.full) return;
    }
    throw new ConnectorError('There are too many pages to read at once. Choose a folder or a narrower search.');
  }
  private async mail(secrets: SecretStore, options: FetchOptions, base: string): Promise<ContextItem[]> {
    const budget = new ItemBudget(options), cutoff = since(options);
    const path = options.folder ? `me/mailFolders/${encodeURIComponent(options.folder)}/messages` : 'me/messages';
    // Local text filtering avoids Graph's incompatible $search/$filter combinations.
    await this.pages(secrets, options, base, url(base, path, { '$top': String(Math.min(options.maxItems, 100)),
      '$filter': `receivedDateTime ge ${cutoff}`, '$orderby': 'receivedDateTime desc',
      '$select': 'id,subject,from,receivedDateTime,body' }), budget, async message => {
      const body = object(message.body), from = object(object(message.from).emailAddress);
      const content = string(body.contentType).toLowerCase() === 'html' ? plainText(string(body.content)) : string(body.content);
      if (!string(message.id) || (message.receivedDateTime && Date.parse(message.receivedDateTime) < Date.parse(cutoff))) return;
      if (options.query && ![message.subject, from.name, from.address, content].join('\n').toLowerCase().includes(options.query.toLowerCase())) return;
      budget.add({ id: `outlook:${message.id}`, kind: 'email', title: string(message.subject) || 'Email',
        from: string(from.address) || string(from.name), when: string(message.receivedDateTime), body: content });
    }, { Prefer: 'outlook.body-content-type="text"' });
    return budget.items;
  }
  private async calendar(secrets: SecretStore, options: FetchOptions, base: string): Promise<ContextItem[]> {
    const budget = new ItemBudget(options);
    const path = options.folder ? `me/calendars/${encodeURIComponent(options.folder)}/calendarView` : 'me/calendarView';
    await this.pages(secrets, options, base, url(base, path, { startDateTime: since(options), endDateTime: new Date(Date.now() + 30 * 86400_000).toISOString(),
      '$top': String(Math.min(options.maxItems, 100)), '$select': 'id,subject,start,end,body,location,isCancelled', '$orderby': 'start/dateTime' }), budget, async event => {
      if (event.isCancelled || !string(event.id)) return;
      const description = object(event.body), start = object(event.start), end = object(event.end);
      const body = [string(description.contentType).toLowerCase() === 'html' ? plainText(string(description.content)) : string(description.content),
        string(object(event.location).displayName), end.dateTime && `Ends: ${string(end.dateTime)} (${string(end.timeZone)})`].filter(Boolean).join('\n');
      if (options.query && ![event.subject, body].join('\n').toLowerCase().includes(options.query.toLowerCase())) return;
      const when = string(start.dateTime);
      budget.add({ id: `outlook-calendar:${event.id}`, kind: 'event', title: string(event.subject) || 'Calendar event',
        when: when && start.timeZone === 'UTC' && !/(Z|[+-]\d\d:\d\d)$/.test(when) ? `${when}Z` : when, body });
    }, { Prefer: 'outlook.timezone="UTC", outlook.body-content-type="text"' });
    return budget.items;
  }
  private allowsDownload(target: URL, cloud: MicrosoftCloud): boolean {
    if (this.downloadOverride) {
      const allowed = new URL(this.downloadOverride);
      return target.origin === allowed.origin && target.pathname.startsWith(allowed.pathname.replace(/\/$/, '') + '/');
    }
    const suffixes = cloud === 'commercial' ? ['.sharepoint.com', '.1drv.com', '.files.1drv.com', '.onedrive.live.com', '.storage.live.com']
      : cloud === 'government' ? ['.sharepoint.us'] : ['.sharepoint-mil.us'];
    return target.protocol === 'https:' && (!target.port || target.port === '443') && suffixes.some(suffix => target.hostname.endsWith(suffix));
  }
  private async files(secrets: SecretStore, options: FetchOptions, base: string, cloud: MicrosoftCloud): Promise<ContextItem[]> {
    const budget = new ItemBudget(options);
    const root = options.folder ? `me/drive/items/${encodeURIComponent(options.folder)}` : 'me/drive/root';
    const path = options.query ? `${root}/search(q='${encodeURIComponent(quote(options.query))}')` : `${root}/children`;
    await this.pages(secrets, options, base, url(base, path, { '$top': String(Math.min(options.maxItems, 100)),
      '$select': 'id,name,size,file,folder,lastModifiedDateTime,parentReference,remoteItem' }), budget, async file => {
      const id = string(file.id), name = string(file.name), mime = string(object(file.file).mimeType);
      if (!id || !file.file || file.folder || file.remoteItem || !readableFile(name, mime)
        || Number(file.size) > Math.min(options.maxBytes, 8 * 1024 * 1024)) return;
      if (file.lastModifiedDateTime && Date.parse(file.lastModifiedDateTime) < Date.parse(since(options))) return;
      const raw = await this.api(secrets, url(base, `me/drive/items/${encodeURIComponent(id)}/content`), base, options, true, {},
        Math.min(options.maxBytes, 8 * 1024 * 1024), target => this.allowsDownload(target, cloud));
      const body = fileText(raw, name, mime);
      if (body !== undefined) budget.add({ id: `onedrive:${id}`, kind: 'file', title: name || 'File', when: string(file.lastModifiedDateTime), body });
    });
    return budget.items;
  }
}
export class OutlookConnector extends MicrosoftConnector { constructor(config: MicrosoftConfig = {}, testOnly?: MicrosoftTestOptions) { super('outlook', config, testOnly); } }
export class OutlookCalendarConnector extends MicrosoftConnector { constructor(config: MicrosoftConfig = {}, testOnly?: MicrosoftTestOptions) { super('outlook-calendar', config, testOnly); } }
export class OneDriveConnector extends MicrosoftConnector { constructor(config: MicrosoftConfig = {}, testOnly?: MicrosoftTestOptions) { super('onedrive', config, testOnly); } }
