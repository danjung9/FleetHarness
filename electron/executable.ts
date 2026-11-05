import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Project } from '../shared/types.js';
import { safeFile, sourceHash, type SourceFileOverride } from './storage.js';
import { reportPassed } from './verification.js';
import { parseSolutionContract } from '../harness/solution-contract.js';

export function executableName(project: Pick<Project, 'title'>) {
  // Prefix also avoids Windows reserved device names.
  return 'app-' + (project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'tool');
}
export function executableFileName(project: Pick<Project, 'title'>) {
  return `${executableName(project)}-${process.platform}-${process.arch}.zip`;
}
export async function assertExecutableSource(project: Project) {
  if (!project.approvedAt || !['approved', 'delivered'].includes(project.status)) throw new Error('Review and approve this prototype before downloading the app.');
  if (!project.workspace || !reportPassed(project.report, project.qualityVersion ?? false)) throw new Error('Passing required capability, runtime and application checks are required before delivery.');
  if (await sourceHash(project.workspace) !== project.report!.sourceHash) throw new Error('Artifacts changed after verification. Start a new run before downloading the app.');
  const solution = await deliveredSolution(project.workspace);
  if (solution && solution.contract.runtime.profile !== 'browser') throw new Error('This solution uses a CLI or service runtime. Export the runnable source package and follow its README instead of downloading a browser-only app.');
}

async function deliveredSolution(root: string) {
  let body: Buffer;
  try { body = await fs.readFile(await safeFile(root, 'solution-contract.json')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
  const packetBody = await fs.readFile(await safeFile(root, '.fleet/packet.json'));
  const packet = JSON.parse(packetBody.toString('utf8'));
  return { contract: parseSolutionContract(JSON.parse(body.toString('utf8')), packet.acceptance),
    metadata: new Map([['solution-contract.json', body], ['.fleet/packet.json', packetBody]]) };
}

async function assertPayloadFiles(root: string, declared: readonly string[]) {
  if (!(await fs.lstat(root)).isDirectory()) throw new Error('The copied application directory is unsafe. Download the app again.');
  const remaining = new Set(declared.map(file => path.normalize(file)));
  const visit = async (directory = '') => {
    for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(relative);
      else if (!entry.isFile() || !remaining.delete(relative)) throw new Error('The copied application contains an unexpected or unsafe file. Download the app again.');
    }
  };
  await visit();
  if (remaining.size) throw new Error('The copied application is missing a declared file. Download the app again.');
}

// This is host-owned code. Generated code only runs inside the sandboxed renderer.
export function standaloneMain(title: string, appId: string, files: string[] = ['index.html'], payloadDirectory: '' | 'application' = '') {
  return `const { app, BrowserWindow, protocol, Menu } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setName(${JSON.stringify(title)});
app.setPath('userData', path.join(app.getPath('appData'), ${JSON.stringify(appId)}));
protocol.registerSchemesAsPrivileged([{ scheme: 'fleet-app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let window;
const allowedFiles = new Set(${JSON.stringify(files)});
const payloadRoot = path.join(__dirname, ${JSON.stringify(payloadDirectory)});
const contentTypes = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.wasm':'application/wasm'};
function isApplicationPage(address) {
  try {
    const url = new URL(address);
    const relative = decodeURIComponent(url.pathname).slice(1);
    return url.protocol === 'fleet-app:' && url.host === 'app' && !url.username && !url.password
      && allowedFiles.has(relative) && path.extname(relative) === '.html';
  } catch { return false; }
}
function openWindow() {
  window = new BrowserWindow({ title: ${JSON.stringify(title)}, width: 1200, height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webviewTag: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const restrictNavigation = event => {
    if (event.isMainFrame !== true || !isApplicationPage(event.url)) event.preventDefault();
  };
  window.webContents.on('will-navigate', restrictNavigation);
  window.webContents.on('will-frame-navigate', restrictNavigation);
  window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.loadURL('fleet-app://app/index.html');
  window.on('closed', () => { window = null; });
}
app.whenReady().then(() => {
  protocol.handle('fleet-app', async request => {
    const url = new URL(request.url);
    const relative = decodeURIComponent(url.pathname).slice(1);
    const extension = path.extname(relative);
    // Match preview data responses while keeping CommonJS entrypoints private.
    const type = contentTypes[extension] || 'application/octet-stream';
    if (url.host !== 'app' || !allowedFiles.has(relative) || extension.toLowerCase() === '.cjs' || request.method !== 'GET') return new Response('', { status: 404 });
    return new Response(await fs.readFile(path.join(payloadRoot, relative)), { headers: {
      'Content-Type': type,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'"
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
  try {
    const file = await safeFile(project.workspace!, 'index.html');
    const html = await fs.readFile(file);
    if (!html.length || html.length > 2_000_000) throw new Error('The standalone app needs an index.html between 1 byte and 2 MB, matching the app preview.');
    const name = executableName(project);
    const appId = 'dev.fleetharness.generated.' + createHash('sha256').update(project.id).digest('hex').slice(0, 24);
    const solution = await deliveredSolution(project.workspace!);
    const declared = solution?.contract.runtime.files ?? ['index.html'];
    const payloadDirectory = solution ? 'application' : '';
    const payloadRoot = path.join(source, payloadDirectory);
    if (payloadDirectory) await fs.mkdir(payloadRoot);
    // Generated manifests and main scripts remain payload data; only the host wrapper is an Electron entrypoint.
    await fs.writeFile(path.join(payloadRoot, 'index.html'), html);
    for (const relative of declared.filter(file => file !== 'index.html')) {
      const target = path.join(payloadRoot, relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(await safeFile(project.workspace!, relative), target);
    }
    // Check every payload entry, including hidden files and symlinks. Do this
    // before adding the trusted wrapper in the legacy single-page layout.
    await assertPayloadFiles(source, declared.map(file => path.join(payloadDirectory, file)));
    const fileOverrides = new Map<string, SourceFileOverride>(
      declared.map(file => [file, { root: payloadRoot }]));
    for (const [file, bytes] of solution?.metadata ?? []) fileOverrides.set(file, { bytes });
    if (!solution) fileOverrides.set('solution-contract.json', { absent: true });
    // Bind the actual copies and the exact manifest used to select them to the
    // approved fingerprint. Rechecking only the workspace misses restored edits.
    if (await sourceHash(project.workspace!, { fileOverrides }) !== project.report!.sourceHash) {
      throw new Error('The copied application does not match the verified source. Start a new run before downloading.');
    }
    await assertExecutableSource(project);
    await fs.writeFile(path.join(source, 'main.cjs'), standaloneMain(project.title, appId, declared, payloadDirectory));
    await fs.writeFile(path.join(source, 'package.json'), JSON.stringify({ name, productName: project.title, version: '1.0.0', main: 'main.cjs', private: true }));
    return { source, name, appId };
  } catch (error) {
    await fs.rm(source, { recursive: true, force: true });
    throw error;
  }
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
