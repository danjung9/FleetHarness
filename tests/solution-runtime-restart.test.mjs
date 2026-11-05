import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';
import { assertRuntimeSourceFiles } from '../dist-electron/shared/runtime-artifacts.js';

const service = { profile: 'service', files: ['server.mjs'], requiredEnv: [],
  command: { runtime: 'node', entrypoint: 'server.mjs', args: [] }, healthPath: '/health', invokePath: '/invoke' };
const source = `import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
let memory=0;
let starts=0;try{starts=Number(await readFile('.runtime-data/starts','utf8'));}catch{}
await writeFile('.runtime-data/starts',String(starts+1));
createServer(async(req,res)=>{
  if(req.url==='/health'){res.end('ready');return;}
  let text='';for await(const chunk of req)text+=chunk;
  const input=JSON.parse(text);
  if(input.value!==undefined){memory++;await writeFile('.runtime-data/task.json',JSON.stringify(input.value));}
  let record=null;try{record=JSON.parse(await readFile('.runtime-data/task.json','utf8'));}catch{}
  res.setHeader('content-type','application/json');res.end(JSON.stringify({pid:process.pid,memory,record,starts:starts+1}));
}).listen(Number(process.env.PORT),process.env.HOST);`;

async function fixture(t, contents = source, options = {}, signal) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-restart-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'server.mjs'), contents);
  const runtime = await prepareSolutionRuntime(root, service, process.execPath, signal, options);
  t.after(() => runtime.close());
  return runtime;
}

test('service restart replaces its process while preserving durable data, dependencies and origin', async t => {
  const runtime = await fixture(t);
  const root = runtime.root, url = runtime.url, hash = runtime.provenance.filesHash;
  const first = await runtime.invoke({ value: { title: 'Inspect pump', revision: 3 } });
  await fs.mkdir(path.join(root, 'node_modules'));
  const dependency = path.join(root, 'node_modules', 'retained-dependency');
  await fs.writeFile(dependency, 'installed bytes');
  const inode = (await fs.stat(dependency)).ino;
  await runtime.restart();
  const next = await runtime.invoke({});
  assert.notEqual(next.pid, first.pid);
  assert.throws(() => process.kill(first.pid, 0), { code: 'ESRCH' });
  assert.deepEqual(next, { pid: next.pid, memory: 0, record: first.record, starts: 2 });
  assert.equal(runtime.root, root); assert.equal(runtime.url, url); assert.equal(runtime.provenance.filesHash, hash);
  assert.equal((await fs.stat(dependency)).ino, inode);
  assert.equal(await fs.readFile(dependency, 'utf8'), 'installed bytes');
  assert.equal((await fetch(new URL('/health', url))).status, 200);
  await runtime.assertIntegrity();
});

test('concurrent restart requests share one replacement and future restarts still work', async t => {
  const runtime = await fixture(t);
  await Promise.all([runtime.restart(), runtime.restart()]);
  assert.equal((await runtime.invoke({})).starts, 2);
  await runtime.restart();
  assert.equal((await runtime.invoke({})).starts, 3);
});

test('restart rejects altered declared source and removes the failed runtime', async t => {
  const runtime = await fixture(t);
  const first = await runtime.invoke({});
  await fs.appendFile(path.join(runtime.root, 'server.mjs'), '\n// altered frozen source');
  await assert.rejects(runtime.restart(), /Declared runtime files changed/);
  await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
  assert.throws(() => process.kill(first.pid, 0), { code: 'ESRCH' });
  await assert.rejects(fetch(runtime.url));
});

test('restart applies a fresh bounded startup deadline and cleans up an unhealthy replacement', { timeout: 8000 }, async t => {
  const script = source.replace("if(req.url==='/health'){res.end('ready');return;}", "if(req.url==='/health'){if(starts===0)res.end('ready');return;}");
  const runtime = await fixture(t, script, { startupTimeoutMs: 350, invocationTimeoutMs: 4000 });
  const before = Date.now();
  await assert.rejects(runtime.restart(), /startup deadline/);
  assert.ok(Date.now() - before < 2500);
  await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
  await assert.rejects(fetch(runtime.url));
});

test('restart retains the original total budget while a replacement is starting', { timeout: 8000 }, async t => {
  const script = source.replace("if(req.url==='/health'){res.end('ready');return;}", "if(req.url==='/health'){if(starts===0)res.end('ready');return;}");
  const runtime = await fixture(t, script, { totalTimeoutMs: 650, startupTimeoutMs: 4000 });
  const before = Date.now();
  await assert.rejects(runtime.restart(), /total execution limit/);
  assert.ok(Date.now() - before < 2500);
  await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
});

test('cancellation during restart terminates the replacement and removes its package', { timeout: 8000 }, async t => {
  const controller = new AbortController();
  const script = source.replace("if(req.url==='/health'){res.end('ready');return;}", "if(req.url==='/health'){if(starts===0)res.end('ready');return;}");
  const runtime = await fixture(t, script, { startupTimeoutMs: 4000 }, controller.signal);
  const pending = runtime.restart();
  const result = assert.rejects(pending, /execution stopped|aborted/i);
  const timer = setTimeout(() => controller.abort(), 150);
  try { await result; } finally { clearTimeout(timer); }
  await assert.rejects(fs.access(runtime.root), { code: 'ENOENT' });
  await assert.rejects(fetch(runtime.url));
});

test('runtime data paths cannot enter deployment manifests and cannot become aliases', async t => {
  for (const file of ['.runtime-data', '.runtime-data/tasks.json', 'assets/.RUNTIME-DATA/data', 'assets\\.runtime-data\\data']) {
    assert.throws(() => assertRuntimeSourceFiles(['server.mjs', file]), /reserved writable state directory/);
  }
  const runtime = await fixture(t), outside = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-state-alias-'));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  await fs.rm(path.join(runtime.root, '.runtime-data'), { recursive: true });
  await fs.writeFile(path.join(outside, 'retained'), 'outside');
  await fs.symlink(outside, path.join(runtime.root, '.runtime-data'));
  await assert.rejects(runtime.restart(), /ordinary runtime data directory/);
  assert.equal(await fs.readFile(path.join(outside, 'retained'), 'utf8'), 'outside');
});

test('CLI and static browser profiles do not expose service restart', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-no-service-restart-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'engine.mjs'), 'console.log(1)');
  await fs.writeFile(path.join(root, 'index.html'), '<h1>Static</h1>');
  for (const manifest of [
    { profile: 'cli', files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } },
    { profile: 'browser', files: ['index.html', 'engine.mjs'], entrypoint: 'index.html', requiredEnv: [], evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } },
  ]) {
    const runtime = await prepareSolutionRuntime(root, manifest, process.execPath);
    try { assert.equal(runtime.restart, undefined); } finally { await runtime.close(); }
  }
});
