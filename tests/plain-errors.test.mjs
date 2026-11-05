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
  "electron/agent-browser.ts": "70ad354bce556d451fddd92f940ade0e6a94ab49bf488fb2caa59b0a38142c93",
  "electron/agent-helpers.ts": "2cd979e6cf22d22067c5a52463f9eeb42ed3b933bb11628aa1943c9abdaf5078",
  "electron/agent-runner.ts": "67125d0144934df0183b0edf6893914fb69f147c8375a67f84e700e60bed16eb",
  "electron/brief-data.ts": "c718b2589e70c7765d2efbcdfb7137b317962b9c6869036b4438f918c6d20ff3",
  "electron/browser-actions.ts": "795ac8ac6e6333a58d4c9ff8b851ec87dcc859210456a78e7bf1760ad0c7b198",
  "electron/browser-http-evidence.ts": "cc7c9681bd1101751b421dfbedc62643e93edfe4f66e2884fac16b8455485210",
  "electron/browser-verification.ts": "2a4d3ca48e670cbd93e84f8f09b6fc6c830454bf701ddac25ec5b373543100d5",
  "electron/chatgpt-oauth.ts": "0ca0327dadc0c210ab712024aa614ed49b4760a28a7ab6292b5789fa6473e9dd",
  "electron/clarifications.ts": "70234658664a60f91a2755b228fb76342b2029e1794435356f2914e51a83f8d8",
  "electron/codex-account.ts": "2d711e84ada731b8f50b15e977dd642e78711eec8eb8492c4eeae62ae7ceeded",
  "electron/codex-rpc.ts": "1c690e0405efc8b158bae9c588bd4665c3d965cef5b439f17594709b097fd46a",
  "electron/codex-session.ts": "ed9a4eb4f7b836490bffa5c92fbd6cdb03bddee780afaa13739ba818f4c62b63",
  "electron/connectors/sample-data.ts": "ce5a604160b1b1df0cbffcfef7ce3d195474c216613c5a9d028f756713eb35ec",
  "electron/connectors/snapshot.ts": "e802d54afc8f94410b741b80df35595a18fe659fee6d73039a9ae7e171e9d975",
  "electron/connectors/store.ts": "e42422dbdf1f5a4271031a0c908ad1194f4d79d580fcf6351ba8088c6f2540a1",
  "electron/container-export.ts": "ec70fb7e4febbb893ba154c6b2a64c4917e34fbf818fcb7b39684ae2a75842d7",
  "electron/core-evidence.ts": "6e369efcdd49151bb500cd995e50fd40bf78ce04eebc72a0711b7c5e6b9ae2f6",
  "electron/delivery-secrets.ts": "7625dfa1265723b450a72f3187630569ef4159e0161f3be6cd44f5f0dbf9ec2e",
  "electron/delivery.ts": "9a096ce495a49934ac8d4b72a3b2e4343fdb913f80383a351024cb5679ede5a1",
  "electron/executable.ts": "f64ae2c2e0e3ae27043ed999f9e3b32241c1a03e78df1f387ee8f14de2e88506",
  "electron/execution-budget.ts": "94c75f005dcaf395f52d520f6a56aa7077d20fdf00d7aa37cec72bf2272b36c0",
  "electron/genai-mil.ts": "149b1bf5f65e95e0cd1461c6fa0d654463d860d9de10d5784f9027dcd62da818",
  "electron/helper-execution.ts": "28353fd31cc621f515979f3bc0a766b14b6e5c544b18f0273f630d1d2dcbbeb4",
  "electron/independent-judge.ts": "e11a12bac75aa9ba29f02db1ea9e0910aa679d385ad3ff50a9e4874db8458c02",
  "electron/isolated-agent-tools.ts": "f70cae33e13d9cc76e934ff9c855dc08b613bb490344207f18e6a261de4d2162",
  "electron/isolated-executor.ts": "7c053bca47724bbfc680400fa53754f52f38d976ad935fe92a9bef83617a9191",
  "electron/macos-isolation.ts": "564dee181e960cdd9d0e321a2bdb0d48d95c6e3c0ce445bef6e363db02750e35",
  "electron/package-runtime.ts": "2adf0212b7ffdb7fbaf40cae75d20eb3e097946e38d4fff13fd9bcb713fefe49",
  "electron/package-worker.ts": "dff5d82e269d492975fa14d138cd654bd80b07c224a1394e4b2ea43b3db783da",
  "electron/pi-backend.ts": "67764e1b80c740bd0b0f26d9617222a30ed2a1859a5059d58ebd205945f85960",
  "electron/planning-continuation.ts": "f2ef39249ae0a3f05b8a039ccc4231d0ded5083ab4c42172f7a84c2ec72494f8",
  "electron/planning-review.ts": "d1ee7b66eb51a7dae5c58bc278789d9b7bfd90cf4ee485c65cc2d703ce830025",
  "electron/preview-proxy.ts": "145d5562d297d782a6238ff75913a6ee027958560d3b94cfae51f0e9402ee640",
  "electron/preview.ts": "3708d08bafc1abc5df8e0b3835e5795ce3353bc33973f4e15fdaa40eb1b0eb58",
  "electron/process-sweep.ts": "a7b3483a476cb222e1a911795137f865b543cda4303977d3e5db68966ccc7d6f",
  "electron/quality.ts": "93bd17e264ad8d6121cb2ec9ecff00a797b1367ae136f0612503fa501bcf04f3",
  "electron/review.ts": "d87816eb820111fdc7fe8c81d44381b67d35e232ac82a34e58fdaf71ea7fcc92",
  "electron/run-checkpoint.ts": "e26c9d56eb6f249bb4e71b93baef4fb96ab86192d8f2987d902fb2ccae0c1683",
  "electron/scoped-run-store.ts": "4852111d9607dba4efd76d0b9010eade21d66199723274f9db5bd9697018c425",
  "electron/secrets.ts": "c9ce42334bdf6aaa122ff14d5b89e70c11c0229d82a0343e52a4bbadedc6bf0d",
  "electron/service-package.ts": "2fd75c5a6ec4a34b3c74bcd378d10c563a0b3ead8d29a48b6d08a01a07d2f1f3",
  "electron/solution-evaluation.ts": "6f645eb16e3973f705f92a1a0548d2c8064b9e45f31eada176df0ea1ddf0ed68",
  "electron/solution-runtime.ts": "491234efaee13d99d555f17514b6f99e541701792a25f6bab504be2718b4540d",
  "electron/source-export.ts": "45c60667b4fdf3828f45a82a1664add8d239b33fb54ed41d231893c4c60b145d",
  "electron/standalone-service.ts": "9534a4407faa851ffda8c369d5205aa06e8a5f7b20a80b1de2d6820e69bd6a91",
  "electron/storage.ts": "4dcf1f03510f53180da560d36c45bf0ccfc4d36685855465757d4902c9211b7a",
  "electron/system-design.ts": "1e5acf572539828fc251c8af1e9dff1f4c9fc195e18074cf948376fcd5db6e5a",
  "electron/test-baseline.ts": "6c7f91885cb4fbf34534fc2e1dfede54425ec0791a8fbf75ec851a45a8596554",
  "electron/verification.ts": "3d4f607f4960298bad07327ba436823bba0569459ac1c970c444bdeb59356a51",
  "electron/visual-review.ts": "00f98a1374ee784936b7d578f48d8ccffb510cb67d842c5d256002c41bae5e79",
  "harness/agent-helpers.ts": "4c18f5b8e15f94e2d7275c8d9c0ad318126e4a690622f943209ebb153d0860fb",
  "harness/catalog.ts": "e0bbe010947264e3db3840d076b123504ea30658d401b4f74c273efd8e160e5e",
  "harness/experiment-contract.ts": "39ea4c6fdeb96628770d8562397bbf533958ca950ef399faa1f5683a7092a170",
  "harness/foundations.ts": "c2c7b63d208c13d3e588411f476cd26b05e57d02a85ed7f080a39bbec5ca4a30",
  "harness/integration.ts": "dcf498a183b90defa591068b54ee13485230a5359ded4d030cd0cd023b00cf34",
  "harness/norfolk.ts": "da08994d91c5fb94a96a7e154d39b42c232f4659c6848ecfe80e0c8ee1b478cb",
  "harness/planner.ts": "d4277229e364ca18355db9c8bc6054e494c972a9e7d69f48e45ddd63e816aa31",
  "harness/quality-contract.ts": "b5a4d2192f4fa0c0f18d38f0ff59deef01d1d3c733f67ea2bf0794ebf623288f",
  "harness/solution-contract.ts": "1ab2172f9334e86a39b7cf9671983fc6c1532994e020d0ad9110de97852815a3",
  "harness/tool-registry.ts": "4d4a49881e35b191d59801482244e17d08d543d0d48aafa904d00f59ebaa9169",
  "harness/tools/evidence.ts": "bfcb50f42a079d0ec36ff47431ca4c866315c01e84356c499c0b77a6fcbb2a9b",
  "harness/tools/messages.ts": "415afbdc50c49397c4b657c29f912fdb558359c8a0c27719f76684a92fb56ef7",
  "harness/tools/offline.ts": "b00067ba07fb4dfe3486f5341f58cd2500d74095663a3b8610e54697410f71f5",
  "harness/tools/readiness.ts": "75b22f00b2e461ee825c265fa610d575fa20297b3cf3df3a71cf846c851ebbe4",
  "harness/tools/scheduling.ts": "05b20ec8d98227ecf328bd2a95f3e0f2cea403ae553d0bbe608e2593d8de14d4",
  "harness/tools/validation.ts": "93ab0c34708bbe52df7bf686b3ee08768859e1b1602bcc08844a02939a82c2d6",
  "shared/connectors.ts": "6959caa4661eed1e9b78ac647c654fcc1cb23206a88e45c364fb6af4ab896eb0",
  "shared/host-files.ts": "709cd3d66687f5e526551fdffb7a45fba11b2017fce4753698e04b36e71cd5c6",
  "shared/integration.ts": "883430bf861e04ca739b5d63e3eedfbc01df435a02cfc63ff65f639c66c8dc8b",
  "shared/project-input.ts": "1a23f20193ae26f5d491ac2f2d8f694dd1777d2dcf4f2a012e49ae78a00d2b90",
  "shared/runtime-artifacts.ts": "e435e1d7d74a19b0f940fe09802602c605460e2340c4a0a3d7dbbb12a77ea607",
  "shared/system-design.ts": "cd310003c4d1ef82fd9e3479a0e42210ebcb657ff6cff481fd539da86520040d",
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
async function allFlowErrors() {
  const files = await flowErrors();
  for (const file of ['electron/preflight.ts', 'electron/plain-errors.ts', 'electron/executable.ts', 'electron/package-worker.ts', 'electron/source-export.ts']) await flowErrors(file, files);
  return files;
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
  const files = await allFlowErrors();
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
  const files = await allFlowErrors();
  await flowErrors('electron/preflight.ts', files); await flowErrors('electron/plain-errors.ts', files);
  assertInventory(files);
  files.set('electron/preflight.ts', { producers: errorProducers(source + '\n' + mutation), literals: [] });
  assert.throws(() => assertInventory(files), /Raw errors changed/);
  assert.equal(plainError('Synthetic unmapped readiness failure').code, 'unknown');
});

