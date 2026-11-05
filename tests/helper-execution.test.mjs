import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { executeHelperProcess } from '../dist-electron/electron/helper-execution.js';

async function fixture(t, source) {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-helper-test-')));
  const workspace = path.join(base, 'workspace');
  await fs.mkdir(path.join(workspace, '.agent-tools', 'example'), { recursive: true });
  const script = path.join(workspace, '.agent-tools', 'example', 'run.mjs');
  await fs.writeFile(script, source);
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  return { base, workspace, script,
    run: options => executeHelperProcess({ workspace, executable: process.execPath, command: [process.execPath, script], ...options }) };
}

const supported = ['darwin', 'linux'].includes(process.platform);

test('helper sandbox runs argv and stdin without inheriting credentials or loader hooks', { skip: !supported }, async t => {
  const f = await fixture(t, `
    import fs from 'node:fs/promises';
    let input = ''; for await (const chunk of process.stdin) input += chunk;
    await fs.writeFile(process.env.FLEET_HELPER_OUTPUT + '/result.json', input);
    console.log(JSON.stringify({input, args: process.argv.slice(2), secret: process.env.FLEET_HELPER_TEST_SECRET, hook: process.env.NODE_OPTIONS, cwd: process.cwd()}));
  `);
  const previousSecret = process.env.FLEET_HELPER_TEST_SECRET, previousHook = process.env.NODE_OPTIONS;
  process.env.FLEET_HELPER_TEST_SECRET = 'must-stay-in-host';
  process.env.NODE_OPTIONS = '--require=/missing/host-loader.cjs';
  try {
    const result = await f.run({ command: [process.execPath, f.script, 'spaces ; $(not-a-shell)'], stdin: '{"rows":3}' });
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(result.timedOut, false); assert.equal(result.outputLimited, false);
    assert.deepEqual(JSON.parse(result.stdout), { input: '{"rows":3}', args: ['spaces ; $(not-a-shell)'], cwd: f.workspace });
    assert.equal(await fs.readFile(path.join(f.workspace, '.agent-output', 'result.json'), 'utf8'), '{"rows":3}');
  } finally {
    if (previousSecret === undefined) delete process.env.FLEET_HELPER_TEST_SECRET; else process.env.FLEET_HELPER_TEST_SECRET = previousSecret;
    if (previousHook === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = previousHook;
  }
});

test('CLI main guards receive canonical entrypoints through macOS temporary directory aliases', { skip: !supported }, async t => {
  const f = await fixture(t, `
    import { pathToFileURL } from 'node:url';
    if (import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify({main:true,args:process.argv.slice(2)}));
  `);
  const workspaceAlias = path.join(os.tmpdir(), path.basename(f.base), 'workspace');
  const scriptAlias = path.join(workspaceAlias, '.agent-tools', 'example', 'run.mjs');
  const argument = '/var/data/is-an-argument-not-a-file';
  const result = await f.run({ workspace: workspaceAlias, command: [process.execPath, '--no-global-search-paths', scriptAlias, argument] });
  assert.equal(result.exitCode, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {main:true,args:[argument]});
  await fs.writeFile(f.script, `import test from 'node:test'; import assert from 'node:assert/strict'; import {pathToFileURL} from 'node:url'; test('canonical test entrypoint', () => assert.equal(import.meta.url, pathToFileURL(process.argv[1]).href));`);
  const tested = await f.run({ workspace: workspaceAlias, command: [process.execPath, '--test', '--test-reporter=tap', scriptAlias] });
  assert.equal(tested.exitCode, 0, tested.stderr);
  assert.match(tested.stdout, /canonical test entrypoint/);
});

test('helper sandbox denies outside reads/writes and preserves source, inputs, own scripts and host evidence', { skip: !supported }, async t => {
  const f = await fixture(t, `
    import fs from 'node:fs/promises';
    const failures = {};
    const attempt = async (name, task) => { try { await task(); failures[name] = 'unexpected success'; } catch (error) { failures[name] = error.code; } };
    await attempt('outsideRead', () => fs.readFile(process.argv[2]));
    await attempt('outsideWrite', () => fs.writeFile(process.argv[2], 'changed'));
    for (const file of ['requirements.md', 'app.mjs', 'inputs/input.txt', '.fleet/packet.json', '.agent-tools/example/run.mjs']) {
      await attempt(file, () => fs.writeFile(file, 'changed'));
    }
    await attempt('hostEvidence', () => fs.readFile('.quality-evidence/answer.txt'));
    await attempt('sealedPlan', () => fs.writeFile('evaluation-plan.json', 'new plan'));
    await attempt('symlinkRead', () => fs.readFile('outside-link'));
    await attempt('symlinkWrite', () => fs.writeFile('outside-link', 'changed'));
    await attempt('hardlink', async () => { await fs.link('app.mjs', '.agent-output/app-link'); await fs.writeFile('.agent-output/app-link', 'changed'); });
    console.log(JSON.stringify(failures));
  `);
  const outside = path.join(f.base, 'outside.txt');
  await fs.writeFile(outside, 'private');
  await fs.mkdir(path.join(f.workspace, '.codex'));
  await fs.writeFile(path.join(f.workspace, '.codex/config.toml'), '[permissions.fleet-helper.filesystem]\n' + JSON.stringify(outside) + '="write"\n[permissions.fleet-helper.network]\nenabled=true\n');
  for (const file of ['requirements.md', 'app.mjs', 'inputs/input.txt', '.fleet/packet.json', '.quality-evidence/answer.txt']) {
    await fs.mkdir(path.dirname(path.join(f.workspace, file)), { recursive: true });
    await fs.writeFile(path.join(f.workspace, file), 'original');
  }
  await fs.mkdir(path.join(f.workspace, '.agent-output'));
  await fs.symlink(outside, path.join(f.workspace, 'outside-link'));
  const result = await f.run({ command: [process.execPath, f.script, outside] });
  assert.equal(result.exitCode, 0, result.stderr);
  const failures = JSON.parse(result.stdout);
  for (const [operation, code] of Object.entries(failures)) assert.match(code, /^(EPERM|EACCES)$/, `${operation}: ${code}`);
  assert.equal(await fs.readFile(outside, 'utf8'), 'private');
  assert.equal(await fs.readFile(path.join(f.workspace, 'app.mjs'), 'utf8'), 'original');
});

test('helper sandbox blocks even loopback network connections', { skip: !supported }, async t => {
  const server = createServer((_request, response) => response.end('network was reached'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const f = await fixture(t, `
    import net from 'node:net';
    const socket = net.connect(Number(process.argv[2]), '127.0.0.1');
    socket.once('connect', () => { console.log('connected'); socket.destroy(); });
    socket.once('error', error => console.log(error.code));
  `);
  const result = await f.run({ command: [process.execPath, f.script, String(server.address().port)] });
  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout.trim(), /^(EPERM|EACCES)$/);
});

test('helper timeout and combined stdout/stderr limits stop the sandbox', { skip: !supported, timeout: 10000 }, async t => {
  const f = await fixture(t, 'setInterval(() => {}, 1000);');
  const hanging = await f.run({ timeoutMs: 150 });
  assert.equal(hanging.exitCode, null); assert.equal(hanging.timedOut, true);
  await fs.writeFile(f.script, `setInterval(() => { process.stdout.write('x'.repeat(4000)); process.stderr.write('y'.repeat(4000)); }, 1);`);
  const verbose = await f.run({ maxOutputBytes: 5000 });
  assert.equal(verbose.exitCode, null); assert.equal(verbose.outputLimited, true);
  assert.ok(Buffer.byteLength(verbose.stdout) + Buffer.byteLength(verbose.stderr) <= 5000);
  await fs.writeFile(f.script, 'process.stdout.write(Buffer.alloc(30, 255));');
  const binary = await f.run({ maxOutputBytes: 32 });
  assert.equal(binary.outputLimited, true);
  assert.ok(Buffer.byteLength(binary.stdout) + Buffer.byteLength(binary.stderr) <= 32);
});

test('helper validation can execute the Node test runner inside the same sandbox', { skip: !supported }, async t => {
  const f = await fixture(t, `import test from 'node:test'; import assert from 'node:assert/strict'; test('parser fixture', () => assert.deepEqual(JSON.parse('{"value":7}'), {value:7}));`);
  const result = await f.run({ command: [process.execPath, '--test', f.script] });
  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /parser fixture/);
  assert.match(result.stdout, /pass 1/);
});

test('cancellation terminates the helper process group', { skip: !supported, timeout: 10000 }, async t => {
  const f = await fixture(t, `
    import fs from 'node:fs';
    fs.writeFileSync(process.env.FLEET_HELPER_OUTPUT + '/child.pid', String(process.pid));
    setInterval(() => {}, 1000);
  `);
  const controller = new AbortController();
  const result = f.run({ signal: controller.signal });
  const rejected = assert.rejects(result, /stopped/);
  let pid;
  for (let i = 0; i < 100; i++) {
    try { pid = Number(await fs.readFile(path.join(f.workspace, '.agent-output/child.pid'), 'utf8')); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 20)); }
  }
  controller.abort();
  await rejected;
  assert.ok(pid, 'helper process should have started');
  let stopped = false;
  for (let i = 0; i < 50; i++) {
    try { process.kill(pid, 0); await new Promise(resolve => setTimeout(resolve, 20)); }
    catch (error) { assert.equal(error.code, 'ESRCH'); stopped = true; break; }
  }
  assert.equal(stopped, true, 'helper process remained alive');
});

