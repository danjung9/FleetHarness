import { spawn } from 'node:child_process';
import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import type { RuntimeManifest } from '../shared/solution.js';
import { assertIsolatedWritableTree, executeIsolatedProcess } from './isolated-executor.js';
import { ClassifiedExecutionFailure } from './execution-failure.js';
import { macosRuntimeExecutable } from './macos-isolation.js';

export interface IsolatedDependencyOptions {
  root: string; manifest: RuntimeManifest; nodeExecutable: string; signal?: AbortSignal; timeoutMs: number;
}
export interface IsolatedDependencies {
  python?: string; readPaths: string[]; testEnvironment: NodeJS.ProcessEnv;
}
/** Trusted host acquisition can be substituted by an offline fixture, never by candidate configuration. */
export interface DependencyAcquisition { fetch?: typeof globalThis.fetch }

const maxArtifacts = 512, maxArtifactBytes = 64_000_000, maxTotalBytes = 256_000_000;
// These codes come from host I/O, never from the installer's stderr. Missing,
// inaccessible or conflicting candidate files still need implementation fixes.
const hostResourceErrors = new Set(['ENOSPC', 'EDQUOT', 'EIO', 'EMFILE', 'ENFILE', 'EROFS']);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const canonicalName = (name: string) => name.toLowerCase().replace(/[-_.]+/g, '-');
const exactVersion = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

async function executable(name: string) {
  for (const folder of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!path.isAbsolute(folder)) continue;
    try { const file = await fs.realpath(path.join(folder, name)); await fs.access(file, constants.X_OK); return file; } catch { /* Next installed toolchain. */ }
  }
  throw new ClassifiedExecutionFailure('infrastructure', 'An installed ' + name + ' toolchain is required for isolated dependencies.');
}

async function ordinaryFile(root: string, name: string, maximum = 2_000_000) {
  if (!name || path.isAbsolute(name) || name.includes('\\') || name.includes('\0') || name.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid dependency file path.');
  let file = root;
  for (const part of name.split('/').slice(0, -1)) {
    file = path.join(file, part);
    const stat = await fs.lstat(file);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Dependency files cannot have alias ancestors.');
  }
  const handle = await fs.open(path.join(file, name.split('/').at(-1)!), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > maximum) throw new Error('Dependency manifests must be bounded ordinary files.');
    return await handle.readFile('utf8');
  } finally { await handle.close(); }
}

async function installedTree(directory: string) {
  const stat = await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Installed dependencies must be ordinary directories.');
  await assertIsolatedWritableTree(directory);
  const pending = [directory]; let bytes = 0;
  while (pending.length) {
    const current = pending.pop()!;
    for (const name of await fs.readdir(current)) {
      // The extraction process has exited, so no package process can race this walk.
      const file = path.join(current, name), item = await fs.lstat(file);
      if (item.isDirectory()) pending.push(file);
      else if ((bytes += item.size) > 512_000_000) throw new Error('Installed dependencies exceed their byte budget.');
    }
  }
}

