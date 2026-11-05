import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { runIndependentJudge } from '../dist-electron/electron/independent-judge.js';
import { judgeAccepted, reportPassed } from '../dist-electron/shared/verification.js';
import { sourceHash } from '../dist-electron/electron/storage.js';
import { startFixtureProvider } from '../scripts/mock-provider.mjs';
import { CodexRpc, codexExecutable } from '../dist-electron/electron/codex-rpc.js';
import { foundationRuntime, materializeFoundation } from '../dist-electron/harness/foundations.js';

const gap = { requirement: 'Weekly schedule', evidence: 'Only preset alternatives exist.', fix: 'Generate alternatives for an independently changed synthetic roster.' };
const not = { verdict: 'NOT', gaps: [gap] };
const satisfactory = { verdict: 'SATISFACTORY', gaps: [] };

async function fixture(t, answers = [not, satisfactory], options = {}) {
  await fs.mkdir('.tmp', { recursive: true });
  const workspace = await fs.mkdtemp(path.resolve('.tmp/judge-test-'));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const files = {
    'requirements.md': 'Produce an editable weekly schedule with qualified alternatives.',
    'index.html': '<!doctype html><title>Synthetic schedule</title><main>Preset</main>',
    'acceptance-plan.json': '{"frozen":true}', 'ux-spec.json': '{"frozen":true}',
    'app.test.cjs': 'require("node:test")("weekly schedule", () => {});',
    'verification.md': 'Only preset choices were tested.',
    'README.md': 'Synthetic scheduling demo. Open index.html.',
    'builder-context.md': 'PRIVATE BUILDER CONVERSATION MUST NOT REACH JUDGE',
  };
  for (const [name, content] of Object.entries(files)) await fs.writeFile(path.join(workspace, name), content);
  const sessions = [], repairs = [], events = [], reports = [], measurements = [], controller = new AbortController();
  let verifications = 0;
  const frozen = () => Promise.all(['requirements.md', 'acceptance-plan.json', 'ux-spec.json'].map(name => fs.readFile(path.join(workspace, name), 'utf8')));
  const originals = await frozen();
  const checkInputs = async () => assert.deepEqual(await frozen(), originals, 'Frozen acceptance changed');
  const verify = async () => {
    verifications++;
    const failed = options.failVerification === true || options.failVerification === verifications;
    return { time: new Date().toISOString(), command: 'fake verifier', passed: 1, failed: failed ? 1 : 0,
      skipped: 0, total: 1, exitCode: failed ? 1 : 0, output: 'Verifier evidence', durationMs: 1, sourceHash: await sourceHash(workspace),
      quality: options.quality ?? { schemaVersion: 1, status: 'passed', requirementsMet: true, journeys: [{ status: 'passed' }], criteria: [{ criterionId: 'DESCsynthetic-1', status: 'passed', detail: 'Synthetic browser evidence' }], errors: [] } };
  };
  const engine = {
    backend: 'pi', provider: 'fixture', model: 'fixture', runtime: { getModel: () => ({}) }, agentDir: workspace,
    async createSession(config) {
      const listeners = new Set();
      const session = { config, disposed: false,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        emit(event) { for (const fn of listeners) fn(event); },
        async prompt(prompt) {
          this.promptText = prompt;
          await options.onPrompt?.({ config, prompt, session, controller });
          const answer = answers[Math.min(sessions.indexOf(this), answers.length - 1)];
          const text = typeof answer === 'string' ? answer : JSON.stringify(answer);
          const message = { role: 'assistant', stopReason: 'stop', content: [{ type: 'text', text }],
            ...(options.noUsage ? {} : { usage: { input: 100, output: 20, cacheRead: 0, cacheWrite: 0, totalTokens: 120 } }) };
          for (const fn of listeners) fn({ type: 'message_end', message });
        },
        abort() {}, dispose() { this.disposed = true; }
      };
      sessions.push(session); return { session };
    }, ...options.engine
  };
  const run = async () => runIndependentJudge({ workspace, report: await verify(), engine, resourcesRoot: path.resolve('.'), signal: controller.signal,
    limits: options.limits ?? { timeoutMs: 5000, idleMs: 2000 }, checkInputs,
    repairLimit: options.repairLimit, onMetrics: measured => measurements.push(measured),
    repair: async instruction => {
      repairs.push(instruction);
      await options.onRepair?.(workspace);
      await fs.writeFile(path.join(workspace, 'index.html'), files['index.html'] + '<p>Repaired ' + repairs.length + '</p>');
    }, verify, log: text => events.push(text), recordReport: async report => { reports.push(report); } });
  return { workspace, run, sessions, repairs, events, reports, measurements, controller, get verifications() { return verifications; } };
}

test('NOT sends every gap and fix to the builder, reverifies and judges a fresh session before review', async t => {
  const h = await fixture(t, [not, satisfactory]);
  const report = await h.run();
  assert.equal(h.repairs.length, 1); assert.equal(h.verifications, 2); assert.equal(h.sessions.length, 2);
  for (const value of Object.values(gap)) assert.ok(h.repairs[0].includes(value));
  assert.match(h.repairs[0], /Never edit acceptance-plan.json or ux-spec.json/);
  assert.equal(report.independentJudge.verdict, 'SATISFACTORY');
  assert.deepEqual(report.independentJudge.attempts[0].gaps, [gap]);
  assert.match(report.output, /Independent judge: SATISFACTORY/);
  assert.match(report.output, /Only preset alternatives/);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(h.workspace, 'judge.json'), 'utf8')), report.independentJudge);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(h.workspace, 'test-report.json'), 'utf8')), report);
  assert.equal(report.sourceHash, await sourceHash(h.workspace));
  assert.ok(h.sessions.every(s => s.disposed));
  assert.notEqual(h.sessions[0].config.sessionManager, h.sessions[1].config.sessionManager);
});

