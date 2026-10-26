// Live Auth/PostgREST/COMMIT/Realtime test. Two isolated synthetic customers, one ticket.
// Business audit events are immutable and intentionally retained; never disable triggers.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createClient}=require('@supabase/supabase-js');
if(!process.argv.includes('--cloud')){console.log('No network. Use --cloud for live isolated Auth/ticket/notification checks with scoped cleanup.');process.exit(0);}
const {settings}=require('../database/v1/cloud_connection.cjs'),{config}=settings();
const trace=[],fixtures=[],clients=[],checks=[],auditIds=[],ticket=crypto.randomUUID();let failure,cleanupFailure;
const reviewOnly=process.argv.includes('--review-only'),reviewFixture={pet:crypto.randomUUID(),booking:crypto.randomUUID(),item:crypto.randomUUID(),review:crypto.randomUUID()};
const report={timestamp:new Date().toISOString(),environment:'Supabase Cloud cpzuvaplseielhgcnqrn',scope:'Actual synthetic customer/Admin Auth, PostgREST committed ticket RPCs and Realtime; no production UI, review publication, money, upload, Storage or Logs. Immutable test audit rows retained.',checks};
const transport=async(input,init={})=>{const response=await fetch(input,{...init,signal:AbortSignal.any([init.signal,AbortSignal.timeout(12000)].filter(Boolean))});trace.push({path:new URL(typeof input==='string'?input:input.url).pathname,method:init.method||'GET',status:response.status});return response;};
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:transport}};
const client=(key,extra={})=>{const db=createClient(config.DESTINATION_SUPABASE_URL,key,{...options,...extra});clients.push(db);return db;};
const service=client(config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY),ok=async promise=>{const result=await promise;if(result.error)throw result.error;return result.data;},pass=name=>checks.push({name,status:'PASS'});
async function customer(label){
 const phone='095'+crypto.randomInt(1000000,10000000),email='notify-'+crypto.randomUUID()+'@example.invalid',password=crypto.randomBytes(24).toString('hex')+'!';
 const prior=await ok(service.from('customer_phone').select('id').in('phone_number',[phone,'+84'+phone.slice(1)]).limit(1));assert.equal(prior.length,0,'Random fixture phone already exists; stop without merging');
 const started=Date.now(),user=(await ok(service.auth.admin.createUser({email,phone:'+84'+phone.slice(1),password,email_confirm:true,phone_confirm:true,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}}))).user;
 const fixture={uid:user.id,cid:null,started};fixtures.push(fixture);
 const cid=await ok(service.rpc('complete_customer_auth',{p_auth_id:user.id,p_phone:phone,p_name:'E2E notification '+label}));
 const saved=await ok(service.from('customer').select('id,auth_user_id,created_at').eq('id',cid).single());assert.equal(saved.auth_user_id,user.id);assert.ok(Date.parse(saved.created_at)>=started-2000,'Must never reuse an older customer');fixture.cid=cid;
 const db=client(config.DESTINATION_SUPABASE_ANON_KEY),auth=await ok(db.auth.signInWithPassword({email,password}));return {...fixture,db,session:auth.session};
}
const inbox=db=>ok(db.rpc('own_notifications_snapshot',{p_page:1,p_size:10,p_unread:false}));
const support=db=>ok(db.rpc('own_support_tickets',{p_page:1,p_filter:'all',p_ticket:ticket,p_message_page:1}));
const ticketRow=()=>ok(service.from('support_ticket').select('id,customer_id,updated_at,status,priority,first_response_at').eq('id',ticket).single());
const events={owner:[],other:[]},waiters=[];
function event(side,table,payload){events[side].push({table,id:payload.new.id,internal:payload.new.is_internal,content:payload.new.content});for(const waiter of [...waiters])if(waiter.predicate()){clearTimeout(waiter.timer);waiters.splice(waiters.indexOf(waiter),1);waiter.resolve();}}
function waitFor(predicate){if(predicate())return Promise.resolve();return new Promise((resolve,reject)=>{const waiter={predicate,resolve,timer:setTimeout(()=>{waiters.splice(waiters.indexOf(waiter),1);reject(Object.assign(new Error('Realtime event deadline exceeded'),{code:'realtime_timeout'}));},12000)};waiters.push(waiter);});}
async function subscribe(db,owner,side){
 const channel=db.channel('e2e-notify-'+side+'-'+ticket).on('postgres_changes',{event:'INSERT',schema:'public',table:'notification',filter:'customer_id=eq.'+owner},payload=>event(side,'notification',payload)).on('postgres_changes',{event:'INSERT',schema:'public',table:'support_ticket_message',filter:'ticket_id=eq.'+ticket},payload=>event(side,'message',payload));
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Object.assign(new Error('Realtime subscribe timeout'),{code:'realtime_subscribe_timeout'})),12000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){clearTimeout(timer);reject(Object.assign(new Error('Realtime not available'),{code:'realtime_subscribe_failed'}));}});});
}
(async()=>{try{
 const a=await customer('A'),b=await customer('B');report.fixtureIds={customers:[a.cid,b.cid],auth:[a.uid,b.uid],ticket};
 const credentials=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8'),admin=client(config.DESTINATION_SUPABASE_ANON_KEY);
 await ok(admin.auth.signInWithPassword({email:credentials.match(/^Email: (.+)$/m)[1].trim(),password:credentials.match(/^Password: (.+)$/m)[1].trim()}));
 pass('Two synthetic customers and existing private Admin authenticate through real Supabase Auth');
 if(!reviewOnly){
 const second=client(config.DESTINATION_SUPABASE_ANON_KEY,{auth:options.auth,global:{fetch:transport,headers:{Authorization:'Bearer '+a.session.access_token}}});
 const create={p_id:ticket,p_category:'other',p_subject:'E2E committed notification verification',p_content:'E2E customer question',p_appointment:null,p_order:null,p_resolution:null};
 const created=await Promise.all([ok(a.db.rpc('create_own_support_ticket',create)),ok(second.rpc('create_own_support_ticket',create))]);assert.deepEqual(created,[ticket,ticket]);assert.equal((await ticketRow()).customer_id,a.cid);
 const originalMessages=await ok(service.from('support_ticket_message').select('id').eq('ticket_id',ticket));assert.equal(originalMessages.length,1);pass('Two overlapping PostgREST create requests with same UUID commit one ticket and one opening message');
 assert.equal((await support(a.db)).total,1);assert.equal((await support(b.db)).total,0);pass('Committed ticket is visible to A, not B, through customer projection RPC');
 await Promise.all([subscribe(a.db,a.cid,'owner'),subscribe(b.db,a.cid,'other')]);pass('Owner and other-customer Realtime subscriptions both join with their actual JWTs');
 let row=await ticketRow();const internal=crypto.randomUUID();auditIds.push(internal);await ok(admin.rpc('act_admin_complaint',{p_request_id:internal,p_ticket_id:ticket,p_expected_updated_at:row.updated_at,p_action:'message',p_details:{note:'E2E PRIVATE staff note',internal:true}}));
 assert.equal((await inbox(a.db)).total,0);assert.equal((await support(a.db)).rows[0].messages.some(m=>m.text.includes('PRIVATE')),false);pass('Committed internal note stays out of customer ticket projection and notification inbox');
 row=await ticketRow();const reply=crypto.randomUUID();auditIds.push(reply);const replyArgs={p_request_id:reply,p_ticket_id:ticket,p_expected_updated_at:row.updated_at,p_action:'message',p_details:{note:'E2E public committed staff response',internal:false}};
 assert.deepEqual(await Promise.all([ok(admin.rpc('act_admin_complaint',replyArgs)),ok(admin.rpc('act_admin_complaint',replyArgs))]),[ticket,ticket]);
 await waitFor(()=>events.owner.some(e=>e.table==='notification')&&events.owner.some(e=>e.table==='message'&&e.content==='E2E public committed staff response'));
 let notices=await inbox(a.db);assert.equal(notices.total,1);assert.equal(notices.rows[0].support_ticket_id,ticket);assert.equal((await inbox(b.db)).total,0);assert.equal(events.other.length,0);pass('Reply retry commits one notice; owner receives actual Realtime message/notification, B receives neither');
 const first=notices.rows[0].id,denied=await b.db.rpc('mark_own_notifications_read',{p_id:first,p_before:null,p_expected_owner:b.cid});assert.equal(denied.error?.code,'42501');
 assert.equal(await ok(a.db.rpc('mark_own_notifications_read',{p_id:first,p_before:null,p_expected_owner:a.cid})),1);assert.equal(await ok(a.db.rpc('mark_own_notifications_read',{p_id:first,p_before:null,p_expected_owner:a.cid})),0);pass('Real JWT owner read acknowledgement commits once; B is rejected');
 const reloaded=client(config.DESTINATION_SUPABASE_ANON_KEY,{auth:options.auth,global:{fetch:transport,headers:{Authorization:'Bearer '+a.session.access_token}}});assert.equal((await inbox(reloaded)).unread_count,0);assert.equal((await support(reloaded)).total,1);pass('Fresh authenticated client re-reads committed ticket and persisted read state');
 row=await ticketRow();assert.ok(row.first_response_at);assert.equal(row.priority,'normal');const resolve=crypto.randomUUID();auditIds.push(resolve);const resolveArgs={p_request_id:resolve,p_ticket_id:ticket,p_expected_updated_at:row.updated_at,p_action:'resolve',p_details:{note:'E2E resolved without money or files',option:'explain',amount:0}};
 await ok(admin.rpc('act_admin_complaint',resolveArgs));await ok(admin.rpc('act_admin_complaint',resolveArgs));await waitFor(()=>events.owner.filter(e=>e.table==='notification').length>=2);
 notices=await inbox(reloaded);assert.equal(notices.total,2);assert.equal(notices.unread_count,1);const result=await support(reloaded);assert.equal(result.rows[0].status,'resolved');assert.equal(result.rows[0].messages.some(m=>m.text.includes('PRIVATE')),false);assert.equal(events.other.length,0);pass('Resolve retry persists status and sends exactly one additional notice with actual Realtime delivery');
 const rows=await ok(service.from('notification').select('customer_id,source_event').eq('customer_id',a.cid));assert.equal(rows.length,2);assert.equal(new Set(rows.map(r=>r.source_event)).size,2);assert.ok(rows.every(r=>r.customer_id===a.cid));assert.ok(events.owner.every(e=>!e.internal&&!String(e.content).includes('PRIVATE')));pass('Event keys and recipient IDs remain unique and public across committed flow');
 }else{
  report.scope='Actual synthetic customer/Admin Auth, committed nonpublic service review moderation and notification Realtime. Only pending/hidden/rejected are used; no test review published, production UI, money, files, Storage or Logs. Immutable test moderation audit rows retained.';
  Object.assign(report.fixtureIds,reviewFixture);
  const breed=(await ok(service.from('pet_breed').select('id').eq('is_active',true).order('id').limit(1)))[0],svc=(await ok(service.from('service').select('id').eq('status','active').order('id').limit(1)))[0];assert.ok(breed&&svc);
  await ok(service.from('pet_profile').insert({id:reviewFixture.pet,customer_id:a.cid,pet_code:'E2E-'+reviewFixture.pet,pet_name:'E2E private review pet',breed_id:breed.id,gender:'nam'}));
  await ok(service.from('appointment').insert({id:reviewFixture.booking,appointment_code:'E2E-'+reviewFixture.booking,customer_id:a.cid,pet_id:reviewFixture.pet,scheduled_start_at:new Date(Date.now()-172800000).toISOString(),scheduled_end_at:new Date(Date.now()-169200000).toISOString(),appointment_status:'completed'}));
  await ok(service.from('appointment_item').insert({id:reviewFixture.item,appointment_id:reviewFixture.booking,service_id:svc.id,is_primary:true,name_snapshot:'E2E private review service',quantity:1,unit_price:100,duration_minutes:60,status:'completed'}));
  const payload={p_booking:reviewFixture.booking,p_reviews:[{id:reviewFixture.review,line_id:reviewFixture.item,rating:5,content:'E2E nonpublic moderation verification'}]};
  await ok(a.db.rpc('submit_own_service_reviews',payload));await ok(a.db.rpc('submit_own_service_reviews',payload));
  const own=db=>ok(db.rpc('own_service_reviews',{p_booking:reviewFixture.booking}));let ownRows=await own(a.db);assert.equal(ownRows.length,1);assert.equal(ownRows[0].review_status,'pending');assert.equal((await inbox(a.db)).total,0);pass('Real customer submission and retry commit one pending review, without a self-notification');
  assert.equal((await b.db.rpc('own_service_reviews',{p_booking:reviewFixture.booking})).error?.code,'42501');assert.equal((await a.db.rpc('moderate_admin_service_review',{p_request:crypto.randomUUID(),p_review:reviewFixture.review,p_expected:null,p_status:'published',p_reason:'E2E forbidden owner'})).error?.code,'42501');pass('B cannot read A review; customer cannot moderate their own review');
  await Promise.all([subscribe(a.db,a.cid,'owner'),subscribe(b.db,a.cid,'other')]);
  let record=await ok(service.from('review').select('updated_at').eq('id',reviewFixture.review).single());const hide=crypto.randomUUID();auditIds.push(hide);
  const hideArgs={p_request:hide,p_review:reviewFixture.review,p_expected:record.updated_at,p_status:'hidden',p_reason:'E2E PRIVATE moderation reason'};
  assert.deepEqual(await Promise.all([ok(admin.rpc('moderate_admin_service_review',hideArgs)),ok(admin.rpc('moderate_admin_service_review',hideArgs))]),[reviewFixture.review,reviewFixture.review]);
  await waitFor(()=>events.owner.filter(e=>e.table==='notification').length>=1);let notices=await inbox(a.db);assert.equal(notices.total,1);assert.equal(notices.rows[0].appointment_id,reviewFixture.booking);assert.ok(!notices.rows[0].content.includes('PRIVATE'));assert.equal((await own(a.db))[0].review_status,'hidden');assert.equal((await inbox(b.db)).total,0);assert.equal(events.other.length,0);pass('Concurrent Admin hide retry commits once; only owner receives linked Realtime notice without private reason');
  const stale=await admin.rpc('moderate_admin_service_review',{...hideArgs,p_request:crypto.randomUUID(),p_status:'rejected'});assert.equal(stale.error?.code,'PT409');pass('Stale committed moderation snapshot is rejected');
  record=await ok(service.from('review').select('updated_at').eq('id',reviewFixture.review).single());const reject=crypto.randomUUID();auditIds.push(reject);await ok(admin.rpc('moderate_admin_service_review',{p_request:reject,p_review:reviewFixture.review,p_expected:record.updated_at,p_status:'rejected',p_reason:'E2E verification only, never publish'}));
  await waitFor(()=>events.owner.filter(e=>e.table==='notification').length>=2);const fresh=client(config.DESTINATION_SUPABASE_ANON_KEY,{auth:options.auth,global:{fetch:transport,headers:{Authorization:'Bearer '+a.session.access_token}}});assert.equal((await own(fresh))[0].review_status,'rejected');notices=await inbox(fresh);assert.equal(notices.total,2);assert.equal(events.other.length,0);pass('Fresh authenticated client reads committed rejection and two distinct owner notices');
  const guest=client(config.DESTINATION_SUPABASE_ANON_KEY),published=await ok(guest.rpc('public_service_reviews',{p_service:svc.id}));assert.ok(!published.some(row=>row.id===reviewFixture.review));pass('Anonymous public reviews never expose the pending/hidden/rejected test review; no real service review was published');
 }
}catch(error){failure={code:error.code||error.name,afterChecks:checks.length};}
finally{
 for(const waiter of waiters)clearTimeout(waiter.timer);waiters.length=0;
 for(const db of clients)await db.removeAllChannels().catch(()=>{});
 const cleanupErrors=[];const clean=async job=>{try{await job();}catch(error){cleanupErrors.push(error.code||error.name);}};
 // Recover only customers linked to the newly created Auth UUIDs, never a phone-matched real customer.
 for(const fixture of fixtures)if(!fixture.cid)await clean(async()=>{const rows=await ok(service.from('customer').select('id,created_at').eq('auth_user_id',fixture.uid));if(rows[0]&&Date.parse(rows[0].created_at)>=fixture.started-2000)fixture.cid=rows[0].id;});
 const customerIds=fixtures.map(f=>f.cid).filter(Boolean);
 if(customerIds.length){await clean(()=>ok(service.from('notification').delete().in('customer_id',customerIds)));
  if(reviewOnly){await clean(()=>ok(service.from('review').delete().eq('id',reviewFixture.review)));await clean(()=>ok(service.from('appointment_item').delete().eq('id',reviewFixture.item)));await clean(()=>ok(service.from('appointment').delete().eq('id',reviewFixture.booking).in('customer_id',customerIds)));await clean(()=>ok(service.from('pet_profile').delete().eq('id',reviewFixture.pet).in('customer_id',customerIds)));}
  await clean(()=>ok(service.from('support_ticket_message').delete().eq('ticket_id',ticket)));await clean(()=>ok(service.from('support_ticket').delete().eq('id',ticket).in('customer_id',customerIds)));
  for(const table of ['customer_membership','customer_address','customer_phone','customer_profile'])await clean(()=>ok(service.from(table).delete().in('customer_id',customerIds)));
  for(const fixture of fixtures.filter(f=>f.cid))await clean(()=>ok(service.from('customer').delete().eq('id',fixture.cid).eq('auth_user_id',fixture.uid)));
 }
 for(const fixture of fixtures)await clean(()=>ok(service.auth.admin.deleteUser(fixture.uid)));
 if(!cleanupErrors.length){await clean(async()=>{if(customerIds.length){assert.equal((await ok(service.from('customer').select('id').in('id',customerIds))).length,0);assert.equal((await ok(service.from('notification').select('id').in('customer_id',customerIds))).length,0);}assert.equal((await ok(service.from('support_ticket').select('id').eq('id',ticket))).length,0);for(const fixture of fixtures){const result=await service.auth.admin.getUserById(fixture.uid);assert.equal(result.error?.status,404);}});}
 if(auditIds.length)await clean(async()=>{const rows=await ok(service.from('audit_log').select('id').in('id',auditIds));report.retainedImmutableAuditRows=rows.length;});
 report.cleanup={status:cleanupErrors.length?'FAIL':'PASS',errors:cleanupErrors,retainedAuditPolicy:'Append-only test action audit records retained as designed; no audit deletion or trigger disabling'};
 if(cleanupErrors.length)cleanupFailure=true;else pass('Scoped cleanup removes synthetic Auth/customer/ticket/notifications, preserving immutable audit trail');
 report.status=failure||cleanupFailure?'FAIL':'PASS';report.failure=failure;report.http={requests:trace.length,trace};report.realtime={ownerMessages:events.owner.filter(e=>e.table==='message').length,ownerNotifications:events.owner.filter(e=>e.table==='notification').length,otherEvents:events.other.length};
 fs.writeFileSync('docs/verification/sync/'+(reviewOnly?'review-notifications-auth-realtime':'ticket-notifications-auth-realtime')+'.txt',JSON.stringify(report,null,2)+'\n');
 if(failure||cleanupFailure){console.error('Live ticket/notification verification failed:',failure?.code||'cleanup_failed','after',checks.length,'checks; see scoped report.');process.exitCode=1;}else console.log('PASS',checks.length,'live Auth/commit/Realtime checks;',trace.length,'HTTP requests; scoped fixtures cleaned;',report.retainedImmutableAuditRows,'immutable test audit rows retained.');
}})().catch(error=>{console.error(error.code||error.name);process.exitCode=1;});
