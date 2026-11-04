import { qualityFixture, qualityFixtureHtml } from './quality-fixture.mjs';
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
    const last = body.messages.at(-1);
    const prompt = body.messages.filter(m => m.role === 'user').map(m => typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map(part => part.text ?? '').join('\n') : JSON.stringify(m.content)).join('\n');
    let files = [], extraCalls = [];
    const guide = prompt.includes('Implementation is complete.');
    const implementation = prompt.includes('You are the implementation agent') && !guide;
    const verification = prompt.includes('You are the verification agent') || prompt.includes('The independent test run failed');
    if (last?.role === 'user') {
      if (guide) files = [['README.md', '# Fixture parser user guide\n\nOpen index.html in a browser; no install or server is required.\n\n## Walkthrough\n1. Enter the synthetic input `TASK: inspect pump` in Message.\n2. Select Parse message.\n3. The result is `inspect pump`.\n\n## Data and limitations\nThe fixture strips the TASK prefix; empty input asks you to enter a message. A successful result is retained after reload in browser storage. No export or reset control is provided.\n\n## Troubleshooting\nIf no result appears, select Parse message and check that browser scripts are enabled.\n\n## Developer tests\nWith Node installed, run `node --test parser.test.cjs`. See [verification notes](verification.md) and [field validation](path-to-fleet.md). This is a synthetic integration-test fixture.\n']];
      else if (prompt.includes('The independent test run failed')) files = [
        ['core.cjs', 'exports.parse = text => ({task:text.replace(/^TASK: /,"")});\n'],
        ['verification.md', '# Verification\nThe initial fixture failure was repaired. Domain performance is unverified.\n']
      ];
      else if (prompt.includes('You are the verification agent')) files = [['verification.md', '# Verification\nOne source behavior is covered. Operational readiness is unverified.\n']];
      else if (prompt.includes('You are the implementation agent')) files = [
        ['index.html', html], ['path-to-fleet.md', '# Field validation\nThis fixture is not operational software.\n'],
        ['core.cjs', 'exports.parse = text => ({task:"intentional defect"});\n'],
        ['parser.test.cjs', 'const {test}=require("node:test");const assert=require("node:assert/strict");const {parse}=require("./core.cjs");test("extracts a task",()=>assert.deepEqual(parse("TASK: inspect pump"),{task:"inspect pump"}));\n']
      ];
      else if (prompt.includes('You are the intake agent')) files = [['scope.md', '# Scope assessment\nSynthetic browser prototype only.\n']];
      else if (prompt.includes('You are the research agent')) files = [['research.md', '# Research\nThis is an explicit local test fixture. No external research performed.\n']];
      else files = [['test-matrix.md', '# Test matrix\nTask extraction requires an application test.\n'], ['research.md', '# Research\nThis is an explicit local test fixture. No external research performed.\n'], ['plan.md', '# Plan\nCreate a parser and one meaningful behavior test.\n']];
    }
    if (last?.role === 'user' && prompt.includes('You are the planning agent')) {
      const ids = /Acceptance IDs: ([^\n]+)/.exec(prompt)?.[1].split(', ').filter(Boolean) ?? [];
      try { files.push(...Object.entries(qualityFixture(ids))); }
      catch (error) {
        res.writeHead(422, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: { message: error.message, type: 'invalid_request_error' } }));
        return;
      }
    }
    const progress = (componentId, status) => ({ name: 'fleet_component_progress', arguments: JSON.stringify({ componentId, status, detail: status === 'building' ? 'Implementing the fixture component.' : 'Fixture implementation written. Independent tests still determine correctness.' }) });
    if (last?.role === 'user') {
      if (implementation || verification) extraCalls = (implementation ? fixtureSystemDesign.components : [fixtureSystemDesign.components[1]]).map(c => progress(c.id, 'building'));
      else if (prompt.includes('You are the planning agent')) extraCalls = [{ name: 'fleet_system_design', arguments: JSON.stringify(fixtureSystemDesign) }];
    } else if ((implementation || verification) && !body.messages.some(m => m.tool_calls?.some(c => c.function?.name === 'fleet_component_progress' && JSON.parse(c.function.arguments).status === 'generated'))) {
      extraCalls = (implementation ? fixtureSystemDesign.components : [fixtureSystemDesign.components[1]]).map(c => progress(c.id, 'generated'));
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
