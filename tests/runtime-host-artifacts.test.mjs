import { bindSyntheticApproval } from './helpers/approved-evidence.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseSolutionContract } from '../dist-electron/harness/solution-contract.js';
import { parseBehavioralContract, parseCandidateExecutionContract, experimentContractHash } from '../dist-electron/harness/experiment-contract.js';
import { loadQualityContract, verifyApplication } from '../dist-electron/electron/quality.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { prepareIsolatedSolutionRuntime } from '../dist-electron/electron/isolated-solution-runtime.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';
import { assertExecutableSource } from '../dist-electron/electron/executable.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { reportPassed } from '../dist-electron/shared/verification.js';

const artifacts = ['test-report.json', 'review.json', 'DELIVERY.md'];
const rejectedPaths = [...artifacts, 'TEST-REPORT.JSON', 'Review.Json', 'delivery.MD', 'DELIVERY.md/config.json'];
const diagnostic = /host-written artifact/i;
const acceptance = [{ id: 'R1', requirement: 'Multiply supplied values by the bundled coefficient.', method: 'automated', scenario: 'Independent scalar examples.' }];
const ux = { schemaVersion: 1, audience: 'CLI users', primaryTask: 'Multiply input', successOutcome: 'Correct JSON output',
  screens: [{ name: 'CLI', purpose: 'Enter a number', primaryAction: 'Run the command' }],
  states: { empty: 'Explain input', loading: 'Wait for result', error: 'Explain invalid input', success: 'Return result' },
  persistence: 'Read the bundled coefficient.', recovery: 'Correct invalid input.', keyboard: 'Standard terminal input.' };

function fixture(file = 'data/coefficient.json') {
  const solution = { schemaVersion: 1, objective: 'Multiply the input by the bundled coefficient.',
    invocation: { input: 'A finite number.', output: 'A finite number.', rules: ['Multiply the supplied value by the bundled coefficient, which is two.'] },
    capabilities: [{ id: 'multiply', kind: 'algorithm', description: 'Multiply using bundled input data.', criterionIds: ['R1'], required: true, evaluationIds: ['reference'] }],
    runtime: { profile: 'cli', files: ['engine.mjs', file], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } };
  const plan = { schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Independent multiplication examples match.', journeyIds: [], capabilityIds: ['multiply'] }], journeys: [] };
  const evaluation = { schemaVersion: 1, evaluations: [{ id: 'reference', capabilityId: 'multiply', description: 'Independent multiplication examples.',
    dataset: { name: 'coefficients', version: '1', provenance: 'synthetic' }, evaluator: 'exact', threshold: 1, trials: 1,
    cases: [{ id: 'first', input: 2, expected: 4 }, { id: 'second', input: 3, expected: 6 }] }] };
  const engine = `import { readFileSync } from 'node:fs'; const input=JSON.parse(readFileSync(0,'utf8')); console.log(JSON.stringify(input*Number(readFileSync(${JSON.stringify(file)},'utf8'))));`;
  const tests = `import test from 'node:test'; import assert from 'node:assert/strict'; import {readFileSync} from 'node:fs'; test('bundled coefficient',()=>assert.equal(Number(readFileSync(${JSON.stringify(file)},'utf8')),2));`;
  return { solution, plan, evaluation, files: { 'solution-contract.json': JSON.stringify(solution), 'acceptance-plan.json': JSON.stringify(plan),
    'evaluation-plan.json': JSON.stringify(evaluation), 'ux-spec.json': JSON.stringify(ux), 'engine.mjs': engine, 'engine.test.mjs': tests, [file]: '2' } };
}

async function workspace(t, files = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-artifacts-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'workspace'), parent = path.join(directory, 'exports');
  await fs.mkdir(root); await fs.mkdir(parent);
  for (const [file, body] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), body);
  }
  return { root, parent };
}

