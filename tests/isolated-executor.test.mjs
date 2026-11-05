import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createCandidatePermissionProfile, executeIsolatedProcess } from '../dist-electron/electron/isolated-executor.js';

const supported = ['darwin', 'linux'].includes(process.platform);
async function fixture(t, source) {
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-isolation-test-')));
  const workspace = path.join(base, 'workspace'); await fs.mkdir(workspace);
  const script = path.join(workspace, 'app.mjs'); await fs.writeFile(script, source);
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  return { base, workspace, script, run: options => executeIsolatedProcess({ workspace, command: [process.execPath, script], timeoutMs: 5000, ...options }) };
}

test('candidate isolation denies outside files, protected writes, ambient secrets, and host loopback', { skip: !supported }, async t => {
  const server = createServer((_req, res) => res.end('leak'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const f = await fixture(t, `
    import fs from 'node:fs/promises';
    const denied = {};
    for (const [name, action] of Object.entries({read:()=>fs.readFile(process.argv[2]),write:()=>fs.writeFile(process.argv[2],'bad'),contract:()=>fs.writeFile('solution-contract.json','bad'),network:()=>fetch(process.argv[3])})) {
      try { await action(); denied[name]=false; } catch { denied[name]=true; }
    }
    await fs.writeFile('result.txt','allowed');
    console.log(JSON.stringify({denied,secret:process.env.FLEET_TEST_SECRET}));
  `);
  const privateFile = path.join(f.base, 'private.txt'); await fs.writeFile(privateFile, 'host secret');
  await fs.writeFile(path.join(f.workspace, 'solution-contract.json'), '{}');
  const old = process.env.FLEET_TEST_SECRET; process.env.FLEET_TEST_SECRET = 'host credential';
  try {
    const result = await f.run({ writable: true, command: [process.execPath, f.script, privateFile, `http://127.0.0.1:${server.address().port}`] });
    assert.equal(result.exitCode, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { denied: { read: true, write: true, contract: true, network: true } });
    assert.equal(await fs.readFile(privateFile, 'utf8'), 'host secret');
    assert.equal(await fs.readFile(path.join(f.workspace, 'result.txt'), 'utf8'), 'allowed');
  } finally { if (old === undefined) delete process.env.FLEET_TEST_SECRET; else process.env.FLEET_TEST_SECRET = old; }
});

test('stage-specific immutable paths permit planning then freeze the public contract', { skip: !supported }, async t => {
  const f = await fixture(t, `import fs from 'node:fs/promises';await fs.writeFile('solution-contract.json','planned');`);
  const result = await f.run({ writable: true, immutablePaths: ['inputs'] });
  assert.equal(result.exitCode, 0, result.stderr);
  const frozen = await f.run({ writable: true });
  assert.notEqual(frozen.exitCode, 0);
  const profile = await createCandidatePermissionProfile({ workspace: f.workspace, writable: true, immutablePaths: [] });
  assert.equal(profile.filesystem[path.join(f.workspace, '.codex')], 'deny');
  assert.equal(profile.network.enabled, false);
  await assert.rejects(createCandidatePermissionProfile({ workspace: f.workspace, immutablePaths: ['../outside'] }), /normalized/);
});

test('protected seeds cannot be hardlinked or renamed to writable aliases within one process', { skip: !supported }, async t => {
  const f = await fixture(t, `import fs from 'node:fs';const result={};
    for(const name of ['requirements.md','memory-context.md','inputs/seed.txt']){
      try{fs.linkSync(name,name.replaceAll('/','-')+'.alias');fs.writeFileSync(name.replaceAll('/','-')+'.alias','changed');result['link '+name]='escaped';}catch{result['link '+name]='blocked';}
      try{fs.renameSync(name,name.replaceAll('/','-')+'.moved');fs.writeFileSync(name,'changed');result['rename '+name]='escaped';}catch{result['rename '+name]='blocked';}
    }
    try{fs.renameSync('inputs','moved-inputs');result.directory='escaped';}catch{result.directory='blocked';}
    console.log(JSON.stringify(result));`);
  await fs.mkdir(path.join(f.workspace, 'inputs'));
  for (const file of ['requirements.md', 'memory-context.md', 'inputs/seed.txt']) await fs.writeFile(path.join(f.workspace, file), 'immutable');
  const result = await f.run({ writable: true, immutablePaths: ['requirements.md', 'memory-context.md', 'inputs'] });
  assert.equal(result.exitCode, 0, result.stderr); assert.ok(Object.values(JSON.parse(result.stdout)).every(value => value === 'blocked'), result.stdout);
  for (const file of ['requirements.md', 'memory-context.md', 'inputs/seed.txt']) assert.equal(await fs.readFile(path.join(f.workspace, file), 'utf8'), 'immutable');
});

test('writable isolation rejects filesystem aliases and unsafe environment before launching', { skip: !supported }, async t => {
  const f = await fixture(t, 'console.log("should not run")');
  await fs.symlink(f.script, path.join(f.workspace, 'alias'));
  await assert.rejects(f.run({ writable: true }), /symlinks/);
  await fs.rm(path.join(f.workspace, 'alias'));
  await fs.link(f.script, path.join(f.workspace, 'alias'));
  await assert.rejects(f.run({ writable: true }), /hardlinks/);
  await fs.rm(path.join(f.workspace, 'alias'));
  await assert.rejects(f.run({ env: { NODE_OPTIONS: '--require=host.js' } }), /Unsafe isolated/);
  await assert.rejects(f.run({ writePaths: [f.base] }), /inside/);
});

test('isolation kills runaway output and aborts a complete process group', { skip: !supported }, async t => {
  const output = await fixture(t, 'for(;;) process.stdout.write("x".repeat(10000));');
  await assert.rejects(output.run({ maxOutputBytes: 1000 }), /output budget/);
  const hanging = await fixture(t, 'setInterval(()=>{},1000);');
  const signal = AbortSignal.timeout(100);
  await assert.rejects(hanging.run({ signal }), /cancelled|aborted/i);
  await assert.rejects(hanging.run({ timeoutMs: 100 }), /deadline/);
});

test('a detached descendant cannot keep mutating a candidate after its deadline', { skip: !supported }, async t => {
  const f = await fixture(t, `import {spawn} from 'node:child_process';
    const child=spawn(process.execPath,['-e',"setInterval(()=>require('node:fs').appendFileSync('ticks.txt','x'),20)"],{detached:true,stdio:'ignore'});
    console.log(child.pid); child.unref();setInterval(()=>{},1000);`);
  let descendant;
  try {
    await assert.rejects(f.run({ writable: true, timeoutMs: 800, onStdout: chunk => { const pid = Number(chunk.toString().trim()); if (pid) descendant = pid; } }), /deadline/);
    const file = path.join(f.workspace, 'ticks.txt'), before = await fs.readFile(file, 'utf8');
    assert.ok(before.length, 'The descendant must execute before cancellation.');
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(await fs.readFile(file, 'utf8'), before, 'No descendant may keep writing after the execution deadline.');
  } finally { if (descendant) try { process.kill(descendant, 'SIGKILL'); } catch {} }
});

test('macOS kernel prevents detachment when the Node compatibility preload is removed', { skip: process.platform !== 'darwin' }, async t => {
  const f = await fixture(t, `import {spawnSync} from 'node:child_process';
    const result=spawnSync(process.execPath,['-e',"try{const p=require('node:child_process').spawn('/bin/echo',['escape'],{detached:true});p.on('error',error=>console.log(error.code));p.on('spawn',()=>{console.log('escaped');process.exitCode=71})}catch(error){console.log(error.code)}"],{env:{...process.env,NODE_OPTIONS:''},encoding:'utf8'});
    if(result.status!==0)throw Error(result.stderr);console.log(result.stdout.trim());`);
  const result = await f.run();
  assert.equal(result.exitCode, 0, result.stderr); assert.equal(result.stdout.trim(), 'EPERM');
});

test('contained Node and Python subprocesses retain normal fork and exec functionality', { skip: process.platform !== 'darwin' }, async t => {
  const f = await fixture(t, `import {spawn,spawnSync,exec,execSync,execFile,execFileSync,fork} from 'node:child_process';
    const child=spawn(process.execPath,['-e',"console.log('async child')"]);child.stdout.pipe(process.stdout);
    console.log(spawnSync('/bin/echo',['spawn sync'],{encoding:'utf8'}).stdout.trim());
    console.log(execFileSync('/bin/echo',['exec file sync'],{encoding:'utf8'}).trim());
    console.log(execSync('/bin/echo exec sync',{encoding:'utf8'}).trim());
    execFile('/bin/echo',['exec file'],(error,out)=>{if(error)throw error;console.log(out.trim());});
    exec('/bin/echo exec child',(error,out)=>{if(error)throw error;console.log(out.trim());});`);
  const result = await f.run(); assert.equal(result.exitCode, 0, result.stderr);
  for (const text of ['async child', 'spawn sync', 'exec file sync', 'exec sync', 'exec file', 'exec child']) assert.ok(result.stdout.includes(text), result.stdout);
  const runtime = JSON.parse(execFileSync('python3', ['-I', '-c', 'import json,sys;print(json.dumps({"executable":sys.executable,"prefix":sys.base_prefix}))'], { encoding: 'utf8' }));
  const python = await f.run({ command: [runtime.executable, '-I', '-c', `import subprocess, os\nprint(subprocess.check_output(['/bin/echo','python child'],text=True).strip())\ntry:\n os.posix_spawn('/bin/echo',['echo','escape'],dict(os.environ),setsid=True)\n raise AssertionError('Detached spawn escaped')\nexcept PermissionError:\n print('detached blocked')`], readPaths: [runtime.prefix] });
  assert.equal(python.exitCode, 0, python.stderr); assert.match(python.stdout, /python child\ndetached blocked/);
});
