import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../dist-electron/electron/storage.js';
import { ClarificationBroker, createClarificationTools } from '../dist-electron/electron/clarifications.js';

const question = { question: 'Who uses this workflow?', context: 'The primary user determines how much detail to show.', options: ['Operator', 'Analyst'], recommendation: 'Operator' };
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-clarifications-'));
  const store = new Store(root); await store.init();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = store.state.projects[0];
  project.runId = 'run-1'; project.status = 'running'; project.stages.find(stage => stage.id === 'research').status = 'active';
  let notifications = 0;
  const broker = new ClarificationBroker(store, () => { notifications++; });
  return { root, store, project, broker, notifications: () => notifications };
}

test('questions and answers persist; a human wait ends only when every question is answered', async t => {
  const { root, project, broker, notifications } = await fixture(t);
  const original = { title: project.title, description: project.description, criteria: structuredClone(project.criteria) };
  const questions = await broker.request(project, 'research', [question, { question: 'Which output matters first?', context: 'This establishes the workflow priority.' }]);
  let resumed = false;
  const wait = broker.wait(project, project.runId, 'research', new AbortController().signal).then(() => { resumed = true; });
  assert.equal(broker.pending(project, project.runId, 'research'), true);
  const saved = JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8')).projects[0];
  assert.equal(saved.conversation.questions.length, 2);
  assert.equal(saved.conversation.questions[0].answerType, 'single_choice');
  assert.equal(saved.conversation.questions[1].answerType, 'text');
  assert.match(saved.stages.find(stage => stage.id === 'research').detail, /Waiting/);
  await broker.answer(project.id, questions[0].id, '  Operator  ');
  await Promise.resolve(); assert.equal(resumed, false);
  assert.match(broker.context(project, project.runId), /Operator/);
  assert.equal(broker.context(project, 'other-run'), '');
  await broker.answer(project.id, questions[1].id, 'The task list'); await wait;
  assert.equal(broker.pending(project, project.runId, 'research'), false);
  assert.equal(questions[0].answer, 'Operator');
  assert.deepEqual({ title: project.title, description: project.description, criteria: project.criteria }, original);
  assert.equal(project.conversation.messages.filter(message => message.role === 'user').length, 2);
  assert.ok(notifications() >= 3);
  assert.match(broker.context(project, project.runId), /do not authorize new scope/);
});

test('answering before wait is registered resumes immediately; duplicate answers are rejected', async t => {
  const { project, broker } = await fixture(t);
  const [q] = await broker.request(project, 'research', [question]);
  await broker.answer(project.id, q.id, 'Analyst');
  await broker.wait(project, project.runId, 'research', new AbortController().signal);
  await assert.rejects(broker.answer(project.id, q.id, 'Operator'), /no longer waiting/);
  assert.equal(q.answer, 'Analyst');
});

test('validates question bounds atomically and limits persistent rounds per phase and run', async t => {
  const { store, project, broker } = await fixture(t);
  for (const questions of [[], Array(4).fill(question), [{ ...question, question: ' ' }], [{ ...question, context: 'x'.repeat(1501) }], [{ ...question, options: ['same', 'same'] }], [question, { question: 'Valid?', context: '' }]]) {
    await assert.rejects(broker.request(project, 'research', questions));
    assert.equal(project.conversation?.questions.length ?? 0, 0);
  }
  const [first] = await broker.request(project, 'research', [question]);
  await assert.rejects(broker.request(project, 'research', [question]), /current clarification/);
  await assert.rejects(broker.answer(project.id, first.id, 'x'.repeat(8001)), /8000/);
  assert.equal(first.status, 'pending');
  await broker.answer(project.id, first.id, 'Operator');
  const reconnected = new ClarificationBroker(store, () => {});
  const [second] = await reconnected.request(project, 'research', [question]);
  assert.equal(second.round, 2);
  await reconnected.answer(project.id, second.id, 'Operator');
  await assert.rejects(reconnected.request(project, 'research', [question]), /two clarification rounds/);
  project.stages.find(stage => stage.id === 'research').status = 'complete';
  project.stages.find(stage => stage.id === 'plan').status = 'active';
  assert.equal((await reconnected.request(project, 'plan', [question]))[0].round, 1);
});

