import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const native = { skip: process.platform !== 'darwin', timeout: 45_000 };
const require = createRequire(import.meta.url);
const executorUrl = new URL('../dist-electron/electron/isolated-executor.js', import.meta.url).href;
const toolsUrl = new URL('../dist-electron/electron/isolated-agent-tools.js', import.meta.url).href;
const shellQuote = value => "'" + value.replaceAll("'", "'\\''") + "'";

// The ordinary repository runner uses system Node. Launch the bundled desktop
// runtime explicitly so Electron's NODE_OPTIONS behavior is exercised as well.
async function nativeDriver(t, source) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-native-isolation-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const electronDirectory = path.dirname(require.resolve('electron/package.json'));
  const relativeBinary = (await fs.readFile(path.join(electronDirectory, 'path.txt'), 'utf8')).trim();
  const executable = path.join(electronDirectory, 'dist', relativeBinary);
  const driver = path.join(root, 'driver.mjs');
  await fs.writeFile(driver, `
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { executeIsolatedProcess } from ${JSON.stringify(executorUrl)};
import { createIsolatedAgentTools } from ${JSON.stringify(toolsUrl)};
assert.ok(process.versions.electron, 'The driver must use the bundled Electron runtime');
const root = ${JSON.stringify(root)};
const workspace = path.join(root, 'candidate with spaces');
await fs.mkdir(workspace);
const tools = new Map(createIsolatedAgentTools({ workspace, executable: process.execPath }).map(tool => [tool.name, tool]));
const call = (name, args, signal) => tools.get(name).execute('native-runtime-test', args, signal);
${source}
`);
  try {
    const result = await run(executable, [driver], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', FLEET_NATIVE_PARENT_SECRET: 'host credential' },
      timeout: 35_000, maxBuffer: 2_000_000,
    });
    return JSON.parse(result.stdout);
  } catch (error) {
    assert.fail(`Bundled Electron isolation driver failed: ${error.message}\nstdout:\n${error.stdout ?? ''}\nstderr:\n${error.stderr ?? ''}`);
  }
}

test('native isolated bash resolves node and preserves quoted arguments', native, async t => {
  const filename = "script with 'quotes'.mjs";
  const args = ['plain', 'two words', "single'quote", 'double"quote', '$literal', 'semi;colon', ''];
  const script = `import { execFileSync } from 'node:child_process';
console.log('FLEET_NATIVE_RESULT:' + JSON.stringify({ electron: process.versions.electron, args: process.argv.slice(2), echo: execFileSync('/bin/echo', ['native grandchild'], { encoding: 'utf8' }).trim() }));`;
  const command = ['node', filename, ...args].map(shellQuote).join(' ');
  const result = await nativeDriver(t, `
await call('write', { path: ${JSON.stringify(filename)}, content: ${JSON.stringify(script)} });
const result = await call('bash', { command: ${JSON.stringify(command)}, timeout: 10 });
assert.equal(result.details.exitCode, 0);
const line = result.content[0].text.split('\\n').find(line => line.startsWith('FLEET_NATIVE_RESULT:'));
assert.ok(line, result.content[0].text);
console.log(line.slice('FLEET_NATIVE_RESULT:'.length));
`);
  assert.ok(result.electron);
  assert.deepEqual(result.args, args);
  assert.equal(result.echo, 'native grandchild');
});

