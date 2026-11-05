import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs, appendFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listArtifacts, sourceHash } from '../dist-electron/electron/storage.js';
import { applicationTestFiles, verifyWorkspace } from '../dist-electron/electron/verification.js';
import { verifyIsolatedWorkspace } from '../dist-electron/electron/isolated-solution-runtime.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';
import { stageExecutable } from '../dist-electron/electron/executable.js';
import { assertRuntimeSourceFiles } from '../dist-electron/shared/runtime-artifacts.js';

async function fixture(t, files = {}) {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-data-inventory-')));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'workspace'), exports = path.join(directory, 'exports');
  await fs.mkdir(root); await fs.mkdir(exports);
  for (const [file, contents] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), contents);
  }
  return { root, exports };
}

const stateFiles = ['.runtime-data/tasks.json', 'nested/.RUNTIME-DATA/state.json', 'other/.Runtime-Data/records.json'];

test('mutable state segments and their case aliases are excluded while similarly named source remains hashed', async t => {
  const files = Object.fromEntries(stateFiles.map(file => [file, 'private mutable data']));
  const { root } = await fixture(t, { ...files, 'index.html': '<h1>Application</h1>',
    '.runtime-data-copy/core.mjs': 'export const version=1;', 'data/.runtime-data.json': 'immutable supplied data' });
  const expected = ['.runtime-data-copy/core.mjs', 'data/.runtime-data.json', 'index.html'];
  assert.deepEqual((await listArtifacts(root)).map(file => file.path), expected);
  assert.deepEqual(await listArtifacts(root, 'nested/.RUNTIME-DATA'), []);
  const before = await sourceHash(root);
  for (const file of stateFiles) await fs.writeFile(path.join(root, file), 'changed runtime state');
  assert.equal(await sourceHash(root), before);
  for (const file of ['.runtime-data-copy/core.mjs', 'data/.runtime-data.json']) {
    await fs.appendFile(path.join(root, file), 'changed source');
    assert.notEqual(await sourceHash(root), before, file + ' remains immutable source');
  }
});

test('runtime state cannot masquerade as application tests', async t => {
  const { root } = await fixture(t, { '.runtime-data/fake.test.mjs': 'import test from "node:test";test("fake",()=>{});',
    'nested/.RUNTIME-DATA/empty.test.cjs': '' });
  assert.deepEqual(await applicationTestFiles(root), []);
  await assert.rejects(verifyWorkspace(root, process.execPath, () => assert.fail('No runtime-data test may be executed')), /did not produce/);
  await fs.writeFile(path.join(root, 'actual.test.mjs'), 'import test from "node:test";test("real",()=>{});');
  const report = await verifyWorkspace(root, process.execPath, () => {});
  assert.equal(report.exitCode, 0); assert.equal(report.total, 1);
  assert.deepEqual(await applicationTestFiles(root), ['actual.test.mjs']);
});

test('developer tests can change durable state but changing immutable source still fails verification', async t => {
  const { root } = await fixture(t, { 'core.mjs': 'export const value=42;',
    'app.test.mjs': `import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile,readFile} from 'node:fs/promises';
test('durable application write',async()=>{await mkdir('.runtime-data',{recursive:true});await writeFile('.runtime-data/task.json','{"title":"Inspect pump"}');assert.equal(JSON.parse(await readFile('.runtime-data/task.json','utf8')).title,'Inspect pump');});` });
  const before = await sourceHash(root), report = await verifyWorkspace(root, process.execPath, () => {});
  assert.equal(report.exitCode, 0); assert.equal(report.passed, 1); assert.equal(report.sourceHash, before);
  await fs.appendFile(path.join(root, 'app.test.mjs'), "\ntest('unapproved source mutation',()=>writeFile('core.mjs','changed'));\n");
  await assert.rejects(verifyWorkspace(root, process.execPath, () => {}), /Source files changed/);
});

