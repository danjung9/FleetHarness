import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { verifyBrowserJourneys } from '../dist-electron/electron/browser-verification.js';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { ClassifiedExecutionFailure } from '../dist-electron/electron/execution-failure.js';

async function workspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-browser-runtime-isolation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

function plan(steps = [{ action: 'expectText', selector: '#result', text: 'Ready' }]) {
  return { schemaVersion: 1, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Start each attempt independently.', journeyIds: ['primary', 'recovery'] }],
    journeys: ['primary', 'recovery'].map(kind => ({ id: kind, title: kind, kind, steps })) };
}

const verify = (root, prepareRuntime, overrides = {}) => verifyBrowserJourneys({ root, prepareRuntime,
  plan: plan(), contractHash: 'runtime-isolation', allowSameOrigin: true, timeoutMs: 20_000, stepTimeoutMs: 1200, ...overrides });

async function service(t, html = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><p id="result">Ready</p>') {
  const server = createServer((_request, response) => response.writeHead(200, { 'content-type': 'text/html' }).end(html));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let stopped = false;
  const close = async () => {
    if (stopped) return;
    stopped = true; server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  };
  t.after(close);
  return { url: `http://127.0.0.1:${server.address().port}/`, assertIntegrity: async () => {}, redactMessage: value => value, close };
}

