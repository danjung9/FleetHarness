import test from 'node:test';
import assert from 'node:assert/strict';
import { start } from './server.mjs';

// Boundary evidence only: these are invented inputs, not USMTF conformance cases.
test('HTTP rejects undeclared format versions rather than claiming format support', async t => {
  const app = await start({port: 0});
  t.after(() => app.close());
  const input = {
    rawText: 'SYNTHETIC FORMAT BOUNDARY TEST — no operational content',
    selectedShip: 'FS CHECK', selectedDay: '2026-11-05', displayTimezone: 'UTC',
    reviewed: true
  };
  for (const grammarVersion of ['USMTF', 'SYN-OPTASK/2', '', null, undefined]) {
    const response = await fetch(app.url + 'api/invoke', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...input, grammarVersion})
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: 'error', error: 'INVALID_INPUT', result: null
    });
  }
});
