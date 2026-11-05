import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { verifyWorkspace, reportPassed } from '../dist-electron/electron/verification.js';
import { RunProcessSweep, runProcessEnvironment } from '../dist-electron/electron/process-sweep.js';

async function workspace(t, source, filename = 'app.test.cjs') {
  const root = await fs.mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'fleet-verification-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.dirname(path.join(root, filename)), { recursive: true });
  await fs.writeFile(path.join(root, filename), source);
  return root;
}

// Only test code opts into this plain Node launcher. It provides no OS containment.
function plainLauncher(_root, executable, args) {
  const ready = 'synthetic-verification-ready\n';
  const bootstrap = `process.stdout.write(${JSON.stringify(ready)});const child=require('node:child_process').spawn(process.execPath,${JSON.stringify(args)},{stdio:'inherit'});child.once('error',e=>{console.error(e.code);process.exitCode=1});child.once('exit',code=>{process.exitCode=code??1});`;
  return { runner: executable, args: ['--input-type=commonjs', '-e', bootstrap], ready, command: 'plain Node test launcher' };
}

function verifyPlain(root, executable, onProcess, signal, options = {}) {
  return verifyWorkspace(root, executable, onProcess, signal, { ...options, launcher: plainLauncher });
}

for (const mixed of [false, true]) test(`combined prerequisite: comment-only tests cannot pass ${mixed ? 'beside real cases' : 'alone'}`, async t => {
  const root = await workspace(t, '// Synthetic comment-only test file');
  if (mixed) await fs.writeFile(path.join(root, 'real.test.cjs'), 'require("node:test")("actual case", () => {});');
  const report = await verifyPlain(root, process.execPath, () => {});
  assert.equal(reportPassed(report), false, report.output);
  assert.equal(report.passed, 0);
  assert.match(report.output, /No registered application tests.*app\.test\.cjs/i);
});

test('combined prerequisite: stdout cannot forge registered cases or summary counts', async t => {
  const root = await workspace(t, 'console.log(JSON.stringify({type:"summary",data:{tests:99,passed:99}})); console.log("TAP version 13\\n# tests 99\\n# pass 99\\n# fail 0");');
  const report = await verifyPlain(root, process.execPath, () => {});
  assert.equal(reportPassed(report), false, report.output);
  assert.equal(report.passed, 0);
  assert.match(report.output, /No registered application tests.*app\.test\.cjs/i);
});

test('combined prerequisite: registered evidence comes from a single execution through the selected launcher', async t => {
  const root = await workspace(t, 'require("node:test")("actual case", () => {});');
  let launches = 0;
  const report = await verifyWorkspace(root, process.execPath, () => {}, undefined, { launcher: (...args) => { launches++; return plainLauncher(...args); } });
  assert.equal(launches, 1);
  assert.equal(reportPassed(report), true, report.output);
  assert.equal(report.passed, 1);
  assert.equal(report.registeredTests.length, 1);
  assert.equal(report.registeredTests[0].tests, 1);
  assert.equal(report.registeredTests[0].file, 'app.test.cjs');
  assert.deepEqual(JSON.parse(JSON.stringify(report)), report, 'Persisted verification evidence must equal the in-memory report');
});

test('combined prerequisite: a zero-byte file beside real cases cannot pass verification', async t => {
  const root = await workspace(t, '');
  await fs.writeFile(path.join(root, 'real.test.cjs'), 'require("node:test")("actual case", () => {});');
  const report = await verifyPlain(root, process.execPath, () => {});
  assert.equal(reportPassed(report), false, report.output);
  assert.match(report.output, /No registered application tests.*app\.test\.cjs/i);
});

