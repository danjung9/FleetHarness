import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Project } from './runtime/shared/types.js';
import { stageDefinitions } from './runtime/shared/types.js';
import type { PipelineCheckpoint } from './runtime/electron/pi-backend.js';
import { sourceHash } from './runtime/electron/storage.js';
import { verifyApplication, loadQualityContract } from './runtime/electron/quality.js';
import { reportPassed } from './runtime/electron/verification.js';
import { prepareFleetWorkspace, assertFleetPacketIntegrity } from './runtime/harness/integration.js';
import { atomicJson, collectArtifacts, readJson } from './files.js';

export interface VerificationInput {
  version: 1;
  runId: string;
  epoch: number;
  project: Project;
  sourceHash: string;
  packetHash: string;
  qualityHash: string;
}
const execute = promisify(execFile);
const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";

async function readableWorkspace(root: string) {
  if ((await fs.lstat(root)).isSymbolicLink()) throw new Error('Verification workspace must not be a symbolic link.');
  await fs.chmod(root, 0o755);
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isSymbolicLink() || !entry.isFile() && !entry.isDirectory()) throw new Error('Verification workspace contains a non-regular artifact.');
    if (entry.isDirectory()) await readableWorkspace(file);
    else await fs.chmod(file, 0o644);
  }
}

/** Node tests have another uid and no_new_privs; they cannot modify the verifier or its output. */
async function testExecutable(control: string, resourcesRoot: string) {
  if (process.platform !== 'linux' || !process.getuid || process.getuid() === 65534 || process.getuid() === 0) throw new Error('Independent verification requires a non-root Linux owner and an isolated test user.');
  const wrapper = path.join(control, 'node-test');
  const args = ['-n', '--', 'setpriv', '--no-new-privs', '--reuid=65534', '--regid=65534', '--clear-groups', '--', process.execPath];
  const check = `const fs=require('node:fs');
    if(process.getuid()!==65534||process.getgid()!==65534||!/^NoNewPrivs:\\s+1$/m.test(fs.readFileSync('/proc/self/status','utf8')))process.exit(10);
    for(const name of process.argv.slice(1)){try{const f=fs.openSync(name,'r+');fs.closeSync(f);process.exit(11)}catch(e){if(e.code!=='EACCES'&&e.code!=='EPERM')process.exit(12)}}
    console.log('isolated');`;
  const probe = path.join(control, 'isolation-probe');
  await fs.writeFile(probe, 'private', { mode: 0o600 });
  const checked = await execute('sudo', [...args, '-e', check, probe, path.join(resourcesRoot, 'verify.mjs')], { timeout: 10_000, maxBuffer: 4096 });
  if (checked.stdout.trim() !== 'isolated') throw new Error('The sandbox could not isolate generated tests from trusted verification state.');
  await fs.writeFile(wrapper, '#!/bin/sh\nexec sudo ' + args.map(quote).join(' ') + ' "$@"\n', { mode: 0o700 });
  return wrapper;
}

export async function verifyHosted(inputPath: string, resourcesRoot: string) {
  const control = path.resolve(path.dirname(inputPath));
  if (path.basename(control) !== 'control' || path.basename(inputPath) !== 'verify-input.json') throw new Error('Verification input must be control/verify-input.json.');
  const input = (await readJson<VerificationInput>(inputPath, 16 * 1024 * 1024)).value;
  if (input?.version !== 1 || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.runId) || !Number.isSafeInteger(input.epoch) || input.epoch < 1 ||
    ![input.sourceHash, input.packetHash, input.qualityHash].every(hash => /^[a-f0-9]{64}$/.test(hash))) throw new Error('Invalid independent verification input.');
  const workspace = path.join(path.dirname(control), 'workspace');
  await fs.chmod(control, 0o700);
  await fs.chmod(path.dirname(control), 0o755);
  await readableWorkspace(workspace);
  const executable = await testExecutable(control, resourcesRoot);
  if (await sourceHash(workspace) !== input.sourceHash) throw new Error('Submitted source does not match the expected artifact hash.');
  const project = structuredClone(input.project);
  const packet = await prepareFleetWorkspace({ workspace, title: project.title, description: project.description,
    criteria: project.criteria, resources: project.resources, links: project.links, challengeId: project.challengeId,
    sourceChallenge: project.sourceChallenge, resourcesRoot });
  if (packet.packetHash !== input.packetHash) throw new Error('Submitted source context does not match the server brief.');
  await assertFleetPacketIntegrity(workspace, input.packetHash);
  const quality = await loadQualityContract(workspace, packet.acceptance);
  if (quality.hash !== input.qualityHash) throw new Error('Submitted acceptance contract does not match the saved plan.');
  const report = await verifyApplication(workspace, executable, quality);
  if (!reportPassed(report, true)) throw new Error('Independent Node tests or browser journeys did not pass.\n' + report.output.slice(-6000));
  await assertFleetPacketIntegrity(workspace, input.packetHash);
  await fs.writeFile(path.join(workspace, 'test-report.json'), JSON.stringify(report, null, 2));
  project.runId = input.runId; project.workspace = workspace; project.report = report; project.qualityVersion = 1;
  project.status = 'review'; project.error = undefined; project.approvedAt = undefined;
  project.stages = structuredClone(stageDefinitions).map(stage => ({ ...stage, status: stage.id === 'review' ? 'review' : stage.id === 'deliver' ? 'queued' : 'complete' }));
  project.updatedAt = new Date().toISOString();
  const artifacts = await collectArtifacts(workspace, input.runId, input.epoch);
  if (artifacts.sourceHash !== report.sourceHash) throw new Error('Source changed after independent verification.');
  const checkpoint: PipelineCheckpoint = { version: 1, completedStage: 'verify', project, packetHash: packet.packetHash,
    qualityHash: quality.hash, sourceHash: artifacts.sourceHash };
  const reportSha256 = await atomicJson(path.join(control, 'verified-report.json'), report);
  const artifactsSha256 = await atomicJson(path.join(control, 'verified-artifacts.json'), artifacts);
  const checkpointSha256 = await atomicJson(path.join(control, 'verified-checkpoint.json'), checkpoint);
  return { version: 1 as const, status: 'passed' as const, runId: input.runId, epoch: input.epoch,
    sourceHash: artifacts.sourceHash, reportSha256, artifactsSha256, checkpointSha256 };
}
