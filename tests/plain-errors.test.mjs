import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { plainError, recordProjectError } from '../dist-electron/electron/plain-errors.js';

// Literal constructors lock their statement. A dynamic constructor also locks its
// whole module: its inputs may originate in helper calls, assignments or fallbacks
// anywhere in that module. This deliberately requires review of unrelated edits
// there, rather than claiming a lexical scan proves data flow. Review each changed
// message and its mapping before refreshing a signature.
const errorProducers = source => {
  const matches = [...source.matchAll(/\b(?:new\s+)?(?:Error|EvalError|RangeError|ReferenceError|SyntaxError|TypeError|URIError|AggregateError)\s*\(/g)];
  const producers = matches.map(match => source.slice(match.index, source.indexOf(';', match.index) < 0 ? source.length : source.indexOf(';', match.index) + 1));
  if (matches.some(match => !/^[\s]*['"`)]/.test(source.slice(match.index + match[0].length)))) producers.push('Dynamic message inputs:\n' + source);
  return producers;
};
const errorInventory = {
  "electron/pi-backend.ts": "a83c6a077b8c542ae698b372b39bed6e2bbeadf290fa7d0018b2e8f0323e2f61",
  "electron/storage.ts": "1273162630d14990ad7e7c46072dc36f66060cace266293935eada85254c52c7",
  "harness/catalog.ts": "e0bbe010947264e3db3840d076b123504ea30658d401b4f74c273efd8e160e5e",
  "harness/norfolk.ts": "da08994d91c5fb94a96a7e154d39b42c232f4659c6848ecfe80e0c8ee1b478cb",
  "shared/project-input.ts": "e93ecfd5ce44bc69db62fdc5649f7516dc29d19ba6b049557d98a59fe6cbc492",
  "electron/verification.ts": "be0340c42e875692caa8fb28f1517d7f3934645c3e2a2ea9ed3259dc4d1fa7c0",
  "electron/codex-rpc.ts": "abef6e91822db8bba0c93a3cc856292310d43b0610e62790e1d22863590b2504",
  "electron/process-sweep.ts": "1db16d87c73a11a88c46484e1d21a8bb3479db7297fff7d4c4c4d0a17dda242d",
  "electron/quality.ts": "1c766c678d43b7b066c9120bd6e1aee38965f9cf512b7f76c47a567f3aa88c83",
  "harness/quality-contract.ts": "bd4554d75affdab4d77cdeb435e003590ff709102b05b487e3431b460cf54392",
  "electron/browser-verification.ts": "cbbedbaa7c646ec2a33381d78327b060a39168c50b90b0333b9e4c97e5e76b38",
  "electron/preview.ts": "3708d08bafc1abc5df8e0b3835e5795ce3353bc33973f4e15fdaa40eb1b0eb58",
  "electron/agent-runner.ts": "7510f6d7d1ee7a6f72c47e8929244128fdffdae77271667e0fca10a8e5888686",
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
  "electron/codex-session.ts": "cd4c79512de94b5e7cb8467d1f48ff27c93973048572d20c854d1974b0dbf9ea",
  "electron/codex-account.ts": "50ac80dd94ee8e2269a6cc7f9288d9518b5e2415825766b5f55b5afeba2a9ea1",
  "electron/independent-judge.ts": "d517a10b0b61433d74fb024d417480ecb12765052a8dae999eec12a7c3f9d973"
};
// fail(message) is the local agent-runner error wrapper. Its literal/template
// inputs need the same mapping checks as direct constructors. Dynamic arguments
// and changes to the helper itself are covered by the module signature above.
const errorLiterals = source => [...source.matchAll(/\b(?:new\s+)?(?:Error|EvalError|RangeError|ReferenceError|SyntaxError|TypeError|URIError|fail)\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map(match => match[2]);
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

test('coverage rejects an unmapped message passed to an existing fail helper', async () => {
  const file = 'electron/agent-runner.ts';
  const source = await fs.readFile(file, 'utf8');
  const mutated = source.replace('made no progress for', 'Synthetic unclassified fault for');
  assert.notEqual(mutated, source);
  const files = await flowErrors();
  files.set(file, { producers: errorProducers(mutated), literals: errorLiterals(mutated) });
  assert.throws(() => assertInventory(files), /Raw errors changed/);
  assert.ok(errorLiterals(mutated).some(raw => raw.includes('Synthetic unclassified fault for')), 'Helper arguments must be checked for plain mappings');
  assert.equal(plainError('example Synthetic unclassified fault for 5 seconds while waiting.').code, 'unknown');
});

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
    const sample = raw.replace(/\\(['"`\\])/g, '$1').replace(/\$\{[^}]*\}/g, 'example');
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

test('teammate cleanup, checkpoint and deferral errors retain plain recovery instructions', () => {
  for (const [raw, code] of [
    ['Process inspection returned no identities.', 'shutdown'],
    ["Cannot inspect the current user's processes.", 'shutdown'],
    ['Cannot inspect user process 123.', 'shutdown'],
    ['Run process scope is closed; no further processes may start.', 'shutdown'],
    ['Run process inspection is unavailable on this platform.', 'shutdown'],
    ['Process cleanup refused an invalid run process identity.', 'shutdown'],
    ['Process cleanup could not be confirmed: cannot inspect this run\'s processes.', 'shutdown'],
    ['Run checkpoint is unavailable.', 'missing-files'],
    ['Run workspace is unavailable.', 'missing-files'],
    ['Checkpoint does not match this project, run, or model.', 'changed'],
    ['Checkpoint files changed. Restore the saved checkpoint before resuming.', 'changed'],
    ['Checkpoint quality contract changed. Start a new build.', 'changed'],
    ['Checkpoint context changed. Start a new build.', 'changed'],
    ['Saved verification no longer matches the source.', 'changed'],
    ['Unsupported checkpoint phase.', 'settings'],
    ['criteria[0] (C1): deferral reason must start with real-system:, real-data:, or human-authority: followed by a concrete dependency.', 'plan']
  ]) {
    const result = plainError(raw);
    assert.equal(result.code, code, raw); assert.match(result.message, /;/);
    assert.doesNotMatch(result.message, /checkpoint|stage|session|SDK|artifact/i);
  }
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
