import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import { exportVerifiedBundle } from '../dist-electron/electron/source-export.js';
import { sourceHash } from '../dist-electron/electron/storage.js';

async function fixture(t, profile = 'service', language = 'node') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-container-export-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace'), parent = path.join(root, 'exports');
  await fs.mkdir(path.join(workspace, '.fleet'), { recursive: true }); await fs.mkdir(parent);
  const entrypoint = language === 'node' ? 'server.mjs' : 'server.py';
  const command = { runtime: language, entrypoint, args: [] };
  const contract = { schemaVersion: 1, objective: 'Synthetic delivery fixture',
    capabilities: [{ id: 'echo', kind: 'workflow', description: 'Echo synthetic inputs', criterionIds: ['R1'], required: true, evaluationIds: ['echo-cases'] }],
    runtime: { profile, files: [entrypoint, 'index.html'], requiredEnv: [],
      ...(profile === 'browser' ? { entrypoint: 'index.html', evaluator: command } : { command }),
      ...(profile === 'service' ? { healthPath: '/health', invokePath: '/invoke', port: 3210 } : {}) } };
  await fs.writeFile(path.join(workspace, '.fleet', 'packet.json'), JSON.stringify({ acceptance: [{ id: 'R1', requirement: 'Echo synthetic inputs', method: 'automated', scenario: 'Echo' }] }));
  await fs.writeFile(path.join(workspace, entrypoint), language === 'node' ? 'console.log(JSON.stringify(process.argv.slice(2)));' : 'print("synthetic")');
  await fs.writeFile(path.join(workspace, 'index.html'), '<h1>Synthetic browser service</h1>');
  const input = { workspace, parent, title: 'Synthetic service', evidence: { report: '{"synthetic":true}', review: '{"synthetic":true}' }, deliveryMarkdown: 'Synthetic delivery.' };
  const refresh = async () => {
    await fs.writeFile(path.join(workspace, 'solution-contract.json'), JSON.stringify(contract));
    input.verifiedHash = await sourceHash(workspace);
  };
  await refresh();
  return { root, input, contract, refresh };
}