test('cancel wakes all waiters, records cancellation, and rejects late answers', async t => {
  const { root, project, broker } = await fixture(t);
  const [q] = await broker.request(project, 'research', [question]);
  const waits = [1, 2].map(() => assert.rejects(broker.wait(project, project.runId, 'research', new AbortController().signal), /cancelled/));
  await broker.cancel(project, project.runId); await Promise.all(waits);
  assert.equal(q.status, 'cancelled');
  await assert.rejects(broker.answer(project.id, q.id, 'Analyst'), /no longer waiting/);
  await assert.rejects(broker.wait(project, project.runId, 'research', new AbortController().signal), /cancelled/);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8')).projects[0].conversation.questions[0].status, 'cancelled');
  const count = project.conversation.messages.length;
  await broker.cancel(project, project.runId); assert.equal(project.conversation.messages.length, count);
});

test('resuming a stopped phase reopens unanswered questions while preserving answers and round limits', async t => {
  const { root, project, broker } = await fixture(t);
  const [answered, interrupted] = await broker.request(project, 'research', [question, question]);
  await broker.answer(project.id, answered.id, 'Operator');
  await broker.cancel(project, project.runId);
  project.status = 'stopped';
  await assert.rejects(broker.resume(project, project.runId, 'research'), /current running build/);
  project.status = 'running';
  await broker.resume(project, project.runId, 'research');
  assert.equal(answered.status, 'answered'); assert.equal(answered.answer, 'Operator');
  assert.equal(interrupted.status, 'pending'); assert.equal(interrupted.round, 1);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8')).projects[0].conversation.questions[1].status, 'pending');
  let resumed = false;
  const wait = broker.wait(project, project.runId, 'research', new AbortController().signal).then(() => { resumed = true; });
  await Promise.resolve(); assert.equal(resumed, false);
  await broker.answer(project.id, interrupted.id, 'Analyst'); await wait;
  const [secondRound] = await broker.request(project, 'research', [question]);
  assert.equal(secondRound.round, 2);
  await broker.answer(project.id, secondRound.id, 'Operator');
  await broker.cancel(project, project.runId); await broker.resume(project, project.runId, 'research');
  await assert.rejects(broker.request(project, 'research', [question]), /two clarification rounds/);
  assert.equal(project.conversation.messages.filter(message => message.role === 'user').length, 3);
});

test('resume is scoped to the current phase and run; later phases do not reopen old questions', async t => {
  const { project, broker } = await fixture(t);
  const [research] = await broker.request(project, 'research', [question]);
  await broker.cancel(project, project.runId);
  const priorRun = { ...research, id: 'older-question', runId: 'older-run' };
  project.conversation.questions.push(priorRun);
  project.stages.find(stage => stage.id === 'research').status = 'complete';
  project.stages.find(stage => stage.id === 'plan').status = 'active';
  await broker.resume(project, project.runId, 'plan');
  const [planning] = await broker.request(project, 'plan', [question]);
  await broker.cancel(project, project.runId);
  await broker.resume(project, project.runId, 'plan');
  assert.equal(planning.status, 'pending'); assert.equal(research.status, 'cancelled'); assert.equal(priorRun.status, 'cancelled');
  await broker.cancel(project, project.runId);
  await broker.resume(project, project.runId, 'build');
  assert.equal(planning.status, 'cancelled');
  await assert.rejects(broker.resume(project, 'older-run', 'research'), /current running build/);
  await assert.rejects(broker.resume(structuredClone(project), project.runId, 'plan'), /current running build/);
});

test('questions cancelled on app restart can resume and accept answers in a fresh broker', async t => {
  const { root, project, broker } = await fixture(t);
  const [interrupted] = await broker.request(project, 'research', [question]);
  const restored = new Store(root); await restored.init();
  const restoredProject = restored.project(project.id);
  assert.equal(restoredProject.conversation.questions[0].status, 'cancelled');
  restoredProject.status = 'running';
  restoredProject.stages.find(stage => stage.id === 'research').status = 'active';
  const reconnected = new ClarificationBroker(restored, () => {});
  await reconnected.resume(restoredProject, restoredProject.runId, 'research');
  const wait = reconnected.wait(restoredProject, restoredProject.runId, 'research', new AbortController().signal);
  await reconnected.answer(restoredProject.id, interrupted.id, 'Analyst'); await wait;
  assert.match(reconnected.context(restoredProject, restoredProject.runId), /Analyst/);
});

