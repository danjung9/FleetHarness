import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { qualityFixture, qualityFixtureHtml } from '../scripts/quality-fixture.mjs';
import { loadQualityContract, assertQualityContract, sealEvaluationPlan, restoreEvaluationPlan, verifyApplication } from '../dist-electron/electron/quality.js';
import { reportPassed } from '../dist-electron/shared/verification.js';
import { sourceHash } from '../dist-electron/electron/storage.js';

test('frozen quality contract rejects changed expected outcomes and UX behavior', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-quality-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = qualityFixture(['R1']);
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(root, name), body);
  const contract = await loadQualityContract(root, [{ id: 'R1', requirement: 'Parse tasks', method: 'automated', scenario: 'Example task' }]);
  await assertQualityContract(root, contract);
  for (const name of Object.keys(files)) {
    await fs.appendFile(path.join(root, name), ' ');
    await assert.rejects(assertQualityContract(root, contract), /changed after planning/);
    await fs.writeFile(path.join(root, name), files[name]);
  }
});

test('quality gate rejects missing or failed browser evidence and preserves legacy reports', () => {
  const report = { exitCode: 0, total: 2, passed: 2, failed: 0, skipped: 0 };
  assert.equal(reportPassed(report), true);
  assert.equal(reportPassed(report, true), false);
  const quality = { schemaVersion: 1, status: 'passed', errors: [], journeys: [{ status: 'passed' }], criteria: [{ status: 'passed' }, { status: 'unverified' }] };
  assert.equal(reportPassed({ ...report, quality }, true), true);
  assert.equal(reportPassed({ ...report, quality: { ...quality, journeys: [] } }, true), false);
  assert.equal(reportPassed({ ...report, quality: { ...quality, journeys: [{ status: 'failed' }] } }, true), false);
  assert.equal(reportPassed({ ...report, quality: { ...quality, criteria: [{ status: 'unverified' }] } }, true), false);
  assert.equal(reportPassed({ ...report, quality: { ...quality, errors: ['Browser unavailable'] } }, true), false);
});

test('browser evidence is excluded only during execution and bound to delivery source hash', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-evidence-hash-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'index.html'), '<h1>App</h1>');
  const before = await sourceHash(root), executionHash = await sourceHash(root, { excludeEvidence: true });
  await fs.mkdir(path.join(root, '.quality-evidence')); await fs.writeFile(path.join(root, '.quality-evidence', 'desktop.png'), 'screenshot');
  assert.equal(await sourceHash(root, { excludeEvidence: true }), executionHash);
  assert.notEqual(await sourceHash(root), before);
  const verified = await sourceHash(root);
  await fs.writeFile(path.join(root, '.quality-evidence', 'desktop.png'), 'tampered screenshot');
  assert.notEqual(await sourceHash(root), verified);
});

const acceptance = [{ id: 'R1', requirement: 'Compute totals for arbitrary input lists.', method: 'automated', scenario: 'Compare independently calculated totals.' }];

