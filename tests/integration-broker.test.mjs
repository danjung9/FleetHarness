import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { IntegrationBroker, IntegrationCredentialVault, publicIntegrationAddress } from '../dist-electron/electron/integration-broker.js';
import { validateIntegrationOperation, exportIntegrationOperations } from '../dist-electron/shared/integration.js';

const operation = { id: 'calculate', origin: 'https://api.example.com', path: '/v1/calculate', method: 'POST', responseType: 'json', queryKeys: ['unit'], auth: { type: 'bearer', credentialId: 'example', envName: 'EXAMPLE_API_KEY' } };
const response = body => ({ status: 200, body: JSON.stringify(body), contentType: 'application/json' });

test('integration uses a fixed endpoint and host credential while redacting nested returned secrets', async () => {
  const secret = 'api-key-"quoted"'; let captured;
  const broker = new IntegrationBroker({ candidateId: 'a', operations: [operation], credentials: { get: async () => secret }, transport: async request => { captured = request; return response({ nested: [{ echo: secret }], [secret]: 'value' }); } });
  assert.deepEqual(await broker.invoke('calculate', { body: { x: 3 }, query: { unit: 'kg' } }), { nested: [{ echo: '[redacted]' }], '[redacted]': 'value' });
  assert.equal(captured.url.href, 'https://api.example.com/v1/calculate?unit=kg');
  assert.equal(captured.method, 'POST'); assert.equal(captured.headers.authorization, 'Bearer ' + secret);
  assert.equal(captured.body, '{"x":3}'); assert.equal(broker.evidence[0].status, 'passed');
  assert.equal(JSON.stringify(broker.evidence).includes(secret), false);
  await assert.rejects(broker.invoke('calculate', { url: 'https://evil.example' }), /Invalid integration/);
  await assert.rejects(broker.invoke('calculate', { query: { endpoint: 'evil' } }), /not allowed/);
  await assert.rejects(broker.invoke('other'), /not configured/);
  const exported = exportIntegrationOperations([operation]);
  assert.equal(exported[0].auth.credentialId, undefined); assert.equal(exported[0].auth.envName, 'EXAMPLE_API_KEY');
});

