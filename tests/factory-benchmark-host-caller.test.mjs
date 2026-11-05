import test from 'node:test';
import assert from 'node:assert/strict';
import fsSync, { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { benchmarkLiveFactory, factoryBenchmarkScenarios } from '../scripts/benchmark-factory.mjs';
import { FleetBackend } from '../dist-electron/electron/pi-backend.js';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const privateFailure = 'fixture-host-secret-MUST-NOT-APPEAR';
const readReport = async directory => JSON.parse(await fs.readFile(path.join(directory, 'benchmark-report.json'), 'utf8'));

async function readHost(report) {
  if (!report?.benchmarkHost?.path) return null;
  const bytes = await fs.readFile(report.benchmarkHost.path);
  return { bytes, manifest: JSON.parse(bytes) };
}

async function lifecycle(t, { init, start, stopAll, run = benchmarkLiveFactory } = {}) {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-benchmark-host-caller-'));
  t.after(() => fs.rm(output, { recursive: true, force: true }));
  const initialized = [], starts = [], cleanup = [], callbackFailures = [];
  const observe = async (callback, context) => {
    try { await callback?.(context); }
    catch (error) { callbackFailures.push(error); throw error; }
  };
  // Every model entry point is replaced; Store, manifest persistence and the
  // real benchmark loop remain active. A failed fixture callback cannot hide
  // behind the benchmark's deliberately generic execution-error handling.
  t.mock.method(FleetBackend.prototype, 'models', () => [{ backend: 'pi', provider: 'fixture', id: 'no-model', configured: true }]);
  t.mock.method(FleetBackend.prototype, 'init', async function () {
    const report = await readReport(this.store.root), context = { backend: this, report, host: await readHost(report) };
    initialized.push(context);
    await observe(init, context);
  });
  t.mock.method(FleetBackend.prototype, 'start', async function (id) {
    const report = await readReport(this.store.root), project = this.store.project(id);
    project.status = 'failed';
    const context = { backend: this, project, report, host: await readHost(report), index: starts.length };
    starts.push(context);
    await observe(start, context);
  });
  t.mock.method(FleetBackend.prototype, 'stop', async () => {});
  t.mock.method(FleetBackend.prototype, 'stopAll', async function () {
    const report = await readReport(this.store.root), context = { backend: this, report };
    cleanup.push(context);
    await observe(stopAll, context);
  });
  return { output, initialized, starts, cleanup,
    run: async (options = {}) => {
      try { return await run({ provider: 'fixture', model: 'no-model', output, ...options }); }
      finally { assert.equal(callbackFailures.length, 0, callbackFailures.map(error => error.stack).join('\n')); }
    },
    finalReport: async () => {
      const directories = (await fs.readdir(output)).filter(name => name.startsWith('fleet-live-benchmark-'));
      assert.equal(directories.length, 1);
      return readReport(path.join(output, directories[0]));
    }
  };
}

function assertHostIdentity(report, host) {
  assert.ok(report.benchmarkHost, 'Each progress report must identify the observed host artifacts.');
  assert.equal(path.isAbsolute(report.benchmarkHost.path), true);
  assert.equal(path.dirname(report.benchmarkHost.path), report.output);
  assert.equal(path.basename(report.benchmarkHost.path), 'benchmark-host.json');
  assert.ok(host, 'Host evidence must exist before a report refers to it.');
  assert.equal(report.benchmarkHost.sha256, sha256(host.bytes));
  assert.equal(host.manifest.schemaVersion, 1);
  assert.equal(host.manifest.runtime.node, process.version);
  assert.deepEqual(host.manifest.runtime.versions, { ...process.versions });
  assert.equal(host.manifest.runtime.platform, process.platform);
  assert.equal(host.manifest.runtime.arch, process.arch);
  assert.ok(Array.isArray(host.manifest.artifacts));
  const names = host.manifest.artifacts.map(artifact => artifact.path);
  assert.equal(new Set(names).size, names.length);
  for (const expected of ['dist-electron/electron/solution-evaluation.js', 'dist-electron/electron/pi-backend.js',
    'dist-electron/electron/browser-verification.js', 'skills/fleet-evidence/SKILL.md',
    'templates/node-service/compute.mjs', 'scripts/benchmark-factory.mjs', 'scripts/factory-browser-holdout.mjs',
    'scripts/factory-benchmark-inputs.mjs', 'scripts/factory-benchmark-host.mjs',
    'package.json', 'package-lock.json', 'node_modules/.package-lock.json']) {
    assert.ok(names.includes(expected), `Observed host evidence must include ${expected}.`);
  }
  for (const artifact of host.manifest.artifacts) {
    assert.equal(path.isAbsolute(artifact.path), false);
    assert.equal(artifact.path.split('/').includes('..'), false);
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(artifact.bytes) && artifact.bytes >= 0);
    assert.ok(Object.hasOwn(artifact, 'mode'));
  }
  assert.equal(host.bytes.includes(Buffer.from(repository)), false, 'Portable host identity must not contain an absolute checkout root.');
  assert.equal(host.bytes.includes(Buffer.from(privateFailure)), false);
}