function computationalFixture(broken = false) {
  const legacy = qualityFixture(['R1']);
  return {
    'ux-spec.json': legacy['ux-spec.json'],
    'acceptance-plan.json': JSON.stringify({ schemaVersion: 2, criteria: [{ criterionId: 'R1', disposition: 'implemented',
      expectedOutcome: 'Totals match independent examples including different input sizes.', journeyIds: [], capabilityIds: ['total'] }], journeys: [] }),
    'solution-contract.json': JSON.stringify({ schemaVersion: 1, objective: 'Calculate totals reliably.',
      capabilities: [{ id: 'total', kind: 'algorithm', description: 'Sum supplied numeric values.', required: true, criterionIds: ['R1'], evaluationIds: ['reference'] }],
      runtime: { profile: 'cli', files: ['engine.mjs', 'math.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } } }),
    'evaluation-plan.json': JSON.stringify({ schemaVersion: 1, evaluations: [{ id: 'reference', capabilityId: 'total', description: 'Independent sums.',
      dataset: { name: 'Arithmetic reference', version: '1', provenance: 'reviewed' }, evaluator: 'numeric', threshold: 1, trials: 1,
      cases: [{ id: 'short', input: { values: [2, 3] }, expected: { total: 5 } }, { id: 'long', input: { values: [10, 20, 5] }, expected: { total: 35 } }] }] }),
    'math.mjs': `export const sum = values => ${broken ? '5' : 'values.reduce((total, value) => total + value, 0)'};`,
    'engine.mjs': `import { readFileSync, existsSync } from 'node:fs'; import { sum } from './math.mjs';
if (existsSync('evaluation-plan.json')) throw new Error('Answer keys leaked into the delivered runtime');
const input = JSON.parse(readFileSync(0, 'utf8')); console.log(JSON.stringify({ total: sum(input.values) }));`,
    // A locally green developer example must never override the independent host cases.
    'math.test.mjs': "import test from 'node:test'; import assert from 'node:assert/strict'; import { sum } from './math.mjs'; test('development example', () => assert.equal(sum([2,3]), 5));"
  };
}

async function computationWorkspace(t, broken = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-quality-solution-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = computationalFixture(broken);
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(root, name), body);
  return { root, files };
}

test('current runs require complete solution contracts and freeze every planned expectation', async t => {
  const { root, files } = await computationWorkspace(t);
  const contract = await loadQualityContract(root, acceptance, true);
  assert.equal(contract.plan.schemaVersion, 2);
  assert.equal(contract.solution.capabilities[0].required, true);
  for (const name of ['acceptance-plan.json', 'ux-spec.json', 'solution-contract.json', 'evaluation-plan.json']) {
    await fs.appendFile(path.join(root, name), ' ');
    await assert.rejects(assertQualityContract(root, contract), /changed after planning/);
    await fs.writeFile(path.join(root, name), files[name]);
  }
  await fs.rm(path.join(root, 'evaluation-plan.json'));
  await assert.rejects(loadQualityContract(root, acceptance), /Missing required quality contract: evaluation-plan/);
  await fs.rm(path.join(root, 'solution-contract.json'));
  await assert.rejects(loadQualityContract(root, acceptance, true), /Missing required quality contract: solution-contract/);
});

test('evaluation keys are sealed outside implementation workspace and restored without changing the frozen hash', async t => {
  const { root, files } = await computationWorkspace(t);
  const host = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-quality-host-'));
  t.after(() => fs.rm(host, { recursive: true, force: true }));
  const contract = await loadQualityContract(root, acceptance, true);
  await assert.rejects(sealEvaluationPlan(root, contract, path.join(root, 'keys.json')), /outside the builder workspace/);
  await sealEvaluationPlan(root, contract, path.join(host, 'keys.json'));
  await assert.rejects(fs.stat(path.join(root, 'evaluation-plan.json')), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(host, 'keys.json'), 'utf8'), files['evaluation-plan.json']);
  await assertQualityContract(root, contract);
  assert.equal(reportPassed(await verifyApplication(root, process.execPath, contract), true), true);
  await fs.writeFile(path.join(root, 'evaluation-plan.json'), files['evaluation-plan.json']);
  await assert.rejects(assertQualityContract(root, contract), /sealed evaluation plan was recreated/);
  await fs.rm(path.join(root, 'evaluation-plan.json'));
  await restoreEvaluationPlan(root, contract);
  assert.equal(contract.sealedEvaluation, false);
  assert.equal(await fs.readFile(path.join(root, 'evaluation-plan.json'), 'utf8'), files['evaluation-plan.json']);
  await assertQualityContract(root, contract);
});

function v2Report() {
  const runtime = { profile: 'browser', filesHash: 'verified-files', runtime: 'node', environmentNames: [] };
  return { exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0, quality: {
    schemaVersion: 2, contractHash: 'frozen', status: 'passed', requirementsMet: true, errors: [], expectedJourneys: 4,
    criteria: [{ criterionId: 'R1', requirement: 'Compute totals', status: 'passed', detail: 'Verified', capabilityIds: ['total'] }],
    journeys: ['primary', 'recovery'].flatMap(id => ['desktop', 'narrow'].map(viewport => ({ id, viewport, title: id, status: 'passed', detail: 'Verified' }))),
    package: { status: 'passed', cleanCopy: true, profile: runtime.profile, filesHash: runtime.filesHash, detail: 'Clean copy' },
    capabilities: [{ id: 'total', required: true, criterionIds: ['R1'], evaluationIds: ['reference'], status: 'passed', detail: 'Verified' }],
    solutionEvaluation: { schemaVersion: 1, status: 'passed', errors: [], runtime, durationMs: 20,
      capabilities: [{ id: 'total', required: true, status: 'passed' }], evaluations: [{ id: 'reference', capabilityId: 'total', evaluator: 'numeric',
        dataset: { name: 'Reference', version: '1', provenance: 'reviewed' }, metric: 'accuracy', threshold: 1, actual: 1, trials: 1, status: 'passed',
        cases: ['first', 'second'].map(id => ({ id, trial: 1, passed: true, score: 1, durationMs: 1, detail: 'Matches' })) }] }
  } };
}

test('version 2 gate rejects failed or missing computational evidence even with green Node and browser checks', () => {
  assert.equal(reportPassed(v2Report(), true), true);
  const mutations = [
    report => { delete report.quality.solutionEvaluation; },
    report => { report.quality.solutionEvaluation.evaluations = []; },
    report => { report.quality.solutionEvaluation.evaluations[0].status = 'failed'; },
    report => { report.quality.solutionEvaluation.evaluations[0].actual = 0.5; },
    report => { report.quality.solutionEvaluation.evaluations[0].baseline = 1.1; },
    report => { report.quality.solutionEvaluation.evaluations[0].cases = []; },
    report => { report.quality.solutionEvaluation.evaluations[0].capabilityId = 'unrelated'; },
    report => { report.quality.capabilities[0].status = 'failed'; },
    report => { report.quality.capabilities[0].evaluationIds = []; },
    report => { report.quality.criteria[0].status = 'unverified'; },
    report => { report.quality.criteria[0].capabilityIds = []; },
    report => { delete report.quality.package; },
    report => { report.quality.package.cleanCopy = false; },
    report => { report.quality.package.filesHash = 'other-source'; },
    report => { report.quality.expectedJourneys = 0; },
    report => { report.quality.journeys.pop(); },
    report => { report.quality.journeys[1] = report.quality.journeys[0]; }
  ];
  for (const mutate of mutations) { const report = v2Report(); mutate(report); assert.equal(reportPassed(report, true), false, String(mutate)); }
  const cli = v2Report(); cli.quality.package.profile = 'cli'; cli.quality.solutionEvaluation.runtime.profile = 'cli';
  cli.quality.expectedJourneys = 0; cli.quality.journeys = [];
  assert.equal(reportPassed(cli, true), true);
});

test('clean CLI verification passes real computation and rejects a hardcoded demo despite passing developer tests', async t => {
  for (const broken of [false, true]) {
    const { root } = await computationWorkspace(t, broken);
    const contract = await loadQualityContract(root, acceptance, true);
    const report = await verifyApplication(root, process.execPath, contract);
    assert.equal(report.exitCode, 0);
    assert.equal(report.passed, 1);
    assert.equal(report.quality.schemaVersion, 2);
    assert.equal(report.quality.package.cleanCopy, true);
    assert.equal(report.quality.solutionEvaluation.evaluations[0].status, broken ? 'failed' : 'passed');
    assert.equal(report.quality.criteria[0].status, broken ? 'failed' : 'passed');
    assert.equal(reportPassed(report, true), !broken);
    assert.equal(report.sourceHash, await sourceHash(root));
  }
});

test('developer setup cannot seed the state that makes an otherwise broken delivered engine pass', async t => {
  const { root } = await computationWorkspace(t);
  await fs.writeFile(path.join(root, 'math.mjs'), `import { existsSync } from 'node:fs'; import path from 'node:path';
export const sum = values => existsSync(path.join(process.env.TMPDIR, 'developer-initialized')) ? values.reduce((total, value) => total + value, 0) : 0;`);
  await fs.writeFile(path.join(root, 'math.test.mjs'), `import test from 'node:test'; import assert from 'node:assert/strict'; import { writeFileSync } from 'node:fs'; import path from 'node:path'; import { sum } from './math.mjs';
test('development setup initializes state', () => { writeFileSync(path.join(process.env.TMPDIR, 'developer-initialized'), 'ready'); assert.equal(sum([2, 3]), 5); });`);
  const contract = await loadQualityContract(root, acceptance, true);
  const report = await verifyApplication(root, process.execPath, contract);
  assert.equal(report.exitCode, 0); assert.equal(report.passed, 1);
  assert.equal(report.quality.solutionEvaluation.evaluations[0].actual, 0);
  assert.equal(report.quality.solutionEvaluation.evaluations[0].status, 'failed');
  assert.equal(reportPassed(report, true), false);
});

test('browser delivery starts cold without inheriting service state from successful host evaluation', { timeout: 30_000 }, async t => {
  const { root, files } = await computationWorkspace(t);
  const plan = JSON.parse(qualityFixture(['R1'])['acceptance-plan.json']);
  plan.schemaVersion = 2; plan.criteria[0].capabilityIds = ['total'];
  const solution = JSON.parse(files['solution-contract.json']);
  solution.runtime = { profile: 'service', files: ['engine.mjs', 'math.mjs'], requiredEnv: [],
    command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] }, healthPath: '/health', invokePath: '/invoke' };
  await fs.writeFile(path.join(root, 'solution-contract.json'), JSON.stringify(solution));
  await fs.writeFile(path.join(root, 'acceptance-plan.json'), JSON.stringify(plan));
  await fs.writeFile(path.join(root, 'engine.mjs'), `import { createServer } from 'node:http'; import { sum } from './math.mjs';
let initialized = false;
createServer(async (request, response) => {
  if (request.url === '/health') { response.end('healthy'); return; }
  if (request.url === '/invoke') { let body = ''; for await (const chunk of request) body += chunk; initialized = true; response.setHeader('content-type', 'application/json'); response.end(JSON.stringify({ total: sum(JSON.parse(body).values) })); return; }
  response.setHeader('content-type', 'text/html'); response.end(initialized ? ${JSON.stringify(qualityFixtureHtml)} : '<h1>Cold startup is broken</h1>');
}).listen(Number(process.env.PORT), process.env.HOST);`);
  const contract = await loadQualityContract(root, acceptance, true);
  const report = await verifyApplication(root, process.execPath, contract, undefined, { browserTimeoutMs: 15000, browserStepTimeoutMs: 300 });
  assert.equal(report.quality.solutionEvaluation.status, 'passed');
  assert.equal(report.exitCode, 0);
  assert.ok(report.quality.journeys.length > 0);
  assert.ok(report.quality.journeys.every(journey => journey.status === 'failed'));
  assert.equal(reportPassed(report, true), false);
});

