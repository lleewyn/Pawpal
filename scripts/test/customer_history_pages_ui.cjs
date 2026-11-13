const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const kind of ['orders','bookings']){
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>{
   const url=new URL(r.request().url());if(url.origin!=='http://history.test')return r.abort();
   if(url.pathname==='/')return r.fulfill({contentType:'text/html; charset=utf-8',body:fs.readFileSync('pages/user/modules/'+kind+'/'+kind+'.html','utf8')});
   if(url.pathname==='/scripts/api/api.js')return r.fulfill({contentType:'text/javascript',body:`
    async function page(user,options={}){const owner=typeof user==='string'?user:user.id;window.requests.push(options);const all=Array.from({length:23},(_,i)=>({id:'PRIVATE-'+owner+'-'+i,_supabaseId:'uuid-'+i,status:i%2?'pending':'${kind==='orders'?'completed':'confirmed'}',paymentStatus:'paid',createdAt:'2026-11-13T02:00:00Z',scheduledStartAt:'2026-12-01T03:00:00Z',date:'2026-12-01',time:'10:00',serviceName:'Spa',petName:'Bé',petId:'pet',products:[],items:[],pricing:{grandTotal:100,total:100}}));const rows=all.filter(row=>!options.status||options.status==='all'||row.status===options.status).filter(row=>!options.query||row.id.includes(options.query));const n=Math.min(options.page||1,Math.max(1,Math.ceil(rows.length/10)));return {rows:rows.slice((n-1)*10,n*10),meta:{owner,page:n,total:rows.length,counts:{all:23,pending:11,completed:${kind==='orders'?12:0},confirmed:12},stats:{processing:11,completed:12,spent:2300}}};}
    export const API={getUserOrderPage:page,getUserBookingPage:page,getUserPets(){throw Error('Unnecessary full pet list');}};`});
   if(/\/(return-handler|review-handler)\.js$/.test(url.pathname))return r.fulfill({contentType:'text/javascript',body:''});
   const file=path.join(process.cwd(),url.pathname);if(!fs.existsSync(file))return r.abort();return r.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(file)});
  });
  await p.goto('http://history.test/');await p.evaluate(()=>{window.requests=[];localStorage.setItem('pawpal_current_user',JSON.stringify({id:'A'}));const q={select:()=>q,in:()=>q,then:resolve=>Promise.resolve({data:[]}).then(resolve)};window.SupabaseClient={from:()=>q,channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){}};});
  await p.evaluate(async kind=>{window.mod=await import('/pages/user/modules/'+kind+'/'+kind+'.js');await mod.init();},kind);
  const selector=kind==='orders'?'#orders-list .order-card':'#bookingsList .booking-card';assert.equal(await p.locator(selector).count(),10);
  if(kind==='orders')await p.evaluate(()=>goToPage(3));else await p.locator('#bookingsPagination button').filter({hasText:/^3$/}).click();
  await p.waitForFunction(({selector})=>document.querySelectorAll(selector).length===3,{selector});
  assert.ok((await p.locator(kind==='orders'?'#orders-list':'#bookingsList').textContent()).includes('PRIVATE-A-22'));
  assert.equal(await p.evaluate(()=>requests.at(-1).page),3);
  if(kind==='orders')assert.equal((await p.locator('#total-spent').textContent()).replace(/\D/g,''),'2300');
  if(kind==='bookings'){
   await p.addStyleTag({content:fs.readFileSync('pages/user/user.css','utf8')+'\n'+fs.readFileSync('pages/user/modules/bookings/bookings.css','utf8')+'\nbody{font-family:Arial,sans-serif}.d-none{display:none!important}'});
   await p.setViewportSize({width:390,height:900});
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await p.screenshot({path:'D:/Aboutme/Pawpal-infra/verification/customer-booking-pages.private.png',fullPage:true});
  }
  await p.evaluate(()=>{localStorage.setItem('pawpal_current_user',JSON.stringify({id:'B'}));document.dispatchEvent(new CustomEvent('auth_state_changed'));});
  assert.ok(!(await p.locator(kind==='orders'?'#orders-list':'#bookingsList').textContent()).includes('PRIVATE-A'));
  assert.deepEqual(errors,[]);await p.close();
 }
 console.log('PASS real User orders/bookings: 10-row pages, last page, server requests/global totals, no full pet read, owner change clears rows. Offline only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
