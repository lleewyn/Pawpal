// Isolated UI data. No Cloud requests or retained database fixtures.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await page.goto('http://audit.test/');
 await page.setContent(fs.readFileSync('pages/admin/modules/settings/settings.html','utf8'));
 await page.evaluate(()=>{
  sessionStorage.setItem('pawpal_admin_active_module','Cấu hình');sessionStorage.setItem('pawpal_admin_user',JSON.stringify({id:'admin-a'}));
  window.requests=[];window.detailReads=0;window.failAudit=false;
  const rows=Array.from({length:23},(_,i)=>({id:String(i),created_at:'2026-11-13T02:00:00Z',actor:'Nhân viên '+i,action:'UPDATE',action_text:'Cập nhật dữ liệu',target_module:i%2?'Cấu hình':'Bán hàng'}));
  window.getSupabaseClient=()=>({rpc:async(name,args)=>{
   if(name!=='admin_audit_page')throw Error('Unexpected RPC');requests.push(args);
   if(args.p_query==='slow')await new Promise(r=>setTimeout(r,150));
   if(failAudit)return {error:{code:'OFFLINE'}};
   const matched=rows.filter(r=>(args.p_module==='all'||r.target_module===args.p_module)&&(!args.p_query||r.actor.includes(args.p_query)));
   const p=Math.min(args.p_page,Math.max(1,Math.ceil(matched.length/10)));
   return {data:{rows:matched.slice((p-1)*10,p*10),total:matched.length,page:p,stats:{total:1000,synced:200,lastModule:'Bán hàng'}}};
  },from(table){const q={};for(const name of ['select','eq','order','range','limit'])q[name]=()=>q;q.single=async()=>{if(table!=='audit_log')throw Error('Unexpected detail');detailReads++;return {data:{description:'Chi tiết riêng'}};};q.then=resolve=>Promise.resolve({data:[]}).then(resolve);return q;},channel(){return {on(){return this;},subscribe(){return this;}};},removeChannel(){}});
 });
 for(const file of ['pages/admin/admin-data-store.js','pages/admin/modules/settings/settings.js','pages/admin/modules/settings/subtabs/tab-settings-audit.js'])await page.addScriptTag({content:fs.readFileSync(file,'utf8')});
 await page.evaluate(()=>PawpalSettings.switchSubtab('tab-audit-logs'));
 assert.equal(await page.locator('#auditLogTableBody tr').count(),10);assert.equal(await page.locator('#statTotalAuditLogs').textContent(),'1000');assert.equal(await page.evaluate(()=>detailReads),0);
 await page.locator('#auditPaginationControls [data-p="3"]').click();await page.waitForFunction(()=>document.querySelectorAll('#auditLogTableBody details').length===3);
 assert.equal(await page.evaluate(()=>requests.length),2);
 await page.locator('#auditPaginationControls [data-p="1"]').click();await page.waitForFunction(()=>document.querySelectorAll('#auditLogTableBody details').length===10);assert.equal(await page.evaluate(()=>requests.length),2);
 await page.locator('#auditLogTableBody summary').first().click();await page.waitForFunction(()=>window.detailReads===1);
 await page.locator('#searchAuditLogInput').fill('Nhân viên 22');await page.waitForFunction(()=>document.querySelectorAll('#auditLogTableBody details').length===1);assert.ok((await page.locator('#auditLogTableBody').textContent()).includes('Nhân viên 22'));
 assert.equal(await page.locator('#statTotalAuditLogs').textContent(),'1000');
 await page.evaluate(async()=>{const old=PawpalSettings.fetchAuditData({query:'slow'});const latest=PawpalSettings.fetchAuditData({query:'Nhân viên 22'});await Promise.all([old,latest]);});assert.equal(await page.locator('#auditLogTableBody details').count(),1);
 await page.evaluate(()=>{window.failAudit=true;return PawpalSettings.fetchAuditData({force:true});});assert.equal(await page.locator('#auditLogTableBody button').textContent(),'Thử lại');
 await page.evaluate(()=>window.failAudit=false);await page.locator('#auditLogTableBody button').click();await page.waitForFunction(()=>document.querySelectorAll('#auditLogTableBody details').length===1);
 assert.deepEqual(errors,[]);console.log('PASS audit UI: server pages/cache, global stats, search across all rows, lazy detail, stale request blocked, honest error/retry.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
