import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fetchWindowsBaseline } from '../scripts/fetch-windows-baseline.mjs';

const repository = 'danjung9/FleetHarness';
const base = `/repos/${repository}`;
const sha = 'a'.repeat(40), otherSha = 'b'.repeat(40);
const installer = Buffer.from('real prior installer fixture');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const build = {
  schemaVersion: 1, version: '1.24.2', sha, revision: sha, platform: 'win32', arch: 'x64', dirty: false, baseline: false,
  runId: '1000', runNumber: 24, runAttempt: 1, sha256: digest(installer),
  sourceUrl: `https://github.com/${repository}/commit/${sha}`,
  runUrl: `https://github.com/${repository}/actions/runs/1000`, installer: 'AppYard-1.24.2-windows-x64-setup.exe',
};
const tag = 'windows-v1.24.2-r1000-a1';

async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-baseline-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const directory = path.join(root, 'release-baseline');
  const metadata = Buffer.from(JSON.stringify({ ...build, ...options.build }));
  const checksum = Buffer.from(options.checksum ?? `${build.sha256}  ${build.installer}\n`);
  const data = new Map(), calls = [];
  const assets = [['windows-build.json', metadata], [build.installer, installer], ['SHA256SUMS.txt', checksum]].map(([name, bytes], i) => {
    const id = i + 1, url = `https://api.github.com${base}/releases/assets/${id}`;
    data.set(url, bytes);
    return { name, id, url, state: 'uploaded', size: bytes.length, digest: `sha256:${digest(bytes)}` };
  });
  const release = {
    id: 99, url: `https://api.github.com${base}/releases/99`, tag_name: tag,
    html_url: `https://github.com/${repository}/releases/tag/${tag}`, draft: false, prerelease: false, immutable: true,
    assets, ...options.release,
  };
  const api = {
    async json(endpoint) {
      calls.push(endpoint);
      if (options.errorAt && endpoint.includes(options.errorAt)) throw new Error('GitHub returned 403.');
      if (endpoint === base) return { full_name: repository, default_branch: 'main' };
      if (endpoint.endsWith('/releases/latest')) return options.noLatest ? null : release;
      if (endpoint.includes('/releases?')) return options.history ?? [];
      if (endpoint.includes('/git/ref/tags/')) return { object: options.annotated ? { type: 'tag', sha: otherSha } : { type: 'commit', sha: options.wrongSha ? otherSha : sha } };
      if (endpoint.includes('/git/tags/')) return { object: { type: 'commit', sha } };
      throw new Error('Unexpected endpoint: ' + endpoint);
    },
    async bytes(url) {
      calls.push(url);
      if (options.corruptInstaller && url.endsWith('/2')) return new Response(Buffer.alloc(installer.length, 120));
      if (options.truncatedMetadata && url.endsWith('/1')) return new Response(metadata.subarray(0, 10));
      return new Response(data.get(url));
    },
  };
  return { directory, root, api, calls, log: () => {} };
}

test('an empty published history explicitly selects the first-release synthetic baseline', async t => {
  const context = await fixture(t, { noLatest: true });
  assert.deepEqual(await fetchWindowsBaseline(context), { synthetic: true });
  assert.ok(context.calls.includes(base));
  assert.ok(context.calls.some(endpoint => endpoint.includes('/releases?')));
  assert.deepEqual(await fs.readdir(context.root), []);
});

test('unpublished drafts permit first-release fallback', async t => {
  const context = await fixture(t, { noLatest: true, history: [{ draft: true }] });
  assert.deepEqual(await fetchWindowsBaseline(context), { synthetic: true });
});

test('a real immutable prior release is downloaded and bound to its original source identity', async t => {
  const context = await fixture(t);
  assert.deepEqual(await fetchWindowsBaseline(context), { synthetic: false, tag, version: build.version, sha });
  assert.deepEqual(await fs.readFile(path.join(context.directory, build.installer)), installer);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(context.directory, 'windows-build.json'), 'utf8')), build);
  assert.equal((await fs.readFile(path.join(context.directory, 'SHA256SUMS.txt'), 'utf8')).trim(), `${build.sha256}  ${build.installer}`);
  assert.deepEqual(await fs.readdir(context.root), ['release-baseline']);
});

test('annotated immutable tags are resolved to their source commit', async t => {
  const context = await fixture(t, { annotated: true });
  assert.equal((await fetchWindowsBaseline(context)).sha, sha);
  assert.ok(context.calls.some(endpoint => endpoint.includes('/git/tags/')));
});

for (const [name, options, expected] of [
  ['published history without Latest', { noLatest: true, history: [{ draft: false, prerelease: true }] }, /Published releases exist/],
  ['missing repository permission', { errorAt: base }, /403/],
  ['release API permission failure', { errorAt: '/releases/latest' }, /403/],
  ['mutable release', { release: { immutable: false } }, /immutable/],
  ['wrong release identity', { release: { tag_name: 'windows-v1.24.2-r999-a1' } }, /identity/],
  ['wrong source tag', { wrongSha: true }, /full source SHA/],
  ['wrong metadata source link', { build: { sourceUrl: 'https://example.com' } }, /source/],
  ['truncated metadata', { truncatedMetadata: true }, /integrity/],
  ['mismatched checksum file', { checksum: 'incorrect' }, /checksum file/],
  ['corrupt installer', { corruptInstaller: true }, /SHA-256/],
]) test(`${name} fails the upgrade gate without a synthetic fallback`, async t => {
  const context = await fixture(t, options);
  await assert.rejects(fetchWindowsBaseline(context), expected);
  assert.deepEqual(await fs.readdir(context.root), [], 'No incomplete baseline is usable after a failed download.');
});

test('existing baseline files are preserved instead of silently overwritten', async t => {
  const context = await fixture(t);
  await fs.mkdir(context.directory);
  await fs.writeFile(path.join(context.directory, 'keep.txt'), 'existing baseline');
  await assert.rejects(fetchWindowsBaseline(context), /already exists/);
  assert.equal(await fs.readFile(path.join(context.directory, 'keep.txt'), 'utf8'), 'existing baseline');
});
