import { createHash } from 'node:crypto';
import { createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { GitHub, RELEASE_REPOSITORY, validateBuild } from './publish-windows.mjs';

const base = `/repos/${RELEASE_REPOSITORY}`;
const shaPattern = /^[a-f0-9]{40}$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function assetNamed(release, name, maxSize) {
  const matches = release.assets.filter(asset => asset.name === name);
  const asset = matches[0];
  if (matches.length !== 1 || asset.state !== 'uploaded' || !Number.isSafeInteger(asset.size)
    || asset.size < 1 || asset.size > maxSize || !Number.isSafeInteger(asset.id)
    || asset.url !== `https://api.github.com${base}/releases/assets/${asset.id}`) {
    throw new Error(`Latest Windows release has no valid ${name} asset. Refusing a synthetic fallback.`);
  }
  return asset;
}

async function readSmallAsset(api, asset) {
  const response = await api.bytes(asset.url);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > asset.size) throw new Error(`${asset.name} download exceeds its recorded size.`);
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (size !== asset.size || (asset.digest && asset.digest !== `sha256:${hash(bytes)}`)) throw new Error(`${asset.name} download failed integrity verification.`);
  return bytes;
}

async function noPublishedReleases(api) {
  // A missing Latest can also mean prereleases or an access failure.
  for (let page = 1; page <= 100; page++) {
    const releases = await api.json(`${base}/releases?per_page=100&page=${page}`);
    if (!Array.isArray(releases)) throw new Error('Could not inspect published release history.');
    if (releases.some(release => !release.draft)) return false;
    if (releases.length < 100) return true;
  }
  throw new Error('Could not establish that the published release history is empty.');
}

export async function fetchWindowsBaseline({ directory = 'release-baseline', api = new GitHub(process.env.GITHUB_TOKEN), log = console.log } = {}) {
  // Authenticate repository access before interpreting a private-repository 404.
  const repository = await api.json(base);
  if (repository.full_name !== RELEASE_REPOSITORY || repository.default_branch !== 'main') throw new Error('Unexpected repository identity or default branch while selecting the upgrade baseline.');
  const release = await api.json(`${base}/releases/latest`, { missing: true });
  if (!release) {
    if (!await noPublishedReleases(api)) throw new Error('Published releases exist but Latest is unavailable. Fix the release channel; no synthetic fallback is allowed.');
    log('No published releases exist. The first-release gate will build a lower same-source version A.');
    return { synthetic: true };
  }
  if (release.draft || release.prerelease || release.immutable !== true || !Number.isSafeInteger(release.id)
    || !release.tag_name?.startsWith('windows-v') || release.url !== `https://api.github.com${base}/releases/${release.id}`
    || !Array.isArray(release.assets)) {
    throw new Error('Latest must be a published, immutable AppYard Windows release. Refusing a synthetic fallback.');
  }
  const metadata = await readSmallAsset(api, assetNamed(release, 'windows-build.json', 32_768));
  const build = JSON.parse(metadata.toString('utf8'));
  validateBuild(build, { GITHUB_REPOSITORY: RELEASE_REPOSITORY, GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push',
    GITHUB_SHA: build.sha, GITHUB_RUN_ID: String(build.runId), GITHUB_RUN_NUMBER: String(build.runNumber), GITHUB_RUN_ATTEMPT: String(build.runAttempt) });
  const expectedTag = `windows-v${build.version}-r${build.runId}-a${build.runAttempt}`;
  if (release.tag_name !== expectedTag || release.html_url !== `https://github.com/${RELEASE_REPOSITORY}/releases/tag/${expectedTag}`) throw new Error('Latest release identity does not match its build metadata.');
  let reference = (await api.json(`${base}/git/ref/tags/${expectedTag}`)).object;
  for (let depth = 0; reference.type === 'tag' && depth < 5; depth++) {
    if (!shaPattern.test(reference.sha)) throw new Error('Invalid baseline tag object.');
    reference = (await api.json(`${base}/git/tags/${reference.sha}`)).object;
  }
  if (reference.type !== 'commit' || reference.sha !== build.sha) throw new Error('Baseline release tag does not resolve to its full source SHA.');
  const installer = assetNamed(release, build.installer, 2_147_483_648);
  if (installer.digest && installer.digest !== `sha256:${build.sha256}`) throw new Error('Baseline installer asset digest differs from its build metadata.');
  const checksums = await readSmallAsset(api, assetNamed(release, 'SHA256SUMS.txt', 4096));
  if (checksums.toString('utf8').trim() !== `${build.sha256}  ${build.installer}`) throw new Error('Baseline checksum file differs from its build metadata.');

  const destination = path.resolve(directory);
  try { await fs.access(destination); throw new Error('The baseline output directory already exists. Use an empty destination for release downloads.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const parent = path.dirname(destination);
  await fs.mkdir(parent, { recursive: true });
  const staging = await fs.mkdtemp(path.join(parent, '.windows-baseline-'));
  try {
    const response = await api.bytes(installer.url);
    let size = 0; const digest = createHash('sha256');
    await pipeline(Readable.fromWeb(response.body), async function* (chunks) {
      for await (const chunk of chunks) {
        size += chunk.length;
        if (size > installer.size) throw new Error('Baseline installer download exceeds its recorded size.');
        digest.update(chunk); yield chunk;
      }
    }, createWriteStream(path.join(staging, build.installer), { flags: 'wx' }));
    if (size !== installer.size || digest.digest('hex') !== build.sha256) throw new Error('Baseline installer download failed SHA-256 verification.');
    await fs.writeFile(path.join(staging, 'windows-build.json'), metadata);
    await fs.writeFile(path.join(staging, 'SHA256SUMS.txt'), checksums);
    await fs.rename(staging, destination);
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true });
    throw error;
  }
  log(`Upgrade baseline: AppYard ${build.version}, source ${build.sha}, ${release.html_url}`);
  return { synthetic: false, tag: expectedTag, version: build.version, sha: build.sha };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  fetchWindowsBaseline({ directory: process.argv[2] || 'release-baseline' }).then(async result => {
    if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `synthetic=${result.synthetic}\n`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
