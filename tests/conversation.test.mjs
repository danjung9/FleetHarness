import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../dist-electron/electron/storage.js';
import { ProjectLead, briefHash } from '../dist-electron/electron/conversation.js';
import { ClarificationBroker } from '../dist-electron/electron/clarifications.js';
import { emptyConversation } from '../dist-electron/shared/conversation.js';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const never = () => new Promise(() => {});
const textOf = result => result.content.filter(item => item.type === 'text').map(item => item.text).join('\n');
function fakeSession(handler) {
  const listeners = new Set();
  return {
    prompts: [], aborts: 0, disposed: false,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    emit(event) { for (const listener of listeners) listener(event); },
    async prompt(text) {
      this.prompts.push(text); this.emit({ type: 'turn_start' });
      await handler(this, text);
      this.emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop', content: [{ type: 'text', text: 'Here is the project status.' }] } });
      this.emit({ type: 'turn_end' });
    },
    abort() { this.aborts++; return never(); },
    dispose() { this.disposed = true; }
  };
}
async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-conversation-'));
  const store = new Store(root); await store.init();
  store.state.settings = { provider: 'fixture', model: 'fixture', rememberKey: false };
  const project = store.state.projects[0], sessions = [], created = [];
  const runtime = { getModel: () => ({}), hasConfiguredAuth: () => true };
  const createSession = async config => {
    const session = fakeSession((s, text) => options.scenario?.({ session: s, text, config, project, store }));
    sessions.push(session); created.push(config);
    return { session };
  };
  const lead = new ProjectLead(store, runtime, () => {}, { createSession, limits: { timeoutMs: 3000, idleMs: 1000, maxTurns: 4 }, ...options.leadOptions });
  t.after(async () => { await lead.stopAll(); await fs.rm(root, { recursive: true, force: true }); });
  const settle = async () => { await lead.active.get(project.id)?.done; };
  const ask = async message => {
    await lead.send(project.id, message); await settle();
    assert.equal(project.conversation.status, 'idle');
    assert.equal(project.conversation.error, undefined);
  };
  return { root, store, project, sessions, created, runtime, createSession, lead, settle, ask };
}
const tool = (config, name) => {
  const found = config.customTools.find(item => item.name === name);
  assert.ok(found, `Missing ${name}`); return found;
};

for (const status of ['approved', 'delivered']) test(`project lead proposes changes to ${status} apps for confirmation`, async t => {
  const feedback = 'Keep the entered message visible when validation fails.';
  const h = await fixture(t, { scenario: async ({ config }) => {
    const propose = tool(config, 'fleet_propose_action');
    await assert.rejects(propose.execute('short', { type: 'request_changes', reason: 'Correct validation.', feedback: 'short' }), /10 to 10,000/);
    const result = await propose.execute('change', { type: 'request_changes', reason: 'Correct validation.', feedback });
    assert.match(textOf(result), /NOT been applied/);
  } });
  h.project.status = status; h.project.approvedAt = '2026-11-05T06:00:00Z'; h.project.runId = 'approved-run';
  const old = structuredClone(h.project);
  await h.ask(feedback);
  const action = h.project.conversation.actions[0];
  assert.equal(action.type, 'request_changes'); assert.equal(action.feedback, feedback); assert.equal(action.status, 'proposed');
  assert.equal(action.runId, old.runId); assert.equal(action.baseBriefHash, briefHash(old));
  assert.equal(h.project.approvedAt, old.approvedAt); assert.equal(h.project.status, old.status);
  assert.equal(h.project.runId, old.runId); assert.equal(h.project.description, old.description);
  assert.equal(JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects[0].conversation.actions[0].feedback, feedback);
});

for (const status of ['draft', 'running']) test(`project lead refuses changes for ${status} apps`, async t => {
  const h = await fixture(t, { scenario: async ({ config }) => {
    await assert.rejects(tool(config, 'fleet_propose_action').execute('change', { type: 'request_changes', reason: 'Correct validation.', feedback: 'Keep entered messages visible.' }), /Finish a build/);
  } });
  h.project.status = status;
  await h.ask('Keep entered messages visible.');
  assert.deepEqual(h.project.conversation.actions, []);
});

