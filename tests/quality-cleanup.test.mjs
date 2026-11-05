import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { solutionFixture } from '../scripts/solution-fixture.mjs';

test('clean verification propagates an unconfirmed shutdown instead of returning a repairable report', async t => {
  await fs.mkdir('.tmp', { recursive: true });
  const root = await fs.mkdtemp(path.resolve('.tmp/quality-shutdown-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = solutionFixture(['R1']);
  const solution = JSON.parse(files['solution-contract.json']);
  solution.runtime = { profile: 'cli', files: ['engine.cjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.cjs', args: [] } };
  files['solution-contract.json'] = JSON.stringify(solution);
  const plan = JSON.parse(files['acceptance-plan.json']);
  plan.journeys = []; plan.criteria[0].journeyIds = [];
  files['acceptance-plan.json'] = JSON.stringify(plan);
  files['engine.cjs'] = 'console.log(null);';
  files['app.test.cjs'] = 'require("node:test")("synthetic case",()=>{});';
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(root, name), body);
  const script = `
    import assert from 'node:assert/strict';
    import { mock } from 'node:test';
    const verification = await import('./dist-electron/electron/verification.js');
    const shutdown = new verification.VerificationShutdownError(new Error('Synthetic missing close receipt'));
    let preparations = 0, closes = 0, verifications = 0, failureAt = 'verification';
    mock.module('./dist-electron/electron/verification.js', { exports: { ...verification,
      verifyWorkspace: async () => { verifications++; throw shutdown; } } });
    mock.module('./dist-electron/electron/solution-runtime.js', { exports: {
      prepareSolutionRuntime: async root => {
        preparations++;
        if (failureAt === 'preparation') throw shutdown;
        return { root, provenance: { profile: 'cli', filesHash: 'synthetic' }, testEnvironment: {},
          invoke: async input => input.startsWith('TASK: ') ? input.slice(6) : null,
          assertIntegrity: async () => {}, redactMessage: value => value, redactOutput: value => value,
          close: async () => { closes++; if (failureAt === 'close') throw shutdown; } };
      } } });
    const { loadQualityContract, verifyApplication } = await import('./dist-electron/electron/quality.js');
    const root = process.env.QUALITY_SHUTDOWN_ROOT;
    const contract = await loadQualityContract(root, [{ id: 'R1', requirement: 'Parse synthetic tasks.', method: 'automated', scenario: 'Parse varied tasks.' }], true);
    for (const stage of ['verification', 'preparation', 'close']) {
      failureAt = stage; preparations = closes = verifications = 0;
      await assert.rejects(verifyApplication(root, process.execPath, contract), error => error === shutdown);
      assert.equal(preparations, stage === 'verification' ? 2 : 1);
      assert.equal(verifications, stage === 'verification' ? 1 : 0);
      assert.equal(closes, stage === 'preparation' ? 0 : 2);
    }
  `;
  const child = spawnSync(process.execPath, ['--experimental-test-module-mocks', '--input-type=module', '-e', script], {
    encoding: 'utf8', timeout: 8000, env: { ...process.env, QUALITY_SHUTDOWN_ROOT: root }
  });
  assert.equal(child.status, 0, child.stdout + child.stderr);
});
