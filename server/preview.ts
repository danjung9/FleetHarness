import { Sandbox } from '@vercel/sandbox';
import { assertManifest, db, type HostedDatabase, type HostedRun, type ArtifactManifest } from './data.js';
import { HttpError } from './http.js';

const internalEvidence = new Set(['test-report.json', 'review.json', 'acceptance-plan.json', 'ux-spec.json', 'package.json', 'package-lock.json']);
export function isPreviewAsset(path: string): boolean {
  return !path.split('/').some(part => part.startsWith('.')) && !internalEvidence.has(path)
    && /\.(?:html|m?js|css|json|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf|csv|txt)$/i.test(path);
}

/** Fixed server code, never generated code. Paths are an exact immutable allowlist. */
export function staticPreviewServer(paths: string[], identity: string, root = '/vercel/sandbox/public', port = 3000): string {
  return `import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=${JSON.stringify(root)}, allowed=new Set(${JSON.stringify(paths)}), identity=${JSON.stringify(identity)};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.txt':'text/plain; charset=utf-8','.csv':'text/csv; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; worker-src 'none'");
 res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer'); res.setHeader('Cache-Control','no-store'); res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 try {
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://preview').pathname);
  if(pathname==='/__fleet_health'){res.setHeader('Content-Type','text/plain');res.end(req.method==='HEAD'?undefined:identity);return;}
  const relative=pathname==='/'?'index.html':pathname.slice(1);
  if(!allowed.has(relative))throw Error();
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||(await fs.realpath(file))!==file)throw Error();
  const stat=await fs.stat(file);if(!stat.isFile()||stat.size>10485760)throw Error();
  const bytes=await fs.readFile(file);res.setHeader('Content-Type',types[path.extname(file).toLowerCase()]||'application/octet-stream');res.setHeader('Content-Length',bytes.length);res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(${port},'0.0.0.0',()=>console.log(JSON.stringify({port:server.address().port})));
`;
}

const healthCheck = `const expected=process.argv[1];for(let attempt=0;attempt<100;attempt++){try{const r=await fetch('http://127.0.0.1:3000/__fleet_health',{signal:AbortSignal.timeout(500)});if(r.ok&&await r.text()===expected)process.exit(0);}catch{}await new Promise(resolve=>setTimeout(resolve,100));}process.exit(1);`;
interface PreviewDependencies { database: Pick<HostedDatabase, 'readManifestFiles'>; sandboxes: Pick<typeof Sandbox, 'getOrCreate' | 'get'> }
const preparing = new Map<string, Promise<string>>();

export async function previewUrl(run: HostedRun, manifest: ArtifactManifest | undefined = run.manifest, dependencies?: PreviewDependencies): Promise<string> {
  if (!manifest || !manifest.files.some(file => file.path === 'index.html')) throw new HttpError(409, 'This build does not have an app preview yet.');
  assertManifest(run, manifest);
  const key = `${run.userId}/${run.id}/${manifest.version}/${manifest.sourceHash}`;
  const existing = preparing.get(key);
  if (existing) return existing;
  const pending = prepare(run, manifest, dependencies ?? { database: db(), sandboxes: Sandbox });
  preparing.set(key, pending);
  try { return await pending; } finally { preparing.delete(key); }
}

async function prepare(run: HostedRun, manifest: ArtifactManifest, { database, sandboxes }: PreviewDependencies): Promise<string> {
  const identity = `${manifest.version}:${manifest.sourceHash}`;
  const install = async (sandbox: Sandbox) => {
    const files = (await database.readManifestFiles(run, manifest)).filter(file => isPreviewAsset(file.path));
    await sandbox.writeFiles([{ path: '/vercel/sandbox/serve.mjs', content: staticPreviewServer(files.map(file => file.path), identity) },
      ...files.map(file => ({ path: `/vercel/sandbox/public/${file.path}`, content: file.content }))]);
    // The VM may be retrieved while its creator is initializing. Only one server
    // may own the process lock, including during a retried initialization.
    await sandbox.runCommand({ cmd: 'flock', args: ['-n', '/vercel/sandbox/preview.lock', 'node', '/vercel/sandbox/serve.mjs'], detached: true });
  };
  const name = `preview-${manifest.version}`;
  let sandbox: Sandbox;
  try {
    sandbox = await sandboxes.getOrCreate({ name, ports: [3000], timeout: 30 * 60_000, persistent: false,
      networkPolicy: 'deny-all', resume: true, onCreate: install, onResume: install });
  } catch (error) {
    // SDK getOrCreate is get-then-create: another request may win the creation.
    if ((error as { response?: { status?: number } }).response?.status !== 409) throw error;
    sandbox = await sandboxes.get({ name, resume: true, onResume: install });
  }
  const ready = () => sandbox.runCommand({ cmd: 'node', args: ['--input-type=module', '-e', healthCheck, identity], timeoutMs: 15_000 });
  if ((await ready()).exitCode !== 0) {
    await install(sandbox);
    if ((await ready()).exitCode !== 0) throw new HttpError(503, 'The preview is still starting. Please try again.');
  }
  return sandbox.domain(3000);
}
