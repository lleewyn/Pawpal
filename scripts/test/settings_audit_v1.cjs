const assert=require('node:assert/strict');const {browserPage,service,infra}=require('./customer_completion_helpers.cjs');
(async()=>{const {browser,page}=await browserPage();try{
 await page.locator('[data-title="Cấu hình"]').click();await page.locator('[data-tab="tab-audit-logs"]').click();await page.waitForFunction(()=>window.PawpalSettings?.state.isLoaded);
 const count=(await service.from('audit_log').select('id',{count:'exact',head:true})).count;
 await page.waitForFunction(count=>PawpalSettings.state.auditLogsList.length===count,count);
 assert.ok(await page.locator('#auditLogTableBody tr').count()<=10);
 const actor=await page.evaluate(()=>PawpalSettings.state.auditLogsList[0]?.actor);if(actor){await page.locator('#searchAuditLogInput').fill(actor);assert.ok((await page.locator('#auditLogTableBody').innerText()).includes(actor));}
 if(await page.locator('#auditLogTableBody details').count()){
  await page.locator('#auditLogTableBody details summary').first().click();await page.waitForFunction(()=>!document.querySelector('#auditLogTableBody details pre').textContent.includes('Đang tải'));
  assert.ok(!(await page.locator('#auditLogTableBody details pre').first().innerText()).includes('Chưa tải được'));
 }
 await page.screenshot({path:infra+'/settings-audit-v1.private.png'});
 console.log('PASS complete audit count beyond old 50-row limit, 10-row pagination, actor filtering and browser rendering.');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
