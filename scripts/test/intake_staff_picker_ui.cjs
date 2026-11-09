const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.origin!=='http://localhost')return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/pages/admin/admin.css"><link rel="stylesheet" href="/pages/admin/modules/services/services.css"><link rel="stylesheet" href="/pages/admin/modules/services/services-v8.css">'+fs.readFileSync('pages/admin/modules/services/services.html','utf8')});
  const file=path.join(process.cwd(),decodeURIComponent(u.pathname));if(!fs.existsSync(file))return route.abort();
  return route.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(file,'utf8')});
 });
 await page.goto('http://localhost/');
 await page.evaluate(async()=>{
  const {loadIntakeStaffPicker}=await import('/scripts/shared/intake-staff-picker.mjs');
  window.modal=document.getElementById('modalEditIntakeInfo')||document.getElementById('modalIntakeSafety');modal.dataset.bookingId='BOOKING-QA';modal.classList.add('active');modal.style.display='flex';
  window.select=document.getElementById('intakeStaffSelect');window.submit=document.getElementById('intakeModalSubmitBtn')||document.getElementById('btnSubmitIntakeRecord');
  window.run=data=>loadIntakeStaffPicker({db:{rpc:async()=>({data})},bookingId:'booking-id',modal,select,submit});
  await run({staff:[],required_levels:['KTV chuyên nghiệp'],assigned_staff_id:'unqualified'});
 });
 assert.equal(await page.locator('#intakeStaffSelect').isDisabled(),true);
 assert.match(await page.locator('.intake-staff-hint').innerText(),/KTV chuyên nghiệp.*Chưa có KTV đủ điều kiện/);
 assert.equal(await page.evaluate(()=>submit.disabled),true);
 await page.screenshot({path:'docs/verification/sync/intake-no-qualified-staff.png',fullPage:true});
 await page.evaluate(()=>run({staff:[{id:'qualified',full_name:'KTV đủ cấp độ',level_name:'KTV chuyên nghiệp'}],required_levels:['KTV chuyên nghiệp'],assigned_staff_id:'unqualified'}));
 assert.equal(await page.locator('#intakeStaffSelect').inputValue(),'');assert.equal(await page.evaluate(()=>submit.disabled),true);
 await page.locator('#intakeStaffSelect').selectOption('qualified');assert.equal(await page.evaluate(()=>submit.disabled),false);
 assert.equal(await page.evaluate(()=>modal.intakeStaffCandidates[0].id),'qualified');
 await page.evaluate(async()=>{await run({staff:[],required_levels:[],assigned_staff_id:null});});assert.equal(await page.evaluate(()=>submit.disabled),true);
 await page.evaluate(async()=>{
  const {loadIntakeStaffPicker}=await import('/scripts/shared/intake-staff-picker.mjs');
  window.older=loadIntakeStaffPicker({db:{rpc:()=>new Promise(resolve=>{window.resolveOld=resolve;})},bookingId:'booking-id',modal,select,submit});
  await run({staff:[],required_levels:['Mới'],assigned_staff_id:null});resolveOld({data:{staff:[{id:'stale',full_name:'Stale'}],required_levels:[]}});await older;
 });
 assert.equal(await page.locator('#intakeStaffSelect option[value="stale"]').count(),0);
 console.log('PASS intake picker: explicit empty/required level message; no invalid preselection; qualified choice enables submit; stale response ignored. Offline RPC fixtures only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
