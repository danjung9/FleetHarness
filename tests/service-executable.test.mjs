import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { serviceAppFixture } from '../scripts/service-app-fixture.mjs';
import { assertExecutableSource } from '../dist-electron/electron/executable.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { reportHash } from '../dist-electron/electron/delivery.js';
import { installServiceDependencies, offlineDependenciesMessage } from '../dist-electron/electron/service-package.js';
import { assertCredentialFreeDelivery } from '../dist-electron/electron/delivery-secrets.js';
import { registerCredential } from '../dist-electron/electron/secrets.js';

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'service-delivery-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test('Node service staging ships a real payload and trusted launchers without a static index', async t => {
  const { staged } = await serviceAppFixture(await temporary(t));
  assert.equal(staged.service, true);
  assert.equal(await fs.stat(path.join(staged.source, 'application/index.html')).then(() => true, () => false), false);
  for (const relative of ['main.cjs', 'standalone-service.cjs', 'service-loopback.cjs']) {
    new vm.Script(await fs.readFile(path.join(staged.source, relative), 'utf8'), { filename: relative });
  }
  assert.equal((await fs.stat(path.join(staged.source, 'application/server.cjs'))).isFile(), true);
});

for (const kind of ['python', 'cli']) test(kind + ' still explains source export in one sentence', async t => {
  const { project } = await serviceAppFixture(await temporary(t));
  const file = path.join(project.workspace, 'solution-contract.json');
  const contract = JSON.parse(await fs.readFile(file, 'utf8'));
  if (kind === 'python') contract.runtime.command.runtime = 'python';
  else { contract.runtime.profile = 'cli'; delete contract.runtime.healthPath; delete contract.runtime.invokePath; }
  await fs.writeFile(file, JSON.stringify(contract));
  project.report.sourceHash = await sourceHash(project.workspace);
  project.verification.reportHash = reportHash(project.report);
  Object.assign(project.approval, { sourceHash: project.report.sourceHash, reportHash: project.verification.reportHash });
  await assert.rejects(assertExecutableSource(project), { message: 'This app uses Python or a command-line engine; export the runnable source package and follow its README to run it.' });
});

test('packaged dependency bytes are included in credential checks', async t => {
  const root = await temporary(t), dependency = path.join(root, 'application/node_modules/synthetic');
  await fs.mkdir(dependency, { recursive: true });
  const file = path.join(dependency, 'index.js');
  await fs.writeFile(file, 'module.exports = "synthetic fixture";');
  await assertCredentialFreeDelivery(root, true);
  const synthetic = 'synthetic-delivery-scan-fixture-37';
  registerCredential(synthetic);
  await fs.writeFile(file, JSON.stringify({ fixture: synthetic }));
  await assert.rejects(assertCredentialFreeDelivery(root, true), /credential/i);
});

test('real npm installs a locked cached dependency offline, skips scripts, and refuses a cache miss', { timeout: 30_000 }, async t => {
  const root = await temporary(t), payload = path.join(root, 'application'), pkg = path.join(root, 'synthetic-package');
  await fs.mkdir(payload); await fs.mkdir(pkg);
  let npm;
  for (const folder of (process.env.PATH ?? '').split(path.delimiter)) {
    try { const candidate = await fs.realpath(path.join(folder, 'npm')); if (candidate.endsWith('npm-cli.js')) { npm = candidate; break; } } catch { /* next */ }
  }
  assert.ok(npm, 'This integration test needs the same installed npm used for builds.');
  const cache = path.join(root, 'cache'), previous = process.env.npm_config_cache;
  process.env.npm_config_cache = cache;
  t.after(() => { if (previous === undefined) delete process.env.npm_config_cache; else process.env.npm_config_cache = previous; });
  const packageJson = { name: 'synthetic-offline-dependency', version: '1.0.0', main: 'index.cjs',
    scripts: { postinstall: 'node -e "require(\'fs\').writeFileSync(\'script-ran\',\'bad\')"' } };
  await fs.writeFile(path.join(pkg, 'package.json'), JSON.stringify(packageJson));
  await fs.writeFile(path.join(pkg, 'index.cjs'), 'module.exports = 37;');
  await promisify(execFile)(process.execPath, [npm, 'pack', '--offline', '--ignore-scripts', '--pack-destination=' + root],
    { cwd: pkg, env: { ...process.env, npm_config_cache: cache } });
  const tarball = await fs.readFile(path.join(root, 'synthetic-offline-dependency-1.0.0.tgz'));
  // npm's own content cache is populated locally, without a registry request.
  const npmRequire = createRequire(npm);
  await npmRequire('cacache').put(path.join(cache, '_cacache'), 'synthetic-fixture', tarball);
  const integrity = 'sha512-' + createHash('sha512').update(tarball).digest('base64');
  const manifest = { name: 'synthetic-offline-app', version: '1.0.0', dependencies: { [packageJson.name]: '1.0.0' }, scripts: packageJson.scripts };
  const lock = { name: manifest.name, version: manifest.version, lockfileVersion: 3, packages: { '': manifest,
    ['node_modules/' + packageJson.name]: { version: '1.0.0', resolved: 'https://example.invalid/synthetic-offline-dependency-1.0.0.tgz', integrity, hasInstallScript: true } } };
  await fs.writeFile(path.join(payload, 'package.json'), JSON.stringify(manifest));
  await fs.writeFile(path.join(payload, 'package-lock.json'), JSON.stringify(lock));
  await installServiceDependencies(payload);
  assert.equal(createRequire(path.join(payload, 'package.json'))(packageJson.name), 37);
  for (const directory of [payload, path.join(payload, 'node_modules', packageJson.name)]) {
    assert.equal(await fs.stat(path.join(directory, 'script-ran')).then(() => true, () => false), false);
  }
  await assertCredentialFreeDelivery(payload, true);
  process.env.npm_config_cache = path.join(root, 'empty-cache');
  await assert.rejects(installServiceDependencies(payload), { message: offlineDependenciesMessage });
});
