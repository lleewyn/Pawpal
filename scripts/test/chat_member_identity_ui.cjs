// Controlled transport/identities; tests the actual widget. No real credentials, API writes or model calls.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage();await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<body></body>'}));await p.goto('http://localhost:4000/');await p.setContent(fs.readFileSync('components/fab/fab.html','utf8'));
 await p.evaluate(()=>{
  window.identity='member-a';window.waitSend=false;window.releaseSend=null;window.messagesByOwner={};window.ownerByConversation={};
  window.setInterval=()=>1;
  window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:identity?{user:{id:identity},access_token:'fixture-'+identity}:null}}),onAuthStateChange(fn){window.authChanged=fn;}}});
  window.changeIdentity=value=>{identity=value;authChanged(value?'SIGNED_IN':'SIGNED_OUT',value?{user:{id:value},access_token:'fixture-'+value}:null);};
  window.fetch=async(_u,init)=>{const b=JSON.parse(init.body),owner=identity||'guest';if(b.action==='public_open')ownerByConversation[b.conversationId]=owner;
   if(b.action==='public_send'){if(waitSend){await new Promise(r=>releaseSend=r);waitSend=false;}const messages=messagesByOwner[owner]||=[];messages.push({id:b.requestId,sender_type:'customer',content:b.question,created_at:new Date().toISOString()},{id:crypto.randomUUID(),sender_type:'bot',content:'PRIVATE_'+owner+' [Đơn của bạn](/user#order-detail?id=11111111-1111-4111-8111-111111111111) [Không cho phép](/user#settings?token=fixture)',created_at:new Date(Date.now()+1).toISOString()});}
   const allowed=ownerByConversation[b.conversationId]===owner;return {ok:allowed,status:allowed?200:403,json:async()=>({ok:allowed,messages:allowed?messagesByOwner[owner]||[]:[],status:'bot_handling',hasMore:false,updatedAt:String(Date.now())})};};
 });await p.addScriptTag({content:fs.readFileSync('components/fab/fab.js','utf8')});await p.click('#fabAiBtn');
 const send=async text=>{await p.fill('#fabChatInput',text);await p.click('#fabChatSend');await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled);};
 await send('Đơn hàng của tôi');assert.match(await p.locator('#fabChatMessages').innerText(),/PRIVATE_member-a/);assert.equal(await p.locator('a[href^="/user#order-detail?id="]').count(),1);assert.equal(await p.locator('a[href*="token="]').count(),0);
 await p.evaluate(()=>changeIdentity('member-b'));await p.waitForFunction(()=>!document.querySelector('#fabChatMessages').textContent.includes('PRIVATE_member-a'));await send('Điểm của tôi');assert.match(await p.locator('#fabChatMessages').innerText(),/PRIVATE_member-b/);assert.doesNotMatch(await p.locator('#fabChatMessages').innerText(),/PRIVATE_member-a/);
 await p.evaluate(()=>changeIdentity('member-a'));await p.waitForFunction(()=>document.querySelector('#fabChatMessages').textContent.includes('PRIVATE_member-a'));assert.doesNotMatch(await p.locator('#fabChatMessages').innerText(),/PRIVATE_member-b/);
 await p.evaluate(()=>{waitSend=true;releaseSend=null;});await p.fill('#fabChatInput','Lịch hẹn của tôi');await p.click('#fabChatSend');await p.waitForFunction(()=>!!releaseSend);await p.evaluate(()=>{changeIdentity('member-b');releaseSend();});await p.waitForFunction(()=>!document.querySelector('.fab-send-state'));assert.doesNotMatch(await p.locator('#fabChatMessages').innerText(),/PRIVATE_member-a|Lịch hẹn của tôi/);
 await p.evaluate(()=>changeIdentity(null));await p.waitForFunction(()=>document.querySelector('.fab-chat-welcome'));assert.doesNotMatch(await p.locator('#fabChatMessages').innerText(),/PRIVATE_member-/);
 console.log('PASS Chrome member widget: allowed account link only, A/B transcript isolation, own history restoration, stale pending response blocked and logout clears private content. Controlled identities/transport only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
