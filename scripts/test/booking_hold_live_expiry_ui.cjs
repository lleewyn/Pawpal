const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const guest=process.argv.includes('--guest');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const initial=Date.now(),start=new Date(initial+86400000).toISOString();let now=initial,lease=null,reads=0;
 const pages=[];
 for(const owner of ['first','other']){
  const page=await browser.newPage({viewport:{width:1280,height:1000}});pages.push(page);
  await page.route('**/*',r=>r.abort());await page.route('http://localhost:3001/',r=>r.fulfill({contentType:'text/html',body:'<body></body>'}));await page.goto('http://localhost:3001/');
  await page.clock.install({time:new Date(initial)});
  await page.setContent(fs.readFileSync('pages/services/booking/booking.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  for(const file of ['node_modules/bootstrap/dist/css/bootstrap.min.css','styles/style.css','pages/services/booking/booking.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8').replace(/@import[^;]+;/g,'')});
  await page.exposeFunction('testRpc',async(name,args)=>{
   if(name==='own_booking_day_slots'){reads++;const free=!lease||lease.expires<=now||lease.owner===owner;return {data:{open:'08:00',close:'20:00',slots:[{start_at:start,available:free,staff:free?[{id:'worker',name:'KTV kiểm thử'}]:[]}]}};}
   if(name==='hold_own_service_booking'){lease={owner,expires:now+900000};return {data:{id:args.p_id,expires_at:new Date(lease.expires).toISOString(),server_now:new Date(now).toISOString()}};}
   if(name==='release_own_booking_hold'&&lease?.owner===owner)lease=null;
   return {data:null};
  });
  let source=fs.readFileSync('pages/services/booking/booking.js','utf8').replace(/^import .*;\r?\n/gm,'');source=source.slice(0,source.lastIndexOf("if(document.readyState==='loading')"));
  await page.addScriptTag({content:fs.readFileSync('pages/services/booking/booking-staff-slots.mjs','utf8').replace('export function','function')});
  await page.addScriptTag({content:`const vietnamDateTimeInput=v=>new Date(new Date(v).getTime()+7*3600000).toISOString().slice(0,16);const parseVietnamDateTimeInput=v=>v?new Date(v+':00+07:00'):null;class GuestCommerceError extends Error{};\n`+source+`
   window.fixture={state};state.guest=${guest};state.pet={id:'pet',name:'Bé kiểm thử',weight:5};state.service={id:'svc',name:'Tắm spa',category:'grooming_spa'};state.profile={name:'Khách kiểm thử',phone:'0900000000'};
   db={rpc:window.testRpc};const guestCommerce={request:async(action,args)=>action==='booking-slots'?{availability:(await testRpc('own_booking_day_slots',{})).data}:action==='booking-hold'?{hold:(await testRpc('hold_own_service_booking',{p_id:args.requestId})).data}:testRpc('release_own_booking_hold',{})};
   document.querySelector('.booking-main').classList.remove('booking-loading');document.querySelector('.booking-main').classList.add('booking-live-form');renderSchedule();show(3);`});
  await page.waitForSelector('[data-slot]');
  if(owner==='first'){
   await page.evaluate(()=>document.querySelector('[data-slot]').onclick());await page.waitForSelector('[data-booking-hold]');
   assert.equal(await page.evaluate(()=>document.getElementById('bookingDaySlots').nextElementSibling.matches('[data-booking-hold]')),true);
   for(const width of [1280,390]){await page.setViewportSize({width,height:1000});await page.locator('.booking-main').screenshot({path:`docs/verification/sync/${guest?'guest':'member'}-hour-only-hold-${width}.png`});}
  }
 }
 const [first,other]=pages;
 assert.match(await first.locator('[data-booking-hold]').innerText(),/14:5[89]|15:00/);
 assert.equal(await other.locator('[data-slot]').isDisabled(),true);
 const before=reads;await other.clock.fastForward(15000);await other.waitForFunction(()=>!document.getElementById('bookingCheckSlots').disabled);
 assert.ok(reads>before,'another client polls without F5');assert.equal(await other.locator('[data-slot]').isDisabled(),true);
 now+=900001;
 await first.clock.fastForward(900001);await first.waitForFunction(()=>fixture.state.hold===null&&!document.getElementById('bookingCheckSlots').disabled);
 assert.equal(await first.locator('#step3Next').isDisabled(),true);assert.match(await first.locator('[data-booking-hold]').innerText(),/Đã hết/);
 assert.equal(await first.evaluate(()=>fixture.state.preferredStaff),null);
 assert.doesNotMatch(await first.locator('#bookingSummary').innerText(),/KTV kiểm thử|Lịch hẹn/);
 await other.clock.fastForward(885001);await other.waitForFunction(()=>!document.querySelector('[data-slot]').disabled);
 assert.equal(await other.locator('[data-slot]').isEnabled(),true,'released slot becomes available without interaction');
 await first.locator('.booking-main').screenshot({path:`docs/verification/sync/${guest?'guest':'member'}-hold-auto-expiry.png`});
 console.log('PASS two clients: visible 15-minute countdown, held slot unavailable to another client, automatic expiry clears owner selection, polling frees other client without F5. Fake clock and isolated transport; no real appointments.');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
