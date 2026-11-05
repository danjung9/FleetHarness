import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { solutionFixture } from '../scripts/solution-fixture.mjs';
import { parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';
import { parseExperimentEvaluationPlan } from '../dist-electron/harness/experiment-contract.js';
import { loadQualityContract, sealEvaluationPlan } from '../dist-electron/electron/quality.js';
import { scoreSolutionOutput, runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';

const acceptance = [{ id: 'R1', requirement: 'Schedule supplied work within constraints.', method: 'automated', scenario: 'Schedule feasible work and report infeasible work.' }];
const options = { evaluator: 'schedule' };
const inputFixture = () => ({
  windows: [{ start: 0, end: 180 }],
  people: [{ id: 'person', qualifications: ['qualified'], windows: [{ start: 0, end: 180 }], maxMinutes: 100, restMinutes: 10 }],
  requests: [
    { id: 'first', duration: 30, starts: [0], people: ['person'], resources: ['room'], qualifications: ['qualified'] },
    { id: 'second', duration: 30, starts: [30, 40], people: ['person'], resources: ['room'], qualifications: ['qualified'] }
  ]
});
const outputFixture = () => ({ status: 'feasible', assignments: [
  { id: 'first', start: 0, end: 30, people: ['person'], resources: ['room'] },
  { id: 'second', start: 40, end: 70, people: ['person'], resources: ['room'] }
] });

function scheduleFixture(input = inputFixture(), status = 'feasible') {
  const files = solutionFixture(['R1']), solution = JSON.parse(files['solution-contract.json']);
  solution.objective = 'Schedule supplied work within constraints.';
  solution.capabilities[0].kind = 'optimization';
  solution.capabilities[0].description = 'Find a schedule satisfying the supplied constraints.';
  solution.invocation = {
    input: 'Object with operational windows, people and requests using nonnegative integer minutes.',
    output: 'Object containing status feasible or infeasible and assignments when feasible.',
    rules: ['Cover each request exactly once and respect candidate starts, duration, availability, qualifications, personnel rest, duty budgets and shared resources.']
  };
  const evaluation = JSON.parse(files['evaluation-plan.json']);
  evaluation.evaluations[0].evaluator = 'schedule';
  evaluation.evaluations[0].cases = [
    { id: 'work', input, expected: { status } },
    { id: 'no-work', input: { windows: [{ start: 0, end: 1 }], people: [], requests: [] }, expected: { status: 'feasible' } }
  ];
  files['solution-contract.json'] = JSON.stringify(solution);
  files['evaluation-plan.json'] = JSON.stringify(evaluation);
  return { files, solution, evaluation };
}

function assertInvalidInput(input, field, label) {
  for (const status of ['feasible', 'infeasible']) {
    const { evaluation, solution } = scheduleFixture(input, status);
    assert.throws(() => parseEvaluationPlan(evaluation, solution), error => {
      assert.ok(error.message.includes(`evaluations[0].cases[0].${field}`), `${label}: ${error.message}`);
      return true;
    }, `${label}: ${status} fixture must not freeze`);
    const result = scoreSolutionOutput(options, input, status === 'feasible' ? outputFixture() : { status }, { status });
    assert.equal(result.score, 0, `${label}: ${status} score`);
    assert.equal(result.fatal, true, `${label}: ${status} must fail independently of status`);
    assert.ok(result.detail.includes(field), `${label}: ${result.detail}`);
  }
}

test('schedule planning and scoring reject missing or malformed fixture containers for either status', () => {
  for (const input of [null, [], 1, {}, { people: 'not-an-array' }]) assertInvalidInput(input, 'input', JSON.stringify(input));
  for (const field of ['windows', 'people', 'requests']) for (const value of [undefined, null, {}, 'invalid']) {
    const input = inputFixture();
    if (value === undefined) delete input[field]; else input[field] = value;
    assertInvalidInput(input, `input.${field}`, `${field} container`);
  }
});

test('schedule fixtures reject malformed windows, identities, references and string collections before freezing', () => {
  const cases = [
    ['input.windows[0]', input => { input.windows[0] = null; }],
    ['input.windows[0]', input => { input.windows[0].end = input.windows[0].start; }],
    ['input.people[0]', input => { input.people[0] = null; }],
    ['input.people[0].id', input => { input.people[0].id = 12; }],
    ['input.people[1].id', input => { input.people.push(structuredClone(input.people[0])); }],
    ['input.people[0].windows', input => { input.people[0].windows = null; }],
    ['input.people[0].windows[0]', input => { input.people[0].windows[0] = {}; }],
    ['input.people[0].qualifications', input => { input.people[0].qualifications = 'qualified'; }],
    ['input.people[0].qualifications', input => { input.people[0].qualifications = ['qualified', 'qualified']; }],
    ['input.people[0].qualifications', input => { input.people[0].qualifications = [null]; }],
    ['input.requests[0]', input => { input.requests[0] = null; }],
    ['input.requests[0].id', input => { input.requests[0].id = 12; }],
    ['input.requests[1].id', input => { input.requests[1].id = input.requests[0].id; }],
    ['input.requests[0].starts', input => { input.requests[0].starts = '0'; }],
    ['input.requests[0].people[0]', input => { input.requests[0].people = ['absent-person']; }]
  ];
  for (const field of ['people', 'resources', 'qualifications']) for (const value of [null, 'invalid', [1], ['duplicate', 'duplicate']]) {
    cases.push([`input.requests[0].${field}`, input => { input.requests[0][field] = value; }]);
  }
  for (const [field, mutate] of cases) {
    const input = inputFixture(); mutate(input);
    assertInvalidInput(input, field, field);
  }
});

test('schedule minute fields require finite nonnegative safe integers and positive duration', () => {
  const fields = [
    ['input.windows[0].start', (input, value) => { input.windows[0].start = value; }],
    ['input.windows[0].end', (input, value) => { input.windows[0].end = value; }],
    ['input.people[0].windows[0].start', (input, value) => { input.people[0].windows[0].start = value; }],
    ['input.people[0].windows[0].end', (input, value) => { input.people[0].windows[0].end = value; }],
    ['input.people[0].maxMinutes', (input, value) => { input.people[0].maxMinutes = value; }],
    ['input.people[0].restMinutes', (input, value) => { input.people[0].restMinutes = value; }],
    ['input.requests[0].duration', (input, value) => { input.requests[0].duration = value; }],
    ['input.requests[0].starts[0]', (input, value) => { input.requests[0].starts[0] = value; }]
  ];
  for (const [field, mutate] of fields) for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '30']) {
    const input = inputFixture(); mutate(input, value);
    assertInvalidInput(input, field, `${field} = ${String(value)}`);
  }
  const zeroDuration = inputFixture(); zeroDuration.requests[0].duration = 0;
  assertInvalidInput(zeroDuration, 'input.requests[0].duration', 'zero duration');
});

