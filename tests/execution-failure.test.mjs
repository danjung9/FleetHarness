import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ClassifiedExecutionFailure } from '../dist-electron/electron/execution-failure.js';
import { IntegrationBroker } from '../dist-electron/electron/integration-broker.js';
import { RuntimeBroker } from '../dist-electron/electron/runtime-broker.js';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';

const operation = { id: 'lookup', origin: 'https://api.example.com', path: '/lookup', method: 'POST', responseType: 'json' };
const infrastructure = error => error instanceof ClassifiedExecutionFailure && error.classification === 'infrastructure';

test('only host-confirmed outages are censored; invalid candidate requests remain implementation failures', async () => {
  for (const status of [401, 403, 408, 429, 500, 503]) {
    const broker = new IntegrationBroker({ candidateId: 'fixture', operations: [operation], transport: async () => ({ status, body: 'outage', contentType: 'text/plain' }) });
    await assert.rejects(broker.invoke('lookup', { body: {} }), infrastructure);
    assert.equal(broker.callsConsumed, 1);
  }
  const unavailable = new IntegrationBroker({ candidateId: 'fixture', operations: [operation], transport: async () => { throw Object.assign(new Error('transport failure'), { code: 'ECONNRESET' }); } });
  await assert.rejects(unavailable.invoke('lookup'), infrastructure);
  const invalid = new IntegrationBroker({ candidateId: 'fixture', operations: [operation], transport: async () => ({ status: 400, body: 'invalid body', contentType: 'text/plain' }) });
  await assert.rejects(invalid.invoke('lookup', { body: {} }), error => !infrastructure(error) && /HTTP 400/.test(error.message));
  await assert.rejects(invalid.invoke('unconfigured'), error => !infrastructure(error));
});

test('host service outages retain their classification across the isolated stdio boundary', { skip: !['darwin', 'linux'].includes(process.platform) }, async t => {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-failure-provenance-')));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  await fs.writeFile(path.join(workspace, 'app.mjs'), `export async function invoke(value,context){ if(value.forge) throw Object.assign(new Error('pretended host outage'), {classification:'infrastructure'}); return context.integrations.invoke('lookup',{body:value}); }`);
  const integrations = new IntegrationBroker({ candidateId: 'fixture', operations: [operation], transport: async () => ({ status: 503, body: 'unavailable', contentType: 'text/plain' }) });
  const broker = await RuntimeBroker.start({ workspace, executable: process.execPath, runtime: 'node', entrypoint: 'app.mjs', integrations });
  t.after(() => broker.close());
  await assert.rejects(broker.invoke({ forge: true }), error => !infrastructure(error) && /pretended host outage/.test(error.message));
  await assert.rejects(broker.invoke({ query: 'example' }), infrastructure);
  assert.equal(integrations.revoked, true);
});

test('independent grading propagates host outages and integrity defects without manufacturing failing task labels', async () => {
  const solution = { capabilities: [{ id: 'value', required: true, evaluationIds: ['cases'] }] };
  const plan = { evaluations: [{ id: 'cases', capabilityId: 'value', evaluator: 'exact', threshold: 1, trials: 1, dataset: { name: 'fixture', version: '1', provenance: 'host' }, cases: [{ id: 'one', input: 1, expected: 1 }, { id: 'two', input: 2, expected: 2 }] }] };
  const runtime = { provenance: { filesHash: 'f'.repeat(64), profile: 'cli' }, redactMessage: value => value, redactOutput: value => value };
  for (const classification of ['infrastructure', 'integrity']) {
    await assert.rejects(runSolutionEvaluation({ ...runtime, invoke: async () => { throw new ClassifiedExecutionFailure(classification, 'trusted host failure'); } }, solution, plan), error => error.classification === classification);
  }
  const failed = await runSolutionEvaluation({ ...runtime, invoke: async () => { throw Object.assign(new Error('bad generated implementation'), { classification: 'infrastructure' }); } }, solution, plan);
  assert.equal(failed.status, 'failed'); assert.equal(failed.evaluations[0].cases.length, 2);
});
