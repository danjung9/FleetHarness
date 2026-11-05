import { redactSecrets, redactValue, registerCredential } from '../../dist-electron/electron/secrets.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import * as storage from '../../dist-electron/electron/storage.js';
import { reportPassed } from '../../dist-electron/shared/verification.js';
import * as delivery from '../../dist-electron/electron/delivery.js';
import * as review from '../../dist-electron/electron/review.js';
import * as verification from '../../dist-electron/electron/verification.js';
import { atomicHostWrite } from '../../dist-electron/shared/host-files.js';
import * as executable from '../../dist-electron/electron/executable.js';
import { exportVerifiedBundle } from '../../dist-electron/electron/source-export.js';

// Exercise the actual IPC handlers. Only Electron's window/IPC transport and
// unrelated startup services are replaced. Filesystem and delivery gates are real.
export async function mainHarness(store, backend = { active: new Map() }, source = 'electron/main.ts', overrides = {}) {
  const handlers = new Map(), events = new Map();
  const webContents = { mainFrame: {}, send() {} };
  const app = {
    isPackaged: false, getAppPath: () => process.cwd(), getPath: () => store.root,
    setPath() {}, setName() {}, requestSingleInstanceLock: () => true, whenReady: () => ({ then() {} }),
    on: (name, callback) => events.set(name, callback), quit() {},
  };
  let script = stripTypeScriptTypes(await fs.readFile(source, 'utf8'), { mode: 'strip' });
  script = script.replace(/^import .*?;\s*$/gm, '').replaceAll('import.meta.url', '__moduleUrl');
  const scope = {
    redactSecrets, redactValue, registerCredential, ...storage, ...delivery, ...review, ...verification, ...executable, atomicHostWrite, exportVerifiedBundle, reportPassed, fs, disk: fs, path, fileURLToPath, process,
    __moduleUrl: pathToFileURL(path.resolve(source)).href,
    app, ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    PreviewServers: class { close() {} }, ApplicationPreviews: class { async close() {} async stop() {} }, shell: { showItemInFolder() {} },
    dialog: {}, safeStorage: {}, Menu: {}, BrowserWindow: class {},
    setTimeout, clearTimeout, AbortController, structuredClone, console,
    hostStore: store, hostBackend: backend,
    hostWindow: { webContents, isDestroyed: () => false },
    ...overrides,
  };
  vm.runInNewContext(script + '\nstore = hostStore; backend = hostBackend; window = hostWindow; registerIPC();', scope);
  return {
    handlers, events,
    invoke: (channel, ...args) => handlers.get(channel)({ sender: webContents, senderFrame: webContents.mainFrame }, ...args),
  };
}
