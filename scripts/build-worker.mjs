import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist-worker');
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw result.error ?? new Error(`${command} exited ${result.status}`);
};
await fs.rm(output, { recursive: true, force: true });
run(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '-p', 'worker/tsconfig.json']);
await fs.cp(path.join(root, 'worker/runtime/skills'), path.join(output, 'skills'), { recursive: true });
const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const dependencies = Object.fromEntries(['@earendil-works/pi-coding-agent', 'typebox', 'playwright'].map(name => [name, manifest.dependencies[name]]));
if (Object.values(dependencies).some(version => typeof version !== 'string' || !/^\d+\.\d+\.\d+/.test(version))) throw new Error('Worker dependencies must be pinned.');
await fs.writeFile(path.join(output, 'package.json'), JSON.stringify({ name: 'fleetharness-sandbox-worker', version: '1.0.0', private: true, type: 'module', dependencies }, null, 2));
await fs.writeFile(path.join(output, 'worker.mjs'), "import './worker/main.js';\n");
await fs.writeFile(path.join(output, 'verify.mjs'), "import './worker/verify-main.js';\n");
run('tar', ['-czf', path.join(root, 'dist-worker.tar.gz'), '-C', output, '.']);
console.log('Built dist-worker/ and dist-worker.tar.gz. Install runtime dependencies and Chromium in the Sandbox before starting worker.mjs.');
