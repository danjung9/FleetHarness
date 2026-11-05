import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LearningStore } from '../dist-electron/electron/learning-store.js';
import { LessonMemory } from '../dist-electron/electron/lesson-memory.js';

const time = '2026-11-05T12:00:00.000Z';
const query = { taskFamily: 'scheduling', query: 'capacity', cohortKey: 'current-cohort', profileIds: ['architect'] };
const prominentStatement = 'Capacity capacity capacity constraints were checked.';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'appyard-memory-retrieval-'));
  const store = new LearningStore(root);
  await store.init();
  t.after(async () => { store.close(); await fs.rm(root, { recursive: true, force: true }); });
  return { store, memory: new LessonMemory(store) };
}

function evidence(store, id, { cohortKey = 'current-cohort', profileId = 'architect', passed = true } = {}) {
  store.createExperiment({ id, projectId: 'project', lineageId: id, cohortKey, partition: 'development', mode: 'paired', status: 'review',
    baselineProfileId: profileId, candidateIds: [], createdAt: time, updatedAt: time });
  const candidateId = `${id}-candidate`;
  store.putCandidate({ id: candidateId, experimentId: id, profileId, profileVersion: '1', baseline: true,
    status: 'running', createdAt: time, updatedAt: time });
  store.recordOutcome(candidateId, { mandatoryPassed: passed, requiredScopePassed: passed, withinBudget: true,
    terminalReason: passed ? 'completed' : 'verification-failed', durationMs: 2, costUsd: null, repairCount: 0,
    sourceHash: `${id}-source`, contractHash: `${id}-contract`, evidenceHash: `${id}-evidence`, evaluatorVersion: '1', recordedAt: time });
  return { experimentId: id, candidateId, outcome: passed ? 'supported' : 'contradicted' };
}

function lesson(memory, key, sources, overrides = {}) {
  const taskFamily = overrides.taskFamily ?? 'scheduling';
  let result;
  for (const source of sources) result = memory.recordObservation({ taskFamily, lessonKey: key,
    statement: 'Capacity constraints were checked before selecting a feasible schedule for the current workload.',
    conditions: [`Task family: ${taskFamily}`], ...overrides, ...source });
  return result;
}

const ineligibleCases = [
  { name: 'other task families', claim: { taskFamily: 'billing' } },
  { name: 'other cohorts', cohorts: ['other-cohort', 'other-cohort'] },
  { name: 'corroboration split across cohorts', cohorts: ['current-cohort', 'other-cohort'] },
  { name: 'other architecture profiles', profileId: 'other-architect' },
  { name: 'proposed lessons', sourceCount: 1 },
  { name: 'model hypotheses', claim: { explanation: 'hypothesis' } },
  { name: 'contradicted lessons', contradicted: true },
  { name: 'retired lessons', retired: true },
  { name: 'corroboration lost after lineage exclusion', excludeLineageIds: ['distractor-1'] },
];

for (const scenario of ineligibleCases) {
  test(`retrieval reaches eligible evidence beyond thirty higher-ranked hits from ${scenario.name}`, async t => {
    const { store, memory } = await fixture(t);
    const sources = Array.from({ length: scenario.sourceCount ?? 2 }, (_, index) => evidence(store, `distractor-${index}`, {
      cohortKey: scenario.cohorts?.[index], profileId: scenario.profileId,
    }));
    if (scenario.contradicted) sources.push(evidence(store, 'distractor-failed', { passed: false }));
    store.transaction(() => {
      for (let index = 0; index < 35; index++) {
        const rejected = lesson(memory, `distractor-${index}`, sources, { statement: prominentStatement, ...scenario.claim });
        if (scenario.retired) memory.retire(rejected.id);
      }
    });
    const wanted = lesson(memory, 'eligible-tail', [evidence(store, 'eligible-a'), evidence(store, 'eligible-b')]);

    const retrieved = memory.retrieve({ ...query, excludeLineageIds: scenario.excludeLineageIds });
    assert.deepEqual(retrieved.lessons.map(item => item.id), [wanted.id]);
    assert.ok(retrieved.text.includes(wanted.statement));
    assert.ok(!retrieved.text.includes(prominentStatement), 'Ineligible advice must not enter the prompt');
  });
}

