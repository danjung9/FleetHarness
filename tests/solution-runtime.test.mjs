import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { prepareSolutionRuntime } from '../dist-electron/electron/solution-runtime.js';

const readInput = `let text='';for await(const chunk of process.stdin)text+=chunk;const input=JSON.parse(text);`;
async function fixture(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-runtime-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) { await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true }); await fs.writeFile(path.join(root, name), content); }
  return root;
}
const cli = (files = ['engine.mjs']) => ({ profile: 'cli', files, requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } });
async function prepare(t, root, manifest = cli(), options) {
  const runtime = await prepareSolutionRuntime(root, manifest, process.execPath, undefined, options);
  t.after(() => runtime.close()); return runtime;
}

test('CLI runs fresh allowlisted files, excludes answer keys and ambient secrets, and cleans up', async t => {
  process.env.FLEET_TEST_AMBIENT_SECRET = 'not-for-the-app';
  t.after(() => delete process.env.FLEET_TEST_AMBIENT_SECRET);
  const root = await fixture(t, { 'engine.mjs': `import fs from 'node:fs';${readInput} console.log(JSON.stringify({answer:input.value*2,secret:process.env.FLEET_TEST_AMBIENT_SECRET??null,key:fs.existsSync('evaluation-plan.json')}));`, 'evaluation-plan.json': '{"answer":42}' });
  const runtime = await prepare(t, root);
  assert.notEqual(runtime.root, root);
  assert.deepEqual(await runtime.invoke({ value: 4 }), { answer: 8, secret: null, key: false });
  assert.deepEqual(await runtime.invoke({ value: 7 }), { answer: 14, secret: null, key: false });
  assert.match(runtime.provenance.filesHash, /^[a-f0-9]{64}$/);
  assert.match(runtime.provenance.runtime, /^v\d/);
  await runtime.close(); await assert.rejects(fs.access(runtime.root), /ENOENT/);
});

test('missing model configuration fails before a fallback engine can run', async t => {
  const root = await fixture(t, { 'engine.mjs': 'console.log(JSON.stringify("fabricated-model-answer"));' });
  const manifest = { ...cli(), requiredEnv: ['FLEET_TEST_MISSING_MODEL_KEY'] };
  delete process.env.FLEET_TEST_MISSING_MODEL_KEY;
  await assert.rejects(prepareSolutionRuntime(root, manifest, process.execPath), /Missing required runtime environment.*No model or service fallback/);
});

