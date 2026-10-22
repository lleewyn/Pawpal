// Deterministically reproduce navigation while a module script is still loading.
// Reads Cloud only; delays a static script, never substitutes business data.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const file=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),errors=[],writes=[];let release;
try{
 const gate=new Promise(resolve=>release=resolve);let reached;const held=new Promise(resolve=>reached=resolve);
 await page.route('**/modules/customers/subtabs/tab-customer-list.js*',async route=>{reached();await gate;await route.continue();});
 await page.route('**/rest/v1/**',route=>{const r=route.request();if(!['GET','HEAD'].includes(r.method())&&!['get_staff_login_context','get_admin_staff_directory'].some(name=>new URL(r.url()).pathname==='/rest/v1/rpc/'+name)){writes.push(new URL(r.url()).pathname);return route.abort();}return route.continue();});
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 await page.goto((process.env.TEST_BASE_URL||'https://pawpalgr3.vercel.app')+'/admin/login');await page.locator('#inputAdminEmail').fill(file.match(/^Email: (.+)$/m)[1].trim());await page.locator('#inputAdminPassword').fill(file.match(/^Password: (.+)$/m)[1].trim());await page.locator('#btnSubmitAdminLogin').click();
 await held;await page.locator('[data-title="Nhân sự"]').click();await page.locator('[data-title="Bán hàng"]').click();
 assert.equal(await page.locator('#quickAddPetSpecies').count(),1,'Customer form must remain attached until its scripts finish');
 release();await page.waitForFunction(()=>window.PawpalOrders?.state.ordersLoaded&&window.PawpalOrders?.state.productsLoaded);
 await page.locator('[data-title="Khách hàng"]').click();await page.waitForFunction(()=>window.PawpalCustomers?.state.listLoadStatus==='loaded'&&document.getElementById('quickAddPetSpecies'));
 await page.locator('[data-title="Nhân sự"]').click();await page.waitForFunction(()=>window.PawpalStaff?.state.isLoaded&&PawpalStaff.subtabs.schedule);
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log('PASS delayed customer script plus rapid queued Sales/Staff navigation, return to customer forms, no detached-DOM initialization errors or business writes');
}finally{release?.();await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
