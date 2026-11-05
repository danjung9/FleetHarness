import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { captureSnapshot, defaultStages, discoverTests, runChecks } from '../scripts/check.mjs';

const execute = promisify(execFile);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const nodeStage = (id, source, timeoutMs = 10_000) => ({ id, command: process.execPath, args: ['-e', source], timeoutMs });

async function repository(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-offline-check-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const sourceRoot = path.join(directory, 'source');
  await fs.mkdir(sourceRoot);
  await fs.mkdir(path.join(sourceRoot, 'node_modules'));
  await fs.writeFile(path.join(sourceRoot, '.gitignore'), 'node_modules/\noutput/\ndist/\ndist-electron/\ndist-harness/\n');
  await fs.writeFile(path.join(sourceRoot, 'package.json'), '{"name":"check-fixture","private":true,"type":"module"}\n');
  await fs.writeFile(path.join(sourceRoot, 'package-lock.json'), '{"name":"check-fixture","lockfileVersion":3,"packages":{"":{"name":"check-fixture"}}}\n');
  await fs.writeFile(path.join(sourceRoot, 'node_modules', '.package-lock.json'), '{"lockfileVersion":3,"packages":{}}\n');
  await fs.writeFile(path.join(sourceRoot, 'app.mjs'), 'export const value = "original";\n');
  await fs.writeFile(path.join(sourceRoot, 'deleted.mjs'), 'export const removed = true;\n');
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete env[key];
  const git = args => execute('git', args, { cwd: sourceRoot, env });
  await git(['init', '--quiet']);
  await git(['add', '.']);
  await git(['-c', 'user.name=Offline Check Test', '-c', 'user.email=offline-check@example.invalid',
    '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'Initial test fixture']);
  return { directory, sourceRoot, git };
}

async function absent(file) {
  await assert.rejects(fs.lstat(file), { code: 'ENOENT' });
}

async function savedReport(result) {
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(result.directory, 'result.json'), 'utf8')), result.report);
  assert.ok(Number.isFinite(Date.parse(result.report.startedAt)));
  assert.ok(Number.isFinite(Date.parse(result.report.finishedAt)));
}

test('snapshot captures dirty and untracked bytes, executable permissions and tracked deletions', async t => {
  const fixture = await repository(t);
  const changed = 'export const value = "edited before commit";\n';
  const binary = Buffer.from([0, 0xff, 0xfe, 0x80, 0x0a]);
  await fs.writeFile(path.join(fixture.sourceRoot, 'app.mjs'), changed);
  await fs.unlink(path.join(fixture.sourceRoot, 'deleted.mjs'));
  await fs.mkdir(path.join(fixture.sourceRoot, 'new directory'));
  await fs.writeFile(path.join(fixture.sourceRoot, 'new directory', 'untracked.bin'), binary);
  await fs.writeFile(path.join(fixture.sourceRoot, 'run.sh'), '#!/bin/sh\nexit 0\n', { mode: 0o751 });
  await fs.chmod(path.join(fixture.sourceRoot, 'run.sh'), 0o751);
  for (const name of ['dist', 'dist-electron', 'dist-harness', 'output']) {
    await fs.mkdir(path.join(fixture.sourceRoot, name));
    await fs.writeFile(path.join(fixture.sourceRoot, name, 'stale.js'), 'must remain outside snapshot');
  }
  const workspace = path.join(fixture.directory, 'snapshot');
  const snapshot = await captureSnapshot(fixture.sourceRoot, workspace);
  assert.equal(await fs.readFile(path.join(workspace, 'app.mjs'), 'utf8'), changed);
  assert.deepEqual(await fs.readFile(path.join(workspace, 'new directory', 'untracked.bin')), binary);
  assert.equal((await fs.stat(path.join(workspace, 'run.sh'))).mode & 0o777, 0o751);
  const binaryEntry = snapshot.files.find(file => file.path === 'new directory/untracked.bin');
  assert.equal(binaryEntry.sha256, digest(binary));
  assert.equal(binaryEntry.bytes, binary.length);
  assert.match(snapshot.sha256, /^[a-f0-9]{64}$/);
  for (const name of ['deleted.mjs', '.git', 'node_modules', 'dist', 'dist-electron', 'dist-harness', 'output']) {
    await absent(path.join(workspace, name));
    assert.ok(!snapshot.files.some(file => file.path === name || file.path.startsWith(name + '/')));
  }
  assert.equal(await fs.readFile(path.join(fixture.sourceRoot, 'dist', 'stale.js'), 'utf8'), 'must remain outside snapshot');
});

