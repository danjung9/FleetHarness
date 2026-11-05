import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { runChecks } from '../scripts/check.mjs';

const execute = promisify(execFile);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const nodeStage = (id, source, timeoutMs = 10_000) => ({ id, command: process.execPath, args: ['-e', source], timeoutMs });

async function repository(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-check-pipe-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const sourceRoot = path.join(directory, 'source');
  await fs.mkdir(path.join(sourceRoot, 'node_modules'), { recursive: true });
  await fs.writeFile(path.join(sourceRoot, '.gitignore'), 'node_modules/\noutput/\n');
  await fs.writeFile(path.join(sourceRoot, 'package.json'), '{"name":"pipe-fixture","private":true}\n');
  await fs.writeFile(path.join(sourceRoot, 'package-lock.json'), '{"lockfileVersion":3,"packages":{"":{"name":"pipe-fixture"}}}\n');
  await fs.writeFile(path.join(sourceRoot, 'node_modules', '.package-lock.json'), '{"lockfileVersion":3,"packages":{}}\n');
  await fs.writeFile(path.join(sourceRoot, 'app.mjs'), 'export const value = 1;\n');
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete env[key];
  const git = args => execute('git', args, { cwd: sourceRoot, env });
  await git(['init', '--quiet']);
  await git(['add', '.']);
  await git(['-c', 'user.name=Pipe Cleanup Test', '-c', 'user.email=pipe-cleanup@example.invalid',
    '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'Fixture']);
  return { directory, sourceRoot };
}

async function waitForFile(file) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    try { return await fs.readFile(file, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await delay(10);
  }
  throw new Error(`Fixture did not become ready: ${file}`);
}

async function killOwnedDescendant(pidFile) {
  let pid;
  try { pid = Number(await fs.readFile(pidFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  assert.ok(Number.isSafeInteger(pid) && pid > 0, 'Cleanup only accepts a PID recorded by this fixture.');
  try { process.kill(pid, 'SIGKILL'); }
  catch (error) { if (error.code !== 'ESRCH') throw error; }
}

async function savedReport(result) {
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(result.directory, 'result.json'), 'utf8')), result.report);
  assert.ok(Number.isFinite(Date.parse(result.report.finishedAt)));
  assert.ok(Number.isFinite(Date.parse(result.report.stages[0].finishedAt)));
  assert.equal(result.report.sourceUnchanged, true);
}

// Race completion against an independent deadline before any fixture cleanup.
// The old runner hangs on close until that cleanup releases the inherited pipe;
// recording the persisted state first prevents cleanup from hiding the defect.
async function boundedResult(run, artifact, deadlineMs) {
  let watchdog;
  try {
    const result = await Promise.race([
      run,
      new Promise(resolve => { watchdog = setTimeout(() => resolve(null), deadlineMs); })
    ]);
    if (!result) {
      const persisted = JSON.parse(await fs.readFile(path.join(artifact(), 'result.json'), 'utf8'));
      assert.fail(`runChecks did not settle within ${deadlineMs} ms before owned descendant cleanup; `
        + `persisted report=${persisted.status}, stage=${persisted.stages[0].status}`);
    }
    return result;
  } finally { clearTimeout(watchdog); }
}

for (const stream of ['stdout', 'stderr']) {
  for (const mode of ['timeout', 'cancel']) {
    test(`${mode} settles with detached ${stream} held after ${mode === 'timeout' ? 'parent exit' : 'parent termination'}`,
      { skip: process.platform === 'win32', timeout: 12_000 }, async t => {
        const fixture = await repository(t);
        const pidFile = path.join(fixture.directory, 'owned-descendant.pid');
        const readyFile = path.join(fixture.directory, 'ready.json');
        const controller = new AbortController();
        const parentExitCode = stream === 'stdout' ? 0 : 23;
        const descendant = `const fs = require('node:fs');
          fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
          process.on('SIGTERM', () => {});
          process.${stream}.write('retained detached ${stream} evidence\\n');
          setInterval(() => {}, 1000);
          setTimeout(() => process.exit(0), 15_000).unref();
          process.send('ready');`;
        const source = `const fs = require('node:fs');
          const child = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}],
            { detached: true, stdio: ['ignore', ${stream === 'stdout' ? "'inherit', 'ignore'" : "'ignore', 'inherit'"}, 'ipc'] });
          console.log('retained parent stdout evidence');
          console.error('retained parent stderr evidence');
          child.once('message', () => {
            child.disconnect(); child.unref();
            fs.writeFileSync(${JSON.stringify(readyFile)}, JSON.stringify({ parent: process.pid, descendant: child.pid }));
            ${mode === 'timeout' ? `process.exitCode = ${parentExitCode};` : 'setInterval(() => {}, 1000);'}
          });`;
        let artifact;
        const run = runChecks({ sourceRoot: fixture.sourceRoot, signal: controller.signal,
          onProgress: message => { if (message.startsWith('Check artifacts: ')) artifact = message.slice('Check artifacts: '.length); },
          stages: [nodeStage('holds-pipe', source, mode === 'timeout' ? 1500 : 10_000),
            nodeStage('must-not-run', "require('node:fs').writeFileSync('output/later-stage-ran', 'ran');")]
        });
        try {
          const ready = JSON.parse(await waitForFile(readyFile));
          assert.equal(ready.descendant, Number(await fs.readFile(pidFile, 'utf8')));
          if (mode === 'cancel') {
            // Abort only after the detached descendant owns the selected pipe.
            process.kill(ready.parent, 0);
            controller.abort(new Error('Fixture cancellation'));
          } else {
            const exitDeadline = Date.now() + 750;
            let parentAlive = true;
            while (parentAlive && Date.now() < exitDeadline) {
              try { process.kill(ready.parent, 0); await delay(10); }
              catch (error) { if (error.code !== 'ESRCH') throw error; parentAlive = false; }
            }
            assert.equal(parentAlive, false, 'The direct parent must exit before the stage timeout.');
          }
          // Allows 2 s signal escalation, a short pipe drain, and CI scheduling.
          const result = await boundedResult(run, () => artifact, mode === 'timeout' ? 5000 : 3500);
          const stage = result.report.stages[0];
          assert.equal(result.report.status, mode === 'cancel' ? 'cancelled' : 'failed');
          assert.equal(result.report.checksPassed, false);
          assert.equal(stage.status, mode === 'cancel' ? 'cancelled' : 'failed');
          assert.equal(stage.exitCode, mode === 'timeout' ? parentExitCode : null);
          assert.equal(stage.signal, mode === 'timeout' ? null : 'SIGTERM');
          if (mode === 'timeout') assert.match(stage.error, /exceeded 1500 ms/);
          else assert.doesNotMatch(stage.error ?? '', /exceeded|timeout/i);
          assert.equal(result.report.stages[1].status, 'not_run');
          await assert.rejects(fs.access(path.join(result.report.workspace, 'output/later-stage-ran')), { code: 'ENOENT' });
          const log = await fs.readFile(path.join(result.directory, stage.log), 'utf8');
          assert.match(log, /retained parent stdout evidence/);
          assert.match(log, /retained parent stderr evidence/);
          assert.ok(log.includes(`retained detached ${stream} evidence`));
          await savedReport(result);
        } finally {
          controller.abort(new Error('Fixture cleanup'));
          // The descendant deliberately escaped the runner's process group.
          // Kill only its recorded PID, after observing bounded completion.
          await killOwnedDescendant(pidFile);
          try { await boundedResult(run, () => artifact, 3000); }
          finally { await killOwnedDescendant(pidFile); }
        }
      });
  }
}

test('detached descendant that closes its pipe naturally preserves successful output',
  { skip: process.platform === 'win32', timeout: 10_000 }, async t => {
    const fixture = await repository(t);
    const pidFile = path.join(fixture.directory, 'owned-descendant.pid');
    const descendant = `require('node:fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
      process.once('disconnect', () => setTimeout(() => console.log('natural detached output retained'), 50));
      setTimeout(() => process.exit(0), 15_000).unref();
      process.send('ready');`;
    const source = `const child = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}],
      { detached: true, stdio: ['ignore', 'inherit', 'ignore', 'ipc'] });
      child.once('message', () => { child.disconnect(); child.unref(); });`;
    let artifact;
    const controller = new AbortController();
    const run = runChecks({ sourceRoot: fixture.sourceRoot, signal: controller.signal,
      onProgress: message => { if (message.startsWith('Check artifacts: ')) artifact = message.slice('Check artifacts: '.length); },
      stages: [nodeStage('natural-shutdown', source), nodeStage('later-stage', "console.log('later stage ran');")]
    });
    try {
      const result = await boundedResult(run, () => artifact, 3000);
      assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
      assert.equal(result.report.checksPassed, true);
      assert.equal(result.report.stages[0].exitCode, 0);
      assert.equal(result.report.stages[0].signal, null);
      assert.equal(result.report.stages[0].error, undefined);
      assert.equal(result.report.stages[1].status, 'passed');
      assert.match(await fs.readFile(path.join(result.directory, result.report.stages[0].log), 'utf8'), /natural detached output retained/);
      await savedReport(result);
    } finally {
      controller.abort(new Error('Fixture cleanup'));
      await killOwnedDescendant(pidFile);
      try { await boundedResult(run, () => artifact, 3000); }
      finally { await killOwnedDescendant(pidFile); }
    }
  });
