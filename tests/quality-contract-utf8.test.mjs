import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { isUtf8 } from 'node:buffer';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { qualityFixture } from '../scripts/quality-fixture.mjs';
import { loadQualityContract, assertQualityContract, sealEvaluationPlan, restoreEvaluationPlan, verifyApplication } from '../dist-electron/electron/quality.js';

const acceptance = [{ id: 'R1', requirement: 'Compute totals for arbitrary input lists.', method: 'automated', scenario: 'Compare independently calculated totals.' }];
const unicode = 'Café 東京 🧪 e\u0301 \uFFFD';
const replacement = Buffer.from('\uFFFD');
const legacyNames = ['acceptance-plan.json', 'ux-spec.json'];
const modernNames = [...legacyNames, 'solution-contract.json', 'evaluation-plan.json'];

function fixture(modern) {
  const files = qualityFixture(['R1']);
  const ux = JSON.parse(files['ux-spec.json']);
  ux.primaryTask += ' ' + unicode;
  files['ux-spec.json'] = JSON.stringify(ux, null, 2);
  if (modern) {
    files['acceptance-plan.json'] = JSON.stringify({ schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented',
      expectedOutcome: 'Totals match independent examples. ' + unicode, journeyIds: [], capabilityIds: ['total'] }], journeys: [] }, null, 2);
    files['solution-contract.json'] = JSON.stringify({ schemaVersion: 1, objective: 'Calculate totals reliably. ' + unicode,
      capabilities: [{ id: 'total', kind: 'algorithm', description: 'Sum supplied numeric values.', required: true, criterionIds: ['R1'], evaluationIds: ['reference'] }],
      runtime: { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } }, null, 2);
    files['evaluation-plan.json'] = JSON.stringify({ schemaVersion: 1, evaluations: [{ id: 'reference', capabilityId: 'total', description: 'Independent sums. ' + unicode,
      dataset: { name: 'Arithmetic reference', version: '1', provenance: 'reviewed' }, evaluator: 'numeric', threshold: 1, trials: 1,
      cases: [{ id: 'short', input: { values: [2, 3] }, expected: { total: 5 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }] }] }, null, 2);
  } else {
    const plan = JSON.parse(files['acceptance-plan.json']);
    plan.criteria[0].expectedOutcome += ' ' + unicode;
    files['acceptance-plan.json'] = JSON.stringify(plan, null, 2);
  }
  return Object.fromEntries(Object.entries(files).map(([name, body]) => [name, body.replaceAll('\n', '\r\n') + '\r\n']));
}

async function directory(t, prefix) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

async function workspace(t, modern) {
  const root = await directory(t, 'fleet-quality-contract-utf8-'), files = fixture(modern);
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(root, name), body);
  return { root, files, names: modern ? modernNames : legacyNames };
}

function corrupt(body, malformed = [0xff]) {
  const bytes = Buffer.from(body), position = bytes.indexOf(replacement);
  assert.notEqual(position, -1, 'Fixture contains a literal replacement character.');
  const changed = Buffer.concat([bytes.subarray(0, position), Buffer.from(malformed), bytes.subarray(position + replacement.length)]);
  assert.equal(isUtf8(changed), false);
  return changed;
}

for (const modern of [false, true]) {
  const kind = modern ? 'modern' : 'legacy';
  test(`${kind} quality contract rejects malformed UTF-8 in every file before freeze`, async t => {
    const { root, files, names } = await workspace(t, modern);
    for (const name of names) await t.test(name, async () => {
      await fs.writeFile(path.join(root, name), corrupt(files[name]));
      try { await assert.rejects(loadQualityContract(root, acceptance, modern), /UTF-8/i); }
      finally { await fs.writeFile(path.join(root, name), files[name]); }
    });
  });
}

