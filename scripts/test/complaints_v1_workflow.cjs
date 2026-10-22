const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {browserPage,admin,service,ok,infra,token}=require('./customer_completion_helpers.cjs');
(async()=>{
 const {browser,page}=await browserPage(),id=randomUUID();
 try {
  const customer=(await ok(service.from('customer').select('id').limit(1)))[0];
  await ok(admin.rpc('create_admin_complaint',{p_id:id,p_customer_id:customer.id,p_order_id:null,p_appointment_id:null,p_category:'service',p_subject:'Workflow verification',p_content:'Original intake content',p_priority:'normal'}));
  const version=async()=>(await ok(service.from('support_ticket').select('updated_at').eq('id',id).single())).updated_at;
  const denied=await fetch('http://localhost:8011/rpc/act_admin_complaint',{method:'POST',headers:{Authorization:'Bearer '+token(randomUUID()),'Content-Type':'application/json'},body:JSON.stringify({p_request_id:randomUUID(),p_ticket_id:id,p_expected_updated_at:await version(),p_action:'approve',p_details:{note:'Forged role attempt'}})});
  assert.equal(denied.status,403);
  const handler=(await ok(admin.rpc('get_admin_complaint_handlers')))[0];
  const assign={p_request_id:randomUUID(),p_ticket_id:id,p_expected_updated_at:await version(),p_staff_id:handler.id,p_note:'Assign verification'};
  await ok(admin.rpc('assign_admin_complaint',assign));await ok(admin.rpc('assign_admin_complaint',assign));
  assert.equal((await admin.rpc('assign_admin_complaint',{...assign,p_request_id:randomUUID()})).error.code,'PT409');
  const act=async(action,details)=>{
   const args={p_request_id:randomUUID(),p_ticket_id:id,p_expected_updated_at:await version(),p_action:action,p_details:details};
   await ok(admin.rpc('act_admin_complaint',args));await ok(admin.rpc('act_admin_complaint',args));
   return args;
  };
  await act('message',{note:'Internal investigation',internal:true});
  await page.locator('[data-title="Khiếu nại"]').click();
  await page.waitForFunction(()=>window.PawpalComplaints?.subtabs.detail && PawpalComplaints.state.isLoaded);
  await page.evaluate(id=>PawpalComplaints.openTicketDetail(id),id);
  await page.locator('#btnRequestMoreInfo').click();
  await page.locator('#inputRequestMessage').fill('Request additional information verification');
  await page.screenshot({path:infra+'/complaint-request-info.private.png'});
  await page.locator('#btnSendRequestInfo').click();
  await page.waitForFunction(()=>!document.getElementById('requestMoreInfoModalOverlay').classList.contains('active'));
  assert.equal((await ok(service.from('support_ticket').select('status').eq('id',id).single())).status,'waiting_customer');
  const original=(await ok(service.from('support_ticket').select('description').eq('id',id).single())).description;
  assert.equal(original,'Original intake content');
  await page.locator('#btnOpenResolveModal').click();
  await page.locator('#inputResolveNote').fill('Explained procedure and agreed next steps');
  await page.screenshot({path:infra+'/complaint-resolution.private.png'});
  await page.locator('#btnConfirmResolveTicket').click();
  await page.waitForFunction(()=>!document.getElementById('resolveTicketModalOverlay').classList.contains('active'));
  assert.equal((await ok(service.from('support_ticket').select('status').eq('id',id).single())).status,'resolved');
  await act('close',{note:'Close after confirmed resolution'});
  assert.equal((await ok(service.from('support_ticket').select('status').eq('id',id).single())).status,'closed');
  await act('reopen',{note:'Additional information received'});
  assert.equal((await ok(service.from('support_ticket').select('status').eq('id',id).single())).status,'reprocessing');
  assert.ok((await admin.from('support_ticket').update({status:'resolved'}).eq('id',id)).error,'Direct workflow bypass must fail');
  assert.ok((await admin.from('support_ticket_message').insert({ticket_id:id,sender_type:'staff',content:'Forged message'})).error);
  assert.ok((await admin.from('audit_log').insert({action:'COMPLAINT_ACTION',entity_name:'support_ticket',entity_id:id,description:'forged'})).error);
  // An unlinked complaint cannot propose a refund or pretend an execution succeeded.
  assert.equal((await admin.rpc('act_admin_complaint',{p_request_id:randomUUID(),p_ticket_id:id,p_expected_updated_at:await version(),p_action:'propose',p_details:{note:'Invalid refund',option:'refund',amount:100}})).error.code,'22023');
  await page.reload();
  await page.waitForFunction(()=>window.PawpalComplaints?.state.isLoaded);
  await page.waitForFunction(()=>document.getElementById('viewTicketCode')?.textContent.includes('KN-'));
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:infra+'/complaint-detail-mobile.private.png'});
  console.log('PASS assignment replay/stale edit; messages; request and resolution modals; close/reopen; direct-write/audit bypass rejected; reload and mobile.');
 } finally {
  await browser.close();await ok(service.from('support_ticket_message').delete().eq('ticket_id',id));await ok(service.from('support_ticket').delete().eq('id',id));
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1});
