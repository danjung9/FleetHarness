import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareMacosIsolation } from '../dist-electron/electron/macos-isolation.js';

test('optional macOS policy grants actual host runtime libraries without granting installation trees', { skip: process.platform !== 'darwin' }, async t => {
  const scratch = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'runtime-libraries-')));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const profile = { filesystem: { ':root': 'deny', ':minimal': 'read' }, network: { enabled: false } };
  const runtime = await fs.realpath(process.execPath);
  const launch = await prepareMacosIsolation(profile, scratch, runtime, ['-e', 'console.log("synthetic")']);
  assert.equal(launch.executable, '/usr/bin/sandbox-exec');
  const libraries = process.report.getReport().sharedObjects.filter(file => path.isAbsolute(file) && !file.startsWith('/System/') && !file.startsWith('/usr/lib/'));
  assert.ok(libraries.length > 0);
  for (const file of libraries) assert.equal(profile.filesystem[await fs.realpath(file)], 'read', file);
  for (const prefix of ['/opt/homebrew', '/opt/homebrew/Cellar', '/usr/local']) assert.equal(profile.filesystem[prefix], undefined);
  assert.equal(profile.filesystem[':root'], 'deny'); assert.equal(profile.network.enabled, false);
});