test('quality contract rejects malformed UTF-8 encodings even when lossy decoding produces valid JSON', async t => {
  const { root, files } = await workspace(t, true), name = 'ux-spec.json';
  const malformed = [
    ['isolated continuation', [0x80]],
    ['overlong encoding', [0xc0, 0xaf]],
    ['truncated multibyte sequence', [0xe2, 0x82]],
    ['UTF-16 surrogate', [0xed, 0xa0, 0x80]],
    ['outside Unicode range', [0xf4, 0x90, 0x80, 0x80]]
  ];
  for (const [label, bytes] of malformed) await t.test(label, async () => {
    const changed = corrupt(files[name], bytes);
    assert.doesNotThrow(() => JSON.parse(changed.toString('utf8')));
    await fs.writeFile(path.join(root, name), changed);
    await assert.rejects(loadQualityContract(root, acceptance, true), /UTF-8/i);
  });
});

for (const [kind, modern, sealed] of [['legacy', false, false], ['modern', true, false], ['sealed modern', true, true]]) {
  test(`${kind} frozen quality contract rejects changed bytes that decode to the same text`, async t => {
    const { root, files, names } = await workspace(t, modern);
    const contract = await loadQualityContract(root, acceptance, modern);
    if (sealed) await sealEvaluationPlan(root, contract, path.join(await directory(t, 'fleet-quality-utf8-keys-'), 'evaluation-plan.json'));
    for (const name of names.filter(name => !sealed || name !== 'evaluation-plan.json')) await t.test(name, async () => {
      const changed = corrupt(files[name]);
      assert.equal(changed.toString('utf8'), files[name], 'Lossy decoding used to hide this byte mutation.');
      await fs.writeFile(path.join(root, name), changed);
      try { await assert.rejects(assertQualityContract(root, contract), /UTF-8/i); }
      finally { await fs.writeFile(path.join(root, name), files[name]); }
      await assertQualityContract(root, contract);
    });
  });
}

test('malformed frozen quality contracts fail verification before application execution', async t => {
  const { root, files } = await workspace(t, true);
  const contract = await loadQualityContract(root, acceptance, true), calls = [];
  await fs.writeFile(path.join(root, 'evaluation-plan.json'), corrupt(files['evaluation-plan.json']));
  await assert.rejects(verifyApplication(root, process.execPath, contract, undefined, {
    prepareRuntime: async () => { calls.push('prepareRuntime'); throw new Error('Application execution must not start.'); },
    verifyTests: async () => { calls.push('verifyTests'); throw new Error('Application tests must not start.'); }
  }), /UTF-8/i);
  assert.deepEqual(calls, []);
});

for (const modern of [false, true]) {
  test(`${modern ? 'modern' : 'legacy'} valid Unicode preserves existing frozen hashes and exact original bytes`, async t => {
    const { root, files, names } = await workspace(t, modern);
    const expectedHash = createHash('sha256').update(names.map(name => name + '\0' + files[name]).join('\0')).digest('hex');
    const contract = await loadQualityContract(root, acceptance, modern);
    assert.equal(contract.hash, expectedHash);
    assert.ok(contract.ux.primaryTask.endsWith(unicode));
    await assertQualityContract(root, contract);
    if (modern) {
      const keys = path.join(await directory(t, 'fleet-quality-valid-keys-'), 'evaluation-plan.json');
      await sealEvaluationPlan(root, contract, keys);
      assert.equal(contract.hash, expectedHash);
      assert.deepEqual(await fs.readFile(keys), Buffer.from(files['evaluation-plan.json']));
      await assert.rejects(fs.access(path.join(root, 'evaluation-plan.json')), { code: 'ENOENT' });
      await assertQualityContract(root, contract);
      await restoreEvaluationPlan(root, contract);
      assert.equal(contract.hash, expectedHash);
      assert.equal(contract.sealedEvaluation, false);
    }
    for (const name of names) assert.deepEqual(await fs.readFile(path.join(root, name)), Buffer.from(files[name]));
    await assertQualityContract(root, contract);
  });
}

test('quality JSON loading preserves existing rejection of a leading UTF-8 BOM', async t => {
  const { root, files } = await workspace(t, true);
  await fs.writeFile(path.join(root, 'ux-spec.json'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(files['ux-spec.json'])]));
  await assert.rejects(loadQualityContract(root, acceptance, true), SyntaxError);
});