for (const status of ['review', 'failed']) test(`project lead proposes a change for a finished build under ${status}`, async t => {
  const feedback = 'Keep entered messages visible.';
  const h = await fixture(t, { scenario: async ({ config }) => {
    await tool(config, 'fleet_propose_action').execute('change', { type: 'request_changes', reason: 'Correct validation.', feedback });
  } });
  h.project.status = status; h.project.report = { passed: 1, failed: 0, skipped: 0, total: 1, exitCode: 0, output: 'done', command: 'test', time: new Date().toISOString(), durationMs: 1 };
  await h.ask(feedback);
  assert.equal(h.project.conversation.actions[0].type, 'request_changes');
  assert.equal(h.project.conversation.actions[0].feedback, feedback);
});

test('project lead responds on demand beside an active build with only its own tools and session', async t => {
  const entered = deferred(), finish = deferred();
  const h = await fixture(t, { scenario: async ({ session }) => {
    session.emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'Planning is underway.' } });
    entered.resolve(); await finish.promise;
  } });
  h.project.status = 'running'; h.project.runId = 'build-1';
  h.project.logs = [{ id: 'event-1', stage: 'plan', kind: 'info', time: new Date().toISOString(), text: 'Planning the app' }];
  h.project.stages.find(stage => stage.id === 'plan').status = 'active';
  const stages = structuredClone(h.project.stages), logs = structuredClone(h.project.logs);
  assert.equal(h.sessions.length, 0);
  await h.lead.send(h.project.id, 'How is planning going?'); await entered.promise;
  assert.equal(h.project.status, 'running');
  assert.equal(h.project.conversation.status, 'responding');
  assert.equal(h.project.conversation.messages.at(-1).text, 'Planning is underway.');
  const config = h.created[0];
  assert.equal(config.cwd, path.join(h.root, 'conversations', h.project.id));
  assert.deepEqual([...config.tools].sort(), ['fleet_propose_action', 'fleet_read_brief', 'fleet_read_conversation', 'fleet_read_project_artifact']);
  assert.equal(config.tools.some(name => ['read', 'write', 'edit', 'bash'].includes(name)), false);
  assert.deepEqual(config.resourceLoader.getSkills().skills, []);
  finish.resolve(); await h.settle();
  assert.equal(h.project.conversation.messages.at(-1).status, 'complete');
  assert.equal(h.sessions[0].disposed, true);
  assert.equal(h.lead.active.size, 0);
  assert.equal(h.project.status, 'running');
  assert.deepEqual(h.project.stages, stages); assert.deepEqual(h.project.logs, logs);
});

test('project lead sees the connected sources used by the build without connection secrets or item bodies', async t => {
  const h = await fixture(t);
  h.project.connectedData = [{ id: 'selected-source', digest: 'a'.repeat(64), includeInApp: false }];
  h.project.runCheckpoint = { data: { mode: 'provided', connectedSources: [{ kind: 'gmail', label: 'Gmail', sample: true, count: 2,
    digest: 'b'.repeat(64), token: 'SYNTHETIC_PRIVATE_TOKEN', items: [{ body: 'PRIVATE_ITEM_BODY' }] }] } };
  await h.ask('Which sources did this build use?');
  const prompt = h.sessions[0].prompts[0];
  const snapshot = JSON.parse(prompt.split('Current project snapshot (data):\n')[1].split('\n\nRecent conversation')[0]);
  assert.deepEqual(snapshot.selectedConnectedData, [{ id: 'selected-source', digest: 'a'.repeat(64) }]);
  assert.deepEqual(snapshot.usedConnectedSources, [{ kind: 'gmail', label: 'Gmail', sample: true, count: 2, digest: 'b'.repeat(64) }]);
  assert.equal(prompt.includes('SYNTHETIC_PRIVATE_TOKEN'), false);
  assert.equal(prompt.includes('PRIVATE_ITEM_BODY'), false);
});

