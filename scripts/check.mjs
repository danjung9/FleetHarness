import { promises as fs, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyDependencies } from './check-dependencies.mjs';
import { acquireCheckLock, checkLockPath } from './check-coordination.mjs';

const exec = promisify(execFile);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const timestamp = () => new Date().toISOString();
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

function gitEnvironment() {
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete env[key];
  return env;
}

async function sourceFiles(root) {
  const { stdout } = await exec('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: root, env: gitEnvironment(), maxBuffer: 16 * 1024 * 1024
  });
  return [...new Set(stdout.split('\0').filter(Boolean))].sort();
}

async function readSource(root, name) {
  const parts = name.split('/');
  if (path.isAbsolute(name) || parts.some(part => !part || part === '.' || part === '..' || part === '.git')) {
    throw new Error(`Unsupported source path: ${name}`);
  }
  let current = root, stat;
  try {
    for (const [index, part] of parts.entries()) {
      current = path.join(current, part);
      stat = await fs.lstat(current);
      if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) {
        throw new Error(`Source must contain ordinary files and directories: ${name}`);
      }
    }
    return { bytes: await fs.readFile(current), mode: stat.mode & 0o777 };
  } catch (error) {
    // Git still lists tracked deletions. They must stay deleted in the snapshot.
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function inventory(root, copyTo) {
  const files = [];
  for (const name of await sourceFiles(root)) {
    const source = await readSource(root, name);
    if (!source) continue;
    files.push({ path: name, sha256: sha256(source.bytes), mode: source.mode, bytes: source.bytes.length });
    if (copyTo) {
      const destination = path.join(copyTo, name);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, source.bytes, { flag: 'wx', mode: source.mode });
      await fs.chmod(destination, source.mode);
    }
  }
  return { files, sha256: sha256(JSON.stringify(files)) };
}

/** Capture the current checkout, including nonignored additions and tracked deletions. */
export async function captureSnapshot(sourceRoot, workspace) {
  await fs.mkdir(workspace, { recursive: true });
  const captured = await inventory(sourceRoot, workspace);
  if (!captured.files.length) throw new Error('No source files were found.');
  const confirmed = await inventory(sourceRoot);
  if (confirmed.sha256 !== captured.sha256) throw new Error('Source changed during capture; start a new check after edits settle.');
  return captured;
}

export async function discoverTests(directory, suffix) {
  const files = (await fs.readdir(directory)).filter(name => name.endsWith(suffix)).sort();
  if (!files.length) throw new Error(`No ${suffix} tests found in ${directory}.`);
  return files.map(name => path.join(directory, name));
}

export function defaultStages() {
  const node = (id, args, timeoutMs = 180_000) => ({ id, command: process.execPath, args, timeoutMs });
  return [
    node('frontend-types', ['node_modules/typescript/bin/tsc', '--noEmit']),
    // The runner loader avoids writing Vite's bundled config into shared node_modules.
    node('frontend-build', ['node_modules/vite/bin/vite.js', 'build', '--configLoader', 'runner']),
    node('electron-build', ['node_modules/typescript/bin/tsc', '-p', 'electron/tsconfig.json']),
    node('harness-build', ['node_modules/typescript/bin/tsc', '-p', 'harness/tsconfig.json']),
    node('foundation-checksums', ['scripts/check-foundations.mjs']),
    { ...node('harness-tests', [], 300_000), tests: { directory: 'dist-harness/tests', suffix: '.test.js' } },
    { ...node('repository-tests', [], 1_200_000), tests: { directory: 'tests', suffix: '.test.mjs' } }
  ];
}

