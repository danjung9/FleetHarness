// Run by smoke-connectors.mjs as an Electron main script. Exercises the real OS encryption
// through the real store and prints only booleans, never the synthetic value or ciphertext.
import { app, safeStorage } from 'electron';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ConnectorStore } from '../dist-electron/electron/connectors/store.js';

const root = process.argv.at(-1);
app.whenReady().then(async () => {
  const id = randomUUID(), value = 'synthetic-native-secret-' + randomUUID();
  const store = new ConnectorStore(root, safeStorage); await store.init();
  const secrets = store.secrets(id); await secrets.set('access', value);
  const restored = await secrets.get('access');
  const names = await fs.readdir(path.join(root, 'secrets', id));
  const encrypted = await fs.readFile(path.join(root, 'secrets', id, names[0]));
  await store.remove(id);
  console.log('NATIVE ' + JSON.stringify({ restored: restored === value, encrypted: !encrypted.includes(Buffer.from(value)), removed: (await secrets.get('access')) === undefined }));
  app.exit(0);
}).catch(error => { console.log('NATIVE ' + JSON.stringify({ error: String(error.message).slice(0, 200) })); app.exit(1); });
