import test from 'node:test';
import assert from 'node:assert/strict';
import { constants, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { ClassifiedExecutionFailure } from '../dist-electron/electron/execution-failure.js';
import { prepareIsolatedDependencies } from '../dist-electron/electron/isolated-dependencies.js';
import { prepareIsolatedSolutionRuntime } from '../dist-electron/electron/isolated-solution-runtime.js';

async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-dependency-host-failure-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const manifest = { profile: 'cli', command: { runtime: 'node', entrypoint: 'app.mjs', args: [] },
    files: ['app.mjs', 'package.json', 'package-lock.json'], requiredEnv: [],
    dependencies: { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' } };
  await fs.writeFile(path.join(root, 'app.mjs'), 'export const invoke = value => value;\n');
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'host-failure-fixture', version: '1.0.0' }));
  await fs.writeFile(path.join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3,
    packages: { '': { name: 'host-failure-fixture', version: '1.0.0' } } }));
  return { root, manifest, nodeExecutable: process.execPath, timeoutMs: 10_000 };
}

const noNetwork = { fetch: async () => { assert.fail('A host-storage failure must not contact a registry.'); } };
const hostError = code => Object.assign(new Error(`${code}: host storage fixture`), { code });
const classified = (classification, cause) => error => {
  assert.ok(error instanceof ClassifiedExecutionFailure);
  assert.equal(error.classification, classification);
  if (cause) assert.equal(error.cause, cause, 'Keep the trusted host error as the cause.');
  return true;
};

function failPath(t, method, target, failure) {
  const original = fs[method]; let calls = 0;
  t.mock.method(fs, method, async function (file, ...args) {
    if (String(file) === target) { calls++; throw failure; }
    return original.call(fs, file, ...args);
  });
  return () => assert.equal(calls, 1, `The ${method} fault must be exercised exactly once.`);
}

for (const code of ['ENOSPC', 'EDQUOT', 'EMFILE', 'ENFILE', 'EIO', 'EROFS']) {
  test(`host ${code} creating the installer is infrastructure, not candidate failure`, async t => {
    const options = await fixture(t), failure = hostError(code);
    const exercised = failPath(t, 'mkdir', path.join(options.root, '.fleet-dependencies'), failure);
    await assert.rejects(prepareIsolatedDependencies(options, noNetwork), classified('infrastructure', failure));
    exercised();
  });
}

test('host I/O failure opening a manifest retains infrastructure provenance', async t => {
  const options = await fixture(t), failure = hostError('EIO');
  const exercised = failPath(t, 'open', path.join(options.root, 'package.json'), failure);
  await assert.rejects(prepareIsolatedDependencies(options, noNetwork), classified('infrastructure', failure));
  exercised();
  await assert.rejects(fs.access(path.join(options.root, '.fleet-dependencies')), { code: 'ENOENT' });
});

test('host I/O failure reading an opened manifest retains infrastructure provenance', async t => {
  const options = await fixture(t), failure = hostError('EIO'), original = fs.open; let reads = 0;
  t.mock.method(fs, 'open', async function (file, ...args) {
    const handle = await original.call(fs, file, ...args);
    if (String(file) === path.join(options.root, 'package.json')) {
      t.mock.method(handle, 'readFile', async () => { reads++; throw failure; });
    }
    return handle;
  });
  await assert.rejects(prepareIsolatedDependencies(options, noNetwork), classified('infrastructure', failure));
  assert.equal(reads, 1);
  await assert.rejects(fs.access(path.join(options.root, '.fleet-dependencies')), { code: 'ENOENT' });
});

test('host I/O failure writing installer inputs is infrastructure', async t => {
  const options = await fixture(t), failure = hostError('EIO');
  const exercised = failPath(t, 'writeFile', path.join(options.root, '.fleet-dependencies', 'package.json'), failure);
  await assert.rejects(prepareIsolatedDependencies(options, noNetwork), classified('infrastructure', failure));
  exercised();
  await assert.rejects(fs.access(path.join(options.root, '.fleet-dependencies')), { code: 'ENOENT' });
});

async function installedNpmCache() {
  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!path.isAbsolute(directory)) continue;
    try {
      const npm = await fs.realpath(path.join(directory, 'npm'));
      await fs.access(npm, constants.X_OK);
      return createRequire(npm)('cacache');
    } catch { /* Find the installed npm used by the dependency host. */ }
  }
  assert.fail('This dependency fixture requires the installed npm toolchain.');
}

