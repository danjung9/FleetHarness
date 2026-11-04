import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Project } from '../shared/types.js';
import { safeFile, sourceHash } from './storage.js';
import { reportPassed } from './verification.js';

export function executableName(project: Pick<Project, 'title'>) {
  // Prefix also avoids Windows reserved device names.
  return 'app-' + (project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'tool');
}
export function executableFileName(project: Pick<Project, 'title'>) {
  return `${executableName(project)}-${process.platform}-${process.arch}.zip`;
}
export async function assertExecutableSource(project: Project) {
  if (!project.approvedAt || !['approved', 'delivered'].includes(project.status)) throw new Error('Review and approve this prototype before downloading the app.');
  if (!project.workspace || !reportPassed(project.report, project.qualityVersion === 1)) throw new Error('Passing automated tests and required browser journeys are required before delivery.');
  if (await sourceHash(project.workspace) !== project.report!.sourceHash) throw new Error('Artifacts changed after verification. Start a new run before downloading the app.');
}

// This is host-owned code. Generated code only runs inside the sandboxed renderer.
export function standaloneMain(title: string, appId: string) {
  return `const { app, BrowserWindow, protocol, Menu } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setName(${JSON.stringify(title)});
app.setPath('userData', path.join(app.getPath('appData'), ${JSON.stringify(appId)}));
protocol.registerSchemesAsPrivileged([{ scheme: 'fleet-app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let window;
function openWindow() {
  window = new BrowserWindow({ title: ${JSON.stringify(title)}, width: 1200, height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webviewTag: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('will-frame-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.loadURL('fleet-app://app/index.html');
  window.on('closed', () => { window = null; });
}
app.whenReady().then(() => {
  protocol.handle('fleet-app', async request => {
    const url = new URL(request.url);
    if (url.host !== 'app' || url.pathname !== '/index.html' || request.method !== 'GET') return new Response('', { status: 404 });
    return new Response(await fs.readFile(path.join(__dirname, 'index.html')), { headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'"
    } });
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: app.name, submenu: [{ role: 'about' }, { role: 'quit' }] }] : []),
    { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }
  ]));
  openWindow();
  app.on('activate', () => { if (!window) openWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
`;
}

export interface PackageJob { source: string; output: string; archive: string; electronVersion: string; name: string; appId: string }

export async function stageExecutable(project: Project, root: string) {
  await assertExecutableSource(project);
  const source = path.join(root, 'source');
  await fs.mkdir(source);
  const file = await safeFile(project.workspace!, 'index.html');
  const html = await fs.readFile(file);
  if (!html.length || html.length > 2_000_000) throw new Error('The standalone app needs a self-contained index.html between 1 byte and 2 MB, matching the app preview.');
  const name = executableName(project);
  const appId = 'dev.fleetharness.generated.' + createHash('sha256').update(project.id).digest('hex').slice(0, 24);
  // An allowlist deliberately leaves out agent code, dependencies, sessions and credentials.
  await fs.writeFile(path.join(source, 'index.html'), html);
  await fs.writeFile(path.join(source, 'main.cjs'), standaloneMain(project.title, appId));
  await fs.writeFile(path.join(source, 'package.json'), JSON.stringify({ name, productName: project.title, version: '1.0.0', main: 'main.cjs', private: true }));
  await assertExecutableSource(project);
  if (!html.equals(await fs.readFile(await safeFile(project.workspace!, 'index.html')))) throw new Error('Application changed while preparing the download. Start a new run.');
  return { source, name, appId };
}

export async function runPackageWorker(job: PackageJob, executable: string, signal?: AbortSignal, timeoutMs = 10 * 60_000,
  worker = fileURLToPath(new URL('./package-worker.js', import.meta.url))) {
  signal?.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    // Use Electron's bundled Node runtime; end users do not need a Node installation.
    // Packaging must see .asar files as files, not Electron's virtual directories.
    // The worker and its dependencies are unpacked in the distributed host.
    const physicalWorker = worker.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
    const child = spawn(executable, [physicalWorker, JSON.stringify(job)], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ELECTRON_NO_ASAR: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32', windowsHide: true
    });
    let output = '', failure: Error | undefined;
    const collect = (data: Buffer) => { output = (output + data.toString()).slice(-8000); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    const stop = (message: string) => {
      failure = new Error(message);
      if (child.pid && process.platform !== 'win32') { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
      else child.kill('SIGKILL');
    };
    const abort = () => stop('Packaging stopped. Download the app again to retry.');
    const timer = setTimeout(() => stop('Packaging exceeded 10 minutes. Check your connection and download the app again.'), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.once('error', error => { failure = error; });
    child.once('close', code => {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error('Could not package the app. Check your connection and retry.\n' + output));
      else resolve();
    });
  });
}

export async function saveExecutable(archive: string, destination: string, workspace: string) {
  const parent = await fs.realpath(path.dirname(destination)), base = await fs.realpath(workspace);
  if (parent === base || parent.startsWith(base + path.sep)) throw new Error('Save the download outside the agent workspace.');
  const target = path.join(parent, path.basename(destination));
  const temporary = path.join(parent, '.' + randomUUID() + '.download');
  try {
    await fs.copyFile(archive, temporary);
    await fs.rename(temporary, target);
  } finally { await fs.rm(temporary, { force: true }); }
  return target;
}
