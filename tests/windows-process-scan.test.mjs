import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// The production adapter loads Windows DLLs. Other platforms exercise their own
// native discovery in process-sweep.test.mjs without loading this OS adapter.
if (process.platform === 'win32') {
  const { windowsRunProcesses, windowsSignalRunProcess } = await import('../dist-electron/electron/windows-process-scan.js');
  const marker = 'fixture-run', target = { pid: 987654, started: 'original-start' };
  function fixture(overrides = {}) {
    const calls = [];
    const access = {
      candidates: () => [{ pid: target.pid }],
      open: (pid, terminate) => { calls.push(['open', pid, terminate]); return 41n; },
      limited: pid => { calls.push(['limited', pid]); return 42n; },
      close: handle => { calls.push(['close', handle]); },
      alive: () => true, inScope: () => true,
      started: () => target.started,
      environment: () => 'PATH=fixture\0APPYARD_RUN_PROCESS=' + marker + '\0\0',
      terminate: handle => { calls.push(['terminate', handle]); },
      ...overrides,
    };
    return { access, calls };
  }

  test('Windows discovery fails closed for an inaccessible application Job member', () => {
    const { access, calls } = fixture({ open: () => 0, limited: () => 0 });
    assert.throws(() => windowsRunProcesses(marker, access), /Cannot inspect.*process/);
    assert.throws(() => windowsSignalRunProcess(marker, target, access), /Cannot inspect.*process/);
    assert.ok(!calls.some(call => call[0] === 'terminate'));
  });

  test('Windows discovery ignores only confirmed outside-scope or exited inaccessible processes', () => {
    for (const overrides of [{ inScope: () => false }, { alive: () => false }]) {
      const { access, calls } = fixture({ open: () => 0, ...overrides });
      assert.deepEqual(windowsRunProcesses(marker, access), []);
      assert.deepEqual(calls, [['limited', target.pid], ['close', 42n]]);
    }
  });

  test('Windows Job membership inspection errors cannot authorize cleanup and always close the opened handle', () => {
    for (const deniedRead of [false, true]) {
      const { access, calls } = fixture({ ...(deniedRead ? { open: () => 0 } : {}),
        inScope: () => { throw Error('private Job membership inspection failure'); } });
      assert.throws(() => windowsRunProcesses(marker, access));
      assert.deepEqual(calls.at(-1), ['close', deniedRead ? 42n : 41n]);
      assert.ok(!calls.some(call => call[0] === 'terminate'));
    }
  });

  test('Windows marker matching requires a whole environment entry', () => {
    for (const environment of ['APPYARD_RUN_PROCESS=' + marker + '-other\0',
      'OTHER=APPYARD_RUN_PROCESS=' + marker + '\0', 'PREFIX_APPYARD_RUN_PROCESS=' + marker + '\0']) {
      const { access } = fixture({ environment: () => environment });
      assert.deepEqual(windowsRunProcesses(marker, access), []);
    }
    const { access, calls } = fixture();
    assert.deepEqual(windowsRunProcesses(marker, access), [target]);
    assert.deepEqual(calls, [['open', target.pid, false], ['close', 41n]]);
  });

  test('Windows signalling rejects a reused identity, lost marker, or different Job on its opened handle', () => {
    for (const overrides of [{ started: () => 'replacement-start' }, { environment: () => 'OTHER=unmarked\0' }, { inScope: () => false }]) {
      const { access, calls } = fixture(overrides);
      windowsSignalRunProcess(marker, target, access);
      assert.deepEqual(calls, [['open', target.pid, true], ['close', 41n]]);
    }
  });

  test('Windows signalling validates and terminates the same process handle without reopening a PID', () => {
    const { access, calls } = fixture();
    access.started = handle => { calls.push(['started', handle]); return target.started; };
    access.environment = handle => { calls.push(['environment', handle]); return 'APPYARD_RUN_PROCESS=' + marker + '\0'; };
    windowsSignalRunProcess(marker, target, access);
    assert.deepEqual(calls, [['open', target.pid, true], ['started', 41n], ['environment', 41n], ['terminate', 41n], ['close', 41n]]);
  });

  test('the application Job kills a live descendant when its owning host exits', { timeout: 10_000 }, async t => {
    const { default: koffi } = await import('koffi');
    const kernel = koffi.load('kernel32.dll');
    const open = kernel.func('uintptr_t __stdcall OpenProcess(uint32_t access, int inherit, uint32_t pid)');
    const close = kernel.func('int __stdcall CloseHandle(uintptr_t handle)');
    const wait = kernel.func('uint32_t __stdcall WaitForSingleObject(uintptr_t handle, uint32_t timeout)');
    const moduleUrl = new URL('../dist-electron/electron/windows-process-scan.js', import.meta.url).href;
    const owner = spawn(process.execPath, ['--input-type=module', '-e', `
      import { spawn } from 'node:child_process';
      import { once } from 'node:events';
      import { initializeWindowsProcessJob } from ${JSON.stringify(moduleUrl)};
      initializeWindowsProcessJob();
      const descendant = spawn(process.execPath, ['-e', 'process.send("ready"); setInterval(() => {}, 1000);'],
        { windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      await once(descendant, 'message');
      process.once('message', () => process.exit(0));
      process.send({ pid: descendant.pid });
    `], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    const exited = once(owner, 'exit');
    let diagnostics = '', handle = 0;
    owner.stderr.on('data', chunk => { diagnostics += chunk.toString(); });
    t.after(async () => {
      if (handle) close(handle);
      if (owner.exitCode === null && owner.signalCode === null) owner.kill('SIGKILL');
      await exited;
    });
    const [message] = await Promise.race([
      once(owner, 'message', { signal: AbortSignal.timeout(5000) }),
      exited.then(result => { throw Error('Job owner exited before the descendant was ready: ' + JSON.stringify(result) + '\n' + diagnostics); })
    ]);
    assert.ok(Number.isSafeInteger(message.pid) && message.pid > 1);
    handle = open(0x101000, 0, message.pid); // QUERY_LIMITED_INFORMATION | SYNCHRONIZE
    assert.ok(handle, 'Hold the exact descendant kernel object before allowing the owner to exit');
    assert.equal(wait(handle, 0), 258, 'The descendant must be alive before host exit');
    owner.send('exit');
    assert.deepEqual(await exited, [0, null], diagnostics);
    assert.equal(wait(handle, 3000), 0, 'The same descendant handle must signal after the last Job handle closes');
  });
}
