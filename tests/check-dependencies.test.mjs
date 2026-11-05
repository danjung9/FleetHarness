import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { runChecks } from '../scripts/check.mjs';

const execute = promisify(execFile);
const fixtureName = 'check-dependency-fixture';
const packagePath = 'node_modules/fixture-package';
const dependency = (version, name = 'fixture-package') => ({
  version,
  resolved: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
  integrity: `sha512-${createHash('sha512').update(`${name}@${version}`).digest('base64')}`,
  license: 'MIT'
});
const writeJson = (file, value) => fs.writeFile(file, JSON.stringify(value, null, 2) + '\n');

async function repository(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-check-dependencies-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const sourceRoot = path.join(directory, 'source');
  await fs.mkdir(path.join(sourceRoot, packagePath), { recursive: true });
  const manifest = {
    name: fixtureName, version: '1.0.0', private: true,
    dependencies: { 'fixture-package': '2.0.0' }
  };
  const sourceLock = {
    name: fixtureName, version: '1.0.0', lockfileVersion: 3, requires: true,
    packages: {
      '': { name: fixtureName, version: '1.0.0', dependencies: { ...manifest.dependencies } },
      [packagePath]: dependency('2.0.0')
    }
  };
  // npm's hidden v3 lock records installed packages, without the source lock's
  // root entry or optional packages omitted for the current platform.
  const installedLock = {
    name: fixtureName, version: '1.0.0', lockfileVersion: 3, requires: true,
    packages: { [packagePath]: dependency('2.0.0') }
  };
  const sourceLockFile = path.join(sourceRoot, 'package-lock.json');
  const installedLockFile = path.join(sourceRoot, 'node_modules', '.package-lock.json');
  const installedPackageFile = path.join(sourceRoot, packagePath, 'package.json');
  await fs.writeFile(path.join(sourceRoot, '.gitignore'), 'node_modules/\noutput/\n');
  await writeJson(path.join(sourceRoot, 'package.json'), manifest);
  await writeJson(sourceLockFile, sourceLock);
  await writeJson(installedLockFile, installedLock);
  await writeJson(installedPackageFile, { name: 'fixture-package', version: '2.0.0' });
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete env[key];
  const git = args => execute('git', args, { cwd: sourceRoot, env });
  await git(['init', '--quiet']);
  await git(['add', '.']);
  await git(['-c', 'user.name=Dependency Check Test', '-c', 'user.email=dependency-check@example.invalid',
    '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'Initial dependency fixture']);
  return { sourceRoot, sourceLock, installedLock, sourceLockFile, installedLockFile, installedPackageFile };
}

async function check(fixture, extraStageCode = '') {
  return runChecks({
    sourceRoot: fixture.sourceRoot,
    stages: [{
      id: 'load-installed-package', command: process.execPath, timeoutMs: 10_000,
      args: ['-e', `const fs = require('node:fs');
        fs.mkdirSync('output', { recursive: true });
        fs.writeFileSync('output/stage-ran', 'ran');
        console.log('loaded fixture-package@' + require('fixture-package/package.json').version);
        ${extraStageCode}`]
    }]
  });
}

async function assertBlocked(result, diagnostic) {
  assert.equal(result.report.status, 'failed', JSON.stringify(result.report));
  assert.equal(result.report.checksPassed, false);
  assert.equal(result.report.stages[0].status, 'not_run', 'Dependency validation must happen before executing stages.');
  const errors = result.report.errors.join('\n');
  assert.match(errors, /npm ci/i, 'The failure must explain how to restore the captured dependency installation.');
  assert.match(errors, diagnostic);
  await assert.rejects(fs.access(path.join(result.report.workspace, 'output', 'stage-ran')), { code: 'ENOENT' });
  await assert.rejects(fs.access(path.join(result.directory, 'load-installed-package.log')), { code: 'ENOENT' });
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(result.directory, 'result.json'), 'utf8')), result.report);
}

test('matching npm v3 source and hidden locks execute the installed package', async t => {
  const fixture = await repository(t);
  const result = await check(fixture);
  assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
  assert.equal(result.report.checksPassed, true);
  assert.equal(result.report.sourceUnchanged, true);
  assert.equal(result.report.stages[0].status, 'passed');
  assert.match(await fs.readFile(path.join(result.directory, 'load-installed-package.log'), 'utf8'), /loaded fixture-package@2\.0\.0/);
  assert.equal(await fs.readFile(path.join(result.report.workspace, 'output', 'stage-ran'), 'utf8'), 'ran');
});

test('an unchanged installed v1 cannot validate captured source locked to v2', async t => {
  const fixture = await repository(t);
  fixture.installedLock.packages[packagePath] = dependency('1.0.0');
  await writeJson(fixture.installedLockFile, fixture.installedLock);
  await writeJson(fixture.installedPackageFile, { name: 'fixture-package', version: '1.0.0' });
  await assertBlocked(await check(fixture), /fixture-package/);
});

test('missing npm hidden lock fails before running build commands', async t => {
  const fixture = await repository(t);
  await fs.unlink(fixture.installedLockFile);
  await assertBlocked(await check(fixture), /lock/i);
});

