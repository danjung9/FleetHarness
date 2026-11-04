import { build, Platform, Arch } from 'electron-builder';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { windowsVersion } from './windows-version.mjs';
import { checkPackagedIntegrity } from './check-packaged-integrity.mjs';

if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Build and validate this installer on Windows x64.');
const args = process.argv.slice(2);
const baseline = args.includes('--baseline');
const versionAt = args.indexOf('--version');
if (args.some((a, i) => a !== '--baseline' && a !== '--version' && !(versionAt >= 0 && i === versionAt + 1))) throw new Error('Usage: build-windows.mjs [--baseline] [--version x.y.z]');
if (versionAt >= 0 && !args[versionAt + 1]) throw new Error('--version needs a value');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', windowsHide: true }).trim();
const sha = git('rev-parse', 'HEAD');
const dirty = Boolean(git('status', '--porcelain', '--untracked-files=normal'));
const ci = process.env.GITHUB_ACTIONS === 'true';
if (ci && (dirty || sha !== process.env.GITHUB_SHA)) throw new Error('CI packages must use a clean checkout of the exact triggering SHA.');
const version = windowsVersion({
  baseline, runNumber: ci ? process.env.GITHUB_RUN_NUMBER : undefined,
  runAttempt: ci ? process.env.GITHUB_RUN_ATTEMPT : undefined,
  version: versionAt >= 0 ? args[versionAt + 1] : undefined
});
const repository = process.env.GITHUB_REPOSITORY || 'danjung9/FleetHarness';
if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid source repository.');
const buildInfo = {
  schemaVersion: 1, version, revision: sha, sha,
  sourceUrl: `https://github.com/${repository}/commit/${sha}`,
  buildId: ci ? `${process.env.GITHUB_RUN_ID}.${process.env.GITHUB_RUN_ATTEMPT}${baseline ? '-baseline' : ''}` : `local-${version}${dirty ? '-dirty' : ''}`,
  runId: process.env.GITHUB_RUN_ID || null,
  runNumber: ci ? Number(process.env.GITHUB_RUN_NUMBER) : null,
  runAttempt: ci ? Number(process.env.GITHUB_RUN_ATTEMPT) : null,
  runUrl: ci ? `https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}` : null,
  builtAt: new Date().toISOString(), dirty, baseline, platform: 'win32', arch: 'x64'
};
const output = baseline ? 'release-baseline' : 'release';
await fs.mkdir('build/generated', { recursive: true });
await fs.writeFile('build/generated/build-info.json', JSON.stringify(buildInfo, null, 2) + '\n');
await build({
  targets: Platform.WINDOWS.createTarget('nsis', Arch.x64), publish: 'never',
  config: {
    extraMetadata: { version }, buildVersion: `${version}.0`,
    directories: { output },
    extraResources: [{ from: 'build/generated/build-info.json', to: 'build-info.json' }]
  }
});
const installer = `AppYard-${version}-windows-x64-setup.exe`;
checkPackagedIntegrity(path.join(output, 'win-unpacked', 'resources', 'app.asar'));
const sha256 = createHash('sha256').update(await fs.readFile(path.join(output, installer))).digest('hex');
await fs.writeFile(path.join(output, 'SHA256SUMS.txt'), `${sha256}  ${installer}\n`);
await fs.writeFile(path.join(output, 'windows-build.json'), JSON.stringify({ ...buildInfo, installer, sha256 }, null, 2) + '\n');
console.log(JSON.stringify({ installer: path.resolve(output, installer), version, sha, sha256, baseline, dirty }, null, 2));
