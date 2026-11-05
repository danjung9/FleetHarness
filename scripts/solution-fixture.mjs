import { qualityFixture } from './quality-fixture.mjs';

// Fixture-only planning artifacts; production never imports this module.
export function solutionFixture(ids) {
  const files = qualityFixture(ids);
  files['foundation-plan.json'] = JSON.stringify({ schemaVersion: 1, templateId: 'custom', version: '1.0.0', computePack: 'custom', reason: 'This regression fixture deliberately exercises the existing browser-only runtime and inline evaluator, without a backend service.' }, null, 2);
  const plan = JSON.parse(files['acceptance-plan.json']);
  plan.schemaVersion = 2;
  plan.criteria.forEach((criterion, index) => { criterion.capabilityIds = index === 0 ? ['parse'] : []; });
  files['acceptance-plan.json'] = JSON.stringify(plan, null, 2);
  files['solution-contract.json'] = JSON.stringify({ schemaVersion: 1,
    objective: 'Extract a task from a supplied synthetic message.',
    invocation: { input: 'A JSON string containing a message.', output: 'A JSON string or null, without an envelope.', rules: ['If the message starts with TASK: followed by one space, return the remaining text. Otherwise return null.'] },
    runtime: { profile: 'browser', entrypoint: 'index.html', evaluator: { runtime: 'node', entrypoint: 'evaluate.cjs', args: [] }, files: ['index.html', 'evaluate.cjs', 'core.cjs'], requiredEnv: [] },
    capabilities: [{ id: 'parse', kind: 'algorithm', description: 'Extract task text using the delivered browser parser.', criterionIds: [ids[0]], required: true, evaluationIds: ['parse-cases'] }]
  }, null, 2);
  files['evaluation-plan.json'] = JSON.stringify({ schemaVersion: 1, evaluations: [{ id: 'parse-cases', capabilityId: 'parse', description: 'Independent synthetic extraction examples.',
    dataset: { name: 'task-parser', version: '1', provenance: 'synthetic' }, evaluator: 'exact', threshold: 1, trials: 1,
    cases: [{ id: 'pump', input: 'TASK: inspect pump', expected: 'inspect pump' }, { id: 'valve', input: 'TASK: close valve', expected: 'close valve' }, { id: 'empty', input: '', expected: null }, { id: 'not-task', input: 'STATUS: ready', expected: null }]
  }] }, null, 2);
  return files;
}

// Current live planning contract; keep solutionFixture for saved-version compatibility tests.
export function structuredSolutionFixture(ids) {
  const files = solutionFixture(ids);
  const ux = JSON.parse(files['ux-spec.json']);
  ux.schemaVersion = 2;
  ux.structure = { pattern: 'single-task', rationale: 'The fixture performs one small message-parsing task.',
    entryScreenId: 'parser', navigation: 'The task is completed on the entry screen.', persistentElements: 'None.' };
  ux.screens = [{ ...ux.screens[0], id: 'parser', route: '/index.html', selector: 'body',
    layout: 'Message input and Parse message action precede the readable result.', secondaryContent: 'None.',
    narrowLayout: 'Input, action and result fit a single fluid column.' }];
  const plan = JSON.parse(files['acceptance-plan.json']);
  for (const journey of plan.journeys) journey.steps.unshift({ action: 'expectScreen', screenId: 'parser' });
  files['ux-spec.json'] = JSON.stringify(ux, null, 2);
  files['acceptance-plan.json'] = JSON.stringify(plan, null, 2);
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
