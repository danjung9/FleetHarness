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

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
    id: 'algorithm', kind: 'algorithm', evaluator: 'numeric',
    title: 'Task duration calculator', description: 'Build a CLI that accepts {values:number[]} and returns {total:number}. Handle empty lists, negative corrections and fractional durations. Use a reusable sum module and exact independent examples.',
    correct: sum, broken: '() => ({total:3})', mutation: 'hardcoded first-case answer',
    cases: [{ id: 'ordinary', input: { values: [1, 2] }, expected: { total: 3 } }, { id: 'empty', input: { values: [] }, expected: { total: 0 } }, { id: 'correction', input: { values: [1.5, -2, 4] }, expected: { total: 3.5 } }]
  },
  {
    id: 'optimization', kind: 'optimization', evaluator: 'schedule',
    title: 'Constrained maintenance scheduler', description: 'Build a CLI producing feasible assignments over explicit candidate starts. Honor operational/person windows, qualifications, personnel/shared-resource collisions, rest and duty limits. Distinguish infeasible from search timeout. Return {status,assignments}.',
    correct: schedule,
    broken: "input => ({status:'feasible', assignments:input.requests.map(request => ({id:request.id,start:request.starts[0],end:request.starts[0]+request.duration,people:request.people,resources:request.resources}))})",
    mutation: 'greedy allocation double-books personnel and resources',
    cases: [{ id: 'avoid-overlap', input: scheduleInput([0, 20]), expected: { status: 'feasible' } }, { id: 'honor-rest', input: scheduleInput([20, 30], 10), expected: { status: 'feasible' } }, { id: 'infeasible', input: scheduleInput([0]), expected: { status: 'infeasible' } }]
  },
  {
    id: 'prediction', kind: 'prediction', evaluator: 'classification',
    title: 'Threshold classifier evaluator', description: 'Build a CLI evaluating a supplied linear classifier without training: input samples, weights and threshold. Return boolean labels for dot(sample,weights)>=threshold. Compare to a majority-label baseline on held-out supplied examples. Do not claim these synthetic cases establish learned-model generalization.',
    correct: 'input => input.samples.map(sample => sample.reduce((score, value, index) => score + value * input.weights[index], 0) >= input.threshold)',
    broken: 'input => input.samples.map(() => true)', mutation: 'majority-class constant predictions',
    cases: [{ id: 'mixed', input: { samples: [[1, 0], [-2, 0], [0, 0]], weights: [2, 1], threshold: 0 }, expected: [true, false, true] }, { id: 'boundary', input: { samples: [[1, 2], [0, 1]], weights: [1, 1], threshold: 3 }, expected: [true, false] }, { id: 'negative-weights', input: { samples: [[1, 2], [2, 1]], weights: [-2, 1], threshold: -1 }, expected: [true, false] }]
  },
  {
    id: 'retrieval', kind: 'retrieval', evaluator: 'retrieval',
    title: 'Source-grounded manual search', description: 'Build a CLI searching a supplied approved-document corpus by a case-insensitive query substring. Return unique result IDs and exact source excerpt spans. Never return excluded documents or fabricated citations; abstain with empty results when no approved document matches.',
    correct: "input => ({results:input.documents.filter(document => document.approved !== false && document.text.toLowerCase().includes(input.query.toLowerCase())).map(document => ({id:document.id,source:document.source,excerpt:{start:0,end:document.text.length,text:document.text}}))})",
    broken: "input => ({results:[{id:input.documents[0].id,source:input.documents[0].source,excerpt:{start:0,end:10,text:'Fabricated'}}]})", mutation: 'fabricated supporting citation',
    cases: [{ id: 'pump-query', input: { query: 'pump', documents }, expected: { ids: ['pump'] } }, { id: 'valve-query', input: { query: 'valve', documents }, expected: { ids: ['valve'] } }, { id: 'abstention', input: { query: 'compressor', documents }, expected: { ids: [] } }]
  },
  {
    id: 'workflow', kind: 'stateful', evaluator: 'exact',
    title: 'Idempotent record workflow', description: 'Build a CLI applying a sequence of put/delete operations to records, deduplicating operation IDs. A duplicate ID has no effect, even when its payload differs. Return {records,applied}. This is deterministic state-transition verification within one input transcript; do not claim cross-process persistence.',
    correct: `input => { const records = {}, seen = new Set(); for (const operation of input.operations) { if (seen.has(operation.id)) continue; seen.add(operation.id); if (operation.action === 'delete') delete records[operation.key]; else records[operation.key] = operation.value; } return {records,applied:seen.size}; }`,
    broken: `input => { let records = {}; for (const operation of input.operations) { records = {}; if (operation.action === 'put') records[operation.key] = operation.value; } return {records,applied:input.operations.length}; }`, mutation: 'lost state and duplicate application',
    cases: [{ id: 'deduplicate', input: { operations: [{ id: 'a', action: 'put', key: 'pump', value: 1 }, { id: 'b', action: 'put', key: 'valve', value: 2 }, { id: 'a', action: 'put', key: 'pump', value: 99 }] }, expected: { records: { pump: 1, valve: 2 }, applied: 2 } }, { id: 'delete', input: { operations: [{ id: 'a', action: 'put', key: 'pump', value: 1 }, { id: 'b', action: 'put', key: 'valve', value: 2 }, { id: 'c', action: 'delete', key: 'pump' }] }, expected: { records: { valve: 2 }, applied: 3 } }, { id: 'empty', input: { operations: [] }, expected: { records: {}, applied: 0 } }]
  },
  {
    id: 'browser-integration', kind: 'algorithm', evaluator: 'numeric', profile: 'browser',
    title: 'Calculator connected to its engine', description: 'Build a browser interface for a reusable sum engine. Enter JSON values, calculate an actual sum and recover after invalid JSON. UI and CLI evaluation must call the same module.',
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
  if (browser) files['index.html'] = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workload calculator</title><style>body{font:18px system-ui;margin:24px}main{max-width:42rem}textarea{box-sizing:border-box;display:block;width:100%;min-height:6rem;margin:12px 0}button{padding:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><main><h1>Workload calculator</h1><label for="input">Input JSON</label><textarea id="input"></textarea><button id="calculate">Calculate</button><p id="error" role="alert"></p><pre id="result" aria-live="polite"></pre></main><script type="module">import {solve} from './core.mjs'; document.querySelector('#calculate').addEventListener('click',()=>{try{const input=JSON.parse(document.querySelector('#input').value);document.querySelector('#error').textContent='';document.querySelector('#result').textContent=JSON.stringify(${broken ? '{total:3}' : 'solve(input)'});}catch{document.querySelector('#error').textContent='Enter valid JSON.';document.querySelector('#result').textContent='';}});</script></html>`;
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

/** Opt-in only: generates real solutions through the configured Pi coding-model backend. */
export async function benchmarkLiveFactory({ provider, model, runs = 1, output, timeoutMs = 30 * 60_000 } = {}) {
  if (!provider || !model) throw new Error('Live benchmarking requires --provider and --model for an already configured Pi model.');
  if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error('--runs must be an integer between 1 and 10.');
  const [{ FleetBackend }, { Store, newProject }] = await Promise.all([import('../dist-electron/electron/pi-backend.js'), import('../dist-electron/electron/storage.js')]);
  const parent = output ? path.resolve(output) : os.tmpdir();
  await fs.mkdir(parent, { recursive: true });
  const directory = await fs.mkdtemp(path.join(parent, 'fleet-live-benchmark-'));
  const store = new Store(directory); await store.init();
  store.state.settings = { backend: 'pi', provider, model, rememberKey: false };
  store.state.projects = [];
  const backend = new FleetBackend(store, process.execPath, () => {}, repository);
  const results = [], started = performance.now();
  try {
    await backend.init();
    if (!backend.models().some(item => item.backend === 'pi' && item.provider === provider && item.id === model && item.configured)) throw new Error('The requested Pi model is unavailable or lacks configured authentication. Configure it before running a live benchmark.');
    for (let trial = 1; trial <= runs; trial++) for (const scenario of factoryBenchmarkScenarios) {
      const project = newProject({ title: `Benchmark ${scenario.title} (${trial})`, description: scenario.description,
        criteria: [scenario.description, 'Declare and pass an independently checked mandatory computational capability. Provide accurate setup and error handling.'],
        resources: 'The attached examples are synthetic development data. Derive additional independent evaluation examples before building; do not copy fixed outputs into the implementation.',
        dataInputs: [{ name: 'development-cases.json', kind: 'text', content: JSON.stringify({ provenance: 'synthetic', examples: scenario.cases.slice(0, 1) }, null, 2) }]
      });
      store.state.projects.push(project); await store.save();
      const runStarted = performance.now();
      let timedOut = false, timer;
      try {
        await backend.start(project.id);
        const done = backend.active.get(project.id)?.done;
        if (done) await Promise.race([done, new Promise(resolve => { timer = setTimeout(() => { timedOut = true; void backend.stop(project.id).then(resolve, resolve); }, timeoutMs); })]);
      } catch { /* Provider details remain in the saved run; never print authentication/provider payloads. */ }
      finally { clearTimeout(timer); }
      const pipelineAccepted = project.status === 'review' && reportPassed(project.report, true) && judgeAccepted(project.report);
      let holdoutAccepted = false, holdoutScore = null;
      if (pipelineAccepted && project.workspace) {
        let runtime;
        try {
          const delivered = JSON.parse(await fs.readFile(path.join(project.workspace, 'solution-contract.json'), 'utf8'));
          const contract = parseSolutionContract({ schemaVersion: 1, objective: scenario.description, runtime: delivered.runtime,
            capabilities: [{ id: scenario.id, kind: scenario.kind, description: scenario.description, criterionIds: ['R1'], required: true, evaluationIds: ['factory-holdout'] }]
          }, [{ id: 'R1', requirement: scenario.description, method: 'automated', scenario: 'Host-held external benchmark cases' }]);
          const heldout = parseEvaluationPlan({ schemaVersion: 1, evaluations: [{ id: 'factory-holdout', capabilityId: scenario.id, description: scenario.description,
            dataset: { name: `${scenario.id}-heldout`, version: '1', provenance: 'synthetic', description: 'Hand-authored before generation; only the first separate development case was supplied to the builder' },
            cases: scenario.cases.slice(1), evaluator: scenario.evaluator, threshold: 1, trials: 1, ...(scenario.evaluator === 'numeric' ? { tolerance: 0 } : {})
          }] }, contract);
          runtime = await prepareSolutionRuntime(project.workspace, contract.runtime, process.execPath);
          const evaluated = await runSolutionEvaluation(runtime, contract, heldout);
          holdoutAccepted = evaluated.status === 'passed'; holdoutScore = evaluated.evaluations[0]?.actual ?? null;
          await fs.writeFile(path.join(directory, `${project.id}-holdout-report.json`), JSON.stringify(evaluated, null, 2));
        } catch { /* Any malformed runtime or incompatible output fails the external holdout. */ }
        finally { await runtime?.close(); }
      }
      const accepted = pipelineAccepted && holdoutAccepted;
      const repairAttempts = project.logs.filter(log => log.kind === 'info' && /Starting one .* repair attempt|core.*failed.*repair/i.test(log.text)).length;
      results.push({ scenario: scenario.id, trial, status: project.status, accepted, pipelineAccepted, holdoutAccepted, holdoutScore, timedOut, repairAttempts,
        repaired: accepted && repairAttempts > 0, requirementsMet: project.report?.quality?.requirementsMet ?? false,
        capabilities: project.report?.quality?.capabilities?.map(item => ({ id: item.id, required: item.required, status: item.status })) ?? [],
        failedStages: project.stages.filter(stage => stage.status === 'failed').map(stage => stage.id),
        durationMs: Math.round(performance.now() - runStarted), costUsd: null, workspace: project.workspace ?? null });
    }
    const summary = { schemaVersion: 1, mode: 'live', provider, model, runsPerScenario: runs, generations: results.length,
      accepted: results.filter(result => result.accepted).length, fullyCovered: results.filter(result => result.requirementsMet && result.accepted).length,
      repaired: results.filter(result => result.repaired).length, durationMs: Math.round(performance.now() - started), costUsd: null,
      costNote: 'Provider usage cost is not exposed by the backend; inspect provider billing. No zero-cost assumption is made.',
      scope: 'Real generation, full pipeline acceptance and independently authored host-held core cases. The public benchmark is small and is not a secret or production-domain validation set.',
      output: directory, results };
    await fs.writeFile(path.join(directory, 'benchmark-report.json'), JSON.stringify(summary, null, 2));
    return summary;
  } finally { await backend.stopAll(); await store.save(); }
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
