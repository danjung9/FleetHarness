import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPlannedRecoveryJourneys, assertPlannedUxStructure, parseQualityPlan, parseUxSpec, qualityContractGuide } from '../dist-electron/harness/quality-contract.js';

const acceptance = [{ id: 'R1', requirement: 'Create tasks and recover from empty titles.', method: 'automated', scenario: 'Save a task after correcting invalid input.' }];
const screen = screenId => ({ action: 'expectScreen', screenId });
const click = selector => ({ action: 'click', selector });
const result = { action: 'expectText', selector: '#result', text: 'Saved: Inspect pump' };
const failure = { action: 'expectText', selector: '#error', text: 'Enter a title.' };
const correction = { action: 'fill', selector: '#title', value: 'Inspect pump' };

function legacy() {
  return {
    schemaVersion: 1, audience: 'Maintenance staff', primaryTask: 'Create a task', successOutcome: 'The saved task appears in the list',
    screens: [{ name: 'Tasks', purpose: 'Capture work', primaryAction: 'Save task' }],
    states: { empty: 'Offer New task.', loading: 'Prevent duplicate submission.', error: 'Explain the invalid field.', success: 'Show the saved task.' },
    persistence: 'Save tasks locally.', recovery: 'Preserve drafts while correcting input.', keyboard: 'Use labeled controls and visible focus.'
  };
}

function ux() {
  return {
    ...legacy(), schemaVersion: 2,
    structure: { pattern: 'list-detail', rationale: 'Reviewing and entering tasks need separate focused content.', entryScreenId: 'tasks',
      navigation: 'New task opens the form; Save task returns to Tasks.', persistentElements: 'A header and task navigation remain available; preserve drafts and saved work.' },
    screens: [
      { id: 'tasks', name: 'Tasks', purpose: 'Review saved work', primaryAction: 'New task', route: '/index.html', selector: '#tasks-screen',
        layout: 'Header, toolbar, then a task list in a centered column.', secondaryContent: 'Export is inside More actions.', narrowLayout: 'Wrap the toolbar; show compact task rows.' },
      { id: 'create-task', name: 'New task', purpose: 'Capture one task', primaryAction: 'Save task', route: '/new-task.html', selector: '#create-task-screen',
        layout: 'Back link, heading, then a narrow form with Save task below.', secondaryContent: 'Advanced settings reveals optional fields.', narrowLayout: 'Stack full-width labeled inputs and the save action.' }
    ]
  };
}

function journeys() {
  return [
    { id: 'create', title: 'Create a task', kind: 'primary', steps: [screen('tasks'), click('#new-task'), screen('create-task'),
      { action: 'expectHidden', selector: '#advanced-fields' }, correction, click('#save'), screen('tasks'), result] },
    { id: 'recover', title: 'Correct an empty title', kind: 'recovery', steps: [screen('tasks'), click('#new-task'), screen('create-task'),
      click('#save'), failure, correction, click('#save'), screen('tasks'), result] }
  ];
}

function plan(declaredJourneys = journeys()) {
  return { schemaVersion: 1, criteria: [{ criterionId: 'R1', disposition: 'implemented', expectedOutcome: 'Save and review tasks, correcting invalid input.',
    journeyIds: declaredJourneys.map(journey => journey.id) }], journeys: declaredJourneys };
}

test('legacy UX remains readable without structure and does not acquire screen assertions', () => {
  const original = legacy(), before = structuredClone(original);
  assert.deepEqual(parseUxSpec(original), original);
  assert.deepEqual(original, before);
  const oldJourneys = journeys().map(journey => ({ ...journey, steps: journey.steps.filter(step => step.action !== 'expectScreen') }));
  assert.doesNotThrow(() => assertPlannedUxStructure(parseUxSpec(original), oldJourneys));
  assert.throws(() => assertPlannedUxStructure(parseUxSpec(original), oldJourneys, true), /schemaVersion 2/);
  assert.throws(() => assertPlannedUxStructure(parseUxSpec(original), journeys()), /expectScreen requires/);
  assert.doesNotThrow(() => assertPlannedUxStructure(parseUxSpec(original), [], true), 'CLI has no browser structure requirement.');
  assert.throws(() => parseUxSpec({ ...original, structure: ux().structure }), /unknown field: structure/);
  assert.throws(() => parseUxSpec({ ...original, screens: [{ ...original.screens[0], id: 'tasks' }] }), /unknown field: id/);
});

