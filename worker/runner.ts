import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { FleetBackend, type PipelineCheckpoint } from '../electron/pi-backend.js';
import { Store } from '../electron/storage.js';
import { atomicJson, collectArtifacts, readJson, restoreArtifacts, type ArtifactBundle } from './files.js';
import type { CheckpointPointer, WorkerInput, WorkerProgress } from './types.js';

type BackendOptions = NonNullable<ConstructorParameters<typeof FleetBackend>[4]>;
export interface WorkerOptions {
  resourcesRoot: string;
  signal?: AbortSignal;
  /** Dependency injection for deterministic, no-network worker tests. */
  runtime?: ModelRuntime;
  backendOptions?: Omit<BackendOptions, 'checkpoint'>;
}

export function redact<T>(value: T, secrets: string[]): T {
  let json = JSON.stringify(value);
  for (const secret of secrets) if (secret.length > 8) json = json.split(JSON.stringify(secret).slice(1, -1)).join('[redacted]');
  return JSON.parse(json.replace(/sk-(?:proj-)?[A-Za-z0-9_-]{16,}/g, '[redacted]')) as T;
}

class WorkerStore extends Store {
  constructor(root: string, private readonly secrets: string[]) { super(root); }
  override save() {
    const live = this.state;
    // Store.save captures JSON synchronously. Keep the live model/tool objects intact.
    this.state = redact(live, this.secrets);
    try { return super.save(); }
    finally { this.state = live; }
  }
}

function validateInput(input: WorkerInput) {
  if (input?.version !== 1 || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.runId) || !Number.isSafeInteger(input.epoch) || input.epoch < 1 ||
    !['start', 'resume'].includes(input.mode) || typeof input.project?.id !== 'string' ||
    !Array.isArray(input.project.stages) || !Array.isArray(input.project.logs) || !Array.isArray(input.project.criteria) ||
    input.settings?.provider !== 'openai' || input.settings.backend && input.settings.backend !== 'pi' ||
    typeof input.settings.model !== 'string' || typeof input.providerToken !== 'string' || input.providerToken.length < 16) throw new Error('Invalid hosted worker input.');
  const url = new URL(input.providerBaseUrl);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) || url.username || url.password || url.search || url.hash) throw new Error('The model broker must use HTTPS.');
}

export async function createRuntime(input: WorkerInput, control: string) {
  const runtime = await ModelRuntime.create({ authPath: path.join(control, 'runtime-auth.json'), modelsPath: null,
    modelsStorePath: path.join(control, 'model-cache'), allowModelNetwork: false, refreshOnCreate: false });
  const selected = runtime.getModel('openai', input.settings.model);
  if (!selected) throw new Error('The selected OpenAI model is not supported by this worker.');
  runtime.registerProvider('openai', { baseUrl: input.providerBaseUrl, api: 'openai-responses',
    models: [{ id: selected.id, name: selected.name, reasoning: selected.reasoning, input: selected.input,
      cost: selected.cost, contextWindow: selected.contextWindow, maxTokens: selected.maxTokens,
      ...(selected.thinkingLevelMap ? { thinkingLevelMap: selected.thinkingLevelMap } : {}) }] });
  await runtime.setRuntimeApiKey('openai', input.providerToken);
  return runtime;
}

async function loadCheckpoint(control: string, input: WorkerInput) {
  const pointer = input.checkpoint ?? (await readJson<CheckpointPointer>(path.join(control, 'checkpoint.json'), 8192)).value;
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(pointer.checkpointId) ||
    pointer.metadataPath !== `checkpoints/${pointer.checkpointId}/checkpoint.json` || pointer.filesPath !== `checkpoints/${pointer.checkpointId}/files.json`) throw new Error('Invalid checkpoint pointer.');
  const metadata = await readJson<PipelineCheckpoint>(path.join(control, pointer.metadataPath), 16 * 1024 * 1024);
  const artifacts = await readJson<ArtifactBundle>(path.join(control, pointer.filesPath));
  if (metadata.sha256 !== pointer.metadataSha256 || artifacts.sha256 !== pointer.filesSha256 ||
    metadata.value.sourceHash !== pointer.sourceHash || artifacts.value.sourceHash !== pointer.sourceHash ||
    metadata.value.completedStage !== pointer.completedStage || metadata.value.project.runId !== input.runId ||
    metadata.value.project.id !== input.project.id || artifacts.value.epoch > input.epoch) throw new Error('Checkpoint integrity or run identity does not match.');
  return { pointer, checkpoint: metadata.value, artifacts: artifacts.value };
}

