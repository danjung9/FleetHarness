// Additional browser integration gate; run explicitly with node --test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {start} from '../server.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const evidence=process.env.OFFLINE_EVIDENCE_DIR;
for(const [name,viewport] of [['desktop',{width:1280,height:800}],['narrow',{width:390,height:844}]]){
 test(`actual disconnected reload, new parse, recovery, save, review and download (${name})`,async t=>{
  const app=await start({port:0});t.after(()=>app.close());
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
  const context=await browser.newContext({viewport,acceptDownloads:true,serviceWorkers:'allow'});
  const temp=await mkdtemp(path.join(tmpdir(),'optask-download-'));
  const errors=[];const requests=[];
  try{
   if(evidence){await mkdir(evidence,{recursive:true});await context.tracing.start({screenshots:true,snapshots:true,sources:true});}
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(r.url().endsWith('/api/invoke'))requests.push(r.headers());});
   await page.goto(app.url);
   await page.locator('#load-sample').click();await page.locator('#parse').click();
   await page.waitForFunction(()=>document.querySelector('#counts').textContent==='4 extracted · 3 selected · 0 issues');
   await page.locator('#save-draft').click();
   await page.locator('#prepare-offline').click();
   await page.waitForFunction(()=>document.querySelector('#offline-status').textContent==='Ready for offline parsing');
   // Disconnect all browser networking, without using the route simulation button.
   await context.setOffline(true);
   assert.equal(await page.evaluate(()=>navigator.onLine),false);
   await page.reload({waitUntil:'load'});
   await page.waitForFunction(()=>document.querySelector('#counts').textContent==='4 extracted · 3 selected · 0 issues');
   await assert.rejects(page.evaluate(()=>fetch('/health?uncached-offline-probe').then(r=>r.text())));
   const raw=['SYNTHETIC OPTASK — NOT REAL USMTF','MSGID/DISCONNECTED-NEW//',
    'FREQPLAN/NEW-FP/FS AURORA/OFFLINE RADIO/2026-11-05T11:00Z/2026-11-05T12:00Z/278.25/MHz//',
    'CRYPTO/NEW-CW/FS AURORA/OFFLINE WINDOW/2026-11-05T12:00Z/2026-11-05T12:20Z//',
    'FLIGHTQ/NEW-FQ/FS AURORA/OFFLINE FLIGHT/2026-11-05T23:45Z/2026-11-06T00:15Z//','ENDMSG//'].join('\n');
   await page.locator('#raw-text').fill('');await page.locator('#parse').click();
   await page.waitForFunction(()=>document.querySelector('#issue-message')?.textContent==='Enter a synthetic OPTASK message.');
   assert.equal(await page.locator('#export').isDisabled(),true);
   await page.locator('#raw-text').fill(raw);await page.locator('#parse').click();
   await page.waitForFunction(()=>document.querySelector('#counts').textContent==='3 extracted · 3 selected · 0 issues');
   assert.match(await page.locator('#frequency-output').innerText(),/278.25 MHz · 11:00–12:00 UTC/);
   assert.match(await page.locator('#crypto-output').innerText(),/12:00–12:20 UTC/);
   assert.match(await page.locator('#flight-output').innerText(),/23:45–24:00 UTC/);
   await page.locator('#save-draft').click();
   // A second disconnected reload proves persistence of the newly changed message.
   await page.reload({waitUntil:'load'});
   await page.waitForFunction(()=>document.querySelector('#counts').textContent==='3 extracted · 3 selected · 0 issues');
   assert.equal(await page.locator('#raw-text').inputValue(),raw);
   assert.equal(await page.locator('#export').isDisabled(),true);
   await page.locator('#reviewed').check();await page.locator('#confirm-review').click();
   assert.equal(await page.locator('#review-status').innerText(),'Reviewed draft · synthetic only');
   const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();
   const download=await downloadPromise;assert.equal(download.suggestedFilename(),'synthetic-schedule.json');
   const file=path.join(temp,'schedule.json');await download.saveAs(file);
   const exported=JSON.parse(await readFile(file,'utf8'));
   assert.equal(exported.originalText,raw);assert.equal(exported.reviewStatus,'reviewed-draft');
   assert.equal(exported.provenance,'Synthetic; not validated against the real USMTF format.');
   assert.equal(exported.messageId,'DISCONNECTED-NEW');assert.equal(exported.selectedShip,'FS AURORA');
   assert.equal(exported.selectedDay,'2026-11-05');assert.equal(exported.timezone,'UTC');
   assert.deepEqual(exported.unresolvedIssueCodes,[]);
   assert.deepEqual(exported.events.map(e=>[e.category,e.id,e.startUtc,e.endUtc,e.frequency,e.unit,e.durationMinutes,e.displaySegment]),[
    ['frequency plan','NEW-FP','2026-11-05T11:00Z','2026-11-05T12:00Z',278.25,'MHz',60,{startMinute:660,endMinute:720}],
    ['crypto change-over window','NEW-CW','2026-11-05T12:00Z','2026-11-05T12:20Z',null,null,20,{startMinute:720,endMinute:740}],
    ['flight quarters','NEW-FQ','2026-11-05T23:45Z','2026-11-06T00:15Z',null,null,30,{startMinute:1425,endMinute:1440}]]);
   for(const e of exported.events)for(const span of [e.source,e.categorySource,e.messageIdSource,...Object.values(e.fields)])assert.equal(raw.slice(span.start,span.end),span.text);
   assert.ok(requests.length>=5);assert.ok(requests.every(h=>!h['x-offline-route']));assert.deepEqual(errors,[]);
   if(evidence){await page.locator('#schedule').screenshot({path:path.join(evidence,`${name}-schedule.png`)});await download.saveAs(path.join(evidence,`${name}-download.json`));}
  }finally{
   if(evidence)await context.tracing.stop({path:path.join(evidence,`${name}-trace.zip`)});
   await context.close();await browser.close();await rm(temp,{recursive:true,force:true});
  }
 });
}
