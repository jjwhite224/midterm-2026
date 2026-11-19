import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const failures=[];
for(const width of [1440,768,375]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const res=await page.goto('http://127.0.0.1:5173/accuracy.html',{waitUntil:'networkidle'});
  assert.equal(res?.status(),200);
  await page.waitForFunction(()=>document.querySelector('#kpi-races')?.textContent==='22',{timeout:20000});
  assert.equal(await page.locator('#kpi-signed').textContent(),'+6.33 pp');
  await page.locator('#coverage-chart .coverage-row').first().waitFor({state:'visible',timeout:20000});
  assert.equal(await page.locator('#coverage-chart .coverage-row').count(),4);
  const main=await page.locator('#main').count();assert.equal(main,1);
  if(width===1440){
    await page.locator('#scenario').selectOption('window30_partisan');
    await page.waitForFunction(()=>document.querySelector('#kpi-races')?.textContent==='35');
    await page.locator('#tier').selectOption('exploratory');
    await page.waitForFunction(()=>document.querySelector('#kpi-races')?.textContent==='73');
    await page.locator('#scenario').selectOption('window30');
    await page.waitForFunction(()=>document.querySelector('#kpi-races')?.textContent==='49');
    await page.locator('#evidence').selectOption('provisional_comparison');
    await page.locator('#accuracy-rows .accuracy-source-button').first().click();
    assert.equal(await page.locator('#race-sources').isVisible(),true);
    assert.ok(await page.locator('#race-sources-list a').count()>0);
    assert.ok(await page.locator('#race-compare-chart svg').count()>0);
    await page.locator('#close-race-sources').click();
    assert.equal(await page.locator('#race-sources').isVisible(),false);
    await page.locator('.sensitivity-choose').first().click();
    await page.waitForFunction(()=>document.querySelector('#scenario')?.value==='window21');
    assert.ok(await page.locator('#sensitivity-chart .sensitivity-line').count()===5);
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=3,`horizontal body overflow ${overflow}px at ${width}px`);
  assert.deepEqual(errors,[],`JavaScript page errors at width ${width}`);
  await page.screenshot({path:`/tmp/accuracy-${width}.png`,fullPage:true});
  await page.close();
}
const home=await browser.newPage();
await home.goto('http://127.0.0.1:5173/index.html',{waitUntil:'domcontentloaded'});
assert.ok(await home.locator('a[href="./accuracy.html"]').count()>0);
await browser.close();
console.log('Browser smoke passed: 1440, 768 and 375px, filters, source panel, live CSVs, accessible text, no JS exceptions or horizontal overflow.');
