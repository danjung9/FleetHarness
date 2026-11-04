import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createPackageWithOptions } from '@electron/asar';
import { checkPackagedIntegrity } from '../scripts/check-packaged-integrity.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-integrity-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const source = path.join(root, 'source');
  await fs.mkdir(path.join(source, 'dist-electron', 'electron'), { recursive: true });
  await fs.mkdir(path.join(source, 'dist'));
  await fs.writeFile(path.join(source, 'package.json'), JSON.stringify({ name: 'fixture', version: '1.0.0', main: 'dist-electron/electron/main.js' }));
  await fs.writeFile(path.join(source, 'dist', 'index.html'), '<h1>Fixture application</h1>');
  await fs.writeFile(path.join(source, 'dist-electron', 'electron', 'main.js'), 'console.log("original packed marker");');
  const archive = path.join(root, 'app.asar');
  await createPackageWithOptions(source, archive, { unpack: 'package.json' });
  return { root, source, archive };
}

test('application integrity verifies packed sources and unpacked package metadata', async t => {
  const { archive } = await fixture(t);
  assert.deepEqual(checkPackagedIntegrity(archive), { checkedFiles: 3, main: 'dist-electron/electron/main.js' });
});

test('changed archive bytes cannot pass packaged smoke or receive a build manifest', async t => {
  const { archive } = await fixture(t);
  const bytes = await fs.readFile(archive);
  const marker = Buffer.from('original packed marker'), at = bytes.indexOf(marker);
  assert.ok(at > 0);
  Buffer.from('modified packed marker').copy(bytes, at);
  await fs.writeFile(archive, bytes);
  assert.throws(() => checkPackagedIntegrity(archive), /main\.js: bytes do not match the archive SHA-256/);
});

test('truncated unpacked application metadata is rejected', async t => {
  const { archive } = await fixture(t);
  await fs.writeFile(path.join(archive + '.unpacked', 'package.json'), '{}');
  assert.throws(() => checkPackagedIntegrity(archive), /package\.json: expected .* bytes, read 2/);
});

test('an upgraded archive at the same path is checked using its new header', async t => {
  const { source, archive, root } = await fixture(t);
  checkPackagedIntegrity(archive);
  await fs.appendFile(path.join(source, 'dist-electron', 'electron', 'main.js'), '\nconsole.log("new upgraded source");');
  const replacement = path.join(root, 'replacement.asar');
  await createPackageWithOptions(source, replacement, { unpack: 'package.json' });
  await fs.copyFile(replacement, archive);
  assert.deepEqual(checkPackagedIntegrity(archive), { checkedFiles: 3, main: 'dist-electron/electron/main.js' });
});