test('schedule fixture diagnostics locate invalid references without disclosing supplied IDs', () => {
  const secret = 'private-person-identifier-must-not-appear', input = inputFixture();
  input.requests[1].people = [secret];
  const { evaluation, solution } = scheduleFixture(input, 'infeasible');
  assert.throws(() => parseEvaluationPlan(evaluation, solution), error => {
    assert.match(error.message, /evaluations\[0\]\.cases\[0\]\.input\.requests\[1\]\.people\[0\]/);
    assert.equal(error.message.includes(secret), false);
    return true;
  });
  const result = scoreSolutionOutput(options, input, { status: 'infeasible' }, { status: 'infeasible' });
  assert.equal(result.fatal, true);
  assert.match(result.detail, /input\.requests\[1\]\.people\[0\]/);
  assert.equal(result.detail.includes(secret), false);
});

test('well-formed schedule fixtures retain metadata, duplicate candidate starts and unrestricted string IDs', () => {
  const input = inputFixture(), output = outputFixture();
  input.context = { location: 'example', arbitrary: true };
  input.people[0].id = ''; input.people[0].note = 'extra metadata';
  input.requests[0].id = 'request with punctuation /'; output.assignments[0].id = input.requests[0].id;
  for (const request of input.requests) request.people = [''];
  for (const assignment of output.assignments) assignment.people = [''];
  input.requests[0].starts.push(0);
  const { evaluation, solution } = scheduleFixture(input), before = structuredClone(evaluation);
  assert.deepEqual(parseEvaluationPlan(evaluation, solution), before);
  assert.deepEqual(evaluation, before, 'Planning validation must not rewrite fixtures.');
  assert.equal(scoreSolutionOutput(options, input, output, { status: 'feasible' }).score, 1);
});

test('empty and resource-only schedules remain valid feasible cases', () => {
  const inputs = [
    { windows: [], people: [], requests: [] },
    { windows: [{ start: 0, end: 60 }], people: [], requests: [{ id: 'resource-work', duration: 30, starts: [0], people: [], resources: ['room'], qualifications: [] }] }
  ];
  for (const input of inputs) {
    const { evaluation, solution } = scheduleFixture(input);
    assert.deepEqual(parseEvaluationPlan(evaluation, solution), evaluation);
    const assignments = input.requests.map(request => ({ id: request.id, start: 0, end: 30, people: [], resources: request.resources }));
    assert.equal(scoreSolutionOutput(options, input, { status: 'feasible', assignments }, { status: 'feasible' }).score, 1);
  }
});

