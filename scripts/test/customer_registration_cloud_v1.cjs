// Browser registration against the explicit demo OTP contract. Dedicated fixture only.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {settings,infra}=require('../database/v1/cloud_connection.cjs');
const {config}=settings(),phone='096'+String(crypto.randomInt(1000000,10000000));
const password=crypto.randomBytes(20).toString('hex')+'!';
const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async promise=>{const r=await promise;if(r.error)throw Error(r.error.message);return r.data;};
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('https://pawpalgr3.vercel.app/login?action=register');
  await page.locator('#registerName').fill('Portal registration verification');
  await page.locator('#registerPhone').fill(phone);await page.locator('#registerPassword').fill(password);
  await page.locator('#registerConfirmPassword').fill(password);
  const issued=page.waitForResponse(r=>r.url().includes('/otp/request')&&r.request().method()==='POST');
  await page.locator('#btnRegisterSubmit').click();
  const response=await issued;assert.equal(response.status(),200);
  const challenge=await response.json();assert.equal(challenge.testMode,true);
  // Read the code returned by the configured simulator, never log it.
  assert.match(challenge.testCode,/^\d{6}$/);
  const fields=page.locator('#otpSection .otp-input');
  for(let i=0;i<6;i++)await fields.nth(i).fill(challenge.testCode[i]);
  await page.waitForURL(/\/user\/?/,{timeout:45000});
  await page.waitForFunction(()=>document.querySelector('#profileName')?.textContent.includes('Portal registration verification'));
  const phoneRow=await ok(service.from('customer_phone').select('customer_id').eq('phone_number',phone).single());
  const customer=await ok(service.from('customer').select('auth_user_id,customer_status').eq('id',phoneRow.customer_id).single());
  assert.ok(customer.auth_user_id);assert.equal(customer.customer_status,'active');
  assert.equal((await ok(service.from('paw_point_transaction').select('id').eq('customer_id',phoneRow.customer_id))).length,0);
  await page.reload();await page.waitForFunction(()=>document.querySelector('#profileName')?.textContent.includes('Portal registration verification'));
  await page.screenshot({path:infra+'/verification/portal-registration.private.png',fullPage:true});
  await page.goto('https://pawpalgr3.vercel.app/user#settings');
  await page.waitForFunction(()=>typeof window.initSettings==='function');
  await page.locator('#currentPassword').fill(password);
  const newPassword=crypto.randomBytes(20).toString('hex')+'!';
  await page.locator('#newPassword').fill(newPassword);await page.locator('#confirmNewPassword').fill(newPassword);
  await page.locator('#confirmNewPassword').dispatchEvent('input');
  await page.waitForFunction(()=>!document.querySelector('#btnUpdateSecurity')?.disabled);
  const [changed]=await Promise.all([
   page.waitForResponse(r=>r.url().includes('change-password')&&r.request().method()==='POST'),
   page.locator('#btnUpdateSecurity').click()
  ]);assert.equal(changed.status(),200);
  const authUser=await ok(service.auth.admin.getUserById(customer.auth_user_id));
  const freshClient=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  assert.ok((await freshClient.auth.signInWithPassword({email:authUser.user.email,password})).error);
  await ok(freshClient.auth.signInWithPassword({email:authUser.user.email,password:newPassword}));
  console.log('PASS production password-change UI: old password rejected and new password accepted by Auth.');
  console.log('PASS real production browser register -> simulated OTP -> Auth/customer profile -> authenticated portal -> reload; no welcome points.');
 }catch(error){
  fs.writeFileSync(infra+'/verification/portal-registration-error.private.txt',String(error.message).replaceAll(password,'[REDACTED]').replaceAll(phone,'[PHONE]'));
  throw Error('Registration browser verification failed; private evidence saved outside webroot.');
 }finally{
  if(browser)await browser.close();
  const rows=await ok(service.from('customer_phone').select('customer_id').eq('phone_number',phone));
  for(const row of rows){
   const c=await ok(service.from('customer').select('auth_user_id').eq('id',row.customer_id).single());
   for(const table of ['customer_address','customer_membership','customer_phone','customer_profile'])await ok(service.from(table).delete().eq('customer_id',row.customer_id));
   await ok(service.from('customer').delete().eq('id',row.customer_id));
   if(c.auth_user_id)await ok(service.auth.admin.deleteUser(c.auth_user_id));
  }
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
