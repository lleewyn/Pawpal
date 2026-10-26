const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin!=='http://pawpal.test')return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:fs.readFileSync('pages/user/modules/orders/orders.html','utf8')});
  if(url.pathname==='/scripts/api/api.js')return route.fulfill({contentType:'text/javascript',body:'export const API={getUserOrders:async owner=>{window.reads++;if(window.hold)await new Promise(r=>window.release=r);return [{id:"PRIVATE-"+owner,status:"completed",paymentStatus:"paid",total:100000,products:[]}];}};'});
  if(/\/(return-handler|review-handler)\.js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:''});
  const file=path.join(process.cwd(),url.pathname);if(!fs.existsSync(file))return route.abort();return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(file,'utf8')});
 });
 async function setup(){await page.goto('http://pawpal.test/');await page.evaluate(async()=>{
  localStorage.setItem('pawpal_current_user',JSON.stringify({id:'A'}));window.reads=0;window.channels=0;window.removed=0;
  window.SupabaseClient={channel(){window.channels++;return {on(){return this;},subscribe(){return this;}};},removeChannel(){window.removed++;}};
  window.mod=await import('/pages/user/modules/orders/orders.js');
 });}
 await setup();await page.evaluate(()=>window.mod.init());assert.match(await page.locator('#orders-list').innerText(),/PRIVATE-A/);
 await page.evaluate(()=>{localStorage.setItem('pawpal_current_user',JSON.stringify({id:'B'}));document.dispatchEvent(new CustomEvent('auth_state_changed'));});
 assert.ok(!(await page.locator('#orders-list').innerText()).includes('PRIVATE-A'));assert.equal((await page.locator('#total-spent').innerText()).replace(/[^0-9]/g,''),'0');assert.equal(await page.evaluate(()=>window.removed),1);
 await page.evaluate(()=>window.mod.init());assert.match(await page.locator('#orders-list').innerText(),/PRIVATE-B/);
 await setup();await page.evaluate(()=>{window.hold=true;window.loading=window.mod.init();});await page.waitForFunction(()=>typeof window.release==='function');
 await page.evaluate(async()=>{localStorage.setItem('pawpal_current_user',JSON.stringify({id:'B'}));document.dispatchEvent(new CustomEvent('auth_state_changed'));window.release();await window.loading;});
 assert.ok(!(await page.locator('#orders-list').innerText()).includes('PRIVATE-A'));assert.equal(await page.evaluate(()=>window.removed),1);
 await setup();await page.evaluate(()=>{window.hold=true;window.loading=window.mod.init();});await page.waitForFunction(()=>typeof window.release==='function');await page.evaluate(async()=>{window.mod.dispose();window.release();await window.loading;});assert.ok(!(await page.locator('#orders-list').innerText()).includes('PRIVATE-A'));
 assert.deepEqual(errors,[]);console.log('PASS Chrome offline: real orders HTML/module, actor change clears private rows/stats/channel, delayed response and disposed mount cannot render A. No Cloud calls.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
