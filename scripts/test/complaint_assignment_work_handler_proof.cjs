'use strict';
// Focused assignment boundary: real existing tickets and staff, all business writes rolled back.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
async function main(){
 const db=await connect(),browser=await chromium.launch({channel:'chrome',headless:true}),folder='docs/verification/complaint-assignment-work-handler';fs.mkdirSync(folder,{recursive:true});
 const signature='public.assign_admin_complaint(uuid,uuid,timestamptz,uuid,text)',migration=fs.readFileSync('my-server/scripts/database/v1/282_complaint_assignment_work_handler.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,'');
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='10s';SET LOCAL lock_timeout='3s'");
  const originalDefinition=(await db.query('SELECT pg_get_functiondef($1::regprocedure) body',[signature])).rows[0].body;
  const recipient=(await db.query("SELECT s.id,s.full_name,s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE s.full_name='Nguyễn Thị Test' AND r.role_code='STAFF' AND s.employment_status='active' AND NOT s.must_change_password")).rows[0];assert.ok(recipient);
  const admin=(await db.query("SELECT s.id,s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND NOT s.must_change_password AND s.auth_user_id IS NOT NULL LIMIT 1")).rows[0];
  const tickets=(await db.query("SELECT DISTINCT ON (CASE WHEN lower(priority) IN('high','cao','urgent') THEN 'high' ELSE 'normal' END) to_jsonb(t) original FROM public.support_ticket t WHERE status NOT IN('resolved','completed','closed','rejected') ORDER BY CASE WHEN lower(priority) IN('high','cao','urgent') THEN 'high' ELSE 'normal' END,created_at DESC")).rows.map(row=>row.original);assert.ok(tickets.length);
  const as=async actor=>{await db.query('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actor.auth_user_id]);await db.query('SET LOCAL ROLE authenticated');};
  const rpc=async(name,args={})=>{
   const keys=({get_admin_complaint_handlers:[],assign_admin_complaint:['p_request_id','p_ticket_id','p_expected_updated_at','p_staff_id','p_note'],get_staff_workspace:['p_kind','p_query','p_id','p_page']})[name];assert.ok(keys);
   await db.query('SAVEPOINT rpc_call');try{const data=name==='get_admin_complaint_handlers'?(await db.query('SELECT * FROM public.get_admin_complaint_handlers()')).rows:(await db.query(`SELECT public.${name}(${keys.map((key,i)=>key+'=> $'+(i+1)).join(',')}) value`,keys.map(key=>args[key]))).rows[0].value;await db.query('RELEASE SAVEPOINT rpc_call');return {data,error:null};}catch(error){await db.query('ROLLBACK TO SAVEPOINT rpc_call');await db.query('RELEASE SAVEPOINT rpc_call');return {data:null,error:{message:error.message,code:error.code}};}
  };
  await as(admin);assert.ok((await rpc('get_admin_complaint_handlers')).data.some(row=>row.id===recipient.id));
  const args=ticket=>({p_request_id:randomUUID(),p_ticket_id:ticket.id,p_expected_updated_at:ticket.updated_at,p_staff_id:recipient.id,p_note:'Bàn giao xử lý'});
  const before=await rpc('assign_admin_complaint',args(tickets[0]));
  if(!originalDefinition.includes("rp.permission_code IN ('support_ticket.write','work.complaint.handle')"))assert.equal(before.error?.message,'complaint_handler_unavailable');
  await db.query('RESET ROLE');await db.query(migration);await db.query(migration);await as(admin);
  const ticket=tickets[0],page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://localhost/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="vi"></html>'}));await page.goto('http://localhost/');
  await page.exposeFunction('liveRpc',rpc);
  await page.exposeFunction('reloadTicket',async()=>{await db.query('RESET ROLE');const row=(await db.query('SELECT to_jsonb(t) value FROM public.support_ticket t WHERE id=$1',[ticket.id])).rows[0].value;await as(admin);return row;});
  const html=fs.readFileSync('my-client/pages/admin/modules/complaints/complaints.html','utf8'),start=html.indexOf('<div class="admin-modal-overlay" id="assignHandlerModalOverlay">'),end=html.indexOf('<!-- MODAL: YÊU CẦU',start);
  await page.setContent('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body class="admin-body"><main class="complaints-module">'+html.slice(start,end)+'</main></body></html>');
  for(const file of ['my-client/pages/admin/admin.css','my-client/pages/admin/admin-components.css','my-client/pages/admin/admin-typography.css','my-client/pages/admin/modules/complaints/complaints.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  await page.evaluate(ticket=>{window.PawpalComplaints={state:{serviceComplaints:[{...ticket,rawId:ticket.id}],orderComplaints:[],currentTicketId:ticket.id},escapeHtml:value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),getDbClient:()=>({rpc:(name,args)=>liveRpc(name,args)}),errorMessage:error=>error.message,loadComplaintsModuleData:async()=>{window.updatedTicket=await reloadTicket();}};},ticket);
  const core=fs.readFileSync('my-client/pages/admin/modules/complaints/complaints.js','utf8');await page.addScriptTag({content:core.slice(core.indexOf('    function showToast('),core.indexOf('    PawpalComplaints.showToast ='))+'PawpalComplaints.showToast=showToast;'});
  const source=fs.readFileSync('my-client/pages/admin/modules/complaints/subtabs/tab-complaint-detail.js','utf8');
  const bindings=source.slice(source.indexOf("  bind('btnConfirmAssignHandler',async()=>{"),source.indexOf("  bind('btnSendRequestInfo'"));
  await page.addScriptTag({content:'(()=>{'+source.slice(source.indexOf(" 'use strict';"),source.indexOf(' let renderVersion'))+source.slice(source.indexOf(' function captureModal('),source.indexOf(' async function act('))+source.slice(source.indexOf(' async function openAssignHandlerModal('),source.indexOf(' function openRequestMoreInfoModal('))+"const bind=(id,fn)=>document.getElementById(id).onclick=fn;"+bindings+'window.openAssign=openAssignHandlerModal;})();'});
  await page.evaluate(()=>openAssign());await page.locator('#searchAssignStaff').fill(recipient.full_name);await page.locator('[data-staff-id="'+recipient.id+'"]').click();await page.locator('#inputAssignNote').fill('Bàn giao xử lý');
  await page.locator('#assignHandlerModalOverlay .admin-modal-card').screenshot({path:folder+'/selected-staff-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.locator('#assignHandlerModalOverlay .admin-modal-card').screenshot({path:folder+'/selected-staff-mobile.png'});
  await page.locator('#btnConfirmAssignHandler').click();await page.waitForFunction(()=>window.updatedTicket?.assigned_staff_id===document.querySelector('#selectAssignStaff').value);assert.equal(await page.locator('#assignHandlerError').textContent(),'');assert.equal(await page.locator('#assignHandlerModalOverlay').evaluate(node=>node.classList.contains('active')),false);
  await page.screenshot({path:folder+'/assignment-success.png'});
  const after=(await db.query('SELECT to_jsonb(t) value FROM public.support_ticket t WHERE id=$1',[ticket.id])).rows[0].value;
  const invariant=row=>Object.fromEntries(Object.entries(row).filter(([key])=>!['assigned_staff_id','updated_at','status'].includes(key)));assert.deepEqual(invariant(after),invariant(ticket));
  for(const other of tickets.slice(1)){const result=await rpc('assign_admin_complaint',args(other));assert.equal(result.error,null);assert.equal(result.data,other.id);}
  await as(recipient);const visible=await rpc('get_staff_workspace',{p_kind:'complaints',p_query:'',p_id:ticket.id,p_page:1});assert.ok(visible.data.items.some(row=>row.id===ticket.id));
  const permissions=(await db.query("SELECT pawpal_private.has_permission('work.complaint.handle') handle,pawpal_private.has_permission('support_ticket.write') management")).rows[0];assert.equal(permissions.handle,true);assert.equal(permissions.management,false);
  assert.equal((await rpc('assign_admin_complaint',args(after))).error?.message,'complaint_forbidden');
  await as(admin);const inactive=(await db.query("SELECT id FROM public.staff WHERE employment_status<>'active' LIMIT 1")).rows[0];if(inactive)assert.equal((await rpc('assign_admin_complaint',{...args(after),p_staff_id:inactive.id})).error?.message,'complaint_handler_unavailable');
  assert.deepEqual(errors,[]);await db.query('ROLLBACK');
  for(const original of tickets)assert.deepEqual((await db.query('SELECT to_jsonb(t) value FROM public.support_ticket t WHERE id=$1',[original.id])).rows[0].value,original);
  if(process.argv.includes('--apply-cloud')){const backup='my-server/scripts/database/v1/282_complaint_assignment_work_handler.rollback.sql';if(!fs.existsSync(backup))fs.writeFileSync(backup,'BEGIN;\n'+originalDefinition+';\nNOTIFY pgrst,\'reload schema\';\nCOMMIT;\n');await db.query('BEGIN');await db.query(migration);await db.query('COMMIT');}
  fs.writeFileSync(folder+'/verification.txt','PASS: Recipient Nguyễn Thị Test has fixed STAFF work.complaint.handle, without support_ticket.write.\nBefore: '+(before.error?.message||'already patched')+'\nAfter: Actual management modal saves assignment; staff reads assigned ticket; staff cannot assign; inactive recipient rejected; ticket fields, resolution and approval unchanged.\nPriorities checked: '+tickets.map(row=>row.priority).join(', ')+'\nBusiness writes rolled back; original tickets verified unchanged. Only migration committed: '+process.argv.includes('--apply-cloud')+'. No role/permission grants or chat changes; no full testcase replay.\n');
  console.log('PASS: recipient work permission, real assignment modal, staff scope, management restrictions, rollback; migration applied='+process.argv.includes('--apply-cloud'));
 }finally{await db.query('ROLLBACK');await db.end();await browser.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