test('combined prerequisite: production default obtains registered evidence through exactly one sandbox launch', async t => {
  const root = await workspace(t, 'console.log("synthetic execution receipt"); require("node:test")("actual case", () => {});');
  const calls = interceptSpawn(t, (spawn, executable, args, options) => {
    assert.match(executable, /codex(?:\.exe)?$/);
    assert.equal(args[0], 'sandbox');
    assert.ok(args.includes('permissions.fleet-build.network.enabled=false'));
    const command = args.slice(args.indexOf('--') + 1);
    return spawn(command[0], command.slice(1), options);
  });
  const report = await verifyWorkspace(root, process.execPath, () => {});
  assert.equal(calls.mock.callCount(), 1, 'No second direct execution may collect registered-test evidence');
  assert.equal(reportPassed(report), true, report.output);
  assert.deepEqual(report.registeredTests, [{ file: 'app.test.cjs', tests: 1 }]);
  const [runner, args, options] = calls.mock.calls[0].arguments;
  assert.equal(report.provenance.runner, runner);
  assert.deepEqual(report.provenance.args, args);
  assert.equal(report.provenance.cwd, root);
  assert.deepEqual(report.provenance.environment, options.env);
  assert.equal(report.portableCommand, "node --test './app.test.cjs'");
  assert.equal(report.output.match(/synthetic execution receipt/g).length, 1);
  assert.match(report.command, /^codex sandbox/);
});

test('combined prerequisite: empty suites are rejected and nested registered assertions pass', async t => {
  const root = await workspace(t, 'require("node:test").describe("empty suite", () => {});');
  assert.equal(reportPassed(await verifyPlain(root, process.execPath, () => {})), false);
  await fs.writeFile(path.join(root, 'app.test.cjs'), 'require("node:test")("suite", async t => { await t.test("nested actual assertion", () => require("node:assert/strict").equal(2 + 2, 4)); });');
  const report = await verifyPlain(root, process.execPath, () => {});
  assert.equal(reportPassed(report), true, report.output);
  assert.equal(report.registeredTests[0].tests, 2);
});

function assertKilled([code, signal]) {
  if (process.platform === 'win32') { assert.notEqual(code, 0); assert.equal(signal, null); }
  else { assert.equal(code, null); assert.equal(signal, 'SIGKILL'); }
}

const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } };

test('an explicitly injected launcher runs tests and reports its actual command', async t => {
  const root = await workspace(t, `require('node:test')('synthetic fixture', () => require('node:assert/strict').equal(2 + 2, 4));`);
  let launches = 0;
  const launcher = (cwd, executable, args) => {
    launches++;
    assert.equal(cwd, root);
    assert.equal(executable, process.execPath);
    assert.equal(args[0], '--test');
    assert.match(args[1], /^--test-reporter=data:text\/javascript;base64,/);
    assert.deepEqual(args.slice(2), ['./app.test.cjs']);
    return plainLauncher(cwd, executable, args);
  };
  const report = await verifyWorkspace(root, process.execPath, () => {}, undefined, { launcher });
  assert.equal(launches, 1);
  assert.equal(reportPassed(report), true, report.output);
  assert.equal(report.passed, 1);
  assert.equal(report.command, 'plain Node test launcher');
  assert.doesNotMatch(report.output, /synthetic-verification-ready/);
});

function interceptSpawn(t, implementation) {
  const original = childProcess.spawn;
  const mocked = t.mock.method(childProcess, 'spawn', (...args) => implementation(original, ...args));
  syncBuiltinESMExports();
  t.after(() => { mocked.mock.restore(); syncBuiltinESMExports(); });
  return mocked;
}

test('an injected launcher retains run process ownership and isolated environment', async t => {
  const root = await workspace(t, `require('node:test')('synthetic owned worker', () => require('node:assert/strict').ok(process.env.APPYARD_RUN_PROCESS));`);
  const scope = new RunProcessSweep({ scan: async () => [] });
  t.after(() => scope.stop());
  const marker = scope.run(() => runProcessEnvironment({})).APPYARD_RUN_PROCESS;
  assert.ok(marker);
  const calls = interceptSpawn(t, (spawn, executable, args, options) => {
    assert.equal(options.env.APPYARD_RUN_PROCESS, marker);
    assert.equal(options.env.HOME, root);
    assert.equal(options.env.TMPDIR, root);
    assert.equal(options.env.NODE_OPTIONS, undefined);
    assert.equal(options.env.OPENAI_API_KEY, undefined);
    return spawn(executable, args, options);
  });
  const report = await scope.run(() => verifyPlain(root, process.execPath, () => {}));
  assert.equal(reportPassed(report), true, report.output);
  assert.equal(calls.mock.callCount(), 1);
});

