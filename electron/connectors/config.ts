import type { ConnectorAdapter, ConnectorKind } from './types.js';
import { GmailConnector, GoogleCalendarConnector, GoogleDriveConnector, type GoogleTestOptions } from './google.js';
import { OutlookConnector, OutlookCalendarConnector, OneDriveConnector, type MicrosoftConfig, type MicrosoftTestOptions } from './microsoft.js';
import { CustomApiConnector } from './custom-api.js';

/** Host-only input. Saved settings and renderer requests are never consulted. */
export function connectorConfiguration(isPackaged: boolean, env: NodeJS.ProcessEnv) {
  const microsoft: MicrosoftConfig = { clouds: {
    commercial: { clientId: env.APPYARD_MICROSOFT_CLIENT_ID, tenantId: env.APPYARD_MICROSOFT_TENANT_ID },
    government: { clientId: env.APPYARD_MICROSOFT_GOV_CLIENT_ID, tenantId: env.APPYARD_MICROSOFT_GOV_TENANT_ID },
    dod: { clientId: env.APPYARD_MICROSOFT_DOD_CLIENT_ID, tenantId: env.APPYARD_MICROSOFT_DOD_TENANT_ID }
  } };
  const production = { google: { clientId: env.APPYARD_GOOGLE_CLIENT_ID }, microsoft };
  // Even malformed test configuration is ignored in a packaged app.
  if (isPackaged || env.APPYARD_CONNECTOR_TEST_MODE !== '1') return { ...production, fixture: undefined };
  if (env.NODE_ENV !== 'test') throw new Error('Local connector tests are not enabled. Start the unpackaged app in test mode.');
  let input: unknown;
  try { input = JSON.parse(env.APPYARD_CONNECTOR_TEST_SERVERS ?? ''); } catch { throw new Error('Local test addresses are missing. Start the connector smoke script again.'); }
  if (!input || typeof input !== 'object') throw new Error('Local test addresses are invalid. Start the connector smoke script again.');
  const origin = (value: unknown) => {
    if (typeof value !== 'string') throw new Error('Local test addresses are invalid. Start the connector smoke script again.');
    const url = new URL(value);
    if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Tests require local addresses. Start the connector smoke script again.');
    return url.origin;
  };
  const fixture = { accounts: origin((input as Record<string, unknown>).accounts), dataService: origin((input as Record<string, unknown>).dataService) };
  return { google: { clientId: 'synthetic-client-id' }, microsoft: { clientId: 'synthetic-client-id' } as MicrosoftConfig, fixture };
}
export function installedAdapters(configuration: ReturnType<typeof connectorConfiguration>): ConnectorAdapter[] {
  const base = configuration.fixture?.accounts;
  const google: GoogleTestOptions | undefined = base ? {
    authorizationUrl: base + '/google/authorize', tokenUrl: base + '/google/token', revokeUrl: base + '/google/revoke',
    gmailBaseUrl: base + '/google/gmail/v1', calendarBaseUrl: base + '/google/calendar/v3', driveBaseUrl: base + '/google/drive/v3'
  } : undefined;
  const microsoft: MicrosoftTestOptions | undefined = base ? {
    authorizationUrl: base + '/microsoft/authorize', tokenUrl: base + '/microsoft/token', deviceCodeUrl: base + '/microsoft/devicecode',
    graphBaseUrl: base + '/microsoft/v1.0', downloadBaseUrl: base + '/download'
  } : undefined;
  return [new GmailConnector(configuration.google, google), new GoogleCalendarConnector(configuration.google, google), new GoogleDriveConnector(configuration.google, google),
    new OutlookConnector(configuration.microsoft, microsoft), new OutlookCalendarConnector(configuration.microsoft, microsoft), new OneDriveConnector(configuration.microsoft, microsoft), new CustomApiConnector()];
}
export function fixtureSource(configuration: ReturnType<typeof connectorConfiguration>, kind: ConnectorKind, address?: string) {
  if (!configuration.fixture) return false;
  if (kind !== 'custom-api') return true;
  try { return new URL(address ?? '').origin === configuration.fixture.dataService; } catch { return false; }
}
