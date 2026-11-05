import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const directories = ['dist-electron', 'skills', 'templates'];
const files = ['scripts/benchmark-factory.mjs', 'scripts/factory-benchmark-inputs.mjs',
  'scripts/factory-browser-holdout.mjs', 'scripts/factory-benchmark-host.mjs',
  'package.json', 'package-lock.json', 'node_modules/.package-lock.json'];

/** Observed local artifacts, not an attestation of cached modules or dependency contents. */
export function captureBenchmarkHost(root) {
  const artifacts = [];
  if (!fs.lstatSync(path.join(root, 'scripts')).isDirectory()) throw new Error('Missing benchmark host scripts directory.');
  const visit = relative => {
    const absolute = path.join(root, relative), stat = fs.lstatSync(absolute);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) {
        if (name !== '.DS_Store') visit(`${relative}/${name}`);
      }
    } else if (stat.isFile()) {
      const bytes = fs.readFileSync(absolute);
      artifacts.push({ path: relative, sha256: sha256(bytes), bytes: bytes.length, mode: stat.mode & 0o777 });
    } else throw new Error('Benchmark host artifacts must be ordinary files and directories.');
  };
  for (const directory of directories) {
    const count = artifacts.length;
    if (!fs.lstatSync(path.join(root, directory)).isDirectory()) throw new Error('Missing benchmark host artifact directory.');
    visit(directory);
    if (artifacts.length === count) throw new Error('Empty benchmark host artifact directory.');
  }
  for (const file of files) {
    // Private validation workspaces may link their installed dependency root.
    // The lock itself, and every source artifact, must still be a regular file.
    if (!fs.lstatSync(path.join(root, file)).isFile()) throw new Error('Missing benchmark host artifact file.');
    visit(file);
  }
  artifacts.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const manifest = { schemaVersion: 1, artifacts,
    runtime: { node: process.version, versions: Object.fromEntries(Object.entries(process.versions).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)),
      platform: process.platform, arch: process.arch } };
  const bytes = JSON.stringify(manifest, null, 2) + '\n';
  return { manifest, bytes, sha256: sha256(bytes) };
}