test('unavailable runtime dependencies produce failed package evidence for repair without falling back to samples', async t => {
  const { root, files } = await computationWorkspace(t);
  const solution = JSON.parse(files['solution-contract.json']);
  solution.runtime.requiredEnv = ['APPYARD_TEST_MISSING_MODEL_CREDENTIAL_173843'];
  delete process.env.APPYARD_TEST_MISSING_MODEL_CREDENTIAL_173843;
  await fs.writeFile(path.join(root, 'solution-contract.json'), JSON.stringify(solution));
  const contract = await loadQualityContract(root, acceptance, true);
  const report = await verifyApplication(root, process.execPath, contract);
  assert.equal(report.quality.package.status, 'failed');
  assert.equal(report.quality.package.cleanCopy, false);
  assert.equal(report.exitCode, null);
  assert.equal(report.total, 0);
  assert.match(report.quality.errors[0], /Missing required runtime environment/);
  assert.equal(reportPassed(report, true), false);
});

test('passing delivered browser journeys cannot conceal a failing computational engine', { timeout: 30_000 }, async t => {
  const { root, files } = await computationWorkspace(t, true);
  const plan = JSON.parse(qualityFixture(['R1'])['acceptance-plan.json']);
  plan.schemaVersion = 2; plan.criteria[0].capabilityIds = ['total'];
  const solution = JSON.parse(files['solution-contract.json']);
  solution.runtime = { profile: 'browser', entrypoint: 'index.html', files: ['index.html', 'engine.mjs', 'math.mjs'], requiredEnv: [],
    evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
  await fs.writeFile(path.join(root, 'acceptance-plan.json'), JSON.stringify(plan));
  await fs.writeFile(path.join(root, 'solution-contract.json'), JSON.stringify(solution));
  await fs.writeFile(path.join(root, 'index.html'), qualityFixtureHtml);
  const contract = await loadQualityContract(root, acceptance, true);
  const report = await verifyApplication(root, process.execPath, contract, undefined, { browserTimeoutMs: 20_000, browserStepTimeoutMs: 2_000 });
  assert.equal(report.passed, 1);
  assert.equal(report.quality.journeys.length, 4);
  assert.ok(report.quality.journeys.every(journey => journey.status === 'passed'), JSON.stringify(report.quality.journeys));
  assert.equal(report.quality.capabilities[0].status, 'failed');
  assert.equal(report.quality.criteria[0].status, 'failed');
  assert.equal(reportPassed(report, true), false);
  for (const journey of report.quality.journeys) assert.ok((await fs.stat(path.join(root, journey.screenshot))).size > 0);
});

test('developer tests use declared installed dependencies in the clean package without ambient helpers or answer keys', async t => {
  const { root, files } = await computationWorkspace(t);
  const tarEntry = (name, text) => {
    const content = Buffer.from(text), header = Buffer.alloc(512);
    header.write(name, 0); header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
    header.write(content.length.toString(8).padStart(11, '0') + '\0', 124); header.write('00000000000\0', 136);
    header.fill(32, 148, 156); header.write('0', 156); header.write('ustar\0', 257); header.write('00', 263);
    header.write(header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\0 ', 148);
    return Buffer.concat([header, content, Buffer.alloc((512 - content.length % 512) % 512)]);
  };
  const tarball = gzipSync(Buffer.concat([
    tarEntry('package/package.json', JSON.stringify({ name: 'fixture-math', version: '1.0.0', main: 'index.cjs' })),
    tarEntry('package/index.cjs', 'exports.sum = values => values.reduce((a,b) => a+b, 0);'), Buffer.alloc(1024)
  ]));
  const registry = createServer((request, response) => {
    if (request.url === '/fixture-math.tgz') response.writeHead(200, { 'Content-Type': 'application/octet-stream' }).end(tarball);
    else response.writeHead(404).end();
  });
  await new Promise(resolve => registry.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => registry.close(resolve)));
  const solution = JSON.parse(files['solution-contract.json']);
  solution.runtime.files.push('package.json', 'package-lock.json');
  solution.runtime.dependencies = { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' };
  const packageJson = { name: 'clean-quality-test', version: '1.0.0', private: true, dependencies: { 'fixture-math': '1.0.0' } };
  const lock = { name: packageJson.name, version: packageJson.version, lockfileVersion: 3, requires: true, packages: {
    '': packageJson, 'node_modules/fixture-math': { version: '1.0.0', resolved: `http://127.0.0.1:${registry.address().port}/fixture-math.tgz`,
      integrity: 'sha512-' + createHash('sha512').update(tarball).digest('base64') }
  } };
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(packageJson));
  await fs.writeFile(path.join(root, 'package-lock.json'), JSON.stringify(lock));
  await fs.writeFile(path.join(root, 'math.mjs'), "import math from 'fixture-math'; export const sum = math.sum;");
  await fs.writeFile(path.join(root, 'not-delivered.json'), '{"hidden":"ambient fixture"}');
  await fs.writeFile(path.join(root, 'math.test.mjs'), `import test from 'node:test'; import assert from 'node:assert/strict'; import { existsSync } from 'node:fs'; import { sum } from './math.mjs';
test('locked dependency without ambient workspace', () => { assert.equal(sum([2,3]), 5); assert.equal(existsSync('not-delivered.json'), false); assert.equal(existsSync('evaluation-plan.json'), false); });`);
  await fs.writeFile(path.join(root, 'solution-contract.json'), JSON.stringify(solution));
  const contract = await loadQualityContract(root, acceptance, true);
  const report = await verifyApplication(root, process.execPath, contract);
  assert.equal(reportPassed(report, true), true, report.output);
  await assert.rejects(fs.stat(path.join(root, 'node_modules')), { code: 'ENOENT' });
});
