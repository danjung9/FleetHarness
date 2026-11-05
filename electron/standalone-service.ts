import type { RuntimeManifest } from '../shared/solution.js';

/** Serialized into the deliverable after TypeScript compilation. Keep imports inside this function. */
export function createServiceHost(config: { appId: string; runtime: RuntimeManifest; payloadHash: string },
  payloadRoot: string, userData: string, executable: string, sweepFile: string, onFailure: () => void = () => {}) {
  const fs: typeof import('node:fs/promises') = require('node:fs/promises');
  const path: typeof import('node:path') = require('node:path');
  const { createHash }: typeof import('node:crypto') = require('node:crypto');
  const { spawn, execFile }: typeof import('node:child_process') = require('node:child_process');
  const { createServer }: typeof import('node:net') = require('node:net');
  const { get }: typeof import('node:http') = require('node:http');
  const { pathToFileURL }: typeof import('node:url') = require('node:url');
  const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
  const marker = 'service-' + createHash('sha256').update(config.appId).digest('hex').slice(0, 24);
  const directory = path.join(userData, 'service');
  const portFile = path.join(userData, 'service-port.json');
  const initialPort = 49152 + createHash('sha256').update(config.appId).digest().readUInt32BE(0) % 16384;
  let child: import('node:child_process').ChildProcess | undefined;
  let closed: Promise<void> | undefined, stopping: Promise<void> | undefined;
  let sweep: import('./process-sweep.js').RunProcessSweep | undefined;
  let stopped = false, exited = false;
  let launchedAt = 0, exitedAt = 0;
  const check = () => { if (stopped || exited) throw new Error('The app could not start; close it and open it again.'); };
  async function stop() {
    stopped = true;
    return stopping ??= (async () => {
      if (sweep) {
        try { await sweep.stop(); }
        catch (error) {
          // Still stop ordinary children if process inspection is unavailable.
          if (child?.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Already gone. */ } }
          throw error;
        }
      } else if (child?.pid) {
        // Windows retains ParentProcessId after a parent exits. Inspect before killing
        // so startup failures also clean up children. Match creation times before each
        // taskkill to avoid signaling a reused PID. No environments enter the output.
        const script = `$ErrorActionPreference='Stop'
$rootId=${child.pid}; $begin=${launchedAt}; $end=${exitedAt || Date.now()}; $rootAlive=$${!exited}
$known=@{}; $empty=0; $deadline=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+8000
do {
  $rows=@(Get-CimInstance Win32_Process | Where-Object { $_.CreationDate -and $_.ProcessId -gt 0 } | ForEach-Object { @{ Id=[int]$_.ProcessId; Parent=[int]$_.ParentProcessId; Born=([DateTimeOffset]$_.CreationDate).ToUnixTimeMilliseconds() } })
  if($rootAlive) { foreach($row in $rows) { if($row.Id -eq $rootId -and $row.Born -ge $begin -and $row.Born -le $end) { $known[$row.Id]=$row.Born } } }
  do {
    $added=$false
    foreach($row in $rows) {
      $direct=($row.Parent -eq $rootId -and $row.Born -ge $begin -and $row.Born -le $end)
      $descendant=($known.ContainsKey($row.Parent) -and $row.Born -ge $known[$row.Parent])
      if(($direct -or $descendant) -and !$known.ContainsKey($row.Id)) { $known[$row.Id]=$row.Born; $added=$true }
    }
  } while($added)
  $owned=@($rows | Where-Object { $known.ContainsKey($_.Id) -and $known[$_.Id] -eq $_.Born })
  if($owned.Count -eq 0) { $empty++ } else { $empty=0 }
  foreach($row in ($owned | Sort-Object Born -Descending)) {
    $fresh=Get-CimInstance Win32_Process -Filter ('ProcessId='+$row.Id)
    if($fresh -and ([DateTimeOffset]$fresh.CreationDate).ToUnixTimeMilliseconds() -eq $row.Born) {
      & "$env:SystemRoot\\System32\\taskkill.exe" /PID $row.Id /T /F *> $null
    }
  }
  if($empty -ge 2) { exit 0 }
  Start-Sleep -Milliseconds 100
} while([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() -lt $deadline)
exit 1`;
        await new Promise<void>((resolve, reject) => execFile(path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
          ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
          { windowsHide: true, timeout: 12_000 }, error => error ? reject(new Error('The app could not stop; restart this computer before opening it again.')) : resolve()));
      }
      if (closed) await Promise.race([closed, delay(5000).then(() => { if (!exited) throw new Error('The app could not stop; restart this computer before opening it again.'); })]);
    })();
  }
  const available = (port: number) => new Promise<boolean>((resolve, reject) => {
    const server = createServer();
    server.once('error', (error: NodeJS.ErrnoException) => error.code === 'EADDRINUSE' ? resolve(false) : reject(error));
    server.listen({ port, host: '127.0.0.1', exclusive: true }, () => server.close(error => error ? reject(error) : resolve(true)));
  });
  const healthy = (url: string) => new Promise<boolean>(resolve => {
    const request = get(url, { timeout: 750 }, response => { response.resume(); resolve(response.statusCode! >= 200 && response.statusCode! < 300); });
    request.on('timeout', () => request.destroy()); request.on('error', () => resolve(false));
  });
  async function start() {
    await fs.mkdir(userData, { recursive: true });
    if (process.platform !== 'win32') {
      const { RunProcessSweep } = await import(pathToFileURL(sweepFile).href);
      // Recover children left by an earlier interrupted launch of this installed app.
      await new RunProcessSweep({ marker }).stop();
      check();
      sweep = new RunProcessSweep({ marker });
    }
    let previous = initialPort, moved = false;
    try {
      const saved = JSON.parse(await fs.readFile(portFile, 'utf8'));
      if (Number.isInteger(saved.port) && saved.port >= 49152 && saved.port <= 65535) previous = saved.port;
      moved = saved.moved === true;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    let port = previous;
    for (let attempt = 0; !(await available(port)); attempt++) {
      if (attempt >= 16383) throw new Error('The app has no free local address; close other apps and open it again.');
      port = 49152 + (port - 49152 + 1) % 16384;
    }
    moved ||= port !== previous;
    check();
    // Both cwd-relative writes and __dirname-relative writes stay under userData.
    // Repeated launches preserve generated state, including modified seed files.
    let installedHash = '';
    try { installedHash = await fs.readFile(path.join(userData, 'service-payload-hash'), 'utf8'); } catch { /* First install. */ }
    if (installedHash !== config.payloadHash) {
      await fs.mkdir(directory, { recursive: true });
      await fs.cp(payloadRoot, directory, { recursive: true, force: true });
      await fs.writeFile(path.join(userData, 'service-payload-hash'), config.payloadHash);
    }
    check();
    const env: NodeJS.ProcessEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1', ELECTRON_NO_ASAR: '1',
      NODE_OPTIONS: '', NODE_PATH: '', HOST: '127.0.0.1', PORT: String(port),
      APPYARD_USER_DATA: directory, HOME: userData, USERPROFILE: userData,
      TMPDIR: path.join(userData, 'tmp'), TMP: path.join(userData, 'tmp'), TEMP: path.join(userData, 'tmp') };
    await fs.mkdir(env.TMPDIR!, { recursive: true });
    for (const name of config.runtime.requiredEnv) if (!env[name]) throw new Error('The app needs settings before it can start; ask the person who supplied it for help.');
    check();
    launchedAt = Date.now() - 1000;
    child = spawn(executable, ['--no-global-search-paths', '--require', path.join(path.dirname(sweepFile), 'service-loopback.cjs'), path.join(directory, config.runtime.command!.entrypoint), ...config.runtime.command!.args], {
      cwd: directory, env: sweep ? sweep.environment(env) : env, detached: process.platform !== 'win32',
      stdio: 'ignore', windowsHide: true
    });
    closed = new Promise<void>(resolve => {
      child!.once('error', () => { exited = true; if (!stopped) onFailure(); });
      child!.once('close', () => { exited = true; exitedAt = Date.now(); resolve(); if (!stopped) onFailure(); });
    });
    const origin = 'http://127.0.0.1:' + port;
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      check();
      if (await healthy(origin + config.runtime.healthPath)) {
        check();
        // Persist only after this service starts. Never silently change back on the next launch.
        await fs.writeFile(portFile + '.new', JSON.stringify({ port, moved }));
        await fs.rename(portFile + '.new', portFile);
        return { origin, port, moved, pid: child.pid, directory };
      }
      await delay(100);
    }
    throw new Error('The app could not start; close it and open it again.');
  }
  return { start: async () => { try { return await start(); } catch (error) { await stop(); throw error; } }, stop };
}

