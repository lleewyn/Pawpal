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
 const starts=new Date(Date.now()+86400000).toISOString();
 db={rpc:async name=>({data:name==='own_booking_day_slots'?{open:'08:00',close:'20:00',slots:[{start_at:starts,available:true,staff:[{id:'worker',name:'Nguyễn Văn A',source:'recurring',requires_confirmation:${future}}]},{start_at:new Date(Date.now()+90000000).toISOString(),available:true,staff:[{id:'worker-b',name:'Nhân viên B'}]}]}:name==='hold_own_service_booking'?{id:'held',expires_at:new Date(Date.now()+900000).toISOString(),server_now:new Date().toISOString()}:null})};
 const guestCommerce={request:async(action)=>action==='booking-slots'?{availability:(await db.rpc('own_booking_day_slots')).data}:action==='booking-hold'?{hold:(await db.rpc('hold_own_service_booking')).data}:{success:true}};
 document.querySelector('.booking-main').classList.remove('booking-loading');document.querySelector('.booking-main').classList.add('booking-live-form');renderSchedule();show(3);`});
 await p.waitForSelector('#bookingDaySlots button');
 if(holdRetry){
  await p.evaluate(()=>{const original=db.rpc;window.holdAttempts=0;db.rpc=async(name,args)=>{if(name==='hold_own_service_booking'&&++holdAttempts===1)throw Error('preferred_staff_unavailable');return original(name,args);};});
  await p.evaluate(()=>document.querySelector('[data-slot="0"]').onclick());
  assert.equal(await p.locator('[data-booking-hold]').count(),0);assert.match(await p.locator('#bookingHoldFeedback').innerText(),/Chưa giữ được chỗ/);
  await p.evaluate(()=>document.querySelector('[data-slot="0"]').onclick());
  assert.equal(await p.locator('[data-booking-hold]').count(),1);assert.equal(await p.evaluate(()=>holdAttempts),2);
 }
 if(contact){
  await p.evaluate(()=>{window.contactTestService=fixture.state.service;fixture.state.profile.phone='0834562948';fixture.state.pets=[fixture.state.pet];fixture.renderPets();fixture.show(1);});
  assert.equal(await p.locator('#bookingContactPhone').inputValue(),'0834562948');
  await p.locator('#bookingContactPhone').fill('abc');await p.locator('#step1Next').click();
  assert.equal(await p.evaluate(()=>fixture.state.step),1);assert.match(await p.locator('#bookingContactPhoneError').innerText(),/hợp lệ/);
  await p.locator('#bookingContactPhone').fill('0911556677');
  for(const width of [1280,390]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.locator('.booking-main').screenshot({path:`docs/verification/sync/member-booking-contact-${width}.png`});}
  await p.locator('#step1Next').click();assert.equal(await p.evaluate(()=>fixture.state.step),2);
  await p.evaluate(()=>{fixture.state.service=contactTestService;fixture.renderSchedule();fixture.show(3);});await p.waitForSelector('#bookingDaySlots button');
 }
 if(expired){
  await p.evaluate(()=>{
   window.slotRequests=0;window.holdRequests=0;window.clockNow=Date.now();Date.now=()=>clockNow;
   const original=db.rpc;db.rpc=async(name,args)=>{
    if(name==='own_booking_day_slots')slotRequests++;
    if(name==='hold_own_service_booking'){holdRequests++;if(window.failTimeHold){window.failTimeHold=false;throw Error(fixture.state.guest?'Vui lòng chọn giờ cách hiện tại hơn 2 tiếng.':'booking_lead_time_required');}}
    const result=await original(name,args);
    if(name==='own_booking_day_slots'){result.data.slots=result.data.slots.map((slot,index)=>({...slot,start_at:new Date(Date.now()+86400000+index*3600000).toISOString()}));window.latestSlotStart=result.data.slots[0].start_at;}
    if(name==='hold_own_service_booking')result.data.server_now=new Date(Date.now()).toISOString();
    return result;
   };
   clockNow+=86400000-60000;
  });
  await p.evaluate(()=>document.querySelector('[data-slot="0"]').onclick());
  await p.waitForFunction(()=>slotRequests===1&&document.querySelector('[data-slot="0"]'));
  assert.equal(await p.locator('#bookingQuoteError').innerText(),'Thời gian không hợp lệ');
  assert.equal(await p.evaluate(()=>holdRequests),0);assert.equal(await p.locator('#bookingStart').inputValue(),'');assert.equal(await p.locator('#step3Next').isDisabled(),true);
  // A fresh slot may expire while the user is still choosing an employee.
  await p.evaluate(()=>document.querySelector('[data-staff="worker"]').onclick());
  await p.evaluate(()=>{clockNow+=23*3600000;return document.querySelector('[data-slot="0"]').onclick();});
  await p.waitForFunction(()=>slotRequests===2&&document.querySelector('[data-slot="0"]'));
  assert.equal(await p.evaluate(()=>holdRequests),0);
  await p.evaluate(()=>{clockNow=Date.parse(latestSlotStart)-7200000;return document.querySelector('[data-slot="0"]').onclick();});
  await p.waitForFunction(()=>slotRequests===3&&document.querySelector('[data-slot="0"]'));
  assert.equal(await p.evaluate(()=>holdRequests),0,'exactly two hours is also invalid');
  // Server time remains authoritative even when the client believes the time is valid.
  await p.evaluate(()=>{window.failTimeHold=true;return document.querySelector('[data-slot="0"]').onclick();});
  await p.waitForFunction(()=>slotRequests===4&&document.querySelector('[data-slot="0"]'));
  assert.equal(await p.locator('#bookingQuoteError').innerText(),'Thời gian không hợp lệ');assert.equal(await p.locator('#step3Next').isDisabled(),true);
  assert.equal(await p.evaluate(()=>fixture.state.preferredStaff),null);assert.equal(await p.evaluate(()=>fixture.state.hold),null);
 }
 assert.equal(await p.locator('#bookingStart').isVisible(),false);assert.equal(await p.locator('#bookingDay').isVisible(),true);
 // Exercise the component handlers directly, without replaying login or the four-step testcase.
 if(staffFirst){
  assert.equal(await p.locator('[data-staff="worker"]').isVisible(),true);
  await p.evaluate(()=>document.querySelector('[data-staff="worker"]').onclick());
  assert.equal(await p.locator('[data-slot]').count(),1);assert.equal(await p.locator('[data-booking-hold]').count(),0);
  await p.evaluate(()=>document.querySelector('[data-slot]').onclick());
 }else{
  await p.evaluate(()=>document.querySelector('[data-slot]').onclick());
  assert.equal(await p.locator('[data-booking-hold]').isVisible(),true,'choosing only an hour starts the lease automatically');
  assert.equal(await p.evaluate(()=>document.getElementById('bookingDaySlots').nextElementSibling.matches('[data-booking-hold]')),true,'countdown is next to the chosen hour');
  await p.evaluate(()=>document.querySelector('[data-staff="worker"]').onclick());
 }
 assert.equal(await p.evaluate(()=>fixture.details().preferred_staff_id),'worker');
 if(holdRetry)assert.equal(await p.evaluate(()=>holdAttempts),2,'repeating the same hour/staff must not restart a successful hold');
 if(staffFirst){
  await p.evaluate(()=>document.querySelector('[data-staff="worker-b"]').onclick());
  assert.equal(await p.locator('[data-booking-hold]').count(),0);assert.equal(await p.locator('#bookingStart').inputValue(),'');
  assert.equal(await p.locator('[data-slot="0"]').count(),0);assert.equal(await p.locator('[data-slot="1"]').count(),1);
  await p.evaluate(()=>document.querySelector('[data-slot="1"]').onclick());
  assert.equal(await p.evaluate(()=>fixture.details().preferred_staff_id),'worker-b');
  await p.evaluate(()=>document.querySelector('[data-staff="worker"]').onclick());
  await p.evaluate(()=>document.querySelector('[data-slot="0"]').onclick());
  assert.equal(await p.evaluate(()=>fixture.details().preferred_staff_id),'worker');
  assert.equal(await p.locator('#step3Next').isEnabled(),true);
  await p.waitForFunction(()=>getComputedStyle(document.getElementById('step3Next')).color==='rgb(255, 255, 255)');
  await p.locator('.booking-main').screenshot({path:'docs/verification/sync/preferred-staff-choice.png',animations:'disabled'});
 }
 assert.match(await p.locator('[data-booking-hold]').innerText(),/14:59|15:00/);
 assert.equal(await p.locator('[data-staff="worker"]').getAttribute('aria-pressed'),'true');
 await p.evaluate(()=>{
  const f=fixture;f.state.quote={start_at:new Date(Date.now()+86400000).toISOString(),end_at:new Date(Date.now()+90000000).toISOString(),quantity:1,unit_price:150000,total:150000,addons:[]};f.state.details={...f.details(),hold_id:'held'};f.renderConfirmation();f.show(4);
 });
 assert.match(await p.locator('#step4').innerText(),/Đặt cọc\s+0 VNĐ/);assert.equal(await p.locator('#confirmBookingBtn').innerText(),future?'Gửi yêu cầu đặt lịch':'Xác nhận đặt lịch');
 assert.equal(await p.locator('[data-booking-hold]').isVisible(),true,'countdown remains visible at confirmation');
 if(contact){assert.equal(await p.evaluate(()=>fixture.details().contact_phone),'0911556677');assert.match(await p.locator('#step4').innerText(),/Số điện thoại liên hệ\s+0911556677/);assert.equal(await p.evaluate(()=>fixture.state.profile.phone),'0834562948');}
 if(future){assert.match(await p.locator('#step4').innerText(),/Chờ xác nhận nhân viên/);assert.match(await p.locator('[data-booking-hold]').innerText(),/Giữ yêu cầu/);}
 await p.evaluate(()=>{document.getElementById('policyCheck').checked=true;document.getElementById('policyCheck').onchange();});assert.equal(await p.locator('#confirmBookingBtn').isEnabled(),true);
 for(const width of [1280,390]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.locator('.booking-main').screenshot({path:`docs/verification/sync/${guest?'guest':'member'}-booking-hold-${width}.png`});}
 await p.evaluate(()=>{fixture.state.hold.deadline=Date.now()-1000;fixture.renderHold();});
 assert.equal(await p.locator('#confirmBookingBtn').isDisabled(),true);assert.match(await p.locator('[data-booking-hold]').innerText(),/Đã hết/);
 console.log('PASS single date/slot selector, staff choice, actual lease countdown, zero deposit, confirmation button, expiry guard, desktop/mobile layout. Isolated component checks; no live appointments created.');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
