// Real restored database and isolated Auth only; never calls Cloud account writes.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {browserPage,service,ok,env,state,infra}=require('./customer_completion_helpers.cjs');
const {createStaffAuthHandlers}=require('../api/staff_auth.js');
assert.equal(state.authPort,8021);
const rewrite=(url,init)=>{const u=new URL(url),auth=u.pathname.startsWith('/auth/v1/');assert.ok(auth||u.pathname.startsWith('/rest/v1/'));return fetch('http://localhost:'+(auth?8021:8011)+u.pathname.slice(8)+u.search,init);};
const handlers=createStaffAuthHandlers({url:env.SUPABASE_PUBLIC_URL,anonKey:env.ANON_KEY,serviceKey:env.SERVICE_ROLE_KEY,fetch:rewrite});
(async()=>{const {browser,page}=await browserPage({authRestored:true});try{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/admin/staff/**',async route=>{
  const name={'provision-account':'provisionAccount','reset-password':'resetPassword','toggle-account-status':'toggleAccountStatus'}[new URL(route.request().url()).pathname.split('/').pop()];assert.ok(name);
  const result={code:200,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handlers[name]({method:route.request().method(),headers:route.request().headers(),body:route.request().postDataJSON()},result);
  await route.fulfill({status:result.code,contentType:'application/json',body:JSON.stringify(result.body)});
 });
 await page.locator('[data-title="Nhân sự"]').click();await page.waitForFunction(()=>window.PawpalStaff?.state.isLoaded);
 await page.evaluate(()=>PawpalStaff.subtabs.list.openStaffModal());
 const email='browser-staff-'+crypto.randomUUID()+'@pawpal.test';
 await page.locator('#staffInputName').fill('Browser account verification');await page.locator('#staffInputPosition').fill('Verification employee');
 await page.locator('#staffAccountEmail').fill(email);await page.locator('#staffAccountPassword').fill('Verify-'+crypto.randomUUID());
 await page.locator('#staffEnableAccountToggle').uncheck();await page.locator('#staffAccessDetails summary').click();
 await page.locator('#staffPermissionSearch').fill('customer.read');await page.locator('#staffPermissionsGrid input[value="customer.read"]').check();
 await page.screenshot({path:infra+'/staff-account-create-modal.private.png',fullPage:true});
 const pending=page.waitForResponse(r=>r.url().includes('/api/admin/staff/provision-account'));await page.locator('#btnSaveStaff').click();const response=await pending;assert.equal(response.status(),200,await response.text());
 await page.waitForFunction(()=>!document.getElementById('staffModalOverlay').classList.contains('active'));
 const person=await ok(service.from('staff').select('id,auth_user_id,must_change_password').eq('full_name','Browser account verification').order('created_at',{ascending:false}).limit(1).single());assert.equal(person.must_change_password,true);
 const acl=await ok(service.from('staff_permission').select('permission_code').eq('staff_id',person.id));assert.deepEqual(acl.map(x=>x.permission_code),['customer.read']);
 await page.evaluate(id=>{const staff=PawpalStaff.state.staff.find(s=>s.rawId===id);PawpalStaff.subtabs.list.openStaffModal(staff.id);},person.id);
 assert.equal(await page.locator('#staffAccountEmail').inputValue(),email);assert.equal(await page.locator('#staffAccountEmail').getAttribute('readonly'),'');
 await page.locator('#staffAccountPassword').fill('Reset-'+crypto.randomUUID());const reset=page.waitForResponse(r=>r.url().includes('/api/admin/staff/reset-password'));
 await page.locator('#btnStaffResetPasswordModal').click();await page.locator('#btnAcceptStaffConfirm').click();const resetResponse=await reset;assert.equal(resetResponse.status(),200,await resetResponse.text());
 await page.waitForFunction(()=>document.getElementById('staffAccountPassword').value==='');assert.deepEqual(errors,[]);
 console.log('PASS browser creates isolated locked Auth account with explicit permission, shows actual readonly identity and resets password through authenticated server action');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
