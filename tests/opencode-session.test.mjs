import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Type } from 'typebox';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createOpenCodeSession, openCodeToolBridge } from '../dist-electron/electron/opencode-session.js';
import { OpenCodeRuntime } from '../dist-electron/electron/opencode-runtime.js';
import { AgentResponseLimitError, runAgentStage } from '../dist-electron/electron/agent-runner.js';
import { genAiModelBridge } from '../dist-electron/electron/genai-model-bridge.js';

test('OpenCode MCP bridge authenticates, scopes tools and reports failures',async () => {
  const events=[], signal=new AbortController();
  const bridge=await openCodeToolBridge([{ name:'echo',description:'Echo a value',parameters:Type.Object({ value:Type.String() }),execute:async (_id,args) => ({ content:[{type:'text',text:args.value}],details:{} }) },{ name:'broken',description:'Failure fixture',parameters:Type.Object({}),execute:async () => {throw Error('Expected fixture failure')} }],signal.signal,event=>events.push(event));
  const client=new Client({name:'fixture',version:'1.0.0'});
  try {
    assert.equal((await fetch(bridge.url,{method:'POST'})).status,401);
    await client.connect(new StreamableHTTPClientTransport(new URL(bridge.url),{requestInit:{headers:{Authorization:'Bearer '+bridge.token}}}));
    assert.deepEqual((await client.listTools()).tools.map(tool=>tool.name),['echo','broken']);
    assert.equal((await client.callTool({name:'echo',arguments:{value:'verified'}})).content[0].text,'verified');
    assert.equal((await client.callTool({name:'broken',arguments:{}})).isError,true);
    assert.deepEqual(events.map(event=>event.type),['tool_execution_start','tool_execution_end','tool_execution_start','tool_execution_end']);
    assert.equal(events.at(-1).isError,true);
  } finally { await client.close(); await bridge.close(); }
});

