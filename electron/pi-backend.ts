import { createAgentSession, createBashToolDefinition, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager, type CreateAgentSessionOptions } from '@earendil-works/pi-coding-agent';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { AgentBackend, AgentModel, Project, StageId, ToolEvent } from '../shared/types.js';
import { stageDefinitions } from '../shared/types.js';
import { Store, safeFile, listArtifacts, sourceHash } from './storage.js';
import { applicationTestFiles, reportPassed } from './verification.js';
import { loadQualityContract, assertQualityContract, verifyApplication, type QualityContract, type ApplicationVerificationLimits } from './quality.js';
import type { AcceptanceCriterion } from '../harness/types.js';
import { runAgentStage, stoppedMessage, type AgentLimits, type StageSession } from './agent-runner.js';
import { prepareFleetWorkspace, fleetStagePrompt, assertFleetPacketIntegrity } from '../harness/integration.js';
import { phasePrompt, toolsForPhase, type PhaseContract } from '../harness/phases.js';
import { createFleetTools } from '../harness/pi-tools.js';
import { createSystemDesignTools, systemDesignPrompt, checkSystemDesign, incompleteComponents } from './system-design.js';

import { createCodexSession } from './codex-session.js';
import type { CodexAccount } from './codex-account.js';
import { RunProcessSweep, runProcessEnvironment } from './process-sweep.js';

