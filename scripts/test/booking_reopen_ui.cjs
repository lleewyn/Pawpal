// Exercise the real booking modules with isolated transport; no Cloud writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const origin='http://localhost:4567',id='11111111-1111-4111-8111-111111111111';
const fixture=`
localStorage.setItem('pawpal_current_user',JSON.stringify({id:'customer',auth_user_id:'auth'}));
window.readCalls={};window.writeCalls=0;
function failOnce(name){
 const mode=sessionStorage.getItem('fault');readCalls[name]=(readCalls[name]||0)+1;
 if(!location.search&&mode===name&&readCalls[name]===1)throw name==='auth'?{name:'AbortError',message:'signal is aborted without reason'}:{message:'AbortError: signal is aborted without reason'};
 if(!location.search&&name==='customer_service_catalog'&&mode==='persistent')throw {status:503};
 if(!location.search&&name==='customer_service_catalog'&&mode==='permanent')throw {status:403,message:'customer_session_required'};
}
window.getSupabaseClient=()=>({
 auth:{async getSession(){failOnce('auth');return {data:{session:{user:{id:'auth'}}}};},async getUser(){return {data:{user:{id:'auth'}}};},onAuthStateChange(){}},
 async rpc(name){
  if(/^(create_|hold_|release_)/.test(name))writeCalls++;
  failOnce(name);
  return {data:({customer_service_catalog:{services:[],rooms:[]},own_booking_pets:[{id:'pet',name:'Bé kiểm thử',species:'Mèo',weight:4}],customer_profile_snapshot:{id:'customer',name:'Chủ nuôi',phone:'0900000001'},own_booking_restriction:{locked:false}})[name]||null};
 },
 from(table){const query={select(){return query},eq(){return query},async maybeSingle(){failOnce('prior');return {data:null}},async single(){return {data:{id:'${id}',appointment_status:'confirmed',scheduled_start_at:'2026-12-01T03:00:00Z',scheduled_end_at:'2026-12-01T04:00:00Z'}}},then(resolve){resolve({data:[]})}};return query;}
});`;
const html=fs.readFileSync('my-client/pages/services/booking/booking.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</head>',`<script>${fixture}</script><script type="module" src="/pages/services/booking/booking.js"></script></head>`);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const fault of ['auth','prior','customer_service_catalog','none','persistent','permanent']){
   const context=await browser.newContext();const page=await context.newPage();const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
    if(url.pathname==='/booking')return route.fulfill({contentType:'text/html',body:html});
    const target=path.resolve('.','.'+url.pathname);assert.ok(target.startsWith(process.cwd()+path.sep));
    if(/\.m?js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(target,'utf8')});
    return route.fulfill({body:''});
   });
   await page.goto(origin+'/booking?bookingSuccess='+id);
   await page.locator('#bookingReceiptTitle').waitFor();
   await page.evaluate(fault=>sessionStorage.setItem('fault',fault),fault);
   // Use the same menu link as a customer reopening booking after success.
   await page.locator('a[href="/booking"]').first().evaluate(link=>link.click());
   await page.waitForURL(origin+'/booking');
   if(['persistent','permanent'].includes(fault)){
    await page.locator('#bookingReload').waitFor();
    assert.equal(await page.evaluate(()=>readCalls.customer_service_catalog),fault==='persistent'?2:1);
   }else{
    await page.getByRole('button',{name:/Bé kiểm thử/}).waitFor();
    assert.equal(await page.locator('#bookingReload').count(),0);
    if(fault!=='none')assert.equal(await page.evaluate(name=>readCalls[name],fault),2);
   }
   assert.equal(await page.evaluate(()=>writeCalls),0);assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS receipt → menu → new booking: auth/read interruption recovers without reload; persistent/permanent failures stay visible; no booking writes are replayed. Isolated transport only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