test('SATISFACTORY performs no repair and records verify time and actual tokens', async t => {
  const h = await fixture(t, [satisfactory]); const report = await h.run();
  assert.equal(h.repairs.length, 0); assert.equal(h.verifications, 1);
  assert.equal(report.independentJudge.stage, 'verify');
  assert.equal(report.independentJudge.attempts[0].tokens.totalTokens, 120);
  assert.ok(report.independentJudge.durationMs >= 0);
  assert.equal(h.measurements.length, 1);
  assert.deepEqual(h.measurements[0].usage, report.independentJudge.attempts[0].tokens);
  assert.equal(h.measurements[0].usage.uncachedPlusOutputTokens, 120);
});

test('human steps do not fail a satisfactory verdict and survive both reports', async t => {
  const humanSteps = ['Have an operator accept the schedule after a supervised trial.', 'Obtain an expert-reviewed mapping before fielding.'];
  const h = await fixture(t, [{ ...satisfactory, humanSteps }]);
  const report = await h.run();
  assert.equal(judgeAccepted(report), true); assert.equal(reportPassed(report, true), true);
  assert.equal(h.repairs.length, 0); assert.deepEqual(report.independentJudge.gaps, []);
  assert.deepEqual(report.independentJudge.humanSteps, humanSteps);
  assert.deepEqual(report.independentJudge.attempts[0].humanSteps, humanSteps);
  assert.match(report.output, /Steps for a person/);
  for (const name of ['judge.json', 'test-report.json']) {
    const saved = JSON.parse(await fs.readFile(path.join(h.workspace, name), 'utf8'));
    assert.deepEqual((saved.independentJudge ?? saved).humanSteps, humanSteps);
  }
});

for (const humanSteps of [null, 'Review this', [''], ['   '], [12], ['x'.repeat(1001)], Array(21).fill('Review this')]) {
  test('malformed or excessive human steps remain an evaluation error: ' + JSON.stringify(humanSteps).slice(0, 60), async t => {
    const h = await fixture(t, [{ ...satisfactory, humanSteps }]);
    const report = await h.run();
    assert.match(report.independentJudge.evaluationError, /Invalid judge response/);
    assert.equal(judgeAccepted(report), false); assert.equal(reportPassed(report, true), true);
    assert.equal(h.repairs.length, 0); assert.equal(h.verifications, 1);
  });
}

test('the judge reads connected snapshots and receives the build versus human calibration', async t => {
  const h = await fixture(t, [satisfactory], { onPrompt: async ({ config, prompt }) => {
    const snapshot = await config.customTools[0].execute('snapshot', { path: 'context/source.json' });
    assert.match(snapshot.content[0].text, /Synthetic connector sample/);
    for (const text of [prompt, await fs.readFile('skills/fleet-judge/SKILL.md', 'utf8')]) {
      assert.match(text, /humanSteps/); assert.match(text, /never hold tokens/i);
      assert.match(text, /publicly documented/); assert.match(text, /synthetic messages/);
      assert.match(text, /labeled stand-in/); assert.match(text, /missing computations/);
    }
  } });
  await fs.mkdir(path.join(h.workspace, 'context'));
  await fs.writeFile(path.join(h.workspace, 'context/source.json'), JSON.stringify({ source: 'Synthetic connector sample', records: [{ value: 2 }] }));
  assert.equal(judgeAccepted(await h.run()), true);
});

test('unavailable judge input becomes evaluation evidence without changing passing checks', async t => {
  const h = await fixture(t, [satisfactory]);
  await fs.rm(path.join(h.workspace, 'index.html'));
  const report = await h.run();
  assert.match(report.independentJudge.evaluationError, /Missing judge input/);
  assert.equal(reportPassed(report, true), true); assert.equal(h.repairs.length, 0);
});

test('audit regression: a late core mutation during judge evidence publication cannot receive a passing identity', async t => {
  const h = await fixture(t, [satisfactory]);
  await fs.writeFile(path.join(h.workspace, 'core.cjs'), 'exports.value = "verified synthetic implementation";');
  const rename = fs.rename;
  let edited = false;
  t.mock.method(fs, 'rename', async (from, to) => {
    await rename(from, to);
    if (to === path.join(h.workspace, 'judge.json')) {
      edited = true;
      await fs.writeFile(path.join(h.workspace, 'core.cjs'), 'exports.value = "untested late mutation";');
    }
  });
  await assert.rejects(h.run(), /Source changed while publishing verification evidence/);
  assert.equal(edited, true);
  assert.equal(h.verifications, 1, 'No reverification occurred in this audit interleaving');
  assert.equal(h.reports.length, 0, 'Never publish SATISFACTORY with the untested bytes');
  assert.equal(h.repairs.length, 0);
});

