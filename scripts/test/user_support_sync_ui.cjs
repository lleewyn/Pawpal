// Actual support list/detail/helper with offline RPC transport. No Cloud calls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1050},timezoneId:'UTC'}),errors=[],dialogs=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.origin!=='http://localhost')return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/pages/user/user.css"><link rel="stylesheet" href="/pages/user/modules/support/support.css"><style>.d-none{display:none!important}</style>'+fs.readFileSync('pages/user/modules/support/support.html','utf8')});
  if(u.pathname.startsWith('/assets/'))return route.fulfill({status:204});
  return route.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(path.join(process.cwd(),decodeURIComponent(u.pathname)),'utf8')});
 });
 await page.goto('http://localhost/#support');await page.clock.install();
 await page.evaluate(async()=>{
  window.owner={id:'10000000-0000-4000-8000-000000000001'};localStorage.setItem('pawpal_current_user',JSON.stringify(owner));
  window.ticket={id:'20000000-0000-4000-8000-000000000001',ticket_code:'KH-E2E',subject:'<img src=x onerror="window.hacked=1">: E2E Ticket',description:'E2E Content',category:'other',status:'processing',priority:'normal',created_at:'2031-04-02T03:00:00Z',messages:[{id:'first',sender:'user',text:'E2E original',time:'2031-04-02T03:00:00Z'}]};
  window.calls=[];window.channels=[];window.failRead=false;window.failWrite=false;window.failAfterAck=false;window.holdRead=false;
  const client={auth:{getUser:async()=>({data:{user:{id:'auth-'+owner.id}}})},
   async rpc(name,args){calls.push({name,args});
    if(name==='own_support_tickets'){
     const who=owner.id;if(holdRead)await new Promise(r=>{window.releaseRead=r;});
     if(failRead){failRead=false;return {error:{code:'503'}};}
     return {data:who==='10000000-0000-4000-8000-000000000001'?[structuredClone(ticket)]:[]};
    }
    if(failWrite)return {error:{code:'503'}};
    if(name==='reply_own_support_ticket'){
     if(!ticket.messages.some(m=>m.id===args.p_id))ticket.messages.push({id:args.p_id,sender:'user',text:args.p_content,time:'2031-04-02T03:30:00Z'});
     if(failAfterAck){failAfterAck=false;failRead=true;}return {data:args.p_id};
    }
    if(name==='create_own_support_ticket')return {data:args.p_id};
    if(name==='rate_own_support_ticket')return {data:args.p_ticket};
    throw Error('Unexpected RPC '+name);
   },
   channel(name){const c={name,removed:false,handlers:[],on(type,filter,fn){this.handlers.push({filter,fn});return this;},subscribe(){return this;}};channels.push(c);return c;},
   removeChannel(c){c.removed=true;}
  };
  window.getSupabaseClient=()=>client;
  window.module=await import('/pages/user/modules/support/support.js');module.init();
 });
 await page.waitForFunction(()=>window.PawPalSupport?.getTickets().length===1);await page.clock.runFor(250);
 assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='own_support_tickets').length),1);
 await page.evaluate(()=>Promise.all(Array.from({length:10},()=>PawPalSupport.loadTickets())));
 assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='own_support_tickets').length),2,'Parallel readers share one RPC');
 await page.clock.runFor(60000);assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='own_support_tickets').length),2,'Idle has no polling');
 await page.evaluate(()=>{for(let i=0;i<10;i++)channels.at(-1).handlers[0].fn();});await page.clock.runFor(250);
 await page.waitForFunction(()=>calls.filter(c=>c.name==='own_support_tickets').length===3);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});for(let i=0;i<10;i++)channels.at(-1).handlers[0].fn();});await page.clock.runFor(60000);
 assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='own_support_tickets').length),3,'Hidden view defers events');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.clock.runFor(250);
 await page.waitForFunction(()=>calls.filter(c=>c.name==='own_support_tickets').length===4);
 await page.evaluate(()=>{holdRead=true;window.slowLoad=PawPalSupport.loadTickets();});await page.waitForFunction(()=>!!window.releaseRead);
 await page.evaluate(()=>{for(let i=0;i<10;i++)channels.at(-1).handlers[0].fn();holdRead=false;releaseRead();});await page.evaluate(()=>slowLoad);await page.clock.runFor(250);
 await page.waitForFunction(()=>calls.filter(c=>c.name==='own_support_tickets').length===6);
 await page.locator('.btn-view-ticket').first().click();
 assert.equal(await page.evaluate(()=>channels.filter(c=>!c.removed).length),1,'Open detail must not create another channel');
 assert.equal(await page.evaluate(()=>window.hacked||0),0);assert.equal(await page.locator('#detailTicketSubmeta img').count(),0,'Untrusted title context must be escaped');
 assert.ok((await page.locator('.thread-time').first().innerText()).includes('10:00'),'UTC browser still displays Vietnam time');
 await page.locator('#replyTextarea').fill('E2E unsent draft');
 await page.evaluate(()=>{ticket.messages.push({id:'admin',sender:'cskh',text:'E2E Admin update',time:'2031-04-02T03:10:00Z'});channels.at(-1).handlers[0].fn();});await page.clock.runFor(250);
 await page.waitForFunction(()=>document.getElementById('ticketTimelineMessages').textContent.includes('E2E Admin update'));
 assert.equal(await page.locator('#replyTextarea').inputValue(),'E2E unsent draft');
 await page.evaluate(()=>{ticket.status='resolved';ticket.resolution_note='E2E Resolution';channels.at(-1).handlers[0].fn();});await page.clock.runFor(250);
 await page.waitForFunction(()=>!document.getElementById('ratingFeedbackArea').classList.contains('d-none'));
 assert.equal(await page.evaluate(()=>channels.filter(c=>!c.removed).length),1);
 await page.evaluate(()=>{ticket.status='processing';delete ticket.resolution_note;channels.at(-1).handlers[0].fn();});await page.clock.runFor(250);
 await page.waitForFunction(()=>!document.getElementById('replyEditorArea').classList.contains('d-none'));
 await page.evaluate(()=>{failAfterAck=true;});await page.locator('#replyTextarea').fill('E2E ack then refresh error');await page.evaluate(()=>{document.getElementById('btnSendReply').click();document.getElementById('btnSendReply').click();});
 await page.waitForFunction(()=>!document.getElementById('btnSendReply').disabled);
 assert.equal(await page.locator('#replyTextarea').inputValue(),'','Acknowledged reply clears draft even if refresh fails');
 assert.equal(await page.locator('#supportSyncError').count(),1);assert.equal(dialogs.length,0);
 assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='reply_own_support_ticket'&&c.args.p_content==='E2E ack then refresh error').length),1);
 await page.evaluate(()=>PawPalSupport.loadTickets());assert.equal(await page.locator('#supportSyncError').count(),0);
 await page.evaluate(()=>{failWrite=true;});await page.locator('#replyTextarea').fill('E2E retry draft');await page.locator('#btnSendReply').click();await page.waitForFunction(()=>!document.getElementById('btnSendReply').disabled);
 assert.equal(await page.locator('#replyTextarea').inputValue(),'E2E retry draft');assert.equal(dialogs.length,1);
 // Reload the helper's in-memory journal while keeping browser sessionStorage.
 await page.evaluate(()=>PawPalSupport.stopRealtime());
 await page.addScriptTag({content:fs.readFileSync('scripts/shared/support-handler.js','utf8')});
 await page.evaluate(()=>{failWrite=false;});await page.locator('#btnSendReply').click();await page.waitForFunction(()=>!document.getElementById('btnSendReply').disabled);
 const retries=await page.evaluate(()=>calls.filter(c=>c.name==='reply_own_support_ticket'&&c.args.p_content==='E2E retry draft'));
 assert.equal(retries.length,2);assert.equal(retries[0].args.p_id,retries[1].args.p_id);
 await page.locator('#replyTextarea').fill('E2E retry draft');await page.locator('#btnSendReply').click();await page.waitForFunction(()=>!document.getElementById('btnSendReply').disabled);
 const again=await page.evaluate(()=>calls.filter(c=>c.name==='reply_own_support_ticket'&&c.args.p_content==='E2E retry draft').at(-1));assert.notEqual(again.args.p_id,retries[0].args.p_id,'Same content sent as a new intent after ack gets a new ID');
 await page.locator('#replyTextarea').fill('E2E private draft A');fs.mkdirSync('docs/verification/sync',{recursive:true});await page.screenshot({path:'docs/verification/sync/support-detail-offline.png'});
 await page.evaluate(async()=>{failWrite=true;await PawPalSupport.createTicket('E2E same title','other','E2E same content').catch(()=>{});failWrite=false;});
 const createA=await page.evaluate(()=>calls.filter(c=>c.name==='create_own_support_ticket').at(-1).args.p_id);
 await page.evaluate(()=>{holdRead=true;window.pending=PawPalSupport.loadTickets().then(()=>false,()=>true);});await page.waitForFunction(()=>!!window.releaseRead);
 await page.evaluate(()=>{owner={id:'other-owner'};localStorage.setItem('pawpal_current_user',JSON.stringify(owner));document.dispatchEvent(new Event('auth_state_changed'));holdRead=false;releaseRead();});
 assert.equal(await page.evaluate(()=>pending),true);assert.equal(await page.evaluate(()=>PawPalSupport.getTickets().length),0);
 assert.equal(await page.locator('#replyTextarea').inputValue(),'');assert.equal(await page.locator('#ticketTimelineMessages').innerText(),'');
 assert.equal(await page.evaluate(()=>channels.filter(c=>!c.removed).length),0);
 await page.evaluate(()=>PawPalSupport.createTicket('E2E same title','other','E2E same content'));
 assert.notEqual(await page.evaluate(()=>calls.filter(c=>c.name==='create_own_support_ticket').at(-1).args.p_id),createA,'Actor B must not reuse A retry ID for the same content');
 const before=await page.evaluate(()=>calls.length);await page.clock.runFor(60000);assert.equal(await page.evaluate(()=>calls.length),before);
 assert.deepEqual(errors,[]);await page.evaluate(()=>module.dispose());
 console.log('PASS offline support: one channel, coalesced readers/event bursts, idle/hidden no polling, live detail/status update preserves draft, escaped title, ack vs refresh error, stable retry/new-intent IDs, actor isolation/cleanup. No Cloud calls.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
