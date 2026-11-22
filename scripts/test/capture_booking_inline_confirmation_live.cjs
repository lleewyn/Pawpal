// Read-only capture of the full service profile and its single reassignment flow.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{
 const db=await connect();let booking;
 try{booking=(await db.query("select id from public.appointment where requested_staff_id is not null and appointment_status='pending' order by scheduled_start_at desc limit 1")).rows[0];}finally{await db.end();}
 assert.ok(booking,'An existing pending booking is required for read-only capture.');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const credentials=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');
  await page.goto('http://localhost:4000/admin/login');
  await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());
  await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());
  await page.locator('#btnSubmitAdminLogin').click();await page.waitForURL(url=>!url.pathname.includes('/login'),{timeout:45000});
  await page.evaluate(id=>{sessionStorage.setItem('pawpal_admin_service_selected_id',id);location.hash='tab-service-detail';},booking.id);
  await page.locator('.service-detail-card').waitFor({timeout:45000});await page.getByRole('button',{name:'Phân công KTV',exact:true}).waitFor();
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#adminStaffRequestPanel').count(),0);
  assert.equal(await page.getByRole('button',{name:'Đề xuất thay đổi',exact:true}).count(),0);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await page.screenshot({path:`docs/verification/booking-scheduled-only-profile-${width}.png`});
   await page.getByRole('button',{name:'Phân công KTV',exact:true}).click();
   const modal=page.locator('#modalChangeStaff');await modal.getByRole('button',{name:'Xác nhận điều chuyển KTV',exact:true}).waitFor();
   await page.waitForFunction(()=>document.getElementById('changeStaffSelect').options.length>1||document.querySelector('#modalChangeStaff [data-service-error]'),null,{timeout:30000});
   assert.equal(await modal.locator('#changeStaffProposalFields').count(),0);
   await page.screenshot({path:`docs/verification/booking-scheduled-only-assignment-${width}.png`});
   assert.equal(await modal.evaluate(node=>[...node.querySelectorAll('*')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).length),0);
   await modal.getByRole('button',{name:'Đóng',exact:true}).click();
  }
  assert.deepEqual(errors,[]);console.log('PASS full live service profile and direct reassignment at desktop/mobile widths; no proposal panel, no booking writes.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});