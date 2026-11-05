import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createIsolatedAgentTools } from '../dist-electron/electron/isolated-agent-tools.js';

const MAX = 2_000_000;
const sandbox = { skip: !['darwin', 'linux'].includes(process.platform), timeout: 30_000 };
const digest = text => createHash('sha256').update(text).digest('hex');
function sameText(actual, expected) {
  assert.equal(Buffer.byteLength(actual), Buffer.byteLength(expected), 'UTF-8 byte length must be preserved');
  assert.equal(digest(actual), digest(expected), 'Every UTF-8 byte must be preserved');
}
async function fixture(t) {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-tool-unicode-')));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const tools = createIsolatedAgentTools({ workspace, executable: process.execPath });
  return { workspace, call: (name, args) => tools.find(tool => tool.name === name).execute('unicode-test', args) };
}

test('isolated write and read preserve a large mixed Unicode document', sandbox, async t => {
  const f = await fixture(t);
  const lines = Array.from({ length: 15_000 }, (_, index) => `${index}: café € 😀 漢字`);
  const content = lines.join('\n');
  const result = await f.call('write', { path: 'document.txt', content });
  assert.equal(result.details.bytes, Buffer.byteLength(content));
  sameText(await fs.readFile(path.join(f.workspace, 'document.txt'), 'utf8'), content);
  for (const offset of [1, 7_500, 15_000]) {
    const read = await f.call('read', { path: 'document.txt', offset, limit: 1 });
    assert.equal(read.content[0].text.split('\n')[0], lines[offset - 1]);
    assert.equal(read.details.totalLines, lines.length);
    assert.equal(read.details.truncated, offset < lines.length);
  }
});

test('isolated edit preserves a large mixed Unicode replacement', sandbox, async t => {
  const f = await fixture(t), newText = 'é€😀漢'.repeat(18_000);
  await fs.writeFile(path.join(f.workspace, 'document.txt'), 'before replace-me after');
  await f.call('edit', { path: 'document.txt', edits: [{ oldText: 'replace-me', newText }] });
  sameText(await fs.readFile(path.join(f.workspace, 'document.txt'), 'utf8'), 'before ' + newText + ' after');
});

test('isolated edit matches a large original Unicode span exactly', sandbox, async t => {
  const f = await fixture(t), oldText = 'é€😀漢'.repeat(18_000);
  await fs.writeFile(path.join(f.workspace, 'document.txt'), 'before ' + oldText + ' after');
  await f.call('edit', { path: 'document.txt', edits: [{ oldText, newText: 'café € 😀' }] });
  assert.equal(await fs.readFile(path.join(f.workspace, 'document.txt'), 'utf8'), 'before café € 😀 after');
});

function sizedWrite(size, filename = 'document.txt') {
  const input = { operation: 'write', args: { path: filename, content: '€' } };
  input.args.content += 'x'.repeat(size - Buffer.byteLength(JSON.stringify(input)));
  const bytes = Buffer.from(JSON.stringify(input));
  assert.equal(bytes.length, size);
  return { input, bytes };
}

test('isolated tool API accepts an exact 2 MB UTF-8 JSON envelope', sandbox, async t => {
  const f = await fixture(t), { input } = sizedWrite(MAX);
  await f.call('write', input.args);
  sameText(await fs.readFile(path.join(f.workspace, 'document.txt'), 'utf8'), input.args.content);
});

test('isolated tool API rejects one excess byte before mutation and keeps its queue usable', sandbox, async t => {
  const f = await fixture(t), { input } = sizedWrite(MAX + 1);
  await fs.writeFile(path.join(f.workspace, 'document.txt'), 'preserve café 😀');
  const rejected = f.call('write', input.args);
  const next = f.call('read', { path: 'document.txt' });
  await assert.rejects(rejected, /input exceeds its byte limit/i);
  assert.equal((await next).content[0].text, 'preserve café 😀');
  assert.equal(await fs.readFile(path.join(f.workspace, 'document.txt'), 'utf8'), 'preserve café 😀');
});

// Exercise the actual generated worker, without exporting a test-only API or
// duplicating its decoder. IPC observes consumption of unchanged stdin bytes;
// acknowledgements guarantee split code points without sleeps or pipe-size assumptions.
const compiled = await fs.readFile(new URL('../dist-electron/electron/isolated-agent-tools.js', import.meta.url), 'utf8');
const worker = /const worker = String\.raw\s*`([\s\S]*?)\n`;/.exec(compiled)?.[1];
assert.ok(worker, 'The generated isolated tool worker must be present');
const observeChunks = `
const iterator = process.stdin[Symbol.asyncIterator];
process.stdin[Symbol.asyncIterator] = async function* () {
  for await (const chunk of iterator.call(this)) {
    yield chunk;
    process.send?.({type:'consumed',bytes:chunk.length});
  }
};
process.send?.({type:'ready'}); process.channel?.unref();
`;