test('each browser journey and viewport starts a fresh service package while reload keeps that attempt state', { timeout: 30_000 }, async t => {
  const root = await workspace(t);
  const html = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><button id="save">Save</button><p id="result">Loading</p><script>
    const show = value => document.querySelector('#result').textContent = 'Saved counts: '+value.memory+','+value.disk;
    fetch('/state').then(response=>response.json()).then(show);
    document.querySelector('#save').onclick=()=>fetch('/save',{method:'POST'}).then(response=>response.json()).then(show);
  </script>`;
  await fs.writeFile(path.join(root, 'server.mjs'), `import {createServer} from 'node:http';import {readFileSync,writeFileSync,existsSync} from 'node:fs';
    let memory=0;const state=()=>({memory,disk:existsSync('state.json')?JSON.parse(readFileSync('state.json','utf8')):0});
    createServer((request,response)=>{
      if(request.url==='/health'){response.end('healthy');return;}
      if(request.url==='/save'){const previous=state();memory++;writeFileSync('state.json',JSON.stringify(previous.disk+1));}
      if(request.url==='/state'||request.url==='/save'){response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(state()));return;}
      response.writeHead(200,{'content-type':'text/html'}).end(${JSON.stringify(html)});
    }).listen(Number(process.env.PORT),process.env.HOST);`);
  const manifest = { profile: 'service', files: ['server.mjs'], requiredEnv: [],
    command: { runtime: 'node', entrypoint: 'server.mjs', args: [] }, healthPath: '/health', invokePath: '/state' };
  const roots = [], urls = [], events = [];
  let active = 0, expectedHash;
  const result = await verify(root, async signal => {
    assert.equal(active, 0, 'The previous service must finish cleanup before the next starts.');
    const runtime = await prepareSolutionRuntime(root, manifest, process.execPath, signal);
    active++; roots.push(runtime.root); urls.push(runtime.url); events.push('start');
    expectedHash ??= runtime.provenance.filesHash;
    assert.equal(runtime.provenance.filesHash, expectedHash);
    return { ...runtime,
      assertIntegrity: async () => { events.push('integrity'); await runtime.assertIntegrity(); },
      close: async () => { await runtime.close(); active--; events.push('close'); }
    };
  }, { plan: plan([
    { action: 'expectText', selector: '#result', text: 'Saved counts: 0,0' },
    { action: 'click', selector: '#save' },
    { action: 'expectText', selector: '#result', text: 'Saved counts: 1,1' },
    { action: 'reload' },
    { action: 'expectText', selector: '#result', text: 'Saved counts: 1,1' }
  ]) });
  assert.deepEqual(result.errors, []);
  assert.equal(result.journeys.length, 4);
  assert.ok(result.journeys.every(journey => journey.status === 'passed' && journey.screenshot && journey.trace), JSON.stringify(result));
  assert.equal(new Set(roots).size, 4);
  assert.equal(new Set(urls).size, 4);
  assert.deepEqual(events, Array.from({ length: 4 }, () => ['start', 'integrity', 'close']).flat());
  assert.equal(active, 0);
  for (const runtimeRoot of roots) await assert.rejects(fs.access(runtimeRoot), /ENOENT/);
  for (const url of urls) await assert.rejects(fetch(url));
});

test('failed browser steps still check integrity, redact diagnostics and close before the next attempt', { timeout: 20_000 }, async t => {
  const root = await workspace(t), events = [];
  const result = await verify(root, async () => {
    events.push('start');
    const runtime = await service(t);
    return { ...runtime,
      assertIntegrity: async () => { events.push('integrity'); },
      redactMessage: value => value.replaceAll('private-selector', '[redacted]'),
      close: async () => { await runtime.close(); events.push('close'); }
    };
  }, { stepTimeoutMs: 150, plan: plan([{ action: 'expectText', selector: '#private-selector', text: 'Ready' }]) });
  assert.deepEqual(result.errors, []);
  assert.ok(result.journeys.every(journey => journey.status === 'failed' && !journey.detail.includes('private-selector')));
  assert.deepEqual(events, Array.from({ length: 4 }, () => ['start', 'integrity', 'close']).flat());
});

test('optional comparison per-context proxies reject redirect hops to another localhost origin', { timeout: 20_000 }, async t => {
  const root = await workspace(t);
  let remoteRequests = 0, redirects = 0, allowedRequests = 0;
  const remote = createServer((_request, response) => { remoteRequests++; response.end('Forbidden destination'); });
  await new Promise(resolve => remote.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { remote.closeAllConnections(); remote.close(resolve); }));
  const remoteUrl = `http://127.0.0.1:${remote.address().port}/`;
  const result = await verify(root, async () => {
    const server = createServer((request, response) => {
      if (request.url === '/redirect') { redirects++; response.writeHead(302, { location: remoteUrl }).end(); }
      else if (request.url === '/state') { allowedRequests++; response.end('Ready'); }
      else response.writeHead(200, { 'content-type': 'text/html' }).end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><p id="result">Loading</p><script>
        fetch('/redirect').catch(()=>{}).finally(()=>fetch('/state').then(response=>response.text()).then(text=>document.querySelector('#result').textContent=text));
      </script>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const close = () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
    t.after(close);
    return { url: `http://127.0.0.1:${server.address().port}/`, assertIntegrity: async () => {}, redactMessage: value => value, close };
  }, { isolateNetwork: true });
  assert.deepEqual(result.errors, []);
  assert.equal(redirects, 4); assert.equal(allowedRequests, 4);
  assert.equal(remoteRequests, 0, 'Redirects must obey the current attempt origin at the transport boundary.');
  assert.ok(result.journeys.every(journey => journey.status === 'failed' && !/step exceeded/i.test(journey.detail)), JSON.stringify(result));
});

test('classified integrity failures escape after runtime cleanup and stop further attempts', { timeout: 10_000 }, async t => {
  const root = await workspace(t), failure = new ClassifiedExecutionFailure('integrity', 'Frozen source changed.');
  let started = 0, closed = 0;
  await assert.rejects(verify(root, async () => {
    started++;
    const runtime = await service(t);
    return { ...runtime, assertIntegrity: async () => { throw failure; }, close: async () => { await runtime.close(); closed++; } };
  }), error => error === failure);
  assert.equal(started, 1); assert.equal(closed, 1);
});

test('runtime cleanup errors fail the run and cannot start another service', { timeout: 10_000 }, async t => {
  const root = await workspace(t);
  let started = 0;
  const result = await verify(root, async () => {
    started++;
    const runtime = await service(t);
    return { ...runtime, redactMessage: value => value.replaceAll('private-cleanup', '[redacted]'),
      close: async () => { await runtime.close(); throw new Error('private-cleanup failed'); } };
  });
  assert.equal(started, 1);
  assert.match(result.errors.join('\n'), /\[redacted\] failed/);
  assert.ok(result.journeys.every(journey => journey.status === 'failed'));
  assert.match(result.journeys[0].detail, /Runtime cleanup: \[redacted\] failed/);
});

test('runtime preparation failure stops later attempts and retains complete failed evidence', { timeout: 10_000 }, async t => {
  const root = await workspace(t);
  let started = 0;
  const result = await verify(root, async () => { started++; throw new Error('Package source no longer matches.'); });
  assert.equal(started, 1);
  assert.deepEqual(result.errors, ['Package source no longer matches.']);
  assert.equal(result.journeys.length, 4);
  assert.ok(result.journeys.every(journey => journey.status === 'failed'));
  assert.ok(result.journeys.slice(1).every(journey => journey.detail.startsWith('Not executed:')));
});

test('the shared deadline cancels runtime preparation and closes a late successful start', { timeout: 10_000 }, async t => {
  const root = await workspace(t);
  let signalSeen, closed = 0, started = 0;
  const before = performance.now();
  const result = await verify(root, async signal => {
    started++; signalSeen = signal;
    await new Promise(resolve => signal.addEventListener('abort', () => setTimeout(resolve, 25), { once: true }));
    return { url: 'http://127.0.0.1:1/', assertIntegrity: async () => {}, redactMessage: value => value,
      close: async () => { closed++; } };
  }, { timeoutMs: 2000 });
  assert.equal(started, 1);
  assert.equal(signalSeen.aborted, true);
  assert.equal(closed, 1);
  assert.ok(performance.now() - before < 6000);
  assert.match(result.errors.join('\n'), /limit/);
  assert.ok(result.journeys.every(journey => journey.status === 'failed'));
});

test('caller cancellation reaches runtime preparation and cleans a late result', { timeout: 10_000 }, async t => {
  const root = await workspace(t), controller = new AbortController();
  let closed = 0;
  await assert.rejects(verify(root, async signal => {
    setTimeout(() => controller.abort(), 25);
    await new Promise(resolve => signal.addEventListener('abort', () => setTimeout(resolve, 25), { once: true }));
    return { url: 'http://127.0.0.1:1/', assertIntegrity: async () => {}, redactMessage: value => value,
      close: async () => { closed++; } };
  }, { signal: controller.signal }), /stopped/);
  assert.equal(closed, 1);
});

test('a synchronous final integrity check cannot pass after starving the deadline timer', { timeout: 10_000 }, async t => {
  const root = await workspace(t), checks = plan();
  checks.journeys = checks.journeys.slice(0, 1);
  const timeoutMs = 3500, before = performance.now();
  let assertions = 0, closed = 0, finalSignal;
  const result = await verify(root, async signal => {
    const runtime = await service(t);
    return { ...runtime,
      assertIntegrity: async () => {
        if (++assertions === 2) {
          // Finish in the same microtask, so the setTimeout callback cannot run.
          while (performance.now() - before < timeoutMs + 150) { /* bounded synchronous host work */ }
        }
      },
      close: async () => { await runtime.close(); closed++; finalSignal = signal.aborted; }
    };
  }, { plan: checks, timeoutMs });
  assert.equal(assertions, 2); assert.equal(closed, 2);
  assert.deepEqual(result.journeys.map(journey => journey.status), ['passed', 'failed']);
  assert.match(result.errors.join('\n'), /3\.5-second limit/);
  assert.equal(finalSignal, true, 'Elapsed-time failure must also cancel the runtime signal.');
});
