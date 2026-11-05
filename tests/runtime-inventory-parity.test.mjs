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
import { assertExecutableSource, stageExecutable } from '../dist-electron/electron/executable.js';
import { runtimeFilesHash } from '../dist-electron/electron/visual-review.js';
import { assertRuntimeSourceFiles } from '../dist-electron/shared/runtime-artifacts.js';
import { listArtifacts, sourceHash } from '../dist-electron/electron/storage.js';
import { reportPassed } from '../dist-electron/shared/verification.js';

const diagnostic = /artifact inventory/i;
const acceptance = [{ id: 'R1', requirement: 'Multiply by the bundled coefficient.', method: 'automated', scenario: 'Independent scalar examples.' }];
const ux = { schemaVersion: 1, audience: 'CLI users', primaryTask: 'Multiply input', successOutcome: 'Correct JSON output',
  screens: [{ name: 'CLI', purpose: 'Enter a number', primaryAction: 'Run the command' }],
  states: { empty: 'Explain input', loading: 'Wait for result', error: 'Explain invalid input', success: 'Return result' },
  persistence: 'Read the bundled coefficient.', recovery: 'Correct invalid input.', keyboard: 'Standard terminal input.' };
const ignoredPaths = ['.pi/coefficient.json', 'data/.pi/coefficient.json', '.DS_Store', 'data/.DS_Store',
  '.PI/coefficient.json', 'data/.ds_store/coefficient.json', '.git/data.json', 'data/node_modules/pkg/value.json'];

function fixture(file = 'data/review.json') {
  const solution = { schemaVersion: 1, objective: 'Multiply by a bundled coefficient.',
    invocation: { input: 'A finite number.', output: 'A finite number.', rules: ['Multiply the supplied value by the bundled coefficient, which is two.'] },
    capabilities: [{ id: 'multiply', kind: 'algorithm', description: 'Multiply using bundled data.', criterionIds: ['R1'], required: true, evaluationIds: ['reference'] }],
    runtime: { profile: 'cli', files: ['engine.mjs', file], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } };
  const plan = { schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Independent multiplication examples match.', journeyIds: [], capabilityIds: ['multiply'] }], journeys: [] };
  const evaluation = { schemaVersion: 1, evaluations: [{ id: 'reference', capabilityId: 'multiply', description: 'Independent scalar examples.',
    dataset: { name: 'coefficients', version: '1', provenance: 'synthetic' }, evaluator: 'exact', threshold: 1, trials: 1,
    cases: [{ id: 'two', input: 2, expected: 4 }, { id: 'three', input: 3, expected: 6 }] }] };
  const engine = `import { readFileSync } from 'node:fs'; const input=JSON.parse(readFileSync(0,'utf8')); console.log(JSON.stringify(input*Number(readFileSync(${JSON.stringify(file)},'utf8'))));`;
  const tests = `import test from 'node:test'; import assert from 'node:assert/strict'; import {readFileSync} from 'node:fs'; test('bundled coefficient',()=>assert.equal(Number(readFileSync(${JSON.stringify(file)},'utf8')),2));`;
  return { solution, plan, evaluation, files: { 'solution-contract.json': JSON.stringify(solution), 'acceptance-plan.json': JSON.stringify(plan),
    'evaluation-plan.json': JSON.stringify(evaluation), 'ux-spec.json': JSON.stringify(ux), 'engine.mjs': engine, 'engine.test.mjs': tests, [file]: '2' } };
}

async function workspace(t, files = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-inventory-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'workspace'), parent = path.join(directory, 'exports');
  await fs.mkdir(root); await fs.mkdir(parent);
  for (const [relative, body] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await fs.writeFile(path.join(root, relative), body);
  }
  return { directory, root, parent };
}

const exportInput = async (root, parent) => ({ workspace: root, parent, title: 'Coefficient multiplier',
  verifiedHash: await sourceHash(root), deliveryMarkdown: '# Approved prototype\nFollow README.md.' });

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

