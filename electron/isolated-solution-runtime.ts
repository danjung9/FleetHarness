import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRuntimeFilesHasher } from './runtime-files-hash.js';
import { performance } from 'node:perf_hooks';
import type { JsonValue, RuntimeManifest } from '../shared/solution.js';
import { assertRuntimeSourceFiles, runtimeDataDirectory } from '../shared/runtime-artifacts.js';
import type { SolutionRuntime, SolutionRuntimeLimits } from './solution-runtime.js';
import type { IntegrationBroker } from './integration-broker.js';
import { RuntimeBroker } from './runtime-broker.js';
import { prepareIsolatedDependencies } from './isolated-dependencies.js';
import { spawnIsolatedProcess } from './isolated-executor.js';
import { applicationTestFiles, type verifyWorkspace } from './verification.js';
import { ApplicationTestEvidence, applicationTestCommand, applicationTestReporter } from './application-test-evidence.js';
import { sourceHash } from './storage.js';
import { ClassifiedExecutionFailure } from './execution-failure.js';

const defaults: SolutionRuntimeLimits = { totalTimeoutMs: 300_000, startupTimeoutMs: 15_000, invocationTimeoutMs: 15_000,
  installTimeoutMs: 120_000, maxOutputBytes: 2_000_000, maxPackageBytes: 100_000_000 };
const reserved = /(?:^|\/)(?:\.fleet|\.git|\.quality-evidence|\.solution-evidence|\.browser-observations|node_modules|\.venv)(?:\/|$)|(?:^|\/)(?:solution-contract|behavior-contract|execution-contract|evaluation-plan|acceptance-plan|ux-spec|packet|visual-review)\.json$|(?:^|\/)inputs\/manifest\.json$|(?:^|\/)\.env[^/]*(?:\/|$)/i;

async function readFile(root: string, relative: string): Promise<Buffer> {
  if (!relative || path.isAbsolute(relative) || relative.includes('\\') || relative.includes('\0')
    || relative === 'memory-context.md'
    || relative.split('/').some(part => !part || part === '.' || part === '..') || reserved.test(relative)) throw new Error('Invalid isolated package path: ' + relative);
  let current = root;
  const parts = relative.split('/');
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    const stat = await fs.lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Package paths cannot contain aliases.');
  }
  const handle = await fs.open(path.join(current, parts.at(-1)!), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > 100_000_000) throw new Error('Package files must be bounded ordinary files with no aliases.');
    return await handle.readFile();
  } finally { await handle.close(); }
}

export interface IsolatedRuntimeServices {
  /** Each package gets a revocable lease over the same persisted candidate call budget. */
  integrations?(): IntegrationBroker;
  /** Host renderer origin for manual preview embedding; verification stays unembeddable. */
  embeddingOrigin?: string;
}

/** Same invocation contract as the legacy runtime, with all generated code behind the OS boundary. */
export function isolatedRuntimeFactory(services: IsolatedRuntimeServices = {}): typeof import('./solution-runtime.js').prepareSolutionRuntime {
  return async (sourceRoot, manifest, nodeExecutable, signal, options = {}) => prepareIsolatedSolutionRuntime(sourceRoot, manifest, nodeExecutable, signal, options, services);
}