/** One process owns one sandbox run. State and checkpoints live outside generated source. */
export async function runWorker(inputPath: string, options: WorkerOptions): Promise<WorkerProgress> {
  const control = path.resolve(path.dirname(inputPath));
  if (path.basename(control) !== 'control' || path.basename(inputPath) !== 'input.json') throw new Error('Worker input must be control/input.json.');
  const input = (await readJson<WorkerInput>(inputPath, 16 * 1024 * 1024)).value;
  validateInput(input);
  const workspace = path.join(path.dirname(control), 'workspace');
  await fs.mkdir(control, { recursive: true, mode: 0o700 });
  if ((await fs.lstat(control)).isSymbolicLink()) throw new Error('Control directory must be a real directory.');
  const secrets = [input.providerToken];
  const store = new WorkerStore(control, secrets);
  // Do not run desktop Store.init(): it intentionally marks interrupted desktop runs stopped.
  store.state = { version: 1, projects: [structuredClone(input.project)], settings: { ...input.settings, backend: 'pi', rememberKey: false } };
  const project = store.project(input.project.id);
  project.runId = input.runId;
  project.workspace = workspace;
  let checkpoint: CheckpointPointer | undefined, pauseRequested = false, terminal = false;
  let writes = Promise.resolve();
  let writing = false, publishAgain = false;
  let writeError: unknown;
  let backend: FleetBackend | undefined;

  const progress = (): WorkerProgress => ({ version: 1, runId: input.runId, epoch: input.epoch,
    status: !terminal ? pauseRequested ? 'pausing' : 'running' : project.status === 'review' ? 'review' : project.status === 'paused' ? 'paused' : 'failed',
    project: redact(structuredClone(project), secrets), ...(checkpoint ? { checkpoint } : {}), updatedAt: new Date().toISOString(),
    ...(project.error ? { error: redact(project.error, secrets) } : {}) });
  const publish = () => {
    publishAgain = true;
    if (writing) return;
    writing = true;
    writes = (async () => {
      try {
        do {
          publishAgain = false;
          await atomicJson(path.join(control, 'progress.json'), progress());
        } while (publishAgain);
      } catch (error) {
        writeError = error;
        backend?.active.get(project.id)?.controller.abort();
      } finally { writing = false; }
    })();
  };
  const requestPause = () => {
    if (terminal || pauseRequested) return;
    pauseRequested = true;
    publish();
    backend?.active.get(project.id)?.controller.abort();
  };
  const pauseFile = async () => {
    try { await fs.lstat(path.join(control, 'pause')); requestPause(); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  };
  let checking = false;
  const timer = setInterval(() => {
    if (checking) return;
    checking = true;
    void pauseFile().catch(error => { writeError = error; requestPause(); }).finally(() => { checking = false; });
  }, 250);
  options.signal?.addEventListener('abort', requestPause, { once: true });
  if (options.signal?.aborted) requestPause();
  publish();
  try {
    // Input is consumed; the broker credential is never copied into progress or archives.
    await fs.rm(inputPath);
    let resume: PipelineCheckpoint | undefined;
    if (input.mode === 'resume') {
      const loaded = await loadCheckpoint(control, input);
      checkpoint = loaded.pointer; resume = loaded.checkpoint;
      await restoreArtifacts(workspace, loaded.artifacts, input.runId);
      if (input.retryVerification && resume.completedStage === 'verify') {
        resume.completedStage = 'build';
        resume.project.report = undefined;
      }
    } else {
      // A fresh run must not reuse files from another attempt.
      await fs.rm(workspace, { recursive: true, force: true });
      await fs.mkdir(workspace, { recursive: true, mode: 0o700 });
    }
    backend = new FleetBackend(store, process.execPath, publish, options.resourcesRoot, {
      maxLogEntries: 120,
      ...options.backendOptions,
      checkpoint: async metadata => {
        if (writeError) throw writeError;
        const files = await collectArtifacts(workspace, input.runId, input.epoch, secrets);
        if (files.sourceHash !== metadata.sourceHash) throw new Error('Workspace changed during checkpoint creation.');
        const checkpointId = randomUUID();
        const metadataPath = `checkpoints/${checkpointId}/checkpoint.json`, filesPath = `checkpoints/${checkpointId}/files.json`;
        const savedMetadata = redact(metadata, secrets);
        savedMetadata.project.logs = savedMetadata.project.logs.slice(-120).map(log => ({ ...log, text: log.text.slice(-8000) }));
        if (savedMetadata.project.report) savedMetadata.project.report.output = savedMetadata.project.report.output.slice(-128_000);
        if (Buffer.byteLength(JSON.stringify(savedMetadata)) > 2 * 1024 * 1024) throw new Error('Checkpoint metadata exceeds the 2 MB limit.');
        const metadataSha256 = await atomicJson(path.join(control, metadataPath), savedMetadata);
        const filesSha256 = await atomicJson(path.join(control, filesPath), files);
        checkpoint = { checkpointId, completedStage: metadata.completedStage, metadataPath, filesPath, metadataSha256, filesSha256, sourceHash: files.sourceHash };
        await atomicJson(path.join(control, 'checkpoint.json'), checkpoint);
        publish(); await writes;
        if (writeError) throw writeError;
        if (input.requireCheckpointAck) {
          const deadline = Date.now() + 5 * 60_000;
          for (;;) {
            await pauseFile();
            if (pauseRequested) break;
            try {
              const ack = (await readJson<{ checkpointId: string; metadataSha256: string; filesSha256: string }>(path.join(control, 'checkpoint-ack.json'), 8192)).value;
              if (ack.checkpointId === checkpointId && ack.metadataSha256 === metadataSha256 && ack.filesSha256 === filesSha256) break;
            } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
            if (Date.now() >= deadline) throw new Error('Durable checkpoint storage did not acknowledge this phase. Resume the last saved checkpoint.');
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        }
        await pauseFile();
        if (pauseRequested) backend!.active.get(project.id)?.controller.abort();
      }
    });
    backend.runtime = options.runtime ?? await createRuntime(input, control);
    await pauseFile();
    await store.save();
    try {
      await backend.start(project.id, { runId: input.runId, workspace, ...(resume ? { resume } : {}) });
      if (pauseRequested) backend.active.get(project.id)?.controller.abort();
      await backend.active.get(project.id)?.done;
    } catch (error) { if (!pauseRequested) throw error; }
    if (writeError) throw writeError;
    if (pauseRequested && project.status !== 'review') {
      project.status = 'paused';
      project.error = undefined;
      project.canResume = !!checkpoint;
    } else if (project.status === 'review') {
      const artifacts = await collectArtifacts(workspace, input.runId, input.epoch, secrets);
      if (artifacts.sourceHash !== project.report?.sourceHash) throw new Error('Final artifacts do not match the verification report.');
      await atomicJson(path.join(control, 'artifacts.json'), artifacts);
      await atomicJson(path.join(control, 'report.json'), redact(project.report, secrets));
    }
  } catch (error) {
    project.status = 'failed';
    project.error = redact(error instanceof Error ? error.message : String(error), secrets);
    project.canResume = !!checkpoint;
  } finally {
    clearInterval(timer);
    options.signal?.removeEventListener('abort', requestPause);
    await backend?.stopAll();
    terminal = true;
    project.updatedAt = new Date().toISOString();
    publish(); await writes;
    await store.save();
  }
  if (writeError) throw writeError;
  return progress();
}
