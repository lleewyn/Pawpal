const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({timezoneId:'UTC'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><body><span id="notificationBadge"></span><div id="headerNotificationList"></div></body>'}));await page.goto('http://localhost/');
 await page.evaluate(()=>{
  localStorage.setItem('pawpal_current_user',JSON.stringify({id:'A'}));window.failRead=false;window.removed=0;
  window.PAWPAL_NOTIFICATION_PAGING_ENABLED=true;
  window.rows=[{id:'n1',sales_order_id:'order A',title:'Order <img src=x onerror="window.hacked=true">',content:'<script>unsafe</script>'},{id:'n2',appointment_id:'booking A',title:'Booking'},{id:'n3',support_ticket_id:'ticket A',title:'Ticket'}].map(r=>({...r,sent_at:'2026-10-26T03:00:00Z',read_at:null}));
  window.getSupabaseClient=()=>({rpc:async(name,args)=>name==='mark_own_notifications_read'?{data:0}:window.failRead?{error:{message:'offline'}}:{data:{customer_id:JSON.parse(localStorage.getItem('pawpal_current_user')).id,rows:window.rows.filter(r=>!args?.p_unread||!r.read_at).slice(((args?.p_page||1)-1)*10,(args?.p_page||1)*10),page:args?.p_page||1,total:window.rows.filter(r=>!args?.p_unread||!r.read_at).length,unread_count:window.rows.filter(r=>!r.read_at).length,snapshot_at:'2026-10-26T03:00:00Z'}},channel(){return {on(){return this;},subscribe(){return this;}};},removeChannel(){window.removed++;}});
 });
 const source=fs.readFileSync('components/header/header.js','utf8'),start=source.indexOf('    let selectedNotice='),end=source.indexOf('    function setupMobileAccountToggle()',start);
 await page.addScriptTag({content:source.slice(0,source.indexOf('    let cartBadgeRevision'))+source.slice(start,end)+'})();'});
 await page.evaluate(()=>window.openAllNotificationsModal({id:'n1'}));
 assert.match(await page.locator('#noticeCloudDetail').innerText(),/Order <img/);assert.equal(await page.locator('#noticeCloudDetail img, #noticeCloudDetail script').count(),0);assert.match(await page.locator('#noticeCloudRows').innerText(),/10:00/);
 for(const [id,href]of [['n1','/user#order-detail?id=order%20A'],['n2','/user#booking-detail?id=booking%20A'],['n3','/user#support?id=ticket%20A']]){await page.locator(`[data-notice="${id}"]`).click();assert.equal(await page.locator('#noticeCloudDetail a').getAttribute('href'),href);}
 await page.evaluate(()=>{window.failRead=true;document.dispatchEvent(new CustomEvent('notifications_updated'));});await page.waitForFunction(()=>document.querySelector('#noticeCloudError').textContent.length>0);
 await page.evaluate(()=>{window.failRead=false;document.dispatchEvent(new CustomEvent('notifications_updated'));});await page.waitForFunction(()=>document.querySelector('#noticeCloudError').textContent==='');
 await page.evaluate(()=>{window.rows=Array.from({length:23},(_,i)=>({id:'page-'+i,title:'Page row '+i,sent_at:'2026-10-26T03:00:00Z',read_at:i<12?'2026-10-26T04:00:00Z':null}));document.dispatchEvent(new CustomEvent('notifications_updated'));});await page.waitForFunction(()=>document.querySelectorAll('[data-notice]').length===10);
 assert.equal(await page.locator('#notificationBadge').textContent(),'9+');await page.locator('[data-page-next]').click();await page.waitForFunction(()=>document.querySelector('#noticePages').textContent.includes('2 / 3'));await page.locator('[data-page-next]').click();await page.waitForFunction(()=>document.querySelectorAll('[data-notice]').length===3);
 await page.locator('[data-notice-filter="unread"]').click();await page.waitForFunction(()=>document.querySelector('#noticePages').textContent.includes('1 / 2'));assert.equal(await page.locator('[data-notice]').count(),10);
 await page.evaluate(()=>{localStorage.setItem('pawpal_current_user',JSON.stringify({id:'B'}));window.rows=[];document.dispatchEvent(new CustomEvent('auth_state_changed'));});
 assert.equal(await page.locator('#notificationsCloudModal').count(),0);assert.equal(await page.evaluate(()=>window.removed),1);assert.deepEqual(errors,[]);
 console.log('PASS Chrome offline notification modal: order/booking/ticket links, escaped HTML, VN time, recovered error cleared, account change closes private modal. No Cloud.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
