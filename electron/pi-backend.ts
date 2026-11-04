import { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager, type AgentSession } from '@earendil-works/pi-coding-agent';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ChildProcess } from 'node:child_process';
import type { AgentModel, Project, StageId } from '../shared/types.js';
import { stageDefinitions } from '../shared/types.js';
import { Store, safeFile } from './storage.js';
import { reportPassed, verifyWorkspace } from './verification.js';
import { prepareFleetWorkspace, fleetStagePrompt, assertFleetPacketIntegrity } from '../harness/integration.js';
import { createFleetTools } from '../harness/pi-tools.js';

type ActiveRun = { controller: AbortController; session?: AgentSession; child?: ChildProcess; context?: string; skillPaths?: string[]; packetHash?: string; requirements?: string };
export class PiBackend {
  runtime!: ModelRuntime;
  active = new Map<string, ActiveRun>();
  constructor(private store: Store, private executable: string, private notify: () => void, private resourcesRoot: string) {}
  async init() { this.runtime = await ModelRuntime.create({ allowModelNetwork: false }); }
  models(): AgentModel[] {
    return this.runtime.getModels().map(m => ({ id: m.id, provider: m.provider, name: m.name,
      configured: this.runtime.hasConfiguredAuth(m.provider) })).sort((a, b) => Number(b.configured) - Number(a.configured) || a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));
  }
  private async changed(p: Project) { p.updatedAt = new Date().toISOString(); this.notify(); await this.store.save(); }
  private log(p: Project, stage: StageId, kind: 'info' | 'text' | 'tool' | 'error', text: string) {
    const last = p.logs.at(-1);
    if (kind === 'text' && last?.kind === 'text' && last.stage === stage && last.text.length < 16000) last.text += text;
    else p.logs.push({ id: randomUUID(), time: new Date().toISOString(), stage, kind, text: text.slice(0, 16000) });
    if (p.logs.length > 600) p.logs.splice(0, p.logs.length - 600);
    this.notify();
  }
  private async stage(p: Project, id: StageId, status: 'active' | 'complete' | 'failed' | 'review') {
    p.stages.find(s => s.id === id)!.status = status; await this.changed(p);
  }
  private check(run: ActiveRun) { if (run.controller.signal.aborted) throw new Error('Run stopped by you. Source and session logs are saved.'); }
  async start(id: string) {
    if (this.active.has(id)) throw new Error('This challenge already has an active run.');
    if (this.active.size >= 3) throw new Error('Three runs are already active. Stop a run before starting another.');
    const p = this.store.project(id);
    const { provider, model: modelId } = this.store.state.settings;
    const model = this.runtime.getModel(provider, modelId);
    if (!model || !this.runtime.hasConfiguredAuth(provider)) throw new Error('Choose a model and connect its provider in Pi settings first.');
    const run: ActiveRun = { controller: new AbortController() };
    this.active.set(id, run);
    try {
      p.runId = randomUUID();
      p.workspace = path.join(this.store.root, 'workspaces', p.id, p.runId);
      await fs.mkdir(p.workspace, { recursive: true, mode: 0o700 });
      p.status = 'running'; p.stages = structuredClone(stageDefinitions); p.logs = [];
      p.report = undefined; p.error = undefined; p.approvedAt = undefined; p.exportedTo = undefined; p.feedback = '';
      p.model = provider + '/' + modelId;
      await fs.writeFile(path.join(p.workspace, 'requirements.md'), [
        '# ' + p.title, '', p.description, '', '## Acceptance criteria',
        ...p.criteria.map((c, i) => (i + 1) + '. ' + c), '',
        'Use synthetic data only. Operational readiness requires independent domain review.'
      ].join('\n'));
      const packet = await prepareFleetWorkspace({ workspace: p.workspace, title: p.title, description: p.description,
        criteria: p.criteria, challengeId: p.challengeId, resourcesRoot: this.resourcesRoot });
      run.context = packet.context; run.skillPaths = packet.skillPaths; run.packetHash = packet.packetHash;
      run.requirements = await fs.readFile(path.join(p.workspace, 'requirements.md'), 'utf8');
      this.log(p, 'intake', 'info', 'Requirements saved. Backend: Pi SDK · ' + p.model);
      await this.changed(p);
      void this.execute(p, run, provider, modelId);
    } catch (error) {
      this.active.delete(id); p.status = 'failed'; p.error = error instanceof Error ? error.message : String(error);
      await this.changed(p); throw error;
    }
  }
  private async agent(p: Project, run: ActiveRun, stage: StageId, provider: string, modelId: string, instruction: string) {
    this.check(run);
    const settingsManager = SettingsManager.inMemory({ compaction: { enabled: true }, retry: { enabled: true, maxRetries: 2 } });
    const loader = new DefaultResourceLoader({
      cwd: p.workspace!, agentDir: path.join(this.store.root, 'pi'), settingsManager,
      noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true, additionalSkillPaths: run.skillPaths,
      agentsFilesOverride: () => ({ agentsFiles: [] }),
      systemPromptOverride: base => (base || '') + '\n\nYou are a FleetHarness software-factory agent. Work only inside the current working directory. Never access credentials or unrelated files, publish, deploy, or contact external operational systems. Use synthetic examples. Write actual working artifacts and report limitations honestly. You may use local read, write, edit, and bash tools. This is a dedicated working directory, not an OS sandbox.'
    });
    await loader.reload();
    this.check(run);
    const { session } = await createAgentSession({
      cwd: p.workspace!, agentDir: path.join(this.store.root, 'pi'), modelRuntime: this.runtime,
      model: this.runtime.getModel(provider, modelId), thinkingLevel: 'medium',
      tools: ['read', 'write', 'edit', 'bash', 'fleet_*'], customTools: createFleetTools(), resourceLoader: loader, settingsManager,
      sessionManager: SessionManager.create(p.workspace!, path.join(this.store.root, 'sessions', p.id))
    });
    run.session = session;
    let assistantError = '', turns = 0;
    const unsubscribe = session.subscribe(event => {
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') this.log(p, stage, 'text', event.assistantMessageEvent.delta);
      if (event.type === 'tool_execution_start') this.log(p, stage, 'tool', event.toolName + '\n' + JSON.stringify(event.args, null, 2).slice(0, 6000));
      if (event.type === 'tool_execution_end') this.log(p, stage, event.isError ? 'error' : 'tool', event.toolName + (event.isError ? ' failed\n' : ' completed\n') + JSON.stringify(event.result).slice(0, 8000));
      if (event.type === 'message_end' && event.message.role === 'assistant' && event.message.stopReason === 'error') assistantError = event.message.errorMessage || 'The model provider returned an error.';
      if (event.type === 'turn_end' && ++turns >= 40) { assistantError = 'This agent reached the 40-turn limit. Inspect its artifacts before retrying.'; void session.abort(); }
    });
    const timeout = setTimeout(() => { assistantError = 'This agent exceeded the 15-minute limit.'; void session.abort(); }, 15 * 60_000);
    try {
      this.check(run); await session.prompt([run.context, stage === 'plan' ? fleetStagePrompt('research') : '', fleetStagePrompt(stage), instruction].filter(Boolean).join('\n\n')); this.check(run);
      if (assistantError) throw new Error(assistantError);
    } finally { clearTimeout(timeout); unsubscribe(); session.dispose(); run.session = undefined; await this.store.save(); }
  }
  private async requireFiles(p: Project, files: string[]) {
    for (const file of files) {
      try { if (!(await fs.stat(await safeFile(p.workspace!, file))).size) throw new Error('Empty file'); }
      catch { throw new Error('Pi did not produce the required artifact: ' + file + '. Inspect the session and start a new run.'); }
    }
  }
  private async checkInputs(p: Project, run: ActiveRun) {
    await assertFleetPacketIntegrity(p.workspace!, run.packetHash!);
    if (await fs.readFile(await safeFile(p.workspace!, 'requirements.md'), 'utf8') !== run.requirements) {
      throw new Error('The original requirements changed during the run. Review the artifacts and start a new run.');
    }
  }
  private async execute(p: Project, run: ActiveRun, provider: string, model: string) {
    try {
      await this.stage(p, 'research', 'active'); await this.stage(p, 'plan', 'active');
      await this.agent(p, run, 'plan', provider, model,
        'Read requirements.md. You are the planning agent. Produce scope.md as a derived scope assessment without changing requirements.md, research.md with architecture, reuse options and honest sources (do not invent web research), plan.md with implementation tasks, and test-matrix.md with acceptance-to-test mapping, risks, and operational requirements needing human review. Target a dependency-free browser application delivered as a self-contained index.html (inline CSS and classic JS, no external files or CDNs), plus testable core logic and Node built-in test runner files named *.test.cjs or *.test.mjs. The complete application must run by opening index.html. Do not implement yet.');
      await this.requireFiles(p, ['scope.md', 'research.md', 'plan.md', 'test-matrix.md']);
      await this.stage(p, 'research', 'complete'); await this.stage(p, 'plan', 'complete'); await this.stage(p, 'build', 'active');
      await this.agent(p, run, 'build', provider, model,
        'You are the implementation agent. Read requirements.md, research.md, and plan.md, then implement the complete usable application. Deliver a self-contained index.html with inline CSS and classic JS (no imports, CDNs, or network dependencies), a README.md, path-to-fleet.md listing prerequisites for field validation and unresolved integrations, testable core source, and meaningful *.test.cjs or *.test.mjs tests using node:test and node:assert. Keep the tested core and inline app logic consistent. No placeholder controls or fake test results. Include synthetic sample data, empty states, validation, and accessible controls. Document limitations. Use no package dependencies. Do not modify requirements.md or .fleet. The harness will independently run tests with its bundled Node runtime. Tests must use OS temporary directories for mutable files.');
      await this.requireFiles(p, ['index.html', 'README.md', 'path-to-fleet.md']); await this.stage(p, 'build', 'complete'); await this.stage(p, 'verify', 'active');
      await this.agent(p, run, 'verify', provider, model,
        'You are the verification agent. Inspect requirements.md, plan.md, application source, and tests. Improve coverage for edge cases and consistency between the tested logic and index.html. Fix defects you find. Write verification.md mapping each requirement to tests and explicitly listing what remains unverified. Do not claim test execution unless you execute it. Keep index.html self-contained and all test files named *.test.cjs or *.test.mjs using node:test. The harness independently runs the tests next.');
      this.check(run);
      await this.requireFiles(p, ['verification.md']);
      await this.checkInputs(p, run);
      p.report = await verifyWorkspace(p.workspace!, this.executable, child => { run.child = child; }, run.controller.signal);
      run.child = undefined; this.log(p, 'verify', 'info', p.report.output);
      if (!reportPassed(p.report)) {
        await fs.writeFile(path.join(p.workspace!, 'test-report.json'), JSON.stringify(p.report, null, 2));
        this.log(p, 'verify', 'info', 'Verification failed. Starting one Pi repair attempt.');
        await this.agent(p, run, 'verify', provider, model,
          'The independent test run failed. Read test-report.json, diagnose and repair the implementation. Keep acceptance criteria and tests meaningful; do not delete, skip, or weaken tests to obtain a pass. Keep index.html consistent with core source. Update verification.md with the repair and remaining limitations.');
        await this.checkInputs(p, run);
        await this.requireFiles(p, ['index.html', 'README.md', 'path-to-fleet.md', 'verification.md', 'test-matrix.md']);
        p.report = await verifyWorkspace(p.workspace!, this.executable, child => { run.child = child; }, run.controller.signal);
        run.child = undefined; this.log(p, 'verify', 'info', p.report.output);
      }
      this.check(run);
      await fs.writeFile(path.join(p.workspace!, 'test-report.json'), JSON.stringify(p.report, null, 2));
      if (!reportPassed(p.report)) throw new Error('Verification did not pass. Inspect the actual test output; delivery remains blocked.');
      await this.stage(p, 'verify', 'complete'); await this.stage(p, 'review', 'review');
      p.status = 'review'; this.log(p, 'review', 'info', 'Automated tests passed. Inspect the preview, acceptance criteria, and limitations before approving delivery.');
    } catch (error) {
      p.error = error instanceof Error ? error.message : String(error); p.status = run.controller.signal.aborted ? 'stopped' : 'failed';
      const stage = p.stages.findLast(s => s.status === 'active')?.id || 'build';
      p.stages.filter(s => s.status === 'active').forEach(s => { s.status = 'failed'; }); this.log(p, stage, 'error', p.error);
    } finally { this.active.delete(p.id); await this.changed(p); }
  }
  async stop(id: string) {
    const run = this.active.get(id); if (!run) return;
    run.controller.abort(); await run.session?.abort();
  }
  async stopAll() { await Promise.all([...this.active.keys()].map(id => this.stop(id))); }
}