test('failed resume persistence leaves questions cancelled and allows a later retry', async t => {
  const { project, store, broker } = await fixture(t);
  const [interrupted] = await broker.request(project, 'research', [question]);
  await broker.cancel(project, project.runId);
  const previousDetail = project.stages.find(stage => stage.id === 'research').detail;
  const save = store.save.bind(store);
  store.save = async () => { throw new Error('Disk unavailable'); };
  await assert.rejects(broker.resume(project, project.runId, 'research'), /Disk unavailable/);
  assert.equal(interrupted.status, 'cancelled');
  assert.equal(project.stages.find(stage => stage.id === 'research').detail, previousDetail);
  await assert.rejects(broker.request(project, 'research', [question]), /cancelled/);
  store.save = save;
  await broker.resume(project, project.runId, 'research');
  await broker.answer(project.id, interrupted.id, 'Operator');
  assert.equal(interrupted.status, 'answered');
});

test('answers remain blocked during resume persistence and a concurrent stop keeps them cancelled', async t => {
  const { project, store, broker } = await fixture(t);
  const [interrupted] = await broker.request(project, 'research', [question]);
  await broker.cancel(project, project.runId);
  const save = store.save.bind(store);
  let release;
  const saving = new Promise(resolve => { release = resolve; });
  let firstSave = true;
  store.save = async () => { if (firstSave) { firstSave = false; await saving; } await save(); };
  const resuming = assert.rejects(broker.resume(project, project.runId, 'research'), /stopped before/);
  await assert.rejects(broker.answer(project.id, interrupted.id, 'Operator'), /cancelled/);
  await assert.rejects(broker.resume(project, project.runId, 'research'), /already resuming/);
  await broker.cancel(project, project.runId);
  release(); await resuming;
  assert.equal(interrupted.status, 'cancelled');
  await assert.rejects(broker.request(project, 'research', [question]), /cancelled/);
});

test('abort interrupts a human wait promptly and stale runs or inactive phases cannot accept answers', async t => {
  const { project, broker } = await fixture(t);
  const [q] = await broker.request(project, 'research', [question]);
  const controller = new AbortController();
  const interrupted = assert.rejects(broker.wait(project, project.runId, 'research', controller.signal), /stopped by you/);
  controller.abort(); await interrupted;
  await assert.rejects(broker.wait(project, project.runId, 'research', controller.signal), /stopped by you/);
  project.runId = 'run-2';
  await assert.rejects(broker.answer(project.id, q.id, 'Operator'), /no longer belongs/);
  assert.equal(q.status, 'pending');
  await broker.cancel(project, 'run-1');
  const [current] = await broker.request(project, 'research', [question]);
  assert.equal(current.round, 1);
  project.stages.find(stage => stage.id === 'research').status = 'complete';
  await assert.rejects(broker.answer(project.id, current.id, 'Operator'), /no longer belongs/);
  await assert.rejects(broker.request(project, 'plan', [question]), /no longer belongs/);
});

test('persistence failure rejects waiting callers instead of silently continuing', async t => {
  const { project, store, broker } = await fixture(t);
  const [q] = await broker.request(project, 'research', [question]);
  const failedWait = assert.rejects(broker.wait(project, project.runId, 'research', new AbortController().signal), /Could not save/);
  store.save = async () => { throw new Error('Disk unavailable'); };
  await assert.rejects(broker.answer(project.id, q.id, { selectedOptions: ['Operator'], text: 'Start with the operator workflow.' }), /Disk unavailable/); await failedWait;
  assert.equal(q.status, 'pending');
  assert.equal(q.answer, undefined);
  assert.equal(q.response, undefined);
  assert.equal(project.conversation.messages.filter(message => message.role === 'user').length, 0);
  assert.match(project.stages.find(stage => stage.id === 'research').detail, /Waiting/);
});