test('snapshot refuses source symlinks rather than copying external contents', async t => {
  const fixture = await repository(t);
  const outside = path.join(fixture.directory, 'outside.txt');
  await fs.writeFile(outside, 'external data');
  await fs.symlink(outside, path.join(fixture.sourceRoot, 'linked.txt'));
  await assert.rejects(captureSnapshot(fixture.sourceRoot, path.join(fixture.directory, 'snapshot')), /ordinary files and directories/);
});

test('checks use distinct private workspaces and retain logs, hashes and dependency provenance', async t => {
  const fixture = await repository(t);
  const stages = [nodeStage('fixture-build', 'const fs = require("node:fs"); fs.mkdirSync("dist"); fs.writeFileSync("dist/result.txt", "private build"); console.log(process.cwd()); console.error("retained diagnostic");')];
  const first = await runChecks({ sourceRoot: fixture.sourceRoot, stages });
  const second = await runChecks({ sourceRoot: fixture.sourceRoot, stages });
  assert.notEqual(first.directory, second.directory);
  assert.notEqual(first.report.workspace, second.report.workspace);
  assert.equal(first.report.sourceHash, second.report.sourceHash);
  for (const result of [first, second]) {
    assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
    assert.equal(result.report.scope, 'custom');
    assert.equal(result.report.checksPassed, true);
    assert.equal(result.report.sourceUnchanged, true);
    assert.equal(result.report.dependencies.shared, true);
    assert.equal(result.report.dependencies.path, await fs.realpath(path.join(fixture.sourceRoot, 'node_modules')));
    assert.equal(await fs.realpath(path.join(result.report.workspace, 'node_modules')), result.report.dependencies.path);
    assert.equal(result.report.dependencies.packageLockHash, digest(await fs.readFile(path.join(fixture.sourceRoot, 'package-lock.json'))));
    assert.equal(await fs.readFile(path.join(result.report.workspace, 'dist', 'result.txt'), 'utf8'), 'private build');
    const log = await fs.readFile(path.join(result.directory, result.report.stages[0].log), 'utf8');
    assert.ok(log.includes(result.report.workspace));
    assert.match(log, /retained diagnostic/);
    const manifest = JSON.parse(await fs.readFile(path.join(result.directory, 'source-manifest.json'), 'utf8'));
    assert.equal(manifest.sha256, result.report.sourceHash);
    assert.equal(manifest.files.length, result.report.sourceFiles);
    assert.match(result.report.gitHead, /^[a-f0-9]{40,64}$/);
    await savedReport(result);
  }
  await absent(path.join(fixture.sourceRoot, 'dist'));
});

test('private builds leave preexisting shared build output untouched', async t => {
  const fixture = await repository(t);
  const sentinel = Buffer.from([0, 0xff, 0x7f, 0x0a]);
  await fs.mkdir(path.join(fixture.sourceRoot, 'dist'));
  await fs.writeFile(path.join(fixture.sourceRoot, 'dist', 'existing.bin'), sentinel);
  const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [
    nodeStage('private-build', 'const fs = require("node:fs"); fs.mkdirSync("dist"); fs.writeFileSync("dist/existing.bin", "new private output"); fs.writeFileSync("dist/new.js", "private");')
  ] });
  assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
  assert.equal(result.report.checksPassed, true);
  assert.equal(result.report.sourceUnchanged, true);
  assert.deepEqual(await fs.readFile(path.join(fixture.sourceRoot, 'dist', 'existing.bin')), sentinel);
  assert.equal(await fs.readFile(path.join(result.report.workspace, 'dist', 'existing.bin'), 'utf8'), 'new private output');
  await absent(path.join(fixture.sourceRoot, 'dist', 'new.js'));
  await savedReport(result);
});

