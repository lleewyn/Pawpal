// Real Admin UI + Supabase SQL transaction. All test money/returns are rolled back.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
if(!process.argv.includes('--run'))process.exit(0);
(async()=>{
 const db=await connect(),browser=await chromium.launch({channel:'chrome',headless:true});
 const folder='docs/verification/sales-cashier-fix';fs.mkdirSync(folder,{recursive:true});
 const checks=[],pass=s=>{checks.push(s);console.log('PASS',s);};let transaction=false;
 try{
  const page=await browser.newPage({viewport:{width:1366,height:1000}});page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const credential=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');
  await page.goto('http://localhost:4001/admin/login');
  await page.fill('#inputAdminEmail',credential.match(/^Email: (.+)$/m)[1].trim());
  await page.fill('#inputAdminPassword',credential.match(/^Password: (.+)$/m)[1].trim());
  await page.click('#btnSubmitAdminLogin');await page.waitForURL(u=>!u.pathname.includes('login'));
  await page.goto('http://localhost:4001/pages/admin/index.html#tab-order-list');
  try{await page.waitForSelector('#orderSearchInput');}catch(e){await page.screenshot({path:folder+'/navigation-failure.png'});console.error('Admin navigation:',page.url(),errors,await page.locator('body').innerText());throw e;}
  const orderId='f2a46056-fa3a-4b32-93bc-b4f51f933238';
  const model=await page.evaluate(async id=>{const order=await PawpalOrders.ensureOrder(id);await PawpalOrders.openCashier(order);return order;},orderId);
  assert.ok(model);await page.waitForFunction(()=>document.querySelector('#salesCashierTotal').textContent!=='—');
  assert.equal(await page.locator('#salesCashierError').textContent(),'');
  assert.ok(Number(await page.locator('#salesCashierAmount').inputValue())>0);
  await page.screenshot({path:folder+'/01-cashier-loaded-live.png'});pass('Live HTTP cashier loads total, cash method and collectible amount on reported order');
  const missing='**/rest/v1/rpc/get_admin_sales_return_refunds';
  await page.route(missing,r=>r.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'Missing function'})}));
  await page.evaluate(model=>PawpalOrders.openCashier(model),model);
  await page.waitForFunction(()=>document.querySelector('#salesCashierError').textContent.includes('chưa được cập nhật'));
  assert.equal(await page.locator('#btnSaveSalesMoney').isDisabled(),true);
  assert.equal(await page.locator('#salesCashierHistory').textContent(),'Chưa tải được lịch sử giao dịch.');
  pass('Missing RPC reports a load/configuration error and disables save');await page.unroute(missing);
  const actor=await page.evaluate(async()=> (await getSupabaseClient().auth.getUser()).data.user.id);
  await db.query("BEGIN; SET LOCAL statement_timeout='8s'; SET LOCAL lock_timeout='3s'");transaction=true;
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actor]);
  await db.query('SET LOCAL ROLE authenticated');
  const rpc=async(name,args)=>{
   const signatures={get_admin_sales_cashier:['p_order_id'],get_admin_sales_return_refunds:['p_order'],post_admin_sales_money:['p_request_id','p_order_id','p_expected_state','p_action','p_details']};
   const keys=signatures[name];assert.ok(keys);await db.query('SAVEPOINT ui_rpc');
   try{const values=keys.map(k=>typeof args[k]==='object'?JSON.stringify(args[k]):args[k]);
    const result=await db.query(`SELECT public.${name}(${keys.map((k,i)=>k+'=> $'+(i+1)).join(',')}) value`,values);
    await db.query('RELEASE SAVEPOINT ui_rpc');return {data:result.rows[0].value,error:null};
   }catch(e){await db.query('ROLLBACK TO SAVEPOINT ui_rpc');await db.query('RELEASE SAVEPOINT ui_rpc');return {data:null,error:{code:e.code,message:e.message}};}
  };
  await page.route('**/rest/v1/rpc/*',async route=>{
   const name=new URL(route.request().url()).pathname.split('/').pop();
   if(!['get_admin_sales_cashier','get_admin_sales_return_refunds','post_admin_sales_money'].includes(name))return route.continue();
   const result=await rpc(name,route.request().postDataJSON());return route.fulfill({status:result.error?400:200,contentType:'application/json',body:JSON.stringify(result.error||result.data)});
  });
  await page.evaluate(model=>PawpalOrders.openCashier(model),model);
  await page.waitForFunction(()=>!document.querySelector('#btnSaveSalesMoney').disabled);
  const total=Number(await page.locator('#salesCashierAmount').inputValue());
  await page.fill('#salesCashierReason','Kiểm chứng thu tiền và hoàn tác sau kiểm thử');await page.check('#salesCashierConfirmed');
  await page.click('#btnSaveSalesMoney');
  await page.waitForFunction(()=>document.querySelector('#salesCashierRemaining').textContent.trim()==='0 ₫'||document.querySelector('#salesCashierAmount').value==='');
  assert.equal(await page.locator('#salesCashierError').textContent(),'');
  const collected=(await db.query('SELECT public.get_admin_sales_cashier($1) value',[orderId])).rows[0].value;
  assert.equal(Number(collected.remaining),0);assert.equal(Number(collected.collected),Number(collected.total));
  await page.screenshot({path:folder+'/02-collection-succeeded-rollback.png'});pass('UI save records successful payment; collected equals total and remaining is zero');
  await db.query('RESET ROLE');
  // Delivery setup is transaction-only; this test does not perform a real shipment.
  await db.query("UPDATE public.sales_order SET order_status='delivered',updated_at=clock_timestamp() WHERE id=$1",[orderId]);
  // Release the quantity reserved by the pre-existing exchange, within rollback only.
  const pending=(await db.query("SELECT id,updated_at::text FROM public.return_request WHERE sales_order_id=$1 AND request_status IN ('pending','approved')",[orderId])).rows;
  await db.query('SET LOCAL ROLE authenticated');
  for(const r of pending)await db.query("SELECT public.save_admin_sales_return($1,$2,$3,$4,'reject',$5::jsonb)",[randomUUID(),r.id,orderId,r.updated_at,JSON.stringify({reason:'Thiết lập ca kiểm thử trong giao dịch hoàn tác'})]);
  const row=(await db.query('SELECT updated_at::text FROM public.sales_order WHERE id=$1',[orderId])).rows[0];
  const line=(await db.query('SELECT id FROM public.sales_order_detail WHERE order_id=$1 ORDER BY id LIMIT 1',[orderId])).rows[0];
  await db.query('SET LOCAL ROLE authenticated');
  const rid=randomUUID();await db.query("SELECT public.save_admin_sales_return($1,$2,$3,$4,'create',$5::jsonb)",[randomUUID(),rid,orderId,row.updated_at,JSON.stringify({reason:'Kiểm chứng trả hàng sau thanh toán',type:'refund',received:false,saleable:false,lines:[{line_id:line.id,quantity:1}]})]);
  const returned=(await db.query('SELECT updated_at::text FROM public.return_request WHERE id=$1',[rid])).rows[0];
  await db.query("SELECT public.save_admin_sales_return($1,$2,$3,$4,'receive',$5::jsonb)",[randomUUID(),rid,orderId,returned.updated_at,JSON.stringify({received:true,inspected:true,saleable:false})]);
  pass('Paid order accepts return creation and inspected receipt through Admin RPCs');
  await page.evaluate(model=>PawpalOrders.openCashier(model),model);await page.waitForFunction(()=>!document.querySelector('#btnSaveSalesMoney').disabled);
  await page.selectOption('#salesCashierAction','refund');
  await page.locator('#salesCashierPaymentSearch').click();await page.locator('#salesCashierPaymentSearch').fill('');
  await page.locator('#salesCashierPaymentField .customer-autocomplete-item').first().click();
  await page.fill('#salesCashierReason','Kiểm chứng hoàn tiền hàng đã nhận');await page.check('#salesCashierConfirmed');
  assert.equal(await page.locator('#btnSaveSalesMoney').isEnabled(),true);
  await page.screenshot({path:folder+'/03-refund-ready-rollback.png'});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#modalSalesCashier').evaluate(e=>e.scrollWidth<=innerWidth),true);
  await page.screenshot({path:folder+'/03-refund-ready-mobile-rollback.png'});
  await page.locator('#btnSaveSalesMoney').scrollIntoViewIfNeeded();
  await page.screenshot({path:folder+'/03-refund-ready-mobile-footer-rollback.png'});
  await page.setViewportSize({width:1366,height:1000});
  await page.click('#btnSaveSalesMoney');
  await page.waitForFunction(()=>document.querySelector('#salesCashierHistory').textContent.includes('Hoàn '));
  assert.equal(await page.locator('#salesCashierError').textContent(),'');
  assert.equal((await db.query('SELECT request_status FROM public.return_request WHERE id=$1',[rid])).rows[0].request_status,'completed');
  await page.locator('#formSalesCashier').evaluate(e=>e.scrollTop=0);
  assert.equal(await page.locator('#salesCashierLoyaltyPreview').textContent(),'Các yêu cầu trả hàng đã được hoàn tiền đầy đủ.');
  assert.equal(await page.locator('#btnSaveSalesMoney').isDisabled(),true);
  assert.ok(await page.locator('#salesCashierHistory').evaluate(e=>e.getBoundingClientRect().height>20));
  await page.screenshot({path:folder+'/04-refund-succeeded-rollback.png'});pass('UI refunds received return and database marks return completed');
  assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
  await db.query('ROLLBACK');transaction=false;
  assert.equal((await db.query('SELECT 1 FROM public.return_request WHERE id=$1',[rid])).rowCount,0);
  pass('All test collection, return, refund and delivery setup rolled back');
  fs.writeFileSync(folder+'/verification.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',scope:'Live HTTP loading; UI cashier writes via transaction-bound real Supabase RPCs; no mock data; test money rolled back',checks},null,2)+'\n');
 }finally{if(transaction)await db.query('ROLLBACK').catch(()=>{});await db.end();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
