import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { sourceHash, newProject } from '../dist-electron/electron/storage.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';
import { stageExecutable } from '../dist-electron/electron/executable.js';
import { bindSyntheticApproval } from './helpers/approved-evidence.mjs';

async function fixture(t, language) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'comparison-delivery-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'), module = language === 'node' ? 'app.mjs' : 'app.py';
  const adapter = 'runtime-broker/' + (language === 'node' ? 'node.mjs' : 'python.py');
  await fs.mkdir(path.join(workspace, '.fleet'), { recursive: true });
  await fs.mkdir(path.join(workspace, 'runtime-broker'));
  const runtime = { profile: 'service', command: { runtime: language, entrypoint: module, args: [] }, requiredEnv: [],
    healthPath: '/health', invokePath: '/api/invoke', files: [module, adapter, 'index.html', 'integration-config.json'] };
  const experiment = { experimentId: 'synthetic-comparison', candidateId: language, behaviorHash: 'a'.repeat(64), evaluationSetHash: 'b'.repeat(64), executionHash: 'c'.repeat(64) };
  const files = {
    'solution-contract.json': JSON.stringify({ schemaVersion: 1, objective: 'Return the supplied synthetic value.', runtime,
      capabilities: [{ id: 'echo', kind: 'algorithm', description: 'Return the input.', required: true, criterionIds: ['R1'], evaluationIds: ['echo-cases'] }] }),
    '.fleet/packet.json': JSON.stringify({ acceptance: [{ id: 'R1', requirement: 'Return the input.', method: 'automated', scenario: 'Changed input changes output.' }] }),
    'index.html': '<h1>Synthetic comparison app</h1>',
    'integration-config.json': JSON.stringify({ operations: [], static: { root: '.', files: ['index.html'], index: 'index.html' } }),
    [module]: language === 'node' ? 'export const invoke = input => input;' : 'def invoke(value, context):\n    return value\n'
  };
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), body);
  await fs.copyFile(path.join('templates', adapter), path.join(workspace, adapter));
  const input = { workspace, parent: root, title: 'Synthetic comparison service', verifiedHash: await sourceHash(workspace),
    evidence: { report: 'Synthetic admission fixture', review: 'Synthetic approval fixture' }, deliveryMarkdown: 'Run the included adapter.',
    reference: { runtime, operations: [], experiment } };
  return { root, workspace, runtime, experiment, input };
}

for (const language of ['node', 'python']) test(`comparison ${language} container starts its delivered adapter`, async t => {
  const h = await fixture(t, language), before = structuredClone(h.runtime);
  const bundle = await exportVerifiedBundle(h.input);
  const dockerfile = await fs.readFile(path.join(bundle, 'Dockerfile'), 'utf8');
  const command = JSON.parse(dockerfile.split('\n').find(line => line.startsWith('CMD ')).slice(4));
  assert.deepEqual(command, [language === 'node' ? 'node' : 'python3', './runtime-broker/' + (language === 'node' ? 'node.mjs' : 'python.py'), '--serve', './' + h.runtime.command.entrypoint, './integration-config.json']);
  assert.deepEqual(h.runtime, before, 'Delivery cannot rewrite the frozen execution contract.');
  if (language !== 'node') return; // Native Python execution remains in the resource parity suite.
  const project = { ...newProject({ title: 'Synthetic comparison service', description: 'Exercise comparison packaging.', criteria: ['Return the input.'] }),
    workspace: h.workspace, status: 'approved', approvedAt: new Date().toISOString(),
    report: { exitCode: 0, passed: 1, total: 1, failed: 0, skipped: 0, sourceHash: h.input.verifiedHash,
      // Synthetic admission state exercises packaging, not higher-version verification.
      quality: { schemaVersion: 1, status: 'passed', errors: [], criteria: [{ status: 'passed' }], journeys: [{ status: 'passed' }], experiment: h.experiment } } };
  bindSyntheticApproval(project);
  const staged = await stageExecutable(project, h.root);
  const main = await fs.readFile(path.join(staged.source, 'main.cjs'), 'utf8');
  const configuration = JSON.parse(main.match(/require\('\.\/standalone-service\.cjs'\)\((\{.*\}), path\.join/)[1]);
  assert.deepEqual([configuration.runtime.command.runtime, './' + configuration.runtime.command.entrypoint, ...configuration.runtime.command.args], command);
  const child = spawn(process.execPath, command.slice(1), { cwd: path.join(staged.source, 'application'), env: { ...process.env, HOST: '127.0.0.1', PORT: '0' }, stdio: ['ignore', 'ignore', 'pipe'] });
  const closed = new Promise(resolve => child.once('close', resolve));
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); await closed; });
  const origin = await new Promise((resolve, reject) => {
    let diagnostics = '';
    const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Synthetic delivered service did not become ready. ' + diagnostics)); }, 5000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('close', () => { clearTimeout(timeout); reject(new Error(diagnostics)); });
    child.stderr.on('data', chunk => { diagnostics += chunk; const found = /Application server ready: (http:\/\/127\.0\.0\.1:\d+)/.exec(diagnostics); if (found) { clearTimeout(timeout); resolve(found[1]); } });
  });
  assert.equal((await fetch(origin + '/health')).status, 200);
  const response = await fetch(origin + '/api/invoke', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"synthetic":37}' });
  assert.deepEqual(await response.json(), { synthetic: 37 });
  assert.match(await (await fetch(origin + '/')).text(), /Synthetic comparison app/);
});
