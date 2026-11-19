const assert=require('node:assert/strict'),fs=require('fs');const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const [phone,count]of [['0999999999',1],['0988888889',1],['0972163376',7]]){
  const context=await browser.newContext({viewport:{width:1366,height:1000},locale:'vi-VN'});try{const page=await context.newPage();
  await page.addLocatorHandler(page.locator('#pawpal-site-popup'),async()=>{await page.locator('#pawpal-site-popup .site-popup-btn-close').click();},{noWaitAfter:true});
  await page.goto('http://localhost:4100/return-guest');await page.locator('#rg-phone').fill(phone);await page.locator('#rg-form button[type=submit]').click();
  await page.locator('#rg-otp-modal').waitFor({timeout:30000});assert.equal(await page.locator('#rg-results').isVisible(),false);
  for(let i=0;i<6;i++)await page.locator('#rg-otp-modal .otp-input').nth(i).fill('555666'[i]);
  await page.locator('#rg-otp-confirm').click();await page.locator('#rg-results').waitFor({state:'visible',timeout:30000});
  assert.ok((await page.locator('#rg-results').textContent()).includes('Tất cả ('+count+')'));
  fs.mkdirSync('docs/verification',{recursive:true});await page.mouse.move(5,5);await page.waitForTimeout(600);await page.screenshot({path:'docs/verification/guest-lookup-'+phone+'.png',fullPage:true});console.log(phone+': PASS OTP and '+count+' live results');
  }finally{await context.close();}
 }
 const memberContext=await browser.newContext({viewport:{width:1366,height:1000},locale:'vi-VN'});try{
  const page=await memberContext.newPage();await page.addLocatorHandler(page.locator('#pawpal-site-popup'),async()=>{await page.locator('#pawpal-site-popup .site-popup-btn-close').click();},{noWaitAfter:true});
  await page.goto('http://localhost:4100/return-guest');await page.locator('#rg-phone').fill('0963963963');await page.locator('#rg-form button[type=submit]').click();
  await page.locator('#rg-error').waitFor({state:'visible',timeout:30000});assert.ok((await page.locator('#rg-error').textContent()).includes('đã có tài khoản'));
  await page.locator('#rg-form').screenshot({path:'docs/verification/guest-lookup-member-login-required.png'});console.log('0963963963: PASS member login guidance');
 }finally{await memberContext.close();}
 }finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
