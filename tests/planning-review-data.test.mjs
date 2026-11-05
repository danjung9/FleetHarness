import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { solutionFixture } from '../scripts/solution-fixture.mjs';
import { syntheticDataFixture, syntheticDataFiles } from '../scripts/data-fixture.mjs';
import { prepareBriefData, freezeSyntheticData, assertBriefDataIntegrity } from '../dist-electron/electron/brief-data.js';
import { parseBehavioralContract, parseExperimentEvaluationPlan } from '../dist-electron/harness/experiment-contract.js';
import { loadQualityContract } from '../dist-electron/electron/quality.js';
import { createPlanningReviewSnapshot, createSharedPlanningReviewSnapshot, assertPlanningReviewSnapshot,
  assertSharedPlanningReviewSnapshot, PlanningReviewLedger } from '../dist-electron/electron/planning-review.js';

const acceptance = [{ id: 'R1', requirement: 'Extract a task from the original supplied messages.', method: 'automated',
  scenario: 'Check ordinary messages and invalid input against the original records.' }];
const suppliedInputs = [
  { name: 'messages.csv', kind: 'file', content: '\uFEFFmessage\r\n"TASK: inspect café pump 🧪"\r\n' },
  { name: 'messages.csv', kind: 'text', content: 'TASK: check valve\nLiteral replacement character: \uFFFD\n' }
];

async function setup(t, shared, { mode = 'provided', inputs = suppliedInputs, synthetic = syntheticDataFiles } = {}) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-planning-data-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const files = { ...solutionFixture(['R1']), 'requirements.md': 'Extract tasks from the exact supplied local messages.',
    'scope.md': 'Return the task after the public TASK: prefix.', 'research.md': 'Use a deterministic parser.',
    'plan.md': 'Implement the public parsing protocol.', 'test-matrix.md': 'Check extraction, original records and invalid messages.',
    'system-design.json': JSON.stringify({ title: 'Task parser', description: 'Shared parser', components: [], connections: [] }) };
  let behavior, evaluation;
  if (shared) {
    const solution = JSON.parse(files['solution-contract.json']), plan = JSON.parse(files['acceptance-plan.json']);
    const { schemaVersion: _version, screens: _screens, ...ux } = JSON.parse(files['ux-spec.json']);
    behavior = parseBehavioralContract({ schemaVersion: 1, objective: solution.objective, invocation: solution.invocation,
      capabilities: solution.capabilities, surface: 'cli',
      delivery: { profiles: ['node-cli', 'python-cli'], network: 'offline', operationIds: [] },
      criteria: plan.criteria.map(({ journeyIds: _journeys, ...criterion }) => ({ ...criterion, scenarioIds: [] })), ux, scenarios: [] }, acceptance);
    evaluation = parseExperimentEvaluationPlan(JSON.parse(files['evaluation-plan.json']), behavior);
    files['behavior-contract.json'] = JSON.stringify(behavior);
    files['evaluation-plan.json'] = JSON.stringify(evaluation);
    files['experiment-guide.md'] = 'Compare implementations of the same behavior using the original prepared data.';
    files['available-operations.json'] = '[]';
  }
  await Promise.all(Object.entries(files).map(([name, body]) => fs.writeFile(path.join(workspace, name), body)));
  let data;
  if (mode !== 'none') {
    data = await prepareBriefData(workspace, mode === 'provided' ? inputs : []);
    if (mode === 'synthetic') {
      await fs.mkdir(path.join(workspace, 'data'));
      await Promise.all(Object.entries(synthetic).map(([name, body]) => fs.writeFile(path.join(workspace, name), body)));
      data = await freezeSyntheticData(workspace, data);
    }
  }
  const quality = shared ? undefined : await loadQualityContract(workspace, acceptance, true);
  return { workspace, data, files,
    capture: prepared => shared ? createSharedPlanningReviewSnapshot(workspace, acceptance, behavior, evaluation, prepared)
      : createPlanningReviewSnapshot(workspace, acceptance, quality, prepared),
    check: snapshot => shared ? assertSharedPlanningReviewSnapshot(workspace, snapshot)
      : assertPlanningReviewSnapshot(workspace, snapshot) };
}