for (const schemaVersion of [2, 3]) for (const profile of ['node-service', 'python-service', 'cli']) {
  test(`judge reads the complete ${profile} delivery without a root browser entrypoint (quality ${schemaVersion})`, async t => {
    const runtimeProfile = profile === 'cli' ? 'cli' : 'service';
    const journeys = profile === 'cli' ? [] : ['primary', 'recovery'].flatMap(id => ['desktop', 'narrow'].map(viewport => ({ id, viewport, status: 'passed' })));
    const filesHash = 'a'.repeat(64), contractHash = 'b'.repeat(64);
    const quality = { schemaVersion, contractHash, status: 'passed', requirementsMet: true, errors: [], journeys, expectedJourneys: journeys.length,
      criteria: [{ criterionId: 'R1', status: 'passed', capabilityIds: ['compute'] }],
      capabilities: [{ id: 'compute', required: true, status: 'passed', criterionIds: ['R1'], evaluationIds: ['examples'] }],
      package: { status: 'passed', cleanCopy: true, profile: runtimeProfile, filesHash },
      solutionEvaluation: { schemaVersion: 1, status: 'passed', errors: [], runtime: { profile: runtimeProfile, filesHash },
        capabilities: [{ id: 'compute', required: true, status: 'passed' }],
        evaluations: [{ id: 'examples', capabilityId: 'compute', status: 'passed', evaluator: 'exact', actual: 1, threshold: 1, trials: 1, cases: [{ id: 'ordinary', trial: 1, score: 1, passed: true }, { id: 'boundary', trial: 1, score: 1, passed: true }] }] } };
    if (schemaVersion === 3 && runtimeProfile !== 'cli') {
      const sessionId = 'synthetic-verifier', time = '2026-11-05T12:00:00.000Z';
      const captures = [], reviews = [];
      for (const [index, viewport] of ['desktop', 'narrow', 'desktop', 'narrow'].entries()) {
        const captureId = 'capture-' + index;
        captures.push({ id: captureId, sessionId, stage: 'verify', viewport, screenshot: '.browser-observations/' + captureId + '.png',
          screenshotHash: 'c'.repeat(64), filesHash, capturedAt: time, sequence: index * 2 + 1 });
        reviews.push({ id: 'review-' + index, sessionId, stage: 'verify', viewport, captureId, round: index < 2 ? 'initial' : 'recheck',
          expected: 'Synthetic fixture layout.', observed: 'Synthetic fixture comparison.', findings: [], resolutions: [], reviewedAt: time, sequence: index * 2 + 2 });
      }
      quality.visualReview = { schemaVersion: 1, runId: 'synthetic-run', contractHash, status: 'passed', filesHash, activeSessionId: sessionId,
        sessions: [{ id: sessionId, stage: 'verify', startedAt: time, status: 'passed', filesHash, errors: [] }], captures, reviews };
    }
    let runtime;
    const h = await fixture(t, [satisfactory], { quality, onPrompt: async ({ config, prompt }) => {
      const read = config.customTools[0];
      assert.match(prompt, /declared entrypoints and every delivered runtime file/);
      for (const name of runtime.files) {
        const result = JSON.parse((await read.execute('delivery', { path: name })).content[0].text);
        assert.equal(result.text, await fs.readFile(path.join(h.workspace, name), 'utf8'), name);
      }
      await assert.rejects(read.execute('absent-root', { path: 'index.html' }), /not in the judge snapshot/);
      await assert.rejects(read.execute('builder', { path: '.fleet/packet.json' }), /not in the judge snapshot/);
      await assert.rejects(read.execute('answers', { path: 'evaluation-plan.json' }), /not in the judge snapshot/);
    } });
    await fs.rm(path.join(h.workspace, 'index.html'));
    if (profile === 'cli') {
      runtime = { profile: 'cli', files: ['engine.mjs', 'data.csv'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'engine.mjs', args: [] } };
      await fs.writeFile(path.join(h.workspace, 'engine.mjs'), 'console.log(JSON.stringify(2));');
      await fs.writeFile(path.join(h.workspace, 'data.csv'), 'synthetic,value\nexample,2\n');
    } else {
      const selection = { schemaVersion: 1, templateId: profile, version: '1.0.0', computePack: profile === 'node-service' ? 'messages' : 'custom', reason: 'Synthetic judge snapshot regression.' };
      await fs.writeFile(path.join(h.workspace, 'foundation-plan.json'), JSON.stringify(selection));
      await materializeFoundation({ workspace: h.workspace, resourcesRoot: path.resolve('.'), selection });
      runtime = foundationRuntime(selection);
    }
    await fs.mkdir(path.join(h.workspace, '.fleet'));
    await fs.writeFile(path.join(h.workspace, '.fleet/packet.json'), JSON.stringify({ challenge: { title: 'Synthetic' }, acceptance: [{ id: 'R1' }] }));
    await fs.writeFile(path.join(h.workspace, 'evaluation-plan.json'), '{"private":"host answers"}');
    await fs.writeFile(path.join(h.workspace, 'solution-contract.json'), JSON.stringify({ schemaVersion: 1, objective: 'Synthetic computation.', runtime,
      capabilities: [{ id: 'compute', kind: 'algorithm', description: 'Compute synthetic results.', criterionIds: ['R1'], required: true, evaluationIds: ['examples'] }] }));
    const result = await h.run();
    assert.equal(result.independentJudge.verdict, 'SATISFACTORY', result.output);
    assert.equal(result.independentJudge.attempts.length, 1);
    assert.equal(h.repairs.length, 0);
  });
}

test('missing usage on any judge response leaves the token total unknown', async t => {
  const h = await fixture(t, [satisfactory], { onPrompt: ({ session }) => session.emit({
    type: 'message_end', message: { role: 'assistant', stopReason: 'stop', content: [] }
  }) });
  const report = await h.run();
  assert.equal(report.independentJudge.attempts[0].tokens, null);
});

