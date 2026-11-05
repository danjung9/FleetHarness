import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { loadQualityContract, sealEvaluationPlan, verifyApplication } from '../dist-electron/electron/quality.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { runSolutionEvaluation } from '../dist-electron/electron/solution-evaluation.js';
import { parseSolutionContract, parseEvaluationPlan } from '../dist-electron/harness/solution-contract.js';
import { judgeAccepted, reportPassed } from '../dist-electron/shared/verification.js';
import { readRunCheckpoint } from '../dist-electron/electron/run-checkpoint.js';
import { functionalRepairAttempts } from '../dist-electron/electron/functional-repair.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { factoryBrowserInterface, factoryBrowserHoldoutPlan, factoryBrowserHoldoutPassed, runFactoryBrowserHoldout } from './factory-browser-holdout.mjs';
import { captureLiveBenchmarkInputs } from './factory-benchmark-inputs.mjs';
import { captureBenchmarkHost } from './factory-benchmark-host.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Capture at module initialization, so a later invocation cannot silently adopt
// edits made since this benchmark module was imported. Offline fixtures remain
// usable when live provenance is unavailable; live setup then fails closed.
let benchmarkHostAtLoad;
try { benchmarkHostAtLoad = captureBenchmarkHost(repository); } catch { /* Report a generic live setup failure. */ }
const sum = 'input => ({total: input.values.reduce((sum, value) => sum + value, 0)})';
const schedule = `input => {
  const roster = new Map(input.people.map(person => [person.id, person]));
  const chosen = [];
  const fits = (windows, start, end) => windows.some(window => start >= window.start && end <= window.end);
  function assign(index) {
    if (index === input.requests.length) return true;
    const request = input.requests[index];
    for (const start of request.starts) {
      const end = start + request.duration;
      if (!fits(input.windows, start, end) || !request.qualifications.every(qualification => request.people.some(id => roster.get(id).qualifications.includes(qualification)))) continue;
      if (request.people.some(id => {
        const person = roster.get(id), previous = chosen.filter(item => item.people.includes(id));
        return !fits(person.windows, start, end) || previous.some(item => start < item.end + person.restMinutes && item.start < end + person.restMinutes)
          || previous.reduce((minutes, item) => minutes + item.end - item.start, request.duration) > person.maxMinutes;
      })) continue;
      if (chosen.some(item => start < item.end && item.start < end && request.resources.some(id => item.resources.includes(id)))) continue;
      chosen.push({id: request.id, start, end, people: request.people, resources: request.resources});
      if (assign(index + 1)) return true;
      chosen.pop();
    }
    return false;
  }
  return assign(0) ? {status:'feasible', assignments:chosen} : {status:'infeasible', assignments:[]};
}`;
const scheduleInput = (secondStarts, restMinutes = 0) => ({
  windows: [{ start: 0, end: 100 }],
  people: [{ id: 'worker', qualifications: ['operator'], windows: [{ start: 0, end: 100 }], maxMinutes: 40, restMinutes }],
  requests: [
    { id: 'first', duration: 20, starts: [0], people: ['worker'], resources: ['machine'], qualifications: ['operator'] },
    { id: 'second', duration: 20, starts: secondStarts, people: ['worker'], resources: ['machine'], qualifications: ['operator'] }
  ]
});
const documents = [
  { id: 'pump', source: 'manual/pump', text: 'Pump inspection is due weekly.', approved: true },
  { id: 'valve', source: 'manual/valve', text: 'Valve inspection is due monthly.', approved: true },
  { id: 'excluded', source: 'draft/pump', text: 'Pump inspection is unnecessary.', approved: false }
];