test('well-formed infeasible schedules may have empty availability or candidates but no assignments', () => {
  for (const mutate of [
    input => { input.windows = []; },
    input => { input.people[0].windows = []; },
    input => { input.requests[0].starts = []; },
    input => { input.people[0].maxMinutes = 0; input.people[0].restMinutes = 0; }
  ]) {
    const input = inputFixture(); mutate(input);
    const { evaluation, solution } = scheduleFixture(input, 'infeasible');
    assert.deepEqual(parseEvaluationPlan(evaluation, solution), evaluation);
    for (const output of [{ status: 'infeasible' }, { status: 'infeasible', assignments: [] }]) {
      const result = scoreSolutionOutput(options, input, output, { status: 'infeasible' });
      assert.equal(result.score, 1); assert.match(result.detail, /not a general infeasibility proof/);
    }
    for (const assignments of [null, {}, outputFixture().assignments]) {
      assert.equal(scoreSolutionOutput(options, input, { status: 'infeasible', assignments }, { status: 'infeasible' }).fatal, true);
    }
    assert.equal(scoreSolutionOutput(options, input, { status: 'budget_exhausted' }, { status: 'infeasible' }).score, 0);
  }
});

test('schedule preflight preserves independent coverage, timing, qualification and capacity checks', () => {
  const cases = [
    [() => {}, output => { output.assignments.pop(); }, /exactly one assignment/],
    [() => {}, output => { output.assignments[1].start = 30; output.assignments[1].end = 60; }, /minimum rest/],
    [() => {}, output => { output.assignments[0].resources = []; }, /resource allocation/],
    [input => { input.people[0].maxMinutes = 50; }, () => {}, /duty budget/],
    [input => { input.people[0].qualifications = []; }, () => {}, /qualifications/],
    [input => { input.people[0].windows = [{ start: 0, end: 60 }]; }, () => {}, /personnel availability/],
    [() => {}, output => { output.assignments[0].end = 31; }, /duration/]
  ];
  for (const [mutateInput, mutateOutput, detail] of cases) {
    const input = inputFixture(), output = outputFixture(); mutateInput(input); mutateOutput(output);
    const result = scoreSolutionOutput(options, input, output, { status: 'feasible' });
    assert.equal(result.fatal, true); assert.match(result.detail, detail);
  }
});

test('malformed infeasible fixtures cannot produce a passing host evaluation report', async () => {
  const { evaluation, solution } = scheduleFixture({}, 'infeasible');
  evaluation.evaluations[0].cases[1] = { id: 'malformed', input: { people: 'not-an-array' }, expected: { status: 'infeasible' } };
  const runtime = { provenance: { profile: 'cli', filesHash: 'fixture', runtime: 'node', environmentNames: [] },
    invoke: async () => ({ status: 'infeasible' }), redactOutput: output => output, redactMessage: message => message };
  const report = await runSolutionEvaluation(runtime, solution, evaluation);
  assert.equal(report.status, 'failed'); assert.equal(report.evaluations[0].actual, 0);
  assert.ok(report.evaluations[0].cases.every(entry => !entry.passed));
});

test('host contract loading rejects a malformed schedule before sealing and accepts its correction', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-schedule-preflight-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const workspace = path.join(directory, 'workspace'), hostKey = path.join(directory, 'host-key.json');
  await fs.mkdir(workspace);
  const input = inputFixture(); input.requests[0].people = ['absent-person'];
  const { files, evaluation } = scheduleFixture(input, 'infeasible');
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), body);
  await assert.rejects(loadQualityContract(workspace, acceptance, true), /evaluations\[0\]\.cases\[0\]\.input\.requests\[0\]\.people\[0\]/);
  assert.equal(await fs.readFile(path.join(workspace, 'evaluation-plan.json'), 'utf8'), files['evaluation-plan.json']);
  await assert.rejects(fs.access(hostKey), /ENOENT/);

  evaluation.evaluations[0].cases[0].input.requests[0].people = ['person'];
  evaluation.evaluations[0].cases[0].input.requests[0].starts = [];
  const corrected = JSON.stringify(evaluation);
  await fs.writeFile(path.join(workspace, 'evaluation-plan.json'), corrected);
  const contract = await loadQualityContract(workspace, acceptance, true);
  await sealEvaluationPlan(workspace, contract, hostKey);
  assert.equal(contract.sealedEvaluation, true);
  assert.equal(await fs.readFile(hostKey, 'utf8'), corrected, 'Only the corrected fixture is sealed.');
  await assert.rejects(fs.access(path.join(workspace, 'evaluation-plan.json')), /ENOENT/);
});

test('shared experiment planning rejects malformed schedules and accepts corrected infeasible fixtures', () => {
  const { evaluation, solution } = scheduleFixture({}, 'infeasible');
  assert.throws(() => parseExperimentEvaluationPlan(evaluation, solution), /input/);
  const input = inputFixture(); input.requests[0].starts = [];
  evaluation.evaluations[0].cases[0].input = input;
  assert.deepEqual(parseExperimentEvaluationPlan(evaluation, solution), evaluation);
  input.people.push(structuredClone(input.people[0]));
  assert.throws(() => parseExperimentEvaluationPlan(evaluation, solution), /input\.people\[1\]\.id/);
});
