import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-source-integrity-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'), parent = path.join(root, 'exports');
  await fs.mkdir(workspace); await fs.mkdir(parent);
  return { root, workspace, parent, title: 'Verified source', deliveryMarkdown: '# Verified application\n' };
}

async function write(root, name, bytes) {
  await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
  await fs.writeFile(path.join(root, name), bytes);
}

test('a changed verified engine cannot export by shifting source across an adjacent file boundary', async t => {
  const input = await fixture(t);
  const base = 'export let answer = 2;\n//';
  const shift = '\nif (typeof answer !== "undefined") answer = 4;\n//';
  const suffix = '\nexport const filler = 1;\n';
  await write(input.workspace, 'engine.mjs', base + 'z.mjs' + shift);
  await write(input.workspace, 'z.mjs', suffix);
  await write(input.workspace, 'app.test.mjs', `import test from 'node:test';
import assert from 'node:assert/strict';
import { answer } from './engine.mjs';
test('engine returns the required answer', () => assert.equal(answer, 4));
`);
  const verified = await verifyWorkspace(input.workspace, process.execPath, () => {}, undefined, { timeoutMs: 5000 });
  assert.equal(reportPassed(verified), true); assert.equal(verified.passed, 1);

  // The old filename + contents stream is identical, although the engine now returns 2.
  await write(input.workspace, 'engine.mjs', base);
  await write(input.workspace, 'z.mjs', shift + 'z.mjs' + suffix);
  const changed = await verifyWorkspace(input.workspace, process.execPath, () => {}, undefined, { timeoutMs: 5000 });
  assert.equal(reportPassed(changed), false); assert.equal(changed.failed, 1);
  await assert.rejects(exportVerifiedBundle({ ...input, verifiedHash: verified.sourceHash }), /changed after verification/);
  assert.notEqual(changed.sourceHash, verified.sourceHash);
  assert.deepEqual(await fs.readdir(input.parent), [], 'Reject before creating an export bundle.');
});

test('a filename cannot absorb a content prefix while preserving the source hash', async t => {
  const { workspace } = await fixture(t);
  await write(workspace, 'a', 'bX');
  const original = await sourceHash(workspace);
  await fs.rename(path.join(workspace, 'a'), path.join(workspace, 'ab'));
  await write(workspace, 'ab', 'X');
  assert.notEqual(await sourceHash(workspace), original);
});

test('binary content cannot impersonate NUL-delimited file boundaries', async t => {
  const { workspace } = await fixture(t);
  const base = Buffer.from([0xff, 0x00, 0x61]), shift = Buffer.from([0x00, 0x80, 0x62]);
  const suffix = Buffer.from([0xfe, 0x00, 0x63]), boundary = Buffer.from('\0z.bin\0');
  const before = [['a.bin', Buffer.concat([base, boundary, shift])], ['z.bin', suffix]];
  const after = [['a.bin', base], ['z.bin', Buffer.concat([shift, boundary, suffix])]];
  const separatorHash = entries => {
    const hash = createHash('sha256');
    for (const [name, bytes] of entries) hash.update(name + '\0').update(bytes).update('\0');
    return hash.digest('hex');
  };
  assert.equal(separatorHash(before), separatorHash(after), 'The fixture defeats a separator-only fix.');
  for (const [name, bytes] of before) await write(workspace, name, bytes);
  const original = await sourceHash(workspace);
  for (const [name, bytes] of after) await write(workspace, name, bytes);
  assert.notEqual(await sourceHash(workspace), original);
});

test('source hashes remain deterministic across creation order and verified export copies', async t => {
  const input = await fixture(t), reordered = path.join(input.root, 'reordered');
  const entries = [['nested/empty', Buffer.alloc(0)], ['engine.mjs', 'export const answer = 4;\n'],
    ['assets/évidence.bin', Buffer.from([0x00, 0xff, 0x80])], ['.quality-evidence/desktop.png', 'Recorded screenshot']];
  for (const [name, bytes] of entries) await write(input.workspace, name, bytes);
  for (const [name, bytes] of [...entries].reverse()) await write(reordered, name, bytes);
  const verifiedHash = await sourceHash(input.workspace);
  assert.match(verifiedHash, /^[a-f0-9]{64}$/);
  assert.equal(await sourceHash(reordered), verifiedHash);
  const destination = await exportVerifiedBundle({ ...input, verifiedHash });
  assert.equal(await sourceHash(destination), verifiedHash);
  for (const [name] of entries) assert.deepEqual(await fs.readFile(path.join(destination, name)), await fs.readFile(path.join(input.workspace, name)));
});

