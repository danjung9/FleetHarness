import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { newProject, sourceHash } from '../dist-electron/electron/storage.js';
import { assertExecutableSource, stageExecutable } from '../dist-electron/electron/executable.js';
import { solutionFixture } from '../scripts/solution-fixture.mjs';

async function write(root, relative, bytes) {
  const target = path.join(root, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-executable-integrity-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'), staging = path.join(root, 'staging');
  await fs.mkdir(workspace); await fs.mkdir(staging);
  await fs.writeFile(path.join(staging, 'caller-owned.txt'), 'Keep this unrelated file.');
  const acceptance = [{ id: 'R1', requirement: 'Parse tasks.', method: 'automated', scenario: 'Parse varied messages.' }];
  const solution = JSON.parse(solutionFixture(['R1'])['solution-contract.json']);
  const packageJson = { name: 'generated-payload', version: '1.0.0', private: true, main: 'main.cjs', dependencies: {} };
  const files = new Map([
    ['index.html', Buffer.from('<script type="module" src="./assets/status.mjs"></script>')],
    ['evaluate.cjs', Buffer.from('process.stdout.write(JSON.stringify("fixture"));')],
    ['assets/status.mjs', Buffer.from('document.body.dataset.result="verified";')],
    ['assets/nested/data.bin', Buffer.from([0x00, 0xff, 0x80, 0x0a, 0x00])],
    ['assets/nested/empty.json', Buffer.alloc(0)],
    ['package.json', Buffer.from(JSON.stringify(packageJson))],
    ['package-lock.json', Buffer.from(JSON.stringify({ name: packageJson.name, version: packageJson.version, lockfileVersion: 3, requires: true, packages: { '': packageJson } }))],
    ['main.cjs', Buffer.from('throw new Error("Generated main must remain payload data");')]
  ]);
  solution.runtime.files = [...files.keys()];
  solution.runtime.dependencies = { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' };
  for (const [relative, bytes] of files) await write(workspace, relative, bytes);
  await write(workspace, 'solution-contract.json', JSON.stringify(solution));
  await write(workspace, '.fleet/packet.json', JSON.stringify({ acceptance }));
  await write(workspace, 'README.md', '# Approved application source\n');
  // Synthetic accepted evidence isolates the host's staging boundary. These
  // tests do not claim browser verification or execution of this fixture app.
  const project = { ...newProject({ title: 'Staging integrity', description: 'An offline fixture for verified application staging.', criteria: ['Parse tasks.'] }),
    workspace, status: 'approved', approvedAt: new Date().toISOString(),
    report: { exitCode: 0, passed: 1, total: 1, failed: 0, skipped: 0, sourceHash: await sourceHash(workspace) } };
  await assertExecutableSource(project);
  return { root, workspace, staging, project, files };
}

async function assertRejectedCleanly(input, stage) {
  await assert.rejects(stage, 'Unverified or incomplete staged bytes must not be accepted.');
  assert.equal(await sourceHash(input.workspace), input.project.report.sourceHash, 'The approved source remains unchanged.');
  await assert.rejects(fs.stat(path.join(input.staging, 'source')), { code: 'ENOENT' }, 'Failed staging must be removed.');
  assert.equal(await fs.readFile(path.join(input.staging, 'caller-owned.txt'), 'utf8'), 'Keep this unrelated file.');
}

async function interceptAssetCopy(input, action, run) {
  const originalCopyFile = fs.copyFile;
  const asset = await fs.realpath(path.join(input.workspace, 'assets/status.mjs'));
  let injected = false;
  fs.copyFile = async (source, destination, ...args) => {
    if (source !== asset) return originalCopyFile(source, destination, ...args);
    injected = true;
    return action({ source, destination, copy: () => originalCopyFile(source, destination, ...args) });
  };
  try { await run(); }
  finally { fs.copyFile = originalCopyFile; }
  assert.equal(injected, true, 'The controlled secondary-asset copy boundary was exercised.');
}

test('executable staging preserves exact nested, binary, empty and dependency payload bytes', { concurrency: false }, async t => {
  const input = await fixture(t);
  const staged = await stageExecutable(input.project, input.staging);
  assert.deepEqual((await fs.readdir(staged.source)).sort(), ['application', 'main.cjs', 'package.json']);
  for (const [relative, bytes] of input.files) {
    assert.deepEqual(await fs.readFile(path.join(staged.source, 'application', relative)), bytes, relative);
  }
  assert.doesNotMatch(await fs.readFile(path.join(staged.source, 'main.cjs'), 'utf8'), /Generated main must remain payload data/);
  const wrapper = JSON.parse(await fs.readFile(path.join(staged.source, 'package.json'), 'utf8'));
  assert.equal(wrapper.main, 'main.cjs');
  assert.notEqual(wrapper.name, 'generated-payload');
  assert.equal(wrapper.dependencies, undefined);
  assert.equal(await sourceHash(input.workspace), input.project.report.sourceHash);
  assert.equal(await fs.readFile(path.join(input.staging, 'caller-owned.txt'), 'utf8'), 'Keep this unrelated file.');
});

test('executable staging rejects secondary bytes copied during a source edit restored before final verification', { concurrency: false }, async t => {
  const input = await fixture(t);
  await interceptAssetCopy(input, async ({ source, copy }) => {
    const approved = await fs.readFile(source);
    await fs.writeFile(source, 'document.body.dataset.result="UNVERIFIED";');
    try { return await copy(); }
    finally { await fs.writeFile(source, approved); }
  }, () => assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging)));
});

