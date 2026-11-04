import test from 'node:test';
import assert from 'node:assert/strict';
import { windowsVersion } from '../scripts/windows-version.mjs';

test('release versions order new runs above old retries, and A below B', () => {
  const version = (runNumber, runAttempt, baseline = false) => windowsVersion({ runNumber, runAttempt, baseline });
  assert.equal(version(1, 1), '1.1.2');
  assert.equal(version(1, 2), '1.1.4');
  assert.equal(version(1, 2, true), '1.1.3');
  assert.equal(version(65535, 32767), '1.65535.65534');
  assert.equal(version(65536, 1), '2.0.2');
  assert.throws(() => version(1, 32768), /Invalid/);
  assert.throws(() => windowsVersion({ version: '1.2.0', baseline: true }), /between/);
  assert.throws(() => windowsVersion({ version: '1.2.3-beta' }), /numeric/);
});
