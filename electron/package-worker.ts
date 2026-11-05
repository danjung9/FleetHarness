import { packager } from '@electron/packager';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { PackageJob } from './executable.js';
import { localElectronZip, zipDirectory } from './package-runtime.js';

async function main(job: PackageJob) {
  const platform = process.platform, arch = process.arch;
  if (platform !== 'darwin' && platform !== 'win32' && platform !== 'linux') throw new Error('Executable downloads support macOS, Windows and Linux build machines.');
  if (arch !== 'arm64' && arch !== 'x64' && arch !== 'ia32') throw new Error('This computer’s processor is not supported for executable downloads.');
  let electronZipDir = await localElectronZip(job.electronVersion, path.join(path.dirname(job.output), 'electron-runtime'), job.runtimeDirectory);
  if (!electronZipDir) {
    // Preserve the existing online fallback only when no local runtime exists.
    const { downloadArtifact } = await import('@electron/get');
    try {
      const archive = await downloadArtifact({ version: job.electronVersion, platform, arch, artifactName: 'electron',
        cacheRoot: process.env.electron_config_cache, downloadOptions: { signal: AbortSignal.timeout(120_000) } });
      electronZipDir = path.dirname(archive);
    } catch {
      throw new Error('No local Electron runtime was found and its download failed; reinstall AppYard with its bundled runtime or connect to the internet and retry.');
    }
  }
  const [output] = await packager({
    dir: job.source, out: job.output, tmpdir: path.dirname(job.output), name: job.name, appBundleId: job.appId,
    platform, arch, electronVersion: job.electronVersion,
    // Services and their dependencies must be ordinary files for bundled Node.
    asar: !job.service, prune: false, quiet: true,
    electronZipDir,
    ...(process.platform === 'darwin' ? { osxSign: { identity: '-', identityValidation: false, preAutoEntitlements: false, preEmbedProvisioningProfile: false, continueOnError: false, optionsForFile: () => ({ hardenedRuntime: false }) } } : {})
  });
  if (!output) throw new Error('The packager did not produce an application.');
  const launch = process.platform === 'darwin' ? `Open ${job.name}.app. You can drag it to Applications.`
    : process.platform === 'win32' ? `Open ${job.name}.exe. Keep all extracted files together.`
    : `Run ./${job.name} from the extracted folder. Keep all extracted files together.`;
  await fs.writeFile(path.join(output, 'START-HERE.txt'), [
    'Unzip the entire download first.', launch, '',
    'AppYard, Node.js, and an AI account are not needed to use this app.',
    'This app runs offline. Its local data stays on this computer.',
    `Built for ${process.platform} ${process.arch}.`, '',
    process.platform === 'darwin' ? 'This app is ad-hoc signed, not Apple Developer ID signed or notarized. macOS may require approval in System Settings > Privacy & Security.'
      : 'This app is not signed by a verified publisher. Your operating system may ask you to approve it.',
    'Operational readiness has not been verified.'
  ].join('\n'));
  await zipDirectory(output, job.archive);
}
main(JSON.parse(process.argv[2])).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
