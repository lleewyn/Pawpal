// Serve local source at the production browser origin; API traffic uses the real HTTPS tunnel.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local';
const env=require('dotenv').parse(fs.readFileSync(infra+'/.env'));
const log=fs.readFileSync(infra+'/demo-tunnel.stderr.log','utf8');
const cloudMode=process.argv.includes('--cloud');
const cloudConfig=cloudMode?require('dotenv').parse(fs.readFileSync(infra+'/CLOUD-MIGRATION.private.env')):null;
const url=cloudMode?cloudConfig.DESTINATION_SUPABASE_URL:log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)[0];
const anonKey=cloudMode?cloudConfig.DESTINATION_SUPABASE_ANON_KEY:env.ANON_KEY;
const credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();const failures=[],cloud=[];let websocketOpened=false;
  page.on('request',r=>{const host=new URL(r.url()).hostname;if(host.endsWith('.supabase.co')&&host!==new URL(url).hostname)cloud.push('old-cloud');});
  page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)failures.push(new URL(r.url()).pathname+':'+r.status());});
  page.on('websocket',()=>{websocketOpened=true;});
  await page.route('https://pawpalgr3.vercel.app/**',async route=>{
   const requested=new URL(route.request().url());
   if(requested.pathname==='/api/admin-config')return route.fulfill({contentType:'application/javascript',body:'window.__PAWPAL_SUPABASE_CONFIG__='+JSON.stringify({required:true,url,anonKey})+';'});
   if(requested.pathname==='/scripts/api/supabase-client.js')return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.resolve('scripts/api/supabase-client.js'),'utf8')});
   try{const response=await fetch('http://localhost:3001'+requested.pathname+requested.search);await route.fulfill({status:response.status,contentType:response.headers.get('content-type')||'text/plain',body:Buffer.from(await response.arrayBuffer())});}
   catch{await route.abort();}
  });
  await page.goto('https://pawpalgr3.vercel.app/admin/login');
  console.log('Login page loaded.');
  await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());
  await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());
  await page.locator('#btnSubmitAdminLogin').click();
  await page.waitForURL(u=>/^\/admin\/?$/.test(u.pathname),{timeout:45000});
  console.log('Login completed.');
  try{await page.waitForFunction(()=>window.PawpalCustomers?.state.listLoadStatus==='loaded',null,{timeout:45000});}
  catch(e){console.log('Diagnostic:',await page.evaluate(()=>({path:location.pathname+location.hash,state:window.PawpalCustomers?.state.listLoadStatus,config:window.SupabaseClientStatus,text:document.body.innerText.slice(-1800)})),failures);throw e;}
  console.log('Customer list loaded.');
  const result=await page.evaluate(()=>{
   const customers=Object.values(window.PawpalCustomers.state.customerDatabase);
   return {count:customers.length,points:customers.reduce((s,c)=>s+c.points,0),channels:window.getSupabaseClient().getChannels().map(c=>c.state)};
  });
  assert.equal(result.count,35);assert.equal(result.points,7964);
  console.log('Live source checks:',result,'API errors:',failures);
  await page.waitForFunction(()=>window.getSupabaseClient().getChannels().some(c=>c.state==='joined'),null,{timeout:30000});
  assert.equal(websocketOpened,true);assert.deepEqual(cloud,[]);assert.deepEqual(failures,[]);
  await page.screenshot({path:infra+'/verification/vercel-origin-'+(cloudMode?'cloud':'demo')+'-customers.png',fullPage:true});
  console.log('PASS simulated Vercel source + real '+(cloudMode?'Cloud API':'HTTPS tunnel')+': login, 35 customers, 7964 points, Realtime joined, no old Cloud requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