async function exportInput(root, parent) {
  return { workspace: root, parent, title: 'Coefficient multiplier', verifiedHash: await sourceHash(root),
    evidence: { report: '{"passed":1}', review: '{"approved":true}' }, deliveryMarkdown: '# Approved prototype\nSee README.md for usage.' };
}

function sharedContracts(value) {
  const { schemaVersion: _version, screens: _screens, ...sharedUx } = ux;
  const behavior = parseBehavioralContract({ schemaVersion: 1, objective: value.solution.objective, invocation: value.solution.invocation,
    capabilities: value.solution.capabilities, surface: 'cli', scenarios: [], ux: sharedUx,
    criteria: value.plan.criteria.map(({ journeyIds, ...criterion }) => ({ ...criterion, scenarioIds: journeyIds })) }, acceptance);
  const execution = { schemaVersion: 1, behaviorHash: experimentContractHash(behavior), architectureId: 'node-cli', runtime: value.solution.runtime,
    foundation: { schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'Small CLI calculation.' },
    systemDesign: { title: 'Multiplier', description: 'Read bundled data and calculate.', components: [{ id: 'core', label: 'Core', description: 'Multiply supplied values.', kind: 'logic', files: ['engine.mjs'] }], connections: [] },
    screens: ux.screens, bindings: [] };
  return { behavior, execution };
}

test('runtime plans reserve host root artifacts, case aliases and descendant paths', () => {
  for (const file of rejectedPaths) {
    const value = fixture(file), before = structuredClone(value.solution);
    assert.throws(() => parseSolutionContract(value.solution, acceptance), diagnostic, file);
    assert.deepEqual(value.solution, before, 'Validation must not rewrite the manifest.');
  }
});

test('regular host plan loading rejects artifact collisions before sealing expectations', async t => {
  for (const file of artifacts) {
    const value = fixture(file), { root } = await workspace(t, value.files);
    await assert.rejects(loadQualityContract(root, acceptance, true), diagnostic, file);
    assert.equal(await fs.readFile(path.join(root, 'evaluation-plan.json'), 'utf8'), JSON.stringify(value.evaluation));
    assert.equal(await fs.readFile(path.join(root, file), 'utf8'), '2');
  }
});

test('shared candidate execution plans also reject host artifact collisions', () => {
  for (const file of rejectedPaths) {
    const { behavior, execution } = sharedContracts(fixture(file));
    assert.throws(() => parseCandidateExecutionContract(execution, behavior, acceptance), diagnostic, file);
  }
  for (const file of artifacts.map(name => 'data/' + name)) {
    const { behavior, execution } = sharedContracts(fixture(file));
    assert.deepEqual(parseCandidateExecutionContract(execution, behavior, acceptance).runtime.files, ['engine.mjs', file]);
  }
});

for (const [name, prepare] of [['ordinary', prepareSolutionRuntime], ['isolated', prepareIsolatedSolutionRuntime]]) {
  test(name + ' runtime rejects raw historical manifests before executing them', async t => {
    for (const file of artifacts) {
      const { root } = await workspace(t, { 'engine.mjs': 'export function invoke(value) { return value; }\n', [file]: '2' });
      const manifest = fixture(file).solution.runtime;
      await assert.rejects(async () => {
        const runtime = await prepare(root, manifest, process.execPath);
        await runtime.close();
      }, diagnostic, file);
      assert.equal(await fs.readFile(path.join(root, file), 'utf8'), '2');
    }
  });
}

for (const file of artifacts) {
  test('historical source export rejects declared ' + file + ' before copying', async t => {
    const { root, parent } = await workspace(t, fixture(file).files), input = await exportInput(root, parent);
    let copies = 0;
    await assert.rejects(exportVerifiedBundle(input, undefined, async (from, to) => { copies++; await fs.copyFile(from, to); }), diagnostic);
    assert.equal(copies, 0, 'A conflicting saved runtime must be rejected before publishing a bundle.');
    assert.deepEqual(await fs.readdir(parent), []);
    assert.equal(await sourceHash(root), input.verifiedHash);
    assert.equal(await fs.readFile(path.join(root, file), 'utf8'), '2');
  });
}

