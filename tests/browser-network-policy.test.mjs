import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { verifyBrowserJourneys } from '../dist-electron/electron/browser-verification.js';

for (const isolateNetwork of [false, true]) test(`${isolateNetwork ? 'optional comparison' : 'ordinary'} verification selects the intended browser network policy`, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'browser-policy-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const launches = [], contexts = []; let websocketPolicies = 0;
  t.mock.method(chromium, 'launchServer', async options => {
    launches.push(options);
    return { wsEndpoint: () => 'ws://synthetic-browser', kill: async () => {} };
  });
  t.mock.method(chromium, 'connect', async () => ({
    close: async () => {},
    newContext: async options => {
      contexts.push(options);
      return { setDefaultTimeout() {}, route: async () => {}, routeWebSocket: async () => { websocketPolicies++; },
        tracing: { start: async () => {}, stop: async () => {} }, close: async () => {},
        newPage: async () => { throw new Error('Synthetic renderer stops after policy setup.'); } };
    }
  }));
  const plan = { schemaVersion: 1, criteria: [], journeys: ['primary', 'recovery'].map(kind => ({
    id: kind, title: kind, kind, steps: [{ action: 'expectText', selector: 'body', text: 'Ready' }]
  })) };
  const result = await verifyBrowserJourneys({ root, plan, contractHash: 'policy-fixture',
    url: 'http://127.0.0.1:1/', ...(isolateNetwork ? { isolateNetwork: true } : {}) });
  assert.equal(launches.length, 1); assert.equal(contexts.length, 4);
  assert.equal(launches[0].chromiumSandbox, false);
  assert.equal(Boolean(launches[0].proxy), isolateNetwork);
  assert.equal(websocketPolicies, isolateNetwork ? 4 : 0);
  for (const context of contexts) {
    assert.equal(Boolean(context.proxy), isolateNetwork);
    assert.equal(context.serviceWorkers, isolateNetwork ? 'block' : 'allow');
  }
  assert.ok(result.journeys.every(journey => journey.status === 'failed'), 'Policy setup alone never supplies browser evidence.');
});
