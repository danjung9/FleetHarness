import { stubCodexGoalLaunch } from './codex-goal-smoke-fixture.mjs';
import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { norfolkSnapshot } from '../dist-electron/harness/norfolk-snapshot.js';
import { toProjectInput } from '../dist-electron/harness/catalog.js';

const root=await fs.mkdtemp(path.join(os.tmpdir(),'fleet-norfolk-ui-'));
const output=path.resolve('output/playwright/norfolk');
await fs.mkdir(output,{recursive:true});
let app;
try {
  app=await electron.launch({args:['.'],env:{...process.env,FLEET_USER_DATA:path.join(root,'state'),PI_CODING_AGENT_DIR:path.join(root,'pi')}});
  const page=await app.firstWindow();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await stubCodexGoalLaunch(app);
  await page.getByRole('region',{name:'Home workspace',exact:true}).getByRole('button',{name:'New challenge',exact:true}).click();
  await page.getByRole('button',{name:`Norfolk catalog · ${norfolkSnapshot.useCases.length}`,exact:true}).click();
  await app.evaluate(()=>{globalThis.fetch=async()=>{throw new Error('Offline test');};});
  await page.getByRole('button',{name:'Refresh from Norfolk',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Could not refresh Norfolk'}).waitFor();
  assert.equal(await page.locator('.catalog-results>button').count(),norfolkSnapshot.useCases.length);
  assert.equal((await page.evaluate(()=>window.fleetHarness.bootstrap())).state.norfolkCatalog,undefined);
  await app.evaluate((_,sources)=>{
    const records=[...sources,{...sources.find(c=>c.id===37),id:99,name:'Newly published Norfolk challenge'}];
    globalThis.fetch=async url=>String(url).endsWith('/combined/') ? Response.json({event:{id:1},use_cases:records.map(({id})=>({id}))})
      : Response.json({...records.find(c=>String(url).endsWith(`/use-cases/${c.id}/`)),event_id:1,is_active:true});
  },norfolkSnapshot.useCases);
  await page.getByRole('button',{name:'Refresh from Norfolk',exact:true}).click();
  await page.getByRole('button',{name:`Norfolk catalog · ${norfolkSnapshot.useCases.length+1}`,exact:true}).waitFor();
  assert.equal(await page.getByRole('alert').count(),0);
  await page.getByPlaceholder('Search title, category, or challenge ID').fill('Sailor-Built');
  await page.locator('.catalog-results>button').click();
  const expected=toProjectInput('37');
  assert.equal(await page.getByLabel('Challenge title',{exact:true}).inputValue(),expected.title);
  assert.equal(await page.getByPlaceholder('Who is affected? What happens today? What outcome would count as success?').inputValue(),expected.description);
  assert.equal(await page.getByLabel(/^Evaluation criteria \(optional\)/).inputValue(),expected.criteria.join('\n'));
  assert.equal(await page.getByLabel(/^Resources \(optional\)/).inputValue(),expected.resources);
  assert.equal(await page.getByLabel(/^Links \(optional\)/).inputValue(),expected.links.join('\n'));
  await page.screenshot({path:path.join(output,'norfolk-brief.png'),scale:'css'});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1120,720));
  await page.getByLabel(/^Links \(optional\)/).scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,'norfolk-fields-minimum.png'),scale:'css'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:'Save & open Codex',exact:true}).click();
  await page.getByRole('heading',{name:'Build phases',exact:true}).waitFor();
  const saved=(await page.evaluate(()=>window.fleetHarness.bootstrap())).state.projects[0];
  assert.equal(saved.challengeId,'37');assert.deepEqual(saved.criteria,expected.criteria);assert.equal(saved.resources,expected.resources);assert.deepEqual(saved.links,expected.links);
  assert.equal(saved.sourceChallenge.id,'37');
  await page.reload();
  const restored=(await page.evaluate(()=>window.fleetHarness.bootstrap())).state;
  assert.deepEqual(restored.projects[0],saved);assert.equal(restored.norfolkCatalog.challenges.length,40);
  const newProject=await page.evaluate(async()=>window.fleetHarness.createProject({title:'New source',description:'Use the newly published source requirements.',criteria:[],challengeId:'99'}));
  assert.equal(newProject.sourceChallenge.id,'99');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,refreshRecovery:true,newChallengeImport:true,officialFields:true,persistence:true,screenshots:output},null,2));
} finally {await app?.close();await fs.rm(root,{recursive:true,force:true});}
