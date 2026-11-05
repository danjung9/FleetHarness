import { qualityFixtureHtml } from './quality-fixture.mjs';
import { solutionFixture, solutionFixtureEvaluator } from './solution-fixture.mjs';
import { syntheticDataFiles } from './data-fixture.mjs';
import { fixtureVisualReviewInput } from './visual-review-fixture.mjs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export const fixtureSystemDesign = {
  title: 'Synthetic message parser', description: 'A local browser interface sends synthetic messages to a parser and presents structured tasks for review.',
  components: [
    { id: 'review-ui', label: 'Message review', description: 'Paste a synthetic message and inspect extracted tasks.', kind: 'interface', files: ['index.html'] },
    { id: 'parser', label: 'Task extraction', description: 'Extract a task from the synthetic message format.', kind: 'logic', files: ['core.cjs'] },
    { id: 'local-history', label: 'Local history', description: 'Remember that a parse was saved using browser storage.', kind: 'data', files: ['index.html'] }
  ],
  connections: [{ from: 'review-ui', to: 'parser', label: 'Synthetic message text' }, { from: 'review-ui', to: 'local-history', label: 'Save parse history locally' }, { from: 'parser', to: 'review-ui', label: 'Structured task for review' }]
};

// An explicit local test fixture, never registered by production code.
export async function startFixtureProvider() {
  const requests = [];
  let delayMs = 0;
  const html = qualityFixtureHtml;
  const server = createServer(async (req, res) => {
    if (!req.url?.endsWith('/chat/completions')) { res.writeHead(404).end(); return; }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); requests.push(body);
    if (delayMs) await new Promise(resolve=>setTimeout(resolve,delayMs));
    const contentText = message => typeof message.content === 'string' ? message.content : Array.isArray(message.content) ? message.content.map(part => part.text ?? '').join('\n') : '';
    // Pi appends screenshot pixels as a user message with a short attachment
    // caption. That image-bearing message is still part of the current turn.
    const isTaskPrompt = message => message.role === 'user' && contentText(message).trim()
      && !(Array.isArray(message.content) && message.content.some(part => part.type === 'image_url'));
    const lastPromptIndex = body.messages.findLastIndex(isTaskPrompt);
    const turnMessages = body.messages.slice(lastPromptIndex);
    const startingTurn = turnMessages.length === 1;
    const prompt = body.messages.filter(isTaskPrompt).map(contentText).join('\n');
    let files = [], extraCalls = [];
    const guide = prompt.includes('Implementation is complete.');
    const implementation = prompt.includes('You are the implementation agent') && !guide;
    const verification = prompt.includes('You are the verification agent') || prompt.includes('The independent test run failed');
    if (startingTurn) {
      if (guide) files = [['README.md', '# Fixture parser user guide\n\nOpen index.html in a browser; no install or server is required.\n\n## Walkthrough\n1. Enter the synthetic input `TASK: inspect pump` in Message.\n2. Select Parse message.\n3. The result is `inspect pump`.\n\n## Data and limitations\nThe fixture strips the TASK prefix; empty input asks you to enter a message. A successful result is retained after reload in browser storage. No export or reset control is provided.\n\n## Troubleshooting\nIf no result appears, select Parse message and check that browser scripts are enabled.\n\n## Developer tests\nWith Node installed, run `node --test parser.test.cjs`. See [verification notes](verification.md) and [field validation](path-to-fleet.md). This is a synthetic integration-test fixture.\n']];
      else if (prompt.includes('The independent test run failed')) files = [
        ['core.cjs', 'exports.parse = text => ({task:text.replace(/^TASK: /,"")});\n'],
        ['verification.md', '# Verification\nThe initial fixture failure was repaired. Domain performance is unverified.\n']
      ];
      else if (prompt.includes('You are the verification agent')) files = [['verification.md', '# Verification\nOne source behavior is covered. Operational readiness is unverified.\n']];
      else if (prompt.includes('You are the implementation agent')) files = [
        ['index.html', html], ['evaluate.cjs', solutionFixtureEvaluator], ['path-to-fleet.md', '# Field validation\nThis fixture is not operational software.\n'],
        ['core.cjs', 'exports.parse = text => ({task:"intentional defect"});\n'],
        ['parser.test.cjs', 'const {test}=require("node:test");const assert=require("node:assert/strict");const {parse}=require("./core.cjs");test("extracts a task",()=>assert.deepEqual(parse("TASK: inspect pump"),{task:"inspect pump"}));\n']
      ];
      else if (prompt.includes('You are the synthetic data agent')) files = Object.entries(syntheticDataFiles);
      else if (prompt.includes('You are the intake agent')) files = [['scope.md', '# Scope assessment\nSynthetic browser prototype only.\n']];
      else if (prompt.includes('You are the research agent')) files = [['research.md', '# Research\nThis is an explicit local test fixture. No external research performed.\n']];
      else files = [['test-matrix.md', '# Test matrix\nTask extraction requires an application test.\n'], ['research.md', '# Research\nThis is an explicit local test fixture. No external research performed.\n'], ['plan.md', '# Plan\nCreate a parser and one meaningful behavior test.\n']];
    }
    if (startingTurn && prompt.includes('You are the planning agent')) {
      const ids = /Acceptance IDs: ([^\n]+)/.exec(prompt)?.[1].split(', ').filter(Boolean) ?? [];
      files.push(...Object.entries(solutionFixture(ids)));
    }
    const progress = (componentId, status) => ({ name: 'fleet_component_progress', arguments: JSON.stringify({ componentId, status, detail: status === 'building' ? 'Implementing the fixture component.' : 'Fixture implementation written. Independent tests still determine correctness.' }) });
    if (startingTurn) {
      if (implementation || verification) extraCalls = (implementation ? fixtureSystemDesign.components : [fixtureSystemDesign.components[1]]).map(c => progress(c.id, 'building'));
      else if (prompt.includes('You are the planning agent')) extraCalls = [{ name: 'fleet_system_design', arguments: JSON.stringify(fixtureSystemDesign) }];
    } else if ((implementation || verification) && !turnMessages.some(m => m.tool_calls?.some(c => c.function?.name === 'fleet_component_progress' && JSON.parse(c.function.arguments).status === 'generated'))) {
      extraCalls = (implementation ? fixtureSystemDesign.components : [fixtureSystemDesign.components[1]]).map(c => progress(c.id, 'generated'));
    }
    if (!startingTurn && !extraCalls.length && (guide || verification)) {
      const visualCalls = turnMessages.flatMap(message => message.tool_calls ?? []).filter(call => ['fleet_browser', 'fleet_visual_review'].includes(call.function?.name));
      if (visualCalls.length < 8) {
        const step = visualCalls.length;
        if (step % 2 === 0) extraCalls = [{ name: 'fleet_browser', arguments: JSON.stringify({ action: step === 0 ? 'open' : 'screenshot', viewport: step < 4 ? 'desktop' : 'narrow' }) }];
        else {
          const captureCall = visualCalls.at(-1);
          const result = turnMessages.find(message => message.role === 'tool' && message.tool_call_id === captureCall.id);
          extraCalls = [{ name: 'fleet_visual_review', arguments: JSON.stringify(fixtureVisualReviewInput(JSON.parse(contentText(result)))) }];
        }
      }
    }
    const calls = [...extraCalls, ...files.map(([path, content]) => ({ name: 'write', arguments: JSON.stringify({ path, content }) }))];
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    const base = { id: 'chatcmpl-' + randomUUID(), object: 'chat.completion.chunk', created: Math.floor(Date.now()/1000), model:'fixture-model' };
    function send(delta, finish_reason = null) { res.write('data: ' + JSON.stringify({ ...base, choices: [{index:0, delta, finish_reason}] }) + '\n\n'); }
    send({role:'assistant', content:''});
    if (calls.length) {
      send({tool_calls:calls.map((call, index) => ({index,id:'call_'+randomUUID().replaceAll('-',''),type:'function',function:call}))});
      send({}, 'tool_calls');
    } else { send({content:'Local fixture stage completed. No live model was called.'}); send({}, 'stop'); }
    res.end('data: [DONE]\n\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, requests, setDelay: value => { delayMs = value; }, baseUrl: 'http://127.0.0.1:' + server.address().port + '/v1', close: () => new Promise(resolve => server.close(resolve)) };
}
