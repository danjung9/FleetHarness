import { Readable } from 'node:stream';
import { ZipFile } from 'yazl';
import type { Bootstrap, NewProject, Settings } from '../shared/types.js';
import { refreshNorfolkCatalog } from '../harness/catalog.js';
import { db, type HostedDatabase, type HostedRun } from './data.js';
import { decryptKey, encryptKey, openAIModels, validateModelId, validateOpenAIKey } from './credentials.js';
import { errorResponse, HttpError, json, readJson, requireUuid } from './http.js';

export interface ApiHooks {
  startRun(userId: string, projectId: string, mode: 'start' | 'resume'): Promise<unknown>;
  pauseRun(userId: string, projectId: string): Promise<unknown>;
  previewUrl?(run: HostedRun): Promise<string>;
  shareUrl?(token: string): string;
}

export async function bootstrap(database: HostedDatabase, userId: string): Promise<Bootstrap> {
  const [projects, account, norfolkCatalog] = await Promise.all([database.listProjects(userId), database.getSettings(userId), database.getCatalog(userId)]);
  return {
    state: { version: 1, projects, settings: account.settings, norfolkCatalog },
    models: openAIModels(account.connected, account.connected ? account.modelIds : undefined),
    storagePath: 'Private account workspace',
    credentialStatus: account.connected ? 'OpenAI key connected — encrypted for this account' : 'Connect an OpenAI API key in Settings',
    runtime: 'Hosted · Vercel Sandbox',
  };
}

function safePreviewUrl(value: string, request: Request): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new HttpError(502, 'The preview URL is unavailable.'); }
  if (url.protocol !== 'https:' || url.origin === new URL(request.url).origin || url.username || url.password) {
    throw new HttpError(502, 'A separate secure preview origin is required.');
  }
  return url.href;
}

