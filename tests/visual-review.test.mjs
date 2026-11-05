import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { VisualReviewLedger, runtimeFilesHash, validateVisualReview, readVisualCapture } from '../dist-electron/electron/visual-review.js';
import { isVisualReviewReport, visualReviewPassed } from '../dist-electron/shared/visual-review.js';

const manifest = { profile: 'browser', files: ['index.html'], requiredEnv: [], entrypoint: 'index.html' };
const contractHash = 'c'.repeat(64);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function png(width, height, color = 245) {
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
  const row = Buffer.alloc(width * 3 + 1, color); row[0] = 0;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
}
const images = { desktop: png(1280, 800), narrow: png(390, 844) };

async function setup(t, overrides = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-visual-review-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'index.html'), '<h1>Application version one</h1>');
  const options = { root, manifest, contractHash, runId: 'test-run', stage: 'verify', ...overrides };
  const ledger = new VisualReviewLedger(options);
  return { root, options, ledger };
}

async function capture(root, ledger, viewport = 'desktop', overrides = {}) {
  const bytes = images[viewport], folder = '.browser-observations/' + randomUUID();
  await fs.mkdir(path.join(root, folder), { recursive: true });
  const screenshot = folder + '/' + digest(bytes).slice(0, 12) + '-' + randomUUID() + '.png';
  await fs.writeFile(path.join(root, screenshot), bytes);
  return ledger.registerCapture({ viewport, screenshot, filesHash: await runtimeFilesHash(root, manifest), screenshotHash: digest(bytes), ...overrides });
}

async function review(ledger, captureId, extra = {}) {
  return ledger.tool().execute('test-review', { captureId, expected: 'The heading and controls should fit within the viewport.',
    observed: 'The heading and all controls are visible and aligned without clipping.', findings: [], resolutions: [], ...extra });
}

async function completeViewport(root, ledger, viewport = 'desktop') {
  assert.equal((await review(ledger, await capture(root, ledger, viewport))).isError, false);
  assert.equal((await review(ledger, await capture(root, ledger, viewport))).isError, false);
}

test('both viewports need a recorded initial comparison and a fresh reviewed recheck', async t => {
  const { root, ledger } = await setup(t), filesHash = await runtimeFilesHash(root, manifest);
  assert.match((await ledger.problems()).join(' '), /initial desktop.*initial narrow/);
  const first = await review(ledger, await capture(root, ledger));
  assert.equal(first.details.review.round, 'initial');
  assert.match((await ledger.problems()).join(' '), /fresh desktop.*initial narrow/);
  const recheck = await review(ledger, await capture(root, ledger));
  assert.equal(recheck.details.review.round, 'recheck');
  assert.match((await ledger.problems()).join(' '), /initial narrow/);
  await completeViewport(root, ledger, 'narrow');
  assert.deepEqual(await ledger.problems(), []);
  assert.equal(visualReviewPassed(ledger.report(), filesHash), true);
  assert.deepEqual(await validateVisualReview(root, manifest, ledger.report()), []);
  assert.equal(ledger.report().reviews.length, 4);
});

test('invented IDs, reused screenshots and screenshots captured before the preceding review cannot satisfy a recheck', async t => {
  const { root, ledger } = await setup(t);
  assert.match((await review(ledger, 'fabricated')).details.error, /host captureId/);
  const first = await capture(root, ledger), tooEarly = await capture(root, ledger);
  assert.equal((await review(ledger, first)).isError, false);
  assert.match((await review(ledger, first)).details.error, /already been reviewed/);
  assert.match((await review(ledger, tooEarly)).details.error, /after the preceding review/);
  assert.equal(ledger.report().reviews.length, 1);
  assert.equal((await review(ledger, await capture(root, ledger))).isError, false);
});

test('a later source edit invalidates final captures and old prepared runtimes cannot mint current evidence', async t => {
  const { root, ledger } = await setup(t);
  await completeViewport(root, ledger); await completeViewport(root, ledger, 'narrow');
  assert.deepEqual(await ledger.problems(), []);
  const originalHash = await runtimeFilesHash(root, manifest);
  await fs.writeFile(path.join(root, 'index.html'), '<h1>Application version two</h1>');
  const problems = await ledger.problems();
  assert.match(problems.join(' '), /desktop screenshot is stale.*narrow screenshot is stale/);
  assert.equal(visualReviewPassed(ledger.report(), await runtimeFilesHash(root, manifest)), false);
  await assert.rejects(capture(root, ledger, 'desktop', { filesHash: originalHash }), /stale runtime/);
  assert.equal((await review(ledger, await capture(root, ledger))).isError, false);
  assert.equal((await review(ledger, await capture(root, ledger, 'narrow'))).isError, false);
  assert.deepEqual(await ledger.problems(), []);
});

