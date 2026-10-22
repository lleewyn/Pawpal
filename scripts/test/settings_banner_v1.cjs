const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {browserPage,service,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{const {browser,page}=await browserPage(),title='Banner verification '+randomUUID();
 page.on('console',m=>{if(m.type()==='error')console.log(m.text().slice(0,300));});
 try{
  await page.locator('[data-title="Cấu hình"]').click();await page.waitForFunction(()=>window.PawpalSettings?.state.isLoaded);
  await page.locator('[data-tab="tab-banner-promos"]').click();await page.locator('[data-settingstab="mkt-banners"]').click();
  await page.locator('#btnOpenBannerModal').click();
  await page.locator('#inputBannerTitle').fill(title);await page.locator('#inputBannerImage').fill('https://example.test/banner.png');await page.locator('#inputBannerUrl').fill('/shop');
  await page.locator('#inputBannerStartDate').fill('2026-10-01');await page.locator('#inputBannerEndDate').fill('2026-12-31');
  await page.screenshot({path:infra+'/settings-banner-v1.private.png'});
  await page.locator('#btnSaveBanner').click();await page.waitForFunction(()=>!document.getElementById('bannerModalOverlay').classList.contains('active'));
  const record=await ok(service.from('banner').select('*').eq('title',title).single());assert.equal(record.status,'active');
  assert.ok((await ok(service.from('audit_log').select('id').eq('entity_id',record.id).eq('action','SETTINGS_WRITE'))).length);
  await page.waitForFunction(title=>PawpalSettings.state.bannersList.some(b=>b.title===title),title);
  console.log('PASS banner browser save, actual DB record, atomic audit and refreshed list.');
 }finally{await browser.close();await ok(service.from('banner').delete().eq('title',title));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
