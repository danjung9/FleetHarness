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
import { readVisualCapture } from '../../dist-electron/electron/visual-review.js';
import { registerConnectorIPC } from '../../dist-electron/electron/connectors/index.js';
import { GENAI_MIL_PROVIDER, GENAI_MIL_ADDRESS, genAiMilUnlockUrl } from '../../dist-electron/electron/genai-mil.js';

import { PreviewBoundary } from '../../dist-electron/electron/preview-boundary.js';
import { experimentMethodNames } from '../../dist-electron/shared/experiments.js';
import { storageMethodNames } from '../../dist-electron/shared/data-storage.js';
import * as mailMcpDemo from '../../dist-electron/electron/mailmcp-demo.js';

// Exercise the actual IPC handlers. Only Electron's window/IPC transport and
// unrelated startup services are replaced. Filesystem and delivery gates are real.
export async function mainHarness(store, backend = { active: new Map() }, source = 'electron/main.ts', overrides = {}) {
  const handlers = new Map(), events = new Map();
  const webContents = { mainFrame: {}, send() {} };
  const app = {
    commandLine: { appendSwitch() {} }, isPackaged: false, getAppPath: () => process.cwd(), getPath: () => store.root,
    setPath() {}, setName() {}, requestSingleInstanceLock: () => true, whenReady: () => ({ then() {} }),
    on: (name, callback) => events.set(name, callback), quit() {},
  };
  let script = stripTypeScriptTypes(await fs.readFile(source, 'utf8'), { mode: 'strip' });
  script = script.replace(/^import .*?;\s*$/gm, '').replaceAll('import.meta.url', '__moduleUrl');
  const scope = {
    ...mailMcpDemo,
    PreviewBoundary, experimentMethodNames, storageMethodNames, redactSecrets, redactValue, registerCredential, ...storage, ...delivery, ...review, ...verification, ...executable, atomicHostWrite, exportVerifiedBundle, reportPassed, readVisualCapture, registerConnectorIPC, GENAI_MIL_PROVIDER, genAiMilUnlockUrl, fs, disk: fs, path, fileURLToPath, process,
    __moduleUrl: pathToFileURL(path.resolve(source)).href,
    app, ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    PreviewServers: class { close() {} }, ApplicationPreviews: class { async close() {} async stop() {} }, shell: { showItemInFolder() {} },
    dialog: {}, safeStorage: {}, Menu: {}, BrowserWindow: class {},
    setTimeout, clearTimeout, AbortController, structuredClone, console,
    hostStore: store, hostBackend: backend,
    hostExperiments: { activeCount: 0, activeExperiment: () => undefined, isActive: () => false, learning: { getSettings: () => ({ mode: 'off' }) }, refreshProjectSummaries() {}, async assertSelectedVerified() {}, async exportReference() {}, async closeCandidatePreview() {} },
    hostCodex: { account: { status: 'disconnected' } }, hostLead: { active: new Map() }, hostConnectors: undefined,
    hostCodexGoals: { isActive: () => false, activeIds: () => [], pending: () => [], async stop() {}, async stopAll() {} },
    hostGenAiMil: { view: () => ({ address: GENAI_MIL_ADDRESS, hasKey: false, connected: false, models: [] }) },
    hostWindow: { webContents, isDestroyed: () => false },
    ...overrides,
  };
  vm.runInNewContext(script + '\nstore = hostStore; backend = hostBackend; experiments = hostExperiments; window = hostWindow; codex = hostCodex; lead = hostLead; connectors = hostConnectors; codexGoals = hostCodexGoals; genAiMil = hostGenAiMil; registerIPC();', scope);
  return {
    handlers, events,
    invoke: (channel, ...args) => handlers.get(channel)({ sender: webContents, senderFrame: webContents.mainFrame }, ...args),
  };
}
