import test from 'node:test';
import assert from 'node:assert/strict';

// The production adapter loads Windows DLLs. Other platforms exercise their own
// native discovery in process-sweep.test.mjs without loading this OS adapter.
if (process.platform === 'win32') {
  const { windowsRunProcesses, windowsSignalRunProcess } = await import('../dist-electron/electron/windows-process-scan.js');
  const marker = 'fixture-run', target = { pid: 987654, started: 'original-start' };
  function fixture(overrides = {}) {
    const calls = [];
    const access = {
      candidates: () => [{ pid: target.pid, sameOwner: true }],
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

  test('Windows discovery fails closed for inaccessible same-user and unknown-owner processes', () => {
    for (const sameOwner of [true, undefined]) {
      const { access, calls } = fixture({ candidates: () => [{ pid: target.pid, sameOwner }], open: () => 0, limited: () => 0 });
      assert.throws(() => windowsRunProcesses(marker, access), /Cannot inspect user process/);
      assert.throws(() => windowsSignalRunProcess(marker, target, access), /Cannot inspect user process/);
      assert.ok(!calls.some(call => call[0] === 'terminate'));
    }
  });

  test('Windows discovery ignores only confirmed outside-scope or exited inaccessible processes', () => {
    for (const overrides of [{ inScope: () => false }, { alive: () => false }]) {
      const { access, calls } = fixture({ open: () => 0, ...overrides });
      assert.deepEqual(windowsRunProcesses(marker, access), []);
      assert.deepEqual(calls, [['limited', target.pid], ['close', 42n]]);
    }
    const { access, calls } = fixture({ candidates: () => [{ pid: target.pid, sameOwner: false }] });
    assert.deepEqual(windowsRunProcesses(marker, access), []);
    assert.deepEqual(calls, [], 'Other users must not be opened or signalled');
  });

  test('Windows ownership inspection errors cannot authorize cleanup and always close the opened handle', () => {
    for (const deniedRead of [false, true]) {
      const { access, calls } = fixture({ ...(deniedRead ? { open: () => 0 } : {}),
        inScope: () => { throw Error('private owner inspection failure'); } });
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

  test('Windows signalling rejects a reused identity, lost marker, or changed owner on its opened handle', () => {
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
}
