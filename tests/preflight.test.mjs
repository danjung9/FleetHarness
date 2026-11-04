import test from 'node:test';
import { Store, newProject } from '../dist-electron/electron/storage.js';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { runPreflight, findVerificationBrowser, verificationBrowserCandidates, probeCodexSandbox, probeVerificationSandbox } from '../dist-electron/electron/preflight.js';
import { spawn, execFileSync } from 'node:child_process';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const model = (id = 'gpt-6.1-sol', extra = {}) => ({ id, provider: 'chatgpt', name: id, backend: 'codex', configured: true, ...extra });
const settings = { backend: 'codex', provider: 'chatgpt', model: '', rememberKey: false };
const ready = extra => ({
  settings: { ...settings }, root: path.resolve('.tmp'),
  engine: async () => ({ connected: true, models: [model()] }),
  browser: async () => {}, sandbox: async () => {}, freeBytes: async () => 1024 ** 3,
  ...extra
});
const start = async (options, callModel) => { const selection = await runPreflight(options); callModel(selection); return selection; };

// Production Start acceptance, with synthetic connection and inference boundaries.
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const readyProbes = { browser: async () => {}, sandbox: async () => {}, freeBytes: async () => 1024 ** 3 };
async function backendFixture(t, { backend = 'pi', chosen = 'gpt-6.1-sol', probes = {}, models = ['small-model', 'gpt-6.1-sol'], resourcesRoot = path.resolve('.') } = {}) {
  const root = await fs.mkdtemp(path.resolve('.tmp/preflight-start-'));
  const store = new Store(root); await store.init();
  const project = newProject({ title: 'Synthetic startup', description: 'Synthetic startup regression only.', criteria: [] });
  const provider = backend === 'codex' ? 'chatgpt' : 'openai';
  store.state.projects = [project]; store.state.settings = { backend, provider, model: chosen, rememberKey: false };
  let calls = 0;
  const create = async () => { calls++; throw new Error('Synthetic SDK session fault'); };
  const codex = { home: path.join(root, 'codex'), account: { status: 'connected' },
    route: { provider: 'openai', label: 'Event API key' }, async refresh() {},
    models: models.map(id => ({ id, name: id, backend, provider, configured: true })) };
  const instance = new FleetBackend(store, process.execPath, () => {}, resourcesRoot, {
    codex, preflight: { ...readyProbes, ...probes }, createSession: create, createCodexSession: create
  });
  instance.runtime = { hasConfiguredAuth: () => true,
    getModel: (p, id) => p === provider && models.includes(id) ? { id, provider: p } : undefined,
    getModels: () => models.map(id => ({ id, name: id, provider })) };
  t.after(async () => { await instance.stopAll(); await fs.rm(root, { recursive: true, force: true }); });
  return { root, store, project, backend: instance, codex, calls: () => calls,
    settle: () => instance.active.get(project.id)?.done,
    errors: () => project.logs.filter(log => log.kind === 'error').map(log => log.text).join('\n') };
}

for (const backend of ['pi', 'codex']) for (const probe of ['browser', 'sandbox']) {
  test(`production ${backend} ${probe} refusal and Stop stay bounded behind pending persistence`, async t => {
    const h = await backendFixture(t, { backend, probes: { [probe]: async () => { throw new Error('Synthetic ' + probe + ' fault'); } } });
    const saving = deferred(), release = deferred();
    const save = h.store.save.bind(h.store);
    h.store.save = async () => { saving.resolve(); await release.promise; await save(); };
    const began = performance.now();
    const pending = h.backend.start(h.project.id).catch(error => error);
    await saving.promise;
    const stopped = h.backend.stop(h.project.id);
    let timer;
    try {
      const result = await Promise.race([Promise.all([pending, stopped]), new Promise(resolve => { timer = setTimeout(() => resolve(null), 1900); })]);
      assert.ok(result, 'Start and Stop must settle even when persistence never settles');
      assert.ok(performance.now() - began < 2000);
      assert.match(result[0].message, probe === 'browser' ? /install Google Chrome/ : /restart AppYard/);
      assert.equal(h.calls(), 0); assert.equal(h.backend.active.size, 0);
      assert.match(h.errors(), /Saving .*pending/);
    } finally {
      clearTimeout(timer); release.resolve(); await pending; await stopped;
      // Let the queued write finish before fixture removal.
      await save();
    }
  });
}