test('failed stages preserve both output streams and leave downstream work unrun', async t => {
  const fixture = await repository(t);
  const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [
    nodeStage('fails', 'console.log("stdout evidence"); console.error("stderr evidence"); process.exitCode = 7;'),
    nodeStage('must-not-run', 'require("node:fs").writeFileSync("should-not-exist", "ran");')
  ] });
  assert.equal(result.report.status, 'failed');
  assert.equal(result.report.checksPassed, false);
  assert.equal(result.report.stages[0].exitCode, 7);
  assert.equal(result.report.stages[0].status, 'failed');
  assert.equal(result.report.stages[1].status, 'not_run');
  const log = await fs.readFile(path.join(result.directory, result.report.stages[0].log), 'utf8');
  assert.match(log, /stdout evidence/);
  assert.match(log, /stderr evidence/);
  await absent(path.join(result.report.workspace, 'should-not-exist'));
  await savedReport(result);
});

test('a missing executable produces retained failure evidence', async t => {
  const fixture = await repository(t);
  const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [
    { id: 'missing-program', command: path.join(fixture.directory, 'does-not-exist'), args: [], timeoutMs: 1000 }
  ] });
  assert.equal(result.report.status, 'failed');
  assert.equal(result.report.stages[0].status, 'failed');
  assert.notEqual(result.report.stages[0].exitCode, 0);
  assert.match(result.report.stages[0].error, /ENOENT/);
  await fs.access(path.join(result.directory, result.report.stages[0].log));
  await savedReport(result);
});

test('signal termination cannot count as stage success', { skip: process.platform === 'win32' }, async t => {
  const fixture = await repository(t);
  const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [
    nodeStage('terminated', 'process.kill(process.pid, "SIGTERM");')
  ] });
  assert.equal(result.report.status, 'failed');
  assert.equal(result.report.stages[0].status, 'failed');
  assert.equal(result.report.stages[0].exitCode, null);
  assert.equal(result.report.stages[0].signal, 'SIGTERM');
});

test('stage timeout fails and keeps later stages unrun', async t => {
  const fixture = await repository(t);
  const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [
    nodeStage('deadline', 'setInterval(() => {}, 1000);', 150),
    nodeStage('later', 'process.exitCode = 0;')
  ] });
  assert.equal(result.report.status, 'failed');
  assert.equal(result.report.stages[0].status, 'failed');
  assert.match(result.report.stages[0].error, /exceeded 150 ms/);
  assert.equal(result.report.stages[1].status, 'not_run');
  await savedReport(result);
});

test('timeout cleanup terminates a descendant even after its parent has exited', { skip: process.platform === 'win32', timeout: 15_000 }, async t => {
  const fixture = await repository(t);
  let descendant;
  t.after(() => { if (descendant) { try { process.kill(descendant, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } } });
  const child = 'require("node:fs").writeFileSync("child.pid", String(process.pid)); process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);';
  const source = `require("node:child_process").spawn(process.execPath, ["-e", ${JSON.stringify(child)}], { stdio: "ignore" }); setInterval(() => {}, 1000);`;
  const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [nodeStage('process-tree', source, 1000)] });
  descendant = Number(await fs.readFile(path.join(result.report.workspace, 'child.pid'), 'utf8'));
  assert.ok(Number.isSafeInteger(descendant) && descendant > 0);
  assert.equal(result.report.status, 'failed');
  // Allow the kernel to reap a killed descendant before probing the process ID.
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.throws(() => process.kill(descendant, 0), { code: 'ESRCH' }, 'A timed-out stage must not leave a mutating descendant alive.');
  descendant = undefined;
});