test('Pi commentary before the final answer does not invalidate JSON or disappear from usage', async t => {
  const h = await fixture(t, [satisfactory], { onPrompt: ({ session }) => {
    session.emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'I will inspect the evidence.' } });
    session.emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'toolUse',
      content: [{ type: 'text', text: 'I will inspect the evidence.' }],
      usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15 } } });
  } });
  const report = await h.run();
  assert.equal(report.independentJudge.verdict, 'SATISFACTORY');
  assert.equal(h.repairs.length, 0);
  assert.equal(h.measurements[0].usage.totalTokens, 135);
  assert.equal(report.independentJudge.attempts[0].tokens.totalTokens, 135);
});

for (const mode of ['delta-only', 'commentary-only', 'malformed-final', 'completed-turn-items']) {
  test(`Codex judge requires strict JSON from a completed final message: ${mode}`, async t => {
    let listener;
    const emit = (method, params) => listener({ method, params: { threadId: 'judge-thread', turnId: 'judge-turn', ...params } });
    const rpc = { async initialize() {}, onClose() {}, dispose() {}, send() {}, subscribe(fn) { listener = fn; },
      async request(method) {
        if (method === 'thread/start') return { thread: { id: 'judge-thread' } };
        if (method === 'turn/start') {
          emit('turn/started', { turn: { id: 'judge-turn' } });
          emit('item/agentMessage/delta', { itemId: 'partial', delta: JSON.stringify(satisfactory) });
          const item = { id: 'final', type: 'agentMessage', phase: mode === 'commentary-only' ? 'commentary' : 'final_answer',
            text: mode === 'malformed-final' ? 'Here is JSON: ' + JSON.stringify(satisfactory) : JSON.stringify(satisfactory) };
          if (['commentary-only', 'malformed-final'].includes(mode)) emit('item/completed', { item });
          emit('turn/completed', { turn: { id: 'judge-turn', status: 'completed', items: mode === 'completed-turn-items' ? [item] : [] } });
          // A final receipt may arrive immediately after turn/completed. Unrelated turns must not count.
          emit('thread/tokenUsage/updated', { tokenUsage: { total: { inputTokens: 10, outputTokens: 5, cachedInputTokens: 0, totalTokens: 15 } } });
          emit('thread/tokenUsage/updated', { turnId: 'unrelated', tokenUsage: { total: { inputTokens: 100, outputTokens: 50, totalTokens: 150 } } });
          return { turn: { id: 'judge-turn' } };
        }
        return {};
      } };
    const h = await fixture(t, [satisfactory], { repairLimit: 0,
      engine: { backend: 'codex', codexHome: path.resolve('.tmp'), launchCodex: () => rpc } });
    const report = await h.run();
    assert.equal(report.independentJudge.verdict, mode === 'completed-turn-items' ? 'SATISFACTORY' : 'NOT');
    if (mode !== 'completed-turn-items') assert.match(report.output, /Invalid judge response/);
    assert.equal(h.repairs.length, 0);
    assert.equal(h.measurements[0].usage.totalTokens, 15);
  });
}

test('two repair loops are the limit and review retains a final NOT plus all historical gaps', async t => {
  const second = { verdict: 'NOT', gaps: [{ ...gap, requirement: 'Schedule export', evidence: 'Export omits assignments.' }] };
  const h = await fixture(t, [not, second, not]); const report = await h.run();
  assert.equal(h.repairs.length, 2); assert.equal(h.verifications, 3); assert.equal(h.sessions.length, 3);
  assert.equal(report.independentJudge.verdict, 'NOT');
  assert.equal(report.independentJudge.attempts.length, 3);
  assert.match(report.output, /Export omits assignments/);
  assert.match(report.output, /Human review/);
  assert.equal(report.independentJudge.repairLimitReached, true);
});

test('judge has only snapshot reads, no builder context, inherited skills, shell or source writes', async t => {
  const h = await fixture(t, [satisfactory], { onPrompt: async ({ config, prompt }) => {
    assert.deepEqual(config.tools, ['judge_read']);
    assert.deepEqual(config.customTools.map(tool => tool.name), ['judge_read']);
    assert.deepEqual(config.resourceLoader.getAgentsFiles().agentsFiles, []);
    assert.deepEqual(config.resourceLoader.getSkills().skills, []);
    assert.ok(!prompt.includes('PRIVATE BUILDER CONVERSATION'));
    assert.match(config.resourceLoader.getSystemPrompt(), /hard evaluator/);
    const read = config.customTools[0];
    assert.match(JSON.stringify(await read.execute('read', { path: 'requirements.md' })), /editable weekly schedule/);
    assert.match(JSON.stringify(await read.execute('read', { path: 'app.test.cjs' })), /weekly schedule/);
    await assert.rejects(read.execute('escape', { path: '../outside' }), /not in the judge snapshot/);
    await assert.rejects(read.execute('context', { path: 'builder-context.md' }), /not in the judge snapshot/);
  } });
  await h.run();
});

