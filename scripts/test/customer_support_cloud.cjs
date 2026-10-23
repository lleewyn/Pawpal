const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {settings,infra}=require('../database/v1/cloud_connection.cjs'),{config}=settings(),options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options);
const ok=async p=>{const r=await p;if(r.error)throw Error(r.error.message);return r.data;};
const phone='095'+String(crypto.randomInt(1000000,10000000)),password=crypto.randomBytes(20).toString('hex')+'!';
(async()=>{let uid,cid,pet,aid,ticket,browser,page;try{
 uid=(await ok(service.auth.admin.createUser({email:'support-'+crypto.randomUUID()+'@example.invalid',email_confirm:true,phone:'+84'+phone.slice(1),phone_confirm:true,password,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}}))).user.id;
 cid=await ok(service.rpc('complete_customer_auth',{p_auth_id:uid,p_phone:phone,p_name:'Support verification'}));
 const svc=await ok(service.from('service').select('id,service_name').eq('service_code','SPA01').single()),breed=(await ok(service.from('pet_breed').select('id').limit(1)))[0];
 pet=crypto.randomUUID();await ok(service.from('pet_profile').insert({id:pet,customer_id:cid,pet_code:'TEST-'+pet,pet_name:'Support pet',breed_id:breed.id}));
 aid=crypto.randomUUID();await ok(service.from('appointment').insert({id:aid,appointment_code:'TEST-'+aid,customer_id:cid,pet_id:pet,scheduled_start_at:new Date(Date.now()-172800000).toISOString(),scheduled_end_at:new Date(Date.now()-169200000).toISOString(),appointment_status:'completed'}));
 await ok(service.from('appointment_item').insert({appointment_id:aid,service_id:svc.id,is_primary:true,name_snapshot:svc.service_name,quantity:1,unit_price:100,duration_minutes:60,status:'completed'}));
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(!process.argv.includes('--deployed'))for(const path of ['scripts/shared/support-handler.js','pages/user/modules/support/support-create.js','pages/user/modules/support/support-create.html','pages/user/modules/support/support.js','pages/user/modules/support/support.html'])await page.route('**/'+path+'*',r=>r.fulfill({contentType:path.endsWith('.html')?'text/html':'application/javascript',body:fs.readFileSync(path,'utf8')}));
 await page.goto('https://pawpalgr3.vercel.app/login');await page.locator('#loginPhone').fill(phone);await page.locator('#btnLoginContinue').click();await page.locator('#loginPassword').fill(password);await page.locator('#btnLoginSubmit').click();await page.waitForURL(/\/user\/?/,{timeout:45000});await page.waitForFunction(()=>Boolean(window.API?.getUserBookings));
 await page.evaluate(id=>{location.hash='booking-detail?id='+id;},aid);await page.locator('#btnServiceComplaintDetail').waitFor();await page.locator('#btnServiceComplaintDetail').click();
 await page.waitForFunction(id=>document.querySelector('#serviceBookingSelect')?.value===id,aid);
 assert.equal(await page.locator('#createComplaintForm input[type="file"]').count(),0);
 await page.locator('#btnSubmitComplaint').click();assert.ok((await page.locator('#supportCreateError').textContent()).length>0);
 await page.locator('#ticketTitle').fill('Cloud service complaint verification');await page.locator('#ticketContent').fill('Actual customer complaint <b>plain text</b>');
 await page.screenshot({path:infra+'/verification/customer-support-create.private.png'});
 const block=r=>r.abort();await page.route('**/rest/v1/rpc/create_own_support_ticket',block);await page.locator('#btnSubmitComplaint').click();await page.waitForFunction(()=>document.querySelector('#supportCreateError')?.textContent.length>0);
 assert.equal((await ok(service.from('support_ticket').select('id').eq('customer_id',cid))).length,0);assert.equal(await page.locator('#ticketContent').inputValue(),'Actual customer complaint <b>plain text</b>');
 await page.unroute('**/rest/v1/rpc/create_own_support_ticket',block);const response=page.waitForResponse(r=>r.url().includes('/rpc/create_own_support_ticket')&&r.request().method()==='POST');await page.locator('#btnSubmitComplaint').click();const saved=await response;assert.equal(saved.status(),200);ticket=await saved.json();
 await page.waitForURL(/#support$/);await page.locator(`.btn-view-ticket[data-id="${ticket}"]`).waitFor();
 const row=await ok(service.from('support_ticket').select('id,customer_id,appointment_id,created_by_account_id,status,ticket_code').eq('id',ticket).single());assert.equal(row.customer_id,cid);assert.equal(row.appointment_id,aid);assert.equal(row.created_by_account_id,uid);assert.equal(row.status,'pending');
 const account=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8'),admin=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
 await ok(admin.auth.signInWithPassword({email:account.match(/^Email: (.+)$/m)[1].trim(),password:account.match(/^Password: (.+)$/m)[1].trim()}));
 const adminRow=await ok(admin.from('support_ticket').select('id,appointment_id,customer_id').eq('id',ticket).single());assert.equal(adminRow.appointment_id,aid);assert.equal(adminRow.customer_id,cid);await admin.auth.signOut();
 const retry=await page.evaluate(async args=>{const r=await getSupabaseClient().rpc('create_own_support_ticket',args);return{data:r.data,error:r.error?.code};},saved.request().postDataJSON());assert.equal(retry.data,ticket);assert.equal(retry.error,undefined);
 assert.equal((await ok(service.from('support_ticket_message').select('id').eq('ticket_id',ticket))).length,1);
 if(!process.argv.includes('--create-only')){
  await page.locator(`.btn-view-ticket[data-id="${ticket}"]`).click();await page.locator('#replyTextarea').fill('Additional verified information');await page.locator('#btnSendReply').click();await page.waitForFunction(()=>document.querySelector('#ticketTimelineMessages')?.textContent.includes('Additional verified information'));
  const staff=(await ok(service.from('staff').select('auth_user_id').limit(1)))[0];
  await ok(service.from('support_ticket_message').insert({ticket_id:ticket,sender_type:'staff',sender_account_id:staff.auth_user_id,content:'PRIVATE-STAFF-NOTE',is_internal:true}));
  await ok(service.from('support_ticket_message').insert({ticket_id:ticket,sender_type:'staff',sender_account_id:staff.auth_user_id,content:'Public shop response',is_internal:false}));
  await page.waitForFunction(()=>document.querySelector('#ticketTimelineMessages')?.textContent.includes('Public shop response'),{timeout:20000});assert.equal((await page.locator('#ticketTimelineMessages').textContent()).includes('PRIVATE-STAFF-NOTE'),false);
  await ok(service.from('support_ticket').update({status:'resolved',resolution_note:'Shop resolution for verification',investigation_note:'PRIVATE-INVESTIGATION'}).eq('id',ticket));
  await page.locator('#ratingFeedbackArea').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#detailTicketStatusBadge')?.textContent.includes('Đã giải quyết'),{timeout:20000});
  assert.equal((await page.locator('#ticketDetailModalOverlay').textContent()).includes('PRIVATE-INVESTIGATION'),false);
  await page.locator('#btnCancelRatingAction').click();await page.locator('#ticketDetailModalOverlay').waitFor({state:'hidden'});await page.locator(`.btn-view-ticket[data-id="${ticket}"]`).click();
  await page.locator('.star-btn[data-value="4"]').click();await page.locator('#ratingComment').fill('Verified support rating');await page.locator('#btnSubmitRating').click();await page.waitForFunction(()=>document.querySelector('#btnSubmitRating')?.textContent==='Đã đánh giá');
  const rated=await ok(service.from('support_ticket').select('status,rating').eq('id',ticket).single());assert.equal(rated.status,'resolved');assert.equal(rated.rating,4);
  const native=await page.evaluate(async()=>{const r=await getSupabaseClient().from('support_ticket').select('investigation_note');return{length:r.data?.length,error:r.error?.code};});assert.equal(native.length,0);
  await page.screenshot({path:infra+'/verification/customer-support-detail.private.png'});await page.keyboard.press('Escape');await page.locator('#ticketDetailModalOverlay').waitFor({state:'hidden'});
  await page.locator(`.btn-view-ticket[data-id="${ticket}"]`).click();await page.locator('#btnCloseDetailPanel').click();await page.locator('#ticketDetailModalOverlay').waitFor({state:'hidden'});
  await page.locator(`.btn-view-ticket[data-id="${ticket}"]`).click();await page.locator('#ticketDetailModalOverlay').click({position:{x:5,y:5}});await page.locator('#ticketDetailModalOverlay').waitFor({state:'hidden'});
  await page.locator(`.btn-view-ticket[data-id="${ticket}"]`).click();
  await page.evaluate(()=>{location.hash='bookings';});await page.locator('#bookingsList').waitFor();assert.equal(await page.locator('#ticketDetailModalOverlay').count(),0);
  await page.evaluate(()=>{location.hash='support';});await page.locator(`.btn-view-ticket[data-id="${ticket}"]`).waitFor();assert.equal(await page.locator('#ticketDetailModalOverlay').count(),1);
  await page.locator(`.btn-view-ticket[data-id="${ticket}"]`).click();await page.keyboard.press('Escape');await page.locator('#ticketDetailModalOverlay').waitFor({state:'hidden'});
  await page.reload();await page.locator(`.btn-view-ticket[data-id="${ticket}"]`).waitFor();assert.ok((await page.locator('#ticketsListTableBody').textContent()).includes(row.ticket_code));
 }
 const local=await page.evaluate(()=>['pawpal_support_tickets','pawpal_service_complaints','pawpal_order_complaints','pawpal_admin_customers_data'].filter(k=>localStorage.getItem(k)));assert.deepEqual(local,[]);
 assert.equal((await ok(service.from('payment').select('id').eq('customer_id',cid))).length,0);assert.equal((await ok(service.from('paw_point_transaction').select('id').eq('customer_id',cid))).length,0);assert.deepEqual(errors,[]);
 console.log('PASS Cloud service complaint handoff, failed-save draft, atomic acknowledged create/retry, owner link, live public replies and no private notes/local sync/money/points.');
 }catch(e){fs.writeFileSync(infra+'/verification/customer-support-error.private.txt',e.message.replaceAll(password,'[REDACTED]').replaceAll(phone,'[PHONE]'));if(page)await page.screenshot({path:infra+'/verification/customer-support-failure.private.png'}).catch(()=>{});throw Error('Customer support verification failed; private evidence saved.');}
 finally{
  if(browser)await browser.close();if(cid){const rows=await ok(service.from('support_ticket').select('id').eq('customer_id',cid));for(const t of rows){await ok(service.from('support_ticket_message').delete().eq('ticket_id',t.id));await ok(service.from('support_ticket').delete().eq('id',t.id));}}
  if(aid){await ok(service.from('appointment_item').delete().eq('appointment_id',aid));await ok(service.from('appointment').delete().eq('id',aid));}if(pet)await ok(service.from('pet_profile').delete().eq('id',pet));if(cid){for(const t of ['customer_membership','customer_phone','customer_profile'])await ok(service.from(t).delete().eq('customer_id',cid));await ok(service.from('customer').delete().eq('id',cid));}if(uid)await ok(service.auth.admin.deleteUser(uid));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
