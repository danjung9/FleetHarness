import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const directory = await mkdtemp(resolve('.hosted-credentials-test-'));
after(() => rm(directory, { recursive: true, force: true }));
await build({ entryPoints: ['server/credentials.ts'], outfile: `${directory}/credentials.mjs`, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
const { encryptKey, decryptKey, openAIModels, validateOpenAIKey } = await import(pathToFileURL(`${directory}/credentials.mjs`).href);
const secret = randomBytes(32).toString('base64');
const apiKey = 'sk-test-fixture-not-a-real-key';
const model = openAIModels()[0].id;

test('credentials are randomized and authenticated to one account', () => {
  const first = encryptKey('account-a', apiKey, secret), second = encryptKey('account-a', apiKey, secret);
  assert.notEqual(first, second); assert.ok(!first.includes(apiKey));
  assert.equal(decryptKey('account-a', first, secret), apiKey);
  assert.throws(() => decryptKey('account-b', first, secret), /Reconnect/);
  const parts = first.split('.');
  const damaged = Buffer.from(parts[3], 'base64url'); damaged[0] ^= 1; parts[3] = damaged.toString('base64url');
  assert.throws(() => decryptKey('account-a', parts.join('.'), secret), /Reconnect/);
  assert.throws(() => decryptKey('account-a', first, randomBytes(32).toString('base64')), /Reconnect/);
  assert.throws(() => encryptKey('account-a', apiKey, 'bad-key'), /not configured/);
});

test('connecting validates both model access and a Responses generation', async () => {
  const calls = [];
  const available = await validateOpenAIKey(apiKey, model, async (url, init) => {
    calls.push([url, init]);
    return Response.json(url.endsWith('/models') ? { data: [{ id: model }, { id: 'unknown-model' }] } : { status: 'completed' });
  });
  assert.deepEqual(available, [model]); assert.equal(calls.length, 2);
  assert.equal(calls[1][0], 'https://api.openai.com/v1/responses');
  assert.deepEqual(JSON.parse(calls[1][1].body), { model, input: 'Reply with OK.', max_output_tokens: 64, store: false });
  assert.equal(calls[1][1].headers.Authorization, `Bearer ${apiKey}`);
});

test('inaccessible model does not make a paid canary request', async () => {
  let requests = 0;
  await assert.rejects(validateOpenAIKey(apiKey, model, async () => {
    requests++; return Response.json({ data: [{ id: 'another-model' }] });
  }), error => error.code === 'model_access_denied');
  assert.equal(requests, 1);
});

test('provider errors are actionable without exposing provider bodies or keys', async () => {
  for (const [status, code] of [[401, 'invalid_api_key'], [403, 'model_access_denied'], [429, 'provider_limit'], [500, 'provider_unavailable']]) {
    await assert.rejects(validateOpenAIKey(apiKey, model, async () => new Response(`sensitive ${apiKey}`, { status })), error => {
      assert.equal(error.code, code); assert.ok(!error.message.includes(apiKey)); return true;
    });
  }
  await assert.rejects(validateOpenAIKey(apiKey, 'unknown-model', async () => { throw Error('must not call'); }), /supported OpenAI/);
});
