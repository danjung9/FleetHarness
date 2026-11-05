import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../templates/', import.meta.url));
const registryPath = path.join(root, 'registry.json');
const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
const update = process.argv.includes('--update');
if (process.argv.slice(2).some(arg => arg !== '--update')) throw new Error('Usage: node scripts/check-foundations.mjs [--update]');
if (registry.schemaVersion !== 1 || !Array.isArray(registry.templates)) throw new Error('Invalid foundation registry.');
let checked = 0;
const changed = [];
for (const template of registry.templates) {
  if (!/^[a-z][a-z0-9-]*$/.test(template.id) || !/^\d+\.\d+\.\d+$/.test(template.version)) throw new Error('Invalid template identity.');
  for (const [name, digest] of Object.entries(template.files)) {
    const parts = [template.id, ...name.split('/')];
    if (parts.some(part => !/^[A-Za-z0-9_.-]+$/.test(part) || part === '.' || part === '..')) throw new Error('Invalid template path.');
    let current = root;
    for (const [index, part] of parts.entries()) {
      current = path.join(current, part);
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink() || (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) throw new Error('Template paths must be ordinary files/directories: ' + current);
    }
    const actual = createHash('sha256').update(await fs.readFile(current)).digest('hex');
    if (actual !== digest) changed.push(template.id + '/' + name);
    template.files[name] = actual;
    checked++;
  }
}
if (registry.computation?.version !== '1.0.0' || !registry.computation.files) throw new Error('Missing versioned computation registry.');
for (const [name, digest] of Object.entries(registry.computation.files)) {
  if (!/^[a-z]+\.js$/.test(name)) throw new Error('Invalid computation filename.');
  const source = fileURLToPath(new URL('../dist-electron/harness/tools/' + name, import.meta.url));
  const actual = createHash('sha256').update(await fs.readFile(source)).digest('hex');
  if (actual !== digest) changed.push('computation/' + name);
  registry.computation.files[name] = actual;
  checked++;
}
if (update) {
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2) + '\n');
  console.log(`Updated ${changed.length} hashes across ${checked} starter files. Review template versions with the change.`);
} else if (changed.length) {
  throw new Error('Foundation checksum mismatch: ' + changed.join(', ') + '. Review the source/version change, then use --update.');
} else console.log(`Verified ${checked} pinned files across ${registry.templates.length} application foundations.`);
