import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { prepareIsolatedSolutionRuntime } from '../dist-electron/electron/isolated-solution-runtime.js';
import { runtimeFilesHash, VisualReviewLedger, validateVisualReview } from '../dist-electron/electron/visual-review.js';
import { visualReviewPassed } from '../dist-electron/shared/visual-review.js';

const isolatedSupported = ['darwin', 'linux'].includes(process.platform);
const original = { 'a.bin': Buffer.from('X'), 'b.bin': Buffer.from('Y\0b.bin\0Z') };
const redistributed = { 'a.bin': Buffer.from('X\0b.bin\0Y'), 'b.bin': Buffer.from('Z') };
// The same delivered module supports a real CLI invocation and the isolated invoke adapter.
const engine = `import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function invoke() { return {aBytes: readFileSync(new URL('./a.bin', import.meta.url)).length}; }
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) console.log(JSON.stringify(invoke()));
`;
const fileNames = ['a.bin', 'b.bin', 'engine.mjs', 'index.html'];
const cli = (files = fileNames) => ({ profile: 'cli', files: [...files], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } });
const browser = (files = fileNames) => ({ profile: 'browser', files: [...files], requiredEnv: [], entrypoint: 'index.html', evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function writeFiles(root, files) {
  for (const [file, bytes] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), bytes);
  }
}

async function fixture(t, files = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-files-hash-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await writeFiles(root, { ...original, 'engine.mjs': engine, 'index.html': '<h1>Binary-backed application</h1>', ...files });
  return root;
}

async function prepare(t, root, manifest = cli(), isolated = false) {
  const runtime = await (isolated ? prepareIsolatedSolutionRuntime : prepareSolutionRuntime)(root, manifest, process.execPath,
    undefined, { totalTimeoutMs: 15_000, startupTimeoutMs: 5_000, invocationTimeoutMs: 5_000 });
  t.after(() => runtime.close());
  return runtime;
}