test('service bundle has host container files, declared command and port, and the verified hash', async t => {
  const { input, contract, refresh } = await fixture(t);
  contract.runtime.requiredEnv = ['SYNTHETIC_MODE'];
  const previous = process.env.SYNTHETIC_MODE;
  process.env.SYNTHETIC_MODE = 'synthetic-value-must-not-be-exported';
  t.after(() => { if (previous === undefined) delete process.env.SYNTHETIC_MODE; else process.env.SYNTHETIC_MODE = previous; });
  // Agent-written delivery files must never displace the host's instructions.
  await fs.writeFile(path.join(input.workspace, 'Dockerfile'), 'FROM unverified:latest');
  await fs.writeFile(path.join(input.workspace, 'compose.yaml'), 'unverified: true');
  await refresh();
  const bundle = await exportVerifiedBundle(input);
  assert.equal(await sourceHash(bundle), input.verifiedHash);
  assert.equal(await sourceHash(input.workspace), input.verifiedHash);
  const dockerfile = await fs.readFile(path.join(bundle, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /^FROM node:22\.19\.0-bookworm-slim\n/);
  assert.ok(dockerfile.includes('CMD ["node","./server.mjs"]\n'));
  assert.ok(dockerfile.includes('ENV PORT=3210\nEXPOSE 3210\n'));
  assert.doesNotMatch(dockerfile, /COPY \.|packet\.json|test-report|unverified|synthetic-value/);
  const composeText = await fs.readFile(path.join(bundle, 'compose.yaml'), 'utf8');
  const compose = parse(composeText);
  assert.deepEqual(compose.services.app, { build: '.', ports: ['127.0.0.1:3210:3210'], environment: ['HOST=0.0.0.0', 'PORT=3210', 'SYNTHETIC_MODE'] });
  assert.doesNotMatch(composeText, /synthetic-value/);
  const delivery = await fs.readFile(path.join(bundle, 'DELIVERY.md'), 'utf8');
  assert.equal(delivery.trim().split('\n').length, 4);
  assert.match(delivery, /docker compose up --build/);
  assert.match(delivery, /http:\/\/127\.0\.0\.1:3210\/.*docker compose down/);
  await fs.appendFile(path.join(bundle, 'server.mjs'), '\n// changed');
  assert.notEqual(await sourceHash(bundle), input.verifiedHash);
});

test('legacy service contract without a port exports port 8080', async t => {
  const { input, contract, refresh } = await fixture(t);
  delete contract.runtime.port; await refresh();
  const bundle = await exportVerifiedBundle(input);
  assert.deepEqual(parse(await fs.readFile(path.join(bundle, 'compose.yaml'), 'utf8')).services.app.ports, ['127.0.0.1:8080:8080']);
  assert.equal(await sourceHash(bundle), input.verifiedHash);
});

for (const profile of ['browser', 'cli']) test(`${profile} exports contain no container files`, async t => {
  const { input, refresh } = await fixture(t, profile);
  await fs.writeFile(path.join(input.workspace, 'Dockerfile'), 'FROM unwanted:latest');
  await fs.writeFile(path.join(input.workspace, 'compose.yaml'), 'unwanted: true'); await refresh();
  const bundle = await exportVerifiedBundle(input);
  for (const name of ['Dockerfile', 'compose.yaml']) await assert.rejects(fs.access(path.join(bundle, name)), { code: 'ENOENT' });
  assert.equal(await fs.readFile(path.join(bundle, 'DELIVERY.md'), 'utf8'), input.deliveryMarkdown);
  assert.equal(await sourceHash(bundle), input.verifiedHash);
});

test('quoted arguments remain literal executable arguments in an exported bundle', async t => {
  const { input, contract, refresh } = await fixture(t);
  contract.runtime.command.args = ['a"b\\c', '$(touch should-not-exist); $HOME', '`echo nope`', '${CONFIG:-value}', '', '# comment'];
  await refresh();
  const bundle = await exportVerifiedBundle(input);
  const dockerfile = await fs.readFile(path.join(bundle, 'Dockerfile'), 'utf8');
  const cmd = JSON.parse(dockerfile.split('\n').find(line => line.startsWith('CMD ')).slice(4));
  assert.deepEqual(cmd, ['node', './server.mjs', ...contract.runtime.command.args]);
  const { stdout } = await promisify(execFile)(process.execPath, cmd.slice(1), { cwd: bundle });
  assert.deepEqual(JSON.parse(stdout), contract.runtime.command.args);
  await assert.rejects(fs.access(path.join(bundle, 'should-not-exist')), { code: 'ENOENT' });
});

for (const language of ['node', 'python']) test(`${language} dependency instructions use the declared lockfile without installing on export`, async t => {
  const { input, contract, refresh } = await fixture(t, 'service', language);
  const dependency = language === 'node' ? { manager: 'npm', manifest: 'package.json', lockfile: 'package-lock.json' }
    : { manager: 'pip', manifest: 'deps/requirements.in', lockfile: 'deps/requirements.txt' };
  contract.runtime.dependencies = dependency;
  for (const file of [dependency.manifest, dependency.lockfile]) {
    contract.runtime.files.push(file);
    await fs.mkdir(path.dirname(path.join(input.workspace, file)), { recursive: true });
    await fs.writeFile(path.join(input.workspace, file), language === 'node' ? '{}' : '# synthetic empty requirements');
  }
  await refresh();
  const bundle = await exportVerifiedBundle(input);
  const dockerfile = await fs.readFile(path.join(bundle, 'Dockerfile'), 'utf8');
  const run = JSON.parse(dockerfile.split('\n').find(line => line.startsWith('RUN ')).slice(4));
  if (language === 'node') assert.deepEqual(run, ['npm', 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund']);
  else {
    assert.match(dockerfile, /^FROM python:3\.12\.9-slim-bookworm\n/);
    assert.deepEqual(run, ['python3', '-m', 'pip', '--isolated', '--disable-pip-version-check', 'install', '--require-hashes', '--only-binary=:all:', '-r', './deps/requirements.txt']);
  }
  await assert.rejects(fs.access(path.join(bundle, 'node_modules')), { code: 'ENOENT' });
  assert.equal(await sourceHash(bundle), input.verifiedHash);
});

test('invalid ports, command line breaks and host-file collisions cannot be exported', async t => {
  for (const port of [0, 65536, 1.5, '8080\nRUN bad']) {
    const { input, contract, refresh } = await fixture(t);
    contract.runtime.port = port; await refresh();
    await assert.rejects(exportVerifiedBundle(input), /runtime.port must be an integer/);
    assert.deepEqual(await fs.readdir(input.parent), []);
  }
  const { input, contract, refresh } = await fixture(t);
  contract.runtime.command.args = ['hello\nRUN bad']; await refresh();
  await assert.rejects(exportVerifiedBundle(input), /control line breaks/);
  contract.runtime.command.args = []; contract.runtime.files.push('Dockerfile'); await refresh();
  await assert.rejects(exportVerifiedBundle(input), /host-owned container export/);
});

test('service exports reject changed source and changed copied bytes', async t => {
  const { input } = await fixture(t);
  await assert.rejects(exportVerifiedBundle(input, undefined, async (source, destination) => {
    await fs.copyFile(source, destination);
    if (path.basename(source) === 'server.mjs') await fs.appendFile(destination, '\n// altered');
  }), /copied bundle does not match/);
  assert.deepEqual(await fs.readdir(input.parent), []);
  await fs.appendFile(path.join(input.workspace, 'server.mjs'), '\n// changed');
  await assert.rejects(exportVerifiedBundle(input), /changed after verification/);
  assert.deepEqual(await fs.readdir(input.parent), []);
});

test('the exported Node service template starts on the container bind address and serves its browser and API', async t => {
  const { input, contract, refresh } = await fixture(t);
  const template = new URL('../templates/node-service/', import.meta.url);
  contract.runtime.files = ['server.mjs', 'compute.mjs', 'public/index.html', 'public/app.js', 'public/styles.css', 'package.json'];
  for (const file of contract.runtime.files) {
    await fs.mkdir(path.dirname(path.join(input.workspace, file)), { recursive: true });
    await fs.copyFile(new URL(file, template), path.join(input.workspace, file));
  }
  await fs.writeFile(path.join(input.workspace, 'compute.mjs'), 'export async function compute(input) { return input; }');
  await refresh();
  const bundle = await exportVerifiedBundle(input);
  const { start } = await import(pathToFileURL(path.join(bundle, 'server.mjs')).href);
  const application = await start({ host: '0.0.0.0', port: 0 });
  t.after(() => application.close());
  const url = 'http://127.0.0.1:' + application.server.address().port;
  assert.equal((await fetch(url + '/')).status, 200);
  assert.deepEqual(await (await fetch(url + '/health')).json(), { status: 'ok' });
  const response = await fetch(url + '/api/invoke', { method: 'POST', headers: { 'content-type': 'application/json', origin: url }, body: '{"synthetic":true}' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { synthetic: true });
  assert.equal(await sourceHash(bundle), input.verifiedHash);
});
