import { randomUUID } from 'node:crypto';
import { start } from 'workflow/api';
import { db, type ArtifactManifest, type HostedRun } from './data.js';
import { HttpError } from './http.js';
import { modelToken } from './model-proxy.js';
import { Sandbox, CONTROL, WORKSPACE, installRuntime, stageInputs, runtimeLaunch, readControl, sha256, appOrigin } from './sandbox.js';
import { buildWorkflow } from '../workflows/build.js';
import type { Project, TestReport } from '../shared/types.js';
import type { WorkerInput, WorkerProgress, CheckpointPointer } from '../worker/types.js';
import { validateBundle, type ArtifactBundle } from '../worker/files.js';
import type { PipelineCheckpoint } from '../electron/pi-backend.js';
import { reportPassed } from '../shared/verification.js';
import { completedCommand } from './command-status.js';

type BuildMetadata = Record<string, unknown> & {
  mode?: 'start' | 'resume'; startedAt?: number; retryVerification?: boolean;
  checkpoint?: CheckpointPointer; checkpointManifest?: ArtifactManifest;
  packetHash?: string; qualityHash?: string; candidateManifest?: ArtifactManifest;
  verifier?: { sandboxName: string; commandId: string; startedAt: number };
};
const active = (run: HostedRun, epoch: number) => run.epoch === epoch && ['queued', 'running', 'pausing'].includes(run.status);
const metadata = (run: HostedRun) => run.metadata as BuildMetadata;

export async function startRun(userId: string, projectId: string, mode: 'start' | 'resume'): Promise<void> {
  const account = await db().getSettings(userId);
  if (!account.connected || !account.settings.model || !account.modelIds.includes(account.settings.model)) throw new HttpError(409, 'Connect and test an OpenAI model in Settings first.');
  const { run } = await db().claimRun(userId, projectId, mode, account.settings.model);
  try {
    const next = { ...metadata(run), mode, startedAt: Date.now() };
    delete next.verifier; delete next.candidateManifest;
    if (mode === 'start') delete next.retryVerification;
    await db().patchRun(run.id, run.epoch, { metadata: next });
    const workflow = await start(buildWorkflow, [run.id, run.epoch]);
    await db().patchRun(run.id, run.epoch, { workflowId: workflow.runId });
  } catch {
    await failBuild(run.id, run.epoch, 'The build could not be scheduled. Please retry.');
    throw new HttpError(503, 'The build could not be scheduled. Please retry.');
  }
}
export async function pauseRun(userId: string, projectId: string): Promise<void> {
  await db().requestPause(userId, projectId);
}

export async function prepareBuild(runId: string, epoch: number): Promise<boolean> {
  let run = await db().getRun(runId);
  if (!active(run, epoch)) return false;
  if (run.commandId && run.sandboxId) return true;
  if (run.status === 'pausing') { await finishPaused(run); return false; }
  const name = `build-${run.id}-${epoch}`;
  const sandbox = await Sandbox.getOrCreate({ name, timeout: 40 * 60_000, persistent: false });
  await installRuntime(sandbox);
  const project = await db().getProject(run.userId, run.projectId);
  const meta = metadata(run);
  const inputs: { path: string; content: Buffer | string }[] = [];
  if (meta.mode === 'resume') {
    if (!meta.checkpoint || !meta.checkpointManifest) throw new Error('No saved checkpoint.');
    const saved = await db().readManifestFiles(run, meta.checkpointManifest);
    const checkpointBytes = saved.find(file => file.path === 'checkpoint/metadata.json')?.content;
    const bundleBytes = Buffer.concat(saved.filter(file => /^checkpoint\/files\.\d+$/.test(file.path)).sort((a,b) => a.path.localeCompare(b.path)).map(file => file.content));
    if (!checkpointBytes || sha256(checkpointBytes) !== meta.checkpoint.metadataSha256 || sha256(bundleBytes) !== meta.checkpoint.filesSha256) throw new Error('Checkpoint integrity failed.');
    inputs.push({ path: `${CONTROL}/${meta.checkpoint.metadataPath}`, content: checkpointBytes }, { path: `${CONTROL}/${meta.checkpoint.filesPath}`, content: bundleBytes });
  }
  const input: WorkerInput = { version: 1, runId, epoch, mode: meta.mode ?? 'start', project,
    requireCheckpointAck: true,
    settings: { backend: 'pi', provider: 'openai', model: run.model, rememberKey: false },
    providerBaseUrl: `${appOrigin()}/api/internal/model/${runId}`, providerToken: modelToken(runId, epoch),
    ...(meta.mode === 'resume' ? { checkpoint: meta.checkpoint, retryVerification: meta.retryVerification } : {}) };
  inputs.push({ path: `${CONTROL}/input.json`, content: JSON.stringify(input) });
  await stageInputs(sandbox, 'worker', inputs);
  run = await db().getRun(runId);
  if (!active(run, epoch)) { await sandbox.stop(); return false; }
  const launched = await db().patchRun(runId, epoch, { status: 'running', sandboxId: name });
  if (!launched) { await sandbox.stop(); return false; }
  if (launched.status === 'pausing') await sandbox.writeFiles([{ path: `${CONTROL}/pause`, content: 'pause' }]);
  const command = await sandbox.runCommand({ cmd: 'bash', args: ['-c', runtimeLaunch('worker')], detached: true, timeoutMs: 39 * 60_000 });
  await db().patchRun(runId, epoch, { commandId: command.cmdId });
  return true;
}

