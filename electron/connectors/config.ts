import type { ConnectorAdapter, ConnectorKind } from './types.js';
import { GmailConnector, GoogleCalendarConnector, GoogleDriveConnector, type GoogleTestOptions } from './google.js';
import { OutlookConnector, OutlookCalendarConnector, OneDriveConnector, type MicrosoftConfig, type MicrosoftTestOptions } from './microsoft.js';
import { CustomApiConnector } from './custom-api.js';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Encryption } from './store.js';

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

/** Only the unpackaged fixture host may replace unavailable OS storage. The
 * smoke runner keeps this ephemeral key in memory across app restarts. */
export function connectorEncryption(isPackaged: boolean, env: NodeJS.ProcessEnv, native: Encryption): Encryption {
  if (isPackaged || env.APPYARD_CONNECTOR_TEST_MODE !== '1') return native;
  if (!connectorConfiguration(isPackaged, env).fixture) return native;
  if (native.isEncryptionAvailable() && native.getSelectedStorageBackend?.() !== 'basic_text') return native;
  const encoded = env.APPYARD_CONNECTOR_TEST_ENCRYPTION_KEY;
  if (!encoded || !/^[a-f0-9]{64}$/.test(encoded)) throw new Error('Local test encryption is not configured. Start the connector smoke script again.');
  const key = Buffer.from(encoded, 'hex'), header = Buffer.from('appyard-connector-test-v1\0');
  return {
    isEncryptionAvailable: () => true,
    encryptString(value) {
      const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
      cipher.setAAD(header);
      return Buffer.concat([header, nonce, cipher.update(value, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    },
    decryptString(value) {
      if (value.length < header.length + 28 || !value.subarray(0, header.length).equals(header)) throw new Error('Local test data cannot be opened. Start the connector smoke script again.');
      const decipher = createDecipheriv('aes-256-gcm', key, value.subarray(header.length, header.length + 12));
      decipher.setAAD(header); decipher.setAuthTag(value.subarray(-16));
      return Buffer.concat([decipher.update(value.subarray(header.length + 12, -16)), decipher.final()]).toString('utf8');
    }
  };
}