function png(width, height) {
  const chunk = (name, bytes) => {
    const data = Buffer.concat([Buffer.from(name), bytes]), length = Buffer.alloc(4), crc = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    let value = 0xffffffff;
    for (const byte of data) {
      value ^= byte;
      for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
    }
    crc.writeUInt32BE((value ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, data, crc]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const row = Buffer.alloc(width * 3 + 1, 245); row[0] = 0;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
}
const screenshots = { desktop: png(1280, 800), narrow: png(390, 844) };
const ledgerFor = root => new VisualReviewLedger({ root, manifest: browser(), contractHash: 'c'.repeat(64), runId: 'runtime-files-hash', stage: 'verify' });
async function capture(root, ledger, viewport = 'desktop', filesHash) {
  const bytes = screenshots[viewport], folder = '.browser-observations/' + randomUUID();
  const screenshot = folder + '/' + digest(bytes).slice(0, 12) + '-' + randomUUID() + '.png';
  await writeFiles(root, { [screenshot]: bytes });
  return ledger.registerCapture({ viewport, screenshot, screenshotHash: digest(bytes), filesHash: filesHash ?? await runtimeFilesHash(root, browser()) });
}
const review = (ledger, captureId) => ledger.tool().execute('runtime-files-hash-review', {
  captureId, expected: 'The application heading should remain visible within the viewport.',
  observed: 'The application heading is visible and readable without clipping.', findings: [], resolutions: [],
});

test('runtime fingerprints distinguish binary content moved across unchanged file boundaries', async t => {
  const root = await fixture(t), before = await runtimeFilesHash(root, cli());
  await writeFiles(root, redistributed);
  assert.notEqual(await runtimeFilesHash(root, cli()), before, 'Moving embedded path delimiters between declared files changes the runtime.');
});

test('fresh real CLI packages with different behavior receive different provenance', { timeout: 15_000 }, async t => {
  const root = await fixture(t), before = await prepare(t, root);
  assert.deepEqual(await before.invoke(null), { aBytes: 1 });
  await writeFiles(root, redistributed);
  const after = await prepare(t, root);
  assert.deepEqual(await after.invoke(null), { aBytes: redistributed['a.bin'].length });
  assert.deepEqual(await before.invoke(null), { aBytes: 1 }, 'The earlier prepared package still contains its original bytes.');
  assert.notEqual(after.provenance.filesHash, before.provenance.filesHash, 'Different delivered behavior cannot retain the same runtime fingerprint.');
});

test('prepared CLI integrity and invocation reject redistributed declared binary files', { timeout: 15_000 }, async t => {
  const root = await fixture(t), runtime = await prepare(t, root);
  assert.deepEqual(await runtime.invoke(null), { aBytes: 1 });
  await writeFiles(runtime.root, redistributed);
  await assert.rejects(runtime.assertIntegrity(), /runtime files changed/i);
  await assert.rejects(runtime.invoke(null), /runtime files changed/i);
});

test('isolated package integrity rejects redistributed declared binary files', { skip: !isolatedSupported, timeout: 15_000 }, async t => {
  const root = await fixture(t), runtime = await prepare(t, root, cli(), true);
  assert.deepEqual(await runtime.invoke(null), { aBytes: 1 });
  await writeFiles(runtime.root, redistributed);
  await assert.rejects(runtime.assertIntegrity(), error => {
    assert.equal(error.classification, 'integrity', 'The isolated boundary must retain trusted integrity failure provenance.');
    assert.match(error.message, /changed.*frozen application files/i);
    return true;
  });
});

test('regular, isolated and visual fingerprints agree on binary, Unicode and empty files', { skip: !isolatedSupported, timeout: 15_000 }, async t => {
  const extra = { '資料/航海-🚢.bin': Buffer.from(Array.from({ length: 256 }, (_, index) => index)), '資料/empty.txt': Buffer.alloc(0) };
  const root = await fixture(t, extra), files = [...fileNames, ...Object.keys(extra)];
  const runtime = await prepare(t, root, cli(files));
  const isolated = await prepare(t, root, cli([...files].reverse()), true);
  const expected = await runtimeFilesHash(root, browser(files));
  assert.equal(runtime.provenance.filesHash, expected);
  assert.equal(isolated.provenance.filesHash, expected);
  assert.equal(await runtimeFilesHash(runtime.root, cli(files)), expected);
  assert.equal(await runtimeFilesHash(isolated.root, browser(files)), expected);
  assert.deepEqual(await runtime.invoke(null), { aBytes: 1 });
  assert.deepEqual(await isolated.invoke(null), { aBytes: 1 });
  await runtime.assertIntegrity(); await isolated.assertIntegrity();
});

test('runtime fingerprints depend on the file set rather than manifest enumeration order', async t => {
  const root = await fixture(t), before = await runtimeFilesHash(root, cli());
  assert.equal(await runtimeFilesHash(root, cli([...fileNames].reverse())), before);
  assert.equal(await runtimeFilesHash(root, browser(['index.html', 'b.bin', 'engine.mjs', 'a.bin'])), before);
});

test('renaming a declared file changes the fingerprint even when its bytes are identical', async t => {
  const root = await fixture(t), before = await runtimeFilesHash(root, cli());
  await fs.rename(path.join(root, 'b.bin'), path.join(root, 'renamed.bin'));
  assert.notEqual(await runtimeFilesHash(root, cli(fileNames.map(file => file === 'b.bin' ? 'renamed.bin' : file))), before);
});

test('adding or removing a declared empty file changes the fingerprint', async t => {
  const root = await fixture(t, { 'empty.bin': Buffer.alloc(0) }), before = await runtimeFilesHash(root, cli());
  const withEmpty = await runtimeFilesHash(root, cli([...fileNames, 'empty.bin']));
  assert.notEqual(withEmpty, before);
  assert.equal(await runtimeFilesHash(root, cli()), before, 'Undeclared files do not affect the runtime fingerprint.');
  await fs.rm(path.join(root, 'empty.bin'));
  assert.equal(await runtimeFilesHash(root, cli()), before);
});

test('new visual captures cannot claim a prepared runtime from before binary redistribution', async t => {
  const root = await fixture(t), ledger = ledgerFor(root), before = await runtimeFilesHash(root, browser());
  await writeFiles(root, redistributed);
  await assert.rejects(capture(root, ledger, 'desktop', before), /stale runtime/i);
  assert.equal(ledger.report().captures.length, 0);
});

test('screenshots captured before binary redistribution cannot receive a fresh visual review', async t => {
  const root = await fixture(t), ledger = ledgerFor(root), captured = await capture(root, ledger);
  await writeFiles(root, redistributed);
  const result = await review(ledger, captured);
  assert.equal(result.isError, true, 'A data-only change invalidates a previously captured screenshot.');
  assert.match(result.details.error, /stale runtime/i);
  assert.equal(ledger.report().reviews.length, 0);
});

test('completed visual evidence becomes stale after declared binary redistribution', async t => {
  const root = await fixture(t), ledger = ledgerFor(root);
  for (const viewport of ['desktop', 'narrow']) for (let round = 0; round < 2; round++) {
    assert.equal((await review(ledger, await capture(root, ledger, viewport))).isError, false);
  }
  assert.deepEqual(await ledger.problems(), []);
  const completed = ledger.report();
  assert.equal(visualReviewPassed(completed, await runtimeFilesHash(root, browser())), true);
  await writeFiles(root, redistributed);
  assert.match((await validateVisualReview(root, browser(), completed)).join(' '), /desktop screenshot is stale.*narrow screenshot is stale/);
  assert.equal(visualReviewPassed(completed, await runtimeFilesHash(root, browser())), false);
  assert.match((await ledger.problems()).join(' '), /desktop screenshot is stale.*narrow screenshot is stale/);
});

test('unchanged files require fresh visual evidence when saved fingerprints use legacy unframed hashing', async t => {
  const root = await fixture(t), ledger = ledgerFor(root), hash = createHash('sha256');
  for (const file of [...fileNames].sort()) hash.update(file + '\0').update(await fs.readFile(path.join(root, file))).update('\0');
  const legacyHash = hash.digest('hex');
  for (const viewport of ['desktop', 'narrow']) for (let round = 0; round < 2; round++) {
    assert.equal((await review(ledger, await capture(root, ledger, viewport))).isError, false);
  }
  assert.deepEqual(await ledger.problems(), []);
  // Represent an earlier host checkpoint: its screenshots and review sequence are
  // intact, but every saved application fingerprint uses the former encoding.
  const legacyReport = ledger.report();
  legacyReport.filesHash = legacyHash;
  for (const session of legacyReport.sessions) session.filesHash = legacyHash;
  for (const capture of legacyReport.captures) capture.filesHash = legacyHash;
  assert.equal(visualReviewPassed(legacyReport, legacyHash), true, 'Legacy evidence is internally complete before current-file revalidation.');
  assert.match((await validateVisualReview(root, browser(), legacyReport)).join(' '), /desktop screenshot is stale.*narrow screenshot is stale/);
  assert.equal(visualReviewPassed(legacyReport, await runtimeFilesHash(root, browser())), false);
  await assert.rejects(capture(root, ledger, 'desktop', legacyHash), /stale runtime/i);
  assert.equal(ledger.report().captures.length, 4, 'An earlier prepared runtime cannot add accepted evidence after migration.');
});