test('version 2 preserves a complete screen map and supports both pages and mutually exclusive same-route views', () => {
  for (const routes of [['/index.html', '/new-task.html'], ['/tasks?sort=due#list', '/tasks?sort=due#create'], ['/index.html', '/index.html'], ['/', '/tasks/new']]) {
    const original = ux();
    original.screens.forEach((screen, index) => { screen.route = routes[index]; });
    const before = structuredClone(original), parsed = parseUxSpec(original);
    assert.deepEqual(parsed, original);
    assert.deepEqual(original, before);
    assert.doesNotThrow(() => assertPlannedUxStructure(parsed, journeys(), true));
  }
});

test('one focused screen is a valid explicit structure without a page-count quota', () => {
  const focused = ux();
  focused.structure.pattern = 'single-task';
  focused.structure.rationale = 'Only one focused task is needed.';
  focused.screens = [focused.screens[0]];
  const declared = journeys();
  declared[0].steps = [screen('tasks'), correction, click('#save'), result];
  declared[1].steps = [screen('tasks'), click('#save'), failure, correction, click('#save'), result];
  assert.deepEqual(parseUxSpec(focused), focused);
  assert.doesNotThrow(() => assertPlannedUxStructure(focused, declared, true));
  assert.doesNotThrow(() => assertPlannedUxStructure(focused, [], true), 'A CLI may supply a v2 UX specification without browser journeys.');
});

test('version 2 rejects missing, duplicate and unknown structure fields before implementation', () => {
  const mutations = [
    value => { delete value.structure; },
    value => { value.structure.pattern = 'everything-on-one-page'; },
    value => { value.structure.entryScreenId = 'unknown'; },
    value => { value.structure.entryScreenId = 'bad/id'; },
    value => { value.structure.extra = 'ignored'; },
    value => { value.screens[1].id = value.screens[0].id; },
    value => { value.screens[1].name = ' ' + value.screens[0].name + ' '; },
    value => { value.screens[1].selector = ' ' + value.screens[0].selector + ' '; },
    value => { value.screens[0].selector = '#shell >> #tasks'; },
    value => { value.screens[0].id = 'bad/id'; },
    value => { value.screens[0].unknown = true; },
    value => { value.screens[0].layout = 'x'.repeat(4_001); },
    value => { value.screens[0].selector = 'x'.repeat(513); },
    value => { value.screens[0].route = '/' + 'x'.repeat(1000); },
    value => { value.screens = []; },
    value => { value.schemaVersion = 3; }
  ];
  for (const field of ['pattern', 'rationale', 'entryScreenId', 'navigation', 'persistentElements']) {
    mutations.push(value => { delete value.structure[field]; });
    mutations.push(value => { value.structure[field] = ' '; });
  }
  for (const field of ['id', 'name', 'purpose', 'primaryAction', 'route', 'selector', 'layout', 'secondaryContent', 'narrowLayout']) {
    mutations.push(value => { delete value.screens[0][field]; });
    mutations.push(value => { value.screens[0][field] = ' '; });
  }
  for (const mutate of mutations) {
    const value = ux(); mutate(value);
    assert.throws(() => parseUxSpec(value), String(mutate));
  }
});

test('screen routes must be canonical same-origin paths while queries and fragments are allowed', () => {
  const invalid = [
    'https://example.com/tasks', '//example.com/tasks', 'tasks', '/a/../tasks', '/a/./tasks', '/%2e%2e/tasks', '/a/%2e/tasks',
    '/\\example.com/tasks', '/tasks\\new', '/tasks\n', '/tasks\tnew', '/tasks\u0000new', '/tasks\u007fnew', '/task name', ' /tasks',
    '/tasks?', '/tasks#'
  ];
  for (const route of invalid) {
    const value = ux(); value.screens[0].route = route;
    assert.throws(() => parseUxSpec(value), undefined, JSON.stringify(route));
  }
  for (const route of ['/index.html', '/', '/tasks/new', '/tasks?sort=due', '/tasks#new', '/tasks?sort=due#new', '/tasks?label=two%20words']) {
    const value = ux(); value.screens[0].route = route;
    assert.equal(parseUxSpec(value).screens[0].route, route);
  }
});

test('screen assertions require entry-first navigation, known screens and complete coverage across journeys', () => {
  const value = parseUxSpec(ux()), original = journeys(), before = structuredClone(original);
  assert.doesNotThrow(() => assertPlannedUxStructure(value, original, true));
  assert.deepEqual(original, before);
  const invalid = [
    [declared => { declared[0].steps.shift(); }, /must start with expectScreen/],
    [declared => { declared[1].steps[0] = screen('create-task'); }, /must start with expectScreen/],
    [declared => { declared[0].steps[2] = screen('unknown'); }, /unknown screen/],
    [declared => { declared[0].steps.splice(1, 1); }, /must navigate/],
    [declared => { declared[0].steps[1] = { action: 'expectVisible', selector: '#new-task' }; }, /must navigate/],
    [declared => { declared.forEach(journey => { journey.steps = journey.steps.filter(step => !(step.action === 'expectScreen' && step.screenId === 'create-task')); }); }, /Missing screens: create-task/]
  ];
  for (const [mutate, error] of invalid) {
    const declared = journeys(); mutate(declared);
    assert.throws(() => assertPlannedUxStructure(value, declared, true), error);
  }
  const aggregate = journeys();
  aggregate[1].steps = [screen('tasks'), click('#save'), failure, correction, click('#save'), result];
  assert.doesNotThrow(() => assertPlannedUxStructure(value, aggregate, true), 'Each screen needs coverage in the journey set, not in every journey.');
});

