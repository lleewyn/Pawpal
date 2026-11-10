const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();
 await page.setContent('<div id="staff"></div><div id="slots"></div>');
 await page.addScriptTag({content:fs.readFileSync('pages/services/booking/booking-staff-slots.mjs','utf8').replace('export function','function')});
 await page.evaluate(()=>{
  window.chosen=[];
  window.mount=(slots)=>renderStaffSlots({staffRoot:document.getElementById('staff'),slotsRoot:document.getElementById('slots'),slots,onClear:()=>{},onSelect:async({staff,slot})=>chosen.push({id:staff.id,time:slot.start_at})});
  mount([
   {start_at:'2030-01-01T07:00:00Z',available:true,staff:[{id:'pending',name:'Chưa phân ca',requires_confirmation:true},{id:'a',name:'KTV A'}]},
   {start_at:'2030-01-01T09:00:00Z',available:true,staff:[{id:'b',name:'KTV B'}]}
  ]);
 });
 await page.locator('[data-random-staff]').click();
 assert.equal(await page.locator('[data-slot]').count(),2);assert.equal(await page.evaluate(()=>chosen.length),0);
 await page.locator('[data-slot="0"]').click();
 assert.equal(await page.evaluate(()=>chosen.at(-1).id),'a','prefer actually scheduled staff over future requests');
 assert.equal(await page.locator('[data-slot]').count(),2,'automatic mode keeps all available times');
 await page.locator('[data-slot="1"]').click();
 assert.equal(await page.evaluate(()=>chosen.at(-1).id),'b','choose staff available at the new time');
 assert.match(await page.locator('#bookingStaffChoice').innerText(),/Hệ thống phân bổ: KTV B/);
 await page.locator('[data-staff="a"]').click();assert.equal(await page.locator('[data-slot]').count(),1);
 assert.equal(await page.locator('[data-random-staff]').getAttribute('aria-pressed'),'false');
 await page.evaluate(()=>mount([{start_at:'2030-01-01T07:00:00Z',available:true,staff:[{id:'future',name:'KTV dự kiến',requires_confirmation:true}]}]));
 await page.locator('[data-random-staff]').click();await page.locator('[data-slot]').click();
 assert.match(await page.locator('#bookingStaffChoice').innerText(),/cần cửa hàng xác nhận/);
 await page.evaluate(()=>mount([]));assert.equal(await page.locator('[data-random-staff]').isDisabled(),true);
 console.log('PASS random staff chosen for selected time, scheduled staff priority, changing time reallocates, explicit choice retained, future confirmation and empty states. Isolated component only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