test('source export rejects unsafe reference manifests even without a saved solution contract', async t => {
  for (const file of rejectedPaths) {
    const { root, parent } = await workspace(t, { 'engine.mjs': 'export const value=2;', [file]: '2' });
    const input = await exportInput(root, parent);
    input.reference = { runtime: fixture(file).solution.runtime, operations: [], experiment: { experimentId: 'example', candidateId: 'candidate',
      behaviorHash: 'a'.repeat(64), evaluationSetHash: 'b'.repeat(64), executionHash: 'c'.repeat(64) } };
    let copies = 0;
    await assert.rejects(exportVerifiedBundle(input, undefined, async (from, to) => { copies++; await fs.copyFile(from, to); }), diagnostic, file);
    assert.equal(copies, 0); assert.deepEqual(await fs.readdir(parent), []);
  }
});

test('historical browser packaging cannot bypass runtime artifact reservations', async t => {
  for (const file of artifacts) {
    const value = fixture(file);
    value.solution.runtime = { profile: 'browser', entrypoint: 'index.html', files: ['index.html', 'engine.mjs', file], requiredEnv: [], evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
    const { root } = await workspace(t, { 'index.html': '<p>Multiplier</p>', 'engine.mjs': 'console.log(4);', [file]: '2',
      'solution-contract.json': JSON.stringify(value.solution), '.fleet/packet.json': JSON.stringify({ acceptance }) });
    const project = { title: 'Multiplier', workspace: root, status: 'approved', approvedAt: new Date().toISOString(),
      report: { exitCode: 0, passed: 1, total: 1, failed: 0, skipped: 0, sourceHash: await sourceHash(root) } };
    bindSyntheticApproval(project);
    await assert.rejects(assertExecutableSource(project), diagnostic, file);
  }
});

for (const file of artifacts.map(name => 'data/' + name)) {
  test('nested application data ' + file + ' retains verified behavior through delivery', async t => {
    const value = fixture(file), { root, parent } = await workspace(t, value.files);
    const contract = await loadQualityContract(root, acceptance, true);
    const report = await verifyApplication(root, process.execPath, contract);
    assert.equal(reportPassed(report, 2), true, report.output);
    assert.equal(report.quality.solutionEvaluation.evaluations[0].cases.length, 2);
    const input = { ...await exportInput(root, parent), verifiedHash: report.sourceHash };
    const destination = await exportVerifiedBundle(input);
    assert.equal(await sourceHash(destination), report.sourceHash);
    assert.equal(await fs.readFile(path.join(destination, 'DELIVERY.md'), 'utf8'), input.deliveryMarkdown);
    assert.equal(await fs.readFile(path.join(destination, file), 'utf8'), '2');
    const runtime = await prepareSolutionRuntime(destination, value.solution.runtime, process.execPath);
    try {
      assert.equal(runtime.provenance.filesHash, report.quality.package.filesHash);
      assert.equal(await runtime.invoke(2), 4);
      assert.equal(await runtime.invoke(3), 6);
    } finally { await runtime.close(); }
  });
}

test('ordinary legacy evidence files remain exportable when no runtime consumes them', async t => {
  const { root, parent } = await workspace(t, { 'index.html': '<p>Legacy app</p>', 'test-report.json': '{"passed":1}', 'review.json': '{"approved":true}', 'DELIVERY.md': 'Old host note.' });
  const input = await exportInput(root, parent), destination = await exportVerifiedBundle(input);
  assert.equal(await fs.readFile(path.join(destination, 'test-report.json'), 'utf8'), '{"passed":1}');
  assert.equal(await fs.readFile(path.join(destination, 'review.json'), 'utf8'), '{"approved":true}');
  assert.equal(await fs.readFile(path.join(destination, 'DELIVERY.md'), 'utf8'), input.deliveryMarkdown);
  assert.equal(await sourceHash(destination), input.verifiedHash);
});
