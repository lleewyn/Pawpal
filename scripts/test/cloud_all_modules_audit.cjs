// Read-only production navigation audit. Block automatic writes during module initialization.
const fs=require('node:fs');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',origin='https://pawpalgr3.vercel.app';
const credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
const modules={Dashboard:['tab-dashboard'], 'Khách hàng':['tab-list','tab-profile','tab-pawpoint'],
 'Thú cưng':['tab-pet-list','tab-pet-profile','tab-pet-carelog','tab-pet-reminders'],
 'Dịch vụ':['tab-service-bookings','tab-service-detail','tab-service-catalog','tab-service-reviews'],
 'Bán hàng':['tab-order-list','tab-order-detail','tab-order-products','tab-order-promos'],
 'Nhân sự':['tab-staff-list','tab-staff-profile','tab-staff-schedule','tab-staff-assessment'],
 'Khiếu nại':['tab-complaint-services','tab-complaint-orders','tab-complaint-detail'],
 Chatbot:['tab-live-support','tab-ai-copilot','tab-chatbot-rules'],
 'Cấu hình':['tab-banner-promos','tab-content-management','tab-system-config','tab-audit-logs']};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const results=[],pending=[];
 const folder=infra+'/verification/all-modules-'+new Date().toISOString().replace(/[:.]/g,'-');fs.mkdirSync(folder,{recursive:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const login=await context.newPage();await login.goto(origin+'/admin/login');
  await login.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());
  await login.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());
  await login.locator('#btnSubmitAdminLogin').click();await login.waitForURL('**/admin#tab-list',{timeout:45000});await login.close();
  for(const [module,tabs] of Object.entries(modules)){
   const only=process.argv.find(a=>a.startsWith('--module='))?.slice(9);
   if(only&&module!==only)continue;
   const page=await context.newPage();let current;
   page.on('pageerror',e=>{if(current)current.jsErrors.push(e.message.slice(0,300));});
   page.on('response',r=>{
    if(!current)return;const target=current,u=new URL(r.url());
    if(u.hostname.endsWith('.supabase.co')&&u.hostname!=='cpzuvaplseielhgcnqrn.supabase.co')target.oldCloud.push(u.hostname);
    if(r.status()>=400){const entry={path:u.pathname,status:r.status(),select:u.searchParams.get('select')||undefined};target.httpErrors.push(entry);
     if(u.pathname.startsWith('/rest/v1/'))pending.push(r.json().then(data=>{entry.code=data.code;entry.message=data.message;}).catch(()=>{}));}
    if(u.pathname.endsWith('.json'))target.jsonFiles.push(u.pathname);
   });
   await page.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());const method=req.method();
    if(process.argv.includes('--workspace-complaints')&&u.pathname==='/pages/admin/modules/complaints/complaints.js')return route.fulfill({contentType:'application/javascript',body:fs.readFileSync('pages/admin/modules/complaints/complaints.js','utf8')});
    const readRpc=method==='POST'&&u.pathname.startsWith('/rest/v1/rpc/')&&/\/(get_|check_|search_|list_)/.test(u.pathname);
    if(!['GET','HEAD','OPTIONS'].includes(method)&&!readRpc){if(current)current.blockedWrites.push({path:u.pathname,method});return route.fulfill({status:409,contentType:'application/json',body:'{"error":"Read-only audit: write blocked"}'});}
    await route.continue();
   });
   for(let i=0;i<tabs.length;i++){
    const tab=tabs[i];current={module,tab,httpErrors:[],jsErrors:[],oldCloud:[],jsonFiles:[],blockedWrites:[]};results.push(current);
    try{
     if(i===0)await page.goto(origin+'/admin#'+tab,{waitUntil:'domcontentloaded',timeout:30000});
     else await page.evaluate(hash=>{location.hash=hash;},'#'+tab);
     await page.waitForTimeout(3200);
     current.render=await page.evaluate(()=>({hash:location.hash,textLength:document.querySelector('#contentArea')?.innerText.length||0,rows:document.querySelectorAll('#contentArea tbody tr').length,channels:window.getSupabaseClient()?.getChannels().map(c=>({topic:c.topic,state:c.state})),errorState:/Không thể tải|Lỗi tải|Không thể đồng bộ/.test(document.querySelector('#contentArea')?.innerText||'')}));
     await page.screenshot({path:folder+'/'+tab+'.png',fullPage:true});
    }catch(e){current.navigationError=e.message.slice(0,250);}
    console.log(module+' / '+tab+': '+current.httpErrors.length+' HTTP errors, '+current.jsErrors.length+' JS errors, '+current.blockedWrites.length+' blocked writes');
   }
   await page.close();
   await Promise.allSettled(pending);
   fs.writeFileSync(folder+'/results.private.txt',JSON.stringify(results,null,2));
  }
  await Promise.allSettled(pending);
  fs.writeFileSync(folder+'/results.private.txt',JSON.stringify(results,null,2));
  const suffix=process.argv.some(a=>a.startsWith('--module='))?'-focused':'';
  fs.writeFileSync(infra+'/all-modules-audit'+suffix+'-latest.private.txt',JSON.stringify({folder,results},null,2));
  console.log('Audit evidence saved outside webroot: '+folder);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
