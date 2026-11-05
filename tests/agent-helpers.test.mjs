import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { agentHelperGuide, inspectAgentHelper, listAgentHelpers } from '../dist-electron/harness/agent-helpers.js';

const execute = promisify(execFile);

async function workspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-agent-helpers-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

function manifest(name, overrides = {}) {
  return {
    schemaVersion: 1, name, description: `Useful ${name} helper`, version: '1.0.0',
    entrypoint: 'run.mjs', tests: ['run.test.mjs'],
    inputDescription: 'An object with value.', outputDescription: 'The same value.', ...overrides,
  };
}

async function helper(root, name, overrides = {}, extraFiles = {}) {
  const directory = path.join(root, '.agent-tools', name);
  const files = {
    'tool.json': JSON.stringify(manifest(name, overrides)),
    'SKILL.md': `# ${name}\nRead the manifest, test, and run with JSON input.`,
    'run.mjs': 'export const identity = input => input;\n',
    'run.test.mjs': "import test from 'node:test'; import assert from 'node:assert/strict'; import { identity } from './run.mjs'; test('identity', () => assert.deepEqual(identity({ value: 7 }), { value: 7 }));\n",
    ...extraFiles,
  };
  for (const [filename, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(directory, filename)), { recursive: true });
    await fs.writeFile(path.join(directory, filename), content);
  }
  return directory;
}

test('discovery is empty until helpers exist and reveals only metadata', async t => {
  const root = await workspace(t);
  assert.deepEqual(await listAgentHelpers(root), { helpers: [], errors: [] });
  await helper(root, 'zebra');
  await helper(root, 'alpha');
  const result = await listAgentHelpers(root);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.helpers.map(item => item.name), ['alpha', 'zebra']);
  assert.deepEqual(result.helpers[0], {
    name: 'alpha', description: 'Useful alpha helper', version: '1.0.0', path: '.agent-tools/alpha/tool.json',
  });
  const inspected = await inspectAgentHelper(root, 'alpha');
  assert.deepEqual(inspected.manifest, manifest('alpha'));
  assert.match(inspected.instructions, /# alpha/);
  assert.match(inspected.hash, /^[0-9a-f]{64}$/);
  assert.equal(inspected.directory, path.join(root, '.agent-tools', 'alpha'));
  await fs.rm(path.join(root, '.agent-tools', 'alpha'), { recursive: true });
  assert.deepEqual((await listAgentHelpers(root)).helpers.map(item => item.name), ['zebra']);
});

test('a malformed helper is isolated from valid helpers', async t => {
  const root = await workspace(t);
  await helper(root, 'working');
  await helper(root, 'broken', {}, { 'tool.json': '{ nope' });
  const result = await listAgentHelpers(root);
  assert.deepEqual(result.helpers.map(item => item.name), ['working']);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].path, '.agent-tools/broken/tool.json');
  assert.match(result.errors[0].error, /valid JSON/);
});

test('discovery reads manifest metadata before loading instructions or implementation', async t => {
  const root = await workspace(t);
  const directory = await helper(root, 'lazy');
  await fs.rm(path.join(directory, 'SKILL.md'));
  await fs.rm(path.join(directory, 'run.mjs'));
  assert.deepEqual((await listAgentHelpers(root)).helpers.map(item => item.name), ['lazy']);
  await assert.rejects(inspectAgentHelper(root, 'lazy'), /entrypoint does not exist/);
});

test('discovery and inspection never execute helper modules', async t => {
  const root = await workspace(t);
  const sentinel = path.join(root, 'executed');
  await helper(root, 'inert', {}, {
    'run.mjs': `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(sentinel)}, 'ran'); throw new Error('executed');`,
    'run.test.mjs': `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(sentinel)}, 'ran');`,
  });
  assert.equal((await listAgentHelpers(root)).helpers.length, 1);
  await inspectAgentHelper(root, 'inert');
  await assert.rejects(fs.access(sentinel), { code: 'ENOENT' });
});

