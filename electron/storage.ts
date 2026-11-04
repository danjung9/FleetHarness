import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import type { AppState, Project, NewProject, Artifact } from '../shared/types.js';
import { stageDefinitions, starters } from '../shared/types.js';
import { getChallenge } from '../harness/catalog.js';

export function validateInput(input: NewProject): NewProject {
  if (!input || typeof input.title !== 'string' || typeof input.description !== 'string' ||
      !Array.isArray(input.criteria) || input.criteria.some(c => typeof c !== 'string')) throw new Error('Invalid challenge.');
  const title = input.title.trim(), description = input.description.trim();
  const criteria = input.criteria.map(c => c.trim()).filter(Boolean);
  if (!title || title.length > 120 || description.length < 20 || description.length > 16000 ||
      criteria.length < 1 || criteria.length > 30 || criteria.some(c => c.length > 2000)) {
    throw new Error('Add a title, a problem statement (20–16,000 characters), and 1–30 acceptance criteria.');
  }
  if (input.challengeId !== undefined) getChallenge(input.challengeId);
  return { title, description, criteria, challengeId: input.challengeId };
}
export function newProject(input: NewProject): Project {
  return { ...validateInput(input), id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
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
      this.state = { version: 1, projects: starters.map(newProject), settings: { provider: '', model: '', rememberKey: false } };
    }
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
export async function sourceHash(root: string) {
  const hash = createHash('sha256');
  for (const file of await listArtifacts(root)) {
    if (['test-report.json', 'review.json', 'DELIVERY.md'].includes(file.path)) continue;
    if (file.size > 10 * 1024 * 1024) throw new Error('An artifact exceeds the 10 MB verification limit.');
    hash.update(file.path); hash.update(await fs.readFile(await safeFile(root, file.path)));
  }
  return hash.digest('hex');
}
