import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { toProjectInput } from '../harness/catalog.js';
import { createPacket } from '../harness/planner.js';
import { syntheticDataPhase } from '../harness/phases.js';
import { prepareFleetWorkspace, assertFleetPacketIntegrity } from '../harness/integration.js';

const execute = promisify(execFile);
const binary = Buffer.from([0, 0xff, 0xc3, 0x28, 0x80, 0x7f]);

async function fixture(t: TestContext) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-skills-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const resourcesRoot = path.join(root, 'resources'), workspace = path.join(root, 'workspace');
  await fs.mkdir(workspace);
  await fs.cp(path.join(process.cwd(), 'templates'), path.join(resourcesRoot, 'templates'), { recursive: true });
  const skills = [...new Set([...createPacket('12').stages.flatMap(phase => phase.skills), ...syntheticDataPhase.skills])];
  for (const skill of skills) {
    const directory = path.join(resourcesRoot, 'skills', skill);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'SKILL.md'), `---\nname: ${skill}\ndescription: Test packet skill.\n---\nRead references/nested/guide.md when present.\n`);
  }
  const skillRoot = path.join(resourcesRoot, 'skills', 'fleet-ux');
  const args = { workspace, resourcesRoot, ...toProjectInput('12') };
  return { root, skillRoot, args, packetRoot: path.join(workspace, '.fleet') };
}

async function addAssets(skillRoot: string) {
  await fs.mkdir(path.join(skillRoot, 'references', 'nested'), { recursive: true });
  await fs.mkdir(path.join(skillRoot, 'assets'));
  await fs.mkdir(path.join(skillRoot, 'scripts'));
  await fs.writeFile(path.join(skillRoot, 'references/nested/guide.md'), 'Nested reference with Unicode: café.\n');
  await fs.writeFile(path.join(skillRoot, 'assets/example.bin'), binary);
  const script = path.join(skillRoot, 'scripts/check.sh');
  await fs.writeFile(script, '#!/bin/sh\nprintf "skill script ran\\n"\n');
  await fs.chmod(script, 0o751);
}

test('skill packaging copies nested references and binary assets and preserves runnable scripts', async t => {
  const { args, skillRoot, packetRoot } = await fixture(t);
  await addAssets(skillRoot);
  const result = await prepareFleetWorkspace(args);
  const delivered = path.join(packetRoot, 'skills/fleet-ux');
  assert.equal(await fs.readFile(path.join(delivered, 'references/nested/guide.md'), 'utf8'), 'Nested reference with Unicode: café.\n');
  assert.deepEqual(await fs.readFile(path.join(delivered, 'assets/example.bin')), binary);
  assert.equal((await fs.stat(path.join(delivered, 'scripts/check.sh'))).mode & 0o111, 0o111);
  assert.equal((await execute(path.join(delivered, 'scripts/check.sh'))).stdout, 'skill script ran\n');
  const manifest = JSON.parse(await fs.readFile(path.join(packetRoot, 'manifest.json'), 'utf8'));
  for (const name of ['skills/fleet-ux/references/nested/guide.md', 'skills/fleet-ux/assets/example.bin', 'skills/fleet-ux/scripts/check.sh', 'skill-modes.json']) {
    assert.ok(manifest.files.includes(name), name);
  }
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(packetRoot, 'skill-modes.json'), 'utf8')), { 'skills/fleet-ux/scripts/check.sh': 0o111 });
  await assertFleetPacketIntegrity(args.workspace, result.packetHash);
  assert.deepEqual(await prepareFleetWorkspace(args), result);

  const another = path.join(path.dirname(args.workspace), 'another-workspace');
  await fs.mkdir(another);
  assert.equal((await prepareFleetWorkspace({ ...args, workspace: another })).packetHash, result.packetHash);
  assert.deepEqual(await fs.readFile(path.join(another, '.fleet/manifest.json')), await fs.readFile(path.join(packetRoot, 'manifest.json')));
});

