import { promises as fs, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { ZipFile } from 'yazl';

export async function zipDirectory(root: string, destination: string) {
  const zip = new ZipFile();
  const output = pipeline(zip.outputStream, createWriteStream(destination));
  void output.catch(() => {});
  zip.on('error', error => (zip.outputStream as Readable).destroy(error));
  const add = async (directory: string) => {
    for (const entry of await fs.readdir(directory)) {
      const file = path.join(directory, entry), relative = path.relative(root, file).split(path.sep).join('/');
      const stat = await fs.lstat(file);
      if (stat.isSymbolicLink()) zip.addBuffer(Buffer.from(await fs.readlink(file)), relative, { mode: stat.mode });
      else if (stat.isDirectory()) { zip.addEmptyDirectory(relative, { mode: stat.mode }); await add(file); }
      else if (stat.isFile()) zip.addFile(file, relative, { mode: stat.mode });
    }
  };
  try { await add(root); zip.end(); await output; }
  catch (error) { (zip.outputStream as Readable).destroy(); await output.catch(() => {}); throw error; }
}

function defaultCache() {
  // Match @electron/get's env-paths('electron', { suffix: '' }) layout.
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Caches', 'electron');
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'electron', 'Cache');
  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'electron');
}

/** Stage the already installed runtime without invoking Electron's downloader. */
export async function localElectronZip(version: string, staging: string, runtimeDirectory?: string): Promise<string | undefined> {
  if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(version)) throw new Error('Invalid Electron runtime version.');
  const filename = `electron-v${version}-${process.platform}-${process.arch}.zip`;
  const candidates = runtimeDirectory ? [runtimeDirectory] : [];
  try { candidates.push(path.join(path.dirname(createRequire(import.meta.url).resolve('electron/package.json')), 'dist')); }
  catch { /* Electron is a dev dependency; packaged hosts carry extraResources instead. */ }
  const binary = process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron'
    : process.platform === 'win32' ? 'electron.exe' : 'electron';
  for (const directory of candidates) {
    try {
      if ((await fs.readFile(path.join(directory, 'version'), 'utf8')).trim().replace(/^v/, '') !== version) continue;
      if (!(await fs.stat(path.join(directory, binary))).isFile()) continue;
    } catch { continue; }
    await fs.mkdir(staging, { recursive: true });
    await zipDirectory(directory, path.join(staging, filename));
    return staging;
  }
  // Cache entries are <cache>/<SHA256 of mirror directory URL>/<release filename>.
  // Search by exact version/platform/architecture so a changed mirror still works offline.
  const cache = process.env.electron_config_cache || defaultCache();
  let entries;
  try { entries = await fs.readdir(cache, { withFileTypes: true }); } catch { return undefined; }
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[a-f0-9]{64}$/.test(entry.name)) continue;
    const directory = path.join(cache, entry.name);
    try { if ((await fs.stat(path.join(directory, filename))).isFile()) return directory; }
    catch { /* Try the next local mirror cache. */ }
  }
  return undefined;
}
