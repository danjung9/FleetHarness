import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import type { AppState, Project, NewProject, Artifact } from '../shared/types.js';
import { stageDefinitions, starters } from '../shared/types.js';
import { getChallenge } from '../harness/catalog.js';
import { normalizeProjectInput } from '../shared/project-input.js';
import type { Challenge } from '../harness/types.js';

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
  constructor(public root: string) {}
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
      if (p.executable?.status === 'packaging') {
        p.executable.status = 'failed';
        p.executable.error = 'Packaging was interrupted. Download the app again to retry.';
      }
      if (p.status === 'running') {
        p.status = 'stopped'; p.error = 'The previous run was interrupted. Start a new run to continue from the saved requirements.';
        p.stages.filter(s => s.status === 'active').forEach(s => { s.status = 'failed'; });
      }
    }
    await this.save();
  }
  project(id: string) {
    const p = this.state.projects.find(p => p.id === id);
    if (!p) throw new Error('Challenge not found.');
    return p;
  }
  save() {
    const json = JSON.stringify(this.state, null, 2);
    this.writes = this.writes.catch(() => {}).then(async () => {
      const target = path.join(this.root, 'state.json');
      await fs.writeFile(target + '.tmp', json, { mode: 0o600 });
      await fs.rename(target + '.tmp', target);
    });
    return this.writes;
  }
}
const ignored = new Set(['node_modules', '.git', '.pi', '.DS_Store']);
export async function listArtifacts(root: string, prefix = ''): Promise<Artifact[]> {
  const results: Artifact[] = [];
  for (const entry of await fs.readdir(path.join(root, prefix), { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.isSymbolicLink()) continue;
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
  const resolved = await fs.realpath(path.resolve(root, relative));
  if (!resolved.startsWith(base + path.sep)) throw new Error('Artifact must stay inside its workspace.');
  return resolved;
}
export async function sourceHash(root: string, options: { excludeEvidence?: boolean } = {}) {
  const hash = createHash('sha256');
  // Versioned, length-prefixed records invalidate ambiguous legacy approvals.
  hash.update('AppYard source hash v2\0');
  for (const file of await listArtifacts(root)) {
    if (['test-report.json', 'review.json', 'DELIVERY.md'].includes(file.path)) continue;
    if (options.excludeEvidence && /^\.quality-evidence(?:\/|\\)/.test(file.path)) continue;
    if (file.size > 10 * 1024 * 1024) throw new Error('An artifact exceeds the 10 MB verification limit.');
    const name = Buffer.from(file.path, 'utf8'), contents = await fs.readFile(await safeFile(root, file.path));
    if (contents.length > 10 * 1024 * 1024) throw new Error('An artifact exceeds the 10 MB verification limit.');
    const lengths = Buffer.alloc(8);
    lengths.writeUInt32BE(name.length, 0); lengths.writeUInt32BE(contents.length, 4);
    hash.update(lengths); hash.update(name); hash.update(contents);
  }
  return hash.digest('hex');
}
