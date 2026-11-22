// Compatibility imports must not reintroduce the retired staff-request workflow.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname.endsWith('.mjs')){const file=path.resolve('.','.'+u.pathname);assert.ok(file.startsWith(process.cwd()+path.sep));return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(file,'utf8')});}return route.fulfill({contentType:'text/html',body:'<main id="admin"></main><main id="customer"></main>'});});
 await page.goto('http://localhost:4567/');
 const result=await page.evaluate(async()=>{
  const {mountAdminStaffRequest}=await import('/pages/admin/modules/services/booking-staff-request.mjs');
  const {renderBookingStaffRequest,staffRequestLabel}=await import('/scripts/shared/booking-staff-request.mjs');
  let writes=0;const request={requested_staff_id:'legacy',status:'awaiting_customer',proposal_revision:'revision'};
  mountAdminStaffRequest(document.getElementById('admin'),request,{client:{rpc:()=>writes++},canWrite:true});
  renderBookingStaffRequest(document.getElementById('customer'),request,{onRespond:()=>writes++});
  return {buttons:document.querySelectorAll('button').length,forms:document.querySelectorAll('form').length,writes,label:staffRequestLabel(request,'Chờ xác nhận')};
 });
 assert.deepEqual(result,{buttons:0,forms:0,writes:0,label:'Chờ xác nhận'});
 console.log('PASS retired request/proposal compatibility modules expose no forms, buttons or writes; standard booking status is preserved.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});