test('a wait registered during answer persistence cannot resume until the answer is saved', async t => {
  const { project, store, broker } = await fixture(t);
  const [q] = await broker.request(project, 'research', [question]);
  const save = store.save.bind(store);
  let release;
  const saving = new Promise(resolve => { release = resolve; });
  store.save = async () => { await saving; await save(); };
  const answer = broker.answer(project.id, q.id, 'Operator');
  let resumed = false;
  const wait = broker.wait(project, project.runId, 'research', new AbortController().signal).then(() => { resumed = true; });
  await Promise.resolve();
  assert.equal(resumed, false);
  assert.equal(broker.pending(project, project.runId, 'research'), true);
  release(); await answer; await wait;
  assert.equal(resumed, true);
});

test('question persistence failures leave no pending orphan questions', async t => {
  const { project, store, broker } = await fixture(t);
  store.save = async () => { throw new Error('Disk unavailable'); };
  await assert.rejects(broker.request(project, 'research', [question]), /Disk unavailable/);
  assert.equal(broker.pending(project, project.runId, 'research'), false);
  assert.equal(project.conversation.questions[0].status, 'cancelled');
});

test('all answer modes preserve selections and custom text in saved answers and model context', async t => {
  const { root, project, broker } = await fixture(t);
  const questions = await broker.request(project, 'research', [
    { question: 'What does a successful handoff look like?', context: 'This determines the end of the workflow.', answerType: 'text' },
    { ...question, answerType: 'single_choice' },
    { question: 'Which outputs do you need?', context: 'Several outputs may support the same workflow.', answerType: 'multiple_choice', options: ['Task list', 'Calendar', 'CSV export'] }
  ]);
  await broker.answer(project.id, questions[0].id, { selectedOptions: [], text: '  The receiving team acknowledges every task.  ' });
  await broker.answer(project.id, questions[1].id, { selectedOptions: ['Analyst'], text: '  They prepare the operator handoff.  ' });
  await broker.answer(project.id, questions[2].id, { selectedOptions: ['CSV export', 'Task list'], text: '  Keep the same task IDs in both.  ' });
  assert.deepEqual(questions[0].response, { selectedOptions: [], text: 'The receiving team acknowledges every task.' });
  assert.equal(questions[1].answer, 'Analyst\n\nThey prepare the operator handoff.');
  assert.deepEqual(questions[2].response, { selectedOptions: ['Task list', 'CSV export'], text: 'Keep the same task IDs in both.' });
  assert.equal(questions[2].answer, '- Task list\n- CSV export\n\nKeep the same task IDs in both.');
  const saved = JSON.parse(await fs.readFile(path.join(root, 'state.json'), 'utf8')).projects[0].conversation.questions;
  assert.deepEqual(saved.map(q => q.response), questions.map(q => q.response));
  assert.deepEqual(saved.map(q => q.answerType), ['text', 'single_choice', 'multiple_choice']);
  const context = broker.context(project, project.runId);
  assert.match(context, /receiving team acknowledges/);
  assert.match(context, /Analyst/);
  assert.match(context, /CSV export/);
  assert.match(context, /same task IDs/);
  const contextAnswers = JSON.parse(context.slice(context.indexOf('\n') + 1));
  assert.deepEqual(contextAnswers.map(q => q.answerType), ['text', 'single_choice', 'multiple_choice']);
  assert.deepEqual(contextAnswers.map(q => q.response), questions.map(q => q.response));
});

test('choice questions accept custom written answers without a selection', async t => {
  const { project, broker } = await fixture(t);
  const questions = await broker.request(project, 'research', [
    { ...question, answerType: 'single_choice' },
    { ...question, answerType: 'multiple_choice' }
  ]);
  for (const q of questions) {
    await broker.answer(project.id, q.id, { selectedOptions: [], text: '  A supervisor approves each handoff.  ' });
    assert.equal(q.answer, 'A supervisor approves each handoff.');
    assert.deepEqual(q.response, { selectedOptions: [], text: 'A supervisor approves each handoff.' });
  }
});

test('explicit answer modes reject inconsistent question options before saving any questions', async t => {
  const { project, broker } = await fixture(t);
  const invalid = [
    { ...question, answerType: 'text' },
    { ...question, answerType: 'invalid' },
    { ...question, answerType: 'single_choice', options: undefined },
    { ...question, answerType: 'multiple_choice', options: undefined },
    { ...question, answerType: 'multiple_choice', options: ['Only one'] },
    { ...question, answerType: 'multiple_choice', options: ['One', 'Two', 'Three', 'Four', 'Five'] },
    { ...question, answerType: 'multiple_choice', options: [' Operator ', 'Operator'] }
  ];
  for (const value of invalid) {
    await assert.rejects(broker.request(project, 'research', [question, value]));
    assert.equal(project.conversation?.questions.length ?? 0, 0);
  }
});

