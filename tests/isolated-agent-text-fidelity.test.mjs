import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createIsolatedAgentTools } from '../dist-electron/electron/isolated-agent-tools.js';

const sandbox = { skip: !['darwin', 'linux'].includes(process.platform), timeout: 30_000 };
const malformedBytes = [
  ['lone continuation', [0x80]],
  ['invalid leading byte', [0xff]],
  ['truncated two-byte character', [0xc2]],
  ['truncated three-byte character', [0xe2, 0x82]],
  ['overlong character', [0xc0, 0xaf]],
  ['encoded surrogate', [0xed, 0xa0, 0x80]],
  ['code point above Unicode maximum', [0xf4, 0x90, 0x80, 0x80]],
];

async function fixture(t) {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-text-fidelity-')));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const tools = new Map(createIsolatedAgentTools({ workspace, executable: process.execPath }).map(tool => [tool.name, tool]));
  return {
    workspace,
    call: (name, args) => tools.get(name).execute('text-fidelity-test', args),
    write: (filename, content) => fs.writeFile(path.join(workspace, filename), content),
    bytes: filename => fs.readFile(path.join(workspace, filename)),
  };
}

function invalidDocument(bytes) {
  return Buffer.concat([Buffer.from('before\nuntouched: '), Buffer.from(bytes), Buffer.from('\n')]);
}

async function unchangedRejection(f, filename, operation, pattern) {
  const before = await f.bytes(filename);
  // Observe completion even on the buggy implementation, then check the actual
  // bytes before asserting its error; no queued tool survives fixture cleanup.
  const outcome = await operation().then(value => ({ value }), error => ({ error }));
  assert.deepEqual(await f.bytes(filename), before, 'A rejected text operation must preserve every original byte');
  assert.ok(outcome.error instanceof Error, 'The text operation must reject');
  assert.match(outcome.error.message, pattern);
}

test('isolated text reads reject malformed UTF-8 instead of presenting replacement text', sandbox, async t => {
  const f = await fixture(t);
  for (const [name, bytes] of malformedBytes) await t.test(name, async () => {
    await f.write('source.txt', invalidDocument(bytes));
    await unchangedRejection(f, 'source.txt', () => f.call('read', { path: 'source.txt' }), /valid UTF-8/i);
  });
});

test('isolated targeted edits reject malformed UTF-8 without rewriting untouched bytes', sandbox, async t => {
  const f = await fixture(t);
  for (const [name, bytes] of malformedBytes) await t.test(name, async () => {
    await f.write('source.txt', invalidDocument(bytes));
    await unchangedRejection(f, 'source.txt', () => f.call('edit', {
      path: 'source.txt', edits: [{ oldText: 'before', newText: 'after' }],
    }), /valid UTF-8/i);
  });
});

test('isolated reads validate source bytes outside the requested page', sandbox, async t => {
  const f = await fixture(t);
  await f.write('source.txt', invalidDocument([0xff]));
  await unchangedRejection(f, 'source.txt', () => f.call('read', { path: 'source.txt', offset: 1, limit: 1 }), /valid UTF-8/i);
  await unchangedRejection(f, 'source.txt', () => f.call('read', { path: 'source.txt', offset: 4, limit: 1 }), /valid UTF-8/i);
});

test('isolated text tools preserve BOM, replacement characters, CRLF and non-BMP Unicode', sandbox, async t => {
  const f = await fixture(t), original = '\uFEFFbefore\r\n\uFFFD café € 漢字 😀 𐐷\r\n';
  const written = await f.call('write', { path: 'valid.txt', content: original });
  assert.equal(written.details.isolated, true);
  assert.deepEqual(await f.bytes('valid.txt'), Buffer.from(original));
  const read = await f.call('read', { path: 'valid.txt' });
  assert.equal(read.details.isolated, true);
  assert.equal(read.content[0].text, original);
  const replacement = '\uFFFD after 🛰️';
  const edited = await f.call('edit', { path: 'valid.txt', edits: [{ oldText: 'before', newText: replacement }] });
  assert.equal(edited.details.isolated, true);
  const expected = original.replace('before', replacement);
  assert.deepEqual(await f.bytes('valid.txt'), Buffer.from(expected));
  assert.equal((await f.call('read', { path: 'valid.txt' })).content[0].text, expected);
  await f.call('write', { path: 'empty.txt', content: '' });
  assert.equal((await f.call('read', { path: 'empty.txt' })).content[0].text, '');
});

