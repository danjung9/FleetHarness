import { packager } from '@electron/packager';
import { promises as fs, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import path from 'node:path';
import { ZipFile } from 'yazl';
import type { PackageJob } from './executable.js';

async function zipDirectory(root: string, destination: string) {
  const zip = new ZipFile();
  const output = pipeline(zip.outputStream, createWriteStream(destination));
  // Attach a handler immediately while walking the directory.
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
  catch (error) { (zip.outputStream as Readable).destroy(); throw error; }
}

async function main(job: PackageJob) {
  const platform = process.platform, arch = process.arch;
  if (platform !== 'darwin' && platform !== 'win32' && platform !== 'linux') throw new Error('Executable downloads support macOS, Windows and Linux build machines.');
  if (arch !== 'arm64' && arch !== 'x64' && arch !== 'ia32') throw new Error('This computer’s processor is not supported for executable downloads.');
  const [output] = await packager({
    dir: job.source, out: job.output, tmpdir: path.dirname(job.output), name: job.name, appBundleId: job.appId,
    platform, arch, electronVersion: job.electronVersion,
    asar: true, prune: false, quiet: true,
    download: { downloadOptions: { signal: AbortSignal.timeout(120_000) } },
    ...(process.platform === 'darwin' ? { osxSign: { identity: '-', identityValidation: false, preAutoEntitlements: false, preEmbedProvisioningProfile: false, continueOnError: false, optionsForFile: () => ({ hardenedRuntime: false }) } } : {})
  });
  if (!output) throw new Error('The packager did not produce an application.');
  const launch = process.platform === 'darwin' ? `Open ${job.name}.app. You can drag it to Applications.`
    : process.platform === 'win32' ? `Open ${job.name}.exe. Keep all extracted files together.`
    : `Run ./${job.name} from the extracted folder. Keep all extracted files together.`;
  await fs.writeFile(path.join(output, 'START-HERE.txt'), [
    'Unzip the entire download first.', launch, '',
    'FleetHarness, Node.js, and an AI account are not needed to use this app.',
    'This app runs offline. Its local data stays on this computer.',
    `Built for ${process.platform} ${process.arch}.`, '',
    process.platform === 'darwin' ? 'This prototype is ad-hoc signed, not Apple Developer ID signed or notarized. macOS may require approval in System Settings > Privacy & Security.'
      : 'This prototype is not signed by a verified publisher. Your operating system may ask you to approve it.',
    'Operational readiness has not been verified.'
  ].join('\n'));
  await zipDirectory(output, job.archive);
}
main(JSON.parse(process.argv[2])).catch(error => { console.error(error); process.exitCode = 1; });
