import type { JsonValue } from './solution.js';

export const integrationLimits = { calls: 100, bytes: 2_000_000, timeoutMs: 30_000 } as const;
export interface IntegrationOperation {
  id: string;
  origin: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  responseType: 'json' | 'text';
  queryKeys?: string[];
  auth?: { type: 'bearer' | 'header-key'; credentialId: string; headerName?: string; envName: string };
}
export interface IntegrationInput { query?: Record<string, string>; body?: JsonValue }
export interface IntegrationEvidence {
  operationId: string; startedAt: string; durationMs: number; status: 'passed' | 'failed' | 'cancelled';
  requestBytes: number; responseBytes: number;
}
export interface BrokerHttpRequest { method: string; path: string; headers: Record<string, string>; body: string }
export interface BrokerHttpResponse { status: number; headers?: Record<string, string>; body: string }

const identifier = /^[A-Za-z][A-Za-z0-9_-]{0,99}$/;
const ordinary = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function validateIntegrationOperation(value: unknown): IntegrationOperation {
  if (!ordinary(value) || typeof value.id !== 'string' || !identifier.test(value.id)
    || typeof value.origin !== 'string' || typeof value.path !== 'string'
    || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(value.method as string)
    || !['json', 'text'].includes(value.responseType as string)) throw new Error('Invalid integration operation.');
  if (Object.keys(value).some(key => !['id', 'origin', 'path', 'method', 'responseType', 'queryKeys', 'auth'].includes(key))) throw new Error('Unknown integration operation field.');
  const url = new URL(value.origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || url.origin !== value.origin
    || !url.hostname.includes('.') || /[\[\]:]/.test(url.hostname) || /^\d+(?:\.\d+){3}$/.test(url.hostname)
    || /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname)) throw new Error('Integration origins must be explicit public HTTPS origins.');
  if (!value.path.startsWith('/') || value.path.startsWith('//') || /[\\?#\u0000-\u0020]/.test(value.path)
    || new URL(value.path, url).pathname !== value.path || /%2f|%5c|%2e/i.test(value.path)) throw new Error('Integration paths must be fixed, normalized paths.');
  if (value.queryKeys !== undefined && (!Array.isArray(value.queryKeys) || value.queryKeys.length > 30
    || !value.queryKeys.every(key => typeof key === 'string' && identifier.test(key))
    || new Set(value.queryKeys).size !== value.queryKeys.length)) throw new Error('Invalid integration query allowlist.');
  if (value.auth !== undefined) {
    const auth = value.auth;
    if (!ordinary(auth) || !['bearer', 'header-key'].includes(auth.type as string)
      || typeof auth.credentialId !== 'string' || !identifier.test(auth.credentialId)
      || typeof auth.envName !== 'string' || !/^[A-Z][A-Z0-9_]{0,99}$/.test(auth.envName)) throw new Error('Invalid integration credential reference.');
    if (Object.keys(auth).some(key => !['type', 'credentialId', 'headerName', 'envName'].includes(key))) throw new Error('Unknown integration authentication field.');
    if (auth.type === 'header-key' && (typeof auth.headerName !== 'string' || !/^[A-Za-z][A-Za-z0-9-]{0,99}$/.test(auth.headerName)
      || /^(?:host|connection|content-length|transfer-encoding|cookie|proxy-.*|sec-.*)$/i.test(auth.headerName))) throw new Error('Invalid integration authentication header.');
    if (auth.type === 'bearer' && auth.headerName !== undefined) throw new Error('Bearer authentication uses the Authorization header.');
  }
  return structuredClone(value) as unknown as IntegrationOperation;
}

/** Public export metadata contains the environment name, never the host vault identifier. */
export function exportIntegrationOperations(operations: readonly IntegrationOperation[]) {
  return operations.map(operation => {
    const result = validateIntegrationOperation(operation);
    if (!result.auth) return result;
    const { credentialId: _privateReference, ...auth } = result.auth;
    return { ...result, auth };
  });
}
