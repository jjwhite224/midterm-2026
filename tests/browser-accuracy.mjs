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
  await page.waitForFunction(()=>Number(document.querySelector('#kpi-races')?.textContent)>0,{timeout:20000});
  assert.match(await page.locator('#kpi-signed').textContent(),/^[+\-]?[0-9]+\.[0-9]{2} pp$/);
  await page.locator('#coverage-chart .coverage-row').first().waitFor({state:'visible',timeout:20000});
  assert.equal(await page.locator('#coverage-chart .coverage-row').count(),4);
  const main=await page.locator('#main').count();assert.equal(main,1);
  if(width===1440){
    await page.locator('#scenario').selectOption('window30_partisan');
    await page.waitForFunction(()=>Number(document.querySelector('#kpi-races')?.textContent)>=35);
    await page.locator('#tier').selectOption('exploratory');
    await page.waitForFunction(()=>Number(document.querySelector('#kpi-races')?.textContent)>=73);
    await page.locator('#scenario').selectOption('window30');
    await page.waitForFunction(()=>Number(document.querySelector('#kpi-races')?.textContent)>=49);
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
    await page.locator('#scenario').selectOption('window30');
    await page.locator('#evidence').selectOption('all');
    await page.locator('.race-tile').first().click();
    assert.equal(await page.locator('#race-detail-dialog').isVisible(),true);
    assert.ok((await page.locator('#detail-title').textContent()).length>4);
    assert.ok(await page.locator('#detail-poll-list .detail-poll-row').count()>0);
    const firstRace=await page.locator('#detail-title').textContent();
    const firstPoll=page.locator('.detail-poll-row').first();
    await firstPoll.click();
    assert.ok(await page.locator('#detail-poll-inspector').isVisible());
    assert.ok((await page.locator('#detail-poll-inspector').textContent()).includes('FIELDWORK END'));
    assert.ok((await page.locator('#detail-permalink').getAttribute('href')).includes('race='));
    assert.equal(await page.locator('.detail-poll-navigation button').count(),2);
    const navButtons=page.locator('.detail-poll-navigation button');
    if(await navButtons.nth(0).isEnabled()){
      const previousPoll=await page.locator('#detail-poll-inspector h4').textContent();
      await navButtons.nth(0).click();
      assert.ok((await page.locator('#detail-poll-inspector h4').textContent()).length>0);
      assert.ok((await page.locator('#detail-poll-list [aria-pressed="true"]').count())===1);
    }
    await page.locator('#detail-all-polls').click();
    assert.equal(await page.locator('#detail-all-polls').getAttribute('aria-pressed'),'true');
    await page.locator('#detail-next').click();
    assert.notEqual(await page.locator('#detail-title').textContent(),firstRace);
    assert.match(page.url(),/race=/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#race-detail-dialog').isVisible(),false);
    await page.waitForFunction(()=>!new URL(location.href).searchParams.has('race'));
    assert.ok(!new URL(page.url()).searchParams.has('race'));
    await page.locator('[data-race-preset="largest"]').click();
    assert.equal(await page.locator('[data-race-preset="largest"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-race-preset="all"]').click();
    assert.equal(await page.locator('#race-card-count').textContent(),'470 matching races');
    await page.locator('#search-race').fill('New Hampshire');
    assert.ok((await page.locator('#race-card-count').textContent()).includes('matching races'));
    await page.locator('#search-race').fill('');
    await page.locator('[data-race-preset="polled"]').click();
  }
  if(width<1000){
    await page.locator('.race-tile').first().click();
    assert.equal(await page.locator('#race-detail-dialog').isVisible(),true);
    const overflowDialog=await page.evaluate(()=>document.querySelector('#race-detail-dialog').scrollWidth-document.querySelector('#race-detail-dialog').clientWidth);
    assert.ok(overflowDialog<=3,'dialog overflow '+overflowDialog+'px');
    await page.locator('#detail-close').click();
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