test('conversation survives a fresh run and app reload and informs the next independent session', async t => {
  const h = await fixture(t);
  h.project.runId = 'run-original';
  await h.ask('Keep the output usable offline.');
  const oldMessages = structuredClone(h.project.conversation.messages);
  h.project.runId = 'run-new'; h.project.logs = []; await h.store.save();
  const reloaded = new Store(h.root); await reloaded.init();
  const project = reloaded.project(h.project.id);
  assert.deepEqual(project.conversation.messages, oldMessages);
  const lead = new ProjectLead(reloaded, h.runtime, () => {}, { createSession: h.createSession });
  t.after(() => lead.stopAll());
  await lead.send(project.id, 'What did we decide before this build?'); await lead.active.get(project.id)?.done;
  assert.equal(project.conversation.error, undefined);
  assert.equal(h.sessions.length, 2); assert.notEqual(h.sessions[0], h.sessions[1]);
  assert.ok(h.sessions[1].prompts[0].includes('Keep the output usable offline.'));
  assert.ok(h.sessions[1].prompts[0].includes('run-original'));
  assert.equal(project.conversation.messages.length, 4);
  assert.equal(project.conversation.messages.at(-1).runId, 'run-new');
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects[0].conversation.messages, project.conversation.messages);
});

test('input and history are bounded while the complete latest valid request reaches the model', async t => {
  const h = await fixture(t, { scenario: async ({ config }) => {
    const history = tool(config, 'fleet_read_conversation');
    const earlier = JSON.parse(textOf(await history.execute('earlier', { offset: 0 })));
    assert.equal(earlier.length, 20); assert.ok(earlier.every(message => message.text.length <= 2000));
    for (const offset of [-1, 0.1, NaN, Infinity]) await assert.rejects(history.execute('bad', { offset }), /nonnegative/);
  } });
  for (const input of ['', ' ', 'x'.repeat(8001), null, 17]) await assert.rejects(h.lead.send(h.project.id, input), /1–8,000/);
  assert.equal(h.project.conversation, undefined); assert.equal(h.sessions.length, 0);
  h.project.conversation = emptyConversation();
  h.project.conversation.messages = Array.from({ length: 40 }, (_, i) => ({ id: `old-${i}`, role: i % 2 ? 'assistant' : 'user', text: `old-message-${i}:` + 'x'.repeat(9000), createdAt: new Date().toISOString() }));
  h.project.dataInputs = [{ name: 'sample.txt', kind: 'text', content: 'INPUT_CONTENT_SHOULD_NOT_BE_SENT'.repeat(1000) }];
  h.project.logs = Array.from({ length: 15 }, (_, i) => ({ id: `log-${i}`, stage: 'plan', kind: 'info', time: new Date().toISOString(), text: `entry-${i}:` + 'l'.repeat(4000) }));
  const request = 'Please refine this plan. ' + 'a'.repeat(7900) + ' Final constraint: never remove offline support.';
  assert.ok(request.length <= 8000); await h.ask(request);
  const prompt = h.sessions[0].prompts[0];
  assert.ok(prompt.includes(request), 'An accepted latest request must not silently lose its final constraints');
  assert.equal(prompt.includes('old-message-0:'), false);
  assert.equal(prompt.includes('INPUT_CONTENT_SHOULD_NOT_BE_SENT'), false);
  assert.equal(prompt.includes('entry-0:'), false);
  assert.ok(prompt.length < 120_000, 'Do not preload unbounded history, activity or supplied data');
});

