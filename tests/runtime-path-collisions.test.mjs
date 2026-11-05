import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseSolutionContract } from '../dist-electron/harness/solution-contract.js';
import { parseBehavioralContract, parseCandidateExecutionContract, experimentContractHash } from '../dist-electron/harness/experiment-contract.js';
import { loadQualityContract } from '../dist-electron/electron/quality.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { prepareIsolatedSolutionRuntime } from '../dist-electron/electron/isolated-solution-runtime.js';
import { runtimeFilesHash } from '../dist-electron/electron/visual-review.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { assertRuntimeSourceFiles } from '../dist-electron/shared/runtime-artifacts.js';

// Anchor the host diagnostic: an ENOENT containing the fixture directory's
// "collisions" name must not count as early manifest validation.
const collisionDiagnostic = /^(?:Error: )?(?:Runtime file path conflict:|Runtime files cannot contain case-insensitive path collisions:|runtime\.files (?:contains duplicate values|cannot contain case-insensitive path collisions)\.)/i;
const acceptance = [{ id: 'R1', requirement: 'Multiply by the bundled coefficient.', method: 'automated', scenario: 'Independent scalar examples.' }];
const ux = { schemaVersion: 1, audience: 'CLI users', primaryTask: 'Multiply input', successOutcome: 'Correct JSON output',
  screens: [{ name: 'CLI', purpose: 'Enter a number', primaryAction: 'Run the command' }],
  states: { empty: 'Explain input', loading: 'Wait for result', error: 'Explain invalid input', success: 'Return result' },
  persistence: 'Read the bundled coefficient.', recovery: 'Correct invalid input.', keyboard: 'Standard terminal input.' };
const conflicts = [
  { name: 'ancestor before descendant', paths: ['assets', 'assets/data.json'] },
  { name: 'descendant before ancestor', paths: ['assets/data.json', 'assets'] },
  { name: 'nested file and descendant', paths: ['assets/config', 'assets/config/data.json'] },
  { name: 'case-folded root ancestor', paths: ['Assets', 'assets/data.json'] },
  { name: 'case-folded nested ancestor in reverse order', paths: ['data/config/value.json', 'DATA/CONFIG'] },
  { name: 'three levels of file ancestors', paths: ['assets/data/value.json', 'assets', 'assets/data'] },
  { name: 'exact duplicate', paths: ['data/value.json', 'data/value.json'] },
  { name: 'case-folded duplicate', paths: ['Data/value.json', 'data/VALUE.json'] },
];
const controls = [
  ['engine.mjs', 'assets/a.json', 'assets/b.json', 'assets/deep/value.json'],
  ['engine.mjs', 'assets', 'assets-data.json', 'assets2/data.json'],
  ['engine.mjs', 'data/value', 'data/value.json'],
  ['engine.mjs', 'Assets/a.json', 'assets/b.json'],
];

