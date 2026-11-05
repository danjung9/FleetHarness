import test from 'node:test';
import assert from 'node:assert/strict';
import { isUtf8 } from 'node:buffer';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { experimentContractHash } from '../dist-electron/harness/experiment-contract.js';
import { assertExperimentContracts, compileExperimentContracts, experimentContractIdentity,
  experimentPublicFiles, materializeExperimentContracts, verifyExperimentCandidate } from '../dist-electron/electron/experiment-quality.js';

const privateLabel = 'Private contract label: ';
const unicode = privateLabel + '\uFEFFcaf\u00e9 e\u0301 \u65e5\u672c\u8a9e \ud83d\ude80 \uFFFD';
const acceptance = [{ id: 'R1', requirement: 'Return the supplied finite number.', method: 'automated',
  scenario: 'Independent ordinary and boundary cases.' }];

function compiled() {
  const behavior = {
    schemaVersion: 1, objective: 'Return the supplied finite number. ' + unicode, surface: 'cli',
    invocation: { input: 'A finite JSON number.', output: 'The same finite JSON number.', rules: ['Return the input unchanged.'] },
    capabilities: [{ id: 'identity', kind: 'algorithm', description: 'Return the supplied number.',
      criterionIds: ['R1'], required: true, evaluationIds: ['identity-cases'] }],
    criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'The reference values match. ' + unicode,
      capabilityIds: ['identity'], scenarioIds: [] }],
    ux: { audience: 'An operator. ' + unicode, primaryTask: 'Return a number', successOutcome: 'The unchanged number',
      states: { empty: 'Explain valid input.', loading: 'Show calculation progress.', error: 'Explain invalid input.', success: 'Return the number.' },
      persistence: 'No persistence required.', recovery: 'Correct invalid input and retry.', keyboard: 'Invoke with standard input.' },
    scenarios: []
  };
  const execution = {
    schemaVersion: 1, behaviorHash: experimentContractHash(behavior), architectureId: 'node-cli',
    runtime: { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } },
    foundation: { schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'Minimal regression fixture. ' + unicode },
    systemDesign: { title: 'Identity engine', description: 'Return the supplied number. ' + unicode,
      components: [{ id: 'core', label: 'Core', description: 'Return input.', kind: 'logic', files: ['engine.mjs'] }], connections: [] },
    screens: [{ name: 'Command', purpose: 'Return a number.', primaryAction: 'Invoke' }], bindings: []
  };
  const evaluation = { schemaVersion: 1, evaluations: [{ id: 'identity-cases', capabilityId: 'identity', description: 'Independent reference inputs.',
    dataset: { name: 'Identity inputs', version: '1', provenance: 'reviewed' }, evaluator: 'exact', threshold: 1, trials: 1,
    cases: [{ id: 'ordinary', input: 7, expected: 7 }, { id: 'boundary', input: 0, expected: 0 }] }] };
  return compileExperimentContracts(behavior, execution, evaluation, acceptance);
}

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-experiment-contract-utf8-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const contract = compiled();
  await materializeExperimentContracts(root, contract);
  await assertExperimentContracts(root, contract);
  return { root, contract };
}

async function malformedEquivalent(root, name, byte) {
  const file = path.join(root, name), original = await fs.readFile(file), marker = Buffer.from('\uFFFD');
  const offset = original.indexOf(marker);
  assert.ok(offset >= 0, name + ' contains a valid literal replacement character.');
  const changed = Buffer.concat([original.subarray(0, offset), Buffer.from([byte]), original.subarray(offset + marker.length)]);
  assert.equal(isUtf8(original), true);
  assert.equal(isUtf8(changed), false);
  assert.notDeepEqual(changed, original);
  assert.equal(changed.toString('utf8'), original.toString('utf8'), 'Replacement decoding would conceal the byte mutation.');
  await fs.writeFile(file, changed);
}

function encodingError(name) {
  return error => {
    assert.match(error.message, /UTF-?8/i);
    assert.ok(error.message.includes(name), 'The diagnostic identifies the affected public contract.');
    assert.ok(!error.message.includes(privateLabel), 'The diagnostic does not echo private contract contents.');
    return true;
  };
}

for (const name of experimentPublicFiles) {
  for (const byte of [0x80, 0xff]) test(`frozen experiment ${name} rejects decoded-equivalent malformed byte 0x${byte.toString(16)}`, async t => {
    const { root, contract } = await fixture(t);
    await malformedEquivalent(root, name, byte);
    await assert.rejects(assertExperimentContracts(root, contract), encodingError(name));
  });

  test(`experiment verification rejects malformed ${name} before running candidate code`, async t => {
    const { root, contract } = await fixture(t);
    await malformedEquivalent(root, name, 0xff);
    let runtimeCalls = 0, testCalls = 0;
    try {
      await assert.rejects(verifyExperimentCandidate(root, process.execPath, contract,
        { experimentId: 'utf8-experiment', candidateId: 'utf8-candidate' }, undefined, {
          prepareRuntime: async () => { runtimeCalls++; throw new Error('Candidate runtime must not start.'); },
          verifyTests: async () => { testCalls++; throw new Error('Candidate tests must not start.'); }
        }), encodingError(name));
    } finally {
      assert.equal(runtimeCalls, 0, 'Invalid frozen text must fail before any runtime preparation.');
      assert.equal(testCalls, 0, 'Invalid frozen text must fail before any candidate test execution.');
    }
  });
}

test('frozen experiment contracts preserve valid Unicode, literal replacement characters and existing identities', async t => {
  const { root, contract } = await fixture(t), before = structuredClone(contract);
  const identity = experimentContractIdentity(contract);
  assert.deepEqual(experimentContractIdentity(compiled()), identity, 'Valid input retains deterministic contract identities.');
  for (const name of experimentPublicFiles) {
    const file = path.join(root, name), original = await fs.readFile(file);
    const body = original.toString('utf8');
    assert.ok(body.includes(unicode), name + ' retains Unicode without normalization or BOM stripping.');
    assert.equal(isUtf8(original), true);
    await fs.writeFile(file, body, 'utf8');
    assert.deepEqual(await fs.readFile(file), original, 'Rewriting valid text retains its exact UTF-8 bytes.');
  }
  await assertExperimentContracts(root, contract);
  assert.deepEqual(contract, before, 'Frozen comparisons do not rewrite the host contract.');
  assert.deepEqual(experimentContractIdentity(contract), identity);
});
