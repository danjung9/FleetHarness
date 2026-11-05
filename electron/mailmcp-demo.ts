import { existsSync, readFileSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { AppState, Project } from '../shared/types.js';
import { sourceHash } from './storage.js';
import { reportHash } from './delivery.js';
import { runProcessEnvironment } from './process-sweep.js';

export interface MailMcpDemoBundle {
  root: string;
  schemaVersion: 1;
  projectId: string;
  label: string;
  repository: string;
  commit: string;
  python: string;
  entry: string;
}

function bundleFile(root: string, relative: string) {
  const target = path.resolve(root, relative);
  if (!relative || path.isAbsolute(relative) || !target.startsWith(path.resolve(root) + path.sep)) throw new Error('Invalid demo resource path.');
  return target;
}

/** Only the separate demo package contains this resource. Ordinary installs stay unchanged. */
export function readMailMcpDemoBundle(root: string | undefined): MailMcpDemoBundle | undefined {
  if (!root || !existsSync(path.join(root, 'manifest.json'))) return undefined;
  const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.projectId !== 'mailmcp-demo'
    || typeof manifest.label !== 'string' || !/^[a-f0-9]{40}$/.test(manifest.commit)
    || manifest.repository !== 'https://github.com/shourovsahaaa/mailmcp'
    || typeof manifest.python !== 'string' || typeof manifest.entry !== 'string') throw new Error('Unsupported MailMCP demo bundle.');
  bundleFile(root, manifest.python); bundleFile(root, manifest.entry);
  return { ...manifest, root: path.resolve(root) };
}

/** Seed exactly once, in a dedicated profile; saved demo changes survive upgrades and restarts. */
export async function seedMailMcpDemo(root: string, bundle: MailMcpDemoBundle) {
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  try { await fs.access(path.join(root, 'state.json')); return false; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const project = JSON.parse(await fs.readFile(path.join(bundle.root, 'seed-project.json'), 'utf8')) as Project;
  if (project.id !== bundle.projectId || !project.runId || !/^[a-zA-Z0-9-]{1,100}$/.test(project.runId)) throw new Error('Invalid demo project.');
  const workspace = path.join(root, 'workspaces', project.id, project.runId);
  await fs.mkdir(path.dirname(workspace), { recursive: true });
  // A unique staging directory makes interrupted first launches safe to retry.
  const staging = workspace + '-' + randomUUID();
  try {
    await fs.cp(path.join(bundle.root, 'workspace'), staging, { recursive: true, errorOnExist: true });
    await fs.rm(workspace, { recursive: true, force: true });
    await fs.rename(staging, workspace);
  } finally { await fs.rm(staging, { recursive: true, force: true }); }
  project.workspace = workspace;
  project.processScope = { runId: project.runId, marker: randomUUID(), cleanup: 'confirmed' };
  if (project.report) {
    project.report.sourceHash = await sourceHash(workspace);
    project.verification = { runId: project.runId, reportHash: reportHash(project.report) };
    await fs.writeFile(path.join(workspace, 'test-report.json'), JSON.stringify(project.report, null, 2));
  }
  const state: AppState = { version: 1, projects: [project], settings: { provider: '', model: '', rememberKey: false, developerMode: false } };
  await fs.writeFile(path.join(root, 'state.json'), JSON.stringify(state, null, 2), { flag: 'wx', mode: 0o600 });
  return true;
}

async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (!address || typeof address === 'string') throw new Error('Could not allocate a demo preview port.');
  return address.port;
}

/** Runs the upstream app with its memory-only sample inbox and bundled Python. */
export class MailMcpDemoPreview {
  private child?: ChildProcess;
  private closed?: Promise<void>;
  constructor(private bundle: MailMcpDemoBundle) {}
  async url(workspace: string, signal: AbortSignal) {
    signal.throwIfAborted();
    await this.stop();
    const port = await freePort();
    signal.throwIfAborted();
    const python = bundleFile(this.bundle.root, this.bundle.python);
    const child = spawn(python, [bundleFile(this.bundle.root, this.bundle.entry)], {
      cwd: workspace,
      env: runProcessEnvironment({
        PATH: '/usr/bin:/bin', HOME: workspace, TMPDIR: process.env.TMPDIR,
        PYTHONDONTWRITEBYTECODE: '1', PYTHONNOUSERSITE: '1', PYTHONUNBUFFERED: '1',
        SOURCE_ROOT: path.join(workspace, 'source'), PORT: String(port),
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.child = child;
    let output = '', failure: Error | undefined;
    const capture = (chunk: Buffer) => { output = (output + chunk.toString()).slice(-8000); };
    child.stdout?.on('data', capture); child.stderr?.on('data', capture);
    child.on('error', error => { failure = error; });
    this.closed = new Promise(resolve => child.once('close', () => resolve()));
    const stop = () => { child.kill('SIGTERM'); };
    signal.addEventListener('abort', stop, { once: true });
    try {
      const url = `http://127.0.0.1:${port}/`;
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        signal.throwIfAborted();
        if (failure || child.exitCode !== null || child.signalCode !== null) throw new Error('MailMCP preview could not start. ' + (failure?.message ?? output));
        try {
          const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]), redirect: 'error' });
          await response.body?.cancel();
          if (response.ok) return url;
        } catch { signal.throwIfAborted(); }
        await delay(100, undefined, { signal });
      }
      throw new Error('MailMCP preview timed out. ' + output);
    } catch (error) { await this.stop(); throw error; }
    finally { signal.removeEventListener('abort', stop); }
  }
  async stop() {
    const child = this.child, closed = this.closed;
    if (!child) return;
    this.child = undefined; this.closed = undefined;
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill('SIGTERM');
    const exited = await Promise.race([closed!.then(() => true), delay(3000).then(() => false)]);
    if (!exited) { child.kill('SIGKILL'); await closed; }
  }
}
