// Isolated browser; no Supabase network or business writes.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));
  await page.goto('http://pawpal.test/');
  await page.setContent(fs.readFileSync('pages/admin/modules/settings/settings.html','utf8'));
  await page.evaluate(()=>{
   sessionStorage.setItem('pawpal_admin_active_module','Cấu hình');
   sessionStorage.setItem('pawpal_admin_user',JSON.stringify({id:'test-admin'}));
   window.reads=[];window.handlers={};
   const client={from(table){const q={};for(const name of ['select','order','range','limit','eq'])q[name]=()=>q;q.then=resolve=>{reads.push(table);return Promise.resolve({data:[],error:null}).then(resolve);};return q;},
    channel(){return {on(_type,filter,fn){handlers[filter.table]=fn;return this;},subscribe(){return this;}};},removeChannel(){}};
   window.getSupabaseClient=()=>client;
  });
  await page.addScriptTag({content:fs.readFileSync('pages/admin/admin-data-store.js','utf8')});
  await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/settings/settings.js','utf8')});
  await page.evaluate(()=>PawpalSettings.init());
  let reads=await page.evaluate(()=>window.reads);
  assert.ok(reads.includes('banner'));assert.ok(!reads.includes('audit_log'));assert.ok(!reads.includes('blog_post'));
  await page.evaluate(()=>{reads.length=0;for(let i=0;i<50;i++)handlers.banner();});await page.waitForTimeout(500);
  reads=await page.evaluate(()=>window.reads);
  assert.equal(reads.filter(t=>t==='banner').length,1);assert.ok(!reads.includes('pawpal_setting'));assert.ok(!reads.includes('audit_log'));
  await page.evaluate(()=>{reads.length=0;handlers.blog_post();});await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>reads.length),0,'inactive subtab invalidates without fetching');
  await page.evaluate(()=>PawpalSettings.switchSubtab('tab-content-management'));
  reads=await page.evaluate(()=>window.reads);assert.ok(reads.includes('blog_post'));assert.ok(!reads.includes('audit_log'));
  await page.evaluate(()=>{reads.length=0;return PawpalSettings.switchSubtab('tab-banner-promos');});
  assert.equal(await page.evaluate(()=>reads.length),0,'return to cached tab does not query');
  assert.deepEqual(errors,[]);
  console.log('PASS settings lazy groups, targeted burst refresh, inactive-subtab invalidation and cached return; no live network.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
