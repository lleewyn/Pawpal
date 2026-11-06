// Authorized phase-6 smoke. No emails sent, existing passwords reset, financial writes or Cloud Logs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js'),{settings}=require('../database/v1/cloud_connection.cjs');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const folder='docs/security/phase6',site='https://pawpalgr3.vercel.app',report={capturedAt:new Date().toISOString(),checks:[],status:'INCOMPLETE',scope:'Actual deployed Vercel API/browser and Supabase Auth/RPC with one temporary STAFF identity; no Cloud Logs or financial mutations'};
const pass=name=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
const options={auth:{persistSession:false,autoRefreshToken:false}};
let service,manager,worker,browser,temporaryStaff,temporaryAuth,sessionId,managerSession;
const fail=message=>{throw Error(message);};
const ok=async(task,label)=>{const result=await task;if(result.error)fail(label+': '+(result.error.code||result.error.status||'failed'));return result.data;};
const api=async(url,token,body,method='POST')=>{const r=await fetch(site+url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});return {status:r.status,body:await r.json()};};
(async()=>{try{
 const {config}=settings(),response=await fetch(site+'/api/admin-config',{cache:'no-store'}),text=await response.text(),publicConfig=JSON.parse(text.slice(text.indexOf('=')+1).replace(/;\s*$/,''));assert.equal(publicConfig.url,config.DESTINATION_SUPABASE_URL);
 service=createClient(publicConfig.url,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options);manager=createClient(publicConfig.url,publicConfig.anonKey,options);worker=createClient(publicConfig.url,publicConfig.anonKey,options);
 const pointer=JSON.parse(fs.readFileSync(folder+'/cutover.private.txt','utf8'));assert.equal(pointer.action,'apply');
 const mapping=JSON.parse(fs.readFileSync(path.join(pointer.backupDir,'account-mapping.private.txt'),'utf8')),admin=mapping.find(s=>s.roles.includes('ADMIN')&&String(s.employment_status).toLowerCase()==='active'&&!s.must_change_password);assert.ok(admin?.auth_user_id);
 const identity=await ok(service.auth.admin.getUserById(admin.auth_user_id),'Read preserved ADMIN identity');
 // generateLink returns a verification token only; unlike signInWithOtp it does not deliver email.
 const link=await ok(service.auth.admin.generateLink({type:'magiclink',email:identity.user.email}),'Generate private ADMIN test session');
 const signed=await ok(manager.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token}),'Verify ADMIN session');managerSession=signed.session;
 const managerContext=await ok(manager.rpc('get_staff_login_context'),'Read ADMIN context');assert.deepEqual(managerContext.staff.access_roles,['ADMIN']);assert.equal(managerContext.is_active,true);assert.equal(managerContext.workspace_signals,true);
 pass('Preserved production ADMIN authenticates without changing its password or delivering email and sees the verified ADMIN role');
 const stock=await ok(manager.rpc('get_staff_workspace',{p_kind:'stock',p_query:'',p_id:null,p_page:1}),'Read bounded work catalog');assert.ok(Array.isArray(stock.items));
 const email='cutover-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomBytes(24).toString('hex'),newPassword=crypto.randomBytes(24).toString('hex'),phone='09'+String(crypto.randomInt(10000000,99999999));temporaryStaff=crypto.randomUUID();
 const provision=await api('/api/staff-auth?action=provision-account',managerSession.access_token,{requestId:crypto.randomUUID(),staffId:temporaryStaff,email,password,enableLogin:true,roles:['STAFF'],permissions:[],profile:{full_name:'Nhân viên kiểm tra triển khai',job_title:'Kiểm thử',phone_number:phone,email,employment_status:'active',service_locked:false,staff_level_id:null,reason:'Kiểm tra chuyển đổi phân quyền'}});assert.equal(provision.status,200,JSON.stringify({status:provision.status,message:provision.body.message}));assert.equal(provision.body.success,true);
 let staffLogin=await ok(worker.auth.signInWithPassword({email,password}),'First STAFF login');temporaryAuth=staffLogin.user.id;
 let context=await ok(worker.rpc('get_staff_login_context'),'Read first-password gate');assert.equal(context.staff.must_change_password,true);assert.deepEqual(context.staff.permission_codes,[]);
 const changed=await api('/api/staff-auth',staffLogin.session.access_token,{password:newPassword});assert.equal(changed.status,200);assert.equal(changed.body.success,true);
 staffLogin=await ok(worker.auth.signInWithPassword({email,password:newPassword}),'STAFF sign-in after password change');context=await ok(worker.rpc('get_staff_login_context'),'Verified STAFF context');assert.deepEqual(context.staff.access_roles,['STAFF']);assert.ok(context.staff.permission_codes.includes('work.copilot.use'));assert.ok(!context.staff.permission_codes.includes('payment.read'));
 pass('Deployed provisioning API creates a temporary STAFF, requires first password change and grants only the fixed STAFF permissions');
 const self=await ok(worker.rpc('get_staff_workspace',{p_kind:'self',p_query:'',p_id:null,p_page:1}),'STAFF self projection');assert.equal(self.items.length,1);assert.equal(self.items[0].id,temporaryStaff);
 const raw=await worker.from('payment').select('id').limit(1);assert.ok(raw.error||raw.data.length===0);
 const handlers=await ok(manager.rpc('get_admin_chat_handlers'),'Production assignment candidates');assert.ok(handlers.some(s=>s.id===temporaryStaff));
 pass('Live STAFF reads its own projection but no raw payments; production management picker recognizes the new STAFF work role');
 sessionId=crypto.randomUUID();const answer=await api('/api/admin-chat',staffLogin.session.access_token,{requestId:crypto.randomUUID(),sessionId,question:'Hồ sơ nhân viên',stream:false});assert.equal(answer.status,200);assert.ok(answer.body.reply?.includes('Nhân viên kiểm tra triển khai'));
 const denied=await api('/api/admin-chat',staffLogin.session.access_token,{requestId:crypto.randomUUID(),sessionId,question:'Doanh thu toàn cửa hàng hôm nay',stream:false});assert.equal(denied.status,403);assert.ok(!denied.body.reply);
 const deleted=await api('/api/admin-chat',staffLogin.session.access_token,{sessionId},'DELETE');assert.equal(deleted.status,200);
 pass('Actual Vercel STAFF assistant returns deterministic own facts, denies store revenue and deletes only its temporary history');
 browser=await chromium.launch({channel:'chrome',headless:true});const browserContext=await browser.newContext({viewport:{width:390,height:844}});
 await browserContext.addInitScript(session=>{if(sessionStorage.getItem('cutover-smoke-seeded'))return;sessionStorage.setItem('cutover-smoke-seeded','1');localStorage.setItem('pawpal_admin_supabase_auth',JSON.stringify(session));},staffLogin.session);
 const page=await browserContext.newPage();await page.goto(site+'/admin#tab-staff-profile');await page.waitForFunction(()=>window.PawpalAdminAccess?.state.role==='STAFF');await page.locator('.admin-preview-content').getByText('Nhân viên kiểm tra triển khai',{exact:false}).first().waitFor();assert.equal(await page.locator('.sidebar-menu-btn[data-title="Cấu hình"]').isVisible(),false);assert.equal(await page.evaluate(()=>document.body.scrollWidth<=innerWidth),true);await page.screenshot({path:folder+'/live-staff-mobile.png'});
 await page.waitForFunction(()=>getSupabaseClient().getChannels().some(c=>c.topic.startsWith('realtime:workspace-')&&c.state==='joined'));
 const changeRole=async role=>{const rows=await ok(service.from('staff').select('updated_at').eq('id',temporaryStaff).single(),'Read temporary role version');await ok(manager.rpc('set_admin_staff_access',{p_request_id:crypto.randomUUID(),p_staff_id:temporaryStaff,p_expected_updated_at:rows.updated_at,p_roles:[role],p_permissions:[],p_reason:'Kiểm tra cập nhật vai trò sau chuyển đổi'}),'Change temporary test role');};
 await changeRole('ADMIN');await page.waitForFunction(()=>window.PawpalAdminAccess?.state.role==='ADMIN');await page.waitForFunction(()=>getSupabaseClient().getChannels().some(c=>c.topic.startsWith('realtime:workspace-')&&c.state==='joined'));await changeRole('STAFF');await page.waitForFunction(()=>window.PawpalAdminAccess?.state.role==='STAFF');
 pass('Actual production browser on mobile switches STAFF to ADMIN and back through the real Cloud Realtime signal without a manual reload');
 await page.waitForFunction(()=>getSupabaseClient().getChannels().some(c=>c.topic.startsWith('realtime:workspace-')&&c.state==='joined'));
 const version=await ok(service.from('staff').select('updated_at').eq('id',temporaryStaff).single(),'Read temporary account version');
 const locked=await api('/api/staff-auth?action=toggle-account-status',managerSession.access_token,{requestId:crypto.randomUUID(),staffId:temporaryStaff,expectedUpdatedAt:version.updated_at,action:'lock'});assert.equal(locked.status,200);
 await page.waitForFunction(()=>window.PawpalAdminAccess?.state.role===null);await page.waitForFunction(()=>getSupabaseClient().getChannels().length===0);const forbidden=await worker.rpc('get_staff_workspace',{p_kind:'self'});assert.equal(forbidden.error?.code,'42501');
 pass('Deployed account-lock API invalidates the live browser and all registered channels; the pre-lock STAFF token loses work access');
 const catalog=await fetch(publicConfig.url+'/rest/v1/service?select=id&limit=1',{headers:{apikey:publicConfig.anonKey}});assert.equal(catalog.status,200);const managerAfter=await ok(manager.rpc('get_staff_login_context'),'Retained ADMIN after smoke');assert.equal(managerAfter.is_active,true);assert.deepEqual(managerAfter.staff.access_roles,['ADMIN']);
 pass('Anonymous service catalog remains available and the original ADMIN remains active after smoke tests');report.status='PASS';
}catch(error){report.error={name:error.name,message:String(error.message).slice(0,700)};console.error(report.error);process.exitCode=1;}
finally{
 if(browser)await browser.close();
 const cleanup=[];
 if(service&&temporaryStaff){try{
  if(!temporaryAuth){const row=await service.from('staff').select('auth_user_id').eq('id',temporaryStaff).maybeSingle();temporaryAuth=row.data?.auth_user_id;}
  if(worker&&sessionId){try{await worker.rpc('delete_staff_copilot_session',{p_session:sessionId});}catch{}}
  const roles=await service.from('staff_role').delete().eq('staff_id',temporaryStaff);if(roles.error)throw Error('temporary_role_cleanup_failed');
  const staff=await service.from('staff').delete().eq('id',temporaryStaff);if(staff.error)throw Error('temporary_staff_cleanup_failed');
  if(temporaryAuth){const auth=await service.auth.admin.deleteUser(temporaryAuth);if(auth.error)throw Error('temporary_auth_cleanup_failed');}
  cleanup.push('Temporary STAFF role/profile/Auth removed; immutable management audit retained');report.temporaryIdentityRemoved=true;
 }catch(error){report.cleanupError=error.message;report.temporaryIdentityRemoved=false;process.exitCode=1;}}
 if(managerSession){try{await manager.auth.signOut({scope:'local'});}catch{}}
 report.cleanup=cleanup;fs.writeFileSync(folder+'/cloud-smoke-results.txt',JSON.stringify(report,null,2)+'\n');
}
})();
