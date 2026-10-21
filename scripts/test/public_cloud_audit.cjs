const fs=require('node:fs'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',origin='https://pawpalgr3.vercel.app';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
 try{
  for(const path of ['/','/shop','/services','/booking','/login','/user','/cart','/checkout','/blog','/contact']){
   const page=await browser.newPage(),entry={path,httpErrors:[],jsErrors:[],cloudProjects:[],jsonFiles:[],blockedWrites:[]},pending=[];results.push(entry);
   page.on('pageerror',e=>entry.jsErrors.push(e.message.slice(0,200)));
   page.on('response',r=>{const u=new URL(r.url());if(u.hostname.endsWith('.supabase.co'))entry.cloudProjects.push(u.hostname);if(u.pathname.endsWith('.json'))entry.jsonFiles.push(u.pathname);if(r.status()>=400){const item={path:u.pathname,status:r.status()};entry.httpErrors.push(item);if(u.pathname.startsWith('/rest/v1/'))pending.push(r.json().then(j=>{item.message=j.message;item.code=j.code;}).catch(()=>{}));}});
   await page.route('**/*',async route=>{const req=route.request();if(!['GET','HEAD','OPTIONS'].includes(req.method())){entry.blockedWrites.push({path:new URL(req.url()).pathname,method:req.method()});return route.fulfill({status:409,contentType:'application/json',body:'{"error":"Read-only audit"}'});}await route.continue();});
   try{const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:25000});entry.pageStatus=response.status();await page.waitForTimeout(2200);entry.actualPath=new URL(page.url()).pathname;}catch(e){entry.navigationError=e.message.slice(0,150);}
   await Promise.allSettled(pending);entry.cloudProjects=[...new Set(entry.cloudProjects)];entry.jsonFiles=[...new Set(entry.jsonFiles)];await page.close();console.log(path+': '+entry.httpErrors.length+' HTTP errors; projects='+entry.cloudProjects.join(','));
  }
  fs.writeFileSync(infra+'/public-cloud-audit.private.txt',JSON.stringify(results,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
