const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1365,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.min.css"><link rel="stylesheet" href="/styles/style.css"><link rel="stylesheet" href="/pages/user/user.css"><link rel="stylesheet" href="/pages/user/modules/bookings/bookings.css"><body class="user-portal-body"><main style="padding:30px"><h1>Lịch hẹn của bé</h1></main></body>'});
  if(u.pathname==='/scripts/api/api.js')return route.fulfill({contentType:'text/javascript',body:'export const API={};'});
  if(u.pathname==='/scripts/shared/customer-booking.mjs')return route.fulfill({contentType:'text/javascript',body:'export async function cancelCustomerBooking(db,user,booking,reason,request){window.saved={reason,request};} export function quoteCustomerBookingMove(){} export function moveCustomerBooking(){}'});
  const file=path.join(process.cwd(),u.pathname);if(!fs.existsSync(file))return route.abort();
  return route.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(file)});
 });
 await page.goto('http://localhost/');
 await page.evaluate(async()=>{window.ui=await import('/pages/user/modules/bookings/bookings.js');window.openCancel=()=>ui.openBookingCancelModal({id:'UI-BOOKING',serviceName:'Dịch vụ đã đặt',petName:'Bé cưng'},()=>{});});
 const open=()=>page.evaluate(()=>window.openCancel());await open();
 const radios=page.locator('#quickCancelBookingModal input[type=radio]');assert.equal(await radios.count(),5);
 assert.equal(await page.locator('#bookingCancelReason').isVisible(),false);
 await page.locator('#quickConfirmCancelBtn').click();assert.ok(await page.locator('#bookingCancelError').isVisible());assert.equal(await page.evaluate(()=>window.saved),undefined);
 const expected=['Bận việc đột xuất / Thay đổi lịch trình','Gặp vấn đề về sức khỏe','Đặt nhầm thời gian hoặc địa điểm','Đã tìm được giải pháp/dịch vụ khác','Lý do cá nhân khác'];
 assert.deepEqual(await radios.evaluateAll(es=>es.map(e=>e.value)),expected);
 for(let i=0;i<4;i++){
  if(i)await open();await radios.nth(i).check();assert.equal(await page.locator('#bookingCancelReason').isVisible(),false);
  assert.equal(await page.locator('#quickCancelBookingModal input[type=radio]:checked').count(),1);
  await page.locator('#quickConfirmCancelBtn').click();await page.waitForSelector('#quickCancelBookingModal',{state:'detached'});
  assert.equal(await page.evaluate(()=>window.saved.reason),expected[i]);
 }
 await open();await radios.last().check();assert.equal(await page.locator('#bookingCancelReason').isVisible(),true);
 await page.locator('#bookingCancelReason').fill('   ');await page.locator('#quickConfirmCancelBtn').click();assert.ok(await page.locator('#bookingCancelError').isVisible());
 await page.locator('#bookingCancelReason').fill('Gia đình có việc cần xử lý');
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('#quickConfirmCancelBtn')).backgroundColor==='rgb(35, 107, 72)');
 const dir='docs/verification/booking-cancellation';fs.mkdirSync(dir,{recursive:true});
 await page.screenshot({path:dir+'/reasons-other-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:dir+'/reasons-other-mobile.png'});
 await radios.first().check();assert.equal(await page.locator('#bookingCancelReason').isVisible(),false);assert.equal(await page.locator('input[type=radio]:checked').count(),1);
 await page.screenshot({path:dir+'/reasons-mobile.png'});
 await page.locator('#quickConfirmCancelBtn').click();await page.waitForSelector('#quickCancelBookingModal',{state:'detached'});assert.equal(await page.evaluate(()=>window.saved.reason),expected[0]);
 await open();await radios.last().check();await page.locator('#bookingCancelReason').fill('Gia đình có việc cần xử lý');await page.locator('#quickConfirmCancelBtn').click();await page.waitForSelector('#quickCancelBookingModal',{state:'detached'});assert.equal(await page.evaluate(()=>window.saved.reason),'Gia đình có việc cần xử lý');
 await open();await page.keyboard.press('Escape');await page.waitForSelector('#quickCancelBookingModal',{state:'detached'});
 await open();await page.getByRole('button',{name:'Giữ lịch',exact:true}).click();await page.waitForSelector('#quickCancelBookingModal',{state:'detached'});
 assert.deepEqual(errors,[]);console.log('PASS actual booking cancellation dialog: 5 single-choice reasons, conditional textarea, validation, exact saved reason, green button, desktop/mobile screenshots, Escape and keep booking. UI adapter isolated; no Cloud writes.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
