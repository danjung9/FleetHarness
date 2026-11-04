import { createHash } from 'node:crypto';
import { createReadStream, openAsBlob } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RELEASE_REPOSITORY = 'danjung9/FleetHarness';
const API = 'https://api.github.com';
const SHA = /^[a-f0-9]{40}$/;
const integer = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;

export function validateBuild(build, env) {
  if (env.GITHUB_REPOSITORY !== RELEASE_REPOSITORY || env.GITHUB_REF !== 'refs/heads/main'
    || !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)) {
    throw new Error('Windows publishing is restricted to push/manual runs from danjung9/FleetHarness main.');
  }
  if (build.schemaVersion !== 1 || !SHA.test(build.sha) || build.sha !== env.GITHUB_SHA
    || build.revision !== build.sha || build.platform !== 'win32' || build.arch !== 'x64' || build.dirty !== false || build.baseline !== false
    || !/^\d+\.\d+\.\d+$/.test(build.version) || !/^[a-f0-9]{64}$/.test(build.sha256)) {
    throw new Error('Windows build metadata does not match the validated commit/platform.');
  }
  for (const [field, variable] of [['runId', 'GITHUB_RUN_ID'], ['runNumber', 'GITHUB_RUN_NUMBER'], ['runAttempt', 'GITHUB_RUN_ATTEMPT']]) {
    if (!integer(build[field]) || String(build[field]) !== env[variable]) throw new Error(`Build ${field} does not match this run. Re-run all jobs to rebuild the artifact.`);
  }
  const version = `${1 + Math.floor(Number(build.runNumber) / 65536)}.${Number(build.runNumber) % 65536}.${Number(build.runAttempt) * 2}`;
  if (build.version !== version || version.split('.').some(part => Number(part) > 65535)) throw new Error('Release version does not match the sortable Windows build identity.');
  if (build.sourceUrl !== `https://github.com/${RELEASE_REPOSITORY}/commit/${build.sha}`
    || build.runUrl !== `https://github.com/${RELEASE_REPOSITORY}/actions/runs/${build.runId}`
    || build.installer !== `AppYard-${build.version}-windows-x64-setup.exe`) {
    throw new Error('Unexpected source, run, or installer identity.');
  }
  return build;
}

