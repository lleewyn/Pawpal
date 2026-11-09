const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const guest=process.argv.includes('--guest');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1280,height:1000}});
 await p.route('**/*',r=>r.abort());await p.route('http://localhost:3001/',r=>r.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await p.goto('http://localhost:3001/');
 await p.setContent(fs.readFileSync('pages/services/booking/booking.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 await p.addStyleTag({content:fs.readFileSync('node_modules/bootstrap/dist/css/bootstrap.min.css','utf8')});
 await p.addStyleTag({content:fs.readFileSync('styles/style.css','utf8').replace(/@import[^;]+;/g,'')});
 await p.addStyleTag({content:fs.readFileSync('pages/services/booking/booking.css','utf8')});
 let source=fs.readFileSync('pages/services/booking/booking.js','utf8').replace(/^import .*;\r?\n/gm,'');
 source=source.slice(0,source.lastIndexOf("if(document.readyState==='loading')"));
 await p.addScriptTag({content:`const vietnamDateTimeInput=value=>new Date(new Date(value).getTime()+7*3600000).toISOString().slice(0,16);const parseVietnamDateTimeInput=value=>value?new Date(value+':00+07:00'):null;class GuestCommerceError extends Error{};\n`+source+`
 window.fixture={state,renderSchedule,renderConfirmation,renderHold,show,details};
 state.pet={id:'pet',name:'Bé kiểm thử',weight:4.5,species:'Mèo'};state.service={id:'svc',name:'Tắm spa vệ sinh toàn diện',category:'grooming_spa'};
 state.profile={name:'Chủ nuôi',phone:'0900000000'};state.guest=${guest};
 const starts=new Date(Date.now()+86400000).toISOString();
 db={rpc:async name=>({data:name==='own_booking_day_slots'?{open:'08:00',close:'20:00',slots:[{start_at:starts,available:true,staff:[{id:'worker',name:'Nhân viên kiểm thử'}]}]}:name==='hold_own_service_booking'?{id:'held',expires_at:new Date(Date.now()+900000).toISOString(),server_now:new Date().toISOString()}:null})};
 const guestCommerce={request:async(action)=>action==='booking-slots'?{availability:(await db.rpc('own_booking_day_slots')).data}:action==='booking-hold'?{hold:(await db.rpc('hold_own_service_booking')).data}:{success:true}};
 document.querySelector('.booking-main').classList.remove('booking-loading');document.querySelector('.booking-main').classList.add('booking-live-form');renderSchedule();show(3);`});
 await p.waitForSelector('#bookingDaySlots button');
 assert.equal(await p.locator('#bookingStart').isVisible(),false);assert.equal(await p.locator('#bookingDay').isVisible(),true);
 // Exercise the component handlers directly, without replaying login or the four-step testcase.
 await p.evaluate(()=>document.querySelector('[data-slot]').onclick());
 await p.evaluate(()=>document.querySelector('[data-staff="worker"]').onclick());
 assert.match(await p.locator('[data-booking-hold]').innerText(),/14:59|15:00/);
 assert.equal(await p.locator('[data-staff="worker"]').getAttribute('aria-pressed'),'true');
 await p.evaluate(()=>{
  const f=fixture;f.state.quote={start_at:new Date(Date.now()+86400000).toISOString(),end_at:new Date(Date.now()+90000000).toISOString(),quantity:1,unit_price:150000,total:150000,addons:[]};f.state.details={...f.details(),hold_id:'held'};f.renderConfirmation();f.show(4);
 });
 assert.match(await p.locator('#step4').innerText(),/Đặt cọc\s+0 VNĐ/);assert.equal(await p.locator('#confirmBookingBtn').innerText(),'Xác nhận đặt lịch');
 await p.evaluate(()=>{document.getElementById('policyCheck').checked=true;document.getElementById('policyCheck').onchange();});assert.equal(await p.locator('#confirmBookingBtn').isEnabled(),true);
 for(const width of [1280,390]){await p.setViewportSize({width,height:1000});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.locator('.booking-main').screenshot({path:`docs/verification/sync/${guest?'guest':'member'}-booking-hold-${width}.png`});}
 await p.evaluate(()=>{fixture.state.hold.deadline=Date.now()-1000;fixture.renderHold();});
 assert.equal(await p.locator('#confirmBookingBtn').isDisabled(),true);assert.match(await p.locator('[data-booking-hold]').innerText(),/Đã hết/);
 console.log('PASS single date/slot selector, staff choice, actual lease countdown, zero deposit, confirmation button, expiry guard, desktop/mobile layout. Isolated component checks; no live appointments created.');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