test('configuration and DNS addresses fail closed for URL tricks and private destinations', () => {
  for (const origin of ['http://api.example.com', 'https://localhost', 'https://127.0.0.1', 'https://user:pass@api.example.com', 'https://api.example.com/']) assert.throws(() => validateIntegrationOperation({ ...operation, origin }));
  for (const route of ['//evil.example/x', '/a/../x', '/%2e%2e/x', '/x?url=evil', '/x#ignored', '/x\\evil']) assert.throws(() => validateIntegrationOperation({ ...operation, path: route }));
  for (const address of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.1.1', '100.64.1.1', '::1', '2::1', 'fc00::1', '2001:db8::1', '::ffff:127.0.0.1', '2002:7f00:1::']) assert.equal(publicIntegrationAddress(address), false, address);
  for (const address of ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111']) assert.equal(publicIntegrationAddress(address), true, address);
});

test('redirects, oversized responses, request budget and total call budget fail closed', async () => {
  const withoutAuth = { ...operation, auth: undefined };
  const redirect = new IntegrationBroker({ candidateId: 'a', operations: [withoutAuth], transport: async () => ({ status: 302, body: '', contentType: 'text/plain' }) });
  await assert.rejects(redirect.invoke('calculate'), /redirects/);
  const large = new IntegrationBroker({ candidateId: 'b', operations: [withoutAuth], transport: async () => response('x'.repeat(2_000_001)) });
  await assert.rejects(large.invoke('calculate'), /2 MB/);
  await assert.rejects(large.invoke('calculate', { body: 'x'.repeat(2_000_001) }), /2 MB/);
  const bounded = new IntegrationBroker({ candidateId: 'c', operations: [withoutAuth], transport: async () => response(true) });
  for (let i = 0; i < 100; i++) assert.equal(await bounded.invoke('calculate'), true);
  await assert.rejects(bounded.invoke('calculate'), /100-call/); assert.equal(bounded.evidence.length, 100);
});

test('revocation cancels an uncooperative transport and ignores late completion', async () => {
  let finish, invoked;
  const started = new Promise(resolve => { invoked = resolve; });
  const broker = new IntegrationBroker({ candidateId: 'a', operations: [{ ...operation, auth: undefined }], transport: async () => { invoked(); return await new Promise(resolve => { finish = resolve; }); } });
  const pending = broker.invoke('calculate'); await started; broker.revoke();
  await assert.rejects(pending, /cancelled/); finish(response('late'));
  await assert.rejects(broker.invoke('calculate'), /revoked/);
  assert.equal(broker.evidence.length, 1); assert.equal(broker.evidence[0].status, 'cancelled');
});

test('successive runtime leases share durable candidate quota and reserve before sending', async () => {
  const budget = { calls: 98 }, events = [];
  const options = { candidateId: 'same-candidate', operations: [{ ...operation, auth: undefined }], budget,
    onConsume: async state => { await Promise.resolve(); events.push('persist:' + state.calls); },
    transport: async () => { events.push('fetch'); return response(true); } };
  const first = new IntegrationBroker(options); assert.equal(await first.invoke('calculate'), true); first.revoke();
  const second = new IntegrationBroker(options), third = new IntegrationBroker(options);
  const attempts = await Promise.allSettled([second.invoke('calculate'), third.invoke('calculate')]);
  assert.equal(attempts.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter(item => item.status === 'rejected').length, 1);
  assert.equal(second.callsConsumed, 100);
  assert.deepEqual(events, ['persist:99', 'fetch', 'persist:100', 'fetch']);
  let sent = false;
  const failed = new IntegrationBroker({ ...options, budget: { calls: 0 }, onConsume: async () => { throw new Error('disk full'); }, transport: async () => { sent = true; return response(true); } });
  await assert.rejects(failed.invoke('calculate'), /disk full/); assert.equal(sent, false); assert.equal(failed.callsConsumed, 1);
});

test('credential vault uses injected encryption, atomic ciphertext files, and rejects aliases', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-credential-test-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const key = randomBytes(32);
  const cipher = { isEncryptionAvailable: () => true,
    encryptString: value => { const nonce = randomBytes(12), instance = createCipheriv('aes-256-gcm', key, nonce); const body = Buffer.concat([instance.update(value, 'utf8'), instance.final()]); return Buffer.concat([nonce, instance.getAuthTag(), body]); },
    decryptString: value => { const instance = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12)); instance.setAuthTag(value.subarray(12, 28)); return Buffer.concat([instance.update(value.subarray(28)), instance.final()]).toString('utf8'); } };
  const vault = new IntegrationCredentialVault(root, cipher); await vault.set('example', 'never-plaintext');
  assert.equal(await vault.get('example'), 'never-plaintext');
  const file = path.join(root, 'integration-credentials/example.enc');
  assert.equal((await fs.readFile(file)).includes(Buffer.from('never-plaintext')), false);
  assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  const alias = path.join(root, 'integration-credentials/alias.enc'); await fs.symlink(file, alias);
  await assert.rejects(vault.get('alias'), /Invalid encrypted/);
  await assert.rejects(vault.set('example', 'bad\nkey'), /single-line/);
  await vault.delete('example'); await assert.rejects(vault.get('example'), /ENOENT/);
  const unavailable = new IntegrationCredentialVault(root, { ...cipher, isEncryptionAvailable: () => false });
  await assert.rejects(unavailable.set('example', 'secret'), /unavailable/);
  const weakBackend = new IntegrationCredentialVault(root, { ...cipher, getSelectedStorageBackend: () => 'basic_text' });
  await assert.rejects(weakBackend.set('example', 'secret'), /unavailable/);
});
