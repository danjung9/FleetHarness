import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { registryLock } from './solution-runtime.js';

export const offlineDependenciesMessage = 'This app needs dependencies that are unavailable offline; export the source package and follow its README.';

/** Use the same registry lock validation and install flags as verification, without network access. */
export async function installServiceDependencies(root: string) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(await fs.readFile(path.join(root, 'package-lock.json'), 'utf8'));
  registryLock(manifest, lock);
  const candidates = [process.env.npm_execpath, ...(process.env.PATH ?? '').split(path.delimiter).flatMap(folder => [
    path.join(folder, 'npm'), path.join(folder, 'node_modules/npm/bin/npm-cli.js'),
    path.join(folder, '../lib/node_modules/npm/bin/npm-cli.js')
  ])].filter((file): file is string => !!file);
  let npm: string | undefined;
  for (const candidate of candidates) {
    try {
      const resolved = await fs.realpath(candidate);
      if (resolved.endsWith('npm-cli.js')) { npm = resolved; break; }
    } catch { /* Try the next installed npm. */ }
  }
  if (!npm) throw new Error(offlineDependenciesMessage);
  // Keep npm's logs/config writes out of the deliverable. CLI flags override .npmrc.
  const config = path.join(path.dirname(root), 'npm-empty-config');
  await fs.writeFile(config, '');
  const globalConfig = config + '-global';
  await fs.writeFile(globalConfig, '');
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [npm!, 'ci', '--offline', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund',
        '--bin-links=false', '--userconfig=' + config, '--globalconfig=' + globalConfig,
        '--cache=' + (process.env.npm_config_cache ?? path.join(os.homedir(), '.npm'))], {
        cwd: root, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '', NODE_PATH: '' },
        stdio: 'ignore', windowsHide: true
      });
      const timer = setTimeout(() => child.kill('SIGKILL'), 120_000);
      child.once('error', () => { clearTimeout(timer); reject(new Error(offlineDependenciesMessage)); });
      child.once('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(offlineDependenciesMessage)); });
    });
  } finally {
    await fs.rm(config, { force: true }); await fs.rm(globalConfig, { force: true });
  }
}
