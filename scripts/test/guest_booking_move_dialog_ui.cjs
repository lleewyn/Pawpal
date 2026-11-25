const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const base='http://localhost:4567';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'UTC'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const html=fs.readFileSync('my-client/pages/public/return-guest/return-guest.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="/pages/public/return-guest/return-guest.js"></script></body>');
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin!==base)return route.abort();
  if(url.pathname==='/return-guest')return route.fulfill({contentType:'text/html',body:html.replace('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css','/node_modules/bootstrap/dist/css/bootstrap.min.css')});
  if(url.pathname==='/pages/public/return-guest/guest-phone-lookup.mjs')return route.fulfill({contentType:'text/javascript',body:'export function mountGuestPhoneLookup(){}'});
  if(url.pathname==='/scripts/shared/guest-commerce-client.mjs')return route.fulfill({contentType:'text/javascript',body:'export const guestCommerce={request:(...args)=>window.fixtureRequest(...args)};'});
  const file=path.resolve('.','.'+url.pathname);assert.ok(file.startsWith(process.cwd()+path.sep));
  if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({contentType:/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'image/png',body:fs.readFileSync(file)});
  return route.fulfill({status:404,body:''});
 });
 await page.goto(base+'/return-guest');await page.waitForFunction(()=>typeof window.handleGuestBookingAction==='function');
 await page.evaluate(()=>{
  const day=new Date(Date.now()+4*86400000).toISOString().slice(0,10);
  window.fixtureBooking={id:'BKG-KIEM-THU',_supabaseId:'11111111-1111-4111-8111-111111111111',serviceName:'Tắm và bảo vệ sinh thái nhỏ',petName:'Mập',petSpecies:'Chó',date:day,timeStart:'09:00',scheduledEndAt:day+'T02:45:00Z',status:'confirmed',price:150000,moveGrant:'verified-otp-grant',changeCount:0,_receiptOnly:false};
  rgVerifiedPhone='0901234567';rgLastSearchState={phone:rgVerifiedPhone,bookings:[fixtureBooking],orders:[]};document.getElementById('rg-phone').value=rgVerifiedPhone;
  window.calls=[];window.toasts=[];window.upsells=0;window.mode='normal';showToast=(message,type)=>toasts.push({message,type});showUpsellModal=()=>upsells++;
  window.fixtureRequest=async(action,payload)=>{
   calls.push({action,payload});if(mode==='slow')await new Promise(resolve=>window.releaseQuote=resolve);
   if(mode==='error')throw Error('Lịch hẹn đã hết thời gian tự đổi. Vui lòng liên hệ cửa hàng.');
   const m=payload.moveRequest;return m.confirm?{bookingId:m.bookingId}:{quote:{id:m.bookingId,version:'server-version',start_at:m.start,end_at:new Date(Date.parse(m.start)+45*60000).toISOString(),total:180000}};
  };
  renderResults(rgLastSearchState.bookings,[]);document.getElementById('rg-results').classList.remove('d-none');
 });
 await page.getByRole('button',{name:'Thay đổi lịch',exact:true}).click();
 const modal=page.locator('#guestBookingMoveDialog');await modal.waitFor();
 assert.equal(await modal.getByRole('heading',{name:'Đổi lịch hẹn',exact:true}).count(),1);
 assert.equal(await modal.locator('#guestMoveEnd').count(),0,'Spa has no hotel checkout field');
 assert.ok(!(await modal.innerText()).includes('?'));assert.equal(await modal.evaluate(node=>getComputedStyle(node).position),'fixed');
 await modal.locator('#guestMoveReason').fill('Bận việc đột xuất');await modal.locator('#guestMoveSave').click();
 await modal.getByRole('button',{name:'Xác nhận đổi lịch',exact:true}).waitFor();assert.match(await modal.locator('#guestMoveTotal').innerText(),/180[.]000 đ/);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});const bounds=await modal.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);assert.ok(Math.abs(bounds.y-(1000-bounds.height)/2)<2,'vertically centered');await page.screenshot({path:`docs/verification/guest-booking-move-popup-${width}.png`,animations:'disabled'});}
 await modal.locator('#guestMoveSave').click();await modal.waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>upsells),1);const calls=await page.evaluate(()=>window.calls);
 assert.equal(calls.length,2);assert.equal(calls[0].payload.moveRequest.confirm,false);assert.equal(calls[1].payload.moveRequest.confirm,true);assert.equal(calls[0].payload.moveRequest.id,calls[1].payload.moveRequest.id);assert.equal(calls[1].payload.moveRequest.version,'server-version');assert.equal(calls[1].payload.moveRequest.end,null);
 assert.match(calls[1].payload.moveRequest.start,/T02:00:00[.]000Z$/,'input is interpreted in Vietnam time even in UTC browser');
 // Input changes invalidate any old preview, including a late network response.
 await page.evaluate(()=>{window.mode='slow';showChangeScheduleModal(fixtureBooking.id,'0901234567');});await modal.waitFor();await modal.locator('#guestMoveReason').fill('Thay đổi thời gian chăm sóc');await modal.locator('#guestMoveSave').click();await page.waitForFunction(()=>window.releaseQuote);
 await modal.locator('#guestMoveReason').fill('Bé cưng cần nghỉ ngơi thêm');await page.evaluate(()=>{window.mode='normal';releaseQuote();});
 assert.equal(await modal.locator('#guestMovePreview').isVisible(),false);assert.equal(await modal.locator('#guestMoveSave').innerText(),'Xem giá và lịch mới');
 await page.keyboard.press('Escape');await modal.waitFor({state:'detached'});
 // Hotel-specific fields, error feedback and all close entry points.
 await page.evaluate(()=>{fixtureBooking.isHotel=true;fixtureBooking.serviceName='Khách sạn thú cưng';showChangeScheduleModal(fixtureBooking.id,'0901234567');});await modal.waitFor();assert.equal(await modal.locator('#guestMoveEnd').isVisible(),true);
 await modal.getByRole('button',{name:'Đóng',exact:true}).click();await modal.waitFor({state:'detached'});
 await page.evaluate(()=>{fixtureBooking.isHotel=false;fixtureBooking.serviceName='Tắm cơ bản';window.mode='error';showChangeScheduleModal(fixtureBooking.id,'0901234567');});await modal.waitFor();await modal.locator('#guestMoveReason').fill('Bận việc');await modal.locator('#guestMoveSave').click();await modal.locator('#guestMoveFeedback').waitFor();assert.match(await modal.locator('#guestMoveFeedback').innerText(),/hết thời gian tự đổi/);
 await modal.getByRole('button',{name:'Giữ lịch',exact:true}).click();await modal.waitFor({state:'detached'});
 await page.evaluate(()=>showChangeScheduleModal(fixtureBooking.id,'0901234567'));await modal.waitFor();await page.mouse.click(2,2);await modal.waitFor({state:'detached'});
 await page.evaluate(()=>{fixtureBooking.moveGrant=null;showChangeScheduleModal(fixtureBooking.id,'0901234567');});assert.equal(await modal.count(),0);assert.match(await page.evaluate(()=>toasts.at(-1).message),/xác thực OTP lại/);
 assert.deepEqual(errors,[]);console.log('PASS real guest lookup page → centered Vietnamese move popup, responsive screenshots, Spa/Hotel fields, quote-before-confirm, Vietnam time, request ID, stale preview, errors, OTP guard and four close methods. Isolated transport only.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