test('a hanging probe plus slow saving still refuses Start within two seconds', async t => {
  const h = await backendFixture(t, { probes: { sandbox: () => new Promise(() => {}) } });
  const save = h.store.save.bind(h.store);
  const release = deferred();
  h.store.save = async () => { await release.promise; await save(); };
  const began = performance.now();
  const pending = h.backend.start(h.project.id).catch(error => error);
  let timer;
  try {
    const result = await Promise.race([pending, new Promise(resolve => { timer = setTimeout(() => resolve(null), 1900); })]);
    assert.ok(result, 'The readiness and persistence budgets must fit the full refusal deadline');
    assert.ok(performance.now() - began < 2000); assert.match(result.message, /restart AppYard/);
    assert.equal(h.calls(), 0); assert.equal(h.backend.active.size, 0);
  } finally { clearTimeout(timer); release.resolve(); await pending; await save(); }
});

test('a late save rejection cannot alter a newer build after a bounded refusal', async t => {
  const h = await backendFixture(t, { probes: { browser: async () => { throw new Error('Synthetic browser fault'); } } });
  const release = deferred();
  h.store.save = async () => { await release.promise; throw new Error('EACCES Synthetic late save fault'); };
  const pending = h.backend.start(h.project.id).catch(error => error);
  let timer;
  try {
    const result = await Promise.race([pending, new Promise(resolve => { timer = setTimeout(() => resolve(null), 1900); })]);
    assert.ok(result, 'Refusal must not wait for the eventual save rejection');
    h.project.status = 'running'; h.project.error = undefined; const logs = h.project.logs.length;
    release.resolve(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.project.status, 'running'); assert.equal(h.project.error, undefined);
    assert.equal(h.project.logs.length, logs); assert.equal(h.calls(), 0);
  } finally { clearTimeout(timer); release.resolve(); await pending; }
});

// Compile the real renderer and execute its component/event handlers with a small
// state-hook harness. Browser layout and Electron IPC remain permitted-host checks.
// API Start enters the real backend; no DOM library, credentials or model is used.
async function rendererFixture(t, h) {
  const folder = await fs.mkdtemp(path.resolve('.tmp/preflight-renderer-'));
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit', 'false', '--outDir', folder]);
  const prefix = pathToFileURL(folder + path.sep).href;
  const appUrl = pathToFileURL(path.join(folder, 'src/App.js')).href;
  const key = '__syntheticPreflightRenderer_' + path.basename(folder).replace(/\W/g, '_');
  const slots = [{ state: h.store.state, models: h.backend.models(), storagePath: h.root }, h.store.state, 'factory', h.project.id];
  let cursor = 0, pending, settingsSaves = 0;
  globalThis[key] = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    api: { startRun(id) { pending = h.backend.start(id); return pending; }, saveSettings() { settingsSaves++; throw new Error('Unexpected Settings save'); } }
  };
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (context.parentURL?.startsWith(prefix)) {
        if (/\.(?:css|svg)$/.test(specifier)) return { shortCircuit: true, url: new URL(specifier, context.parentURL).href };
        if (specifier === 'react' && context.parentURL === appUrl) return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(`
          export const useState = value => globalThis.${key}.useState(value);
          export const useEffect = () => {};
          export const useMemo = work => work();
          export const useRef = value => ({ current: value });
          export const useId = () => 'synthetic-id';`) };
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
  t.after(async () => { hooks.deregister(); delete globalThis[key]; await fs.rm(folder, { recursive: true, force: true }); });
  const { default: App } = await import(appUrl);
  const render = () => { cursor = 0; return App(); };
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const match = find(child, predicate); if (match) return match; }
  };
  const text = node => typeof node === 'string' ? node : [node?.props?.children].flat(Infinity).map(child => child == null || typeof child === 'boolean' ? '' : text(child)).join('');
  const clickStart = () => {
    const header = find(render(), node => node.type?.name === 'JourneyHeader');
    assert.ok(header, 'The challenge must show its real entry control');
    const button = find(header.type(header.props), node => node.type === 'button' && /Start build/.test(text(node)));
    assert.ok(button, 'A connected provider with no saved model must offer Start build');
    button.props.onClick();
  };
  const confirmation = () => find(render(), node => node.type?.name === 'Modal' && node.props.title === 'Start build');
  return { render, find, text, clickStart, confirmation, pending: () => pending, settingsSaves: () => settingsSaves };
}