test('every known local flow error has a plain instruction and new raw errors fail coverage', async () => {
  const files = await allFlowErrors();
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

test('gap acceptance refusal stays one plain sentence', () => {
  const message = 'Read and accept the independent check gaps before approving this prototype.';
  const result = plainError(new Error(message));
  assert.equal(result.code, 'judge-acceptance'); assert.equal(result.message, message);
  assert.doesNotMatch(result.message, /\n|\r/);
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

test('unconfirmed writers stay unsafe without falsely reporting failed process cleanup', () => {
  for (const prefix of ['Run stopped by you.\n', '503 provider error\n']) {
    const result = plainError(new Error(prefix + 'Writer shutdown was not confirmed. Recovery in this workspace is blocked.'));
    assert.equal(result.code, 'writer');
    assert.match(result.message, /could not confirm that all build work stopped/);
    assert.match(result.message, /operator shutdown procedure.*before starting another build/);
    assert.doesNotMatch(result.message, /cleanup could not be confirmed/);
    assert.match(result.detail, /Writer shutdown was not confirmed/);
  }
  const result = plainError(new Error('Process cleanup could not be confirmed.'));
  assert.equal(result.code, 'shutdown');
  assert.match(result.message, /processes may still be active/);
  assert.match(result.message, /operator shutdown procedure.*before starting another build/);
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

test('service download and startup messages keep a plain next step', async () => {
  const { offlineDependenciesMessage } = await import('../dist-electron/electron/service-package.js');
  assert.equal(plainError(offlineDependenciesMessage).code, 'download-dependencies');
  for (const [raw, code] of [
    ['This app uses Python or a command-line engine; export the runnable source package and follow its README to run it.', 'download-source'],
    ['The app could not start; close it and open it again.', 'app-start'],
    ['The app could not stop; restart this computer before opening it again.', 'app-stop'],
    ['The app needs settings before it can start; ask the person who supplied it for help.', 'app-settings']
  ]) assert.equal(plainError(raw).code, code);
});
