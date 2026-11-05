import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RuntimeBroker } from '../dist-electron/electron/runtime-broker.js';
import { IntegrationBroker } from '../dist-electron/electron/integration-broker.js';

const supported = ['darwin', 'linux'].includes(process.platform);
const options = { skip: !supported, timeout: 15_000 };
const secret = 'runtime-output-must-not-enter-utf8-diagnostics';
const invalidSequences = [
  ['invalid lead byte', [0xff]],
  ['truncated two-byte character', [0xc3]],
  ['truncated three-byte character', [0xe2, 0x82]],
  ['encoded surrogate', [0xed, 0xa0, 0x80]],
  ['overlong encoding', [0xc0, 0xaf]],
  ['invalid continuation', [0xe2, 0x28, 0xa1]],
];
const adapterHelpers = `
import { createInterface } from 'node:readline';
const frame = value => Buffer.from(JSON.stringify(value) + '\\n');
const malformed = (value, bytes) => {
  const wire = frame(value), marker = Buffer.from('REPLACE_BYTES');
  const offset = wire.indexOf(marker);
  if (offset < 0) throw new Error('Missing malformed fixture marker');
  return Buffer.concat([wire.subarray(0, offset), Buffer.from(bytes), wire.subarray(offset + marker.length)]);
};
const lines = createInterface({input:process.stdin});
`;

async function fixture(t, customAdapter) {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-broker-utf8-')));
  const brokers = [];
  t.after(async () => {
    await Promise.all(brokers.map(broker => broker.close()));
    await fs.rm(workspace, { recursive: true, force: true });
  });
  await fs.writeFile(path.join(workspace, 'app.mjs'), 'export const invoke = value => value;\n');
  let adapterPath;
  if (customAdapter) {
    adapterPath = path.join(workspace, 'adapter.mjs');
    await fs.writeFile(adapterPath, adapterHelpers + customAdapter);
  }
  return async (extra = {}) => {
    const broker = await RuntimeBroker.start({ workspace, executable: process.execPath, runtime: 'node',
      entrypoint: 'app.mjs', adapterPath, requestTimeoutMs: 5_000, ...extra });
    brokers.push(broker);
    return broker;
  };
}

function utf8Failure(error) {
  assert.ok(error instanceof Error);
  assert.match(error.message, /UTF-8/i);
  assert.equal(error.message.includes(secret), false, 'Rejected wire payloads must not be echoed into diagnostics.');
  return true;
}

for (const [name, bytes] of invalidSequences) {
  test('isolated broker rejects ' + name + ' before resolving any pending response', options, async t => {
    const start = await fixture(t, `
process.stdout.write(frame({version:1,type:'ready'}));
const requests = [];
lines.on('line', line => {
  requests.push(JSON.parse(line));
  if (requests.length !== 2) return;
  process.stdout.write(Buffer.concat([
    malformed({version:1,type:'response',id:requests[0].id,ok:true,value:${JSON.stringify(secret + ':REPLACE_BYTES')}},${JSON.stringify(bytes)}),
    frame({version:1,type:'response',id:requests[1].id,ok:true,value:'must not resolve'})
  ]));
});`);
    const broker = await start();
    const results = await Promise.allSettled([broker.invoke('first'), broker.invoke('second')]);
    for (const result of results) {
      assert.equal(result.status, 'rejected', 'Invalid UTF-8 must not turn into an accepted replacement character.');
      utf8Failure(result.reason);
    }
    await assert.rejects(broker.invoke('after malformed output'), utf8Failure);
  });
}

test('isolated broker rejects malformed UTF-8 in error frames without exposing their payload', options, async t => {
  const start = await fixture(t, `
process.stdout.write(frame({version:1,type:'ready'}));
lines.on('line', line => {
  const request = JSON.parse(line);
  process.stdout.write(malformed({version:1,type:'response',id:request.id,ok:false,error:${JSON.stringify(secret + ':REPLACE_BYTES')}},[0xff]));
});`);
  const broker = await start();
  await assert.rejects(broker.invoke(null), utf8Failure);
  await assert.rejects(broker.invoke(null), utf8Failure);
});

test('isolated broker rejects malformed UTF-8 before accepting the ready handshake', options, async t => {
  const start = await fixture(t, `
process.stdout.write(malformed({version:1,type:'ready',detail:${JSON.stringify(secret + ':REPLACE_BYTES')}},[0xff]));`);
  await assert.rejects(start(), utf8Failure);
});

test('isolated broker rejects malformed integration input before dispatching a host operation', options, async t => {
  let calls = 0;
  const integrations = new IntegrationBroker({ candidateId: 'utf8-test', operations: [
    { id: 'lookup', origin: 'https://example.invalid', path: '/lookup', method: 'POST', responseType: 'json' }
  ], transport: async () => { calls++; return { status: 200, contentType: 'application/json', body: '1' }; } });
  const start = await fixture(t, `
process.stdout.write(frame({version:1,type:'ready'}));
lines.on('line', line => {
  const request = JSON.parse(line);
  if (request.type !== 'request') return;
  process.stdout.write(Buffer.concat([
    malformed({version:1,type:'integration',id:'lookup-1',operationId:'lookup',input:{body:${JSON.stringify(secret + ':REPLACE_BYTES')}}},[0xff]),
    frame({version:1,type:'response',id:request.id,ok:true,value:1})
  ]));
});`);
  const broker = await start({ integrations });
  await assert.rejects(broker.invoke(null), utf8Failure);
  assert.equal(calls, 0, 'Malformed input must not reach the integration transport.');
  assert.equal(integrations.revoked, true);
});

test('isolated broker preserves Unicode split across received chunks and adjacent response frames', options, async t => {
  const expected = { text: 'café ☃ 😀 literal �', nested: ['雪', '\ufeff'] };
  const start = await fixture(t, `
process.stdout.write(frame({version:1,type:'ready'}));
let remainder;
lines.on('line', line => {
  const request = JSON.parse(line);
  const wire = frame({version:1,type:'response',id:request.id,ok:true,value:request.input});
  if (!remainder) {
    const split = wire.indexOf(Buffer.from('😀')) + 1;
    remainder = wire.subarray(split);
    process.stdout.write(wire.subarray(0,split));
  } else process.stdout.write(Buffer.concat([remainder,wire]));
});`);
  const broker = await start();
  // Observe the production parser after it receives an incomplete code point;
  // the second request releases the remainder, without timing or pipe assumptions.
  let observed;
  const partial = new Promise(resolve => { observed = resolve; });
  const receive = broker.receive.bind(broker);
  broker.receive = chunk => {
    receive(chunk);
    if (broker.buffer.length && broker.buffer.at(-1) === 0xf0) observed();
  };
  const first = broker.invoke(expected);
  void first.catch(() => {});
  await partial;
  const second = broker.invoke({ next: 'ASCII and é �' });
  assert.deepEqual(await Promise.all([first, second]), [expected, { next: 'ASCII and é �' }]);
});

test('the standard isolated adapter preserves Unicode and literal replacement characters', options, async t => {
  const start = await fixture(t), broker = await start();
  const expected = { text: 'café ☃ 😀 literal �', nested: ['雪', '\ufeff'] };
  assert.deepEqual(await broker.invoke(expected), expected);
  const response = await broker.http({ method: 'POST', path: '/api/invoke', headers: {}, body: JSON.stringify(expected) });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), expected);
});
