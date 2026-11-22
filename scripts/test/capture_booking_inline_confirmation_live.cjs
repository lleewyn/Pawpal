// Read-only visual verification against the local app and live Supabase data.
// Opens existing booking forms; never confirms, proposes or edits a booking.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{
 const db=await connect();let booking;
 try{booking=(await db.query("select id from public.appointment where requested_staff_id is not null and appointment_status='pending' and staff_confirmation_status='pending' order by scheduled_start_at desc limit 1")).rows[0];}
 finally{await db.end();}
 assert.ok(booking,'No pending staff-request booking is available for read-only capture.');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const credentials=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');
  await page.goto('http://localhost:4000/admin/login');
  await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());
  await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());
  await page.locator('#btnSubmitAdminLogin').click();
  await page.waitForURL(url=>!url.pathname.includes('/login'),{timeout:45000});
  await page.evaluate(id=>{sessionStorage.setItem('pawpal_admin_service_selected_id',id);location.hash='tab-service-detail';},booking.id);
  const panel=page.locator('#adminStaffRequestPanel');
  await panel.getByRole('button',{name:'Phân công và xác nhận',exact:true}).waitFor({timeout:45000});
  assert.equal(await page.locator('#detailBookingActionButtons .btn-action-confirm').count(),0,'one confirmation flow in the profile');
  assert.equal(await page.locator('#btnDetailQuickChangeStaff').isVisible(),false,'staff changes use the proposal flow');
  assert.equal(await panel.evaluate(node=>node.previousElementSibling?.classList.contains('service-detail-header-bar')),true,'profile heading precedes assignment');
  await page.evaluate(()=>document.fonts.ready);
  if(process.argv.includes('--reassignment')){
   await page.evaluate(id=>PawpalServices.subtabs.bookings.openChangeStaffModal(id),booking.id);
   const modal=page.locator('#modalChangeStaff');
   await modal.getByRole('button',{name:'Gửi đề xuất cho khách',exact:true}).waitFor();
   await page.waitForFunction(()=>document.getElementById('changeStaffSelect').options.length>1,{},{timeout:30000});
   const target=await modal.locator('#changeStaffSelect').evaluate(select=>select.options[1].textContent);
   await modal.locator('#changeStaffSelect').evaluate((select,name)=>{select._entityInput.focus();select._entityInput.value=name;select._entityInput.dispatchEvent(new Event('input',{bubbles:true}));},target);
   await modal.locator('#changeStaffSelect').locator('..').getByRole('button',{name:target,exact:true}).click();
   await modal.locator('#changeStaffProposalReason').fill('Nhân viên khách yêu cầu không thể nhận lịch, đề xuất người thay thế.');
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    await page.screenshot({path:`docs/verification/booking-reassignment-live-${width}.png`});
    assert.equal(await modal.locator('input[name=changeStaffScope]').isVisible(),false);
    const overflow=await modal.evaluate(node=>[...node.querySelectorAll('*')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).map(e=>e.id||e.className));
    assert.deepEqual(overflow,[]);
   }
   console.log(JSON.stringify({result:'Live alternative-proposal modal captured. No booking, proposal or shift writes.',errors}));
   return;
  }
  await panel.scrollIntoViewIfNeeded();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await panel.scrollIntoViewIfNeeded();
   const prefix=`docs/verification/booking-inline-live-${width}`;
   await page.screenshot({path:prefix+'-default.png'});
   await panel.getByRole('button',{name:'Điều chỉnh ca làm',exact:true}).click();
   await panel.locator('[name=shiftStart]').waitFor();
   await page.screenshot({path:prefix+'-shift.png'});
   await panel.getByRole('button',{name:'Điều chỉnh ca làm',exact:true}).click();
   await panel.getByRole('button',{name:'Đề xuất thay đổi',exact:true}).click();
   await panel.locator('[name=note]').waitFor();
   await page.waitForFunction(()=>document.getElementById('futureBookingStaff')?.options.length>1||(!document.querySelector('#adminStaffRequestPanel [role="status"]').textContent.includes('Đang tải')&&document.querySelector('#adminStaffRequestPanel [role="status"]').textContent.length>0),{},{timeout:30000});
   await page.screenshot({path:prefix+'-proposal.png'});
   await panel.screenshot({path:prefix+'-panel.png'});
   const measurements=await panel.evaluate(node=>({width:innerWidth,right:node.getBoundingClientRect().right,
    overflow:[...node.querySelectorAll('*')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className}))}));
   assert.deepEqual(measurements.overflow,[],JSON.stringify(measurements));
   await panel.getByRole('button',{name:'Đề xuất thay đổi',exact:true}).click();
  }
  console.log(JSON.stringify({result:'Live screenshots captured from complete service profile. No booking writes.',errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
