const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const base='http://localhost:4567';
const html=`<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/pages/admin/admin.css"><link rel="stylesheet" href="/pages/admin/admin-components.css"><link rel="stylesheet" href="/pages/admin/modules/services/services.css">
<style>body{margin:0;padding:24px;background:#F4F8F5;font-family:Arial,sans-serif}.services-module{max-width:1050px;margin:auto}#adminStaffRequestPanel{padding:24px;background:rgba(255,255,255,.7);border-radius:9px}h4{color:#236B48;margin:0 0 12px}button,input,select{max-width:100%;box-sizing:border-box}p{line-height:1.6}[role=status]{color:#DC2626}</style></head><body><main class="services-module"><section id="adminStaffRequestPanel"></section></main></body></html>`;
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin!==base)return route.abort();
  if(url.pathname==='/admin')return route.fulfill({contentType:'text/html',body:html});
  const target=path.resolve('.','.'+url.pathname);assert.ok(target.startsWith(process.cwd()+path.sep));
  if(fs.existsSync(target))return route.fulfill({contentType:url.pathname.endsWith('.mjs')?'text/javascript':'text/css',body:fs.readFileSync(target,'utf8')});
  return route.fulfill({status:404,body:''});
 });
 await page.goto(base+'/admin#tab-service-detail');
 await page.evaluate(async()=>{
  const {mountAdminStaffRequest}=await import('/pages/admin/modules/services/booking-staff-request.mjs');
  window.booking={dbId:'11111111-1111-4111-8111-111111111111',status:'pending',requestedStaffId:'worker',requestedStaffName:'Nguyễn Thị Chăm Sóc',staffConfirmationStatus:'pending',scheduledStartAt:'2026-12-24T01:30:00Z',scheduledEndAt:'2026-12-24T02:30:00Z',updatedAt:'2026-11-22T01:00:00Z'};
  window.calls=[];window.saved=0;window.invalidated=[];window.PawpalDataStore={invalidate:key=>invalidated.push(key)};
  window.renderPanel=(options={})=>mountAdminStaffRequest(document.getElementById('adminStaffRequestPanel'),booking,{
   client:{rpc:async(name,args)=>{calls.push({name,args});if(window.delay)await new Promise(resolve=>window.release=resolve);if(window.fail)return {error:{message:window.fail}};return {data:booking.dbId};}},
   staff:[{id:'other',full_name:'Trần Văn Chăm Sóc',employment_status:'active'}],canWrite:true,canSchedule:true,canViewSchedule:true,
   onSaved:async()=>{saved++;if(window.refreshFail)throw Error('refresh failed');},...options});
  renderPanel();
 });
 assert.equal(await page.locator('[data-proposal-fields]').isVisible(),false);assert.equal(await page.locator('[data-shift-fields]').isVisible(),false);
 await page.screenshot({path:'docs/verification/booking-inline-confirmation-1280.png'});
 await page.getByRole('button',{name:'Điều chỉnh ca làm'}).click();
 assert.equal(await page.locator('[name=shiftStart]').inputValue(),'2026-12-24T08:30');
 await page.locator('[name=shiftStart]').fill('2026-12-24T08:00');
 await page.evaluate(()=>{window.delay=true;});
 await page.getByRole('button',{name:'Phân công và xác nhận',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Phân công và xác nhận',exact:true}).isDisabled(),true);
 await page.evaluate(()=>{window.delay=false;release();});
 await page.waitForFunction(()=>saved===1);
 assert.equal(await page.evaluate(()=>location.hash),'#tab-service-detail');
 assert.equal(await page.evaluate(()=>calls.length),1);
 assert.equal(await page.evaluate(()=>calls[0].name),'confirm_booking_staff_with_schedule');
 assert.equal(await page.evaluate(()=>calls[0].args.p_shift_start),'2026-12-24T01:00:00.000Z');
 assert.deepEqual(await page.evaluate(()=>invalidated),['staff:schedules*']);
 // A retry after a lost response retains its request ID.
 await page.evaluate(()=>{calls=[];window.fail='network failure';renderPanel();});
 await page.getByRole('button',{name:'Phân công và xác nhận',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[role=status]').textContent==='network failure');
 await page.evaluate(()=>{window.fail=null;});
 await page.getByRole('button',{name:'Phân công và xác nhận',exact:true}).click();
 await page.waitForFunction(()=>calls.length===2&&saved===2);
 assert.equal(await page.evaluate(()=>calls[0].args.p_request===calls[1].args.p_request),true);
 // Proposal fields and their required reason never obstruct exact confirmation.
 await page.evaluate(()=>{calls=[];renderPanel();});
 await page.getByRole('button',{name:'Đề xuất thay đổi',exact:true}).click();
 await page.locator('[name=staff]').selectOption('other');
 await page.locator('[name=note]').fill('Khách đồng ý đổi nhân viên');
 await page.getByRole('button',{name:'Gửi đề xuất cho khách',exact:true}).click();
 await page.waitForFunction(()=>calls.length===1&&saved===3);
 assert.equal(await page.evaluate(()=>calls[0].name),'propose_booking_staff');
 assert.equal(await page.evaluate(()=>calls[0].args.p_staff),'other');
 // Server rejection is shown without claiming confirmation.
 await page.evaluate(()=>{window.fail='staff_not_available';renderPanel();});
 await page.getByRole('button',{name:'Phân công và xác nhận',exact:true}).click();
 await page.getByText('Nhân viên có lịch nghỉ hoặc không thể nhận ca trong khoảng giờ này.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Phân công và xác nhận',exact:true}).isEnabled(),true);
 // Exact confirmation is independent of the empty proposal fields.
 await page.evaluate(()=>{window.fail=null;calls=[];renderPanel();});
 await page.getByRole('button',{name:'Đề xuất thay đổi',exact:true}).click();
 await page.getByRole('button',{name:'Phân công và xác nhận',exact:true}).click();
 await page.waitForFunction(()=>saved===4);assert.equal(await page.evaluate(()=>calls[0].name),'confirm_booking_staff_with_schedule');
 // A successful save followed by a refresh failure must not enable another write.
 await page.evaluate(()=>{window.refreshFail=true;renderPanel();});
 await page.getByRole('button',{name:'Phân công và xác nhận',exact:true}).click();
 await page.getByText('Đã lưu thành công nhưng chưa tải lại được hồ sơ. Vui lòng mở lại để kiểm tra.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Phân công và xác nhận',exact:true}).isDisabled(),true);
 // Read-only access, pending customer consent and confirmed summaries.
 await page.evaluate(()=>{window.refreshFail=false;renderPanel({canWrite:false});});assert.equal(await page.locator('button').count(),0);
 await page.evaluate(()=>{booking.staffConfirmationStatus='awaiting_customer';renderPanel();});assert.equal(await page.locator('[data-confirm]').count(),0);
 await page.evaluate(()=>{booking.staffConfirmationStatus='confirmed';booking.status='confirmed';renderPanel();});
 assert.equal(await page.locator('[data-confirm]').count(),0);assert.equal(await page.getByRole('link',{name:'Xem lịch nhân sự'}).getAttribute('href'),'#tab-staff-schedule');
 await page.getByRole('button',{name:'Đề xuất thay đổi',exact:true}).click();assert.equal(await page.locator('[data-proposal-fields]').isVisible(),true);
 // Both open panels remain usable without horizontal scrolling on mobile.
 await page.evaluate(()=>{booking.status='pending';booking.staffConfirmationStatus='pending';renderPanel();});
 await page.setViewportSize({width:390,height:900});
 await page.getByRole('button',{name:'Điều chỉnh ca làm'}).click();await page.getByRole('button',{name:'Đề xuất thay đổi',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'docs/verification/booking-inline-confirmation-390.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS inline confirmation UI: collapsed alternatives, editable shift, one atomic RPC, retry ID, no navigation, permission/consent states, proposal and desktop/mobile layout. Isolated transport only.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