type ActiveRun = { backend: AgentBackend; processes: RunProcessSweep; outcome?: Project['status']; controller: AbortController; done: Promise<void>; resolve: () => void; context?: string; phases?: PhaseContract[]; globalTools?: string[]; packetHash?: string; requirements?: string; acceptance?: AcceptanceCriterion[]; quality?: QualityContract };
interface BackendOptions {
  codex?: CodexAccount;
  createCodexSession?: typeof createCodexSession;
  createSession?: (options: CreateAgentSessionOptions) => Promise<{ session: StageSession }>;
  agentLimits?: Partial<AgentLimits>;
  verificationLimits?: Partial<ApplicationVerificationLimits>;
  processSweep?: () => RunProcessSweep;
}
export class FleetBackend {
  runtime!: ModelRuntime;
  active = new Map<string, ActiveRun>();
  constructor(private store: Store, private executable: string, private notify: () => void, private resourcesRoot: string, private options: BackendOptions = {}) {}
  async init() { this.runtime = await ModelRuntime.create({ allowModelNetwork: false }); }
  models(): AgentModel[] {
    return [...(this.options.codex?.models ?? []), ...this.runtime.getModels().map(m => ({ backend: 'pi' as const, id: m.id, provider: m.provider, name: m.name,
      configured: this.runtime.hasConfiguredAuth(m.provider) })).sort((a, b) => Number(b.configured) - Number(a.configured) || a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name))];
  }
  private async changed(p: Project) { p.updatedAt = new Date().toISOString(); this.notify(); await this.store.save(); }
  private log(p: Project, stage: StageId, kind: 'info' | 'text' | 'tool' | 'error', text: string, tool?: ToolEvent) {
    const last = p.logs.at(-1);
    if (kind === 'text' && last?.kind === 'text' && last.stage === stage && last.text.length < 16000) last.text += text;
    else p.logs.push({ id: randomUUID(), time: new Date().toISOString(), stage, kind, text: text.slice(0, 16000), ...(tool ? { tool } : {}) });
    if (p.logs.length > 600) p.logs.splice(0, p.logs.length - 600);
    this.notify();
  }
  private async stage(p: Project, id: StageId, status: 'active' | 'complete' | 'failed' | 'review') {
    p.stages.find(s => s.id === id)!.status = status; await this.changed(p);
  }
  private check(run: ActiveRun) { if (run.controller.signal.aborted) throw new Error(stoppedMessage); }
  private async finish(p: Project, run: ActiveRun) {
    try {
      await run.processes.stop();
      p.status = run.controller.signal.aborted ? 'stopped' : run.outcome ?? 'failed';
      if (p.status === 'stopped') {
        p.error = stoppedMessage;
        p.stages.filter(s => s.status === 'active' || s.status === 'review').forEach(s => { s.status = 'failed'; });
      }
    } catch {
      p.status = 'failed';
      p.error = [run.controller.signal.aborted ? undefined : p.error, 'Process cleanup could not be confirmed. Run processes may still be active. Use the operator shutdown procedure before starting another run.'].filter(Boolean).join('\n');
      p.stages.filter(s => s.status === 'active' || s.status === 'review').forEach(s => { s.status = 'failed'; });
      this.log(p, 'verify', 'error', p.error);
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
  async start(id: string) {
    if (this.active.has(id)) throw new Error('This challenge already has an active run.');
    if (this.active.size >= 3) throw new Error('Three runs are already active. Stop a run before starting another.');
    const p = this.store.project(id);
    const { provider, model: modelId, backend = 'pi' } = this.store.state.settings;
    if (backend === 'codex') {
      await this.options.codex?.refresh();
      if (!this.options.codex?.models.some(m => m.id === modelId && m.configured) || provider !== 'chatgpt') throw new Error('Choose a model and sign in with ChatGPT in Model settings first.');
    } else if (!this.runtime.getModel(provider, modelId) || !this.runtime.hasConfiguredAuth(provider)) throw new Error('Choose a model and connect its provider in Model settings first.');
    const route = backend === 'codex' ? this.options.codex?.route : undefined;
    // Authentication can await network I/O; recheck capacity before reserving the run.
    if (this.active.has(id)) throw new Error('This challenge already has an active run.');
    if (this.active.size >= 3) throw new Error('Three runs are already active. Stop a run before starting another.');
    let resolve!: () => void;
    const done = new Promise<void>(settled => { resolve = settled; });
    const run: ActiveRun = { backend, processes: this.options.processSweep?.() ?? new RunProcessSweep(), controller: new AbortController(), done, resolve };
    this.active.set(id, run);
    try {
      p.runId = randomUUID();
      p.workspace = path.join(this.store.root, 'workspaces', p.id, p.runId);
      p.status = 'running'; p.stages = structuredClone(stageDefinitions); p.logs = [];
      p.systemDesign = undefined; p.phasePlan = undefined; p.globalTools = undefined;
      p.report = undefined; p.error = undefined; p.approvedAt = undefined; p.exportedTo = undefined; p.executable = undefined; p.feedback = '';
      p.qualityVersion = 1;
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
      this.check(run);
      this.log(p, 'intake', 'info', 'Requirements saved. Backend: ' + (run.backend === 'codex' ? 'Codex · ' + (route?.label ?? 'ChatGPT subscription') : 'Pi SDK') + ' · ' + p.model);
      await this.changed(p);
      this.check(run);
      void run.processes.run(() => this.execute(p, run, provider, modelId));
    } catch (error) {
      run.outcome = 'failed'; p.error = run.controller.signal.aborted ? 'Stopping run and checking its processes.' : error instanceof Error ? error.message : String(error);
      p.stages.filter(s => s.status === 'active' || s.status === 'review').forEach(s => { s.status = 'failed'; });
      this.log(p, 'intake', 'error', p.error);
      await this.finish(p, run); throw error;
    }
  }
  private async agent(p: Project, run: ActiveRun, stage: StageId, provider: string, modelId: string, instruction: string, files: string[], tests = false, followUp?: { instruction: string; files: string[] }) {
    this.check(run);
    let backgroundJob = false;
    const phase = run.phases!.find(phase => phase.id === stage)!;
    if (phase.owner !== 'agent') throw new Error('This phase is controlled by the human or host.');
    const engine = run.backend === 'codex' ? 'Codex' : 'Pi';
    const allowedTools = toolsForPhase(phase, run.globalTools);
    this.log(p, stage, 'info', 'Starting ' + engine + ' ' + stage + ' agent. Skills: ' + phase.skills.join(', ') + '. Global tools: ' + run.globalTools!.join(', ') + '. Phase tools: ' + phase.tools.join(', ') + '.');
    await runAgentStage({
      label: engine + ' ' + stage + ' agent', signal: run.controller.signal, limits: this.options.agentLimits,
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
            backgroundJob = true;
            this.log(p, stage, 'error', 'Possible background job detected in a shell call. Stop tracks foreground calls only. An operator must inspect and stop any remaining jobs before a new run.');
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
        const check = () => { this.check(run); signal.throwIfAborted(); };
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
        await complete([run.context, 'Acceptance IDs: ' + run.acceptance!.map(criterion => criterion.id).join(', '), phasePrompt(phase, run.globalTools), fleetStagePrompt(stage), instruction, systemDesignPrompt(stage)].filter(Boolean).join('\n\n'), files);
        if (followUp) {
          this.log(p, stage, 'info', 'Application implementation is ready. Writing README.md with a user guide before verification.');
          await complete(followUp.instruction, [...files, ...followUp.files]);
        }
      }
    });
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
    await checkSystemDesign(p);
    await assertFleetPacketIntegrity(p.workspace!, run.packetHash!);
    if (run.quality) await assertQualityContract(p.workspace!, run.quality);
    if (await fs.readFile(await safeFile(p.workspace!, 'requirements.md'), 'utf8') !== run.requirements) {
      throw new Error('The original requirements changed during the run. Review the artifacts and start a new run.');
    }
  }
  private async testSnapshot(p: Project) {
    const files = (await listArtifacts(p.workspace!)).filter(file => !/^\.fleet(?:\/|\\)/.test(file.path) && /\.(?:test|spec)\.(?:cjs|mjs|js)$/.test(file.path));
    const snapshot = new Map<string, string>();
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) throw new Error('An artifact exceeds the 10 MB verification limit.');
      snapshot.set(file.path, createHash('sha256').update(await fs.readFile(await safeFile(p.workspace!, file.path))).digest('hex'));
    }
    return snapshot;
  }
  private async recordTestChanges(p: Project, run: ActiveRun, step: string) {
    const current = await this.testSnapshot(p), previous = run.lastTests!;
    const changes = (before: Map<string, string>) => [...new Set([...before.keys(), ...current.keys()])].sort().flatMap(file =>
      before.get(file) === current.get(file) ? [] : [(!before.has(file) ? 'added: ' : !current.has(file) ? 'removed: ' : 'modified: ') + file]);
    const sinceBuild = changes(run.buildTests!), sincePrevious = changes(previous);
    if (sincePrevious.length) {
      const message = `Post-build test changes (${step}). Human review required. Since previous stage: ${sincePrevious.join('; ')}. Since build: ${sinceBuild.join('; ') || 'restored to build snapshot'}.`;
      run.testChanges!.push(message);
      this.log(p, 'verify', 'info', message);
      await this.changed(p);
    }
    run.lastTests = current;
  }
  private async registeredTestError(p: Project, run: ActiveRun): Promise<string> {
    this.check(run);
    const files = await applicationTestFiles(p.workspace!);
    if (!files.length) return 'No registered application tests: no application test files remain.';
    const resolvedFiles = new Map(await Promise.all(files.map(async file => [file, await safeFile(p.workspace!, file)] as const)));
    const timeoutMs = this.options.verificationLimits?.timeoutMs ?? 120_000;
    const maxOutputBytes = this.options.verificationLimits?.maxOutputBytes ?? 2_000_000;
    const child = spawn(this.executable, ['--test', '--test-reporter=' + registeredTestReporter, ...files.map(file => './' + file)], {
      cwd: p.workspace!, env: { PATH: process.env.PATH, HOME: p.workspace!, TMPDIR: process.env.TMPDIR, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'], detached: process.platform !== 'win32'
    });
    const stop = () => { try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {} };
    let summaries: { file: string; success: boolean; counts: { tests: number; failed: number; skipped: number; todo: number; cancelled: number } }[] | undefined;
    child.on('message', message => { if (Array.isArray(message)) summaries = message; });
    const completed = new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    let interrupt!: () => void, problem = '', bytes = 0;
    const interrupted = new Promise<null>(resolve => { interrupt = () => { stop(); resolve(null); }; });
    const timer = setTimeout(() => { problem = 'Registered-test check exceeded the time limit.'; interrupt(); }, timeoutMs);
    const collect = (chunk: Buffer) => { bytes += chunk.length; if (bytes > maxOutputBytes) { problem = 'Registered-test check exceeded the output limit.'; interrupt(); } };
    child.stdout?.on('data', collect); child.stderr?.on('data', collect);
    run.controller.signal.addEventListener('abort', interrupt, { once: true });
    if (run.controller.signal.aborted) interrupt();
    try {
      const code = await Promise.race([completed, interrupted]);
      this.check(run);
      if (problem) return problem;
      if (code !== 0 || !summaries) return 'Registered-test check did not complete successfully.';
      const missing = files.filter(file => !summaries!.some(summary => resolvedFiles.get(file) === path.resolve(summary.file) && summary.success
        && summary.counts.tests > 0 && summary.counts.failed === 0 && summary.counts.skipped === 0 && summary.counts.todo === 0 && summary.counts.cancelled === 0));
      return missing.length ? 'No registered application tests passed in: ' + missing.join(', ') : '';
    } finally {
      clearTimeout(timer); run.controller.signal.removeEventListener('abort', interrupt);
      stop(); child.stdout?.destroy(); child.stderr?.destroy();
      if (child.connected) child.disconnect();
    }
  }
  private async verify(p: Project, run: ActiveRun) {
    const started = performance.now();
    const report = await verifyApplication(p.workspace!, this.executable, run.quality!, run.controller.signal, this.options.verificationLimits);
    // Preserve the existing verifier and browser gate. Only apparently passing
    // Node evidence needs this additional registered-case check.
    if (report.exitCode === 0 && report.passed > 0 && report.failed === 0 && report.skipped === 0) {
      const problem = await this.registeredTestError(p, run);
      if (report.sourceHash !== await sourceHash(p.workspace!)) throw new Error('Source files changed during registered-test verification. Run verification again before review.');
      if (problem) { report.total = 0; report.passed = 0; report.failed = 0; report.exitCode = 1; report.output += '\n' + problem; }
    }
    if (run.testChanges!.length) report.output += '\n' + run.testChanges!.join('\n');
    report.durationMs = Math.round(performance.now() - started);
    return report;
  }
  private async execute(p: Project, run: ActiveRun, provider: string, model: string) {
    try {
      await this.stage(p, 'intake', 'active');
      await this.agent(p, run, 'intake', provider, model,
        'You are the intake agent. Read requirements.md and the challenge packet. Write scope.md with the requested user workflow, inputs, outputs, exclusions, unknowns and synthetic data boundary. Preserve requirements.md. Do not research, plan or implement yet.', ['scope.md']);
      await this.stage(p, 'intake', 'complete');
      await this.stage(p, 'research', 'active');
      await this.agent(p, run, 'research', provider, model,
        'You are the research agent. Read requirements.md and scope.md. Write research.md with reuse candidates, adopt/adapt/reject decisions, supplied source evidence and integration risks. Use the global workspace tools for local inspection and fleet_search_evidence for supplied documents. No web browser is provided. Mark unchecked source links, versions and licenses as unverified; do not invent web research. Do not plan or implement yet.', ['scope.md', 'research.md']);
      await this.stage(p, 'research', 'complete');
      await this.stage(p, 'plan', 'active');
      await this.agent(p, run, 'plan', provider, model,
        'Read requirements.md, scope.md and research.md. You are the planning agent. Produce plan.md with implementation tasks and test-matrix.md with acceptance-to-test mapping, risks, and operational requirements needing human review. Read .fleet/quality-contract.md and produce valid acceptance-plan.json and ux-spec.json. Cover every packet acceptance ID exactly once, preserving original requirements and explicitly explaining deferred integration work. Define primary and recovery browser journeys with literal expected outcomes and stable selectors that the builder must implement. The host freezes these expectations before building and runs each journey in fresh desktop and narrow browser contexts. Target a dependency-free browser application delivered as a self-contained index.html (inline CSS and classic JS, no external files or CDNs), plus testable core logic and Node built-in test runner files named *.test.cjs or *.test.mjs. The complete application must run by opening index.html. Publish the application architecture with fleet_system_design. Do not implement yet.', ['scope.md', 'research.md', 'plan.md', 'test-matrix.md', 'system-design.json', 'acceptance-plan.json', 'ux-spec.json']);
      run.quality = await loadQualityContract(p.workspace!, run.acceptance!);
      this.log(p, 'plan', 'info', 'Acceptance plan and UX specification validated and frozen. Browser journeys will verify the delivered application at desktop and narrow sizes.');
      await this.stage(p, 'plan', 'complete');
      await this.stage(p, 'build', 'active');
      await this.agent(p, run, 'build', provider, model,
        'You are the implementation agent. Read requirements.md, research.md, plan.md, acceptance-plan.json and ux-spec.json, then implement the complete usable application. Treat the validated browser steps, selectors and expected results as a frozen contract. Implement the specified first-run flow, feedback, recovery, keyboard operation and narrow layout. Do not edit acceptance-plan.json or ux-spec.json. Use one application implementation for browser and Node tests, for example by extracting the actual marked inline core in tests; avoid copied test-only logic. Deliver a self-contained index.html with inline CSS and classic JS (no imports, CDNs, or network dependencies), path-to-fleet.md listing prerequisites for field validation and unresolved integrations, testable core source, and meaningful *.test.cjs or *.test.mjs tests using node:test and node:assert. Keep the tested core and inline app logic consistent. No placeholder controls or fake test results. Include synthetic sample data, empty states, validation, and accessible controls. Document limitations. Use no package dependencies. Do not modify requirements.md or .fleet. The harness will independently run tests with its bundled Node runtime. Tests must use OS temporary directories for mutable files. After implementation, a follow-up step will ask you to write README.md as the user guide for the finished application.', ['scope.md', 'research.md', 'plan.md', 'test-matrix.md', 'index.html', 'path-to-fleet.md'], true, {
          instruction: 'Implementation is complete. Now write README.md as a practical user guide for the software you just built. Inspect the actual index.html, application source, sample data and tests so the instructions describe implemented behavior. Write for a first-time user, with clear sections covering: what the application does and who it is for; prerequisites and quick start (open index.html in a browser, with no install or server required); numbered instructions for each main workflow using the actual screen, field and button names; a reproducible walkthrough using synthetic sample input and the expected output; supported input formats and validation; how to save, export, reset or recover data where supported, and whether data survives reloads; troubleshooting common errors; known limitations and unimplemented integrations; and developer test instructions with commands matching the actual test files. Distinguish using the app from running developer tests, which require Node. Explain unsupported features honestly; do not invent controls or claim tests or browser checks passed without evidence. Link to verification.md for verification notes and path-to-fleet.md for field-validation prerequisites. Write or update README.md only in this step. Preserve requirements.md, .fleet, application source and tests.',
          files: ['README.md']
        });
      run.buildTests = await this.testSnapshot(p); run.lastTests = run.buildTests; run.testChanges = [];
      await this.stage(p, 'build', 'complete'); await this.stage(p, 'verify', 'active');
      await this.agent(p, run, 'verify', provider, model,
        'You are the verification agent. Inspect requirements.md, plan.md, acceptance-plan.json, ux-spec.json, application source, tests, and README.md. Preserve the frozen acceptance plan and UX specification. The host will execute every planned browser journey at desktop and narrow sizes, checking actual rendered outcomes, console errors and layout overflow; Node-only success cannot pass verification. Improve coverage for edge cases and consistency between the tested logic and index.html. Fix defects you find. Check the README quick start and sample walkthrough against the actual application, and update README.md for any changed controls, inputs, outputs or limitations. Write verification.md mapping each requirement to tests and explicitly listing what remains unverified, including any guide steps you could not exercise. Do not claim test execution unless you execute it. Keep index.html self-contained and all test files named *.test.cjs or *.test.mjs using node:test. The harness independently runs the tests next.', ['scope.md', 'research.md', 'plan.md', 'test-matrix.md', 'index.html', 'README.md', 'path-to-fleet.md', 'verification.md'], true);
      this.check(run);
      await this.checkInputs(p, run);
      await this.recordTestChanges(p, run, 'verify');
      p.report = await this.verify(p, run);
      this.log(p, 'verify', 'info', p.report.output);
      if (!reportPassed(p.report, true)) {
        await fs.writeFile(path.join(p.workspace!, 'test-report.json'), JSON.stringify(p.report, null, 2));
        this.log(p, 'verify', 'info', 'Verification failed. Starting one ' + (run.backend === 'codex' ? 'Codex' : 'Pi') + ' repair attempt.');
        await this.agent(p, run, 'verify', provider, model,
          'The independent test run failed. Read test-report.json, diagnose and repair the implementation. Inspect the quality section for failed browser steps and screenshot/trace paths as well as Node failures. Fix the application, including UI behavior, selectors, recovery and responsive layout. Keep acceptance criteria and tests meaningful; do not delete, skip, or weaken tests to obtain a pass. Never edit acceptance-plan.json or ux-spec.json; the host checks their original hash. Keep index.html consistent with core source. Update README.md so its user guide and sample walkthrough match the repaired application. Update verification.md with the repair and remaining limitations.', ['scope.md', 'research.md', 'plan.md', 'test-matrix.md', 'index.html', 'README.md', 'path-to-fleet.md', 'verification.md'], true);
        await this.checkInputs(p, run);
        await this.recordTestChanges(p, run, 'repair');
        p.report = await this.verify(p, run);
        this.log(p, 'verify', 'info', p.report.output);
      }
      this.check(run);
      await fs.writeFile(path.join(p.workspace!, 'test-report.json'), JSON.stringify(p.report, null, 2));
      if (!reportPassed(p.report, true)) throw new Error('Verification did not pass. Inspect the actual test output; delivery remains blocked.');
      await this.stage(p, 'verify', 'complete'); await this.stage(p, 'review', 'review');
      this.check(run);
      run.outcome = 'review'; this.log(p, 'review', 'info', 'Application tests and planned browser journeys passed. Inspect requirement coverage, deferred items and the preview before approving prototype delivery.');
    } catch (error) {
      p.error = run.controller.signal.aborted ? 'Stopping run and checking its processes.' : error instanceof Error ? error.message : String(error); run.outcome = 'failed';
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
