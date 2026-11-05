import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';

const adapter = path.resolve(process.env.FLEET_TEST_RUNTIME_ADAPTER ?? 'templates/runtime-broker/node.mjs');
const MAX = 2_000_000;
// Observe actual consumed stream chunks, without replacing their bytes or decoding.
// Acknowledgements make split code points deterministic without sleeps or packet assumptions.
const application = `import { IncomingMessage } from 'node:http';
const acknowledge = chunk => process.send?.({type:'chunk',bytes:chunk.length});
for (const target of [process.stdin, IncomingMessage.prototype]) {
  const iterator = target[Symbol.asyncIterator];
  target[Symbol.asyncIterator] = async function* () {
    for await (const chunk of iterator.call(this)) { yield chunk; acknowledge(chunk); }
  };
}
const on = process.stdin.on;
process.stdin.on = function(event, listener) {
  return on.call(this, event, event === 'data' ? chunk => { listener(chunk); acknowledge(chunk); } : listener);
};
process.send?.({type:'ready'}); process.channel?.unref();
export const invoke = value => value?.countOnly ? {bytes:Buffer.byteLength(value.text),characters:value.text.length} : value;
`;
const customHttp = `
export const handleHttp = async request => {
  if (request.path === '/health') return {status:200,body:'healthy'};
  if (request.path === '/raw') return {status:200,body:request.body};
  return {status:200,headers:{'content-type':'application/json'},body:JSON.stringify(invoke(JSON.parse(request.body)))};
};
`;

async function start(t, mode, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-unicode-'));
  const entrypoint = path.join(directory, 'app.mjs');
  await fs.writeFile(entrypoint, (options.encoding ? "process.stdin.setEncoding('utf8');\n" : '') + application + (options.customHttp ? customHttp : ''));
  const child = spawn(process.execPath, [adapter, mode, entrypoint], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '0' }, stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });
  const stdout = [], stderr = [], messages = [];
  let wake, closed = false;
  child.stdout.on('data', chunk => { stdout.push(chunk); wake?.(); });
  child.stderr.on('data', chunk => { stderr.push(chunk); wake?.(); });
  child.on('message', message => { messages.push(message); wake?.(); });
  child.stdin.on('error', () => {});
  const done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', code => { closed = true; wake?.(); resolve({ code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') }); });
  });
  // Handle early exit even when a fixture fails before awaiting its final result.
  void done.catch(() => {});
  t.after(async () => {
    if (!closed) child.kill('SIGKILL');
    await done;
    await fs.rm(directory, { recursive: true, force: true });
  });
  async function until(read) {
    const timeout = AbortSignal.timeout(10_000);
    for (;;) {
      const value = read();
      if (value !== undefined) return value;
      if (closed) throw new Error('Adapter exited before observation: ' + Buffer.concat(stderr).toString('utf8'));
      await new Promise((resolve, reject) => {
        const aborted = () => { wake = undefined; reject(new Error('Adapter observation timed out')); };
        wake = () => { timeout.removeEventListener('abort', aborted); wake = undefined; resolve(); };
        if (timeout.aborted) aborted(); else timeout.addEventListener('abort', aborted, { once: true });
      });
    }
  }
  await until(() => messages.some(message => message.type === 'ready') ? true : undefined);
  async function chunks(stream, parts) {
    let consumed = messages.filter(message => message.type === 'chunk').reduce((sum, message) => sum + message.bytes, 0);
    for (const part of parts.slice(0, -1)) {
      consumed += part.length;
      stream.write(part);
      await until(() => messages.filter(message => message.type === 'chunk').reduce((sum, message) => sum + message.bytes, 0) >= consumed ? true : undefined);
    }
    stream.end(parts.at(-1));
  }
  let url;
  if (mode === '--serve') url = await until(() => /Application server ready: (http:\/\/127\.0\.0\.1:\d+)/.exec(Buffer.concat(stderr).toString('utf8'))?.[1]);
  return { child, done, chunks, url, until, stdout };
}
function splitCodePoint(bytes, character) {
  const point = Buffer.from(character), offset = bytes.indexOf(point);
  assert.ok(offset >= 0);
  return [bytes.subarray(0, offset + 1), ...Array.from({ length: point.length - 2 }, (_, i) => bytes.subarray(offset + i + 1, offset + i + 2)), bytes.subarray(offset + point.length - 1)];
}
async function request(server, parts, route = '/api/invoke') {
  let req;
  const result = new Promise((resolve, reject) => {
    req = http.request(server.url + route, { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': parts.reduce((sum, part) => sum + part.length, 0) } }, response => {
      const bytes = [];
      response.on('data', chunk => bytes.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(bytes).toString('utf8') }));
      response.on('error', reject);
    });
    req.on('error', reject);
  });
  void result.catch(() => {});
  await server.chunks(req, parts);
  return result;
}

for (const character of ['é', '☃', '😀']) {
  test(`standalone CLI preserves split ${Buffer.byteLength(character)}-byte UTF-8`, { timeout: 15_000 }, async t => {
    const runtime = await start(t, '--invoke'), value = { text: 'before ' + character + ' after' };
    await runtime.chunks(runtime.child.stdin, splitCodePoint(Buffer.from(JSON.stringify(value)), character));
    const result = await runtime.done;
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), value);
  });
  test(`standalone HTTP preserves split ${Buffer.byteLength(character)}-byte UTF-8`, { timeout: 15_000 }, async t => {
    const runtime = await start(t, '--serve'), value = { text: 'before ' + character + ' after' };
    const result = await request(runtime, splitCodePoint(Buffer.from(JSON.stringify(value)), character));
    assert.equal(result.status, 200, result.body);
    assert.deepEqual(JSON.parse(result.body), value);
  });
}