/** These small deterministic fixtures audit the harness; they are not claims about model quality. */
export const factoryBenchmarkScenarios = [
  {
    id: 'algorithm', kind: 'algorithm', evaluator: 'numeric', profile: 'cli',
    title: 'Task duration calculator', description: 'Build a CLI that accepts {values:number[]} and returns {total:number}. Handle empty lists, negative corrections and fractional durations. Use a reusable sum module and exact independent examples.',
    correct: sum, broken: '() => ({total:3})', mutation: 'hardcoded first-case answer',
    cases: [{ id: 'ordinary', input: { values: [1, 2] }, expected: { total: 3 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }, { id: 'correction', input: { values: [1.5, -2, 4] }, expected: { total: 3.5 } }]
  },
  {
    id: 'optimization', kind: 'optimization', evaluator: 'schedule', profile: 'cli',
    title: 'Constrained maintenance scheduler', description: 'Build a CLI producing feasible assignments over explicit candidate starts. Honor operational/person windows, qualifications, personnel/shared-resource collisions, rest and duty limits. Distinguish infeasible from search timeout. Return {status,assignments}.',
    correct: schedule,
    broken: "input => ({status:'feasible', assignments:input.requests.map(request => ({id:request.id,start:request.starts[0],end:request.starts[0]+request.duration,people:request.people,resources:request.resources}))})",
    mutation: 'greedy allocation double-books personnel and resources',
    cases: [{ id: 'avoid-overlap', input: scheduleInput([0, 20]), expected: { status: 'feasible' } }, { id: 'honor-rest', input: scheduleInput([20, 30], 10), expected: { status: 'feasible' } }, { id: 'infeasible', input: scheduleInput([0]), expected: { status: 'infeasible' } }]
  },
  {
    id: 'prediction', kind: 'prediction', evaluator: 'classification', profile: 'cli',
    title: 'Threshold classifier evaluator', description: 'Build a CLI evaluating a supplied linear classifier without training: input samples, weights and threshold. Return boolean labels for dot(sample,weights)>=threshold. Compare to a majority-label baseline on held-out supplied examples. Do not claim these synthetic cases establish learned-model generalization.',
    correct: 'input => input.samples.map(sample => sample.reduce((score, value, index) => score + value * input.weights[index], 0) >= input.threshold)',
    broken: 'input => input.samples.map(() => true)', mutation: 'majority-class constant predictions',
    cases: [{ id: 'mixed', input: { samples: [[1, 0], [-2, 0], [0, 0]], weights: [2, 1], threshold: 0 }, expected: [true, false, true] }, { id: 'boundary', input: { samples: [[1, 2], [0, 1]], weights: [1, 1], threshold: 3 }, expected: [true, false] }, { id: 'negative-weights', input: { samples: [[1, 2], [2, 1]], weights: [-2, 1], threshold: -1 }, expected: [true, false] }]
  },
  {
    id: 'retrieval', kind: 'retrieval', evaluator: 'retrieval', profile: 'cli',
    title: 'Source-grounded manual search', description: 'Build a CLI searching a supplied approved-document corpus by a case-insensitive query substring. Return unique result IDs and exact source excerpt spans. Never return excluded documents or fabricated citations; abstain with empty results when no approved document matches.',
    correct: "input => ({results:input.documents.filter(document => document.approved !== false && document.text.toLowerCase().includes(input.query.toLowerCase())).map(document => ({id:document.id,source:document.source,excerpt:{start:0,end:document.text.length,text:document.text}}))})",
    broken: "input => ({results:[{id:input.documents[0].id,source:input.documents[0].source,excerpt:{start:0,end:10,text:'Fabricated'}}]})", mutation: 'fabricated supporting citation',
    cases: [{ id: 'pump-query', input: { query: 'pump', documents }, expected: { ids: ['pump'] } }, { id: 'valve-query', input: { query: 'valve', documents }, expected: { ids: ['valve'] } }, { id: 'abstention', input: { query: 'compressor', documents }, expected: { ids: [] } }]
  },
  {
    id: 'workflow', kind: 'stateful', evaluator: 'exact', profile: 'cli',
    title: 'Idempotent record workflow', description: 'Build a CLI applying a sequence of put/delete operations to records, deduplicating operation IDs. A duplicate ID has no effect, even when its payload differs. Return {records,applied}. This is deterministic state-transition verification within one input transcript; do not claim cross-process persistence.',
    correct: `input => { const records = {}, seen = new Set(); for (const operation of input.operations) { if (seen.has(operation.id)) continue; seen.add(operation.id); if (operation.action === 'delete') delete records[operation.key]; else records[operation.key] = operation.value; } return {records,applied:seen.size}; }`,
    broken: `input => { let records = {}; for (const operation of input.operations) { records = {}; if (operation.action === 'put') records[operation.key] = operation.value; } return {records,applied:input.operations.length}; }`, mutation: 'lost state and duplicate application',
    cases: [{ id: 'deduplicate', input: { operations: [{ id: 'a', action: 'put', key: 'pump', value: 1 }, { id: 'b', action: 'put', key: 'valve', value: 2 }, { id: 'a', action: 'put', key: 'pump', value: 99 }] }, expected: { records: { pump: 1, valve: 2 }, applied: 2 } }, { id: 'delete', input: { operations: [{ id: 'a', action: 'put', key: 'pump', value: 1 }, { id: 'b', action: 'put', key: 'valve', value: 2 }, { id: 'c', action: 'delete', key: 'pump' }] }, expected: { records: { valve: 2 }, applied: 3 } }, { id: 'empty', input: { operations: [] }, expected: { records: {}, applied: 0 } }]
  },
  {
    id: 'browser-integration', kind: 'algorithm', evaluator: 'numeric', profile: 'browser',
    title: 'Calculator connected to its engine', description: 'Build a browser interface for a reusable sum engine. Enter JSON values, calculate an actual sum and recover after invalid JSON. UI and CLI evaluation must call the same module. ' + factoryBrowserInterface,
    correct: sum, broken: sum, mutation: 'working evaluated core behind a disconnected hardcoded UI',
    cases: [{ id: 'ordinary', input: { values: [1, 2] }, expected: { total: 3 } }, { id: 'changed-input', input: { values: [5, 7] }, expected: { total: 12 } }, { id: 'corrected-input', input: { values: [11, -3] }, expected: { total: 8 } }]
  }
];

const userExperience = {
  schemaVersion: 1, audience: 'Benchmark operator', primaryTask: 'Submit a structured input', successOutcome: 'Observe an independently checked result',
  screens: [{ name: 'Result', purpose: 'Inspect the computational output', primaryAction: 'Calculate' }],
  states: { empty: 'Accept an empty collection when the specification permits it', loading: 'Wait for command completion', error: 'Report invalid input without a success result', success: 'Show the computed result' },
  persistence: 'Only the state explicitly described by each input transcript is verified', recovery: 'Correct the input and submit again', keyboard: 'CLI stdin or labeled browser controls'
};

async function writeCandidate(directory, scenario, broken) {
  await fs.mkdir(directory, { recursive: true });
  const browser = scenario.profile === 'browser';
  const capability = { id: scenario.id, kind: scenario.kind, description: scenario.description, criterionIds: ['R1'], required: true, evaluationIds: ['reference-cases'] };
  const runtime = { profile: browser ? 'browser' : 'cli', files: ['core.mjs', 'engine.mjs', ...(browser ? ['index.html'] : [])], requiredEnv: [],
    ...(browser ? { entrypoint: 'index.html', evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } : { command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } }) };
  const journeys = browser ? [
    { id: 'calculate', title: 'Compute a changed input', kind: 'primary', steps: [{ action: 'fill', selector: '#input', value: '{"values":[5,7]}' }, { action: 'click', selector: '#calculate' }, { action: 'expectText', selector: '#result', text: '{"total":12}' }] },
    { id: 'recover', title: 'Recover after invalid JSON', kind: 'recovery', steps: [{ action: 'fill', selector: '#input', value: 'invalid' }, { action: 'click', selector: '#calculate' }, { action: 'expectText', selector: '#error', text: 'Enter valid JSON.' }, { action: 'fill', selector: '#input', value: '{"values":[]}' }, { action: 'click', selector: '#calculate' }, { action: 'expectText', selector: '#result', text: '{"total":0}' }] }
  ] : [];
  const files = {
    'solution-contract.json': { schemaVersion: 1, objective: scenario.description, capabilities: [capability], runtime },
    'evaluation-plan.json': { schemaVersion: 1, evaluations: [{ id: 'reference-cases', capabilityId: scenario.id, description: scenario.description, dataset: { name: scenario.id, version: '1', provenance: 'synthetic', description: 'Fixed hand-authored benchmark references; independent of candidate outputs' }, cases: scenario.cases, evaluator: scenario.evaluator, threshold: 1, trials: 1, baseline: 0.5, ...(scenario.evaluator === 'numeric' ? { tolerance: 0 } : {}) }] },
    'acceptance-plan.json': { schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: scenario.description, journeyIds: journeys.map(journey => journey.id), capabilityIds: [scenario.id] }], journeys },
    'ux-spec.json': userExperience,
    'core.mjs': `export const solve = ${broken ? scenario.broken : scenario.correct};\n`,
    'engine.mjs': 'import {readFileSync} from "node:fs"; import {solve} from "./core.mjs"; process.stdout.write(JSON.stringify(solve(JSON.parse(readFileSync(0,"utf8")))));\n',
    // Deliberately weak smoke coverage models a plausible demo with green tests. The host must still reject each mutation.
    'smoke.test.mjs': 'import test from "node:test"; import assert from "node:assert/strict"; import {solve} from "./core.mjs"; test("engine entrypoint is callable",()=>assert.equal(typeof solve,"function"));\n'
  };
  if (browser) files['index.html'] = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workload calculator</title><style>body{font:18px system-ui;margin:24px}main{max-width:42rem}textarea{box-sizing:border-box;display:block;width:100%;min-height:6rem;margin:12px 0}button{padding:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><main><h1>Workload calculator</h1><label for="input">Input JSON</label><textarea id="input" data-testid="factory-input"></textarea><button id="calculate" data-testid="factory-submit">Calculate</button><p id="error" role="alert"></p><pre id="result" data-testid="factory-result" aria-live="polite"></pre></main><script type="module">import {solve} from './core.mjs'; document.querySelector('#calculate').addEventListener('click',()=>{try{const input=JSON.parse(document.querySelector('#input').value);document.querySelector('#error').textContent='';document.querySelector('#result').textContent=JSON.stringify(${broken ? '{total:3}' : 'solve(input)'});}catch{document.querySelector('#error').textContent='Enter valid JSON.';document.querySelector('#result').textContent=JSON.stringify({error:'Enter valid JSON.'});}});</script></html>`;
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(directory, name), typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  return [{ id: 'R1', requirement: scenario.description, method: 'automated', scenario: 'Independent reference inputs and deliberately broken candidates' }];
}

/** Offline: executes real package preparation, host scoring and the final quality gate. */
export async function benchmarkFactory({ root, includeBrowser = true } = {}) {
  const temporary = !root;
  const directory = root ? path.resolve(root) : await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-factory-benchmark-'));
  await fs.mkdir(directory, { recursive: true });
  const started = performance.now(), runs = [];
  try {
    for (const scenario of factoryBenchmarkScenarios.filter(item => includeBrowser || item.profile !== 'browser')) for (const broken of [false, true]) {
      const candidate = path.join(directory, `${scenario.id}-${broken ? 'broken' : 'correct'}`);
      const acceptance = await writeCandidate(candidate, scenario, broken);
      const contract = await loadQualityContract(candidate, acceptance, true);
      await sealEvaluationPlan(candidate, contract, path.join(directory, 'answer-keys', path.basename(candidate) + '.json'));
      const report = await verifyApplication(candidate, process.execPath, contract, undefined, { browserTimeoutMs: 60_000, browserStepTimeoutMs: 3_000 });
      await fs.writeFile(path.join(candidate, 'test-report.json'), JSON.stringify(report, null, 2));
      runs.push({ scenario: scenario.id, kind: scenario.kind, variant: broken ? 'broken' : 'correct', mutation: broken ? scenario.mutation : undefined,
        expectedAccepted: !broken, accepted: reportPassed(report, true), nodeTestsPassed: report.failed === 0 && report.passed > 0,
        runtimePrepared: report.quality?.package?.status === 'passed', coreStatus: report.quality?.solutionEvaluation?.status,
        browserPassed: report.quality?.journeys.every(item => item.status === 'passed'),
        score: report.quality?.solutionEvaluation?.evaluations[0]?.actual, durationMs: report.durationMs,
        ...(temporary ? {} : { evidence: path.join(candidate, 'test-report.json') }) });
    }
    const positives = runs.filter(run => run.expectedAccepted), negatives = runs.filter(run => !run.expectedAccepted);
    const summary = { schemaVersion: 1, mode: 'offline', scenarios: positives.length, candidates: runs.length,
      correctAccepted: positives.filter(run => run.accepted).length, falseRejections: positives.filter(run => !run.accepted).length,
      brokenRejected: negatives.filter(run => !run.accepted).length, falseAcceptances: negatives.filter(run => run.accepted).length,
      durationMs: Math.round(performance.now() - started), runs,
      scope: 'Deterministic evaluator and delivery-path regression suite. It does not measure a coding model or establish general task-solving ability.' };
    await fs.writeFile(path.join(directory, 'benchmark-report.json'), JSON.stringify(summary, null, 2));
    return summary;
  } finally { if (temporary) await fs.rm(directory, { recursive: true, force: true }); }
}

function livePipelineAccepted(project) {
  try { return project?.status === 'review' && reportPassed(project.report, project.qualityVersion ?? true); }
  catch { return false; } // Malformed saved evidence is a failed benchmark result.
}

/** Benchmark success requires the requested task, beyond the pipeline's useful-prototype gate. */
export function gradeLiveBenchmarkResult({ scenario, project, deliveredProfile, holdoutAccepted = false, holdoutScore = null, holdoutFilesHash,
  holdoutSourceHashBefore, holdoutSourceHashAfter, browserHoldout, timedOut = false }) {
  const quality = project?.report?.quality;
  const pipelineAccepted = livePipelineAccepted(project);
  const requirementsMet = quality?.requirementsMet === true && Array.isArray(quality.criteria) && quality.criteria.length > 0
    && quality.criteria.every(criterion => criterion?.status === 'passed');
  // A service serves a browser interface too. A CLI alone cannot deliver that task.
  const expectedProfiles = scenario?.profile === 'browser' ? ['browser', 'service'] : scenario?.profile === 'cli' ? ['cli'] : [];
  const runtimeProfileMatched = expectedProfiles.includes(deliveredProfile) && deliveredProfile === quality?.package?.profile;
  // Pipeline tests and external holdouts must describe the same declared files.
  // Missing provenance is unknown, even when both sides omit their hash.
  const pipelineFilesHash = typeof quality?.package?.filesHash === 'string' && quality.package.filesHash.trim()
    ? quality.package.filesHash : null;
  holdoutFilesHash = typeof holdoutFilesHash === 'string' && holdoutFilesHash.trim() ? holdoutFilesHash : null;
  const runtimeFilesMatched = pipelineFilesHash !== null && pipelineFilesHash === holdoutFilesHash;
  const sourceIdentity = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : null;
  const pipelineSourceHash = sourceIdentity(project?.report?.sourceHash);
  holdoutSourceHashBefore = sourceIdentity(holdoutSourceHashBefore);
  holdoutSourceHashAfter = sourceIdentity(holdoutSourceHashAfter);
  const sourceMatched = pipelineSourceHash !== null && pipelineSourceHash === holdoutSourceHashBefore
    && pipelineSourceHash === holdoutSourceHashAfter;
  const browserHoldoutRequired = scenario?.profile === 'browser';
  const browserHoldoutAccepted = browserHoldoutRequired
    ? factoryBrowserHoldoutPassed(browserHoldout) && browserHoldout.runtime.profile === deliveredProfile
      && browserHoldout.runtime.filesHash === holdoutFilesHash : null;
  const failureReasons = [];
  if (!pipelineAccepted) failureReasons.push('pipeline-not-accepted');
  if (holdoutAccepted !== true) failureReasons.push('core-holdout-not-passed');
  if (browserHoldoutRequired && !browserHoldoutAccepted) failureReasons.push('browser-holdout-not-passed');
  if (!requirementsMet) failureReasons.push('requirements-incomplete');
  if (!runtimeProfileMatched) failureReasons.push('delivery-profile-mismatch');
  if (!runtimeFilesMatched) failureReasons.push('runtime-files-mismatch');
  if (!sourceMatched) failureReasons.push('verified-source-mismatch');
  if (timedOut) failureReasons.push('generation-timed-out');
  return { accepted: failureReasons.length === 0, pipelineAccepted, holdoutAccepted: holdoutAccepted === true, holdoutScore,
    browserHoldoutRequired, browserHoldoutAccepted,
    requirementsMet, expectedProfiles, deliveredProfile: deliveredProfile ?? null, runtimeProfileMatched,
    runtimeFilesMatched, pipelineFilesHash, holdoutFilesHash,
    sourceMatched, pipelineSourceHash, holdoutSourceHashBefore, holdoutSourceHashAfter, failureReasons };
}

/** Read persisted reservations, including interrupted repairs; never infer them from logs. */
export async function readLiveRepairEvidence(root, project) {
  try {
    const checkpoint = await readRunCheckpoint(root, project);
    return { repairAttempts: functionalRepairAttempts(checkpoint.functionalRepair, checkpoint.repairUsed), repairEvidence: 'checkpoint' };
  } catch {
    // Do not infer zero from truncated logs or expose private checkpoint data.
    return { repairAttempts: null, repairEvidence: 'unavailable' };
  }
}

/** Opt-in only: generates real solutions through the configured Pi coding-model backend. */
export async function benchmarkLiveFactory({ provider, model, runs = 1, output, timeoutMs = 30 * 60_000 } = {}) {
  if (!provider || !model) throw new Error('Live benchmarking requires --provider and --model for an already configured Pi model.');
  if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error('--runs must be an integer between 1 and 10.');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2_147_483_647) throw new Error('Live benchmark timeoutMs must be an integer between 1 and 2147483647.');
  // Capture before the first asynchronous boundary: later fixture edits cannot
  // change the task, grading cases or planned count of an in-flight benchmark.
  const inputs = captureLiveBenchmarkInputs({ scenarios: factoryBenchmarkScenarios,
    browserHoldoutPlan: factoryBrowserHoldoutPlan(), provider, model, runs, timeoutMs });
  const scenarios = inputs.manifest.scenarios;
  const [{ FleetBackend }, { Store, newProject }] = await Promise.all([import('../dist-electron/electron/pi-backend.js'), import('../dist-electron/electron/storage.js')]);
  const parent = output ? path.resolve(output) : os.tmpdir();
  await fs.mkdir(parent, { recursive: true });
  const directory = await fs.mkdtemp(path.join(parent, 'fleet-live-benchmark-'));
  const results = [], failures = [], started = performance.now();
  const reportFile = path.join(directory, 'benchmark-report.json');
  const inputFile = path.join(directory, 'benchmark-inputs.json');
  const hostFile = path.join(directory, 'benchmark-host.json');
  const assertInputEvidence = async () => {
    if (!(await fs.readFile(inputFile)).equals(Buffer.from(inputs.bytes))) throw new Error('Benchmark input evidence changed.');
  };
  const assertHostEvidence = async () => {
    if (!benchmarkHostAtLoad || !(await fs.readFile(hostFile)).equals(Buffer.from(benchmarkHostAtLoad.bytes))
      || captureBenchmarkHost(repository).sha256 !== benchmarkHostAtLoad.sha256) throw new Error('Benchmark host evidence changed.');
  };
  let store, backend, storeReady = false, activeGeneration = null, phase = 'setup';
  // Publish complete JSON replacements; a failed write leaves the previous
  // progress report intact. Never begin another generation without saving it.
  const persist = async status => {
    if (status !== 'failed') { await assertInputEvidence(); await assertHostEvidence(); }
    const summary = { schemaVersion: 7, mode: 'live', status, plannedGenerations: runs * scenarios.length,
      benchmarkInputs: { path: inputFile, sha256: inputs.sha256 }, generationTimeoutMs: timeoutMs,
      benchmarkHost: benchmarkHostAtLoad ? { path: hostFile, sha256: benchmarkHostAtLoad.sha256 } : null,
      activeGeneration, ...(failures.length ? { failureNote: `Benchmark incomplete (${failures.join(', ')}). Completed results are retained; unfinished generations are excluded from counts.` } : {}), provider, model, runsPerScenario: runs, generations: results.length,
      accepted: results.filter(result => result.accepted).length, fullyCovered: results.filter(result => result.requirementsMet && result.accepted).length,
      repaired: results.filter(result => result.repaired === true).length,
      repairEvidenceMissing: results.filter(result => result.repairAttempts === null).length,
      repairNote: 'Repair attempts count the persisted host reservation of a core or final-verification repair slot for a fresh generation (0 or 1). Internal agent edits, planning revisions and visual iterations are excluded. Missing checkpoint evidence is unknown; repaired counts only known accepted repairs.',
      generationDurationMs: results.reduce((total, result) => total + result.generationDurationMs, 0),
      gradingDurationMs: results.reduce((total, result) => total + result.gradingDurationMs, 0),
      timingNote: 'Generation includes backend startup, the full factory pipeline (including its own verification) and awaited timeout cleanup; it is not model-only latency. Grading includes repair evidence lookup, independent core/browser holdouts, runtime cleanup and identity checks. Their rounded components sum to each result durationMs. Aggregate components sum fully graded results only, including rejections; aggregate durationMs also includes setup, persistence, final cleanup and any unfinished work.',
      durationMs: Math.round(performance.now() - started), costUsd: null,
      costNote: 'Provider usage cost is not exposed by the backend; inspect provider billing. No zero-cost assumption is made.',
      scope: 'Real generation, complete host-reported requirement coverage, requested delivery surface, full pipeline acceptance and independently authored host-held core and browser cases. Browser cases use a disclosed test interface in a separate clean runtime at desktop and narrow widths. These public behavior fixtures do not prove code sharing and are not a secret or production-domain validation set.',
      output: directory, results };
    const pending = `${reportFile}.tmp`;
    try {
      await fs.writeFile(pending, JSON.stringify(summary, null, 2), { flag: 'wx' });
      await fs.rename(pending, reportFile);
    } finally { await fs.rm(pending, { force: true }); }
    return summary;
  };
  try {
    // A partial/failed manifest write must prevent all model work. This file is
    // host evidence; only the development attachment enters each project.
    await fs.writeFile(inputFile, inputs.bytes, { flag: 'wx' });
    if (!benchmarkHostAtLoad) throw new Error('Benchmark host evidence is unavailable.');
    await fs.writeFile(hostFile, benchmarkHostAtLoad.bytes, { flag: 'wx' });
    await persist('running');
    store = new Store(directory); await store.init(); storeReady = true;
    store.state.settings = { backend: 'pi', provider, model, rememberKey: false };
    store.state.projects = [];
    backend = new FleetBackend(store, process.execPath, () => {}, repository);
    await backend.init();
    if (!backend.models().some(item => item.backend === 'pi' && item.provider === provider && item.id === model && item.configured)) throw new Error('The requested Pi model is unavailable or lacks configured authentication. Configure it before running a live benchmark.');
    for (let trial = 1; trial <= runs; trial++) for (const scenario of scenarios) {
      const description = scenario.projectInput.description;
      const project = newProject({ ...structuredClone(scenario.projectInput), title: scenario.trialTitles[trial - 1] });
      phase = 'generation';
      activeGeneration = { scenario: scenario.id, trial, projectId: project.id };
      await persist('running');
      store.state.projects.push(project); await store.save();
      const runStarted = performance.now();
      let timedOut = false, stopping;
      const expire = () => {
        timedOut = true;
        // Stop also cancels backend preparation. Retain its settlement so a
        // timed-out run cannot overlap the next scenario during cleanup.
        stopping ??= Promise.resolve().then(() => backend.stop(project.id)).catch(() => {});
      };
      const timer = setTimeout(expire, timeoutMs);
      try {
        await backend.start(project.id);
        await backend.active.get(project.id)?.done;
      } catch { /* Provider details remain in the saved run; never print authentication/provider payloads. */ }
      finally {
        clearTimeout(timer);
        // A synchronous completion can delay the timer callback past its due
        // time. Such a run still exceeded the original generation budget.
        if (performance.now() - runStarted >= timeoutMs) expire();
        await stopping;
      }
      const generationDurationMs = Math.round(performance.now() - runStarted);
      const pipelineAccepted = livePipelineAccepted(project);
      const repair = await readLiveRepairEvidence(store.root, project);
      let holdoutAccepted = false, holdoutScore = null, holdoutFilesHash, holdoutSourceHashBefore, holdoutSourceHashAfter,
        deliveredProfile, deliveredManifest, browserHoldout, browserHoldoutEvidence = null;
      if (pipelineAccepted && project.workspace) {
        let runtime;
        try {
          const contractBytes = await fs.readFile(path.join(project.workspace, 'solution-contract.json'));
          // Pin the exact manifest used for invocation, even if its workspace
          // file changes and is restored while we prepare the holdout.
          holdoutSourceHashBefore = await sourceHash(project.workspace, {
            fileOverrides: new Map([['solution-contract.json', { bytes: contractBytes }]])
          });
          const delivered = JSON.parse(contractBytes.toString('utf8'));
          const contract = parseSolutionContract({ schemaVersion: 1, objective: description, runtime: delivered.runtime,
            capabilities: [{ id: scenario.id, kind: scenario.kind, description, criterionIds: ['R1'], required: true, evaluationIds: ['factory-holdout'] }]
          }, [{ id: 'R1', requirement: description, method: 'automated', scenario: 'Host-held external benchmark cases' }]);
          deliveredProfile = contract.runtime.profile;
          deliveredManifest = contract.runtime;
          const heldout = parseEvaluationPlan(structuredClone(scenario.holdoutPlan), contract);
          runtime = await prepareSolutionRuntime(project.workspace, contract.runtime, process.execPath);
          const evaluated = await runSolutionEvaluation(runtime, contract, heldout);
          // Acceptance requires saved execution evidence, including when a
          // report write fails after truncating or creating its destination.
          await fs.writeFile(path.join(directory, `${project.id}-holdout-report.json`), JSON.stringify(evaluated, null, 2));
          holdoutAccepted = evaluated.status === 'passed'; holdoutScore = evaluated.evaluations[0]?.actual ?? null;
          holdoutFilesHash = evaluated.runtime.filesHash;
        } catch { /* Any malformed runtime or incompatible output fails the external holdout. */ }
        finally { await runtime?.close(); }
      }
      if (!timedOut && pipelineAccepted && scenario.profile === 'browser' && deliveredManifest) {
        const evidenceRoot = path.join(directory, `${project.id}-browser-holdout`);
        browserHoldout = await runFactoryBrowserHoldout({ workspace: project.workspace, manifest: deliveredManifest, evidenceRoot });
        browserHoldoutEvidence = path.join(evidenceRoot, 'browser-holdout-report.json');
      }
      if (pipelineAccepted && project.workspace) {
        try { holdoutSourceHashAfter = await sourceHash(project.workspace); }
        catch { /* Unreadable source cannot establish unchanged verification evidence. */ }
      }
      // Keep a generation ungraded if the observed host changed while it ran.
      await assertHostEvidence();
      const grade = gradeLiveBenchmarkResult({ scenario, project, deliveredProfile, holdoutAccepted, holdoutScore, holdoutFilesHash,
        holdoutSourceHashBefore, holdoutSourceHashAfter, browserHoldout, timedOut });
      const durationMs = Math.round(performance.now() - runStarted);
      results.push({ scenario: scenario.id, trial, status: project.status, ...grade, browserHoldoutEvidence, timedOut, ...repair,
        repaired: !grade.accepted ? false : repair.repairAttempts === null ? null : repair.repairAttempts > 0,
        capabilities: project.report?.quality?.capabilities?.map(item => ({ id: item.id, required: item.required, status: item.status })) ?? [],
        failedStages: project.stages.filter(stage => stage.status === 'failed').map(stage => stage.id),
        // Partition the rounded total so sub-millisecond boundaries cannot
        // make the reported components disagree with the existing duration.
        durationMs, generationDurationMs, gradingDurationMs: durationMs - generationDurationMs,
        costUsd: null, workspace: project.workspace ?? null });
      activeGeneration = null;
      await persist('running');
    }
  } catch { failures.push(phase); }
  finally {
    // Both cleanup steps must settle before completion can be claimed. Do not
    // lose earlier results or leak provider/authentication details on failure.
    try { await backend?.stopAll(); } catch { failures.push('backend cleanup'); }
    try { if (storeReady) await store.save(); } catch { failures.push('state persistence'); }
  }
  let summary;
  // Cleanup can remove or change evidence too. Retain the expected identity in
  // a failed report instead of claiming completion with missing input records.
  if (!failures.length) {
    try { await assertInputEvidence(); } catch { failures.push('benchmark input evidence'); }
    try { await assertHostEvidence(); } catch { failures.push('benchmark host evidence'); }
  }
  try { summary = await persist(failures.length ? 'failed' : 'completed'); }
  catch { throw new Error(`Live benchmark evidence could not be finalized. Inspect the last saved progress at ${reportFile}.`); }
  if (failures.length) throw new Error(`Live benchmark did not complete. Inspect retained evidence at ${reportFile}.`);
  return summary;
}

function options(argv) {
  const result = { live: false, runs: 1 };
  for (let i = 0; i < argv.length; i++) {
    const argument = argv[i];
    if (argument === '--live') result.live = true;
    else if (['--provider', '--model', '--runs', '--output'].includes(argument)) {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`);
      result[argument.slice(2)] = argument === '--runs' ? Number(value) : value;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!result.live && (result.provider || result.model || result.runs !== 1)) throw new Error('Provider, model and repeat options require explicit --live.');
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const settings = options(process.argv.slice(2));
    const result = settings.live ? await benchmarkLiveFactory(settings) : await benchmarkFactory({ root: settings.output });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.mode === 'offline' ? Number(result.falseAcceptances > 0 || result.falseRejections > 0) : Number(result.accepted !== result.generations);
  } catch (error) { console.error(error instanceof Error ? error.message : 'Factory benchmark failed.'); process.exitCode = 1; }
}
