import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const children = node => node.rendered === undefined ? node.props?.children : node.rendered;
function find(node, predicate) {
  if (Array.isArray(node)) { for (const item of node) { const match = find(item, predicate); if (match) return match; } }
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  return find(children(node), predicate);
}
const text = node => Array.isArray(node) ? node.map(text).join('') : typeof node === 'string' || typeof node === 'number' ? String(node) : node && typeof node === 'object' && !node.props?.['aria-hidden'] ? text(children(node)) : '';
const sourceId = '00000000-0000-4000-8000-000000000001', sourceDigest = 'a'.repeat(64);
const project = (id = 'synthetic-project', extra = {}) => ({ id, title: 'Synthetic challenge ' + id,
  description: 'A synthetic challenge for checking the operator workflow.', criteria: ['Keep synthetic results.'],
  status: 'draft', stages: [], logs: [], ...extra });
const report = { exitCode: 0, total: 1, passed: 1, failed: 0, skipped: 0, command: 'synthetic check', output: 'Synthetic pass', durationMs: 1, time: '2026-11-05T00:00:00Z' };

// Like artifact-read-recovery.test.mjs, run the compiled production components.
// Only React scheduling and the desktop API are supplied here. No DOM, native
// service, model account, process cleanup or preview-server behavior is claimed.
async function renderer(t, { projects = [project()], view = 'requirements', api: overrides = {}, account, settings } = {}) {
  await fs.mkdir('.tmp', { recursive: true });
  const folder = await fs.mkdtemp(path.resolve('.tmp/merged-ux-renderer-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit', 'false', '--outDir', folder]);
  const prefix = pathToFileURL(folder + path.sep).href;
  const key = '__syntheticUX_' + path.basename(folder).replace(/\W/g, '_');
  const state = { settings: settings ?? { backend: 'codex', provider: 'chatgpt', model: 'synthetic-model', rememberKey: false }, projects };
  const data = { state, models: [{ backend: 'codex', provider: 'chatgpt', id: 'synthetic-model', name: 'Synthetic model', configured: true }], chatgpt: account };
  const root = { slots: [data, state, view, projects[0]?.id ?? ''], effects: [] };
  const owners = new Map([['root', root]]);
  const api = { bootstrap: async () => data, connectors: { list: async () => [], cancel: async () => {}, progress: async () => ({ stage: 'idle' }) }, ...overrides };
  let active, cursor, effectCursor, queued, seen;
  globalThis[key] = {
    api,
    useState(initial) {
      const owner = active, index = cursor++;
      if (!(index in owner.slots)) owner.slots[index] = typeof initial === 'function' ? initial() : initial;
      return [owner.slots[index], value => { owner.slots[index] = typeof value === 'function' ? value(owner.slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return active.slots[index] ??= { current: initial }; },
    useEffect(work, deps) {
      if (active === root) return;
      const owner = active, index = effectCursor++, previous = owner.effects[index];
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps[i]))) queued.push(() => {
        previous?.cleanup?.(); owner.effects[index] = { deps, cleanup: work() };
      });
    }
  };
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (context.parentURL?.startsWith(prefix)) {
        if (/\.(?:css|svg)$/.test(specifier)) return { shortCircuit: true, url: new URL(specifier, context.parentURL).href };
        if (specifier === 'react') return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(`
          export const useState = initial => globalThis.${key}.useState(initial);
          export const useRef = initial => globalThis.${key}.useRef(initial);
          export const useEffect = (work, deps) => globalThis.${key}.useEffect(work, deps);
          export const useCallback = callback => callback; export const useMemo = work => work(); export const useId = () => 'synthetic-id';`) };
        if (specifier === './api') return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(`export const isDesktop = true; export const api = globalThis.${key}.api;`) };
        if (specifier.startsWith('.')) return next(/\.[a-z]+$/i.test(specifier) ? specifier : specifier + '.js', context);
      }
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url.startsWith(prefix) && /\.(?:css|svg)$/.test(url)) return { shortCircuit: true, format: 'module', source: 'export default "";' };
      return next(url, context);
    }
  });
  t.after(() => { for (const owner of owners.values()) for (const effect of owner.effects) effect?.cleanup?.(); hooks.deregister(); delete globalThis[key]; });
  const { default: App } = await import(new URL('src/App.js', prefix));
  const rendered = new Set(['RequirementsForm', 'Intake', 'Development', 'Settings', 'ModelSettings', 'ModelSelector',
    'Connectors', 'SourceCard', 'ConnectedDataSection', 'ReviewWorkspace', 'ReviewContent', 'Artifacts', 'Empty', 'JourneyHeader', 'BriefDataInputs']);
  function expand(node, location) {
    if (Array.isArray(node)) return node.map((child, i) => expand(child, location + '/' + i));
    if (!node || typeof node !== 'object' || !node.props) return node;
    if (typeof node.type === 'function' && rendered.has(node.type.name)) {
      const id = location + ':' + node.type.name + ':' + node.key;
      seen.add(id);
      active = owners.get(id) ?? { slots: [], effects: [] }; owners.set(id, active);
      cursor = effectCursor = 0;
      return { ...node, rendered: expand(node.type(node.props), id) };
    }
    return { ...node, props: { ...node.props, children: expand(node.props.children, location + '/children') } };
  }
  const render = () => {
    active = root; cursor = effectCursor = 0; queued = []; seen = new Set(['root']);
    const tree = expand(App(), 'app');
    for (const [id, owner] of owners) if (!seen.has(id)) { for (const effect of owner.effects) effect?.cleanup?.(); owners.delete(id); }
    for (const work of queued) work();
    return tree;
  };
  const flush = async () => { for (let i = 0; i < 5; i++) { render(); await new Promise(resolve => setImmediate(resolve)); } return render(); };
  const node = predicate => find(render(), predicate);
  const button = name => node(item => (item.type === 'button' || item.type?.name === 'IconButton') && (item.props.label === name || text(item).trim() === name));
  const component = name => node(item => item.type?.name === name);
  const input = label => find(node(item => item.type === 'label' && text(item) === label), item => item.type === 'input' || item.type === 'textarea');
  const click = async name => { const target = button(name); assert.ok(target, name); assert.ok(!target.props.disabled, name + ' enabled'); await target.props.onClick(); await flush(); };
  const openProject = async id => { await click('Home \u2014 challenge portfolio'); component('Home').props.open(id ?? projects[0].id); await flush(); };
  await flush();
  return { render, flush, node, button, click, openProject, component, input, data, state, api };
}

