const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage();await p.route('http://localhost:3001/',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'}));await p.route(/\.css(?:\?|$)/,route=>{const file=require('path').join(process.cwd(),new URL(route.request().url()).pathname);return route.fulfill({status:200,contentType:'text/css',body:fs.readFileSync(file,'utf8')})});await p.goto('http://localhost:3001/');
await p.setContent('<style>html,body{margin:0;height:100%}.chatbot-module-wrapper{height:100vh!important}</style><link rel="stylesheet" href="/pages/admin/admin.css"><link rel="stylesheet" href="/pages/admin/modules/chatbot/chatbot.css"><link rel="stylesheet" href="/pages/admin/modules/chatbot/chatbot-v8.css">'+fs.readFileSync('pages/admin/modules/chatbot/chatbot.html','utf8'));
await p.evaluate(()=>{
 window.chatEvents={};window.inboxCalls=[];window.getSupabaseClient=()=>({rpc:async(name,args)=>{if(name==='get_admin_chat_inbox_page'){inboxCalls.push(args);return {data:{page:args.p_page,total:23,counts:{all:23,urgent:0,active:0},rows:Array.from({length:args.p_page===3?3:10},(_,i)=>({id:'chat-'+args.p_page+'-'+i,status:'open',created_at:'2026-10-24T01:00:00Z',updated_at:'2026-10-24T01:00:00Z'}))}}}return {data:[]}},from(){const q={select(){return q},eq(){return q},in(){return q},order(){return q},limit(){return q},range(){return q},maybeSingle(){return q},then(resolve){resolve({data:[]})}};return q},channel(){const q={on(type,filter,callback){chatEvents[filter.table]=callback;return q},subscribe(){return q}};return q}});
});await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/chatbot.js','utf8')});
await p.waitForFunction(()=>PawpalChatbot.state.liveLoaded);
assert.equal(await p.evaluate(()=>PawpalChatbot.state.liveConversations.length),10);
await p.evaluate(()=>PawpalChatbot.loadInboxSummary({page:2}));
assert.equal(await p.evaluate(()=>PawpalChatbot.state.inboxPage.page),2);
await p.evaluate(()=>PawpalChatbot.loadInboxSummary({page:1}));
assert.equal(await p.evaluate(()=>inboxCalls.length),2);
await p.evaluate(()=>PawpalChatbot.loadInboxSummary({page:3}));
assert.equal(await p.evaluate(()=>PawpalChatbot.state.liveConversations.length),3);
await p.fill('#inboxSearchInput','search');await p.evaluate(()=>PawpalChatbot.loadInboxSummary({page:1}));
assert.equal(await p.evaluate(()=>inboxCalls.at(-1).p_query),'search');
await p.evaluate(()=>{const a={id:'a',messagesLoaded:true},b={id:'b',messagesLoaded:true};PawpalChatbot.state.liveConversations=[a,b];PawpalChatbot.state.currentConversation=a;chatEvents.chat_conversation({new:{id:'b'}});if(!a.messagesLoaded||b.messagesLoaded)throw Error('unrelated chat invalidated');b.messagesLoaded=true;chatEvents.chat_conversation({old:{id:'a'}});if(a.messagesLoaded||!b.messagesLoaded)throw Error('changed chat not invalidated');});
await b.close();console.log('PASS scoped conversation transcript invalidation; '+
'PASS 10-row inbox pages, final page, cached return and server query; mock API only.')})().catch(e=>{console.error(e);process.exit(1)});