test('missing captured package lock cannot produce a dependency-verified pass', async t => {
  const fixture = await repository(t);
  await fs.unlink(fixture.sourceLockFile);
  await assertBlocked(await check(fixture), /lock/i);
});

test('platform-specific optional packages absent from the hidden lock are allowed', async t => {
  const fixture = await repository(t);
  const otherPlatform = process.platform === 'win32' ? 'darwin' : 'win32';
  fixture.sourceLock.packages['node_modules/fixture-optional-native'] = {
    ...dependency('1.0.0', 'fixture-optional-native'), optional: true, os: [otherPlatform], cpu: ['x64']
  };
  fixture.sourceLock.packages[packagePath].optionalDependencies = { 'fixture-optional-native': '1.0.0' };
  fixture.installedLock.packages[packagePath].optionalDependencies = { 'fixture-optional-native': '1.0.0' };
  await writeJson(fixture.sourceLockFile, fixture.sourceLock);
  await writeJson(fixture.installedLockFile, fixture.installedLock);
  const result = await check(fixture);
  assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
  assert.match(await fs.readFile(path.join(result.directory, 'load-installed-package.log'), 'utf8'), /loaded fixture-package@2\.0\.0/);
});

test('a required transitive package omitted from the hidden lock blocks stages', async t => {
  const fixture = await repository(t);
  fixture.sourceLock.packages['node_modules/fixture-transitive'] = dependency('1.0.0', 'fixture-transitive');
  fixture.sourceLock.packages[packagePath].dependencies = { 'fixture-transitive': '1.0.0' };
  fixture.installedLock.packages[packagePath].dependencies = { 'fixture-transitive': '1.0.0' };
  await writeJson(fixture.sourceLockFile, fixture.sourceLock);
  await writeJson(fixture.installedLockFile, fixture.installedLock);
  await assertBlocked(await check(fixture), /fixture-transitive/);
});

test('surplus installed dependency entries block validation against a different lock', async t => {
  const fixture = await repository(t);
  fixture.installedLock.packages['node_modules/fixture-surplus'] = dependency('1.0.0', 'fixture-surplus');
  await fs.mkdir(path.join(fixture.sourceRoot, 'node_modules', 'fixture-surplus'));
  await writeJson(path.join(fixture.sourceRoot, 'node_modules', 'fixture-surplus', 'package.json'), {
    name: 'fixture-surplus', version: '1.0.0'
  });
  await writeJson(fixture.installedLockFile, fixture.installedLock);
  await assertBlocked(await check(fixture), /fixture-surplus/);
});

for (const field of ['integrity', 'resolved']) {
  test(`matching package versions with different ${field} do not validate`, async t => {
    const fixture = await repository(t);
    fixture.installedLock.packages[packagePath][field] = dependency('1.0.0')[field];
    await writeJson(fixture.installedLockFile, fixture.installedLock);
    await assertBlocked(await check(fixture), /fixture-package/);
  });
}

test('lock object ordering does not affect dependency equivalence', async t => {
  const fixture = await repository(t);
  fixture.installedLock.packages[packagePath] = Object.fromEntries(
    Object.entries(fixture.installedLock.packages[packagePath]).reverse()
  );
  await writeJson(fixture.installedLockFile, fixture.installedLock);
  const result = await check(fixture);
  assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
  assert.equal(result.report.stages[0].status, 'passed');
});

test('matching locks cannot hide a different version in the installed package manifest', async t => {
  const fixture = await repository(t);
  await writeJson(fixture.installedPackageFile, { name: 'fixture-package', version: '1.0.0' });
  await assertBlocked(await check(fixture), /fixture-package/);
});

test('matching locks cannot hide a missing installed package directory', async t => {
  const fixture = await repository(t);
  await fs.rm(path.join(fixture.sourceRoot, packagePath), { recursive: true });
  await assertBlocked(await check(fixture), /fixture-package/);
});

test('an installed package missing from both locks blocks stages', async t => {
  const fixture = await repository(t);
  const directory = path.join(fixture.sourceRoot, 'node_modules', 'fixture-unlisted');
  await fs.mkdir(directory);
  await writeJson(path.join(directory, 'package.json'), { name: 'fixture-unlisted', version: '1.0.0' });
  await assertBlocked(await check(fixture), /fixture-unlisted/);
});

test('npm v2 source locks work with npm v3 hidden locks', async t => {
  const fixture = await repository(t);
  fixture.sourceLock.lockfileVersion = 2;
  fixture.sourceLock.dependencies = { 'fixture-package': dependency('2.0.0') };
  await writeJson(fixture.sourceLockFile, fixture.sourceLock);
  const result = await check(fixture);
  assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
  assert.equal(result.report.dependencies.verified, true);
  assert.equal(result.report.dependencies.packages, 1);
});