test('real OpenCode runtime calls a host tool, reuses history, and reports stage usage', {timeout:90000},async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'appyard-opencode-'));
  let requests=0, toolCalls=0; const advertised=new Set(); let signalWaiting;
  const fixture=createServer(async (req,res)=>{
    try {
      let raw='';for await(const chunk of req)raw+=chunk;
      const body=JSON.parse(raw);requests++;
      assert.ok(body.messages.some(message => message.role === 'system' && JSON.stringify(message.content).includes('Do not spawn subagents')));
      assert.ok(!(body.tools ?? []).some(tool => tool.function.name === 'task'));
      if(JSON.stringify(body.messages.at(-1)).includes('Cancel fixture')){signalWaiting?.();return;}
      for(const tool of body.tools??[])advertised.add(tool.function.name);
      const name=body.tools?.find(tool=>tool.function.name.endsWith('echo'))?.function.name;
      const hasTool=body.messages.some(message=>message.role==='tool');
      const call=!!name&&!hasTool;
      const finishReason=call?'tool_calls':JSON.stringify(body.messages.at(-1)).includes('Reach the response limit')?'length':'stop';
      const delta=call?{role:'assistant',tool_calls:[{index:0,id:'call_fixture',type:'function',function:{name,arguments:JSON.stringify({value:'host-tool-confirmed'})}}]}:{role:'assistant',content:'App change verified.'};
      if(call)toolCalls++;
      const message={id:'chatcmpl-fixture',object:'chat.completion',created:1,model:'fixture',choices:[{index:0,message:call?{...delta,tool_calls:delta.tool_calls.map(({index,...tool})=>tool)}:delta,finish_reason:finishReason}],usage:{prompt_tokens:10,completion_tokens:4,total_tokens:14}};
      if(body.stream){res.writeHead(200,{'Content-Type':'text/event-stream'});res.write('data: '+JSON.stringify({...message,object:'chat.completion.chunk',choices:[{index:0,delta,finish_reason:null}],usage:undefined})+'\n\n');res.write('data: '+JSON.stringify({...message,object:'chat.completion.chunk',choices:[{index:0,delta:{},finish_reason:finishReason}]})+'\n\n');res.end('data: [DONE]\n\n');}
      else {res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(message));}
    }catch(error){res.writeHead(500).end(String(error));}
  });
  await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));
  const runtime=new OpenCodeRuntime(root);
  runtime.config=()=>({provider:{fixture:{npm:'@ai-sdk/openai-compatible',name:'Fixture',options:{baseURL:`http://127.0.0.1:${fixture.address().port}/v1`,apiKey:'local-test-only'},models:{fixture:{name:'Fixture',limit:{context:32000,output:4000}}}}}});
  const events=[];let metrics,session;
  try {
    await runAgentStage({label:'OpenCode integration',signal:new AbortController().signal,limits:{timeoutMs:60000,idleMs:30000},
      create:async signal=>session=await createOpenCodeSession({runtime,cwd:root,provider:'fixture',model:'fixture',signal,tools:[{name:'echo',description:'Echo the supplied value',parameters:Type.Object({value:Type.String()}),execute:async (_id,args)=>({content:[{type:'text',text:args.value}],details:{}})}]}),
      onEvent:event=>events.push(event),onMetrics:value=>metrics=value,work:async prompt=>{
        await prompt('Call echo, then confirm the app change.');
        await assert.rejects(prompt('Reach the response limit'), AgentResponseLimitError);
        await prompt('Continue in the same session.');
      }});
    assert.ok(requests>=3);assert.equal(toolCalls,1);assert.equal(advertised.size,1);assert.ok([...advertised][0].endsWith('echo'));
    assert.ok(events.some(event=>event.type==='tool_execution_end'));
    assert.ok(events.some(event=>event.type==='message_end'&&event.message.content[0].text==='App change verified.'));
    assert.ok(metrics.usage.totalTokens>0);assert.ok(session.getTokenUsage().totalTokens>0);
    // Exercise the same real engine through the GenAI host transport.
    const genAiModel = 'fixture-withtools';
    let hostRequests = 0;
    const genAi = {
      view: () => ({ connected: true, models: [genAiModel] }),
      assertModel: (backend, model) => { assert.equal(backend, 'opencode'); assert.equal(model, genAiModel); },
      buildRequest: async (model, body, signal) => {
        assert.equal(model, genAiModel); hostRequests++;
        return fetch(`http://127.0.0.1:${fixture.address().port}/v1/chat/completions`, { method: 'POST', body: JSON.stringify(body), signal });
      }
    };
    const genAiRuntime = new OpenCodeRuntime(root, () => genAi);
    assert.equal(genAiRuntime.models[0].configured, true);
    const genAiSession = await createOpenCodeSession({ runtime: genAiRuntime, cwd: root, provider: 'genai-mil', model: genAiModel,
      signal: new AbortController().signal, tools: [{name:'echo',description:'Echo a value',parameters:Type.Object({value:Type.String()}),execute:async (_id,args)=>({content:[{type:'text',text:args.value}],details:{}})}] });
    try { await genAiSession.prompt('Call echo, then confirm the app change.'); assert.equal(hostRequests, 2); assert.equal(toolCalls, 2); }
    finally { await genAiSession.dispose(); }
    const controller=new AbortController();
    const waiting=new Promise(resolve=>signalWaiting=resolve);
    const cancelled=await createOpenCodeSession({runtime,cwd:root,provider:'fixture',model:'fixture',signal:controller.signal,tools:[]});
    try {const pending=cancelled.prompt('Cancel fixture');const rejected=assert.rejects(pending,/abort|stopped|closed|fetch failed/i);await waiting;controller.abort();await rejected;}
    finally {await cancelled.dispose();}

  }finally{await session?.dispose();fixture.closeAllConnections();await new Promise(resolve=>fixture.close(resolve));await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
});

test('GenAI model gateway rejects unauthenticated, wrong-route and wrong-model requests', async () => {
  let calls = 0;
  const controller = new AbortController();
  const bridge = await genAiModelBridge({ assertModel() {}, buildRequest: async (_model, body) => {
    calls++; assert.equal(body.stream_options, undefined); return Response.json({ choices: [] });
  } }, 'fixture-withtools', controller.signal);
  const url = bridge.config.options.baseURL + '/chat/completions';
  const headers = { Authorization: 'Bearer ' + bridge.config.options.apiKey };
  try {
    assert.equal((await fetch(url, { method: 'POST' })).status, 401);
    assert.equal((await fetch(url + '/other', { method: 'POST', headers })).status, 404);
    assert.equal((await fetch(url, { method: 'POST', headers, body: JSON.stringify({ model: 'wrong' }) })).status, 400);
    assert.equal(calls, 0);
    assert.equal((await fetch(url, { method: 'POST', headers, body: JSON.stringify({ model: 'fixture-withtools' }) })).status, 200);
    assert.equal(calls, 1);
  } finally { await bridge.close(); }
  await assert.rejects(fetch(url));
});