test('host npm cache storage failures cannot become generated dependency failures', async t => {
  const options = await fixture(t), cache = await installedNpmCache(), failure = hostError('ENOSPC');
  const bytes = Buffer.from('Verified fixture bytes; cache failure prevents extraction.');
  const url = 'https://registry.npmjs.org/host-storage-fixture/-/host-storage-fixture-1.0.0.tgz';
  await fs.writeFile(path.join(options.root, 'package.json'), JSON.stringify({ name: 'host-failure-fixture', version: '1.0.0',
    dependencies: { 'host-storage-fixture': '1.0.0' } }));
  await fs.writeFile(path.join(options.root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: {
    '': { name: 'host-failure-fixture', version: '1.0.0', dependencies: { 'host-storage-fixture': '1.0.0' } },
    'node_modules/host-storage-fixture': { version: '1.0.0', resolved: url,
      integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64') }
  } }));
  const original = cache.put; let writes = 0, downloads = 0;
  t.mock.method(cache, 'put', async (...args) => {
    if (args[0] === path.join(options.root, '.fleet-dependencies', 'cache', '_cacache')) {
      writes++; assert.deepEqual(args[2], bytes); throw failure;
    }
    return original(...args);
  });
  await assert.rejects(prepareIsolatedDependencies(options, { fetch: async request => {
    downloads++; assert.equal(request, url); return new Response(bytes);
  } }), classified('infrastructure', failure));
  assert.equal(downloads, 1); assert.equal(writes, 1);
  await assert.rejects(fs.access(path.join(options.root, '.fleet-dependencies')), { code: 'ENOENT' });
});

for (const kind of ['missing manifest', 'malformed manifest', 'reserved installer collision']) {
  test(`${kind} remains a candidate implementation failure`, async t => {
    const options = await fixture(t);
    if (kind === 'missing manifest') await fs.rm(path.join(options.root, 'package.json'));
    else if (kind === 'malformed manifest') await fs.writeFile(path.join(options.root, 'package.json'), '{broken');
    else await fs.mkdir(path.join(options.root, '.fleet-dependencies'));
    await assert.rejects(prepareIsolatedDependencies(options, noNetwork), classified('implementation'));
  });
}

test('ambiguous candidate permission errors retain implementation classification', async t => {
  const options = await fixture(t), failure = hostError('EACCES');
  const exercised = failPath(t, 'open', path.join(options.root, 'package.json'), failure);
  await assert.rejects(prepareIsolatedDependencies(options, noNetwork), classified('implementation', failure));
  exercised();
});

test('errno text without a trusted error code cannot censor candidate failures', async t => {
  const options = await fixture(t), failure = new Error('ENOSPC EIO EROFS: arbitrary dependency failure text');
  const exercised = failPath(t, 'mkdir', path.join(options.root, '.fleet-dependencies'), failure);
  await assert.rejects(prepareIsolatedDependencies(options, noNetwork), classified('implementation', failure));
  exercised();
});

for (const classification of ['implementation', 'infrastructure', 'integrity']) {
  test(`existing trusted ${classification} classification survives storage-like metadata`, async t => {
    const options = await fixture(t);
    const failure = Object.assign(new ClassifiedExecutionFailure(classification, 'already classified'), { code: 'ENOSPC' });
    const exercised = failPath(t, 'mkdir', path.join(options.root, '.fleet-dependencies'), failure);
    await assert.rejects(prepareIsolatedDependencies(options, noNetwork), error => error === failure);
    exercised();
  });
}

test('preexisting cancellation retains its infrastructure abort cause', async t => {
  const options = await fixture(t), controller = new AbortController();
  controller.abort();
  await assert.rejects(prepareIsolatedDependencies({ ...options, signal: controller.signal }, noNetwork),
    classified('infrastructure', controller.signal.reason));
  await assert.rejects(fs.access(path.join(options.root, '.fleet-dependencies')), { code: 'ENOENT' });
});

test('an ordinary runtime without dependencies remains a successful no-install path', async t => {
  const options = await fixture(t); delete options.manifest.dependencies;
  assert.deepEqual(await prepareIsolatedDependencies(options, noNetwork), { python: undefined, readPaths: [], testEnvironment: {} });
  await assert.rejects(fs.access(path.join(options.root, '.fleet-dependencies')), { code: 'ENOENT' });
});

test('isolated runtime preparation preserves host failure classification and removes its temporary package', async t => {
  const options = await fixture(t), failure = hostError('ENOSPC'), original = fs.mkdir;
  let temporaryDirectory, faults = 0;
  t.mock.method(fs, 'mkdir', async function (file, ...args) {
    const destination = String(file), packageDirectory = path.dirname(destination), directory = path.dirname(packageDirectory);
    if (path.basename(destination) === '.fleet-dependencies' && path.basename(packageDirectory) === 'package'
      && path.basename(directory).startsWith('fleet-candidate-package-')) {
      faults++; temporaryDirectory = directory; throw failure;
    }
    return original.call(fs, file, ...args);
  });
  await assert.rejects(prepareIsolatedSolutionRuntime(options.root, options.manifest, process.execPath),
    classified('infrastructure', failure));
  assert.equal(faults, 1); assert.ok(temporaryDirectory);
  await assert.rejects(fs.access(temporaryDirectory), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(options.root, 'app.mjs'), 'utf8'), 'export const invoke = value => value;\n');
});