test('nested and scoped package directories retain their exact lock paths', async t => {
  const fixture = await repository(t);
  const packages = [
    { path: 'node_modules/@fixture/scoped', name: '@fixture/scoped', version: '1.0.0' },
    { path: `${packagePath}/node_modules/fixture-nested`, name: 'fixture-nested', version: '1.1.0' },
    { path: `${packagePath}/node_modules/@fixture/nested`, name: '@fixture/nested', version: '1.2.0' }
  ];
  fixture.sourceLock.packages[packagePath].dependencies = {
    '@fixture/scoped': '1.0.0', 'fixture-nested': '1.1.0', '@fixture/nested': '1.2.0'
  };
  fixture.installedLock.packages[packagePath].dependencies = {
    ...fixture.sourceLock.packages[packagePath].dependencies
  };
  for (const item of packages) {
    const metadata = dependency(item.version, item.name);
    metadata.resolved = `https://registry.npmjs.org/${item.name}/-/${item.name.split('/').at(-1)}-${item.version}.tgz`;
    fixture.sourceLock.packages[item.path] = metadata;
    fixture.installedLock.packages[item.path] = { ...metadata };
    await fs.mkdir(path.join(fixture.sourceRoot, item.path), { recursive: true });
    await writeJson(path.join(fixture.sourceRoot, item.path, 'package.json'), {
      name: item.name, version: item.version
    });
  }
  await writeJson(fixture.sourceLockFile, fixture.sourceLock);
  await writeJson(fixture.installedLockFile, fixture.installedLock);
  const result = await check(fixture, `
    const scoped = require('@fixture/scoped/package.json');
    const nested = require('./${packagePath}/node_modules/fixture-nested/package.json');
    const scopedNested = require('./${packagePath}/node_modules/@fixture/nested/package.json');
    console.log([scoped.version, nested.version, scopedNested.version].join(','));`);
  assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
  assert.equal(result.report.dependencies.packages, 4);
  assert.match(await fs.readFile(path.join(result.directory, 'load-installed-package.log'), 'utf8'), /1\.0\.0,1\.1\.0,1\.2\.0/);
});

test('package.json dependency declarations must agree with the captured lock root', async t => {
  const fixture = await repository(t);
  const manifestFile = path.join(fixture.sourceRoot, 'package.json');
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  manifest.dependencies['fixture-package'] = '3.0.0';
  await writeJson(manifestFile, manifest);
  await assertBlocked(await check(fixture), /package\.json.*dependencies/i);
});

for (const mutation of [
  { label: 'version', field: 'version', value: '1.0.0', error: /fixture-package.*version/i },
  { label: 'same-version metadata', field: 'main', value: 'alternate-entry.js', error: /package manifests changed/i }
]) {
  test(`shared installed ${mutation.label} changes during stages invalidate a command pass`, async t => {
    const fixture = await repository(t);
    const result = await check(fixture, `
      const manifestPath = '${packagePath}/package.json';
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest[${JSON.stringify(mutation.field)}] = ${JSON.stringify(mutation.value)};
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));`);
    assert.equal(result.report.status, 'failed', JSON.stringify(result.report));
    assert.equal(result.report.checksPassed, true, 'Commands succeeded; dependency integrity must independently invalidate the result.');
    assert.equal(result.report.sourceUnchanged, true);
    assert.equal(result.report.stages[0].status, 'passed');
    assert.match(result.report.errors.join('\n'), mutation.error);
    assert.match(await fs.readFile(path.join(result.directory, 'load-installed-package.log'), 'utf8'), /loaded fixture-package@2\.0\.0/);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(result.directory, 'result.json'), 'utf8')), result.report);
  });
}

for (const kind of ['source', 'installed']) {
  test(`a malformed ${kind} lock packages map blocks stages`, async t => {
    const fixture = await repository(t);
    const value = kind === 'source' ? fixture.sourceLock : fixture.installedLock;
    const file = kind === 'source' ? fixture.sourceLockFile : fixture.installedLockFile;
    value.packages = [];
    await writeJson(file, value);
    await assertBlocked(await check(fixture), /packages map/i);
  });
}

test('a malformed installed lock JSON document blocks stages', async t => {
  const fixture = await repository(t);
  await fs.writeFile(fixture.installedLockFile, '{"packages":');
  await assertBlocked(await check(fixture), /lock/i);
});

test('linked lock entries cannot be represented as verified registry installs', async t => {
  const fixture = await repository(t);
  fixture.sourceLock.packages[packagePath] = { resolved: 'packages/fixture-package', link: true };
  fixture.installedLock.packages[packagePath] = { resolved: 'packages/fixture-package', link: true };
  await writeJson(fixture.sourceLockFile, fixture.sourceLock);
  await writeJson(fixture.installedLockFile, fixture.installedLock);
  await assertBlocked(await check(fixture), /linked|fixture-package/i);
});

test('an installed package symlink cannot bypass the lock inventory', { skip: process.platform === 'win32' }, async t => {
  const fixture = await repository(t);
  const directory = path.join(fixture.sourceRoot, packagePath);
  const external = path.join(path.dirname(fixture.sourceRoot), 'external-package');
  await fs.rename(directory, external);
  await fs.symlink(external, directory, 'dir');
  await assertBlocked(await check(fixture), /ordinary directory.*fixture-package/i);
});