test('artifact access is on demand, capped, and rejects hidden answers, traversal and escaped symlinks', async t => {
  const h = await fixture(t, { scenario: async ({ config, text }) => {
    assert.equal(text.includes('ARTIFACT_ONLY_CONTENT'), false);
    const read = tool(config, 'fleet_read_project_artifact');
    const allowed = textOf(await read.execute('allowed', { path: 'plan.md' }));
    assert.match(allowed, /^ARTIFACT_ONLY_CONTENT/); assert.equal(allowed.length, 12_000);
    for (const file of ['../outside.txt', '/tmp/outside.txt', '.fleet/packet.json', 'evaluation-plan.json', '.quality-evidence/report.json']) {
      await assert.rejects(read.execute('denied', { path: file }), /not available/);
    }
    await assert.rejects(read.execute('symlink', { path: 'scope.md' }), /symlinks are not allowed/);
    await assert.rejects(read.execute('large', { path: 'research.md' }), /too large/);
    await assert.rejects(read.execute('directory', { path: 'README.md' }), /too large/);
  } });
  h.project.workspace = path.join(h.root, 'workspace'); await fs.mkdir(h.project.workspace);
  await fs.writeFile(path.join(h.project.workspace, 'plan.md'), 'ARTIFACT_ONLY_CONTENT' + 'p'.repeat(20_000));
  await fs.writeFile(path.join(h.project.workspace, 'research.md'), 'r'.repeat(128_001));
  await fs.mkdir(path.join(h.project.workspace, 'README.md'));
  await fs.writeFile(path.join(h.root, 'outside.txt'), 'Must stay private');
  await fs.symlink(path.join(h.root, 'outside.txt'), path.join(h.project.workspace, 'scope.md'));
  await h.ask('Explain the implementation plan.');
});

test('a revised brief is validated and proposed without changing the build, attachments or evidence', async t => {
  const proposed = { title: '  Refined parser  ', description: '  Parse synthetic messages while retaining precise source references.  ', criteria: ['  Preserve exact source spans  '] };
  const h = await fixture(t, { scenario: async ({ config, project }) => {
    const propose = tool(config, 'fleet_propose_action');
    for (const args of [
      { type: 'approve', reason: 'Do it' }, { type: 'revise', reason: ' ' }, { type: 'revise', reason: 'Change scope' },
      { type: 'revise', reason: 'Change scope', brief: { ...proposed, title: '' } },
      { type: 'revise', reason: 'Change scope', brief: { ...proposed, description: 'Short' } },
      { type: 'revise', reason: 'Change scope', brief: { ...proposed, criteria: [3] } }
    ]) await assert.rejects(propose.execute('invalid', args));
    assert.equal(project.conversation.actions.length, 0);
    const result = await propose.execute('revise', { type: 'revise', reason: '  Preserve provenance  ', brief: { ...proposed, dataInputs: [], links: [] } });
    assert.match(textOf(result), /NOT been applied/);
    await assert.rejects(propose.execute('second', { type: 'stop', reason: 'Also stop' }), /One action per reply/);
  } });
  Object.assign(h.project, { status: 'running', runId: 'active-build', inputs: 'Original input format', outputs: 'Original output format', resources: 'Original reference material', links: ['https://example.com/spec'], dataInputs: [{ name: 'original.csv', kind: 'file', content: 'message\nTASK: inspect pump\n' }], report: { passed: 4, failed: 0, sourceHash: 'evidence-hash' } });
  const original = structuredClone(h.project), base = briefHash(h.project);
  await h.ask('Please preserve exact source spans.');
  const action = h.project.conversation.actions[0];
  assert.equal(action.type, 'revise'); assert.equal(action.status, 'proposed');
  assert.equal(action.baseBriefHash, base); assert.equal(action.runId, 'active-build');
  assert.deepEqual(action.brief, { title: proposed.title.trim(), description: proposed.description.trim(), criteria: proposed.criteria.map(value => value.trim()) });
  for (const field of ['title', 'description', 'criteria', 'inputs', 'outputs', 'resources', 'links', 'dataInputs', 'status', 'runId', 'report']) assert.deepEqual(h.project[field], original[field], field);
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects[0];
  assert.deepEqual(saved.conversation.actions[0], JSON.parse(JSON.stringify(action)));
  await h.lead.dismiss(h.project.id, action.id);
  assert.equal(action.status, 'dismissed');
  await assert.rejects(h.lead.dismiss(h.project.id, action.id), /no longer available/);
});

