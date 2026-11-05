import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

// Visible UI only. The harness owns independent answers, lifecycle and network.
export const adapterProvenance = Object.freeze({
  inspectedIndexSHA256: '21bec78524290ae3c970b69c34b8ea88580e3edbd813f7dba0e675f1bae56a20',
  sourceLines: 'index.html:7-29,161-197',
  boundary: 'Rendered DOM and public controls only; no application globals or storage access',
});
const TIMEOUT = 7000;
const ROWS = '#today-events > article[data-key], #order-items > article[data-key], #vessel-items > article[data-key], #email-items > article[data-key]';
const normalized = value => value.replace(/\s+/g, ' ').trim();
async function visible(locator) {
  assert.equal(await locator.count(), 1, 'Required UI selector must identify one element');
  await locator.waitFor({ state: 'visible', timeout: TIMEOUT });
  return locator;
}
async function button(page, id, label) {
  const control = await visible(page.locator(id));
  assert.equal(await control.evaluate(element => element.tagName), 'BUTTON', `${id} must be a real button`);
  assert.equal(normalized(await control.innerText()), label, `Changed button label at ${id}`);
  assert.ok(await control.isEnabled(), `${label} must be enabled`);
  return control;
}
async function text(page, id) {
  return normalized(await (await visible(page.locator(id))).innerText());
}
async function noErrors(page, ids = ['#global-error']) {
  for (const id of ids) {
    const node = page.locator(id);
    assert.equal(await node.count(), 1, `Missing error surface ${id}`);
    // Error surfaces are intentionally hidden when empty. Do not ignore a
    // nonempty error merely because application CSS hides its element.
    assert.equal(normalized((await node.textContent()) ?? ''), '', `Application error at ${id}`);
  }
  assert.equal(await page.locator('#storage-recovery').isVisible(), false, 'Storage recovery must not be required');
}
async function saved(page) {
  await noErrors(page);
  assert.equal(await text(page, '#save-status'), 'Saved on this browser', 'The UI must confirm an actual save');
}
async function openDetails(page, summaryLabel, fieldSelector) {
  const summaries = page.locator('details > summary').filter({ hasText: new RegExp(`^${summaryLabel}$`) });
  assert.equal(await summaries.count(), 1, `Missing or ambiguous details control: ${summaryLabel}`);
  assert.equal(normalized(await summaries.innerText()), summaryLabel);
  if (!(await page.locator(fieldSelector).isVisible())) await summaries.click({ timeout: TIMEOUT });
  await visible(page.locator(fieldSelector));
}
function sourceLabel(rowSource) {
  assert.equal(typeof rowSource, 'string');
  const suffix = ' · Synthetic supplied snapshot';
  assert.ok(rowSource.endsWith(suffix), 'Missing visible row provenance boundary');
  const label = rowSource.slice(0, -suffix.length).trim();
  assert.ok(label, 'Missing visible row source label');
  return label;
}
function reviewFlag(state) {
  if (state === 'Reviewed locally') return true;
  if (state === 'Not reviewed' || state.startsWith('Returned locally:')) return false;
  assert.fail(`Cannot normalize review state: ${state}`);
}
function normalizeObservation(snapshot) {
  assert.equal(typeof snapshot.key, 'string');
  assert.match(snapshot.key, /^[^:]+:[^:]+$/, 'Record identity must be source-scoped');
  assert.equal(snapshot.panelKey, snapshot.key, 'Evidence panel belongs to a different record');
  assert.ok(snapshot.title.trim(), 'Missing visible title');
  assert.equal(snapshot.panelTitle, snapshot.title, 'Row and evidence title disagree');
  assert.equal(snapshot.source, sourceLabel(snapshot.rowSource), 'Row and evidence provenance disagree');
  assert.ok(snapshot.body.trim(), 'Missing visible evidence body');
  return {
    key: snapshot.key, title: snapshot.title, source: snapshot.source,
    text: [snapshot.rowText, snapshot.associatedText, snapshot.body].filter(Boolean).join('\n'),
    reviewed: reviewFlag(snapshot.reviewState),
  };
}
function uniqueKeys(keys) {
  assert.ok(keys.length > 0, 'The active brief must contain visible records');
  assert.equal(new Set(keys).size, keys.length, 'Duplicate visible source-scoped record keys');
  for (const key of keys) assert.equal(typeof key, 'string', 'Missing row data-key');
  return keys;
}
async function activeKeys(page) {
  const rows = page.locator(ROWS), keys = [];
  for (let i = 0; i < await rows.count(); i++) {
    await visible(rows.nth(i));
    keys.push(await rows.nth(i).getAttribute('data-key'));
  }
  return uniqueKeys(keys);
}
async function rowFor(page, key) {
  assert.equal(typeof key, 'string');
  const keys = await activeKeys(page);
  assert.ok(keys.includes(key), `Requested record is not in the visible active brief: ${key}`);
  return page.locator(ROWS).nth(keys.indexOf(key));
}
async function selectRecord(page, key) {
  const row = await rowFor(page, key);
  const titleButton = await visible(row.locator('button.row-title'));
  const snapshot = {
    key: await row.getAttribute('data-key'),
    title: (await titleButton.innerText()).trim(),
    rowText: await row.innerText(),
    rowSource: normalized(await (await visible(row.locator('p.source'))).innerText()),
    associatedText: await row.evaluate(element => {
      const section = element.closest('section');
      return section ? [...section.children].filter(child => child.tagName === 'P' && !child.hidden).map(child => child.innerText).join('\n') : '';
    }),
  };
  await titleButton.click({ timeout: TIMEOUT });
  await visible(page.locator('#selection'));
  await openDetails(page, 'Source and provenance', '#source-key');
  await noErrors(page, ['#global-error', '#review-error', '#source-error']);
  snapshot.panelKey = await text(page, '#source-key');
  snapshot.panelTitle = (await (await visible(page.locator('#selected-title'))).innerText()).trim();
  snapshot.source = await text(page, '#source-label');
  snapshot.body = await (await visible(page.locator('#source-body'))).innerText();
  snapshot.reviewState = await text(page, '#review-state');
  return normalizeObservation(snapshot);
}

