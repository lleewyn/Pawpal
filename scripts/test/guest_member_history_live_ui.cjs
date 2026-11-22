// Real User/Admin pages with live Supabase data. No SMS/email/password changes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {settings}=require('../database/v1/cloud_connection.cjs');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const site='http://localhost:4000',folder='docs/verification/guest-member-history';
const member='11f261a4-a46c-4aa1-b28c-de595964db10',memberAuth='46a00820-9017-47f9-b252-c870c4a55131';
const ok=async promise=>{const result=await promise;if(result.error)throw Error(result.error.code||'Auth/read failed');return result.data;};
(async()=>{const {config}=settings(),options={auth:{persistSession:false,autoRefreshToken:false}};
 const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options);
 const sessions=[],clients=[];let browser;
 async function sessionFor(id){
  const identity=await ok(service.auth.admin.getUserById(id));assert.ok(identity.user.email);
  const link=await ok(service.auth.admin.generateLink({type:'magiclink',email:identity.user.email}));
  const client=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
  const signed=await ok(client.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token}));
  assert.equal(signed.user.id,id);sessions.push(signed.session);clients.push(client);return signed.session;
 }
 try{
  fs.mkdirSync(folder,{recursive:true});
  const customerSession=await sessionFor(memberAuth);
  const response=await fetch(site+'/api/customer/auth/me',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+customerSession.access_token},body:'{}'});
  const result=await response.json();assert.equal(result.success,true,result.message);assert.equal(result.user.id,member);
  const pointer=JSON.parse(fs.readFileSync('docs/security/phase6/cutover.private.txt','utf8'));
  const mapping=JSON.parse(fs.readFileSync(path.join(pointer.backupDir,'account-mapping.private.txt'),'utf8'));
  const manager=mapping.find(row=>row.roles.includes('ADMIN')&&row.employment_status==='active'&&!row.must_change_password);assert.ok(manager);
  const adminSession=await sessionFor(manager.auth_user_id);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[];
  const customerContext=await browser.newContext({viewport:{width:1440,height:1050}});
  await customerContext.addInitScript(({session,user})=>{
   if(location.origin!=='http://localhost:4000')return;
   if(sessionStorage.getItem('history-check-seeded'))return;
   sessionStorage.setItem('history-check-seeded','1');
   localStorage.setItem('sb-cpzuvaplseielhgcnqrn-auth-token',JSON.stringify(session));
   localStorage.setItem('pawpal_current_user',JSON.stringify(user));sessionStorage.setItem('pawpal_current_user',JSON.stringify(user));
  },{session:customerSession,user:result.user});
  const user=await customerContext.newPage();user.on('pageerror',error=>errors.push('User: '+error.message));
  await user.goto(site+'/pages/user/#orders');
  await user.waitForFunction(()=>document.querySelectorAll('#orders-list .order-card').length===5,{},{timeout:45000});
  for(const id of ['bc627ac5-4b3d-455f-ac47-bf5075622eea','a277eb76-56d7-4d76-9163-ec4d88c5e47b','f2a46056-fa3a-4b32-93bc-b4f51f933238'])assert.equal(await user.locator(`article[data-order-id="SO-${id.replaceAll('-','')}"]`).count(),1);
  await user.locator('.site-popup-btn-close').first().waitFor({timeout:5000}).catch(()=>{});
  while(await user.locator('.site-popup-btn-close').first().isVisible())await user.locator('.site-popup-btn-close').first().click();
  await user.locator('main').screenshot({path:folder+'/user-orders.png'});
  await user.goto(site+'/pages/user/#bookings');
  await user.locator('.booking-card').first().waitFor({timeout:45000});
  assert.match(await user.locator('.bookings-module-container').innerText(),/Đậu/);
  await user.locator('main').screenshot({path:folder+'/user-bookings.png'});
  await user.goto(site+'/pages/user/#pets');
  await user.getByText('Đậu',{exact:true}).first().waitFor({timeout:45000});
  await user.locator('main').screenshot({path:folder+'/user-pet.png'});
  const adminContext=await browser.newContext({viewport:{width:1440,height:1000}});
  await adminContext.addInitScript(({session,member})=>{
   if(location.origin!=='http://localhost:4000')return;
   if(sessionStorage.getItem('history-check-seeded'))return;
   sessionStorage.setItem('history-check-seeded','1');localStorage.setItem('pawpal_admin_supabase_auth',JSON.stringify(session));
   sessionStorage.setItem('pawpal_admin_active_module','Khách hàng');sessionStorage.setItem('pawpal_admin_customer_subtab','tab-profile');
   sessionStorage.setItem('pawpal_admin_customer_id',member);sessionStorage.setItem('pawpal_admin_customer_drawertab','dtab-pets');
  },{session:adminSession,member});
  const admin=await adminContext.newPage();admin.on('pageerror',error=>errors.push('Admin: '+error.message));
  await admin.goto(site+'/pages/admin/#tab-profile');
  await admin.locator('#dtab-pets').getByText('Đậu',{exact:true}).waitFor({timeout:60000});
  await admin.screenshot({path:folder+'/admin-pet.png'});
  await admin.locator('[data-drawertab="dtab-orders"]').click();
  await admin.waitForFunction(()=>document.querySelectorAll('#drawerOrdersTbody tr').length===5,{},{timeout:45000});
  await admin.screenshot({path:folder+'/admin-orders.png'});
  await admin.locator('[data-drawertab="dtab-bookings"]').click();
  await admin.locator('#drawerBookingsTbody').getByText(/8B0BFC32/i).waitFor({timeout:45000});
  await admin.screenshot({path:folder+'/admin-bookings.png'});
  await admin.locator('[data-drawertab="dtab-complaints"]').click();
  await admin.waitForFunction(()=>document.querySelectorAll('#drawerComplaintsTbody tr').length===2,{},{timeout:45000});
  await admin.screenshot({path:folder+'/admin-support.png'});
  fs.writeFileSync(folder+'/browser-check.txt',JSON.stringify({status:'PASS',timestamp:new Date().toISOString(),scope:'Real local User/Admin pages, live Supabase Auth and data; password unchanged, no messages delivered or business writes',checks:['User shows all five orders including the three original guest order IDs','User shows Đậu and the original booking','Admin member profile shows Đậu, five orders, one booking and two support tickets'],pageErrors:errors},null,2)+'\n');
  console.log('PASS real User/Admin pages and live data. Evidence saved; no passwords changed or messages delivered.');
 }finally{
  if(browser)await browser.close();
  for(const client of clients)await client.auth.signOut({scope:'local'}).catch(()=>{});
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