for (const state of ['draft', 'running']) test(`start and stop proposals respect the ${state} build state without applying actions`, async t => {
  const h = await fixture(t, { scenario: async ({ config }) => {
    const propose = tool(config, 'fleet_propose_action');
    await assert.rejects(propose.execute('wrong', { type: state === 'running' ? 'start' : 'stop', reason: 'Requested action' }), /already running|no running build/);
    await propose.execute('right', { type: state === 'running' ? 'stop' : 'start', reason: 'Requested action' });
  } });
  h.project.status = state; await h.ask('Change the build state.');
  assert.equal(h.project.status, state);
  assert.equal(h.project.conversation.actions[0].type, state === 'running' ? 'stop' : 'start');
  assert.equal(h.project.conversation.actions[0].status, 'proposed');
});

for (const changed of ['run', 'brief']) test(`a ${changed} change during generation invalidates proposals from the earlier snapshot`, async t => {
  const ready = deferred(), proceed = deferred();
  const h = await fixture(t, { scenario: async ({ config }) => {
    ready.resolve(); await proceed.promise;
    await assert.rejects(tool(config, 'fleet_propose_action').execute('stale', { type: 'start', reason: 'Start from the previous snapshot' }), /project changed during this reply/);
  } });
  h.project.runId = 'run-before';
  await h.lead.send(h.project.id, 'Start this when ready.'); await ready.promise;
  if (changed === 'run') h.project.runId = 'run-after'; else h.project.description += ' New requirement: preserve offline behavior.';
  proceed.resolve(); await h.settle();
  assert.equal(h.project.conversation.error, undefined);
  assert.equal(h.project.conversation.actions.length, 0);
  assert.equal(h.lead.active.size, 0);
});

test('duplicate sends are rejected and cancelling a reply releases it without stopping the build', async t => {
  const ready = deferred(); let hang = true;
  const h = await fixture(t, { scenario: async () => { if (hang) { ready.resolve(); await never(); } } });
  h.project.status = 'running'; h.project.runId = 'keep-running';
  await h.lead.send(h.project.id, 'Explain progress.'); await ready.promise;
  await assert.rejects(h.lead.send(h.project.id, 'Duplicate request'), /current reply/);
  assert.equal(h.project.conversation.messages.filter(message => message.role === 'user').length, 1);
  await h.lead.cancel(h.project.id);
  assert.equal(h.project.conversation.status, 'idle'); assert.equal(h.lead.active.size, 0);
  assert.equal(h.project.status, 'running'); assert.equal(h.project.runId, 'keep-running');
  assert.equal(h.project.conversation.messages.at(-1).status, 'error');
  assert.match(h.project.conversation.error, /Reply stopped.*build is unchanged/);
  assert.equal(h.sessions[0].aborts, 1); assert.equal(h.sessions[0].disposed, true);
  hang = false; await h.ask('Try explaining again.');
  assert.equal(h.sessions.length, 2);
});

test('provider failures are saved and release busy state so a later request can succeed', async t => {
  let fail = true;
  const h = await fixture(t, { scenario: async () => { if (fail) throw new Error('Provider quota exhausted.'); } });
  await h.lead.send(h.project.id, 'Summarize the project.'); await h.settle();
  assert.equal(h.project.conversation.status, 'idle'); assert.equal(h.lead.active.size, 0);
  assert.equal(h.project.conversation.messages.at(-1).status, 'error');
  assert.match(h.project.conversation.error, /Provider quota exhausted/);
  assert.equal(h.sessions[0].disposed, true);
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects[0];
  assert.match(saved.conversation.error, /Provider quota exhausted/);
  fail = false; await h.ask('Try again.');
  assert.equal(h.project.conversation.messages.at(-1).status, 'complete');
});

