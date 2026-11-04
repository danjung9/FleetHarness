import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyDemoReport } from '../scripts/smoke-hosted-live.mjs';

const brief = { criteria: ['Parse the requested message.', 'Restore the successful result.'] };
function evidence() {
  return { sourceHash: 'a'.repeat(64), exitCode: 0, passed: 2, total: 2, failed: 0, skipped: 0,
    quality: { schemaVersion: 1, status: 'passed', errors: [], requirementsMet: true,
      journeys: [{ status: 'passed' }],
      criteria: brief.criteria.map((requirement, index) => ({ criterionId: `UCcustom-${index + 1}`, requirement, status: 'passed' })) } };
}

test('the live smoke requires every supplied demo criterion to pass', () => {
  const result = verifyDemoReport(evidence(), brief);
  assert.equal(result.requestedCriteria, 2);
  assert.equal(result.requirementsMet, true);
  assert.deepEqual(result.deferredCriteria, []);
});

test('deferred supplemental criteria remain visibly unverified', () => {
  const report = evidence();
  report.quality.requirementsMet = false;
  report.quality.criteria.push({ criterionId: 'WFL-01', requirement: 'Owner approval workflow.', status: 'unverified', detail: 'No approval workflow was requested.' });
  const result = verifyDemoReport(report, brief);
  assert.equal(result.requirementsMet, false);
  assert.equal(result.criteria, 3);
  assert.deepEqual(result.deferredCriteria, [{ criterionId: 'WFL-01', requirement: 'Owner approval workflow.', detail: 'No approval workflow was requested.' }]);
  assert.equal(report.quality.criteria.at(-1).status, 'unverified');
});

test('a requested criterion cannot be deferred or omitted', () => {
  for (const change of ['unverified', 'missing']) {
    const report = evidence();
    if (change === 'missing') report.quality.criteria.pop();
    else report.quality.criteria[1].status = change;
    assert.throws(() => verifyDemoReport(report, brief), /every requested demo criterion/);
  }
});

test('failed supplemental requirements and browser journeys still block the smoke', () => {
  const failedCriterion = evidence();
  failedCriterion.quality.criteria.push({ criterionId: 'WFL-01', requirement: 'Supplemental requirement.', status: 'failed' });
  assert.throws(() => verifyDemoReport(failedCriterion, brief), /did not pass/);
  const failedJourney = evidence(); failedJourney.quality.journeys[0].status = 'failed';
  assert.throws(() => verifyDemoReport(failedJourney, brief), /did not pass/);
});

test('legacy, incomplete, and skipped-test evidence cannot pass', () => {
  for (const mutate of [report => delete report.quality, report => { report.quality.schemaVersion = 2; }, report => { report.total++; }, report => { report.skipped++; }, report => { report.quality.errors.push('browser failure'); }]) {
    const report = evidence(); mutate(report);
    assert.throws(() => verifyDemoReport(report, brief), /did not pass/);
  }
});