test('text-only skill packets retain the v1 filename and UTF-8 byte digest', async t => {
  const { args, packetRoot } = await fixture(t);
  const result = await prepareFleetWorkspace(args);
  const manifest = JSON.parse(await fs.readFile(path.join(packetRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.version, 1);
  assert.ok(!manifest.files.includes('skill-modes.json'));
  const legacyDigest = createHash('sha256');
  for (const name of [...manifest.files].sort()) legacyDigest.update(name + '\0' + await fs.readFile(path.join(packetRoot, name), 'utf8') + '\0');
  assert.equal(result.packetHash, legacyDigest.digest('hex'));
  await assertFleetPacketIntegrity(args.workspace, result.packetHash);
});

test('packet integrity detects nested text, raw binary and executable permission changes', async t => {
  const { args, skillRoot, packetRoot } = await fixture(t);
  await addAssets(skillRoot);
  const result = await prepareFleetWorkspace(args);
  for (const [relative, replacement] of [
    ['references/nested/guide.md', Buffer.from('Changed nested guide\n')],
    // Both 0xff and 0xfe decode as replacement characters; binary hashing must still distinguish them.
    ['assets/example.bin', Buffer.from([0, 0xfe, 0xc3, 0x28, 0x80, 0x7f])]
  ] as const) {
    const file = path.join(packetRoot, 'skills/fleet-ux', relative), original = await fs.readFile(file);
    await fs.writeFile(file, replacement);
    await assert.rejects(assertFleetPacketIntegrity(args.workspace, result.packetHash), /integrity failed/);
    await assert.rejects(prepareFleetWorkspace(args), /differs/);
    await fs.writeFile(file, original);
  }
  const script = path.join(packetRoot, 'skills/fleet-ux/scripts/check.sh');
  await fs.chmod(script, 0o600);
  await assert.rejects(assertFleetPacketIntegrity(args.workspace, result.packetHash), /executable permissions changed/);
  await assert.rejects(prepareFleetWorkspace(args), /differs/);
  await fs.chmod(script, 0o711);
  await assertFleetPacketIntegrity(args.workspace, result.packetHash);
  await fs.writeFile(path.join(packetRoot, 'skills/fleet-ux/references/unexpected.md'), 'Unplanned reference\n');
  await assert.rejects(prepareFleetWorkspace(args), /differs/);
  await assert.rejects(assertFleetPacketIntegrity(args.workspace, result.packetHash), /integrity failed/);
});

test('skill source symlinks are rejected before creating a packet', async t => {
  const { args, root, skillRoot } = await fixture(t);
  await fs.mkdir(path.join(skillRoot, 'references'));
  await fs.writeFile(path.join(root, 'external.md'), 'Outside the skill\n');
  await fs.symlink(path.join(root, 'external.md'), path.join(skillRoot, 'references/linked.md'));
  await assert.rejects(prepareFleetWorkspace(args), /symbolic links/);
  assert.deepEqual(await fs.readdir(args.workspace), []);
  await fs.unlink(path.join(skillRoot, 'references/linked.md'));
  await fs.symlink(root, path.join(skillRoot, 'references/linked-directory'));
  await assert.rejects(prepareFleetWorkspace(args), /symbolic links/);
  assert.deepEqual(await fs.readdir(args.workspace), []);
});

test('a symlink skill root is rejected', async t => {
  const { args, root, skillRoot } = await fixture(t);
  const destination = path.join(root, 'moved-skill');
  await fs.rename(skillRoot, destination);
  await fs.symlink(destination, skillRoot);
  await assert.rejects(prepareFleetWorkspace(args), /symbolic links/);
  assert.deepEqual(await fs.readdir(args.workspace), []);
});

test('packet integrity and idempotency reject symlinks even to matching packet bytes', async t => {
  const { args, root, packetRoot } = await fixture(t);
  const result = await prepareFleetWorkspace(args);
  const file = path.join(packetRoot, 'skills/fleet-ux/SKILL.md'), linked = path.join(root, 'linked.md');
  await fs.rename(file, linked);
  await fs.symlink(linked, file);
  await assert.rejects(assertFleetPacketIntegrity(args.workspace, result.packetHash), /symbolic links/);
  await assert.rejects(prepareFleetWorkspace(args), /symbolic links/);
});

test('special skill entries are rejected without opening them', { skip: process.platform === 'win32' }, async t => {
  const { args, skillRoot, packetRoot } = await fixture(t);
  const fifo = path.join(skillRoot, 'pipe');
  await execute('mkfifo', [fifo]);
  await assert.rejects(prepareFleetWorkspace(args), /only ordinary files/);
  assert.deepEqual(await fs.readdir(args.workspace), []);
  await fs.unlink(fifo);
  const result = await prepareFleetWorkspace(args);
  await execute('mkfifo', [path.join(packetRoot, 'pipe')]);
  await assert.rejects(assertFleetPacketIntegrity(args.workspace, result.packetHash), /only ordinary files/);
  await assert.rejects(prepareFleetWorkspace(args), /only ordinary files/);
});

test('the bundled Impeccable launcher fails promptly when its optional engine is unavailable', async t => {
  const { root } = await fixture(t);
  const launcher = path.join(process.cwd(), 'skills/impeccable/scripts/fleet-launcher.mjs');
  await assert.rejects(execute(process.execPath, [launcher, 'context'], {
    cwd: root, timeout: 5000, env: { ...process.env, IMPECCABLE_BIN: path.join(root, 'missing-engine') }
  }), (error: any) => {
    assert.equal(error.code, 127);
    assert.match(error.stderr, /Read existing PRODUCT.md, DESIGN.md and skill references directly/);
    assert.match(error.stderr, /No installation or download was attempted/);
    return true;
  });
});

test('the offline launcher forwards local checks with updates and hook side effects disabled', { skip: process.platform === 'win32' }, async t => {
  const { root } = await fixture(t);
  const skill = path.join(process.cwd(), 'skills/impeccable');
  const launcher = path.join(skill, 'scripts/fleet-launcher.mjs');
  const version = (await fs.readFile(path.join(skill, 'scripts/VERSION'), 'utf8')).trim();
  const engine = path.join(root, 'engine');
  await fs.writeFile(engine, `#!/bin/sh
if [ "$1" = engine-probe ]; then
  printf '%s\\n' 'impeccable-engine ${version}'
else
  printf '%s\\n' "$*" "$IMPECCABLE_SKILL_DIR" "$IMPECCABLE_NO_UPDATE_CHECK" "$IMPECCABLE_NO_STALENESS_CHECK" "$IMPECCABLE_HOOK_DISABLED" "$APPYARD_RUN_PROCESS"
fi
`, { mode: 0o700 });
  const options = { cwd: root, timeout: 5000, env: { ...process.env, IMPECCABLE_BIN: engine, APPYARD_RUN_PROCESS: 'synthetic-skill-run' } };
  for (const command of ['context', 'detect']) {
    const result = await execute(process.execPath, [launcher, command, '--target', 'app.html', '--json'], options);
    assert.deepEqual(result.stdout.trim().split('\n'), [`${command} --target app.html --json`, skill, '1', '1', '1', 'synthetic-skill-run']);
  }
  for (const args of [['update'], ['hooks', 'on'], ['detect', 'https://example.com'], ['detect', '--target=https://example.com'], ['detect', '//example.com']]) {
    await assert.rejects(execute(process.execPath, [launcher, ...args], options), (error: any) => {
      assert.equal(error.code, 2);
      assert.equal(error.stdout, '', 'The engine must not run for disallowed commands or URL scans');
      return true;
    });
  }
  await fs.writeFile(engine, '#!/bin/sh\nprintf "impeccable-engine 0.0.0\\n"\n');
  await assert.rejects(execute(process.execPath, [launcher, 'context'], options), (error: any) => {
    assert.equal(error.code, 127);
    return true;
  });
});
