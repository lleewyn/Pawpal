// Real browser BasicAuth cache regression. No httpCredentials/extra auth headers.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const env=require('dotenv').parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/.env'));
if(env.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('Local only');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext(),page=await context.newPage();
  const cdp=await context.newCDPSession(page);
  let prompts=0;const rejected=[];
  cdp.on('Fetch.requestPaused',e=>cdp.send('Fetch.continueRequest',{requestId:e.requestId}).catch(()=>{}));
  cdp.on('Fetch.authRequired',e=>{
   prompts++;
   return cdp.send('Fetch.continueWithAuth',{requestId:e.requestId,authChallengeResponse:prompts===1?
    {response:'ProvideCredentials',username:env.DASHBOARD_USERNAME,password:env.DASHBOARD_PASSWORD}:
    {response:'CancelAuth'}}).catch(()=>{});
  });
  await cdp.send('Fetch.enable',{handleAuthRequests:true});
  page.on('response',r=>{if(r.status()===401)rejected.push(new URL(r.url()).pathname);});
  await page.goto('http://localhost:8000/',{waitUntil:'networkidle'});
  await page.goto('http://localhost:8000/project/default/editor/55061?schema=public',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>/\d+ records/.test(document.body.innerText));
  const responses=await page.evaluate(()=>Promise.all(['/favicon/manifest.json','/api/cli-release-version','/api/platform/profile'].map(async u=>(await fetch(u)).status)));
  assert.equal(prompts,1);assert.deepEqual(rejected,[]);assert(responses.every(s=>s===200));
  for(const route of ['/','/favicon/manifest.json','/api/platform/profile']){
   const r=await fetch('http://localhost:8000'+route,{redirect:'manual'});
   assert.equal(r.status,401);assert.equal(r.headers.get('www-authenticate'),'Basic realm="Pawpal Supabase Studio"');
  }
  const wrong=await fetch('http://localhost:8000/api/platform/profile',{headers:{authorization:'Basic '+Buffer.from('invalid:invalid').toString('base64')}});
  assert.equal(wrong.status,401);
  console.log('PASS Studio: exactly one browser login; table/assets/API load; anonymous and wrong credentials still denied.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message.split('\n')[0]);process.exitCode=1;});
