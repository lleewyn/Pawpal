const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const evidenceDir=fs.mkdtempSync(path.join(os.tmpdir(),'pawpal-intake-validation-'));
 const requests=[];
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 page.on('request', request=>requests.push(new URL(request.url()).pathname));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.origin!=='http://localhost')return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><body class="admin-body"><meta charset="utf-8"><link rel="stylesheet" href="/pages/admin/admin.css"><link rel="stylesheet" href="/pages/admin/modules/services/services.css"><link rel="stylesheet" href="/pages/admin/modules/services/services-v8.css">'+fs.readFileSync('my-client/pages/admin/modules/services/services.html','utf8')});
  if(u.pathname.endsWith('/intake-media.mjs'))return route.fulfill({contentType:'text/javascript',body:'export const createIntakeMediaEditor=()=>({reset(){},close(){},prepare(){window.prepares++;return []},saved(){}});'});
  const file=path.join(process.cwd(),'my-client',decodeURIComponent(u.pathname));if(!fs.existsSync(file))return route.abort();
  return route.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(file,'utf8')});
 });
 await page.goto('http://localhost/');
 await page.evaluate(async()=>{
  const {loadIntakeStaffPicker}=await import('/scripts/shared/intake-staff-picker.mjs');
  window.modal=document.getElementById('modalEditIntakeInfo')||document.getElementById('modalIntakeSafety');modal.dataset.bookingId='BOOKING-QA';modal.classList.add('active');modal.style.display='flex';
  window.select=document.getElementById('intakeStaffSelect');window.submit=document.getElementById('intakeModalSubmitBtn')||document.getElementById('btnSubmitIntakeRecord');
  select._entityInput=document.createElement('input');select.after(select._entityInput);
  const popover=document.createElement('div');popover.id='intakePickerTestPopover';popover.className='customer-autocomplete-popover';popover.textContent='KTV cũ không đủ cấp độ';select.after(popover);
  window.run=data=>loadIntakeStaffPicker({db:{rpc:async()=>({data})},bookingId:'booking-id',modal,select,submit});
  await run({staff:[],required_levels:['KTV chuyên nghiệp'],assigned_staff_id:'unqualified'});
 });
 assert.equal(await page.locator('#intakeStaffSelect').isDisabled(),true);
 assert.match(await page.locator('.intake-staff-hint').innerText(),/KTV chuyên nghiệp.*Chưa có KTV đủ điều kiện/);
 assert.equal(await page.evaluate(()=>submit.disabled),false);
 assert.equal(await page.evaluate(()=>select._entityInput.disabled),true);
 assert.equal(await page.locator('#intakePickerTestPopover').textContent(),'');
 await page.screenshot({path:path.join(evidenceDir,'01-khong-co-ky-thuat-vien.png'),fullPage:true});
 await page.evaluate(()=>run({staff:[{id:'qualified',full_name:'KTV đủ cấp độ',level_name:'KTV chuyên nghiệp'}],required_levels:['KTV chuyên nghiệp'],assigned_staff_id:'unqualified'}));
 assert.equal(await page.locator('#intakeStaffSelect').inputValue(),'');assert.equal(await page.evaluate(()=>submit.disabled),false);
 assert.equal(await page.evaluate(()=>select._entityInput.disabled),false);
 await page.locator('#intakeStaffSelect').selectOption('qualified');assert.equal(await page.evaluate(()=>submit.disabled),false);
 assert.equal(await page.evaluate(()=>modal.intakeStaffCandidates[0].id),'qualified');
 await page.screenshot({path:path.join(evidenceDir,'02-ky-thuat-vien-du-dieu-kien.png'),fullPage:true});
 await page.evaluate(async()=>{await run({staff:[],required_levels:[],assigned_staff_id:null});});assert.equal(await page.evaluate(()=>submit.disabled),false);
 await page.evaluate(async()=>{
  const {loadIntakeStaffPicker}=await import('/scripts/shared/intake-staff-picker.mjs');
  window.older=loadIntakeStaffPicker({db:{rpc:()=>new Promise(resolve=>{window.resolveOld=resolve;})},bookingId:'booking-id',modal,select,submit});
  await run({staff:[],required_levels:['Mới'],assigned_staff_id:null});resolveOld({data:{staff:[{id:'stale',full_name:'Stale'}],required_levels:[]}});await older;
 });
 assert.equal(await page.locator('#intakeStaffSelect option[value="stale"]').count(),0);
 await page.evaluate(async()=>{
  const {loadIntakeStaffPicker}=await import('/scripts/shared/intake-staff-picker.mjs');
  await loadIntakeStaffPicker({db:{rpc:async()=>({error:{message:'RPC unavailable'}})},bookingId:'booking-id',modal,select,submit});
 });
 assert.match(await page.locator('.intake-staff-hint').innerText(),/Không tải được danh sách KTV/);
 assert.equal(await page.evaluate(()=>submit.disabled),false);
 assert.equal(requests.filter(request=>request==='/data/staff.json').length,0);
 await page.screenshot({path:path.join(evidenceDir,'03-loi-tai-ky-thuat-vien.png'),fullPage:true});
 console.log('Requests to /data/staff.json: 0');
 await page.evaluate(()=>{
  const select=document.getElementById('intakeStaffSelect');
  select._entityInput.remove();delete select._entityInput;
  window.prepares=0;window.savedIntakes=[];
  window.getSupabaseClient=()=>({rpc:async()=>({data:{assigned_staff_id:'unavailable',required_levels:['Master Groomer'],staff:[{id:'qualified',full_name:'Trần Minh Khoa',level_name:'Master Groomer'}]}})});
  window.PawpalServices={state:{bookingsData:[{id:'TEST-01',dbId:'TEST-01',status:'confirmed',petName:'Milo'}]},
   saveBookingRecord:async(...args)=>savedIntakes.push(args),showToast(){},errorMessage:error=>error.message};
  document.getElementById('modalEditIntakeInfo').classList.remove('active');
 });
 await page.setViewportSize({width:1280,height:1220});
 await page.addScriptTag({path:'my-client/pages/admin/modules/services/subtabs/tab-service-bookings.js'});
 await page.evaluate(()=>PawpalServices.subtabs.bookings.openIntakeModal('TEST-01'));
 const save=page.locator('#intakeModalSubmitBtn');
 await page.waitForFunction(()=>document.getElementById('intakeModalSubmitBtn')?.disabled===false);
 await save.click();
 for(const field of ['intakePetWeightInput','intakeStaffSelect','checkSkinNormal','checkEyesEarsNormal','checkWoundNone','intakeTemperamentCalm','intakeCustomerConfirmed']){
  assert.equal(await page.locator('#'+field+'Error').isVisible(),true,field);
 }
 assert.equal(await page.locator('#intakePetWeightInput').evaluate(input=>input===document.activeElement),true);
 assert.deepEqual(await page.evaluate(()=>[prepares,savedIntakes.length]),[0,0]);
 await page.screenshot({path:path.join(evidenceDir,'04-thieu-truong-bat-buoc.png')});
 await page.locator('#intakePetWeightInput').fill('4');
 await page.locator('#intakeStaffSelect').selectOption('qualified');
 for(const field of ['checkSkinNormal','checkEyesEarsNormal','checkWoundNone','intakeTemperamentCalm'])await page.locator('#'+field).check();
 await save.click();
 await page.locator('#intakeCustomerConfirmedError').waitFor();
 assert.equal(await page.locator('#modalEditIntakeInfo [data-service-error]').count(),1);
 assert.deepEqual(await page.evaluate(()=>[prepares,savedIntakes.length]),[0,0]);
 await page.screenshot({path:path.join(evidenceDir,'05-thieu-xac-nhan-khach.png')});
 await page.locator('#intakeCustomerConfirmed').check();
 await save.click();
 await page.waitForFunction(()=>savedIntakes.length===1);
 assert.deepEqual(await page.evaluate(()=>[prepares,savedIntakes[0][2].customerConfirmed]),[1,true]);
 console.log('PASS intake picker and actual form: validation with no technician selected, all required errors, no upload or save without confirmation, valid submission. Fixture RPC only.',evidenceDir);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
