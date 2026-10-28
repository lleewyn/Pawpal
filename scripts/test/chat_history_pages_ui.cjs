const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),offsets=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 const id='10000000-0000-4000-8000-000000000001';
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname!=='/api/admin-chat')return route.fulfill({contentType:'text/html',body:'<body></body>'});
  let data;if(u.searchParams.get('view')==='sessions')data={ok:true,sessions:[{id,title:'Lịch sử nhiều trang',message_count:35,updated:'2026-10-28T00:00:00Z'}],total:1,page:1};
  else{const offset=Number(u.searchParams.get('offset')||0),end=35-offset,start=Math.max(0,end-7);offsets.push(offset);data={ok:true,history:Array.from({length:end-start},(_,i)=>({id:'m-'+(start+i),role:'user',content:'Tin lịch sử '+(start+i),created_at:'2026-10-28T00:00:00Z'})),hasMore:start>0};}
  return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://localhost:3001/');await page.setContent(fs.readFileSync('pages/admin/modules/chatbot/chatbot.html','utf8'));
 await page.evaluate(()=>{sessionStorage.setItem('pawpal_admin_active_module','Chatbot');document.getElementById('subtab-tab-ai-copilot').classList.add('active');window.PawpalChatbot={subtabs:{},showToast(){}};window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'offline',user:{id:'actor'}}}})}});});
 await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js','utf8')});await page.waitForFunction(()=>document.querySelectorAll('#copilotMessagesArea .copilot-msg').length===7);
 for(const count of [14,21,28,35]){await page.getByRole('button',{name:'Tải tin nhắn cũ hơn',exact:true}).click();await page.waitForFunction(n=>document.querySelectorAll('#copilotMessagesArea .copilot-msg').length===n,count);}
 assert.deepEqual(offsets,[0,7,14,21,28]);assert.equal(await page.getByRole('button',{name:'Tải tin nhắn cũ hơn',exact:true}).count(),0);assert.ok((await page.locator('#copilotMessagesArea .copilot-msg').first().textContent()).includes('Tin lịch sử 0'));assert.deepEqual(errors,[]);
 console.log('PASS byte-limited seven-message pages continue at actual offsets and render all 35 messages without duplicates or premature stop; offline browser.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