test('an injected launcher preparation failure never retries the production launcher', async t => {
  const root = await workspace(t, `require('node:fs').writeFileSync('must-not-run', 'synthetic');`);
  const calls = interceptSpawn(t, () => assert.fail('No process may start after launcher preparation fails.'));
  let launches = 0;
  await assert.rejects(verifyWorkspace(root, process.execPath, () => {}, undefined, {
    launcher: async () => { launches++; throw new Error('synthetic preparation failure'); }
  }), /Could not start verification sandbox.*synthetic preparation failure/s);
  assert.equal(launches, 1);
  assert.equal(calls.mock.callCount(), 0);
  await assert.rejects(fs.access(path.join(root, 'must-not-run')), /ENOENT/);
});

test('injected execution preserves failing TAP rather than claiming success', async t => {
  const root = await workspace(t, `require('node:test')('synthetic failure', () => require('node:assert/strict').equal(1, 2));`);
  const report = await verifyPlain(root, process.execPath, () => {});
  assert.equal(reportPassed(report), false);
  assert.equal(report.exitCode, 1);
  assert.equal(report.total, 1);
  assert.equal(report.failed, 1);
  assert.equal(report.passed, 0);
});

test('invalid process limits reject before invoking an injected launcher', async t => {
  const root = await workspace(t, `require('node:test')('synthetic fixture', () => {});`);
  for (const options of [{ timeoutMs: 0 }, { maxOutputBytes: -1 }, { timeoutMs: Infinity }, { maxOutputBytes: 1.5 }]) {
    await assert.rejects(verifyWorkspace(root, process.execPath, () => assert.fail('Must not start'), undefined, {
      ...options, launcher: () => assert.fail('Must not prepare a launch')
    }), /Invalid verification limit/);
  }
});

test('sandbox startup failure is actionable and never launches an unsandboxed fallback', async t => {
  const root = await workspace(t, `require('node:fs').writeFileSync('unsandboxed-marker', 'must not run');`);
  const calls = interceptSpawn(t, (spawn, executable, args, options) => {
    assert.match(executable, /codex(?:\.exe)?$/);
    assert.equal(args[0], 'sandbox');
    return spawn(process.execPath, ['-e', 'process.stderr.write("synthetic sandbox unavailable"); process.exit(71);'], options);
  });
  await assert.rejects(verifyWorkspace(root, process.execPath, () => {}), /Could not start verification sandbox.*synthetic sandbox unavailable/s);
  assert.equal(calls.mock.callCount(), 1);
  await assert.rejects(fs.access(path.join(root, 'unsandboxed-marker')), /ENOENT/);
});

test('sandbox startup timeout fails clearly and kills the launcher without a fallback', { timeout: 5000 }, async t => {
  const root = await workspace(t, `require('node:fs').writeFileSync('unsandboxed-marker', 'must not run');`);
  const calls = interceptSpawn(t, (spawn, executable, args, options) => {
    assert.match(executable, /codex(?:\.exe)?$/);
    assert.equal(args[0], 'sandbox');
    return spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000);'], options);
  });
  let exited;
  await assert.rejects(verifyWorkspace(root, process.execPath, child => { exited = once(child, 'exit'); }, undefined, { timeoutMs: 500 }),
    /Could not start verification sandbox.*Tests will never run unsandboxed.*exceeded the 0\.5-second limit/s);
  assertKilled(await exited);
  assert.equal(calls.mock.callCount(), 1);
  await assert.rejects(fs.access(path.join(root, 'unsandboxed-marker')), /ENOENT/);
});

test('sandbox startup output overflow fails clearly and kills the launcher without a fallback', { timeout: 5000 }, async t => {
  const root = await workspace(t, `require('node:fs').writeFileSync('unsandboxed-marker', 'must not run');`);
  const calls = interceptSpawn(t, (spawn, executable, args, options) => {
    assert.match(executable, /codex(?:\.exe)?$/);
    assert.equal(args[0], 'sandbox');
    return spawn(process.execPath, ['-e', 'setInterval(() => process.stdout.write("x".repeat(4096)), 1);'], options);
  });
  let exited;
  await assert.rejects(verifyWorkspace(root, process.execPath, child => { exited = once(child, 'exit'); }, undefined, { timeoutMs: 3000, maxOutputBytes: 8192 }), error => {
    assert.match(error.message, /Could not start verification sandbox/);
    assert.match(error.message, /Tests will never run unsandboxed/);
    assert.match(error.message, /exceeded the output limit/);
    assert.ok(error.message.length < 8500, 'Startup diagnostics must stay bounded.');
    return true;
  });
  assertKilled(await exited);
  assert.equal(calls.mock.callCount(), 1);
  await assert.rejects(fs.access(path.join(root, 'unsandboxed-marker')), /ENOENT/);
});