test('disconnected providers fail without creating a model session and remain retryable', async t => {
  const h = await fixture(t);
  h.runtime.hasConfiguredAuth = () => false;
  await h.lead.send(h.project.id, 'Can you explain this?'); await h.settle();
  assert.equal(h.sessions.length, 0); assert.equal(h.lead.active.size, 0);
  assert.match(h.project.conversation.error, /Connect a model/);
  h.runtime.hasConfiguredAuth = () => true; await h.ask('The model is now connected.');
});

test('a timed-out reply cannot publish a late proposal or corrupt a later conversation', { timeout: 5000 }, async t => {
  const entered = deferred(), release = deferred(), lateResult = deferred();
  let first = true;
  const h = await fixture(t, {
    leadOptions: { limits: { idleMs: 100, timeoutMs: 1000, maxTurns: 4 } },
    scenario: async ({ config, session }) => {
      if (!first) return;
      first = false; entered.resolve(); await release.promise;
      session.emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'LATE_RESPONSE_SHOULD_NOT_APPEAR' } });
      try {
        await tool(config, 'fleet_propose_action').execute('late-proposal', { type: 'start', reason: 'A proposal from the already timed-out reply.' });
        lateResult.resolve({ accepted: true });
      } catch (error) { lateResult.resolve({ accepted: false, error }); }
    }
  });
  await h.lead.send(h.project.id, 'Explain progress without starting a build.'); await entered.promise; await h.settle();
  const timedOutReply = h.project.conversation.messages.at(-1);
  assert.equal(timedOutReply.status, 'error');
  assert.match(h.project.conversation.error, /made no progress/);
  assert.equal(h.lead.active.size, 0);
  assert.equal(h.sessions[0].aborts, 1); assert.equal(h.sessions[0].disposed, true);
  await h.ask('Please answer this new request.');
  const beforeLate = structuredClone(h.project.conversation);
  release.resolve();
  const result = await lateResult.promise;
  assert.equal(result.accepted, false, 'Disposed sessions must not add proposals after timeout');
  assert.ok(result.error instanceof Error);
  assert.deepEqual(h.project.conversation, beforeLate, 'Late tool calls and text must not alter a newer reply');
  assert.equal(h.project.conversation.actions.length, 0);
  assert.equal(h.project.status, 'draft');
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects[0];
  assert.deepEqual(saved.conversation, JSON.parse(JSON.stringify(beforeLate)));
});

test('broker messages during the initial chat save cannot displace or truncate the accepted user request', { timeout: 5000 }, async t => {
  const h = await fixture(t);
  h.project.status = 'running'; h.project.runId = 'research-build';
  h.project.stages.find(stage => stage.id === 'research').status = 'active';
  const save = h.store.save.bind(h.store), saving = deferred(), release = deferred();
  let holdFirstSave = true;
  h.store.save = async () => {
    if (holdFirstSave) { holdFirstSave = false; saving.resolve(); await release.promise; }
    return save();
  };
  const request = 'Explain the current planning tradeoffs. ' + 'Detail to preserve. '.repeat(250) + ' Final requirement: keep every offline capability.';
  assert.ok(request.length > 2000 && request.length <= 8000);
  const sending = h.lead.send(h.project.id, request);
  await saving.promise;
  const broker = new ClarificationBroker(h.store, () => {});
  const [question] = await broker.request(h.project, 'research', [{ question: 'Which audience comes first?', context: 'Research needs the primary user role.' }]);
  await broker.answer(h.project.id, question.id, 'Operator');
  assert.equal(h.sessions.length, 0, 'The lead has not started while its initial save is pending');
  release.resolve(); await sending; await h.settle();
  assert.equal(h.project.conversation.error, undefined);
  const prompt = h.sessions[0].prompts[0];
  assert.ok(prompt.includes(request), 'The complete accepted user message must survive interleaved broker writes');
  const recent = JSON.parse(prompt.split(/Recent conversation[^\n]*\n/)[1].split('\n\nRespond to the latest user message.')[0]);
  assert.equal(recent.at(-1).role, 'user');
  assert.equal(recent.at(-1).text, request, 'The lead must answer the original chat request, not the clarification answer');
  assert.ok(recent.some(message => message.text.includes('Which audience comes first?')));
  assert.equal(h.project.conversation.messages.filter(message => message.text === request).length, 1);
  assert.equal(h.project.conversation.questions[0].answer, 'Operator');
  assert.equal(h.project.status, 'running');
});

