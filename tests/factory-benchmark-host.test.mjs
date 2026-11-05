import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { captureBenchmarkHost } from '../scripts/factory-benchmark-host.mjs';

const execute = promisify(execFile);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const requiredFiles = [
  'scripts/benchmark-factory.mjs',
  'scripts/factory-benchmark-inputs.mjs',
  'scripts/factory-browser-holdout.mjs',
  'scripts/factory-benchmark-host.mjs',
  'package.json',
  'package-lock.json',
  'node_modules/.package-lock.json'
];
const roots = ['dist-electron', 'skills', 'templates'];
const fixtureFiles = new Map([
  ...requiredFiles.map(name => [name, Buffer.from(`fixture ${name}\n`)]),
  ['dist-electron/electron/solution-evaluation.js', Buffer.from('export const score = () => 1;\n')],
  ['dist-electron/shared/verification.js', Buffer.from('export const accepted = value => value === true;\n')],
  ['dist-electron/electron/worker.bin', Buffer.from([0, 255, 254, 13, 10])],
  ['skills/fleet-planning/SKILL.md', Buffer.from('# Planning\nVerify naïve assumptions.\r\n')],
  ['skills/fleet-planning/scripts/run', Buffer.from('#!/bin/sh\nprintf "ready\\n"\n')],
  ['templates/node-service/server.mjs', Buffer.from('export const serve = () => "ready";\n')]
]);

async function write(root, name, bytes) {
  const destination = path.join(root, name);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
  await fs.chmod(destination, name === 'skills/fleet-planning/scripts/run' ? 0o755 : 0o644);
}

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-benchmark-host-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'source');
  // Reverse insertion order ensures the inventory is independent of creation order.
  for (const [name, bytes] of [...fixtureFiles].reverse()) await write(root, name, bytes);
  return { root, directory };
}

test('host provenance records exact artifact bytes, modes and runtime without root-dependent metadata', async t => {
  const { root } = await fixture(t);
  const captured = captureBenchmarkHost(root);
  assert.equal(typeof captured.bytes, 'string');
  assert.equal(captured.bytes.endsWith('\n'), true);
  assert.equal(captured.sha256, sha256(Buffer.from(captured.bytes, 'utf8')));
  assert.deepEqual(JSON.parse(captured.bytes), captured.manifest);
  assert.equal(captured.manifest.schemaVersion, 1);
  assert.deepEqual(captured.manifest.runtime, {
    node: process.version, versions: { ...process.versions }, platform: process.platform, arch: process.arch
  });
  assert.deepEqual(captured.manifest.artifacts, [...fixtureFiles].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([name, bytes]) => ({ path: name, sha256: sha256(bytes), bytes: bytes.length,
      mode: name === 'skills/fleet-planning/scripts/run' ? 0o755 : 0o644 })));
  assert.equal(captured.bytes.includes(root), false);
  assert.equal(captured.manifest.artifacts.every(entry => !path.isAbsolute(entry.path) && !entry.path.includes('\\')), true);
});

test('relocating identical host artifacts and changing timestamps preserves the captured identity', async t => {
  const { root, directory } = await fixture(t);
  const relocated = path.join(directory, 'a-different-checkout');
  await fs.cp(root, relocated, { recursive: true });
  for (const name of fixtureFiles.keys()) await fs.utimes(path.join(relocated, name), 1_000, 2_000);
  const original = captureBenchmarkHost(root), moved = captureBenchmarkHost(relocated);
  assert.equal(moved.sha256, original.sha256);
  assert.equal(moved.bytes, original.bytes);
  assert.deepEqual(moved.manifest, original.manifest);
});

test('every mandatory script, lock, scorer, skill and template change alters host identity', async t => {
  for (const name of [
    ...requiredFiles,
    'dist-electron/electron/solution-evaluation.js',
    'dist-electron/shared/verification.js',
    'skills/fleet-planning/SKILL.md',
    'templates/node-service/server.mjs'
  ]) await t.test(name, async t => {
    const { root } = await fixture(t);
    const before = captureBenchmarkHost(root);
    await fs.appendFile(path.join(root, name), '\nchanged\n');
    const after = captureBenchmarkHost(root);
    assert.notEqual(after.sha256, before.sha256);
    const oldEntry = before.manifest.artifacts.find(entry => entry.path === name);
    const newEntry = after.manifest.artifacts.find(entry => entry.path === name);
    assert.notEqual(newEntry.sha256, oldEntry.sha256);
    assert.ok(newEntry.bytes > oldEntry.bytes);
    assert.deepEqual(after.manifest.artifacts.filter(entry => entry.path !== name), before.manifest.artifacts.filter(entry => entry.path !== name));
  });
});

test('added and deleted nested artifacts change the inventory in every host artifact root', async t => {
  for (const parent of roots) await t.test(parent, async t => {
    const { root } = await fixture(t);
    const name = `${parent}/new/deeply/nested/resource.dat`;
    const before = captureBenchmarkHost(root);
    await write(root, name, Buffer.from([0, 1, 127, 128, 255]));
    const added = captureBenchmarkHost(root);
    assert.notEqual(added.sha256, before.sha256);
    assert.equal(added.manifest.artifacts.length, before.manifest.artifacts.length + 1);
    assert.deepEqual(added.manifest.artifacts.find(entry => entry.path === name), {
      path: name, sha256: sha256(Buffer.from([0, 1, 127, 128, 255])), bytes: 5, mode: 0o644
    });
    await fs.unlink(path.join(root, name));
    const deleted = captureBenchmarkHost(root);
    assert.notEqual(deleted.sha256, added.sha256);
    assert.equal(deleted.sha256, before.sha256);
  });
});

