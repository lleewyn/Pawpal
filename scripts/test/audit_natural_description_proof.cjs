'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
const file='my-client/pages/admin/modules/settings/subtabs/tab-settings-audit.js',source=fs.readFileSync(file,'utf8');
const sandbox={window:{},document:{readyState:'loading',addEventListener(){}}};vm.runInNewContext(source,sandbox);
const format=sandbox.window.PawpalSettings.subtabs.audit.formatAuditDescription;
assert.equal(format('Đã cập nhật hồ sơ.'),'Đã cập nhật hồ sơ.');
assert.match(format({before_roles:['STAFF'],after_roles:['ADMIN']}),/Vai trò: Nhân viên → Quản lý/);
assert.match(format({before:{service_locked:false},after:{service_locked:true}}),/Khóa phân công dịch vụ: Không → Có/);
assert.match(format({after:{roles:['STAFF']}}),/Sau thay đổi: Vai trò: Nhân viên/);
assert.match(format({details:{dob:'2020-01-23',job_title:'cham_soc_thu_cung',employment_status:'active'}},{action:'STAFF_PROFILE_SAVE'}),/23\/01\/2020/);
assert.match(format({details:{full_name:'Tên lịch sử'},staff_id:'id'},{references:{id:'Tên lịch sử'}}),/Nhân viên: Tên lịch sử/);
assert.ok(!format({password:'secret',access_token:'secret',fingerprint:'secret',full_name:'Tên'}).includes('secret'));
assert.match(format(JSON.stringify(JSON.stringify({roles:['STAFF']}))),/Vai trò: Nhân viên/);
async function main(){
 const db=await connect(),browser=await chromium.launch({channel:'chrome',headless:true}),folder='docs/verification/audit-natural-description';fs.mkdirSync(folder,{recursive:true});
 try{
  await db.query("BEGIN READ ONLY;SET LOCAL statement_timeout='10s'");
  const admin=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND s.auth_user_id IS NOT NULL AND NOT s.must_change_password LIMIT 1")).rows[0];
  const samples=(await db.query("WITH ranked AS (SELECT id,action,ceil(row_number() OVER(ORDER BY created_at DESC,id DESC)/10.0)::integer page FROM public.audit_log WHERE entity_name='staff') SELECT DISTINCT ON (action) id,action,page FROM ranked WHERE action IN('STAFF_PROFILE_SAVE','STAFF_ACCESS_CHANGE') ORDER BY action,page,id")).rows;assert.equal(samples.length,2);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[admin.auth_user_id]);await db.query('SET LOCAL ROLE authenticated');
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://localhost/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body class="admin-body"></body></html>'}));await page.goto('http://localhost/');
  await page.exposeFunction('liveRead',async(table,column,id)=>{
   assert.ok(({audit_log:'description',staff:'full_name',staff_level:'level_name'})[table]===column);
   return {data:(await db.query(`SELECT ${column} FROM public.${table} WHERE id=$1`,[id])).rows[0]||null,error:null};
  });
  const html=fs.readFileSync('my-client/pages/admin/modules/settings/settings.html','utf8'),start=html.indexOf('<section class="subtab-content" id="subtab-tab-audit-logs">'),end=html.indexOf('</section>',start)+10;
  await page.setContent('<div class="settings-module-wrapper admin-ui-standard admin-ui-customer-reference">'+html.slice(start,end).replace('class="subtab-content"','class="subtab-content active"')+'</div>');
  for(const file of ['my-client/pages/admin/admin.css','my-client/pages/admin/admin-components.css','my-client/pages/admin/admin-typography.css','my-client/pages/admin/admin-shell-v7.css','my-client/pages/admin/modules/settings/settings.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  await page.addStyleTag({content:'body.admin-body{overflow:auto!important;position:static!important;background:#F4F8F6}.settings-module-wrapper{padding:20px}#subtab-tab-audit-logs{display:block}'});
  await page.evaluate(()=>{window.PawpalSettings={state:{auditLogsList:[],isSafeModeLocked:true},escapeHtml:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),getSupabaseClient:()=>({from(table){let column,id;const q={select(value){column=value;return q;},eq(key,value){if(key!=='id')throw Error('unexpected filter');id=value;return q;},single(){return liveRead(table,column,id);},maybeSingle(){return liveRead(table,column,id);}};return q;}})};});
  await page.addScriptTag({content:source});
  for(const sample of samples){
   const payload=(await db.query("SELECT public.admin_audit_page('', 'Nhân sự', $1) value",[sample.page])).rows[0].value;assert.ok(payload.rows.some(row=>row.id===sample.id));
   await page.evaluate(payload=>{PawpalSettings.state.auditMeta={total:payload.total,page:payload.page,stats:payload.stats};PawpalSettings.state.auditLogsList=payload.rows.map(row=>({id:row.id,time:new Date(row.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}),actor:row.actor,action:row.action,targetModules:row.target_module,actionText:row.action_text,status:'Đã ghi nhận'}));PawpalSettings.subtabs.audit.renderAuditLogs();document.querySelector('#filterAuditTargetModule').value='Nhân sự';},payload);
   const index=payload.rows.findIndex(row=>row.id===sample.id),details=page.locator('#auditLogTableBody tr').nth(index).locator('details');await details.locator('summary').click();
   const content=details.locator('.settings-audit-detail-content');await page.waitForFunction(index=>{const value=document.querySelectorAll('#auditLogTableBody tr')[index]?.querySelector('.settings-audit-detail-content')?.textContent;return value&&!value.includes('Đang tải');},index);
   const text=await content.textContent();assert.ok(!text.includes('Chưa tải được'));assert.ok(!text.includes('"details"'));assert.ok(!text.includes('before_roles'));
   if(sample.action==='STAFF_ACCESS_CHANGE')assert.match(text,/Vai trò: .* → Nhân viên/);else assert.match(text,/Họ và tên:/);
   await page.locator('#auditLogTableBody tr').nth(index).screenshot({path:folder+'/'+sample.action.toLowerCase()+'.png'});
   const requestCount=await page.evaluate(()=>document.querySelectorAll('.settings-audit-detail-content').length);assert.ok(requestCount<=10);
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(folder+'/verification.txt','PASS: Legacy prose, profile labels/dates, role arrays, before/after differences, missing before data, nested serialized payloads, private technical fields, historical name snapshots.\nPASS: Actual audit renderer and lazy detail reads from live database under Admin role; staff names and levels resolved; role change and profile screenshots.\nNo audit records or permissions changed. No role changes, account locking, or complete testcase replay.\n');
  console.log('PASS: natural audit descriptions, real role/profile logs, read-only evidence');
 }finally{await db.query('ROLLBACK');await db.end();await browser.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
