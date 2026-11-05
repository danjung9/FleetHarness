import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';

const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const options = { timeout: 15_000 };
const startupTimeoutMs = 800;
const serviceSource = `
import { createServer } from 'node:http';
import { appendFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const [evidence, scenario] = process.argv.slice(2);
const record = (event, extra = {}) => appendFileSync(evidence, JSON.stringify({
  event, at: performance.now(), pid: process.pid, cwd: process.cwd(), ...extra
}) + '\\n');
let healthRequests = 0;
record('started');
createServer(async (request, response) => {
  if (request.url === '/health') {
    const attempt = ++healthRequests;
    record('health-request', { attempt });
    if (scenario === 'hang') return;
    if (scenario === 'late-headers' || scenario === 'late-body') {
      if (attempt === 1) {
        setTimeout(() => {
          record('health-unhealthy', { attempt });
          response.writeHead(503).end('not yet');
        }, 250);
        return;
      }
      if (scenario === 'late-body') {
        record('health-headers', { attempt });
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.flushHeaders();
        response.write('rea');
      }
      setTimeout(() => {
        record('health-complete', { attempt });
        response.end(scenario === 'late-body' ? 'dy' : 'ready');
      }, 650);
      return;
    }
    record('health-complete', { attempt });
    response.end('ready');
    return;
  }
  let body = '';
  for await (const chunk of request) body += chunk;
  const input = JSON.parse(body);
  record('invoke-request', { delayMs: input.delayMs ?? 0 });
  setTimeout(() => {
    record('invoke-complete', { value: input.value });
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ value: input.value }));
  }, input.delayMs ?? 0);
}).listen(Number(process.env.PORT), process.env.HOST, () => record('listening'));
`;