const ledgerFor = snapshot => new PlanningReviewLedger(snapshot, new AbortController().signal);
const tool = (ledger, name) => {
  const found = ledger.tools().find(item => item.name === name);
  assert.ok(found, `Missing ${name}`);
  return found;
};
const read = async (ledger, name, offset = 0) => JSON.parse((await tool(ledger, 'fleet_read_planning_artifact')
  .execute('read', { path: name, offset })).content[0].text);
const submit = (ledger, snapshot) => tool(ledger, 'fleet_submit_planning_review').execute('submit', approval(snapshot));

async function readWhole(ledger, name) {
  let offset = 0, body = '';
  for (;;) {
    const page = await read(ledger, name, offset);
    assert.equal(page.offset, offset);
    body += page.text;
    if (page.nextOffset === null) return body;
    assert.ok(page.nextOffset > offset, 'Every unfinished page must advance.');
    offset = page.nextOffset;
  }
}

async function readAll(ledger, snapshot, omit = []) {
  for (const name of Object.keys(snapshot.documents)) if (!omit.includes(name)) await readWhole(ledger, name);
}

function approval(snapshot) {
  const shared = snapshot.kind === 'shared';
  return { verdict: 'approved', minimumUsefulOutcome: 'An operator extracts the documented task from the original local messages.',
    scope: snapshot.acceptance.map(criterion => ({ criterionId: criterion.id, assessment: 'covered',
      reason: 'The original prepared records and the public parsing protocol support the required extraction.' })),
    evaluations: (shared ? snapshot.evaluation : snapshot.quality.evaluation).evaluations.map(item => ({ evaluationId: item.id,
      assessment: 'adequate', reason: 'The cases distinguish multiple original task messages and reject unsupported input.' })),
    recovery: { assessment: shared ? 'not-applicable' : 'adequate',
      reason: shared ? 'This shared contract has a CLI surface.' : 'The browser rejects unsupported messages, then accepts a corrected task.' }, findings: [] };
}