test('malformed output and contradictory satisfactory verdicts retry only evaluation and never approve', async t => {
  for (const answer of ['not json', 'I inspected it. ' + JSON.stringify(satisfactory), '```json\n' + JSON.stringify(satisfactory) + '\n```',
    { verdict: 'SATISFACTORY', gaps: [gap] }, { verdict: 'NOT', gaps: [] }, { verdict: 'MAYBE', gaps: [] }]) {
    const h = await fixture(t, [answer], { noUsage: true }); const report = await h.run();
    assert.equal(report.independentJudge.verdict, 'NOT');
    assert.match(report.output, /Invalid judge response/);
    assert.equal(report.independentJudge.attempts[0].tokens, null);
    assert.equal(h.repairs.length, 0);
    assert.equal(h.verifications, 1);
    assert.equal(h.sessions.length, 2);
    assert.equal(report.independentJudge.evaluatorRetries, 1);
    assert.equal(report.independentJudge.repairLimitReached, false);
    assert.match(report.independentJudge.evaluationError, /Invalid judge response/);
    assert.equal(report.quality.requirementsMet, false);
  }
});

test('an invalid evaluation can recover without changing the application or spending a repair', async t => {
  const h = await fixture(t, ['incomplete JSON', satisfactory]);
  const report = await h.run();
  assert.equal(h.repairs.length, 0); assert.equal(h.verifications, 1); assert.equal(h.sessions.length, 2);
  assert.equal(report.independentJudge.verdict, 'SATISFACTORY');
  assert.equal(report.independentJudge.evaluationError, undefined);
  assert.equal(report.independentJudge.attempts[0].evaluationError.startsWith('Invalid judge response'), true);
  assert.equal(report.quality.requirementsMet, true);
  assert.equal(await fs.readFile(path.join(h.workspace, 'index.html'), 'utf8'), '<!doctype html><title>Synthetic schedule</title><main>Preset</main>');
});

test('provider failure and timeout retry the evaluator without consuming application repairs', async t => {
  for (const timeout of [false, true]) {
    const h = await fixture(t, [satisfactory], { limits: { timeoutMs: 60, idleMs: 40 }, onPrompt: () => {
      if (timeout) return new Promise(() => {});
      throw new Error('503 synthetic provider unavailable');
    } });
    const report = await h.run();
    assert.equal(h.sessions.length, 2); assert.equal(h.repairs.length, 0); assert.equal(h.verifications, 1);
    assert.equal(report.independentJudge.repairs, 0);
    assert.equal(report.independentJudge.evaluatorRetries, 1);
    assert.match(report.independentJudge.evaluationError, /could not complete/);
    assert.equal(report.quality.requirementsMet, false);
  }
});

for (const evidence of ['Invented format replaces the named real format.', 'Preset answers replace generation from changed inputs.', 'Delivery only changes local state; no receiver gets the file.']) {
  test('negative judgment holds source obligations open: ' + evidence, async t => {
    const h = await fixture(t, [{ verdict: 'NOT', gaps: [{ ...gap, requirement: 'DESCsynthetic-1', evidence }] }], { repairLimit: 0 });
    await fs.mkdir(path.join(h.workspace, '.fleet'));
    const acceptance = [{ id: 'DESCsynthetic-1', requirement: 'Complete the named task with fresh synthetic inputs.', provenance: [{ kind: 'description', path: 'challenge.description[0:56]' }] }];
    await fs.writeFile(path.join(h.workspace, '.fleet/packet.json'), JSON.stringify({ challenge: { description: acceptance[0].requirement }, acceptance }));
    const report = await h.run();
    assert.equal(report.quality.requirementsMet, false);
    assert.equal(report.independentJudge.gaps[0].evidence, evidence);
    assert.equal(report.quality.criteria[0].status, 'passed', 'Judge advice cannot overwrite automatic evidence');
    assert.match(report.quality.criteria[0].detail, /Synthetic browser evidence/);
    assert.ok(report.output.includes(evidence));
    assert.equal(reportPassed(report, true), true);
    assert.equal(judgeAccepted(report), false);
    const read = h.sessions[0].config.customTools[0];
    assert.match(JSON.stringify(await read.execute('inventory', { path: 'acceptance-inventory.json' })), /DESCsynthetic-1/);
    assert.match(h.sessions[0].promptText, /every source span/);
  });
}

test('repair cannot weaken the frozen acceptance plan', async t => {
  const h = await fixture(t, [not], { onRepair: workspace => fs.writeFile(path.join(workspace, 'acceptance-plan.json'), '{}') });
  await assert.rejects(h.run(), /Frozen acceptance changed/);
  assert.equal(h.sessions.length, 1);
});

test('Stop cancels the judge, disposes it and never starts a repair', async t => {
  const h = await fixture(t, [not], { onPrompt: ({ controller }) => { controller.abort(); return new Promise(() => {}); } });
  await assert.rejects(h.run(), /stopped/i);
  assert.equal(h.repairs.length, 0); assert.ok(h.sessions[0].disposed);
});

test('initial failed verification never starts a judge', async t => {
  const h = await fixture(t, [not], { failVerification: true });
  await assert.rejects(h.run(), /verification.*pass/i);
  assert.equal(h.sessions.length, 0);
});

test('failed reverification blocks review and persists the final verification gap', async t => {
  const h = await fixture(t, [not], { failVerification: 2 });
  await assert.rejects(h.run(), /Verification did not pass after independent judge repair/);
  assert.equal(h.sessions.length, 1); assert.equal(h.repairs.length, 1);
  const report = JSON.parse(await fs.readFile(path.join(h.workspace, 'test-report.json'), 'utf8'));
  assert.equal(report.failed, 1);
  assert.ok(report.independentJudge.gaps.some(g => g.requirement === 'Reverification'));
  assert.match(report.output, /Host verification failed after judge repair/);
  assert.deepEqual(h.reports.at(-1), report, 'The live project must retain the latest failed evidence');
});