test('executable permission changes alter host identity without changing content', { skip: process.platform === 'win32' }, async t => {
  const { root } = await fixture(t), name = 'skills/fleet-planning/scripts/run';
  const before = captureBenchmarkHost(root);
  await fs.chmod(path.join(root, name), 0o644);
  const after = captureBenchmarkHost(root);
  assert.notEqual(after.sha256, before.sha256);
  const oldEntry = before.manifest.artifacts.find(entry => entry.path === name);
  const newEntry = after.manifest.artifacts.find(entry => entry.path === name);
  assert.equal(oldEntry.sha256, newEntry.sha256);
  assert.equal(oldEntry.bytes, newEntry.bytes);
  assert.equal(oldEntry.mode, 0o755);
  assert.equal(newEntry.mode, 0o644);
});

test('missing required scripts, locks and artifact roots are rejected', async t => {
  for (const name of [...requiredFiles, ...roots]) await t.test(name, async t => {
    const { root } = await fixture(t);
    await fs.rm(path.join(root, name), { recursive: true, force: true });
    assert.throws(() => captureBenchmarkHost(root));
  });
});

test('an empty compiled host tree cannot produce usable provenance', async t => {
  const { root } = await fixture(t);
  await fs.rm(path.join(root, 'dist-electron'), { recursive: true });
  await fs.mkdir(path.join(root, 'dist-electron/electron'), { recursive: true });
  await write(root, 'dist-electron/.DS_Store', Buffer.from('incidental metadata'));
  assert.throws(() => captureBenchmarkHost(root));
});

test('provenance ignores outputs, tests, TypeScript sources and dependency contents outside the installed lock', async t => {
  const { root } = await fixture(t);
  const before = captureBenchmarkHost(root);
  const excluded = [
    'output/run/result.json', 'tests/new.test.mjs', 'electron/solution-evaluation.ts',
    'scripts/unrelated.mjs', 'node_modules/example/index.js', 'node_modules/example/package.json',
    '.DS_Store', 'dist-electron/.DS_Store', 'dist-electron/electron/.DS_Store',
    'skills/fleet-planning/.DS_Store', 'templates/node-service/.DS_Store'
  ];
  for (const name of excluded) await write(root, name, Buffer.from(`unrelated ${name}\n`));
  const after = captureBenchmarkHost(root);
  assert.equal(after.sha256, before.sha256);
  assert.equal(after.bytes, before.bytes);
});

test('artifact roots, nested directories and captured files cannot be symbolic links', { skip: process.platform === 'win32' }, async t => {
  for (const name of [
    'dist-electron', 'scripts', 'skills/fleet-planning', 'dist-electron/electron/solution-evaluation.js',
    'skills/fleet-planning/SKILL.md', 'templates/node-service/server.mjs',
    'scripts/factory-benchmark-host.mjs', 'node_modules/.package-lock.json'
  ]) await t.test(name, async t => {
    const { root, directory } = await fixture(t);
    const actual = path.join(root, name), outside = path.join(directory, 'outside-artifact');
    await fs.rename(actual, outside);
    await fs.symlink(outside, actual);
    assert.throws(() => captureBenchmarkHost(root));
  });
});

test('private builds may share a symlinked node_modules parent while retaining installed-lock identity', { skip: process.platform === 'win32' }, async t => {
  const { root, directory } = await fixture(t);
  const before = captureBenchmarkHost(root), original = path.join(root, 'node_modules'), shared = path.join(directory, 'shared-dependencies');
  await fs.rename(original, shared);
  await fs.symlink(shared, original);
  const after = captureBenchmarkHost(root);
  assert.equal(after.sha256, before.sha256);
  assert.equal(after.bytes, before.bytes);
  await fs.appendFile(path.join(shared, '.package-lock.json'), '\nchanged installed lock\n');
  assert.notEqual(captureBenchmarkHost(root).sha256, before.sha256);
});

test('special files are rejected without opening or waiting on them', { skip: process.platform === 'win32', timeout: 5_000 }, async t => {
  const { root } = await fixture(t);
  await execute('mkfifo', [path.join(root, 'skills/fleet-planning/pending-input')]);
  // Run this probe separately so a regressed reader that opens the FIFO cannot
  // block the test runner's event loop or leave the remainder of the suite stuck.
  const module = new URL('../scripts/factory-benchmark-host.mjs', import.meta.url).href;
  const { stdout } = await execute(process.execPath, ['--input-type=module', '-e',
    `import { captureBenchmarkHost } from ${JSON.stringify(module)};
    try { captureBenchmarkHost(process.argv[1]); process.stdout.write('accepted'); }
    catch { process.stdout.write('rejected'); }`, root], { timeout: 3_000, killSignal: 'SIGKILL' });
  assert.equal(stdout, 'rejected');
});

test('host provenance never copies environment values or process paths into its runtime metadata', async t => {
  const { root } = await fixture(t);
  const marker = 'benchmark-host-private-credential-MUST-NOT-APPEAR';
  const variable = 'FLEET_BENCHMARK_PROVENANCE_TEST_SECRET', previous = process.env[variable];
  t.after(() => { if (previous === undefined) delete process.env[variable]; else process.env[variable] = previous; });
  process.env[variable] = marker;
  const captured = captureBenchmarkHost(root);
  assert.equal(captured.bytes.includes(marker), false);
  assert.equal(captured.bytes.includes('FLEET_BENCHMARK_PROVENANCE_TEST_SECRET'), false);
  assert.equal(captured.bytes.includes(process.execPath), false);
  assert.equal(captured.bytes.includes(root), false);
  assert.deepEqual(Object.keys(captured.manifest.runtime).sort(), ['arch', 'node', 'platform', 'versions']);
});
