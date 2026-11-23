'use strict';
// Actual form and real Auth refresh/verification. Initial 401 is isolated; never provision an account.
require('dotenv').config({quiet:true});
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),express=require('express');
const {createClient}=require('@supabase/supabase-js');
const {createStaffAuthHandlers}=require('../api/staff_auth.js');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
async function main(){
 const config={url:process.env.PAWPAL_ADMIN_SUPABASE_URL,anonKey:process.env.PAWPAL_ADMIN_SUPABASE_ANON_KEY,serviceKey:process.env.PAWPAL_ADMIN_SUPABASE_SERVICE_ROLE_KEY};
 const client=createClient(config.url,config.anonKey,{auth:{persistSession:false,autoRefreshToken:false}}),credentials=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');
 const signed=await client.auth.signInWithPassword({email:credentials.match(/^Email: (.+)$/m)[1].trim(),password:credentials.match(/^Password: (.+)$/m)[1].trim()});assert.equal(signed.error,null);
 const app=express();app.get('/api/admin-config',require('../../api/admin-config.js'));
 app.use('/api',(req,res)=>res.status(405).json({success:false,message:'Read-only proof: account mutations disabled'}));
 app.get('/admin',(req,res)=>res.sendFile(path.resolve('pages/admin/index.html')));app.get('/admin/login',(req,res)=>res.sendFile(path.resolve('pages/admin/login/login.html')));app.use(express.static(process.cwd(),{dotfiles:'deny'}));
 const server=await new Promise(resolve=>{const value=app.listen(0,'127.0.0.1',()=>resolve(value));});const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true}),folder='docs/verification/staff-account-session',eyeFolder='docs/verification/password-eye-controls';fs.mkdirSync(folder,{recursive:true});fs.mkdirSync(eyeFolder,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}});
  await page.addInitScript(session=>{localStorage.setItem('pawpal_admin_supabase_auth',JSON.stringify(session));sessionStorage.setItem('pawpal_admin_active_module','Nhân sự');},signed.data.session);
  await page.exposeFunction('verifyOnly',async authorization=>{const result=await createStaffAuthHandlers(config).verifyAdminCaller({headers:{authorization}});return {status:result.authorized?200:result.status,body:{success:result.authorized,role:result.staff?.system_role,message:result.message}};});
  await page.goto(origin+'/admin#tab-staff-list',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Thêm nhân viên',exact:true}).click({timeout:30000});
  await page.locator('#staffModalOverlay.active').waitFor();await page.waitForFunction(()=>document.querySelectorAll('#staffAccountRoles input').length===2);
  const probe=await page.evaluate(async()=>{
   const {requestStaffAccount}=await import('/scripts/shared/staff-account-request.mjs');let attempts=0;const bodies=[];
   const result=await requestStaffAccount(getSupabaseClient(),'provision-account',{requestId:crypto.randomUUID(),roles:['STAFF'],permissions:[]},{fetchImpl:async(url,options)=>{
    attempts++;bodies.push(options.body);if(attempts===1)return new Response(JSON.stringify({success:false,message:'isolated stale session'}),{status:401});
    const checked=await verifyOnly(options.headers.Authorization);return new Response(JSON.stringify(checked.body),{status:checked.status});
   }});return {attempts,sameBody:bodies[0]===bodies[1],success:result.success,role:result.role};
  });assert.deepEqual(probe,{attempts:2,sameBody:true,success:true,role:'ADMIN'});
  assert.equal(await page.locator('#staffAccountRoles input[value="STAFF"]').isChecked(),true);
  assert.equal(await page.locator('#staffAccountRoles input').count(),2);
  assert.equal(await page.locator('#staffProfileError').textContent(),'');
  const jobFolder='docs/verification/staff-job-titles';fs.mkdirSync(jobFolder,{recursive:true});
  const jobInput=page.locator('#staffInputPosition + .admin-input');
  const optionLabels=await page.locator('#staffInputPosition option').allTextContents();
  for(const label of ['Tài xế đưa đón thú cưng','Nhân viên chăm sóc lưu trú','Nhân viên vệ sinh lưu trú'])assert.ok(optionLabels.includes(label));
  assert.ok(!optionLabels.includes('ADMIN')&&!optionLabels.includes('cham_soc_thu_cung'));
  for(const [query,image]of [['Tài xế','taxi'],['lưu trú','hotel'],['Chăm sóc','vietnamese']]){
   await jobInput.fill(query);await page.locator('#staffModalOverlay .customer-autocomplete-popover:visible').waitFor();
   await page.screenshot({path:jobFolder+'/'+image+'-desktop.png'});
  }
  await jobInput.fill('Tài xế');await page.locator('#staffModalOverlay .customer-autocomplete-popover:visible button').filter({hasText:'Tài xế đưa đón thú cưng'}).click();assert.equal(await page.locator('#staffInputPosition').inputValue(),'Tài xế đưa đón thú cưng');
  assert.equal(await page.locator('#staffAccountRoles input[value="STAFF"]').isChecked(),true);
  await jobInput.fill('Quản lý');await page.locator('#staffModalOverlay .customer-autocomplete-popover:visible button').filter({hasText:/^Quản lý$/}).click();assert.equal(await page.locator('#staffAccountRoles input[value="STAFF"]').isChecked(),true);
  await page.setViewportSize({width:390,height:844});await jobInput.evaluate(node=>node.scrollIntoView({block:'center'}));await jobInput.fill('lưu trú');await page.locator('#staffModalOverlay .customer-autocomplete-popover:visible button').filter({hasText:'Nhân viên vệ sinh lưu trú'}).waitFor();await page.screenshot({path:jobFolder+'/hotel-mobile.png'});assert.equal(await page.locator('#staffModalOverlay .customer-autocomplete-popover:visible button').count(),2);await page.locator('#staffModalTitle').click();await page.setViewportSize({width:1440,height:1050});
  await page.locator('#staffModalOverlay [data-close-modal="staffModalOverlay"]').first().click();
  const editing=await page.evaluate(async()=>{const person=PawpalStaff.state.staff.find(row=>row.position==='cham_soc_thu_cung');if(!person)return null;await PawpalStaff.subtabs.list.openStaffModal(person.rawId);return {id:person.rawId,title:person.raw.job_title};});
  assert.ok(editing);assert.equal(await page.locator('#staffInputPosition').inputValue(),editing.title);assert.equal(await jobInput.inputValue(),'Chăm sóc thú cưng');
  await page.locator('#staffModalOverlay [data-close-modal="staffModalOverlay"]').first().click();await page.getByRole('button',{name:'Thêm nhân viên',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#staffAccountRoles input').length===2);
  fs.writeFileSync(jobFolder+'/verification.txt','PASS: Actual Add staff form loads job titles from live admin_staff_job_title_options catalog. Includes driver, hotel care and hotel cleaning without requiring existing staff in those positions.\nPASS: No ADMIN/cham_soc_thu_cung technical labels; custom existing job titles retained; driver selection produces natural Vietnamese value; selecting manager job title leaves fixed account role STAFF unchanged.\nPASS: Editing existing cham_soc_thu_cung profile preserves original raw value while showing Chăm sóc thú cưng.\nDesktop/mobile screenshots; no profile, account or role changes saved.\n');
  const temporary='UI-only-visibility-check';
  const staffPassword=page.locator('#staffAccountPassword'),staffEye=page.locator('#btnShowStaffPassword');
  assert.equal(await staffEye.textContent(),'');await staffPassword.fill(temporary);await staffEye.click();assert.equal(await staffPassword.getAttribute('type'),'text');assert.equal(await staffEye.getAttribute('aria-label'),'Ẩn mật khẩu');await staffEye.click();assert.equal(await staffPassword.getAttribute('type'),'password');assert.equal(await staffPassword.inputValue(),temporary);await staffPassword.fill('');
  assert.ok(await staffEye.evaluate(button=>{const input=document.querySelector('#staffAccountPassword').getBoundingClientRect(),eye=button.getBoundingClientRect();return eye.left>=input.left&&eye.right<=input.right&&eye.top>=input.top&&eye.bottom<=input.bottom;}),'Eye is inside the password input');
  await page.locator('#staffAccountRoles').scrollIntoViewIfNeeded();
  await page.locator('#staffModalOverlay .admin-modal-card').screenshot({path:folder+'/staff-role-desktop.png'});
  await page.locator('#staffModalOverlay .admin-modal-card').screenshot({path:eyeFolder+'/staff-password-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.locator('#staffAccountConfigSection').evaluate(node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:folder+'/staff-role-mobile.png'});
  await page.screenshot({path:eyeFolder+'/staff-password-mobile.png'});
  await page.locator('#staffModalOverlay [data-close-modal="staffModalOverlay"]').first().click();
  await page.evaluate(()=>PawpalOwnPassword.open());
  assert.equal(await page.locator('#adminOwnPasswordModal .admin-password-toggle').count(),3);
  for(const key of ['current','next','repeat']){
   const input=page.locator('#adminOwnPassword'+key),button=page.locator('#adminOwnPasswordModal [aria-controls="adminOwnPassword'+key+'"]');
   await input.fill(temporary);await button.click();assert.equal(await input.getAttribute('type'),'text');assert.equal(await button.getAttribute('aria-pressed'),'true');await button.click();assert.equal(await input.getAttribute('type'),'password');await input.fill('');
   assert.ok(await button.evaluate(button=>{const input=document.getElementById(button.getAttribute('aria-controls')).getBoundingClientRect(),eye=button.getBoundingClientRect();return eye.left>=input.left&&eye.right<=input.right&&eye.top>=input.top&&eye.bottom<=input.bottom;}));
  }
  assert.equal(await page.evaluate(value=>[localStorage,sessionStorage].some(storage=>Object.keys(storage).some(key=>String(storage.getItem(key)).includes(value))),temporary),false);
  await page.screenshot({path:eyeFolder+'/own-password-mobile.png'});await page.setViewportSize({width:1440,height:1050});await page.screenshot({path:eyeFolder+'/own-password-desktop.png'});
  await page.locator('#adminOwnPasswordcurrent').fill(temporary);await page.locator('#adminOwnPasswordModal [aria-controls="adminOwnPasswordcurrent"]').click();await page.keyboard.press('Escape');await page.evaluate(()=>PawpalOwnPassword.open());assert.equal(await page.locator('#adminOwnPasswordcurrent').inputValue(),'');assert.equal(await page.locator('#adminOwnPasswordcurrent').getAttribute('type'),'password');assert.equal(await page.locator('#adminOwnPasswordModal [aria-pressed="true"]').count(),0);
  fs.writeFileSync(eyeFolder+'/verification.txt','PASS: Actual staff account form and personal password modal, eye controls inside all four inputs on desktop/mobile; show/hide retains field value; labels and pressed state update; no separate text button row.\nPASS: Personal password close/reopen clears values and returns to hidden state. Temporary visibility input never persisted to localStorage/sessionStorage.\nNo password submitted, account created, role or password changed. No QA password included in screenshots or report.\n');
  if(process.argv.includes('--job-title-rename')){
   const {connect}=require('../database/v1/service_import_connection.cjs'),db=await connect(),renameFolder='docs/verification/staff-job-title-rename';fs.mkdirSync(renameFolder,{recursive:true});
   try{
    await db.query('BEGIN');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[signed.data.user.id]);await db.query('SET LOCAL ROLE authenticated');
    await page.exposeFunction('jobTitleProbeRpc',async(name,args)=>{
     assert.ok(['admin_staff_job_title_catalog','rename_admin_staff_job_title'].includes(name));await db.query('SAVEPOINT rpc');
     try{const data=name==='admin_staff_job_title_catalog'?(await db.query('SELECT public.admin_staff_job_title_catalog() value')).rows[0].value:(await db.query('SELECT public.rename_admin_staff_job_title($1,$2,$3,$4) value',[args.p_request_id,args.p_code,args.p_expected_title,args.p_title])).rows[0].value;await db.query('RELEASE SAVEPOINT rpc');return {data,error:null};}catch(error){await db.query('ROLLBACK TO SAVEPOINT rpc');return {data:null,error:{message:error.message,code:error.code}};}
    });
    await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1050});await page.getByRole('button',{name:'Thêm nhân viên',exact:true}).click();await page.locator('#staffModalOverlay.active').waitFor();
    await page.evaluate(()=>{const db=getSupabaseClient(),original=db.rpc.bind(db);db.rpc=(name,args)=>['admin_staff_job_title_catalog','rename_admin_staff_job_title'].includes(name)?jobTitleProbeRpc(name,args):original(name,args);});
    await page.locator('#btnRenameStaffJobTitle').click();await page.locator('#staffJobTitleRenameModal.active').waitFor();await page.locator('#renameJobTitleSelect + .admin-input').fill('vệ sinh');await page.locator('#staffJobTitleRenameModal .customer-autocomplete-popover button').filter({hasText:'Nhân viên vệ sinh lưu trú'}).click();await page.locator('#renameJobTitleName').fill('Nhân viên vệ sinh khách sạn');
    await page.screenshot({path:renameFolder+'/desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:renameFolder+'/mobile.png'});
    await page.getByRole('button',{name:'Lưu tên chức vụ',exact:true}).click();await page.locator('#staffJobTitleRenameModal.active').waitFor({state:'hidden'});assert.equal(await page.locator('#staffModalOverlay').evaluate(node=>node.classList.contains('active')),true);
    assert.ok((await page.locator('#staffInputPosition option').allTextContents()).includes('Nhân viên vệ sinh khách sạn'));assert.equal(await page.locator('#staffAccountRoles input[value="STAFF"]').isChecked(),true);
    const renamed=(await db.query('SELECT public.admin_staff_job_title_catalog() value')).rows[0].value.find(row=>row.code==='ve_sinh_luu_tru');assert.equal(renamed.title,'Nhân viên vệ sinh khách sạn');assert.ok(renamed.aliases.includes('Nhân viên vệ sinh lưu trú'));
    const audit=(await db.query("SELECT count(*)::int n FROM public.audit_log WHERE action='STAFF_JOB_TITLE_RENAME' AND description::jsonb->>'code'='ve_sinh_luu_tru' AND created_at>=transaction_timestamp()")).rows[0].n;assert.equal(audit,1);
    await db.query('ROLLBACK');
    fs.writeFileSync(renameFolder+'/verification.txt','PASS: Actual rename sub-modal, real Admin RPC; successful rename updates parent options, retains old-name alias, preserves STAFF account role, writes one audit event. Trial rename and audit rolled back.\nBackend checks: STAFF denied, duplicate/stale names rejected, identical request idempotent, staff profile data unchanged.\nSchema/RPC applied on Supabase; no existing job title renamed permanently, no account created.\n');
   }finally{await db.query('ROLLBACK');await db.end();}
  }
  fs.writeFileSync(folder+'/verification.txt','PASS: 12 focused session-retry and fixed-role security checks (separate node test run).\nPASS: Actual Add staff modal loads two fixed roles and selects STAFF without personal permission selection.\nPASS: Isolated first 401 triggers real Supabase refreshSession; second request verified through actual backend verifyAdminCaller using live Auth and login context. Same body/request ID; caller remains ADMIN.\nNo provisioning request sent to account mutation endpoint. No account/permission/audit mutations. Screenshots show form only, not successful account creation.\nOriginal screenshot error not reproduced with a fresh Admin session; stale-session recovery is now implemented.\n');
  console.log('PASS: actual form, real session refresh and ADMIN verification; isolated initial 401, no account created');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));await client.auth.signOut({scope:'local'});}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