for (const ignoresTermination of [false, true]) {
  test(`successful parent cannot leave a ${ignoresTermination ? 'SIGTERM-resistant' : 'running'} descendant behind`,
    { skip: process.platform === 'win32', timeout: 15_000 }, async t => {
      const fixture = await repository(t);
      const original = await fs.readFile(path.join(fixture.sourceRoot, 'app.mjs'), 'utf8');
      let descendant;
      t.after(() => { if (descendant) { try { process.kill(descendant, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } } });
      const child = `const fs = require('node:fs');
        fs.mkdirSync('output', { recursive: true });
        fs.writeFileSync('output/child.pid', String(process.pid));
        ${ignoresTermination ? "process.on('SIGTERM', () => fs.writeFileSync('output/sigterm-observed', 'ignored'));" : ''}
        setInterval(() => {
          if (fs.existsSync('output/probe-after-completion')) fs.writeFileSync('app.mjs', 'mutated after check completion');
        }, 10);
        process.send('ready');`;
      // A readiness handshake ensures the descendant and its signal handler exist
      // before its parent exits successfully. Ignored output permits close to fire.
      const source = `const child = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(child)}],
        { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
        child.once('message', () => { child.disconnect(); child.unref(); });`;
      const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [
        nodeStage('leaks-descendant', source),
        nodeStage('must-not-run', "require('node:fs').writeFileSync('output/later-stage-ran', 'ran');")
      ] });
      const workspace = result.report.workspace;
      descendant = Number(await fs.readFile(path.join(workspace, 'output', 'child.pid'), 'utf8'));
      assert.ok(Number.isSafeInteger(descendant) && descendant > 0);
      // Probe after the result is finalized: surviving work must not be able to
      // invalidate the source manifest after a completed check has been reported.
      await fs.writeFile(path.join(workspace, 'output', 'probe-after-completion'), 'probe');
      await new Promise(resolve => setTimeout(resolve, 100));
      let alive = false;
      try { process.kill(descendant, 0); alive = true; }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
      const sourceAfterCompletion = await fs.readFile(path.join(workspace, 'app.mjs'), 'utf8');
      assert.deepEqual({
        status: result.report.status, checksPassed: result.report.checksPassed,
        parentExitCode: result.report.stages[0].exitCode, parentSignal: result.report.stages[0].signal,
        stageStatus: result.report.stages[0].status, laterStageStatus: result.report.stages[1].status,
        descendantAlive: alive, sourceAfterCompletion
      }, {
        status: 'failed', checksPassed: false, parentExitCode: 0, parentSignal: null,
        stageStatus: 'failed', laterStageStatus: 'not_run', descendantAlive: false, sourceAfterCompletion: original
      });
      assert.match(result.report.stages[0].error, /descendant|process group|processes|children/i);
      await absent(path.join(workspace, 'output', 'later-stage-ran'));
      if (ignoresTermination) assert.equal(await fs.readFile(path.join(workspace, 'output', 'sigterm-observed'), 'utf8'), 'ignored');
      assert.equal(result.report.sourceUnchanged, true);
      assert.equal(await fs.readFile(path.join(fixture.sourceRoot, 'app.mjs'), 'utf8'), original);
      await savedReport(result);
      descendant = undefined;
    });
}

