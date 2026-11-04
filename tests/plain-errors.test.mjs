import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { plainError, recordProjectError } from '../dist-electron/electron/plain-errors.js';

// This inventory locks the raw error literals in the flow and its local dependencies.
// New errors require a deliberate mapping and a new inventory, even if a broad rule matches.
const errorInventory = {
  "electron/pi-backend.ts": "e6048ee84e8fef2617269a9436aab5aa3ba4a5f23217276a5bf2a3ec288e22ba",
  "electron/storage.ts": "1fa97e3ad33c4bab5e3e0a41ba55b9b9173b2ea8afc5c258aa299a2f38329958",
  "harness/catalog.ts": "95b31c350c12998b1b2e62e208dc6c65d88990abb35582ab18ea9ea17e255f7c",
  "harness/norfolk.ts": "fb33ca24d141071e9593726fb45629dfc63803c3dcb481e141ef34165d84effc",
  "shared/project-input.ts": "2a2630b3960f3a12bfcbb90908de5336fea1df8faec7c42bb0d1bf252139c0c2",
  "electron/verification.ts": "56941c5ece5086488b69836ca1655b658a4458e2cbd648be79664b4e81099d57",
  "electron/quality.ts": "6b447ff21f1dcefef991bfce3fbdb27c00fc964956fc365339924d98a1fa1d82",
  "harness/quality-contract.ts": "2f46174af83b8073017921d5688e25dded4e9fb634f69e1ef91f58b55d49bcc2",
  "electron/browser-verification.ts": "574bb0473828a4ce38bc322a491da3596743f79c49ca41e66d76e029f7d8b48b",
  "electron/preview.ts": "3b81e58718afbfef6c23f24fecc8e48e5eaa3804082333426d165d694408209a",
  "electron/agent-runner.ts": "57b96fe37f0638e4fbbec47bdf49a6205bb94c2778bb5328142bacbfcdc37a9f",
  "harness/integration.ts": "0c5361db9de1cc566fb4e69afc2f487790f2fe55fadcac244bebd45b3553d542",
  "harness/planner.ts": "465a8cf2050c841af3f33524ba52b036f0188d111e93ed96e6eecf6e4e83197d",
  "harness/tool-registry.ts": "a611effaeaaa3abfd98a0ecaf5d8e353e159d06c16508cb75c3075776d3c571d",
  "harness/tools/messages.ts": "8b5130e3b188aaf2d8ef22b52ae53ebcfba74b3c93191a6df0592becc6f62b65",
  "harness/tools/validation.ts": "7f233935e002e25499ce33c3ca89ef28e7bc8c4f41f322529921f614a8a1c998",
  "harness/tools/scheduling.ts": "4399d41a5f2accf8d6b6f2e53c5ce88750c0e7e14c6ea22349b0f4ff607f5cc0",
  "harness/tools/offline.ts": "c2bd43af8ec2dac1aa6aa211aa2583cc1933dbb0e70ee5bda0cfc2ca8b0b5bbd",
  "harness/tools/evidence.ts": "78def54487ce8cd50a20c870bfd579f3ac9f7f7485598f4c627c03dc9742e08d",
  "harness/tools/readiness.ts": "9559f20b39330961d5c09faeb3125a4992b3863f6dd006cdab4f18242bfaf738",
  "electron/system-design.ts": "98bf92d9df6a0f8d236fb00ae5d57a67e9944bb5ffe5d92f1359d0213f3fa7d7",
  "shared/system-design.ts": "8362c4189c15d6110eb444a1c36af96255be282b16c69adbe398e5f72ae5cd45",
  "electron/codex-session.ts": "8ddeecafd0c3057066c5a5da437d714dd14668d98662449c3e11fbc7f2c7d013",
  "electron/codex-rpc.ts": "c4a21b00bc992f90345f021ee3a517f7e128c5234bbf0d782c0c0fad08311205",
  "electron/codex-account.ts": "fc684bb1a91c2a564428b22b832efb464b2c604831668cf6931017e04bd3112a"
};
const errorLiterals = source => [...source.matchAll(/new Error\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map(match => match[2]);
async function flowErrors(file = 'electron/pi-backend.ts', found = new Map()) {
  if (found.has(file)) return found;
  const source = await fs.readFile(file, 'utf8');
  const literals = errorLiterals(source);
  found.set(file, literals);
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) continue;
    const next = path.normalize(path.join(path.dirname(file), match[1].replace(/\.js$/, '.ts')));
    try { await fs.access(next); } catch { continue; }
    await flowErrors(next, found);
  }
  return found;
}
const signature = messages => createHash('sha256').update(JSON.stringify(messages)).digest('hex');

