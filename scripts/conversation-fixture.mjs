import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { startFixtureProvider } from './mock-provider.mjs';

export const researchQuestion = 'Who should the parser help first?';
export const researchTextQuestion = 'What makes a message useful for this first workflow?';
export const planningQuestion = 'What should the reviewer inspect after parsing?';
export const researchAnswer = 'A single watch operator';
export const researchTextAnswer = 'A short synthetic message with an explicit task, owner, and source text that the operator can verify.';
export const planningAnswer = 'Exact source references beside each task';
export const planningSecondAnswer = 'The extracted task and its assigned owner';
const plain = message => typeof message.content === 'string' ? message.content : (message.content ?? []).map(part => part.text ?? '').join('\n');

// Explicit loopback fixture: real SDK streaming/tool calls, no hosted inference.
export async function startConversationFixture() {
  const base = await startFixtureProvider(), requests = [], errors = [];
  let holdBuild = true, releaseBuild;
  let buildWaiting = false;
  const buildGate = new Promise(resolve => { releaseBuild = resolve; });
  async function stream(res, { text, call, slow = false }) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    const envelope = { id: 'chatcmpl-' + randomUUID(), object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: 'fixture-model' };
    const send = (delta, finish_reason = null) => res.write('data: ' + JSON.stringify({ ...envelope, choices: [{ index: 0, delta, finish_reason }] }) + '\n\n');
    send({ role: 'assistant', content: '' });
    if (call) {
      send({ tool_calls: [{ index: 0, id: 'call_' + randomUUID().replaceAll('-', ''), type: 'function', function: { name: call.name, arguments: JSON.stringify(call.arguments) } }] });
      send({}, 'tool_calls');
    } else {
      const split = slow ? Math.floor(text.length / 2) : text.length;
      send({ content: text.slice(0, split) });
      if (slow) { await delay(700); send({ content: text.slice(split) }); }
      send({}, 'stop');
    }
    res.end('data: [DONE]\n\n');
  }
  const server = createServer(async (req, res) => {
    try {
      if (!req.url?.endsWith('/chat/completions')) { res.writeHead(404).end(); return; }
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw), toolNames = (body.tools ?? []).map(tool => tool.function?.name);
      const prompt = body.messages.filter(message => message.role === 'user').map(plain).join('\n');
      const last = body.messages.at(-1);
      const coordinator = toolNames.includes('fleet_propose_action');
      const phase = prompt.includes('You are the research agent') ? 'research' : prompt.includes('You are the planning agent') ? 'plan' : prompt.includes('You are the implementation agent') ? 'build' : 'other';
      requests.push({ coordinator, phase, body });
      if (coordinator) {
        assert.deepEqual([...toolNames].sort(), ['fleet_propose_action', 'fleet_read_brief', 'fleet_read_conversation', 'fleet_read_project_artifact']);
        const snapshot = JSON.parse(/Current project snapshot \(data\):\n([^\n]+)/.exec(prompt)[1]);
        const recent = JSON.parse(/Recent conversation[^\n]*:\n([^\n]+)/.exec(prompt)[1]);
        const request = recent.at(-1).text.toLowerCase();
        if (last?.role === 'tool') return await stream(res, { text: 'The proposal is ready for your review. Apply it when you want the build to change.' });
        const type = request.includes('revise') ? 'revise' : request.includes('stop') ? 'stop' : request.includes('start') ? 'start' : undefined;
        if (type) return await stream(res, { call: { name: 'fleet_propose_action', arguments: {
          type, reason: type === 'revise' ? 'Make source provenance explicit while preserving the original supplied data.' : type === 'stop' ? 'Stop the pending build and retain its saved files.' : 'Start a fresh build from the current brief.',
          ...(type === 'revise' ? { brief: { title: snapshot.title, description: snapshot.description + ' Display the exact source text beside each extracted task.', criteria: [...snapshot.criteria, 'Keep an exact source reference beside each extracted task.'] } } : {})
        } } });
        return await stream(res, { text: 'Your brief describes a local parser for synthetic messages. We can clarify the user workflow, then research, plan, build, and verify it. I will keep your decisions here across builds.', slow: true });
      }
      assert.equal(prompt.includes('Current project snapshot (data):'), false, 'Coordinator tools must be enabled in the actual SDK allowlist');
      if (phase === 'research' || phase === 'plan') {
        assert.ok(toolNames.includes('fleet_request_clarification'), `${phase} must expose its clarification tool`);
        const alreadyAsked = body.messages.some(message => message.tool_calls?.some(call => call.function?.name === 'fleet_request_clarification'));
        if (alreadyAsked) return await stream(res, { text: 'Questions recorded. Ending this session so the host can wait for the user.' });
        const answers = prompt.includes('User clarification answers for this run') ? prompt.split('User clarification answers for this run')[1] : '';
        const answered = answers.includes(`"phase": "${phase}"`);
        if (!answered && last?.role === 'user') return await stream(res, { call: { name: 'fleet_request_clarification', arguments: { questions: phase === 'research' ? [{
          question: researchQuestion,
          context: 'The primary user determines which workflow to research and keep focused.',
          answerType: 'single_choice', options: [researchAnswer, 'A team of analysts'], recommendation: researchAnswer
        }, {
          question: researchTextQuestion,
          context: 'A concrete example helps research stay within the supplied synthetic data and intended review workflow.',
          answerType: 'text'
        }] : [{
          question: planningQuestion,
          context: 'Several details may matter together. Your choices determine the review flow and measurable acceptance journeys.',
          answerType: 'multiple_choice', options: [planningAnswer, planningSecondAnswer, 'A summary without source text'],
          recommendation: 'Show source references alongside the extracted task and owner.'
        }] } } });
      }
      if (holdBuild && phase === 'build') { buildWaiting = true; await buildGate; }
      const upstream = await fetch(base.baseUrl + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') ?? 'text/event-stream' });
      for await (const chunk of upstream.body) res.write(chunk);
      res.end();
    } catch (error) {
      errors.push(error.stack || String(error));
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: error.message } }));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    requests, errors, base, baseUrl: 'http://127.0.0.1:' + server.address().port + '/v1',
    get buildWaiting() { return buildWaiting; },
    releaseBuild() { holdBuild = false; releaseBuild(); },
    async close() { holdBuild = false; releaseBuild(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await base.close(); }
  };
}
