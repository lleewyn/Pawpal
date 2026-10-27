const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin!=='http://localhost')return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><div id="step2"></div><div id="step3"></div><div id="bookingSummary"></div>'});
  if(url.pathname==='/scripts/api/api.js')return route.fulfill({contentType:'text/javascript',body:'export const API={};'});
  let body=fs.readFileSync(path.join(process.cwd(),url.pathname),'utf8');if(url.pathname==='/pages/services/booking/booking.js')body+='\nexport {state,renderSchedule,details};';
  return route.fulfill({contentType:'text/javascript',body});
 });
 await page.goto('http://localhost/');await page.evaluate(async()=>{
  window.ui=await import('/pages/services/booking/booking.js');const {guestCommerce}=await import('/scripts/shared/guest-commerce-client.mjs');window.quoteCalls=[];guestCommerce.request=async(...args)=>{quoteCalls.push(args);throw Error('Test quote refused');};
  Object.assign(ui.state,{guest:true,pet:{id:'pet',weight:5},service:{id:'service',category:'grooming_spa'},catalog:{rooms:[{id:'room',service_id:'service',name:'Test room',type:'Test',daily_price:100000}]}});ui.renderSchedule();
 });
 const check=async(id)=>{assert.equal(await page.getAttribute('#'+id,'aria-invalid'),'true');assert.ok(await page.locator('#'+id+'Error').textContent());assert.equal(await page.getAttribute('#'+id,'aria-describedby'),id+'Error');};
 await page.click('#step3Next');await check('bookingStart');assert.equal(await page.evaluate(()=>quoteCalls.length),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'bookingStart');
 await page.fill('#bookingStart','2020-01-01T10:00');await page.click('#step3Next');await check('bookingStart');await page.fill('#bookingStart','2031-04-02T10:00');assert.equal(await page.getAttribute('#bookingStart','aria-invalid'),'false');
 assert.equal(await page.evaluate(()=>ui.details().scheduled_start_at),'2031-04-02T03:00:00.000Z');
 await page.evaluate(()=>{window.clientCalls=[];import('/scripts/shared/guest-commerce-client.mjs').then(({guestCommerce})=>{guestCommerce.request=async(action,body)=>{clientCalls.push({action,body});return {availability:{open:'08:00',close:'18:00',slots:[{start_at:'2031-04-02T03:00:00Z',available:true,staff:[{id:'staff',name:'Test staff'}]}]}};};});});
 await page.click('#bookingCheckSlots');await page.waitForSelector('#bookingDaySlots button');await page.click('#bookingDaySlots button');await page.click('[data-staff="staff"]');assert.equal(await page.evaluate(()=>ui.details().preferred_staff_id),'staff');assert.equal(await page.evaluate(()=>clientCalls[0].action),'booking-slots');await page.fill('#bookingStart','2031-04-02T11:00');assert.equal(await page.evaluate(()=>ui.state.preferredStaff),null);
 await page.evaluate(()=>{ui.state.service.category='pet_hotel';ui.renderSchedule();});await page.fill('#bookingStart','2031-04-02T10:00');await page.fill('#bookingEnd','2031-04-02T09:00');await page.fill('#bookingRoom','Test room');await page.click('#step3Next');await check('bookingEnd');await check('bookingRoom');assert.equal(await page.evaluate(()=>quoteCalls.length),0);
 await page.fill('#bookingEnd','2031-04-03T10:00');await page.fill('#bookingRoom','Test room');await page.click('#bookingRoomOptions button');assert.equal(await page.evaluate(()=>ui.details().room_id),'room');
 await page.evaluate(()=>{document.getElementById('bookingCare').value='x'.repeat(4001);});assert.equal(await page.evaluate(()=>ui.details()),null);await check('bookingCare');await page.fill('#bookingCare','Care note');
 await page.fill('#bookingRoom','Edited room');assert.equal(await page.evaluate(()=>ui.details()),null);await check('bookingRoom');
 await page.evaluate(()=>{ui.state.service.category='pet_taxi';ui.renderSchedule();});await page.fill('#bookingStart','2031-04-02T10:00');await page.fill('#bookingPickup','   ');await page.fill('#bookingDropoff','Destination');await page.fill('#bookingDistance','0');await page.selectOption('#bookingTrip','round_trip');await page.fill('#bookingReturn','2031-04-02T09:00');await page.click('#step3Next');for(const id of ['bookingPickup','bookingDistance','bookingReturn'])await check(id);assert.equal(await page.evaluate(()=>quoteCalls.length),0);
 await page.fill('#bookingPickup','Pickup');await page.fill('#bookingDistance','1.001');assert.equal(await page.evaluate(()=>ui.details()),null);await check('bookingDistance');
 await page.fill('#bookingDistance','1.25');await page.selectOption('#bookingTrip','one_way');assert.equal(await page.locator('#bookingReturnGroup').isHidden(),true);assert.equal(await page.locator('#bookingReturnError').textContent(),'');assert.equal(await page.getAttribute('#bookingReturn','aria-invalid'),'false');assert.equal(await page.evaluate(()=>ui.details().return_at),null);
 await page.selectOption('#bookingTrip','round_trip');await page.fill('#bookingReturn','2031-04-02T12:00');const details=await page.evaluate(()=>ui.details());assert.equal(details.return_at,'2031-04-02T05:00:00.000Z');assert.equal(details.distance_km,1.25);assert.equal(await page.evaluate(()=>quoteCalls.length),0);assert.deepEqual(errors,[]);
 console.log('PASS actual guest schedule form: required/future/time order/room selection/whitespace/distance/length, ARIA/focus/error reset, one-way clears return, valid Vietnam-time payloads. Invalid submit makes zero quote calls; no Cloud.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
