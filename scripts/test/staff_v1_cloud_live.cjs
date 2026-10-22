// Read-only acceptance on the new Cloud; all mutation RPCs and staff APIs blocked.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],legacy=[],writes=[];
try{
 const origin=process.env.TEST_BASE_URL||'https://pawpalgr3.vercel.app';
 if(!process.env.TEST_BASE_URL)for(const [action,data] of [['provision-account',{}],['reset-password',{}],['toggle-account-status',{action:'lock'}]]){const denied=await page.request.post(origin+'/api/admin/staff/'+action,{data});assert.equal(denied.status(),401,'Unauthenticated personnel API must be rejected: '+action);}
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
 page.on('request',r=>{const u=new URL(r.url());if((u.hostname.endsWith('.supabase.co')&&u.hostname!=='cpzuvaplseielhgcnqrn.supabase.co')||u.hostname.endsWith('.trycloudflare.com')||u.pathname.startsWith('/data/'))legacy.push(u.hostname+u.pathname);});
 await page.route('**/rest/v1/**',route=>{const r=route.request();if(!['GET','HEAD'].includes(r.method())&&!['get_staff_login_context','get_admin_staff_directory'].some(v=>new URL(r.url()).pathname==='/rest/v1/rpc/'+v)){writes.push(new URL(r.url()).pathname);return route.abort();}return route.continue();});
 await page.route('**/api/admin/staff/**',route=>{writes.push(new URL(route.request().url()).pathname);return route.abort();});
 await page.goto(origin+'/admin/login');await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());await page.locator('#btnSubmitAdminLogin').click();await page.waitForURL('**/admin#tab-list');
 await page.locator('[data-title="Nhân sự"]').click();await page.waitForFunction(()=>window.PawpalStaff?.state.isLoaded&&PawpalStaff.subtabs.schedule&&PawpalStaff.subtabs.assessment);
 const source=await page.evaluate(async()=>{const s=PawpalStaff.state,{data,error}=await getSupabaseClient().rpc('get_admin_staff_directory');if(error)throw error;return {staff:s.staff.length,source:data.length,blocked:s.staff.filter(p=>p.accountStatus==='da_khoa').length,error:s.loadError};});
 assert.equal(source.staff,source.source);assert.equal(source.staff,17);assert.equal(source.blocked,16);assert.equal(source.error,null);
 await page.evaluate(()=>{PawpalStaff.subtabs.list.openStaffModal(PawpalStaff.state.staff.find(s=>!s.roles.some(r=>r.code==='ADMIN')).id);});await page.locator('#staffModalOverlay.active').waitFor();assert.equal(await page.locator('#staffAccountEmail').getAttribute('readonly'),'');await page.locator('#staffModalOverlay [data-close-modal="staffModalOverlay"]').first().click();
 await page.evaluate(()=>PawpalStaff.switchSubtab('tab-staff-schedule'));await page.evaluate(()=>PawpalStaff.subtabs.schedule.openLeaveSwapModal());await page.locator('#leaveSwapModalOverlay [data-close-modal="leaveSwapModalOverlay"]').first().click();
 await page.evaluate(()=>PawpalStaff.switchSubtab('tab-staff-assessment'));await page.evaluate(()=>PawpalStaff.subtabs.assessment.openAssessmentModal());await page.locator('#assessmentModalOverlay [data-close-modal="assessmentModalOverlay"]').first().click();
 await page.waitForFunction(()=>getSupabaseClient().getChannels().some(c=>c.topic.includes('admin-staff-live-sync')&&c.state==='joined'));
 await page.reload();await page.waitForFunction(()=>window.PawpalStaff?.state.isLoaded);assert.ok(page.url().includes('tab-staff-assessment'));
 await page.screenshot({path:infra+'/staff-cloud-read.private.png',fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(legacy,[]);assert.deepEqual(writes,[]);
 fs.writeFileSync(infra+'/staff-cloud-read-verification.private.txt',JSON.stringify({verifiedAt:new Date().toISOString(),...source,realtimeJoined:true,reload:true,businessWrites:0}));
 console.log('PASS new Cloud staff/source Auth states, profile, actual shift/assessment modals, Realtime subscription, reload, no old Cloud/JSON/browser errors/business writes');
}catch(error){await page.screenshot({path:infra+'/staff-cloud-failure.private.png',fullPage:true}).catch(()=>{});console.error(JSON.stringify({errors,legacy,writes,url:page.url()}));throw error;}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