for (const shared of [false, true]) {
  const label = shared ? 'shared' : 'ordinary';

  for (const mode of ['provided', 'synthetic']) {
    test(`${label} review exposes exact ${mode} data and records its frozen identity`, async t => {
      const h = await setup(t, shared, { mode }), legacy = await h.capture();
      const snapshot = await h.capture(h.data), ledger = ledgerFor(snapshot);
      assert.deepEqual(snapshot.data, h.data);
      assert.notEqual(snapshot.data, h.data, 'The snapshot owns detached prepared-data metadata.');
      assert.deepEqual(Object.keys(snapshot.documents).sort(), [...Object.keys(legacy.documents), ...h.data.files].sort());
      assert.notEqual(snapshot.hash, legacy.hash, 'Including the original records changes the review identity.');
      const schema = tool(ledger, 'fleet_read_planning_artifact').parameters.properties.path;
      assert.deepEqual(schema.anyOf.map(item => item.const).sort(), Object.keys(snapshot.documents).sort());
      for (const name of h.data.files) {
        const original = await fs.readFile(path.join(h.workspace, name), 'utf8');
        assert.equal(snapshot.documents[name], original);
        assert.equal(await readWhole(ledger, name), original, 'Reviewer pages must preserve exact data, including Unicode and line endings.');
      }
      await readAll(ledger, snapshot);
      await submit(ledger, snapshot);
      const record = ledger.result();
      assert.equal(record.preparedDataHash, h.data.hash);
      assert.equal(record.inputHash, snapshot.hash);
      assert.equal(record.contractHash, shared ? snapshot.contractHash : snapshot.quality.hash);
      await h.check(snapshot);
      assert.equal((await h.capture(h.data)).hash, snapshot.hash, 'Unchanged frozen inputs retain their identity.');
    });

    test(`${label} approval requires every ${mode} data file, including its manifest`, async t => {
      const h = await setup(t, shared, { mode }), snapshot = await h.capture(h.data);
      for (const missing of h.data.files) {
        const ledger = ledgerFor(snapshot);
        await readAll(ledger, snapshot, [missing]);
        await assert.rejects(submit(ledger, snapshot), error => {
          assert.ok(error.message.includes(missing), `Unread data must be named: ${error.message}`);
          return true;
        });
        assert.throws(() => ledger.result(), /did not submit/);
        await readWhole(ledger, missing);
        await submit(ledger, snapshot);
        assert.equal(ledger.result().preparedDataHash, h.data.hash);
      }
    });

    test(`${label} capture and final approval checks reject changed or missing ${mode} data`, async t => {
      const h = await setup(t, shared, { mode }), snapshot = await h.capture(h.data);
      const ledger = ledgerFor(snapshot);
      await readAll(ledger, snapshot);
      await submit(ledger, snapshot);
      for (const name of h.data.files) {
        const file = path.join(h.workspace, name), original = await fs.readFile(file);
        await fs.writeFile(file, Buffer.concat([original, Buffer.from('\nchanged source assumptions')]));
        await assert.rejects(h.capture(h.data), /changed|integrity|prepared/i);
        await assert.rejects(h.check(snapshot), /changed|integrity|prepared/i);
        assert.equal(await readWhole(ledger, name), original.toString('utf8'), 'The in-memory reviewer remains bound to the original data.');
        await fs.rm(file);
        await assert.rejects(h.capture(h.data), /changed|integrity|prepared|ENOENT/i);
        await assert.rejects(h.check(snapshot), /changed|integrity|prepared|ENOENT/i);
        await fs.writeFile(file, original);
      }
      await h.check(snapshot);
    });
  }

  test(`${label} partial and tail-only prepared-data reads cannot authorize approval`, async t => {
    const body = 'TASK: ' + 'a'.repeat(36_001), h = await setup(t, shared, {
      inputs: [{ name: 'large.txt', kind: 'text', content: body }]
    });
    const snapshot = await h.capture(h.data), name = h.data.files[1];
    for (const offsets of [[0, 0, 0, 0], [body.length], [12_000, 24_000, 36_000], [0, 12_001, 24_001, 36_001]]) {
      const ledger = ledgerFor(snapshot);
      await readAll(ledger, snapshot, [name]);
      for (const offset of offsets) await read(ledger, name, offset);
      await assert.rejects(submit(ledger, snapshot), error => {
        assert.ok(error.message.includes(name), error.message);
        return true;
      });
      assert.throws(() => ledger.result(), /did not submit/);
      assert.equal(await readWhole(ledger, name), body);
      await submit(ledger, snapshot);
      assert.equal(ledger.result().verdict, 'approved');
    }
  });

  test(`${label} captured data bodies, hashes, modes and inventories cannot be tampered with`, async t => {
    const h = await setup(t, shared), snapshot = await h.capture(h.data), name = h.data.files[1];
    const mutations = [
      changed => { changed.documents[name] += '\nDifferent original record'; },
      changed => { changed.data.hash = '0'.repeat(64); },
      changed => { changed.data.mode = 'synthetic'; },
      changed => { changed.data.files.pop(); },
      changed => { changed.data.files.push(changed.data.files[0]); },
      changed => { delete changed.documents[name]; },
      changed => { changed.documents['inputs/unlisted.txt'] = 'Unlisted records'; },
      changed => { delete changed.data; }
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(snapshot);
      mutate(changed);
      assert.throws(() => ledgerFor(changed), /snapshot|data|inventory|identity|changed/i);
      await assert.rejects(h.check(changed), /snapshot|data|inventory|identity|changed/i);
    }
    const ledger = ledgerFor(snapshot);
    snapshot.documents[name] = 'Caller replaced data after ledger creation';
    snapshot.data.hash = 'f'.repeat(64);
    h.data.files.length = 0;
    assert.equal(await readWhole(ledger, name), suppliedInputs[0].content, 'The ledger owns detached metadata and contents.');
  });

  test(`${label} data visibility is restricted to the exact frozen file list`, async t => {
    const h = await setup(t, shared), snapshot = await h.capture(h.data), ledger = ledgerFor(snapshot);
    await fs.writeFile(path.join(h.workspace, 'inputs/unlisted.txt'), 'Unattached content');
    await fs.mkdir(path.join(h.workspace, 'data'));
    await fs.writeFile(path.join(h.workspace, 'data/synthetic-data.json'), 'Unvalidated data');
    for (const name of ['inputs/unlisted.txt', 'data/synthetic-data.json', 'data/README.md', '../inputs/manifest.json',
      path.join(h.workspace, h.data.files[1]), '.fleet/packet.json', 'planning-review.json']) {
      await assert.rejects(read(ledger, name), /not available/);
      assert.equal(Object.hasOwn(snapshot.documents, name), false);
    }
  });

  test(`${label} capture rejects data changed after its initial integrity check`, async t => {
    const h = await setup(t, shared), source = path.join(h.workspace, h.data.files[1]), open = fs.open.bind(fs);
    const target = await fs.realpath(path.join(h.workspace, 'requirements.md'));
    let changed = false;
    t.mock.method(fs, 'open', async (file, ...args) => {
      const handle = await open(file, ...args);
      if (String(file) === target && !changed) {
        changed = true;
        await fs.appendFile(source, '\nChanged while planning documents were captured');
      }
      return handle;
    });
    const [capture] = await Promise.allSettled([h.capture(h.data)]);
    assert.equal(changed, true, 'The source mutation must occur during snapshot capture.');
    assert.equal(capture.status, 'rejected', 'Capture must reject the changed prepared source.');
    assert.match(capture.reason.message, /changed|integrity|prepared|snapshot/i);
  });

  test(`${label} capture rechecks workspace data after retaining its last prepared file`, async t => {
    const h = await setup(t, shared), source = path.join(h.workspace, h.data.files[1]);
    const last = await fs.realpath(path.join(h.workspace, h.data.files.at(-1))), open = fs.open.bind(fs);
    let changed = false;
    t.mock.method(fs, 'open', async (file, ...args) => {
      const handle = await open(file, ...args);
      if (String(file) === last && !changed) {
        const close = handle.close.bind(handle);
        handle.close = async () => {
          await close();
          if (!changed) { changed = true; await fs.appendFile(source, '\nChanged after data capture'); }
        };
      }
      return handle;
    });
    const [capture] = await Promise.allSettled([h.capture(h.data)]);
    assert.equal(changed, true, 'The original captured bytes must be followed by actual workspace drift.');
    assert.equal(capture.status, 'rejected', 'Capture must recheck prepared source after reading it.');
    assert.match(capture.reason.message, /changed|integrity|prepared|snapshot/i);
  });

  test(`${label} reviewer supports a complete 256 KiB supplied file beyond planning-document limits`, async t => {
    const body = 'TASK: ' + 'x'.repeat(256 * 1024 - 6), h = await setup(t, shared, {
      inputs: [{ name: 'maximum.txt', kind: 'file', content: body }]
    });
    assert.equal(Buffer.byteLength(body), 256 * 1024);
    const snapshot = await h.capture(h.data), ledger = ledgerFor(snapshot);
    assert.equal(await readWhole(ledger, h.data.files[1]), body);
    await readAll(ledger, snapshot);
    await submit(ledger, snapshot);
    assert.equal(ledger.result().preparedDataHash, h.data.hash);
    await h.check(snapshot);
  });

  test(`${label} valid synthetic data has its own bounded budget outside the encoded planning block`, async t => {
    const maximum = 2 * 1024 * 1024;
    const fixture = structuredClone(syntheticDataFixture);
    fixture.records.push({ message: '' });
    const fixed = JSON.stringify(fixture);
    fixture.records.at(-1).message = 'x'.repeat(maximum - Buffer.byteLength(fixed));
    const synthetic = { 'data/synthetic-data.json': JSON.stringify(fixture),
      'data/README.md': '# Synthetic assumptions\n' + '\u0001'.repeat(maximum - Buffer.byteLength('# Synthetic assumptions\n')) };
    assert.ok(Object.values(synthetic).every(body => Buffer.byteLength(body) === maximum));
    assert.ok(Buffer.byteLength(JSON.stringify(synthetic)) > 6_000_000, 'Escaping valid prepared text exceeds the unrelated old planning budget.');
    const h = await setup(t, shared, { mode: 'synthetic', synthetic }), snapshot = await h.capture(h.data), ledger = ledgerFor(snapshot);
    for (const [name, body] of Object.entries(synthetic)) assert.equal(await readWhole(ledger, name), body);
    await readAll(ledger, snapshot);
    await submit(ledger, snapshot);
    assert.equal(ledger.result().preparedDataHash, h.data.hash);
    await h.check(snapshot);
  });

  test(`${label} legacy planning snapshots retain their original inventory and omit data identity`, async t => {
    const h = await setup(t, shared), snapshot = await h.capture(), ledger = ledgerFor(snapshot);
    assert.equal(Object.hasOwn(snapshot, 'data'), false);
    assert.equal(Object.keys(snapshot.documents).length, shared ? 7 : 11);
    for (const name of h.data.files) await assert.rejects(read(ledger, name), /not available/);
    await readAll(ledger, snapshot);
    await submit(ledger, snapshot);
    assert.equal(Object.hasOwn(ledger.result(), 'preparedDataHash'), false);
    await fs.appendFile(path.join(h.workspace, h.data.files[1]), '\nUntracked by the legacy snapshot');
    await h.check(snapshot);
    assert.equal((await h.capture()).hash, snapshot.hash);
  });

  test(`${label} reviewed data identity distinguishes embedded filename separators from file boundaries`, async t => {
    const prefix = '# Synthetic fixture assumptions\n', boundary = '\0data/synthetic-data.json\0', notes = 'Fictional record notes';
    const originalJson = syntheticDataFiles['data/synthetic-data.json'];
    const synthetic = { 'data/README.md': prefix + boundary + notes, 'data/synthetic-data.json': originalJson };
    const h = await setup(t, shared, { mode: 'synthetic', synthetic });
    // setup used the real validator and freeze operation: the initial JSON is
    // valid, and the README is ordinary UTF-8 text with literal NUL characters.
    assert.deepEqual(JSON.parse(originalJson), syntheticDataFixture);
    const snapshot = await h.capture(h.data), ledger = ledgerFor(snapshot);
    await readAll(ledger, snapshot);
    await submit(ledger, snapshot);
    assert.equal(ledger.result().verdict, 'approved');
    await h.check(snapshot);

    const changedJson = notes + boundary + originalJson;
    await fs.writeFile(path.join(h.workspace, 'data/README.md'), prefix);
    await fs.writeFile(path.join(h.workspace, 'data/synthetic-data.json'), changedJson);
    assert.throws(() => JSON.parse(changedJson), SyntaxError, 'The previously validated fixture has actually changed.');
    // The historical delimiter hash cannot distinguish prefix+D+notes+D+JSON
    // across these two file boundaries. Keep that legacy limitation explicit;
    // the independent review identity must still bind each captured body.
    await assertBriefDataIntegrity(h.workspace, h.data);
    const changed = await h.capture(h.data);
    assert.notEqual(changed.documents['data/README.md'], snapshot.documents['data/README.md']);
    assert.notEqual(changed.documents['data/synthetic-data.json'], snapshot.documents['data/synthetic-data.json']);
    assert.notEqual(changed.hash, snapshot.hash, 'Different captured file boundaries need different review identities.');
    await assert.rejects(h.check(snapshot), /inputs changed|snapshot changed/i);
  });
}
