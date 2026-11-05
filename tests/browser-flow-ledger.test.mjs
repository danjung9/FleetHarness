import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { BrowserFlowLedger } from '../dist-electron/electron/browser-flow.js';

const filesHash = 'a'.repeat(64);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function png(width, height) {
  const chunk = (name, bytes) => {
    const data = Buffer.concat([Buffer.from(name), bytes]), length = Buffer.alloc(4), crc = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    let value = 0xffffffff;
    for (const byte of data) {
      value ^= byte;
      for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
    }
    crc.writeUInt32BE((value ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, data, crc]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const row = Buffer.alloc(width * 3 + 1, 245); row[0] = 0;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
}
const images = { desktop: png(1280, 800), narrow: png(390, 844) };
const button = (selector, name) => ({ selector, name, tag: 'button', role: '', type: 'button', value: '' });
const journeys = [{ id: 'task', title: 'Complete a task', kind: 'primary', steps: [
  { action: 'expectScreen', screenId: 'entry' }, { action: 'click', selector: '#next' },
  { action: 'expectScreen', screenId: 'detail' }, { action: 'click', selector: '#finish' },
  { action: 'expectText', selector: '#result', text: 'Completed task' },
] }];
function dom(screen = 'entry', { value = '', result = '' } = {}) {
  return {
    route: screen === 'entry' ? '/' : '/detail', pageText: `${screen} ${result}`.trim(), headings: [screen],
    controls: screen === 'entry'
      ? [{ selector: '#task', tag: 'input', role: '', name: 'Task', type: 'text', value }, button('#next', 'Continue'), button('#refresh', 'Refresh')]
      : [button('#finish', 'Complete task')],
    screens: ['entry', 'detail'].map(id => ({ id, route: id === 'entry' ? '/' : '/detail', selector: '#' + id, count: id === screen ? 1 : 0, visible: id === screen })),
    screenIds: [screen], content: [{ selector: '#heading::text(0)', text: screen }, { selector: '#result::text(0)', text: result }],
  };
}

async function setup(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-browser-flow-ledger-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const directory = '.browser-observations/' + randomUUID();
  await fs.mkdir(path.join(root, directory), { recursive: true });
  const ledger = new BrowserFlowLedger(root, journeys);
  const record = async (snapshot, { generationId = 'desktop-session', viewport = 'desktop', openedViewport = viewport, action = 'open', errors = [], hash = filesHash } = {}, attempt) => {
    const bytes = images[viewport], screenshot = `${directory}/${digest(bytes).slice(0, 12)}-${randomUUID()}.png`;
    await fs.writeFile(path.join(root, screenshot), bytes);
    ledger.record({ ...structuredClone(snapshot), id: randomUUID(), generationId, viewport, openedViewport, action,
      filesHash: hash, screenshot, screenshotHash: digest(bytes), capturedAt: new Date().toISOString(), errors }, attempt);
    return ledger.report().observations.at(-1);
  };
  const action = async (before, after, input, options = {}) => {
    const { generationId = 'desktop-session', viewport = 'desktop' } = options;
    const attempt = ledger.begin(generationId, viewport, input, before);
    return record(after, { ...options, action: input.action }, attempt);
  };
  return { root, ledger, record, action };
}
const desktopProblems = async ledger => (await ledger.problems(filesHash)).filter(problem => problem.includes('UI flow desktop:'));

async function completeFlow(fixture, viewport = 'desktop', generationId = viewport + '-session') {
  const { record, action } = fixture, options = { viewport, generationId };
  const initial = dom(), typed = dom('entry', { value: 'Inspect pump' }), detail = dom('detail'), finished = dom('detail', { result: 'Completed task' });
  const open = await record(initial, options);
  const input = await action(initial, typed, { action: 'type', selector: '#task' }, options);
  await action(typed, detail, { action: 'click', selector: '#next' }, options);
  const result = await action(detail, finished, { action: 'click', selector: '#finish' }, options);
  return { open, input, result };
}

test('a complete observed control chain can include input echo without treating the echo as task completion', async t => {
  const fixture = await setup(t);
  for (const viewport of ['desktop', 'narrow']) await completeFlow(fixture, viewport);
  assert.deepEqual(await fixture.ledger.problems(filesHash), []);
  const report = fixture.ledger.report();
  assert.equal(report.transitions.filter(edge => edge.action === 'type' && edge.status === 'changed').length, 0);
  assert.equal(report.transitions.filter(edge => edge.status === 'changed').length, 4);
});

test('an unobserved navigation cannot establish screen coverage through later grounded descendants', async t => {
  const { ledger, record, action } = await setup(t);
  const initial = dom(), detail = dom('detail');
  await record(initial);
  await action(initial, detail, { action: 'click', selector: '#guessed-navigation' });
  await action(detail, dom('detail', { result: 'Completed task' }), { action: 'click', selector: '#finish' });
  const problems = await desktopProblems(ledger);
  assert.ok(problems.some(problem => problem.includes('planned screen detail')), problems.join('\n'));
  assert.ok(problems.some(problem => problem.includes('activate an observed visible control')), problems.join('\n'));
  assert.equal(ledger.report().transitions[0].status, 'ungrounded');
});

test('failed navigation and later clean screenshots cannot restore provenance without a fresh manual open', async t => {
  const fixture = await setup(t), { ledger, record, action } = fixture;
  const initial = dom(), detail = dom('detail');
  await record(initial);
  await action(initial, detail, { action: 'click', selector: '#next' }, { errors: ['The navigation failed.'] });
  await record(detail, { action: 'screenshot' });
  await action(detail, dom('detail', { result: 'Completed task' }), { action: 'click', selector: '#finish' });
  assert.ok((await desktopProblems(ledger)).some(problem => problem.includes('planned screen detail')));
  await completeFlow(fixture, 'desktop', 'fresh-desktop-session');
  assert.deepEqual(await desktopProblems(ledger), []);
});

test('a passive screen jump cannot borrow an earlier successful activation', async t => {
  const { ledger, record, action } = await setup(t);
  const initial = dom(), refreshed = dom('entry', { result: 'Refreshed task list' }), detail = dom('detail');
  await record(initial);
  await action(initial, refreshed, { action: 'click', selector: '#refresh' });
  await record(detail, { action: 'screenshot' });
  await action(detail, dom('detail', { result: 'Completed task' }), { action: 'click', selector: '#finish' });
  assert.ok((await desktopProblems(ledger)).some(problem => problem.includes('planned screen detail')));
});

test('a bounded pending activation may establish a new screen in a later screenshot', async t => {
  const { ledger, record, action } = await setup(t), initial = dom();
  await record(initial);
  await action(initial, initial, { action: 'click', selector: '#next' });
  const destination = await record(dom('detail'), { action: 'screenshot' });
  assert.deepEqual(await desktopProblems(ledger), []);
  const transition = ledger.report().transitions.at(-1);
  assert.equal(transition.status, 'changed'); assert.equal(transition.to, destination.id);
});

test('new input invalidates a pending activation before an unrelated later screen appears', async t => {
  const { ledger, record, action } = await setup(t), initial = dom(), typed = dom('entry', { value: 'Inspect pump' });
  await record(initial);
  await action(initial, initial, { action: 'click', selector: '#next' });
  await action(initial, typed, { action: 'type', selector: '#task' });
  await record(dom('detail'), { action: 'screenshot' });
  const problems = await desktopProblems(ledger);
  assert.ok(problems.some(problem => problem.includes('planned screen detail')));
  assert.ok(problems.some(problem => problem.includes('activate an observed visible control')));
});

test('tampering with an intermediate capture invalidates otherwise intact descendant evidence', async t => {
  const fixture = await setup(t), { input } = await completeFlow(fixture);
  assert.deepEqual(await desktopProblems(fixture.ledger), []);
  await fs.writeFile(path.join(fixture.root, input.screenshot), 'Replaced the screenshot');
  const problems = await desktopProblems(fixture.ledger);
  assert.ok(problems.some(problem => problem.includes('planned screen detail')), problems.join('\n'));
  assert.ok(problems.some(problem => problem.includes('activate an observed visible control')), problems.join('\n'));
});

test('changing width within one generation cannot produce a fresh narrow traversal', async t => {
  const { ledger, record, action } = await setup(t), initial = dom(), detail = dom('detail');
  await record(initial);
  await record(initial, { action: 'screenshot', viewport: 'narrow', openedViewport: 'desktop' });
  await action(initial, detail, { action: 'click', selector: '#next' }, { viewport: 'narrow', openedViewport: 'desktop' });
  const problems = (await ledger.problems(filesHash)).filter(problem => problem.includes('UI flow narrow:'));
  assert.ok(problems.some(problem => problem.includes('fresh manual browser session')));
  assert.ok(problems.some(problem => problem.includes('planned screen detail')));
});

test('current-source checks cannot reuse a complete traversal of older runtime files', async t => {
  const fixture = await setup(t);
  for (const viewport of ['desktop', 'narrow']) await completeFlow(fixture, viewport);
  assert.deepEqual(await fixture.ledger.problems(filesHash), []);
  const problems = await fixture.ledger.problems('b'.repeat(64));
  assert.equal(problems.filter(problem => problem.includes('fresh manual browser session')).length, 2);
  assert.equal(problems.filter(problem => problem.includes('planned screen detail')).length, 2);
});

function cappedControls({ offset = 0, result = '', disclosure = false } = {}) {
  const snapshot = dom();
  snapshot.controlCount = 102 + Number(disclosure);
  snapshot.controls = [
    { ...button('#noop', 'Focus the control'), inViewport: offset > 0 },
    { selector: '#computed', tag: 'input', role: '', name: 'Computed result', type: 'text', value: result, readOnly: true },
    ...(disclosure ? [{ selector: '#advanced', tag: 'input', role: '', name: 'Advanced option', type: 'text', value: '' }] : []),
    ...Array.from({ length: 78 - Number(disclosure) }, (_, index) => button('#row' + (offset + index), 'Row ' + (offset + index))),
  ];
  return snapshot;
}

test('a no-op click cannot earn credit when auto-scrolling changes the capped control inventory', async t => {
  const { ledger, record, action } = await setup(t), initial = cappedControls(), scrolled = cappedControls({ offset: 22 });
  await record(initial);
  await action(initial, scrolled, { action: 'click', selector: '#noop' });
  await record(scrolled, { action: 'screenshot' });
  const edge = ledger.report().transitions.at(-1);
  assert.equal(edge.grounded, true);
  assert.equal(edge.status, 'unchanged');
  assert.deepEqual(edge.changes, []);
  assert.ok((await desktopProblems(ledger)).some(problem => problem.includes('activate an observed visible control')));
});

test('a shared readonly output change still counts when the surrounding control inventory is capped', async t => {
  const { ledger, record, action } = await setup(t), initial = cappedControls(), computed = cappedControls({ offset: 22, result: '42' });
  await record(initial);
  await action(initial, computed, { action: 'click', selector: '#noop' });
  const edge = ledger.report().transitions.at(-1);
  assert.equal(edge.status, 'changed');
  assert.ok(edge.changes.includes('controls or output values'));
  assert.ok(!(await desktopProblems(ledger)).some(problem => problem.includes('activate an observed visible control')));
});

test('a real disclosure changes the rendered control count and still counts with a capped inventory', async t => {
  const { ledger, record, action } = await setup(t), initial = cappedControls(), disclosed = cappedControls({ offset: 22, disclosure: true });
  await record(initial);
  await action(initial, disclosed, { action: 'click', selector: '#noop' });
  const edge = ledger.report().transitions.at(-1);
  assert.equal(edge.status, 'changed');
  assert.ok(edge.changes.includes('controls or output values'));
  assert.ok(!(await desktopProblems(ledger)).some(problem => problem.includes('activate an observed visible control')));
});