test('hashes are deterministic and invalidate on instructions, tests and nested data changes', async t => {
  const root = await workspace(t);
  const directory = await helper(root, 'hashed', {}, { 'fixtures/input.json': '{"value":7}', 'fixtures/other.json': '[]' });
  const before = await inspectAgentHelper(root, 'hashed');
  assert.equal((await inspectAgentHelper(root, 'hashed')).hash, before.hash);
  const other = await workspace(t);
  await helper(other, 'hashed', {}, { 'fixtures/other.json': '[]', 'fixtures/input.json': '{"value":7}' });
  assert.equal((await inspectAgentHelper(other, 'hashed')).hash, before.hash);
  let previous = before.hash;
  for (const file of ['fixtures/input.json', 'SKILL.md', 'run.test.mjs', 'run.mjs']) {
    await fs.appendFile(path.join(directory, file), '\nchanged');
    const changed = await inspectAgentHelper(root, 'hashed');
    assert.notEqual(changed.hash, previous, `${file} must participate in the hash`);
    previous = changed.hash;
  }
});

test('valid nested modules and bounded package data are supported', async t => {
  const root = await workspace(t);
  await helper(root, 'nested', { entrypoint: 'src/run.cjs', tests: ['tests/run.test.cjs'] }, {
    'src/run.cjs': 'module.exports = input => input;',
    'tests/run.test.cjs': 'require("node:test")("a test", () => {});',
    'fixtures/sample.csv': 'name,value\nAda,7\n',
  });
  const result = await inspectAgentHelper(root, 'nested');
  assert.equal(result.manifest.entrypoint, 'src/run.cjs');
  assert.deepEqual(result.manifest.tests, ['tests/run.test.cjs']);
});

test('invalid manifests cannot register unbounded metadata or missing code and tests', async t => {
  const cases = [
    [{ schemaVersion: 2 }, /schemaVersion/],
    [{ name: 'different' }, /match/],
    [{ description: 'a'.repeat(501) }, /description/],
    [{ version: 'latest' }, /semantic version/],
    [{ inputDescription: '' }, /inputDescription/],
    [{ outputDescription: 'a'.repeat(2001) }, /outputDescription/],
    [{ command: 'bash arbitrary.sh' }, /unsupported/],
    [{ entrypoint: 'missing.mjs' }, /does not exist/],
    [{ entrypoint: '../outside.mjs' }, /path segment/],
    [{ entrypoint: '/tmp/outside.mjs' }, /path segment/],
    [{ entrypoint: 'sub\\outside.mjs' }, /path segment/],
    [{ entrypoint: '.private/run.mjs' }, /path segment/],
    [{ entrypoint: 'node_modules/run.mjs' }, /path segment/],
    [{ tests: [] }, /between 1 and 16/],
    [{ tests: ['missing.test.mjs'] }, /does not exist/],
    [{ tests: ['run.mjs'] }, /separate from the entrypoint/],
    [{ tests: ['run.test.mjs', 'run.test.mjs'] }, /duplicate/],
  ];
  for (const [overrides, expected] of cases) {
    const root = await workspace(t);
    await helper(root, 'invalid', overrides);
    await assert.rejects(inspectAgentHelper(root, 'invalid'), expected, JSON.stringify(overrides));
  }
});

test('usage instructions are required and bounded', async t => {
  const root = await workspace(t);
  const directory = await helper(root, 'instructions');
  await fs.rm(path.join(directory, 'SKILL.md'));
  await assert.rejects(inspectAgentHelper(root, 'instructions'), /SKILL.md/);
  await fs.writeFile(path.join(directory, 'SKILL.md'), ' ');
  await assert.rejects(inspectAgentHelper(root, 'instructions'), /nonempty/);
  await fs.writeFile(path.join(directory, 'SKILL.md'), 'a'.repeat(32769));
  await assert.rejects(inspectAgentHelper(root, 'instructions'), /32 KiB/);
});

test('helper names, nested hidden files and reserved directories are rejected', async t => {
  const root = await workspace(t);
  for (const name of ['../elsewhere', 'UPPER', '.private', 'node_modules', 'con', 'nul', 'a'.repeat(65)]) {
    await assert.rejects(inspectAgentHelper(root, name), /Helper name/);
  }
  const directory = await helper(root, 'paths');
  await fs.writeFile(path.join(directory, '.env'), 'SECRET=not-loaded');
  await assert.rejects(inspectAgentHelper(root, 'paths'), /Hidden and reserved/);
  await fs.rm(path.join(directory, '.env'));
  await fs.mkdir(path.join(directory, 'node_modules'));
  await assert.rejects(inspectAgentHelper(root, 'paths'), /Hidden and reserved/);
});

