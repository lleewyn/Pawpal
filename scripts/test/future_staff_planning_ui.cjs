const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin!=='http://localhost')return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<html><body class="admin-body"><main style="height:100vh;overflow:auto;padding:24px"><div class="staff-module"><section id="recurring"></section></div><div class="services-module"><section id="adminRequest"></section></div><section id="customerRequest"></section></main></body></html>'});
  const file=path.join(process.cwd(),url.pathname);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
  return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(file,'utf8')});
 });await page.goto('http://localhost/');
 for(const file of ['pages/admin/admin.css','pages/admin/modules/staff/staff.css','pages/admin/modules/services/services.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
 await page.evaluate(async()=>{
  const {mountRecurringSchedule}=await import('/pages/admin/modules/staff/staff-recurring.mjs');window.rows=[];window.calls=[];
  const client={from:()=>{const query={select:()=>query,order:()=>query,range:async()=>({data:rows})};return query;},rpc:async(name,args)=>{calls.push({name,args});rows=[{id:args.p_id,...args.p_details,updated_at:new Date().toISOString()}];return {data:args.p_id};}};
  await mountRecurringSchedule(document.getElementById('recurring'),{staff:[{rawId:'a',name:'Nguyễn Văn A',status:'ACTIVE'}],client});
 });
 assert.match(await page.locator('#recurring').innerText(),/Chưa có lịch làm việc định kỳ/);
 await page.locator('#recurring select[name="staff"]').selectOption('a');
 await page.locator('#recurring input[name="weekday"][value="1"]').check();await page.locator('#recurring input[name="weekday"][value="3"]').check();
 await page.locator('#recurring input[name="start"]').fill('08:00');await page.locator('#recurring input[name="end"]').fill('17:00');await page.locator('#recurring [data-save]').click();
 await page.waitForFunction(()=>calls.length===1);assert.deepEqual(await page.evaluate(()=>calls[0].args.p_details.weekdays),[1,3]);
 assert.match(await page.locator('.staff-recurring-list').innerText(),/Nguyễn Văn A/);assert.match(await page.locator('.staff-recurring-list').innerText(),/08:00–17:00/);
 await page.locator('#recurring [data-edit]').click();await page.locator('#recurring [name="active"]').uncheck();await page.locator('#recurring [data-save]').click();
 await page.waitForFunction(()=>calls.length===2);assert.ok(await page.evaluate(()=>calls[1].args.p_revision));assert.equal(await page.evaluate(()=>calls[1].args.p_details.is_active),false);
 await page.evaluate(async()=>{
  const {mountAdminStaffRequest}=await import('/pages/admin/modules/services/booking-staff-request.mjs');window.adminCalls=[];window.savedCount=0;
  window.booking={dbId:'booking',id:'BKG-TEST',status:'pending',requestedStaffId:'a',requestedStaffName:'Nguyễn Văn A',staffConfirmationStatus:'pending',scheduledStartAt:'2030-01-01T07:00:00Z',updatedAt:'revision'};
  mountAdminStaffRequest(document.getElementById('adminRequest'),booking,{client:{rpc:async(name,args)=>{adminCalls.push({name,args});return name==='update_admin_service_booking'?{error:{message:'requested_staff_schedule_required'}}:{data:'booking'};}},staff:[{id:'b',full_name:'Nhân viên B',employment_status:'active'}],onSaved:async()=>savedCount++,canWrite:true,errorMessage:()=> 'Cần phân ca cụ thể cho đúng nhân viên khách yêu cầu.'});
 });
 await page.locator('#adminRequest [data-confirm]').click();assert.match(await page.locator('#adminRequest [role="status"]').innerText(),/Cần phân ca cụ thể/);assert.equal(await page.evaluate(()=>savedCount),0);
 await page.locator('#futureBookingStaff').selectOption('b');await page.locator('#adminRequest [name="note"]').fill('Nhân viên yêu cầu nghỉ, đề xuất người khác');await page.locator('#adminRequest [data-propose]').click();
 assert.equal(await page.evaluate(()=>savedCount),1);assert.equal(await page.evaluate(()=>booking.requestedStaffId),'a');assert.equal(await page.evaluate(()=>adminCalls[1].name),'propose_booking_staff');
 await page.evaluate(async()=>{
  const {renderBookingStaffRequest}=await import('/scripts/shared/booking-staff-request.mjs');window.responses=[];
  window.request={requested_staff_id:'a',requested_staff_name:'Nguyễn Văn A',status:'awaiting_customer',proposal_staff_id:'b',proposal_staff_name:'Nhân viên B',proposal_start_at:'2030-01-01T07:00:00Z',proposal_end_at:'2030-01-01T08:30:00Z',proposal_revision:'proposal'};
  window.renderRequest=()=>renderBookingStaffRequest(document.getElementById('customerRequest'),request,{onRespond:async(accept,revision)=>{responses.push({accept,revision});request.status=accept?'confirmed':'pending';renderRequest();}});renderRequest();
 });
 assert.match(await page.locator('#customerRequest').innerText(),/Lịch hiện tại được giữ nguyên/);
 await page.getByRole('button',{name:'Giữ yêu cầu ban đầu',exact:true}).click();assert.equal(await page.evaluate(()=>responses[0].accept),false);assert.match(await page.locator('#customerRequest').innerText(),/Chờ xác nhận nhân viên/);
 await page.evaluate(()=>{request.status='awaiting_customer';renderRequest();});await page.getByRole('button',{name:'Đồng ý thay đổi',exact:true}).click();assert.equal(await page.evaluate(()=>responses[1].accept),true);assert.match(await page.locator('#customerRequest').innerText(),/Nhân viên đã xác nhận/);
 for(const width of [1280,390]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`docs/verification/sync/future-staff-planning-${width}.png`,fullPage:true,animations:'disabled'});}
 assert.deepEqual(errors,[]);console.log('PASS recurring create/edit/deactivate, unresolved request warning, Admin proposal without automatic assignment, customer accept/reject and desktop/mobile layout. Isolated component transport; no live bookings.');
}finally{await browser.close();}})().catch(error=>{console.error(error.stack);process.exitCode=1;});