// Overlay reads only: concurrent chats' source, build output, dependency locks
// and skills are never written, renamed, deleted or restored by these tests.
function overlayArtifact(t, relativePath, { missing = false } = {}) {
  const readFileSync = fsSync.readFileSync.bind(fsSync);
  let enabled = false, hits = 0;
  t.mock.method(fsSync, 'readFileSync', (file, ...args) => {
    const name = file instanceof URL ? fileURLToPath(file) : typeof file === 'string' ? file : '';
    if (enabled && name.replaceAll(path.sep, '/').endsWith('/' + relativePath)) {
      hits++;
      if (missing) throw Object.assign(new Error(privateFailure), { code: 'ENOENT' });
      const original = readFileSync(file, ...args);
      // Whitespace is a valid but distinct artifact for JS, Markdown and JSON.
      return typeof original === 'string' ? original + '\n' : Buffer.concat([original, Buffer.from('\n')]);
    }
    return readFileSync(file, ...args);
  });
  return { enable: () => { enabled = true; }, hits: () => hits };
}

test('live benchmark saves stable host artifact identity before initialization and every repeated generation', async t => {
  const prior = process.env.FLEET_BENCHMARK_HOST_TEST_SECRET;
  process.env.FLEET_BENCHMARK_HOST_TEST_SECRET = privateFailure;
  t.after(() => {
    if (prior === undefined) delete process.env.FLEET_BENCHMARK_HOST_TEST_SECRET;
    else process.env.FLEET_BENCHMARK_HOST_TEST_SECRET = prior;
  });
  const harness = await lifecycle(t), result = await harness.run({ runs: 2 });
  assert.equal(result.status, 'completed');
  assert.equal(harness.starts.length, factoryBenchmarkScenarios.length * 2);
  const initial = harness.initialized[0];
  assert.equal(initial.report.generations, 0);
  assert.equal(initial.report.status, 'running');
  assertHostIdentity(initial.report, initial.host);
  const saved = await readHost(result);
  assertHostIdentity(result, saved);
  assert.deepEqual(saved.bytes, initial.host.bytes);
  for (const started of harness.starts) {
    assertHostIdentity(started.report, started.host);
    assert.deepEqual(started.host.bytes, saved.bytes);
    assert.deepEqual(started.report.benchmarkHost, result.benchmarkHost);
  }
  assert.deepEqual(await readReport(result.output), result);
});

test('host artifact drift present at invocation prevents backend initialization', async t => {
  const overlay = overlayArtifact(t, 'dist-electron/electron/solution-evaluation.js');
  const harness = await lifecycle(t);
  overlay.enable();
  await assert.rejects(harness.run(), /Live benchmark did not complete/);
  assert.ok(overlay.hits() > 0, 'The changed compiled grader must actually be read.');
  assert.equal(harness.initialized.length, 0);
  assert.equal(harness.starts.length, 0);
  const result = await harness.finalReport();
  assert.equal(result.status, 'failed');
  assert.equal(result.generations, 0);
  assertHostIdentity(result, await readHost(result));
});

test('artifact drift during backend initialization prevents the first generation', async t => {
  const overlay = overlayArtifact(t, 'skills/fleet-evidence/SKILL.md');
  const harness = await lifecycle(t, { init: () => overlay.enable() });
  await assert.rejects(harness.run(), /Live benchmark did not complete/);
  assert.ok(overlay.hits() > 0);
  assert.equal(harness.initialized.length, 1);
  assert.equal(harness.starts.length, 0);
  const result = await harness.finalReport();
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.benchmarkHost, harness.initialized[0].report.benchmarkHost);
});

