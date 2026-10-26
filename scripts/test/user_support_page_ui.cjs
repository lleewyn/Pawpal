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
  window.PAWPAL_SUPPORT_PAGING_ENABLED=true;window.owner={id:'10000000-0000-4000-8000-000000000001'};localStorage.setItem('pawpal_current_user',JSON.stringify(owner));
  window.ticket={id:'20000000-0000-4000-8000-000000000001',ticket_code:'KH-E2E',subject:'<img src=x onerror="window.hacked=1">: E2E Ticket',description:'E2E Content',category:'other',status:'processing',priority:'normal',created_at:'2031-04-02T03:00:00Z',messages:[{id:'first',sender:'user',text:'E2E original',time:'2031-04-02T03:00:00Z'}]};
  window.calls=[];window.channels=[];window.failRead=false;window.failWrite=false;window.failAfterAck=false;window.holdRead=false;
  const client={auth:{getUser:async()=>({data:{user:{id:'auth-'+owner.id}}})},
   async rpc(name,args){calls.push({name,args});
    if(name==='own_support_tickets'){
     const who=owner.id;if(holdRead)await new Promise(r=>{window.releaseRead=r;});
     if(failRead){failRead=false;return {error:{code:'503'}};}
     const rows=Array.from({length:23},(_,i)=>({...structuredClone(ticket),id:'20000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),subject:'E2E Ticket '+(i+1),message_total:23,message_page:args.p_message_page,messages:Array.from({length:args.p_message_page===1?20:3},(_,j)=>({id:'m'+args.p_message_page+j,text:'MESSAGE PAGE '+args.p_message_page,sender:'user',time:ticket.created_at}))}));
     return {data:{rows:args.p_ticket?rows.filter(t=>t.id===args.p_ticket):rows.slice((args.p_page-1)*10,args.p_page*10),page:args.p_page,total:23,counts:{all:23,processing:23,pending:0,completed:0}}};
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
 await page.waitForFunction(()=>document.querySelectorAll('.btn-view-ticket').length===10);assert.match(await page.locator('#countAll').textContent(),/23/);
 await page.locator('#supportPages [data-next]').click();await page.waitForFunction(()=>document.querySelector('#supportPages').textContent.includes('2 / 3'));await page.locator('#supportPages [data-next]').click();await page.waitForFunction(()=>document.querySelectorAll('.btn-view-ticket').length===3);
 await page.locator('.btn-view-ticket').first().click();await page.waitForFunction(()=>document.querySelector('#ticketTimelineMessages').textContent.includes('MESSAGE PAGE 1'));assert.equal(await page.locator('.thread-message').count(),20);
 await page.locator('[data-older]').click();await page.waitForFunction(()=>document.querySelector('#ticketTimelineMessages').textContent.includes('MESSAGE PAGE 2'));assert.equal(await page.locator('.thread-message').count(),3);
 await page.evaluate(async()=>{const t=await PawPalSupport.ensureTicket('20000000-0000-4000-8000-000000000001');if(!t)throw Error('Off-page deep link missing');});assert.equal(await page.evaluate(()=>PawPalSupport.getPageTickets().length),3);
 assert.deepEqual(errors,[]);console.log('PASS Chrome offline support paging: 10/10/3 ticket rows, global counts, messages20/3, off-page owner detail without contaminating list. No Cloud.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
