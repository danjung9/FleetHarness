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

/** Test agents use the same tools as model agents. No review ledger is fabricated. */
export async function completeFixtureVisualReview(tools, { emit } = {}) {
  const browser = tools.find(tool => tool.name === 'fleet_browser');
  const review = tools.find(tool => tool.name === 'fleet_visual_review');
  assert.ok(browser, 'Visual fixtures require the production browser tool.');
  assert.ok(review, 'Visual fixtures require the production visual review tool.');
  const execute = async (tool, args) => {
    const toolCallId = 'fixture-visual-' + ++nextToolCall;
    emit?.({ type: 'tool_execution_start', toolCallId, toolName: tool.name, args });
    const result = await tool.execute(toolCallId, args);
    emit?.({ type: 'tool_execution_end', toolCallId, toolName: tool.name, result, isError: result.isError });
    assert.notEqual(result.isError, true, JSON.stringify(result.content.filter(item => item.type === 'text')));
    return result.details ?? JSON.parse(result.content.find(item => item.type === 'text').text);
  };
  const records = [];
  let journeys = [];
  for (const viewport of ['desktop', 'narrow']) {
    const initial = await execute(browser, { action: viewport === 'desktop' ? 'open' : 'screenshot', viewport });
    journeys = initial.journeys ?? journeys;
    records.push(await execute(review, fixtureVisualReviewInput(initial)));
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
