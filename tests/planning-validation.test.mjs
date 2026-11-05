import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { structuredSolutionFixture, solutionFixture } from '../scripts/solution-fixture.mjs';
import { createPlanningValidationTool, validatePlanningArtifacts } from '../dist-electron/electron/planning-validation.js';
import { loadQualityContract } from '../dist-electron/electron/quality.js';

const acceptance = [{ id: 'R1', requirement: 'Parse a task message and recover from invalid input.', method: 'automated', scenario: 'Parse and review a saved task.' }];

async function setup(t, files = structuredSolutionFixture(['R1'])) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-planning-validation-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  await Promise.all(Object.entries(files).map(([name, body]) => fs.writeFile(path.join(workspace, name), body)));
  return { workspace, tool: createPlanningValidationTool({ workspace, acceptance }), files };
}

async function snapshot(workspace) {
  const names = (await fs.readdir(workspace)).sort();
  return Object.fromEntries(await Promise.all(names.map(async name => [name, await fs.readFile(path.join(workspace, name), 'utf8')])));
}

test('planner preflight uses saved contracts and leaves files, answers and freeze state untouched', async t => {
  const h = await setup(t), before = await snapshot(h.workspace);
  assert.equal(h.tool.name, 'fleet_validate_plan');
  assert.equal(h.tool.annotations.readOnlyHint, true);
  assert.equal(h.tool.parameters.additionalProperties, false);
  const result = await h.tool.execute('validate', {});
  assert.equal(result.isError, false);
  assert.equal(result.details.status, 'passed');
  assert.equal(result.details.readOnly, true);
  assert.deepEqual(result.details.errors, []);
  assert.deepEqual(JSON.parse(result.content[0].text), result.details);
  assert.deepEqual(result.structuredContent, result.details);
  assert.deepEqual(await snapshot(h.workspace), before);
  const validated = await validatePlanningArtifacts(h.workspace, acceptance);
  const loaded = await loadQualityContract(h.workspace, acceptance, true, { requireStructuredUi: true });
  assert.deepEqual(validated, loaded);
  assert.equal(validated.sealedEvaluation, undefined);
  assert.ok(validated.evaluationBody.includes('inspect pump'));
  assert.match(result.details.nextStep, /required planning documents/);
  assert.deepEqual(await snapshot(h.workspace), before);
});

test('missing and incorrectly typed persistentElements report the exact saved artifact before completion', async t => {
  for (const [name, value] of [['omitted', undefined], ['array', ['Header']], ['empty', ''], ['blank', '  '], ['too long', 'x'.repeat(4001)]]) {
    await t.test(name, async t => {
      const h = await setup(t), ux = JSON.parse(h.files['ux-spec.json']);
      ux.structure.persistentElements = value;
      await fs.writeFile(path.join(h.workspace, 'ux-spec.json'), JSON.stringify(ux));
      const before = await snapshot(h.workspace), result = await h.tool.execute('invalid', {});
      assert.equal(result.isError, true);
      assert.equal(result.details.status, 'failed');
      assert.equal(result.details.errors.length, 1);
      assert.match(result.details.errors[0], /^ux-spec\.json: structure\.persistentElements must be a nonempty string of at most 4000 characters\./);
      assert.match(result.details.nextStep, /call fleet_validate_plan again/);
      assert.deepEqual(await snapshot(h.workspace), before);
      await assert.rejects(validatePlanningArtifacts(h.workspace, acceptance), /structure\.persistentElements/);
      ux.structure.persistentElements = 'The header remains visible and the entered message survives view changes.';
      await fs.writeFile(path.join(h.workspace, 'ux-spec.json'), JSON.stringify(ux));
      assert.equal((await h.tool.execute('corrected', {})).details.status, 'passed');
    });
  }
});

test('preflight applies strict browser UX, public invocation, recovery and foundation runtime checks', async t => {
  const cases = [
    { name: 'legacy browser UX', files: solutionFixture(['R1']), error: /schemaVersion 2/ },
    { name: 'missing public invocation', file: 'solution-contract.json', edit: value => { delete value.invocation; }, error: /solution-contract\.json requires invocation/ },
    { name: 'missing recovery success', file: 'acceptance-plan.json', edit: value => {
      const recovery = value.journeys.find(journey => journey.kind === 'recovery');
      recovery.steps = recovery.steps.slice(0, 4);
    }, error: /recovery must act/ },
    { name: 'mismatched foundation runtime', file: 'foundation-plan.json', edit: value => { value.templateId = 'node-service'; }, error: /runtime does not match the selected foundation/ },
    { name: 'invalid foundation', file: 'foundation-plan.json', edit: value => { value.version = 'latest'; }, error: /Invalid foundation plan/ },
  ];
  for (const item of cases) await t.test(item.name, async t => {
    const files = item.files ?? structuredSolutionFixture(['R1']);
    if (item.file) { const value = JSON.parse(files[item.file]); item.edit(value); files[item.file] = JSON.stringify(value); }
    const h = await setup(t, files), before = await snapshot(h.workspace);
    await assert.rejects(validatePlanningArtifacts(h.workspace, acceptance), item.error);
    const result = await h.tool.execute('invalid', {});
    assert.equal(result.isError, true);
    assert.match(result.details.errors[0], item.error);
    assert.deepEqual(await snapshot(h.workspace), before);
  });
});

test('preflight cannot accept caller-supplied contracts or a different workspace', async t => {
  const h = await setup(t);
  await fs.rm(path.join(h.workspace, 'ux-spec.json'));
  const result = await h.tool.execute('missing', {});
  assert.equal(result.isError, true);
  assert.match(result.details.errors[0], /Missing required quality contract: ux-spec\.json/);
  const parameters = await h.tool.execute('override', { workspace: '/another/workspace', contract: h.files });
  assert.equal(parameters.isError, true);
  assert.match(parameters.details.errors[0], /takes an empty object/);
});

test('cancellation propagates instead of becoming a misleading validation failure', async t => {
  const h = await setup(t), controller = new AbortController();
  controller.abort(new Error('Planning cancelled'));
  await assert.rejects(h.tool.execute('aborted', {}, controller.signal), /Planning cancelled/);
  const tool = createPlanningValidationTool({ workspace: h.workspace, acceptance, signal: controller.signal });
  await assert.rejects(tool.execute('aborted-session', {}), /Planning cancelled/);
});
