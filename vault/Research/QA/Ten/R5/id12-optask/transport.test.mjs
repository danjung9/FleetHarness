import test from 'node:test';
import assert from 'node:assert/strict';
import { start } from './server.mjs';
import { compute } from './compute.mjs';

test('real HTTP health, exact raw invocation, same-origin policy and shutdown',async()=>{
  const app=await start({host:'127.0.0.1',port:0});
  try {
    assert.deepEqual(await (await fetch(app.url+'health')).json(),{status:'ok'});
    const page=await fetch(app.url);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);
    const input={documents:[],selectedDay:'2026-11-05'};
    const response=await fetch(app.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
    assert.equal(response.status,200);assert.deepEqual(await response.json(),await compute(input));
    const rejected=await fetch(app.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://external.invalid'},body:JSON.stringify(input)});
    assert.equal(rejected.status,403);assert.deepEqual(await rejected.json(),{error:{message:'Cross-origin computation is not allowed.'}});
    const broken=await fetch(app.url+'api/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});
    assert.equal(broken.status,400);assert.deepEqual(await broken.json(),{error:{message:'Send valid UTF-8 JSON within the structural limits.'}});
  } finally {await app.close();}
  await assert.rejects(fetch(app.url+'health'));
});