test('an existing brief retains text, attached data, pending paste and connector choices across navigation and failed Save', async t => {
  let fail = true, saved;
  const ui = await renderer(t, { api: { updateProject: async (_id, input) => { if (fail) throw new Error('Synthetic save failure'); saved = input; Object.assign(ui.state.projects[0], input); } } });
  ui.input('Challenge title').props.onChange({ target: { value: 'Synthetic edited title' } });
  ui.component('BriefDataInputs').props.onChange([{ name: 'synthetic.csv', kind: 'file', content: 'value\n1' }]);
  ui.component('BriefDataInputs').props.onEditorChange({ open: true, name: 'pending.txt', content: 'Synthetic pending input' });
  ui.component('ConnectedDataSection').props.onChange([{ id: sourceId, digest: sourceDigest, includeInApp: false }]);
  await ui.flush();
  assert.match(text(ui.component('RequirementsForm')), /Edits are unsaved until you save/);
  await ui.click('Connectors'); await ui.openProject();
  assert.equal(ui.input('Challenge title').props.value, 'Synthetic edited title');
  assert.equal(ui.component('BriefDataInputs').props.value[0].content, 'value\n1');
  assert.equal(ui.component('BriefDataInputs').props.editor.content, 'Synthetic pending input');
  assert.equal(ui.component('ConnectedDataSection').props.value[0].id, sourceId);
  await find(ui.component('RequirementsForm'), n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await ui.flush();
  assert.match(text(ui.render()), /Synthetic save failure/);
  await ui.click('Connectors'); await ui.openProject();
  assert.equal(ui.input('Challenge title').props.value, 'Synthetic edited title');
  fail = false;
  await find(ui.component('RequirementsForm'), n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await ui.flush();
  assert.equal(saved.dataInputs.length, 2);
  assert.equal(saved.connectedData[0].id, sourceId);
  await ui.click('Brief');
  assert.equal(ui.component('BriefDataInputs').props.editor.content, '', 'Successful Save clears the pending paste draft');
  assert.equal(ui.component('BriefDataInputs').props.value.length, 2);
});

test('the intake draft and selected starter survive closing for Connectors, and clear only after creation', async t => {
  let submitted;
  const ui = await renderer(t, { view: 'portfolio', api: { createProject: async input => { submitted = input; return project('created', input); } } });
  await ui.click('New challenge'); await ui.click('Scheduling');
  ui.input('Challenge title').props.onChange({ target: { value: 'Synthetic intake draft' } });
  ui.component('BriefDataInputs').props.onChange([{ name: 'synthetic.txt', kind: 'file', content: 'Synthetic attached input' }]);
  ui.component('BriefDataInputs').props.onEditorChange({ open: true, name: 'pending.txt', content: 'Synthetic pending input' });
  ui.component('ConnectedDataSection').props.onChange([{ id: sourceId, digest: sourceDigest, includeInApp: false }]);
  await ui.flush();
  ui.component('Intake').props.close(); await ui.flush();
  await ui.click('Connectors'); await ui.click('New challenge');
  assert.equal(ui.button('Scheduling').props['aria-pressed'], true);
  assert.equal(ui.input('Challenge title').props.value, 'Synthetic intake draft');
  assert.equal(ui.component('BriefDataInputs').props.editor.name, 'pending.txt');
  assert.equal(ui.component('BriefDataInputs').props.value.length, 1);
  assert.equal(ui.component('ConnectedDataSection').props.value[0].id, sourceId);
  await find(ui.component('RequirementsForm'), n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await ui.flush();
  assert.equal(submitted.dataInputs.length, 2);
  assert.equal(ui.component('Intake'), undefined);
  await ui.click('New challenge');
  assert.equal(ui.input('Challenge title').props.value, '');
  assert.equal(ui.component('BriefDataInputs').props.value.length, 0);
});

test('separate projects keep separate unsaved briefs', async t => {
  const ui = await renderer(t, { projects: [project('first'), project('second')] });
  ui.input('Challenge title').props.onChange({ target: { value: 'Synthetic first edit' } }); await ui.flush();
  await ui.openProject('second');
  assert.equal(ui.input('Challenge title').props.value, 'Synthetic challenge second');
  ui.input('Challenge title').props.onChange({ target: { value: 'Synthetic second edit' } }); await ui.flush();
  await ui.openProject('first'); assert.equal(ui.input('Challenge title').props.value, 'Synthetic first edit');
  await ui.openProject('second'); assert.equal(ui.input('Challenge title').props.value, 'Synthetic second edit');
});

test('a catalog intake selection and its draft return after the connector detour', async t => {
  const ui = await renderer(t, { view: 'portfolio' });
  ui.component('Home').props.create('12'); await ui.flush();
  assert.equal(ui.component('RequirementsForm').props.initial.challengeId, '12');
  ui.input('Challenge title').props.onChange({ target: { value: 'Synthetic catalog edit' } }); await ui.flush();
  ui.component('Intake').props.close(); await ui.flush();
  await ui.click('Connectors'); await ui.click('Home \u2014 challenge portfolio');
  ui.component('Home').props.create('12'); await ui.flush();
  assert.equal(ui.input('Challenge title').props.value, 'Synthetic catalog edit');
  assert.equal(ui.component('RequirementsForm').props.initial.challengeId, '12');
  assert.equal(ui.node(n => n.props?.className === 'intake-form').props.hidden, false);
});

for (const planUsageEnabled of [true, false]) test(`API key tab requires disconnect before Save with plan usage ${planUsageEnabled}`, async t => {
  const calls = [];
  const ui = await renderer(t, { view: 'settings', account: { status: 'connected', authType: 'chatgpt', planUsageEnabled },
    api: { disconnectChatGPT: async () => { calls.push('disconnect'); ui.data.chatgpt = { status: 'disconnected' }; return { ...ui.data }; },
      connectCodexKey: async () => ({ ...ui.data, chatgpt: { status: 'connected', authType: 'apiKey' } }),
      saveSettings: async () => { calls.push('save'); return ui.data; } } });
  await ui.click('API key');
  assert.match(text(ui.component('ModelSettings')), /ChatGPT is still connected; choose Switch to API key/);
  assert.equal(ui.button('Save model settings').props.disabled, true);
  await find(ui.component('ModelSettings'), node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.deepEqual(calls, []);
  await ui.click('Switch to API key');
  assert.deepEqual(calls, ['disconnect']);
  assert.ok(ui.node(n => n.type === 'input' && n.props.type === 'password'));
  assert.equal(ui.button('Save model settings').props.disabled, true, 'Disconnect alone is not a completed switch');
  ui.node(n => n.type === 'input' && n.props.type === 'password').props.onChange({ target: { value: 'synthetic-input-only' } });
  await ui.click('Sign in with API key');
  assert.equal(ui.button('Save model settings').props.disabled, false);
  await find(ui.component('ModelSettings'), node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await ui.flush();
  assert.deepEqual(calls, ['disconnect', 'save']);
});

test('Home, Settings, Connectors and another project expose Stop for the actual running project', async t => {
  const stopped = [];
  const running = project('running', { status: 'running', runId: 'synthetic-run' });
  const ui = await renderer(t, { projects: [project('idle'), running], view: 'portfolio', api: { stopRun: async id => stopped.push(id) } });
  for (const destination of [null, 'Settings', 'Connectors', 'Brief']) {
    if (destination === 'Brief') { await ui.click('Home \u2014 challenge portfolio'); ui.component('Home').props.open('idle'); await ui.flush(); }
    else if (destination) await ui.click(destination);
    const header = ui.node(n => n.type === 'header' && n.props['aria-label'] === 'Running build');
    assert.match(text(header), /Building: Synthetic challenge running/);
    const stop = find(header, n => n.type === 'button' && text(n) === 'Stop build');
    assert.ok(stop); stop.props.onClick(); await ui.flush();
  }
  assert.deepEqual(stopped, ['running', 'running', 'running', 'running']);
  running.status = 'stopped'; await ui.flush();
  assert.equal(ui.button('Stop build'), undefined);
});

test('connector restrictions precede Connect, live data saves as a preview and sample selection remains available', async t => {
  let sample = false;
  const card = { kind: 'custom-api', label: 'Synthetic service', summary: 'Synthetic source', available: true, signedIn: { id: 'synthetic-service' } };
  const saves = [];
  const ui = await renderer(t, { view: 'connectors', api: { connectors: {
    list: async () => [card], cancel: async () => {}, progress: async () => ({ stage: 'idle' }),
    preview: async (_kind, _options, mode) => { sample = mode === 'sample'; return { id: 'synthetic-preview', digest: 'synthetic-digest', sample, excluded: 0, items: [{ id: 'one', title: 'Synthetic item', kind: 'text', body: 'Invented data' }] }; },
    use: async (id, digest) => { saves.push([id, digest]); card.connection = { id: 'saved', digest, sample, label: card.label, count: 1 }; }
  } } });
  const copy = text(ui.component('Connectors'));
  assert.ok(copy.indexOf('Event builds use sample data; live connections support local preview only.') < copy.indexOf('Synthetic service'));
  await ui.click('Check data');
  assert.ok(ui.button('Save preview')); assert.equal(ui.button('Use this'), undefined);
  await ui.click('Save preview'); assert.match(text(ui.render()), /Preview saved: 1 items/);
  await ui.openProject();
  assert.equal(find(ui.component('ConnectedDataSection'), n => n.type === 'input' && n.props.type === 'checkbox').props.disabled, true);
  await ui.click('Connectors'); await ui.click('Try sample data');
  assert.ok(ui.button('Use this')); assert.equal(ui.button('Save preview'), undefined);
  await ui.click('Use this'); assert.match(text(ui.render()), /Sample data ready: 1 items/);
  await ui.openProject();
  assert.equal(find(ui.component('ConnectedDataSection'), n => n.type === 'input' && n.props.type === 'checkbox').props.disabled, false);
  assert.deepEqual(saves, [['synthetic-preview', 'synthetic-digest'], ['synthetic-preview', 'synthetic-digest']]);
});

for (const runtimeProfile of ['cli', 'browser', 'service']) test(`${runtimeProfile} review opens the appropriate route and keeps the human gate`, async t => {
  const reads = [];
  const p = project(runtimeProfile, { status: 'review', workspace: '/synthetic/workspace', runId: 'synthetic-run', runtimeProfile, report, feedback: '' });
  const ui = await renderer(t, { view: 'evidence', projects: [p], api: {
    artifacts: async () => [{ path: 'README.md', size: 20 }], readArtifact: async (id, file) => { reads.push([id, file]); return 'Synthetic usage instructions'; },
    preview: async () => 'http://127.0.0.1/synthetic-preview'
  } });
  const before = structuredClone(p);
  assert.equal(ui.button('Approve prototype').props.disabled, true);
  if (runtimeProfile === 'cli') {
    assert.equal(ui.button('Open preview'), undefined);
    assert.match(text(ui.component('ReviewContent')), /follow its commands in a terminal/);
    await ui.click('Open usage guide');
    assert.deepEqual(reads, [['cli', 'README.md']]);
    assert.match(text(ui.component('Artifacts')), /Synthetic usage instructions/);
  } else { await ui.click('Open preview'); assert.ok(ui.node(n => n.type === 'iframe')); }
  await ui.click('Review');
  assert.equal(ui.button('Approve prototype').props.disabled, true);
  assert.deepEqual(p, before, 'Opening instructions or preview cannot change build evidence or approval');
});

for (const status of ['review', 'approved', 'delivered']) test(`${status} preview failure offers Retry and Back to review without touching evidence`, async t => {
  let attempts = 0;
  const p = project(status, { status, workspace: '/synthetic/workspace', runId: 'synthetic-run', runtimeProfile: 'browser', report });
  const before = structuredClone(p);
  const ui = await renderer(t, { view: 'workspace', projects: [p], api: { preview: async () => { if (++attempts < 3) throw new Error('Synthetic preview failure'); return 'http://127.0.0.1/synthetic-preview'; } } });
  assert.match(text(ui.component('Development')), /Preview unavailable/);
  assert.doesNotMatch(text(ui.component('Development')), /Start a build from your brief/);
  await ui.click('Retry preview'); assert.ok(ui.button('Retry preview'));
  await ui.click('Back to review'); assert.ok(ui.component('ReviewWorkspace'));
  await ui.click('Open preview');
  assert.ok(ui.node(n => n.type === 'iframe'));
  assert.equal(ui.button('Retry preview'), undefined);
  assert.deepEqual(p, before);
});

test('an unbuilt project still shows its build instruction when no preview exists', async t => {
  const ui = await renderer(t, { view: 'workspace', api: { preview: async () => null } });
  assert.match(text(ui.component('Development')), /Start a build from your brief/);
  assert.equal(ui.button('Retry preview'), undefined);
});

test('a completed service with no preview URL offers recovery instead of a fresh build', async t => {
  const ui = await renderer(t, { view: 'workspace', projects: [project('service', { status: 'review', runtimeProfile: 'service', report })], api: { preview: async () => null } });
  assert.ok(ui.button('Retry preview')); assert.ok(ui.button('Back to review'));
  assert.doesNotMatch(text(ui.component('Development')), /Start a build from your brief/);
});

test('a late preview failure cannot overwrite a successful retry', async t => {
  const old = deferred(); let attempts = 0;
  const ui = await renderer(t, { view: 'workspace', projects: [project('late', { status: 'review', runtimeProfile: 'browser', report })],
    api: { preview: () => ++attempts === 1 ? old.promise : Promise.resolve('http://127.0.0.1/synthetic-preview') } });
  await ui.click('Reload preview');
  old.reject(new Error('Synthetic obsolete failure')); await ui.flush();
  assert.ok(ui.node(n => n.type === 'iframe')); assert.equal(ui.button('Retry preview'), undefined);
});

test('model headings and picker use plain labels for both engines without changing account selection', async t => {
  const ui = await renderer(t, { view: 'settings' });
  assert.ok(ui.node(n => n.type === 'h3' && text(n) === 'Model account'));
  assert.ok(ui.button('Other model providers'));
  for (const backend of ['codex', 'pi']) {
    ui.state.settings.backend = backend; await ui.flush();
    const label = find(ui.component('ModelSelector'), n => n.type === 'label');
    assert.match(text(label), /^Build model/); assert.doesNotMatch(text(label) + label.props.title, /Pi|Codex/);
    assert.equal(ui.node(n => n.type === 'select' && n.props['aria-label'] === 'Build model').props.value, '["chatgpt","synthetic-model"]');
  }
});
