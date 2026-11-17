import { createServer, request as httpRequest, type ServerResponse } from 'node:http';
import { createHash, timingSafeEqual, randomBytes, randomUUID, createCipheriv, createDecipheriv } from 'node:crypto';
import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { ZipFile } from 'yazl';
import { Store, newProject, validateInput, listArtifacts, safeFile } from './storage.js';
import { AppBuilder } from './app-builder.js';
import { GenAiMil, GENAI_MIL_PROVIDER } from './genai-mil.js';
import { ProjectLead, briefHash, projectBrief } from './conversation.js';
import { ClarificationBroker } from './clarifications.js';
import { ApplicationPreviews } from './solution-preview.js';
import { recordReview } from './review.js';
import { verifiedManifest, deliveryEvidence } from './delivery.js';
import { exportVerifiedBundle } from './source-export.js';
import { registerCredential, redactValue, redactSecrets } from './secrets.js';
import { atomicHostWrite } from '../shared/host-files.js';
import { defaultLearningSettings } from '../shared/learning.js';
import type { NewProject, Settings, Bootstrap } from '../shared/types.js';

export interface WorkerOptions { root: string; token: string; encryptionKey: string; origins: string[]; previewDomain: string; previewScheme?: 'http' | 'https'; host?: string; port?: number; previewPort?: number; resourcesRoot?: string }
const digest = (value: string) => createHash('sha256').update(value).digest();
export async function startWorker(options: WorkerOptions) {
  if (options.token.length < 32 || !/^[a-fA-F0-9]{64}$/.test(options.encryptionKey)) throw new Error('Set a workspace token of at least 32 characters and a 64-character hex encryption key.');
  if (!options.origins.length || options.origins.some(origin => new URL(origin).origin !== origin)) throw new Error('Set exact frontend origins. Wildcards and trailing paths are not allowed.');
  if (!/^[a-z0-9.-]+(?::\d+)?$/i.test(options.previewDomain)) throw new Error('Set a preview domain (for example preview.example.com).');
  registerCredential(options.token); registerCredential(options.encryptionKey);
  const root = path.resolve(options.root), resources = options.resourcesRoot ?? process.cwd();
  const clients = new Set<ServerResponse>();
  const store = new Store(root);
  const notify = () => { const message = `data: ${JSON.stringify(redactValue(store.state))}\n\n`; for (const client of clients) { if (!client.write(message)) { client.end(); clients.delete(client); } } };
  await store.init();
  if (!store.state.settings.backend) { store.state.settings = { backend: 'opencode', provider: '', model: '', rememberKey: false }; await store.save(); }
  const clarifications = new ClarificationBroker(store, notify);
  let genAiMil: GenAiMil;
  const backend = new AppBuilder(store, process.execPath, notify, resources, { clarifications, genAiMil: () => genAiMil });
  await backend.init(); await backend.opencode.refresh();
  const secret = Buffer.from(options.encryptionKey,'hex');
  genAiMil = new GenAiMil(root, {
    isEncryptionAvailable: () => true,
    encryptString: value => { const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', secret, iv);
      const body = Buffer.concat([cipher.update(value), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), body]); },
    decryptString: bytes => { const decipher = createDecipheriv('aes-256-gcm', secret, bytes.subarray(0,12));
      decipher.setAuthTag(bytes.subarray(12,28)); return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString(); }
  }, backend.runtime);
  await genAiMil.load();
  const credentialFile = path.join(root,'worker-credentials.enc');
  try {
    const bytes = await fs.readFile(credentialFile), decipher = createDecipheriv('aes-256-gcm',secret,bytes.subarray(0,12));
    decipher.setAuthTag(bytes.subarray(12,28));
    const saved = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString());
    registerCredential(saved.key); await backend.opencode.setKey(saved.provider,saved.key);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Saved worker credentials could not be decrypted. Restore the original encryption key.'); }
  const lead = new ProjectLead(store,backend.runtime,notify,{ opencode: backend.opencode });
  const previews = new ApplicationPreviews(process.execPath);
  const targets = new Map<string,{ workspace: string; url: string }>();
  const downloads = new Map<string,{ file: string; expires: number }>();
  const locks = new Set<string>();
  let closing = false;
  const bootstrap = (): Bootstrap => ({ state: redactValue(store.state), models: backend.opencode.models, storagePath: root,
    credentialStatus: backend.opencode.error || 'AppYard worker connected', runtime: 'AppYard build worker',
    genAiMil: genAiMil.view(), capabilities: { projectConversation: true, experiments: false, planningContinuation: false } });
  const requireNoWork = () => { if (backend.active.size || lead.active.size) throw new Error('Stop active work before changing the model connection.'); };
  const idle = (id: string) => { const project = store.project(id); if (backend.active.has(id) || lead.active.has(id)) throw new Error('Wait for active work to finish or stop it first.'); return project; };
  const stopPreview = async (id: string) => { const project = store.project(id); if (project.workspace) await previews.stop(project.workspace); for (const [token,target] of targets) if (target.workspace === project.workspace) targets.delete(token); };
  const updateProject = async (id: string, input: NewProject) => {
    const project = idle(id); await stopPreview(id);
    Object.assign(project,validateInput(input),{ status: 'draft', resumeStage: undefined, report: undefined, visualReview: undefined, approvedAt: undefined, approval: undefined,
      exportedTo: undefined, executable: undefined, error: undefined, verification: undefined, runCheckpoint: undefined, systemDesign: undefined, phasePlan: undefined, globalTools: undefined, runtimeProfile: undefined });
    project.stages.forEach(stage => { stage.status = stage.id === 'intake' ? 'complete' : 'queued'; });
    project.updatedAt = new Date().toISOString(); await store.save(); notify(); return project;
  };
  const start = async (id: string, resume = false, feedback?: string) => {
    idle(id); if (backend.active.size >= 3) throw new Error('Three builds are already running. Wait for one to finish.'); await stopPreview(id);
    if (feedback !== undefined) await backend.requestChanges(id,feedback); else if (resume) await backend.resume(id); else await backend.start(id);
  };
  const methods = {
    bootstrap,
    saveGenAiMil: async (address: unknown, key?: unknown) => { requireNoWork(); await genAiMil.save(address, key); return bootstrap(); },
    connectGenAiMil: async () => { requireNoWork(); await genAiMil.connect(); return bootstrap(); },
    clearGenAiMil: async () => { requireNoWork(); await genAiMil.clear(); return bootstrap(); },
    createProject: async (input: NewProject) => { const project = newProject(input); store.state.projects.unshift(project); await store.save(); notify(); return project; },
    updateProject,
    startRun: (id: string) => start(id), resumeRun: (id: string) => start(id,true),
    stopRun: async (id: string) => { await backend.stop(id); await lead.cancel(id); await stopPreview(id); },
    artifacts: (id: string) => { const project = store.project(id); return project.workspace ? listArtifacts(project.workspace) : []; },
    readArtifact: async (id: string,file: string) => { const project = store.project(id); if (!project.workspace) throw new Error('Build the app first.'); const target = await safeFile(project.workspace,file); if ((await fs.stat(target)).size > 2_000_000) throw new Error('File is too large to display.'); return redactSecrets(await fs.readFile(target,'utf8')); },
    preview: async (id: string) => {
      const project = store.project(id); if (!project.workspace) return null;
      const url = await previews.url(project.workspace); if (!url) return null;
      let token = [...targets].find(([,target]) => target.workspace === project.workspace && target.url === url)?.[0];
      if (!token) { token = randomBytes(24).toString('hex'); targets.set(token,{ workspace: project.workspace,url }); }
      const source = new URL(url);
      return `${options.previewScheme ?? 'https'}://${token}.${options.previewDomain}${source.pathname}${source.search}`;
    },
    sendMessage: (id: string,text: string) => lead.send(id,text), cancelMessage: (id: string) => lead.cancel(id),
    answerClarification: (id: string,question: string,answer: string) => clarifications.answer(id,question,answer),
    dismissConversationAction: async (id: string,actionId: string) => { const action = store.project(id).conversation?.actions.find(action => action.id === actionId); if (!action || action.status !== 'proposed') throw new Error('That proposal is no longer available.'); action.status = 'dismissed'; await store.save(); notify(); },
    applyConversationAction: async (id: string,actionId: string) => {
      const project = store.project(id), action = project.conversation?.actions.find(action => action.id === actionId);
      if (!action || action.status !== 'proposed' || action.runId !== project.runId || action.baseBriefHash !== briefHash(project)) throw new Error('That proposal is stale. Ask for an updated proposal.');
      await lead.cancel(id);
      if (action.type === 'stop') await backend.stop(id);
      else if (action.type === 'start') await start(id);
      else if (action.type === 'request_changes') await start(id,false,action.feedback);
      else if (action.type === 'revise' && action.brief) { await updateProject(id,{ ...projectBrief(project),...action.brief }); await start(id); }
      else throw new Error('Unsupported project proposal.');
      action.status = 'applied'; await store.save(); notify();
    },
    setDeveloperMode: async (enabled: boolean) => { if (typeof enabled !== 'boolean') throw new Error('Choose on or off.'); store.state.settings.developerMode = enabled; await store.save(); notify(); return bootstrap(); },
    saveSettings: async (settings: Settings,key?: string) => {
      if (backend.active.size || lead.active.size) throw new Error('Stop active work before changing the model.');
      if (settings.provider === GENAI_MIL_PROVIDER) {
        if (settings.backend !== 'opencode' || key) throw new Error('Use the GenAI.mil connection options to save your key.');
        genAiMil.assertModel(settings.backend, settings.model);
        store.state.settings = { backend: 'opencode', provider: GENAI_MIL_PROVIDER, model: settings.model, rememberKey: true, developerMode: store.state.settings.developerMode };
        await store.save(); notify(); return bootstrap();
      }
      if (settings.backend !== 'opencode' || !backend.opencode.models.some(model => model.id === settings.model && model.provider === settings.provider)) throw new Error('Choose an AppYard provider and model.');
      if (key !== undefined && (typeof key !== 'string' || key.length > 20000)) throw new Error('Invalid API key.');
      if (key?.trim()) { registerCredential(key.trim()); await backend.opencode.setKey(settings.provider,key.trim());
        if (settings.rememberKey) { const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm',secret,iv); const encrypted = Buffer.concat([cipher.update(JSON.stringify({ provider: settings.provider,key: key.trim() })),cipher.final()]); await atomicHostWrite(root,'worker-credentials.enc',Buffer.concat([iv,cipher.getAuthTag(),encrypted])); } }
      if (!backend.opencode.models.some(model => model.id === settings.model && model.provider === settings.provider && model.configured)) throw new Error('Connect the provider with an API key first.');
      if (!settings.rememberKey) await fs.rm(credentialFile,{ force: true });
      store.state.settings = { backend: 'opencode', provider: settings.provider, model: settings.model, rememberKey: settings.rememberKey === true, developerMode: store.state.settings.developerMode };
      await store.save(); notify(); return bootstrap();
    },
    approve: async (id: string,feedback: string,acceptGaps = false) => { const project = idle(id); await stopPreview(id); await recordReview(store,project,'approved',feedback,acceptGaps); notify(); },
    requestChanges: (id: string,feedback: string) => start(id,false,feedback),
    exportProject: async (id: string) => {
      const project = idle(id); await stopPreview(id); await verifiedManifest(project,true);
      const parent = path.join(root,'exports'); await fs.mkdir(parent,{ recursive: true });
      const bundle = await exportVerifiedBundle({ workspace: project.workspace!,parent,title: project.title,verifiedHash: project.report!.sourceHash,
        deliveryMarkdown: '# '+project.title+'\n\nFollow README.md to install, test and run the delivered application.\n', evidence: deliveryEvidence(project) });
      const token = randomUUID(), file = path.join(parent,token+'.zip'), zip = new ZipFile();
      for (const artifact of await listArtifacts(bundle)) zip.addFile(await safeFile(bundle,artifact.path),artifact.path);
      const completed = pipeline(zip.outputStream,createWriteStream(file)); zip.end(); await completed;
      downloads.set(token,{ file,expires: Date.now()+300_000 }); return '/api/download/'+token;
    },
    experimentState: () => ({ experiments: [], settings: defaultLearningSettings, availability: { available: false,reason: 'Candidate comparisons are available in the desktop app.' } })
  };
  const json = (response: ServerResponse,status: number,value: unknown) => { response.writeHead(status,{ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(value)); };
  const api = createServer(async (request,response) => {
    const origin = request.headers.origin;
    if (origin && !options.origins.includes(origin)) { json(response,403,{ error: 'Frontend origin is not allowed.' }); return; }
    if (origin) { response.setHeader('Access-Control-Allow-Origin',origin); response.setHeader('Vary','Origin'); }
    response.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type'); response.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
    if (request.url === '/health' && request.method === 'GET') { json(response,200,{ status: 'ok' }); return; }
    if (!timingSafeEqual(digest(request.headers.authorization ?? ''),digest('Bearer '+options.token))) { json(response,401,{ error: 'Invalid workspace access token.' }); return; }
    if (closing) { json(response,503,{ error: 'Worker is shutting down.' }); return; }
    if (request.url === '/api/events' && request.method === 'GET') {
      response.writeHead(200,{ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',Connection: 'keep-alive','X-Accel-Buffering': 'no' });
      response.write(`data: ${JSON.stringify(redactValue(store.state))}\n\n`); clients.add(response);
      const heartbeat = setInterval(() => response.write(': heartbeat\n\n'),15000);
      response.on('close',() => { clearInterval(heartbeat); clients.delete(response); }); return;
    }
    const download = request.url?.match(/^\/api\/download\/([a-f0-9-]+)$/);
    if (download && request.method === 'GET') { const item = downloads.get(download[1]); if (!item || item.expires < Date.now()) { json(response,404,{ error: 'Download expired.' }); return; } response.writeHead(200,{ 'Content-Type': 'application/zip','Content-Disposition': 'attachment; filename="appyard-source.zip"','Cache-Control':'no-store' }); createReadStream(item.file).pipe(response); return; }
    if (request.url !== '/api/rpc' || request.method !== 'POST') { json(response,404,{ error: 'Not found.' }); return; }
    let lock: string | undefined, acquired = false;
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > 2_000_000) { json(response,413,{ error: 'Request is too large.' }); return; } chunks.push(chunk); }
      const body = JSON.parse(Buffer.concat(chunks).toString()) as { method: string; args: unknown[] };
      if (!body || typeof body.method !== 'string' || !Object.hasOwn(methods,body.method) || !Array.isArray(body.args)) { json(response,400,{ error: 'This action is not supported by the build worker.' }); return; }
      const reads = ['bootstrap','artifacts','readArtifact','preview','experimentState','sendMessage','cancelMessage','answerClarification'];
      if (!reads.includes(body.method)) {
        lock = body.method === 'saveSettings' || body.method === 'setDeveloperMode' ? ':settings' : String(body.args[0]);
        if (locks.has(lock) || locks.has(':settings') || (lock === ':settings' && locks.size)) throw new Error('Another workspace action is in progress. Retry when it finishes.');
        locks.add(lock); acquired = true;
      }
      const method = methods[body.method as keyof typeof methods] as (...args: unknown[]) => unknown;
      const result = await method(...body.args); json(response,200,{ result: redactValue(result ?? null) });
    } catch (error) { json(response,400,{ error: redactSecrets(error instanceof Error ? error.message : 'The worker action failed.') }); }
    finally { if (lock && acquired) locks.delete(lock); }
  });
  const preview = createServer((incoming,outgoing) => {
    const host = incoming.headers.host?.toLowerCase() ?? '', suffix = '.'+options.previewDomain.toLowerCase();
    const token = host.endsWith(suffix) ? host.slice(0,-suffix.length) : '';
    const target = targets.get(token);
    if (!target) { outgoing.writeHead(404).end('This preview is closed. Reopen it from AppYard.'); return; }
    const upstream = new URL(incoming.url ?? '/',target.url);
    // Absolute-form requests must never turn this endpoint into an open proxy.
    if (upstream.origin !== new URL(target.url).origin) { outgoing.writeHead(403).end(); return; }
    const headers = { ...incoming.headers,host: upstream.host }; delete headers.authorization;
    const request = httpRequest(upstream,{ method: incoming.method,headers },response => { outgoing.writeHead(response.statusCode ?? 502,{ ...response.headers,'Referrer-Policy':'no-referrer','Cache-Control':'no-store' }); response.pipe(outgoing); });
    request.on('error',() => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end('Preview is restarting. Refresh shortly.'); });
    incoming.on('aborted',() => request.destroy()); incoming.pipe(request);
  });
  const listen = (server: ReturnType<typeof createServer>,port: number) => new Promise<void>((resolve,reject) => { server.once('error',reject); server.listen(port,options.host ?? '0.0.0.0',resolve); });
  try { await listen(api,options.port ?? 3000); await listen(preview,options.previewPort ?? 3001); }
  catch (error) { api.close(); preview.close(); await backend.stopAll(); await lead.stopAll(); await previews.close(); throw error; }
  return { store,backend,api,preview,
    async close() { closing = true; for (const client of clients) client.end(); clients.clear(); api.closeAllConnections(); preview.closeAllConnections(); await Promise.all([new Promise<void>(resolve => api.close(() => resolve())),new Promise<void>(resolve => preview.close(() => resolve())),backend.stopAll(),lead.stopAll(),previews.close()]); await store.save(); }
  };
}