test('successful parent with descendant-held stdio is cleaned up before the stage deadline',
  { skip: process.platform === 'win32', timeout: 15_000 }, async t => {
    const fixture = await repository(t);
    let descendant;
    t.after(() => { if (descendant) { try { process.kill(descendant, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } } });
    const child = `const fs = require('node:fs');
      fs.mkdirSync('output', { recursive: true });
      fs.writeFileSync('output/child.pid', String(process.pid));
      process.on('SIGTERM', () => fs.writeFileSync('output/sigterm-observed', 'ignored'));
      console.log('descendant keeps stdout open');
      setInterval(() => {}, 1000);
      process.send('ready');`;
    const source = `const child = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(child)}],
      { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      child.once('message', () => { child.disconnect(); child.unref(); });`;
    const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [
      nodeStage('holds-stdio', source, 5000), nodeStage('must-not-run', '')
    ] });
    descendant = Number(await fs.readFile(path.join(result.report.workspace, 'output', 'child.pid'), 'utf8'));
    assert.ok(Number.isSafeInteger(descendant) && descendant > 0);
    assert.equal(result.report.status, 'failed');
    assert.equal(result.report.checksPassed, false);
    const stage = result.report.stages[0];
    assert.equal(stage.status, 'failed');
    assert.equal(stage.exitCode, 0, 'The direct parent exited successfully while its descendant held the pipes.');
    assert.equal(stage.signal, null);
    assert.match(stage.error, /descendant|process group|processes|children/i);
    assert.doesNotMatch(stage.error, /exceeded|timeout|deadline/i, 'Cleanup must begin at parent exit instead of waiting for close or timeout.');
    assert.equal(result.report.stages[1].status, 'not_run');
    assert.equal(await fs.readFile(path.join(result.report.workspace, 'output', 'sigterm-observed'), 'utf8'), 'ignored');
    assert.match(await fs.readFile(path.join(result.directory, stage.log), 'utf8'), /descendant keeps stdout open/);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.throws(() => process.kill(descendant, 0), { code: 'ESRCH' });
    await savedReport(result);
    descendant = undefined;
  });

test('descendant that finishes naturally after its parent does not fail a successful stage',
  { skip: process.platform === 'win32', timeout: 10_000 }, async t => {
    const fixture = await repository(t);
    let descendant;
    t.after(() => { if (descendant) { try { process.kill(descendant, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } } });
    const child = `const fs = require('node:fs');
      fs.mkdirSync('output', { recursive: true });
      fs.writeFileSync('output/child.pid', String(process.pid));
      process.on('SIGTERM', () => { fs.writeFileSync('output/shutdown', 'terminated'); process.exit(1); });
      process.once('disconnect', () => setTimeout(() => {
        fs.writeFileSync('output/shutdown', 'natural');
        console.log('natural descendant shutdown complete');
      }, 50));
      process.send('ready');`;
    const source = `const child = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(child)}],
      { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      child.once('message', () => { child.disconnect(); child.unref(); });`;
    const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [
      nodeStage('natural-shutdown', source), nodeStage('later-stage', "console.log('later stage ran');")
    ] });
    descendant = Number(await fs.readFile(path.join(result.report.workspace, 'output', 'child.pid'), 'utf8'));
    assert.ok(Number.isSafeInteger(descendant) && descendant > 0);
    assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
    assert.equal(result.report.checksPassed, true);
    assert.equal(result.report.sourceUnchanged, true);
    assert.equal(result.report.stages[0].exitCode, 0);
    assert.equal(result.report.stages[0].error, undefined);
    assert.equal(result.report.stages[1].status, 'passed');
    assert.equal(await fs.readFile(path.join(result.report.workspace, 'output', 'shutdown'), 'utf8'), 'natural');
    assert.match(await fs.readFile(path.join(result.directory, result.report.stages[0].log), 'utf8'), /natural descendant shutdown complete/);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.throws(() => process.kill(descendant, 0), { code: 'ESRCH' });
    await savedReport(result);
    descendant = undefined;
  });