export function serviceHostSource() { return 'module.exports = ' + createServiceHost.toString() + ';\n'; }

export function standaloneServiceMain(title: string, appId: string, runtime: RuntimeManifest, payloadHash: string) {
  return `const { app, BrowserWindow, Menu } = require('electron');
const path = require('node:path');
app.setName(${JSON.stringify(title)});
app.setPath('userData', path.join(app.getPath('appData'), ${JSON.stringify(appId)}));
let window, host, origin, quitting = false, failed = false, addressMoved = false;
const title = ${JSON.stringify(title)};
const windowTitle = () => title + (addressMoved ? ' (local address changed; earlier saved browser data remains at the old address)' : '');
function failure(message = 'The app could not start; close it and open it again.') {
  failed = true;
  if (window && !window.isDestroyed()) window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<!doctype html><title>' + title.replace(/[<>&]/g, '') + '</title><p>' + message + '</p>')).catch(() => {});
}
function openWindow() {
  window = new BrowserWindow({ title: windowTitle(), width: 1200, height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false, webviewTag: false } });
  const ownOrigin = value => { try { return !!origin && new URL(value).origin === origin; } catch { return false; } };
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  for (const eventName of ['will-navigate', 'will-frame-navigate', 'will-redirect']) window.webContents.on(eventName, (event, url) => { if (!ownOrigin(event.url ?? url)) event.preventDefault(); });
  window.on('page-title-updated', event => { event.preventDefault(); window.setTitle(windowTitle()); });
  window.webContents.on('will-prevent-unload', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.on('closed', () => { window = null; });
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.quit());
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.on('before-quit', event => {
    if (quitting) return;
    event.preventDefault();
    Promise.resolve(host?.stop()).then(() => { quitting = true; app.quit(); }, () => {
      if (!window) openWindow();
      failure('The app could not stop; restart this computer before opening it again.');
    });
  });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ label: title, submenu: [{ role: 'quit' }] }] : []),
      { role: 'editMenu' }, { role: 'viewMenu' }
    ]));
    openWindow();
    host = require('./standalone-service.cjs')(${JSON.stringify({ appId, runtime, payloadHash })}, path.join(__dirname, 'application'), app.getPath('userData'), process.execPath, path.join(__dirname, 'process-sweep.mjs'), () => {
      failure(); void host.stop().catch(() => failure('The app could not stop; restart this computer before opening it again.'));
    });
    try {
      const ready = await host.start(); origin = ready.origin; addressMoved = ready.moved;
      if (!quitting && !failed && window) { window.setTitle(windowTitle()); await window.loadURL(origin + '/'); }
    } catch (error) {
      const messages = ['The app needs settings before it can start; ask the person who supplied it for help.',
        'The app has no free local address; close other apps and open it again.',
        'The app could not stop; restart this computer before opening it again.'];
      failure(messages.includes(error?.message) ? error.message : undefined);
    }
  }).catch(() => failure());
  app.on('window-all-closed', () => app.quit());
}
`;
}
