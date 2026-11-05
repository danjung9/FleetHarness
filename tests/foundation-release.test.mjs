import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { foundationCatalog, prepareFoundationPacket } from '../dist-electron/harness/foundations.js';

const run = promisify(execFile);
const source = fileURLToPath(new URL('../', import.meta.url));
const digest = body => createHash('sha256').update(body).digest('hex');
const recipes = ['messages', 'scheduling', 'offline', 'knowledge', 'readiness', 'cyber', 'workflow', 'governance', 'physics', 'fielding'];
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-foundation-release-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }));
  await fs.cp(path.join(source, 'templates'), path.join(root, 'templates'), { recursive: true });
  return root;
}

test('Windows Git checkout preserves the pinned foundation bytes for every startup recipe', { timeout: 60_000 }, async t => {
  const root = await fixture(t);
  await fs.copyFile(path.join(source, '.gitattributes'), path.join(root, '.gitattributes'));
  const registry = JSON.parse(await fs.readFile(path.join(root, 'templates', 'registry.json'), 'utf8'));
  // Start with the exact newline transformation that broke the Windows release.
  // Git must restore the release's canonical bytes even with autocrlf enabled.
  for (const template of foundationCatalog) for (const name of template.files) {
    const file = path.join(root, 'templates', template.id, name);
    await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace(/\r?\n/g, '\r\n'));
  }
  const git = (...args) => run('git', ['-C', root, '-c', 'core.autocrlf=true', '-c', 'core.safecrlf=false', ...args], { timeout: 15_000, windowsHide: true });
  await git('init', '--quiet');
  await git('add', '--', '.gitattributes', 'templates');
  // checkout-index does not rewrite index-clean existing files. Recreate only
  // this disposable fixture's tracked assets to model a fresh Windows checkout.
  await fs.rm(path.join(root, 'templates'), { recursive: true, force: true });
  await git('checkout-index', '--all', '--force');
  for (const template of foundationCatalog) {
    const pinned = registry.templates.find(item => item.id === template.id);
    for (const name of template.files) {
      const body = await fs.readFile(path.join(root, 'templates', template.id, name));
      assert.equal(digest(body), pinned.files[name], template.id + '/' + name);
      assert.equal(body.includes(Buffer.from('\r\n')), false, template.id + '/' + name);
    }
  }
  for (const recipe of recipes) {
    const packet = await prepareFoundationPacket(recipe, root);
    assert.ok(packet.has('foundation-catalog.json'), recipe);
    assert.ok(packet.has('foundation-guide.md'), recipe);
    assert.deepEqual([...packet], [...await prepareFoundationPacket(recipe, source)], recipe);
  }
});

test('the startup gate still rejects an actual bundled server edit', { timeout: 30_000 }, async t => {
  const root = await fixture(t);
  await fs.appendFile(path.join(root, 'templates', 'node-service', 'server.mjs'), '\n// Unversioned release modification.\n');
  await assert.rejects(prepareFoundationPacket('messages', root), /Bundled foundation checksum mismatch: server\.mjs/);
});

test('release checking refuses to bless CRLF drift even with --update', { timeout: 30_000 }, async t => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root, 'scripts'));
  await fs.copyFile(path.join(source, 'scripts', 'check-foundations.mjs'), path.join(root, 'scripts', 'check-foundations.mjs'));
  await fs.cp(path.join(source, 'dist-electron', 'harness', 'tools'), path.join(root, 'dist-electron', 'harness', 'tools'), { recursive: true });
  const registry = path.join(root, 'templates', 'registry.json');
  const before = await fs.readFile(registry);
  const server = path.join(root, 'templates', 'node-service', 'server.mjs');
  await fs.writeFile(server, (await fs.readFile(server, 'utf8')).replace(/\r?\n/g, '\r\n'));
  for (const args of [[], ['--update']]) {
    await assert.rejects(run(process.execPath, [path.join(root, 'scripts', 'check-foundations.mjs'), ...args], { cwd: root, timeout: 10_000, windowsHide: true }), error => {
      assert.match(error.stderr ?? error.message, /CRLF|line.endings|restore.*LF/i);
      return true;
    });
    assert.deepEqual(await fs.readFile(registry), before, 'A newline-only checkout error must not rewrite the trusted registry');
  }
});
