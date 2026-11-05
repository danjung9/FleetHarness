import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Artifact, NewProject, Project, Settings, StageId } from '../shared/types.js';
import { stageDefinitions } from '../shared/types.js';
import { normalizeProjectInput } from '../shared/project-input.js';
import { reportPassed } from '../shared/verification.js';
import { createSourceHash } from '../shared/source-hash.js';
import { bundledNorfolkCatalog, getChallenge } from '../harness/catalog.js';
import type { NorfolkCatalog } from '../harness/norfolk.js';
import { HttpError, requireUuid } from './http.js';

export type HostedRunStatus = 'queued' | 'running' | 'pausing' | 'paused' | 'failed' | 'review' | 'approved' | 'delivered';
export interface StoredArtifact extends Artifact { sha256: string }
export interface ArtifactManifest { version: string; prefix: string; files: StoredArtifact[]; sourceHash: string; createdAt: string }
export interface HostedRun {
  id: string; userId: string; projectId: string; status: HostedRunStatus; epoch: number;
  createdAt: string; updatedAt: string; model: string; modelRequests: number;
  workflowId?: string; sandboxId?: string; commandId?: string; checkpointStage?: StageId;
  artifactPrefix?: string; manifest?: ArtifactManifest; metadata: Record<string, unknown>;
}
export type RunPatch = Partial<Omit<HostedRun, 'id' | 'userId' | 'projectId' | 'epoch' | 'createdAt' | 'updatedAt' | 'modelRequests'>>;
export interface AccountSettings { settings: Settings; connected: boolean; modelIds: string[]; lastCheckedAt?: string }
export interface HostedUser { id: string; email?: string }
export interface ClaimedRun { run: HostedRun; project: Project }
export interface PublicShare { run: HostedRun; manifest: ArtifactManifest; title: string }
interface ProjectRow { id: string; user_id: string; data: Project; created_at: string; updated_at: string }
interface RunRow { id: string; user_id: string; project_id: string; status: HostedRunStatus; epoch: number; state: Partial<HostedRun>; model: string; model_requests: number; created_at: string; updated_at: string }
interface AccountRow { settings: Settings; encrypted_key: string | null; model_ids: string[]; last_checked_at?: string }
const defaultSettings: Settings = { backend: 'pi', provider: 'openai', model: '', rememberKey: true };
const MAX_FILE = 10 * 1024 * 1024, MAX_BUNDLE = 30 * 1024 * 1024;

function projectFromRow(row: ProjectRow): Project {
  const { workspace: _workspace, ...project } = row.data;
  return { ...project, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at };
}
function runFromRow(row: RunRow): HostedRun {
  return { ...row.state, id: row.id, userId: row.user_id, projectId: row.project_id,
    status: row.status, epoch: row.epoch, model: row.model, modelRequests: row.model_requests,
    createdAt: row.created_at, updatedAt: row.updated_at, metadata: row.state.metadata ?? {} };
}
export function validateArtifactPath(value: string): string {
  if (typeof value !== 'string' || !value || value.length > 500 || /[\\\x00-\x1f\x7f]/.test(value)) throw new HttpError(400, 'Invalid artifact path.');
  if (value.split('/').some(part => !part || part === '.' || part === '..' || ['.git', '.pi', 'node_modules', '.DS_Store'].includes(part) || /^\.env(?:\.|$)/.test(part))) {
    throw new HttpError(400, 'Invalid artifact path.');
  }
  return value;
}
export function artifactPrefix(run: Pick<HostedRun, 'userId' | 'projectId' | 'id'>, version: string): string {
  return [run.userId, run.projectId, run.id, version].map(part => requireUuid(part)).join('/');
}
export function assertManifest(run: HostedRun, manifest: ArtifactManifest): void {
  if (!manifest || manifest.prefix !== artifactPrefix(run, manifest.version) || !/^[a-f0-9]{64}$/.test(manifest.sourceHash) || !Array.isArray(manifest.files) || manifest.files.length > 2000) {
    throw new HttpError(409, 'The saved artifact version is invalid.');
  }
  const paths = new Set<string>(); let total = 0;
  for (const file of manifest.files) {
    validateArtifactPath(file.path);
    if (paths.has(file.path) || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_FILE || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new HttpError(409, 'The saved artifact version is invalid.');
    paths.add(file.path); total += file.size;
  }
  if (total > MAX_BUNDLE) throw new HttpError(413, 'The artifact bundle exceeds 30 MB.');
}
export function hashSourceFiles(files: { path: string; content: Buffer }[]): string {
  const hash = createSourceHash();
  // Hosted object keys and Linux worker verification use canonical POSIX paths.
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    if (['test-report.json', 'review.json', 'DELIVERY.md'].includes(file.path)) continue;
    hash.update(file.path, file.content);
  }
  return hash.digest();
}