for (const backend of ['pi', 'codex']) test(`the ${backend} Start entry gate reaches the automatic default without a Settings save`, async t => {
  const h = await backendFixture(t, { backend, chosen: '' });
  const ui = await rendererFixture(t, h);
  ui.clickStart();
  let modal = ui.confirmation(); assert.ok(modal); assert.match(ui.text(modal), /automatic selection/);
  assert.equal(h.calls(), 0, 'Opening confirmation must not start inference');
  ui.find(modal, node => node.type === 'button' && ui.text(node) === 'Cancel').props.onClick();
  assert.equal(ui.confirmation(), undefined); assert.equal(h.calls(), 0);
  ui.clickStart(); modal = ui.confirmation();
  ui.find(modal, node => node.type === 'button' && /Start automatic build/.test(ui.text(node))).props.onClick();
  await ui.pending(); await h.settle();
  assert.equal(h.store.state.settings.model, 'gpt-6.1-sol'); assert.equal(h.calls(), 1);
  assert.equal(ui.settingsSaves(), 0);
  h.store.state.settings.model = 'missing-model';
  assert.throws(ui.clickStart, /must offer Start build/, 'Invalid explicit selections must still route to Settings');
});

for (const backend of ['pi', 'codex']) {
  for (const [probe, instruction] of [['browser', /install Google Chrome/], ['sandbox', /restart AppYard/]]) {
    test(`production ${backend} Start refuses ${probe} within two seconds before inference`, async t => {
      let entered = 0;
      const h = await backendFixture(t, { backend, probes: { [probe]: async () => { entered++; throw new Error('Synthetic ' + probe + ' fault'); } } });
      const began = performance.now();
      await assert.rejects(h.backend.start(h.project.id), instruction);
      assert.ok(performance.now() - began < 2000);
      assert.equal(entered, 1); assert.equal(h.calls(), 0);
      assert.equal(h.project.status, 'failed'); assert.match(h.project.error, instruction);
      assert.doesNotMatch(h.project.error, /Synthetic|SDK|session|stage/);
      assert.match(h.errors(), new RegExp('Synthetic ' + probe + ' fault'));
      assert.equal(h.backend.active.size, 0);
      const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects[0];
      assert.equal(saved.error, h.project.error); assert.equal(saved.status, 'failed');
    });
  }
  for (const chosen of ['', 'small-model']) {
    test(`production ${backend} Start ${chosen ? 'preserves an explicit model' : 'persists an available default'} and hides external errors`, async t => {
      const h = await backendFixture(t, { backend, chosen });
      await h.backend.start(h.project.id); await h.settle();
      const expected = chosen || 'gpt-6.1-sol';
      assert.equal(h.calls(), 1); assert.equal(h.store.state.settings.model, expected);
      assert.equal(h.project.model, 'openai/' + expected);
      assert.doesNotMatch(h.project.error, /Synthetic|SDK|session|stage/); assert.match(h.project.error, /activity log/);
      assert.match(h.errors(), /Synthetic SDK session fault/);
      const reopened = new Store(h.root); await reopened.init();
      assert.equal(reopened.state.settings.model, expected);
      assert.equal(reopened.state.projects[0].error, h.project.error);
      assert.equal(h.backend.active.size, 0);
    });
  }
}

test('production Start refuses a hanging readiness probe within the shared budget', async t => {
  let entered = false, signal;
  const h = await backendFixture(t, { probes: { sandbox: value => { entered = true; signal = value; return new Promise(() => {}); } } });
  const began = performance.now();
  await assert.rejects(h.backend.start(h.project.id), /restart AppYard/);
  assert.ok(performance.now() - began < 2000); assert.equal(entered, true);
  assert.equal(signal.aborted, true); assert.equal(h.calls(), 0); assert.equal(h.backend.active.size, 0);
});