test('helpers cannot spawn detached daemons, workers or disable runtime permissions', { skip: !supported }, async t => {
  const f = await fixture(t, `
    import { spawn } from 'node:child_process'; import { Worker } from 'node:worker_threads';
    const failures = {};
    try { const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {detached:true,stdio:'ignore'}); child.unref(); failures.spawn = 'unexpected success'; }
    catch (error) { failures.spawn = error.code; }
    try { new Worker('setInterval(() => {}, 1000)', {eval:true}); failures.worker = 'unexpected success'; }
    catch (error) { failures.worker = error.code; }
    console.log(JSON.stringify(failures));
  `);
  const result = await f.run({});
  assert.equal(result.exitCode, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {spawn:'ERR_ACCESS_DENIED', worker:'ERR_ACCESS_DENIED'});
  for (const flag of ['--no-permission', '--allow-child-process', '--allow-worker', '--allow-addons', '--require=bootstrap.cjs']) {
    await assert.rejects(f.run({ command: [process.execPath, flag, f.script] }), /Unsupported helper runtime flag/);
  }
});

test('bundled Electron executes helper files and tests with Node permission enforcement', { skip: process.platform !== 'darwin' }, async t => {
  const { default: electron } = await import('electron');
  const f = await fixture(t, `
    import test from 'node:test'; import assert from 'node:assert/strict'; import {spawn} from 'node:child_process';
    test('blocks subprocesses', () => assert.throws(() => spawn(process.execPath, ['-e', 'console.log(1)']), {code:'ERR_ACCESS_DENIED'}));
  `);
  const result = await f.run({ executable: electron, command: [electron, '--no-global-search-paths', '--test', '--test-reporter=tap', f.script] });
  assert.equal(result.exitCode, 0, result.stderr);
  assert.match(result.stdout, /blocks subprocesses/);
  assert.match(result.stdout, /pass 1/);
});

