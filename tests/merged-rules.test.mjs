import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { requirementsMet } from '../dist-electron/electron/quality.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { RunProcessSweep } from '../dist-electron/electron/process-sweep.js';
import { generatedSandboxCommand } from '../dist-electron/electron/generated-sandbox.js';

test('combined requirements rule needs contract evidence and every coverage obligation, including prose', () => {
  const inventory = [{ id: 'R1' }, { id: 'SUMMARYcustom-1' }];
  const coverage = inventory.map(item => ({ criterionId: item.id, status: 'passed' }));
  assert.equal(requirementsMet(inventory, coverage, true), true);
  assert.equal(requirementsMet(inventory, coverage, false), false, 'Green coverage cannot replace failed capability evidence');
  assert.equal(requirementsMet(inventory, coverage.slice(0, 1), true), false, 'Green capabilities cannot omit prose obligations');
  assert.equal(requirementsMet(inventory, [coverage[0], { ...coverage[1], status: 'unverified' }], true), false);
  assert.equal(requirementsMet(inventory, [coverage[0], coverage[0]], true), false);
});

test('service sandbox policy permits only its assigned loopback endpoint', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-policy-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  if (process.platform !== 'darwin') {
    await assert.rejects(generatedSandboxCommand(root, process.execPath, ['engine.mjs'], { loopbackPort: 12345 }), /No generated service was started/);
    return;
  }
  const command = await generatedSandboxCommand(root, process.execPath, ['engine.mjs'], { loopbackPort: 12345 });
  assert.equal(command.runner, '/usr/bin/sandbox-exec');
  assert.match(command.args[1], /\(deny default\)/);
  assert.match(command.args[1], /network-bind \(local ip "127\.0\.0\.1:12345"\)/);
  assert.match(command.args[1], /network-outbound \(remote ip "127\.0\.0\.1:12345"\)/);
  assert.doesNotMatch(command.args[1], /localhost:\*|127\.0\.0\.1:\*|allow network\*/);
});

// Native receipt: no injected launcher, fake scanner or model calls. This must run
// on the overseer's host because nested sandboxing and native ps are denied here.
test('native combined rule: evaluated generated code is sandboxed and carries the run marker', { timeout: 30000 }, async t => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-contained-test-'));
  t.after(() => fs.rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'source'); await fs.mkdir(root);
  const outside = path.join(parent, 'synthetic-private.txt'); await fs.writeFile(outside, 'synthetic sentinel');
  await fs.writeFile(path.join(root, 'engine.mjs'), `import fs from 'node:fs'; import net from 'node:net';
    let denied = false; try { fs.readFileSync(${JSON.stringify(outside)}); } catch(e) { denied = ['EACCES','EPERM'].includes(e.code); }
    const networkDenied = await new Promise(resolve => { const socket=net.connect(9,'192.0.2.1'); socket.on('error',e=>resolve(['EACCES','EPERM'].includes(e.code))); socket.setTimeout(1000,()=>{socket.destroy();resolve(false)}); });
    console.log(JSON.stringify({denied, networkDenied, marker:process.env.APPYARD_RUN_PROCESS}));`);
  const scope = new RunProcessSweep();
  await scope.run(async () => {
    let runtime;
    try {
      runtime = await prepareSolutionRuntime(root, { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } }, process.execPath);
      assert.deepEqual(await runtime.invoke(null), { denied: true, networkDenied: true, marker: scope.marker });
    } finally { await runtime?.close(); await scope.stop(); }
  });
});
