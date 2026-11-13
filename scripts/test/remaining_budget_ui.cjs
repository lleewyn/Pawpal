const fs=require('node:fs'),assert=require('node:assert/strict');const{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await p.goto('http://localhost:3012/');
 await p.setContent('<div id="viewTicketTimeline"></div><div id="complaintLinkedResults"></div>');
 await p.evaluate(()=>{
  window.messageReads=[];window.mod={state:{cachedStaff:[]},formatDateTime:v=>v};window.renderVersion=1;window.$=id=>document.getElementById(id);window.escapeHtml=v=>String(v??'').replaceAll('<','&lt;');window.readDetailResource=(_t,_key,load)=>load();
  window.client=()=>({from(table){const q={select(){return q;},eq(){return q;},order(){return q;},range(start,end){messageReads.push([start,end]);return {data:Array.from({length:23},(_,i)=>({id:String(23-i),sender_type:'customer',content:'Nội dung '+(23-i),created_at:String(23-i)})).slice(start,end+1)};}};return q;}});
 });
 let code=fs.readFileSync('pages/admin/modules/complaints/subtabs/tab-complaint-detail.js','utf8');let a=code.indexOf(' async function loadMessagePage('),b=code.indexOf(' async function loadAttachments(',a);await p.addScriptTag({content:code.slice(a,b)});
 await p.evaluate(()=>loadMessagePage({rawId:'ticket',customerName:'Khách'},1));assert.equal(await p.locator('article').count(),10);
 await p.getByRole('button',{name:'Xem trao đổi trước',exact:true}).click();await p.waitForFunction(()=>document.querySelectorAll('article').length===20);
 await p.getByRole('button',{name:'Xem trao đổi trước',exact:true}).click();await p.waitForFunction(()=>document.querySelectorAll('article').length===23);assert.equal(await p.locator('button').count(),0);assert.deepEqual(await p.evaluate(()=>messageReads),[[0,10],[10,20],[20,30]]);
 await p.setContent('<form id="lookup"><input id="rg-phone"><button type="submit">Tìm kiếm</button><p id="rg-error"></p></form><div id="rg-results"></div>');
 await p.evaluate(()=>{
  window.guestCalls=[];window.mountGuestBookingLookup=()=>{};window.mountGuestOrderLookup=()=>{};window.verifyGuestHistoryPhone=()=>{throw Error('Unexpected OTP');};
  window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:null}})}});
  window.guestCommerce={request:async(action,args)=>{guestCalls.push({action,args});const page=args.page??0,rows=Array.from({length:23},(_,i)=>({id:'order-'+i,code:'DH-'+i,total:100,status:'pending',lines:[]}));return {customer:{name:'Khách'},bookings:[],orders:rows.slice(page*10,page*10+10),pagination:{page,hasMore:page<2}};}};
 });
 code=fs.readFileSync('pages/public/return-guest/guest-phone-lookup.mjs','utf8').replace(/^import .*;\r?$/gm,'').replaceAll('export ','');await p.addScriptTag({content:code});
 await p.evaluate(()=>mountGuestPhoneLookup(document.getElementById('lookup'),{loadMember:()=>{throw Error('Unexpected member');},clearMember:()=>document.getElementById('rg-results').replaceChildren(),mapHistory:v=>v,renderMember:(_b,orders)=>{document.getElementById('rg-results').textContent=String(orders.length);}}));
 await p.fill('#rg-phone','0901234567');await p.locator('[type=submit]').click();await p.waitForFunction(()=>document.getElementById('rg-results').textContent==='10');
 await p.locator('#rg-history-more').click();await p.waitForFunction(()=>document.getElementById('rg-results').textContent==='20');await p.locator('#rg-history-more').click();await p.waitForFunction(()=>document.getElementById('rg-results').textContent==='23');assert.equal(await p.locator('#rg-history-more').count(),0);assert.deepEqual(await p.evaluate(()=>guestCalls.map(c=>c.args.page??0)),[0,1,2]);
 await p.fill('#rg-phone','0901234568');assert.equal(await p.locator('#rg-results').textContent(),'');
 console.log('PASS real complaint history helper: 10/20/23 on explicit clicks; real guest lookup controller: paged receipts, accumulation, terminal page and input clearing. No live reads.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
