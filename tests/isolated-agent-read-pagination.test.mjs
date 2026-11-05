import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createIsolatedAgentTools } from '../dist-electron/electron/isolated-agent-tools.js';

const sandbox = { skip: !['darwin', 'linux'].includes(process.platform), timeout: 30_000 };
const MAX_TEXT_BYTES = 50_000;
const continuation = offset => `\n[Truncated; continue at line ${offset}.]`;
const digest = text => createHash('sha256').update(text).digest('hex');

async function fixture(t) {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-read-pagination-')));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const tools = new Map(createIsolatedAgentTools({ workspace, executable: process.execPath }).map(tool => [tool.name, tool]));
  return {
    workspace,
    call: (name, args) => tools.get(name).execute('read-pagination-test', args),
    write: (filename, content) => fs.writeFile(path.join(workspace, filename), content),
  };
}

function boundedText(result) {
  assert.equal(result.content[0].type, 'text');
  assert.equal(result.details.isolated, true);
  const text = result.content[0].text;
  assert.ok(Buffer.byteLength(text, 'utf8') <= MAX_TEXT_BYTES, 'The complete text, including its continuation notice, must fit the byte limit');
  assert.ok(!text.includes('\uFFFD'), 'Valid UTF-8 must not acquire replacement characters');
  assert.equal(text, Buffer.from(text, 'utf8').toString('utf8'), 'Text must not contain a lone surrogate');
  return text;
}

function sameText(actual, expected) {
  assert.equal(Buffer.byteLength(actual), Buffer.byteLength(expected), 'UTF-8 byte count must be preserved');
  assert.equal(digest(actual), digest(expected), 'Every UTF-8 byte must be preserved');
}

async function oversized(operation, line, bytes) {
  let message;
  await assert.rejects(operation, error => {
    assert.ok(error instanceof Error);
    message = error.message;
    assert.match(message, new RegExp(`\\bLine ${line}\\b`));
    assert.match(message, new RegExp(`\\b${bytes} UTF-8 bytes\\b`));
    assert.match(message, /cannot fit.*50000-byte.*limit/i);
    assert.match(message, /bash.*bounded.*slice/i);
    assert.match(message, /JSON fields/i);
    assert.match(message, /reducing.*line limit.*cannot split.*line/i);
    assert.ok(Buffer.byteLength(message) <= MAX_TEXT_BYTES);
    return true;
  });
  return message;
}

function shellQuote(value) {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}

test('isolated reads preserve ordinary line pagination, blank lines, and EOF', sandbox, async t => {
  const f = await fixture(t);
  await f.write('ordinary.txt', 'first\r\n\nthird\n');
  const first = await f.call('read', { path: 'ordinary.txt', limit: 2 });
  assert.equal(boundedText(first), 'first\r\n' + continuation(3));
  assert.equal(first.details.totalLines, 4);
  assert.equal(first.details.nextOffset, 3);
  assert.equal(first.details.truncated, true);
  const last = await f.call('read', { path: 'ordinary.txt', offset: first.details.nextOffset });
  assert.equal(boundedText(last), 'third\n');
  assert.equal(last.details.truncated, false);
  assert.equal(last.details.nextOffset, undefined);
  const eof = await f.call('read', { path: 'ordinary.txt', offset: 5 });
  assert.equal(boundedText(eof), '');
  assert.equal(eof.details.totalLines, 4);
  assert.equal(eof.details.truncated, false);
  assert.equal(eof.details.nextOffset, undefined);
  await f.write('empty.txt', '');
  const empty = await f.call('read', { path: 'empty.txt' });
  assert.equal(boundedText(empty), '');
  assert.equal(empty.details.totalLines, 1);
  assert.equal(empty.details.truncated, false);
});

test('isolated reads retain positive integer offset and bounded line-limit validation', sandbox, async t => {
  const f = await fixture(t);
  await f.write('valid.txt', 'still readable');
  for (const args of [{ offset: 0 }, { offset: -1 }, { offset: 1.5 }, { offset: '1' },
    { offset: Number.MAX_SAFE_INTEGER + 1 }, { limit: 0 }, { limit: 2001 }, { limit: 1.5 }]) {
    await assert.rejects(f.call('read', { path: 'valid.txt', ...args }), /positive line offset.*limit between 1 and 2000/i);
  }
  assert.equal(boundedText(await f.call('read', { path: 'valid.txt' })), 'still readable');
});

