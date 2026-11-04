import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import electron from 'electron';

const server = await createServer({ configFile: path.resolve('vite.workbench.config.ts'), server: { port: 5177, strictPort: false } });
await server.listen();
const address = server.httpServer.address();
const rendererURL = `http://127.0.0.1:${address.port}/workbench/index.html`;
const dataRoot = process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : process.platform === 'win32' ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming') : process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: rendererURL, FLEET_USER_DATA: process.env.FLEET_WORKBENCH_USER_DATA || path.join(dataRoot, 'FleetHarness Workbench') }
});
let closing = false;
async function close(code = 0) { if (closing) return; closing = true; child.kill(); await server.close(); process.exit(code); }
child.on('exit', code => void close(code || 0));
child.on('error', error => { console.error(error); void close(1); });
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
console.log('FleetHarness Workbench · ' + rendererURL);