test('static browser delivery cannot rely on an environment-only model or Python evaluator', async t => {
  const root = await fixture(t, { 'index.html': '<h1>App</h1>', 'engine.mjs': 'console.log(1)' });
  const manifest = { profile: 'browser', entrypoint: 'index.html', files: ['index.html', 'engine.mjs'], requiredEnv: [], evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
  await assert.rejects(prepareSolutionRuntime(root, { ...manifest, requiredEnv: ['MODEL_KEY'] }, process.execPath), /Static browser packages.*service profile/);
  await assert.rejects(prepareSolutionRuntime(root, { ...manifest, evaluator: { ...manifest.evaluator, runtime: 'python' } }, process.execPath), /Static browser packages.*service profile/);
});

test('copy rejects symlink files, symlink directories, traversal and host evaluation artifacts', async t => {
  const root = await fixture(t, { 'real/engine.mjs': 'console.log(1)' });
  await fs.symlink(path.join(root, 'real/engine.mjs'), path.join(root, 'engine.mjs'));
  await assert.rejects(prepareSolutionRuntime(root, cli(), process.execPath), /symlink/);
  await fs.symlink(path.join(root, 'real'), path.join(root, 'linked'));
  for (const file of ['linked/engine.mjs', '../engine.mjs', 'evaluation-plan.json', '.fleet/packet.json', '.browser-observations/capture.png', 'inputs/manifest.json']) {
    await assert.rejects(prepareSolutionRuntime(root, { ...cli([file]), command: { runtime: 'node', entrypoint: file, args: [] } }, process.execPath), /symlink|Invalid runtime file/);
  }
});

test('a package cannot resolve a dependency from the development workspace', async t => {
  const root = await fixture(t, { 'engine.mjs': `import {createRequire} from 'node:module';const require=createRequire(import.meta.url);try {require('fleet-ambient-fixture');console.log('true')}catch{console.log('false')}`, 'node_modules/fleet-ambient-fixture/index.js': 'module.exports=42;' });
  const runtime = await prepare(t, root);
  assert.equal(await runtime.invoke(null), false);
});

test('locked npm installation is reproduced in the disposable package', { timeout: 15000 }, async t => {
  const root = await fixture(t, { 'engine.mjs': `${readInput}console.log(JSON.stringify(input));`, 'package.json': JSON.stringify({ name: 'fixture', version: '1.0.0' }), 'package-lock.json': JSON.stringify({ name: 'fixture', version: '1.0.0', lockfileVersion: 3, requires: true, packages: { '': { name: 'fixture', version: '1.0.0' } } }) });
  const manifest = { ...cli(['engine.mjs', 'package.json', 'package-lock.json']), dependencies: { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' } };
  const runtime = await prepare(t, root, manifest, { installTimeoutMs: 10000 });
  assert.deepEqual(await runtime.invoke({ installed: true }), { installed: true });
});

test('npm requires pinned registry archives and well-formed integrity before any package fetch', { timeout: 15000 }, async t => {
  let requests = 0;
  const registry = createServer((_request, response) => { requests++; response.writeHead(404).end(); });
  await new Promise(resolve => registry.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => registry.close(resolve)));
  const url = `http://127.0.0.1:${registry.address().port}/fixture.tgz`;
  const pinned = { version: '1.0.0', resolved: url, integrity: 'sha512-' + Buffer.alloc(64).toString('base64') };
  const packageJson = { name: 'fixture-app', version: '1.0.0', dependencies: { fixture: '1.0.0' } };
  const root = await fixture(t, { 'engine.mjs': 'console.log(1)', 'package.json': JSON.stringify(packageJson) });
  const manifest = { ...cli(['engine.mjs', 'package.json', 'package-lock.json']), dependencies: { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' } };
  const mutations = [
    entry => { delete entry.integrity; },
    entry => { entry.integrity = 'sha512-short'; },
    entry => { entry.integrity = 'sha512-' + 'A'.repeat(88); },
    entry => { entry.integrity = 'md5-' + Buffer.alloc(16).toString('base64'); },
    entry => { delete entry.version; },
    entry => { entry.version = '^1.0.0'; },
    entry => { entry.version = 'latest'; },
    entry => { entry.resolved = 'git+https://example.invalid/fixture.git#main'; },
    entry => { entry.resolved = 'https://example.invalid/fixture.git'; },
    entry => { entry.resolved = 'file:../fixture.tgz'; },
    entry => { entry.resolved = 'https://example.invalid/fixture'; },
    entry => { entry.resolved = 'https://user:password@example.invalid/fixture.tgz'; },
    entry => { entry.resolved = url + '#main'; },
    entry => { entry.link = true; }
  ];
  for (const mutate of mutations) {
    const entry = structuredClone(pinned); mutate(entry);
    await fs.writeFile(path.join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: { '': packageJson, 'node_modules/fixture': entry } }));
    await assert.rejects(prepareSolutionRuntime(root, manifest, process.execPath), /Every external package must pin/);
  }
  await fs.writeFile(path.join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 2, packages: { '': packageJson, 'node_modules/fixture': pinned }, dependencies: { fixture: { ...pinned, resolved: 'git+https://example.invalid/fixture.git' } } }));
  await assert.rejects(prepareSolutionRuntime(root, manifest, process.execPath), /Every external package must pin/);
  assert.equal(requests, 0, 'Invalid lock metadata is rejected before npm can fetch an archive.');
});

