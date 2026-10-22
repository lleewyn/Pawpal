const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {browserPage,admin,service,ok}=require('./customer_completion_helpers.cjs');
(async()=>{
 const {browser}=await browserPage();const cleanup=[];
 const create=async(category,source)=>{
  const id=randomUUID();cleanup.push(['support_ticket',id]);
  await ok(admin.rpc('create_admin_complaint',{p_id:id,p_customer_id:source.customer_id,p_order_id:category==='order'?source.id:null,p_appointment_id:category==='service'?source.id:null,p_category:category,p_subject:'Result verification',p_content:'Isolated verification content',p_priority:'normal'}));return id;
 };
 const act=async(id,action,details)=>{
  const t=await ok(service.from('support_ticket').select('updated_at').eq('id',id).single());
  return admin.rpc('act_admin_complaint',{p_request_id:randomUUID(),p_ticket_id:id,p_expected_updated_at:t.updated_at,p_action:action,p_details:details});
 };
 try{
  const appointments=await ok(service.from('appointment').select('*,items:appointment_item(*)').limit(100));
  const source=appointments.find(a=>a.items.some(i=>i.service_id));assert.ok(source);
  const id=await create('service',source);
  await ok(act(id,'propose',{note:'Redo service proposal',option:'redo_service',amount:0}));
  await ok(act(id,'reject_proposal',{note:'Need a revised proposal'}));
  assert.equal((await ok(service.from('support_ticket').select('resolution_type').eq('id',id).single())).resolution_type,null);
  await ok(act(id,'propose',{note:'Revised redo service',option:'redo_service',amount:0}));await ok(act(id,'approve',{note:'Approve redo'}));
  assert.equal((await act(id,'complete',{note:'Original cannot count as redo',evidence_id:source.id})).error.code,'22023');
  const booking=randomUUID();cleanup.push(['appointment',booking]);
  await ok(service.from('appointment').insert({id:booking,appointment_code:'VERIFY-REDO-'+booking,customer_id:source.customer_id,pet_id:source.pet_id,appointment_status:'completed',scheduled_start_at:'2098-01-01T01:00:00Z',scheduled_end_at:'2098-01-01T02:00:00Z'}));
  const item=source.items.find(i=>i.service_id);
  await ok(service.from('appointment_item').insert({appointment_id:booking,service_id:item.service_id,is_primary:true,name_snapshot:item.name_snapshot,quantity:1,unit_price:0,discount_amount:0,duration_minutes:30,status:'completed'}));
  await ok(act(id,'complete',{note:'Confirmed completed redo',evidence_id:booking}));
  assert.equal((await ok(service.from('support_ticket').select('status').eq('id',id).single())).status,'resolved');
  const staffChange=await create('service',{id:booking,customer_id:source.customer_id});
  await ok(act(staffChange,'propose',{note:'Assign a different technician',option:'change_staff',amount:0}));await ok(act(staffChange,'approve',{note:'Approved technician change'}));
  assert.equal((await act(staffChange,'complete',{note:'Technician has not changed',evidence_id:booking})).error.code,'22023');
  const technician=(await ok(admin.rpc('get_admin_complaint_handlers')))[0];
  await ok(service.from('appointment').update({staff_id:technician.id}).eq('id',booking));
  await ok(act(staffChange,'complete',{note:'Completed with the changed technician',evidence_id:booking}));
  const order=(await ok(service.from('sales_order').select('id,customer_id').limit(1)))[0];
  const exchange=await create('order',order);await ok(act(exchange,'propose',{note:'Exchange goods',option:'rma_exchange',amount:0}));await ok(act(exchange,'approve',{note:'Approve exchange'}));
  const returned=randomUUID();cleanup.push(['return_request',returned]);
  await ok(service.from('return_request').insert({id:returned,sales_order_id:order.id,reason:'Verification received goods',return_type:'exchange',request_status:'received'}));
  assert.equal((await act(exchange,'complete',{note:'Cannot finish without replacement',evidence_id:returned})).error.code,'22023');
  const replacement=randomUUID();cleanup.push(['sales_order',replacement]);
  await ok(service.from('sales_order').insert({id:replacement,order_code:'VERIFY-REPLACEMENT-'+replacement,customer_id:order.customer_id,order_status:'delivered'}));
  await ok(act(exchange,'complete',{note:'Received goods and delivered replacement',evidence_id:returned,replacement_order_id:replacement}));
  let refundOrder,cashier;
  for(const o of await ok(service.from('sales_order').select('id,customer_id').not('order_status','in','(cancelled,returned)').limit(100))){
   const response=await admin.rpc('get_admin_sales_cashier',{p_order_id:o.id});
   if(!response.error && Number(response.data.remaining)>=100){refundOrder=o;cashier=response.data;break;}
  }
  assert.ok(refundOrder,'Sales cashier fixture is required');
  const method=(await ok(service.from('payment_method_config').select('id').eq('name','Tiền mặt').eq('available',true).limit(1)))[0];
  const collected=randomUUID(),refunded=randomUUID();
  await ok(admin.rpc('post_admin_sales_money',{p_request_id:collected,p_order_id:refundOrder.id,p_expected_state:cashier.version,p_action:'collect',p_details:{confirmed:true,amount:100,reason:'Isolated return verification',method_id:method.id}}));
  cashier=await ok(admin.rpc('get_admin_sales_cashier',{p_order_id:refundOrder.id}));
  await ok(admin.rpc('post_admin_sales_money',{p_request_id:refunded,p_order_id:refundOrder.id,p_expected_state:cashier.version,p_action:'refund',p_details:{confirmed:true,amount:100,reason:'Isolated return verification refund',method_id:method.id,payment_id:collected}}));
  const refundTicket=await create('order',refundOrder);
  await ok(act(refundTicket,'propose',{note:'Return and refund proposal',option:'rma_refund',amount:100}));await ok(act(refundTicket,'approve',{note:'Approved return and refund'}));
  assert.equal((await act(refundTicket,'complete',{note:'Refund alone lacks received goods',evidence_id:refunded})).error.code,'22023');
  const refundReturn=randomUUID();cleanup.push(['return_request',refundReturn]);
  await ok(service.from('return_request').insert({id:refundReturn,sales_order_id:refundOrder.id,reason:'Verification refund received goods',return_type:'refund',request_status:'received'}));
  await ok(act(refundTicket,'complete',{note:'Actual received return and confirmed sales refund',evidence_id:refunded,return_request_id:refundReturn}));
  console.log('PASS proposal rejection/revision, completed redo validation, received return plus delivered replacement, return/refund via actual sales cashier. Fixtures only on isolated DB.');
 }finally{
  await browser.close();
  for(const [table,id] of cleanup.filter(([t])=>t==='support_ticket')){await ok(service.from('support_ticket_message').delete().eq('ticket_id',id));await ok(service.from(table).delete().eq('id',id));}
  for(const [table,id] of cleanup.filter(([t])=>t!=='support_ticket').reverse()){
   if(table==='appointment')await ok(service.from('appointment_item').delete().eq('appointment_id',id));
   await ok(service.from(table).delete().eq('id',id));
  }
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1});