function fixture(files = ['engine.mjs', 'assets/data/coefficient.json', 'assets/data/label.txt']) {
  const solution = { schemaVersion: 1, objective: 'Multiply by a bundled coefficient.',
    invocation: { input: 'A finite number.', output: 'A finite number.', rules: ['Multiply the supplied value by the bundled coefficient, which is two.'] },
    capabilities: [{ id: 'multiply', kind: 'algorithm', description: 'Multiply using bundled data.', criterionIds: ['R1'], required: true, evaluationIds: ['reference'] }],
    runtime: { profile: 'cli', files, requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } };
  const plan = { schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Independent multiplication examples match.', journeyIds: [], capabilityIds: ['multiply'] }], journeys: [] };
  const evaluation = { schemaVersion: 1, evaluations: [{ id: 'reference', capabilityId: 'multiply', description: 'Independent scalar examples.',
    dataset: { name: 'coefficients', version: '1', provenance: 'synthetic' }, evaluator: 'exact', threshold: 1, trials: 1,
    cases: [{ id: 'two', input: 2, expected: 4 }, { id: 'three', input: 3, expected: 6 }] }] };
  return { solution, plan, evaluation, documents: { 'solution-contract.json': JSON.stringify(solution),
    'acceptance-plan.json': JSON.stringify(plan), 'evaluation-plan.json': JSON.stringify(evaluation), 'ux-spec.json': JSON.stringify(ux) } };
}

function candidate(value) {
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

async function workspace(t, files = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-path-collisions-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'workspace'), parent = path.join(directory, 'exports');
  await fs.mkdir(root); await fs.mkdir(parent);
  for (const [relative, body] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await fs.writeFile(path.join(root, relative), body);
  }
  return { directory, root, parent };
}

for (const conflict of conflicts) {
  test('saved runtime file guard rejects ' + conflict.name + ' without rewriting paths', () => {
    const files = Object.freeze(['engine.mjs', ...conflict.paths]), original = [...files];
    assert.throws(() => assertRuntimeSourceFiles(files), error => {
      assert.match(error.message, collisionDiagnostic);
      // A two-path failure should identify both names for a useful plan repair.
      if (conflict.paths.length === 2) for (const name of conflict.paths) assert.ok(error.message.includes(name), error.message);
      return true;
    });
    assert.deepEqual(files, original);
  });
}

test('ordinary and candidate planning reject every runtime path conflict before freezing', () => {
  for (const conflict of conflicts) {
    const value = fixture(['engine.mjs', ...conflict.paths]), original = structuredClone(value.solution);
    assert.throws(() => parseSolutionContract(value.solution, acceptance), collisionDiagnostic, conflict.name);
    const { behavior, execution } = candidate(value);
    assert.throws(() => parseCandidateExecutionContract(execution, behavior, acceptance), collisionDiagnostic, conflict.name);
    assert.deepEqual(value.solution, original, 'Planning validation must not normalize or reorder source paths.');
  }
});

test('shared directories and filename prefixes remain valid in saved and planned runtimes', () => {
  for (const files of controls) {
    const original = [...files];
    assert.doesNotThrow(() => assertRuntimeSourceFiles(Object.freeze(files)));
    const value = fixture(files), { behavior, execution } = candidate(value);
    assert.deepEqual(parseSolutionContract(value.solution, acceptance).runtime.files, original);
    assert.deepEqual(parseCandidateExecutionContract(execution, behavior, acceptance).runtime.files, original);
    assert.deepEqual(files, original);
  }
});

test('quality plan loading rejects file ancestors before evaluation sealing can begin', async t => {
  const value = fixture(['engine.mjs', 'assets', 'assets/data.json']), { root } = await workspace(t, value.documents);
  await assert.rejects(loadQualityContract(root, acceptance, true), collisionDiagnostic);
  assert.equal(await fs.readFile(path.join(root, 'evaluation-plan.json'), 'utf8'), JSON.stringify(value.evaluation));
  assert.equal(await fs.readFile(path.join(root, 'solution-contract.json'), 'utf8'), JSON.stringify(value.solution));
});

const boundaryConflicts = [conflicts[0], conflicts[1], conflicts[3], conflicts[7]];
for (const [name, boundary] of [
  ['ordinary preparation', (root, manifest) => prepareSolutionRuntime(root, manifest, process.execPath)],
  ['isolated preparation', (root, manifest) => prepareIsolatedSolutionRuntime(root, manifest, process.execPath)],
  ['visual runtime fingerprinting', runtimeFilesHash],
]) {
  for (const conflict of boundaryConflicts) {
    test(name + ' rejects ' + conflict.name + ' before reading source files', async t => {
      const { directory } = await workspace(t), missing = path.join(directory, 'missing-source');
      const manifest = fixture(['engine.mjs', ...conflict.paths]).solution.runtime;
      await assert.rejects(fs.access(missing), { code: 'ENOENT' });
      await assert.rejects(async () => {
        const result = await boundary(missing, manifest);
        if (typeof result !== 'string') await result.close();
      }, collisionDiagnostic);
      await assert.rejects(fs.access(missing), { code: 'ENOENT' });
    });
  }
}

for (const mode of ['saved solution', 'experiment reference']) {
  test(mode + ' export rejects path conflicts before creating a delivery or copying files', async t => {
    for (const conflict of [conflicts[0], conflicts[3], conflicts[7]]) {
      const value = fixture(['engine.mjs', ...conflict.paths]);
      const files = { 'engine.mjs': 'console.log(4);', assets: 'This is an ordinary file.' };
      if (mode === 'saved solution') files['solution-contract.json'] = JSON.stringify(value.solution);
      const { root, parent } = await workspace(t, files);
      const input = { workspace: root, parent, title: 'Multiplier', verifiedHash: await sourceHash(root), deliveryMarkdown: '# Multiplier\n' };
      if (mode === 'experiment reference') input.reference = { runtime: value.solution.runtime, operations: [],
        experiment: { experimentId: 'example', candidateId: 'candidate', behaviorHash: 'a'.repeat(64), evaluationSetHash: 'b'.repeat(64), executionHash: 'c'.repeat(64) } };
      // The hash is a synthetic fixture: it isolates delivery validation without
      // implying that an impossible runtime passed real application verification.
      let copies = 0;
      await assert.rejects(exportVerifiedBundle(input, undefined, async (from, to) => {
        copies++;
        await fs.copyFile(from, to);
      }), collisionDiagnostic, conflict.name);
      assert.equal(copies, 0);
      assert.deepEqual(await fs.readdir(parent), []);
      assert.equal(await sourceHash(root), input.verifiedHash);
    }
  });
}

test('a valid nested CLI prepares and invokes using both sibling data files', async t => {
  const value = fixture();
  const engine = `import { readFileSync } from 'node:fs';
const input = JSON.parse(readFileSync(0, 'utf8'));
const coefficient = Number(readFileSync('assets/data/coefficient.json', 'utf8'));
const label = readFileSync('assets/data/label.txt', 'utf8');
console.log(JSON.stringify({ value: input * coefficient, label }));`;
  const { root } = await workspace(t, { 'engine.mjs': engine, 'assets/data/coefficient.json': '2', 'assets/data/label.txt': 'multiplied' });
  const manifest = parseSolutionContract(value.solution, acceptance).runtime;
  const runtime = await prepareSolutionRuntime(root, manifest, process.execPath);
  try {
    assert.deepEqual(await runtime.invoke(3), { value: 6, label: 'multiplied' });
    assert.deepEqual(await runtime.invoke(7), { value: 14, label: 'multiplied' });
    assert.equal(await runtimeFilesHash(root, manifest), runtime.provenance.filesHash);
    await runtime.assertIntegrity();
  } finally { await runtime.close(); }
});