/** Only instantiate server-side. Every browser-facing lookup carries the verified auth user ID. */
export class HostedDatabase {
  constructor(private url: string, private serviceKey: string, private fetcher: typeof fetch = fetch, private bucket = 'fleet-artifacts') {
    if (!url || !serviceKey) throw new HttpError(503, 'Hosted storage is not configured.');
    this.url = url.replace(/\/$/, '');
  }
  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('apikey', this.serviceKey); headers.set('Authorization', `Bearer ${this.serviceKey}`);
    let response: Response;
    try { response = await this.fetcher(`${this.url}${path}`, { ...init, headers, signal: AbortSignal.timeout(30_000) }); }
    catch { throw new HttpError(503, 'Hosted storage is temporarily unavailable.'); }
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { code?: string };
      if (error.code === 'P0002' || response.status === 404) throw new HttpError(404, 'Project or saved run not found.');
      if (error.code === 'FH409') throw new HttpError(409, 'This project changed or has an active build. Refresh and try again.', 'state_conflict');
      if (error.code === 'FH429') throw new HttpError(429, 'The account already has an active build or has reached the run limit.', 'run_limit');
      if (error.code === 'FH400') throw new HttpError(400, 'This action is not available for the current project state.');
      if (error.code === 'FH403') throw new HttpError(403, 'Approve this exact verified version before sharing or exporting.');
      throw new HttpError(503, 'Hosted storage could not complete this request.');
    }
    return response;
  }
  private async rest<T>(table: string, filters: Record<string, string>, init: RequestInit = {}): Promise<T> {
    const response = await this.request(`/rest/v1/${table}?${new URLSearchParams(filters)}`, {
      ...init, headers: { 'Content-Type': 'application/json', ...Object.fromEntries(new Headers(init.headers)) },
    });
    return response.status === 204 ? undefined as T : await response.json() as T;
  }
  private async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const response = await this.request(`/rest/v1/rpc/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    return await response.json() as T;
  }
  async authenticate(request: Request): Promise<HostedUser> {
    const authorization = request.headers.get('authorization') ?? '';
    if (!/^Bearer \S+$/.test(authorization) || authorization.length > 16_384) throw new HttpError(401, 'Sign in to continue.', 'unauthorized');
    let response: Response;
    try { response = await this.fetcher(`${this.url}/auth/v1/user`, { headers: { apikey: this.serviceKey, Authorization: authorization }, signal: AbortSignal.timeout(15_000) }); }
    catch { throw new HttpError(503, 'Sign-in verification is temporarily unavailable.'); }
    if (!response.ok) throw new HttpError(401, 'Your session expired. Sign in again.', 'unauthorized');
    const user = await response.json() as HostedUser;
    try { requireUuid(user.id); } catch { throw new HttpError(401, 'Invalid account session.', 'unauthorized'); }
    return { id: user.id, email: user.email };
  }
  async listProjects(userId: string): Promise<Project[]> {
    const rows = await this.rest<ProjectRow[]>('fleet_projects', { user_id: `eq.${requireUuid(userId)}`, order: 'updated_at.desc' });
    return rows.map(projectFromRow);
  }
  async getProject(userId: string, id: string): Promise<Project> {
    const rows = await this.rest<ProjectRow[]>('fleet_projects', { id: `eq.${requireUuid(id)}`, user_id: `eq.${requireUuid(userId)}`, limit: '1' });
    if (!rows[0]) throw new HttpError(404, 'Project not found.');
    return projectFromRow(rows[0]);
  }
  async getCatalog(userId: string): Promise<NorfolkCatalog> {
    const rows = await this.rest<{ catalog: NorfolkCatalog | null }[]>('fleet_accounts', { user_id: `eq.${requireUuid(userId)}`, select: 'catalog', limit: '1' });
    return rows[0]?.catalog ?? bundledNorfolkCatalog;
  }
  async saveCatalog(userId: string, catalog: NorfolkCatalog): Promise<void> {
    await this.rpc('fleet_save_catalog', { p_user: requireUuid(userId), p_catalog: catalog });
  }
  private async normalizedInput(userId: string, input: NewProject): Promise<NewProject & Pick<Project, 'sourceChallenge'>> {
    try {
      const normalized = normalizeProjectInput(input);
      const catalog = normalized.challengeId ? await this.getCatalog(userId) : undefined;
      return { ...normalized, sourceChallenge: normalized.challengeId ? getChallenge(normalized.challengeId, catalog?.challenges) : undefined };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, error instanceof Error ? error.message : 'Invalid challenge.');
    }
  }
  async createProject(userId: string, input: NewProject): Promise<Project> {
    const normalized = await this.normalizedInput(userId, input), now = new Date().toISOString();
    const project: Project = { ...normalized, id: randomUUID(), createdAt: now, updatedAt: now, status: 'draft', stages: structuredClone(stageDefinitions), logs: [], feedback: '' };
    const rows = await this.rest<ProjectRow[]>('fleet_projects', {}, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ id: project.id, user_id: requireUuid(userId), data: project }) });
    return projectFromRow(rows[0]);
  }
  async updateProject(userId: string, id: string, input: NewProject): Promise<Project> {
    const normalized = await this.normalizedInput(userId, input);
    const row = await this.rpc<ProjectRow>('fleet_update_project', { p_user: requireUuid(userId), p_project: requireUuid(id), p_input: normalized });
    return projectFromRow(row);
  }
  async getSettings(userId: string): Promise<AccountSettings> {
    const rows = await this.rest<AccountRow[]>('fleet_accounts', { user_id: `eq.${requireUuid(userId)}`, select: 'settings,encrypted_key,model_ids,last_checked_at', limit: '1' });
    const row = rows[0];
    return { settings: row?.settings ?? { ...defaultSettings }, connected: !!row?.encrypted_key, modelIds: row?.model_ids ?? [], lastCheckedAt: row?.last_checked_at };
  }
  async getCredential(userId: string): Promise<string | null> {
    const rows = await this.rest<Pick<AccountRow, 'encrypted_key'>[]>('fleet_accounts', { user_id: `eq.${requireUuid(userId)}`, select: 'encrypted_key', limit: '1' });
    return rows[0]?.encrypted_key ?? null;
  }
  async saveSettings(userId: string, settings: Settings, encryptedKey: string | null, modelIds: string[]): Promise<void> {
    await this.rpc('fleet_save_settings', { p_user: requireUuid(userId), p_settings: settings, p_key: encryptedKey, p_models: modelIds });
  }
  async claimRun(userId: string, projectId: string, mode: 'start' | 'resume', model: string): Promise<ClaimedRun> {
    const result = await this.rpc<{ run: RunRow; project: ProjectRow }>('fleet_claim_run', { p_user: requireUuid(userId), p_project: requireUuid(projectId), p_mode: mode, p_model: model });
    return { run: runFromRow(result.run), project: projectFromRow(result.project) };
  }
  /** Trusted workers only: HTTP handlers must use getOwnedRun. */
  async getRun(runId: string): Promise<HostedRun> {
    const rows = await this.rest<RunRow[]>('fleet_runs', { id: `eq.${requireUuid(runId)}`, limit: '1' });
    if (!rows[0]) throw new HttpError(404, 'Run not found.');
    return runFromRow(rows[0]);
  }
  async getOwnedRun(userId: string, projectId: string): Promise<HostedRun> {
    const project = await this.getProject(userId, projectId);
    if (!project.runId) throw new HttpError(404, 'This project has no saved build yet.');
    const run = await this.getRun(project.runId);
    if (run.userId !== userId || run.projectId !== projectId) throw new HttpError(404, 'Run not found.');
    return run;
  }
  async patchRun(runId: string, epoch: number, patch: RunPatch, projectPatch: Partial<Project> = {}): Promise<HostedRun | null> {
    const row = await this.rpc<RunRow | null>('fleet_patch_run', { p_run: requireUuid(runId), p_epoch: epoch, p_patch: patch, p_project_patch: projectPatch });
    return row ? runFromRow(row) : null;
  }
  async requestPause(userId: string, projectId: string): Promise<HostedRun> {
    return runFromRow(await this.rpc<RunRow>('fleet_pause_run', { p_user: requireUuid(userId), p_project: requireUuid(projectId) }));
  }
  async claimModelRequest(runId: string, epoch: number, maxRequests = 120): Promise<boolean> {
    return await this.rpc<boolean>('fleet_claim_model_request', { p_run: requireUuid(runId), p_epoch: epoch, p_max: Math.min(120, Math.max(1, Math.floor(maxRequests))) });
  }
  async saveManifest(runId: string, epoch: number, manifest: ArtifactManifest): Promise<HostedRun | null> {
    const run = await this.getRun(runId); assertManifest(run, manifest);
    return this.patchRun(runId, epoch, { manifest, artifactPrefix: manifest.prefix });
  }
  async putArtifacts(run: HostedRun, version: string, files: { path: string; content: Buffer }[]): Promise<ArtifactManifest> {
    const manifest: ArtifactManifest = { version, prefix: artifactPrefix(run, version), createdAt: new Date().toISOString(), sourceHash: hashSourceFiles(files),
      files: files.map(file => ({ path: file.path, size: file.content.length, sha256: createHash('sha256').update(file.content).digest('hex') })) };
    assertManifest(run, manifest);
    for (let offset = 0; offset < files.length; offset += 8) await Promise.all(files.slice(offset, offset + 8).map(async file => {
      await this.request(this.objectPath(manifest.prefix, file.path), { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' }, body: new Uint8Array(file.content) });
    }));
    return manifest;
  }
  private objectPath(prefix: string, path: string, read = false): string {
    return `/storage/v1/object/${read ? 'authenticated/' : ''}${this.bucket}/${[...prefix.split('/'), ...path.split('/')].map(encodeURIComponent).join('/')}`;
  }
  async getArtifact(run: HostedRun, path: string, manifest = run.manifest): Promise<Buffer> {
    validateArtifactPath(path);
    if (!manifest) throw new HttpError(404, 'No checkpoint artifacts are available yet.');
    assertManifest(run, manifest);
    const file = manifest.files.find(file => file.path === path);
    if (!file) throw new HttpError(404, 'Artifact not found.');
    const response = await this.request(this.objectPath(manifest.prefix, path, true));
    const content = Buffer.from(await response.arrayBuffer());
    if (content.length !== file.size || createHash('sha256').update(content).digest('hex') !== file.sha256) throw new HttpError(409, 'Artifact verification failed. Rebuild this project.');
    return content;
  }
  async readManifestFiles(run: HostedRun, manifest = run.manifest): Promise<{ path: string; content: Buffer }[]> {
    if (!manifest) throw new HttpError(404, 'No checkpoint artifacts are available yet.');
    assertManifest(run, manifest);
    const files: { path: string; content: Buffer }[] = [];
    for (let offset = 0; offset < manifest.files.length; offset += 8) files.push(...await Promise.all(manifest.files.slice(offset, offset + 8).map(async file => ({ path: file.path, content: await this.getArtifact(run, file.path, manifest) }))));
    if (hashSourceFiles(files) !== manifest.sourceHash) throw new HttpError(409, 'Source verification failed. Rebuild this project.');
    return files;
  }
  async approve(userId: string, projectId: string, feedback: string): Promise<Project> {
    const project = await this.getProject(userId, projectId), run = await this.getOwnedRun(userId, projectId);
    if (!run.manifest || !reportPassed(project.report, project.qualityVersion === 1) || project.report?.sourceHash !== run.manifest.sourceHash) throw new HttpError(409, 'The saved version needs passing verification before approval.');
    await this.readManifestFiles(run);
    return projectFromRow(await this.rpc<ProjectRow>('fleet_approve_project', { p_user: userId, p_project: projectId, p_run: run.id, p_hash: run.manifest.sourceHash, p_feedback: feedback.slice(0, 8000) }));
  }
  async markDelivered(userId: string, projectId: string, run: HostedRun): Promise<void> {
    if (!run.manifest) throw new HttpError(409, 'No verified artifact version.');
    await this.rpc('fleet_mark_delivered', { p_user: userId, p_project: projectId, p_run: run.id, p_hash: run.manifest.sourceHash });
  }
  async createShare(userId: string, projectId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.rpc('fleet_create_share', { p_user: requireUuid(userId), p_project: requireUuid(projectId), p_token_hash: createHash('sha256').update(token).digest('hex') });
    return token;
  }
  async getPublicShare(token: string): Promise<PublicShare> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(404, 'Shared application not found.');
    const result = await this.rpc<{ run: RunRow; manifest: ArtifactManifest; title: string } | null>('fleet_get_share', { p_token_hash: createHash('sha256').update(token).digest('hex') });
    if (!result) throw new HttpError(404, 'Shared application not found.');
    const run = runFromRow(result.run); assertManifest(run, result.manifest);
    return { run, manifest: result.manifest, title: result.title };
  }
}
let database: HostedDatabase | undefined;
export function db(): HostedDatabase {
  return database ??= new HostedDatabase(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '');
}
