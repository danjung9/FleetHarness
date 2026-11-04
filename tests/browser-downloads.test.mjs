import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { performBrowserStep } from '../dist-electron/electron/browser-verification.js';
import { parseQualityPlan } from '../dist-electron/harness/quality-contract.js';

// Exercise the production capture/stream/assertion path with synthetic Page events.
// Native download events and browser lifecycle have separate browser-verification tests.
function pageFixture() {
  let captures = 0, current = 'original', pending;
  const page = { locator(selector) { return {
    async click() { captures++; pending?.({ suggestedFilename: () => selector.slice(4) + '.txt',
      createReadStream: async () => Readable.from([current + ' alpha beta gamma']), failure: async () => null, cancel: async () => {} }); },
    async fill(value) { current = value; }, async selectOption(value) { current = value; },
    async press(value) { current = value; }, async check() { current = 'checked'; },
    async waitFor() {}, async innerText() { return current; }, async inputValue() { return current; }
  }; }, waitForEvent: () => new Promise(resolve => { pending = resolve; }), async reload() { current = 'reloaded'; } };
  return { page, get captures() { return captures; } };
}
const download = (selector, text, extra = {}) => ({ action: 'expectDownload', selector, fileName: selector + '.txt', text, ...extra });

test('18 assertions for two files at two viewports capture four files and check every expected substring', async () => {
  let total = 0;
  for (const viewport of ['desktop', 'narrow']) {
    const fixture = pageFixture(), captures = new Map();
    for (let n = 0; n < 9; n++) for (const selector of ['#first', '#second']) {
      await performBrowserStep(fixture.page, download(selector, ['alpha', 'beta', 'gamma'][n % 3]), 100, captures);
    }
    assert.equal(fixture.captures, 2, viewport); total += fixture.captures;
    await assert.rejects(performBrowserStep(fixture.page, download('#first', 'MISSING'), 100, captures), /Downloaded content/);
    await assert.rejects(performBrowserStep(fixture.page, download('#first', 'alpha', { fileName: 'wrong.txt' }), 100, captures), /Expected download/);
    assert.equal(fixture.captures, 2);
  }
  assert.equal(total, 4);
});

for (const step of [{ action: 'fill', selector: '#input', value: 'edited' }, { action: 'select', selector: '#input', value: 'edited' },
  { action: 'press', selector: '#input', key: 'edited' }, { action: 'check', selector: '#input' }, { action: 'click', selector: '#save' }, { action: 'reload' }]) {
  test('a new capture is required after ' + step.action, async () => {
    const fixture = pageFixture(), captures = new Map();
    await performBrowserStep(fixture.page, download('#first', 'original'), 100, captures);
    await performBrowserStep(fixture.page, step, 100, captures);
    const before = fixture.captures;
    await performBrowserStep(fixture.page, download('#first', 'alpha'), 100, captures);
    assert.equal(fixture.captures, before + 1);
    if (step.action !== 'click') await assert.rejects(performBrowserStep(fixture.page, download('#first', 'original'), 100, captures), /Downloaded content/);
  });
}

test('fresh captures support repeated exports without a preceding edit', async () => {
  const fixture = pageFixture(), captures = new Map();
  await performBrowserStep(fixture.page, download('#first', 'alpha'), 100, captures);
  await performBrowserStep(fixture.page, download('#first', 'beta', { fresh: true }), 100, captures);
  assert.equal(fixture.captures, 2);
  const journey = { id: 'primary', title: 'Export', kind: 'primary', steps: [download('#first', 'alpha'), download('#first', 'beta', { fresh: true })] };
  const plan = { schemaVersion: 1, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'alpha beta', journeyIds: ['primary', 'recovery'] }],
    journeys: [journey, { ...journey, id: 'recovery', kind: 'recovery' }] };
  assert.deepEqual(parseQualityPlan(plan, [{ id: 'R1', requirement: 'Export' }]), plan);
  plan.journeys[0].steps[1].fresh = 'true';
  assert.throws(() => parseQualityPlan(plan, [{ id: 'R1', requirement: 'Export' }]), /fresh must be a boolean/);
});