test('a rejected nested macOS sandbox explains the required host-side verification', async t => {
  const root = await workspace(t, `require('node:fs').writeFileSync('unsandboxed-marker', 'must not run');`);
  const calls = interceptSpawn(t, (spawn, executable, args, options) => {
    assert.match(executable, /codex(?:\.exe)?$/);
    assert.equal(args[0], 'sandbox');
    return spawn(process.execPath, ['-e', 'process.stderr.write("sandbox-exec: sandbox_apply: Operation not permitted\\n"); process.exit(71);'], options);
  });
  await assert.rejects(verifyWorkspace(root, process.execPath, () => {}), error => {
    assert.match(error.message, /Could not start verification sandbox/);
    assert.match(error.message, /enclosing sandbox.*host.*verification sandbox/s);
    assert.match(error.message, /Tests will never run unsandboxed/);
    assert.match(error.message, /sandbox_apply: Operation not permitted/);
    return true;
  });
  assert.equal(calls.mock.callCount(), 1);
  await assert.rejects(fs.access(path.join(root, 'unsandboxed-marker')), /ENOENT/);
});

test('a sandbox that exits successfully without starting Node cannot pass verification', async t => {
  const root = await workspace(t, 'require("node:test")("exists", () => {});');
  const calls = interceptSpawn(t, (spawn, _executable, _args, options) => spawn(process.execPath, ['-e', 'process.stdout.write("TAP version 13\\n# tests 1\\n# pass 1\\n# fail 0\\n")'], options));
  await assert.rejects(verifyWorkspace(root, process.execPath, () => {}), /Could not start verification sandbox/);
  assert.equal(calls.mock.callCount(), 1);
});

test('sandbox spawn errors fail closed with a clear message', async t => {
  const root = await workspace(t, 'require("node:test")("exists", () => {});');
  const calls = interceptSpawn(t, (spawn, _executable, _args, options) => spawn(path.join(root, 'missing-sandbox'), [], options));
  await assert.rejects(verifyWorkspace(root, process.execPath, () => {}), /Could not start verification sandbox.*ENOENT/s);
  assert.equal(calls.mock.callCount(), 1);
});

test('packaged launch uses the supplied Electron Node runtime and an isolated restricted profile', async t => {
  // The launcher resolves symlinks, and macOS temporary folders sit behind one (/var).
  const root = await fs.realpath(await workspace(t, 'require("node:test")("exists", () => {});'));
  const runtime = path.join(root, 'App Yard.app', 'Contents', 'MacOS', 'AppYard');
  await fs.mkdir(path.dirname(runtime), { recursive: true }); await fs.writeFile(runtime, 'synthetic runtime fixture');
  let home;
  const calls = interceptSpawn(t, (spawn, executable, args, options) => {
    assert.match(executable, /codex(?:\.exe)?$/);
    assert.deepEqual(args.slice(0, 3), ['sandbox', '-P', 'fleet-build']);
    assert.equal(args[args.indexOf('--') + 1], runtime);
    assert.ok(args.includes('permissions.fleet-build.network.enabled=false'));
    const policy = args.find(arg => arg.startsWith('permissions.fleet-build.filesystem='));
    assert.ok(policy.includes('\":root\"=\"deny\"'));
    assert.ok(policy.includes('\":minimal\"=\"read\"'));
    assert.ok(policy.includes('\":workspace_roots\"=\"write\"'));
    assert.ok(policy.includes(JSON.stringify(path.join(root, 'App Yard.app')) + '=\"read\"'), 'Electron needs its bundle Frameworks.');
    assert.ok(args.includes('projects={' + JSON.stringify(root) + '={trust_level="untrusted"}}'));
    assert.equal(options.env.ELECTRON_RUN_AS_NODE, '1');
    assert.equal(options.env.ELECTRON_NO_ASAR, '1');
    assert.equal(options.env.HOME, root);
    assert.equal(options.env.TMPDIR, root);
    assert.equal(options.env.NODE_OPTIONS, undefined);
    assert.equal(options.env.OPENAI_API_KEY, undefined);
    home = options.env.CODEX_HOME;
    assert.ok(home && !home.startsWith(root + path.sep));
    assert.equal(options.detached, process.platform !== 'win32');
    assert.equal(options.windowsHide, true);
    return spawn(process.execPath, ['-e', 'process.exit(71)'], options);
  });
  await assert.rejects(verifyWorkspace(root, runtime, () => {}), /Could not start verification sandbox/);
  assert.equal(calls.mock.callCount(), 1);
  await assert.rejects(fs.access(home), /ENOENT/);
});

