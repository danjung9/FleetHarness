import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreSolutionOutput } from '../dist-electron/electron/solution-evaluation.js';

const max = Number.MAX_SAFE_INTEGER;
const cases = [
  { name: 'separated one-minute assignments', spans: [[0, 1], [1, 2], [max - 1, max]], total: 3 },
  { name: 'assignments near the timestamp limit', spans: [[max - 6, max - 5], [max - 4, max - 3], [max - 2, max - 1]], total: 3 },
  { name: 'duty at the maximum supported budget', spans: [[0, max - 1], [max - 1, max]], total: max }
];

function permutations(values) {
  if (!values.length) return [[]];
  return values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index)).map(rest => [value, ...rest]));
}

for (const { name, spans, total } of cases) test(`schedule duty remains exact for ${name} in every assignment order`, () => {
  const windows = [{ start: 0, end: max }];
  const assignments = spans.map(([start, end], i) => ({ id: `r${i}`, start, end, people: ['p'], resources: [] }));
  const input = {
    windows,
    people: [{ id: 'p', qualifications: [], windows, restMinutes: 0, maxMinutes: total }],
    requests: assignments.map(a => ({ id: a.id, duration: a.end - a.start, starts: [a.start], people: ['p'], resources: [], qualifications: [] }))
  };
  for (const order of permutations(assignments)) {
    const output = { status: 'feasible', assignments: order };
    const label = order.map(a => a.id).join(',');
    input.people[0].maxMinutes = total;
    assert.equal(scoreSolutionOutput({ evaluator: 'schedule' }, input, output, { status: 'feasible' }).score, 1, `Exact budget: ${label}`);
    input.people[0].maxMinutes = total - 1;
    const exceeded = scoreSolutionOutput({ evaluator: 'schedule' }, input, output, { status: 'feasible' });
    assert.equal(exceeded.score, 0, `Exceeded budget: ${label}`);
    assert.equal(exceeded.fatal, true);
    assert.match(exceeded.detail, /duty budget/);
  }
});