function registryUrl(value: unknown, host: string, extension?: RegExp): string {
  if (typeof value !== 'string' || value.length > 2_000 || value.trim() !== value) throw new Error('Invalid dependency registry URL.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== host || url.port || url.username || url.password || url.hash || url.search || (extension && !extension.test(url.pathname))) throw new Error('Dependency downloads require the approved HTTPS registry without credentials, redirects, or query strings.');
  return url.href;
}

interface Archive { url: string; integrity: string; algorithms: string[] }
function integrityHashes(value: unknown) {
  if (typeof value !== 'string' || !value.length || value.length > 2_000) throw new Error('Every dependency requires SHA-256 or stronger integrity.');
  const lengths: Record<string, number> = { sha256: 32, sha384: 48, sha512: 64 };
  return value.trim().split(/\s+/).map(part => {
    const match = /^(sha256|sha384|sha512)-([A-Za-z0-9+/]+={0,2})$/.exec(part);
    if (!match) throw new Error('Every dependency requires SHA-256 or stronger integrity.');
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length !== lengths[match[1]] || bytes.toString('base64').replace(/=+$/, '') !== match[2].replace(/=+$/, '')) throw new Error('Invalid dependency integrity encoding.');
    return { algorithm: match[1], hash: bytes.toString('base64') };
  });
}
function npmArchives(manifest: unknown, lock: unknown): Archive[] {
  if (!record(manifest) || manifest.workspaces !== undefined || !record(lock) || ![2, 3].includes(lock.lockfileVersion as number)
    || !record(lock.packages) || !record(lock.packages['']) || lock.packages[''].workspaces !== undefined) throw new Error('Isolated npm requires a v2/v3 registry lock without workspaces.');
  const archives = new Map<string, Archive>();
  const external = (entry: unknown) => {
    if (!record(entry) || entry.link || typeof entry.version !== 'string' || !exactVersion.test(entry.version)) throw new Error('Every npm dependency must pin an exact registry version.');
    const url = registryUrl(entry.resolved, 'registry.npmjs.org', /\.(?:tgz|tar\.gz)$/), hashes = integrityHashes(entry.integrity);
    if (archives.has(url) && archives.get(url)!.integrity !== entry.integrity) throw new Error('The same npm artifact has conflicting integrity.');
    archives.set(url, { url, integrity: entry.integrity as string, algorithms: [...new Set(hashes.map(hash => hash.algorithm))] });
    if (archives.size > maxArtifacts) throw new Error('Dependency artifact count exceeds its limit.');
  };
  for (const [location, entry] of Object.entries(lock.packages)) {
    if (!record(entry) || entry.link) throw new Error('npm links are unsupported in isolated dependencies.');
    if (!location) continue;
    if (!/^(?:node_modules\/(?:@[A-Za-z0-9_.-]+\/)?[A-Za-z0-9_.-]+)(?:\/node_modules\/(?:@[A-Za-z0-9_.-]+\/)?[A-Za-z0-9_.-]+)*$/.test(location)
      || location.split('/').some(part => part === '.' || part === '..')) throw new Error('Invalid npm package location.');
    external(entry);
  }
  const pending: unknown[] = lock.dependencies === undefined ? [] : [lock.dependencies]; let count = 0;
  while (pending.length) {
    const dependencies = pending.pop();
    if (!record(dependencies)) throw new Error('Invalid npm legacy dependency tree.');
    for (const entry of Object.values(dependencies)) {
      if (++count > 2_000) throw new Error('npm dependency tree exceeds its limit.');
      external(entry);
      if (record(entry) && entry.dependencies !== undefined) pending.push(entry.dependencies);
    }
  }
  return [...archives.values()];
}

interface Requirement { name: string; version: string; hashes: Set<string> }
function requirements(text: string): Requirement[] {
  const lines = text.replace(/\\\r?\n/g, ' ').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (!lines.length || lines.length > 256) throw new Error('Python requires a bounded nonempty hashed lock.');
  const names = new Set<string>();
  return lines.map(line => {
    const match = /^([A-Za-z0-9][A-Za-z0-9_.-]*)(?:\[[A-Za-z0-9_,.-]+\])?==([0-9][A-Za-z0-9.!+_-]{0,100})((?:\s+--hash=sha256:[a-fA-F0-9]{64})+)\s*$/.exec(line);
    if (!match || line.length > 20_000) throw new Error('Python dependencies require exact name==version pins and SHA-256 hashes; sources, options, and environment markers are unsupported.');
    const name = canonicalName(match[1]);
    if (names.has(name)) throw new Error('Python lock contains duplicate package pins.');
    names.add(name);
    return { name, version: match[2], hashes: new Set([...match[3].matchAll(/sha256:([a-fA-F0-9]{64})/g)].map(hash => hash[1].toLowerCase())) };
  });
}

