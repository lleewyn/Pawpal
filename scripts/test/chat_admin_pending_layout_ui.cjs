// Controlled offline transport: real Admin HTML/CSS/JS, no Supabase or Gemini.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const out='docs/chatbot/admin-ui-feedback-2026-11-01';
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1440,height:900}}),posts=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',route=>{const r=route.request();if(new URL(r.url()).pathname==='/api/admin-chat'){
  if(r.method()==='POST'){posts.push({route,body:r.postDataJSON()});return;}
  return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,sessions:[],history:[],total:0,page:1})});
 }return route.fulfill({contentType:'text/html',body:'<body></body>'});});
 await p.goto('http://localhost:4000/');
 await p.setContent('<style>'+fs.readFileSync('pages/admin/admin.css','utf8')+'\n'+fs.readFileSync('pages/admin/modules/chatbot/chatbot.css','utf8')+'\nhtml,body{margin:0;height:100%;width:100%}.chatbot-module-wrapper{height:100vh!important}</style>'+fs.readFileSync('pages/admin/modules/chatbot/chatbot.html','utf8'));
 await p.evaluate(()=>{document.querySelectorAll('.chatbot-subtab-content').forEach(e=>e.classList.remove('active'));document.getElementById('subtab-tab-live-support').classList.remove('active');document.getElementById('subtab-tab-ai-copilot').classList.add('active');window.PawpalChatbot={subtabs:{},showToast:()=>{}};window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'controlled-offline',user:{id:'qa'}}}})}});});
 await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js','utf8')});await p.locator('.copilot-empty-notice').waitFor();
 const empty=await p.locator('.copilot-empty-notice').boundingBox(),area=await p.locator('#copilotMessagesArea').boundingBox();assert.ok(empty.y-area.y<25);assert.equal(await p.locator('.copilot-empty-notice').evaluate(e=>getComputedStyle(e).textAlign),'left');
 await p.fill('#copilotInput','Lượt lưu trú hôm nay');await p.click('#btnSendCopilot');await p.waitForFunction(()=>document.querySelector('.copilot-thinking-card'));
 assert.equal(await p.locator('#copilotMessagesArea .msg-user').count(),1);assert.equal(await p.locator('.copilot-empty-notice').count(),0);
 const user=await p.locator('#copilotMessagesArea .msg-user').boundingBox(),pending=await p.locator('.copilot-thinking-card').boundingBox();assert.ok(pending.y>=user.y+user.height,'pending follows the immediately visible question');assert.equal(await p.locator('#copilotMessagesArea').getAttribute('aria-busy'),'true');
 await p.locator('.copilot-container').screenshot({path:out+'/pending-desktop.png'});
 assert.equal(posts.length,1);await posts[0].route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Lỗi kết nối kiểm thử'})});await p.waitForFunction(()=>!document.getElementById('btnSendCopilot').disabled);
 assert.equal(await p.locator('.copilot-delivery-notice').count(),1);assert.equal(await p.inputValue('#copilotInput'),'Lượt lưu trú hôm nay');
 await p.click('#btnSendCopilot');await p.waitForFunction(()=>document.querySelector('.copilot-thinking-card'));assert.equal(posts.length,2);assert.equal(posts[0].body.requestId,posts[1].body.requestId);assert.equal(posts[0].body.sessionId,posts[1].body.sessionId);assert.equal(await p.locator('#copilotMessagesArea .msg-user').count(),1);
 await posts[1].route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,reply:'Không có lượt lưu trú phù hợp trong khoảng kiểm thử.'})});await p.waitForFunction(()=>!document.getElementById('btnSendCopilot').disabled);
 assert.equal(await p.locator('#copilotMessagesArea .msg-user').count(),1);assert.equal(await p.locator('#copilotMessagesArea .msg-ai').count(),1);assert.equal(await p.locator('.copilot-delivery-notice').count(),0);assert.equal(await p.inputValue('#copilotInput'),'');assert.equal(await p.locator('#copilotMessagesArea').getAttribute('aria-busy'),'false');
 const widths=[];for(const width of [1440,800,390]){await p.setViewportSize({width,height:900});await p.evaluate(()=>{document.getElementById('subtab-tab-ai-copilot').classList.remove('active');document.getElementById('subtab-tab-live-support').classList.add('active');});
  const h=await p.locator('.chat-header-single-row').boundingBox(),g=await p.locator('.chat-header-tools').boundingBox();assert.ok(g.x>=h.x&&g.x+g.width<=h.x+h.width+1,'tools inside header '+width);assert.ok(h.x+h.width-(g.x+g.width)<20,'tools align right '+width);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no page overflow '+width);widths.push(width);
  if(width===1440||width===390)await p.locator('.chat-header-single-row').screenshot({path:out+'/live-header-'+width+'.png'});
 }
 assert.deepEqual(errors,[]);const result={pass:true,scope:'Controlled offline network, actual production HTML/CSS/JS, no database/model',checks:['Question visible before API reply; empty hint removed; waiting follows question','503 retains one question and editable draft; retry reuses request/session IDs','Success has exactly one user and one assistant message; waiting/failure removed','Header tools right aligned with no viewport overflow'],widths,postRequests:posts.length};fs.writeFileSync(out+'/controlled-results.txt',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
