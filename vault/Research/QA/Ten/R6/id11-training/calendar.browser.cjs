// Development browser regression. Requires an existing Playwright installation.
const test=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
for(const viewport of [{width:1280,height:800},{width:390,height:844}])test(`Wednesday-start calendar and edit recovery ${viewport.width}px`,async()=>{
 const {start}=await import('./server.mjs');const app=await start({port:0});
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(app.url);await page.click('#load-baseline');await page.fill('#week-date','2026-11-11');await page.click('#new-week');await page.click('#optimize');
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Feasible synthetic draft'));
  const headings=['Wed 2026-11-11','Thu 2026-11-12','Fri 2026-11-13','Sat 2026-11-14','Sun 2026-11-15','Mon 2026-11-16','Tue 2026-11-17'];
  assert.deepEqual(await page.locator('#board .day h3').allTextContents(),headings);
  assert.deepEqual((await page.locator('#heatmap tr').first().locator('th').allTextContents()).slice(1,8),headings);
  assert.match(await page.locator('#board .day[data-date="2026-11-11"] #allocation-DC-1').innerText(),/Wed 09:00–10:00 UTC/);
  assert.match(await page.locator('#board .day[data-date="2026-11-12"] #allocation-ENG-1').innerText(),/Thu 09:00–10:00 UTC/);
  assert.deepEqual(await page.locator('#heatmap tr').nth(1).locator('td').allTextContents(),['60','60','0','0','0','0','0','0','120']);
  await page.fill('#edit-start-ENG-1','540');await page.click('#apply-edit-ENG-1');await page.click('#check-board');
  await page.waitForFunction(()=>document.querySelector('#board-check').textContent.startsWith('Invalid board:'));
  assert.equal(await page.locator('#acknowledge').isDisabled(),true);
  await page.click('#optimize');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Feasible synthetic draft'));
  assert.deepEqual(await page.locator('#board .day h3').allTextContents(),headings);
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await app.close();}
});