test('symlinks are rejected at the catalog, package, directory and file levels', async t => {
  const root = await workspace(t);
  const targetRoot = await workspace(t);
  const directory = await helper(targetRoot, 'real');
  await fs.symlink(path.join(targetRoot, '.agent-tools'), path.join(root, '.agent-tools'), 'dir');
  await assert.rejects(inspectAgentHelper(root, 'real'), /symlinks/);
  assert.match((await listAgentHelpers(root)).errors[0].error, /symlinks/);
  await fs.rm(path.join(root, '.agent-tools'));
  await fs.mkdir(path.join(root, '.agent-tools'));
  await fs.symlink(directory, path.join(root, '.agent-tools', 'linked'), 'dir');
  await assert.rejects(inspectAgentHelper(root, 'linked'), /symlinks/);
  const local = await helper(root, 'local');
  await fs.symlink(directory, path.join(local, 'nested'), 'dir');
  await assert.rejects(inspectAgentHelper(root, 'local'), /symlinks/);
  await fs.rm(path.join(local, 'nested'));
  await fs.symlink(path.join(directory, 'run.mjs'), path.join(local, 'linked.mjs'));
  await assert.rejects(inspectAgentHelper(root, 'local'), /symlinks/);
  await fs.rm(path.join(local, 'linked.mjs'));
  await fs.symlink(path.join(directory, 'missing.mjs'), path.join(local, 'dangling.mjs'));
  await assert.rejects(inspectAgentHelper(root, 'local'), /symlinks/);
});

test('package file sizes, file counts, total bytes and nesting are bounded', async t => {
  const root = await workspace(t);
  const large = await helper(root, 'large');
  await fs.writeFile(path.join(large, 'large.json'), Buffer.alloc(1024 * 1024 + 1));
  await assert.rejects(inspectAgentHelper(root, 'large'), /byte limit/);
  const many = await helper(root, 'many');
  await Promise.all(Array.from({ length: 125 }, (_, index) => fs.writeFile(path.join(many, `file-${index}.json`), '{}')));
  await assert.rejects(inspectAgentHelper(root, 'many'), /128-file limit/);
  const total = await helper(root, 'total');
  for (let index = 0; index < 4; index++) await fs.writeFile(path.join(total, `file-${index}.json`), Buffer.alloc(1024 * 1024));
  await assert.rejects(inspectAgentHelper(root, 'total'), /byte limit/);
  const deep = await helper(root, 'deep');
  await fs.mkdir(path.join(deep, ...Array(9).fill('nested')), { recursive: true });
  await assert.rejects(inspectAgentHelper(root, 'deep'), /depth limit/);
});

test('catalog discovery is bounded and reports truncation', async t => {
  const root = await workspace(t);
  await fs.mkdir(path.join(root, '.agent-tools'));
  await Promise.all(Array.from({ length: 65 }, (_, index) => fs.mkdir(path.join(root, '.agent-tools', `helper-${index}`))));
  const result = await listAgentHelpers(root);
  assert.equal(result.errors.length, 65);
  assert.ok(result.errors.some(item => item.path === '.agent-tools' && /64-entry limit/.test(item.error)));
});

test('the guide contains a complete working helper with implementation tests and JSON CLI output', async t => {
  const root = await workspace(t);
  const blocks = [...agentHelperGuide.matchAll(/```(?:json|markdown|javascript)\n([\s\S]*?)\n```/g)].map(match => match[1]);
  assert.equal(blocks.length, 4);
  const directory = path.join(root, '.agent-tools', 'trim-names');
  await fs.mkdir(directory, { recursive: true });
  for (const [index, filename] of ['tool.json', 'SKILL.md', 'run.mjs', 'run.test.mjs'].entries()) {
    await fs.writeFile(path.join(directory, filename), blocks[index]);
  }
  const inspected = await inspectAgentHelper(root, 'trim-names');
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const tests = await execute(process.execPath, ['--test', '--test-reporter=tap', ...inspected.manifest.tests], { cwd: directory, env });
  assert.match(tests.stdout, /# pass 3/);
  const child = execFile(process.execPath, [path.join(directory, inspected.manifest.entrypoint)], { cwd: root });
  child.stdin.end(JSON.stringify({ records: [{ name: ' Ada ', id: 7 }] }));
  const output = await new Promise((resolve, reject) => {
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(stderr)));
  });
  assert.deepEqual(JSON.parse(output), { records: [{ name: 'Ada', id: 7 }] });
});
