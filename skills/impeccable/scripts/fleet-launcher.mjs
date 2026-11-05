// FleetHarness adapter for Impeccable. No downloads, cache discovery or writes.
import {accessSync, constants, readFileSync, realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const args = process.argv.slice(2);
const command = args[0];
const version = readFileSync(path.join(scriptDir, 'VERSION'), 'utf8').trim();

function fail(message, status = 2) {
  console.error(`impeccable: ${message}`);
  process.exit(status);
}

if (process.env.FLEET_IMPECCABLE_LAUNCHER_PROBE) {
  fail('recursive launcher invocation refused.', 127);
}
if (!['context', 'detect', 'engine-probe'].includes(command)) {
  fail('FleetHarness permits only context, static local-file detect, and engine-probe.');
}
if (args.some(arg => /(?:^|=)(?:[a-z][a-z0-9+.-]*:\/\/|\/\/)/i.test(arg))) {
  fail('URL scans are unavailable; use fleet_browser or host-provided browser evidence.');
}

const platform = {darwin: 'darwin', linux: 'linux', win32: 'windows'}[process.platform];
const suffix = process.platform === 'win32' ? '.exe' : '';
const candidates = process.env.IMPECCABLE_BIN
  ? [path.resolve(process.env.IMPECCABLE_BIN)]
  : platform ? [path.join(scriptDir, 'bin', `${platform}-${process.arch}`, `impeccable${suffix}`)] : [];
const env = {
  ...process.env,
  IMPECCABLE_SKILL_DIR: skillDir,
  IMPECCABLE_SELF: path.join(scriptDir, `impeccable${process.platform === 'win32' ? '.cmd' : ''}`),
  IMPECCABLE_NO_UPDATE_CHECK: '1',
  IMPECCABLE_NO_STALENESS_CHECK: '1',
  IMPECCABLE_HOOK_DISABLED: '1',
  // Also stop an upstream launcher supplied accidentally from bootstrapping.
  IMPECCABLE_LAUNCHER_PROBE: '1',
  FLEET_IMPECCABLE_LAUNCHER_PROBE: '1',
};
const self = realpathSync(fileURLToPath(import.meta.url));
let engine;
for (const candidate of candidates) {
  try {
    accessSync(candidate, constants.X_OK);
    if (realpathSync(candidate) === self) continue;
  } catch {
    continue;
  }
  const probe = spawnSync(candidate, ['engine-probe'], {
    env, encoding: 'utf8', timeout: 3000, maxBuffer: 4096, windowsHide: true,
  });
  if (probe.status === 0 && probe.stdout.trim() === `impeccable-engine ${version}`) {
    engine = candidate;
    break;
  }
}
if (!engine) {
  fail(`No preinstalled engine ${version} is available. Read existing PRODUCT.md, DESIGN.md and skill references directly; continue the phase. No installation or download was attempted.`, 127);
}
const result = spawnSync(engine, args, {env, stdio: 'inherit', windowsHide: true});
if (result.error) fail(`engine could not run: ${result.error.message}`, 127);
process.exit(result.status ?? 1);
