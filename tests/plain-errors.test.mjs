import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { plainError, recordProjectError } from '../dist-electron/electron/plain-errors.js';

// Lock every standard Error producer, including dynamic arguments and subclasses.
// The conservative lexical fingerprint extends through the next semicolon. It can
// flag comments/formatting too: review a change rather than silently ignore a producer.
const errorProducers = source => [...source.matchAll(/\b(?:new\s+)?(?:Error|EvalError|RangeError|ReferenceError|SyntaxError|TypeError|URIError|AggregateError)\s*\(/g)]
  .map(match => source.slice(match.index, source.indexOf(';', match.index) < 0 ? source.length : source.indexOf(';', match.index) + 1));
const errorInventory = {
  "electron/pi-backend.ts": "6e6f7c0b8d003786d14865324355d441d1d364aa11b1d696138670a5b05720f5",
  "electron/storage.ts": "11065092edbad032fcdcef7cd31bcb8d77ad3ab4b5438e983c5df2ef58796edc",
  "harness/catalog.ts": "e0bbe010947264e3db3840d076b123504ea30658d401b4f74c273efd8e160e5e",
  "harness/norfolk.ts": "da08994d91c5fb94a96a7e154d39b42c232f4659c6848ecfe80e0c8ee1b478cb",
  "shared/project-input.ts": "e93ecfd5ce44bc69db62fdc5649f7516dc29d19ba6b049557d98a59fe6cbc492",
  "electron/verification.ts": "0db746238549706f573f0f73c78a042929b111a497371b1bc2300259de9ff321",
  "electron/quality.ts": "1c766c678d43b7b066c9120bd6e1aee38965f9cf512b7f76c47a567f3aa88c83",
  "harness/quality-contract.ts": "2ce9a2b4d3a3394c4b4963216cf3633f0692321d68ce56c7e574c41a1c83edea",
  "electron/browser-verification.ts": "cbbedbaa7c646ec2a33381d78327b060a39168c50b90b0333b9e4c97e5e76b38",
  "electron/preview.ts": "3708d08bafc1abc5df8e0b3835e5795ce3353bc33973f4e15fdaa40eb1b0eb58",
  "electron/agent-runner.ts": "380adc0bf9e4ec058d99921eca0e8c3b3ba4b806c3644865dd9ced9d8d2ba0ac",
  "harness/integration.ts": "4b950ceeac0ddf7ff3764093ca3297b49e66c1c84b2596bd9638e22ebde54947",
  "harness/planner.ts": "d4277229e364ca18355db9c8bc6054e494c972a9e7d69f48e45ddd63e816aa31",
  "harness/tool-registry.ts": "4d4a49881e35b191d59801482244e17d08d543d0d48aafa904d00f59ebaa9169",
  "harness/tools/messages.ts": "415afbdc50c49397c4b657c29f912fdb558359c8a0c27719f76684a92fb56ef7",
  "harness/tools/validation.ts": "0469e2ee97c91d0d5a8b0e4981e9bd1c6e960c327b140e2020f443e73c781936",
  "harness/tools/scheduling.ts": "05b20ec8d98227ecf328bd2a95f3e0f2cea403ae553d0bbe608e2593d8de14d4",
  "harness/tools/offline.ts": "4094fd64fdb82c234911089469fe1c3418b6652a33e5b652081c8e76194d31fb",
  "harness/tools/evidence.ts": "e846cbdd98e07c52fa07f1bdb262f37c3a597ab27a67b1a01ee84a055eeed350",
  "harness/tools/readiness.ts": "75b22f00b2e461ee825c265fa610d575fa20297b3cf3df3a71cf846c851ebbe4",
  "electron/system-design.ts": "1e5acf572539828fc251c8af1e9dff1f4c9fc195e18074cf948376fcd5db6e5a",
  "shared/system-design.ts": "cd310003c4d1ef82fd9e3479a0e42210ebcb657ff6cff481fd539da86520040d",
  "electron/codex-session.ts": "d01c4b134a986dcc4e329bfe17a176f9326dbcf5049f50f895f087f99ac88f3d",
  "electron/codex-rpc.ts": "7e4c723f820d02277b322308ed89e053cd1860a7bad028cd9272617f06dbd2e9",
  "electron/codex-account.ts": "1d211d112e169520ff44f6ac15498afb527fa8642011dac747e18257c49df545"
};
const errorLiterals = source => [...source.matchAll(/\b(?:new\s+)?(?:Error|EvalError|RangeError|ReferenceError|SyntaxError|TypeError|URIError)\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map(match => match[2]);
async function flowErrors(file = 'electron/pi-backend.ts', found = new Map()) {
  if (found.has(file)) return found;
  const source = await fs.readFile(file, 'utf8');
  found.set(file, { literals: errorLiterals(source), producers: errorProducers(source) });
  for (const match of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) continue;
    const next = path.normalize(path.join(path.dirname(file), match[1].replace(/\.js$/, '.ts')));
    try { await fs.access(next); } catch { continue; }
    await flowErrors(next, found);
  }
  return found;
}
const signature = messages => createHash('sha256').update(JSON.stringify(messages)).digest('hex');
function assertInventory(files) {
  const inventory = Object.fromEntries([...files].filter(([, errors]) => errors.producers.length).map(([file, errors]) => [file, signature(errors.producers)]));
  assert.deepEqual(inventory, errorInventory, 'Raw errors changed: map each new error and review the inventory');
}

for (const mutation of [
  'throw new Error("Synthetic unmapped readiness failure");',
  'const message = "Synthetic unmapped readiness failure"; throw new Error(message);',
  'throw new TypeError("Synthetic unmapped readiness failure");',
  'throw Error("Synthetic unmapped readiness failure");',
  'throw new AggregateError([], "Synthetic unmapped readiness failure");',
  'throw new\nRangeError\n(\n"Synthetic unmapped readiness failure"\n);'
]) test('the inventory rejects a new producer: ' + mutation.replace(/\s+/g, ' '), async () => {
  const source = await fs.readFile('electron/preflight.ts', 'utf8');
  const files = await flowErrors();
  await flowErrors('electron/preflight.ts', files); await flowErrors('electron/plain-errors.ts', files);
  assertInventory(files);
  files.set('electron/preflight.ts', { producers: errorProducers(source + '\n' + mutation), literals: [] });
  assert.throws(() => assertInventory(files), /Raw errors changed/);
  assert.equal(plainError('Synthetic unmapped readiness failure').code, 'unknown');
});

test('every known local flow error has a plain instruction and new raw errors fail coverage', async () => {
  const files = await flowErrors();
  await flowErrors('electron/preflight.ts', files);
  await flowErrors('electron/plain-errors.ts', files);
  assertInventory(files);
  for (const [file, errors] of files) for (const raw of errors.literals) {
    const sample = raw.replace(/\$\{[^}]*\}/g, 'example');
    const result = plainError(new Error(sample));
    assert.notEqual(result.code, 'unknown', file + ': ' + raw);
    assert.match(result.message, /[.;]/);
    assert.doesNotMatch(result.message, /\b(stage|session|SDK|Codex turn|thread|RPC|artifact)\b/i);
    assert.doesNotMatch(result.message, /\n|\r/);
  }
  const source = await fs.readFile('electron/pi-backend.ts', 'utf8');
  const modified = errorProducers(source + '\nthrow new Error("New unmapped raw failure");');
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
