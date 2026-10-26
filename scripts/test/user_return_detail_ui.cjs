const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({timezoneId:'UTC'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin!=='http://pawpal.test')return route.abort();
   if(url.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:fs.readFileSync('pages/user/modules/orders/return-detail.html','utf8')});
   if(url.pathname==='/scripts/api/api.js')return route.fulfill({contentType:'text/javascript',body:'export const API={initData:async()=>{}};'});
   const file=path.join(process.cwd(),url.pathname);if(!fs.existsSync(file))return route.abort();
   return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(file,'utf8')});
  });
  async function setup(){
   await page.goto('http://pawpal.test/?orderId=11111111-1111-4111-8111-111111111111');
   await page.evaluate(async()=>{
    localStorage.setItem('pawpal_current_user',JSON.stringify({id:'A'}));window.channels=0;window.removed=0;
    window.row={id:'return-A',sales_order_id:'order-A',request_status:'rejected',reason:'Customer reason',resolution_type:'Admin <img src=x onerror="window.hacked=true"> reason',created_at:'2026-10-26T03:00:00Z',return_type:'refund',return_request_detail:[]};
    window.getSupabaseClient=()=>({from(){const query={select(){return this;},eq(){return this;},order(){return this;},limit(){return this;},async maybeSingle(){if(window.hold)await new Promise(r=>window.release=r);return {data:window.row};}};return query;},channel(){window.channels++;return {on(){return this;},subscribe(){return this;}};},removeChannel(){window.removed++;}});
    window.module=await import('/pages/user/modules/orders/return-detail.js');
   });
  }
  await setup();await page.evaluate(()=>window.module.init());await page.waitForFunction(()=>!document.querySelector('.return-detail-loading'));
  assert.match(await page.locator('#rma-timeline').innerText(),/Admin <img/);assert.equal(await page.locator('#rma-timeline img').count(),0);assert.equal(await page.evaluate(()=>window.hacked),undefined);
  assert.match(await page.locator('#rma-date').innerText(),/10:00/);assert.equal(await page.evaluate(()=>window.channels),1);
  await page.evaluate(()=>{localStorage.setItem('pawpal_current_user',JSON.stringify({id:'B'}));document.dispatchEvent(new CustomEvent('auth_state_changed'));});
  assert.equal(await page.locator('#rma-timeline').count(),0);assert.match(await page.locator('.return-detail-module-container').innerText(),/Phiên tài khoản/);assert.equal(await page.evaluate(()=>window.removed),1);
  await setup();await page.evaluate(()=>{window.hold=true;window.loading=window.module.init();});await page.waitForFunction(()=>typeof window.release==='function');
  await page.evaluate(async()=>{window.module.dispose();window.release();await window.loading;});assert.equal(await page.evaluate(()=>window.channels),0);
  await setup();await page.evaluate(()=>{window.hold=true;window.loading=window.module.init();});await page.waitForFunction(()=>typeof window.release==='function');
  await page.evaluate(async()=>{localStorage.setItem('pawpal_current_user',JSON.stringify({id:'B'}));document.dispatchEvent(new CustomEvent('auth_state_changed'));window.release();await window.loading;});
  assert.equal(await page.evaluate(()=>window.channels),0);assert.equal(await page.locator('#rma-timeline').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS Chrome offline: real return detail HTML/module, escaped rejection reason, VN time in UTC browser, actor cleanup and no channel resurrection after pending load. No Cloud calls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
