import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(`Dependency preflight: ${message}. Run npm ci in the source checkout before checking again.`); };

async function json(file) {
  try {
    const bytes = await fs.readFile(file);
    const value = JSON.parse(bytes.toString('utf8'));
    if (!object(value)) throw new Error('expected an object');
    return { value, hash: digest(bytes) };
  } catch (error) { fail(`Cannot read ${file}: ${error.message}`); }
}

function lockPackages(lock, label) {
  if (![2, 3].includes(lock.lockfileVersion) || !object(lock.packages)) {
    fail(`${label} must contain a version 2 or 3 packages map`);
  }
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (!name) continue; // The source lock includes the root; npm's hidden lock does not.
    if (name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..')
      || !/^node_modules\/(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(name)) {
      fail(`Unsupported package path in ${label}: ${name}`);
    }
    if (!object(entry) || entry.link || typeof entry.version !== 'string' || !entry.version) {
      fail(`Unsupported package entry in ${label}: ${name}; linked dependencies are not supported`);
    }
  }
  return lock.packages;
}

/** Offline identity/inventory verification, not a hash of every dependency's code. */
export async function verifyDependencies(workspace, dependencyPath) {
  const source = await json(path.join(workspace, 'package-lock.json'));
  const installed = await json(path.join(dependencyPath, '.package-lock.json'));
  const manifest = await json(path.join(workspace, 'package.json'));
  const wanted = lockPackages(source.value, 'package-lock.json');
  const present = lockPackages(installed.value, 'node_modules/.package-lock.json');
  if (!object(wanted[''])) fail('package-lock.json is missing its root package entry');
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
    if (!isDeepStrictEqual(manifest.value[key] ?? {}, wanted[''][key] ?? {})) {
      fail(`package.json ${key} disagree with package-lock.json`);
    }
  }

  let omittedOptionalPackages = 0;
  for (const [name, entry] of Object.entries(wanted)) {
    if (!name || Object.hasOwn(present, name)) continue;
    if (entry.optional === true) omittedOptionalPackages++;
    else fail(`Required package is missing from the installed lock: ${name}`);
  }
  for (const [name, entry] of Object.entries(present)) {
    if (!name) continue;
    if (!Object.hasOwn(wanted, name)) fail(`Installed package is absent from package-lock.json: ${name}`);
    for (const key of ['version', 'resolved', 'integrity']) {
      if (entry[key] !== wanted[name][key]) fail(`Installed ${name} ${key} disagrees with package-lock.json`);
    }
  }

  const files = [];
  async function visitPackage(directory, name, entry) {
    if (!entry.isDirectory()) fail(`Installed package must be an ordinary directory: ${name}`);
    if (!Object.hasOwn(present, name)) fail(`Installed package is absent from the installed lock: ${name}`);
    const actual = await json(path.join(directory, 'package.json'));
    if (actual.value.version !== present[name].version) fail(`Installed ${name} package.json version disagrees with its lock entry`);
    files.push({ path: name, sha256: actual.hash });
    await visitModules(path.join(directory, 'node_modules'), `${name}/node_modules`, true);
  }
  async function visitModules(directory, prefix, optional = false) {
    let entries;
    try {
      if (!(await fs.lstat(directory)).isDirectory()) fail(`Installed dependency directory is not ordinary: ${prefix}`);
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) { if (optional && error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // npm metadata and executable links, not packages.
      const name = `${prefix}/${entry.name}`, target = path.join(directory, entry.name);
      if (entry.name.startsWith('@')) {
        if (!entry.isDirectory()) fail(`Installed scope must be an ordinary directory: ${name}`);
        for (const child of await fs.readdir(target, { withFileTypes: true })) {
          await visitPackage(path.join(target, child.name), `${name}/${child.name}`, child);
        }
      } else await visitPackage(target, name, entry);
    }
  }
  await visitModules(dependencyPath, 'node_modules');
  const actualPaths = new Set(files.map(file => file.path));
  for (const name of Object.keys(present)) {
    if (name && !actualPaths.has(name)) fail(`Installed lock references a missing package directory: ${name}`);
  }
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return { packageLockHash: source.hash, installedLockHash: installed.hash,
    packageManifestsHash: digest(JSON.stringify(files)), packages: files.length, omittedOptionalPackages };
}