test('grader, skill, template and dependency drift cannot continue to another generation', async t => {
  for (const artifact of ['dist-electron/electron/solution-evaluation.js', 'skills/fleet-evidence/SKILL.md',
    'templates/node-service/compute.mjs', 'package-lock.json', 'node_modules/.package-lock.json']) {
    await t.test(artifact, async t => {
      const overlay = overlayArtifact(t, artifact);
      const harness = await lifecycle(t, { start: () => overlay.enable() });
      await assert.rejects(harness.run(), /Live benchmark did not complete/);
      assert.ok(overlay.hits() > 0, `The changed ${artifact} must actually be read.`);
      assert.equal(harness.starts.length, 1, 'Changed observed host bytes must stop the next model entry point.');
      const result = await harness.finalReport();
      assert.equal(result.status, 'failed');
      assert.equal(result.generations, 0, 'An execution with changed host artifacts must remain ungraded.');
      assert.equal(result.activeGeneration.projectId, harness.starts[0].project.id);
      assert.deepEqual(result.benchmarkHost, harness.initialized[0].report.benchmarkHost,
        'Failure must preserve the original identity instead of blessing changed host bytes.');
      const saved = await readHost(result);
      assertHostIdentity(result, saved);
      const captured = saved.manifest.artifacts.find(entry => entry.path === artifact);
      const changed = fsSync.readFileSync(path.join(repository, artifact));
      assert.notEqual(captured.sha256, sha256(changed));
    });
  }
});

test('host drift during cleanup cannot produce a completed benchmark', async t => {
  const overlay = overlayArtifact(t, 'templates/node-service/compute.mjs');
  const harness = await lifecycle(t, { stopAll: () => overlay.enable() });
  await assert.rejects(harness.run(), /Live benchmark did not complete/);
  assert.ok(overlay.hits() > 0);
  assert.equal(harness.starts.length, factoryBenchmarkScenarios.length);
  const result = await harness.finalReport();
  assert.equal(result.status, 'failed');
  assert.equal(result.generations, factoryBenchmarkScenarios.length);
  assert.deepEqual(result.benchmarkHost, harness.initialized[0].report.benchmarkHost);
});

test('a failed host manifest write prevents all initialization and generation', async t => {
  const harness = await lifecycle(t), writeFile = fs.writeFile.bind(fs);
  let attempted = 0;
  t.mock.method(fs, 'writeFile', async (file, ...args) => {
    if (typeof file === 'string' && path.basename(file) === 'benchmark-host.json') {
      attempted++;
      throw new Error(privateFailure);
    }
    return writeFile(file, ...args);
  });
  await assert.rejects(harness.run(), error => error instanceof Error
    && /Live benchmark did not complete/.test(error.message) && !error.message.includes(privateFailure));
  assert.equal(attempted, 1);
  assert.equal(harness.initialized.length, 0);
  assert.equal(harness.starts.length, 0);
  const result = await harness.finalReport();
  assert.equal(result.status, 'failed');
  assert.equal(result.generations, 0);
  assert.match(result.benchmarkHost.sha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes(privateFailure), false);
});

test('missing or tampered saved host evidence stops further work and completion', async t => {
  for (const phase of ['generation', 'cleanup']) for (const mutation of ['delete', 'tamper']) {
    await t.test(`${phase}: ${mutation}`, async t => {
      let changed = false, originalIdentity;
      const corrupt = async ({ report }) => {
        if (changed) return;
        assert.ok(report.benchmarkHost, 'Active work must identify its host evidence.');
        originalIdentity = structuredClone(report.benchmarkHost);
        if (mutation === 'delete') await fs.unlink(report.benchmarkHost.path);
        else await fs.appendFile(report.benchmarkHost.path, '\n');
        changed = true;
      };
      const harness = await lifecycle(t, phase === 'generation' ? { start: corrupt } : { stopAll: corrupt });
      await assert.rejects(harness.run(), /Live benchmark did not complete/);
      assert.equal(changed, true);
      assert.equal(harness.starts.length, phase === 'generation' ? 1 : factoryBenchmarkScenarios.length);
      const result = await harness.finalReport();
      assert.equal(result.status, 'failed');
      assert.deepEqual(result.benchmarkHost, originalIdentity);
      if (mutation === 'delete') await assert.rejects(fs.readFile(originalIdentity.path), { code: 'ENOENT' });
      else assert.notEqual(sha256(await fs.readFile(originalIdentity.path)), originalIdentity.sha256);
    });
  }
});

test('startup capture failure retains a failed report without leaking host diagnostics', async t => {
  const overlay = overlayArtifact(t, 'dist-electron/electron/solution-evaluation.js', { missing: true });
  overlay.enable();
  const module = await import(pathToFileURL(path.join(repository, 'scripts/benchmark-factory.mjs')).href + '?host-capture-failure=caller-test');
  const harness = await lifecycle(t, { run: module.benchmarkLiveFactory });
  await assert.rejects(harness.run(), error => error instanceof Error
    && /Live benchmark did not complete/.test(error.message) && !error.message.includes(privateFailure));
  assert.ok(overlay.hits() > 0);
  assert.equal(harness.initialized.length, 0);
  assert.equal(harness.starts.length, 0);
  const result = await harness.finalReport();
  assert.equal(result.status, 'failed');
  assert.equal(result.benchmarkHost, null);
  assert.equal(JSON.stringify(result).includes(privateFailure), false);
});