/** The Nitro route supplies orchestration hooks; tests supply a fake database. */
export async function handleApi(request: Request, hooks: ApiHooks, database: HostedDatabase = db()): Promise<Response> {
  try {
    const url = new URL(request.url), pathname = url.pathname.replace(/\/$/, ''), method = request.method;
    const publicShare = pathname.match(/^\/api\/share\/([A-Za-z0-9_-]{43})$/);
    if (publicShare && method === 'GET') {
      if (!hooks.previewUrl) throw new HttpError(503, 'Previews are not configured.');
      const share = await database.getPublicShare(publicShare[1]);
      const target = safePreviewUrl(await hooks.previewUrl({ ...share.run, manifest: share.manifest }), request);
      return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
    }
    const user = await database.authenticate(request);
    if ((pathname === '/api/bootstrap' || pathname === '/api/settings') && method === 'GET') return json(await bootstrap(database, user.id));
    if (pathname === '/api/settings' && method === 'POST') {
      const body = await readJson<{ settings?: Settings; apiKey?: string }>(request);
      const incoming = body.settings;
      if (!incoming || incoming.provider !== 'openai' || (incoming.backend && incoming.backend !== 'pi')) throw new HttpError(400, 'Hosted builds use OpenAI through Pi.');
      const settings: Settings = { backend: 'pi', provider: 'openai', model: validateModelId(incoming.model), rememberKey: true };
      const [savedKey, projects] = await Promise.all([database.getCredential(user.id), database.listProjects(user.id)]);
      if (projects.some(project => project.status === 'running' || project.status === 'pausing')) throw new HttpError(409, 'Pause the active build before changing its credentials or model.');
      if (body.apiKey !== undefined && typeof body.apiKey !== 'string') throw new HttpError(400, 'Enter a valid OpenAI API key.');
      const key = body.apiKey ?? (savedKey ? decryptKey(user.id, savedKey) : undefined);
      if (!key) throw new HttpError(400, 'Enter an OpenAI API key to connect this account.');
      const modelIds = await validateOpenAIKey(key, settings.model);
      await database.saveSettings(user.id, settings, body.apiKey !== undefined ? encryptKey(user.id, key) : savedKey!, modelIds);
      return json(await bootstrap(database, user.id));
    }
    if (pathname === '/api/settings/key' && method === 'DELETE') {
      const account = await database.getSettings(user.id);
      await database.saveSettings(user.id, account.settings, null, []);
      return json(await bootstrap(database, user.id));
    }
    if (pathname === '/api/catalog/refresh' && method === 'POST') {
      let catalog;
      try { catalog = await refreshNorfolkCatalog(); }
      catch { throw new HttpError(502, 'The Norfolk catalog could not be refreshed. Your saved catalog is still available.'); }
      await database.saveCatalog(user.id, catalog); return json(catalog);
    }
    if (pathname === '/api/projects' && method === 'POST') return json(await database.createProject(user.id, await readJson<NewProject>(request, 300_000)), 201);
    const route = pathname.match(/^\/api\/projects\/([^/]+)(?:\/(start|resume|pause|approve|artifacts|artifact|preview|export|share))?$/);
    if (!route) throw new HttpError(404, 'API route not found.');
    const projectId = requireUuid(route[1], 'project ID'), action = route[2];
    if (!action && method === 'PATCH') return json(await database.updateProject(user.id, projectId, await readJson<NewProject>(request, 300_000)));
    if (action && ['start', 'resume', 'pause'].includes(action) && method === 'POST') {
      // Check ownership at the HTTP boundary as well as in atomic run transitions.
      await database.getProject(user.id, projectId);
      if (action === 'pause') await hooks.pauseRun(user.id, projectId);
      else await hooks.startRun(user.id, projectId, action as 'start' | 'resume');
      return json({ ok: true });
    }
    if (action === 'approve' && method === 'POST') {
      const body = await readJson<{ feedback?: string }>(request);
      if (body.feedback !== undefined && (typeof body.feedback !== 'string' || body.feedback.length > 8000)) throw new HttpError(400, 'Keep feedback to 8,000 characters or fewer.');
      return json(await database.approve(user.id, projectId, body.feedback ?? ''));
    }
    if (action === 'share' && method === 'POST') {
      if (!hooks.shareUrl) throw new HttpError(503, 'Sharing is not configured.');
      const token = await database.createShare(user.id, projectId);
      return json({ url: hooks.shareUrl(token) });
    }
    if (method !== 'GET') throw new HttpError(405, 'Method not allowed.');
    if (action === 'artifacts' || action === 'preview') {
      const project = await database.getProject(user.id, projectId);
      if (!project.runId) return json(action === 'artifacts' ? [] : { url: null });
    }
    const run = await database.getOwnedRun(user.id, projectId);
    if (action === 'artifacts') return json(run.manifest?.files.map(({ path, size }) => ({ path, size })) ?? []);
    if (action === 'artifact') return json((await database.getArtifact(run, url.searchParams.get('path') ?? '')).toString('utf8'));
    if (action === 'preview') {
      if (!run.manifest?.files.some(file => file.path === 'index.html')) return json({ url: null });
      if (!hooks.previewUrl) throw new HttpError(503, 'Previews are not configured.');
      return json({ url: safePreviewUrl(await hooks.previewUrl(run), request) });
    }
    if (action === 'export') {
      const project = await database.getProject(user.id, projectId);
      if (!['approved', 'delivered'].includes(run.status) || !project.approvedAt) throw new HttpError(403, 'Approve the verified build before downloading the source and evidence.');
      const files = await database.readManifestFiles(run);
      await database.markDelivered(user.id, projectId, run);
      const zip = new ZipFile();
      for (const file of files) {
        if (file.path !== 'review.json' && file.path !== 'test-report.json') zip.addBuffer(file.content, file.path);
      }
      // Evidence in the export comes from trusted server verification and approval.
      zip.addBuffer(Buffer.from(JSON.stringify(project.report, null, 2)), 'test-report.json');
      zip.addBuffer(Buffer.from(JSON.stringify({ approvedAt: project.approvedAt, sourceHash: run.manifest!.sourceHash, feedback: project.feedback, runId: run.id }, null, 2)), 'review.json');
      zip.end();
      return new Response(Readable.toWeb(zip.outputStream) as ReadableStream<Uint8Array>, { headers: {
        'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="appyard-${projectId}.zip"`,
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      } });
    }
    throw new HttpError(404, 'API route not found.');
  } catch (error) { return errorResponse(error); }
}