test('cancellation stops a running stage and persists a cancelled result', async t => {
  const fixture = await repository(t);
  const controller = new AbortController();
  let timer;
  t.after(() => clearTimeout(timer));
  const result = await runChecks({ sourceRoot: fixture.sourceRoot, signal: controller.signal,
    onProgress: message => { if (message === 'Running cancellable') timer = setTimeout(() => controller.abort(new Error('Fixture cancellation')), 200); },
    stages: [nodeStage('cancellable', 'console.log("running until cancelled"); setInterval(() => {}, 1000);'), nodeStage('later', '')]
  });
  assert.equal(result.report.status, 'cancelled');
  assert.equal(result.report.checksPassed, false);
  assert.equal(result.report.stages[0].status, 'cancelled');
  assert.equal(result.report.stages[1].status, 'not_run');
  await savedReport(result);
});

test('source additions during checks invalidate a current-tree pass without erasing snapshot success', async t => {
  const fixture = await repository(t);
  const added = path.join(fixture.sourceRoot, 'concurrent-edit.mjs');
  const result = await runChecks({ sourceRoot: fixture.sourceRoot,
    stages: [nodeStage('passing-with-edit', `require("node:fs").writeFileSync(${JSON.stringify(added)}, "export const added = true;");`)]
  });
  assert.equal(result.report.checksPassed, true);
  assert.equal(result.report.sourceUnchanged, false);
  assert.equal(result.report.status, 'failed');
  assert.ok(result.report.errors.some(error => /Source changed during checks/.test(error)));
  await absent(path.join(result.report.workspace, 'concurrent-edit.mjs'));
  await savedReport(result);
});

test('stages cannot mutate captured source and retain a passing result', async t => {
  const fixture = await repository(t);
  const original = await fs.readFile(path.join(fixture.sourceRoot, 'app.mjs'), 'utf8');
  const result = await runChecks({ sourceRoot: fixture.sourceRoot,
    stages: [nodeStage('mutates-capture', 'require("node:fs").writeFileSync("app.mjs", "export const changed = true;");')]
  });
  assert.equal(result.report.checksPassed, true);
  assert.equal(result.report.sourceUnchanged, true);
  assert.equal(result.report.status, 'failed');
  assert.ok(result.report.errors.some(error => /Captured source changed during checks: app\.mjs/.test(error)));
  assert.equal(await fs.readFile(path.join(fixture.sourceRoot, 'app.mjs'), 'utf8'), original);
});

test('new source added inside a captured workspace invalidates otherwise passing commands', async t => {
  const fixture = await repository(t);
  const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [
    nodeStage('injected-source', 'const fs = require("node:fs"); fs.mkdirSync("src"); fs.writeFileSync("src/injected.ts", "export const injected = true;");')
  ] });
  assert.equal(result.report.checksPassed, true);
  assert.equal(result.report.sourceUnchanged, true);
  assert.equal(result.report.status, 'failed');
  assert.ok(result.report.errors.some(error => /Source was added to the captured snapshot during checks: src\/injected\.ts/.test(error)));
  await absent(path.join(fixture.sourceRoot, 'src'));
  await savedReport(result);
});

test('shared dependency lock drift invalidates otherwise passing checks', async t => {
  const fixture = await repository(t);
  const result = await runChecks({ sourceRoot: fixture.sourceRoot,
    stages: [nodeStage('dependency-drift', 'require("node:fs").writeFileSync("node_modules/.package-lock.json", "{\\"changed\\":true}");')]
  });
  assert.equal(result.report.checksPassed, true);
  assert.equal(result.report.sourceUnchanged, true);
  assert.equal(result.report.status, 'failed');
  assert.ok(result.report.errors.some(error => /shared dependency installation changed/.test(error)));
  await savedReport(result);
});

test('test discovery rejects empty suites and returns sorted explicit paths', async t => {
  const fixture = await repository(t);
  const directory = path.join(fixture.directory, 'tests');
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, 'helper.mjs'), '');
  await assert.rejects(discoverTests(directory, '.test.mjs'), /No \.test\.mjs tests found/);
  await fs.writeFile(path.join(directory, 'z.test.mjs'), '');
  await fs.writeFile(path.join(directory, 'a test.test.mjs'), '');
  assert.deepEqual(await discoverTests(directory, '.test.mjs'), [path.join(directory, 'a test.test.mjs'), path.join(directory, 'z.test.mjs')]);
});

