import { createAgentSession, createBashToolDefinition, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager, type CreateAgentSessionOptions } from '@earendil-works/pi-coding-agent';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { AgentBackend, AgentModel, Project, StageId, ToolEvent } from '../shared/types.js';
import { stageDefinitions } from '../shared/types.js';
import { Store, safeFile, listArtifacts, sourceHash } from './storage.js';
import { applicationTestFiles, reportPassed, VerificationShutdownError } from './verification.js';
import { loadQualityContract, assertQualityContract, verifyApplication, type QualityContract, type ApplicationVerificationLimits } from './quality.js';
import type { AcceptanceCriterion } from '../harness/types.js';
import { runAgentStage, stoppedMessage, sumTokenUsage, type AgentLimits, type StageSession } from './agent-runner.js';
import { prepareFleetWorkspace, fleetStagePrompt, assertFleetPacketIntegrity } from '../harness/integration.js';
import { phasePrompt, toolsForPhase, type PhaseContract } from '../harness/phases.js';
import { createFleetTools } from '../harness/pi-tools.js';
import { createSystemDesignTools, systemDesignPrompt, checkSystemDesign, incompleteComponents } from './system-design.js';

import { createCodexSession } from './codex-session.js';
import type { CodexAccount } from './codex-account.js';
import { RunProcessSweep, runProcessEnvironment } from './process-sweep.js';
import { runIndependentJudge } from './independent-judge.js';