test('retrieval continues past thirty lessons that cannot fit the remaining character budget', async t => {
  const { store, memory } = await fixture(t);
  const sources = [evidence(store, 'one'), evidence(store, 'two')];
  const first = lesson(memory, 'highest-ranked', sources, {
    statement: 'Capacity '.repeat(100).trim(),
    conditions: Array.from({ length: 5 }, () => 'A bounded observation. '.repeat(9).trim()),
  });
  store.transaction(() => {
    for (let index = 0; index < 35; index++) lesson(memory, `too-large-${index}`, sources, {
      statement: 'Capacity '.repeat(40) + 'A bounded workload was observed. '.repeat(24).trim(),
      conditions: Array.from({ length: 8 }, () => 'The operating condition was checked. '.repeat(6).trim()),
    });
  });
  const tail = lesson(memory, 'small-tail', sources, { statement: 'Capacity checks covered the selected schedule.' });

  const retrieved = memory.retrieve(query);
  assert.deepEqual(retrieved.lessons.map(item => item.id), [first.id, tail.id]);
  assert.ok(retrieved.text.length <= 4000);
  assert.ok(!retrieved.text.includes('A bounded workload was observed.'));
});

test('equal relevance has a stable three-lesson selection after evidence is recorded again', async t => {
  const { store, memory } = await fixture(t);
  const sources = [evidence(store, 'one'), evidence(store, 'two')];
  const lessons = Array.from({ length: 6 }, (_, index) => lesson(memory, `tie-${index}`, sources));
  const expectedIds = lessons.map(item => item.id).sort().slice(0, 3);
  const before = memory.retrieve(query);
  assert.deepEqual(before.lessons.map(item => item.id), expectedIds);
  assert.ok(before.text.length <= 4000);

  for (const item of [...lessons].sort((a, b) => b.id.localeCompare(a.id))) lesson(memory, item.key, sources);
  const after = memory.retrieve(query);
  assert.deepEqual(after.lessons.map(item => item.id), expectedIds);
  assert.equal(after.text, before.text);
});

test('blank and punctuation-only queries preserve exact-family insertion order', async t => {
  const { store, memory } = await fixture(t);
  const sources = [evidence(store, 'one'), evidence(store, 'two')];
  lesson(memory, 'other-family', sources, { taskFamily: 'billing' });
  const first = lesson(memory, 'first-scheduling', sources);
  lesson(memory, 'uncorroborated', sources.slice(0, 1));
  const second = lesson(memory, 'second-scheduling', sources);
  for (const text of ['', '   ', '" * () : ! ?']) {
    const retrieved = memory.retrieve({ ...query, query: text });
    assert.deepEqual(retrieved.lessons.map(item => item.id), [first.id, second.id]);
  }
});

test('snapshots persist recovered evidence and stay immutable after reopening and retirement', async t => {
  const { store, memory } = await fixture(t);
  const obsoleteSources = [evidence(store, 'obsolete-a', { cohortKey: 'old-cohort' }), evidence(store, 'obsolete-b', { cohortKey: 'old-cohort' })];
  store.transaction(() => {
    for (let index = 0; index < 35; index++) lesson(memory, `obsolete-${index}`, obsoleteSources, { statement: prominentStatement });
  });
  const wanted = lesson(memory, 'eligible-tail', [evidence(store, 'eligible-a'), evidence(store, 'eligible-b')]);
  const snapshot = memory.snapshot({ ...query, id: 'frozen-memory', createdAt: time });
  assert.deepEqual(snapshot.lessonIds, [wanted.id]);
  assert.equal(snapshot.contentHash, createHash('sha256').update(snapshot.text).digest('hex'));
  assert.ok(snapshot.text.includes(wanted.statement));

  store.close();
  await store.init();
  assert.deepEqual(store.getMemorySnapshot(snapshot.id), snapshot);
  assert.deepEqual(store.listEdges().filter(edge => edge.fromType === 'memory' && edge.fromId === snapshot.id), [
    { fromType: 'memory', fromId: snapshot.id, relation: 'retrieved', toType: 'lesson', toId: wanted.id },
  ]);
  memory.retire(wanted.id);
  assert.deepEqual(memory.retrieve(query), { lessons: [], text: '' });
  assert.deepEqual(store.getMemorySnapshot(snapshot.id), snapshot);
  assert.throws(() => store.saveMemorySnapshot({ ...snapshot, text: 'Changed evidence.' }), /immutable/);
});
