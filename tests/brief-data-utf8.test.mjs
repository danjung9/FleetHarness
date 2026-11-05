import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareBriefData, validateSyntheticData, freezeSyntheticData, assertBriefDataIntegrity } from '../dist-electron/electron/brief-data.js';
import { syntheticDataFixture } from '../scripts/data-fixture.mjs';

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-brief-utf8-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

function replaceMarker(bytes, replacement) {
  const marker = Buffer.from('\ufffd'), index = bytes.indexOf(marker);
  assert.ok(index >= 0, 'Fixture must contain a literal replacement character.');
  return Buffer.concat([bytes.subarray(0, index), Buffer.from(replacement), bytes.subarray(index + marker.length)]);
}

async function writeSynthetic(root) {
  await fs.mkdir(path.join(root, 'data'));
  await fs.writeFile(path.join(root, 'data/synthetic-data.json'), JSON.stringify({ ...syntheticDataFixture, useCase: 'Preserve supplied text \ufffd.' }));
  await fs.writeFile(path.join(root, 'data/README.md'), '\ufeffSynthetic fixture: 日本語 🛠️ \ufffd\r\n');
}

test('valid Unicode, BOM and replacement characters retain the existing brief hash', async t => {
  const root = await temporary(t), content = '\ufeffvalue\r\nCafé 日本語 🛠️ \ufffd e\u0301\r\n';
  const snapshot = await prepareBriefData(root, [{ name: 'source-\ufffd.csv', kind: 'file', content }]);
  const expected = createHash('sha256');
  for (const file of [...snapshot.files].sort()) expected.update(file + '\0' + await fs.readFile(path.join(root, file), 'utf8') + '\0');
  assert.equal(snapshot.hash, expected.digest('hex'));
  assert.deepEqual(await fs.readFile(path.join(root, snapshot.files[1])), Buffer.from(content));
  await assertBriefDataIntegrity(root, snapshot);
  await fs.writeFile(path.join(root, snapshot.files[1]), content.normalize('NFC'));
  await assert.rejects(assertBriefDataIntegrity(root, snapshot), /changed/);
});

for (const target of ['supplied file', 'manifest']) {
  test(`frozen ${target} rejects raw bytes that decode to the same replacement character`, async t => {
    const root = await temporary(t);
    const snapshot = await prepareBriefData(root, [{ name: 'source-\ufffd.csv', kind: 'file', content: 'Preserved \ufffd value\n' }]);
    const file = path.join(root, snapshot.files[target === 'manifest' ? 0 : 1]);
    const original = await fs.readFile(file);
    for (const invalid of [[0x80], [0x81], [0xff], [0xe2, 0x82]]) {
      const changed = replaceMarker(original, invalid);
      assert.equal(changed.toString('utf8'), original.toString('utf8'), 'This mutation bypasses a lossy text hash.');
      await fs.writeFile(file, changed);
      await assert.rejects(assertBriefDataIntegrity(root, snapshot), /changed/);
    }
    await fs.writeFile(file, original);
    await assertBriefDataIntegrity(root, snapshot);
  });
}

for (const name of ['data/synthetic-data.json', 'data/README.md']) {
  test(`malformed UTF-8 in ${name} is rejected before validation and freezing`, async t => {
    const root = await temporary(t), prepared = await prepareBriefData(root, []);
    await writeSynthetic(root);
    const file = path.join(root, name), original = await fs.readFile(file);
    for (const invalid of [[0x80], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xe2, 0x82]]) {
      await fs.writeFile(file, replaceMarker(original, invalid));
      const diagnostic = error => {
        assert.match(error.message, /UTF-8/);
        assert.ok(error.message.includes(name));
        assert.ok(!error.message.includes('Preserve supplied text'));
        return true;
      };
      await assert.rejects(validateSyntheticData(root), diagnostic);
      await assert.rejects(freezeSyntheticData(root, prepared), diagnostic);
    }
    await fs.writeFile(file, original);
    assert.deepEqual(await validateSyntheticData(root), { recordCount: 2, scenarioCount: 3 });
    const frozen = await freezeSyntheticData(root, prepared);
    await assertBriefDataIntegrity(root, frozen);
  });

  test(`frozen ${name} rejects an alias-byte edit and accepts exact restoration`, async t => {
    const root = await temporary(t), prepared = await prepareBriefData(root, []);
    await writeSynthetic(root);
    const frozen = await freezeSyntheticData(root, prepared), file = path.join(root, name);
    const original = await fs.readFile(file), changed = replaceMarker(original, [0xff]);
    assert.equal(changed.toString('utf8'), original.toString('utf8'));
    await fs.writeFile(file, changed);
    await assert.rejects(assertBriefDataIntegrity(root, frozen), /changed/);
    await fs.writeFile(file, original);
    await assertBriefDataIntegrity(root, frozen);
  });
}
