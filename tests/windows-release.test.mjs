import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { validateBuild, compareBuilds, promotionAllowed, publishWindows, GitHub } from '../scripts/publish-windows.mjs';

const sha = 'a'.repeat(40), priorSha = 'b'.repeat(40);
const data = Buffer.from('fixture installer bytes');
const digest = createHash('sha256').update(data).digest('hex');
const env = {
  GITHUB_REPOSITORY: 'danjung9/FleetHarness', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push',
  GITHUB_SHA: sha, GITHUB_RUN_ID: '1000', GITHUB_RUN_NUMBER: '24', GITHUB_RUN_ATTEMPT: '1',
};
const build = {
  schemaVersion: 1, version: '1.24.2', sha, revision: sha, platform: 'win32', arch: 'x64', dirty: false, baseline: false,
  runId: '1000', runNumber: '24', runAttempt: '1', sha256: digest,
  sourceUrl: `https://github.com/danjung9/FleetHarness/commit/${sha}`,
  runUrl: 'https://github.com/danjung9/FleetHarness/actions/runs/1000', installer: 'AppYard-1.24.2-windows-x64-setup.exe',
};

test('publishing requires the exact validated main run and sortable build identity', () => {
  assert.equal(validateBuild(build, env), build);
  assert.equal(validateBuild(build, { ...env, GITHUB_EVENT_NAME: 'workflow_dispatch' }), build);
  for (const change of [
    { GITHUB_REF: 'refs/heads/feature' }, { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REPOSITORY: 'someone/fork' }, { GITHUB_SHA: priorSha }, { GITHUB_RUN_ATTEMPT: '2' },
  ]) assert.throws(() => validateBuild(build, { ...env, ...change }));
  for (const change of [
    { sha256: 'bad' }, { installer: '../escape.exe' }, { revision: priorSha }, { version: '1.24.1' },
    { sourceUrl: 'https://example.com' }, { platform: 'darwin' }, { runId: 1001 }, { dirty: true }, { baseline: true },
  ]) assert.throws(() => validateBuild({ ...build, ...change }, env));
});

test('promotion protects against slow runs, reruns of old source and divergent histories', () => {
  const prior = { ...build, runNumber: 23, runAttempt: 9 };
  assert.equal(compareBuilds(build, prior), 1);
  assert.equal(compareBuilds(prior, build), -1);
  assert.equal(promotionAllowed(build, null), true);
  assert.equal(promotionAllowed(build, prior, 'ahead'), true);
  assert.equal(promotionAllowed({ ...build, runAttempt: 2 }, build, 'identical'), true);
  assert.equal(promotionAllowed(build, build, 'identical'), false);
  assert.equal(promotionAllowed(prior, build, 'ahead'), false);
  assert.equal(promotionAllowed(build, prior, 'behind'), false);
  assert.equal(promotionAllowed(build, prior, 'diverged'), false);
});

async function fixture(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'windows-release-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, build.installer), data);
  await fs.writeFile(path.join(directory, 'SHA256SUMS.txt'), `${digest}  ${build.installer}\n`);
  await fs.writeFile(path.join(directory, 'windows-build.json'), JSON.stringify(build));
  const calls = [], assets = new Map(); let published = false;
  const api = {
    async json(endpoint, request = {}) {
      calls.push({ endpoint, ...request });
      if (endpoint.endsWith('/FleetHarness')) return { private: true, default_branch: 'main' };
      if (endpoint.endsWith('/git/ref/heads/main')) return { object: { sha } };
      if (endpoint.includes('/compare/')) return { status: endpoint.includes(priorSha) ? options.comparison ?? 'ahead' : options.source ?? 'identical' };
      if (endpoint.includes('/releases/tags/')) return options.existing ? { id: 7 } : null;
      if (endpoint.includes('/git/ref/tags/')) return published ? { object: { type: 'commit', sha: options.wrongTag ? priorSha : sha } } : null;
      if (endpoint.endsWith('/releases/latest')) return options.previous ? {
        tag_name: 'windows-v1.23.2-r999-a1', draft: false, prerelease: false,
        assets: [{ name: 'windows-build.json', url: 'https://api.github.com/previous', size: 500 }],
      } : null;
      if (endpoint.endsWith('/releases') && request.method === 'POST') return { id: 99, upload_url: 'https://uploads.github.com/assets{?name}' };
      if (endpoint.startsWith('https://uploads.github.com/')) {
        const name = new URL(endpoint).searchParams.get('name');
        const bytes = Buffer.from(await request.body.arrayBuffer());
        const url = `https://api.github.com/assets/${name}`; assets.set(url, bytes);
        return { name, url, size: bytes.length, state: 'uploaded' };
      }
      if (endpoint.endsWith('/releases/99') && request.method === 'PATCH') {
        published = true;
        return { immutable: options.mutable !== true, html_url: 'https://github.com/danjung9/FleetHarness/releases/tag/fixture' };
      }
      throw new Error(`Unexpected fixture endpoint ${endpoint}`);
    },
    async bytes(url) {
      if (url.endsWith('/previous')) return new Response(JSON.stringify({ ...build, sha: priorSha, ...options.previous }));
      return new Response(options.badDownload ? Buffer.from('corrupt') : assets.get(url));
    },
  };
  return { directory, api, calls, log: () => {}, env };
}

test('publication verifies every private asset, pins source and promotes only after immutable release', async t => {
  const context = await fixture(t);
  const result = await publishWindows(context);
  assert.equal(result.promoted, true);
  const create = context.calls.find(call => call.method === 'POST' && call.endpoint.endsWith('/releases'));
  assert.equal(create.json.draft, true); assert.equal(create.json.make_latest, 'false'); assert.equal(create.json.target_commitish, sha);
  assert.equal(context.calls.filter(call => call.endpoint.startsWith('https://uploads.github.com')).length, 3);
  assert.deepEqual(context.calls.at(-1).json, { make_latest: 'true' });
});

for (const [name, options, expected] of [
  ['corrupt download', { badDownload: true }, /SHA-256/],
  ['mutable release', { mutable: true }, /immutability/],
  ['wrong tag source', { wrongTag: true }, /tag/],
  ['existing release', { existing: true }, /already exists/],
  ['removed main commit', { source: 'diverged' }, /no longer contained/],
]) test(`${name} never promotes Latest`, async t => {
  const context = await fixture(t, options);
  await assert.rejects(publishWindows(context), expected);
  assert.equal(context.calls.some(call => call.json?.make_latest === 'true'), false);
});

test('a slow older build is retained without replacing a newer success', async t => {
  const context = await fixture(t, { previous: { runNumber: 25 }, comparison: 'behind' });
  assert.equal((await publishWindows(context)).promoted, false);
  assert.equal(context.calls.some(call => call.json?.make_latest === 'true'), false);
});

test('API refuses token disclosure to an unexpected origin and distinguishes 404 from permission failure', async () => {
  let calls = 0;
  const api = new GitHub('fixture-token', async () => { calls++; return new Response('', { status: 403 }); });
  await assert.rejects(api.json('https://example.com/assets'), /origin/); assert.equal(calls, 0);
  await assert.rejects(api.json('/repos/x/y', { missing: true }), /403/);
  const missing = new GitHub('fixture-token', async () => new Response('', { status: 404 }));
  assert.equal(await missing.json('/repos/x/y', { missing: true }), null);
});
