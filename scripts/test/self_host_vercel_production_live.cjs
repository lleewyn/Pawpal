// Read-only verification of the actual production deployment, without browser routing overrides.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local';
const env=require('dotenv').parse(fs.readFileSync(infra+'/.env'));
const cloudMode=process.argv.includes('--cloud');
const cloudConfig=cloudMode?require('dotenv').parse(fs.readFileSync(infra+'/CLOUD-MIGRATION.private.env')):null;
const expectedUrl=cloudMode?cloudConfig.DESTINATION_SUPABASE_URL:fs.readFileSync(infra+'/demo-tunnel.stderr.log','utf8').match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)[0];
const credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
const origin='https://pawpalgr3.vercel.app';
(async()=>{
 const configResponse=await fetch(origin+'/api/admin-config',{signal:AbortSignal.timeout(20000)});
 assert.equal(configResponse.status,200,'Production config endpoint must be ready');
 const sandbox={window:{}};vm.runInNewContext(await configResponse.text(),sandbox,{timeout:1000});
 const config=sandbox.window.__PAWPAL_SUPABASE_CONFIG__;
 assert.equal(config.required,true);assert.equal(config.url,expectedUrl,'Production URL must match the active tunnel');
 assert.equal(config.anonKey===(cloudMode?cloudConfig.DESTINATION_SUPABASE_ANON_KEY:env.ANON_KEY),true,'Production must use the destination anon key');
 const passwordResponse=await fetch(origin+'/api/admin/auth/complete-password-change',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"password":"unused-test-value"}',signal:AbortSignal.timeout(20000)});
 assert.equal(passwordResponse.status,401,'Password bridge must require authentication');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const failures=[],oldCloud=[];
  page.on('request',r=>{const host=new URL(r.url()).hostname;if(host.endsWith('.supabase.co')&&host!==new URL(expectedUrl).hostname)oldCloud.push('old-cloud');if(cloudMode&&host.endsWith('.trycloudflare.com'))oldCloud.push('old-tunnel');});
  page.on('response',r=>{if(r.url().startsWith(expectedUrl)&&r.status()>=400)failures.push(new URL(r.url()).pathname+':'+r.status());});
  await page.goto(origin+'/admin/login');
  await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());
  await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());
  await page.locator('#btnSubmitAdminLogin').click();
  await page.waitForURL('**/admin#tab-list',{timeout:45000});
  await page.waitForFunction(()=>window.PawpalCustomers?.state.listLoadStatus==='loaded',null,{timeout:45000});
  const result=await page.evaluate(()=>{
   const customers=Object.values(window.PawpalCustomers.state.customerDatabase);
   return {count:customers.length,points:customers.reduce((sum,c)=>sum+c.points,0)};
  });
  assert.equal(result.count,35);assert.equal(result.points,7964);
  await page.waitForFunction(()=>window.getSupabaseClient().getChannels().some(c=>c.state==='joined'),null,{timeout:30000});
  await page.reload();
  await page.waitForFunction(()=>window.PawpalCustomers?.state.listLoadStatus==='loaded',null,{timeout:45000});
  assert.deepEqual(failures,[]);assert.deepEqual(oldCloud,[]);
  await page.screenshot({path:infra+'/verification/vercel-production-'+(cloudMode?'cloud-':'')+'customers.png',fullPage:true});
  console.log('PASS actual Vercel Production: correct public config, protected password endpoint, Admin login, 35 customers, 7964 points, Realtime joined, reload and no old Cloud requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
