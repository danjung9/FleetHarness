import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareIsolatedSolutionRuntime, verifyIsolatedWorkspace } from '../dist-electron/electron/isolated-solution-runtime.js';

const supported = ['darwin', 'linux'].includes(process.platform);
async function fixture(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-isolated-runtime-test-'));
  for (const [name, value] of Object.entries(files)) { await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true }); await fs.writeFile(path.join(root, name), value); }
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const manifest = (runtime, files) => ({ profile: 'cli', files, requiredEnv: [], command: { runtime, entrypoint: files[0], args: [] } });

for (const runtime of ['node', 'python']) test(`isolated ${runtime} package uses the delivered invoke implementation`, { skip: !supported }, async t => {
  const file = runtime === 'node' ? 'app.mjs' : 'app.py';
  const source = runtime === 'node' ? 'export function invoke(input){return {sum:input.a+input.b};}' : 'def invoke(value, context):\n    return {"sum":value["a"]+value["b"]}\n';
  const root = await fixture(t, { [file]: source });
  const prepared = await prepareIsolatedSolutionRuntime(root, manifest(runtime, [file]), process.execPath);
  t.after(() => prepared.close());
  assert.deepEqual(await prepared.invoke({ a: 7, b: 11 }), { sum: 18 });
  assert.equal(prepared.provenance.profile, 'cli'); assert.deepEqual(prepared.provenance.environmentNames, []);
  await prepared.assertIntegrity();
  await prepared.close(); await assert.rejects(fs.access(prepared.root));
});

test('service previews expose only the package allowlist and release the previous runtime on close', { skip: !supported }, async t => {
  const root = await fixture(t, { 'app.mjs': 'export const invoke=value=>value;', 'index.html': '<h1>Candidate preview</h1>', 'private.md': 'Do not serve this file' });
  const prepared = await prepareIsolatedSolutionRuntime(root, { ...manifest('node', ['app.mjs', 'index.html']), profile: 'service' }, process.execPath);
  t.after(() => prepared.close());
  const entry = await fetch(prepared.url, { redirect: 'manual' });
  const cookie = entry.headers.get('set-cookie').split(';')[0], origin = new URL(prepared.url).origin;
  assert.match(await (await fetch(origin, { headers: { cookie } })).text(), /Candidate preview/);
  assert.equal((await fetch(origin + '/private.md', { headers: { cookie } })).status, 404);
  await prepared.close(); await assert.rejects(fetch(prepared.url));
});

test('generated developer tests run without host secrets, outside filesystem access, or source write access', { skip: !supported }, async t => {
  const outside = await fixture(t, { 'answer.txt': 'host-only-answer' });
  const root = await fixture(t, { 'value.txt': 'fixed', 'app.test.cjs': `const t=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs');
t('confined',()=>{a.equal(process.env.FLEET_PRIVATE_TEST_SECRET,undefined);a.throws(()=>fs.readFileSync(${JSON.stringify(path.join(outside, 'answer.txt'))}));a.throws(()=>fs.writeFileSync('value.txt','changed'));});` });
  process.env.FLEET_PRIVATE_TEST_SECRET = 'not-inherited';
  try {
    const result = await verifyIsolatedWorkspace(root, process.execPath, () => {});
    assert.equal(result.exitCode, 0, result.output); assert.equal(result.passed, 1);
    assert.equal(await fs.readFile(path.join(root, 'value.txt'), 'utf8'), 'fixed');
  } finally { delete process.env.FLEET_PRIVATE_TEST_SECRET; }
});

test('isolated packages reject aliases, hidden host metadata, credentials and unsupported process arguments', { skip: !supported }, async t => {
  const root = await fixture(t, { 'app.mjs': 'export const invoke=value=>value;' });
  const base = manifest('node', ['app.mjs']);
  await assert.rejects(prepareIsolatedSolutionRuntime(root, { ...base, requiredEnv: ['API_KEY'] }, process.execPath), /configured service/);
  await assert.rejects(prepareIsolatedSolutionRuntime(root, { ...base, command: { ...base.command, args: ['--listen'] } }, process.execPath), /no process arguments/);
  await fs.link(path.join(root, 'app.mjs'), path.join(root, 'linked.mjs'));
  await assert.rejects(prepareIsolatedSolutionRuntime(root, base, process.execPath), /no aliases/);
  await assert.rejects(prepareIsolatedSolutionRuntime(root, { ...base, files: ['app.mjs', 'behavior-contract.json'] }, process.execPath), /aliases|Invalid isolated package path/);
});