test('complete files fit exactly 50000 UTF-8 bytes without a phantom separator or notice', sandbox, async t => {
  const f = await fixture(t);
  const contents = [
    'a'.repeat(MAX_TEXT_BYTES),
    'é'.repeat(MAX_TEXT_BYTES / 2),
    '😀'.repeat(MAX_TEXT_BYTES / 4),
    'a'.repeat(24_999) + '\n' + 'b'.repeat(25_000),
    'a'.repeat(MAX_TEXT_BYTES - 1) + '\n',
  ];
  for (const [index, content] of contents.entries()) {
    const filename = `exact-${index}.txt`;
    assert.equal(Buffer.byteLength(content), MAX_TEXT_BYTES);
    await f.write(filename, content);
    const result = await f.call('read', { path: filename });
    sameText(boundedText(result), content);
    assert.equal(result.details.totalLines, content.split('\n').length);
    assert.equal(result.details.truncated, false);
    assert.equal(result.details.nextOffset, undefined);
  }
});

test('oversized ASCII and Unicode first lines fail actionably instead of repeating their offset', sandbox, async t => {
  const f = await fixture(t);
  const lines = ['a'.repeat(50_001), 'a'.repeat(65_000), 'é'.repeat(25_001), '€'.repeat(16_667), '😀'.repeat(12_501)];
  for (const [index, line] of lines.entries()) {
    const filename = `oversized-${index}.txt`;
    await f.write(filename, line);
    await oversized(f.call('read', { path: filename }), 1, Buffer.byteLength(line));
  }
});

test('a line-limited page reserves the exact continuation notice within its byte budget', sandbox, async t => {
  const f = await fixture(t);
  const firstLine = 'a'.repeat(MAX_TEXT_BYTES - Buffer.byteLength(continuation(2)));
  await f.write('boundary.txt', firstLine + '\ntail');
  const first = await f.call('read', { path: 'boundary.txt', limit: 1 });
  const text = boundedText(first);
  assert.equal(Buffer.byteLength(text), MAX_TEXT_BYTES);
  sameText(text, firstLine + continuation(2));
  assert.equal(first.details.nextOffset, 2);
  assert.equal(first.details.truncated, true);
  const last = await f.call('read', { path: 'boundary.txt', offset: first.details.nextOffset });
  assert.equal(boundedText(last), 'tail');
  assert.equal(last.details.truncated, false);
});

test('a line that cannot coexist with its required notice fails even below the raw byte cap', sandbox, async t => {
  const f = await fixture(t);
  const firstLine = 'a'.repeat(MAX_TEXT_BYTES - Buffer.byteLength(continuation(2)) + 1);
  const content = firstLine + '\ntail';
  await f.write('notice-overflow.txt', content);
  await oversized(f.call('read', { path: 'notice-overflow.txt', limit: 1 }), 1, Buffer.byteLength(firstLine));
  // Both lines together fit: no notice is needed when the full file is returned.
  const whole = await f.call('read', { path: 'notice-overflow.txt' });
  sameText(boundedText(whole), content);
  assert.equal(whole.details.truncated, false);
  await f.write('raw-boundary.txt', 'a'.repeat(49_999) + '\nx');
  await oversized(f.call('read', { path: 'raw-boundary.txt' }), 1, 49_999);
});

test('byte-bounded pages advance and reconstruct all ordinary Unicode lines exactly', sandbox, async t => {
  const f = await fixture(t);
  const lines = Array.from({ length: 120 }, (_, index) => `${index}: ` + 'é€😀漢'.repeat(90));
  await f.write('pages.txt', lines.join('\n'));
  const recovered = [];
  let offset = 1, pages = 0;
  for (;;) {
    assert.ok(++pages <= lines.length, 'Pagination must terminate without revisiting an offset');
    const result = await f.call('read', { path: 'pages.txt', offset });
    let text = boundedText(result);
    assert.equal(result.details.totalLines, lines.length);
    if (result.details.truncated) {
      const next = result.details.nextOffset;
      assert.ok(Number.isSafeInteger(next) && next > offset, 'Every successful truncated page must advance');
      const notice = continuation(next);
      assert.ok(text.endsWith(notice));
      text = text.slice(0, -notice.length);
      const selected = text.split('\n');
      assert.equal(selected.length, next - offset);
      recovered.push(...selected);
      offset = next;
    } else {
      assert.equal(result.details.nextOffset, undefined);
      recovered.push(...text.split('\n'));
      break;
    }
  }
  assert.ok(pages > 1, 'Fixture must exercise byte pagination');
  sameText(recovered.join('\n'), lines.join('\n'));
});