test('production Stop waits for actual probe entry, aborts it and releases the run slot', async t => {
  const entered = deferred(); let signal, aborted = 0;
  const h = await backendFixture(t, { probes: { sandbox: value => {
    signal = value; value.addEventListener('abort', () => aborted++, { once: true }); entered.resolve();
    return new Promise(() => {});
  } } });
  const pending = h.backend.start(h.project.id).catch(error => error);
  let timer;
  try {
    await Promise.race([entered.promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Start never entered the readiness probe')), 1000); })]);
    assert.equal(h.backend.active.size, 1); assert.equal(signal.aborted, false);
    await h.backend.stop(h.project.id);
    const error = await pending;
    assert.match(error.message, /build was stopped/); assert.equal(signal.aborted, true); assert.equal(aborted, 1);
    assert.equal(h.calls(), 0); assert.equal(h.backend.active.size, 0); assert.equal(h.project.status, 'stopped');
    const again = h.backend.start(h.project.id).catch(error => error);
    await h.backend.stop(h.project.id); await again;
    assert.equal(h.backend.active.size, 0);
  } finally { clearTimeout(timer); await h.backend.stopAll(); await pending; }
});

test('production Start refuses unavailable explicit models and defaults only to advertised models', async t => {
  const invalid = await backendFixture(t, { chosen: 'missing-model' });
  await assert.rejects(invalid.backend.start(invalid.project.id), /selected build option is unavailable/);
  assert.equal(invalid.calls(), 0); assert.equal(invalid.store.state.settings.model, 'missing-model');
  const fallback = await backendFixture(t, { chosen: '', models: ['available-only'] });
  await fallback.backend.start(fallback.project.id); await fallback.settle();
  assert.equal(fallback.store.state.settings.model, 'available-only');
});

test('production Start hides preparation and save failures while retaining raw diagnostics', async t => {
  const bad = await backendFixture(t, { resourcesRoot: path.resolve('.tmp/missing-preflight-resources') });
  await assert.rejects(bad.backend.start(bad.project.id), /required build files are missing/);
  assert.equal(bad.calls(), 0); assert.match(bad.errors(), /ENOENT/);
  const save = await backendFixture(t);
  save.store.save = async () => { throw new Error('EACCES Synthetic save fault'); };
  await assert.rejects(save.backend.start(save.project.id), /permissions/);
  assert.equal(save.calls(), 0); assert.match(save.project.error, /permissions/);
  assert.doesNotMatch(save.project.error, /EACCES|Synthetic/); assert.match(save.errors(), /Synthetic save fault/);
  assert.equal(save.backend.active.size, 0);
});

test('production Start does not overwrite a newer model selection while readiness awaits', async t => {
  const entered = deferred(), release = deferred();
  const h = await backendFixture(t, { chosen: '', probes: { sandbox: async () => { entered.resolve(); await release.promise; } } });
  const pending = h.backend.start(h.project.id);
  await entered.promise;
  h.store.state.settings.model = 'small-model';
  release.resolve(); await pending; await h.settle();
  assert.equal(h.project.model, 'openai/gpt-6.1-sol');
  assert.equal(h.store.state.settings.model, 'small-model');
});

test('production Stop cancels a pending connection check before browser or model work', async t => {
  const entered = deferred(); let browsers = 0;
  const h = await backendFixture(t, { backend: 'codex', probes: { browser: async () => { browsers++; } } });
  h.codex.refresh = () => { entered.resolve(); return new Promise(() => {}); };
  const pending = h.backend.start(h.project.id).catch(error => error);
  await entered.promise; await h.backend.stop(h.project.id);
  assert.match((await pending).message, /build was stopped/);
  assert.equal(browsers, 0); assert.equal(h.calls(), 0); assert.equal(h.backend.active.size, 0);
});

for (const [check, code, instruction] of [
  ['browser', 'browser', /install Google Chrome/i],
  ['sandbox', 'sandbox', /restart AppYard/i]
]) test(`${check} failure refuses within two seconds without a model call`, async () => {
  let calls = 0;
  const began = performance.now();
  await assert.rejects(start(ready({ [check]: async () => { throw new Error('Synthetic ' + check + ' failure'); } }), () => calls++), error => {
    assert.equal(error.code, code);
    assert.match(error.message, instruction);
    assert.doesNotMatch(error.message, /Synthetic|stage|session|SDK|Codex turn/i);
    assert.equal(error.cause.message, 'Synthetic ' + check + ' failure');
    return true;
  });
  assert.ok(performance.now() - began < 2000);
  assert.equal(calls, 0);
});

test('one shared deadline bounds hanging engine, browser, sandbox and disk checks', async () => {
  for (const check of ['engine', 'browser', 'sandbox', 'freeBytes']) {
    let calls = 0, probeSignal;
    const began = performance.now();
    const hanging = (...args) => { probeSignal = args.find(value => value instanceof AbortSignal); return new Promise(() => {}); };
    await assert.rejects(start(ready({ timeoutMs: 35, [check]: hanging }), () => calls++), error => {
      assert.ok(['engine', 'browser', 'sandbox', 'disk'].includes(error.code)); return true;
    });
    assert.equal(probeSignal.aborted, true, check);
    assert.ok(performance.now() - began < 2000, check);
    assert.equal(calls, 0);
  }
});

test('production deadline also refuses a hung sandbox in under two seconds', async () => {
  const began = performance.now();
  await assert.rejects(runPreflight(ready({ sandbox: () => new Promise(() => {}) })), { code: 'sandbox' });
  assert.ok(performance.now() - began < 2000);
});

test('connected engine chooses a sensible default without mutating settings', async () => {
  const options = ready({ engine: async () => ({ connected: true, models: [model('gpt-small'), model()] }) });
  const selected = await runPreflight(options);
  assert.equal(selected.model, 'gpt-6.1-sol');
  assert.equal(selected.provider, 'chatgpt');
  assert.equal(selected.backend, 'codex');
  assert.equal(options.settings.model, '');
});

test('default comes only from the connected provider and requested engine', async () => {
  const models = [model(), model('not-connected', { provider: 'fixture', backend: 'pi', configured: false }),
    model('fixture-default', { provider: 'fixture', backend: 'pi' })];
  const selected = await runPreflight(ready({ settings: { ...settings, backend: 'pi', provider: 'fixture' }, engine: async () => ({ connected: true, models }) }));
  assert.equal(selected.model, 'fixture-default');
  assert.equal(selected.backend, 'pi');
});

test('an explicitly selected model is preserved and an invalid one is refused', async () => {
  const options = ready({ settings: { ...settings, model: 'gpt-small' }, engine: async () => ({ connected: true, models: [model(), model('gpt-small')] }) });
  assert.equal((await runPreflight(options)).model, 'gpt-small');
  await assert.rejects(runPreflight({ ...options, settings: { ...settings, model: 'not-available' } }), { code: 'model' });
});

test('disconnected engine, missing models, low disk and unknown disk space refuse', async () => {
  await assert.rejects(runPreflight(ready({ engine: async () => ({ connected: false, models: [model()] }) })), { code: 'engine' });
  await assert.rejects(runPreflight(ready({ engine: async () => ({ connected: true, models: [] }) })), { code: 'model' });
  for (const bytes of [0, 256 * 1024 ** 2 - 1, NaN, Infinity, -1]) {
    await assert.rejects(runPreflight(ready({ freeBytes: async () => bytes })), { code: 'disk' });
  }
  await assert.rejects(runPreflight(ready({ freeBytes: async () => { throw new Error('statfs failed'); } })), { code: 'disk' });
});

test('missing sandbox probe fails closed and never guesses that Pi is isolated', async () => {
  const options = ready(); delete options.sandbox;
  await assert.rejects(runPreflight(options), { code: 'sandbox' });
});

test('cancellation stops checks, including before any work begins', async () => {
  const controller = new AbortController(); let probes = 0;
  controller.abort();
  await assert.rejects(runPreflight(ready({ signal: controller.signal, engine: async () => { probes++; } })), { code: 'stopped' });
  assert.equal(probes, 0);
  const during = new AbortController();
  const pending = runPreflight(ready({ signal: during.signal, sandbox: signal => new Promise(() => { signal.addEventListener('abort', () => probes++); }) }));
  await new Promise(resolve => setImmediate(resolve)); during.abort();
  await assert.rejects(pending, { code: 'stopped' });
  assert.equal(probes, 1);
});

test('browser discovery checks the verification browser without downloading or launching it', async t => {
  const folder = await fs.mkdtemp(path.resolve('.tmp/preflight-browser-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const executable = path.join(folder, 'synthetic-browser');
  await fs.writeFile(executable, '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  assert.equal(await findVerificationBrowser(new AbortController().signal, [path.join(folder, 'missing'), executable]), executable);
  await assert.rejects(findVerificationBrowser(new AbortController().signal, [folder, path.join(folder, 'missing')]));
  await fs.chmod(executable, 0o600);
  if (process.platform !== 'win32') await assert.rejects(findVerificationBrowser(new AbortController().signal, [executable]));
});

test('the default browser candidate is the headless binary verification actually launches', () => {
  const candidates = verificationBrowserCandidates();
  assert.match(path.basename(candidates[0]), /^chrome-headless-shell(?:\.exe)?$/);
  assert.ok(candidates.length >= 2, 'The same Google Chrome fallback as verification must be offered');
  assert.match(candidates[1], /(?:Google Chrome|google.chrome|chrome\.exe)/i);
});

test('the real disk check works on the project filesystem', async () => {
  const options = ready(); delete options.freeBytes;
  assert.equal((await runPreflight(options)).model, 'gpt-6.1-sol');
});

test('sandbox readiness opens and disposes the existing Codex route without prompting', async () => {
  const signal = new AbortController().signal; let disposed = 0, prompts = 0;
  await probeCodexSandbox({ home: 'synthetic-home', cwd: 'synthetic-workspace', model: 'synthetic-model', signal,
    create: async options => {
      assert.equal(options.signal, signal); assert.deepEqual(options.tools, []);
      return { prompt() { prompts++; }, dispose() { disposed++; } };
    }
  });
  assert.equal(prompts, 0); assert.equal(disposed, 1);
});

test('a late sandbox startup after cancellation is disposed without a model call', async () => {
  const controller = new AbortController(); let release, disposed = 0;
  const promise = probeCodexSandbox({ home: 'synthetic-home', cwd: 'synthetic-workspace', model: 'synthetic-model', signal: controller.signal,
    create: () => new Promise(resolve => { release = resolve; }) });
  controller.abort(); release({ dispose() { disposed++; } });
  await assert.rejects(promise); assert.equal(disposed, 1);
});

test('verification startup probe uses native containment, a private home and no inference', async t => {
  const folder = await fs.mkdtemp(path.resolve('.tmp/preflight-sandbox-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  let launches = 0;
  await probeVerificationSandbox({ root: folder, executable: process.execPath, signal: new AbortController().signal,
    launch(runner, args, options) {
      launches++;
      assert.match(runner, /codex/); assert.deepEqual(args.slice(0, 3), ['sandbox', '-P', 'fleet-build']);
      assert.ok(args.includes('permissions.fleet-build.network.enabled=false'));
      assert.ok(args.some(arg => arg.includes('\":root\"=\"deny\"')));
      assert.equal(options.env.HOME, options.env.CODEX_HOME);
      assert.ok(options.env.HOME.startsWith(folder + path.sep));
      assert.equal(options.env.OPENAI_API_KEY, undefined); assert.equal(options.env.CODEX_API_KEY, undefined);
      assert.equal(options.env.ELECTRON_RUN_AS_NODE, '1');
      // Only the trusted fixed bootstrap is run by this synthetic process fixture.
      const bootstrap = args.at(-1);
      return spawn(process.execPath, ['--input-type=commonjs', '-e', 'process.stderr.write("Synthetic startup warning\\n");' + bootstrap], options);
    }
  });
  assert.equal(launches, 1); assert.deepEqual(await fs.readdir(folder), []);
});

test('verification probe refuses a process that exits without the readiness marker', async t => {
  const folder = await fs.mkdtemp(path.resolve('.tmp/preflight-no-marker-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  await assert.rejects(probeVerificationSandbox({ root: folder, executable: process.execPath, signal: new AbortController().signal,
    launch: (_runner, _args, options) => spawn(process.execPath, ['-e', 'process.exit(0)'], options)
  }), { code: 'sandbox' });
  assert.deepEqual(await fs.readdir(folder), []);
});

test('verification probe kills a hanging startup when the shared deadline expires', async t => {
  const folder = await fs.mkdtemp(path.resolve('.tmp/preflight-hanging-sandbox-'));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  let child, calls = 0;
  await assert.rejects(start(ready({ timeoutMs: 150,
    sandbox: signal => probeVerificationSandbox({ root: folder, executable: process.execPath, signal,
      launch: (_runner, _args, options) => { child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], options); return child; }
    })
  }), () => calls++), { code: 'sandbox' });
  assert.equal(calls, 0);
  await new Promise(resolve => child.exitCode !== null || child.signalCode !== null ? resolve() : child.once('close', resolve));
  assert.ok(child.signalCode);
});