test('native isolated node test workers execute real assertions and subprocesses', native, async t => {
  const script = `import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
test('native worker runs the real calculation', () => {
  assert.ok(process.versions.electron);
  assert.equal(6 * 7, 42);
  assert.equal(execFileSync('/bin/echo', ['worker grandchild'], { encoding: 'utf8' }).trim(), 'worker grandchild');
});`;
  const result = await nativeDriver(t, `
await call('write', { path: 'native worker.test.mjs', content: ${JSON.stringify(script)} });
const result = await call('bash', { command: "node --test --test-reporter=tap 'native worker.test.mjs'", timeout: 10 });
console.log(JSON.stringify({ text: result.content[0].text, exitCode: result.details.exitCode }));
`);
  assert.equal(result.exitCode, 0);
  assert.match(result.text, /ok 1 - native worker runs the real calculation/);
  assert.match(result.text, /# tests 1\b/);
  assert.match(result.text, /# pass 1\b/);
  assert.match(result.text, /# fail 0\b/);
});

test('native isolated process execPath children retain async and sync grandchild support', native, async t => {
  const args = ['two words', "single'quote", 'double"quote', '', 'trailing\\'];
  const child = `const {execFileSync}=require('node:child_process');
console.log(JSON.stringify({args:process.argv.slice(1), echo:execFileSync('/bin/echo',['nested grandchild'],{encoding:'utf8'}).trim()}));`;
  const script = `import {spawn,execFileSync} from 'node:child_process';
const args = ['-e', ${JSON.stringify(child)}, '--', ...${JSON.stringify(args)}];
const sync = JSON.parse(execFileSync(process.execPath, args, {encoding:'utf8'}));
const async = await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,args); let stdout='',stderr='';
  child.stdout.on('data',chunk=>stdout+=chunk); child.stderr.on('data',chunk=>stderr+=chunk);
  child.on('error',reject); child.on('close',code=>code===0?resolve(JSON.parse(stdout)):reject(Error(stderr||'child exit '+code)));
});
console.log(JSON.stringify({sync,async}));`;
  const result = await nativeDriver(t, `
const script = path.join(workspace, 'nested.mjs'); await fs.writeFile(script, ${JSON.stringify(script)});
const result = await executeIsolatedProcess({ workspace, command:[process.execPath,script], timeoutMs:10_000 });
assert.equal(result.exitCode, 0, result.stderr);
console.log(JSON.stringify(JSON.parse(result.stdout)));
`);
  const expected = { args, echo: 'nested grandchild' };
  assert.deepEqual(result, { sync: expected, async: expected });
});

test('native isolated descendants retain filesystem environment and network restrictions', native, async t => {
  const probe = `import fs from 'node:fs/promises';
import path from 'node:path';
const launcher=path.join(process.env.PATH.split(path.delimiter)[0],'node');
const denied={};
for(const [name,action] of Object.entries({
  outsideRead:()=>fs.readFile(process.argv[2]),
  outsideWrite:()=>fs.writeFile(process.argv[2],'changed'),
  protectedWrite:()=>fs.writeFile('solution-contract.json','changed'),
  network:()=>fetch(process.argv[3],{signal:AbortSignal.timeout(1_000)}),
  launcherWrite:()=>fs.writeFile(launcher,'changed'),
  launcherChmod:()=>fs.chmod(launcher,0o700),
  launcherRename:()=>fs.rename(launcher,launcher+'.moved')
})) { try { await action(); denied[name]=false; } catch { denied[name]=true; } }
await fs.writeFile('allowed.txt','allowed');
console.log(JSON.stringify({denied,secret:process.env.FLEET_NATIVE_PARENT_SECRET,electron:!!process.versions.electron}));`;
  const launcher = `import {execFileSync} from 'node:child_process';
process.stdout.write(execFileSync(process.execPath,['probe.mjs',...process.argv.slice(2)],{encoding:'utf8'}));`;
  const result = await nativeDriver(t, `
const privateFile=path.join(root,'host-secret.txt'); await fs.writeFile(privateFile,'host secret');
await fs.writeFile(path.join(workspace,'solution-contract.json'),'{}');
await fs.writeFile(path.join(workspace,'probe.mjs'),${JSON.stringify(probe)});
const script=path.join(workspace,'launcher.mjs'); await fs.writeFile(script,${JSON.stringify(launcher)});
let requests=0; const server=createServer((_req,res)=>{requests++;res.end('host response');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
  const result=await executeIsolatedProcess({workspace,command:[process.execPath,script,privateFile,'http://127.0.0.1:'+server.address().port],writable:true,timeoutMs:10_000});
  assert.equal(result.exitCode,0,result.stderr);
  assert.equal(await fs.readFile(privateFile,'utf8'),'host secret');
  assert.equal(await fs.readFile(path.join(workspace,'solution-contract.json'),'utf8'),'{}');
  assert.equal(await fs.readFile(path.join(workspace,'allowed.txt'),'utf8'),'allowed');
  console.log(JSON.stringify({...JSON.parse(result.stdout),requests}));
} finally { await new Promise(resolve=>server.close(resolve)); }
`);
  assert.deepEqual(result, {
    denied: { outsideRead: true, outsideWrite: true, protectedWrite: true, network: true,
      launcherWrite: true, launcherChmod: true, launcherRename: true },
    electron: true, requests: 0,
  });
});

test('native isolated cancellation stops a running descendant before returning', native, async t => {
  const child = `const fs=require('node:fs');fs.appendFileSync('ticks.txt','x');console.log('DESCENDANT_READY');setInterval(()=>fs.appendFileSync('ticks.txt','x'),20);`;
  const script = `import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['-e',${JSON.stringify(child)}]);
child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
setInterval(()=>{},1000);`;
  const result = await nativeDriver(t, `
const script=path.join(workspace,'running.mjs'); await fs.writeFile(script,${JSON.stringify(script)});
const controller=new AbortController();let observed='';
await assert.rejects(executeIsolatedProcess({workspace,command:[process.execPath,script],writable:true,timeoutMs:10_000,signal:controller.signal,
  onStdout:chunk=>{observed+=chunk.toString();if(observed.includes('DESCENDANT_READY'))controller.abort();}
}),/cancelled|aborted/i);
assert.match(observed,/DESCENDANT_READY/);
const before=await fs.readFile(path.join(workspace,'ticks.txt'),'utf8');
await new Promise(resolve=>setTimeout(resolve,150));
const after=await fs.readFile(path.join(workspace,'ticks.txt'),'utf8');
console.log(JSON.stringify({before,after}));
`);
  assert.ok(result.before.length > 0, 'The descendant must run before cancellation');
  assert.equal(result.after, result.before, 'The descendant must stop writing before cancellation resolves');
});
