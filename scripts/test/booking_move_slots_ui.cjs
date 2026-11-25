const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const base='http://localhost:4567';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'UTC'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const html='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.min.css"><link rel="stylesheet" href="/styles/style.css"><link rel="stylesheet" href="/pages/user/user.css"><link rel="stylesheet" href="/pages/user/modules/bookings/bookings.css"><body class="user-portal-body"><main style="max-width:1100px;margin:40px auto;padding:20px">'+fs.readFileSync('my-client/pages/user/modules/bookings/bookings.html','utf8')+'</main></body>';
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin!==base)return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
  if(url.pathname==='/scripts/api/api.js')return route.fulfill({contentType:'text/javascript',body:'export const API={getUserBookingPage:async()=>{window.pageLoads=(window.pageLoads||0)+1;return {rows:[window.fixtureBooking],meta:{page:1,pages:1,total:1,counts:{all:1,confirmed:1}}};}};'});
  const target=path.resolve('.','.'+url.pathname);assert.ok(target.startsWith(process.cwd()+path.sep));
  if(fs.existsSync(target))return route.fulfill({contentType:target.endsWith('.css')?'text/css':target.endsWith('.js')||target.endsWith('.mjs')?'text/javascript':'image/png',body:fs.readFileSync(target)});
  return route.fulfill({status:404,body:''});
 });
 await page.goto(base+'/');
 await page.evaluate(async()=>{
  const day=new Date(Date.now()+4*86400000).toISOString().slice(0,10);window.moveDay=day;window.calls=[];window.mode='valid';window.saved=0;
  window.fixtureBooking={_supabaseId:'booking',id:'BKG-KIEM-THU',bookingStatus:'da_xac_nhan',status:'confirmed',serviceName:'Cắt móng và vệ sinh tai',serviceCategory:'grooming_spa',petName:'Heo',petSpecies:'Chó',scheduledStartAt:day+'T01:30:00Z',scheduledEndAt:day+'T02:30:00Z',date:day,time:'08:30',price:100000,changeCount:0,items:[]};
  localStorage.setItem('pawpal_current_user',JSON.stringify({id:'owner'}));
  window.getSupabaseClient=()=>({auth:{getUser:async()=>({data:{user:{id:'auth'}}})},from(){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{id:'owner',customer_status:'active'}})};return q;},async rpc(name,args){
   calls.push({name,args});
   if(name==='own_booking_move_services')return {data:{current_service_id:'current',services:[{id:'current',name:'Cắt móng và vệ sinh tai'},{id:'upgrade',name:'Tắm và cắt tỉa toàn diện'}]}};
   if(name==='own_booking_move_day_slots'){
    const mode=window.mode;if(mode==='slow')await new Promise(resolve=>window.releaseSlots=resolve);
    if(mode==='limit')return {error:{message:'booking_move_limit_reached'}};
    return {data:{previous_total:100000,slots:mode==='empty'?[]:[{id:'booking',version:'server-quote-'+args.p_day,start_at:args.p_day+'T03:00:00Z',end_at:args.p_day+'T04:30:00Z',total:170000,staff_name:'Nguyễn Văn An'},{id:'booking',version:'second-quote',start_at:args.p_day+'T05:00:00Z',end_at:args.p_day+'T06:30:00Z',total:170000,staff_name:'Nguyễn Văn An'}]}};
   }
   if(name==='reschedule_own_booking_service')return window.failSave?{error:{message:'booking_quote_changed_reload_required'}}:{data:'booking'};
   throw Error('Unexpected RPC '+name);
  }});
  window.bookingModule=await import('/pages/user/modules/bookings/bookings.js');await bookingModule.init();
  window.openMove=()=>bookingModule.openBookingMoveModal(fixtureBooking,()=>{saved++;});
 });
 await page.locator('.btn-change-schedule').click();
 const modal=page.locator('#quickRescheduleBookingModal');
 await page.waitForFunction(()=>!document.getElementById('bookingMoveQuote').disabled);
 assert.equal(await modal.locator('input[type=datetime-local]').count(),0);assert.equal(await modal.locator('input[type=date]').count(),1);
 assert.ok(!(await modal.innerText()).includes('Không hỗ trợ đổi từ Spa sang Hotel'));
 await modal.locator('#bookingMoveService').selectOption('upgrade');await modal.locator('#bookingMoveQuote').click();
 await modal.locator('[data-move-slot="0"]').waitFor();assert.equal(await modal.locator('[data-move-slot]').count(),2);
 assert.equal(await modal.locator('#quickConfirmRescheduleBtn').isDisabled(),true);
 await modal.locator('[data-move-slot="0"]').click();assert.match(await modal.locator('#bookingMoveEnd').innerText(),/10:00–11:30/);assert.match(await modal.locator('#bookingMoveTotal').innerText(),/70[.]000/);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});assert.equal(await modal.evaluate(node=>[...node.querySelectorAll('*')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).length),0);await page.screenshot({path:`docs/verification/booking-move-day-slots-${width}.png`,animations:'disabled'});}
 // A changed date invalidates the selected price; late replies cannot restore it.
 await page.evaluate(()=>{window.mode='slow';});await modal.locator('#bookingMoveQuote').click();await page.waitForFunction(()=>window.releaseSlots);
 const nextDay=await page.evaluate(()=>new Date(Date.now()+5*86400000).toISOString().slice(0,10));await modal.locator('#bookingMoveDay').fill(nextDay);
 assert.equal(await modal.locator('#quickConfirmRescheduleBtn').isDisabled(),true);
 await page.evaluate(()=>{window.mode='valid';});await modal.locator('#bookingMoveQuote').click();await modal.locator('[data-move-slot="0"]').waitFor();await page.evaluate(()=>releaseSlots());
 await modal.locator('[data-move-slot="0"]').click();
 await modal.locator('#bookingMoveReason').selectOption({label:'Thay đổi gói dịch vụ'});
 await modal.locator('#quickConfirmRescheduleBtn').click();await modal.waitFor({state:'detached'});
 const write=await page.evaluate(()=>calls.find(call=>call.name==='reschedule_own_booking_service'));
 assert.equal(write.args.p_start,nextDay+'T03:00:00Z');assert.equal(write.args.p_expected_quote,'server-quote-'+nextDay);assert.equal(write.args.p_service,'upgrade');assert.equal(write.args.p_end,null);assert.equal(await page.evaluate(()=>pageLoads),2);
 // A genuine empty day has an empty state, not an eligibility error.
 await page.evaluate(()=>{window.mode='empty';openMove();});await page.waitForFunction(()=>!document.getElementById('bookingMoveQuote').disabled);await modal.locator('#bookingMoveQuote').click();await modal.locator('#bookingMoveEmpty').waitFor();assert.equal(await modal.locator('#bookingMoveError').isVisible(),false);assert.equal(await modal.locator('#quickConfirmRescheduleBtn').isDisabled(),true);
 await page.screenshot({path:'docs/verification/booking-move-day-slots-empty-390.png'});
 await page.keyboard.press('Escape');await modal.waitFor({state:'detached'});
 // Eligibility failure reports its exact reason.
 await page.evaluate(()=>{window.mode='limit';openMove();});await page.waitForFunction(()=>!document.getElementById('bookingMoveQuote').disabled);await modal.locator('#bookingMoveQuote').click();await modal.locator('#bookingMoveError').waitFor();assert.match(await modal.locator('#bookingMoveError').innerText(),/đã dùng hết 2 lần đổi/);
 await page.keyboard.press('Escape');await modal.waitFor({state:'detached'});
 // Hotel and taxi retain their distinct logistics forms.
 await page.evaluate(()=>bookingModule.openBookingMoveModal({...fixtureBooking,isHotel:true,serviceName:'Khách sạn thú cưng'}));
 assert.equal(await modal.locator('#bookingMoveStart').getAttribute('type'),'datetime-local');assert.equal(await modal.locator('#bookingMoveEndInput').count(),1);assert.equal(await modal.locator('#bookingMoveService').isDisabled(),true);
 await page.keyboard.press('Escape');await modal.waitFor({state:'detached'});
 await page.evaluate(()=>bookingModule.openBookingMoveModal({...fixtureBooking,serviceName:'Pet Taxi đưa đón',serviceCategory:'category-uuid'}));
 assert.equal(await modal.locator('#bookingMoveStart').count(),1);assert.equal(await modal.locator('#bookingMoveDay').count(),0);assert.equal(await modal.locator('#bookingMoveService').isDisabled(),true);
 await page.keyboard.press('Escape');await modal.waitFor({state:'detached'});assert.deepEqual(errors,[]);
 console.log('PASS actual booking list → date/service move dialog: no false category warning, available slots/server prices, timezone-safe selection, stale read invalidation, save, empty day, precise limit error and desktop/mobile screenshots. Isolated transport only.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
