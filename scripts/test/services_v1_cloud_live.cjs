// Read-only browser acceptance for the deployed service migration phase.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});let page;const errors=[],legacy=[],writes=[];try{
 page=await browser.newPage({viewport:{width:1440,height:1050}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
 page.on('request',r=>{const u=new URL(r.url());if((u.hostname.endsWith('.supabase.co')&&u.hostname!=='cpzuvaplseielhgcnqrn.supabase.co')||u.hostname.endsWith('.trycloudflare.com')||u.pathname.startsWith('/data/'))legacy.push(u.hostname+u.pathname);});
 await page.route('**/rest/v1/**',async route=>{const pathname=new URL(route.request().url()).pathname;const readOnlyContext=['/rest/v1/rpc/get_staff_login_context','/rest/v1/rpc/get_admin_service_cashier'].includes(pathname);if(!['GET','HEAD'].includes(route.request().method())&&!readOnlyContext){writes.push(pathname);return route.abort();}return route.continue();});
 await page.goto('https://pawpalgr3.vercel.app/admin/login');await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());await page.locator('#btnSubmitAdminLogin').click();await page.waitForURL('**/admin#tab-list');
 await page.evaluate(()=>location.hash='tab-service-bookings');await page.waitForFunction(()=>window.PawpalServices?.state.isLoaded||window.PawpalServices?.state.loadError);
 const summary=await page.evaluate(async()=>{
  const m=PawpalServices,db=getSupabaseClient();await Promise.all([m.loadCatalogData({force:true}),m.loadReviewsData({force:true})]);
  const [appointments,totals,services,reviews,phones]=await Promise.all([db.from('appointment').select('id,appointment_status,customer_id,scheduled_start_at'),db.from('appointment_totals').select('*'),db.from('service').select('id,status'),db.from('review').select('id').not('appointment_item_id','is',null),db.from('customer_phone').select('customer_id,phone_number').eq('is_primary',true)]);
  if([appointments,totals,services,reviews,phones].some(r=>r.error))throw Error('Could not load service verification sources');
  const mismatch=m.state.bookingsData.filter(b=>{const a=appointments.data.find(a=>a.id===b.dbId);return !a||b.status!==a.appointment_status||Number(b.total)!==Number(totals.data.find(t=>t.appointment_id===b.dbId)?.total_price)||b.phone!==(phones.data.find(p=>p.customer_id===a.customer_id)?.phone_number||'—');}).length;
  const logs=await db.from('care_log').select('appointment_id').limit(1);if(logs.error)throw logs.error;
  const booking=m.state.bookingsData.find(b=>b.dbId===logs.data[0]?.appointment_id)||m.state.bookingsData[0];
  if(booking){await m.fetchBookingCareLogs(booking.dbId);m.openBookingDetail(booking.id);}
  return {bookings:m.state.bookingsData.length,sourceBookings:appointments.data.length,services:m.state.servicesData.length,sourceServices:services.data.length,reviews:m.state.reviewsData.length,sourceReviews:reviews.data.length,mismatch,loadError:m.state.loadError,aux:m.state.auxiliaryErrors};
 });
 assert.equal(summary.bookings,summary.sourceBookings);assert.equal(summary.services,summary.sourceServices);assert.equal(summary.reviews,summary.sourceReviews);assert.equal(summary.mismatch,0);assert.equal(summary.loadError,null);assert.ok(!Object.values(summary.aux||{}).some(Boolean));
 await page.locator('#btnNotifyCustomerPickup').click();
 assert.equal(await page.locator('#btnSendNotifyPickup').textContent(),'Lưu thông báo');
 assert.equal(await page.locator('input[name="pickupChannel"]').count(),0);
 assert.equal(await page.locator('#notifyPickupReady').isChecked(),false);
 assert.ok((await page.locator('#notifyPickupMessageText').inputValue()).trim());
 await page.screenshot({path:infra+'/verification/v1-pickup-cloud-modal.png',fullPage:true});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>getComputedStyle(document.getElementById('modalNotifyPickup')).display==='none');
 await page.locator('#btnSettleToPos').click();await page.waitForFunction(()=>!document.getElementById('btnSaveServiceMoney').disabled||document.getElementById('cashierError').textContent);
 assert.equal(await page.locator('#cashierError').textContent(),'');assert.ok((await page.locator('#cashierMethod option').count())>1);
 await page.screenshot({path:infra+'/verification/v1-service-cashier-cloud.png',fullPage:true});await page.keyboard.press('Escape');await page.waitForFunction(()=>getComputedStyle(document.getElementById('modalServiceCashier')).display==='none');
 await page.evaluate(()=>{const b=PawpalServices.state.bookingsData.find(b=>['in_progress','completed','no_show'].includes(b.status));if(b)PawpalServices.openBookingDetail(b.id);});
 await page.locator('.btn-action-complaint').click();await page.waitForFunction(()=>!document.getElementById('serviceTicketHistory').textContent.includes('Đang tải'));
 assert.equal(await page.locator('#serviceTicketError').textContent(),'');await page.screenshot({path:infra+'/verification/v1-service-ticket-cloud.png',fullPage:true});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>getComputedStyle(document.getElementById('modalServiceTicket')).display==='none');
 await page.evaluate(()=>PawpalServices.switchSubtab('tab-service-bookings'));await page.locator('#btnOpenStaffScheduleModal').click();await page.waitForFunction(()=>!document.getElementById('staffScheduleGrid').textContent.includes('Đang tải'));
 assert.ok(!(await page.locator('#staffScheduleGrid').textContent()).includes('Không thể tải'));await page.keyboard.press('Escape');
 for(const tab of ['tab-service-bookings','tab-service-detail','tab-service-catalog','tab-service-reviews']){await page.evaluate(t=>PawpalServices.switchSubtab(t),tab);await page.waitForTimeout(300);}
 await page.locator('[data-review-filter="low_rating"]').click();
 const low=await page.evaluate(()=>({expected:PawpalServices.state.reviewsData.filter(r=>r.rating>=1&&r.rating<=3).length,actual:document.querySelectorAll('#servicesReviewTableBody tr[data-review-id]').length,kpi:Number(document.getElementById('statLowRatingReviews').textContent)}));
 assert.equal(low.actual,Math.min(low.expected,10));assert.equal(low.kpi,low.expected);
 await page.waitForFunction(()=>getSupabaseClient().getChannels().some(c=>c.topic.includes('admin-services-live-sync')&&c.state==='joined'));
 await page.evaluate(()=>PawpalServices.switchSubtab('tab-service-bookings'));await page.reload();await page.waitForFunction(()=>window.PawpalServices?.state.isLoaded);
 assert.deepEqual(errors,[]);assert.deepEqual(legacy,[]);assert.deepEqual(writes,[]);
 await page.screenshot({path:infra+'/verification/v1-services-cloud-list.png',fullPage:true});
 fs.writeFileSync(infra+'/services-cloud-read-verification.private.txt',JSON.stringify({verifiedAt:new Date().toISOString(),...summary}));
 console.log('PASS Production Services V1: '+summary.bookings+' source-matched bookings/status/totals/phones, '+summary.services+' services, '+summary.reviews+' reviews, care logs, cashier/schedule/ticket/notification views, four tabs, Realtime joined, reload; no old Cloud/tunnel/JSON, REST/JS errors or business writes.');
}catch(e){if(page){await page.screenshot({path:infra+'/verification/v1-services-cloud-failure.png',fullPage:true}).catch(()=>{});console.error('Service browser state:',JSON.stringify({url:page.url(),errors,legacy,writes,state:await page.evaluate(()=>({loaded:window.PawpalServices?.state.isLoaded,error:window.PawpalServices?.state.loadError,channels:window.getSupabaseClient?.()?.getChannels().map(c=>({topic:c.topic,state:c.state}))})).catch(()=>null)}));}throw e;}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