test('saved runtime validation reserves complete ignored path segments with portable case and separators', () => {
  for (const file of ['.pi', 'data/.PI', 'data/.git/config', 'data/.GIT/config', 'node_modules',
    'data/Node_Modules/package/file.json', '.DS_Store/data.json', 'data/.ds_store/data.json',
    'data\\.pi\\value.json', 'data\\.GIT\\config', 'data\\NODE_MODULES\\pkg\\value.json', 'data\\.ds_store\\value.json']) {
    const files = ['engine.mjs', file], original = [...files];
    assert.throws(() => assertRuntimeSourceFiles(files), diagnostic, file);
    assert.deepEqual(files, original, 'Saved manifest validation must be read-only.');
  }
  assert.doesNotThrow(() => assertRuntimeSourceFiles(['engine.mjs', '.config/data.json', 'data/review.json',
    'data/.pi-notes.json', 'data/.DS_Store-backup', 'data/node_modules.json', 'data/my.git/value.json']));
});

for (const file of ignoredPaths) {
  test('ordinary and shared candidate plans exclude inventory-ignored path ' + file, () => {
    const value = fixture(file), before = structuredClone(value.solution);
    // .git and node_modules were already rejected by the portable-path parser.
    const planDiagnostic = /artifact inventory|relative portable file path/i;
    assert.throws(() => parseSolutionContract(value.solution, acceptance), planDiagnostic);
    const { behavior, execution } = sharedContracts(value);
    assert.throws(() => parseCandidateExecutionContract(execution, behavior, acceptance), planDiagnostic);
    assert.deepEqual(value.solution, before, 'Validation cannot rewrite the planned manifest.');
  });
}

test('quality plan loading rejects ignored runtime data before sealing the evaluation plan', async t => {
  const value = fixture('.pi/coefficient.json'), { root } = await workspace(t, value.files);
  await assert.rejects(loadQualityContract(root, acceptance, true), diagnostic);
  assert.equal(await fs.readFile(path.join(root, 'evaluation-plan.json'), 'utf8'), JSON.stringify(value.evaluation));
  assert.equal(await fs.readFile(path.join(root, '.pi/coefficient.json'), 'utf8'), '2');
});

for (const [name, prepare] of [['ordinary', prepareSolutionRuntime], ['isolated', prepareIsolatedSolutionRuntime]]) {
  for (const file of ['.pi/coefficient.json', 'data/.DS_Store', 'data/node_modules/pkg/value.json']) {
    test(name + ' runtime rejects historical inventory-ignored path ' + file, async t => {
      const { root } = await workspace(t, { 'engine.mjs': 'export function invoke(input) { return input; }', [file]: '2' });
      await assert.rejects(async () => {
        const runtime = await prepare(root, fixture(file).solution.runtime, process.execPath);
        await runtime.close();
      }, file.includes('/node_modules/') ? /artifact inventory|Invalid (?:runtime file|isolated package path)/i : diagnostic);
      assert.equal(await fs.readFile(path.join(root, file), 'utf8'), '2');
    });
  }
}

for (const mode of ['saved solution', 'experiment reference']) {
  for (const file of ['.pi/coefficient.json', 'data/.DS_Store', '.PI/coefficient.json', 'data/node_modules/pkg/value.json']) {
    test(mode + ' export rejects inventory-ignored runtime data ' + file + ' before copying', async t => {
      const value = fixture(file), files = { 'engine.mjs': value.files['engine.mjs'], [file]: '2' };
      if (mode === 'saved solution') files['solution-contract.json'] = JSON.stringify(value.solution);
      const { root, parent } = await workspace(t, files), input = await exportInput(root, parent);
      if (mode === 'experiment reference') input.reference = { runtime: value.solution.runtime, operations: [],
        experiment: { experimentId: 'example', candidateId: 'candidate', behaviorHash: 'a'.repeat(64), evaluationSetHash: 'b'.repeat(64), executionHash: 'c'.repeat(64) } };
      let copies = 0;
      await assert.rejects(exportVerifiedBundle(input, undefined, async (from, to) => { copies++; await fs.copyFile(from, to); }), diagnostic);
      assert.equal(copies, 0, 'An incomplete declared application must be rejected before delivery copying starts.');
      assert.deepEqual(await fs.readdir(parent), []);
      assert.equal(await sourceHash(root), input.verifiedHash);
      assert.equal(await fs.readFile(path.join(root, file), 'utf8'), '2');
    });
  }
}