async function saveCheckpoint(run: HostedRun, sandbox: Sandbox, pointer: CheckpointPointer): Promise<HostedRun> {
  const acknowledge = async (saved: CheckpointPointer) => {
    const temporary = `${CONTROL}/checkpoint-ack-${randomUUID()}.json`;
    await sandbox.writeFiles([{ path: temporary, content: JSON.stringify({ checkpointId: saved.checkpointId, metadataSha256: saved.metadataSha256, filesSha256: saved.filesSha256 }) }]);
    const moved = await sandbox.runCommand('mv', [temporary, `${CONTROL}/checkpoint-ack.json`]);
    if (moved.exitCode !== 0) throw new Error('Durable checkpoint acknowledgement failed.');
  };
  if (metadata(run).checkpoint?.checkpointId === pointer.checkpointId) { await acknowledge(metadata(run).checkpoint!); return run; }
  if (!/^[a-f0-9-]{36}$/.test(pointer.checkpointId) || pointer.metadataPath !== `checkpoints/${pointer.checkpointId}/checkpoint.json` || pointer.filesPath !== `checkpoints/${pointer.checkpointId}/files.json`) throw new Error('Invalid checkpoint.');
  const checkpoint = await readControl<PipelineCheckpoint>(sandbox, pointer.metadataPath, 16 * 1024 * 1024);
  const bundle = await readControl<ArtifactBundle>(sandbox, pointer.filesPath, 32 * 1024 * 1024);
  if (!checkpoint || !bundle || sha256(checkpoint.bytes) !== pointer.metadataSha256 || sha256(bundle.bytes) !== pointer.filesSha256 || checkpoint.value.project.id !== run.projectId || checkpoint.value.project.runId !== run.id || checkpoint.value.sourceHash !== pointer.sourceHash || bundle.value.sourceHash !== pointer.sourceHash || bundle.value.epoch !== run.epoch || checkpoint.value.completedStage !== pointer.completedStage) throw new Error('Checkpoint identity or integrity failed.');
  validateBundle(bundle.value, run.id);
  if (metadata(run).packetHash && metadata(run).packetHash !== checkpoint.value.packetHash || metadata(run).qualityHash && checkpoint.value.qualityHash && metadata(run).qualityHash !== checkpoint.value.qualityHash) throw new Error('The saved source or quality contract changed.');
  const chunks = [{ path: 'checkpoint/metadata.json', content: checkpoint.bytes }];
  for (let offset = 0; offset < bundle.bytes.length; offset += 8 * 1024 * 1024) chunks.push({ path: `checkpoint/files.${String(chunks.length - 1).padStart(4, '0')}`, content: bundle.bytes.subarray(offset, offset + 8 * 1024 * 1024) });
  const checkpointManifest = await db().putArtifacts(run, randomUUID(), chunks);
  const manifest = await db().putArtifacts(run, randomUUID(), bundle.value.files.map(file => ({ path: file.path, content: Buffer.from(file.base64, 'base64') })));
  const saved = await db().patchRun(run.id, run.epoch, { checkpointStage: pointer.completedStage === 'prepared' ? undefined : pointer.completedStage, manifest, metadata: { ...metadata(run), checkpoint: pointer, checkpointManifest, packetHash: checkpoint.value.packetHash, ...(checkpoint.value.qualityHash ? { qualityHash: checkpoint.value.qualityHash } : {}) } }, { checkpointStage: pointer.completedStage === 'prepared' ? undefined : pointer.completedStage, canResume: true });
  if (saved) await acknowledge(pointer);
  return saved ?? run;
}