test('a screenshot captured before source edits cannot be reviewed after the edits', async t => {
  const { root, ledger } = await setup(t), id = await capture(root, ledger);
  await fs.appendFile(path.join(root, 'index.html'), '<footer>Changed</footer>');
  assert.match((await review(ledger, id)).details.error, /stale runtime/);
  assert.equal(ledger.report().reviews.length, 0);
});

test('findings cannot disappear through omission or be resolved without changed files and the same viewport', async t => {
  const { root, ledger } = await setup(t);
  const initial = await review(ledger, await capture(root, ledger), { findings: ['The heading overlaps the primary button.'] });
  const findingId = initial.details.review.findings[0].id;
  const resolution = { findingId, change: 'Added spacing between the heading and primary button.' };
  assert.equal((await review(ledger, await capture(root, ledger))).isError, false);
  await completeViewport(root, ledger, 'narrow');
  assert.match((await ledger.problems()).join(' '), /1 visual finding remains open/);
  assert.match((await review(ledger, await capture(root, ledger), { resolutions: [resolution] })).details.error, /only after changing/);
  await fs.appendFile(path.join(root, 'index.html'), '<style>h1{margin-bottom:32px}</style>');
  assert.match((await review(ledger, await capture(root, ledger, 'narrow'), { resolutions: [resolution] })).details.error, /same viewport/);
  assert.equal((await review(ledger, await capture(root, ledger), { resolutions: [resolution] })).isError, false);
  assert.equal((await review(ledger, await capture(root, ledger, 'narrow'))).isError, false);
  assert.deepEqual(await ledger.problems(), []);
});

test('new defects during recheck require another changed capture and recheck', async t => {
  const { root, ledger } = await setup(t);
  await review(ledger, await capture(root, ledger));
  const recheck = await review(ledger, await capture(root, ledger), { findings: ['The footer is clipped.'] });
  await completeViewport(root, ledger, 'narrow');
  assert.match((await ledger.problems()).join(' '), /final desktop review found defects/);
  await fs.appendFile(path.join(root, 'index.html'), '<style>footer{overflow:visible}</style>');
  await review(ledger, await capture(root, ledger), { resolutions: [{ findingId: recheck.details.review.findings[0].id, change: 'Removed the footer overflow constraint.' }] });
  await review(ledger, await capture(root, ledger, 'narrow'));
  assert.deepEqual(await ledger.problems(), []);
});

test('resuming preserves unresolved findings and new sessions cannot reuse captures or borrow stage completion', async t => {
  const { root, ledger, options } = await setup(t, { stage: 'build' });
  const initial = await review(ledger, await capture(root, ledger), { findings: ['Primary button clips its label.'] });
  const findingId = initial.details.review.findings[0].id;
  await review(ledger, await capture(root, ledger));
  await completeViewport(root, ledger, 'narrow');
  const resumed = new VisualReviewLedger({ ...options, prior: ledger.report() });
  assert.match((await review(resumed, initial.details.review.captureId)).details.error, /this visual review session/);
  await completeViewport(root, resumed); await completeViewport(root, resumed, 'narrow');
  assert.match((await resumed.problems()).join(' '), /visual finding remains open/);
  await fs.appendFile(path.join(root, 'index.html'), '<style>button{min-width:10rem}</style>');
  await review(resumed, await capture(root, resumed), { resolutions: [{ findingId, change: 'Widened the primary button to fit its label.' }] });
  await review(resumed, await capture(root, resumed, 'narrow'));
  assert.deepEqual(await resumed.problems(), []);
  const verify = new VisualReviewLedger({ ...options, stage: 'verify', prior: resumed.report() });
  assert.match((await verify.problems()).join(' '), /initial desktop.*initial narrow/);
  assert.equal(verify.report().reviews.length, resumed.report().reviews.length);
  assert.equal(visualReviewPassed(resumed.report(), await runtimeFilesHash(root, manifest), 'verify'), false);
  assert.throws(() => new VisualReviewLedger({ ...options, runId: 'another-run', prior: resumed.report() }), /does not match/);
});

