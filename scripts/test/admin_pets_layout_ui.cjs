const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage();await p.route('http://localhost:3000/',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'}));await p.route(/\.css(?:\?|$)/,route=>{const file=require('path').join(process.cwd(),new URL(route.request().url()).pathname);return route.fulfill({status:200,contentType:'text/css',body:fs.readFileSync(file,'utf8')})});await p.goto('http://localhost:3000/');
await p.setContent('<style>html,body{margin:0;height:100%}.chatbot-module-wrapper{height:100vh!important}</style><link rel="stylesheet" href="/pages/admin/admin.css"><link rel="stylesheet" href="/pages/admin/modules/pets/pets.css"><link rel="stylesheet" href="/pages/admin/modules/pets/pets-v8.css">'+fs.readFileSync('pages/admin/modules/pets/pets.html','utf8'));
const findings=[];
for(const id of ['subtab-tab-pet-list','subtab-tab-pet-profile','subtab-tab-pet-carelog','subtab-tab-pet-reminders']){
 await p.evaluate(id=>document.querySelectorAll('.subtab-content').forEach(e=>e.classList.toggle('active',e.id===id)),id);
 for(const width of [1440,390]){await p.setViewportSize({width,height:900});const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)findings.push({type:'tab-overflow',id,width});await p.screenshot({path:'D:/Aboutme/Pawpal-infra/supabase-local/verification/'+id+'-'+width+'.png',fullPage:true});}
}
console.log(JSON.stringify(findings));assert.deepEqual(findings,[]);
await b.close();console.log('PASS four Pets tab layouts; static presentation only, no database requests.')})().catch(e=>{console.error(e);process.exit(1)});
