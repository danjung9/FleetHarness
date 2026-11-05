import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyIsolatedWorkspace } from '../dist-electron/electron/isolated-solution-runtime.js';
import { reportPassed } from '../dist-electron/electron/verification.js';

test('isolated application verification requires real cases and ignores printed summaries', {
  skip: !['darwin', 'linux'].includes(process.platform), timeout: 30_000
}, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-isolated-test-evidence-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'app.test.cjs');
  for (const source of ['// Placeholder.',
    'console.log("# tests 1\\n# pass 1\\n# fail 0");',
    'require("node:test")("real",()=>{});require("node:test").describe.skip("unfinished",()=>{});']) {
    await fs.writeFile(file, source);
    const report = await verifyIsolatedWorkspace(root, process.execPath, () => {});
    assert.equal(reportPassed(report), false, report.output);
  }
  await fs.writeFile(file, 'require("node:test")("actual assertion",()=>require("node:assert/strict").equal(6 * 7,42));');
  const report = await verifyIsolatedWorkspace(root, process.execPath, () => {});
  assert.equal(reportPassed(report), true, report.output);
  assert.equal(report.passed, 1);
});
