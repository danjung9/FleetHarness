import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { stageExecutable } from '../dist-electron/electron/executable.js';
import { solutionFixture } from '../scripts/solution-fixture.mjs';

async function write(root, relative, body) {
  const target = path.join(root, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
}

async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-executable-manifest-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'), staging = path.join(root, 'staging');
  await fs.mkdir(workspace); await fs.mkdir(staging);
  const solution = JSON.parse(solutionFixture(['R1'])['solution-contract.json']);
  solution.runtime.files = ['index.html', 'evaluate.cjs', 'assets/status.mjs'];
  const packet = { acceptance: [{ id: 'R1', requirement: 'Parse tasks.', method: 'automated', scenario: 'Parse varied messages.' }] };
  for (const [relative, body] of Object.entries({
    'index.html': '<script type="module" src="./assets/status.mjs"></script>',
    'evaluate.cjs': 'process.stdout.write(JSON.stringify("fixture"));',
    'assets/status.mjs': 'document.body.dataset.result="approved";',
    'notes.json': '{"purpose":"Reviewed source notes outside the deployment allowlist"}',
    'solution-contract.json': JSON.stringify(solution),
    '.fleet/packet.json': JSON.stringify(packet)
  })) await write(workspace, relative, body);
  await write(staging, 'caller-owned.txt', 'Preserve unrelated caller data.');
  // Accepted synthetic evidence isolates packaging metadata checks; these tests
  // neither execute the fixture application nor claim browser verification.
  const project = { ...newProject({ title: 'Manifest integrity', description: 'An offline fixture for verified deployment manifests.', criteria: ['Parse tasks.'] }),
    workspace, status: 'approved', approvedAt: new Date().toISOString(),
    report: { exitCode: 0, passed: 1, total: 1, failed: 0, skipped: 0, sourceHash: await sourceHash(workspace) } };
  return { workspace, staging, project, solution, packet };
}

async function rejectTransientMetadata(input, relative, replacement) {
  const originalRead = fs.readFile, metadata = path.join(input.workspace, relative);
  const approved = await originalRead(metadata);
  let injected = false;
  fs.readFile = async (file, ...args) => {
    if (file === metadata && !injected) {
      // Initial approval checks precede staging. Change the actual file only
      // when staging reads metadata, then restore it before later source checks.
      const started = await fs.stat(path.join(input.staging, 'source')).then(() => true, error => {
        if (error.code === 'ENOENT') return false;
        throw error;
      });
      if (started) {
        injected = true;
        if (replacement === undefined) {
          const hidden = path.join(input.staging, 'temporarily-removed-metadata.json');
          await fs.rename(metadata, hidden);
          try { return await originalRead(file, ...args); }
          finally { await fs.rename(hidden, metadata); }
        } else {
          await fs.writeFile(metadata, JSON.stringify(replacement));
          try { return await originalRead(file, ...args); }
          finally { await fs.writeFile(metadata, approved); }
        }
      }
    }
    return originalRead(file, ...args);
  };
  try {
    await assert.rejects(() => stageExecutable(input.project, input.staging),
      'A restored metadata edit must not authorize a different deployment payload.');
  } finally { fs.readFile = originalRead; }
  assert.equal(injected, true, 'The staging metadata read experienced the temporary file edit.');
  assert.deepEqual(await fs.readFile(metadata), approved);
  assert.equal(await sourceHash(input.workspace), input.project.report.sourceHash, 'Source is restored to its approved fingerprint.');
  await assert.rejects(fs.stat(path.join(input.staging, 'source')), { code: 'ENOENT' }, 'Rejected staging must be removed.');
  assert.equal(await fs.readFile(path.join(input.staging, 'caller-owned.txt'), 'utf8'), 'Preserve unrelated caller data.');
}

test('executable staging rejects a restored manifest edit that omits a required script', { concurrency: false }, async t => {
  const input = await fixture(t), changed = structuredClone(input.solution);
  changed.runtime.files = changed.runtime.files.filter(file => file !== 'assets/status.mjs');
  await rejectTransientMetadata(input, 'solution-contract.json', changed);
});

test('executable staging rejects a restored manifest edit that adds source outside the approved deployment', { concurrency: false }, async t => {
  const input = await fixture(t), changed = structuredClone(input.solution);
  changed.runtime.files.push('notes.json');
  await rejectTransientMetadata(input, 'solution-contract.json', changed);
});

test('executable staging rejects a temporarily missing manifest instead of packaging a legacy single page', { concurrency: false }, async t => {
  const input = await fixture(t);
  await rejectTransientMetadata(input, 'solution-contract.json', undefined);
});

test('executable staging rejects restored changes to the packet used to validate its manifest', { concurrency: false }, async t => {
  const input = await fixture(t), changed = structuredClone(input.packet);
  changed.acceptance[0].requirement = 'Use a different unapproved task definition.';
  await rejectTransientMetadata(input, '.fleet/packet.json', changed);
});
