const assert=require('node:assert/strict');
const {browserPage,infra}=require('./customer_completion_helpers.cjs');
(async()=>{
 const {browser,page}=await browserPage();
 try{
  await page.evaluate(()=>localStorage.setItem('pawpal_admin_system_config',JSON.stringify({storeInfo:{brandName:'STALE_BROWSER_CONFIG'}})));
  await page.locator('[data-title="Cấu hình"]').click();await page.locator('[data-tab="tab-system-config"]').click();
  await page.waitForFunction(()=>window.PawpalSettings?.state.isLoaded);
  assert.notEqual(await page.evaluate(()=>PawpalSettings.state.systemConfig.storeInfo?.brandName),'STALE_BROWSER_CONFIG');
  await page.evaluate(()=>{PawpalSettings.state.systemConfig.storeInfo={};PawpalSettings.state.isSafeModeLocked=false;PawpalSettings.updateSafeModeUI();});
  await page.locator('#btnConfigureStoreProfile').click();
  for(const id of ['inputStoreCompanyName','inputStoreEmergency','inputStoreTaxId','inputStoreZalo','inputStoreFacebook'])assert.equal(await page.locator('#'+id).inputValue(),'');
  await page.locator('#inputStoreBrandName').fill('Unsaved store draft');await page.locator('#inputStoreHotline').fill('0901234567');await page.locator('#inputStoreEmail').fill('verification@example.test');await page.locator('#inputStoreAddress').fill('Verification address');
  await page.screenshot({path:infra+'/settings-store-v1.private.png'});
  let attempted=false;
  await page.route('**/rest/v1/pawpal_setting*',route=>{if(route.request().method()==='POST'){attempted=true;return route.abort();}return route.continue();});
  await page.locator('#btnSaveStoreProfile').click();await page.locator('#btnConfirmAndSyncImpact').click();
  await page.waitForFunction(()=>document.querySelector('.admin-toast, .toast-notification, .toast')?.textContent?.includes('Không thể')||document.getElementById('storeProfileModalOverlay').classList.contains('active'));
  await page.waitForTimeout(500);
  assert.equal(attempted,true);assert.deepEqual(await page.evaluate(()=>PawpalSettings.state.systemConfig.storeInfo),{});
  assert.equal(await page.locator('#inputStoreBrandName').inputValue(),'Unsaved store draft');
  const context=await page.evaluate(async()=>{const r=await window.getSupabaseClient().rpc('get_staff_login_context');return {staffId:r.data?.staff?.id,hasError:Boolean(r.error)};});
  assert.ok(context.staffId);assert.equal(context.hasError,false);
  console.log('PASS DB-backed initial state, empty optional store fields, failed-save draft/state isolation and V1 staff context. No database writes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
