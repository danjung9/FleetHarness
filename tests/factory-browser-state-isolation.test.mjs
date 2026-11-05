import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runFactoryBrowserHoldout, factoryBrowserHoldoutPassed } from '../scripts/factory-browser-holdout.mjs';

async function statefulFixture(t, mutateSource = false) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-holdout-state-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const workspace = path.join(directory, 'source'), evidenceRoot = path.join(directory, 'evidence');
  const log = path.join(directory, 'observations.jsonl');
  await fs.mkdir(workspace);
  const files = {
    'seed.txt': 'initial source\n',
    'index.html': `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stateful calculator</title>
<style>body{font:16px sans-serif;margin:16px}textarea{box-sizing:border-box;display:block;width:100%;max-width:32rem}pre{white-space:pre-wrap}</style>
<main><h1>Calculator</h1><label>Input JSON<textarea data-testid="factory-input"></textarea></label><button data-testid="factory-submit">Calculate</button><pre data-testid="factory-result">Ready</pre></main>
<script>document.querySelector('button').onclick=async()=>{const output=document.querySelector('pre');try{const input=JSON.parse(document.querySelector('textarea').value);const response=await fetch('/calculate',{method:'POST',headers:{'content-type':'application/json','x-viewport':String(innerWidth)},body:JSON.stringify(input)});output.textContent=JSON.stringify(await response.json());}catch{output.textContent=JSON.stringify({error:'Enter valid JSON.'});}};</script></html>`,
    'server.mjs': `import {createServer} from 'node:http';import {readFileSync,appendFileSync,existsSync,writeFileSync} from 'node:fs';
const log=${JSON.stringify(log)}, original=${JSON.stringify(path.join(workspace, 'seed.txt'))}, marker=${JSON.stringify(path.join(directory, 'mutated'))};
const record=value=>appendFileSync(log,JSON.stringify({pid:process.pid,root:process.cwd(),...value})+'\\n');
const html=readFileSync(new URL('./index.html',import.meta.url));let calls=0;record({event:'started'});
createServer(async(request,response)=>{
  if(request.url==='/health'){response.writeHead(200,{'content-type':'application/json'}).end('{"ok":true}');return;}
  if(request.url==='/calculate'){
    let body='';for await(const chunk of request)body+=chunk;const input=JSON.parse(body);
    record({event:'calculated',ordinal:++calls,width:Number(request.headers['x-viewport']),input});
    if(${mutateSource}&&!existsSync(marker)){writeFileSync(marker,'once');writeFileSync(original,'changed after first attempt\\n');}
    response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({total:input.values.reduce((sum,value)=>sum+value,0)}));return;
  }
  if(request.url==='/'){response.writeHead(200,{'content-type':'text/html; charset=utf-8'}).end(html);return;}
  response.writeHead(404).end('Not found');
}).listen(Number(process.env.PORT),process.env.HOST);\n`
  };
  for (const [file, content] of Object.entries(files)) await fs.writeFile(path.join(workspace, file), content);
  return { workspace, evidenceRoot, files, log,
    manifest: { profile: 'service', files: Object.keys(files), requiredEnv: [],
      command: { runtime: 'node', entrypoint: 'server.mjs', args: [] }, healthPath: '/health', invokePath: '/calculate' } };
}

async function observations(app) {
  return (await fs.readFile(app.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
}

async function assertClosed(starts) {
  for (const { pid, root } of starts) {
    await assert.rejects(fs.access(root), /ENOENT/, 'Each independent runtime package must be removed.');
    // close() sends the process-group kill before removing the package; allow
    // process exit delivery to settle without hiding a still-running service.
    for (let attempt = 0; attempt < 20; attempt++) {
      try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') break; throw error; }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  }
}

test('factory browser holdouts isolate service state per journey and viewport while retaining state within each journey',
  { timeout: 45_000 }, async t => {
    const app = await statefulFixture(t);
    const report = await runFactoryBrowserHoldout(app);
    assert.equal(report.status, 'passed', JSON.stringify(report));
    assert.equal(factoryBrowserHoldoutPassed(report), true);
    assert.equal(report.runtime.profile, 'service');
    assert.match(report.runtime.filesHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(report.errors, []);
    assert.equal(report.journeys.length, 4);
    const events = await observations(app), starts = events.filter(event => event.event === 'started');
    assert.equal(starts.length, 4, 'Each journey and viewport must receive a separate service process.');
    assert.equal(new Set(starts.map(event => event.pid)).size, 4);
    const calls = starts.map(start => events.filter(event => event.pid === start.pid && event.event === 'calculated'));
    assert.deepEqual(calls.map(entries => entries.map(entry => entry.ordinal)), [[1, 2, 3], [1, 2, 3], [1, 2], [1, 2]],
      'Successful calculations retain state within each journey, including recovery after malformed input.');
    assert.deepEqual(calls.map(entries => [...new Set(entries.map(entry => entry.width))]), [[1280], [390], [1280], [390]]);
    await assertClosed(starts);
    for (const journey of report.journeys) {
      assert.equal(journey.status, 'passed');
      assert.ok((await fs.stat(path.join(app.evidenceRoot, journey.screenshot))).size > 0);
      assert.ok((await fs.stat(path.join(app.evidenceRoot, journey.trace))).size > 0);
    }
    for (const [file, content] of Object.entries(app.files)) assert.equal(await fs.readFile(path.join(app.workspace, file), 'utf8'), content);
    await assert.rejects(fs.access(path.join(app.workspace, '.quality-evidence')), /ENOENT/);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(app.evidenceRoot, 'browser-holdout-report.json'), 'utf8')), report);
  });

test('factory browser holdouts reject source changes between independent service attempts and clean up rejected packages',
  { timeout: 45_000 }, async t => {
    const app = await statefulFixture(t, true);
    const report = await runFactoryBrowserHoldout(app);
    assert.equal(report.status, 'failed', JSON.stringify(report));
    assert.equal(factoryBrowserHoldoutPassed(report), false);
    assert.equal(report.journeys[0].status, 'passed');
    assert.ok(report.journeys.slice(1).every(journey => journey.status === 'failed'));
    assert.match(JSON.stringify(report), /Deployment files changed between independent browser verification packages/);
    const events = await observations(app), starts = events.filter(event => event.event === 'started');
    assert.equal(starts.length, 2, 'Verification must stop after the first independent package detects changed source.');
    assert.equal(new Set(events.filter(event => event.event === 'calculated').map(event => event.pid)).size, 1,
      'No browser action may execute against a package whose source differs from the original runtime.');
    await assertClosed(starts);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(app.evidenceRoot, 'browser-holdout-report.json'), 'utf8')), report);
  });
