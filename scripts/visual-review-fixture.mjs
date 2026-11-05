import assert from 'node:assert/strict';

let nextToolCall = 0;
export const fixtureVisualExpectation = 'The application heading, labeled inputs, primary action and result area remain readable within the viewport.';

export function fixtureVisualReviewInput(capture) {
  assert.equal(typeof capture.captureId, 'string', 'The fixture must use a host-recorded browser capture.');
  return {
    captureId: capture.captureId,
    expected: fixtureVisualExpectation,
    observed: `The captured ${capture.viewport} viewport (${capture.dimensions?.width ?? 'unknown'} pixels wide) shows ${String(capture.pageText ?? '').slice(0, 1200)}. ${capture.controls?.length ?? 0} controls are present.`,
    findings: [], resolutions: [],
  };
}

function fixtureExecutor(emit) {
  return async (tool, args) => {
    const toolCallId = 'fixture-visual-' + ++nextToolCall;
    emit?.({ type: 'tool_execution_start', toolCallId, toolName: tool.name, args });
    const result = await tool.execute(toolCallId, args);
    emit?.({ type: 'tool_execution_end', toolCallId, toolName: tool.name, result, isError: result.isError });
    assert.notEqual(result.isError, true, JSON.stringify(result.content.filter(item => item.type === 'text')));
    return result.details ?? JSON.parse(result.content.find(item => item.type === 'text').text);
  };
}

async function exploreFixtureTask(browser, execute, initial) {
  const input = initial.controls.find(control => ['Message', 'Input JSON', 'JSON input'].includes(control.name));
  assert.ok(input, 'Discover the fixture task input from the actual Playwright observation.');
  const text = input.name === 'Message' ? 'TASK: inspect pump' : '"TASK: inspect pump"';
  const typed = input.value === text ? initial : await execute(browser, { action: 'type', selector: input.selector, text });
  const submit = typed.controls.find(control => control.name === 'Parse message' || control.name === 'Run computation');
  assert.ok(submit, 'Discover the task action from the refreshed Playwright observation.');
  return execute(browser, { action: 'click', selector: submit.selector });
}

/** Deliberate exploration through observed controls, separate from frozen replay. */
export async function completeFixtureUiFlow(tools, { emit } = {}) {
  const browser = tools.find(tool => tool.name === 'fleet_browser');
  assert.ok(browser, 'UI flow fixtures require the production Playwright browser tool.');
  const execute = fixtureExecutor(emit), observations = [];
  for (const viewport of ['desktop', 'narrow']) {
    const initial = await execute(browser, { action: 'open', viewport });
    observations.push(await exploreFixtureTask(browser, execute, initial));
  }
  return observations;
}

/** Test agents use the same tools as model agents. No review ledger is fabricated. */
export async function completeFixtureVisualReview(tools, { emit } = {}) {
  const browser = tools.find(tool => tool.name === 'fleet_browser');
  const review = tools.find(tool => tool.name === 'fleet_visual_review');
  assert.ok(browser, 'Visual fixtures require the production browser tool.');
  assert.ok(review, 'Visual fixtures require the production visual review tool.');
  const execute = fixtureExecutor(emit);
  const records = [];
  let journeys = [];
  for (const viewport of ['desktop', 'narrow']) {
    const initial = await execute(browser, { action: 'open', viewport });
    journeys = initial.journeys ?? journeys;
    records.push(await execute(review, fixtureVisualReviewInput(initial)));
    await exploreFixtureTask(browser, execute, initial);
    if (journeys.length) {
      for (const journey of journeys) {
        const exercised = await execute(browser, { action: 'journey', journeyId: journey.id, viewport });
        records.push(await execute(review, fixtureVisualReviewInput(exercised)));
      }
    } else {
      const recheck = await execute(browser, { action: 'screenshot', viewport });
      records.push(await execute(review, fixtureVisualReviewInput(recheck)));
    }
  }
  return records;
}
