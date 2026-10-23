// Disposable fixture only. No Cloud Logs; original business rows are never modified.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {settings,infra,sql}=require('../database/v1/cloud_connection.cjs'),{config}=settings(),options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options);
const ok=async promise=>{const r=await promise;if(r.error)throw Error(r.error.message);return r.data;};
const phone='095'+crypto.randomInt(1000000,10000000),password=crypto.randomBytes(20).toString('hex')+'!';
(async()=>{let uid,cid,vid,browser,page;try{
 uid=(await ok(service.auth.admin.createUser({email:'loyalty-'+crypto.randomUUID()+'@example.invalid',email_confirm:true,phone:'+84'+phone.slice(1),phone_confirm:true,password,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}}))).user.id;
 cid=await ok(service.rpc('complete_customer_auth',{p_auth_id:uid,p_phone:phone,p_name:'Loyalty verification'}));
 vid=crypto.randomUUID();await ok(service.from('voucher').insert({id:vid,voucher_code:'TEST-'+vid,voucher_name:'Loyalty verification <b>plain</b>',discount_value:1000,required_points:40,start_date:'2026-10-01',end_date:'2026-12-31',type:'fixed',applicable_for:'all'}));
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!process.argv.includes('--deployed'))for(const ext of ['js','css'])await page.route('**/pages/user/modules/loyalty/loyalty.'+ext+'*',r=>r.fulfill({contentType:ext==='js'?'application/javascript':'text/css',body:fs.readFileSync('pages/user/modules/loyalty/loyalty.'+ext,'utf8')}));
 await page.goto('https://pawpalgr3.vercel.app/login');await page.locator('#loginPhone').fill(phone);await page.locator('#btnLoginContinue').click();await page.locator('#loginPassword').fill(password);await page.locator('#btnLoginSubmit').click();await page.waitForURL(/\/user\/?/,{timeout:45000});
 await page.evaluate(()=>{localStorage.setItem('pawpal_my_vouchers_db',JSON.stringify([{code:'POISON-LOCAL'}]));localStorage.setItem('pawpal_admin_customers_data',JSON.stringify({fake:{phone:'0901234567',points:999999}}));location.hash='loyalty';});
 await page.locator('#current-points-display').waitFor();assert.match(await page.locator('#current-points-display').textContent(),/^0 /);assert.equal((await page.locator('#my-vouchers-list').textContent()).includes('POISON-LOCAL'),false);
 await page.locator(`[data-detail="${vid}"]`).click();await page.locator('#loyalty-dialog').waitFor();assert.equal(await page.locator('#loyalty-dialog b').count(),0);await page.screenshot({path:infra+'/verification/customer-loyalty-detail.private.png'});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#loyalty-dialog').count(),0);
 for(const how of ['close','cancel','backdrop']){await page.locator(`[data-detail="${vid}"]`).click();if(how==='backdrop')await page.locator('#loyalty-dialog').click({position:{x:5,y:5}});else await page.locator(how==='close'?'#loyalty-dialog .btn-modal-close':'#loyalty-dialog .btn-modal-cancel').click();assert.equal(await page.locator('#loyalty-dialog').count(),0);}
 if(!process.argv.includes('--detail-only')){
  await ok(service.from('paw_point_transaction').insert({customer_id:cid,points:100,sequence_no:1,idempotency_key:'test:'+cid,description:'Opening verification'}));
  await page.reload();await page.waitForFunction(()=>document.querySelector('#current-points-display')?.textContent.startsWith('100 '));
  await page.locator(`[data-redeem="${vid}"]`).click();await page.locator('#confirmLoyaltyRedeem').waitFor();
  await ok(service.from('voucher').update({required_points:45,updated_at:new Date().toISOString()}).eq('id',vid));
  await page.locator('#confirmLoyaltyRedeem').click();await page.waitForFunction(()=>document.querySelector('#loyaltyRedeemError')?.textContent.length>0);assert.equal((await ok(service.from('customer_voucher').select('id').eq('customer_id',cid))).length,0);
  assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),'pawpal_loyalty_request:'+cid+':'+vid),null);
  await ok(service.from('voucher').update({required_points:40,updated_at:new Date().toISOString()}).eq('id',vid));await page.reload();await page.locator(`[data-redeem="${vid}"]`).click();await page.locator('#confirmLoyaltyRedeem').waitFor();
  await page.screenshot({path:infra+'/verification/customer-loyalty-confirm.private.png'});
  const block=r=>r.abort();await page.route('**/rpc/redeem_own_loyalty_voucher',block);await page.locator('#confirmLoyaltyRedeem').click();await page.waitForFunction(()=>document.querySelector('#loyaltyRedeemError')?.textContent.length>0);assert.equal((await ok(service.from('customer_voucher').select('id').eq('customer_id',cid))).length,0);await page.unroute('**/rpc/redeem_own_loyalty_voucher',block);
  const response=page.waitForResponse(r=>r.url().includes('/rpc/redeem_own_loyalty_voucher')&&r.request().method()==='POST');await page.locator('#confirmLoyaltyRedeem').click();const saved=await response;assert.equal(saved.status(),200);const acquired=await saved.json();await page.waitForFunction(()=>document.querySelector('#current-points-display')?.textContent.startsWith('60 '));
  const replay=await page.evaluate(async args=>{const r=await getSupabaseClient().rpc('redeem_own_loyalty_voucher',args);return {id:r.data,error:r.error?.code};},saved.request().postDataJSON());assert.equal(replay.id,acquired);assert.equal(replay.error,undefined);
  const compatibility=await page.evaluate(async args=>{const {data}=await getSupabaseClient().auth.getSession();const r=await fetch('/api/customer/auth/me',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({action:'loyalty-redeem',requestId:args.p_id,voucherId:args.p_voucher,version:args.p_expected})});const value=await r.json();return {status:r.status,points:value.redemption?.points,id:value.redemption?.voucher?.id};},saved.request().postDataJSON());assert.equal(compatibility.status,200);assert.equal(compatibility.points,60);assert.equal(compatibility.id,acquired);
  assert.equal((await ok(service.from('paw_point_transaction').select('id').eq('customer_id',cid))).length,2);await page.locator(`[data-wallet="${acquired}"]`).waitFor();await page.screenshot({path:infra+'/verification/customer-loyalty-redeemed.private.png'});
  await page.reload();await page.locator(`[data-wallet="${acquired}"]`).waitFor();assert.match(await page.locator('#current-points-display').textContent(),/^60 /);
  const concurrent=await page.evaluate(async args=>Promise.all([crypto.randomUUID(),crypto.randomUUID()].map(id=>getSupabaseClient().rpc('redeem_own_loyalty_voucher',{...args,p_id:id}).then(r=>({id:r.data,error:r.error?.code})))),saved.request().postDataJSON());
  assert.equal(concurrent.filter(r=>r.id).length,1);assert.equal(concurrent.filter(r=>r.error==='23514').length,1);
  await page.waitForFunction(()=>document.querySelector('#current-points-display')?.textContent.startsWith('20 '),{timeout:20000});
  assert.equal((await ok(service.from('paw_point_transaction').select('id').eq('customer_id',cid))).length,3);
 }
 await page.locator(`[data-detail="${vid}"]`).click();await page.evaluate(()=>{location.hash='settings';});await page.locator('#btnExportUserData').waitFor();assert.equal(await page.locator('#loyalty-dialog').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS customer loyalty Cloud read/detail/close/navigation'+(process.argv.includes('--detail-only')?'':', atomic redemption/replay and persistent wallet/balance')+'.');
 }catch(e){fs.writeFileSync(infra+'/verification/customer-loyalty-error.private.txt',e.message.replaceAll(password,'[REDACTED]').replaceAll(phone,'[PHONE]'));if(page)await page.screenshot({path:infra+'/verification/customer-loyalty-failure.private.png'}).catch(()=>{});throw Error('Customer loyalty verification failed; private evidence saved.');}
 finally{
  if(browser)await browser.close();
  if(cid){
   // Scoped cleanup of this disposable customer's immutable test ledger only.
   if(!/^[a-f0-9-]{36}$/.test(cid)||!/^[a-f0-9-]{36}$/.test(uid))throw Error('Invalid fixture ID');
   const fixture=await ok(service.auth.admin.getUserById(uid));if(fixture.user.app_metadata?.pawpal_test!==true)throw Error('Not a test account');
   sql(`BEGIN;SET LOCAL session_replication_role=replica;DELETE FROM public.paw_point_transaction WHERE customer_id='${cid}' AND EXISTS(SELECT 1 FROM public.customer WHERE id='${cid}' AND auth_user_id='${uid}');COMMIT;`);
   await ok(service.from('customer_voucher').delete().eq('customer_id',cid));for(const t of ['customer_membership','customer_phone','customer_profile'])await ok(service.from(t).delete().eq('customer_id',cid));await ok(service.from('customer').delete().eq('id',cid));
  }if(vid)await ok(service.from('voucher').delete().eq('id',vid));if(uid)await ok(service.auth.admin.deleteUser(uid));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
