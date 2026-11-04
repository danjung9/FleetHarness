import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { SecretStore } from './types.js';
import type { ConnectorPreview } from '../../shared/connectors.js';
export interface Encryption {
  isEncryptionAvailable(): boolean;
  getSelectedStorageBackend?(): string;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}
export function validId(id: string) { if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) throw new Error('This saved source is not available. Choose it again in Connectors.'); return id; }
async function atomicWrite(target: string, contents: string | Buffer) {
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = target + '.' + randomUUID();
  try { await fs.writeFile(temporary, contents, { flag: 'wx', mode: 0o600 }); await fs.rename(temporary, target); }
  finally { await fs.rm(temporary, { force: true }); }
}
export class ConnectorStore {
  constructor(readonly root: string, private encryption: Encryption) {}
  async init() { await fs.mkdir(path.join(this.root, 'snapshots'), { recursive: true, mode: 0o700 }); }
  private snapshotPath(id: string) { return path.join(this.root, 'snapshots', validId(id) + '.json'); }
  async save(snapshot: ConnectorPreview) { await atomicWrite(this.snapshotPath(snapshot.id), JSON.stringify(snapshot)); }
  async read(id: string): Promise<ConnectorPreview> { return JSON.parse(await fs.readFile(this.snapshotPath(id), 'utf8')); }
  async list(): Promise<ConnectorPreview[]> {
    const entries = await fs.readdir(path.join(this.root, 'snapshots'));
    return Promise.all(entries.filter(file => /^[a-f0-9-]{36}\.json$/.test(file)).map(file => this.read(file.slice(0, -5))));
  }
  async remove(id: string) {
    await fs.rm(this.snapshotPath(id), { force: true });
    await fs.rm(path.join(this.root, 'secrets', validId(id)), { recursive: true, force: true });
  }
  secrets(id: string): SecretStore {
    const root = path.join(this.root, 'secrets', validId(id));
    const target = (name: string) => path.join(root, createHash('sha256').update(name).digest('hex') + '.enc');
    const assertEncryption = () => {
      if (!this.encryption.isEncryptionAvailable() || this.encryption.getSelectedStorageBackend?.() === 'basic_text') throw new Error('Secure storage is unavailable. Use sample data.');
    };
    return {
      get: async name => {
        try { const encrypted = await fs.readFile(target(name)); assertEncryption(); return this.encryption.decryptString(encrypted); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw new Error('The saved sign-in cannot be opened. Connect this source again.'); }
      },
      set: async (name, value) => {
        assertEncryption();
        try { await atomicWrite(target(name), this.encryption.encryptString(value)); }
        catch { throw new Error('The sign-in could not be saved securely. Use sample data.'); }
      },
      remove: async name => { await fs.rm(target(name), { force: true }); }
    };
  }
}
