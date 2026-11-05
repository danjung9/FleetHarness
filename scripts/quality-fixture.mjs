// Explicit integration-test artifacts. Production code never imports this module.
// Deferral dependencies are synthetic host-path test inputs, not assessments of the supplied catalog criteria.
export const qualityFixtureProject = {
  title: 'Synthetic task parser lifecycle fixture',
  description: 'Parse the invented TASK: prefix, retain a task across reload and prepare a synthetic review draft. No publication or operational-format validation is performed.',
  criteria: ['Parse a synthetic task and recover from empty input.', 'Publication of the synthetic review draft requires owner approval.']
};
export const cliFixtureProject = {
  title: 'Synthetic command-line task parser fixture',
  description: 'Parse an invented TASK: prefix through a JSON command-line protocol.',
  criteria: ['Parse a synthetic task and recover from empty input.']
};
export const briefDataFixtureProject = {
  title: 'Connected inputs regression',
  description: 'Create a local message parser to inspect a task and retain source context.',
  criteria: []
};

export function qualityFixture(criterionIds) {
  const recipeOutcomes = {
    'WFL-01': 'Reject invalid state transitions and stale approvals.',
    'WFL-02': 'Retain record lineage and conflicts.',
    'WFL-03': 'Complete the owner-specific workflow.',
    'MSG-01': 'Every extracted field has exact source offsets.',
    'MSG-02': 'Do not invent ambiguous timestamps.',
    'MSG-03': 'Normalize time zones without shifting the event.',
    'MSG-04': 'Review output against an independent answer key.',
    'MSG-05': 'Keep the timeline usable offline.'
  };
  // A parser lifecycle run cannot establish unrelated starter or catalog outcomes.
  if (!criterionIds.length || new Set(criterionIds).size !== criterionIds.length ||
    criterionIds.some(id => !['R1', 'UCcustom-1', 'UCcustom-2', 'SUMMARYcustom-1', 'SUMMARYcustom-2', ...Object.keys(recipeOutcomes)].includes(id))) {
    throw new Error('qualityFixture only supports the synthetic task parser inventory; use a separate fixture for catalog outcomes.');
  }
  const plan = { schemaVersion: 1,
    criteria: criterionIds.map(criterionId => ['R1', 'UCcustom-1', 'SUMMARYcustom-1', 'SUMMARYcustom-2'].includes(criterionId)
      ? { criterionId, disposition: 'implemented', expectedOutcome: 'Parse a synthetic task and recover from empty input.', journeyIds: ['parse-task', 'recover-empty'] }
      : criterionId === 'UCcustom-2'
        ? { criterionId, disposition: 'deferred', expectedOutcome: 'Owner approval is required before publication; the synthetic review draft does not grant it.', journeyIds: [], reason: 'human-authority: Synthetic test dependency: publication needs owner approval, which this fixture cannot grant. No publication occurs; a synthetic review draft of the parsed task is demonstrated.',
          syntheticCoverage: { assumptions: 'Fictional local review only; no publication, real reviewer identity or operational authority.', journeyIds: ['parse-task'], outputs: [{ sourceCriterionId: criterionId, name: 'synthetic review draft' }] } }
        : { criterionId, disposition: 'deferred', expectedOutcome: recipeOutcomes[criterionId], journeyIds: [], reason: 'human-authority: The owner must assess this recipe outcome separately; the parser lifecycle fixture does not establish it or authorize release.' }),
    journeys: [
      { id: 'parse-task', title: 'Parse a synthetic task', kind: 'primary', steps: [
        { action: 'fill', selector: '#message', value: 'TASK: inspect pump' }, { action: 'click', selector: '#parse' },
        { action: 'expectText', selector: '#result', text: 'inspect pump' },
        { action: 'click', selector: '#review' },
        { action: 'expectText', selector: '#review-result', text: 'Synthetic review draft: inspect pump. Publication requires owner approval.' },
        { action: 'reload' }, { action: 'expectText', selector: '#result', text: 'inspect pump' },
        { action: 'expectText', selector: '#review-result', text: 'Synthetic review draft: inspect pump. Publication requires owner approval.' }
      ] },
      { id: 'recover-empty', title: 'Recover from empty input', kind: 'recovery', steps: [
        { action: 'fill', selector: '#message', value: '' }, { action: 'click', selector: '#parse' },
        { action: 'expectText', selector: '#result', text: 'Enter a message.' },
        { action: 'fill', selector: '#message', value: 'TASK: inspect pump' }, { action: 'press', selector: '#parse', key: 'Enter' },
        { action: 'expectText', selector: '#result', text: 'inspect pump' }
      ] }
    ] };
  const ux = { schemaVersion: 1, audience: 'A reviewer trying a synthetic task parser.', primaryTask: 'Enter a task message and inspect its parsed task.',
    successOutcome: 'The correct task and synthetic review draft survive reload, with publication approval still unverified.', screens: [{ name: 'Parser', purpose: 'Review a task message.', primaryAction: 'Parse message' }],
    states: { empty: 'Message field and Parse message button.', loading: 'Parsing is synchronous.', error: 'Enter a message.', success: 'Parsed task shown in the result.' },
    persistence: 'The last successful task and review draft persist in localStorage. Parsing again clears the old review draft.', recovery: 'Enter a valid task after an empty submission.', keyboard: 'Labelled input and native buttons operable with Tab and Enter.' };
  return { 'acceptance-plan.json': JSON.stringify(plan, null, 2), 'ux-spec.json': JSON.stringify(ux, null, 2) };
}

export const qualityFixtureHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fixture parser</title><style>body{font:16px sans-serif;margin:24px}textarea{display:block;box-sizing:border-box;width:100%;max-width:500px}button{margin:12px 0;padding:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><h1>Fixture parser</h1><p>Local synthetic integration-test fixture. No publication or operational approval.</p><label for="message">Message</label><textarea id="message">TASK: inspect pump</textarea><button id="parse">Parse message</button><pre id="result" aria-live="polite"></pre><button id="review">Prepare synthetic review draft</button><pre id="review-result" aria-live="polite"></pre><script>
/* CORE_START */function parseTask(text){return text.startsWith('TASK: ')?text.slice(6):null;}/* CORE_END */
const result=document.getElementById('result'), review=document.getElementById('review-result');
let task=localStorage.getItem('lastTask')||'';
result.textContent=task;review.textContent=localStorage.getItem('lastReview')||'';
document.getElementById('parse').onclick=()=>{
  review.textContent='';localStorage.setItem('lastReview','');
  const message=document.getElementById('message').value;
  if(!message.trim()){task='';result.textContent='Enter a message.';return;}
  task=parseTask(message);result.textContent=task;
  localStorage.setItem('lastTask',task);localStorage.setItem('lastParse','saved');
};
document.getElementById('review').onclick=()=>{
  if(!task)return;
  review.textContent='Synthetic review draft: '+task+'. Publication requires owner approval.';
  localStorage.setItem('lastReview',review.textContent);
};
</script></body></html>`;
