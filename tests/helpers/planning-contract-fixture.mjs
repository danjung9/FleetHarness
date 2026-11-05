import { solutionFixture } from '../../scripts/solution-fixture.mjs';

export function planningContractFixture(acceptance) {
  const files = solutionFixture(['R1']);
  const plan = JSON.parse(files['acceptance-plan.json']);
  for (const criterion of acceptance.filter(item => item.id !== 'R1')) plan.criteria.push({
    criterionId: criterion.id, disposition: 'deferred', expectedOutcome: criterion.requirement,
    journeyIds: [], capabilityIds: [], reason: 'real-system: The operational feed requires an authenticated connection supplied by its owner.'
  });
  files['acceptance-plan.json'] = JSON.stringify(plan);
  return files;
}