test('isolated image reads still attach binary PNG bytes before text validation', sandbox, async t => {
  const f = await fixture(t);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZfIAAAAASUVORK5CYII=', 'base64');
  await f.write('pixel.png', png);
  const result = await f.call('read', { path: 'pixel.png' });
  assert.equal(result.details.isolated, true);
  assert.equal(result.details.image, true);
  assert.equal(result.content[1].type, 'image');
  assert.equal(result.content[1].mimeType, 'image/png');
  assert.deepEqual(Buffer.from(result.content[1].data, 'base64'), png);
  assert.deepEqual(await f.bytes('pixel.png'), png);
});

test('isolated text rejection leaves queued valid operations usable', sandbox, async t => {
  const f = await fixture(t), original = invalidDocument([0xff]);
  await f.write('invalid.txt', original);
  await f.write('valid.txt', 'before café 😀');
  const outcomes = await Promise.allSettled([
    f.call('read', { path: 'invalid.txt' }),
    f.call('edit', { path: 'invalid.txt', edits: [{ oldText: 'before', newText: 'after' }] }),
    f.call('edit', { path: 'valid.txt', edits: [{ oldText: 'before', newText: 'after' }] }),
    f.call('read', { path: 'valid.txt' }),
  ]);
  assert.deepEqual(await f.bytes('invalid.txt'), original);
  for (const outcome of outcomes.slice(0, 2)) {
    assert.equal(outcome.status, 'rejected');
    assert.match(outcome.reason.message, /valid UTF-8/i);
  }
  assert.equal(outcomes[2].status, 'fulfilled');
  assert.equal(outcomes[3].status, 'fulfilled');
  assert.equal(outcomes[3].value.content[0].text, 'after café 😀');
  assert.deepEqual(await f.bytes('valid.txt'), Buffer.from('after café 😀'));
});

// JavaScript strings can contain lone surrogates even though JSON transport is
// valid UTF-8. This is a separate boundary from malformed source-file bytes.
test('isolated writes and edit replacements reject unpaired Unicode surrogates', sandbox, async t => {
  const f = await fixture(t);
  for (const [name, invalid] of [['high surrogate', '\ud83d'], ['low surrogate', '\ude00']]) {
    for (const operation of ['write', 'edit']) await t.test(`${operation}: ${name}`, async () => {
      await f.write('valid.txt', 'before café 😀');
      const args = operation === 'write'
        ? { path: 'valid.txt', content: `after ${invalid}` }
        : { path: 'valid.txt', edits: [{ oldText: 'before', newText: `after ${invalid}` }] };
      await unchangedRejection(f, 'valid.txt', () => f.call(operation, args), /well-formed Unicode/i);
    });
  }
  await t.test('invalid content does not create a file or parent directories', async () => {
    const outcome = await f.call('write', { path: 'new-invalid-content/nested/file.txt', content: 'after \ud83d' })
      .then(value => ({ value }), error => ({ error }));
    await assert.rejects(fs.stat(path.join(f.workspace, 'new-invalid-content')), { code: 'ENOENT' });
    assert.ok(outcome.error instanceof Error);
    assert.match(outcome.error.message, /well-formed Unicode/i);
  });
});

test('isolated edit matching rejects a lone surrogate that would split a valid character', sandbox, async t => {
  const f = await fixture(t);
  for (const [name, oldText] of [['high surrogate', '\ud83d'], ['low surrogate', '\ude00']]) await t.test(name, async () => {
    await f.write('valid.txt', 'before 😀 after');
    await unchangedRejection(f, 'valid.txt', () => f.call('edit', {
      path: 'valid.txt', edits: [{ oldText, newText: '' }],
    }), /well-formed Unicode/i);
  });
});

test('isolated paths reject lone surrogates before accessing a replacement-character filename', sandbox, async t => {
  const f = await fixture(t);
  for (const operation of ['read', 'write', 'edit']) await t.test(operation, async () => {
    const filename = `${operation}-\uFFFD.txt`, invalidPath = `${operation}-\ud83d.txt`;
    await f.write(filename, 'before café 😀');
    const args = operation === 'write' ? { path: invalidPath, content: 'after' }
      : operation === 'edit' ? { path: invalidPath, edits: [{ oldText: 'before', newText: 'after' }] }
      : { path: invalidPath };
    await unchangedRejection(f, filename, () => f.call(operation, args), /well-formed Unicode/i);
  });
  await t.test('new file is not created under an encoded alias', async () => {
    const outcome = await f.call('write', { path: 'new-\ude00.txt', content: 'after' })
      .then(value => ({ value }), error => ({ error }));
    await assert.rejects(f.bytes('new-\uFFFD.txt'), { code: 'ENOENT' });
    assert.ok(outcome.error instanceof Error);
    assert.match(outcome.error.message, /well-formed Unicode/i);
  });
});
