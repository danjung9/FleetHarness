// Explicit infrastructure smoke: run only with a staging Vercel OIDC environment.
// No OpenAI requests or credentials are involved.
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';
import { Sandbox } from '@vercel/sandbox';
import { prepareFleetWorkspace } from '../dist-worker/harness/integration.js';
import { newProject, sourceHash, listArtifacts } from '../dist-worker/electron/storage.js';
import { loadQualityContract } from '../dist-worker/electron/quality.js';
import { qualityFixture, qualityFixtureHtml } from '../scripts/quality-fixture.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-sandbox-smoke-'));
const orchestration = path.join(process.cwd(), '.hosted-sandbox-smoke.mjs');
let sandbox;
try {
  await build({ stdin: { contents: "export { stageInputs, runtimeLaunch, sha256 } from './server/sandbox.ts'", resolveDir: process.cwd() }, outfile: orchestration,
    bundle: true, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'no-server-assets', setup(b) {
      b.onResolve({ filter: /^nitro\/storage$/ }, () => ({ path: 'nitro/storage', namespace: 'stub' }));
      b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const useStorage=()=>{throw new Error("No server assets in smoke test")};' }));
    } }] });
  const { stageInputs, runtimeLaunch, sha256 } = await import(pathToFileURL(orchestration).href);
  const workspace = path.join(root, 'workspace'); await fs.mkdir(workspace);
  const project = newProject({ title: 'Sandbox verification fixture', description: 'Parse a synthetic task and recover from invalid input.', criteria: ['Parse a task and recover from empty input.'] });
  const runId = randomUUID(); project.runId = runId;
  const packet = await prepareFleetWorkspace({ ...project, workspace, resourcesRoot: path.resolve('dist-worker') });
  const files = { ...qualityFixture(packet.acceptance.map(c => c.id)), 'index.html': qualityFixtureHtml,
    'core.cjs': 'exports.parse = text => text.startsWith("TASK: ") ? text.slice(6) : null;',
    'app.test.cjs': `const t=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),{parse}=require('./core.cjs');
t('parse task',()=>a.equal(parse('TASK: inspect pump'),'inspect pump'));
t('empty input',()=>a.equal(parse(''),null));
t('test process cannot alter verification state',()=>{a.equal(process.getuid(),65534);a.match(fs.readFileSync('/proc/self/status','utf8'),/^NoNewPrivs:\\s+1$/m);a.throws(()=>fs.writeFileSync('../control/verified-report.json','forged'),{code:'EACCES'});a.throws(()=>fs.writeFileSync('../runtime/verify.mjs','forged'),{code:'EACCES'});});` };
  for (const name of ['requirements.md', 'scope.md', 'research.md', 'plan.md', 'test-matrix.md', 'README.md', 'path-to-fleet.md', 'verification.md']) files[name] = '# Synthetic verification fixture\nLocal-only task parsing, no production integrations.';
  for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), content);
  const quality = await loadQualityContract(workspace, packet.acceptance);
  const input = { version: 1, runId, epoch: 1, project, sourceHash: await sourceHash(workspace), packetHash: packet.packetHash, qualityHash: quality.hash };
  sandbox = await Sandbox.create({ name: 'fleet-verifier-smoke-' + randomUUID().slice(0, 8), timeout: 12 * 60_000, persistent: false });
  console.log('Created isolated staging verifier sandbox.');
  await sandbox.writeFiles([{ path: '/vercel/sandbox/runtime.tar.gz', content: await fs.readFile('dist-worker.tar.gz') }]);
  const unpack = await sandbox.runCommand('bash', ['-c', 'mkdir -p /vercel/sandbox/control /vercel/sandbox/runtime /vercel/sandbox/workspace && tar -xzf /vercel/sandbox/runtime.tar.gz -C /vercel/sandbox/runtime']);
  if (unpack.exitCode !== 0) throw new Error('Runtime unpack failed.');
  const inputs = await Promise.all((await listArtifacts(workspace)).map(async file => ({ path: '/vercel/sandbox/workspace/' + file.path, content: await fs.readFile(path.join(workspace, file.path)) })));
  inputs.push({ path: '/vercel/sandbox/control/verify-input.json', content: JSON.stringify(input) });
  await stageInputs(sandbox, 'verify', inputs);
  await stageInputs(sandbox, 'verify', [{ path: '/vercel/sandbox/control/verify-input.json', content: 'must not overwrite prepared input' }]);
  const command = await sandbox.runCommand({ cmd: 'bash', args: ['-c', runtimeLaunch('verify')], detached: true, timeoutMs: 11 * 60_000 });
  console.log('Installing runtime dependencies and Chromium, then executing isolated Node and browser checks.');
  const duplicate = await sandbox.runCommand({ cmd: 'bash', args: ['-c', runtimeLaunch('verify')], detached: true, timeoutMs: 11 * 60_000 });
  const done = await command.wait();
  const output = await done.stdout();
  if (done.exitCode !== 0) {
    const log = await sandbox.readFileToBuffer({ path: '/vercel/sandbox/control/install.log' });
    console.log('Install log tail:', log?.toString().slice(-3500));
    console.log('Verifier output:', output.slice(-7000));
    throw new Error('Independent verification failed in the staging sandbox.');
  }
  const result = JSON.parse(output.trim());
  const report = await sandbox.readFileToBuffer({ path: '/vercel/sandbox/control/verified-report.json' });
  const bundle = await sandbox.readFileToBuffer({ path: '/vercel/sandbox/control/verified-artifacts.json' });
  if (sha256(report) !== result.reportSha256 || sha256(bundle) !== result.artifactsSha256) throw new Error('Verification output digest mismatch.');
  const replay = await duplicate.wait();
  if (replay.exitCode !== 0 || (await replay.stdout()).trim() !== output.trim()) throw new Error('Idempotent command replay failed.');
  const evidence = JSON.parse(report);
  console.log(JSON.stringify({ status: result.status, nodeTests: evidence.passed, browserJourneys: evidence.quality.journeys.filter(j => j.status === 'passed').length, quality: evidence.quality.status, duplicateLaunchReplayed: true, inputOverwritePrevented: true }));
} finally {
  if (sandbox) { await sandbox.stop(); console.log('Stopped staging verifier sandbox.'); }
  await fs.rm(root, { recursive: true, force: true });
  await fs.rm(orchestration, { force: true });
}
