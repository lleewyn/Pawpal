// Read-only acceptance: forbid all business writes, including mutation RPCs.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],legacy=[],writes=[];
try{
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
 page.on('request',r=>{const u=new URL(r.url());if((u.hostname.endsWith('.supabase.co')&&u.hostname!=='cpzuvaplseielhgcnqrn.supabase.co')||u.hostname.endsWith('.trycloudflare.com')||u.pathname.startsWith('/data/'))legacy.push(u.hostname+u.pathname);});
 await page.route('**/rest/v1/**',route=>{const r=route.request(),allowed=['get_staff_login_context','get_admin_sales_cashier'];if(!['GET','HEAD'].includes(r.method())&&!allowed.some(v=>new URL(r.url()).pathname==='/rest/v1/rpc/'+v)){writes.push(new URL(r.url()).pathname);return route.abort();}return route.continue();});
 await page.goto((process.env.TEST_BASE_URL||'https://pawpalgr3.vercel.app')+'/admin/login');await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());await page.locator('#btnSubmitAdminLogin').click();await page.waitForURL('**/admin#tab-list');
 await page.locator('[data-title="Bán hàng"]').click();await page.waitForFunction(()=>window.PawpalOrders?.state.productsLoaded&&PawpalOrders.state.ordersLoaded&&PawpalOrders.state.vouchersLoaded);
 const summary=await page.evaluate(async()=>{
  const s=PawpalOrders.state,db=getSupabaseClient();const [orders,totals,inventory]=await Promise.all([db.from('sales_order').select('id'),db.from('sales_order_totals').select('*'),db.from('inventory').select('quantity_in_stock')]);
  if([orders,totals,inventory].some(v=>v.error))throw Error('Could not read source balances');
  return {products:s.products.length,orders:s.orders.length,sourceOrders:orders.data.length,stock:s.products.flatMap(p=>p.variants).filter(v=>v.stock!==null).reduce((n,v)=>n+v.stock,0),sourceStock:inventory.data.reduce((n,v)=>n+v.quantity_in_stock,0),mismatch:s.orders.filter(o=>Number(o.total)!==Number(totals.data.find(t=>t.order_id===o.rawId)?.total_amount)).length,errors:[s.productsError,s.ordersError,s.vouchersError]};
 });assert.equal(summary.orders,summary.sourceOrders);assert.equal(summary.stock,summary.sourceStock);assert.equal(summary.mismatch,0);assert.deepEqual(summary.errors,[false,false,false]);
 await page.evaluate(()=>{PawpalOrders.switchSubtab('tab-order-products');PawpalOrdersModule.openProductReviewsModal(PawpalOrders.state.products[0].sku);});
 await page.waitForFunction(()=>document.getElementById('productReviewsListContainer').textContent!=='Đang tải đánh giá…');
 await page.locator('#modalProductReviews [data-close-modal="modalProductReviews"]').first().click();
 await page.evaluate(()=>PawpalOrdersModule.openStockLogsModal(PawpalOrders.state.products[0].sku));await page.locator('#modalStockLogs.active').waitFor();await page.locator('#modalStockLogs [data-close-modal="modalStockLogs"]').first().click();
 await page.evaluate(()=>PawpalOrders.switchSubtab('tab-order-promos'));await page.evaluate(()=>PawpalOrders.switchSubtab('tab-order-list'));
 await page.evaluate(()=>PawpalOrdersModule.confirmPayment(PawpalOrders.state.orders[0].id));
 await page.locator('#modalSalesCashier.active').waitFor();
 await page.locator('#modalSalesCashier [data-close-modal="modalSalesCashier"]').first().click();
 await page.waitForFunction(()=>getSupabaseClient().getChannels().some(c=>c.topic.includes('admin-orders-live-sync')&&c.state==='joined'));
 await page.reload();await page.waitForFunction(()=>window.PawpalOrders?.state.ordersLoaded);
 await page.screenshot({path:infra+'/sales-cloud-list.private.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(legacy,[]);assert.deepEqual(writes,[]);
 fs.writeFileSync(infra+'/sales-cloud-read-verification.private.txt',JSON.stringify({verifiedAt:new Date().toISOString(),...summary}));
 console.log('PASS Cloud Sales source totals/stock, lists, reviews, journal, tabs, Realtime, reload, no old Cloud/JSON/errors/business writes: '+summary.orders+' orders, '+summary.products+' products');
}catch(e){await page.screenshot({path:infra+'/sales-cloud-failure.private.png',fullPage:true}).catch(()=>{});console.error(JSON.stringify({errors,legacy,writes,url:page.url()}));throw e;}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
