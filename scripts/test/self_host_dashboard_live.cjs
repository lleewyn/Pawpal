// Real Dashboard browser/API test against the isolated local Supabase only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const envPath=process.argv[2],playwrightPath=process.argv[3];
if(!envPath||!path.isAbsolute(envPath)||!playwrightPath)throw Error('Pass infra .env and Playwright package path');
const env=require('dotenv').parse(fs.readFileSync(envPath));
if(env.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('Local-only test');
const {chromium}=require(playwrightPath);
const credentials=fs.readFileSync(path.join(path.dirname(envPath),'PAWPAL-ADMIN.private.txt'),'utf8');
const email=credentials.match(/^Email: (.+)$/m)[1],password=credentials.match(/^Password: (.+)$/m)[1];
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(env.SUPABASE_PUBLIC_URL,env.SERVICE_ROLE_KEY,options);
const ok=async p=>{const r=await p;if(r.error)throw Error(r.error.code+': '+r.error.message);return r.data;};
const tag=crypto.randomUUID().slice(0,8),label='Dashboard check '+tag;
const rows=[],authUsers=[];
async function insert(table,value){const data=await ok(service.from(table).insert(value).select().single());rows.push([table,data.id]);return data;}
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Bangkok'});
 const page=await context.newPage();page.setDefaultTimeout(20000);
 const errors=[],cloud=[],reads=[];
 page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.startsWith('/rest/v1/'))errors.push(r.status()+' '+new URL(r.url()).pathname);});
 page.on('request',r=>{const u=new URL(r.url());if(u.hostname.endsWith('.supabase.co'))cloud.push(u.hostname);if(u.pathname.startsWith('/rest/v1/'))reads.push(u.pathname);});
 try{
  await page.goto('http://localhost:3001/admin/login');
  await page.locator('#inputAdminEmail').fill(email);await page.locator('#inputAdminPassword').fill(password);
  await page.locator('#btnSubmitAdminLogin').click();await page.waitForURL('**/admin#tab-list');
  await page.locator('.sidebar-menu-btn[data-title="Dashboard"]').click();
  await page.waitForFunction(()=>document.querySelector('#dashboardCustomers')?.textContent.trim().match(/^\d+$/));
  const baseline=await page.evaluate(()=>Object.fromEntries(['dashboardRevenue','dashboardBookings','dashboardOrders','dashboardCustomers','dashboardPets','dashboardComplaintsBadge'].map(id=>[id,document.getElementById(id).textContent])));
  assert.ok(!baseline.dashboardRevenue.includes('Giới hạn quyền'),'real Admin must see financial KPI');
  assert.ok(!baseline.dashboardRevenue.includes('Lỗi'),'Dashboard must load without missing schema');
  const amount=s=>Number(s.replace(/[^0-9]/g,''));
  console.log('PASS Dashboard loads real empty/current data for authenticated Admin');
  const staff=await ok(service.from('staff').select('id').eq('email',email).single());
  const customer=await insert('customer',{note:label});
  await insert('customer_profile',{customer_id:customer.id,full_name:label});
  const pet=await insert('pet_profile',{customer_id:customer.id,pet_code:'DASH-'+tag,pet_name:label,species:'dog',weight:5});
  const svc=await insert('service',{service_code:'DASH-'+tag,service_name:label});
  const apptBase={customer_id:customer.id,pet_id:pet.id,staff_id:staff.id,service_id:svc.id,appointment_date:today,appointment_time:'10:00'};
  await insert('appointment',{...apptBase,appointment_code:'DASH-DONE-'+tag,appointment_status:'da_hoan_tat',payment_status:'da_thanh_toan',total_price:50000});
  await insert('appointment',{...apptBase,appointment_code:'DASH-WAIT-'+tag,appointment_status:'cho_xac_nhan',payment_status:'chua_thanh_toan',total_price:20000});
  await insert('appointment',{...apptBase,appointment_code:'DASH-CANCEL-'+tag,appointment_status:'da_huy',payment_status:'da_thanh_toan',total_price:900000});
  const now=new Date().toISOString();
  const paid=await insert('sales_order',{customer_id:customer.id,order_code:'DASH-PAID-'+tag,order_status:'da_giao',payment_status:'da_thanh_toan',total_amount:100000,created_at:today+'T00:30:00+07:00'});
  await insert('sales_order',{customer_id:customer.id,order_code:'DASH-CANCEL-'+tag,order_status:'da_huy',payment_status:'da_thanh_toan',total_amount:900000,created_at:today+'T12:00:00+07:00'});
  await insert('sales_order',{customer_id:customer.id,order_code:'DASH-WAIT-'+tag,order_status:'cho_xac_nhan',payment_status:'chua_thanh_toan',total_amount:70000,created_at:today+'T12:00:00+07:00'});
  await insert('sales_order',{customer_id:customer.id,order_code:'DASH-REFUND-'+tag,order_status:'da_giao',payment_status:'da_hoan_tien',total_amount:900000,created_at:today+'T12:00:00+07:00'});
  const ticket=await insert('support_ticket',{customer_id:customer.id,user_id:customer.id,title:label,status:'cho_xu_ly'});
  const product=await insert('product',{product_name:label,status:'dang_ban'});
  const variant=await insert('product_variant',{product_id:product.id,sku_variant:'DASH-'+tag});
  const inventory=await insert('inventory',{product_variant_id:variant.id,quantity_in_stock:0,minimum_stock:5});
  await insert('chat_conversation',{customer_id:customer.id,status:'resolved',created_at:now});
  const lastChat=await insert('chat_conversation',{customer_id:customer.id,status:'agent_handling',created_at:now});
  // Reload after fixture setup so the next phase measures one isolated live event,
  // rather than the pending Realtime burst from inserting all fixture tables.
  await page.reload();
  const expectRevenue=amount(baseline.dashboardRevenue)+150000;
  await page.waitForFunction(({revenue,customers,pets,bookings,orders})=>{
   const text=id=>document.getElementById(id)?.textContent;
   return Number(text('dashboardRevenue').replace(/[^0-9]/g,''))===revenue&&Number(text('dashboardCustomers'))===customers&&Number(text('dashboardPets'))===pets&&Number(text('dashboardBookings'))===bookings&&Number(text('dashboardOrders'))===orders;
  },{revenue:expectRevenue,customers:Number(baseline.dashboardCustomers)+1,pets:Number(baseline.dashboardPets)+1,bookings:Number(baseline.dashboardBookings)+2,orders:Number(baseline.dashboardOrders)+1});
  assert.equal(await page.locator('#dashboardComplaintsBadge').textContent(),String(Number(baseline.dashboardComplaintsBadge)+1));
  await page.locator('#dashboardStockList').getByText(label,{exact:true}).waitFor();
  assert.ok((await page.locator('#dashboardStockList').textContent()).includes('Hết hàng'));
  assert.equal(await page.locator('#dashboardAlertBanner').isVisible(),false,'ordinary pending ticket must not be labeled urgent');
  const chartTitles=await page.locator('#dashboardRevenueChart circle title').allTextContents();
  assert.ok(chartTitles.some(text=>text.includes(expectRevenue.toLocaleString('vi-VN')+' VNĐ')),'chart and KPI must agree including completed paid services and local midnight orders');
  console.log('PASS sales/service revenue excludes canceled and unpaid rows; counts and low stock match database');
  console.log('PASS local midnight timestamps, refunded payment, chart/KPI agreement and ordinary ticket priority');
  await page.waitForFunction(()=>window.getSupabaseClient().getChannels().some(c=>c.topic.includes('admin-dashboard-live-sync')&&c.state==='joined'));
  // A WAL barrier ensures all setup writes have reached the live channel before
  // measuring the network work caused by one later order update.
  await page.evaluate(id=>new Promise((resolve,reject)=>{
   window.__dashboardBarrierReceived=false;
   const timer=setTimeout(()=>reject(Error('CDC barrier setup timeout')),15000);
   window.getSupabaseClient().channel('dashboard-test-barrier')
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_conversation',filter:'id=eq.'+id},()=>{window.__dashboardBarrierReceived=true;})
    .on('system',{},message=>{if(message.extension==='postgres_changes'&&message.status==='ok'){clearTimeout(timer);resolve();}}).subscribe();
  }),lastChat.id);
  await ok(service.from('chat_conversation').update({updated_at:new Date().toISOString()}).eq('id',lastChat.id));
  await page.waitForFunction(()=>window.__dashboardBarrierReceived);
  await page.waitForFunction(()=>{const s=window.PawpalDataStore.getStats();return s.pendingRealtimeRefreshes===0&&s.inFlightCount===0;});
  const start=reads.length;
  await ok(service.from('sales_order').update({total_amount:125000}).eq('id',paid.id));
  await page.waitForFunction(expected=>Number(document.getElementById('dashboardRevenue').textContent.replace(/[^0-9]/g,''))===expected,expectRevenue+25000);
  const delta=reads.slice(start);
  console.log('Realtime reads: '+JSON.stringify(delta));
  assert.ok(delta.includes('/rest/v1/sales_order'));
  assert.ok(!delta.some(p=>['/rest/v1/product','/rest/v1/inventory','/rest/v1/chat_conversation'].includes(p)),'order Realtime must not reload unrelated datasets');
  console.log('PASS Realtime updates order revenue without reloading unrelated datasets');
  await ok(service.from('inventory').update({quantity_in_stock:50}).eq('id',inventory.id));
  await page.waitForFunction(name=>!document.getElementById('dashboardStockList').textContent.includes(name),label);
  console.log('PASS inventory Realtime removes replenished stock warning');
  await ok(service.from('support_ticket').update({priority:'khan_cap'}).eq('id',ticket.id));
  await page.waitForFunction(name=>{const el=document.getElementById('dashboardAlertBanner');return el.style.display!=='none'&&el.textContent.includes(name);},label);
  assert.ok((await page.locator('#dashboardAlertText').textContent()).includes('khẩn cấp'));
  console.log('PASS urgent ticket uses real title/priority and updates through Realtime');
  const guestPassword=crypto.randomBytes(24).toString('base64url');
  const newUser=await ok(service.auth.admin.createUser({email:'dashboard-'+tag+'@example.test',password:guestPassword,email_confirm:true}));
  authUsers.push(newUser.user.id);
  const guest=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,options);
  await ok(guest.auth.signInWithPassword({email:newUser.user.email,password:guestPassword}));
  await ok(service.from('customer').update({auth_user_id:newUser.user.id,is_temporary:false}).eq('id',customer.id));
  for(const table of ['product','product_variant','inventory','chat_conversation'])assert.equal((await ok(guest.from(table).select('id'))).length,0,table+' must not expose Dashboard data to customers');
  await guest.auth.signOut();
  assert.deepEqual(errors,[]);assert.deepEqual(cloud,[]);
  const dir=path.join(path.dirname(envPath),'verification');fs.mkdirSync(dir,{recursive:true});
  await page.screenshot({path:path.join(dir,'dashboard.png'),fullPage:true});
  console.log('PASS customer isolation, no REST errors or Cloud requests, Dashboard screenshot saved');
 }finally{
  await browser.close();
  for(const [table,id]of rows.reverse()){const r=await service.from(table).delete().eq('id',id);if(r.error)console.error('Fixture cleanup failed: '+table);}
  for(const id of authUsers)await service.auth.admin.deleteUser(id);
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