type ActiveRun = { backend: AgentBackend; processes: RunProcessSweep; outcome?: Project['status']; controller: AbortController; done: Promise<void>; resolve: () => void; context?: string; phases?: PhaseContract[]; globalTools?: string[]; packetHash?: string; requirements?: string; acceptance?: AcceptanceCriterion[]; quality?: QualityContract; planHash?: string; retried?: Set<StageId> };
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const briefHash = (p: Project) => digest(JSON.stringify([p.title, p.description, p.criteria, p.resources ?? '', p.links ?? [], p.challengeId ?? null, p.sourceChallenge ?? null]));
const foregroundPolicy = 'Do not start background or detached jobs. Keep shell commands in the foreground and wait for them to finish. Do not use nohup, disown, setsid, Start-Job, Start-Process or trailing &. Stop tracks foreground calls only; an operator must inspect and stop remaining jobs if background activity is detected.';
const backgroundShellCommand = /\b(?:nohup|disown|setsid|Start-Job|Start-Process)\b|(?<![&>\\])&(?![&>])/i;
// Visible-command heuristic only, not a process containment claim. Ignore
// quoted data and literal heredocs used to write HTML containing ampersands.
function shellLaunchText(command: string) {
  return command.replace(/<<-?\s*(['"])([A-Za-z_]\w*)\1[^\n]*\n[\s\S]*?\n\t*\2(?=\r?\n|$)/g, '')
    .replace(/'[^']*'|"(?:\\.|[^"\\])*"|\\./gs, '');
}
// Retry transport/provider interruptions, never artifact, integrity or safety failures.
function transientFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/\b(?:400|401|402|403)\b|unauthori[sz]ed|forbidden|authentication|invalid.*(?:key|model)|quota|billing|insufficient credit/i.test(message)) return false;
  return /\b(?:429|50[0234]|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EAI_AGAIN)\b|provider (?:returned an )?error|connection (?:lost|closed|reset)|network (?:error|failure)|fetch failed|timed? out|timeout|made no progress|exceeded the .*minute limit|service unavailable|rate limit/i.test(message);
}

interface BackendOptions {
  codex?: CodexAccount;
  createCodexSession?: typeof createCodexSession;
  createSession?: (options: CreateAgentSessionOptions) => Promise<{ session: StageSession }>;
  agentLimits?: Partial<AgentLimits>;
  shutdownTimeoutMs?: number;
  verificationLimits?: Partial<ApplicationVerificationLimits>;
  processSweep?: () => RunProcessSweep;
}
export class FleetBackend {
  runtime!: ModelRuntime;
  active = new Map<string, ActiveRun>();
  private stageStarts = new Map<string, number>();
  constructor(private store: Store, private executable: string, private notify: () => void, private resourcesRoot: string, private options: BackendOptions = {}) {}
  async init() { this.runtime = await ModelRuntime.create({ allowModelNetwork: false }); }
  models(): AgentModel[] {
    return [...(this.options.codex?.models ?? []), ...this.runtime.getModels().map(m => ({ backend: 'pi' as const, id: m.id, provider: m.provider, name: m.name,
      configured: this.runtime.hasConfiguredAuth(m.provider) })).sort((a, b) => Number(b.configured) - Number(a.configured) || a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name))];
  }
  private async changed(p: Project) {
    if (p.report) p.report.stageMetrics = p.stages.filter(s => s.metrics).map(s => ({ stage: s.id, ...structuredClone(s.metrics!) }));
    p.updatedAt = new Date().toISOString(); this.notify(); await this.store.save();
  }
  private log(p: Project, stage: StageId, kind: 'info' | 'text' | 'tool' | 'error', text: string, tool?: ToolEvent) {
    const last = p.logs.at(-1);
    if (kind === 'text' && last?.kind === 'text' && last.stage === stage && last.text.length < 16000) last.text += text;
    else p.logs.push({ id: randomUUID(), time: new Date().toISOString(), stage, kind, text: text.slice(0, 16000), ...(tool ? { tool } : {}) });
    if (p.logs.length > 600) p.logs.splice(0, p.logs.length - 600);
    this.notify();
  }
  private async stage(p: Project, id: StageId, status: 'active' | 'complete' | 'failed' | 'review') {
    const stage = p.stages.find(s => s.id === id)!;
    if (status === 'active') {
      stage.metrics ??= { startedAt: new Date().toISOString(), finishedAt: null, durationMs: 0,
        agentAttempts: 0, inferenceDurationMs: 0, usage: null };
      stage.metrics.finishedAt = null;
      this.stageStarts.set(p.id + '/' + id, performance.now());
    } else this.finishStageMetrics(p, id);
    stage.status = status; await this.changed(p);
  }
  private finishStageMetrics(p: Project, id: StageId) {
    const key = p.id + '/' + id, start = this.stageStarts.get(key);
    if (start === undefined) return;
    const metrics = p.stages.find(s => s.id === id)!.metrics!;
    metrics.durationMs = (metrics.durationMs ?? 0) + Math.round(performance.now() - start);
    metrics.finishedAt = new Date().toISOString();
    this.stageStarts.delete(key);
  }
  private recordInference(p: Project, id: StageId, measured: { durationMs: number; usage: import('../shared/types.js').StageTokenUsage | null }) {
    const metrics = p.stages.find(s => s.id === id)!.metrics!;
    metrics.usage = metrics.agentAttempts ? sumTokenUsage(metrics.usage, measured.usage) : measured.usage;
    metrics.agentAttempts++;
    metrics.inferenceDurationMs += measured.durationMs;
  }
  private check(run: ActiveRun) { if (run.controller.signal.aborted) throw new Error(stoppedMessage); }
  private async finish(p: Project, run: ActiveRun) {
    try {
      await run.processes.stop();
      p.status = run.controller.signal.aborted ? 'stopped' : run.outcome ?? 'failed';
      if (p.status === 'stopped') {
        p.error = p.runCheckpoint?.writerState === 'unconfirmed' && p.error ? stoppedMessage + '\n' + p.error : stoppedMessage;
        p.stages.filter(s => s.status === 'active' || s.status === 'review').forEach(s => { s.status = 'failed'; });
      }
    } catch {
      if (p.runCheckpoint) p.runCheckpoint.writerState = 'unconfirmed';
      p.status = 'failed';
      p.error = [run.controller.signal.aborted ? undefined : p.error, 'Process cleanup could not be confirmed. Run processes may still be active. Use the operator shutdown procedure before starting another run.'].filter(Boolean).join('\n');
      p.stages.filter(s => s.status === 'active' || s.status === 'review').forEach(s => { s.status = 'failed'; });
      this.log(p, 'verify', 'error', p.error);
    }
    for (const stage of p.stages) this.finishStageMetrics(p, stage.id);
    // Evidence-file errors must not prevent saving the terminal project state.
    if (p.report) {
      p.report.stageMetrics = p.stages.filter(s => s.metrics).map(s => ({ stage: s.id, ...structuredClone(s.metrics!) }));
      const temporary = path.join(p.workspace!, '.report-' + randomUUID());
      try {
        await fs.writeFile(temporary, JSON.stringify(p.report, null, 2), { flag: 'wx', mode: 0o600 });
        await fs.rename(temporary, path.join(p.workspace!, 'test-report.json'));
      } catch (error) {
        p.error = [p.error, 'Could not save verification report: ' + String(error)].filter(Boolean).join('\n');
        if (p.status !== 'stopped') p.status = 'failed';
      } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
    }
    try { await this.changed(p); }
    catch (error) {
      p.error = [p.error, 'Could not save run state: ' + String(error)].filter(Boolean).join('\n');
      if (p.status !== 'stopped') p.status = 'failed';
      this.log(p, 'intake', 'error', p.error);
    } finally {
      if (this.active.get(p.id) === run) this.active.delete(p.id);
      run.resolve();
      this.notify();
    }
  }
  async start(id: string) { return this.begin(id, false); }
  async resume(id: string) { return this.begin(id, true); }
  private async begin(id: string, resuming: boolean) {
    if (this.active.has(id)) throw new Error('This challenge already has an active run.');
    if (this.active.size >= 3) throw new Error('Three runs are already active. Stop a run before starting another.');
    const p = this.store.project(id);
    if (resuming && !['failed', 'stopped'].includes(p.status)) throw new Error('Only a failed or stopped build can resume.');
    if (resuming && (!p.workspace || !p.runId || p.runCheckpoint?.version !== 1)) throw new Error('This build has no saved recovery checkpoint. Start a new run.');
    const { provider, model: modelId, backend = 'pi' } = this.store.state.settings;
    if (backend === 'codex') {
      await this.options.codex?.refresh();
      if (!this.options.codex?.models.some(m => m.id === modelId && m.configured) || provider !== 'chatgpt') throw new Error('Choose a model and sign in with ChatGPT in Model settings first.');
    } else if (!this.runtime.getModel(provider, modelId) || !this.runtime.hasConfiguredAuth(provider)) throw new Error('Choose a model and connect its provider in Model settings first.');
    const route = backend === 'codex' ? this.options.codex?.route : undefined;
    // Authentication can await network I/O; recheck capacity before reserving the run.
    if (this.active.has(id)) throw new Error('This challenge already has an active run.');
    if (this.active.size >= 3) throw new Error('Three runs are already active. Stop a run before starting another.');
    if (resuming && !['failed', 'stopped'].includes(p.status)) throw new Error('Only a failed or stopped build can resume.');
    let resolve!: () => void;
    const done = new Promise<void>(settled => { resolve = settled; });
    const run: ActiveRun = { backend, processes: this.options.processSweep?.() ?? new RunProcessSweep(), controller: new AbortController(), done, resolve };
    this.active.set(id, run);
    try {
      if (resuming) {
        await this.restore(p, run);
        this.check(run);
        const first = p.stages.findIndex(s => s.status !== 'complete');
        p.stages.slice(first).forEach(s => { s.status = 'queued'; });
        p.status = 'running'; p.report = undefined; p.error = undefined;
        p.approvedAt = undefined; p.exportedTo = undefined; p.executable = undefined; p.feedback = '';
        p.backend = backend; p.model = provider + '/' + modelId;
        this.log(p, p.stages[first].id, 'info', 'Resuming in the saved workspace from ' + p.stages[first].label + '. Frozen inputs checked.');
        await this.changed(p); this.check(run);
        void run.processes.run(() => this.execute(p, run, provider, modelId));
        return;
      }
      p.runId = randomUUID();
      p.workspace = path.join(this.store.root, 'workspaces', p.id, p.runId);
      p.status = 'running'; p.stages = structuredClone(stageDefinitions); p.logs = [];
      p.systemDesign = undefined; p.phasePlan = undefined; p.globalTools = undefined;
      p.report = undefined; p.error = undefined; p.approvedAt = undefined; p.exportedTo = undefined; p.executable = undefined; p.feedback = '';
      p.qualityVersion = 1;
      p.runCheckpoint = undefined;
      p.backend = backend;
      p.model = (route?.provider ?? provider) + '/' + modelId;
      await fs.mkdir(p.workspace, { recursive: true, mode: 0o700 });
      this.check(run);
      await fs.writeFile(path.join(p.workspace, 'requirements.md'), [
        '# ' + p.title, '', p.description, '', '## Evaluation criteria',
        ...(p.criteria.length ? p.criteria.map((c, i) => (i + 1) + '. ' + c)
          : ['No evaluation criteria supplied. Propose measurable outcomes in scope.md and test-matrix.md; distinguish these from user-confirmed criteria.']), '',
        ...(p.resources ? ['## Resources', '', p.resources, ''] : []),
        ...(p.links?.length ? ['## Reference links', '', ...p.links.map(link => '- ' + link), ''] : []),
        'Use synthetic data only. Operational readiness requires independent domain review.'
      ].join('\n'));
      const packet = await prepareFleetWorkspace({ workspace: p.workspace, title: p.title, description: p.description,
        criteria: p.criteria, resources: p.resources, links: p.links, challengeId: p.challengeId, sourceChallenge: p.sourceChallenge, resourcesRoot: this.resourcesRoot });
      run.context = packet.context; run.phases = packet.phases; run.globalTools = packet.globalTools; p.globalTools = [...packet.globalTools]; p.phasePlan = structuredClone(packet.phases); run.packetHash = packet.packetHash;
      run.acceptance = packet.acceptance;
      run.requirements = await fs.readFile(path.join(p.workspace, 'requirements.md'), 'utf8');
      p.runCheckpoint = { version: 1, briefHash: briefHash(p), requirementsHash: digest(run.requirements),
        packetHash: packet.packetHash, context: packet.context, repairAttempts: 0, writerState: 'idle' };
      this.check(run);
      this.log(p, 'intake', 'info', 'Requirements saved. Backend: ' + (run.backend === 'codex' ? 'Codex · ' + (route?.label ?? 'ChatGPT subscription') : 'Pi SDK') + ' · ' + p.model);
      await this.changed(p);
      this.check(run);
      void run.processes.run(() => this.execute(p, run, provider, modelId));
    } catch (error) {
      run.outcome = 'failed'; p.error = error instanceof Error ? error.message : String(error);
      p.stages.filter(s => s.status === 'active' || s.status === 'review').forEach(s => { s.status = 'failed'; });
      this.log(p, 'intake', 'error', p.error);
      await this.finish(p, run); throw error;
    }
  }
  private async planningHash(p: Project) {
    const bodies = await Promise.all(['plan.md', 'test-matrix.md'].map(async file => [file, await fs.readFile(await safeFile(p.workspace!, file), 'utf8')]));
    return digest(JSON.stringify(bodies));
  }
  private async restore(p: Project, run: ActiveRun) {
    const checkpoint = p.runCheckpoint!;
    if (checkpoint.backgroundJob) throw new Error('Possible background job detected; an operator must inspect and stop remaining jobs before starting a new run in a fresh workspace.');
    if (checkpoint.writerState !== 'idle') throw new Error('Writer shutdown was not confirmed for this workspace. Stop and clean up the old workers, then start a new run in a fresh workspace.');
    if (briefHash(p) !== checkpoint.briefHash) throw new Error('The brief changed after this build started. Start a new run with the changed brief.');
    const first = p.stages.find(s => s.status !== 'complete');
    if (!first || !['intake', 'research', 'plan', 'build', 'verify', 'review'].includes(first.id)) throw new Error('No incomplete build stage can resume. Start a new run.');
    if (!Number.isSafeInteger(checkpoint.repairAttempts) || checkpoint.repairAttempts < 0 || checkpoint.repairAttempts > 2) throw new Error('Invalid recovery checkpoint. Start a new run.');
    await assertFleetPacketIntegrity(p.workspace!, checkpoint.packetHash);
    run.packetHash = checkpoint.packetHash;
    run.requirements = await fs.readFile(await safeFile(p.workspace!, 'requirements.md'), 'utf8');
    if (digest(run.requirements) !== checkpoint.requirementsHash) throw new Error('The frozen requirements changed. Restore them or start a new run.');
    const packet = JSON.parse(await fs.readFile(await safeFile(p.workspace!, '.fleet/packet.json'), 'utf8'));
    run.context = checkpoint.context; run.phases = packet.stages; run.globalTools = packet.globalTools; run.acceptance = packet.acceptance;
    const planned = p.stages.find(s => s.id === 'plan')?.status === 'complete';
    if (p.stages.find(s => s.id === 'build')?.status === 'complete') {
      if (!checkpoint.buildTests || !checkpoint.lastTests || !Array.isArray(checkpoint.testChanges)) throw new Error('The build-test baseline is missing. Start a new run; resume cannot replace the original evidence.');
      if (!Object.keys(checkpoint.buildTests).length) throw new Error('The build-test baseline is invalid. Start a new run.');
      for (const snapshot of [checkpoint.buildTests, checkpoint.lastTests]) {
        if (Object.values(snapshot).some(hash => typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))) throw new Error('The build-test baseline is invalid. Start a new run.');
      }
    }
    if (planned && (!checkpoint.qualityHash || !checkpoint.planHash)) throw new Error('The frozen plan checkpoint is missing. Start a new run.');
    if (checkpoint.qualityHash) {
      try { run.quality = await loadQualityContract(p.workspace!, run.acceptance!); }
      catch (error) { throw new Error('The acceptance plan or UX specification changed after planning or is invalid. Restore the frozen inputs or start a new run.', { cause: error }); }
      if (run.quality.hash !== checkpoint.qualityHash) throw new Error('The acceptance plan or UX specification changed after planning. Restore the frozen inputs or start a new run.');
    }
    run.planHash = checkpoint.planHash;
    await this.checkInputs(p, run);
    if (checkpoint.buildTests) await this.recordTestChanges(p, 'resume');
    p.phasePlan = structuredClone(run.phases); p.globalTools = [...run.globalTools!];
  }
  private async retryStage<T>(p: Project, run: ActiveRun, stage: StageId, work: () => Promise<T>): Promise<T> {
    try { this.check(run); return await work(); }
    catch (error) {
      if (p.runCheckpoint?.writerState !== 'idle') throw error;
      this.check(run);
      if (!transientFailure(error) || run.retried?.has(stage)) throw error;
      // A provider interruption cannot mask changed frozen inputs.
      await this.checkInputs(p, run); this.check(run);
      (run.retried ??= new Set()).add(stage);
      this.log(p, stage, 'info', 'Temporary interruption: ' + String(error) + '. Retrying this stage once in the same workspace; earlier artifacts are saved.');
      await this.changed(p); this.check(run);
      return work();
    }
  }
  private async agent(p: Project, run: ActiveRun, stage: StageId, provider: string, modelId: string, instruction: string, files: string[], tests = false, followUp?: { instruction: string; files: string[] }) {
    return this.retryStage(p, run, stage, () => this.agentAttempt(p, run, stage, provider, modelId, instruction, files, tests, followUp));
  }
  private async trackedAgent(p: Project, run: ActiveRun, options: Parameters<typeof runAgentStage>[0]) {
    const timeoutMs = this.options.shutdownTimeoutMs ?? 5000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid writer shutdown timeout.');
    const checkpoint = p.runCheckpoint!;
    checkpoint.writerState = 'active'; await this.changed(p);
    let creation: Promise<StageSession> | undefined, session: StageSession | undefined, abort: Promise<void> | undefined;
    let released = false, failed = false, failure: unknown;
    const prompts = new Set<Promise<unknown>>();
    const cancel = () => abort ??= Promise.resolve().then(() => session!.abort());
    try {
      await runAgentStage({ ...options, create: signal => {
        creation = options.create(signal).then(target => {
          session = target;
          return {
            subscribe: listener => target.subscribe(listener),
            async prompt(...args) {
              const pending = target.prompt(...args); prompts.add(pending);
              try { return await pending; } finally { prompts.delete(pending); }
            },
            abort: cancel,
            // Disconnect only after idle confirmation, or after failing closed.
            dispose: () => { if (released) target.dispose(); }
          };
        });
        return creation;
      } });
    } catch (error) { failed = true; failure = error; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const shutdown = (async () => {
      let creationFailed = false;
      await creation?.catch(() => { creationFailed = true; });
      if (!session) return !creationFailed;
      await Promise.all([...(failed ? [cancel()] : []), ...[...prompts].map(prompt => prompt.catch(() => {}))]);
      // Codex abort currently acknowledges a request, not worker process exit.
      return !(failed && run.backend === 'codex');
    })().catch(() => false);
    let confirmed = await Promise.race([shutdown, new Promise<false>(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); })]);
    clearTimeout(timer); released = true;
    try { session?.dispose(); } catch { confirmed = false; }
    checkpoint.writerState = confirmed ? 'idle' : 'unconfirmed'; await this.changed(p);
    if (!confirmed) throw new Error((failed ? String(failure) + '\n' : '') + 'Writer shutdown was not confirmed. Recovery in this workspace is blocked. Stop and clean up the old workers, then start a new run in a fresh workspace.');
    if (failed) throw failure;
  }
  private async agentAttempt(p: Project, run: ActiveRun, stage: StageId, provider: string, modelId: string, instruction: string, files: string[], tests = false, followUp?: { instruction: string; files: string[] }) {
    this.check(run);
    let backgroundJob = false;
    const phase = run.phases!.find(phase => phase.id === stage)!;
    if (phase.owner !== 'agent') throw new Error('This phase is controlled by the human or host.');
    const engine = run.backend === 'codex' ? 'Codex' : 'Pi';
    const allowedTools = toolsForPhase(phase, run.globalTools);
    if (stage === 'verify') {
      const checkpoint = p.runCheckpoint!;
      if (checkpoint.verificationAgent) {
        if (checkpoint.repairAttempts >= 2) throw new Error('Verification did not pass. The repair limit is exhausted; start a new run before another fixing agent.');
        checkpoint.repairAttempts++;
      }
      checkpoint.verificationAgent ??= 'started'; await this.changed(p); this.check(run);
    }
    this.log(p, stage, 'info', 'Starting ' + engine + ' ' + stage + ' agent. Skills: ' + phase.skills.join(', ') + '. Global tools: ' + run.globalTools!.join(', ') + '. Phase tools: ' + phase.tools.join(', ') + '.');
    try { await this.trackedAgent(p, run, {
      label: engine + ' ' + stage + ' agent', signal: run.controller.signal, limits: this.options.agentLimits,
      onMetrics: measured => this.recordInference(p, stage, measured),
      create: async signal => {
        const customTools = [...createFleetTools(allowedTools, p.sourceChallenge ? [p.sourceChallenge] : undefined), ...createSystemDesignTools(p, stage, signal, () => this.changed(p))];
        if (run.backend === 'codex') return (this.options.createCodexSession ?? createCodexSession)({
          home: this.options.codex!.home, cwd: p.workspace!, model: modelId, signal, tools: customTools, skillPaths: phase.skills.map(skill => path.join(p.workspace!, '.fleet', 'skills', skill))
        });
        if (allowedTools.includes('bash')) {
          const { renderCall, renderResult, ...bash } = createBashToolDefinition(p.workspace!, {
            spawnHook: context => ({ ...context, env: runProcessEnvironment(context.env) })
          });
          customTools.push(bash);
        }
        const settingsManager = SettingsManager.inMemory({ compaction: { enabled: true }, retry: { enabled: true, maxRetries: 2 } });
        const loader = new DefaultResourceLoader({
          cwd: p.workspace!, agentDir: path.join(this.store.root, 'pi'), settingsManager,
          noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true, additionalSkillPaths: phase.skills.map(skill => path.join(p.workspace!, '.fleet', 'skills', skill)),
          agentsFilesOverride: () => ({ agentsFiles: [] }),
          systemPromptOverride: base => (base || '') + '\n\nYou are a AppYard software-factory agent. Work only inside the current working directory. Never access credentials or unrelated files, publish, deploy, or contact external operational systems. Use synthetic examples. Write actual working artifacts and report limitations honestly. Use only the tools assigned to the current phase. This is a dedicated working directory, not an OS sandbox.'
        });
        await loader.reload();
        signal.throwIfAborted();
        const { session } = await (this.options.createSession ?? createAgentSession)({
          cwd: p.workspace!, agentDir: path.join(this.store.root, 'pi'), modelRuntime: this.runtime,
          model: this.runtime.getModel(provider, modelId), thinkingLevel: 'medium',
          tools: allowedTools, excludeTools: ['mcp__*'], customTools, resourceLoader: loader, settingsManager,
          sessionManager: SessionManager.create(p.workspace!, path.join(this.store.root, 'sessions', p.id))
        });
        return session;
      },
      onEvent: event => {
        if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') this.log(p, stage, 'text', event.assistantMessageEvent.delta);
        if (event.type === 'tool_execution_start') {
          const args = event.args as Record<string, unknown> | null;
          const target = args?.path ?? args?.file_path ?? args?.command;
          const command = args?.command ?? args?.cmd;
          if (['bash', 'shell', 'shell_command', 'exec_command'].includes(event.toolName) && typeof command === 'string' && backgroundShellCommand.test(shellLaunchText(command))) {
            p.runCheckpoint!.backgroundJob = true;
            this.log(p, stage, 'error', 'Possible background job detected in a shell call. Stop tracks foreground calls only. An operator must inspect and stop remaining jobs before a new run.');
          }
          this.log(p, stage, 'tool', event.toolName + '\n' + JSON.stringify(event.args, null, 2).slice(0, 6000), {
            callId: event.toolCallId, name: event.toolName, phase: 'start',
            ...(typeof target === 'string' ? { target: target.slice(0, 1000) } : {})
          });
        }
        if (event.type === 'tool_execution_end') this.log(p, stage, event.isError ? 'error' : 'tool', event.toolName + (event.isError ? ' failed\n' : ' completed\n') + JSON.stringify(event.result).slice(0, 8000), {
          callId: event.toolCallId, name: event.toolName, phase: event.isError ? 'error' : 'complete'
        });
        if (event.type === 'auto_retry_start') this.log(p, stage, 'info', `Provider retry ${event.attempt}/${event.maxAttempts} in ${event.delayMs / 1000}s: ${event.errorMessage}`);
        if (event.type === 'auto_retry_end') this.log(p, stage, event.success ? 'info' : 'error', event.success ? 'Provider retry recovered.' : 'Provider retries exhausted: ' + event.finalError);
        if (event.type === 'compaction_start') this.log(p, stage, 'info', 'Compacting the agent context.');
        if (event.type === 'compaction_end') this.log(p, stage, event.errorMessage ? 'error' : 'info', event.errorMessage || 'Agent context compaction completed.');
      },
      work: async (prompt, signal) => {
        const check = () => {
          this.check(run); signal.throwIfAborted();
          if (p.runCheckpoint!.backgroundJob) throw new Error('Possible background job detected; an operator must inspect and stop remaining jobs before continuing.');
        };
        const complete = async (text: string, required: string[]) => {
          await prompt(text);
          check();
          if (backgroundJob) throw new Error('Possible background job detected; an operator must inspect and stop remaining jobs before continuing.');
          await this.checkInputs(p, run); check();
          let missing = await this.missingFiles(p, run, stage, required, tests); check();
          if (missing.length) {
            this.log(p, stage, 'info', 'Stage artifacts missing: ' + missing.join(', ') + '. Starting one completion attempt.');
            await prompt('The stage is incomplete. Produce these missing or empty artifacts before finishing: ' + missing.join(', ') + '. Follow the original stage instructions and latest requested step; preserve requirements.md and .fleet. This is the only artifact completion attempt for this step.');
            check();
            if (backgroundJob) throw new Error('Possible background job detected; an operator must inspect and stop remaining jobs before continuing.');
            await this.checkInputs(p, run); check();
            missing = await this.missingFiles(p, run, stage, required, tests); check();
          }
          if (missing.length) throw new Error(engine + ' did not produce the required artifacts after one completion attempt: ' + missing.join(', ') + '. Inspect the session and start a new run.');
        };
        await complete([run.context, 'Acceptance IDs: ' + run.acceptance!.map(criterion => criterion.id).join(', '), phasePrompt(phase, run.globalTools), foregroundPolicy, fleetStagePrompt(stage), instruction, systemDesignPrompt(stage)].filter(Boolean).join('\n\n'), files);
        if (followUp) {
          this.log(p, stage, 'info', 'Application implementation is ready. Writing README.md with a user guide before verification.');
          await complete(followUp.instruction, [...files, ...followUp.files]);
        }
      }
    }); } finally {
      // Retain edits even when a fixing session is interrupted. Never inspect
      // a workspace while its previous writer still lacks shutdown evidence.
      if (stage === 'verify' && p.runCheckpoint!.buildTests && p.runCheckpoint!.writerState === 'idle') await this.recordTestChanges(p, 'verify');
    }
    if (stage === 'verify') { p.runCheckpoint!.verificationAgent = 'complete'; await this.changed(p); }
  }
  private async missingFiles(p: Project, run: ActiveRun, stage: StageId, files: string[], tests = false) {
    const missing: string[] = [];
    for (const file of files) {
      try {
        const resolved = await safeFile(p.workspace!, file), stat = await fs.stat(resolved);
        if (!stat.isFile() || !stat.size || (file === 'README.md' && !(await fs.readFile(resolved, 'utf8')).trim())) missing.push(file);
      }
      catch { missing.push(file); }
    }
    if (tests && !(await applicationTestFiles(p.workspace!)).length) missing.push('application *.test.cjs or *.test.mjs files');
    if (['plan', 'build', 'verify'].includes(stage) && !p.systemDesign) missing.push('system-design.json (publish the application architecture with fleet_system_design)');
    if (tests && incompleteComponents(p).length) missing.push('component progress: call fleet_component_progress for ' + incompleteComponents(p).join(', '));
    if (stage === 'plan' && !missing.some(file => ['acceptance-plan.json', 'ux-spec.json'].includes(file))) {
      try { await loadQualityContract(p.workspace!, run.acceptance!); }
      catch (error) { missing.push('valid quality contract: ' + (error instanceof Error ? error.message : String(error))); }
    }
    return missing;
  }
  private async checkInputs(p: Project, run: ActiveRun) {
    if (p.runCheckpoint && briefHash(p) !== p.runCheckpoint.briefHash) throw new Error('The brief changed during the run. Start a new run with the changed brief.');
    await checkSystemDesign(p);
    await assertFleetPacketIntegrity(p.workspace!, run.packetHash!);
    if (run.quality) await assertQualityContract(p.workspace!, run.quality);
    if (run.planHash && await this.planningHash(p) !== run.planHash) throw new Error('The frozen plan changed after planning. Restore it or start a new run.');
    if (await fs.readFile(await safeFile(p.workspace!, 'requirements.md'), 'utf8') !== run.requirements) {
      throw new Error('The original requirements changed during the run. Review the artifacts and start a new run.');
    }
  }
  private async testSnapshot(p: Project) {
    const snapshot: Record<string, string> = {};
    for (const file of (await listArtifacts(p.workspace!)).filter(file => !/^\.fleet(?:\/|\\)/.test(file.path) && /\.(?:test|spec)\.(?:cjs|mjs|js)$/.test(file.path))) {
      if (file.size > 10 * 1024 * 1024) throw new Error('An artifact exceeds the 10 MB verification limit.');
      snapshot[file.path] = createHash('sha256').update(await fs.readFile(await safeFile(p.workspace!, file.path))).digest('hex');
    }
    return snapshot;
  }
  private async recordTestChanges(p: Project, step: string) {
    const checkpoint = p.runCheckpoint!, current = await this.testSnapshot(p);
    const changes = (before: Record<string, string>) => [...new Set([...Object.keys(before), ...Object.keys(current)])].sort().flatMap(file =>
      before[file] === current[file] ? [] : [(!(file in before) ? 'added: ' : !(file in current) ? 'removed: ' : 'modified: ') + file]);
    const sincePrevious = changes(checkpoint.lastTests!), sinceBuild = changes(checkpoint.buildTests!);
    if (sincePrevious.length) {
      const message = `Post-build test changes (${step}). Human review required. Since previous stage: ${sincePrevious.join('; ')}. Since build: ${sinceBuild.join('; ') || 'restored to build snapshot'}.`;
      checkpoint.testChanges!.push(message);
      this.log(p, 'verify', 'info', message);
    }
    checkpoint.lastTests = current;
    await this.changed(p);
  }
  private async verify(p: Project, run: ActiveRun) {
    return this.retryStage(p, run, 'verify', async () => {
      const checkpoint = p.runCheckpoint!;
      checkpoint.writerState = 'active'; await this.changed(p);
      let confirmed = true;
      try { return await verifyApplication(p.workspace!, this.executable, run.quality!, run.controller.signal, this.options.verificationLimits); }
      catch (error) { if (error instanceof VerificationShutdownError) confirmed = false; throw error; }
      finally { checkpoint.writerState = confirmed ? 'idle' : 'unconfirmed'; await this.changed(p); }
    });
  }
  private appendTestChanges(p: Project) {
    if (p.runCheckpoint!.testChanges?.length) p.report!.output += '\n' + p.runCheckpoint!.testChanges.join('\n');
  }
  private async execute(p: Project, run: ActiveRun, provider: string, model: string) {
    try {
      if (p.stages.find(s => s.id === 'intake')!.status !== 'complete') {
        await this.stage(p, 'intake', 'active');
        await this.agent(p, run, 'intake', provider, model,
          'You are the intake agent. Read requirements.md and the challenge packet. Write scope.md with the requested user workflow, inputs, outputs, exclusions, unknowns and synthetic data boundary. Preserve requirements.md. Do not research, plan or implement yet.', ['scope.md']);
        await this.stage(p, 'intake', 'complete');
      }
      if (p.stages.find(s => s.id === 'research')!.status !== 'complete') {
        await this.stage(p, 'research', 'active');
        await this.agent(p, run, 'research', provider, model,
          'You are the research agent. Read requirements.md and scope.md. Write research.md with reuse candidates, adopt/adapt/reject decisions, supplied source evidence and integration risks. Use the global workspace tools for local inspection and fleet_search_evidence for supplied documents. No web browser is provided. Mark unchecked source links, versions and licenses as unverified; do not invent web research. Do not plan or implement yet.', ['scope.md', 'research.md']);
        await this.stage(p, 'research', 'complete');
      }
      if (p.stages.find(s => s.id === 'plan')!.status !== 'complete') {
        await this.stage(p, 'plan', 'active');
        await this.agent(p, run, 'plan', provider, model,
          'Read requirements.md, scope.md and research.md. You are the planning agent. Produce plan.md with implementation tasks and test-matrix.md with acceptance-to-test mapping, risks, and operational requirements needing human review. Read .fleet/quality-contract.md and produce valid acceptance-plan.json and ux-spec.json. Cover every packet acceptance ID exactly once, preserving original requirements and explicitly explaining deferred integration work. Define primary and recovery browser journeys with literal expected outcomes and stable selectors that the builder must implement. The host freezes these expectations before building and runs each journey in fresh desktop and narrow browser contexts. Target a dependency-free browser application delivered as a self-contained index.html (inline CSS and classic JS, no external files or CDNs), plus testable core logic and Node built-in test runner files named *.test.cjs or *.test.mjs. The complete application must run by opening index.html. Publish the application architecture with fleet_system_design. Do not implement yet.', ['scope.md', 'research.md', 'plan.md', 'test-matrix.md', 'system-design.json', 'acceptance-plan.json', 'ux-spec.json']);
        run.quality = await loadQualityContract(p.workspace!, run.acceptance!);
        run.planHash = await this.planningHash(p);
        p.runCheckpoint!.qualityHash = run.quality.hash; p.runCheckpoint!.planHash = run.planHash;
        this.log(p, 'plan', 'info', 'Acceptance plan and UX specification validated and frozen. Browser journeys will verify the delivered application at desktop and narrow sizes.');
        await this.stage(p, 'plan', 'complete');
      }
      if (p.stages.find(s => s.id === 'build')!.status !== 'complete') {
        await this.stage(p, 'build', 'active');
        await this.agent(p, run, 'build', provider, model,
          'You are the implementation agent. Read requirements.md, research.md, plan.md, acceptance-plan.json and ux-spec.json, then implement the complete usable application. Treat the validated browser steps, selectors and expected results as a frozen contract. Implement the specified first-run flow, feedback, recovery, keyboard operation and narrow layout. Do not edit acceptance-plan.json or ux-spec.json. Use one application implementation for browser and Node tests, for example by extracting the actual marked inline core in tests; avoid copied test-only logic. Deliver a self-contained index.html with inline CSS and classic JS (no imports, CDNs, or network dependencies), path-to-fleet.md listing prerequisites for field validation and unresolved integrations, testable core source, and meaningful *.test.cjs or *.test.mjs tests using node:test and node:assert. Keep the tested core and inline app logic consistent. No placeholder controls or fake test results. Include synthetic sample data, empty states, validation, and accessible controls. Document limitations. Use no package dependencies. Do not modify requirements.md or .fleet. The harness will independently run tests with its bundled Node runtime. Tests must use OS temporary directories for mutable files. After implementation, a follow-up step will ask you to write README.md as the user guide for the finished application.', ['scope.md', 'research.md', 'plan.md', 'test-matrix.md', 'index.html', 'path-to-fleet.md'], true, {
            instruction: 'Implementation is complete. Now write README.md as a practical user guide for the software you just built. Inspect the actual index.html, application source, sample data and tests so the instructions describe implemented behavior. Write for a first-time user, with clear sections covering: what the application does and who it is for; prerequisites and quick start (open index.html in a browser, with no install or server required); numbered instructions for each main workflow using the actual screen, field and button names; a reproducible walkthrough using synthetic sample input and the expected output; supported input formats and validation; how to save, export, reset or recover data where supported, and whether data survives reloads; troubleshooting common errors; known limitations and unimplemented integrations; and developer test instructions with commands matching the actual test files. Distinguish using the app from running developer tests, which require Node. Explain unsupported features honestly; do not invent controls or claim tests or browser checks passed without evidence. Link to verification.md for verification notes and path-to-fleet.md for field-validation prerequisites. Write or update README.md only in this step. Preserve requirements.md, .fleet, application source and tests.',
            files: ['README.md']
          });
        const baseline = await this.testSnapshot(p);
        p.runCheckpoint!.buildTests = baseline; p.runCheckpoint!.lastTests = { ...baseline }; p.runCheckpoint!.testChanges = [];
        await this.stage(p, 'build', 'complete');
      }
      const verificationCompleted = p.runCheckpoint!.verificationAgent === 'complete' || p.stages.find(s => s.id === 'verify')!.status === 'complete';
      await this.stage(p, 'verify', 'active');
      if (!verificationCompleted) await this.agent(p, run, 'verify', provider, model,
        'You are the verification agent. Inspect requirements.md, plan.md, acceptance-plan.json, ux-spec.json, application source, tests, and README.md. Preserve the frozen acceptance plan and UX specification. The host will execute every planned browser journey at desktop and narrow sizes, checking actual rendered outcomes, console errors and layout overflow; Node-only success cannot pass verification. Improve coverage for edge cases and consistency between the tested logic and index.html. Fix defects you find. Check the README quick start and sample walkthrough against the actual application, and update README.md for any changed controls, inputs, outputs or limitations. Write verification.md mapping each requirement to tests and explicitly listing what remains unverified, including any guide steps you could not exercise. Do not claim test execution unless you execute it. Keep index.html self-contained and all test files named *.test.cjs or *.test.mjs using node:test. The harness independently runs the tests next.', ['scope.md', 'research.md', 'plan.md', 'test-matrix.md', 'index.html', 'README.md', 'path-to-fleet.md', 'verification.md'], true);
      this.check(run);
      await this.checkInputs(p, run);
      p.report = await this.verify(p, run);
      this.appendTestChanges(p);
      this.log(p, 'verify', 'info', p.report.output);
      if (!reportPassed(p.report, true) && p.runCheckpoint!.repairStopped) throw new Error('Verification did not pass. Repair made no source changes; start a new run before another fixing agent.');
      while (!reportPassed(p.report, true) && p.runCheckpoint!.repairAttempts < 2) {
        this.check(run);
        await fs.writeFile(path.join(p.workspace!, 'test-report.json'), JSON.stringify(p.report, null, 2));
        const attempt = p.runCheckpoint!.repairAttempts + 1;
        this.check(run);
        this.log(p, 'verify', 'info', 'Verification failed. Starting ' + (attempt === 1 ? 'one ' : '') + (run.backend === 'codex' ? 'Codex' : 'Pi') + ' repair attempt (' + attempt + '/2).');
        const failures = { node: { command: p.report.command, exitCode: p.report.exitCode, passed: p.report.passed, failed: p.report.failed, skipped: p.report.skipped, output: p.report.output },
          errors: p.report.quality?.errors,
          journeys: p.report.quality?.journeys.filter(journey => journey.status === 'failed').map(journey => ({ ...journey,
            plannedSteps: run.quality!.plan.journeys.find(planned => planned.id === journey.id)?.steps })) };
        const beforeRepair = await sourceHash(p.workspace!, { excludeEvidence: true });
        await this.agent(p, run, 'verify', provider, model,
          'The independent test run failed. Repair attempt ' + attempt + '/2. Read test-report.json, diagnose and repair the implementation. Inspect the quality section for failed browser steps and screenshot/trace paths as well as Node failures. Fix the application, including UI behavior, selectors, recovery and responsive layout. Keep acceptance criteria and tests meaningful; do not delete, skip, or weaken tests to obtain a pass. Never edit acceptance-plan.json or ux-spec.json; the host checks their original hash. Keep index.html consistent with core source. Update README.md so its user guide and sample walkthrough match the repaired application. Update verification.md with the repair and remaining limitations.\n\nExact failing journeys, planned steps and evidence paths from the latest independent check:\n' + JSON.stringify(failures, null, 2), ['scope.md', 'research.md', 'plan.md', 'test-matrix.md', 'index.html', 'README.md', 'path-to-fleet.md', 'verification.md'], true);
        await this.checkInputs(p, run);
        this.check(run);
        if (beforeRepair === await sourceHash(p.workspace!, { excludeEvidence: true })) {
          p.runCheckpoint!.repairStopped = true; await this.changed(p);
          throw new Error('Verification did not pass. Repair made no source changes; start a new run before another fixing agent.');
        }
        p.report = await this.verify(p, run);
        this.appendTestChanges(p);
        this.log(p, 'verify', 'info', p.report.output);
      }
      this.check(run);
      await fs.writeFile(path.join(p.workspace!, 'test-report.json'), JSON.stringify(p.report, null, 2));
      if (!reportPassed(p.report, true)) throw new Error('Verification did not pass. Inspect the actual test output; delivery remains blocked.');
      p.report = await runIndependentJudge({ workspace: p.workspace!, resourcesRoot: this.resourcesRoot, report: p.report,
        signal: run.controller.signal, limits: this.options.agentLimits,
        repairLimit: 2 - p.runCheckpoint!.repairAttempts,
        canRepair: () => p.runCheckpoint!.repairAttempts < 2 && !p.runCheckpoint!.repairStopped,
        onMetrics: measured => this.recordInference(p, 'verify', measured),
        engine: { backend: run.backend, model, provider, runtime: this.runtime, agentDir: path.join(this.store.root, 'pi'),
          codexHome: this.options.codex?.home, createSession: this.options.createSession },
        checkInputs: () => this.checkInputs(p, run), log: text => this.log(p, 'verify', 'info', text),
        recordReport: async report => { p.report = report; await this.changed(p); },
        repair: instruction => this.agent(p, run, 'verify', provider, model, instruction,
          ['index.html', 'README.md', 'path-to-fleet.md', 'verification.md'], true),
        verify: async () => {
          p.report = await this.verify(p, run);
          this.appendTestChanges(p);
          return p.report;
        }
      });
      await this.stage(p, 'verify', 'complete'); await this.stage(p, 'review', 'review');
      this.check(run);
      run.outcome = 'review'; this.log(p, 'review', 'info', 'Application tests and planned browser journeys passed. Inspect requirement coverage, deferred items and the preview before approving prototype delivery.');
    } catch (error) {
      p.error = error instanceof Error ? error.message : String(error); run.outcome = 'failed';
      const stage = p.stages.findLast(s => s.status === 'active')?.id || 'build';
      p.stages.filter(s => s.status === 'active' || s.status === 'review').forEach(s => { s.status = 'failed'; }); this.log(p, stage, 'error', p.error);
    } finally { await this.finish(p, run); }
  }
  async stop(id: string) {
    const run = this.active.get(id); if (!run) return;
    run.controller.abort(); await run.done;
  }
  async stopAll() { await Promise.all([...this.active.keys()].map(id => this.stop(id))); }
}

// Compatibility for existing integrations. Both engines share this factory workflow.
export { FleetBackend as PiBackend };
