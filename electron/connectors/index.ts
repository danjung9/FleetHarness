import { randomUUID } from 'node:crypto';
import type { ConnectorAdapter, ConnectorKind, ConnectUi, SecretStore } from './types.js';
import type { ConnectorCard, ConnectorFilters, ConnectorPreview, ConnectorProgress, SavedConnection } from '../../shared/connectors.js';
import { ConnectorStore } from './store.js';
import { connectorCatalog, sampleAdapter } from './sample-data.js';
import { sanitizeItems } from './sanitize.js';
import { snapshotDigest, validateSnapshot } from './snapshot.js';
import { ConnectorError } from './oauth.js';
import { ServiceError } from './custom-api.js';
import { connectorConfiguration, installedAdapters } from './config.js';

class PublicError extends Error {}
const failure = () => new PublicError('The data could not be prepared. Try sample data again.');
function publicMessage(error: unknown) {
  return error instanceof PublicError || error instanceof ConnectorError || error instanceof ServiceError ? error.message : failure().message;
}
const noSecrets: SecretStore = { get: async () => undefined, set: async () => { throw failure(); }, remove: async () => {} };
function kindOf(kind: ConnectorKind) {
  if (!connectorCatalog.some(card => card.kind === kind)) throw new PublicError('This source is not available. Choose a source from the list.');
  return kind;
}
function filtersOf(filters: ConnectorFilters): ConnectorFilters {
  if (!filters || typeof filters !== 'object' || (filters.sinceDays !== undefined && (!Number.isInteger(filters.sinceDays) || filters.sinceDays < 1 || filters.sinceDays > 365)) ||
      [filters.query, filters.folder].some(value => value !== undefined && (typeof value !== 'string' || value.length > 200))) throw new PublicError('These choices are not valid. Use up to 365 days and a shorter search.');
  return { sinceDays: filters.sinceDays ?? 30, query: filters.query?.trim(), folder: filters.folder?.trim() };
}
interface Operation {
  controller: AbortController; state: ConnectorProgress; done: Promise<void>; finish: () => void; settled: boolean;
  question?: { requestId: string; resolve: (answer: string) => void };
}
interface ServiceOptions {
  allowConnections?: boolean;
  openBrowser?: (url: string) => Promise<void>;
  /** Host-only provenance check for synthetic fixtures, never a renderer or saved setting. */
  isSynthetic?: (kind: ConnectorKind, secrets: SecretStore) => Promise<boolean>;
}
export class ConnectorService {
  private adapters = new Map<ConnectorKind, ConnectorAdapter>();
  private pending = new Map<ConnectorKind, ConnectorPreview>();
  private operations = new Map<ConnectorKind, Operation>();
  private mutations: Promise<unknown> = Promise.resolve();
  private writes = 0;
  constructor(readonly store: ConnectorStore, adapters: ConnectorAdapter[] = [], private timeoutMs = 120_000, private options: ServiceOptions = {}) { adapters.forEach(adapter => this.register(adapter)); }
  register(adapter: ConnectorAdapter) { kindOf(adapter.kind); this.adapters.set(adapter.kind, adapter); }
  async registerInstalledAdapters(configuration = connectorConfiguration(true, process.env)) {
    const adapters = installedAdapters(configuration); adapters.forEach(adapter => this.register(adapter)); return adapters.map(adapter => adapter.kind);
  }
  async init() { await this.store.init(); }
  get busy() { return this.writes > 0 || [...this.operations.values()].some(op => !op.settled); }
  private serial<T>(work: () => Promise<T>): Promise<T> {
    this.writes++;
    const next = this.mutations.catch(() => {}).then(work).finally(() => { this.writes--; }); this.mutations = next; return next;
  }
  private begin(kind: ConnectorKind, stage: ConnectorProgress['stage']) {
    const previous = this.operations.get(kind); previous?.controller.abort(); this.pending.delete(kind);
    let finish!: () => void;
    const op: Operation = { controller: new AbortController(), state: { stage }, settled: false, done: new Promise(resolve => { finish = resolve; }), finish: () => { op.settled = true; finish(); } };
    this.operations.set(kind, op); return { op, previous };
  }
  private wait<T>(promise: Promise<T>, op: Operation): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const aborted = () => reject(failure());
      op.controller.signal.addEventListener('abort', aborted, { once: true });
      if (op.controller.signal.aborted) aborted();
      promise.then(resolve, reject).finally(() => op.controller.signal.removeEventListener('abort', aborted));
    });
  }
  private secrets(id: string, op: Operation): SecretStore {
    const store = this.store.secrets(id), signal = op.controller.signal;
    return {
      get: async name => { signal.throwIfAborted(); return store.get(name); },
      set: async (name, value) => { signal.throwIfAborted(); await store.set(name, value); if (signal.aborted) { await store.remove(name); signal.throwIfAborted(); } },
      remove: name => store.remove(name)
    };
  }
  private ui(op: Operation, address?: string): ConnectUi {
    return {
      openBrowser: async url => {
        op.controller.signal.throwIfAborted();
        if (!this.options.openBrowser) throw new PublicError('The sign-in page could not be opened. Try connecting again.');
        await this.wait(this.options.openBrowser(url), op);
      },
      showCode: async (value, url) => { op.controller.signal.throwIfAborted(); op.state.code = { value, url }; },
      ask: async question => {
        op.controller.signal.throwIfAborted();
        if (question.id === 'address' && address) return address;
        const requestId = randomUUID();
        op.state = { ...op.state, stage: 'question', question: { requestId, label: question.label, secret: question.secret, options: question.options } };
        try { return await this.wait(new Promise<string>(resolve => { op.question = { requestId, resolve }; }), op); }
        finally { op.question = undefined; delete op.state.question; if (!op.controller.signal.aborted) op.state.stage = 'connecting'; }
      }
    };
  }
  async progress(kind: ConnectorKind): Promise<ConnectorProgress> { kindOf(kind); return structuredClone(this.operations.get(kind)?.state ?? { stage: 'idle' }); }
  async answer(kind: ConnectorKind, requestId: string, value: string) {
    kindOf(kind); const op = this.operations.get(kind), question = op?.state.question;
    if (!op || op.controller.signal.aborted || !question || op.question?.requestId !== requestId || typeof value !== 'string' || value.length > 16_000 || (question.options && !question.options.some(option => option.id === value))) throw new PublicError('This question has expired. Try connecting again.');
    delete op.state.question; op.question.resolve(value); op.question = undefined;
  }
  async list(): Promise<ConnectorCard[]> {
    await this.mutations.catch(() => {});
    const saved = (await this.store.list()).map(validateSnapshot), connections = await this.store.connections();
    return connectorCatalog.map(card => {
      const snapshot = saved.find(snapshot => snapshot.kind === card.kind), signedIn = connections.find(connection => connection.kind === card.kind && !connection.sample);
      return { ...card, available: !!this.options.allowConnections && !!this.adapters.get(card.kind)?.available(), ...(signedIn ? { signedIn: { id: signedIn.id } } : {}), ...(snapshot ? { connection: {
        id: snapshot.id, kind: snapshot.kind, label: snapshot.label, sample: snapshot.sample, digest: snapshot.digest,
        excluded: snapshot.excluded, redacted: snapshot.redacted, limited: snapshot.limited, count: snapshot.items.length
      } } : {}) };
    });
  }
  async cancel(kind: ConnectorKind) {
    kindOf(kind); const op = this.operations.get(kind); this.pending.delete(kind);
    if (op) { op.controller.abort(); op.state = { stage: 'cancelled' }; await op.done; }
  }
  private async remove(connection: SavedConnection) {
    let revokeFailed = false;
    try { if (!connection.sample) await this.adapters.get(connection.kind)?.disconnect(this.store.secrets(connection.id)); }
    catch { revokeFailed = true; }
    finally { await this.store.remove(connection.id); }
    if (revokeFailed) throw new PublicError('The saved sign-in was removed, but the account could not be reached. Remove AppYard access on the account website.');
  }
  async connect(kind: ConnectorKind, address?: string) {
    kindOf(kind); const adapter = this.adapters.get(kind);
    if (!this.options.allowConnections || !adapter?.available()) throw new PublicError('Sign-in is not set up for this source. Ask your administrator to enable it.');
    if (address !== undefined && (kind !== 'custom-api' || typeof address !== 'string' || address.length > 2_000)) throw new PublicError('This address is not valid. Paste the service address or its documentation link.');
    const { op, previous } = this.begin(kind, 'connecting'), id = randomUUID();
    const timer = setTimeout(() => op.controller.abort(), 300_000);
    try {
      await previous?.done; op.controller.signal.throwIfAborted();
      // Finish account revocation before issuing replacement credentials.
      // A data-service key has no remote grant and can be replaced after success.
      if (kind !== 'custom-api') await this.serial(async () => {
        for (const old of await this.store.connections()) if (old.kind === kind && !old.sample) await this.remove(old);
      });
      op.controller.signal.throwIfAborted();
      await this.wait(adapter.connect(this.secrets(id, op), this.ui(op, address), op.controller.signal), op);
      op.controller.signal.throwIfAborted();
      await this.serial(async () => {
        for (const old of await this.store.connections()) if (old.kind === kind) await this.remove(old);
        for (const old of await this.store.list()) if (old.kind === kind) await this.store.remove(old.id);
        op.controller.signal.throwIfAborted(); await this.store.saveConnection({ id, kind, sample: false });
        op.controller.signal.throwIfAborted();
      });
      op.state = { stage: 'choose' };
    } catch (error) {
      await this.store.remove(id); op.state = op.controller.signal.aborted ? { stage: 'cancelled' } : { stage: 'failed', error: publicMessage(error) };
      throw new PublicError(publicMessage(error));
    } finally { clearTimeout(timer); op.finish(); }
  }
  async preview(kind: ConnectorKind, filters: ConnectorFilters = {}, mode: 'sample' | 'connected' = 'sample'): Promise<ConnectorPreview> {
    kindOf(kind); const options = filtersOf(filters);
    if (!['sample', 'connected'].includes(mode)) throw failure();
    const { op, previous } = this.begin(kind, 'fetching'), timer = setTimeout(() => op.controller.abort(), this.timeoutMs);
    try {
      await previous?.done; op.controller.signal.throwIfAborted();
      const connection = mode === 'connected' ? (await this.store.connections()).find(record => record.kind === kind && !record.sample) : undefined;
      if (mode === 'connected' && (!this.options.allowConnections || !connection)) throw new PublicError('This source is not connected. Choose Connect first.');
      const adapter = mode === 'sample' ? sampleAdapter(kind) : this.adapters.get(kind);
      if (!adapter) throw failure();
      const secrets = connection ? this.secrets(connection.id, op) : noSecrets;
      const raw = await this.wait(adapter.fetch(secrets, { ...options, maxItems: 100, maxBytes: 512_000, signal: op.controller.signal }), op);
      op.controller.signal.throwIfAborted();
      const clean = sanitizeItems(raw), sample = mode === 'sample' || !!(await this.options.isSynthetic?.(kind, secrets));
      op.controller.signal.throwIfAborted();
      const result: ConnectorPreview = { id: connection?.id ?? randomUUID(), kind, label: connectorCatalog.find(card => card.kind === kind)!.label, sample, ...clean, digest: '' };
      result.digest = snapshotDigest(result); this.pending.set(kind, result); op.state = { stage: 'preview' };
      return structuredClone(result);
    } catch (error) {
      op.state = op.controller.signal.aborted ? { stage: 'cancelled' } : { stage: 'failed', error: publicMessage(error) };
      throw new PublicError(publicMessage(error));
    } finally { clearTimeout(timer); op.finish(); }
  }
  use(id: string, digest: string) {
    return this.serial(async () => {
      const pending = [...this.pending.values()].find(snapshot => snapshot.id === id && snapshot.digest === digest);
      if (!pending) throw new PublicError('This preview has expired. Check the data again.');
      this.pending.delete(pending.kind);
      const connections = await this.store.connections();
      for (const old of connections) if (old.kind === pending.kind && old.id !== id) await this.remove(old);
      const previous = (await this.store.list()).filter(snapshot => snapshot.kind === pending.kind && snapshot.id !== id);
      await this.store.save(pending);
      if (!connections.some(connection => connection.id === id)) await this.store.saveConnection({ id, kind: pending.kind, sample: true });
      for (const old of previous) await this.store.remove(old.id);
    });
  }
  async disconnect(id: string) {
    let connection = (await this.store.connections()).find(record => record.id === id);
    if (!connection) {
      try { const snapshot = validateSnapshot(await this.store.read(id)); connection = { id, kind: snapshot.kind, sample: snapshot.sample }; }
      catch { throw new PublicError('This source is no longer saved. Refresh the source list.'); }
    }
    await this.cancel(connection.kind);
    const saved = connection; await this.serial(() => this.remove(saved));
  }
  async shutdown() { await Promise.all([...this.operations.keys()].map(kind => this.cancel(kind))); this.pending.clear(); await this.mutations.catch(() => {}); }
}