test('every known local flow error has a plain instruction and new raw errors fail coverage', async () => {
  const files = await flowErrors();
  await flowErrors('electron/preflight.ts', files);
  await flowErrors('electron/plain-errors.ts', files);
  const inventory = Object.fromEntries([...files].filter(([, errors]) => errors.length).map(([file, errors]) => [file, signature(errors)]));
  assert.deepEqual(inventory, errorInventory, 'Raw errors changed: map each new error and review the inventory');
  for (const [file, errors] of files) for (const raw of errors) {
    const sample = raw.replace(/\$\{[^}]*\}/g, 'example');
    const result = plainError(new Error(sample));
    assert.notEqual(result.code, 'unknown', file + ': ' + raw);
    assert.match(result.message, /[.;]/);
    assert.doesNotMatch(result.message, /\b(stage|session|SDK|Codex turn|thread|RPC|artifact)\b/i);
    assert.doesNotMatch(result.message, /\n|\r/);
  }
  const source = await fs.readFile('electron/pi-backend.ts', 'utf8');
  const modified = errorLiterals(source + '\nthrow new Error("New unmapped raw failure");');
  assert.throws(() => assert.equal(signature(modified), errorInventory['electron/pi-backend.ts']), /AssertionError/);
  assert.equal(plainError(new Error('New unmapped raw failure')).code, 'unknown');
});

test('common provider, filesystem and timeout failures give specific recovery instructions', () => {
  for (const [raw, code, action] of [
    ['401 Unauthorized', 'connection', /connect/i],
    ['403 Forbidden', 'connection', /connect/i],
    ['No API key found for synthetic-provider', 'connection', /connect/i],
    ['429 rate limit exceeded', 'busy', /wait/i],
    ['insufficient_quota', 'quota', /allowance/i],
    ['ECONNRESET', 'network', /connection/i],
    ['fetch failed', 'network', /connection/i],
    ['ENOSPC: no space left on device', 'disk', /space/i],
    ['EACCES: permission denied', 'files', /permission/i],
    ['ENOENT: no such file or directory', 'missing-files', /try again/i],
    ['SyntaxError: Unexpected token in JSON', 'invalid-output', /try again/i],
    ['sandbox-exec: sandbox_apply: Operation not permitted', 'sandbox', /restart/i],
    ['Codex intake agent made no progress for 5 seconds while waiting for the model.', 'timeout', /try again/i],
    ['Run stopped by you. Source and session logs are saved.', 'stopped', /start/i]
  ]) {
    const result = plainError(new Error(raw)); assert.equal(result.code, code, raw); assert.match(result.message, action);
    assert.doesNotMatch(result.message, /\b(stage|session|SDK|Codex turn|thread|artifact)\b/i);
  }
});

test('dynamic error producers and raw external values never leak internal words', () => {
  for (const [raw, code] of [
    ['Codex did not produce the required artifacts after one completion attempt: scope.md. Inspect the session and start a new run.', 'output'],
    ['Codex build agent exceeded the 30-minute limit. Inspect the saved artifacts before retrying.', 'timeout'],
    ['Pi plan agent reached the 40-turn limit. Inspect its artifacts before retrying.', 'timeout'],
    ['The model stopped before completing this stage.', 'output'],
    ['The model exhausted its response limit before completing this stage.', 'timeout'],
    ['The model provider returned an error.', 'connection'],
    ['Codex could not complete the turn.', 'connection'],
    ['Codex turn failed. Check your ChatGPT connection and usage in Settings.', 'connection'],
    ['Could not save run state: Error: write failure', 'files'],
    ['getaddrinfo ENOTFOUND api.example.com', 'network'],
    ['The external SDK returned a new internal stage error', 'unknown']
  ]) {
    const result = plainError(raw); assert.equal(result.code, code, raw);
    assert.doesNotMatch(result.message, /\b(stage|session|SDK|Codex turn|thread|artifact)\b/i);
  }
});

test('native cancellation gets the same plain stopped instruction', () => {
  const controller = new AbortController(); controller.abort();
  assert.equal(plainError(controller.signal.reason).code, 'stopped');
});

test('unknown external failures stay out of the project error but remain in the log', () => {
  const project = {}, logs = [];
  const error = new Error('Synthetic SDK internal session fault');
  recordProjectError(project, error, detail => logs.push(detail));
  assert.match(project.error, /could not finish/i);
  assert.doesNotMatch(project.error, /SDK|session|Synthetic/);
  assert.ok(logs[0].includes(error.stack));
  assert.equal(plainError(null).code, 'unknown');
  assert.equal(plainError({}).code, 'unknown');
});

test('a rejected object with no printable string still produces a plain message', () => {
  const raw = Object.create(null);
  const project = {}, logs = [];
  recordProjectError(project, raw, detail => logs.push(detail));
  assert.equal(plainError(raw).code, 'unknown');
  assert.match(project.error, /could not finish/);
  assert.equal(typeof logs[0], 'string');
});

test('specific errors keep their raw cause in the log and their plain message on screen', async () => {
  const { PreflightError, preflightMessages } = await import('../dist-electron/electron/preflight.js');
  for (const code of Object.keys(preflightMessages)) {
    const error = new PreflightError(code, new Error('Synthetic startup detail'));
    const project = {}, logs = [];
    recordProjectError(project, error, detail => logs.push(detail));
    assert.equal(project.error, preflightMessages[code]);
    assert.doesNotMatch(project.error, /Synthetic|\b(stage|session|SDK|Codex turn|thread|artifact)\b/i);
    assert.match(project.error, /;/);
    assert.match(logs[0], /Synthetic startup detail/);
  }
});
