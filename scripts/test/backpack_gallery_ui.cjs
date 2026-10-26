const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 for(const file of ['scripts/shared/data-loader.js','pages/shop/product-detail/product-detail.js','pages/shop/product-detail/product-detail.css'])await page.route('**/'+file+'*',r=>r.fulfill({contentType:file.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(file,'utf8')}));
 await page.goto('https://pawpalgr3.vercel.app/pages/shop/product-detail/product-detail.html?id=a0000000-0000-0000-0000-000000000032');
 await page.waitForSelector('.pd-variant-chip');
 const gallery=()=>page.locator('#thumbnails img').evaluateAll(es=>es.map(e=>e.getAttribute('src')));
 const initial=await gallery();assert.equal(initial.length,5);
 for(const [name,file,index] of [['Xanh','PK-BALO-05.png',1],['Hồng','pk-balo-05.jpg',0],['Xanh','PK-BALO-05.png',1]]){
  await page.locator('.pd-variant-chip').filter({hasText:new RegExp('^'+name+'$')}).click();
  assert.deepEqual(await gallery(),initial);
  assert.ok((await page.locator('#mainImage').getAttribute('src')).endsWith(file));
  assert.equal(await page.locator('#thumbnails .thumbnail.active').evaluate(e=>[...e.parentElement.children].indexOf(e)),index);
 }
 // Manual gallery navigation remains independent from the purchasable color selection.
 await page.locator('#thumbnails .thumbnail').nth(3).click();
 assert.ok((await page.locator('#mainImage').getAttribute('src')).endsWith('PK-BALO-05_3.png'));
 assert.equal(await page.locator('.pd-variant-chip.active').textContent(),'Xanh');
 await page.locator('.pd-variant-chip').filter({hasText:/^Hồng$/}).click();
 assert.equal(await page.locator('#thumbnails .thumbnail').count(),5);
 await page.waitForFunction(()=>{const i=document.getElementById('mainImage');return i.complete&&i.naturalWidth>0;});
 await page.screenshot({path:'docs/verification/products-final/backpack-full-gallery.png'});
 console.log('PASS 5 thumbnails retained across green/pink switches; main image and active thumbnail follow color; manual gallery browsing remains available.');
}finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