function progressPatch(progress: WorkerProgress): Partial<Project> {
  return { stages: progress.project.stages, logs: progress.project.logs.slice(-600),
    systemDesign: progress.project.systemDesign, qualityVersion: progress.project.qualityVersion, phasePlan: progress.project.phasePlan, globalTools: progress.project.globalTools };
}
async function finishPaused(run: HostedRun): Promise<void> {
  const resumable = !!metadata(run).checkpoint;
  await db().patchRun(run.id, run.epoch, { status: 'paused' }, { status: 'paused', canResume: resumable, error: resumable ? undefined : 'Paused before the first checkpoint. Start a new build to continue.' });
  if (run.sandboxId) await Sandbox.get({ name: run.sandboxId }).then(sandbox => sandbox.stop()).catch(() => {});
}

export async function pollBuild(runId: string, epoch: number): Promise<'continue' | 'verify' | 'done'> {
  let run = await db().getRun(runId);
  if (!active(run, epoch)) return 'done';
  if (metadata(run).candidateManifest) return 'verify';
  if (!run.sandboxId || !run.commandId) throw new Error('Build was not started.');
  const sandbox = await Sandbox.get({ name: run.sandboxId });
  const elapsed = Date.now() - (metadata(run).startedAt ?? Date.parse(run.createdAt));
  if (elapsed > 35 * 60_000 && run.status !== 'pausing') run = await db().requestPause(run.userId, run.projectId);
  if (run.status === 'pausing') await sandbox.writeFiles([{ path: `${CONTROL}/pause`, content: 'pause' }]);
  const saved = await readControl<WorkerProgress>(sandbox, 'progress.json', 16 * 1024 * 1024);
  if (saved) {
    const progress = saved.value;
    if (progress.runId !== run.id || progress.epoch !== epoch || progress.project.id !== run.projectId) throw new Error('Worker progress identity failed.');
    if (progress.checkpoint) run = await saveCheckpoint(run, sandbox, progress.checkpoint);
    await db().patchRun(run.id, epoch, {}, progressPatch(progress));
    if (progress.status === 'paused') { await finishPaused(run); return 'done'; }
    if (progress.status === 'failed') { await failBuild(runId, epoch, progress.error?.slice(0, 2000) ?? 'The build stopped. Resume its last checkpoint or try again.'); return 'done'; }
    if (progress.status === 'review') {
      const latest = await db().getRun(runId);
      if (!active(latest, epoch)) { await sandbox.stop(); return 'done'; }
      if (latest.status === 'pausing') { await finishPaused(latest); return 'done'; }
      run = latest;
      const bundle = await readControl<ArtifactBundle>(sandbox, 'artifacts.json', 32 * 1024 * 1024);
      if (!bundle || bundle.value.epoch !== epoch) throw new Error('Final artifacts are missing.');
      validateBundle(bundle.value, run.id);
      const candidateManifest = await db().putArtifacts(run, randomUUID(), bundle.value.files.map(file => ({ path: file.path, content: Buffer.from(file.base64, 'base64') })));
      await db().patchRun(run.id, epoch, { metadata: { ...metadata(run), candidateManifest } }, { status: 'running', report: undefined });
      await sandbox.stop();
      return 'verify';
    }
  }
  if (elapsed > 38 * 60_000) { await finishPaused(run); return 'done'; }
  const command = await completedCommand(await sandbox.getCommand(run.commandId!));
  if (command) {
    // The final progress write may have raced the earlier read while wait observed exit.
    const final = await readControl<WorkerProgress>(sandbox, 'progress.json', 16 * 1024 * 1024);
    if (final && ['review', 'paused', 'failed'].includes(final.value.status)) return 'continue';
    await failBuild(runId, epoch, 'The sandbox stopped before finishing. Resume the last saved checkpoint or start again.');
    return 'done';
  }
  return 'continue';
}

export async function prepareVerification(runId: string, epoch: number): Promise<boolean> {
  const run = await db().getRun(runId), meta = metadata(run);
  if (!active(run, epoch)) return false;
  if (run.status === 'pausing') { await finishPaused(run); return false; }
  if (meta.verifier) return true;
  if (!meta.candidateManifest || !meta.packetHash || !meta.qualityHash) throw new Error('Verification input is missing.');
  const sandbox = await Sandbox.getOrCreate({ name: `verify-${run.id}-${epoch}`, timeout: 12 * 60_000, persistent: false });
  await installRuntime(sandbox);
  const files = await db().readManifestFiles(run, meta.candidateManifest);
  const project = await db().getProject(run.userId, run.projectId);
  await stageInputs(sandbox, 'verify', [...files.map(file => ({ path: `${WORKSPACE}/${file.path}`, content: file.content })),
    { path: `${CONTROL}/verify-input.json`, content: JSON.stringify({ version: 1, runId, epoch, project, sourceHash: meta.candidateManifest.sourceHash, packetHash: meta.packetHash, qualityHash: meta.qualityHash }) }]);
  const latest = await db().getRun(runId);
  if (!active(latest, epoch) || latest.status === 'pausing') { await sandbox.stop(); if (active(latest, epoch)) await finishPaused(latest); return false; }
  const command = await sandbox.runCommand({ cmd: 'bash', args: ['-c', runtimeLaunch('verify')], detached: true, timeoutMs: 11 * 60_000 });
  await db().patchRun(runId, epoch, { metadata: { ...meta, verifier: { sandboxName: sandbox.name, commandId: command.cmdId, startedAt: Date.now() } } });
  return true;
}

