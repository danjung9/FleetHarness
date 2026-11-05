import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareIsolatedSolutionRuntime } from '../dist-electron/electron/isolated-solution-runtime.js';
import { IntegrationBroker } from '../dist-electron/electron/integration-broker.js';

const supported = { skip: !['darwin', 'linux'].includes(process.platform), timeout: 20_000 };
const nodeSource = `import {readFile,writeFile} from 'node:fs/promises';
let memory=0;
let starts=0;try{starts=Number(await readFile('.runtime-data/starts','utf8'));}catch{}
await writeFile('.runtime-data/starts',String(starts+1));
export async function invoke(input){
  if(input.value!==undefined){memory++;await writeFile('.runtime-data/task.json',JSON.stringify(input.value));}
  let record=null;try{record=JSON.parse(await readFile('.runtime-data/task.json','utf8'));}catch{}
  return {pid:process.pid,memory,record,starts:starts+1};
}`;
const pythonSource = `import os,json
memory=0
try:
    with open('.runtime-data/starts') as f: starts=int(f.read())
except FileNotFoundError: starts=0
with open('.runtime-data/starts','w') as f: f.write(str(starts+1))
def invoke(value, context):
    global memory
    if 'value' in value:
        memory+=1
        with open('.runtime-data/task.json','w') as f: json.dump(value['value'],f)
    try:
        with open('.runtime-data/task.json') as f: record=json.load(f)
    except FileNotFoundError: record=None
    return {'pid':os.getpid(),'memory':memory,'record':record,'starts':starts+1}
`;

