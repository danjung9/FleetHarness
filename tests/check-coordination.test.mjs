import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';

const execute = promisify(execFile);
const checkerUrl = new URL('../scripts/check.mjs', import.meta.url).href;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const runnerSource = `
  const { runChecks } = await import(${JSON.stringify(checkerUrl)});
  const options = JSON.parse(process.argv[1]);
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error('Fixture cancellation.'));
  process.on('message', message => { if (message === 'cancel') cancel(); });
  process.once('SIGTERM', cancel);
  process.once('SIGINT', cancel);
  try {
    const result = await runChecks({ ...options, signal: controller.signal,
      onProgress: message => process.send({ type: 'progress', message }) });
    process.send({ type: 'result', result });
  } catch (error) {
    process.send({ type: 'error', error: error.stack });
    process.exitCode = 1;
  } finally { process.disconnect(); }
`;

async function exists(file) {
  try { await fs.access(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function waitFor(probe, description) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value) return value;
    await pause(20);
  }
  assert.fail(`Timed out waiting for ${description}.`);
}

async function fixture(t, { alias = false } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-check-coordination-'));
  const runners = [];
  t.after(async () => {
    await Promise.all(runners.map(async runner => {
      if (runner.closed) return;
      runner.cancel();
      let cleanupTimer;
      await Promise.race([runner.completion, new Promise(resolve => { cleanupTimer = setTimeout(resolve, 6_000); })]);
      clearTimeout(cleanupTimer);
      if (!runner.closed) {
        runner.child.kill('SIGKILL');
        await runner.completion;
      }
    }));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const dependencies = path.join(directory, 'dependencies');
  await fs.mkdir(dependencies);
  await fs.writeFile(path.join(dependencies, '.package-lock.json'), '{"lockfileVersion":3,"packages":{}}\n');
  const dependencyAlias = path.join(directory, 'dependency-alias');
  if (alias) await fs.symlink(dependencies, dependencyAlias, process.platform === 'win32' ? 'junction' : 'dir');
  const roots = [];
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete env[key];
  for (const name of ['first', 'second', 'third']) {
    const root = path.join(directory, name);
    await fs.mkdir(root);
    // A trailing slash does not ignore a node_modules symlink in Git.
    await fs.writeFile(path.join(root, '.gitignore'), 'node_modules\noutput/\n');
    await fs.writeFile(path.join(root, 'package.json'), '{"name":"check-coordination-fixture","private":true,"type":"module"}\n');
    await fs.writeFile(path.join(root, 'package-lock.json'), '{"name":"check-coordination-fixture","lockfileVersion":3,"packages":{"":{"name":"check-coordination-fixture"}}}\n');
    await fs.writeFile(path.join(root, 'app.mjs'), 'export const value = "before waiting";\n');
    await fs.symlink(alias && name === 'second' ? dependencyAlias : dependencies,
      path.join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    const git = args => execute('git', args, { cwd: root, env });
    await git(['init', '--quiet']);
    await git(['add', '.']);
    await git(['-c', 'user.name=Coordination Check Test', '-c', 'user.email=coordination-check@example.invalid',
      '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'Initial coordination fixture']);
    roots.push(root);
  }
  return { directory, dependencies, roots, runners, env };
}

function stage(f, id, { hold = false, exitCode = 0 } = {}) {
  return { id, command: process.execPath, timeoutMs: 15_000, args: ['-e', `
    const fs = require('node:fs');
    const path = require('node:path');
    const directory = ${JSON.stringify(f.directory)};
    const id = ${JSON.stringify(id)};
    const record = phase => fs.appendFileSync(path.join(directory, 'events.jsonl'), JSON.stringify({ id, phase }) + '\\n');
    record('start');
    fs.writeFileSync(path.join(directory, id + '.started'), 'started');
    const finish = () => {
      record('end');
      console.log('retained stage ' + id);
      process.exitCode = ${exitCode};
    };
    ${hold ? `const timer = setInterval(() => {
      if (fs.existsSync(path.join(directory, id + '.release'))) { clearInterval(timer); finish(); }
    }, 10);` : 'finish();'}
  `] };
}

function start(f, index, options = {}) {
  const child = spawn(process.execPath, ['--input-type=module', '-e', runnerSource,
    JSON.stringify({ sourceRoot: f.roots[index], ...options })], {
    env: f.env, stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });
  const state = { child, progress: [], closed: false, output: '', result: undefined, error: undefined };
  state.cancel = () => { if (child.connected) child.send('cancel'); };
  child.stdout.on('data', chunk => { state.output += chunk; });
  child.stderr.on('data', chunk => { state.output += chunk; });
  child.on('message', message => {
    if (message.type === 'progress') state.progress.push(message.message);
    else if (message.type === 'result') state.result = message.result;
    else if (message.type === 'error') state.error = message.error;
  });
  state.completion = new Promise(resolve => {
    child.once('error', error => { state.error = error.message; });
    child.once('close', (code, signal) => { state.closed = true; state.code = code; state.signal = signal; resolve(); });
  });
  f.runners.push(state);
  return state;
}

async function resultOf(runner) {
  await runner.completion;
  assert.equal(runner.code, 0, runner.error || runner.output);
  assert.ok(runner.result, runner.error || runner.output);
  const result = runner.result;
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(result.directory, 'result.json'), 'utf8')), result.report);
  return result;
}

async function waiting(runner, unexpectedStageFile) {
  await waitFor(async () => {
    if (runner.progress.some(message => message.startsWith('Waiting for check lock: '))) return true;
    assert.ok(!runner.closed && !runner.result && !(unexpectedStageFile && await exists(unexpectedStageFile)),
      `The contender must wait before capturing or executing stages. ${runner.error || runner.output}`);
  }, 'the queued checker to report lock ownership');
  const artifactMessage = runner.progress.find(message => message.startsWith('Check artifacts: '));
  assert.ok(artifactMessage, 'Queued checks must retain a report directory.');
  const directory = artifactMessage.slice('Check artifacts: '.length);
  const report = await waitFor(async () => {
    const saved = JSON.parse(await fs.readFile(path.join(directory, 'result.json'), 'utf8'));
    return saved.coordination?.status === 'waiting' && saved.coordination.owner ? saved : undefined;
  }, 'the saved waiting report');
  assert.equal(report.sourceHash, undefined);
  assert.ok(report.stages.every(item => item.status === 'not_run'));
  assert.equal(await exists(path.join(directory, 'source-manifest.json')), false);
  assert.equal(await exists(path.join(report.workspace, 'app.mjs')), false);
  return { directory, report };
}

function assertReleased(result) {
  assert.equal(result.report.coordination.status, 'released');
  const coordination = result.report.coordination;
  for (const field of ['requestedAt', 'acquiredAt', 'releasedAt']) assert.ok(Number.isFinite(Date.parse(coordination[field])), field);
  assert.ok(Number.isFinite(coordination.waitMs) && coordination.waitMs >= 0);
  assert.equal(typeof coordination.lockPath, 'string');
  assert.equal(typeof coordination.owner, 'object');
}

for (const alias of [false, true]) {
  test(`separate checkout processes serialize shared dependencies${alias ? ' through a symlink alias' : ''}`, async t => {
    const f = await fixture(t, { alias });
    const first = start(f, 0, { coordination: true, stages: [stage(f, 'first', { hold: true })] });
    await waitFor(() => exists(path.join(f.directory, 'first.started')), 'the first stage');
    const second = start(f, 1, { coordination: true, stages: [stage(f, 'second')] });
    const queued = await waiting(second, path.join(f.directory, 'second.started'));
    assert.equal(queued.report.coordination.owner.pid, first.child.pid);
    const changed = 'export const value = "edited while queued";\n';
    await fs.writeFile(path.join(f.roots[1], 'app.mjs'), changed);
    await fs.writeFile(path.join(f.directory, 'first.release'), 'release');
    const [firstResult, secondResult] = await Promise.all([resultOf(first), resultOf(second)]);
    for (const result of [firstResult, secondResult]) {
      assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
      assertReleased(result);
    }
    assert.equal(firstResult.report.coordination.lockPath, secondResult.report.coordination.lockPath);
    assert.ok(secondResult.report.coordination.waitMs > 0);
    assert.ok(Date.parse(firstResult.report.stages[0].finishedAt) <= Date.parse(secondResult.report.stages[0].startedAt));
    assert.equal(await fs.readFile(path.join(secondResult.report.workspace, 'app.mjs'), 'utf8'), changed,
      'Capture must happen after acquisition, so queued edits become the checked source.');
    const events = (await fs.readFile(path.join(f.directory, 'events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.deepEqual(events, [
      { id: 'first', phase: 'start' }, { id: 'first', phase: 'end' },
      { id: 'second', phase: 'start' }, { id: 'second', phase: 'end' }
    ]);
  });
}

test('cancelling a queued checker retains an unrun report without releasing the active owner', async t => {
  const f = await fixture(t);
  const first = start(f, 0, { coordination: true, stages: [stage(f, 'owner', { hold: true })] });
  await waitFor(() => exists(path.join(f.directory, 'owner.started')), 'the owner stage');
  const second = start(f, 1, { coordination: true, stages: [stage(f, 'cancelled')] });
  await waiting(second, path.join(f.directory, 'cancelled.started'));
  second.cancel();
  const cancelled = await resultOf(second);
  assert.equal(cancelled.report.status, 'cancelled');
  assert.equal(cancelled.report.coordination.status, 'cancelled');
  assert.equal(cancelled.report.sourceHash, undefined);
  assert.ok(cancelled.report.stages.every(item => item.status === 'not_run'));
  assert.equal(await exists(path.join(cancelled.directory, 'source-manifest.json')), false);
  assert.equal(await exists(path.join(cancelled.directory, 'cancelled.log')), false);
  const third = start(f, 2, { coordination: true, stages: [stage(f, 'after-cancel')] });
  const queued = await waiting(third, path.join(f.directory, 'after-cancel.started'));
  assert.equal(queued.report.coordination.owner.pid, first.child.pid);
  await fs.writeFile(path.join(f.directory, 'owner.release'), 'release');
  for (const runner of [first, third]) {
    const result = await resultOf(runner);
    assert.equal(result.report.status, 'passed', JSON.stringify(result.report));
    assertReleased(result);
  }
});

test('active cancellation keeps the lease until a SIGTERM-resistant stage is killed', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t);
  const pidFile = path.join(f.directory, 'resistant.pid');
  const termFile = path.join(f.directory, 'resistant.sigterm');
  const resistant = { id: 'resistant', command: process.execPath, timeoutMs: 15_000, args: ['-e', `
    const fs = require('node:fs');
    process.on('SIGTERM', () => fs.writeFileSync(${JSON.stringify(termFile)}, 'ignored'));
    fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));
    setInterval(() => {}, 100);
  `] };
  const afterCleanup = stage(f, 'after-active-cancel');
  afterCleanup.args[1] = `
    try {
      process.kill(Number(require('node:fs').readFileSync(${JSON.stringify(pidFile)}, 'utf8')), 0);
      throw new Error('The cancelled stage is still alive when the successor starts.');
    } catch (error) { if (error.code !== 'ESRCH') throw error; }
  ` + afterCleanup.args[1];
  const first = start(f, 0, { coordination: true, stages: [resistant] });
  await waitFor(() => exists(pidFile), 'the cancellation-resistant stage');
  const second = start(f, 1, { coordination: true, stages: [afterCleanup] });
  await waiting(second, path.join(f.directory, 'after-active-cancel.started'));
  first.cancel();
  await waitFor(() => exists(termFile), 'the stage to ignore SIGTERM');
  const resistantPid = Number(await fs.readFile(pidFile, 'utf8'));
  assert.doesNotThrow(() => process.kill(resistantPid, 0), 'The stage must still be alive during escalation.');
  assert.equal(await exists(path.join(f.directory, 'after-active-cancel.started')), false,
    'Cancellation must retain the lease through process cleanup.');
  const [cancelled, passed] = await Promise.all([resultOf(first), resultOf(second)]);
  assert.equal(cancelled.report.status, 'cancelled');
  assert.equal(cancelled.report.stages[0].status, 'cancelled');
  assert.equal(passed.report.status, 'passed', JSON.stringify(passed.report));
  assertReleased(cancelled);
  assertReleased(passed);
  assert.ok(Date.parse(cancelled.report.stages[0].finishedAt) <= Date.parse(passed.report.stages[0].startedAt));
});

test('a failed stage releases the coordinated lease and preserves the failure for the next checker', async t => {
  const f = await fixture(t);
  const first = start(f, 0, { coordination: true, stages: [stage(f, 'fails', { hold: true, exitCode: 7 }), stage(f, 'unreachable')] });
  await waitFor(() => exists(path.join(f.directory, 'fails.started')), 'the failing stage');
  const second = start(f, 1, { coordination: true, stages: [stage(f, 'after-failure')] });
  await waiting(second, path.join(f.directory, 'after-failure.started'));
  await fs.writeFile(path.join(f.directory, 'fails.release'), 'release');
  const [failed, passed] = await Promise.all([resultOf(first), resultOf(second)]);
  assert.equal(failed.report.status, 'failed');
  assert.equal(failed.report.stages[0].exitCode, 7);
  assert.equal(failed.report.stages[1].status, 'not_run');
  assert.match(await fs.readFile(path.join(failed.directory, 'fails.log'), 'utf8'), /retained stage fails/);
  assert.equal(passed.report.status, 'passed', JSON.stringify(passed.report));
  assertReleased(failed);
  assertReleased(passed);
});

test('custom fixture stages remain unlocked by default while another checker holds the lease', async t => {
  const f = await fixture(t);
  const first = start(f, 0, { coordination: true, stages: [stage(f, 'holding', { hold: true })] });
  await waitFor(() => exists(path.join(f.directory, 'holding.started')), 'the owner stage');
  const second = start(f, 1, { stages: [stage(f, 'nested-fixture')] });
  await waitFor(() => exists(path.join(f.directory, 'nested-fixture.started')), 'unlocked custom fixture execution');
  const custom = await resultOf(second);
  assert.equal(custom.report.status, 'passed', JSON.stringify(custom.report));
  assert.equal(custom.report.scope, 'custom');
  assert.ok(!second.progress.some(message => message.startsWith('Waiting for check lock: ')));
  assert.equal(first.closed, false, 'The owner must still be holding the lease while the custom fixture completes.');
  await fs.writeFile(path.join(f.directory, 'holding.release'), 'release');
  assert.equal((await resultOf(first)).report.status, 'passed');
});

test('a full check cannot disable coordination and can be cancelled before any default stage starts', async t => {
  const f = await fixture(t);
  const first = start(f, 0, { coordination: true, stages: [stage(f, 'full-owner', { hold: true })] });
  await waitFor(() => exists(path.join(f.directory, 'full-owner.started')), 'the owner stage');
  const second = start(f, 1, { coordination: false });
  const queued = await waiting(second);
  assert.equal(queued.report.scope, 'full-offline');
  assert.equal(queued.report.coordination.owner.pid, first.child.pid);
  second.cancel();
  const result = await resultOf(second);
  assert.equal(result.report.status, 'cancelled');
  assert.equal(result.report.coordination.status, 'cancelled');
  assert.ok(result.report.stages.every(item => item.status === 'not_run'));
  assert.equal(await exists(path.join(result.directory, 'source-manifest.json')), false);
  await fs.writeFile(path.join(f.directory, 'full-owner.release'), 'release');
  assert.equal((await resultOf(first)).report.status, 'passed');
});

test('a bounded queue timeout retains failure without starting stages or taking the owner lease', async t => {
  const f = await fixture(t);
  const first = start(f, 0, { coordination: true, stages: [stage(f, 'timeout-owner', { hold: true })] });
  await waitFor(() => exists(path.join(f.directory, 'timeout-owner.started')), 'the owner stage');
  const second = start(f, 1, { coordination: true, coordinationTimeoutMs: 100, stages: [stage(f, 'times-out')] });
  const failed = await resultOf(second);
  assert.equal(failed.report.status, 'failed');
  assert.equal(failed.report.coordination.status, 'failed');
  assert.match(failed.report.errors.join('\n'), /wait|lock|queue|timed out/i);
  assert.ok(failed.report.stages.every(item => item.status === 'not_run'));
  assert.equal(await exists(path.join(failed.directory, 'source-manifest.json')), false);
  assert.equal(await exists(path.join(f.directory, 'times-out.started')), false);
  assert.equal(first.closed, false);
  await fs.writeFile(path.join(f.directory, 'timeout-owner.release'), 'release');
  const owner = await resultOf(first);
  assert.equal(owner.report.status, 'passed', JSON.stringify(owner.report));
  assertReleased(owner);
});
