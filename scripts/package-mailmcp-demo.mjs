import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, Platform } from 'electron-builder';
import { demoBundle, prepareMailMcpDemo } from './prepare-mailmcp-demo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function packageMailMcpDemo() {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('This installed MailMCP demonstration currently packages macOS on Apple Silicon only.');
  await fs.access(path.join(root, 'dist', 'index.html'));
  await fs.access(path.join(root, 'dist-electron', 'electron', 'main.js'));
  const prepared = await prepareMailMcpDemo();
  if (!prepared.runtimeReady) throw new Error('Prepare the bundled Python runtime and backend-entry.py before packaging.');
  if (!prepared.localValidation) throw new Error('Run the real local demo workflow checks and save evidence/demo-validation.json before packaging.');
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const config = {
    ...pkg.build,
    appId: 'dev.fleetharness.mailmcp-demo',
    productName: 'AppYard Demo',
    artifactName: 'AppYard-Demo-${version}-${arch}.${ext}',
    directories: { ...pkg.build.directories, output: 'release/mailmcp-demo' },
    extraResources: [...(pkg.build.extraResources ?? []), { from: demoBundle, to: 'mailmcp-demo' }],
    mac: { ...pkg.build.mac, target: ['dir'] },
  };
  // A config object is merged into package.json by electron-builder, including
  // concatenating resource arrays. An explicit file avoids copying the runtime twice.
  const configFile = path.join(root, 'output', 'mailmcp-demo', 'electron-builder.json');
  await fs.writeFile(configFile, JSON.stringify(config, null, 2));
  await build({ projectDir: root, targets: Platform.MAC.createTarget(['dir']), config: configFile });
  console.log(`Packaged the separate AppYard Demo app under ${path.join(root, 'release', 'mailmcp-demo')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packageMailMcpDemo().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