test('altered, deleted and symlinked screenshot artifacts fail the host gate and image read', async t => {
  const { root, ledger } = await setup(t);
  await completeViewport(root, ledger); await completeViewport(root, ledger, 'narrow');
  const reference = ledger.report().captures[0], target = path.join(root, reference.screenshot), original = await fs.readFile(target);
  assert.deepEqual(await readVisualCapture(root, reference), original);
  await fs.writeFile(target, png(1280, 800, 123));
  assert.match((await ledger.problems()).join(' '), /Screenshot content changed/);
  await fs.rm(target);
  assert.match((await ledger.problems()).join(' '), /invalid/);
  if (process.platform === 'win32') {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-visual-outside-'));
    t.after(() => fs.rm(outside, { recursive: true, force: true }));
    await fs.writeFile(path.join(outside, path.basename(target)), original);
    await fs.rename(path.dirname(target), path.dirname(target) + '-original');
    await fs.symlink(outside, path.dirname(target), 'junction');
  } else {
    const other = path.join(root, 'other.png'); await fs.writeFile(other, original); await fs.symlink(other, target);
  }
  await assert.rejects(readVisualCapture(root, reference), /symlink/);
  assert.equal(visualReviewPassed(ledger.report(), await runtimeFilesHash(root, manifest)), false);
});

test('non-PNG files, wrong dimensions, paths outside capture directories and mismatched hashes cannot become captures', async t => {
  const { root, ledger } = await setup(t);
  await assert.rejects(capture(root, ledger, 'desktop', { screenshotHash: 'a'.repeat(64) }), /digest/);
  await fs.writeFile(path.join(root, 'made-up.png'), images.desktop);
  await assert.rejects(ledger.registerCapture({ viewport: 'desktop', screenshot: 'made-up.png', filesHash: await runtimeFilesHash(root, manifest) }), /Invalid host screenshot/);
  const id = await capture(root, ledger), reference = ledger.report().captures.find(item => item.id === id);
  await fs.writeFile(path.join(root, reference.screenshot), 'fake png');
  assert.match((await review(ledger, id)).details.error, /not a PNG/);
  await fs.writeFile(path.join(root, reference.screenshot), images.narrow);
  await assert.rejects(readVisualCapture(root, { ...reference, screenshotHash: digest(images.narrow) }), /expected viewport/);
});

test('host persistence errors fail closed without returning an accepted capture or review', async t => {
  const { root, ledger } = await setup(t, { onUpdate: async () => { throw new Error('Disk full'); } });
  await assert.rejects(capture(root, ledger), /could not be persisted.*Disk full/);
  assert.equal(ledger.report().captures.length, 0);
  assert.match((await ledger.problems()).join(' '), /could not be persisted/);
  assert.equal(visualReviewPassed(ledger.report(), await runtimeFilesHash(root, manifest)), false);
});

test('the shared gate validates sequence, capture links, finding resolutions, and completeness instead of trusting passed status', async t => {
  const { root, ledger } = await setup(t);
  await completeViewport(root, ledger); await completeViewport(root, ledger, 'narrow');
  await ledger.problems();
  const hash = await runtimeFilesHash(root, manifest), report = ledger.report();
  assert.equal(isVisualReviewReport(report), true);
  const incomplete = structuredClone(report); incomplete.reviews.pop();
  assert.equal(visualReviewPassed(incomplete, hash), false);
  const reused = structuredClone(report); reused.reviews[1].captureId = reused.reviews[0].captureId;
  assert.equal(visualReviewPassed(reused, hash), false);
  const early = structuredClone(report); early.captures[1].sequence = 1;
  assert.equal(visualReviewPassed(early, hash), false);
  const forged = structuredClone(report); forged.reviews[1].resolutions.push({ findingId: 'invented', change: 'Pretended to fix a missing finding.' });
  assert.equal(visualReviewPassed(forged, hash), false);
  assert.equal(visualReviewPassed({ status: 'passed' }, hash), false);
});

test('runtime digest matches prepared-runtime hashing and rejects symlinked runtime files', async t => {
  const { root } = await setup(t), bytes = await fs.readFile(path.join(root, 'index.html'));
  assert.equal(await runtimeFilesHash(root, manifest), createHash('sha256').update('index.html\0').update(bytes).update('\0').digest('hex'));
  if (process.platform === 'win32') {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-outside-'));
    t.after(() => fs.rm(outside, { recursive: true, force: true }));
    await fs.writeFile(path.join(outside, 'index.html'), bytes);
    await fs.symlink(outside, path.join(root, 'linked'), 'junction');
    await assert.rejects(runtimeFilesHash(root, { ...manifest, files: ['linked/index.html'], entrypoint: 'linked/index.html' }), /symlink/);
    assert.deepEqual(await fs.readFile(path.join(outside, 'index.html')), bytes);
  } else {
    await fs.rename(path.join(root, 'index.html'), path.join(root, 'original.html'));
    await fs.symlink(path.join(root, 'original.html'), path.join(root, 'index.html'));
    await assert.rejects(runtimeFilesHash(root, manifest), /symlink/);
  }
});
