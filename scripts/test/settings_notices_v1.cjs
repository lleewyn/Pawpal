const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');const {browserPage,service,admin,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{const original=await ok(service.from('pawpal_setting').select('*').eq('setting_key','system_config').maybeSingle());const {browser,page}=await browserPage(),content='Notice verification '+randomUUID()+' <img src=x onerror=alert(1)>';
 try{
  await page.locator('[data-title="Cấu hình"]').click();await page.waitForFunction(()=>window.PawpalSettings?.state.isLoaded);await page.evaluate(()=>{PawpalSettings.state.isSafeModeLocked=false;PawpalSettings.updateSafeModeUI();});
  await page.locator('[data-tab="tab-banner-promos"]').click();await page.locator('[data-settingstab="mkt-notices"]').click();await page.locator('#btnAddNoticeLink').click();await page.locator('#inputNoticeContent').fill(content);
  await page.screenshot({path:infra+'/settings-notice-v1.private.png'});await page.locator('#btnSaveNotice').click();await page.waitForFunction(()=>!document.getElementById('notificationModalOverlay').classList.contains('active'));
  const notices=await ok(admin.rpc('get_public_site_notices'));assert.ok(notices.some(n=>n.content===content));assert.equal(await page.locator('#mkt-notices img[src="x"]').count(),0);
  const visitor=await browser.newPage();
  await visitor.route('**/rest/v1/**',async route=>{const url=new URL(route.request().url());const response=await route.fetch({url:'http://localhost:8011'+url.pathname.replace(/^\/rest\/v1/,'')+url.search});await route.fulfill({response});});
  await visitor.goto('http://localhost:3001/');
  const header=await (await visitor.request.get('http://localhost:3001/components/header/header.html')).text();
  await visitor.setContent(header);await visitor.addScriptTag({url:'http://localhost:3001/components/header/header.js'});
  await visitor.waitForFunction(content=>document.getElementById('pawpal-public-topbar-notice')?.textContent.includes(content),content);
  assert.equal(await visitor.locator('#pawpal-public-topbar-notice img').count(),0);await visitor.close();
  const noticeId=notices.find(n=>n.content===content).id;
  await page.locator('.btn-edit-notice[data-id="'+noticeId+'"]').click();await page.locator('#inputNoticeContent').fill(content+' edited');await page.locator('#btnSaveNotice').click();await page.waitForFunction(()=>!document.getElementById('notificationModalOverlay').classList.contains('active'));
  assert.ok((await ok(admin.rpc('get_public_site_notices'))).some(n=>n.id===noticeId&&n.content===content+' edited'));
  await page.reload();await page.waitForFunction(()=>window.PawpalSettings?.state.isLoaded);assert.ok(await page.evaluate(content=>PawpalSettings.state.notificationsList.some(n=>n.content===content+' edited'),content));
  console.log('PASS notice browser save, public safe RPC, literal markup rendering and reload persistence.');
 }finally{await browser.close();if(original)await ok(service.from('pawpal_setting').upsert(original));else await ok(service.from('pawpal_setting').delete().eq('setting_key','system_config'));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