for (const file of ['.pi/coefficient.json', 'data/.DS_Store']) {
  test('historical executable source rejects inventory-ignored path ' + file, async t => {
    const value = fixture(file);
    value.solution.runtime = { profile: 'browser', entrypoint: 'index.html', files: ['index.html', 'engine.mjs', file], requiredEnv: [], evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
    const { root, parent } = await workspace(t, { 'index.html': '<p>Multiplier</p>', 'engine.mjs': 'console.log(4);', [file]: '2',
      'solution-contract.json': JSON.stringify(value.solution), '.fleet/packet.json': JSON.stringify({ acceptance }) });
    // Synthetic accepted evidence isolates saved executable preflight/staging.
    // Real clean verification and delivery are exercised by the controls below.
    const project = { id: 'inventory-fixture', title: 'Multiplier', workspace: root, status: 'approved', approvedAt: new Date().toISOString(),
      report: { exitCode: 0, passed: 1, total: 1, failed: 0, skipped: 0, sourceHash: await sourceHash(root) } };
    await assert.rejects(assertExecutableSource(project), diagnostic);
    await assert.rejects(stageExecutable(project, parent), diagnostic);
    assert.deepEqual(await fs.readdir(parent), []);
  });
}

for (const file of ['.pi/coefficient.json', 'data/.DS_Store']) {
  test('historical visual evidence cannot fingerprint inventory-ignored runtime data ' + file, async t => {
    const { root } = await workspace(t, { 'engine.mjs': 'console.log(4);', [file]: '2' });
    await assert.rejects(runtimeFilesHash(root, fixture(file).solution.runtime), diagnostic);
    assert.equal(await fs.readFile(path.join(root, file), 'utf8'), '2');
  });
}

for (const file of ['data/review.json', '.config/coefficient.json', 'data/.pi-notes.json']) {
  test('ordinary application data ' + file + ' is hashed, verified and delivered intact', async t => {
    const value = fixture(file), { root, parent } = await workspace(t, value.files);
    const contract = await loadQualityContract(root, acceptance, true);
    const report = await verifyApplication(root, process.execPath, contract);
    assert.equal(reportPassed(report, 2), true, report.output);
    assert.equal(report.quality.solutionEvaluation.evaluations[0].cases.length, 2);
    assert.equal(await runtimeFilesHash(root, value.solution.runtime), report.quality.package.filesHash);
    await fs.writeFile(path.join(root, file), '9');
    assert.notEqual(await sourceHash(root), report.sourceHash, 'Changing declared application data invalidates its approved fingerprint.');
    await fs.writeFile(path.join(root, file), '2');
    const input = { ...await exportInput(root, parent), verifiedHash: report.sourceHash };
    const destination = await exportVerifiedBundle(input);
    assert.equal(await sourceHash(destination), report.sourceHash);
    assert.equal(await fs.readFile(path.join(destination, file), 'utf8'), '2');
    const runtime = await prepareSolutionRuntime(destination, value.solution.runtime, process.execPath);
    try {
      assert.equal(runtime.provenance.filesHash, report.quality.package.filesHash);
      assert.equal(await runtime.invoke(2), 4);
      assert.equal(await runtime.invoke(3), 6);
    } finally { await runtime.close(); }
  });
}

test('undeclared agent metadata remains omitted from source exports', async t => {
  const { root, parent } = await workspace(t, { 'index.html': '<p>Legacy app</p>', '.pi/private.json': 'agent state', '.DS_Store': 'filesystem metadata' });
  const input = await exportInput(root, parent), destination = await exportVerifiedBundle(input);
  assert.deepEqual((await listArtifacts(destination)).map(file => file.path), ['DELIVERY.md', 'index.html']);
  await assert.rejects(fs.access(path.join(destination, '.pi')), { code: 'ENOENT' });
  await assert.rejects(fs.access(path.join(destination, '.DS_Store')), { code: 'ENOENT' });
  assert.equal(await sourceHash(destination), input.verifiedHash);
});