test('source mutation cannot be hidden by a judge provider error', async t => {
  const h = await fixture(t, [satisfactory], { onPrompt: async ({ config }) => {
    await fs.writeFile(path.join(config.cwd, 'index.html'), 'Changed after verification');
    throw new Error('Provider failed');
  } });
  await assert.rejects(h.run(), /Source changed during read-only independent judgment/);
  assert.equal(h.repairs.length, 0);
});

test('Codex judge starts a fresh read-only thread with only the snapshot tool and denies writes', async t => {
  const listeners = new Set(), closers = new Set(), calls = [], sent = [];
  let disposed = false;
  const emit = (method, params, id) => { for (const fn of listeners) fn({ method, params, id }); };
  const rpc = { async initialize() {}, subscribe(fn) { listeners.add(fn); }, onClose(fn) { closers.add(fn); },
    send(message) {
      sent.push(message);
      if (message.id === 'read') {
        assert.match(JSON.stringify(message.result), /editable weekly schedule/);
        emit('item/agentMessage/delta', { threadId: 'judge-thread', itemId: 'commentary', delta: 'I will inspect the evidence.' });
        emit('item/completed', { threadId: 'judge-thread', item: { id: 'commentary', type: 'agentMessage', phase: 'commentary', text: 'I will inspect the evidence.' } });
        emit('item/agentMessage/delta', { threadId: 'judge-thread', itemId: 'final', delta: JSON.stringify(satisfactory) });
        emit('item/completed', { threadId: 'judge-thread', item: { id: 'final', type: 'agentMessage', phase: 'final_answer', text: JSON.stringify(satisfactory) } });
        emit('thread/tokenUsage/updated', { threadId: 'judge-thread', turnId: 'judge-turn', tokenUsage: { total: { inputTokens: 30, cachedInputTokens: 5, outputTokens: 10, totalTokens: 40 } } });
        emit('turn/completed', { threadId: 'judge-thread', turn: { id: 'judge-turn', status: 'completed' } });
      }
    },
    dispose() { disposed = true; for (const fn of closers) fn(new Error('Closed')); },
    async request(method, params) {
      calls.push({ method, params });
      if (method === 'thread/start') return { thread: { id: 'judge-thread' } };
      if (method === 'turn/start') {
        emit('turn/started', { threadId: 'judge-thread', turn: { id: 'judge-turn' } });
        emit('item/tool/call', { threadId: 'judge-thread', tool: 'write', arguments: { path: 'index.html', content: 'FAKE' } }, 'write');
        emit('item/tool/call', { threadId: 'judge-thread', callId: 'read', tool: 'judge_read', arguments: { path: 'requirements.md' } }, 'read');
        return { turn: { id: 'judge-turn' } };
      }
      return {};
    }
  };
  const h = await fixture(t, [satisfactory], { engine: { backend: 'codex', codexHome: path.resolve('.tmp'), launchCodex: () => rpc } });
  const report = await h.run();
  assert.equal(report.independentJudge.verdict, 'SATISFACTORY');
  assert.equal(report.independentJudge.attempts[0].tokens.totalTokens, 40);
  assert.equal(h.measurements.length, 1);
  assert.equal(h.measurements[0].usage.totalTokens, 40);
  assert.equal(h.measurements[0].usage.uncachedPlusOutputTokens, 35);
  const start = calls.find(c => c.method === 'thread/start').params;
  assert.equal(start.sandbox, 'read-only'); assert.equal(start.approvalPolicy, 'never');
  assert.equal(start.ephemeral, true);
  assert.equal(start.config['features.shell_tool'], false); assert.equal(start.config['features.apply_patch_freeform'], false);
  for (const feature of ['multi_agent', 'goals', 'view_image', 'apps', 'plugins']) assert.equal(start.config['features.' + feature], false);
  assert.deepEqual(start.dynamicTools.map(tool => tool.name), ['judge_read']);
  assert.equal(start.dynamicTools[0].type, 'function');
  assert.ok(sent.find(message => message.id === 'write').error);
  assert.ok(disposed); assert.equal(h.sessions.length, 0); assert.equal(h.repairs.length, 0);
});

test('judge evidence cannot overwrite application source through a builder-created symlink', async t => {
  const h = await fixture(t, [satisfactory]);
  const html = await fs.readFile(path.join(h.workspace, 'index.html'), 'utf8');
  await fs.symlink('index.html', path.join(h.workspace, 'judge.json'));
  await assert.rejects(h.run(), /symlinks/);
  assert.equal(await fs.readFile(path.join(h.workspace, 'index.html'), 'utf8'), html);
  assert.equal((await fs.lstat(path.join(h.workspace, 'judge.json'))).isSymbolicLink(), true);
});