for (const relative of ['assets/status.mjs', 'index.html']) {
  test(`executable staging rejects corruption of copied ${relative} while source stays approved`, { concurrency: false }, async t => {
    const input = await fixture(t);
    await interceptAssetCopy(input, async ({ copy }) => {
      await copy();
      await fs.writeFile(path.join(input.staging, 'source/application', relative), 'Unverified copied bytes');
    }, () => assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging)));
  });
}

test('executable staging rejects a missing copied asset and removes the incomplete payload', { concurrency: false }, async t => {
  const input = await fixture(t);
  await interceptAssetCopy(input, async ({ destination, copy }) => {
    await copy();
    await fs.rm(destination);
  }, () => assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging)));
});

test('executable staging rejects undeclared files added to the copied payload', { concurrency: false }, async t => {
  const input = await fixture(t);
  await interceptAssetCopy(input, async ({ destination, copy }) => {
    await copy();
    await fs.writeFile(path.join(path.dirname(destination), 'unlisted.json'), '{"unverified":true}');
  }, () => assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging)));
});

for (const relative of ['.DS_Store', '.git/private']) {
  test(`executable staging rejects undeclared ${relative} even though source inventory normally ignores it`, { concurrency: false }, async t => {
    const input = await fixture(t);
    await interceptAssetCopy(input, async ({ copy }) => {
      await copy();
      await write(path.join(input.staging, 'source/application'), relative, 'Hidden unverified bytes');
    }, () => assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging)));
  });
}

test('executable staging rejects a payload symlink to another declared file with identical approved bytes', { concurrency: false }, async t => {
  const input = await fixture(t);
  // Equal bytes make a bytes-only check insufficient: the payload must remain
  // ordinary files even when a link would currently resolve inside its root.
  await fs.writeFile(path.join(input.workspace, 'evaluate.cjs'), input.files.get('assets/status.mjs'));
  input.project.report.sourceHash = await sourceHash(input.workspace);
  await interceptAssetCopy(input, async ({ destination, copy }) => {
    await copy();
    await fs.rm(destination);
    await fs.symlink('../evaluate.cjs', destination);
  }, () => assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging)));
});

test('executable staging rejects a payload symlink outside the staged application and preserves its target', { concurrency: false }, async t => {
  const input = await fixture(t);
  const externalTarget = path.join(input.root, 'external-script.mjs');
  const bytes = input.files.get('assets/status.mjs');
  await fs.writeFile(externalTarget, bytes);
  await interceptAssetCopy(input, async ({ destination, copy }) => {
    await copy();
    await fs.rm(destination);
    await fs.symlink(externalTarget, destination);
  }, () => assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging)));
  assert.deepEqual(await fs.readFile(externalTarget), bytes, 'Cleanup must unlink the staged symlink, not remove its target.');
});

test('executable staging rejects a payload directory replaced with a symlink and preserves the moved directory', { concurrency: false }, async t => {
  const input = await fixture(t);
  const externalPayload = path.join(input.root, 'moved-application');
  await interceptAssetCopy(input, async ({ copy }) => {
    await copy();
    const payload = path.join(input.staging, 'source/application');
    await fs.rename(payload, externalPayload);
    await fs.symlink(externalPayload, payload, 'dir');
  }, () => assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging)));
  assert.equal((await fs.stat(externalPayload)).isDirectory(), true, 'Cleanup must preserve the symlink target directory.');
  for (const relative of ['index.html', 'assets/status.mjs']) {
    assert.deepEqual(await fs.readFile(path.join(externalPayload, relative)), input.files.get(relative), relative);
  }
});

test('executable staging rejects unverified files beside the generated application payload', { concurrency: false }, async t => {
  const input = await fixture(t);
  await interceptAssetCopy(input, async ({ copy }) => {
    await copy();
    await fs.writeFile(path.join(input.staging, 'source/extra-secret.txt'), 'Unverified package sibling');
  }, () => assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging)));
});

test('executable staging removes partial output after a copy failure without deleting caller files', { concurrency: false }, async t => {
  const input = await fixture(t);
  await interceptAssetCopy(input, async ({ destination }) => {
    await fs.writeFile(destination, 'Partial copied file');
    throw new Error('Injected copy failure');
  }, () => assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging)));
});

test('executable staging removes its directory after entrypoint validation fails', { concurrency: false }, async t => {
  const input = await fixture(t);
  await fs.writeFile(path.join(input.workspace, 'index.html'), '');
  input.project.report.sourceHash = await sourceHash(input.workspace);
  await assertRejectedCleanly(input, () => stageExecutable(input.project, input.staging));
});

test('executable staging never removes a pre-existing caller source directory', { concurrency: false }, async t => {
  const input = await fixture(t);
  await write(input.staging, 'source/keep.txt', 'Existing caller data');
  await assert.rejects(stageExecutable(input.project, input.staging));
  assert.equal(await fs.readFile(path.join(input.staging, 'source/keep.txt'), 'utf8'), 'Existing caller data');
  assert.equal(await fs.readFile(path.join(input.staging, 'caller-owned.txt'), 'utf8'), 'Keep this unrelated file.');
});
