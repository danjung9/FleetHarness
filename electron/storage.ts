import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createSourceHash } from '../shared/source-hash.js';
import type { AppState, Project, NewProject, Artifact } from '../shared/types.js';
import { stageDefinitions, starters } from '../shared/types.js';
import { getChallenge } from '../harness/catalog.js';
import { normalizeProjectInput } from '../shared/project-input.js';
import type { Challenge } from '../harness/types.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { RunProcessSweep } from './process-sweep.js';

export function validateInput(input: NewProject, catalog?: readonly Challenge[]): NewProject {
  const normalized = normalizeProjectInput(input);
  if (normalized.challengeId !== undefined) getChallenge(normalized.challengeId, catalog);
  return normalized;
}
export function newProject(input: NewProject, catalog?: readonly Challenge[]): Project {
  const normalized = validateInput(input, catalog);
  return { ...normalized, sourceChallenge: normalized.challengeId ? getChallenge(normalized.challengeId, catalog) : undefined,
    id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    status: 'draft', stages: structuredClone(stageDefinitions), logs: [], feedback: '' };
}
export class Store {
  state!: AppState;
  private writes: Promise<void> = Promise.resolve();
  constructor(public root: string, private recoverProcesses = (marker: string) => new RunProcessSweep({ marker }).stop()) {}
  async init() {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    try {
      const data = JSON.parse(await fs.readFile(path.join(this.root, 'state.json'), 'utf8'));
      if (data.version !== 1 || !Array.isArray(data.projects)) throw new Error('Unsupported saved workspace format.');
      this.state = data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      this.state = { version: 1, projects: starters.map(input => newProject(input)), settings: { provider: '', model: '', rememberKey: false, developerMode: false } };
    }
    this.state.settings.developerMode = this.state.settings.developerMode === true;
    for (const p of this.state.projects) {
      if (p.conversation) {
        p.conversation.status = 'idle';
        for (const message of p.conversation.messages) {
          if (message.status === 'streaming') {
            message.status = 'error';
            message.text ||= 'This reply was interrupted. Send a new message to continue.';
            p.conversation.error = 'The previous reply was interrupted. Send a new message to continue.';
          }
        }
        for (const question of p.conversation.questions) if (question.status === 'pending') question.status = 'cancelled';
      }
      if (p.executable?.status === 'packaging') {
        p.executable.status = 'failed';
        p.executable.error = 'Packaging was interrupted. Download the app again to retry.';
      }
      if (p.status === 'running' && p.runSummary && !p.runSummary.finishedAt) {
        p.runSummary.terminalReason = 'interrupted'; p.runSummary.finishedAt = p.updatedAt;
        const phase = p.runSummary.phases.at(-1);
        if (phase && !phase.finishedAt) phase.finishedAt = p.updatedAt;
        p.runSummary.usage.limitations = [...new Set([...p.runSummary.usage.limitations, 'The app was interrupted; usage after the last saved checkpoint may be missing.'])];
        for (const metric of ['requests', 'tokens', 'inputTokens', 'outputTokens', 'cachedInputTokens', 'cacheWriteTokens', 'reasoningTokens', 'costUsd'] as const) {
          if (p.runSummary.usage[metric].value !== null) p.runSummary.usage[metric].state = 'partial';
        }
      }
      if (p.status === 'running' || (p.processScope && (p.processScope.cleanup !== 'confirmed' || p.processScope.runId !== p.runId))) await this.reconcile(p);
    }
    await this.save();
  }
  project(id: string) {
    const p = this.state.projects.find(p => p.id === id);
    if (!p) throw new Error('Challenge not found.');
    return p;
  }
  async reconcile(p: Project) {
    const scope = p.processScope;
    p.status = 'failed'; p.approvedAt = undefined; p.approval = undefined; p.verification = undefined;
    p.stages.filter(s => s.status === 'active' || s.status === 'review').forEach(s => { s.status = 'failed'; });
    p.processScope = { runId: scope?.runId ?? p.runId ?? '', marker: scope?.marker ?? '', cleanup: 'unconfirmed' };
    p.error = p.error && scope?.cleanup === 'unconfirmed' ? p.error : 'Process cleanup could not be confirmed. New work is blocked until the interrupted workers are stopped.';
    await this.save();
    if (!scope?.marker || scope.runId !== p.runId) return;
    try {
      await this.recoverProcesses(scope.marker);
      p.processScope.cleanup = 'confirmed'; p.status = 'stopped';
      if (p.runCheckpoint) p.runCheckpoint.writerState = 'idle';
      p.error = p.resumeStage && p.runCheckpoint
        ? 'The previous run was interrupted. Its processes have been stopped. Resume the phase to continue with your saved work.'
        : 'The previous run was interrupted. Its processes have been stopped. This older run has no recovery checkpoint; start a new build from the saved requirements.';
    } catch { /* Keep the unresolved marker for a later Stop or restart retry. */ }
    await this.save();
  }
  save() {
    const json = JSON.stringify(this.state, null, 2);
    const summaries = this.state.projects.filter(p => p.workspace && p.runSummary).map(p => ({ workspace: p.workspace!, json: JSON.stringify(p.runSummary, null, 2) }));
    this.writes = this.writes.catch(() => {}).then(async () => {
      await atomicHostWrite(this.root, 'state.json', json);
      for (const summary of summaries) {
        try { await atomicHostWrite(summary.workspace, 'run-summary.json', summary.json); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      }
    });
    return this.writes;
  }
  saveProject(next: Project) {
    this.writes = this.writes.catch(() => {}).then(async () => {
      const current = this.project(next.id);
      const state = { ...this.state, projects: this.state.projects.map(p => p.id === next.id ? next : p) };
      await atomicHostWrite(this.root, 'state.json', JSON.stringify(state, null, 2));
      Object.assign(current, next);
    });
    return this.writes;
  }
}
const ignored = new Set(['node_modules', '.git', '.pi', '.DS_Store', 'run-summary.json.tmp']);
export async function listArtifacts(root: string, prefix = ''): Promise<Artifact[]> {
  if ((await fs.lstat(path.join(root, prefix))).isSymbolicLink()) throw new Error('Artifact symlinks are not allowed.');
  const results: Artifact[] = [];
  for (const entry of await fs.readdir(path.join(root, prefix), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Artifact symlinks are not allowed: ' + path.join(prefix, entry.name));
    if (ignored.has(entry.name)) continue;
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) results.push(...await listArtifacts(root, relative));
    else if (entry.isFile()) results.push({ path: relative, size: (await fs.stat(path.join(root, relative))).size });
    if (results.length > 2000) throw new Error('This workspace exceeds the 2,000-file artifact limit.');
  }
  return results.sort((a, b) => a.path.localeCompare(b.path));
}
export async function safeFile(root: string, relative: string) {
  if (!relative || path.isAbsolute(relative)) throw new Error('Invalid artifact path.');
  const base = await fs.realpath(root);
  let cursor = path.resolve(root);
  const target = path.resolve(root, relative);
  if (!target.startsWith(cursor + path.sep)) throw new Error('Artifact must stay inside its workspace.');
  for (const part of path.relative(cursor, target).split(path.sep)) {
    cursor = path.join(cursor, part);
    if ((await fs.lstat(cursor)).isSymbolicLink()) throw new Error('Artifact symlinks are not allowed: ' + relative);
  }
  const resolved = await fs.realpath(path.resolve(root, relative));
  if (!resolved.startsWith(base + path.sep)) throw new Error('Artifact must stay inside its workspace.');
  return resolved;
}
export type ArtifactManifest = { path: string; contents: Buffer }[];
export async function artifactManifest(root: string, options: { excludeEvidence?: boolean; excludeEvaluationPlan?: boolean; requireEntryPoint?: boolean } = {}): Promise<ArtifactManifest> {
  const files: ArtifactManifest = [];
  for (const file of await listArtifacts(root)) {
    if (['test-report.json', 'review.json', 'DELIVERY.md', 'run-summary.json', 'run-summary.json.tmp'].includes(file.path)) continue;
    if (options.excludeEvaluationPlan && file.path === 'evaluation-plan.json') continue;
    if (options.excludeEvidence && /^\.quality-evidence(?:\/|\\)/.test(file.path)) continue;
    if (file.size > 10 * 1024 * 1024) throw new Error('An artifact exceeds the 10 MB verification limit.');
    const handle = await fs.open(await safeFile(root, file.path), constants.O_RDONLY | constants.O_NOFOLLOW);
    let contents: Buffer;
    try {
      if (!(await handle.stat()).isFile()) throw new Error('Artifacts must be regular files.');
      contents = await handle.readFile();
    } finally { await handle.close(); }
    if (contents.length > 10 * 1024 * 1024) throw new Error('An artifact exceeds the 10 MB verification limit.');
    files.push({ path: file.path, contents });
  }
  if (options.requireEntryPoint && !files.some(file => file.path === 'index.html' && file.contents.length)) throw new Error('A regular, nonempty index.html entry point is required.');
  return files;
}
export function manifestHash(files: ArtifactManifest) {
  const hash = createSourceHash();
  for (const file of files) hash.update(file.path, file.contents);
  return hash.digest();
}
export async function sourceHash(root: string, options: { excludeEvidence?: boolean; excludeEvaluationPlan?: boolean } = {}) {
  return manifestHash(await artifactManifest(root, options));
}
