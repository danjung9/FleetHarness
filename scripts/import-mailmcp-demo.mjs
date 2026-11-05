import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { reportHash } from '../dist-electron/electron/delivery.js';
import { readMailMcpDemoBundle } from '../dist-electron/electron/mailmcp-demo.js';

const projectId = 'mailmcp-demo';

async function exists(file) {
  try { await fs.lstat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function closedProfile(root) {
  const lock = path.join(root, 'SingletonLock');
  if (!await exists(lock)) return;
  let owner;
  try { owner = await fs.readlink(lock); }
  catch { throw new Error(`Quit AppYard before importing; its profile lock is present at ${lock}.`); }
  const pid = Number(owner.match(/-(\d+)$/)?.[1]);
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error(`Cannot identify the app holding ${lock}. Quit it before importing.`);
  try { process.kill(pid, 0); }
  catch (error) { if (error.code === 'ESRCH') return; }
  throw new Error(`Quit AppYard and AppYard Demo before importing; process ${pid} still holds ${root}.`);
}

async function directory(root, relative) {
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    await fs.mkdir(current, { mode: 0o700 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    const info = await fs.lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`Import destination must be an ordinary directory: ${current}`);
  }
  return current;
}

async function readState(file) {
  const bytes = await fs.readFile(file);
  const state = JSON.parse(bytes.toString('utf8'));
  if (state.version !== 1 || !Array.isArray(state.projects) || !state.settings || typeof state.settings !== 'object') {
    throw new Error(`Unsupported AppYard state: ${file}`);
  }
  return { bytes, state };
}

async function readyBundle(root) {
  const bundle = readMailMcpDemoBundle(root);
  if (!bundle) throw new Error(`MailMCP bundle manifest is missing: ${root}`);
  for (const relative of [bundle.python, bundle.entry]) {
    const file = await fs.realpath(path.join(root, relative));
    if (!file.startsWith(root + path.sep) || !(await fs.stat(file)).isFile()) throw new Error(`Invalid bundled runtime file: ${relative}`);
  }
  return bundle;
}

function matchingDemo(project, bundle) {
  return project.id === projectId && project.demo?.kind === 'mailmcp'
    && project.demo.activity === 'simulated' && project.demo.repository === bundle.repository
    && project.demo.commit === bundle.commit;
}

/** Explicit, offline import. The original app/profile remain available for recovery. */
export async function importMailMcpDemo({ profile, bundle: bundlePath, sourceProfile }) {
  if (![profile, bundlePath].every(value => typeof value === 'string' && path.isAbsolute(value))
    || (sourceProfile !== undefined && (typeof sourceProfile !== 'string' || !path.isAbsolute(sourceProfile)))) {
    throw new Error('Supply absolute profile, bundle, and optional sourceProfile paths.');
  }
  const root = await fs.realpath(profile);
  const bundleRoot = await fs.realpath(bundlePath);
  const sourceRoot = sourceProfile === undefined ? undefined : await fs.realpath(sourceProfile).catch(error => {
    if (error.code === 'ENOENT') return path.resolve(sourceProfile);
    throw error;
  });
  if (root === sourceRoot) throw new Error('The destination and source profiles must be different.');
  await closedProfile(root); if (sourceRoot) await closedProfile(sourceRoot);
  const bundle = await readyBundle(bundleRoot);
  const lock = path.join(root, '.mailmcp-import.lock');
  const lockHandle = await fs.open(lock, 'wx', 0o600).catch(error => {
    if (error.code === 'EEXIST') throw new Error(`Another import is active, or an interrupted import left ${lock}.`);
    throw error;
  });
  const staging = path.join(root, `.mailmcp-import-${randomUUID()}`);
  const runtime = path.join(root, 'demos', 'mailmcp');
  let workspace, publishedWorkspace = false, publishedRuntime = false, committed = false;
  try {
    const stateFile = path.join(root, 'state.json');
    const { state, bytes } = await readState(stateFile);
    const existing = state.projects.find(project => project.id === projectId);
    if (existing) {
      if (!matchingDemo(existing, bundle) || !/^[a-zA-Z0-9-]{1,100}$/.test(existing.runId ?? '') || existing.workspace !== path.join(root, 'workspaces', projectId, existing.runId)) {
        throw new Error('A different project already uses mailmcp-demo. The existing build was not overwritten.');
      }
      const installed = await readyBundle(runtime);
      if (installed.commit !== bundle.commit) throw new Error('The installed MailMCP runtime does not match this project.');
      if (!await exists(existing.workspace)) throw new Error('The previously imported MailMCP workspace is missing. Restore it before importing again.');
      return { imported: false, projectId, workspace: existing.workspace, runtime };
    }

    let sourceState;
    try { if (sourceRoot) sourceState = await readState(path.join(sourceRoot, 'state.json')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const seeded = !sourceState;
    const sourceProject = seeded
      ? JSON.parse(await fs.readFile(path.join(bundleRoot, 'seed-project.json'), 'utf8'))
      : sourceState.state.projects.find(project => project.id === projectId);
    if (!sourceProject || !matchingDemo(sourceProject, bundle) || !/^[a-zA-Z0-9-]{1,100}$/.test(sourceProject.runId ?? '')) {
      throw new Error('The source profile or seed does not contain the matching MailMCP demo.');
    }
    if (sourceProject.status === 'running' || sourceProject.conversation?.status === 'responding'
      || (sourceProject.processScope && (sourceProject.processScope.cleanup !== 'confirmed' || sourceProject.processScope.runId !== sourceProject.runId))) {
      throw new Error('The MailMCP demo still has unfinished activity. Open it, stop the activity, then quit before importing.');
    }
    const sourceWorkspace = seeded ? path.join(bundleRoot, 'workspace') : sourceProject.workspace;
    if (!sourceWorkspace || !path.isAbsolute(sourceWorkspace)
      || (!seeded && sourceWorkspace !== path.join(sourceRoot, 'workspaces', projectId, sourceProject.runId))) {
      throw new Error('The saved demo workspace is outside its source profile.');
    }
    workspace = path.join(root, 'workspaces', projectId, sourceProject.runId);
    if (await exists(workspace) || await exists(runtime)) throw new Error('MailMCP destination files already exist without an imported project. Preserve or restore them before retrying.');
    const beforeHash = await sourceHash(sourceWorkspace);
    await fs.mkdir(staging, { mode: 0o700 });
    await fs.cp(sourceWorkspace, path.join(staging, 'workspace'), { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true });
    await fs.cp(bundleRoot, path.join(staging, 'runtime'), { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true });
    await readyBundle(path.join(staging, 'runtime'));
    if (await sourceHash(path.join(staging, 'workspace')) !== beforeHash || await sourceHash(sourceWorkspace) !== beforeHash) {
      throw new Error('The source workspace changed during import. Quit the demo and retry.');
    }
    const project = structuredClone(sourceProject);
    project.workspace = workspace;
    project.updatedAt = new Date().toISOString();
    delete project.archivedAt;
    project.processScope = { runId: project.runId, marker: randomUUID(), cleanup: 'confirmed' };
    const evidencePreserved = !!project.report && (seeded || (project.report.sourceHash === beforeHash
      && project.verification?.runId === project.runId && project.verification.reportHash === reportHash(project.report)));
    if (seeded && project.report) {
      project.report.sourceHash = beforeHash;
      project.verification = { runId: project.runId, reportHash: reportHash(project.report) };
      await fs.writeFile(path.join(staging, 'workspace', 'test-report.json'), JSON.stringify(project.report, null, 2));
    } else if (!evidencePreserved) {
      delete project.verification; delete project.approval; delete project.approvedAt;
      if (['approved', 'delivered'].includes(project.status)) project.status = 'review';
    }
    await directory(root, path.join('workspaces', projectId));
    await directory(root, 'demos');
    const backupRoot = await directory(root, 'backups');
    const backup = path.join(backupRoot, `state-before-mailmcp-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}.json`);
    await fs.writeFile(backup, bytes, { flag: 'wx', mode: 0o600 });
    await fs.writeFile(path.join(staging, 'state.json'), JSON.stringify({ ...state, projects: [...state.projects, project] }, null, 2), { flag: 'wx', mode: 0o600 });
    await closedProfile(root); if (sourceRoot) await closedProfile(sourceRoot);
    if (!(await fs.readFile(stateFile)).equals(bytes)
      || (sourceState && !(await fs.readFile(path.join(sourceRoot, 'state.json'))).equals(sourceState.bytes))) {
      throw new Error('An AppYard profile changed during import. Quit both apps and retry.');
    }
    await fs.rename(path.join(staging, 'runtime'), runtime); publishedRuntime = true;
    await fs.rename(path.join(staging, 'workspace'), workspace); publishedWorkspace = true;
    await fs.rename(path.join(staging, 'state.json'), stateFile); committed = true;
    return { imported: true, projectId, workspace, runtime, backup, evidencePreserved };
  } finally {
    if (!committed) {
      if (publishedWorkspace) await fs.rm(workspace, { recursive: true, force: true });
      if (publishedRuntime) await fs.rm(runtime, { recursive: true, force: true });
    }
    await fs.rm(staging, { recursive: true, force: true });
    await lockHandle.close(); await fs.rm(lock, { force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), options = {};
  const names = { '--profile': 'profile', '--bundle': 'bundle', '--source-profile': 'sourceProfile' };
  try {
    for (let index = 0; index < args.length; index += 2) {
      const name = names[args[index]], value = args[index + 1];
      if (!name || !value || value.startsWith('--') || options[name]) throw new Error('Usage: node scripts/import-mailmcp-demo.mjs --profile ABSOLUTE_PATH --bundle ABSOLUTE_PATH --source-profile ABSOLUTE_PATH');
      options[name] = value;
    }
    if (!options.profile || !options.bundle || !options.sourceProfile) throw new Error('Supply explicit --profile, --bundle, and --source-profile paths.');
    console.log(JSON.stringify(await importMailMcpDemo(options), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
