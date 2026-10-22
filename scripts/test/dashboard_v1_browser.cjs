const assert=require('node:assert/strict');
const {browserPage,admin,service,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{
 const {browser,page}=await browserPage();const errors=[];
 try{
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
  await page.locator('[data-title="Dashboard"]').click();await page.waitForFunction(()=>window.PawpalDashboard);
  await page.evaluate(()=>PawpalDashboard.refresh());
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const cash=await ok(admin.rpc('get_admin_dashboard_cashflow',{p_from:today,p_to:today}));
  assert.equal(await page.locator('#dashboardRevenue').textContent(),Number(cash.days[0].net).toLocaleString('vi-VN')+' đ');
  const customers=await service.from('customer').select('id',{head:true,count:'exact'});assert.equal(await page.locator('#dashboardCustomers').textContent(),String(customers.count));
  const pets=await service.from('pet_profile').select('id',{head:true,count:'exact'});assert.equal(await page.locator('#dashboardPets').textContent(),String(pets.count));
  assert.equal(await page.locator('#dashboardRevenueChart svg').count(),1);
  for(const mode of ['week','day','month'])await page.locator('[data-calendar-view="'+mode+'"]').click();
  await page.locator('#dashboardCalendarNext').click();await page.locator('#dashboardCalendarPrev').click();await page.locator('#dashboardCalendarToday').click();
  await page.screenshot({path:infra+'/dashboard-v1-verified.private.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:infra+'/dashboard-v1-mobile.private.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS dashboard actual V1 cashflow/customer/pet totals, calendar month/week/day/navigation, chart, refresh and responsive screenshots.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