test('default pagination still stops at 2000 complete lines and reads the remainder', sandbox, async t => {
  const f = await fixture(t);
  const lines = Array.from({ length: 2002 }, (_, index) => `row ${index + 1}`);
  await f.write('many-lines.txt', lines.join('\n'));
  const first = await f.call('read', { path: 'many-lines.txt' });
  sameText(boundedText(first), lines.slice(0, 2000).join('\n') + continuation(2001));
  assert.equal(first.details.nextOffset, 2001);
  assert.equal(first.details.truncated, true);
  const last = await f.call('read', { path: 'many-lines.txt', offset: first.details.nextOffset });
  assert.equal(boundedText(last), 'row 2001\nrow 2002');
  assert.equal(last.details.truncated, false);
});

test('a complete prefix advances to an oversized middle line without skipping it', sandbox, async t => {
  const f = await fixture(t);
  const longLine = '😀'.repeat(15_000);
  await f.write('middle.txt', 'header\n' + longLine + '\ntail');
  const first = await f.call('read', { path: 'middle.txt' });
  assert.equal(boundedText(first), 'header' + continuation(2));
  assert.equal(first.details.nextOffset, 2);
  assert.equal(first.details.truncated, true);
  await oversized(f.call('read', { path: 'middle.txt', offset: first.details.nextOffset }), 2, Buffer.byteLength(longLine));
  assert.equal(boundedText(await f.call('read', { path: 'middle.txt', offset: 3 })), 'tail');
});

test('an oversized read rejection leaves an already queued read usable', sandbox, async t => {
  const f = await fixture(t);
  await f.write('oversized.txt', 'x'.repeat(60_000));
  await f.write('next.txt', 'queue preserved café 😀');
  const rejected = oversized(f.call('read', { path: 'oversized.txt' }), 1, 60_000);
  const next = f.call('read', { path: 'next.txt' });
  // Drain both operations even when testing a version that incorrectly succeeds.
  await Promise.allSettled([rejected, next]);
  await rejected;
  assert.equal(boundedText(await next), 'queue preserved café 😀');
});

test('bounded sandbox bash can inspect compact JSON fields after actionable read failure', sandbox, async t => {
  const f = await fixture(t);
  const filename = "report '$(touch INJECTED)' `touch INJECTED_TOO` 雪.json";
  const selected = { status: 'ready café 😀', total: 3 };
  const content = JSON.stringify({ ...selected, payload: 'x'.repeat(65_000) });
  await f.write(filename, content);
  const message = await oversized(f.call('read', { path: filename }), 1, Buffer.byteLength(content));
  assert.ok(!message.includes(filename), 'Failure guidance must not embed a user-controlled path');
  assert.ok(!message.includes('$(touch') && !message.includes('`touch'), 'Failure guidance must not embed shell syntax from a filename');
  assert.ok(!/node\s+(?:-e|--eval)|sed -n/.test(message), 'Failure guidance should not generate a shell command');
  await f.write('inspect-json.cjs', `const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
process.stdout.write(JSON.stringify({status: data.status, total: data.total}));
`);
  // Shell text also includes stderr (including native Electron diagnostics).
  // Inspect the bounded stdout artifact so those diagnostics remain separate.
  await f.call('bash', { command: `node ${shellQuote('inspect-json.cjs')} ${shellQuote(filename)} > selected.json` });
  const result = await f.call('read', { path: 'selected.json' });
  assert.deepEqual(JSON.parse(boundedText(result)), selected);
  for (const marker of ['INJECTED', 'INJECTED_TOO']) await assert.rejects(fs.stat(path.join(f.workspace, marker)), { code: 'ENOENT' });
  sameText(await fs.readFile(path.join(f.workspace, filename), 'utf8'), content);
});

test('bounded sandbox bash Unicode slices reconstruct a whole oversized line without splitting code points', sandbox, async t => {
  const f = await fixture(t);
  const filename = "text 'quoted' $data `literal` 雪.txt";
  const content = 'é€😀漢'.repeat(7500);
  await f.write(filename, content);
  await oversized(f.call('read', { path: filename }), 1, Buffer.byteLength(content));
  await f.write('slice-text.cjs', `const fs = require('node:fs');
const points = Array.from(fs.readFileSync(process.argv[2], 'utf8'));
const start = Number(process.argv[3]), length = Number(process.argv[4]);
process.stdout.write(points.slice(start, start + length).join(''));
`);
  const chunks = [];
  for (const start of [0, 12_000, 24_000]) {
    const command = `node ${shellQuote('slice-text.cjs')} ${shellQuote(filename)} ${start} 12000 > slice.txt`;
    await f.call('bash', { command });
    const result = await f.call('read', { path: 'slice.txt' });
    const chunk = boundedText(result);
    assert.ok(chunk.length > 0);
    chunks.push(chunk);
  }
  sameText(chunks.join(''), content);
  sameText(await fs.readFile(path.join(f.workspace, filename), 'utf8'), content);
});
