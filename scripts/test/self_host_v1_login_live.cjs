// Real local Auth + browser checks. Temporary identities are removed after testing.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra=path.resolve('D:/Aboutme/Pawpal-infra/supabase-local');
const env=require('dotenv').parse(fs.readFileSync(path.join(infra,'.env')));
if(env.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('Local-only login test');
const credentials=fs.readFileSync(path.join(infra,'PAWPAL-ADMIN.private.txt'),'utf8');
const email=credentials.match(/^Email: (.+)$/m)[1],password=credentials.match(/^Password: (.+)$/m)[1];
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(env.SUPABASE_PUBLIC_URL,env.SERVICE_ROLE_KEY,opts);
const fixtures=[];
async function ok(request){const r=await request;if(r.error)throw Error(r.error.message);return r.data;}
async function fixture(kind){
 const id=crypto.randomUUID(),fixtureEmail='login-'+id+'@pawpal.test',fixturePassword=crypto.randomBytes(18).toString('base64url');
 const created=await ok(service.auth.admin.createUser({email:fixtureEmail,password:fixturePassword,email_confirm:true}));
 const entry={authId:created.user.id,email:fixtureEmail,password:fixturePassword,kind};fixtures.push(entry);
 if(kind==='customer'){
  const row=await ok(service.from('customer').insert({auth_user_id:entry.authId,customer_code:'LOGIN-'+id}).select('id').single());entry.customerId=row.id;
 }else{
  const row=await ok(service.from('staff').insert({auth_user_id:entry.authId,full_name:'Login verification',job_title:'Verification',hire_date:'2026-10-21',employment_status:kind==='inactive'?'inactive':'active',must_change_password:kind==='mandatory'}).select('id').single());entry.staffId=row.id;
  if(kind!=='unassigned')await ok(service.from('staff_role').insert({staff_id:row.id,role_code:'ADMIN'}));
 }
 return entry;
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const contexts=[];const cloud=[];
 async function pageFor(){const ctx=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(ctx);const page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('request',r=>{if(new URL(r.url()).hostname.endsWith('.supabase.co'))cloud.push('unexpected Cloud request');});return page;}
 async function login(page,account){await page.goto('http://localhost:3001/admin/login');await page.locator('#inputAdminEmail').fill(account.email);await page.locator('#inputAdminPassword').fill(account.password);await page.locator('#btnSubmitAdminLogin').click();}
 async function checkSignedOut(page){await page.waitForFunction(async()=>{const db=window.getSupabaseClient();const r=await db.auth.getSession();return !r.data.session&&!sessionStorage.getItem('pawpal_admin_user')&&!localStorage.getItem('pawpal_admin_user');});}
 try{
  const page=await pageFor();const authErrors=[];
  page.on('response',r=>{if(new URL(r.url()).pathname==='/rest/v1/rpc/get_staff_login_context'&&r.status()>=400)authErrors.push(r.status());});
  await login(page,{email,password});await page.waitForURL('**/admin#tab-list');
  await page.locator('.header-user-tag').waitFor({state:'visible'});
  const session=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('pawpal_admin_user')));
  assert.equal(session.system_role,'ADMIN');assert(session.access_roles.includes('ADMIN'));assert.equal(session.permissions.length,210);assert.equal(authErrors.length,0);
  const captureDir=path.join(infra,'verification');fs.mkdirSync(captureDir,{recursive:true});
  await page.screenshot({path:path.join(captureDir,'v1-admin-login.png'),fullPage:true});
  console.log('PASS existing Admin logs in through real UI; V1 ADMIN role and 210 permissions mapped');
  const wrong=await pageFor();await login(wrong,{email,password:crypto.randomBytes(18).toString('base64url')});
  await wrong.locator('#loginErrorMessage').filter({hasText:'Email hoặc mật khẩu không chính xác.'}).waitFor();
  console.log('PASS wrong-password message remains distinct from locked account');
  const failure=await pageFor();await failure.route('**/rest/v1/rpc/get_staff_login_context',route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"verification unavailable"}'}));
  await login(failure,{email,password});await failure.locator('#loginErrorMessage').filter({hasText:'Không thể kiểm tra quyền đăng nhập.'}).waitFor();await checkSignedOut(failure);
  console.log('PASS RPC failure fails closed and does not report account locked');
  for(const kind of ['customer','inactive','unassigned']){
   const account=await fixture(kind),p=await pageFor();await login(p,account);
   const expected=kind==='customer'?'không có quyền truy cập':kind==='inactive'?'đã bị khóa':'chưa được cấp quyền';
   await p.locator('#loginErrorMessage').filter({hasText:expected}).waitFor();await checkSignedOut(p);
   const outsider=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,opts);
   const outsiderSession=await ok(outsider.auth.signInWithPassword({email:account.email,password:account.password}));
   const forbidden=await fetch('http://localhost:3001/api/admin/auth/complete-password-change',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+outsiderSession.session.access_token},
    body:JSON.stringify({password:crypto.randomBytes(18).toString('base64url'),staff_id:account.staffId||crypto.randomUUID()})
   });assert.equal(forbidden.status,403);await outsider.auth.signOut({scope:'local'});
   console.log('PASS '+kind+' identity denied and signed out');
  }
  const denied=await fetch('http://localhost:3001/api/admin/auth/complete-password-change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'not-used-verification'})});assert.equal(denied.status,401);
  const mandatory=await fixture('mandatory'),p=await pageFor();await login(p,mandatory);
  await p.locator('#sectionFirstChangePassword.active').waitFor();
  const gate=await ok(service.from('staff').select('must_change_password').eq('id',mandatory.staffId).single());assert.equal(gate.must_change_password,true);
  await p.evaluate(async id=>{await window.getSupabaseClient().from('staff').update({must_change_password:false}).eq('id',id);},mandatory.staffId);
  const stillGated=await ok(service.from('staff').select('must_change_password').eq('id',mandatory.staffId).single());assert.equal(stillGated.must_change_password,true);
  const nextPassword=crypto.randomBytes(18).toString('base64url');
  await p.locator('#inputNewPassword').fill(nextPassword);await p.locator('#inputConfirmPassword').fill(nextPassword);await p.locator('#btnSubmitChangePass').click();
  await p.waitForURL('**/admin#tab-list');
  const completed=await ok(service.from('staff').select('must_change_password').eq('id',mandatory.staffId).single());assert.equal(completed.must_change_password,false);
  const check=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,opts);
  await ok(check.auth.signInWithPassword({email:mandatory.email,password:nextPassword}));await check.auth.signOut({scope:'local'});
  console.log('PASS mandatory password change completes via verified server endpoint, then logs in; unauthenticated completion denied');
  const adminProbe=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,opts);
  await ok(adminProbe.auth.signInWithPassword({email,password}));await adminProbe.auth.signOut({scope:'local'});
  assert.equal(cloud.length,0);
  console.log('PASS no Cloud requests; real Admin password unchanged');
 }finally{
  for(const ctx of contexts)await ctx.close();await browser.close();
  for(const item of fixtures.reverse()){
   if(item.staffId){await ok(service.from('staff_role').delete().eq('staff_id',item.staffId));await ok(service.from('staff').delete().eq('id',item.staffId));}
   if(item.customerId)await ok(service.from('customer').delete().eq('id',item.customerId));
   await ok(service.auth.admin.deleteUser(item.authId));
  }
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
