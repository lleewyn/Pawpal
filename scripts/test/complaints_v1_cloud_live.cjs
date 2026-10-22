// Read-only acceptance of the actual Cloud backend, optionally via local frontend.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true});
 const errors=[],legacy=[],writes=[];
 try{
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/') && r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
  page.on('request',r=>{const u=new URL(r.url());if((u.hostname.endsWith('.supabase.co') && u.hostname!=='cpzuvaplseielhgcnqrn.supabase.co') || u.hostname.endsWith('.trycloudflare.com') || u.pathname.startsWith('/data/'))legacy.push(u.hostname+u.pathname);});
  await page.route('**/rest/v1/**',route=>{
   const r=route.request(),allowed=['get_staff_login_context','get_admin_complaint_handlers'];
   if(!['GET','HEAD'].includes(r.method()) && !allowed.some(n=>new URL(r.url()).pathname==='/rest/v1/rpc/'+n)){writes.push(new URL(r.url()).pathname);return route.abort();}return route.continue();
  });
  await page.goto((process.env.TEST_BASE_URL || 'https://pawpalgr3.vercel.app')+'/admin/login');
  await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());await page.locator('#btnSubmitAdminLogin').click();
  await page.waitForFunction(()=>window.PawpalCustomers?.state.listLoadStatus==='loaded');
  await page.locator('[data-title="Khiếu nại"]').click();await page.waitForFunction(()=>window.PawpalComplaints?.state.isLoaded && PawpalComplaints.subtabs.detail);
  const counts=await page.evaluate(async()=>{
   const rows=[];for(let i=0;;i+=500){const {data,error}=await getSupabaseClient().from('support_ticket').select('id').order('id').range(i,i+499);if(error)throw error;rows.push(...data);if(data.length<500)break;}
   const s=PawpalComplaints.state;return {source:rows.map(r=>r.id).sort(),ui:[...s.serviceComplaints,...s.orderComplaints].map(r=>r.rawId).sort(),error:s.loadError,first:[...s.serviceComplaints,...s.orderComplaints][0]?.id};
  });
  assert.deepEqual(counts.ui,counts.source);assert.equal(counts.error,null);
  assert.ok(await page.locator('#serviceComplaintsTableBody tr').count()<=10);
  await page.locator('#serviceSearchInput').fill('NO_MATCH_VERIFICATION_41920');
  await page.waitForTimeout(400);
  const download=page.waitForEvent('download');await page.locator('#btnExportServiceComplaints').click();const file=await download;
  assert.equal(fs.readFileSync(await file.path(),'utf8').trim().split(/\r?\n/).length,1,'Filtered empty export must not export all customers');
  await page.locator('[data-subtab="tab-complaint-orders"]').click();assert.ok(await page.locator('#orderComplaintsTableBody tr').count()<=10);
  if(counts.first){
   await page.evaluate(id=>PawpalComplaints.openTicketDetail(id),counts.first);
   await page.waitForFunction(()=>!document.getElementById('viewTicketTimeline').textContent.includes('Đang tải'));
   await page.locator('#btnAssignHandler').click();await page.locator('#searchAssignStaff').click();await page.locator('#assignHandlerModalOverlay [data-close-modal]').first().click();
   await page.screenshot({path:infra+'/complaints-cloud-detail.private.png'});
   await page.reload();await page.waitForFunction(()=>window.PawpalComplaints?.state.isLoaded);
   assert.equal(await page.locator('#viewTicketCode').textContent(),counts.first);
  }
  await page.waitForFunction(()=>getSupabaseClient().getChannels().some(c=>c.topic.includes('admin_complaints_live_sync') && c.state==='joined'));
  assert.deepEqual(errors,[]);assert.deepEqual(legacy,[]);assert.deepEqual(writes,[]);
  console.log(`PASS Cloud complaints: ${counts.source.length} source tickets, three tabs, filtered CSV, handler modal, detail/reload, Realtime; no legacy sources or business writes.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