export async function ready(page) {
  await visible(page.getByRole('heading', { name: 'Morning training brief', exact: true }));
  await (await button(page, '#sample-date', 'Use sample date')).click({ timeout: TIMEOUT });
  const date = await visible(page.getByLabel('Brief date', { exact: true }));
  assert.equal(await date.getAttribute('type'), 'date');
  const sampleDate = await date.inputValue();
  assert.match(sampleDate, /^\d{4}-\d{2}-\d{2}$/, 'The sample-date action must select a real date');
  await saved(page);
  return { sampleDate, visibleKeys: await activeKeys(page) };
}
export async function observe(page) {
  const keys = await activeKeys(page), records = [];
  for (const key of keys) records.push(await selectRecord(page, key));
  assert.deepEqual(await activeKeys(page), keys, 'The visible record set changed while observing');
  await saved(page);
  return records;
}
export async function reviewItem(page, key) {
  const before = await selectRecord(page, key);
  assert.equal(before.reviewed, false, 'Review must demonstrate a new acknowledgement, not an existing one');
  const actor = await visible(page.getByLabel('Reviewer label', { exact: true }));
  const at = await visible(page.getByLabel('Decision time (UTC)', { exact: true }));
  assert.ok((await actor.inputValue()).trim(), 'The public reviewer field must be populated');
  assert.match(await at.inputValue(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/, 'The public decision-time field must contain a UTC timestamp');
  await (await button(page, '#mark-reviewed', 'Mark reviewed')).click({ timeout: TIMEOUT });
  await noErrors(page, ['#global-error', '#review-error']);
  assert.equal(await text(page, '#review-state'), 'Reviewed locally');
  await saved(page);
  return { key, before: before.reviewed, after: true };
}

function inputSummary(inputs) {
  assert.ok(Array.isArray(inputs) && inputs.length > 0, 'Source import requires a nonempty envelope array');
  const ids = inputs.map(source => {
    assert.ok(source && typeof source === 'object' && !Array.isArray(source));
    assert.equal(typeof source.sourceId, 'string');
    assert.ok(source.sourceId && !source.sourceId.includes(':'));
    assert.equal(typeof source.source, 'string');
    assert.equal(typeof source.digest, 'string');
    assert.equal(source.sample, true, 'Only synthetic source snapshots are permitted');
    assert.ok(Array.isArray(source.items));
    return source.sourceId;
  });
  assert.equal(new Set(ids).size, ids.length, 'Duplicate imported source identity');
  const items = inputs.reduce((total, source) => total + source.items.length, 0);
  return `${inputs.length} source${inputs.length === 1 ? '' : 's'} · ${items} item${items === 1 ? '' : 's'} · synthetic`;
}
export async function importSources(page, inputs) {
  const previewText = inputSummary(inputs);
  await openDetails(page, 'Import source snapshots', '#sources-json');
  const input = await visible(page.getByLabel('Source envelopes JSON array', { exact: true }));
  await input.fill(JSON.stringify(inputs), { timeout: TIMEOUT });
  await noErrors(page);
  assert.equal(await page.locator('#save-import').isEnabled(), false, 'A changed draft must require preview before saving');
  await (await button(page, '#preview-import', 'Preview source import')).click({ timeout: TIMEOUT });
  await noErrors(page, ['#global-error', '#import-error']);
  assert.equal(await text(page, '#import-preview'), previewText, 'The preview must acknowledge the supplied source/item count');
  await (await button(page, '#save-import', 'Save source import')).click({ timeout: TIMEOUT });
  await noErrors(page, ['#global-error', '#import-error']);
  assert.equal(await text(page, '#import-preview'), 'Source snapshots saved; earlier history retained.');
  assert.equal(await input.inputValue(), '', 'An actual source commit must clear the draft');
  assert.equal(await page.locator('#save-import').isEnabled(), false, 'The committed preview must be consumed');
  await saved(page);
  return { preview: previewText, committed: true };
}

function validateOnly() {
  const base = { key: 'fixture-source:item-1', title: 'Fixture title', panelKey: 'fixture-source:item-1', panelTitle: 'Fixture title', source: 'Fixture source', rowSource: 'Fixture source · Synthetic supplied snapshot', body: 'Fixture content', rowText: 'Fixture title', associatedText: 'Fixture summary', reviewState: 'Not reviewed' };
  assert.deepEqual(normalizeObservation(base), { key: base.key, title: base.title, source: base.source, text: 'Fixture title\nFixture summary\nFixture content', reviewed: false });
  assert.equal(normalizeObservation({ ...base, reviewState: 'Reviewed locally' }).reviewed, true);
  assert.equal(normalizeObservation({ ...base, reviewState: 'Returned locally: fixture reason' }).reviewed, false);
  const controls = [];
  const reject = (name, operation) => { assert.throws(operation, { code: 'ERR_ASSERTION' }); controls.push(name); };
  reject('wrong evidence key', () => normalizeObservation({ ...base, panelKey: 'other:item-1' }));
  reject('wrong evidence title', () => normalizeObservation({ ...base, panelTitle: 'Other title' }));
  reject('missing source boundary', () => normalizeObservation({ ...base, rowSource: 'Fixture source' }));
  reject('wrong evidence provenance', () => normalizeObservation({ ...base, source: 'Other source' }));
  reject('missing evidence content', () => normalizeObservation({ ...base, body: '' }));
  reject('unknown review state', () => normalizeObservation({ ...base, reviewState: 'Conflict: 2 competing revisions' }));
  reject('bare item identity', () => normalizeObservation({ ...base, key: 'item-1' }));
  reject('duplicate row identity', () => uniqueKeys([base.key, base.key]));
  reject('empty brief', () => uniqueKeys([]));
  const envelope = { sourceId: 'fixture-source', source: 'Fixture source', sample: true, digest: 'synthetic-digest', items: [{ id: 'item-1' }] };
  assert.equal(inputSummary([envelope]), '1 source · 1 item · synthetic');
  reject('non-synthetic import', () => inputSummary([{ ...envelope, sample: false }]));
  reject('duplicate import identity', () => inputSummary([envelope, envelope]));
  console.log(JSON.stringify({ passed: true, controls, nativeExecuted: false, browserExecuted: false, filesWritten: false }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.deepEqual(process.argv.slice(2), ['--validate-only'], 'Only --validate-only is supported as a command');
  validateOnly();
}
