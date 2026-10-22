// Write fixtures only to the restored DB; never Cloud or original Auth.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {browserPage,admin,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{const {browser,page}=await browserPage();try{
 const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));await page.locator('[data-title="Nhân sự"]').click();await page.waitForFunction(()=>window.PawpalStaff?.state.isLoaded&&PawpalStaff.subtabs.profile&&PawpalStaff.subtabs.assessment&&PawpalStaff.subtabs.schedule);
 const id=await page.evaluate(()=>PawpalStaff.state.staff.find(s=>!s.roles.some(r=>r.code==='ADMIN')).rawId);
 for(let index=0;index<12;index++)await ok(admin.rpc('save_admin_staff_assessment',{p_request_id:crypto.randomUUID(),p_staff_id:id,p_details:{assessment_date:'2026-01-'+String(index+1).padStart(2,'0'),assessment_type:'Profile verification',score:10+index,result:'RETRAIN',note:'History verification'}}));
 await page.evaluate(async id=>{await PawpalStaff.loadStaffModuleData({force:true});PawpalStaff.subtabs.profile.openStaffProfile(id);},id);
 const expected=await page.evaluate(id=>{const month=new Date(Date.now()+7*3600000),left=Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),1)-7*3600000,right=Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1)-7*3600000;
 const rows=PawpalStaff.state.schedules.filter(s=>s.staff_id===id&&s.schedule_status==='active'&&s.availability_status==='available'&&Date.parse(s.start_at)<right&&Date.parse(s.end_at)>left);
 return {hours:new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(rows.reduce((n,s)=>n+Math.max(0,Math.min(right,Date.parse(s.end_at))-Math.max(left,Date.parse(s.start_at))),0)/3600000)+' giờ',count:rows.length+' ca',assessments:PawpalStaff.state.assessments.filter(a=>a.staff_id===id).map(a=>a.id)};},id);
 assert.equal(await page.locator('#viewStaffMonthlyHours').textContent(),expected.hours);assert.equal(await page.locator('#viewStaffNightShifts').textContent(),expected.count);
 assert.equal(await page.locator('#viewStaffAssessmentHistory [data-assessment-id]').count(),10);assert.deepEqual(await page.locator('#viewStaffAssessmentHistory [data-assessment-id]').evaluateAll(rows=>rows.map(r=>r.dataset.assessmentId)),expected.assessments.slice(0,10));
 await page.locator('#viewStaffAssessmentHistory button').last().click();assert.deepEqual(await page.locator('#viewStaffAssessmentHistory [data-assessment-id]').evaluateAll(rows=>rows.map(r=>r.dataset.assessmentId)),expected.assessments.slice(10,20));
 await page.locator('#btnProfileAssignShift').click();assert.ok(await page.locator('#shiftStaffSearch').inputValue());await page.keyboard.press('Escape');
 await page.locator('#btnProfileAddAssessment').click();assert.equal(await page.locator('#assessInputStaff').inputValue(),id);await page.keyboard.press('Escape');
 await page.screenshot({path:infra+'/staff-profile-history.private.png',fullPage:true});await page.reload();await page.waitForFunction(()=>window.PawpalStaff?.state.isLoaded&&document.querySelector('#viewStaffAssessmentHistory [data-assessment-id]'));
 assert.equal(await page.locator('#viewStaffMonthlyHours').textContent(),expected.hours);assert.deepEqual(errors,[]);
 console.log('PASS restored personnel profile actual schedules/month-boundary totals, paged assessment history, preselected actions and reload without script errors');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
