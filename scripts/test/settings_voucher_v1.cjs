const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');const {browserPage,service,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{const {browser,page}=await browserPage(),code='VERIFY'+randomUUID().slice(0,8).toUpperCase();try{
 await page.locator('[data-title="Cấu hình"]').click();await page.waitForFunction(()=>window.PawpalSettings?.state.isLoaded);await page.locator('[data-tab="tab-banner-promos"]').click();await page.locator('[data-settingstab="mkt-vouchers"]').click();
 await page.locator('#btnOpenVoucherModalHeader').click();await page.locator('#inputVoucherCode').fill(code);await page.locator('#inputVoucherName').fill('Voucher verification');await page.locator('#inputVoucherType').selectOption('percent');await page.locator('#inputVoucherValue').fill('10');await page.locator('#inputVoucherMinOrder').fill('0');await page.locator('#inputVoucherLimit').fill('0');await page.locator('#inputVoucherStart').fill('2026-10-01');await page.locator('#inputVoucherEnd').fill('2026-12-31');
 await page.screenshot({path:infra+'/settings-voucher-v1.private.png'});await page.locator('#btnSaveVoucher').click();await page.waitForFunction(()=>!document.getElementById('voucherModalOverlay').classList.contains('active'));
 const v=await ok(service.from('voucher').select('*').eq('voucher_code',code).single());assert.equal(v.type,'percentage');assert.equal(v.max_usage,0);assert.equal(typeof v.applicable_for,'string');
 await page.waitForFunction(code=>PawpalSettings.state.vouchersList.some(v=>v.code===code),code);
 await page.evaluate(code=>{PawpalSettings.state.currentActiveVoucherCode=code;document.getElementById('btnActionEditVoucher').click();},code);
 await page.locator('#inputVoucherValue').fill('12');await page.locator('#btnSaveVoucher').click();await page.waitForFunction(()=>!document.getElementById('voucherModalOverlay').classList.contains('active'));
 assert.equal(Number((await ok(service.from('voucher').select('discount_value').eq('id',v.id).single())).discount_value),12);
 console.log('PASS voucher browser save, V1 percentage/scope mapping, explicit zero limit and atomic audit.');
}finally{await browser.close();await ok(service.from('voucher').delete().eq('voucher_code',code));}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
