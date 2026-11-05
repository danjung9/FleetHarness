import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function find(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; }
}
const text = node => typeof node === 'string' ? node : [node?.props?.children].flat(Infinity)
  .map(child => child == null || typeof child === 'boolean' ? '' : text(child)).join('');

// Execute the compiled App and its actual Files component, effects and controls.
// As in preflight.test.mjs, hooks provide state without a browser/DOM dependency.
async function renderer(t, read) {
  const folder = await fs.mkdtemp(path.resolve('.tmp/artifact-read-renderer-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit', 'false', '--outDir', folder]);
  const prefix = pathToFileURL(folder + path.sep).href, appUrl = new URL('src/App.js', prefix).href;
  const key = '__syntheticArtifactRead_' + path.basename(folder).replace(/\W/g, '_');
  const project = { id: 'synthetic-project', runId: 'synthetic-run', workspace: '/synthetic/workspace',
    title: 'Synthetic files', description: 'Synthetic artifact recovery', status: 'draft', criteria: [], stages: [], logs: [] };
  const state = { settings: { provider: '', model: '', rememberKey: false }, projects: [project] };
  const root = { slots: [{ state, models: [] }, state, 'artifacts', project.id] }, files = { slots: [], effects: [] };
  const reads = [];
  let active, cursor, effectCursor, queued;
  globalThis[key] = {
    useState(initial) {
      const owner = active, index = cursor++;
      if (!(index in owner.slots)) owner.slots[index] = typeof initial === 'function' ? initial() : initial;
      return [owner.slots[index], value => { owner.slots[index] = typeof value === 'function' ? value(owner.slots[index]) : value; }];
    },
    useRef(initial) {
      const owner = active, index = cursor++;
      return owner.slots[index] ??= { current: initial };
    },
    useEffect(work, deps) {
      if (active === root) return;
      const index = effectCursor++, previous = files.effects[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) queued.push(() => {
        previous?.cleanup?.(); files.effects[index] = { deps, cleanup: work() };
      });
    },
    api: {
      artifacts: async () => [{ path: 'first.txt', size: 10 }, { path: 'second.txt', size: 20 }],
      readArtifact: async (id, file) => { reads.push([id, file]); return read(file, reads.length); }
    }
  };
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (context.parentURL?.startsWith(prefix)) {
        if (/\.(?:css|svg)$/.test(specifier)) return { shortCircuit: true, url: new URL(specifier, context.parentURL).href };
        if (specifier === 'react' && context.parentURL === appUrl) return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(`
          export const useState = initial => globalThis.${key}.useState(initial);
          export const useRef = initial => globalThis.${key}.useRef(initial);
          export const useEffect = (work, deps) => globalThis.${key}.useEffect(work, deps);
          export const useMemo = work => work(); export const useId = () => 'synthetic-id';`) };
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
  t.after(() => { for (const effect of files.effects) effect?.cleanup?.(); hooks.deregister(); delete globalThis[key]; });
  const { default: App } = await import(appUrl);
  let app, tree;
  const render = () => {
    active = root; cursor = 0; app = App();
    const component = find(app, node => node.type?.name === 'Artifacts');
    assert.ok(component, 'Open the real Files screen');
    active = files; cursor = effectCursor = 0; queued = [];
    tree = component.type(component.props); for (const work of queued) work();
    return tree;
  };
  const flush = async () => { for (let i = 0; i < 4; i++) { render(); await new Promise(resolve => setImmediate(resolve)); } return render(); };
  const pane = () => find(render(), node => node.props?.className === 'file-content');
  const select = name => {
    const list = find(render(), node => node.props?.className === 'file-list');
    const button = find(list, node => node.type === 'button' && text(node).includes(name));
    assert.ok(button); button.props.onClick(); render();
  };
  const retry = () => find(pane(), node => node.type === 'button' && text(node) === 'Retry');
  await flush();
  return { flush, pane, select, retry, reads, project,
    globalError: () => text(find((render(), app), node => node.props?.role === 'alert')) };
}

test('a failed artifact read shows a pane error and Retry reads the same file successfully', async t => {
  const attempt = deferred(), recovery = deferred();
  const ui = await renderer(t, (_file, count) => count === 1 ? attempt.promise : recovery.promise);
  ui.select('first.txt'); assert.match(text(ui.pane()), /Loading/);
  attempt.reject(new Error('Synthetic file unavailable')); await ui.flush();
  assert.match(ui.globalError(), /Synthetic file unavailable/);
  assert.doesNotMatch(text(ui.pane()), /Loading/);
  assert.match(text(find(ui.pane(), node => node.props?.role === 'alert')), /could not (?:open|read|load).*file/i);
  assert.ok(ui.retry(), 'A failed read must offer Retry in its own pane');
  ui.retry().props.onClick(); await ui.flush();
  assert.match(text(ui.pane()), /Loading/); assert.equal(ui.retry(), undefined);
  assert.deepEqual(ui.reads, [['synthetic-project', 'first.txt'], ['synthetic-project', 'first.txt']]);
  recovery.resolve('Recovered synthetic contents'); await ui.flush();
  assert.match(text(ui.pane()), /Recovered synthetic contents/);
  assert.equal(find(ui.pane(), node => node.props?.role === 'alert'), undefined);
  assert.equal(ui.globalError(), '');
});

test('another failed retry remains retryable and an empty successful file is displayed correctly', async t => {
  const ui = await renderer(t, (_file, count) => { if (count < 3) throw new Error('Synthetic read failure'); return ''; });
  ui.select('first.txt'); await ui.flush();
  for (let i = 0; i < 2; i++) {
    assert.ok(ui.retry(), 'Every failed attempt must keep a working retry');
    ui.retry().props.onClick(); await ui.flush();
  }
  assert.equal(ui.reads.length, 3);
  assert.match(text(ui.pane()), /This file is empty\./);
  assert.equal(ui.retry(), undefined);
});

for (const outcome of ['success', 'failure']) test(`a late read ${outcome} cannot replace a newly selected file`, async t => {
  const old = deferred();
  const ui = await renderer(t, file => file === 'first.txt' ? old.promise : 'Second synthetic contents');
  ui.select('first.txt'); await ui.flush();
  ui.select('second.txt'); await ui.flush();
  if (outcome === 'success') old.resolve('Obsolete synthetic contents');
  else old.reject(new Error('Obsolete synthetic failure'));
  await ui.flush();
  assert.match(text(ui.pane()), /second\.txtSecond synthetic contents/);
  assert.doesNotMatch(text(ui.pane()), /Obsolete|Loading/);
  assert.equal(ui.retry(), undefined);
});