test('already cancelled helpers do not create artifacts; output symlinks fail before execution', { skip: !supported }, async t => {
  const f = await fixture(t, 'console.log("must not run");');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(f.run({ signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(fs.stat(path.join(f.workspace, '.agent-output')), { code: 'ENOENT' });
  await fs.mkdir(path.join(f.base, 'outside-output'));
  await fs.symlink(path.join(f.base, 'outside-output'), path.join(f.workspace, '.agent-output'));
  await assert.rejects(f.run({}), /ordinary .agent-output directory/);
});

test('preexisting hardlinks and symlinks under helper output cannot alias outside files', { skip: !supported }, async t => {
  const f = await fixture(t, 'throw new Error("must not run");');
  const outside = path.join(f.base, 'private.txt'), output = path.join(f.workspace, '.agent-output');
  await fs.writeFile(outside, 'original'); await fs.mkdir(output);
  const linked = path.join(output, 'linked.txt');
  await fs.link(outside, linked);
  await assert.rejects(f.run({}), /without symlinks or hardlinks/);
  await fs.unlink(linked); await fs.symlink(outside, linked);
  await assert.rejects(f.run({}), /without symlinks or hardlinks/);
  assert.equal(await fs.readFile(outside, 'utf8'), 'original');
});

test('helper execution rejects a different runtime and reports command failure without fallback', { skip: !supported }, async t => {
  const f = await fixture(t, 'process.exit(17);');
  await assert.rejects(f.run({ command: ['/bin/sh', f.script] }), /configured runtime/);
  const result = await f.run({});
  assert.equal(result.exitCode, 17); assert.equal(result.timedOut, false);
});