test('malformed, empty, and oversized structured answers leave the question pending', async t => {
  const { project, broker } = await fixture(t);
  const [q] = await broker.request(project, 'research', [{ ...question, answerType: 'multiple_choice' }]);
  const invalid = [
    null, 1, [], {},
    { selectedOptions: [] },
    { selectedOptions: 'Operator', text: '' },
    { selectedOptions: [1], text: '' },
    { selectedOptions: [], text: null },
    { selectedOptions: ['Operator'], text: '', unexpected: true },
    { selectedOptions: [], text: ' \n ' },
    { selectedOptions: [], text: 'x'.repeat(8001) },
    { selectedOptions: ['Operator'], text: 'x'.repeat(8000) },
    { selectedOptions: ['Operator', 'Operator'], text: '' },
    { selectedOptions: ['Supervisor'], text: '' }
  ];
  for (const value of invalid) {
    await assert.rejects(broker.answer(project.id, q.id, value));
    assert.equal(q.status, 'pending');
    assert.equal(q.answer, undefined);
    assert.equal(q.response, undefined);
  }
  assert.equal(project.conversation.messages.filter(message => message.role === 'user').length, 0);
  await broker.answer(project.id, q.id, { selectedOptions: ['Operator'], text: '' });
  assert.equal(q.answer, 'Operator');
});

test('single-choice questions reject multiple selections and text questions reject selections', async t => {
  const { project, broker } = await fixture(t);
  const [single, textQuestion] = await broker.request(project, 'research', [
    { ...question, answerType: 'single_choice' },
    { question: 'Describe the handoff.', context: 'This defines the workflow.', answerType: 'text' }
  ]);
  await assert.rejects(broker.answer(project.id, single.id, { selectedOptions: ['Operator', 'Analyst'], text: '' }), /Choose one/);
  await assert.rejects(broker.answer(project.id, textQuestion.id, { selectedOptions: ['Operator'], text: 'The operator starts.' }), /written answer only/);
  assert.equal(single.status, 'pending');
  assert.equal(textQuestion.status, 'pending');
});

test('legacy questions infer their answer mode and legacy string answers remain accepted', async t => {
  const { project, broker } = await fixture(t);
  const [choice, textQuestion, legacyAnswer] = await broker.request(project, 'research', [
    question,
    { question: 'Describe the handoff.', context: 'This defines the workflow.' },
    question
  ]);
  for (const q of [choice, textQuestion, legacyAnswer]) delete q.answerType;
  await assert.rejects(broker.answer(project.id, choice.id, { selectedOptions: ['Operator', 'Analyst'], text: '' }), /Choose one/);
  await broker.answer(project.id, choice.id, { selectedOptions: ['Analyst'], text: '' });
  await broker.answer(project.id, textQuestion.id, { selectedOptions: [], text: 'The operator confirms receipt.' });
  await broker.answer(project.id, legacyAnswer.id, '  Operator  ');
  assert.equal(choice.answer, 'Analyst');
  assert.equal(textQuestion.answer, 'The operator confirms receipt.');
  assert.equal(legacyAnswer.answer, 'Operator');
  await broker.wait(project, project.runId, 'research', new AbortController().signal);
});

test('the clarification tool creates the requested answer modes and yields to the host', async t => {
  const { project, broker } = await fixture(t);
  let requested = false;
  const [tool] = createClarificationTools(broker, project, 'research', new AbortController().signal, () => { requested = true; });
  const result = await tool.execute('call-1', { questions: [
    { question: 'Describe the handoff.', context: 'This defines the workflow.', answerType: 'text' },
    { ...question, answerType: 'single_choice' },
    { ...question, answerType: 'multiple_choice' }
  ] });
  assert.equal(requested, true);
  assert.deepEqual(project.conversation.questions.map(q => q.answerType), ['text', 'single_choice', 'multiple_choice']);
  assert.deepEqual(result.details.questionIds, project.conversation.questions.map(q => q.id));
  assert.match(result.content[0].text, /End this turn now/);
  assert.equal(broker.pending(project, project.runId, 'research'), true);
});
