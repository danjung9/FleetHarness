import { qualityFixture } from './quality-fixture.mjs';

// Fixture-only planning artifacts; production never imports this module.
export function solutionFixture(ids) {
  const files = qualityFixture(ids);
  files['foundation-plan.json'] = JSON.stringify({ schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'This regression fixture deliberately exercises the existing browser-only runtime and inline evaluator, without a backend service.' }, null, 2);
  const plan = JSON.parse(files['acceptance-plan.json']);
  plan.schemaVersion = 2;
  // An empty criteria field puts deferred recipe outcomes before the prose task.
  // Bind computation to an implemented parser obligation, never array position.
  const parserCriterion = plan.criteria.find(criterion => criterion.disposition === 'implemented')?.criterionId;
  if (!parserCriterion) throw new Error('The parser fixture requires an implemented parser obligation.');
  plan.criteria.forEach(criterion => { criterion.capabilityIds = criterion.criterionId === parserCriterion ? ['parse'] : []; });
  files['acceptance-plan.json'] = JSON.stringify(plan, null, 2);
  files['solution-contract.json'] = JSON.stringify({ schemaVersion: 1,
    objective: 'Extract a task from a supplied synthetic message.',
    invocation: { input: 'A JSON string containing a message.', output: 'A JSON string or null, without an envelope.', rules: ['If the message starts with TASK: followed by one space, return the remaining text. Otherwise return null.'] },
    runtime: { profile: 'browser', entrypoint: 'index.html', evaluator: { runtime: 'node', entrypoint: 'evaluate.cjs', args: [] }, files: ['index.html', 'evaluate.cjs', 'core.cjs'], requiredEnv: [] },
    capabilities: [{ id: 'parse', kind: 'algorithm', description: 'Extract task text using the delivered browser parser.', criterionIds: [parserCriterion], required: true, evaluationIds: ['parse-cases'] }]
  }, null, 2);
  files['evaluation-plan.json'] = JSON.stringify({ schemaVersion: 1, evaluations: [{ id: 'parse-cases', capabilityId: 'parse', description: 'Independent synthetic extraction examples.',
    dataset: { name: 'task-parser', version: '1', provenance: 'synthetic' }, evaluator: 'exact', threshold: 1, trials: 1,
    cases: [{ id: 'pump', input: 'TASK: inspect pump', expected: 'inspect pump' }, { id: 'valve', input: 'TASK: close valve', expected: 'close valve' }, { id: 'empty', input: '', expected: null }, { id: 'not-task', input: 'STATUS: ready', expected: null }]
  }] }, null, 2);
  return files;
}

export function cliSolutionFixture(ids) {
  const files = solutionFixture(ids), solution = JSON.parse(files['solution-contract.json']), plan = JSON.parse(files['acceptance-plan.json']);
  solution.runtime = { profile: 'cli', files: ['evaluate.cjs', 'core.cjs'], requiredEnv: [], command: { runtime: 'node', entrypoint: 'evaluate.cjs', args: [] } };
  plan.journeys = [];
  for (const criterion of plan.criteria) { criterion.journeyIds = []; if (criterion.disposition === 'implemented') criterion.capabilityIds = ['parse']; }
  solution.capabilities[0].criterionIds = plan.criteria.filter(criterion => criterion.disposition === 'implemented').map(criterion => criterion.criterionId);
  files['solution-contract.json'] = JSON.stringify(solution);
  files['acceptance-plan.json'] = JSON.stringify(plan);
  return files;
}

// Invoke the same pure function embedded in the actual UI, not copied test logic.
export const solutionFixtureEvaluator = String.raw`const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const code=html.match(/\/\* CORE_START \*\/([\s\S]*?)\/\* CORE_END \*\//)?.[1];
if(!code) throw new Error('Delivered parser core missing');
const context={}; vm.runInNewContext(code,context,{timeout:1000});
let body=''; process.stdin.on('data',x=>body+=x); process.stdin.on('end',()=>process.stdout.write(JSON.stringify(context.parseTask(JSON.parse(body)))));
`;
