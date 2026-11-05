import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from 'node:http';
import { requirementsMet } from '../dist-electron/electron/quality.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { RunProcessSweep } from '../dist-electron/electron/process-sweep.js';

test('combined requirements rule needs contract evidence and every coverage obligation, including prose', () => {
  const inventory = [{ id: 'R1' }, { id: 'SUMMARYcustom-1' }];
  const coverage = inventory.map(item => ({ criterionId: item.id, status: 'passed' }));
  assert.equal(requirementsMet(inventory, coverage, true), true);
  assert.equal(requirementsMet(inventory, coverage, false), false, 'Green coverage cannot replace failed capability evidence');
  assert.equal(requirementsMet(inventory, coverage.slice(0, 1), true), false, 'Green capabilities cannot omit prose obligations');
  assert.equal(requirementsMet(inventory, [coverage[0], { ...coverage[1], status: 'unverified' }], true), false);
  assert.equal(requirementsMet(inventory, [coverage[0], coverage[0]], true), false);
});

// Native receipt: production launcher and process discovery, synthetic data only.
test('native generated runtime has host and network access while retaining its run marker and cleanup', { timeout: 30000 }, async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-direct-test-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'source'); await fs.mkdir(root);
  const outside = path.join(parent, 'synthetic-sentinel.txt'); await fs.writeFile(outside, 'synthetic sentinel');
  const server = createServer((_request, response) => response.end('synthetic network response'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  await fs.writeFile(path.join(root, 'engine.mjs'), `import fs from 'node:fs';
    console.log(JSON.stringify({outside:fs.readFileSync(${JSON.stringify(outside)},'utf8'),
      network:await(await fetch('http://127.0.0.1:${server.address().port}')).text(),marker:process.env.APPYARD_RUN_PROCESS}));`);
  const scope = new RunProcessSweep();
  await scope.run(async () => {
    let runtime;
    try {
      runtime = await prepareSolutionRuntime(root, { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } }, process.execPath);
      assert.deepEqual(await runtime.invoke(null), { outside: 'synthetic sentinel', network: 'synthetic network response', marker: scope.marker });
    } finally { await runtime?.close(); await scope.stop(); }
  });
});