for (const evaluationError of [false, true]) test(`fake-engine production workflow reaches review with ${evaluationError ? 'an evaluation error' : 'final NOT after two repairs and every gap saved'}`, { timeout: 20000 }, async t => {
  await fs.mkdir('.tmp', { recursive: true });
  const root = await fs.mkdtemp(path.resolve('.tmp/judge-backend-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const script = `
    import assert from 'node:assert/strict';
    import { mock } from 'node:test';
    import { promises as fs } from 'node:fs';
    import path from 'node:path';
    const quality = await import('./dist-electron/electron/quality.js');
    const { sourceHash, Store, newProject } = await import('./dist-electron/electron/storage.js');
    let verifications = 0;
    mock.module('./dist-electron/electron/quality.js', { namedExports: { ...quality,
      verifyApplication: async root => ({ time: 'fixture', command: 'fake engine verification', passed: 1, failed: 0,
        skipped: 0, total: 1, exitCode: 0, output: 'Actual verifier boundary replaced by fake evidence', durationMs: 1,
        sourceHash: await sourceHash(root), quality: { schemaVersion: 1, status: 'passed', errors: [],
          journeys: [{ status: 'passed' }], criteria: [{ status: 'passed' }] }, verificationNumber: ++verifications })
    } });
    const { FleetBackend } = await import('./dist-electron/electron/pi-backend.js');
    const { RunProcessSweep } = await import('./dist-electron/electron/process-sweep.js');
    const { qualityFixtureProject } = await import('./scripts/quality-fixture.mjs');
    const { structuredSolutionFixture: solutionFixture } = await import('./scripts/solution-fixture.mjs');
    const { createFixturePlanningReviewSession } = await import('./scripts/planning-review-fixture.mjs');
    const { syntheticDataFiles } = await import('./scripts/data-fixture.mjs');
    const store = new Store(process.env.JUDGE_TEST_ROOT); await store.init();
    store.state.projects[0] = newProject(qualityFixtureProject);
    store.state.settings = { backend: 'pi', provider: 'fixture', model: 'fixture' };
    const project = store.state.projects[0]; let judgments = 0, repairs = 0;
    const evaluationError = ${evaluationError};
    const backend = new FleetBackend(store, process.execPath, () => {}, process.cwd(), {
      // Synthetic orchestration only. Native readiness and process discovery need the overseer's run.
      preflight: { browser: async () => {}, freeBytes: async () => 1024 ** 3 },
      processSweep: () => new RunProcessSweep({ scan: async () => [] }),
      createSession: async config => {
        if (config.customTools.some(tool => tool.name === 'fleet_submit_planning_review')) return { session: createFixturePlanningReviewSession(config.customTools) };
        assert.deepEqual(config.tools, ['judge_read']); const listeners = new Set();
        return { session: { subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, abort() {}, dispose() {},
          async prompt() { judgments++; if (evaluationError) throw new Error('Synthetic evaluator unavailable'); for (const fn of listeners) fn({ type: 'message_end', message: {
            role: 'assistant', stopReason: 'stop', content: [{ type: 'text', text: JSON.stringify({ verdict: 'NOT',
              gaps: [{ requirement: 'Named output ' + judgments, evidence: 'Missing output ' + judgments, fix: 'Implement output ' + judgments }] }) }] } }); }
        } };
      }
    });
    backend.runtime = { getModel: () => ({}), hasConfiguredAuth: () => true };
    backend.agent = async (p, run, stage, provider, model, instruction) => {
      if (instruction.includes('You are the synthetic data agent')) {
        for (const [name, body] of Object.entries(syntheticDataFiles)) {
          await fs.mkdir(path.dirname(path.join(p.workspace, name)), { recursive: true });
          await fs.writeFile(path.join(p.workspace, name), body);
        }
      }
      if (stage === 'intake') await fs.writeFile(path.join(p.workspace, 'scope.md'), 'Synthetic task parser scope');
      if (stage === 'research') await fs.writeFile(path.join(p.workspace, 'research.md'), 'Synthetic local research');
      if (stage === 'plan') {
        const definition = { title: 'Parser', description: 'Synthetic parser', components: [{ id: 'parser', label: 'Parser', description: 'Parse a task', kind: 'logic', files: ['core.cjs'] }], connections: [] };
        p.systemDesign = { definition, progress: { parser: { status: 'generated', detail: 'Synthetic fixture', updatedAt: 'fixture' } }, updatedAt: 'fixture' };
        await fs.writeFile(path.join(p.workspace, 'system-design.json'), JSON.stringify(definition));
        for (const [name, body] of Object.entries(solutionFixture(run.acceptance.map(a => a.id)))) await fs.writeFile(path.join(p.workspace, name), body);
        await fs.writeFile(path.join(p.workspace, 'plan.md'), 'Synthetic implementation plan');
        await fs.writeFile(path.join(p.workspace, 'test-matrix.md'), 'Synthetic acceptance mapping');
      }
      if (stage === 'build') {
        await fs.writeFile(path.join(p.workspace, 'index.html'), '<!doctype html><title>Synthetic</title>');
        await fs.writeFile(path.join(p.workspace, 'app.test.cjs'), 'require("node:test")("synthetic registered case", () => {});');
      }
      if (instruction.includes('repairing gaps from an independent')) {
        repairs++; assert.match(instruction, /Missing output/); assert.match(instruction, /Implement output/);
        await fs.writeFile(path.join(p.workspace, 'index.html'), '<!doctype html><title>Synthetic repair ' + repairs + '</title>');
      }
    };
    await backend.start(project.id); await backend.active.get(project.id)?.done;
    assert.equal(project.status, 'review', JSON.stringify({ error: project.error, logs: project.logs }));
    assert.equal(project.error, undefined);
    assert.equal(project.logs.filter(log => log.kind === 'error').length, 0);
    assert.equal(project.stages.find(s => s.id === 'verify').status, 'complete');
    assert.equal(project.stages.find(s => s.id === 'review').status, 'review');
    assert.equal(project.approvedAt, undefined);
    assert.equal(judgments, evaluationError ? 2 : 3); assert.equal(repairs, evaluationError ? 0 : 2); assert.equal(verifications, evaluationError ? 1 : 3);
    const saved = new Store(store.root); await saved.init();
    const restored = saved.project(project.id);
    assert.equal(restored.report.independentJudge.verdict, 'NOT');
    assert.equal(restored.status, 'review');
    assert.equal(restored.report.independentJudge.attempts.length, evaluationError ? 2 : 3);
    if (evaluationError) assert.match(restored.report.independentJudge.evaluationError, /Synthetic evaluator unavailable/);
    else for (let n = 1; n <= 3; n++) assert.ok(restored.report.output.includes('Missing output ' + n));
    assert.equal(restored.report.sourceHash, await sourceHash(project.workspace));
  `;
  // The full workflow reads the expanded skill packet on each integrity check.
  // Use the test's cancellable deadline, not a hidden synchronous eight-second kill.
  const child = spawn(process.execPath, ['--experimental-test-module-mocks', '--input-type=module', '-e', script], {
    signal: t.signal, env: { ...process.env, JUDGE_TEST_ROOT: root, TMPDIR: path.resolve('.tmp') }
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const closed = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', (status, signal) => resolve({ status, signal })); });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); await closed.catch(() => {}); });
  const result = await closed;
  assert.equal(result.status, 0, stdout + stderr + (result.signal ? '\nTerminated by ' + result.signal : ''));
});

test('backend runs the judge inside verify before opening human review', async () => {
  const backend = await fs.readFile('electron/pi-backend.ts', 'utf8');
  assert.match(backend, /runIndependentJudge/);
  const call = backend.indexOf('p.report = await runIndependentJudge');
  const review = backend.indexOf("await this.stage(p, 'review', 'review')");
  assert.ok(call > 0 && call < review);
});

test('local provider fixture returns a judge verdict without requesting a source write', async t => {
  const provider = await startFixtureProvider(); t.after(() => provider.close());
  const response = await fetch(provider.baseUrl + '/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'You are a fresh independent judge.' }],
      tools: [{ type: 'function', function: { name: 'judge_read' } }] }) });
  const chunks = (await response.text()).split('\n').filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)).choices[0].delta);
  assert.ok(chunks.every(delta => !delta.tool_calls));
  assert.deepEqual(JSON.parse(chunks.map(delta => delta.content ?? '').join('')), satisfactory);
});

test('native Codex judge advertises no shell, source-writing or delegation tools to a local fake provider', { timeout: 20000 }, async t => {
  await fs.mkdir('.tmp', { recursive: true });
  const nativeRoot = await fs.mkdtemp(path.resolve('.tmp/native-judge-test-'));
  t.after(() => fs.rm(nativeRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  const home = path.join(nativeRoot, 'home'); await fs.mkdir(home);
  let receive, nativeController;
  const inventory = new Promise(resolve => { receive = resolve; });
  const server = createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const tools = JSON.parse(raw).tools.map(tool => tool.name ?? tool.type);
    nativeController.abort(); receive(tools);
    res.writeHead(400, { 'content-type': 'application/json' }).end('{"error":{"message":"Local fixture observation complete"}}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const h = await fixture(t, [satisfactory], { limits: { timeoutMs: 15000, idleMs: 15000 }, engine: { backend: 'codex', model: 'fixture-model', codexHome: home,
    launchCodex: () => {
      const args = ['app-server', '--listen', 'stdio://', '-c', 'model_provider="judge-fixture"',
        '-c', 'model_providers.judge-fixture.name="Local fixture"',
        '-c', 'model_providers.judge-fixture.base_url="http://127.0.0.1:' + server.address().port + '/v1"',
        '-c', 'model_providers.judge-fixture.wire_api="responses"', '-c', 'model_providers.judge-fixture.requires_openai_auth=false'];
      const rpc = new CodexRpc(spawn(codexExecutable(), args, { cwd: nativeRoot, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32',
        env: { PATH: process.env.PATH, HOME: nativeRoot, CODEX_HOME: home, TMPDIR: nativeRoot } }));
      const request = rpc.request.bind(rpc);
      // Keep production judge instructions, sandbox and tools; substitute only the local model endpoint.
      rpc.request = (method, params) => request(method, method === 'thread/start' ? { ...params, modelProvider: 'judge-fixture' } : params);
      return rpc;
    }
  } });
  nativeController = h.controller;
  const original = await fs.readFile(path.join(h.workspace, 'index.html'), 'utf8');
  const run = assert.rejects(h.run(), /stopped/i);
  void run.catch(() => {});
  const timer = setTimeout(() => { h.controller.abort(); receive(['NO_LOCAL_REQUEST']); }, 10000);
  let tools;
  try { tools = await inventory; } finally { clearTimeout(timer); h.controller.abort(); await run; }
  assert.ok(tools.includes('judge_read'));
  assert.ok(tools.every(name => ['judge_read', 'request_user_input'].includes(name)), JSON.stringify(tools));
  assert.equal(await fs.readFile(path.join(h.workspace, 'index.html'), 'utf8'), original);
  assert.equal(h.repairs.length, 0);
});

test('a plain sentence for the person is kept with the gap and is optional', async t => {
  const plain = 'If an older record arrives, a conflict you have not resolved disappears.';
  const h = await fixture(t, [{ verdict: 'NOT', gaps: [{ ...gap, plain: '  ' + plain + '  ' }, gap] }], { repairLimit: 0 });
  const report = await h.run();
  assert.equal(report.independentJudge.gaps[0].plain, plain);
  assert.equal('plain' in report.independentJudge.gaps[1], false);
});
