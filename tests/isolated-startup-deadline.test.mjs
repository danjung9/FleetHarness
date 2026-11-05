import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { RuntimeBroker } from '../dist-electron/electron/runtime-broker.js';
import { IntegrationBroker } from '../dist-electron/electron/integration-broker.js';
import { prepareIsolatedSolutionRuntime } from '../dist-electron/electron/isolated-solution-runtime.js';

const supported = ['darwin', 'linux'].includes(process.platform);
const options = { skip: !supported, timeout: 30_000 };

async function fixture(t, runtime, initializationMs = 0) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-startup-deadline-test-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const name = runtime === 'node' ? 'app.mjs' : 'app.py';
  const source = runtime === 'node'
    ? `const identity = {event:'initializing',pid:process.pid,root:process.cwd(),home:process.env.HOME};
process.stderr.write(JSON.stringify(identity)+'\\n');
await new Promise(resolve=>setTimeout(resolve,${initializationMs}));
export async function invoke(input) {
  if (input.delayMs) await new Promise(resolve=>setTimeout(resolve,input.delayMs));
  return {value:input.value,...identity};
}
`
    : `import json,os,sys,time
identity = {"event":"initializing","pid":os.getpid(),"root":os.getcwd(),"home":os.environ["HOME"]}
sys.stderr.write(json.dumps(identity)+"\\n")
sys.stderr.flush()
time.sleep(${initializationMs / 1000})
def invoke(value, context):
    time.sleep(value.get("delayMs",0)/1000)
    return {"value":value.get("value"),**identity}
`;
  await fs.writeFile(path.join(root, name), source);
  return { root, manifest: { profile: 'cli', files: [name], requiredEnv: [], command: { runtime, entrypoint: name, args: [] } } };
}

// Observe real launches without replacing package preparation, sandboxing, transport or timers.
function observeLaunch(t, onInitializing) {
  const original = RuntimeBroker.start;
  const observed = { workspace: undefined, identity: undefined };
  t.mock.method(RuntimeBroker, 'start', async function (settings) {
    observed.workspace = settings.workspace;
    let output = '';
    return await original.call(this, { ...settings, onLog(text) {
      settings.onLog?.(text);
      output += text;
      for (;;) {
        const end = output.indexOf('\n');
        if (end < 0) break;
        const line = output.slice(0, end); output = output.slice(end + 1);
        let record;
        try { record = JSON.parse(line); } catch { continue; }
        if (record.event === 'initializing') {
          observed.identity = record;
          onInitializing?.(record);
        }
      }
    } });
  });
  return observed;
}

async function assertStopped(identity) {
  if (!identity) return; // A startup limit may expire before the interpreter launches.
  let exited = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { process.kill(identity.pid, 0); }
    catch (error) { assert.equal(error.code, 'ESRCH'); exited = true; break; }
    await delay(50);
  }
  assert.equal(exited, true, 'The initialized interpreter must exit after cancellation or close.');
  await assert.rejects(fs.access(path.dirname(identity.home)), { code: 'ENOENT' }, 'The isolated process scratch directory must be removed.');
}

async function assertPackageRemoved(observed) {
  assert.ok(observed.workspace, 'Preparation reached the real runtime launch.');
  await assert.rejects(fs.access(path.dirname(observed.workspace)), { code: 'ENOENT' }, 'The temporary package must be removed.');
  await assertStopped(observed.identity);
}

