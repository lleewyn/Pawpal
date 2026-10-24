const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage();await p.route('http://localhost:3000/',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'}));await p.route(/\.css(?:\?|$)/,route=>{const file=require('path').join(process.cwd(),new URL(route.request().url()).pathname);return route.fulfill({status:200,contentType:'text/css',body:fs.readFileSync(file,'utf8')})});await p.goto('http://localhost:3000/');
await p.setContent('<style>html,body{margin:0;height:100%}.chatbot-module-wrapper{height:100vh!important}</style><link rel="stylesheet" href="/pages/admin/admin.css"><link rel="stylesheet" href="/pages/admin/modules/chatbot/chatbot.css"><link rel="stylesheet" href="/pages/admin/modules/chatbot/chatbot-v8.css">'+fs.readFileSync('pages/admin/modules/chatbot/chatbot.html','utf8'));
await p.evaluate(()=>window.getSupabaseClient=()=>null);await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/chatbot.js','utf8')});await p.evaluate(()=>{const btn=document.createElement('button');btn.id='auditOpener';btn.textContent='Open';document.body.append(btn)});
const findings=[];
for(const id of ['subtab-tab-live-support','subtab-tab-ai-copilot','subtab-tab-chatbot-rules']){
 await p.evaluate(id=>document.querySelectorAll('.subtab-content').forEach(e=>e.classList.toggle('active',e.id===id)),id);
 for(const width of [1440,390]){await p.setViewportSize({width,height:900});const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)findings.push({type:'tab-overflow',id,width});await p.screenshot({path:'D:/Aboutme/Pawpal-infra/supabase-local/verification/'+id+'-'+width+'.png',fullPage:true});}
}
for(const id of await p.locator('.admin-modal-overlay[id]').evaluateAll(es=>es.map(e=>e.id))){
 await p.evaluate(id=>{document.getElementById('auditOpener').focus();PawpalChatbot.openModal(id)},id);await p.waitForTimeout(60);assert.equal(await p.locator('#'+id+' [role=dialog]').count(),1);await p.keyboard.press('Tab');assert.equal(await p.locator('#'+id).evaluate(e=>e.contains(document.activeElement)),true);
 for(const width of [1440,390]){await p.setViewportSize({width,height:900});const box=await p.locator('#'+id).locator(':scope > *').first().boundingBox();if(box&&(box.x<0||box.x+box.width>width+1))findings.push({type:'modal-overflow',id,width,box});}
 await p.keyboard.press('Escape');assert.equal(await p.locator('#'+id).isVisible(),false);assert.equal(await p.locator('#auditOpener').evaluate(e=>document.activeElement===e),true);
}
assert.deepEqual(findings,[]);console.log('PASS 3 tabs / 12 modal bounds; dialog roles, Tab containment, Escape and focus restoration; no database writes.');
await b.close();console.log('Audit of 3 tabs and 12 modal bounds complete; static layout only, no database calls.')})().catch(e=>{console.error(e);process.exit(1)});
