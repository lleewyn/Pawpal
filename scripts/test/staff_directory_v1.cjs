// Read-only against the disposable restored database, never the live Cloud.
const assert=require('node:assert/strict');
const {service,admin,ok,browserPage,env}=require('./customer_completion_helpers.cjs');
(async()=>{const {browser,page}=await browserPage();try{
 const directory=await ok(admin.rpc('get_admin_staff_directory'));
 const staff=await ok(service.from('staff').select('id,full_name,auth_user_id'));
 assert.equal(directory.length,staff.length);
 for(const row of directory){assert.equal(row.staff_record.full_name,staff.find(s=>s.id===row.staff_record.id).full_name);assert.equal(row.auth_linked,!!row.staff_record.auth_user_id);assert.equal('encrypted_password' in row.staff_record,false);assert.equal('refresh_token' in row.staff_record,false);}
 const denied=await fetch('http://localhost:8011/rpc/get_admin_staff_directory',{method:'POST',headers:{apikey:env.ANON_KEY,'Content-Type':'application/json'},body:'{}'});assert.ok(denied.status>=400);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
 await page.locator('[data-title="Nhân sự"]').click();await page.waitForFunction(()=>window.PawpalStaff?.state.isLoaded||window.PawpalStaff?.state.loadError);
 const state=await page.evaluate(()=>({loaded:PawpalStaff.state.isLoaded,count:PawpalStaff.state.staff.length,error:PawpalStaff.state.loadError,assessments:PawpalStaff.state.assessments.length}));assert.equal(state.loaded,true,JSON.stringify({state,errors}));assert.equal(state.count,staff.length);
 for(const filter of ['ASSIGNED','UNASSIGNED']){
  await page.locator('#staffFilterShift').selectOption(filter);
  const source=await page.evaluate(filter=>PawpalStaff.state.staff.filter(s=>(PawpalStaff.getStaffWorkingSchedules(s.rawId).length>0)===(filter==='ASSIGNED')).map(s=>s.id),filter);
  const shown=await page.locator('#staffListTableBody tr').evaluateAll(rows=>rows.filter(r=>r.querySelector('.btn-view-profile')).map(r=>r.cells[0].textContent));assert.equal(shown.length,Math.min(10,source.length));assert.ok(shown.every(id=>source.includes(id)));
 }
 await page.locator('#staffFilterShift').selectOption('ALL');
 const expectedShift=await page.evaluate(()=>{const staff=PawpalStaff.state.staff.find(s=>PawpalStaff.getStaffWorkingSchedules(s.rawId).length);return PawpalStaff.formatStaffSchedule(PawpalStaff.getNearestStaffSchedule(staff.rawId));});
 const pending=page.waitForEvent('download');await page.locator('#btnExportStaff').click();const download=await pending;const csv=require('node:fs').readFileSync(await download.path(),'utf8');assert.ok(csv.includes(expectedShift.replace(/"/g,'""')));
 assert.deepEqual(errors,[]);
 console.log('PASS staff directory source profiles/linked Auth availability/anon denied/no secret fields/live browser directory');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
