import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readBuildInfo } from '../dist-electron/electron/build-info.js';

test('installed provenance is exact while legacy packages remain readable', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-build-info-'));
  try {
    assert.equal(readBuildInfo('1.2.3', root, false).revision, 'development');
    assert.equal(readBuildInfo('1.2.3', root, true).revision, 'unavailable');
    const info = { schemaVersion: 1, version: '1.2.3', revision: 'a'.repeat(40), buildId: 'ci-123-1' };
    await fs.writeFile(path.join(root, 'build-info.json'), JSON.stringify(info));
    assert.deepEqual(readBuildInfo('1.2.3', root, true), info);
    assert.throws(() => readBuildInfo('1.2.4', root, true), /inconsistent/);
    await fs.writeFile(path.join(root, 'build-info.json'), JSON.stringify({ ...info, revision: 'short-sha' }));
    assert.throws(() => readBuildInfo('1.2.3', root, true), /inconsistent/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