export function compareBuilds(left, right) {
  for (const field of ['runNumber', 'runAttempt']) {
    if (!integer(left[field]) || !integer(right[field])) throw new Error(`Invalid ${field} in Windows release metadata.`);
    const difference = Number(left[field]) - Number(right[field]);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

export function promotionAllowed(candidate, previous, comparison) {
  if (!previous) return true;
  if (compareBuilds(candidate, previous) <= 0) return false;
  // A newer workflow run must not promote a rerun of older/divergent source.
  return ['ahead', 'identical'].includes(comparison);
}

async function digestFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export class GitHub {
  constructor(token, fetcher = fetch) {
    if (!token) throw new Error('GITHUB_TOKEN is required for release publishing.');
    this.token = token; this.fetcher = fetcher;
  }
  async request(endpoint, { method = 'GET', json, body, headers = {}, missing = false } = {}) {
    const url = new URL(endpoint, API);
    if (![API, 'https://uploads.github.com'].includes(url.origin)) throw new Error('Unexpected GitHub API origin.');
    const response = await this.fetcher(url, {
      method, headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'AppYard-Windows-release',
        ...(json === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      body: json === undefined ? body : JSON.stringify(json), signal: AbortSignal.timeout(600_000),
    });
    if (missing && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub ${method} ${url.pathname} returned ${response.status}. Check repository/Actions permissions and release settings.`);
    return response;
  }
  async json(endpoint, options) { const response = await this.request(endpoint, options); return response ? response.json() : null; }
  async bytes(endpoint) { return this.request(endpoint, { headers: { Accept: 'application/octet-stream' } }); }
}

async function verifyAsset(api, asset, expected) {
  if (asset.state !== 'uploaded' || asset.size !== expected.size) throw new Error(`Release asset ${asset.name} was not completely uploaded.`);
  const response = await api.bytes(asset.url);
  const hash = createHash('sha256'); let size = 0;
  for await (const chunk of response.body) { size += chunk.length; hash.update(chunk); }
  if (size !== expected.size || hash.digest('hex') !== expected.sha256) throw new Error(`Downloaded release asset ${asset.name} failed SHA-256 verification.`);
}

async function releaseMetadata(api, release) {
  if (!release.tag_name.startsWith('windows-v') || release.draft || release.prerelease) {
    throw new Error('The repository Latest release is not an AppYard Windows release. Resolve the shared Latest channel before promotion.');
  }
  const asset = release.assets.find(item => item.name === 'windows-build.json');
  if (!asset || asset.size > 32_768) throw new Error('Latest Windows release has no valid build metadata. Refusing to overwrite it.');
  const response = await api.bytes(asset.url);
  const build = JSON.parse(await response.text());
  if (!SHA.test(build.sha)) throw new Error('Latest Windows release has an invalid source SHA.');
  return build;
}

export async function publishWindows({ directory = 'release', env = process.env, api = new GitHub(env.GITHUB_TOKEN), log = console.log } = {}) {
  const build = validateBuild(JSON.parse(await fs.readFile(path.join(directory, 'windows-build.json'), 'utf8')), env);
  const base = `/repos/${RELEASE_REPOSITORY}`;
  const repository = await api.json(base);
  if (repository.default_branch !== 'main') throw new Error('The release source must remain the repository default branch main.');
  log(`Publishing ${build.version} from ${build.sha}; repository visibility: ${repository.visibility ?? (repository.private ? 'private' : 'public')}.`);
  const main = await api.json(`${base}/git/ref/heads/main`);
  const source = await api.json(`${base}/compare/${build.sha}...${main.object.sha}`);
  if (!['ahead', 'identical'].includes(source.status)) throw new Error('The validated source commit is no longer contained in main.');

  const installer = path.join(directory, build.installer);
  if (await digestFile(installer) !== build.sha256) throw new Error('The installer differs from its validated build metadata.');
  const checksumName = 'SHA256SUMS.txt';
  const checksum = await fs.readFile(path.join(directory, checksumName), 'utf8');
  if (checksum.trim() !== `${build.sha256}  ${build.installer}`) throw new Error('Installer checksum file does not match the release metadata.');
  const files = await Promise.all([build.installer, checksumName, 'windows-build.json'].map(async name => ({
    name, path: path.join(directory, name), size: (await fs.stat(path.join(directory, name))).size,
    sha256: await digestFile(path.join(directory, name)),
  })));
  const tag = `windows-v${build.version}-r${build.runId}-a${build.runAttempt}`;
  // Never replace an asset/tag, even when retrying a failed publication.
  if (await api.json(`${base}/releases/tags/${tag}`, { missing: true })) throw new Error(`Release ${tag} already exists. Re-run all jobs for a new immutable build identity.`);
  if (await api.json(`${base}/git/ref/tags/${tag}`, { missing: true })) throw new Error(`Tag ${tag} already exists. Never reuse an immutable release tag.`);
  const latest = await api.json(`${base}/releases/latest`, { missing: true });
  const previous = latest ? await releaseMetadata(api, latest) : null;
  const comparison = previous ? (await api.json(`${base}/compare/${previous.sha}...${build.sha}`)).status : undefined;
  const promote = promotionAllowed(build, previous, comparison);
  const release = await api.json(`${base}/releases`, { method: 'POST', json: {
    tag_name: tag, target_commitish: build.sha, name: `AppYard ${build.version} — Windows x64`,
    draft: true, prerelease: false, make_latest: 'false',
    body: [
      `Windows x64 host installer built from [${build.sha}](${build.sourceUrl}).`, '',
      `Build [${build.runId}, attempt ${build.runAttempt}](${build.runUrl}); version \`${build.version}\`.`, '',
      'Validated on Windows: runtime/harness regression suites, installed app mock-provider build, verification, stop/restart, source/executable export, and upgrade with saved data.', '',
      `Installer SHA-256: \`${build.sha256}\`. Check the attached checksum before installation.`, '',
      'Run the newer installer to upgrade. This release does not include an in-app background updater.',
      repository.private ? 'This repository is private. Downloads require a GitHub account with repository access.' : 'Downloads are publicly accessible.',
      '', 'The installer is unsigned unless a signing certificate was configured for this build. See docs/windows-releases.md for setup and limitations.',
    ].join('\n'),
  } });
  const uploadUrl = release.upload_url.replace(/\{.*$/, '');
  for (const file of files) {
    const asset = await api.json(`${uploadUrl}?name=${encodeURIComponent(file.name)}`, { method: 'POST',
      headers: { 'Content-Type': file.name.endsWith('.exe') ? 'application/vnd.microsoft.portable-executable' : 'application/octet-stream' },
      body: await openAsBlob(file.path),
    });
    // Authenticated download proves the bytes are available in private repositories.
    await verifyAsset(api, asset, file);
  }
  const published = await api.json(`${base}/releases/${release.id}`, { method: 'PATCH', json: { draft: false, make_latest: 'false' } });
  if (published.immutable !== true) throw new Error('Release immutability is not enabled. An administrator must enable it in repository Settings > Releases before publishing another build. This build was not promoted.');
  const reference = await api.json(`${base}/git/ref/tags/${tag}`);
  if (reference.object.type !== 'commit' || reference.object.sha !== build.sha) throw new Error('Published release tag does not match the validated commit.');
  log(`Immutable installer: ${published.html_url}`);
  if (!promote) { log('A newer successful/source build already owns Latest. Retained this validated release for rollback.'); return { tag, promoted: false }; }
  // Final mutation only, under the workflow's shared publisher lock.
  await api.json(`${base}/releases/${release.id}`, { method: 'PATCH', json: { make_latest: 'true' } });
  log(`Latest successful Windows download: https://github.com/${RELEASE_REPOSITORY}/releases/latest`);
  return { tag, promoted: true };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  publishWindows({ directory: process.argv[2] || 'release' }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
