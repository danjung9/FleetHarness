import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import type { ConnectorAdapter, ConnectorKind, SecretStore } from './types.js';
import type { ConnectorCard, ConnectorFilters, ConnectorPreview } from '../../shared/connectors.js';
import { ConnectorStore } from './store.js';
import { connectorCatalog, sampleAdapter } from './sample-data.js';
import { sanitizeItems } from './sanitize.js';
import { snapshotDigest, validateSnapshot } from './snapshot.js';

const noSecrets: SecretStore = { get: async () => undefined, set: async () => { throw new Error('Sample data does not use a sign-in. Try sample data again.'); }, remove: async () => {} };
const failure = () => new Error('The data could not be prepared. Try sample data again.');
function kindOf(kind: ConnectorKind) {
  if (!connectorCatalog.some(card => card.kind === kind)) throw new Error('This source is not available. Choose a source from the list.');
  return kind;
}
function filtersOf(filters: ConnectorFilters): ConnectorFilters {
  if (!filters || typeof filters !== 'object' || (filters.sinceDays !== undefined && (!Number.isInteger(filters.sinceDays) || filters.sinceDays < 1 || filters.sinceDays > 365)) ||
      [filters.query, filters.folder].some(value => value !== undefined && (typeof value !== 'string' || value.length > 200))) throw new Error('These choices are not valid. Use up to 365 days and a shorter search.');
  return { sinceDays: filters.sinceDays ?? 30, query: filters.query?.trim(), folder: filters.folder?.trim() };
}

export class ConnectorService {
  private adapters = new Map<ConnectorKind, ConnectorAdapter>();
  private pending = new Map<ConnectorKind, ConnectorPreview>();
  private operations = new Map<ConnectorKind, AbortController>();
  private mutations: Promise<unknown> = Promise.resolve();
  constructor(readonly store: ConnectorStore, adapters: ConnectorAdapter[] = [], private timeoutMs = 20_000) { adapters.forEach(adapter => this.register(adapter)); }
  /** Account and data-service modules register their unchanged ConnectorAdapter here. */
  register(adapter: ConnectorAdapter) { kindOf(adapter.kind); this.adapters.set(adapter.kind, adapter); }
  /** Optional modules compile and register when their files land in this clone. */
  async registerInstalledAdapters() {
    const installed: ConnectorKind[] = [];
    for (const [file, constructors] of [
      ['google.js', ['GmailConnector', 'GoogleCalendarConnector', 'GoogleDriveConnector']],
      ['microsoft.js', ['OutlookConnector', 'OutlookCalendarConnector', 'OneDriveConnector']],
      ['custom-api.js', ['CustomApiConnector']]
    ] as const) {
      const url = new URL(file, import.meta.url);
      try { await fs.access(url); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw failure(); }
      // A present but broken module must not silently count as registered.
      try {
        const module = await import(url.href);
        for (const name of constructors) {
          const adapter: ConnectorAdapter = new module[name](); this.register(adapter); installed.push(adapter.kind);
        }
      } catch { throw new Error('A source could not be opened. Ask your administrator to check the connector installation.'); }
    }
    return installed;
  }
  async init() { await this.store.init(); }
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.mutations.catch(() => {}).then(work); this.mutations = next; return next;
  }
  async list(): Promise<ConnectorCard[]> {
    const saved = (await this.store.list()).map(validateSnapshot);
    return connectorCatalog.map(card => {
      const snapshot = saved.find(snapshot => snapshot.kind === card.kind);
      return { ...card, available: false, ...(snapshot ? { connection: {
        id: snapshot.id, kind: snapshot.kind, label: snapshot.label, sample: snapshot.sample, digest: snapshot.digest,
        excluded: snapshot.excluded, redacted: snapshot.redacted, limited: snapshot.limited, count: snapshot.items.length
      } } : {}) };
    });
  }
  async cancel(kind: ConnectorKind) {
    kindOf(kind); this.operations.get(kind)?.abort(); this.pending.delete(kind);
  }
  async preview(kind: ConnectorKind, filters: ConnectorFilters = {}): Promise<ConnectorPreview> {
    kindOf(kind); const options = filtersOf(filters);
    this.operations.get(kind)?.abort(); this.pending.delete(kind);
    const controller = new AbortController(); this.operations.set(kind, controller);
    let rejectAbort!: () => void;
    const cancelled = new Promise<never>((_, reject) => { rejectAbort = () => reject(failure()); controller.signal.addEventListener('abort', rejectAbort, { once: true }); });
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      // All cards deliberately use samples until account modules are integrated
      // and the event profile permits real accounts. Registration cannot enable them.
      const adapter = sampleAdapter(kind);
      const raw = await Promise.race([adapter.fetch(noSecrets, { ...options, maxItems: 100, maxBytes: 512_000, signal: controller.signal }), cancelled]);
      controller.signal.throwIfAborted();
      const clean = sanitizeItems(raw);
      const result: ConnectorPreview = { id: randomUUID(), kind, label: adapter.label, sample: true, ...clean, digest: '' };
      result.digest = snapshotDigest(result); this.pending.set(kind, result);
      return structuredClone(result);
    } catch { throw failure(); }
    finally { clearTimeout(timer); controller.signal.removeEventListener('abort', rejectAbort); if (this.operations.get(kind) === controller) this.operations.delete(kind); }
  }
  use(id: string, digest: string) {
    return this.serial(async () => {
      const pending = [...this.pending.values()].find(snapshot => snapshot.id === id && snapshot.digest === digest);
      if (!pending) throw new Error('This preview has expired. Check the data again.');
      // Consume the approval before the first await so cancellation cannot revive it.
      this.pending.delete(pending.kind);
      const previous = (await this.store.list()).filter(snapshot => snapshot.kind === pending.kind);
      await this.store.save(pending);
      for (const old of previous) await this.store.remove(old.id);
    });
  }
  disconnect(id: string) {
    return this.serial(async () => {
      let snapshot: ConnectorPreview;
      try { snapshot = validateSnapshot(await this.store.read(id)); } catch { throw new Error('This source is no longer saved. Refresh the source list.'); }
      await this.cancel(snapshot.kind);
      let revokeFailed = false;
      try { if (!snapshot.sample) await this.adapters.get(snapshot.kind)?.disconnect(this.store.secrets(id)); }
      catch { revokeFailed = true; }
      finally { await this.store.remove(id); }
      if (revokeFailed) throw new Error('The saved sign-in was removed, but the account could not be reached. Remove AppYard access on the account website.');
    });
  }
  async shutdown() { for (const kind of this.operations.keys()) await this.cancel(kind); this.pending.clear(); }
}

/** Use the host's checked IPC registrar, so child frames cannot call connectors. */
export function registerConnectorIPC(handle: (channel: string, fn: (...args: any[]) => unknown) => void, service: ConnectorService) {
  const safe = (work: (...args: any[]) => Promise<unknown>) => async (...args: any[]) => {
    try { return await work(...args); } catch { throw new Error('The source could not be read or saved. Try sample data again.'); }
  };
  handle('fleet:connectors:list', safe(() => service.list()));
  handle('fleet:connectors:preview', safe((kind: ConnectorKind, filters: ConnectorFilters) => service.preview(kind, filters)));
  handle('fleet:connectors:use', safe((id: string, digest: string) => service.use(id, digest)));
  handle('fleet:connectors:cancel', safe((kind: ConnectorKind) => service.cancel(kind)));
  handle('fleet:connectors:disconnect', safe((id: string) => service.disconnect(id)));
}