export async function prepareIsolatedSolutionRuntime(sourceRoot: string, manifest: RuntimeManifest, nodeExecutable: string,
  signal?: AbortSignal, options: Partial<SolutionRuntimeLimits> = {}, services: IsolatedRuntimeServices = {}): Promise<SolutionRuntime> {
  const limits = { ...defaults, ...options };
  assertRuntimeSourceFiles(manifest.files);
  for (const [name, value] of Object.entries(limits)) if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid isolated runtime limit: ' + name);
  if (manifest.requiredEnv.length) throw new Error('Experiment credentials must use configured service operations, never generated process environment variables.');
  const command = manifest.profile === 'browser' ? manifest.evaluator : manifest.command;
  if (!command || command.args.length) throw new Error('Experiment runtimes require an invoke module with no process arguments.');
  if (manifest.profile === 'browser' && command.runtime !== 'node') throw new Error('A browser package requires a Node shared-core evaluator.');
  if (!manifest.files.length || manifest.files.length > 256 || new Set(manifest.files).size !== manifest.files.length) throw new Error('Experiment package requires a unique bounded file manifest.');
  for (const entry of [manifest.entrypoint, command.entrypoint, manifest.dependencies?.manifest, manifest.dependencies?.lockfile].filter(Boolean)) {
    if (!manifest.files.includes(entry!)) throw new Error('The runtime manifest omitted an entrypoint or lockfile.');
  }
  signal?.throwIfAborted();
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-candidate-package-')));
  const root = path.join(directory, 'package'), controller = new AbortController();
  const combined = AbortSignal.any([controller.signal, ...(signal ? [signal] : [])]);
  const timer = setTimeout(() => controller.abort(new Error('Isolated runtime exhausted its execution budget.')), limits.totalTimeoutMs);
  let broker: RuntimeBroker | undefined, integrations: IntegrationBroker | undefined, closed = false;
  let closing: Promise<void> | undefined;
  const close = () => closing ??= (async () => {
    closed = true; clearTimeout(timer); controller.abort(); integrations?.revoke();
    try { await broker?.close(); } finally { await fs.rm(directory, { recursive: true, force: true }); }
  })();
  try {
    await fs.mkdir(root, { mode: 0o700 });
    const base = await fs.realpath(sourceRoot), hash = createRuntimeFilesHasher();
    let size = 0;
    for (const file of [...manifest.files].sort()) {
      combined.throwIfAborted();
      const bytes = await readFile(base, file); size += bytes.length;
      if (size > limits.maxPackageBytes) throw new Error('Isolated package exceeds the frozen byte limit.');
      hash.add(file, bytes);
      const destination = path.join(root, file);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, bytes, { flag: 'wx', mode: 0o600 });
    }
    const filesHash = hash.digest();
    const dependencies = await prepareIsolatedDependencies({ root, manifest, nodeExecutable, signal: combined, timeoutMs: limits.installTimeoutMs });
    const dataRoot = path.join(root, runtimeDataDirectory);
    if (manifest.profile === 'service') await fs.mkdir(dataRoot, { mode: 0o700 });
    integrations = services.integrations?.();
    broker = await RuntimeBroker.start({ workspace: root, executable: command.runtime === 'python' ? dependencies.python! : nodeExecutable,
      runtime: command.runtime, entrypoint: command.entrypoint, readPaths: dependencies.readPaths, signal: combined, integrations,
      writePaths: manifest.profile === 'service' ? [dataRoot] : undefined,
      timeoutMs: limits.totalTimeoutMs, startupTimeoutMs: limits.startupTimeoutMs,
      requestTimeoutMs: limits.invocationTimeoutMs, maxOutputBytes: limits.maxOutputBytes });
    const url = manifest.profile === 'cli' ? undefined : await broker.listen({ staticRoot: root,
      files: manifest.files.filter(file => !/\.cjs$/i.test(file)), index: 'index.html',
      startPath: manifest.profile === 'browser' ? '/index.html' : undefined, embeddingOrigin: services.embeddingOrigin });
    const redact = (text: string) => integrations?.redact(text) ?? text;
    const redactOutput = (value: JsonValue): JsonValue => {
      if (typeof value === 'string') return redact(value);
      if (value === null || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map(redactOutput);
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [redact(key), redactOutput(item)]));
    };
    const assertIntegrity = async () => {
      combined.throwIfAborted();
      if (closed) throw new Error('Isolated runtime is closed.');
      const current = createRuntimeFilesHasher();
      for (const file of [...manifest.files].sort()) current.add(file, await readFile(root, file));
      if (current.digest() !== filesHash) throw new ClassifiedExecutionFailure('integrity', 'The runtime changed its frozen application files.');
    };
    let restarting: Promise<void> | undefined;
    const restart = () => {
      if (restarting) return restarting;
      restarting = (async () => {
        try { await assertIntegrity(); await broker!.restart(); await assertIntegrity(); }
        catch (error) { await close(); throw error; }
      })().finally(() => { restarting = undefined; });
      return restarting;
    };
    await assertIntegrity();
    return { root, url, routeBase: '', provenance: { profile: manifest.profile, filesHash, runtime: command.runtime + ' (isolated stdio)', environmentNames: [] },
      testEnvironment: dependencies.testEnvironment, invoke: input => broker!.invoke(input), redactOutput, redactMessage: redact, close,
      ...(manifest.profile === 'service' ? { restart } : {}), assertIntegrity };
  } catch (error) { await close(); throw error; }
}

/** Generated node:test files get a separate, network-disabled process and sanitized environment. */
export const verifyIsolatedWorkspace: typeof verifyWorkspace = async (root, executable, onProcess, signal, options = {}, environment) => {
  const files = await applicationTestFiles(root);
  if (!files.length) throw new Error('No application tests were produced.');
  const started = performance.now(), before = await sourceHash(root);
  const evidence = new ApplicationTestEvidence();
  const args = ['--no-global-search-paths', '--test', applicationTestReporter, ...files.map(file => './' + file)];
  const readPaths: string[] = environment?.FLEET_PYTHON_READ_PATHS ? JSON.parse(environment.FLEET_PYTHON_READ_PATHS) : [];
  if (!Array.isArray(readPaths) || readPaths.some(file => typeof file !== 'string' || !path.isAbsolute(file))) throw new Error('Invalid host test runtime paths.');
  const dataRoot = path.join(root, runtimeDataDirectory), writePaths: string[] = [];
  try {
    const data = await fs.lstat(dataRoot);
    if (!data.isDirectory() || data.isSymbolicLink()) throw new Error('Service state must stay in its ordinary runtime data directory.');
    writePaths.push(dataRoot);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const process = await spawnIsolatedProcess({ workspace: root, command: [executable, ...args], signal,
    readPaths, writePaths, env: environment?.FLEET_PYTHON ? { FLEET_PYTHON: environment.FLEET_PYTHON } : {},
    timeoutMs: options.timeoutMs ?? 120_000, maxOutputBytes: options.maxOutputBytes ?? 2_000_000,
    onStdout: bytes => evidence.stdout(bytes), onStderr: bytes => evidence.stderr(bytes) });
  let exitCode: number | null;
  try { onProcess(process.child); process.child.stdin.end(); exitCode = (await process.done).exitCode; }
  finally { await process.close(); }
  signal?.throwIfAborted();
  const hash = await sourceHash(root);
  if (hash !== before) throw new ClassifiedExecutionFailure('integrity', 'Application files changed during isolated test execution.');
  const { valid, ...result } = evidence.finish(files.length);
  return { time: new Date().toISOString(), command: applicationTestCommand(args), exitCode: exitCode === 0 && !valid ? null : exitCode,
    ...result, durationMs: Math.round(performance.now() - started), sourceHash: hash };
};