test('v2 and v3 npm locks install an integrity-pinned loopback archive in fresh packages', { timeout: 30000 }, async t => {
  const tarEntry = (name, text) => {
    const bytes = Buffer.from(text), header = Buffer.alloc(512);
    header.write(name); header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
    header.write(bytes.length.toString(8).padStart(11, '0') + '\0', 124); header.write('00000000000\0', 136);
    header.fill(32, 148, 156); header.write('0', 156); header.write('ustar\0', 257); header.write('00', 263);
    header.write(header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\0 ', 148);
    return Buffer.concat([header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512)]);
  };
  const tarball = gzipSync(Buffer.concat([
    tarEntry('package/package.json', JSON.stringify({ name: 'fixture-pinned', version: '1.0.0', main: 'index.cjs' })),
    tarEntry('package/index.cjs', 'exports.double = value => value * 2;'), Buffer.alloc(1024)
  ]));
  let requests = 0;
  const registry = createServer((request, response) => {
    requests++;
    if (request.url === '/fixture-pinned-1.0.0.tgz') response.writeHead(200, { 'Content-Type': 'application/octet-stream' }).end(tarball);
    else response.writeHead(404).end();
  });
  await new Promise(resolve => registry.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => registry.close(resolve)));
  const entry = { version: '1.0.0', resolved: `http://127.0.0.1:${registry.address().port}/fixture-pinned-1.0.0.tgz`, integrity: 'sha512-' + createHash('sha512').update(tarball).digest('base64') };
  for (const lockfileVersion of [2, 3]) {
    const packageJson = { name: 'fixture-app', version: '1.0.0', dependencies: { 'fixture-pinned': '1.0.0' } };
    const lock = { name: packageJson.name, version: packageJson.version, lockfileVersion, requires: true,
      packages: { '': packageJson, 'node_modules/fixture-pinned': entry }, ...(lockfileVersion === 2 ? { dependencies: { 'fixture-pinned': entry } } : {}) };
    const root = await fixture(t, { 'engine.mjs': `import {double} from 'fixture-pinned';${readInput}console.log(double(input));`, 'package.json': JSON.stringify(packageJson), 'package-lock.json': JSON.stringify(lock) });
    const manifest = { ...cli(['engine.mjs', 'package.json', 'package-lock.json']), dependencies: { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' } };
    const runtime = await prepare(t, root, manifest, { installTimeoutMs: 10000 });
    assert.equal(await runtime.invoke(7), 14, 'Installed dependency actually runs with lockfile version ' + lockfileVersion);
    await runtime.close();
  }
  assert.equal(requests, 2, 'Each clean package independently fetches the integrity-pinned archive.');
});

test('Python command uses packaged local modules with isolated interpreter paths', { timeout: 10000 }, async t => {
  const root = await fixture(t, { 'engine.py': 'import json,sys\nfrom core import calculate\nprint(json.dumps(calculate(json.load(sys.stdin))))\n', 'core.py': 'def calculate(value):\n    return value["n"] * 3\n' });
  const runtime = await prepare(t, root, { profile: 'cli', files: ['engine.py', 'core.py'], requiredEnv: [], command: { runtime: 'python', entrypoint: 'engine.py', args: [] } });
  assert.equal(await runtime.invoke({ n: 5 }), 15);
  await assert.rejects(fs.access(path.join(runtime.root, '__pycache__')), /ENOENT/);
});

test('pip installs into a fresh virtual environment and exposes it only to host-run tests', { timeout: 20000 }, async t => {
  const root = await fixture(t, { 'engine.py': 'import json,sys\nprint(json.dumps(json.load(sys.stdin)))\n', 'requirements.in': '# No third-party dependencies\n', 'requirements.lock': '# An empty hashed lock\n' });
  const runtime = await prepare(t, root, { profile: 'cli', files: ['engine.py', 'requirements.in', 'requirements.lock'], requiredEnv: [], command: { runtime: 'python', entrypoint: 'engine.py', args: [] }, dependencies: { manager: 'pip', manifest: 'requirements.in', lockfile: 'requirements.lock' } });
  assert.deepEqual(await runtime.invoke({ clean: true }), { clean: true });
  assert.ok(runtime.testEnvironment.VIRTUAL_ENV);
  assert.ok(runtime.testEnvironment.PATH.startsWith(path.join(runtime.testEnvironment.VIRTUAL_ENV, 'bin')));
});

test('dependency installation rejects ambient local links and unpinned pip lock files', async t => {
  const npmRoot = await fixture(t, { 'engine.mjs': 'console.log(1)', 'package.json': '{}', 'package-lock.json': JSON.stringify({ lockfileVersion: 3, packages: { 'node_modules/x': { link: true, resolved: '../outside' } } }) });
  await assert.rejects(prepareSolutionRuntime(npmRoot, { ...cli(['engine.mjs', 'package.json', 'package-lock.json']), dependencies: { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' } }, process.execPath), /external local links/);
  const pipRoot = await fixture(t, { 'engine.py': 'print(1)', 'requirements.in': 'example', 'requirements.lock': '-r /outside/requirements.txt' });
  await assert.rejects(prepareSolutionRuntime(pipRoot, { profile: 'cli', files: ['engine.py', 'requirements.in', 'requirements.lock'], requiredEnv: [], command: { runtime: 'python', entrypoint: 'engine.py', args: [] }, dependencies: { manager: 'pip', manifest: 'requirements.in', lockfile: 'requirements.lock' } }, process.execPath), /pinned name==version/);
});

test('browser profile previews the clean package and invokes its shared module', async t => {
  const root = await fixture(t, { 'index.html': '<script type="module" src="core.mjs"></script><h1>Ready</h1>', 'core.mjs': 'export const calculate = n => n * 4;', 'engine.mjs': `import {calculate} from './core.mjs';${readInput}console.log(calculate(input));`, 'private.txt': 'not packaged' });
  const manifest = { profile: 'browser', entrypoint: 'index.html', files: ['index.html', 'core.mjs', 'engine.mjs'], requiredEnv: [], evaluator: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
  const runtime = await prepare(t, root, manifest);
  assert.match(await (await fetch(runtime.url)).text(), /Ready/);
  assert.equal((await fetch(new URL('core.mjs', runtime.url))).status, 200);
  assert.equal((await fetch(new URL('private.txt', runtime.url))).status, 404);
  assert.equal(await runtime.invoke(6), 24);
});

test('service gets a loopback port, must become healthy, and responds through its real HTTP endpoint', async t => {
  const root = await fixture(t, { 'engine.mjs': `import {createServer} from 'node:http';createServer(async(req,res)=>{if(req.url==='/health'){res.end('ready');return;}let body='';for await(const c of req)body+=c;res.setHeader('content-type','application/json');res.end(JSON.stringify({answer:JSON.parse(body).n+1}));}).listen(Number(process.env.PORT),process.env.HOST);` });
  const manifest = { ...cli(), profile: 'service', healthPath: '/health', invokePath: '/invoke' };
  const runtime = await prepare(t, root, manifest);
  assert.match(runtime.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
  assert.deepEqual(await runtime.invoke({ n: 9 }), { answer: 10 });
  const url = runtime.url; await runtime.close(); await assert.rejects(fetch(url));
});

test('hung health responses have a bounded startup deadline', { timeout: 5000 }, async t => {
  const root = await fixture(t, { 'engine.mjs': `import {createServer} from 'node:http';createServer(()=>{}).listen(Number(process.env.PORT),process.env.HOST);` });
  const started = Date.now();
  await assert.rejects(prepareSolutionRuntime(root, { ...cli(), profile: 'service', healthPath: '/health', invokePath: '/invoke' }, process.execPath, undefined, { startupTimeoutMs: 200, invocationTimeoutMs: 4000 }), /startup deadline/);
  assert.ok(Date.now() - started < 2000);
});

test('output overflow, malformed JSON and hung invocations fail explicitly', { timeout: 10000 }, async t => {
  for (const [script, error] of [['console.log("x".repeat(10000));', /output limit/], ['console.log("not-json");', /exactly one JSON/], ['console.log("1e400");', /nonfinite/], ['console.log("[".repeat(70)+"0"+"]".repeat(70));', /structural limits/], ['setInterval(()=>{},1000);', /execution limit/]]) {
    const root = await fixture(t, { 'engine.mjs': script });
    // Normal Node startup can exceed 150 ms under full-suite load. Keep that
    // deliberately short deadline only for the hanging-process case.
    const runtime = await prepare(t, root, cli(), { maxOutputBytes: 1000, invocationTimeoutMs: script.startsWith('setInterval') ? 150 : 1000 });
    await assert.rejects(runtime.invoke(null), error);
  }
});

test('cancellation kills an in-flight runtime process', { timeout: 5000 }, async t => {
  const root = await fixture(t, { 'engine.mjs': 'setInterval(()=>{},1000);' });
  const controller = new AbortController();
  const runtime = await prepareSolutionRuntime(root, cli(), process.execPath, controller.signal);
  t.after(() => runtime.close());
  const running = runtime.invoke(null); controller.abort();
  await assert.rejects(running, /stopped/);
  await runtime.close(); await assert.rejects(fs.access(runtime.root), /ENOENT/);
});

test('invocation timeout also kills descendant processes in its process group', { timeout: 5000 }, async t => {
  const root = await fixture(t, {}), marker = path.join(root, 'escaped-child.txt');
  const child = `setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'should not survive'),500);`;
  await fs.writeFile(path.join(root, 'engine.mjs'), `import {spawn} from 'node:child_process';spawn(process.execPath,['-e',${JSON.stringify(child)}],{stdio:'ignore'});setInterval(()=>{},1000);`);
  const runtime = await prepare(t, root, cli(), { invocationTimeoutMs: 150 });
  await assert.rejects(runtime.invoke(null), /execution limit/);
  await new Promise(resolve => setTimeout(resolve, 600));
  await assert.rejects(fs.access(marker), /ENOENT/);
});

test('JSON output preserves Unicode code points split across process writes', async t => {
  const root = await fixture(t, { 'engine.mjs': `const bytes=Buffer.from(JSON.stringify({name:'🚢'}));process.stdout.write(bytes.subarray(0,11));setTimeout(()=>process.stdout.write(bytes.subarray(11)),20);` });
  const runtime = await prepare(t, root);
  assert.deepEqual(await runtime.invoke(null), { name: '🚢' });
});

test('self-modifying engines cannot bind passing output to a different delivery source', async t => {
  const root = await fixture(t, { 'engine.mjs': `import fs from 'node:fs';fs.appendFileSync('engine.mjs',';/* changed */');console.log(42);` });
  const runtime = await prepare(t, root);
  await assert.rejects(runtime.invoke(null), /runtime files changed/);
});