async function startWorker(t, workspace) {
  const child = spawn(process.execPath, ['--no-global-search-paths', '-e', observeChunks + worker],
    { cwd: workspace, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
  const stdout = [], stderr = [];
  let consumed = 0, ready = false, closed = false, wake;
  child.stdout.on('data', chunk => stdout.push(chunk));
  child.stderr.on('data', chunk => stderr.push(chunk));
  child.stdin.on('error', () => {});
  child.on('message', message => {
    if (message.type === 'ready') ready = true;
    if (message.type === 'consumed') consumed += message.bytes;
    wake?.();
  });
  const done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', code => {
      closed = true; wake?.();
      resolve({ code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') });
    });
  });
  void done.catch(() => {});
  t.after(async () => { if (!closed) child.kill('SIGKILL'); await done; });
  async function until(predicate) {
    const timeout = AbortSignal.timeout(10_000);
    while (!predicate()) {
      if (closed) throw new Error('Worker exited before observation: ' + Buffer.concat(stderr).toString('utf8'));
      await new Promise((resolve, reject) => {
        const aborted = () => { wake = undefined; reject(new Error('Worker observation timed out')); };
        wake = () => { timeout.removeEventListener('abort', aborted); wake = undefined; resolve(); };
        if (timeout.aborted) aborted(); else timeout.addEventListener('abort', aborted, { once: true });
      });
    }
  }
  await until(() => ready);
  return {
    done,
    async send(parts) {
      let expected = 0;
      for (const part of parts.slice(0, -1)) {
        expected += part.length;
        child.stdin.write(part);
        await until(() => consumed >= expected);
      }
      child.stdin.end(parts.at(-1));
    },
  };
}
function splitCharacter(bytes, character) {
  const point = Buffer.from(character), offset = bytes.indexOf(point);
  assert.ok(offset >= 0);
  return [bytes.subarray(0, offset + 1),
    ...Array.from({ length: point.length - 2 }, (_, index) => bytes.subarray(offset + index + 1, offset + index + 2)),
    bytes.subarray(offset + point.length - 1)];
}

for (const character of ['é', '€', '😀']) {
  test(`isolated worker write preserves a deterministically split ${Buffer.byteLength(character)}-byte character`, { timeout: 15_000 }, async t => {
    const f = await fixture(t), content = 'before ' + character + ' after', child = await startWorker(t, f.workspace);
    const bytes = Buffer.from(JSON.stringify({ operation: 'write', args: { path: 'document.txt', content } }));
    await child.send(splitCharacter(bytes, character));
    const result = await child.done;
    assert.equal(result.code, 0, result.stderr);
    assert.equal(await fs.readFile(path.join(f.workspace, 'document.txt'), 'utf8'), content);
  });
}

for (const field of ['oldText', 'newText']) {
  test(`isolated worker edit preserves split Unicode in ${field}`, { timeout: 15_000 }, async t => {
    const f = await fixture(t), oldText = field === 'oldText' ? 'old € value' : 'old value';
    const newText = field === 'newText' ? 'new 😀 value' : 'new value';
    await fs.writeFile(path.join(f.workspace, 'document.txt'), 'before ' + oldText + ' after');
    const child = await startWorker(t, f.workspace);
    const bytes = Buffer.from(JSON.stringify({ operation: 'edit', args: { path: 'document.txt', edits: [{ oldText, newText }] } }));
    await child.send(splitCharacter(bytes, field === 'oldText' ? '€' : '😀'));
    const result = await child.done;
    assert.equal(result.code, 0, result.stderr);
    assert.equal(await fs.readFile(path.join(f.workspace, 'document.txt'), 'utf8'), 'before ' + newText + ' after');
  });
}

test('isolated worker read preserves a split Unicode filename', { timeout: 15_000 }, async t => {
  const f = await fixture(t), child = await startWorker(t, f.workspace);
  await fs.writeFile(path.join(f.workspace, 'café.txt'), 'café € 😀');
  const bytes = Buffer.from(JSON.stringify({ operation: 'read', args: { path: 'café.txt' } }));
  await child.send(splitCharacter(bytes, 'é'));
  const result = await child.done;
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).content[0].text, 'café € 😀');
});

test('isolated worker accepts exactly 2 MB of raw bytes with a split code point', { timeout: 15_000 }, async t => {
  const f = await fixture(t), child = await startWorker(t, f.workspace), { input, bytes } = sizedWrite(MAX);
  await child.send(splitCharacter(bytes, '€'));
  const result = await child.done;
  assert.equal(result.code, 0, result.stderr);
  sameText(await fs.readFile(path.join(f.workspace, 'document.txt'), 'utf8'), input.args.content);
});

test('isolated worker rejects one excess raw byte before modifying the target', { timeout: 15_000 }, async t => {
  const f = await fixture(t), child = await startWorker(t, f.workspace), { bytes } = sizedWrite(MAX + 1);
  await fs.writeFile(path.join(f.workspace, 'document.txt'), 'preserve café 😀');
  await child.send(splitCharacter(bytes, '€'));
  const result = await child.done;
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Tool input exceeds 2 MB/);
  assert.equal(await fs.readFile(path.join(f.workspace, 'document.txt'), 'utf8'), 'preserve café 😀');
});

test('isolated worker rejects malformed JSON before creating a file', { timeout: 15_000 }, async t => {
  const f = await fixture(t), child = await startWorker(t, f.workspace);
  await child.send([Buffer.from('{"operation":"write","args":{"path":"document.txt","content":')]);
  const result = await child.done;
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /JSON|Unexpected/);
  await assert.rejects(fs.stat(path.join(f.workspace, 'document.txt')), { code: 'ENOENT' });
});