test('empty discovered test stages fail rather than silently reporting success', async t => {
  const fixture = await repository(t);
  await fs.mkdir(path.join(fixture.sourceRoot, 'tests'));
  await fs.writeFile(path.join(fixture.sourceRoot, 'tests', 'README.md'), 'No tests are present.');
  const stage = { ...nodeStage('empty-tests', ''), tests: { directory: 'tests', suffix: '.test.mjs' } };
  const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [stage] });
  assert.equal(result.report.status, 'failed');
  assert.equal(result.report.checksPassed, false);
  assert.ok(result.report.errors.some(error => /No \.test\.mjs tests found/.test(error)));
  assert.notEqual(result.report.stages[0].status, 'passed');
  await savedReport(result);
});

test('default offline plan includes frontend, both compilers, pinned assets and both test inventories', () => {
  const stages = defaultStages();
  assert.ok(stages.some(stage => stage.args.includes('--noEmit')), 'Frontend TypeScript must be checked.');
  const frontendBuild = stages.find(stage => stage.args.some(arg => /vite[/\\]bin[/\\]vite\.js$/.test(arg)));
  assert.ok(frontendBuild?.args.includes('build'), 'The frontend production bundle must be built.');
  assert.ok(frontendBuild.args.includes('--configLoader') && frontendBuild.args.includes('runner'), 'Vite config output must avoid the shared dependency tree.');
  for (const config of ['electron/tsconfig.json', 'harness/tsconfig.json']) {
    assert.ok(stages.some(stage => stage.args.includes('-p') && stage.args.includes(config)), `${config} must compile.`);
  }
  assert.ok(stages.some(stage => stage.args.includes('scripts/check-foundations.mjs')), 'Pinned foundation checksums must be verified.');
  assert.ok(stages.some(stage => stage.tests?.directory === 'dist-harness/tests' && stage.tests.suffix === '.test.js'));
  assert.ok(stages.some(stage => stage.tests?.directory === 'tests' && stage.tests.suffix === '.test.mjs'));
  assert.ok(stages.every(stage => stage.command === process.execPath && Number.isSafeInteger(stage.timeoutMs) && stage.timeoutMs > 0));
  assert.ok(!stages.some(stage => stage.args.includes('--live') || stage.args.includes('install') || stage.args.includes('ci')), 'Offline checks must not initiate live runs or dependency installation.');
});

for (const persistent of [false, true]) test(`process-group permission probe ${persistent ? 'persistent denial fails' : 'transient denial resolves after confirmed exit'}`,
  { skip: process.platform === 'win32', timeout: 10_000 }, async t => {
    const fixture = await repository(t);
    const originalKill = process.kill.bind(process);
    let probes = 0;
    t.mock.method(process, 'kill', (pid, signal) => {
      if (pid < 0 && signal === 0) {
        probes++;
        if (persistent || probes === 1) throw Object.assign(new Error('kill EPERM'), { code: 'EPERM' });
      }
      return originalKill(pid, signal);
    });
    const result = await runChecks({ sourceRoot: fixture.sourceRoot, stages: [
      nodeStage('permission-probe', ''), nodeStage('later-stage', '')
    ] });
    assert.ok(probes >= 2, 'A denied probe must be checked again');
    assert.equal(result.report.status, persistent ? 'failed' : 'passed', JSON.stringify(result.report));
    assert.equal(result.report.checksPassed, !persistent);
    assert.equal(result.report.stages[1].status, persistent ? 'not_run' : 'passed');
    if (persistent) assert.match(result.report.stages[0].error, /EPERM/);
    else assert.equal(result.report.stages[0].error, undefined);
    await savedReport(result);
  });
