import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ChatGPTDevkitAccount } from '../dist-electron/electron/chatgpt-devkit.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'appyard-siwc-'));
  t.after(() => rm(root, { recursive:true, force:true }));
  let session = { status:'disconnected', sharing:false }, listener, finish;
  const calls = [];
  const client = {
    subscribe(fn) { listener=fn; fn(session); return () => { listener=undefined; }; },
    async getSession() { return session; },
    async listProfiles() { return session.profileId ? [{ id:session.profileId, label:'Synthetic account', status:session.status, identity:{email:'synthetic@example.test'} }] : []; },
    async listModels() { calls.push('models'); return [{slug:'fixture-model',displayName:'Fixture model'}]; },
    async signIn(options) { calls.push(options); session={status:'connecting',sharing:false}; listener?.(session); await new Promise(resolve=>finish=resolve); return session; },
    cancelSignIn() { session={status:'disconnected',sharing:false}; listener?.(session); finish?.(); },
    async disconnect() { calls.push('disconnect'); session={status:'disconnected',sharing:false}; listener?.(session); },
    async selectProfile(id) { calls.push(id); },
    async hostAccessToken() { calls.push('token'); return 'synthetic-host-token'; }
  };
  const account = new ChatGPTDevkitAccount(root, async()=>{}, {id:'test-only',isAvailable:()=>false,encrypt:()=>{throw Error('unused')},decrypt:()=>{throw Error('unused')}}, client);
  t.after(()=>account.dispose());
  return {root,account,calls,complete:async(sharing=true)=>{
    session={status:'connected',sharing,profileId:'synthetic-profile',identity:{email:'synthetic@example.test'}}; listener?.(session);finish();
    for(let i=0;i<10;i++) await new Promise(resolve=>setImmediate(resolve));
  }};
}
test('devkit sign-in returns while browser login is pending, then exposes safe account and build models',async t=>{
  const h=await fixture(t);await h.account.refresh();await h.account.login();
  assert.equal(h.account.account.status,'connecting');assert.deepEqual(h.calls[0],{newProfile:true});
  await h.complete();assert.equal(h.account.account.planUsageEnabled,true);assert.equal(h.account.models[0].backend,'opencode');
  assert.equal((await h.account.credentials()).accessToken,'synthetic-host-token');
  assert.ok(!JSON.stringify(h.account.account).includes('synthetic-host-token'));
  assert.ok(!(await readFile(path.join(h.root,'chatgpt-devkit-mode.json'),'utf8')).includes('synthetic-host-token'));
  await h.account.logout();assert.equal(h.account.models.length,0);assert.equal(h.account.account.status,'disconnected');
});
test('identity-only sign-in cannot advertise build models; cancellation settles pending sign-in',async t=>{
  const h=await fixture(t);await h.account.login();await h.complete(false);
  assert.equal(h.account.account.status,'connected');assert.equal(h.account.models.length,0);
  assert.ok(!h.calls.includes('models'));
  await h.account.login('synthetic-profile');assert.equal(h.calls.at(-1).reconsent,true);
  await h.account.cancel();assert.equal(h.account.account.status,'disconnected');
});
