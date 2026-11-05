import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createIsolatedAgentTools } from '../dist-electron/electron/isolated-agent-tools.js';

const supported = ['darwin', 'linux'].includes(process.platform);
async function fixture(t, options = {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-agent-tools-test-')));
  const workspace = path.join(root, 'candidate'); await fs.mkdir(workspace);
  const tools = new Map(createIsolatedAgentTools({ workspace, executable: process.execPath, ...options }).map(tool => [tool.name, tool]));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, workspace, tools, call: (name, args, signal) => tools.get(name).execute('test', args, signal) };
}

test('isolated Pi overrides create, read, edit and execute real candidate artifacts', { skip: !supported }, async t => {
  const f = await fixture(t);
  assert.deepEqual([...f.tools.keys()], ['read', 'write', 'edit', 'bash']);
  await f.call('write', { path: 'lib/app.mjs', content: 'const first = 2;\nconst second = 3;\nconsole.log(first + second);\n' });
  assert.equal((await f.call('read', { path: 'lib/app.mjs', offset: 2, limit: 1 })).content[0].text, 'const second = 3;\n[Truncated; continue at line 3.]');
  await f.call('edit', { path: 'lib/app.mjs', edits: [{ oldText: 'first = 2', newText: 'first = 4' }, { oldText: 'second = 3', newText: 'second = 5' }] });
  assert.equal((await f.call('bash', { command: 'node lib/app.mjs' })).content[0].text, '9\n');
  assert.equal((await f.call('read', { path: path.join(f.workspace, 'lib/app.mjs') })).details.isolated, true);
});

test('isolated Pi tools cannot read or modify siblings, host secrets, or frozen contracts', { skip: !supported }, async t => {
  const f = await fixture(t); const outside = path.join(f.root, 'host-secret.txt'); await fs.writeFile(outside, 'secret');
  await fs.writeFile(path.join(f.workspace, 'solution-contract.json'), '{}');
  await assert.rejects(f.call('read', { path: outside }), /inside/);
  await assert.rejects(f.call('read', { path: '../host-secret.txt' }), /inside/);
  await assert.rejects(f.call('write', { path: outside, content: 'bad' }), /inside/);
  await assert.rejects(f.call('bash', { command: 'cat ../host-secret.txt' }), /Operation not permitted|Permission denied/);
  await assert.rejects(f.call('write', { path: 'solution-contract.json', content: 'bad' }), /EPERM|EACCES/);
  await assert.rejects(f.call('edit', { path: 'solution-contract.json', edits: [{ oldText: '{}', newText: 'bad' }] }), /EPERM|EACCES/);
  assert.equal(await fs.readFile(outside, 'utf8'), 'secret');
  assert.equal(await fs.readFile(path.join(f.workspace, 'solution-contract.json'), 'utf8'), '{}');
});

test('edit matches original text uniquely and rejects overlaps without partial changes', { skip: !supported }, async t => {
  const f = await fixture(t); await f.call('write', { path: 'text.txt', content: 'abc abc xyz' });
  await assert.rejects(f.call('edit', { path: 'text.txt', edits: [{ oldText: 'abc', newText: 'bad' }] }), /exactly once/);
  await assert.rejects(f.call('edit', { path: 'text.txt', edits: [{ oldText: 'abc xyz', newText: 'bad' }, { oldText: 'xyz', newText: 'bad' }] }), /overlap/);
  await assert.rejects(f.call('edit', { path: 'text.txt', edits: [{ oldText: 'missing', newText: 'bad' }] }), /exactly once/);
  assert.equal(await fs.readFile(path.join(f.workspace, 'text.txt'), 'utf8'), 'abc abc xyz');
});

test('Pi read and mutation reject symlink/hardlink poisoning and support image attachment', { skip: !supported }, async t => {
  const f = await fixture(t); await fs.writeFile(path.join(f.workspace, 'file.txt'), 'safe');
  await fs.symlink(path.join(f.workspace, 'file.txt'), path.join(f.workspace, 'alias'));
  await assert.rejects(f.call('read', { path: 'alias' }), /aliases/);
  await assert.rejects(f.call('write', { path: 'file.txt', content: 'changed' }), /symlinks/);
  await fs.rm(path.join(f.workspace, 'alias')); await fs.link(path.join(f.workspace, 'file.txt'), path.join(f.workspace, 'alias'));
  await assert.rejects(f.call('read', { path: 'alias' }), /aliases/);
  await assert.rejects(f.call('bash', { command: 'true' }), /hardlinks/);
  await fs.rm(path.join(f.workspace, 'alias'));
  await fs.writeFile(path.join(f.workspace, 'pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZfIAAAAASUVORK5CYII=', 'base64'));
  const image = await f.call('read', { path: 'pixel.png' }); assert.equal(image.content[1].type, 'image'); assert.equal(image.content[1].mimeType, 'image/png');
});

test('Pi shell obeys bounded timeout and can be cancelled', { skip: !supported }, async t => {
  const f = await fixture(t);
  await assert.rejects(f.call('bash', { command: 'sleep 20', timeout: 0.1 }), /deadline/);
  await assert.rejects(f.call('bash', { command: 'sleep 20' }, AbortSignal.timeout(100)), /cancelled|aborted/i);
  await assert.rejects(f.call('bash', { command: 'true', timeout: 301 }), /300/);
});