async function fixture(t, source = nodeSource, { runtime = 'node', limits = {}, signal, services } = {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-isolated-restart-test-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = runtime === 'node' ? 'app.mjs' : 'app.py';
  await fs.writeFile(path.join(root, file), source);
  await fs.writeFile(path.join(root, 'index.html'), '<h1>Service</h1>');
  const manifest = { profile: 'service', files: [file, 'index.html'], requiredEnv: [], command: { runtime, entrypoint: file, args: [] } };
  const prepared = await prepareIsolatedSolutionRuntime(root, manifest, process.execPath, signal, limits, services);
  t.after(() => prepared.close());
  return prepared;
}

for (const language of ['node', 'python']) test(`isolated ${language} restart loses memory and preserves disk data and preview lease`, supported, async t => {
  const runtime = await fixture(t, language === 'node' ? nodeSource : pythonSource, { runtime: language });
  const url = runtime.url, root = runtime.root, hash = runtime.provenance.filesHash;
  const entry = await fetch(url, { redirect: 'manual' });
  const cookie = entry.headers.get('set-cookie').split(';')[0], origin = new URL(url).origin;
  const first = await runtime.invoke({ value: { title: 'Inspect pump', revision: 5 } });
  const stateFile = path.join(root, '.runtime-data', 'task.json'), inode = (await fs.stat(stateFile)).ino;
  await runtime.restart();
  const next = await runtime.invoke({});
  assert.notEqual(next.pid, first.pid);
  assert.throws(() => process.kill(first.pid, 0), { code: 'ESRCH' });
  assert.deepEqual(next, { pid: next.pid, memory: 0, record: first.record, starts: 2 });
  assert.equal(runtime.root, root); assert.equal(runtime.url, url); assert.equal(runtime.provenance.filesHash, hash);
  assert.equal((await fs.stat(stateFile)).ino, inode);
  const http = await fetch(origin + '/api/invoke', { method: 'POST', headers: { cookie }, body: '{}' });
  assert.equal(http.status, 200); assert.deepEqual(await http.json(), next);
  assert.equal(await (await fetch(origin, { headers: { cookie } })).text(), '<h1>Service</h1>');
  await runtime.assertIntegrity();
});

test('isolated restart keeps source read-only and rejects host changes before running a replacement', supported, async t => {
  const probe = `import {writeFile} from 'node:fs/promises';
export async function invoke(){let sourceWritable=false;try{await writeFile('app.mjs','changed');sourceWritable=true;}catch{}return {sourceWritable,pid:process.pid};}`;
  const runtime = await fixture(t, probe);
  const first = await runtime.invoke({});
  assert.equal(first.sourceWritable, false);
  await fs.appendFile(path.join(runtime.root, 'app.mjs'), '\n// host changed frozen source');
  await assert.rejects(runtime.restart(), /frozen application files/);
  await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
  assert.throws(() => process.kill(first.pid, 0), { code: 'ESRCH' });
  await assert.rejects(fetch(runtime.url));
});

test('isolated restart refuses aliases in writable state without touching external data', supported, async t => {
  const runtime = await fixture(t);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-isolated-state-target-'));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  const marker = path.join(outside, 'retained'); await fs.writeFile(marker, 'outside');
  await fs.symlink(marker, path.join(runtime.root, '.runtime-data', 'alias'));
  await assert.rejects(runtime.restart(), /symlinks|aliases/);
  assert.equal(await fs.readFile(marker, 'utf8'), 'outside');
  await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
});

const stalledRestart = nodeSource.replace('export async function invoke', "if(starts>0){setInterval(()=>{},1000);await new Promise(()=>{});}\nexport async function invoke");

test('isolated replacement must become ready within a new startup deadline and is cleaned on failure', supported, async t => {
  const runtime = await fixture(t, stalledRestart, { limits: { startupTimeoutMs: 1200 } });
  await assert.rejects(runtime.restart(), /did not become ready/);
  await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
  await assert.rejects(fetch(runtime.url));
});

test('isolated restart retains total budget and cancellation through replacement startup', supported, async t => {
  for (const cancel of [false, true]) {
    const controller = new AbortController();
    const runtime = await fixture(t, stalledRestart, {
      limits: { totalTimeoutMs: cancel ? 10_000 : 1800, startupTimeoutMs: 8000 }, signal: controller.signal,
    });
    const pending = runtime.restart();
    const result = assert.rejects(pending, /budget|deadline|cancelled|aborted/i);
    const timer = cancel ? setTimeout(() => controller.abort(), 150) : undefined;
    try { await result; } finally { clearTimeout(timer); }
    await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
    await assert.rejects(fetch(runtime.url));
  }
});

test('isolated restart preserves integration lease and shared call budget across module reload', supported, async t => {
  let requests = 0, leases = 0;
  const budget = { calls: 98 };
  const integration = new IntegrationBroker({ candidateId: 'restart-test', budget,
    operations: [{ id: 'api', origin: 'https://api.example.com', path: '/value', method: 'GET', responseType: 'json' }],
    transport: async () => ({ status: 200, contentType: 'application/json', body: JSON.stringify(++requests) }),
  });
  const runtime = await fixture(t, 'export async function invoke(value,context){return context.integrations.invoke("api",{});}', {
    services: { integrations: () => { leases++; return integration; } },
  });
  assert.equal(await runtime.invoke({}), 1);
  await runtime.restart();
  assert.equal(integration.revoked, false); assert.equal(leases, 1);
  assert.equal(await runtime.invoke({}), 2);
  await assert.rejects(runtime.invoke({}), /100-call integration limit/);
  assert.equal(budget.calls, 100); assert.equal(requests, 2);
  await runtime.close(); assert.equal(integration.revoked, true);
});

test('restart cancels outstanding integration work without delivering old results to the replacement', supported, async t => {
  let announce, release, requestSignal, requests = 0;
  const started = new Promise(resolve => { announce = resolve; });
  const firstResponse = new Promise(resolve => { release = resolve; });
  const integration = new IntegrationBroker({ candidateId: 'restart-pending-test',
    operations: [{ id: 'api', origin: 'https://api.example.com', path: '/value', method: 'GET', responseType: 'json' }],
    transport: async request => {
      if (++requests === 1) { requestSignal = request.signal; announce(); return firstResponse; }
      return { status: 200, contentType: 'application/json', body: '22' };
    },
  });
  const runtime = await fixture(t, 'export async function invoke(value,context){return context.integrations.invoke("api",{});}', {
    services: { integrations: () => integration },
  });
  const interrupted = assert.rejects(runtime.invoke({}), /interrupted by service restart/);
  await started;
  await runtime.restart(); await interrupted;
  assert.equal(requestSignal.aborted, true); assert.equal(integration.revoked, false);
  release({ status: 200, contentType: 'application/json', body: '11' });
  assert.equal(await runtime.invoke({}), 22);
  assert.equal(integration.callsConsumed, 2);
});
