import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareBriefData, validateSyntheticData, freezeSyntheticData, assertBriefDataIntegrity } from '../dist-electron/electron/brief-data.js';
import { syntheticDataFixture, syntheticDataFiles } from '../scripts/data-fixture.mjs';

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-brief-data-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
async function writeData(root, data = syntheticDataFixture) {
  await fs.mkdir(path.join(root, 'data'), { recursive: true });
  await fs.writeFile(path.join(root, 'data/synthetic-data.json'), JSON.stringify(data));
  await fs.writeFile(path.join(root, 'data/README.md'), syntheticDataFiles['data/README.md']);
}

test('supplied inputs preserve duplicate filenames as distinct immutable source files', async t => {
  const root = await temporary(t);
  const inputs = [{ name: 'records.csv', kind: 'file', content: 'message\r\n TASK: inspect pump \r\n' },
    { name: 'records.csv', kind: 'text', content: 'TASK: check valve\n' }];
  const snapshot = await prepareBriefData(root, inputs);
  assert.equal(snapshot.mode, 'provided');
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'inputs/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.sources.map(source => source.path), ['inputs/001-records.csv', 'inputs/002-records.csv']);
  for (const [index, source] of manifest.sources.entries()) {
    assert.equal(await fs.readFile(path.join(root, source.path), 'utf8'), inputs[index].content);
    assert.equal(source.bytes, Buffer.byteLength(inputs[index].content, 'utf8'));
  }
  await assertBriefDataIntegrity(root, snapshot);
  await fs.appendFile(path.join(root, manifest.sources[0].path), 'changed');
  await assert.rejects(assertBriefDataIntegrity(root, snapshot), /changed/);
});

test('generated data must be validated before it becomes an immutable downstream input', async t => {
  const root = await temporary(t), prepared = await prepareBriefData(root, []);
  assert.equal(prepared.mode, 'synthetic');
  await assert.rejects(freezeSyntheticData(root, prepared), /ENOENT/);
  await writeData(root);
  assert.deepEqual(await validateSyntheticData(root), { recordCount: 2, scenarioCount: 3 });
  const frozen = await freezeSyntheticData(root, prepared);
  assert.ok(frozen.files.includes('data/synthetic-data.json'));
  await assertBriefDataIntegrity(root, frozen);
  await fs.appendFile(path.join(root, 'data/README.md'), 'Changed assumptions');
  await assert.rejects(assertBriefDataIntegrity(root, frozen), /changed/);
});

test('input copies use portable bounded filenames while preserving source names and contents', async t => {
  const root = await temporary(t);
  const inputs = [{ name: '記'.repeat(100) + '.csv', kind: 'file', content: 'message\nTASK: inspect pump\n' },
    { name: 'source:orders?.', kind: 'text', content: 'TASK: check valve\n' }];
  await prepareBriefData(root, inputs);
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'inputs/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.sources.map(source => source.name), inputs.map(input => input.name));
  assert.ok(Buffer.byteLength(path.basename(manifest.sources[0].path), 'utf8') <= 204);
  assert.equal(path.extname(manifest.sources[0].path), '.csv');
  assert.equal(path.basename(manifest.sources[1].path), '002-source_orders_');
  for (const [index, source] of manifest.sources.entries()) assert.equal(await fs.readFile(path.join(root, source.path), 'utf8'), inputs[index].content);
});

test('generated fixtures reject incomplete records, invalid schemas and absent scenario coverage', async t => {
  const root = await temporary(t);
  const invalid = [
    { classification: 'real' }, { useCase: '' }, { fields: [] },
    { fields: [{ name: 'message', type: 'unsupported', description: 'Message' }] },
    { fields: [syntheticDataFixture.fields[0], syntheticDataFixture.fields[0]] },
    { records: [] }, { records: [{}] }, { records: [{ message: 42 }] },
    { scenarios: syntheticDataFixture.scenarios.slice(0, 2) },
    { scenarios: syntheticDataFixture.scenarios.map(scenario => ({ ...scenario, input: [] })) },
    { scenarios: syntheticDataFixture.scenarios.map(scenario => ({ ...scenario, expectedBehavior: '' })) },
    { limitations: [] }, { limitations: [' '] }
  ];
  for (const change of invalid) {
    await writeData(root, { ...syntheticDataFixture, ...change });
    await assert.rejects(validateSyntheticData(root));
  }
  await writeData(root);
  await fs.writeFile(path.join(root, 'data/README.md'), ' \n ');
  await assert.rejects(validateSyntheticData(root), /blank/);
  await fs.writeFile(path.join(root, 'data/synthetic-data.json'), '{broken');
  await assert.rejects(validateSyntheticData(root), /valid JSON/);
});

test('synthetic files cannot use links or silently change the supplied-input manifest', async t => {
  const root = await temporary(t), prepared = await prepareBriefData(root, []);
  await writeData(root);
  const original = await fs.readFile(path.join(root, 'inputs/manifest.json'), 'utf8');
  await fs.appendFile(path.join(root, 'inputs/manifest.json'), '\nchanged');
  await assert.rejects(freezeSyntheticData(root, prepared), /changed/);
  await fs.writeFile(path.join(root, 'inputs/manifest.json'), original);
  if (process.platform === 'win32') {
    // A real outside file beneath a junction exercises the same ancestor guard
    // without requiring Windows file-symlink privileges.
    const outside = await temporary(t);
    await fs.rename(path.join(root, 'data'), path.join(outside, 'data'));
    await fs.symlink(path.join(outside, 'data'), path.join(root, 'data'), 'junction');
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'data/synthetic-data.json'), 'utf8')), syntheticDataFixture);
  } else {
    await fs.rename(path.join(root, 'data/synthetic-data.json'), path.join(root, 'copied-data.json'));
    await fs.symlink(path.join(root, 'copied-data.json'), path.join(root, 'data/synthetic-data.json'));
  }
  await assert.rejects(validateSyntheticData(root), /symbolic links/);
});
