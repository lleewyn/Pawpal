const fs=require('node:fs'),assert=require('node:assert/strict');const{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage();await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await p.goto('http://localhost:3008/');
 await p.setContent(fs.readFileSync('pages/user/modules/support/support-create.html','utf8'));
 await p.evaluate(()=>{
  window.calls=[];window.getCurrentUser=()=>({id:'owner'});window.getSupabaseClient=()=>({auth:{getUser:async()=>({data:{user:{id:'auth'}}})}});
  window.createEvidenceMediaEditor=()=>({reset:async()=>{},close(){}});
  window.API={getContextChoices:async(user,kind,filter)=>{calls.push({kind,filter});return [{id:kind==='orders'?'OLD-23':'BKG-23',_supabaseId:'old-id',products:[{name:'Hạt cho bé'}],petName:'Miu',serviceName:'Tắm',date:'2026-01-01'}];}};
 });
 let code=fs.readFileSync('pages/user/modules/support/support-create.js','utf8').replace(/^import .*;\r?$/gm,'').replaceAll('export ','');
 await p.addScriptTag({content:code});await p.evaluate(()=>initSupportCreate());assert.equal(await p.evaluate(()=>calls.length),0);
 await p.focus('#orderSearch');await p.fill('#orderSearch','OLD-23');await p.waitForFunction(()=>document.querySelectorAll('#orderOptions button').length===1);
 await p.locator('#orderOptions button').click();assert.equal(await p.locator('#orderSelect').inputValue(),'old-id');
 assert.deepEqual(await p.evaluate(()=>calls.map(c=>c.filter.query)),['OLD-23']);
 await p.evaluate(()=>dispose());await p.focus('#serviceBookingSearch');await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>calls.length),1);
 console.log('PASS actual Support create: no history on open, debounced remote search finds older order, stores selected ID, no reads after disposal.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
