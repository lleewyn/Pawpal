// Live UI navigation/prefill and transaction-bound real Supabase completion; no mocked business data.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
if(!process.argv.includes('--run'))process.exit(0);
const ticket='7f126cf4-027c-4084-9f61-50cc0a084f0b',original='b291cffd-0487-4fdd-8647-bcde6e9ce8ed',other='a2a90a14-c19a-4348-ba28-e529ab80d38d';
(async()=>{const db=await connect(),browser=await chromium.launch({channel:'chrome',headless:true}),folder='docs/verification/complaint-service-redo';fs.mkdirSync(folder,{recursive:true});let tx=false,page;const checks=[],errors=[],pass=s=>{checks.push(s);console.log('PASS',s);};
 try{
  page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().includes('[Booking preset]'))console.log(m.text());});
  const credentials=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');
  await page.goto('http://localhost:4001/admin/login');await page.fill('#inputAdminEmail',credentials.match(/^Email: (.+)$/m)[1].trim());await page.fill('#inputAdminPassword',credentials.match(/^Password: (.+)$/m)[1].trim());await page.click('#btnSubmitAdminLogin');await page.waitForURL(u=>!u.pathname.includes('login'));
  await page.goto('http://localhost:4001/pages/admin/index.html#tab-service-detail?id='+other);
  await page.waitForFunction(()=>document.querySelector('#detailBookingCode')?.textContent==='APP-1792243100418');
  const complaint=async()=>{
   await page.evaluate(id=>{location.hash='#tab-complaint-detail?id='+id;},ticket);
   await page.waitForFunction(id=>document.querySelector('#viewTicketCode')?.textContent.replace(/^KH-/,'').replace(/-/g,'').toLowerCase()===id.replace(/-/g,'')&&document.querySelector('#btnOpenComplaintSource')?.isConnected,ticket);
  };
  await complaint();await page.click('#btnOpenComplaintSource');
  await page.waitForFunction(()=>document.querySelector('#detailBookingCode')?.textContent==='APP-1792228688726'&&document.querySelector('#detailCustomerPhone')?.textContent==='0834562948');
  assert.match(await page.locator('#detailCustomerName').textContent(),/Thi/);
  await page.screenshot({path:folder+'/01-correct-original-service.png'});pass('Cached services navigation opens Thi original APP-1792228688726, not Khanh previous appointment');
  await page.locator('#detailCustomerName').scrollIntoViewIfNeeded();await page.screenshot({path:folder+'/01-correct-original-customer.png'});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#detailBookingCode')?.textContent==='APP-1792228688726');pass('Reload retains the correct source appointment');
  await complaint();await page.click('#btnCompleteComplaint');await page.fill('#complaintEvidenceSearch','BKG-53D78');
  await page.locator('#complaintEvidenceDropdown button[disabled]').waitFor();
  assert.match(await page.locator('#complaintEvidenceDropdown').textContent(),/Khác gói dịch vụ gốc/);assert.equal(await page.locator('#btnConfirmResolveTicket').isDisabled(),true);
  await page.screenshot({path:folder+'/02-existing-redo-package-mismatch.png'});pass('Existing redo shows precise package mismatch and cannot be selected');
  await page.locator('#resolveTicketModalOverlay [data-close-modal]').first().click();await page.click('#btnCreateComplaintRedo');
  await page.waitForFunction(()=>document.querySelector('#modalCreateBooking')?.classList.contains('active')&&document.querySelector('#newBookingServiceSelect')?.dataset.serviceId==='c0000000-0000-0000-0000-000000000003');
  assert.equal(await page.locator('#newBookingPhone').inputValue(),'0834562948');assert.match(await page.locator('#bookingSelectedPetCard').textContent(),/High/);assert.equal(await page.locator('#newBookingCategory').inputValue(),'Spa');
  assert.match(await page.locator('#newBookingNotes').inputValue(),/KH-7F126CF4/);
  await page.screenshot({path:folder+'/03-prefilled-redo-booking.png'});pass('Create redo automatically selects Thi, her phone, High and original specialized spa package');
  await page.locator('#modalCreateBooking [data-close-modal]').first().click();await complaint();
  const before=(await db.query('SELECT to_jsonb(t) value FROM public.support_ticket t WHERE id=$1',[ticket])).rows[0].value;
  const actor=await page.evaluate(async()=> (await getSupabaseClient().auth.getUser()).data.user.id);
  await db.query("BEGIN;SET LOCAL statement_timeout='10s';SET LOCAL lock_timeout='3s'");tx=true;
  const fixture=randomUUID(),code='QA-REDO-'+fixture.slice(0,8).toUpperCase();
  await db.query("INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,appointment_status) SELECT $1,$2,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,'da_hoan_tat' FROM public.appointment WHERE id=$3",[fixture,code,original]);
  await db.query("INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes,status) SELECT $1,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes,'completed' FROM public.appointment_item WHERE appointment_id=$2",[fixture,original]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actor]);await db.query('SET LOCAL ROLE authenticated');
  // Forward only this scenario's reads/actions into the rollback transaction.
  await page.route('**/rest/v1/appointment?*',async route=>{
   const u=new URL(route.request().url());if(!u.searchParams.has('appointment_status')||!u.searchParams.has('pet_id'))return route.continue();
   const cid=u.searchParams.get('customer_id').slice(3),pid=u.searchParams.get('pet_id').slice(3);
   const data=(await db.query("SELECT a.id,a.appointment_code,a.scheduled_start_at,a.created_at,coalesce((SELECT jsonb_agg(jsonb_build_object('service_id',i.service_id,'name_snapshot',i.name_snapshot)) FROM public.appointment_item i WHERE i.appointment_id=a.id),'[]') items FROM public.appointment a WHERE a.customer_id=$1 AND a.pet_id=$2 AND a.appointment_status IN ('completed','da_hoan_tat','done') ORDER BY a.id",[cid,pid])).rows;
   await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.route('**/rest/v1/rpc/*',async route=>{
   const name=new URL(route.request().url()).pathname.split('/').pop(),args=route.request().postDataJSON();
   const allowed={act_admin_complaint:['p_request_id','p_ticket_id','p_expected_updated_at','p_action','p_details'],admin_complaint_page:['p_kind','p_filters','p_page','p_size','p_context'],admin_complaint_action_summary:['p_ticket']};
   if(!allowed[name])return route.continue();const keys=allowed[name];
   const values=keys.map(k=>args[k]&&typeof args[k]==='object'?JSON.stringify(args[k]):args[k]);
   try{const data=(await db.query(`SELECT public.${name}(${keys.map((k,i)=>k+'=> $'+(i+1)).join(',')}) value`,values)).rows[0].value;await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});}
   catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:e.code,message:e.message})});}
  });
  await page.click('#btnCompleteComplaint');await page.fill('#complaintEvidenceSearch',code);await page.locator('#complaintEvidenceDropdown button:not([disabled])').first().click();
  assert.equal(await page.locator('#complaintEvidenceId').inputValue(),fixture);await page.fill('#inputResolveNote','Đã làm lại đúng gói dịch vụ gốc cho bé và xác minh kết quả.');
  await page.screenshot({path:folder+'/04-completed-redo-selected-rollback.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:folder+'/04-completed-redo-mobile-rollback.png'});await page.setViewportSize({width:1440,height:1000});
  await page.click('#btnConfirmResolveTicket');await page.waitForFunction(()=>document.querySelector('#viewTicketStatusBadge')?.textContent==='Đã giải quyết');
  assert.equal((await db.query('SELECT status FROM public.support_ticket WHERE id=$1',[ticket])).rows[0].status,'resolved');
  await page.waitForFunction(id=>document.querySelector('#complaintLinkedResults')?.textContent.includes(id),fixture);
  await page.screenshot({path:folder+'/05-complaint-resolved-rollback.png'});pass('UI links completed Vietnamese-status redo and real database resolves complaint');
  await db.query('ROLLBACK');tx=false;assert.deepEqual((await db.query('SELECT to_jsonb(t) value FROM public.support_ticket t WHERE id=$1',[ticket])).rows[0].value,before);
  assert.equal((await db.query('SELECT 1 FROM public.appointment WHERE id=$1',[fixture])).rowCount,0);pass('Test appointment, complaint completion and history rolled back');
  assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
  fs.writeFileSync(folder+'/ui-verification.txt',JSON.stringify({status:'PASS',timestamp:new Date().toISOString(),checks,scope:'Live HTTP navigation/prefill; real transaction-bound Supabase RPC completion; synthetic completed redo fixture rolled back; original mismatched BKG unchanged'},null,2)+'\n');
 }catch(e){if(page)await page.screenshot({path:folder+'/debug-failure.png'}).catch(()=>{});console.error('Browser errors:',errors);throw e;}
 finally{if(tx)await db.query('ROLLBACK').catch(()=>{});await db.end();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