for (const runtime of ['node', 'python']) {
  test(`isolated ${runtime} rejects slow initialization using its shorter startup deadline`, options, async t => {
    const f = await fixture(t, runtime, 2500), observed = observeLaunch(t);
    const integrations = new IntegrationBroker({ candidateId: 'startup-deadline-' + runtime, operations: [] });
    let prepared;
    t.after(() => prepared?.close());
    await assert.rejects(async () => {
      prepared = await prepareIsolatedSolutionRuntime(f.root, f.manifest, process.execPath, undefined,
        { startupTimeoutMs: 750, invocationTimeoutMs: 7000, totalTimeoutMs: 15_000 }, { integrations: () => integrations });
    }, /did not become ready/);
    assert.equal(integrations.revoked, true, 'Startup failure revokes the package integration lease.');
    await assertPackageRemoved(observed);
  });

  test(`isolated ${runtime} permits initialization longer than its invocation deadline`, options, async t => {
    const f = await fixture(t, runtime, 1800), observed = observeLaunch(t);
    const prepared = await prepareIsolatedSolutionRuntime(f.root, f.manifest, process.execPath, undefined,
      { startupTimeoutMs: 8000, invocationTimeoutMs: 500, totalTimeoutMs: 15_000 });
    t.after(() => prepared.close());
    assert.equal((await prepared.invoke({ value: 'ready' })).value, 'ready');
    await prepared.assertIntegrity();
    await prepared.close();
    await assertPackageRemoved(observed);
  });

  test(`isolated ${runtime} still limits a slow invocation after successful startup`, options, async t => {
    const f = await fixture(t, runtime), observed = observeLaunch(t);
    const prepared = await prepareIsolatedSolutionRuntime(f.root, f.manifest, process.execPath, undefined,
      { startupTimeoutMs: 8000, invocationTimeoutMs: 500, totalTimeoutMs: 15_000 });
    t.after(() => prepared.close());
    assert.equal((await prepared.invoke({ value: 'first' })).value, 'first');
    await assert.rejects(prepared.invoke({ value: 'too late', delayMs: 2500 }), /request exceeded its deadline/);
    await assert.rejects(prepared.invoke({ value: 'revoked' }), /request exceeded its deadline/);
    await prepared.close();
    await assertPackageRemoved(observed);
  });

  test(`isolated ${runtime} clears its startup timer when readiness succeeds`, options, async t => {
    const f = await fixture(t, runtime), observed = observeLaunch(t);
    const prepared = await prepareIsolatedSolutionRuntime(f.root, f.manifest, process.execPath, undefined,
      { startupTimeoutMs: 1500, invocationTimeoutMs: 4000, totalTimeoutMs: 15_000 });
    t.after(() => prepared.close());
    // Waiting relative to returned readiness guarantees the original startup deadline has elapsed.
    await delay(1700);
    assert.equal((await prepared.invoke({ value: 'still ready' })).value, 'still ready');
    await prepared.close();
    await assertPackageRemoved(observed);
  });

  test(`isolated ${runtime} cancellation during initialization removes process and package`, options, async t => {
    const controller = new AbortController(), f = await fixture(t, runtime, 12_000);
    const observed = observeLaunch(t, () => controller.abort(new Error('Cancelled initialization fixture.')));
    await assert.rejects(prepareIsolatedSolutionRuntime(f.root, f.manifest, process.execPath, controller.signal,
      { startupTimeoutMs: 20_000, invocationTimeoutMs: 15_000, totalTimeoutMs: 25_000 }), /cancelled/i);
    assert.ok(observed.identity, 'The caller aborts only after the interpreter begins initialization.');
    await assertPackageRemoved(observed);
  });

  test(`isolated ${runtime} total budget still bounds initialization and removes the package`, options, async t => {
    const f = await fixture(t, runtime, 12_000), observed = observeLaunch(t);
    await assert.rejects(prepareIsolatedSolutionRuntime(f.root, f.manifest, process.execPath, undefined,
      { startupTimeoutMs: 20_000, invocationTimeoutMs: 15_000, totalTimeoutMs: 3000 }), /cancelled|execution budget|deadline/i);
    assert.ok(observed.identity, 'The total budget expires while the real interpreter is initializing.');
    await assertPackageRemoved(observed);
  });
}

test('direct broker callers keep the request deadline as their default startup deadline', options, async t => {
  const f = await fixture(t, 'node', 2500), observed = observeLaunch(t);
  let broker;
  t.after(() => broker?.close());
  await assert.rejects(async () => {
    broker = await RuntimeBroker.start({ workspace: f.root, executable: process.execPath,
      runtime: 'node', entrypoint: 'app.mjs', requestTimeoutMs: 750, timeoutMs: 15_000 });
  }, /did not become ready/);
  await assertStopped(observed.identity);
  await fs.access(f.root); // A direct caller owns its original workspace.
});

test('a direct startup deadline preserves the readiness failure during sandbox preparation', options, async t => {
  const f = await fixture(t, 'node', 2500), observed = observeLaunch(t);
  let broker;
  t.after(() => broker?.close());
  await assert.rejects(async () => {
    broker = await RuntimeBroker.start({ workspace: f.root, executable: process.execPath,
      runtime: 'node', entrypoint: 'app.mjs', startupTimeoutMs: 1, requestTimeoutMs: 7000, timeoutMs: 15_000 });
  }, /did not become ready/);
  await assertStopped(observed.identity);
  await fs.access(f.root);
});