test('host metadata and ignored artifacts stay excluded without excluding nested source names', async t => {
  const { workspace } = await fixture(t);
  await write(workspace, 'engine.mjs', 'export const answer = 4;\n');
  const original = await sourceHash(workspace);
  for (const name of ['test-report.json', 'review.json', 'DELIVERY.md', '.DS_Store',
    'node_modules/package/index.js', '.git/config', '.pi/session.json']) await write(workspace, name, 'Host metadata');
  assert.equal(await sourceHash(workspace), original);
  for (const name of ['reports/test-report.json', 'reports/review.json', 'docs/DELIVERY.md']) {
    await write(workspace, name, 'Application artifact');
    assert.notEqual(await sourceHash(workspace), original, name + ' remains part of source integrity.');
    await fs.rm(path.join(workspace, name));
  }
  assert.equal(await sourceHash(workspace), original);
});

test('evidence participates by default and its exclusion never hides source edits', async t => {
  const { workspace } = await fixture(t);
  await write(workspace, 'engine.mjs', 'original engine');
  await write(workspace, '.quality-evidence/desktop.png', 'original evidence');
  const original = await sourceHash(workspace), withoutEvidence = await sourceHash(workspace, { excludeEvidence: true });
  await write(workspace, '.quality-evidence/desktop.png', 'changed evidence');
  assert.notEqual(await sourceHash(workspace), original);
  assert.equal(await sourceHash(workspace, { excludeEvidence: true }), withoutEvidence);
  await write(workspace, 'engine.mjs', 'changed engine');
  assert.notEqual(await sourceHash(workspace, { excludeEvidence: true }), withoutEvidence);
  const beforeNamedSource = await sourceHash(workspace, { excludeEvidence: true });
  await write(workspace, '.quality-evidence-copy/desktop.png', 'Source with a similar directory name');
  assert.notEqual(await sourceHash(workspace, { excludeEvidence: true }), beforeNamedSource);
});

test('evaluation-plan exclusion is limited to its root file and combines with evidence exclusion', async t => {
  const { workspace } = await fixture(t);
  await write(workspace, 'engine.mjs', 'original engine');
  await write(workspace, 'evaluation-plan.json', 'original evaluation');
  await write(workspace, '.quality-evidence/desktop.png', 'original evidence');
  const original = await sourceHash(workspace);
  const options = { excludeEvaluationPlan: true }, both = { ...options, excludeEvidence: true };
  const withoutEvaluation = await sourceHash(workspace, options), withoutBoth = await sourceHash(workspace, both);
  await write(workspace, 'evaluation-plan.json', 'restored evaluation');
  assert.notEqual(await sourceHash(workspace), original);
  assert.equal(await sourceHash(workspace, options), withoutEvaluation);
  await write(workspace, '.quality-evidence/desktop.png', 'new evidence');
  assert.notEqual(await sourceHash(workspace, options), withoutEvaluation);
  assert.equal(await sourceHash(workspace, both), withoutBoth);
  for (const name of ['fixtures/evaluation-plan.json', 'acceptance-plan.json']) {
    await write(workspace, name, 'Frozen application expectations');
    assert.notEqual(await sourceHash(workspace, both), withoutBoth);
    await fs.rm(path.join(workspace, name));
  }
});

test('legacy unframed verification hashes cannot authorize an unchanged source export', async t => {
  const input = await fixture(t), body = 'export const answer = 4;\n';
  await write(input.workspace, 'engine.mjs', body);
  const legacyHash = createHash('sha256').update('engine.mjs').update(body).digest('hex');
  await assert.rejects(exportVerifiedBundle({ ...input, verifiedHash: legacyHash }), /changed after verification/);
  assert.notEqual(await sourceHash(input.workspace), legacyHash);
  assert.deepEqual(await fs.readdir(input.parent), [], 'Legacy evidence requires fresh verification.');
});
