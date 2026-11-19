const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const guest=process.argv.includes('--guest');
const staffFirst=process.argv.includes('--staff-first');
const future=process.argv.includes('--future');
const expired=process.argv.includes('--expired');
const contact=process.argv.includes('--contact');
const holdRetry=process.argv.includes('--hold-retry');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1280,height:1000}});
 await p.route('**/*',r=>r.abort());await p.route('http://localhost:3001/',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await p.goto('http://localhost:3001/');
 await p.setContent(fs.readFileSync('pages/services/booking/booking.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 await p.addStyleTag({content:fs.readFileSync('node_modules/bootstrap/dist/css/bootstrap.min.css','utf8')});
 await p.addStyleTag({content:fs.readFileSync('styles/style.css','utf8').replace(/@import[^;]+;/g,'')});
 await p.addStyleTag({content:fs.readFileSync('pages/services/booking/booking.css','utf8')});
 let source=fs.readFileSync('pages/services/booking/booking.js','utf8').replace(/^import .*;\r?\n/gm,'');
 source=source.slice(0,source.lastIndexOf("if(document.readyState==='loading')"));
 await p.addScriptTag({content:fs.readFileSync('pages/services/booking/booking-staff-slots.mjs','utf8').replace('export function','function')});
 await p.addScriptTag({content:`const vietnamDateTimeInput=value=>new Date(new Date(value).getTime()+7*3600000).toISOString().slice(0,16);const parseVietnamDateTimeInput=value=>value?new Date(value+':00+07:00'):null;class GuestCommerceError extends Error{};\n`+source+`
 window.fixture={state,renderPets,renderSchedule,renderConfirmation,renderHold,show,details};
 state.pet={id:'pet',name:'Bé kiểm thử',weight:4.5,species:'Mèo'};state.service={id:'svc',name:'Tắm spa vệ sinh toàn diện',category:'grooming_spa'};
 state.profile={name:'Chủ nuôi',phone:'0900000000'};state.guest=${guest};
 const starts=new Date(vietnamDateTimeInput(Date.now()+86400000).slice(0,10)+"T09:00:00+07:00").toISOString();
 db={rpc:async name=>({data:name==='own_booking_day_slots'?{open:'08:00',close:'20:00',slots:[{start_at:starts,available:true,staff:[{id:'worker',name:'Nguyễn Văn A',source:'recurring',requires_confirmation:${future}}]},{start_at:new Date(new Date(starts).getTime()+3600000).toISOString(),available:true,staff:[{id:'worker-b',name:'Nhân viên B'}]}]}:name==='hold_own_service_booking'?{id:'held',expires_at:new Date(Date.now()+900000).toISOString(),server_now:new Date().toISOString()}:null})};
 const guestCommerce={request:async(action)=>action==='booking-slots'?{availability:(await db.rpc('own_booking_day_slots')).data}:action==='booking-hold'?{hold:(await db.rpc('hold_own_service_booking')).data}:{success:true}};
 document.querySelector('.booking-main').classList.remove('booking-loading');document.querySelector('.booking-main').classList.add('booking-live-form');renderSchedule();show(3);`});
 await p.waitForSelector('#bookingDaySlots button');

await p.evaluate(()=>{fixture.state.service={id:'taxi',name:'Đưa đón thú cưng',category:'pet_taxi'};fixture.renderSchedule();fixture.show(3);});
assert.equal(await p.locator('#bookingDay').getAttribute('type'),'date');assert.equal(await p.locator('#bookingStart').isVisible(),false);
await p.locator('#bookingDay').fill(await p.evaluate(()=>new Date(Date.now()+86400000).toISOString().slice(0,10)));
await p.locator('#bookingPickup').fill('Thủ Đức');await p.locator('#bookingDropoff').fill('Bình Thạnh');
const km=Number(await p.locator('#bookingDistance').inputValue());assert.ok(km>0);assert.equal(await p.locator('#bookingDistance').isVisible(),false);
await p.locator('#bookingCheckSlots').click();await p.locator('#bookingDaySlots button').first().click();
assert.equal(await p.locator('#step3Next').isEnabled(),true);
const details=await p.evaluate(()=>fixture.details());assert.equal(details.distance_km,km);assert.ok(details.scheduled_start_at);
for(const width of [1280,390]){await p.setViewportSize({width,height:1100});await p.locator('.booking-main').screenshot({path:'docs/verification/booking-taxi-auto-distance-'+width+'.png',animations:'disabled'});}
await p.locator('#bookingDropoff').fill('');assert.equal(await p.locator('#bookingDistance').inputValue(),'');assert.equal(await p.locator('#step3Next').isEnabled(),false);
await p.evaluate(()=>{fixture.state.service={id:'hotel',name:'Khách sạn thú cưng',category:'pet_hotel'};fixture.renderSchedule();fixture.show(3);});
assert.equal(await p.locator('#bookingDay').getAttribute('type'),'date');assert.equal(await p.locator('#bookingStart').isVisible(),false);
await p.locator('#bookingDay').fill(await p.evaluate(()=>new Date(Date.now()+86400000).toISOString().slice(0,10)));
await p.locator('#bookingEnd').fill(await p.evaluate(()=>new Date(Date.now()+2*86400000).toISOString().slice(0,10)+'T12:00'));
await p.evaluate(()=>{fixture.state.room={id:'room',name:'Phòng tiêu chuẩn'};document.getElementById('bookingRoom').value='Phòng tiêu chuẩn';});
await p.locator('#bookingCheckSlots').click();await p.locator('#bookingDaySlots button').first().click();
assert.equal(await p.locator('#step3Next').isEnabled(),true);
for(const width of [1280,390]){await p.setViewportSize({width,height:1100});await p.locator('.booking-main').screenshot({path:'docs/verification/booking-hotel-single-date-'+width+'.png',animations:'disabled'});}
console.log('PASS Taxi/Hotel date-only start; computed Taxi distance used in quote; clearing address invalidates selected slot');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