test('injected plain launcher preserves TAP, source checks and process limits', async t => {
  await t.test('workspace IO and a filename with spaces preserve passing TAP', async t => {
    const root = await workspace(t, `require('node:test')('local IO', () => {
      const fs = require('node:fs'); fs.writeFileSync('temporary-result', 'synthetic');
      require('node:assert/strict').equal(fs.readFileSync('temporary-result', 'utf8'), 'synthetic'); fs.unlinkSync('temporary-result');
    });`, 'space name.test.cjs');
    const report = await verifyPlain(root, process.execPath, () => {});
    assert.equal(reportPassed(report), true, report.output); assert.equal(report.passed, 1);
    assert.doesNotMatch(report.output, /synthetic-verification-ready/);
  });
  await t.test('timeout still kills the process group', async t => {
    const root = await workspace(t, 'setInterval(() => {}, 1000);'); let exited;
    const report = await verifyPlain(root, process.execPath, child => { exited = once(child, 'exit'); }, undefined, { timeoutMs: 250 });
    assert.equal(reportPassed(report), false); assert.equal(report.exitCode, null);
    assert.match(report.output, /exceeded the 0.25-second limit/);
    assertKilled(await exited);
  });
  await t.test('output remains bounded', async t => {
    const root = await workspace(t, 'setInterval(() => process.stdout.write("x".repeat(4096)), 1);');
    const report = await verifyPlain(root, process.execPath, () => {}, undefined, { timeoutMs: 3000, maxOutputBytes: 8192 });
    assert.equal(reportPassed(report), false); assert.equal(report.exitCode, null);
    assert.match(report.output, /exceeded the output limit/); assert.ok(report.output.length < 8300);
  });
  await t.test('cancellation at handoff terminates the child', async t => {
    const root = await workspace(t, 'setInterval(() => {}, 1000);'), controller = new AbortController(); let exited;
    await assert.rejects(verifyPlain(root, process.execPath, child => { exited = once(child, 'exit'); controller.abort(); }, controller.signal), /Run stopped/);
    assertKilled(await exited);
  });
  await t.test('passing tests still cannot mutate reviewed source', async t => {
    const root = await workspace(t, 'require("node:test")("mutates", () => require("node:fs").writeFileSync("core.cjs", "changed"));');
    await fs.writeFile(path.join(root, 'core.cjs'), 'original');
    await assert.rejects(verifyPlain(root, process.execPath, () => {}), /Source files changed/);
  });
});

test('cancellation at process handoff is observed and terminates the child', { timeout: 5000 }, async t => {
  const root = await workspace(t, 'setInterval(() => {}, 1000);'), controller = new AbortController();
  let exited;
  await assert.rejects(verifyPlain(root, process.execPath, child => { exited = once(child, 'exit'); controller.abort(); }, controller.signal), /Run stopped/);
  assertKilled(await exited);
});

test('already cancelled verification never launches a process', async t => {
  const root = await workspace(t, 'setInterval(() => {}, 1000);'), controller = new AbortController(); controller.abort();
  await assert.rejects(verifyPlain(root, process.execPath, () => assert.fail('Must not spawn'), controller.signal), /Run stopped/);
});

