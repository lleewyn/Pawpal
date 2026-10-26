// Offline actual booking forms in three browser timezones. No network reaches Cloud.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const timezoneId of ['UTC','America/Los_Angeles','Asia/Tokyo']){
  const context=await browser.newContext({timezoneId,viewport:{width:1366,height:1000}});
  try{
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.origin!=='http://localhost')return route.abort();
    if(u.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/pages/user/user.css"><link rel="stylesheet" href="/pages/user/modules/bookings/bookings.css"><div id="step1"></div><div id="step2"></div><div id="step3"></div><div id="step4"></div><div id="bookingSummary"></div>'});
    if(u.pathname==='/scripts/api/api.js')return route.fulfill({contentType:'text/javascript',body:'export const API={};'});
    let body=fs.readFileSync(path.join(process.cwd(),decodeURIComponent(u.pathname)),'utf8');
    if(u.pathname==='/pages/services/booking/booking.js')body+='\nexport {state,renderSchedule,details};';
    return route.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript',body});
   });
   await page.goto('http://localhost/');
   await page.evaluate(async()=>{
    window.bookingUI=await import('/pages/services/booking/booking.js');
    Object.assign(bookingUI.state,{pet:{id:'pet',name:'E2E Pet',species_id:'species',weight:5},service:{id:'service',name:'E2E Spa',category:'grooming_spa',duration:30},profile:{name:'E2E Owner'},catalog:{services:[],rooms:[]},step:3});
    bookingUI.renderSchedule();
   });
   await page.locator('#bookingStart').fill('2031-04-02T10:00');
   assert.equal(await page.evaluate(()=>bookingUI.details().scheduled_start_at),'2031-04-02T03:00:00.000Z',timezoneId);
   await page.evaluate(()=>{bookingUI.state.service.category='pet_hotel';bookingUI.state.catalog.rooms=[{id:'room',service_id:'service',name:'E2E Room',type:'E2E',daily_price:100000}];bookingUI.renderSchedule();});
   await page.locator('#bookingStart').fill('2031-04-02T10:00');await page.locator('#bookingEnd').fill('2031-04-03T11:00');await page.locator('#bookingRoom').fill('E2E Room');await page.locator('#bookingRoomOptions button').first().click();
   assert.equal(await page.evaluate(()=>bookingUI.details().check_out_at),'2031-04-03T04:00:00.000Z',timezoneId);
   await page.evaluate(()=>{bookingUI.state.service.category='pet_taxi';bookingUI.renderSchedule();});
   await page.locator('#bookingStart').fill('2031-04-02T10:00');await page.locator('#bookingPickup').fill('E2E Pickup');await page.locator('#bookingDropoff').fill('E2E Dropoff');await page.locator('#bookingDistance').fill('5');await page.locator('#bookingTrip').selectOption('round_trip');await page.locator('#bookingReturn').fill('2031-04-02T12:00');
   assert.equal(await page.evaluate(()=>bookingUI.details().return_at),'2031-04-02T05:00:00.000Z',timezoneId);
   await page.evaluate(async()=>{
    window.rpcCalls=[];localStorage.setItem('pawpal_current_user',JSON.stringify({id:'owner'}));
    window.getSupabaseClient=()=>({async rpc(name,args){rpcCalls.push({name,args});return {data:{id:'booking',version:'quote-version',total:50000,start_at:args.p_start,end_at:'2031-04-02T03:30:00Z'}};}});
    const module=await import('/pages/user/modules/bookings/bookings.js');
    module.openBookingMoveModal({_supabaseId:'booking',serviceName:'E2E Spa',petName:'E2E Pet'});
   });
   await page.locator('#bookingMoveStart').fill('2031-04-02T10:00');await page.locator('#bookingMoveQuote').click();
   await page.waitForFunction(()=>!document.getElementById('bookingMovePreview').hidden);
   assert.equal(await page.evaluate(()=>rpcCalls[0].args.p_start),'2031-04-02T03:00:00.000Z',timezoneId);
   assert.ok((await page.locator('#bookingMoveEnd').innerText()).includes('10:30'),timezoneId);
   if(timezoneId==='UTC'){fs.mkdirSync('docs/verification/sync',{recursive:true});await page.screenshot({path:'docs/verification/sync/booking-move-vn-time-offline.png'});}
   assert.deepEqual(errors,[]);await page.evaluate(()=>document.getElementById('quickRescheduleBookingModal').close());
  }finally{await context.close();}
 }
 console.log('PASS offline: Spa, hotel, taxi and reschedule forms interpret Vietnam time identically in UTC, Los Angeles and Tokyo; preview uses Vietnam time. No Cloud calls.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
