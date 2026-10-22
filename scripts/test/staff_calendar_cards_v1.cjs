// Read actual Cloud schedules only; no fixture arrays or business writes.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',account=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],writes=[];try{
 page.on('pageerror',e=>errors.push(e.stack||e.message));await page.route('**/rest/v1/**',route=>{const r=route.request();if(!['GET','HEAD'].includes(r.method())&&!['get_staff_login_context','get_admin_staff_directory'].some(n=>new URL(r.url()).pathname.endsWith('/rpc/'+n))){writes.push(r.url());return route.abort();}return route.continue();});
 await page.goto((process.env.TEST_BASE_URL||'http://localhost:3000')+'/admin/login');await page.locator('#inputAdminEmail').fill(account.match(/^Email: (.+)$/m)[1].trim());await page.locator('#inputAdminPassword').fill(account.match(/^Password: (.+)$/m)[1].trim());await page.locator('#btnSubmitAdminLogin').click();await page.waitForURL('**/admin#tab-list');
 await page.locator('[data-title="Nhân sự"]').click();await page.waitForFunction(()=>window.PawpalStaff?.state.isLoaded&&PawpalStaff.subtabs.schedule);await page.evaluate(()=>PawpalStaff.switchSubtab('tab-staff-schedule'));
 const day=await page.evaluate(()=>{const today=new Date(Date.now()+7*3600000).toISOString().slice(0,10),rows=PawpalStaff.state.schedules;const first=rows.find(s=>new Date(Date.parse(s.start_at)+7*3600000).toISOString().slice(0,10)===today)||rows.find(s=>s.schedule_status==='active');if(!first)throw Error('Need an actual source shift');return new Date(Date.parse(first.start_at)+7*3600000).toISOString().slice(0,10);});
 await page.locator('#scheduleDatePicker').fill(day);await page.locator('#scheduleDatePicker').dispatchEvent('change');
 const source=await page.evaluate(day=>{const left=Date.parse(day+'T00:00:00+07:00'),right=left+86400000;return PawpalStaff.state.schedules.filter(s=>Date.parse(s.start_at)<right&&Date.parse(s.end_at)>left).map(s=>({id:s.id,staff:s.staff_id}));},day);
 assert.equal(await page.locator('#scheduleDayTable').count(),0);assert.equal(await page.locator('.staff-calendar-person').count(),Math.min(10,new Set(source.map(s=>s.staff)).size));
 const visible=await page.locator('#scheduleTableBody [data-schedule-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.scheduleId));assert.ok(visible.length);assert.ok(visible.every(id=>source.some(s=>s.id===id)));
 await page.screenshot({path:infra+'/staff-calendar-day.private.png',fullPage:true});
 const selected=visible[0];await page.locator('#scheduleTableBody [data-schedule-id="'+selected+'"] button').click();assert.equal(await page.locator('#shiftModalOverlay').evaluate(e=>e.classList.contains('active')),true);await page.keyboard.press('Escape');
 await page.locator('#btnScheduleViewWeek').click();assert.equal(await page.locator('#scheduleWeekViewWrapper').isVisible(),true);assert.equal(await page.locator('.staff-calendar-day').count(),7);
 await page.screenshot({path:infra+'/staff-calendar-week.private.png',fullPage:true});
 await page.setViewportSize({width:920,height:980});await page.screenshot({path:infra+'/staff-calendar-week-narrow.private.png',fullPage:true});
 for(const width of [920,390]){await page.setViewportSize({width,height:980});assert.equal(await page.locator('#scheduleWeekViewWrapper').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);}
 await page.locator('#btnScheduleViewDay').click();assert.equal(await page.locator('#scheduleDayViewWrapper').isVisible(),true);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
 console.log('PASS actual Cloud day employee cards, seven-day week grid, edit from card, responsive no grid overflow and no business writes');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