test('each screen change needs an interaction since the previous screen assertion', () => {
  for (const action of [click('#new-task'), { action: 'press', selector: '#new-task', key: 'Enter' }, { action: 'select', selector: '#view', value: 'new' },
    { action: 'check', selector: '#new-mode' }, correction, { action: 'reload' }, { action: 'expectHttpError', selector: '#new-task', path: '/tasks', method: 'POST', status: 422 },
    { action: 'expectDownload', selector: '#export' }]) {
    const declared = journeys(); declared[0].steps[1] = action;
    assert.doesNotThrow(() => assertPlannedUxStructure(ux(), declared, true), action.action);
  }
  const repeated = journeys();
  repeated[0].steps.splice(2, 0, screen('tasks'));
  assert.throws(() => assertPlannedUxStructure(ux(), repeated, true), /must navigate/,
    'An interaction consumed by one screen assertion cannot justify a subsequent view change.');
  const reloadToEntry = journeys();
  reloadToEntry[0].steps = [screen('tasks'), click('#new-task'), screen('create-task'), correction, click('#save'),
    screen('create-task'), { action: 'reload' }, screen('tasks'), result];
  assert.doesNotThrow(() => assertPlannedUxStructure(ux(), reloadToEntry, true),
    'Reload may return to the entry view while saved records remain available.');
});

test('expectScreen and expectHidden parse strictly and cannot replace primary literal outcomes or recovery evidence', () => {
  const parsed = parseQualityPlan(plan(), acceptance);
  assert.deepEqual(parsed.journeys, journeys());
  assert.doesNotThrow(() => assertPlannedRecoveryJourneys(parsed.journeys));
  for (const invalid of [
    { action: 'expectScreen', selector: '#tasks', screenId: 'tasks' },
    { action: 'expectScreen', screenId: 'bad/id' },
    { action: 'expectScreen' },
    { action: 'expectHidden', selector: '#advanced', screenId: 'tasks' },
    { action: 'expectHidden', selector: ' ' }
  ]) {
    const changed = plan(); changed.journeys[0].steps[0] = invalid;
    assert.throws(() => parseQualityPlan(changed, acceptance));
  }
  for (const assertions of [[screen('tasks')], [{ action: 'expectHidden', selector: '#advanced' }], [{ action: 'expectVisible', selector: '#result' }, screen('tasks')]]) {
    const changed = plan(); changed.journeys[0].steps = [screen('tasks'), click('#save'), ...assertions];
    assert.throws(() => parseQualityPlan(changed, acceptance), /must interact|literal outcome/);
  }
  const weakRecovery = { id: 'recover', title: 'Correction must be observed', kind: 'recovery', steps: [screen('tasks'), click('#save'),
    { action: 'expectHidden', selector: '#result' }, correction, click('#save'), result] };
  assert.throws(() => assertPlannedRecoveryJourneys([weakRecovery]), /recovery must act/);
});

test('the planning guide provides a parseable multipage UX and journey example with CLI compatibility', () => {
  const planExample = JSON.parse(qualityContractGuide.match(/Example shape[^\n]*\n(\{[\s\S]*?\n\})\n\n## ux-spec\.json/)[1]);
  const uxExample = JSON.parse(qualityContractGuide.match(/routing requirement:\n(\{[\s\S]*?\n\})/)[1]);
  const exampleAcceptance = [{ ...acceptance[0], id: 'UCcustom-1' }];
  const example = parseQualityPlan({ ...planExample, schemaVersion: 1,
    criteria: planExample.criteria.map(({ capabilityIds, ...criterion }) => criterion) }, exampleAcceptance);
  const parsedUx = parseUxSpec(uxExample);
  assert.equal(parsedUx.schemaVersion, 2);
  assert.equal(new Set(parsedUx.screens.map(screen => screen.route)).size, 2);
  assert.doesNotThrow(() => assertPlannedUxStructure(parsedUx, example.journeys, true));
  assert.doesNotThrow(() => assertPlannedRecoveryJourneys(example.journeys));
  assert.match(qualityContractGuide, /there is no single-page output requirement/);
  assert.match(qualityContractGuide, /CLI delivery may retain schemaVersion 1/);
});