test('custom HTTP handlers receive intact split UTF-8 body text', { timeout: 15_000 }, async t => {
  const runtime = await start(t, '--serve', { customHttp: true }), body = 'Plain text: 😀 — café';
  const result = await request(runtime, splitCodePoint(Buffer.from(body), '😀'), '/raw');
  assert.equal(result.status, 200); assert.equal(result.body, body);
});
test('standalone CLI preserves a UTF-8 stream encoding selected by the application', { timeout: 15_000 }, async t => {
  const runtime = await start(t, '--invoke', { encoding: true }), value = { text: 'café ☃ 😀' };
  runtime.child.stdin.end(JSON.stringify(value));
  const result = await runtime.done;
  assert.equal(result.code, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout), value);
});
for (const mode of ['--invoke', '--serve']) test(`${mode} preserves unsplit ASCII and Unicode`, { timeout: 15_000 }, async t => {
  const runtime = await start(t, mode), value = { ascii: 'plain text', unicode: 'café ☃ 😀' }, bytes = Buffer.from(JSON.stringify(value));
  if (mode === '--invoke') {
    runtime.child.stdin.end(bytes); const result = await runtime.done;
    assert.equal(result.code, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout), value);
  } else {
    const result = await request(runtime, [bytes]);
    assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), value);
  }
});

test('isolated stdio framing already preserves split UTF-8', { timeout: 15_000 }, async t => {
  const runtime = await start(t, '--stdio'), value = { text: 'café ☃ 😀' };
  await runtime.until(() => Buffer.concat(runtime.stdout).toString('utf8').includes('"type":"ready"') ? true : undefined);
  const frame = Buffer.from(JSON.stringify({ version: 1, type: 'request', id: 'unicode', kind: 'invoke', input: value }) + '\n');
  const parts = splitCodePoint(frame, '😀');
  // Leave stdin open until the response arrives: EOF deliberately stops stdio workers.
  const writable = { write: bytes => runtime.child.stdin.write(bytes), end: bytes => runtime.child.stdin.write(bytes) };
  await runtime.chunks(writable, parts);
  const response = await runtime.until(() => Buffer.concat(runtime.stdout).toString('utf8').split('\n').slice(0, -1).map(line => JSON.parse(line)).find(message => message.type === 'response'));
  assert.equal(response.ok, true); assert.deepEqual(response.value, value);
  runtime.child.stdin.end(); assert.equal((await runtime.done).code, 0);
});

function sizedInput(size) {
  const value = { countOnly: true, text: '☃' };
  value.text += 'x'.repeat(size - Buffer.byteLength(JSON.stringify(value)));
  const bytes = Buffer.from(JSON.stringify(value)); assert.equal(bytes.length, size);
  return { bytes, expected: { bytes: Buffer.byteLength(value.text), characters: value.text.length } };
}
for (const mode of ['--invoke', '--serve']) {
  test(`${mode} accepts exactly 2 MB of raw bytes with a split code point`, { timeout: 15_000 }, async t => {
    const runtime = await start(t, mode), input = sizedInput(MAX), parts = splitCodePoint(input.bytes, '☃');
    if (mode === '--invoke') {
      await runtime.chunks(runtime.child.stdin, parts); const result = await runtime.done;
      assert.equal(result.code, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout), input.expected);
    } else {
      const result = await request(runtime, parts);
      assert.equal(result.status, 200, result.body); assert.deepEqual(JSON.parse(result.body), input.expected);
    }
  });
  test(`${mode} rejects more than 2 MB of raw input`, { timeout: 15_000 }, async t => {
    const runtime = await start(t, mode), input = sizedInput(MAX + 1);
    if (mode === '--invoke') {
      runtime.child.stdin.end(input.bytes); const result = await runtime.done;
      assert.notEqual(result.code, 0); assert.match(result.stderr, /Input exceeds 2 MB/);
    } else {
      let result;
      try { result = await request(runtime, [input.bytes]); }
      catch (error) { assert.equal(error.code, 'ECONNRESET', 'Only a reset from closing the oversized request is acceptable'); }
      if (result) { assert.ok(result.status >= 400 && result.status <= 599); assert.match(result.body, /Input exceeds 2 MB/); }
      const healthy = await fetch(runtime.url + '/health'); assert.equal(healthy.status, 200); assert.deepEqual(await healthy.json(), { ok: true });
    }
  });
}
for (const mode of ['--invoke', '--serve']) test(`${mode} rejects malformed JSON`, { timeout: 15_000 }, async t => {
  const runtime = await start(t, mode), invalid = Buffer.from('{"text":');
  if (mode === '--invoke') {
    runtime.child.stdin.end(invalid); const result = await runtime.done;
    assert.notEqual(result.code, 0); assert.match(result.stderr, /SyntaxError|JSON/);
  } else {
    const result = await request(runtime, [invalid]);
    assert.equal(result.status, 500); assert.match(result.body, /JSON/);
    const healthy = await fetch(runtime.url + '/health'); assert.equal(healthy.status, 200);
  }
});