async function optionalDigest(file) {
  try { return sha256(await fs.readFile(file)); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function addedSnapshotFile(workspace, knownFiles, directory = '') {
  const generatedRoots = new Set(['node_modules', 'dist', 'dist-electron', 'dist-harness', 'output']);
  for (const entry of await fs.readdir(path.join(workspace, directory), { withFileTypes: true })) {
    if (!directory && generatedRoots.has(entry.name)) continue;
    const name = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const added = await addedSnapshotFile(workspace, knownFiles, name);
      if (added) return added;
    } else if (!knownFiles.has(name)) return name;
  }
}

function stageEnvironment(workspace) {
  return { ...gitEnvironment(), GIT_CEILING_DIRECTORIES: path.dirname(workspace) };
}

async function runStage(stage, workspace, logFile, signal) {
  const startedAt = timestamp(), started = Date.now();
  const result = { id: stage.id, status: 'failed', command: stage.command, args: stage.args,
    startedAt, log: path.basename(logFile), timeoutMs: stage.timeoutMs, exitCode: null, signal: null };
  if (signal?.aborted) return { ...result, status: 'cancelled', finishedAt: timestamp(), durationMs: 0 };
  const log = createWriteStream(logFile, { flags: 'wx' });
  let child, timer, termination, exitCleanup, groupProbeError, aborted = false, timedOut = false, failure;
  let closed = false, finalized = false, finish, markClosed;
  const completion = new Promise(resolve => { finish = resolve; });
  const childClosed = new Promise(resolve => { markClosed = resolve; });
  const groupAlive = () => {
    if (process.platform === 'win32' || !child?.pid) return false;
    try { process.kill(-child.pid, 0); groupProbeError = undefined; return true; }
    catch (error) {
      if (error.code === 'ESRCH') { groupProbeError = undefined; return false; }
      groupProbeError = error.message;
      return true;
    }
  };
  const stop = () => {
    if (!child?.pid) return;
    const kill = signalName => {
      try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, signalName); }
      catch (error) { if (error.code !== 'ESRCH') failure ??= error.message; }
    };
    if (termination) return;
    kill('SIGTERM');
    // The direct child may exit before descendants that ignore SIGTERM. Do not
    // cancel escalation on its close event; finish cleaning the whole group.
    termination = (async () => {
      await new Promise(resolve => setTimeout(resolve, 2_000));
      kill('SIGKILL');
      // An escaped descendant can keep inherited pipes open after the process
      // group is gone. Allow pending output to drain, then release our pipes
      // without waiting indefinitely for ChildProcess.close.
      if (!closed) await new Promise(resolve => {
        const drainTimer = setTimeout(resolve, 250);
        childClosed.then(() => { clearTimeout(drainTimer); resolve(); });
      });
      if (!closed) {
        failure ??= 'Stage did not close after termination; remaining output pipes were closed.';
        child.stdout?.destroy();
        child.stderr?.destroy();
        child.unref();
        finish();
      }
    })();
  };
  const cleanAfterExit = async () => {
    // Descendants can close their inherited stdio or unref themselves, so a
    // successful close event is not evidence that the process group is done.
    // Allow ordinary shutdown to finish before classifying a surviving group.
    const deadline = Date.now() + 250;
    while (!termination && groupAlive() && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (!termination && groupAlive()) {
      failure ??= groupProbeError ?? 'Stage left descendant processes running after exit.';
      stop();
    }
  };
  const abort = () => { aborted = true; stop(); };
  const logClosed = new Promise(resolve => {
    log.on('error', error => { failure = error.message; stop(); });
    log.on('close', resolve);
  });
  try {
    child = spawn(stage.command, stage.args, { cwd: workspace, env: stageEnvironment(workspace),
      detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    child.on('error', error => { if (!finalized) failure = error.message; });
    // Record exit independently of close: descendants may retain the pipes.
    child.on('exit', (code, childSignal) => {
      if (finalized) return;
      result.exitCode = code; result.signal = childSignal;
      exitCleanup = cleanAfterExit();
    });
    child.on('close', (code, childSignal) => {
      closed = true; markClosed();
      if (!finalized) { result.exitCode = code; result.signal = childSignal; }
      finish();
    });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    timer = setTimeout(() => { timedOut = true; stop(); }, stage.timeoutMs);
    await completion;
  } catch (error) { failure = error.message; }
  finally {
    clearTimeout(timer);
    await exitCleanup;
    await termination;
    finalized = true;
    signal?.removeEventListener('abort', abort);
    log.end();
    await logClosed;
  }
  if (failure) result.error = failure;
  if (timedOut) result.error = `Stage exceeded ${stage.timeoutMs} ms.`;
  result.status = aborted ? 'cancelled' : !failure && !timedOut && result.exitCode === 0 && !result.signal ? 'passed' : 'failed';
  return { ...result, finishedAt: timestamp(), durationMs: Date.now() - started };
}

/** Custom stages support testing this runner; only the default stages are the full offline check. */
export async function runChecks({ sourceRoot = repositoryRoot, outputRoot = path.join(sourceRoot, 'output', 'checks'),
  stages, signal, onProgress = () => {}, coordination = false, coordinationTimeoutMs } = {}) {
  sourceRoot = await fs.realpath(sourceRoot);
  await fs.mkdir(outputRoot, { recursive: true });
  const directory = await fs.mkdtemp(path.join(outputRoot, 'check-'));
  const workspace = path.join(directory, 'workspace');
  const plan = stages ?? defaultStages();
  const report = { schemaVersion: 1, scope: stages ? 'custom' : 'full-offline', status: 'running', startedAt: timestamp(),
    sourceRoot, workspace, node: { executable: process.execPath, version: process.version, platform: process.platform, arch: process.arch },
    checksPassed: false, sourceUnchanged: null, stages: plan.map(stage => ({ id: stage.id, status: 'not_run' })), errors: [] };
  const save = async () => {
    await fs.writeFile(path.join(directory, 'result.json.tmp'), JSON.stringify(report, null, 2) + '\n');
    await fs.rename(path.join(directory, 'result.json.tmp'), path.join(directory, 'result.json'));
  };
  await save();
  onProgress(`Check artifacts: ${directory}`);
  let checkLock, coordinationStarted;
  try {
    if (!plan.length || new Set(plan.map(stage => stage.id)).size !== plan.length || plan.some(stage => !/^[a-z][a-z0-9-]*$/.test(stage.id)
      || !Number.isSafeInteger(stage.timeoutMs) || stage.timeoutMs <= 0)) throw new Error('Check stages require unique IDs and positive timeouts.');
    signal?.throwIfAborted();
    const dependencyPath = await fs.realpath(path.join(sourceRoot, 'node_modules'));
    if (!(await fs.stat(dependencyPath)).isDirectory()) throw new Error('Install dependencies with npm ci before running checks.');
    // Custom fixture checks run inside the repository suite. They only share
    // the full-check mutex when explicitly testing coordination themselves.
    if (stages == null || coordination) {
      coordinationStarted = performance.now();
      report.coordination = { status: 'waiting', requestedAt: timestamp(), lockPath: await checkLockPath(dependencyPath) };
      await save();
      checkLock = await acquireCheckLock({ dependencyPath, artifactDirectory: directory, signal, timeoutMs: coordinationTimeoutMs,
        onWaiting: async record => {
          report.coordination = { ...record, status: 'waiting' };
          await save();
          onProgress(`Waiting for check lock: ${record.lockPath} (owner PID ${record.owner?.pid ?? 'unknown'}; artifacts: ${record.owner?.artifactDirectory ?? 'unknown'})`);
        } });
      report.coordination = { ...checkLock.record, status: 'acquired' };
      await save();
    }
    signal?.throwIfAborted();
    const snapshot = await captureSnapshot(sourceRoot, workspace);
    report.sourceHash = snapshot.sha256;
    report.sourceFiles = snapshot.files.length;
    await fs.writeFile(path.join(directory, 'source-manifest.json'), JSON.stringify(snapshot, null, 2) + '\n');
    const { stdout } = await exec('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, env: gitEnvironment() });
    report.gitHead = stdout.trim();
    report.dependencies = { path: dependencyPath, shared: true,
      packageLockHash: await optionalDigest(path.join(workspace, 'package-lock.json')),
      installedLockHash: await optionalDigest(path.join(dependencyPath, '.package-lock.json')) };
    Object.assign(report.dependencies, await verifyDependencies(workspace, dependencyPath), { verified: true });
    await fs.symlink(dependencyPath, path.join(workspace, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    await save();
    for (const [index, planned] of plan.entries()) {
      signal?.throwIfAborted();
      const stage = { ...planned, args: [...planned.args] };
      if (stage.tests) {
        const tests = await discoverTests(path.join(workspace, stage.tests.directory), stage.tests.suffix);
        stage.args = ['--test', '--test-concurrency=4', ...tests.map(file => path.relative(workspace, file))];
      }
      report.stages[index] = { id: stage.id, status: 'running', command: stage.command, args: stage.args };
      await save();
      onProgress(`Running ${stage.id}`);
      report.stages[index] = await runStage(stage, workspace, path.join(directory, `${stage.id}.log`), signal);
      await save();
      onProgress(`${stage.id}: ${report.stages[index].status}`);
      if (report.stages[index].status !== 'passed') break;
    }
    report.checksPassed = report.stages.every(stage => stage.status === 'passed');
    report.sourceUnchanged = (await inventory(sourceRoot)).sha256 === snapshot.sha256;
    if (!report.sourceUnchanged) report.errors.push('Source changed during checks. Results apply only to the captured snapshot.');
    if (await optionalDigest(path.join(dependencyPath, '.package-lock.json')) !== report.dependencies.installedLockHash) {
      report.errors.push('The shared dependency installation changed during checks.');
    } else {
      const dependencies = await verifyDependencies(workspace, dependencyPath);
      if (dependencies.packageManifestsHash !== report.dependencies.packageManifestsHash) {
        report.errors.push('The shared dependency package manifests changed during checks.');
      }
    }
    for (const file of snapshot.files) {
      const current = await readSource(workspace, file.path);
      if (!current || sha256(current.bytes) !== file.sha256 || current.mode !== file.mode) {
        report.errors.push(`Captured source changed during checks: ${file.path}`);
        break;
      }
    }
    const added = await addedSnapshotFile(workspace, new Set(snapshot.files.map(file => file.path)));
    if (added) report.errors.push(`Source was added to the captured snapshot during checks: ${added}`);
    report.status = signal?.aborted ? 'cancelled' : report.checksPassed && !report.errors.length ? 'passed' : 'failed';
  } catch (error) {
    report.status = signal?.aborted ? 'cancelled' : 'failed';
    report.errors.push(error.message);
  } finally {
    if (checkLock) {
      try {
        await checkLock.release();
        report.coordination.status = 'released';
        report.coordination.releasedAt = timestamp();
      } catch (error) {
        report.coordination.status = 'failed';
        report.status = signal?.aborted ? 'cancelled' : 'failed';
        report.errors.push(`Check coordination release failed: ${error.message}`);
      }
    } else if (report.coordination) {
      report.coordination.status = signal?.aborted ? 'cancelled' : 'failed';
      report.coordination.waitMs = Math.round(performance.now() - coordinationStarted);
    }
    report.finishedAt = timestamp();
    await save();
  }
  return { directory, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error('Check cancelled.'));
  process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node scripts/check.mjs');
    const { directory, report } = await runChecks({ signal: controller.signal, onProgress: console.log });
    console.log(`Combined check ${report.status}: ${path.join(directory, 'result.json')}`);
    for (const error of report.errors) console.error(error);
    process.exitCode = report.status === 'passed' ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
}
