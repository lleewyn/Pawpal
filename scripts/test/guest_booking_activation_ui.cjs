// Exercise the real receipt/auth UI with isolated transport; no SMS or Cloud writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const authHtml=fs.readFileSync('pages/public/login/login.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin!=='http://localhost')return route.abort();
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><div id="receipt"></div>'});
   if(url.pathname==='/login')return route.fulfill({contentType:'text/html; charset=utf-8',body:authHtml});
   if(url.pathname==='/user')return route.fulfill({contentType:'text/html',body:'<h1>Lịch hẹn của bé</h1>'});
   if(url.pathname==='/scripts/shared/guest-commerce-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export class GuestCommerceError extends Error{};export const guestCommerce={request:async(action)=>action==='context'?{initialized:true,contact:{phone:'0987654321'}}:{booking:{id:'11111111-1111-4111-8111-111111111111',code:'BKG-11111111111141118111111111111111',status:'pending',total:100000,start_at:'2031-01-01T03:00:00Z',end_at:'2031-01-01T04:00:00Z'},recoveryCode:'r1.booking.11111111-1111-4111-8111-111111111111.1800000000.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}};`});
   const file=path.join(process.cwd(),decodeURIComponent(url.pathname));
   if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);
   if(url.pathname.endsWith('/booking.js'))body=body.toString()+'\nexport {state,renderBookingReceipt};';
   return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.html')?'text/html':'text/javascript',body});
  });
  await page.goto('http://localhost/');
  await page.evaluate(async()=>{const m=await import('/pages/services/booking/booking.js');m.state.guest=true;await m.renderBookingReceipt(document.getElementById('receipt'),'11111111-1111-4111-8111-111111111111');});
  await page.addStyleTag({content:fs.readFileSync('pages/services/booking/booking.css','utf8')+fs.readFileSync('styles/transaction-receipt.css','utf8')+'body{margin:0;padding:36px 18px;background:#fcfdfb}'});
  const recovery=page.locator('.receipt-recovery');
  assert.equal(await recovery.getAttribute('open'),null);
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:1000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`docs/verification/sync/booking-receipt-${width}.png`,fullPage:true,animations:'disabled'});
  }
  await recovery.locator('summary').click();assert.equal(await recovery.locator('textarea').isVisible(),true);
  assert.ok((await recovery.locator('textarea').inputValue()).startsWith('r1.booking.'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const link=page.getByRole('link',{name:'Thiết lập mật khẩu',exact:true});
  assert.equal(await link.count(),1);
  assert.match(await page.locator('.receipt-activate').innerText(),/tài khoản tạm/);
  assert.match(await page.locator('.receipt-activate').innerText(),/50 Paw Points/);
  assert.match(await page.locator('.receipt-summary').innerText(),/Đặt cọc\s+0 VNĐ/);
  assert.ok((await link.getAttribute('href')).includes('guest-activate'));
  await link.click();
  await page.addStyleTag({content:fs.readFileSync('node_modules/bootstrap/dist/css/bootstrap.min.css','utf8')});
  // Keep the real auth card while excluding unrelated shared navigation scripts from this isolated harness.
  await page.evaluate(()=>{const card=document.querySelector('.auth-card-wrapper'),toasts=document.getElementById('toastContainer');document.body.replaceChildren(card,toasts);});
  await page.evaluate(()=>{
   window.authCalls=[];
   window.PawpalCustomerAuth={request:async(action,body)=>{authCalls.push({action,body});return action==='otp/request'?{challengeId:'test-challenge',linkGuest:true,resendAfter:60}:{success:true};},accept:async()=>{}};
  });
  await page.addScriptTag({url:'/pages/public/login/login.js'});
  await page.waitForFunction(()=>document.getElementById('loginOtpPhoneDisplay').textContent==='0987654321');
  await page.locator('#btnSendOTPGuest').click();
  // The current OTP UI advances automatically after the sixth digit.
  for(let i=0;i<6;i++)await page.locator('#forgotOtpSection .otp-input').nth(i).fill(String(i+1));
  await page.locator('#setupPasswordSection').waitFor({state:'visible'});
  assert.equal(await page.locator('#forgotNewPasswordSection').isHidden(),true);
  const submit=page.locator('#btnSetupSubmit');
  assert.equal(await submit.isDisabled(),true);
  await page.locator('#setupPassword').fill('12345678');
  await page.locator('#setupConfirmPassword').fill('12345678');
  await page.locator('#setupTermsCheckbox').check();
  assert.equal(await submit.isDisabled(),true);
  assert.equal(await page.locator('#setupPasswordFeedback').isVisible(),true);
  await page.locator('#setupPassword').fill('Password@123');
  await page.locator('#setupConfirmPassword').fill('Password@456');
  assert.equal(await page.locator('#setupConfirmFeedback').isVisible(),true);
  assert.equal(await page.locator('#setupConfirmFeedback').innerText(),'Mật khẩu xác nhận không khớp');
  assert.equal(await page.locator('#setupConfirmFeedback').evaluate(el=>getComputedStyle(el).color),'rgb(220, 53, 69)');
  assert.equal(await submit.isDisabled(),true);
  await page.evaluate(()=>document.getElementById('setupPasswordForm').requestSubmit());
  assert.equal(await page.evaluate(()=>authCalls.some(call=>call.action==='otp/complete')),false);
  await page.locator('#setupPassword').fill('Pawpal@2026');
  assert.equal(await submit.isDisabled(),true);
  await page.locator('#setupConfirmPassword').fill('Pawpal@2026');
  await page.locator('#setupTermsCheckbox').uncheck();
  assert.equal(await submit.isDisabled(),true);
  await page.locator('#setupTermsCheckbox').check();
  assert.equal(await submit.isEnabled(),true);
  const calls=await page.evaluate(()=>authCalls);
  assert.deepEqual(calls,[{action:'otp/request',body:{phone:'0987654321',purpose:'activate'}}]);
  await page.evaluate(()=>document.getElementById('toastContainer').replaceChildren());
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:1000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`docs/verification/sync/guest-activation-${width}.png`,fullPage:true});
  }
  let complete;
  await page.exposeFunction('captureComplete',body=>{complete=body;});
  await page.evaluate(()=>{const original=PawpalCustomerAuth.request;PawpalCustomerAuth.request=async(action,body)=>{if(action==='otp/complete')await captureComplete(body);return original(action,body);};});
  await submit.click();
  await page.waitForURL('http://localhost/user#bookings');
  assert.deepEqual(complete,{challengeId:'test-challenge',code:'123456',password:'Pawpal@2026',name:undefined,linkGuest:true});
  await page.goto('http://localhost/login?action=register');
  await page.addStyleTag({content:fs.readFileSync('node_modules/bootstrap/dist/css/bootstrap.min.css','utf8')});
  await page.evaluate(()=>{
   const card=document.querySelector('.auth-card-wrapper'),toasts=document.getElementById('toastContainer');document.body.replaceChildren(card,toasts);
   window.authCalls=[];window.PawpalCustomerAuth={request:async(action,body)=>{authCalls.push({action,body});throw Error('Unexpected request');}};
  });
  await page.addScriptTag({url:'/pages/public/login/login.js'});
  await page.locator('#registerName').fill('Khách kiểm thử');
  await page.locator('#registerPhone').fill('0912345678');
  await page.locator('#registerPassword').fill('Password@123');
  await page.locator('#registerConfirmPassword').fill('Password@456');
  assert.equal(await page.locator('#registerConfirmFeedback').isVisible(),true);
  assert.equal(await page.locator('#registerConfirmFeedback').innerText(),'Mật khẩu xác nhận không khớp');
  assert.equal(await page.locator('#registerConfirmFeedback').evaluate(el=>getComputedStyle(el).color),'rgb(220, 53, 69)');
  assert.equal(await page.locator('#btnRegisterSubmit').isDisabled(),true);
  await page.evaluate(()=>document.getElementById('registerForm').requestSubmit());
  assert.equal(await page.evaluate(()=>authCalls.length),0);
  await page.locator('#registerConfirmPassword').fill('Password@123');
  assert.equal(await page.locator('#registerConfirmFeedback').isHidden(),true);
  assert.equal(await page.locator('#btnRegisterSubmit').isEnabled(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS receipt CTA -> session phone -> activation OTP -> matching password and terms -> cookie-bound completion -> bookings; desktop/mobile fit. Isolated transport, no live SMS.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
