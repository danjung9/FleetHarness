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
  const other = path.join(root, 'other.png'); await fs.writeFile(other, original); await fs.symlink(other, target);
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

test('runtime digest uses its versioned encoding and rejects symlinked runtime files', async t => {
  const { root } = await setup(t);
  // Independently encoded v2 vector: UTF-8 path/content lengths as two uint64s.
  assert.equal(await runtimeFilesHash(root, manifest), 'e6b4fdd38364e92104c511ae2c95fa0496428dbe0f778a8d16af27fb01580371');
  await fs.rename(path.join(root, 'index.html'), path.join(root, 'original.html'));
  await fs.symlink(path.join(root, 'original.html'), path.join(root, 'index.html'));
  await assert.rejects(runtimeFilesHash(root, manifest), /symlink/);
});

const journeys = [
  { id: 'save-task', title: 'Save a task', kind: 'primary', steps: [{ action: 'click', selector: '#save' }, { action: 'expectText', selector: '#result', text: 'Saved' }] },
  { id: 'recover-task', title: 'Recover invalid input', kind: 'recovery', steps: [{ action: 'click', selector: '#reset' }, { action: 'expectText', selector: '#result', text: 'Ready' }] },
];
const journeyResult = (id, extra = {}) => ({ id, status: 'passed', completedSteps: 2, totalSteps: 2, detail: 'All frozen journey steps passed.', ...extra });
async function reviewedJourney(root, ledger, id, viewport = 'desktop', extra = {}, input = {}) {
  return review(ledger, await capture(root, ledger, viewport, { journey: journeyResult(id), ...extra }), input);
}
async function completeJourneys(root, ledger) {
  for (const viewport of ['desktop', 'narrow']) {
    for (const journey of journeys) assert.equal((await reviewedJourney(root, ledger, journey.id, viewport)).isError, false);
  }
}

test('untouched-page screenshots cannot substitute for exercising every frozen journey at both widths', async t => {
  const { root, ledger } = await setup(t, { journeys });
  await completeViewport(root, ledger); await completeViewport(root, ledger, 'narrow');
  const problems = await ledger.problems();
  assert.equal(problems.filter(problem => problem.includes('Run fleet_browser journey')).length, 4);
  await reviewedJourney(root, ledger, 'save-task');
  assert.equal((await ledger.problems()).filter(problem => problem.includes('Run fleet_browser journey')).length, 3);
  await completeJourneys(root, ledger);
  assert.deepEqual(await ledger.problems(), []);
  assert.equal(visualReviewPassed(ledger.report(), await runtimeFilesHash(root, manifest), 'verify', journeys.map(item => item.id)), true);
});

test('a failed or unreviewed latest journey invalidates an earlier successful workflow review', async t => {
  const { root, ledger } = await setup(t, { journeys });
  await completeJourneys(root, ledger);
  assert.deepEqual(await ledger.problems(), []);
  const failed = await capture(root, ledger, 'desktop', { journey: journeyResult('save-task', { status: 'failed', completedSteps: 1, detail: 'Expected Saved, received Failed.' }) });
  assert.match((await ledger.problems()).join(' '), /Run fleet_browser journey save-task at desktop/);
  assert.equal((await review(ledger, failed)).isError, false, 'Failed workflow screenshots must remain reviewable.');
  assert.match((await ledger.problems()).join(' '), /Journey save-task at desktop failed.*Expected Saved/);
  await reviewedJourney(root, ledger, 'save-task');
  assert.deepEqual(await ledger.problems(), []);
});

test('browser errors block final evidence even when the agent submits no findings', async t => {
  const { root, ledger } = await setup(t, { journeys });
  await completeJourneys(root, ledger);
  await reviewedJourney(root, ledger, 'save-task', 'desktop', { errors: ['Uncaught TypeError in the Save handler'] });
  assert.match((await ledger.problems()).join(' '), /browser errors.*TypeError/);
  await reviewedJourney(root, ledger, 'save-task');
  assert.deepEqual(await ledger.problems(), []);
  await review(ledger, await capture(root, ledger, 'narrow', { errors: ['Console error: layout crashed'] }));
  assert.match((await ledger.problems()).join(' '), /final narrow screenshot has browser errors/);
});

test('fixes require rerunning all frozen journeys on final files, and findings resolve only on the affected workflow', async t => {
  const { root, ledger } = await setup(t, { journeys });
  await completeJourneys(root, ledger);
  const defect = await reviewedJourney(root, ledger, 'save-task', 'desktop', {}, { findings: ['Saved result is clipped by the layout.'] });
  const resolution = { findingId: defect.details.review.findings[0].id, change: 'Changed the result layout to wrap long text.' };
  await fs.appendFile(path.join(root, 'index.html'), '<style>#result{overflow-wrap:anywhere}</style>');
  const wrong = await reviewedJourney(root, ledger, 'recover-task', 'desktop', {}, { resolutions: [resolution] });
  assert.match(wrong.details.error, /same journey/);
  assert.equal((await reviewedJourney(root, ledger, 'save-task', 'desktop', {}, { resolutions: [resolution] })).isError, false);
  assert.match((await ledger.problems()).join(' '), /Journey .* stale/);
  await completeJourneys(root, ledger);
  assert.deepEqual(await ledger.problems(), []);
});

test('journey evidence is tied to frozen IDs, actual step counts, current sessions and the expected acceptance plan', async t => {
  const { root, ledger, options } = await setup(t, { journeys });
  await assert.rejects(capture(root, ledger, 'desktop', { journey: journeyResult('invented') }), /frozen journey/);
  await assert.rejects(capture(root, ledger, 'desktop', { journey: journeyResult('save-task', { completedSteps: 1 }) }), /actual step count/);
  await assert.rejects(capture(root, ledger, 'desktop', { journey: journeyResult('save-task', { totalSteps: 3, completedSteps: 3 }) }), /actual step count/);
  await completeJourneys(root, ledger); await ledger.problems();
  const hash = await runtimeFilesHash(root, manifest);
  assert.equal(visualReviewPassed(ledger.report(), hash, 'verify', ['another-plan']), false);
  assert.match((await validateVisualReview(root, manifest, ledger.report(), 'verify', ['another-plan'])).join(' '), /frozen browser journeys/);
  const resumed = new VisualReviewLedger({ ...options, prior: ledger.report() });
  assert.equal((await resumed.problems()).filter(problem => problem.includes('Run fleet_browser journey')).length, 4);
  const invalid = ledger.report(); invalid.captures[0].journey.completedSteps = 0;
  assert.equal(isVisualReviewReport(invalid), false);
});

test('legacy screenshot reports stay readable but resumed sessions require new workflow evidence', async t => {
  const { root, ledger, options } = await setup(t);
  await completeViewport(root, ledger); await completeViewport(root, ledger, 'narrow'); await ledger.problems();
  const legacy = ledger.report(); legacy.schemaVersion = 1;
  delete legacy.sessions[0].requiredJourneyIds;
  assert.equal(isVisualReviewReport(legacy), true);
  assert.match((await validateVisualReview(root, manifest, legacy, 'verify', journeys.map(item => item.id))).join(' '), /frozen browser journeys/);
  const resumed = new VisualReviewLedger({ ...options, journeys, prior: legacy });
  assert.equal(resumed.report().schemaVersion, 2);
  assert.equal(isVisualReviewReport(resumed.report()), true);
  assert.equal((await resumed.problems()).filter(problem => problem.includes('Run fleet_browser journey')).length, 4);
  await completeJourneys(root, resumed);
  assert.deepEqual(await resumed.problems(), []);
});
