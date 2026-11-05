import assert from 'node:assert/strict';

export const fixturePlanningReviewDocuments = ['acceptance-plan.json', 'solution-contract.json', 'evaluation-plan.json'];

/** The reader schema exposes exactly the current snapshot, including captured clarifications. */
export function fixturePlanningReviewPaths(parameters) {
  const choices = parameters?.properties?.path?.anyOf;
  assert.ok(Array.isArray(choices) && choices.length, 'Planning fixtures require the exact snapshot document inventory.');
  const paths = choices.map(choice => choice.const);
  assert.ok(paths.every(name => typeof name === 'string' && name.length), 'Planning snapshot paths must be string literals.');
  assert.equal(new Set(paths).size, paths.length, 'Planning snapshot paths must be unique.');
  return paths;
}

/** Synthetic test verdict only; production reviewers must assess the plan's actual adequacy. */
export function fixturePlanningReviewInput(documents) {
  const behavior = documents['behavior-contract.json'] ? JSON.parse(documents['behavior-contract.json']) : undefined;
  const [plan, solution, evaluation] = behavior ? [behavior, behavior, JSON.parse(documents['evaluation-plan.json'])]
    : fixturePlanningReviewDocuments.map(name => JSON.parse(documents[name]));
  const cli = behavior ? behavior.surface === 'cli' : solution.runtime.profile === 'cli';
  return {
    verdict: 'approved',
    minimumUsefulOutcome: solution.objective,
    scope: plan.criteria.map(criterion => ({ criterionId: criterion.criterionId,
      assessment: criterion.disposition === 'deferred' ? 'justified-deferral' : 'covered',
      reason: criterion.disposition === 'deferred' ? criterion.reason : criterion.expectedOutcome })),
    evaluations: evaluation.evaluations.map(item => ({ evaluationId: item.id, assessment: 'adequate',
      reason: `Synthetic fixture assessment of ${item.cases.length} declared cases: ${item.description}` })),
    recovery: { assessment: cli ? 'not-applicable' : 'adequate',
      reason: cli ? 'This fixture delivers a command-line application.'
        : 'The synthetic fixture declares a failure observation, correction and literal recovery outcome.' },
    findings: []
  };
}

let nextToolCall = 0;

/** Use the real immutable snapshot reader and host ledger; never fabricate a persisted review. */
export async function completeFixturePlanningReview(tools, { emit } = {}) {
  const read = tools.find(tool => tool.name === 'fleet_read_planning_artifact');
  const submit = tools.find(tool => tool.name === 'fleet_submit_planning_review');
  assert.ok(read, 'Planning fixtures require the production snapshot reader.');
  assert.ok(submit, 'Planning fixtures require the production review ledger.');
  const execute = async (tool, args) => {
    const toolCallId = 'fixture-planning-' + ++nextToolCall;
    emit?.({ type: 'tool_execution_start', toolCallId, toolName: tool.name, args });
    const result = await tool.execute(toolCallId, args);
    emit?.({ type: 'tool_execution_end', toolCallId, toolName: tool.name, result, isError: result.isError });
    assert.notEqual(result.isError, true, JSON.stringify(result.content));
    return result.content.filter(item => item.type === 'text').map(item => item.text).join('\n');
  };
  const documents = {};
  for (const name of fixturePlanningReviewPaths(read.parameters)) {
    let offset = 0, body = '';
    for (;;) {
      const page = JSON.parse(await execute(read, { path: name, offset }));
      assert.equal(page.path, name); assert.equal(page.offset, offset);
      body += page.text;
      if (page.nextOffset === null) break;
      assert.ok(Number.isSafeInteger(page.nextOffset) && page.nextOffset > offset);
      offset = page.nextOffset;
    }
    documents[name] = body;
  }
  await execute(submit, fixturePlanningReviewInput(documents));
}

/** Separate reviewer lifecycle used by workflow fixtures; its tools still enforce the real gate. */
export function createFixturePlanningReviewSession(tools) {
  const listeners = new Set();
  const emit = event => { for (const listener of listeners) listener(event); };
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    async prompt() {
      emit({ type: 'turn_start' });
      await completeFixturePlanningReview(tools, { emit });
      emit({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } });
      emit({ type: 'turn_end' });
    },
    async abort() {},
    dispose() { listeners.clear(); }
  };
}