async function fixture(t, scenario) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-service-startup-test-'));
  const source = path.join(directory, 'source'), evidence = path.join(directory, 'events.jsonl');
  await fs.mkdir(source);
  await fs.writeFile(path.join(source, 'engine.mjs'), serviceSource);
  const runtimes = new Set();
  const events = async () => {
    try { return (await fs.readFile(evidence, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  };
  t.after(async () => {
    for (const runtime of runtimes) await runtime.close();
    t.diagnostic(JSON.stringify({ scenario, events: await events() }));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const manifest = { profile: 'service', files: ['engine.mjs'], requiredEnv: [],
    command: { runtime: 'node', entrypoint: 'engine.mjs', args: [evidence, scenario] },
    healthPath: '/health', invokePath: '/invoke' };
  return { events, async start(limits = {}, signal) {
    const runtime = await prepareSolutionRuntime(source, manifest, process.execPath, signal,
      { startupTimeoutMs, invocationTimeoutMs: 3000, totalTimeoutMs: 6000, ...limits });
    runtimes.add(runtime);
    return runtime;
  } };
}

async function waitForEvent(fixture, event) {
  const until = Date.now() + 5000;
  for (;;) {
    const entries = await fixture.events(), found = entries.find(entry => entry.event === event);
    if (found) return found;
    assert.ok(Date.now() < until, `Service did not record ${event}: ${JSON.stringify(entries)}`);
    await pause(10);
  }
}

async function assertCleaned(fixture) {
  const started = (await fixture.events()).find(entry => entry.event === 'started');
  assert.ok(started, 'The real service process must have started.');
  assert.equal(path.basename(started.cwd), 'package');
  const directory = path.dirname(started.cwd);
  assert.match(path.basename(directory), /^appyard-solution-/);
  const until = Date.now() + 3000;
  for (;;) {
    let alive = true, exists = true;
    try { process.kill(started.pid, 0); }
    catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; }
    try { await fs.access(directory); }
    catch (error) { if (error.code === 'ENOENT') exists = false; else throw error; }
    if (!alive && !exists) return;
    assert.ok(Date.now() < until, `Service cleanup incomplete: ${JSON.stringify({ pid: started.pid, alive, directory, exists })}`);
    await pause(10);
  }
}

const outcomeOf = promise => promise.then(runtime => ({ runtime }), error => ({ error }));

for (const scenario of ['late-headers', 'late-body']) {
  test(`ordinary service startup rejects cumulative ${scenario} after its overall deadline`, options, async t => {
    const service = await fixture(t, scenario);
    const outcome = await outcomeOf(service.start());
    if (outcome.runtime) await outcome.runtime.close();
    await assertCleaned(service);
    const events = await service.events();
    const first = events.find(entry => entry.event === 'health-request' && entry.attempt === 1);
    const unhealthy = events.find(entry => entry.event === 'health-unhealthy' && entry.attempt === 1);
    const second = events.find(entry => entry.event === 'health-request' && entry.attempt === 2);
    assert.ok(first && unhealthy && second, `Both real health attempts must run: ${JSON.stringify(events)}`);
    assert.ok(unhealthy.at - first.at >= 200, 'The first unsuccessful health response consumed the shared startup budget.');
    assert.ok(second.at > unhealthy.at, 'Readiness was retried after the unsuccessful response.');
    if (scenario === 'late-body') assert.ok(events.some(entry => entry.event === 'health-headers' && entry.attempt === 2));
    if (outcome.runtime) {
      const completed = events.find(entry => entry.event === 'health-complete' && entry.attempt === 2);
      assert.ok(completed && completed.at - first.at > startupTimeoutMs,
        `An accepted baseline must demonstrate lateness within health handling, not preparation: ${JSON.stringify(events)}`);
    }
    assert.ok(outcome.error, `Service accepted late readiness: ${JSON.stringify(events)}`);
    assert.match(outcome.error.message, /startup deadline/i);
  });
}

test('ordinary service remains usable after a timely startup deadline has elapsed', options, async t => {
  const service = await fixture(t, 'ready');
  const runtime = await service.start();
  assert.deepEqual(await runtime.invoke({ value: 'before' }), { value: 'before' });
  await pause(startupTimeoutMs + 50);
  assert.deepEqual(await runtime.invoke({ value: 'after' }), { value: 'after' });
  await runtime.close();
  await assertCleaned(service);
});

test('caller cancellation during ordinary service health checks cleans up the process and package', options, async t => {
  const service = await fixture(t, 'hang'), controller = new AbortController();
  const pending = outcomeOf(service.start({ startupTimeoutMs: 5000 }, controller.signal));
  await waitForEvent(service, 'health-request');
  controller.abort();
  const outcome = await pending;
  if (outcome.runtime) await outcome.runtime.close();
  assert.ok(outcome.error, 'Caller cancellation must reject preparation.');
  assert.match(outcome.error.message, /execution stopped/i);
  await assertCleaned(service);
});

test('total execution deadline during ordinary service health checks cleans up the process and package', options, async t => {
  const service = await fixture(t, 'hang');
  const pending = outcomeOf(service.start({ startupTimeoutMs: 5000, totalTimeoutMs: 1200 }));
  await waitForEvent(service, 'health-request');
  const outcome = await pending;
  if (outcome.runtime) await outcome.runtime.close();
  assert.ok(outcome.error, 'The total execution deadline must reject preparation.');
  assert.match(outcome.error.message, /total execution limit/i);
  await assertCleaned(service);
});

test('ordinary service invocation timeouts remain enforced after readiness without ending the service', options, async t => {
  const service = await fixture(t, 'ready');
  const runtime = await service.start({ invocationTimeoutMs: 150 });
  assert.deepEqual(await runtime.invoke({ value: 'first' }), { value: 'first' });
  await assert.rejects(runtime.invoke({ value: 'late', delayMs: 1000 }), /timeout|timed out/i);
  assert.deepEqual(await runtime.invoke({ value: 'recovered' }), { value: 'recovered' });
  const events = await service.events();
  assert.ok(events.some(entry => entry.event === 'invoke-request' && entry.delayMs === 1000));
  await runtime.close();
  await assertCleaned(service);
});