test('a hanging test produces bounded failure evidence and is killed', { timeout: 5000 }, async t => {
  const root = await workspace(t, 'setInterval(() => {}, 1000);'); let exited;
  const report = await verifyPlain(root, process.execPath, child => { exited = once(child, 'exit'); }, undefined, { timeoutMs: 1500 });
  assert.equal(reportPassed(report), false); assert.equal(report.exitCode, null);
  assert.match(report.output, /exceeded the 1.5-second limit/);
  assertKilled(await exited);
});

// Preserve the teammate's f3dcca1 shutdown regressions with the explicit test launcher.
for (const reason of ['cancellation', 'timeout', 'output']) {
  test(`${reason} terminates the test worker and its descendant before returning`, { timeout: 10000 }, async t => {
    const root = await workspace(t, `
      const { spawn } = require('node:child_process');
      const descendant = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
      console.log('TREE_PIDS=' + process.pid + ',' + descendant.pid);
      setInterval(() => { ${reason === 'output' ? 'process.stdout.write("x".repeat(4096));' : ''} }, 5);
    `);
    const controller = new AbortController(); let observed = '', parent, closed = false;
    const verify = verifyPlain(root, process.execPath, child => {
      parent = child.pid;
      child.once('close', () => { closed = true; });
      child.stdout.on('data', chunk => {
        if (observed.length < 4096) observed += chunk.toString();
        if (reason === 'cancellation' && /TREE_PIDS=\d+,\d+/.test(observed)) controller.abort();
      });
    }, controller.signal, { timeoutMs: 1500, maxOutputBytes: 8192 });
    if (reason === 'cancellation') await assert.rejects(verify, /Run stopped/);
    else {
      const report = await verify;
      assert.equal(reportPassed(report), false); assert.equal(report.exitCode, null);
      assert.match(report.output, reason === 'timeout' ? /1.5-second limit/ : /output limit/);
    }
    assert.equal(closed, true, 'verification must observe the coordinator close before settling');
    const match = observed.match(/TREE_PIDS=(\d+),(\d+)/);
    assert.ok(match, 'fixture must start both the test worker and its descendant');
    const pids = [parent, Number(match[1]), Number(match[2])];
    // Unix reaps killed grandchildren asynchronously. No process may survive.
    const deadline = Date.now() + 2000;
    while (pids.some(alive) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(pids.filter(alive), [], 'verification left a worker or descendant running');
  });
}

test('unbounded test output cannot hold the runner or count as success', { timeout: 5000 }, async t => {
  const root = await workspace(t, 'setInterval(() => process.stdout.write("x".repeat(4096)), 1);');
  const report = await verifyPlain(root, process.execPath, () => {}, undefined, { timeoutMs: 1000, maxOutputBytes: 8192 });
  assert.equal(reportPassed(report), false); assert.equal(report.exitCode, null);
  assert.match(report.output, /exceeded the output limit/); assert.ok(report.output.length < 8300);
});

test('source mutation during verification blocks review even when tests pass', async t => {
  const root = await workspace(t, 'require("node:test")("mutates", () => require("node:fs").writeFileSync("core.cjs", "changed"));');
  await fs.writeFile(path.join(root, 'core.cjs'), 'original');
  await assert.rejects(verifyPlain(root, process.execPath, () => {}), /Source files changed/);
});

test('spawn errors settle with a useful failure', async t => {
  const root = await workspace(t, 'require("node:test")("exists", () => {});');
  await assert.rejects(verifyPlain(root, path.join(root, 'missing-node'), () => {}), /ENOENT/);
});

test('toolkit checks and empty files cannot replace application tests', async t => {
  const root = await workspace(t, 'require("node:test")("toolkit only", () => {});', '.fleet/toolkit/reference.test.cjs');
  await fs.writeFile(path.join(root, 'empty.test.cjs'), '');
  await assert.rejects(verifyPlain(root, process.execPath, () => {}), /did not produce/);
});

test('test filenames containing spaces are passed as single paths', async t => {
  const root = await workspace(t, 'require("node:test")("real assertion", () => require("node:assert/strict").deepEqual([1, 2].slice(1), [2]));', 'special name.test.cjs');
  const report = await verifyPlain(root, process.execPath, () => {});
  assert.equal(reportPassed(report), true); assert.equal(report.passed, 1);
});
