// Real cashier RPCs on the restored database; never uses Cloud credentials.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {browserPage,admin,service,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{
 const {browser,page}=await browserPage(),id=randomUUID();
 try{
  const appointments=await ok(service.from('appointment').select('id,customer_id').not('appointment_status','in','(cancelled,no_show)').limit(100));
  let source,context;
  for(const a of appointments){const r=await admin.rpc('get_admin_service_cashier',{p_appointment_id:a.id});if(!r.error && Number(r.data.remaining)>=100){source=a;context=r.data;break;}}
  assert.ok(source,'Cashier fixture with an unpaid balance is required');
  const method=(await ok(service.from('payment_method_config').select('id').eq('name','Tiền mặt').eq('available',true).limit(1)))[0];
  const collected=randomUUID(),refunded=randomUUID();
  await ok(admin.rpc('post_admin_service_money',{p_request_id:collected,p_appointment_id:source.id,p_expected_state:context.version,p_action:'collect',p_details:{confirmed:true,amount:100,reason:'Isolated complaint verification collection',method_id:method.id}}));
  await ok(admin.rpc('create_admin_complaint',{p_id:id,p_customer_id:source.customer_id,p_order_id:null,p_appointment_id:source.id,p_category:'service',p_subject:'Refund workflow verification',p_content:'Refund handling verification',p_priority:'normal'}));
  const version=async()=>(await ok(service.from('support_ticket').select('updated_at').eq('id',id).single())).updated_at;
  const act=async(action,details)=>ok(admin.rpc('act_admin_complaint',{p_request_id:randomUUID(),p_ticket_id:id,p_expected_updated_at:await version(),p_action:action,p_details:details}));
  const before=(await ok(service.from('refund_transaction').select('id'))).length;
  await act('propose',{note:'Propose confirmed refund',option:'refund',amount:100});
  assert.equal((await ok(service.from('support_ticket').select('status').eq('id',id).single())).status,'waiting_manager_approval');
  await act('approve',{note:'Approve refund proposal'});
  const decision=await ok(service.from('support_ticket').select('requested_amount,approved_amount').eq('id',id).single());
  assert.equal(decision.requested_amount,null,'Do not replace the customer request with the staff proposal');
  assert.equal(Number(decision.approved_amount),100);
  assert.equal((await ok(service.from('refund_transaction').select('id'))).length,before,'Approval cannot create money');
  assert.equal((await admin.rpc('act_admin_complaint',{p_request_id:randomUUID(),p_ticket_id:id,p_expected_updated_at:await version(),p_action:'complete',p_details:{note:'Unexecuted refund',evidence_id:randomUUID()}})).error.code,'22023');
  context=await ok(admin.rpc('get_admin_service_cashier',{p_appointment_id:source.id}));
  await ok(admin.rpc('post_admin_service_money',{p_request_id:refunded,p_appointment_id:source.id,p_expected_state:context.version,p_action:'refund',p_details:{confirmed:true,amount:100,reason:'Isolated complaint verification refund',method_id:method.id,payment_id:collected}}));
  const immutableBefore=await ok(service.from('refund_transaction').select('*').eq('id',refunded).single());
  await page.locator('[data-title="Khiếu nại"]').click();await page.waitForFunction(()=>window.PawpalComplaints?.subtabs.detail && PawpalComplaints.state.isLoaded);
  await page.evaluate(id=>PawpalComplaints.openTicketDetail(id),id);
  await page.locator('#btnCompleteComplaint').click();await page.locator('#complaintEvidenceSearch').fill(refunded);
  await page.locator('#complaintEvidenceDropdown [data-id="'+refunded+'"]').click();
  await page.locator('#inputResolveNote').fill('Confirmed external cashier refund');
  await page.screenshot({path:infra+'/complaint-link-result.private.png'});
  await page.locator('#btnConfirmResolveTicket').click();await page.waitForFunction(()=>!document.getElementById('resolveTicketModalOverlay').classList.contains('active'));
  assert.equal((await ok(service.from('support_ticket').select('status').eq('id',id).single())).status,'resolved');
  assert.deepEqual(await ok(service.from('refund_transaction').select('*').eq('id',refunded).single()),immutableBefore);
  console.log('PASS proposed/approved refund does not move money; unexecuted refund rejected; actual cashier refund linked via browser; immutable refund unchanged.');
 } finally{await browser.close();await ok(service.from('support_ticket_message').delete().eq('ticket_id',id));await ok(service.from('support_ticket').delete().eq('id',id));}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