test('isolated developer tests may write service state while source remains read-only and host mutation is detected',
  { skip: !['darwin', 'linux'].includes(process.platform) }, async t => {
    const { root } = await fixture(t, { '.runtime-data/previous.json': '{}', 'core.mjs': 'export const value=42;',
      'app.test.mjs': `import test from 'node:test';import assert from 'node:assert/strict';import {writeFile,readFile} from 'node:fs/promises';
test('state is writable; source is protected',async()=>{await writeFile('.runtime-data/task.json','{"revision":2}');assert.equal(JSON.parse(await readFile('.runtime-data/task.json','utf8')).revision,2);await assert.rejects(writeFile('core.mjs','changed'));});` });
    const before = await sourceHash(root), report = await verifyIsolatedWorkspace(root, process.execPath, () => {});
    assert.equal(report.exitCode, 0, report.output); assert.equal(report.passed, 1); assert.equal(report.sourceHash, before);
    await assert.rejects(verifyIsolatedWorkspace(root, process.execPath, () => appendFileSync(path.join(root, 'core.mjs'), '\n// host mutation')), /Application files changed/);
  });

test('source delivery omits mutable state even when it changes during copying', async t => {
  const { root, exports } = await fixture(t, { 'index.html': '<h1>Application</h1>', '.runtime-data-copy/example.json': 'bundled example',
    ...Object.fromEntries(stateFiles.map(file => [file, 'private runtime state'])) });
  const verifiedHash = await sourceHash(root), copied = [];
  const destination = await exportVerifiedBundle({ workspace: root, parent: exports, title: 'Stateful app', verifiedHash, deliveryMarkdown: 'Run the app.' }, undefined,
    async (from, to) => { copied.push(path.relative(root, from)); await fs.copyFile(from, to); await fs.appendFile(path.join(root, stateFiles[0]), 'updated'); });
  assert.equal(await sourceHash(destination), verifiedHash);
  assert.deepEqual(copied, ['.runtime-data-copy/example.json', 'index.html']);
  for (const file of stateFiles) await assert.rejects(fs.access(path.join(destination, file)), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(destination, '.runtime-data-copy/example.json'), 'utf8'), 'bundled example');
});

test('browser executable staging omits runtime data without invalidating an approved source revision', async t => {
  const { root, exports } = await fixture(t, { 'index.html': '<h1>Application</h1>', '.runtime-data/private.json': 'runtime data' });
  const project = { id: 'state-inventory', title: 'State inventory', workspace: root, status: 'approved', approvedAt: new Date().toISOString(),
    report: { exitCode: 0, passed: 1, total: 1, failed: 0, skipped: 0, sourceHash: await sourceHash(root) } };
  await fs.writeFile(path.join(root, '.runtime-data/private.json'), 'changed runtime data');
  const staged = await stageExecutable(project, exports);
  assert.deepEqual((await fs.readdir(staged.source)).sort(), ['index.html', 'main.cjs', 'package.json']);
  await assert.rejects(fs.access(path.join(staged.source, '.runtime-data')), { code: 'ENOENT' });
});

test('reserved mutable state remains invalid in deployment manifests and historical source exports', async t => {
  for (const file of [...stateFiles, '.runtime-data', 'assets\\.RUNTIME-DATA\\state.json']) {
    assert.throws(() => assertRuntimeSourceFiles(['index.html', file]), /reserved writable state directory/);
  }
  const { root, exports } = await fixture(t, { 'index.html': '<h1>Application</h1>', '.runtime-data/private.json': 'private',
    'solution-contract.json': JSON.stringify({ runtime: { files: ['index.html', '.runtime-data/private.json'] } }) });
  await assert.rejects(exportVerifiedBundle({ workspace: root, parent: exports, title: 'Invalid state export', verifiedHash: await sourceHash(root), deliveryMarkdown: 'Run.' }), /reserved writable state directory/);
  assert.deepEqual(await fs.readdir(exports), []);
});
