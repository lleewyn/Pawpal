// Synthetic fixture for manual MCP UI verification. Credentials stay outside the repository.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createClient}=require('@supabase/supabase-js');
const secretPath='D:/Aboutme/Pawpal-infra/browser-check/two-portal.private.json';
if(!process.argv.includes('--setup')&&!process.argv.includes('--cleanup')){console.log('No network. Use --setup or --cleanup explicitly.');process.exit(0);}
const {config}=require('../database/v1/cloud_connection.cjs').settings();
const db=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async p=>{const r=await p;if(r.error)throw r.error;return r.data;};
(async()=>{
 if(process.argv.includes('--setup')){
  assert.ok(!fs.existsSync(secretPath),'Existing fixture must be cleaned first');
  const f={createdAt:new Date().toISOString(),advanced:process.argv.includes('--advanced'),customers:[],pet:crypto.randomUUID(),booking:crypto.randomUUID(),item:crypto.randomUUID()};
  const save=()=>fs.writeFileSync(secretPath,JSON.stringify(f,null,2));save();
  for(const label of ['A','B']){
   const phone='095'+crypto.randomInt(1000000,10000000),email='portal-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomBytes(24).toString('hex')+'!';
   assert.equal((await ok(db.from('customer_phone').select('id').in('phone_number',[phone,'+84'+phone.slice(1)]).limit(1))).length,0);
   const user=(await ok(db.auth.admin.createUser({email,phone:'+84'+phone.slice(1),password,email_confirm:true,phone_confirm:true,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}}))).user;
   const c={label,uid:user.id,phone,email,password};f.customers.push(c);save();
   c.cid=await ok(db.rpc('complete_customer_auth',{p_auth_id:c.uid,p_phone:phone,p_name:'E2E Portal '+label}));save();
   const row=await ok(db.from('customer').select('auth_user_id,created_at').eq('id',c.cid).single());assert.equal(row.auth_user_id,c.uid);assert.ok(Date.parse(row.created_at)>=Date.parse(f.createdAt)-2000);
  }
  const breed=(await ok(db.from('pet_breed').select('id').eq('is_active',true).order('id').limit(1)))[0];let svc=(await ok(db.from('service').select('id,service_name,category_id').eq('status','active').order('id').limit(1)))[0];
  if(f.advanced){
   f.ownedService=crypto.randomUUID();save();
   svc={id:f.ownedService,service_name:'E2E private publication fixture',category_id:svc.category_id};
   await ok(db.from('service').insert({...svc,service_code:'E2E-'+f.ownedService,estimated_duration:30,status:'inactive'}));
   const email='portal-recipient-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomBytes(24).toString('hex')+'!';
   const u=(await ok(db.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{pawpal_test:true}}))).user;
   f.recipient={uid:u.id,id:crypto.randomUUID(),email,password};save();
   await ok(db.from('staff').insert({id:f.recipient.id,auth_user_id:u.id,full_name:'E2E Portal recipient',job_title:'QA',employment_status:'active',must_change_password:false}));
   await ok(db.from('staff_permission').insert(['chat_conversation.read','chat_conversation.write','chat_message.read','chat_message.write','audit_log.write','customer_profile.read','customer_phone.read','staff.read'].map(permission_code=>({staff_id:f.recipient.id,permission_code}))));
  }
  f.service=svc;save();
  await ok(db.from('pet_profile').insert({id:f.pet,customer_id:f.customers[0].cid,pet_code:'E2E-'+f.pet,pet_name:'E2E Portal pet',breed_id:breed.id,gender:'nam'}));
  await ok(db.from('appointment').insert({id:f.booking,appointment_code:'E2E-PORTAL-'+f.booking.slice(0,8),customer_id:f.customers[0].cid,pet_id:f.pet,scheduled_start_at:new Date(Date.now()-172800000).toISOString(),scheduled_end_at:new Date(Date.now()-169200000).toISOString(),appointment_status:'completed'}));
  await ok(db.from('appointment_item').insert({id:f.item,appointment_id:f.booking,service_id:svc.id,is_primary:true,name_snapshot:svc.service_name,quantity:1,unit_price:100,duration_minutes:60,status:'completed'}));
  console.log('SETUP PASS: two isolated customers and one completed review-eligible booking; credentials outside repository.');
 }else{
  const f=JSON.parse(fs.readFileSync(secretPath,'utf8')),ids=[];for(const c of f.customers){const rows=await ok(db.from('customer').select('id,created_at').eq('auth_user_id',c.uid));for(const r of rows){assert.ok(Date.parse(r.created_at)>=Date.parse(f.createdAt)-2000);ids.push(r.id);}}
  const tickets=ids.length?await ok(db.from('support_ticket').select('id').in('customer_id',ids)):[],chats=ids.length?await ok(db.from('chat_conversation').select('id').in('customer_id',ids)):[];
  const reviews=await ok(db.from('review').select('id,review_status').eq('appointment_item_id',f.item)),notices=ids.length?await ok(db.from('notification').select('id,source_event,customer_id').in('customer_id',ids)):[];
  if(f.recipient)assert.equal((await ok(db.from('audit_log').select('id').eq('staff_id',f.recipient.id).limit(1))).length,0,'Recipient must remain read-only for scoped cleanup');
  const entityIds=[...tickets,...chats,...reviews].map(r=>r.id),audits=entityIds.length?await ok(db.from('audit_log').select('id,action').in('entity_id',entityIds)):[];
  const evidence={timestamp:new Date().toISOString(),environment:'Local UI at localhost:4000 (Admin) and 127.0.0.1:4000 (customer), live Supabase Cloud',scope:'MCP UI fixture cleanup and committed-state counts; not an automated assertion of every UI action',beforeCleanup:{customers:ids.length,tickets:tickets.length,chats:chats.length,reviews:reviews.map(r=>({status:r.review_status})),notifications:notices.length,uniqueNotificationEvents:new Set(notices.map(r=>r.source_event)).size,otherCustomerNotifications:notices.filter(r=>r.customer_id!==f.customers[0].cid).length},retainedImmutableAudits:audits.length,auditActions:audits.map(a=>a.action)};
  if(ids.length)await ok(db.from('notification').delete().in('customer_id',ids));
  for(const t of tickets){await ok(db.from('support_ticket_message').delete().eq('ticket_id',t.id));await ok(db.from('support_ticket').delete().eq('id',t.id));}
  for(const c of chats){await ok(db.from('chat_message').delete().eq('conversation_id',c.id));await ok(db.from('chat_conversation').delete().eq('id',c.id));}
  await ok(db.from('review').delete().eq('appointment_item_id',f.item));await ok(db.from('appointment_item').delete().eq('id',f.item));await ok(db.from('appointment').delete().eq('id',f.booking));await ok(db.from('pet_profile').delete().eq('id',f.pet));
  if(f.ownedService)await ok(db.from('service').delete().eq('id',f.ownedService));
  if(f.recipient){await ok(db.from('staff_permission').delete().eq('staff_id',f.recipient.id));await ok(db.from('staff').delete().eq('id',f.recipient.id));await ok(db.auth.admin.deleteUser(f.recipient.uid));assert.equal((await db.auth.admin.getUserById(f.recipient.uid)).error?.status,404);}
  for(const table of ['customer_membership','customer_address','customer_phone','customer_profile'])if(ids.length)await ok(db.from(table).delete().in('customer_id',ids));
  for(const c of f.customers){if(ids.includes(c.cid))await ok(db.from('customer').delete().eq('id',c.cid).eq('auth_user_id',c.uid));await ok(db.auth.admin.deleteUser(c.uid));}
  assert.equal((await ok(db.from('customer').select('id').in('id',ids))).length,0);for(const c of f.customers)assert.equal((await db.auth.admin.getUserById(c.uid)).error?.status,404);
  for(const [table,filter,value]of [['support_ticket','id',tickets.map(r=>r.id)],['chat_conversation','id',chats.map(r=>r.id)],['notification','customer_id',ids],['review','id',reviews.map(r=>r.id)]])if(value.length)assert.equal((await ok(db.from(table).select('id').in(filter,value))).length,0);
  if(audits.length)assert.equal((await ok(db.from('audit_log').select('id').in('id',audits.map(a=>a.id)))).length,audits.length);
  evidence.cleanup='PASS';evidence.recipientRemoved=Boolean(f.recipient);evidence.inactiveServiceRemoved=Boolean(f.ownedService);fs.writeFileSync('docs/verification/sync/'+(f.advanced?'advanced-portal-live-cleanup':'two-portal-live-cleanup')+'.txt',JSON.stringify(evidence,null,2)+'\n');
  fs.unlinkSync(secretPath);console.log('CLEANUP PASS: scoped synthetic entities removed; immutable Admin audits retained, no trigger disabled.');
 }
})().catch(e=>{console.error('Fixture operation failed:',e.code||e.name,e.message);process.exitCode=1;});
