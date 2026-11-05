import { assertCredentialFreeDelivery } from './delivery-secrets.js';
import { redactSecrets } from './secrets.js';
import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Project } from '../shared/types.js';
import { verifiedManifest } from './delivery.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { parseSolutionContract } from '../harness/solution-contract.js';
import { installServiceDependencies } from './service-package.js';
import { serviceHostSource, standaloneServiceMain } from './standalone-service.js';

export function executableName(project: Pick<Project, 'title'>) {
  // Prefix also avoids Windows reserved device names.
  return 'app-' + (project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'tool');
}
export function executableFileName(project: Pick<Project, 'title'>) {
  return `${executableName(project)}-${process.platform}-${process.arch}.zip`;
}
export async function assertExecutableSource(project: Project) {
  const manifest = await verifiedManifest(project, true);
  const solution = deliveredSolution(manifest);
  if (solution && solution.runtime.profile !== 'browser' && !(solution.runtime.profile === 'service' && solution.runtime.command?.runtime === 'node')) throw new Error('This app uses Python or a command-line engine; export the runnable source package and follow its README to run it.');
  return manifest;
}

function deliveredSolution(manifest: Awaited<ReturnType<typeof verifiedManifest>>) {
  const body = manifest.find(file => file.path === 'solution-contract.json')?.contents;
  if (!body) return undefined;
  const packet = JSON.parse(manifest.find(file => file.path === '.fleet/packet.json')!.contents.toString('utf8'));
  return parseSolutionContract(JSON.parse(body.toString('utf8')), packet.acceptance);
}

// This is host-owned code. Generated code runs in the browser renderer.
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
function openWindow() {
  window = new BrowserWindow({ title: ${JSON.stringify(title)}, width: 1200, height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false, webviewTag: false } });
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
    const relative = decodeURIComponent(url.pathname).slice(1);
    const type = contentTypes[path.extname(relative)];
    if (url.host !== 'app' || !allowedFiles.has(relative) || !type || request.method !== 'GET') return new Response('', { status: 404 });
    return new Response(await fs.readFile(path.join(payloadRoot, relative)), { headers: {
      'Content-Type': type,
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

export interface PackageJob { source: string; output: string; archive: string; electronVersion: string; name: string; appId: string; runtimeDirectory?: string; service?: boolean }

export async function stageExecutable(project: Project, root: string) {
  const manifest = await assertExecutableSource(project);
  const solution = deliveredSolution(manifest);
  const service = solution?.runtime.profile === 'service';
  const source = path.join(root, 'source');
  await fs.mkdir(source);
  const html = manifest.find(file => file.path === 'index.html')?.contents;
  if (!service && (!html?.length || html.length > 2_000_000)) throw new Error('The standalone app needs an index.html between 1 byte and 2 MB, matching the app preview.');
  const name = executableName(project);
  const appId = 'dev.fleetharness.generated.' + createHash('sha256').update(project.id).digest('hex').slice(0, 24);
  const declared = solution?.runtime.files ?? ['index.html'];
  const payloadDirectory = solution ? 'application' : '';
  const payloadRoot = path.join(source, payloadDirectory);
  if (payloadDirectory) await fs.mkdir(payloadRoot);
  // Generated manifests and main scripts remain payload data; only the host wrapper is an Electron entrypoint.
  for (const relative of declared) {
    const target = path.join(payloadRoot, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await atomicHostWrite(payloadRoot, relative, manifest.find(file => file.path === relative)!.contents);
  }
  if (service && solution.runtime.dependencies) await installServiceDependencies(payloadRoot);
  const payloadHash = createHash('sha256');
  for (const relative of declared) payloadHash.update(relative + '\0').update(manifest.find(file => file.path === relative)!.contents).update('\0');
  if (service) {
    await atomicHostWrite(source, 'standalone-service.cjs', serviceHostSource());
    await atomicHostWrite(source, 'process-sweep.mjs', await fs.readFile(new URL('./process-sweep.js', import.meta.url)));
    await atomicHostWrite(source, 'service-loopback.cjs', `const net = require('node:net');
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function(...args) {
  if (args[0] && typeof args[0] === 'object' && 'port' in args[0]) args[0] = { ...args[0], host: '127.0.0.1', ipv6Only: false };
  else if (typeof args[0] === 'number' || (typeof args[0] === 'string' && /^\\d+$/.test(args[0]))) {
    if (typeof args[1] === 'string') args[1] = '127.0.0.1'; else args.splice(1, 0, '127.0.0.1');
  }
  return listen.apply(this, args);
};\n`);
  }
  await atomicHostWrite(source, 'main.cjs', service
    ? standaloneServiceMain(project.title, appId, solution.runtime, payloadHash.digest('hex'))
    : standaloneMain(project.title, appId, declared, payloadDirectory));
  await atomicHostWrite(source, 'package.json', JSON.stringify({ name, productName: project.title, version: '1.0.0', main: 'main.cjs', private: true }));
  await assertExecutableSource(project);
  await assertCredentialFreeDelivery(source, true);
  return { source, name, appId, service };
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
    const collect = (data: Buffer) => { output = redactSecrets(output + data.toString()).slice(-8000); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    const stop = (message: string) => {
      failure = new Error(message);
      if (child.pid && process.platform !== 'win32') { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
      else child.kill('SIGKILL');
    };
    const abort = () => stop('Packaging stopped. Download the app again to retry.');
    const timer = setTimeout(() => stop('Packaging exceeded 10 minutes. Download the app again to retry.'), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    child.once('error', error => { failure = error; });
    child.once('close', code => {
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(output.trim() || 'Could not package the app. Download the app again to retry.'));
      else resolve();
    });
  });
}

export async function saveExecutable(archive: string, destination: string, workspace: string, signal?: AbortSignal,
  commit?: (target: string) => Promise<void>) {
  signal?.throwIfAborted();
  const parent = await fs.realpath(path.dirname(destination)), base = await fs.realpath(workspace);
  if (parent === base || parent.startsWith(base + path.sep)) throw new Error('Save the download outside the agent workspace.');
  const target = path.join(parent, path.basename(destination));
  const staging = await fs.mkdtemp(path.join(parent, '.appyard-download-'));
  const temporary = path.join(staging, 'archive'), previous = path.join(staging, 'previous');
  let backedUp = false, published = false, preserveBackup = false;
  try {
    await fs.copyFile(archive, temporary, constants.COPYFILE_EXCL);
    signal?.throwIfAborted();
    try {
      if ((await fs.lstat(target)).isDirectory()) throw new Error('Choose an archive file, not a directory.');
      await fs.rename(target, previous); backedUp = true;
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    signal?.throwIfAborted();
    await fs.rename(temporary, target);
    published = true;
    signal?.throwIfAborted();
    await commit?.(target);
    signal?.throwIfAborted();
  } catch (error) {
    try {
      if (published) await fs.rm(target, { force: true });
      if (backedUp) await fs.rename(previous, target);
    } catch (restoreError) {
      preserveBackup = backedUp;
      throw new Error('Could not roll back the download.' + (backedUp ? ' The previous file is retained at ' + previous : ''), { cause: restoreError });
    }
    throw error;
  } finally { if (!preserveBackup) await fs.rm(staging, { recursive: true, force: true }); }
  return target;
}
