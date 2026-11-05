import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ApplicationPreviews } from '../dist-electron/electron/solution-preview.js';

const serviceSource = version => `import {createServer} from 'node:http';import {existsSync} from 'node:fs';
let healthy=true;
const info={version:${JSON.stringify(version)},pid:process.pid,cwd:process.cwd(),answerKey:existsSync('evaluation-plan.json')};
createServer(async(request,response)=>{
  if(request.url==='/health'){response.writeHead(healthy?200:503).end(healthy?'ready':'unhealthy');return;}
  if(request.url==='/unhealthy'){healthy=false;response.end('changed');return;}
  if(request.url==='/stop'){response.end('stopping');setTimeout(()=>process.exit(0),10);return;}
  if(request.url==='/invoke'){let input='';for await(const chunk of request)input+=chunk;response.setHeader('Content-Type','application/json');response.end(JSON.stringify({result:JSON.parse(input).value*2}));return;}
  response.setHeader('Content-Type','application/json');response.end(JSON.stringify(info));
}).listen(Number(process.env.PORT),process.env.HOST);`;

async function fixture(t, profile = 'service') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-preview-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const acceptance = [{ id: 'R1', requirement: 'Compute a doubled value.', method: 'automated', scenario: 'Invoke the live engine.' }];
  const runtime = profile === 'service'
    ? { profile, files: ['server.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'server.mjs', args: [] }, healthPath: '/health', invokePath: '/invoke' }
    : { profile, files: ['engine.mjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
  await fs.mkdir(path.join(root, '.fleet'));
  await fs.writeFile(path.join(root, '.fleet/packet.json'), JSON.stringify({ acceptance }));
  await fs.writeFile(path.join(root, 'solution-contract.json'), JSON.stringify({ schemaVersion: 1, objective: 'Double supplied values.', runtime,
    capabilities: [{ id: 'double', kind: 'algorithm', description: 'Calculate twice the input.', criterionIds: ['R1'], required: true, evaluationIds: ['examples'] }] }));
  await fs.writeFile(path.join(root, 'evaluation-plan.json'), '{"private":"host answer keys"}');
  await fs.writeFile(path.join(root, profile === 'service' ? 'server.mjs' : 'engine.mjs'), profile === 'service' ? serviceSource('first') : 'throw new Error("CLI preview must never execute the engine");');
  const previews = new ApplicationPreviews(process.execPath);
  t.after(() => previews.close());
  return { root, previews };
}

async function waitUntil(check, detail, timeoutMs = 3_000) {
  const until = Date.now() + timeoutMs;
  while (!await check()) {
    assert.ok(Date.now() < until, detail);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}
const exited = pid => {
  try { process.kill(pid, 0); return false; }
  catch (error) { if (error.code === 'ESRCH') return true; throw error; }
};
const removed = async directory => {
  try { await fs.stat(directory); return false; }
  catch (error) { if (error.code === 'ENOENT') return true; throw error; }
};
const info = async url => (await fetch(url, { signal: AbortSignal.timeout(2_000) })).json();

test('service previews start one clean runtime, deduplicate concurrent requests, and replace it after source changes', { timeout: 15_000 }, async t => {
  const { root, previews } = await fixture(t);
  const urls = await Promise.all([previews.url(root), previews.url(root), previews.url(root)]);
  assert.ok(urls[0]?.startsWith('http://127.0.0.1:'));
  assert.equal(new Set(urls).size, 1);
  const first = await info(urls[0]);
  assert.equal(first.version, 'first'); assert.equal(first.answerKey, false);
  assert.notEqual(first.cwd, await fs.realpath(root)); assert.notEqual(first.pid, process.pid);
  const calculation = await fetch(new URL('/invoke', urls[0]), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"value":7}', signal: AbortSignal.timeout(2_000) });
  assert.deepEqual(await calculation.json(), { result: 14 });
  assert.equal(await previews.url(root), urls[0]);
  assert.equal((await info(await previews.url(root))).pid, first.pid);

  await fs.writeFile(path.join(root, 'server.mjs'), serviceSource('updated'));
  const updatedUrl = await previews.url(root), updated = await info(updatedUrl);
  assert.equal(updated.version, 'updated'); assert.notEqual(updated.pid, first.pid); assert.notEqual(updated.cwd, first.cwd);
  await waitUntil(() => exited(first.pid), 'Old preview process must exit after a source change.');
  await waitUntil(() => removed(first.cwd), 'Old clean package must be removed after replacement.');
  previews.close();
  assert.equal(await previews.url(root), null);
  await waitUntil(() => exited(updated.pid), 'Closing previews must kill the live service.');
  await waitUntil(() => removed(updated.cwd), 'Closing previews must remove the clean package.');
});

test('cached service previews restart after an unhealthy response or a stopped process', { timeout: 15_000 }, async t => {
  const { root, previews } = await fixture(t);
  const firstUrl = await previews.url(root), first = await info(firstUrl);
  await (await fetch(new URL('/unhealthy', firstUrl))).text();
  const healthyUrl = await previews.url(root), healthy = await info(healthyUrl);
  assert.notEqual(healthy.pid, first.pid);
  await waitUntil(() => exited(first.pid), 'An unhealthy cached preview must be stopped.');
  assert.equal((await fetch(new URL('/health', healthyUrl))).status, 200);

  await (await fetch(new URL('/stop', healthyUrl))).text();
  await waitUntil(() => exited(healthy.pid), 'Fixture service must stop before cache recovery.');
  const restartedUrl = await previews.url(root), restarted = await info(restartedUrl);
  assert.notEqual(restarted.pid, healthy.pid);
  assert.equal((await fetch(new URL('/health', restartedUrl))).status, 200);
  await waitUntil(() => removed(healthy.cwd), 'Stopped runtime package must be removed before replacement.');
  previews.close();
  await waitUntil(() => exited(restarted.pid), 'Recovered preview must close cleanly.');
  await waitUntil(() => removed(restarted.cwd), 'Recovered runtime package must be removed.');
});

test('closing during service startup resolves to no preview and never reopens; CLI preview never starts its command', { timeout: 15_000 }, async t => {
  const { root, previews } = await fixture(t);
  const starting = previews.url(root);
  previews.close();
  assert.equal(await starting, null);
  assert.equal(await previews.url(root), null);
  const cli = await fixture(t, 'cli');
  assert.equal(await cli.previews.url(cli.root), null);
  assert.equal(await cli.previews.url(cli.root), null);
  cli.previews.close();
  assert.equal(await cli.previews.url(cli.root), null);
});
