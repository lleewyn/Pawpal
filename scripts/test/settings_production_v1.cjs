// Explicit opt-in. No edits to the operating configuration: only future-dated/private test records.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');const {createClient}=require('@supabase/supabase-js');const {settings,infra}=require('../database/v1/cloud_connection.cjs');const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
if(process.argv[2]!=='run')throw Error('Use run to explicitly verify Production');
async function ok(p){const r=await p;if(r.error)throw Error(r.error.message);return r.data;}
(async()=>{
 const {config}=settings(),service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),anon=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
 const tag='Settings acceptance '+randomUUID(),code='VERIFY'+randomUUID().slice(0,8).toUpperCase();const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1050}});let banner,article;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const raw=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');await page.goto('https://pawpalgr3.vercel.app/admin/login');await page.locator('#inputAdminEmail').fill(raw.match(/^Email: (.+)$/m)[1]);await page.locator('#inputAdminPassword').fill(raw.match(/^Password: (.+)$/m)[1]);await page.locator('#btnSubmitAdminLogin').click();await page.waitForFunction(()=>window.PawpalCustomers?.state.listLoadStatus==='loaded');
  await page.locator('[data-title="Cấu hình"]').click();await page.waitForFunction(()=>window.PawpalSettings?.state.isLoaded);assert.equal(await page.evaluate(()=>PawpalSettings.state.loadError),null);
  await page.waitForFunction(()=>PawpalSettings.state.isRealtimeHealthy===true);
  await page.locator('[data-tab="tab-banner-promos"]').click();await page.locator('[data-settingstab="mkt-banners"]').click();await page.locator('#btnOpenBannerModal').click();
  await page.locator('#inputBannerTitle').fill(tag);await page.locator('#inputBannerImage').fill('/assets/images/publics/dogcute6.jpg');await page.locator('#inputBannerUrl').fill('/shop');await page.locator('#inputBannerStartDate').fill('2099-01-01');await page.locator('#inputBannerEndDate').fill('2099-12-31');await page.locator('#btnSaveBanner').click();await page.waitForFunction(()=>!document.getElementById('bannerModalOverlay').classList.contains('active'));
  banner=await ok(service.from('banner').select('*').eq('title',tag).single());assert.deepEqual(await ok(anon.from('banner').select('id').eq('id',banner.id)),[]);
  await ok(service.from('banner').update({title:tag+' realtime'}).eq('id',banner.id));await page.waitForFunction(title=>PawpalSettings.state.bannersList.some(b=>b.title===title),tag+' realtime',{timeout:30000});
  console.log('PASS Production banner browser save, public future-date isolation and Realtime refresh.');
  await page.locator('[data-settingstab="mkt-vouchers"]').click();await page.locator('#btnOpenVoucherModalHeader').click();await page.locator('#inputVoucherCode').fill(code);await page.locator('#inputVoucherName').fill(tag);await page.locator('#inputVoucherType').selectOption('percent');await page.locator('#inputVoucherValue').fill('10');await page.locator('#inputVoucherMinOrder').fill('0');await page.locator('#inputVoucherLimit').fill('0');await page.locator('#inputVoucherStart').fill('2099-01-01');await page.locator('#inputVoucherEnd').fill('2099-12-31');await page.locator('#btnSaveVoucher').click();await page.waitForFunction(()=>!document.getElementById('voucherModalOverlay').classList.contains('active'));
  const voucher=await ok(service.from('voucher').select('type,max_usage').eq('voucher_code',code).single());assert.equal(voucher.type,'percentage');assert.equal(voucher.max_usage,0);
  await page.locator('[data-tab="tab-content-management"]').click();await page.evaluate(()=>{PawpalSettings.state.isSafeModeLocked=false;PawpalSettings.updateSafeModeUI();});await page.locator('#btnOpenCreateArticleModal').click();await page.locator('#inputArticleTitle').fill(tag);await page.locator('#inputArticleSummary').fill('Private acceptance summary');await page.locator('#inputArticleContent').fill('Private acceptance content');await page.locator('#btnSaveArticle').click();await page.waitForFunction(()=>!document.getElementById('articleModalOverlay').classList.contains('active'));
  article=await ok(service.from('blog_post').select('id,status,author_id').eq('title',tag).single());assert.equal(article.status,'nhap');assert.deepEqual(await ok(anon.from('blog_post').select('id').eq('id',article.id)),[]);
  for(const tab of ['tab-banner-promos','tab-content-management','tab-system-config','tab-audit-logs']){await page.locator('[data-tab="'+tab+'"]').click();}
  await page.screenshot({path:infra+'/settings-production-audit.private.png'});await page.reload();await page.waitForFunction(()=>window.PawpalSettings?.state.isLoaded);assert.equal(await page.evaluate(()=>PawpalSettings.state.loadError),null);
  assert.equal(errors.length,0);console.log('PASS Production voucher mapping, private article draft, four tabs, reload and no uncaught JavaScript errors.');
  assert.ok(Array.isArray(await ok(anon.rpc('get_public_site_notices'))));
 }finally{
  if(!banner)banner=await ok(service.from('banner').select('id').eq('title',tag).maybeSingle());if(banner)await ok(service.from('banner').delete().eq('id',banner.id));
  await ok(service.from('voucher').delete().eq('voucher_code',code));
  if(!article)article=await ok(service.from('blog_post').select('id').eq('title',tag).maybeSingle());if(article)await ok(service.from('blog_post').delete().eq('id',article.id));
  await browser.close();console.log('Removed dedicated acceptance rows; operating settings and audit trail preserved.');
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
