const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||require('os').homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(require('node:url').pathToFileURL(path.join(__dirname,'index.html')).href);
  const nav=async name=>{await page.locator(`[data-page="${name}"]`).click();};
  const action=name=>page.locator(`[data-action="${name}"]`).first().click();
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tt_preview_learning_v1')));
  await nav('study');
  let s=await state(),key=Object.keys(s.study)[0],plan=s.study[key];
  assert.equal(plan.list.length,50);assert.equal(new Set(plan.list).size,50);assert.equal(plan.group.length,5);
  assert.equal(await page.locator('.study-example').count(),0);
  const first=plan.group[0];await action('study-example');s=await state();assert.ok(s.words.some(w=>w.id===first));assert.equal(Object.keys(s.study[key].status).length,0);
  await action('study-forgot');await action('study-prev');assert.equal(await page.locator('.study-example').count(),0);await action('study-forgot');
  for(let i=0;i<4;i++)await action('study-learned');
  assert.equal(await page.locator('.study-result').count(),5);await page.screenshot({path:path.join(__dirname,'verification-study-group.png'),fullPage:true,animations:'disabled'});
  await action('study-next-group');s=await state();assert.equal(s.study[key].group[0],first);assert.equal(s.study[key].group.length,5);assert.equal(s.study[key].group.filter(w=>plan.group.includes(w)).length,1);
  await page.reload();await nav('study');assert.deepEqual((await state()).study[key].group,s.study[key].group);
  await page.screenshot({path:path.join(__dirname,'verification-study-card.png'),fullPage:true,animations:'disabled'});
  await nav('news');const dates=await page.locator('.news-row time').allTextContents();assert.deepEqual(dates,[...dates].sort().reverse());
  const today=(await state()).newsDaily;await page.reload();await nav('news');assert.deepEqual((await state()).newsDaily,today);
  const deleted=await page.locator('[data-action="delete-article"]').first().getAttribute('data-id');await page.locator('[data-action="delete-article"]').first().click();await page.locator('[data-yes]').click();await page.reload();await nav('news');assert.equal(await page.locator(`[data-id="${deleted}"]`).count(),0);
  await page.screenshot({path:path.join(__dirname,'verification-news.png'),fullPage:false,animations:'disabled'});
  await nav('settings');await page.locator('#api-key').fill('mock-only');await action('save-api');
  const requests=[];await page.route('https://dashscope.aliyuncs.com/**',async route=>{requests.push(route.request().postDataJSON());await route.fulfill({json:{choices:[{message:{content:'根据你选择的原文回答。'}}]}});});
  await nav('reading');await action('import');await page.locator('#article-title').fill('Selection verification');
  const body='Opening paragraph is not the quote.\n\nMiddle paragraph explains the scientific method clearly.\n\nFinal paragraph contains the precise evidence we need.';
  await page.locator('#article-body').fill(body);await page.locator('#article-published').fill('2026-10-21');await page.locator('[data-save]').click();
  assert.equal(await page.locator('#quote-button').isDisabled(),true);
  // Real mouse drag, not a script-created DOM selection.
  const target=page.locator('#reading-body p').last();await target.scrollIntoViewIfNeeded();const rect=await target.boundingBox();
  await page.mouse.move(rect.x+29,rect.y+17);await page.mouse.down();await page.mouse.move(rect.x+rect.width-8,rect.y+rect.height-12,{steps:20});await page.mouse.up();
  await page.waitForFunction(()=>!document.querySelector('#quote-button').disabled);
  const actual=await page.evaluate(()=>getSelection().toString());assert.ok(actual.includes('Final paragraph'));
  await action('quote');assert.equal(await page.locator('#current-quote blockquote').textContent(),actual.trim());assert.ok(!(await page.locator('#current-quote').textContent()).includes('Opening paragraph'));
  await page.locator('#chat-input').fill('这里的 evidence 指什么？');assert.equal(await page.locator('.assistant-float').isVisible(),true);assert.equal(await page.locator('#chat-input').inputValue(),'这里的 evidence 指什么？');assert.equal(await page.locator('#current-quote blockquote').textContent(),actual.trim());
  await action('send-chat');await page.waitForFunction(()=>document.querySelectorAll('.bubble').length===2);assert.ok(requests.at(-1).messages.at(-1).content.includes(actual.trim()));
  await action('minimize-chat');await page.locator('.assistant-launcher').click();assert.equal(await page.locator('.bubble').count(),2);await action('minimize-chat');
  // Replacing the selection with a real drag must use the middle paragraph.
  const middle=page.locator('#reading-body p').nth(1);await middle.scrollIntoViewIfNeeded();const mid=await middle.boundingBox();await page.mouse.move(mid.x+29,mid.y+17);await page.mouse.down();await page.mouse.move(mid.x+mid.width-8,mid.y+mid.height-12,{steps:20});await page.mouse.up();await page.waitForFunction(()=>!document.querySelector('#quote-button').disabled);await action('quote');assert.ok((await page.locator('#current-quote').textContent()).includes('Middle paragraph'));
  await action('general-chat');assert.equal(await page.locator('.bubble').count(),0);await page.locator('#chat-input').fill('解释倒装句');await action('send-chat');await page.waitForFunction(()=>document.querySelectorAll('.bubble').length===2);assert.ok(!requests.at(-1).messages[0].content.includes('Final paragraph'));
  await page.screenshot({path:path.join(__dirname,'verification-floating.png'),fullPage:false,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});for(const name of ['study','news','reading']){await nav(name);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow');}
  await page.screenshot({path:path.join(__dirname,'verification-floating-mobile.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);console.log('Revision checks passed: 50-word plan, carry-over groups, example collection, reload, news dates/deletion, real mouse selection, floating/shared and independent chats, mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
