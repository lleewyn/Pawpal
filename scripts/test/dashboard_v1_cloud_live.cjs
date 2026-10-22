// Actual Cloud read-only acceptance. All business writes are blocked.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',file=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],writes=[],legacy=[];
 try{
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
  page.on('request',r=>{const u=new URL(r.url());if((u.hostname.endsWith('.supabase.co')&&u.hostname!=='cpzuvaplseielhgcnqrn.supabase.co')||u.hostname.endsWith('.trycloudflare.com')||u.pathname.startsWith('/data/'))legacy.push(u.hostname+u.pathname);});
  await page.route('**/rest/v1/**',route=>{const r=route.request();if(!['GET','HEAD'].includes(r.method())&&!['get_staff_login_context','get_admin_dashboard_cashflow'].some(n=>new URL(r.url()).pathname==='/rest/v1/rpc/'+n)){writes.push(new URL(r.url()).pathname);return route.abort();}return route.continue();});
  await page.goto((process.env.TEST_BASE_URL||'https://pawpalgr3.vercel.app')+'/admin/login');await page.locator('#inputAdminEmail').fill(file.match(/^Email: (.+)$/m)[1].trim());await page.locator('#inputAdminPassword').fill(file.match(/^Password: (.+)$/m)[1].trim());await page.locator('#btnSubmitAdminLogin').click();await page.waitForFunction(()=>window.PawpalCustomers?.state.listLoadStatus==='loaded');
  await page.locator('[data-title="Dashboard"]').click();await page.waitForFunction(()=>window.PawpalDashboard);await page.evaluate(()=>PawpalDashboard.refresh());
  const expected=await page.evaluate(async()=>{
   const client=getSupabaseClient(),today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const [cash,customers,pets]=await Promise.all([client.rpc('get_admin_dashboard_cashflow',{p_from:today,p_to:today}),client.from('customer').select('id',{count:'exact',head:true}),client.from('pet_profile').select('id',{count:'exact',head:true})]);
   if(cash.error||customers.error||pets.error)throw Error('Source totals failed');return {net:Number(cash.data.days[0].net).toLocaleString('vi-VN')+' đ',customers:customers.count,pets:pets.count};
  });
  assert.equal(await page.locator('#dashboardRevenue').textContent(),expected.net);assert.equal(await page.locator('#dashboardCustomers').textContent(),String(expected.customers));assert.equal(await page.locator('#dashboardPets').textContent(),String(expected.pets));assert.equal(await page.locator('#dashboardRevenueChart svg').count(),1);
  for(const mode of ['week','day','month'])await page.locator('[data-calendar-view="'+mode+'"]').click();
  await page.waitForFunction(()=>getSupabaseClient().getChannels().some(c=>c.topic.includes('admin-dashboard-live-sync')&&c.state==='joined'));
  await page.screenshot({path:infra+'/dashboard-cloud-verified.private.png'});
  await page.reload();await page.waitForFunction(()=>window.PawpalDashboard);await page.evaluate(()=>PawpalDashboard.refresh());assert.equal(await page.locator('#dashboardRevenue').textContent(),expected.net);
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(legacy,[]);
  console.log('PASS Cloud Dashboard cashflow/customer/pet totals, chart, calendar views, refresh/reload and Realtime; no business writes or old sources.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
