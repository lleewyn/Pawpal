const assert=require('node:assert/strict');const {browserPage,service,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{const {browser,page}=await browserPage();try{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('[data-title="Nhân sự"]').click();await page.waitForFunction(()=>window.PawpalStaff?.state.isLoaded);
 const target=await page.evaluate(()=>{const s=PawpalStaff.state.staff.find(s=>!s.roles.some(r=>r.code==='ADMIN'));PawpalStaff.subtabs.list.openStaffModal(s.id);return {id:s.rawId,auth:s.authUserId};});
 await page.locator('#staffInputAddress').fill('Browser verified profile address');await page.screenshot({path:infra+'/staff-profile-edit-modal.private.png',fullPage:true});
 const saved=page.waitForResponse(r=>r.url().includes('/rpc/save_admin_staff_profile'));await page.locator('#btnSaveStaff').click();const result=await saved;assert.equal(result.status(),200,await result.text());await page.waitForFunction(()=>!document.getElementById('btnSaveStaff').disabled);assert.equal(await page.locator('#staffModalOverlay').evaluate(e=>e.classList.contains('active')),false,JSON.stringify({errors,inline:await page.locator('#staffProfileError').textContent()}));
 const source=await ok(service.from('staff').select('address,auth_user_id').eq('id',target.id).single());assert.equal(source.address,'Browser verified profile address');assert.equal(source.auth_user_id,target.auth);assert.deepEqual(errors,[]);
 console.log('PASS existing personnel profile editor persists through V1 RPC, preserves Auth and shows real fields without script errors');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