export async function pollVerification(runId: string, epoch: number): Promise<boolean> {
  const run = await db().getRun(runId), verifier = metadata(run).verifier;
  if (!active(run, epoch)) return true;
  if (!verifier) throw new Error('Verification was not started.');
  const sandbox = await Sandbox.get({ name: verifier.sandboxName });
  if (run.status === 'pausing') { await sandbox.stop(); await finishPaused(run); return true; }
  if (Date.now() - verifier.startedAt > 11 * 60_000) throw new Error('Verification timed out.');
  const command = await completedCommand(await sandbox.getCommand(verifier.commandId));
  if (!command) return false;
  if (command.exitCode !== 0) { await sandbox.stop(); throw new Error('Independent verification did not pass. Resume the build to repair it.'); }
  const output = JSON.parse((await command.stdout()).trim()) as { version: number; status: string; runId: string; epoch: number; sourceHash: string; reportSha256: string; artifactsSha256: string; checkpointSha256: string };
  const report = await readControl<TestReport>(sandbox, 'verified-report.json', 8 * 1024 * 1024);
  const bundle = await readControl<ArtifactBundle>(sandbox, 'verified-artifacts.json', 32 * 1024 * 1024);
  const checkpoint = await readControl<PipelineCheckpoint>(sandbox, 'verified-checkpoint.json', 16 * 1024 * 1024);
  if (output.version !== 1 || output.status !== 'passed' || output.runId !== runId || output.epoch !== epoch || !report || !bundle || !checkpoint || sha256(report.bytes) !== output.reportSha256 || sha256(bundle.bytes) !== output.artifactsSha256 || sha256(checkpoint.bytes) !== output.checkpointSha256 || bundle.value.epoch !== epoch || checkpoint.value.project.id !== run.projectId || checkpoint.value.project.runId !== runId || checkpoint.value.sourceHash !== output.sourceHash || checkpoint.value.qualityHash !== metadata(run).qualityHash || checkpoint.value.packetHash !== metadata(run).packetHash || !reportPassed(report.value, true)) throw new Error('Independent verification evidence failed integrity checks.');
  validateBundle(bundle.value, runId);
  const manifest = await db().putArtifacts(run, randomUUID(), bundle.value.files.map(file => ({ path: file.path, content: Buffer.from(file.base64, 'base64') })));
  if (manifest.sourceHash !== output.sourceHash || report.value.sourceHash !== manifest.sourceHash) throw new Error('Verified source hash does not match.');
  const project = await db().getProject(run.userId, run.projectId);
  const latest = await db().getRun(runId);
  if (!active(latest, epoch) || latest.status === 'pausing') { await sandbox.stop(); if (active(latest, epoch)) await finishPaused(latest); return true; }
  await db().patchRun(runId, epoch, { status: 'review', manifest, artifactPrefix: manifest.prefix }, { status: 'review', report: report.value, error: undefined, canResume: false,
    stages: project.stages.map(stage => stage.id === 'verify' ? { ...stage, status: 'complete' } : stage.id === 'review' ? { ...stage, status: 'review' } : stage) });
  await sandbox.stop();
  return true;
}

export async function failBuild(runId: string, epoch: number, message = 'The hosted build was interrupted. Resume its last saved checkpoint or start again.'): Promise<void> {
  const run = await db().getRun(runId);
  if (!active(run, epoch)) return;
  await db().patchRun(runId, epoch, { status: 'failed', metadata: { ...metadata(run), ...(metadata(run).verifier ? { retryVerification: true } : {}) } }, { status: 'failed', error: message, canResume: !!metadata(run).checkpoint });
  const names = [run.sandboxId, metadata(run).verifier?.sandboxName].filter(Boolean) as string[];
  await Promise.allSettled(names.map(name => Sandbox.get({ name }).then(sandbox => sandbox.stop())));
}
