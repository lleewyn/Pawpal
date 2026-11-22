// Live read-only business verification: open the actual order's form, never submit.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {settings}=require('../database/v1/cloud_connection.cjs');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const origin=process.env.PAWPAL_RETURN_TEST_ORIGIN||'http://localhost:4000';
const folder='docs/verification/return-lookup-live';
(async()=>{
 const {config}=settings(),options={auth:{persistSession:false,autoRefreshToken:false}};
 const admin=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options);
 const auth=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
 let browser;
 const ok=async promise=>{const result=await promise;if(result.error)throw Error(result.error.code||'Auth read failed');return result.data;};
 try{
  fs.mkdirSync(folder,{recursive:true});
  const identity=await ok(admin.auth.admin.getUserById('46a00820-9017-47f9-b252-c870c4a55131'));
  const link=await ok(admin.auth.admin.generateLink({type:'magiclink',email:identity.user.email}));
  const signed=await ok(auth.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token}));
  const meResponse=await fetch(origin+'/api/customer/auth/me',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+signed.session.access_token},body:'{}'});
  const me=await meResponse.json();assert.equal(me.success,true,me.message);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],dialogs=[];
  const waitDrawer=()=>page.waitForFunction(()=>{
   const drawer=document.querySelector('#rma-drawer.is-open');
   if(!drawer||!document.querySelector('#rma-drawer-container[open]'))return false;
   const rect=drawer.getBoundingClientRect();
   return rect.left>=0&&rect.width>0&&rect.right<=innerWidth&&getComputedStyle(drawer).right==='0px'
    &&drawer.getAnimations().every(animation=>animation.playState==='finished');
  },{},{timeout:5000}).catch(async error=>{
   const geometry=await page.evaluate(()=>{
    const drawer=document.querySelector('#rma-drawer'),container=document.querySelector('#rma-drawer-container');
    const info=node=>node?{rect:node.getBoundingClientRect().toJSON(),className:node.className,css:getComputedStyle(node).cssText,right:getComputedStyle(node).right,transform:getComputedStyle(node).transform,position:getComputedStyle(node).position}:null;
    return {innerWidth,clientWidth:document.documentElement.clientWidth,drawer:info(drawer),container:info(container)};
   });
   fs.writeFileSync(folder+'/geometry.txt',JSON.stringify(geometry,null,2));
   await page.screenshot({path:folder+'/geometry.png'});throw error;
  });
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.dismiss();});
  await page.addInitScript(({session,user,origin})=>{
   if(location.origin!==origin||sessionStorage.getItem('return-live-seeded'))return;
   sessionStorage.setItem('return-live-seeded','1');
   localStorage.setItem('sb-cpzuvaplseielhgcnqrn-auth-token',JSON.stringify(session));
   localStorage.setItem('pawpal_current_user',JSON.stringify(user));sessionStorage.setItem('pawpal_current_user',JSON.stringify(user));
  },{session:signed.session,user:me.user,origin});
  await page.goto(origin+'/return-guest');
  await page.waitForFunction(()=>document.querySelector('#rg-form')?.dataset.rgRecovery==='true');
  await page.locator('.site-popup-btn-close').first().waitFor({timeout:5000}).catch(()=>{});
  while(await page.locator('.site-popup-btn-close').first().isVisible())await page.locator('.site-popup-btn-close').first().click();
  await page.locator('#rg-phone').fill('0987987987');
  await page.locator('#rg-form [type=submit]').click();
  const order=page.locator('.rg-item').filter({has:page.locator('code[title="SO-a277eb7656d74d769163ec4d88c5e47b"]')});
  await order.waitFor({timeout:30000}).catch(async error=>{
   const state=await page.evaluate(()=>({phone:document.querySelector('#rg-phone')?.value,error:document.querySelector('#rg-error')?.textContent,resultsHidden:document.querySelector('#rg-results')?.className,title:document.title}));
   fs.writeFileSync(folder+'/lookup-failure.txt',JSON.stringify({origin,state,errors,dialogs},null,2));
   await page.screenshot({path:folder+'/lookup-failure.png'});throw error;
  });
  const button=order.getByRole('button',{name:'Yêu cầu đổi trả',exact:true});
  await button.scrollIntoViewIfNeeded();await order.screenshot({path:folder+'/order-before-click.png'});
  await button.click();
  await page.locator('#rma-drawer-container[open]').waitFor({timeout:15000}).catch(async error=>{
   fs.writeFileSync(folder+'/failure.txt',JSON.stringify({errors,dialogs},null,2));
   await page.screenshot({path:folder+'/failure.png'});throw error;
  });
  assert.match(await page.locator('#rma-drawer').innerText(),/Tã quần vệ sinh siêu thấm hút cho chó Dono/);
  await waitDrawer();
  await page.screenshot({path:folder+'/return-form-desktop.png'});
  await page.locator('#rma-close-btn').click();
  await page.locator('#rma-drawer-container[open]').waitFor({state:'hidden'});
  await button.click();await waitDrawer();
  await page.keyboard.press('Escape');
  await page.locator('#rma-drawer-container[open]').waitFor({state:'hidden'});
  await page.setViewportSize({width:390,height:844});
  await button.click();await waitDrawer();
  await page.screenshot({path:folder+'/return-form-mobile.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);
  await page.keyboard.press('Escape');
  fs.writeFileSync(folder+'/result.txt',JSON.stringify({status:'PASS',origin,timestamp:new Date().toISOString(),checks:['Actual phone lookup and selected SO-A277E button','Real member API and return-request reads','Drawer opens with original product','Close, reopen, Escape and mobile'],scope:'Live Supabase data. No return submission, uploaded files, password changes or messages sent.'},null,2)+'\n');
  console.log('PASS actual lookup button and member return drawer using live order; desktop/mobile evidence saved.');
 }finally{if(browser)await browser.close();await auth.auth.signOut({scope:'local'}).catch(()=>{});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
