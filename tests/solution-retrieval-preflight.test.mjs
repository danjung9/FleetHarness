import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { solutionFixture } from '../scripts/solution-fixture.mjs';
import { loadQualityContract, sealEvaluationPlan } from '../dist-electron/electron/quality.js';
import { parseExperimentEvaluationPlan } from '../dist-electron/harness/experiment-contract.js';

const acceptance = [{ id: 'R1', requirement: 'Retrieve supplied permitted evidence.', method: 'automated', scenario: 'Find evidence or abstain.' }];
function retrievalFixture() {
  const files = solutionFixture(['R1']);
  const solution = JSON.parse(files['solution-contract.json']);
  solution.objective = 'Retrieve supplied permitted evidence.';
  solution.capabilities[0].kind = 'retrieval';
  solution.capabilities[0].description = 'Find evidence with exact citations, or abstain.';
  solution.invocation = { input: 'Object with query and documents.', output: 'Object with results containing document IDs and exact excerpts.', rules: ['Return relevant supplied documents; exclude documents with approved false; return empty results when there is no relevant evidence.'] };
  files['solution-contract.json'] = JSON.stringify(solution);
  const evaluation = JSON.parse(files['evaluation-plan.json']);
  evaluation.evaluations[0].evaluator = 'retrieval';
  evaluation.evaluations[0].cases = [
    { id: 'known', input: { query: 'pump', documents: [{ id: 'known', text: 'Inspect pump', approved: true }] }, expected: { ids: ['missing'] } },
    { id: 'abstain', input: { query: 'valve', documents: [] }, expected: { ids: [] } }
  ];
  files['evaluation-plan.json'] = JSON.stringify(evaluation);
  return { files, evaluation, solution };
}

test('host contract loading rejects an impossible retrieval key before sealing and accepts a corrected plan', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-retrieval-preflight-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const workspace = path.join(directory, 'workspace'), hostKey = path.join(directory, 'host-key.json');
  await fs.mkdir(workspace);
  const { files, evaluation } = retrievalFixture();
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), body);
  await assert.rejects(loadQualityContract(workspace, acceptance, true), /evaluations\[0\]\.cases\[0\]\.expected\.ids\[0\].*absent or excluded/);
  assert.equal(await fs.readFile(path.join(workspace, 'evaluation-plan.json'), 'utf8'), files['evaluation-plan.json'], 'Invalid planning output stays available for correction.');
  await assert.rejects(fs.access(hostKey), /ENOENT/);

  evaluation.evaluations[0].cases[0].expected.ids = ['known'];
  const corrected = JSON.stringify(evaluation);
  await fs.writeFile(path.join(workspace, 'evaluation-plan.json'), corrected);
  const contract = await loadQualityContract(workspace, acceptance, true);
  await sealEvaluationPlan(workspace, contract, hostKey);
  assert.equal(contract.sealedEvaluation, true);
  assert.equal(await fs.readFile(hostKey, 'utf8'), corrected, 'Only corrected expectations are sealed.');
  await assert.rejects(fs.access(path.join(workspace, 'evaluation-plan.json')), /ENOENT/);
});

test('shared experiment planning rejects the same impossible retrieval fixtures', () => {
  const { evaluation, solution } = retrievalFixture();
  assert.throws(() => parseExperimentEvaluationPlan(evaluation, solution), /expected\.ids\[0\].*absent or excluded/);
  evaluation.evaluations[0].cases[0].expected.ids = ['known'];
  assert.deepEqual(parseExperimentEvaluationPlan(evaluation, solution), evaluation);
  evaluation.evaluations[0].cases[0].input.documents[0].approved = false;
  assert.throws(() => parseExperimentEvaluationPlan(evaluation, solution), /expected\.ids\[0\].*absent or excluded/);
});
