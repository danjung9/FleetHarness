// Explicit integration-test artifacts. Production code never imports this module.
export function qualityFixture(criterionIds) {
  const plan = { schemaVersion: 1,
    criteria: criterionIds.map((criterionId, index) => index === 0
      ? { criterionId, disposition: 'implemented', expectedOutcome: 'Parse a synthetic task and recover from empty input.', journeyIds: ['parse-task', 'recover-empty'] }
      : { criterionId, disposition: 'deferred', expectedOutcome: 'Evaluate the original requirement independently.', journeyIds: [], reason: 'This deterministic integration fixture does not implement this requirement.' }),
    journeys: [
      { id: 'parse-task', title: 'Parse a synthetic task', kind: 'primary', steps: [
        { action: 'fill', selector: '#message', value: 'TASK: inspect pump' }, { action: 'click', selector: '#parse' },
        { action: 'expectText', selector: '#result', text: 'inspect pump' }, { action: 'reload' },
        { action: 'expectText', selector: '#result', text: 'inspect pump' }
      ] },
      { id: 'recover-empty', title: 'Recover from empty input', kind: 'recovery', steps: [
        { action: 'fill', selector: '#message', value: '' }, { action: 'click', selector: '#parse' },
        { action: 'expectText', selector: '#result', text: 'Enter a message.' },
        { action: 'fill', selector: '#message', value: 'TASK: inspect pump' }, { action: 'press', selector: '#parse', key: 'Enter' },
        { action: 'expectText', selector: '#result', text: 'inspect pump' }
      ] }
    ] };
  const ux = { schemaVersion: 1, audience: 'A reviewer trying a synthetic task parser.', primaryTask: 'Enter a task message and inspect its parsed task.',
    successOutcome: 'The correct task is displayed and survives reload.', screens: [{ name: 'Parser', purpose: 'Review a task message.', primaryAction: 'Parse message' }],
    states: { empty: 'Message field and Parse message button.', loading: 'Parsing is synchronous.', error: 'Enter a message.', success: 'Parsed task shown in the result.' },
    persistence: 'The last successful task persists in localStorage.', recovery: 'Enter a valid task after an empty submission.', keyboard: 'Labelled input and native button operable with Tab and Enter.' };
  return { 'acceptance-plan.json': JSON.stringify(plan, null, 2), 'ux-spec.json': JSON.stringify(ux, null, 2) };
}

export const qualityFixtureHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fixture parser</title><style>body{font:16px sans-serif;margin:24px}textarea{display:block;box-sizing:border-box;width:100%;max-width:500px}button{margin:12px 0;padding:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><h1>Fixture parser</h1><p>Local integration-test fixture.</p><label for="message">Message</label><textarea id="message">TASK: inspect pump</textarea><button id="parse">Parse message</button><pre id="result" aria-live="polite"></pre><script>/* CORE_START */function parseTask(text){return text.trim()?text.replace(/^TASK: /,''):null;}/* CORE_END */const result=document.getElementById('result');result.textContent=localStorage.getItem('lastTask')||'';document.getElementById('parse').onclick=()=>{const message=document.getElementById('message').value;if(!message.trim()){result.textContent='Enter a message.';return;}const task=parseTask(message);result.textContent=task;localStorage.setItem('lastTask',task);localStorage.setItem('lastParse','saved');};</script></body></html>`;
