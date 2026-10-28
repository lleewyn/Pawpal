const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),requests=[],errors=[],id='10000000-0000-4000-8000-000000000001';page.on('pageerror',e=>errors.push(e.message));
 const complete='😀 á <img src=x onerror="window.injected=true"> '.repeat(120),chars=Array.from(complete),revision=crypto.createHash('md5').update(complete).digest('hex'),preview=chars.slice(0,1200).join('');let fail=true;
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname!=='/api/admin-chat')return route.fulfill({contentType:'text/html',body:'<body></body>'});let data,status=200;
  if(u.searchParams.get('view')==='sessions')data={ok:true,sessions:[{id,title:'Tin dài',message_count:1,updated:'2026-10-28T00:00:00Z'}],total:1,page:1};
  else if(u.searchParams.get('view')==='message_part'){const offset=Number(u.searchParams.get('offset'));requests.push(offset);assert.equal(u.searchParams.get('revision'),revision);if(fail){fail=false;status=503;data={ok:false,error:'Chưa tải được phần tiếp theo.'};}else{const next=Math.min(chars.length,offset+2000);data={ok:true,id,content:chars.slice(offset,next).join(''),offset,next_offset:next,hasMore:next<chars.length,revision};}}
  else data={ok:true,history:[{id,role:'user',content:preview,content_partial:true,content_offset:1200,content_revision:revision,created_at:'2026-10-28T00:00:00Z'}],hasMore:false};
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://localhost:3001/');await page.setContent(fs.readFileSync('pages/admin/modules/chatbot/chatbot.html','utf8'));
 await page.evaluate(()=>{sessionStorage.setItem('pawpal_admin_active_module','Chatbot');document.getElementById('subtab-tab-ai-copilot').classList.add('active');window.PawpalChatbot={subtabs:{},showToast(){}};window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'offline',user:{id:'actor'}}}})}});});
 await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js','utf8')});const more=page.getByRole('button',{name:'Đọc tiếp tin nhắn',exact:true});await more.waitFor();assert.equal(requests.length,0);
 await more.click();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Đọc tiếp tin nhắn').disabled);assert.equal(await page.locator('.copilot-msg-bubble').textContent(),preview);
 while(await more.count()){await more.click();await page.waitForFunction(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Đọc tiếp tin nhắn');return !b||!b.disabled;});}
 assert.equal(await page.locator('.copilot-msg-bubble').textContent(),complete);assert.deepEqual(requests,[1200,1200,3200,5200]);assert.equal(await page.locator('.copilot-msg-bubble img').count(),0);assert.equal(await page.evaluate(()=>Boolean(window.injected)),false);assert.deepEqual(errors,[]);
 console.log('PASS partial message is explicit and never prefetched; failed read retains preview; clicks reconstruct Unicode without HTML execution; offline browser.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