// This executes only a fixed introspection program in the installed interpreter.
// -I -S prevents Python startup files and ambient user modules from executing on the host.
async function pythonToolchain(python: string, signal: AbortSignal, timeout: number, wheelTags: boolean) {
  const script = 'import sys,json,sysconfig,glob,os\n' +
    (wheelTags ? 'import ensurepip\nwheels=glob.glob(os.path.join(os.path.dirname(ensurepip.__file__),"_bundled","pip-*.whl"))\nif len(wheels)!=1: raise RuntimeError("An installed ensurepip wheel is required")\nsys.path.insert(0,wheels[0])\nfrom pip._vendor.packaging.tags import sys_tags\ntags=[str(t) for t in sys_tags()]\n' : 'tags=[]\n') +
    'print(json.dumps({"prefix":sys.base_prefix,"stdlib":sysconfig.get_path("stdlib"),"tags":tags}))';
  const child = spawn(python, ['-I', '-S', '-c', script], { cwd: os.tmpdir(), env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const chunks: Buffer[] = [], errors: Buffer[] = []; let bytes = 0;
  const stop = () => child.kill('SIGKILL');
  const timer = setTimeout(stop, Math.min(timeout, 15_000)); signal.addEventListener('abort', stop, { once: true });
  try {
    return await new Promise<{ prefix: string; stdlib: string; tags: string[] }>((resolve, reject) => {
      const collect = (chunk: Buffer, destination: Buffer[]) => { bytes += chunk.length; if (bytes > 1_000_000) stop(); else destination.push(chunk); };
      child.stdout.on('data', chunk => collect(chunk, chunks)); child.stderr.on('data', chunk => collect(chunk, errors));
      child.once('error', reject); child.once('close', code => {
        if (code !== 0 || bytes > 1_000_000 || signal.aborted) { reject(new Error('Could not inspect the installed Python toolchain: ' + Buffer.concat(errors).toString('utf8').slice(0, 1_000))); return; }
        try {
          const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!record(result) || ![result.prefix, result.stdlib].every(value => typeof value === 'string' && path.isAbsolute(value) && value !== path.parse(value).root)
            || !Array.isArray(result.tags) || result.tags.length > 10_000 || result.tags.some(tag => typeof tag !== 'string')) throw new Error('Invalid Python toolchain paths.');
          resolve(result as { prefix: string; stdlib: string; tags: string[] });
        } catch (error) { reject(error); }
      });
      if (signal.aborted) stop();
    });
  } finally { clearTimeout(timer); signal.removeEventListener('abort', stop); }
}

function wheelRank(filename: string, tags: string[]) {
  const match = /-([^-]+)-([^-]+)-([^-]+)\.whl$/.exec(filename);
  if (!match) return -1;
  let best = Infinity;
  for (const python of match[1].split('.')) for (const abi of match[2].split('.')) for (const platform of match[3].split('.')) {
    const rank = tags.indexOf(python + '-' + abi + '-' + platform);
    if (rank >= 0) best = Math.min(best, rank);
  }
  return Number.isFinite(best) ? best : -1;
}

/** Acquire immutable archives on the host, then install only inside a network-disabled OS sandbox. */
async function acquireDependencies(options: IsolatedDependencyOptions, acquisition: DependencyAcquisition): Promise<IsolatedDependencies> {
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs <= 0 || options.timeoutMs > 3_600_000) throw new Error('Invalid dependency installation timeout.');
  const signal = AbortSignal.any([AbortSignal.timeout(options.timeoutMs), ...(options.signal ? [options.signal] : [])]);
  signal.throwIfAborted();
  const stat = await fs.lstat(options.root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Dependencies require an ordinary isolated package.');
  const root = await fs.realpath(options.root), dependencies = options.manifest.dependencies;
  let python: string | undefined; const readPaths: string[] = [];
  let toolchain: Awaited<ReturnType<typeof pythonToolchain>> | undefined;
  if (options.manifest.command?.runtime === 'python' || options.manifest.evaluator?.runtime === 'python' || dependencies?.manager === 'pip') {
    python = await executable('python3');
    try { toolchain = await pythonToolchain(python, signal, options.timeoutMs, dependencies?.manager === 'pip'); }
    catch (error) { throw new ClassifiedExecutionFailure('infrastructure', error instanceof Error ? error.message : 'Python toolchain introspection failed.', { cause: error }); }
    for (const directory of [toolchain.prefix, toolchain.stdlib]) {
      const real = await fs.realpath(directory);
      if (!readPaths.includes(real)) readPaths.push(real);
    }
  }
  const result = async (): Promise<IsolatedDependencies> => {
    // Generated Node tests launch this exact interpreter directly. Framework
    // launchers cannot use posix_spawn inside the supervised process boundary.
    const interpreter = python && process.platform === 'darwin' ? await macosRuntimeExecutable(python) : python;
    return { python: interpreter, readPaths, testEnvironment: interpreter ? { FLEET_PYTHON: interpreter, FLEET_PYTHON_READ_PATHS: JSON.stringify(readPaths) } : {} };
  };
  if (!dependencies) return result();
  for (const file of [dependencies.manifest, dependencies.lockfile]) if (!options.manifest.files.includes(file)) throw new Error('Dependency manifests must appear in the frozen runtime file allowlist.');
  const installer = path.join(root, '.fleet-dependencies');
  // Never merge with a generated directory or allow generated npm configuration into installation.
  await fs.mkdir(installer, { mode: 0o700 });
  const fetcher = acquisition.fetch ?? globalThis.fetch; let total = 0, count = 0;
  const download = async (url: string, maximum = maxArtifactBytes) => {
    signal.throwIfAborted();
    if (++count > maxArtifacts + 256) throw new Error('Dependency request count exceeds its limit.');
    let response: Response;
    try { response = await fetcher(url, { redirect: 'error', signal, credentials: 'omit', headers: { Accept: maximum === 2_000_000 ? 'application/json' : 'application/octet-stream' } }); }
    catch (error) { throw new ClassifiedExecutionFailure('infrastructure', 'Dependency registry connection failed.', { cause: error }); }
    if (!response.ok || response.redirected) {
      await response.body?.cancel();
      throw new ClassifiedExecutionFailure(response.status >= 500 || [408, 429].includes(response.status) ? 'infrastructure' : 'implementation', 'Dependency acquisition failed with HTTP ' + response.status + '.');
    }
    if (Number(response.headers.get('content-length')) > maximum) { await response.body?.cancel(); throw new Error('Dependency download exceeds its byte limit.'); }
    const reader = response.body?.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try {
      if (reader) for (;;) {
        signal.throwIfAborted(); const next = await reader.read(); if (next.done) break;
        size += next.value.length; total += next.value.length;
        if (size > maximum || total > maxTotalBytes) throw new Error('Dependency acquisition exceeds its byte budget.');
        chunks.push(next.value);
      }
    } catch (error) {
      if (signal.aborted || (error instanceof TypeError)) throw new ClassifiedExecutionFailure('infrastructure', 'Dependency registry transfer failed or timed out.', { cause: error });
      throw error;
    } finally { await reader?.cancel().catch(() => {}); }
    return Buffer.concat(chunks);
  };
  const run = async (command: string[], extraRead: string[] = [], writePaths?: string[]) => {
    signal.throwIfAborted();
    let outcome: Awaited<ReturnType<typeof executeIsolatedProcess>>;
    try { outcome = await executeIsolatedProcess({ workspace: installer, command, readPaths: [...readPaths, ...extraRead],
      writable: writePaths === undefined, writePaths, signal, timeoutMs: options.timeoutMs, maxOutputBytes: 2_000_000 }); }
    catch (error) { throw new ClassifiedExecutionFailure('infrastructure', 'The isolated dependency installer could not run: ' + (error instanceof Error ? error.message : String(error)), { cause: error }); }
    if (outcome.exitCode !== 0) throw new Error('Offline dependency installation failed: ' + outcome.stderr.slice(-2_000));
  };
  try {
    if (dependencies.manager === 'npm') {
      if (dependencies.manifest !== 'package.json' || dependencies.lockfile !== 'package-lock.json') throw new Error('Isolated npm requires package.json and package-lock.json.');
      const manifestText = await ordinaryFile(root, 'package.json'), lockText = await ordinaryFile(root, 'package-lock.json');
      const archives = npmArchives(JSON.parse(manifestText), JSON.parse(lockText)), npm = await executable('npm');
      const npmRoot = path.dirname(path.dirname(npm)), cache = path.join(installer, 'cache');
      // The installed npm owns this cache implementation. Candidate modules are never imported by the host.
      let cacache: { put(cache: string, key: string, data: Buffer, options: { integrity: string; algorithms: string[] }): Promise<unknown> };
      try { cacache = createRequire(npm)('cacache'); }
      catch (error) { throw new ClassifiedExecutionFailure('infrastructure', 'The installed npm cache implementation is unavailable.', { cause: error }); }
      for (const archive of archives) {
        const bytes = await download(archive.url), hashes = integrityHashes(archive.integrity);
        // Require every advertised hash to agree, not merely the weakest supported entry.
        if (hashes.some(hash => createHash(hash.algorithm).update(bytes).digest('base64') !== hash.hash)) throw new Error('npm dependency integrity mismatch.');
        await cacache.put(path.join(cache, '_cacache'), 'fleet:' + archive.url, bytes, { integrity: archive.integrity, algorithms: archive.algorithms });
      }
      await fs.writeFile(path.join(installer, 'package.json'), manifestText, { flag: 'wx' });
      await fs.writeFile(path.join(installer, 'package-lock.json'), lockText, { flag: 'wx' });
      await fs.writeFile(path.join(installer, 'user-npmrc'), '', { flag: 'wx' });
      await fs.writeFile(path.join(installer, 'global-npmrc'), '', { flag: 'wx' });
      await run([options.nodeExecutable, npm, 'ci', '--offline', '--ignore-scripts', '--bin-links=false', '--no-audit', '--no-fund', '--omit=dev',
        '--cache=' + cache, '--userconfig=' + path.join(installer, 'user-npmrc'), '--globalconfig=' + path.join(installer, 'global-npmrc'), '--registry=https://registry.npmjs.org'], [npmRoot]);
      const installed = path.join(installer, 'node_modules');
      try { await installedTree(installed); await fs.rename(installed, path.join(root, 'node_modules')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    } else if (dependencies.manager === 'pip') {
      const lock = await ordinaryFile(root, dependencies.lockfile), pins = requirements(lock), wheelhouse = path.join(installer, 'wheels');
      await fs.mkdir(wheelhouse);
      for (const pin of pins) {
        const url = registryUrl('https://pypi.org/pypi/' + encodeURIComponent(pin.name) + '/' + encodeURIComponent(pin.version) + '/json', 'pypi.org');
        const metadata: unknown = JSON.parse((await download(url, 2_000_000)).toString('utf8'));
        if (!record(metadata) || !Array.isArray(metadata.urls) || metadata.urls.length > 2_000) throw new Error('Invalid Python release metadata.');
        const wheels = metadata.urls.flatMap((entry: unknown) => {
          if (!record(entry) || entry.packagetype !== 'bdist_wheel' || typeof entry.filename !== 'string' || !/^[A-Za-z0-9_.+!-]{1,240}\.whl$/.test(entry.filename)
            || !record(entry.digests) || typeof entry.digests.sha256 !== 'string' || !pin.hashes.has(entry.digests.sha256.toLowerCase())) return [];
          const rank = wheelRank(entry.filename, toolchain!.tags);
          return rank < 0 ? [] : [{ filename: entry.filename, url: registryUrl(entry.url, 'files.pythonhosted.org', /\.whl$/), hash: entry.digests.sha256.toLowerCase(), rank }];
        }).sort((a, b) => a.rank - b.rank || a.filename.localeCompare(b.filename));
        const wheel = wheels[0];
        if (!wheel) throw new Error('No compatible hash-pinned binary wheel exists for ' + pin.name + '==' + pin.version + '.');
        const bytes = await download(wheel.url);
        if (createHash('sha256').update(bytes).digest('hex') !== wheel.hash) throw new Error('Python dependency integrity mismatch.');
        await fs.writeFile(path.join(wheelhouse, wheel.filename), bytes, { flag: 'wx' });
      }
      await fs.writeFile(path.join(installer, 'requirements.lock'), lock, { flag: 'wx' });
      const venv = path.join(installer, 'venv');
      // Host sitecustomize can rewrite sys._base_executable to a Homebrew alias
      // outside the resolved toolchain grant. Venv setup only needs the stdlib.
      await run([python!, '-I', '-S', '-m', 'venv', '--without-pip', '--copies', venv]);
      const venvPython = path.join(venv, 'bin', 'python');
      if (process.platform === 'darwin') {
        const actual = await macosRuntimeExecutable(python!);
        if (actual !== python) {
          // Framework launchers use posix_spawn, forbidden by the process-group
          // boundary. A fixed exec wrapper preserves Python's venv discovery
          // without allowing a generated process to escape its group.
          const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
          const names = new Set(['python', ...(await fs.readdir(path.join(venv, 'bin'))).filter(name => /^(?:Python|python[0-9.]*t?)$/.test(name))]);
          for (const name of names) {
            const file = path.join(venv, 'bin', name);
            await fs.rm(file, { force: true });
            await fs.writeFile(file, '#!/bin/sh\n__PYVENV_LAUNCHER__=' + quote(file) + ' exec ' + quote(actual) + ' "$@"\n', { flag: 'wx', mode: 0o700 });
          }
        }
      }
      // Some platforms create a lib64 -> lib alias. Grant writes only to ordinary
      // install directories, never to a tree containing that platform alias.
      const writable = [path.join(venv, 'bin'), path.join(venv, 'lib')];
      await run([venvPython, '-I', '-m', 'ensurepip', '--upgrade', '--default-pip'], [], writable);
      await run([venvPython, '-I', '-m', 'pip', '--isolated', '--disable-pip-version-check', 'install', '--no-index', '--no-cache-dir', '--no-compile',
        '--find-links=' + wheelhouse, '--only-binary=:all:', '--require-hashes', '-r', path.join(installer, 'requirements.lock')], [], writable);
      for (const directory of writable) await installedTree(directory);
      // Venv configuration and scripts contain its absolute location; keep it in
      // place under the clean package and discard only acquisition material.
      python = venvPython;
      await fs.rm(wheelhouse, { recursive: true, force: true });
      await fs.rm(path.join(installer, 'requirements.lock'));
      return result();
    } else throw new Error('Unsupported isolated dependency manager.');
    return result();
  } catch (error) {
    await fs.rm(installer, { recursive: true, force: true }); throw error;
  } finally {
    if (dependencies.manager !== 'pip') await fs.rm(installer, { recursive: true, force: true });
  }
}

export async function prepareIsolatedDependencies(options: IsolatedDependencyOptions, acquisition: DependencyAcquisition = {}): Promise<IsolatedDependencies> {
  try { return await acquireDependencies(options, acquisition); }
  catch (error) {
    if (error instanceof ClassifiedExecutionFailure) throw error;
    if (error instanceof Error && hostResourceErrors.has((error as NodeJS.ErrnoException).code ?? '')) {
      throw new ClassifiedExecutionFailure('infrastructure', 'Host dependency preparation failed: ' + error.message, { cause: error });
    }
    if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) throw new ClassifiedExecutionFailure('infrastructure', error.message, { cause: error });
    throw new ClassifiedExecutionFailure('implementation', error instanceof Error ? error.message : 'The candidate dependency declaration is invalid.', { cause: error });
  }
}