test('restart cancels unanswered questions and interrupts streaming replies without losing durable history', async t => {
  const h = await fixture(t), createdAt = new Date().toISOString();
  h.project.status = 'running'; h.project.runId = 'interrupted-build';
  h.project.stages.find(stage => stage.id === 'plan').status = 'active';
  h.project.conversation = {
    ...emptyConversation(), status: 'responding',
    messages: [
      { id: 'user', role: 'user', text: 'Keep offline support.', createdAt },
      { id: 'complete', role: 'assistant', text: 'Offline support remains required.', createdAt, status: 'complete' },
      { id: 'partial', role: 'assistant', text: 'The plan currently contains', createdAt, status: 'streaming' },
      { id: 'empty', role: 'assistant', text: '', createdAt, status: 'streaming' }
    ],
    questions: [
      { id: 'pending', runId: h.project.runId, phase: 'plan', round: 2, question: 'Which report comes first?', context: 'Planning is waiting.', status: 'pending', createdAt },
      { id: 'answered', runId: h.project.runId, phase: 'research', round: 1, question: 'Who is the primary user?', context: 'Research decision.', status: 'answered', answer: 'Operator', createdAt }
    ],
    actions: [{ id: 'old-action', type: 'start', title: 'Start a build', reason: 'Earlier proposal.', status: 'dismissed', baseBriefHash: briefHash(h.project) }]
  };
  const completed = structuredClone(h.project.conversation.messages.slice(0, 2));
  const answered = structuredClone(h.project.conversation.questions[1]);
  const actions = structuredClone(h.project.conversation.actions);
  await h.store.save();
  const reloaded = new Store(h.root); await reloaded.init();
  const project = reloaded.project(h.project.id), conversation = project.conversation;
  assert.equal(project.status, 'failed');
  assert.equal(project.processScope.cleanup, 'unconfirmed');
  assert.equal(project.stages.find(stage => stage.id === 'plan').status, 'failed');
  assert.equal(conversation.status, 'idle'); assert.match(conversation.error, /interrupted/);
  assert.deepEqual(conversation.messages.slice(0, 2), completed);
  assert.equal(conversation.messages[2].status, 'error');
  assert.equal(conversation.messages[2].text, 'The plan currently contains');
  assert.equal(conversation.messages[3].status, 'error'); assert.match(conversation.messages[3].text, /interrupted/);
  assert.equal(conversation.questions[0].status, 'cancelled');
  assert.deepEqual(conversation.questions[1], answered); assert.deepEqual(conversation.actions, actions);
  const broker = new ClarificationBroker(reloaded, () => {});
  await assert.rejects(broker.answer(project.id, 'pending', 'Detailed report'), /no longer waiting/);
  assert.equal(h.sessions.length, 0, 'Recovery must not start model calls automatically');
  const saved = JSON.parse(await fs.readFile(path.join(h.root, 'state.json'), 'utf8')).projects[0];
  assert.deepEqual(saved.conversation, conversation);
  const lead = new ProjectLead(reloaded, h.runtime, () => {}, { createSession: h.createSession });
  t.after(() => lead.stopAll());
  await lead.send(project.id, 'Explain why the previous build stopped.'); await lead.active.get(project.id)?.done;
  assert.equal(conversation.status, 'idle'); assert.equal(conversation.error, undefined);
  assert.equal(conversation.messages.at(-1).status, 'complete');
  assert.equal(project.status, 'failed');
  assert.equal(project.processScope.cleanup, 'unconfirmed');
});
