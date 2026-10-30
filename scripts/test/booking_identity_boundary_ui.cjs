// Real booking, auth and header modules with isolated HTTP/DB transport. No Cloud data is read or written.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const base='http://localhost:4567';
const user={id:'owner-a',auth_user_id:'auth-a',name:'Previous owner',phone:'0900000001',is_temporary:false};
const pet={id:'11111111-1111-4111-8111-111111111111',name:'Previous pet',breedId:'breed',species:'Chó',species_id:'dog',weight:5};
const script=`
window.getSupabaseClient=()=>window.fixtureDb;
window.fixtureDb={auth:{
 async getUser(){const user=JSON.parse(localStorage.getItem('pawpal_current_user')||'null');return {data:{user:user?{id:user.auth_user_id}:null}};},
 async getSession(){return {data:{session:null}};},async setSession(){return {error:null};},
 async signOut(){window.fixtureAuthListener?.('SIGNED_OUT',null);return {error:null};},
 onAuthStateChange(fn){window.fixtureAuthListener=fn;return {data:{subscription:{unsubscribe(){}}}};}
},async rpc(name){
 if(name==='customer_profile_snapshot')return {data:JSON.parse(localStorage.getItem('pawpal_current_user')||'null')};
 if(name==='own_booking_pets'){const current=JSON.parse(localStorage.getItem('pawpal_current_user')||'null');return {data:[{...${JSON.stringify(pet)},name:current?.id==='owner-a'?'Previous pet':'Other pet'}]};}
 if(name==='customer_service_catalog')return {data:{services:[],rooms:[]}};
 return {data:[]};
},from(){const q={select(){return q},eq(){return q},async maybeSingle(){return {data:null}},then(resolve){resolve({data:[]})}};return q;}};
`;
const html=booking=>`<!doctype html><html><head><script>${script}</script>
<script defer src="/scripts/shared/auth.js"></script><script defer src="/scripts/shared/customer-auth.js"></script><script defer src="/components/header/header.js"></script>
<script type="module">import {installGuestSessionBoundary} from '/scripts/shared/guest-session-boundary.mjs';installGuestSessionBoundary();</script>
${booking?'<script type="module" src="/pages/services/booking/booking.js"></script>':''}</head><body>
${booking?'<main class="booking-main"><div id="bookingStepper"><div class="step" data-step="1"><span class="step-label">Chọn bé cưng</span></div></div><div id="step1"></div><div id="step2"></div><div id="step3"></div><div id="step4"></div><aside id="bookingSummary"></aside></main>':''}</body></html>`;

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext();let oldGuest=true,endCount=0,holdEnd=false,releaseEnd;
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url()),pathname=url.pathname;
   if(url.origin!==base)return route.fulfill({status:404,body:''});
   if(pathname==='/api/customer/guest/end'){
    endCount++;if(holdEnd)await new Promise(r=>releaseEnd=r);oldGuest=false;
    return route.fulfill({json:{success:true}});
   }
   if(pathname.startsWith('/api/customer/guest/'))return route.fulfill({json:{success:true,initialized:oldGuest,contact:oldGuest?{name:user.name,phone:user.phone}:undefined,pets:oldGuest?[pet]:[],page:1,hasMore:false}});
   if(pathname.endsWith('.js')||pathname.endsWith('.mjs')){
    const target=path.resolve('.','.'+pathname);assert.ok(target.startsWith(process.cwd()+path.sep));
    return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(target,'utf8')});
   }
   return route.fulfill({contentType:'text/html',body:html(pathname==='/booking')});
  });
  const first=await context.newPage();
  await first.goto(base+'/booking');await first.locator('#guestOwnerName').waitFor();
  assert.equal(await first.locator('#guestOwnerName').inputValue(),'');assert.ok(!(await first.locator('body').innerText()).includes('Previous owner'));
  assert.equal(endCount,1);assert.equal(oldGuest,false); // One-time cleanup for pre-fix cookies, even if already signed out.
  await first.goto(base+'/login-test');
  await first.waitForFunction(()=>window.PawpalCustomerAuth);
  await first.evaluate(user=>window.PawpalCustomerAuth.accept({user,session:{access_token:'fixture',refresh_token:'fixture'}}),user);
  assert.equal(endCount,2);assert.equal(oldGuest,false);
  await first.goto(base+'/booking');await first.getByText('Previous pet',{exact:true}).waitFor();
  const second=await context.newPage();await second.goto(base+'/booking');await second.getByText('Previous pet',{exact:true}).waitFor();
  oldGuest=true;holdEnd=true;
  await first.evaluate(()=>{window.pawpalLogout().catch(error=>window.logoutFailure=error.message);});
  await first.waitForFunction(()=>!document.querySelector('.booking-main')?.textContent.includes('Previous owner'));
  await second.waitForFunction(()=>!document.querySelector('.booking-main')?.textContent.includes('Previous owner'));
  assert.equal(first.url(),base+'/booking'); // No premature reload before sign-out completes.
  while(!releaseEnd)await new Promise(r=>setImmediate(r));holdEnd=false;releaseEnd();
  await first.waitForURL(base+'/',{waitUntil:'commit'}).catch(async error=>{if(!String(error.message).includes('ERR_ABORTED'))throw error;await first.waitForFunction(()=>location.pathname==='/');});
  await first.goto(base+'/booking');await first.locator('#guestOwnerName').waitFor();
  await second.goto(base+'/booking');await second.locator('#guestOwnerName').waitFor();
  for(const page of [first,second]){
   assert.equal(await page.locator('#guestOwnerName').inputValue(),'');assert.equal(await page.locator('#guestOwnerPhone').inputValue(),'');
   assert.ok(!(await page.locator('body').innerText()).includes('Previous owner'));assert.ok(!(await page.locator('body').innerText()).includes('Previous pet'));
  }
  assert.equal(endCount,3);
  const other={...user,id:'owner-b',auth_user_id:'auth-b',name:'Other owner'};
  await first.goto(base+'/login-test');await first.waitForFunction(()=>window.PawpalCustomerAuth);
  await first.evaluate(user=>window.PawpalCustomerAuth.accept({user,session:{access_token:'fixture-b',refresh_token:'fixture-b'}}),other);
  await first.goto(base+'/booking');await first.getByText('Other pet',{exact:true}).waitFor();
  assert.ok(!(await first.locator('body').innerText()).includes('Previous owner'));
  await first.evaluate(()=>{logout().catch(error=>window.logoutFailure=error.message);});
  await first.waitForURL(base+'/',{waitUntil:'commit'}).catch(async error=>{if(!String(error.message).includes('ERR_ABORTED'))throw error;await first.waitForFunction(()=>location.pathname==='/');});
  await first.goto(base+'/booking');await first.locator('#guestOwnerName').waitFor();
  assert.equal(await first.locator('#guestOwnerName').inputValue(),'');assert.ok(!(await first.locator('body').innerText()).includes('Other pet'));
  assert.equal(endCount,5);
  console.log('PASS real auth/header/booking modules: pre-fix cookies rotate once; login revokes old guest session; logout clears visible identity immediately in two tabs; sign-out completes before navigation; account A/B and both logout entry points return to blank guest booking. Isolated transport only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
