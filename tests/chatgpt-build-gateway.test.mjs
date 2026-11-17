import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp,rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Type } from 'typebox';
import { OpenCodeRuntime } from '../dist-electron/electron/opencode-runtime.js';
import { createOpenCodeSession } from '../dist-electron/electron/opencode-session.js';

test('ChatGPT subscription gateway executes assigned MCP tools through the real build engine',{timeout:60000},async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'appyard-responses-'));
 let calls=0,executed=false;
 const broker=createServer(async(req,res)=>{
  try{
   assert.equal(req.url,'/broker/responses');assert.equal(req.headers.authorization,'Bearer fixture-run-capability');
   let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);calls++;
   assert.equal(body.model,'gpt-5.4');assert.equal(body.stream,true);assert.ok(!body.previous_response_id);assert.equal(body.store,false);
   const tool=body.tools?.find(tool=>tool.name?.endsWith('echo'));
   assert.equal(body.tools.length,1);
   const result=body.input.some(item=>item.type==='function_call_output');
   const item=result?{id:'msg_fixture',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'Hosted change verified.',annotations:[]}]}:{id:'fc_fixture',type:'function_call',call_id:'call_fixture',name:tool.name,arguments:'{"value":"confirmed"}',status:'completed'};
   const response={id:'resp_fixture_'+calls,object:'response',created_at:1,model:body.model,status:'completed',output:[item],usage:{input_tokens:10,output_tokens:4,total_tokens:14,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}};
   res.writeHead(200,{'Content-Type':'text/event-stream'});
   const emit=value=>res.write('data: '+JSON.stringify(value)+'\n\n');
   emit({type:'response.created',response:{...response,status:'in_progress',output:[]}});
   emit({type:'response.output_item.added',output_index:0,item:result?{...item,status:'in_progress',content:[]}:{...item,status:'in_progress',arguments:''}});
   if(result){emit({type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}});emit({type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:'Hosted change verified.'});emit({type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text:'Hosted change verified.'});}
   else{emit({type:'response.function_call_arguments.delta',item_id:item.id,output_index:0,delta:item.arguments});emit({type:'response.function_call_arguments.done',item_id:item.id,output_index:0,arguments:item.arguments});}
   emit({type:'response.output_item.done',output_index:0,item});emit({type:'response.completed',response});res.end();
  }catch(error){res.writeHead(500).end(String(error));}
 });
 await new Promise(resolve=>broker.listen(0,'127.0.0.1',resolve));
 const nativeFetch=globalThis.fetch;
 globalThis.fetch=(url,init)=>String(url)==='https://api.openai.com/v1/responses'?nativeFetch(`http://127.0.0.1:${broker.address().port}/broker/responses`,init):nativeFetch(url,init);
 const account={models:[{backend:'opencode',provider:'chatgpt',id:'gpt-5.4',name:'GPT fixture',configured:true}],credentials:async()=>({accessToken:'fixture-run-capability',authType:'chatgpt',expiresAt:Date.now()+60000})};
 const runtime=new OpenCodeRuntime(root,undefined,()=>account);
 let session;const text=[];
 try{
  session=await createOpenCodeSession({runtime,cwd:root,provider:'chatgpt',model:'gpt-5.4',signal:new AbortController().signal,tools:[{name:'echo',description:'Confirm tool execution',parameters:Type.Object({value:Type.String()}),execute:async(_id,args)=>{assert.equal(args.value,'confirmed');executed=true;return{content:[{type:'text',text:'confirmed'}],details:{}};}}]});
  session.subscribe(event=>{if(event.type==='message_update')text.push(event.assistantMessageEvent.delta);});
  await session.prompt('Use echo to verify the change, then report completion.');
  assert.ok(executed);assert.equal(calls,2);assert.match(text.join(''),/Hosted change verified/);
 }finally{globalThis.fetch=nativeFetch;await session?.dispose();broker.closeAllConnections();await new Promise(resolve=>broker.close(resolve));await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
});
