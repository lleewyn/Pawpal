// Offline browser: real module and renderer, intercepted RPCs only.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<body></body>'}));await page.goto('http://localhost:3001/');
 await page.setContent(fs.readFileSync('pages/admin/modules/chatbot/chatbot.html','utf8'));
 for(const f of ['pages/admin/admin.css','pages/admin/modules/chatbot/chatbot.css'])await page.addStyleTag({content:fs.readFileSync(f,'utf8')});
 await page.evaluate(()=>{
  sessionStorage.setItem('pawpal_admin_active_module','Chatbot');window.reads=[];window.mode='ok';
  const row={id:'10000000-0000-4000-8000-000000000001',customer_id:'customer-a',customer_profile:{full_name:'QA panel',email:'qa@example.invalid',phone:'0900000000'},status:'agent_handling',created_at:'2026-10-28T00:00:00Z',updated_at:'2026-10-28T00:00:00Z'};
  window.panelData={pets:Array.from({length:10},(_,i)=>({id:'pet-'+i,name:'Bé '+i,breed:'Mèo',notes:''})),petsHasMore:true,openTickets:Array.from({length:5},(_,i)=>({id:'QA-'+i,title:'Yêu cầu hỗ trợ '+i})),ticketsHasMore:true,recentOrder:null,recentBooking:null,pawpoints:15,tier:'Bạc'};
  window.getSupabaseClient=()=>({
   rpc:async(name,args)=>{reads.push({name,args});if(name==='get_admin_chat_inbox_view')return {data:{rows:[row],page:1,total:1,counts:{all:1,urgent:0,active:1}}};
    if(name==='get_admin_chat_customer_panel'){if(mode==='defer')await new Promise(r=>window.completePanel=r);return mode==='fail'?{error:{code:'PT429'}}:{data:structuredClone(panelData)};}if(name==='get_admin_chat_messages_bounded')return {data:window.messagePage||{messages:[],hasMore:false}};if(name==='read_admin_chat_message_part')return {data:window.partResponse};return {data:[]};},
   from(table){if(['customer_profile','customer','customer_phone','pet_profile','sales_order','appointment','customer_point_balance','customer_membership'].includes(table))throw Error('Unexpected direct read '+table);const q={select:()=>q,eq:()=>q,order:()=>q,range:async()=>({data:[]}),then:r=>r({data:[]})};return q;},
   channel(){const q={on:()=>q,subscribe:()=>q};return q;},removeChannel(){}
  });
 });
 await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/chatbot.js','utf8')});await page.waitForFunction(()=>PawpalChatbot.state.liveLoaded);
 assert.equal(await page.evaluate(()=>reads.filter(r=>r.name==='get_admin_chat_inbox_view').length),1);assert.equal(await page.evaluate(()=>PawpalChatbot.state.liveConversations[0].customerName),'QA panel');
 await page.evaluate(()=>Promise.all([PawpalChatbot.loadCustomerContext('customer-a'),PawpalChatbot.loadCustomerContext('customer-a')]));
 assert.equal(await page.evaluate(()=>reads.filter(r=>r.name==='get_admin_chat_customer_panel').length),1);
 await page.evaluate(()=>PawpalChatbot.loadCustomerContext('customer-a'));assert.equal(await page.evaluate(()=>reads.filter(r=>r.name==='get_admin_chat_customer_panel').length),1);
 await page.evaluate(()=>{window.clockNow=Date.now;Date.now=()=>clockNow()+31000;});await page.evaluate(()=>PawpalChatbot.loadCustomerContext('customer-a'));assert.equal(await page.evaluate(()=>reads.filter(r=>r.name==='get_admin_chat_customer_panel').length),2);
 await page.evaluate(()=>{Date.now=clockNow;mode='defer';window.stale=PawpalChatbot.loadCustomerContext('customer-b');});await page.waitForFunction(()=>Boolean(window.completePanel));
 const stale=await page.evaluate(async()=>{PawpalChatbot.invalidateCustomerCache('customer-b');mode='ok';completePanel();return stale;});assert.equal(stale.error,true);
 await page.evaluate(()=>PawpalChatbot.loadCustomerContext('customer-b'));assert.equal(await page.evaluate(()=>reads.filter(r=>r.name==='get_admin_chat_customer_panel').length),4);
 await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js','utf8')});
 await page.evaluate(async()=>{const c=PawpalChatbot.state.liveConversations[0];c.messagesLoaded=true;PawpalChatbot.state.currentConversation=c;await PawpalChatbot.loadConversationDetails(c);PawpalChatbot.subtabs.live.renderCustomerInfoPanel();});
 await page.evaluate(()=>{PawpalChatbot.invalidateCustomerCache('customer-a');mode='defer';const c=PawpalChatbot.state.currentConversation;c.contextLoaded=false;window.oldDetails=PawpalChatbot.loadConversationDetails(c);});
 await page.waitForFunction(()=>Boolean(window.completePanel));
 const race=await page.evaluate(async()=>{const c=PawpalChatbot.state.currentConversation;PawpalChatbot.invalidateCustomerCache('customer-a');mode='ok';await PawpalChatbot.loadConversationDetails(c);completePanel();await oldDetails;return {error:c.contextError,points:c.pawpoints};});assert.deepEqual(race,{error:false,points:15});
 await page.evaluate(async()=>{const c=PawpalChatbot.state.currentConversation;c.messagesLoaded=false;window.messagePage={messages:Array.from({length:7},(_,i)=>({id:'first-'+i,created_at:'2026-10-28T00:00:'+String(16-i).padStart(2,'0')+'Z',sender_type:'bot',content:'Tin '+(16-i)})),hasMore:true};await PawpalChatbot.loadConversationDetails(c);});
 assert.equal(await page.getByRole('button',{name:'Tin nhắn trước',exact:true}).count(),1,'short byte-limited page must still expose older history');
 await page.evaluate(()=>{messagePage={messages:[9,8].map(i=>({id:'older-'+i,created_at:'2026-10-28T00:00:0'+i+'Z',sender_type:'bot',content:'Tin '+i})),hasMore:false};});
 await page.getByRole('button',{name:'Tin nhắn trước',exact:true}).click();await page.waitForFunction(()=>PawpalChatbot.state.currentConversation.messages.length===9);
 assert.equal(await page.getByRole('button',{name:'Tin nhắn trước',exact:true}).count(),0);assert.equal(await page.evaluate(()=>reads.filter(r=>r.name==='get_admin_chat_messages_bounded').at(-1).args.p_before_id),'first-6');
 await page.evaluate(async()=>{const c=PawpalChatbot.state.currentConversation;c.messagesLoaded=false;messagePage={messages:[{id:'long-message',content:'á'.repeat(1200),content_partial:true,content_offset:1200,content_revision:'a'.repeat(32),sender_type:'bot',created_at:'2026-10-28T00:00:00Z'}],hasMore:false};partResponse={id:'long-message',content:'tail',offset:1200,next_offset:1204,revision:'a'.repeat(32),hasMore:false};await PawpalChatbot.loadConversationDetails(c);});
 assert.equal(await page.evaluate(()=>reads.filter(r=>r.name==='read_admin_chat_message_part').length),0);
 await page.getByRole('button',{name:'Đọc tiếp tin nhắn',exact:true}).click();await page.waitForFunction(()=>!PawpalChatbot.state.currentConversation.messages[0].contentPartial);
 assert.equal(await page.evaluate(()=>PawpalChatbot.state.currentConversation.messages[0].text),'á'.repeat(1200)+'tail');
 assert.ok((await page.locator('#infoPetsList').textContent()).includes('Chỉ hiển thị 10'));assert.ok((await page.locator('#infoOpenTicketsList').textContent()).includes('Chỉ hiển thị 5'));
 fs.mkdirSync('docs/chatbot/stage2-panels-2026-10-28',{recursive:true});await page.screenshot({path:'docs/chatbot/stage2-panels-2026-10-28/panel-ui.png'});
 await page.evaluate(async()=>{mode='fail';PawpalChatbot.invalidateCustomerCache('customer-a');const c=PawpalChatbot.state.currentConversation;c.contextLoaded=false;await PawpalChatbot.loadConversationDetails(c);PawpalChatbot.subtabs.live.renderCustomerInfoPanel();});
 assert.equal(await page.locator('#infoCustomerPoints').textContent(),'Chưa tải được điểm');assert.equal(await page.locator('#infoPetsList').textContent(),'Chưa tải được thông tin thú cưng');assert.equal(await page.locator('#infoRecentOrder').textContent(),'Chưa tải được đơn hàng');
 const retry=await page.evaluate(async()=>{mode='ok';return PawpalChatbot.loadCustomerContext('customer-a');});assert.equal(retry.pawpoints,15);assert.deepEqual(errors,[]);
 console.log('PASS single inbox RPC, customer panel coalescing/cache TTL/invalidation race, explicit hasMore and no false-zero on load failure; offline browser only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