/** Use the host's checked IPC registrar, so child frames cannot call connectors. */
export function registerConnectorIPC(handle: (channel: string, fn: (...args: any[]) => unknown) => void, service: ConnectorService) {
  const safe = (work: (...args: any[]) => Promise<unknown>) => async (...args: any[]) => {
    try { return await work(...args); } catch (error) { throw new Error(publicMessage(error)); }
  };
  handle('fleet:connectors:list', safe(() => service.list()));
  handle('fleet:connectors:connect', safe((kind: ConnectorKind, address?: string) => service.connect(kind, address)));
  handle('fleet:connectors:progress', safe((kind: ConnectorKind) => service.progress(kind)));
  handle('fleet:connectors:answer', safe((kind: ConnectorKind, requestId: string, value: string) => service.answer(kind, requestId, value)));
  handle('fleet:connectors:preview', safe((kind: ConnectorKind, filters: ConnectorFilters, mode?: 'sample' | 'connected') => service.preview(kind, filters, mode)));
  handle('fleet:connectors:use', safe((id: string, digest: string) => service.use(id, digest)));
  handle('fleet:connectors:cancel', safe((kind: ConnectorKind) => service.cancel(kind)));
  handle('fleet:connectors:disconnect', safe((id: string) => service.disconnect(id)));
}
