// Two disposable real Supabase Auth users and QA pet records. No production customer changed.
// Credentials stay in memory; an external-webroot recovery manifest contains only QA IDs.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {settings}=require('../database/v1/cloud_connection.cjs'),{connect}=require('../database/v1/service_import_connection.cjs');
const {config}=settings(),service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const deployed=process.argv.includes('--deployed'),base=deployed?'https://pawpalgr3.vercel.app':'http://localhost:4000',out=deployed?'docs/chatbot/member-vercel-2026-11-01':'docs/chatbot/member-phase2-2026-10-31';
const fixture=[],checks=[],tag=crypto.randomUUID(),manifest='D:/Aboutme/Pawpal-infra/browser-check/member-accounts-'+tag+'.private.txt';
const ok=async promise=>{const r=await promise;if(r.error)throw Error(r.error.code||'fixture_operation_failed');return r.data;};
let browser,db,cleanupFailed=false;
(async()=>{try{
 db=await connect();const breed=(await db.query('SELECT id FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1')).rows[0]?.id;assert.ok(breed);
 for(const label of ['A','B']){
  const f={label,phone:'095'+crypto.randomInt(1000000,10000000),password:crypto.randomBytes(20).toString('hex')+'!',pet:crypto.randomUUID()};fixture.push(f);
  f.auth=(await ok(service.auth.admin.createUser({email:'member-chat-'+tag+'-'+label+'@example.invalid',password:f.password,email_confirm:true,phone:'+84'+f.phone.slice(1),phone_confirm:true,app_metadata:{pawpal_test:true,pawpal_member_chat_fixture:tag,user_type:'CUSTOMER'}}))).user.id;
  fs.writeFileSync(manifest,JSON.stringify(fixture.map(({auth,cid,pet,label})=>({auth,cid,pet,label})),null,2));
  f.cid=await ok(service.rpc('complete_customer_auth',{p_auth_id:f.auth,p_phone:f.phone,p_name:'Chatbot member QA '+label}));
  await db.query('INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id) VALUES($1,$2,$3,$4,$5)',[f.pet,f.cid,'PET-QA-'+f.pet,'QA isolated pet '+label,breed]);
  fs.writeFileSync(manifest,JSON.stringify(fixture.map(({auth,cid,pet,label})=>({auth,cid,pet,label})),null,2));
 }
 checks.push('Two real disposable Auth/customer/pet fixtures created');console.log('Fixtures ready; running real UI logins');
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext(),p=await context.newPage();
 const login=async f=>{await p.goto(base+'/login');await p.locator('#loginPhone').fill(f.phone);await p.locator('#btnLoginContinue').click();await p.locator('#loginPassword').fill(f.password);await p.locator('#btnLoginSubmit').click();await p.waitForURL(/\/(?:pages\/)?user\/?/,{timeout:30000});await p.goto(base+'/');await p.waitForFunction(()=>window.__pawpalFabInitialized===true);await p.locator('#fabAiBtn').click();await p.waitForFunction(()=>getComputedStyle(document.querySelector('#fabChatPanel')).opacity==='1');console.log('UI login ready '+f.label);};
 const send=async q=>{await p.locator('#fabChatInput').fill(q);await p.locator('#fabChatSend').click();await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled&&!document.querySelector('.fab-send-state'),null,{timeout:20000});return await p.locator('.fab-chat-bubble--bot .fab-message-content').last().innerText();};
 await login(fixture[0]);await p.locator('#fabChatNewBtn').click();const answerA=await send('Tôi có những bé nào?');assert.ok(answerA.includes('QA isolated pet A'));assert.ok(!answerA.includes('QA isolated pet B'));checks.push('Actual login A sees only own pet');
 if(deployed&&process.argv.includes('--all-scopes')){
  const scopes=[['Tôi có lịch nào sắp tới?','appointments'],['Đơn hàng của tôi','orders'],['Tôi còn bao nhiêu Paw Points?','loyalty'],['Lịch sử điểm của tôi','point_history'],['Ví ưu đãi của tôi','wallet'],['Nhật ký chăm sóc của tôi','care'],['Hotel của tôi đã đặt thế nào?','hotel'],['Taxi của tôi đón ở đâu?','taxi'],['Yêu cầu hỗ trợ của tôi xử lý đến đâu?','support']];
  for(const [question,kind]of scopes){await p.locator('#fabChatNewBtn').click();const reply=await send(question);assert.ok(!reply.includes('undefined'));assert.ok(kind==='loyalty'?reply.includes('0 Paw Points'):reply.includes('chưa tìm thấy'));assert.ok(await p.locator('.fab-chat-bubble--bot a[href^="/user#"]').count()>0);checks.push('Vercel '+kind+' empty/zero state and account link');console.log('PASS scope '+kind);}
  await p.locator('#fabChatNewBtn').click();await send('Tôi có những bé nào?');
 }
 const aConversation=await p.evaluate(async()=>sessionStorage.getItem('pawpal_chat_active_'+(await getSupabaseClient().auth.getSession()).data.session.user.id));
 // Exercise actual logout link, not localStorage mutation or fabricated auth callback.
 await p.goto(base+'/user#profile');await p.locator('#nav-logout').click();await p.waitForURL(u=>!u.pathname.includes('/user'),{timeout:15000});checks.push('Actual logout UI completes');
 await login(fixture[1]);const before=await p.locator('#fabChatMessages').innerText();assert.ok(!before.includes('QA isolated pet A'));await p.locator('#fabChatNewBtn').click();const answerB=await send('Tôi có những bé nào?');assert.ok(answerB.includes('QA isolated pet B'));assert.ok(!answerB.includes('QA isolated pet A'));checks.push('Actual login B does not reuse A transcript or data');
 const forbidden=await p.evaluate(async id=>{const s=(await getSupabaseClient().auth.getSession()).data.session;const r=await fetch('/api/admin-chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},body:JSON.stringify({action:'public_read',conversationId:id})});return r.status;},aConversation);assert.equal(forbidden,403);checks.push('B real JWT denied A diagnostic chat by HTTP403');
 const bSource=await p.evaluate(async id=>{const r=await getSupabaseClient().rpc('read_member_chat_context',{p_request:{kind:'pets',page:0,id}});return {rows:r.data?.items.length,error:r.error?.code};},fixture[0].pet);assert.equal(bSource.rows,0);checks.push('B real JWT gets no A pet when UUID is supplied');
 await p.goto(base+'/user#profile');await p.locator('#nav-logout').click();await p.waitForURL(u=>!u.pathname.includes('/user'));await login(fixture[0]);await p.locator('#fabChatNewBtn').click();assert.ok((await send('Tôi có những bé nào?')).includes('QA isolated pet A'));checks.push('Logging back into A restores correct owner');
 const aAuthClient=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 await ok(aAuthClient.auth.admin.updateUserById(fixture[0].auth,{ban_duration:'1h'}));await p.locator('#fabChatNewBtn').click();await p.locator('#fabChatInput').fill('Tôi có những bé nào?');await p.locator('#fabChatSend').click();await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled,{timeout:20000});const blockedText=await p.locator('#fabChatMessages').innerText();assert.ok(!blockedText.includes('QA isolated pet A'));checks.push('Banned disposable account does not receive fresh private answers');
 await context.close();
}catch(e){console.error('QA failure:',e.message);process.exitCode=1;}finally{
 await browser?.close();
 if(db)for(const f of fixture.slice().reverse()){
  try{if(f.cid){await db.query('BEGIN');const owned=(await db.query('SELECT auth_user_id,customer_code FROM public.customer WHERE id=$1',[f.cid])).rows[0];assert.equal(owned.auth_user_id,f.auth);assert.ok(f.auth&&f.pet);await db.query('DELETE FROM public.chat_message WHERE conversation_id IN(SELECT id FROM public.chat_conversation WHERE customer_id=$1)',[f.cid]);await db.query('DELETE FROM public.chat_conversation WHERE customer_id=$1',[f.cid]);await db.query('DELETE FROM public.pet_profile WHERE id=$1 AND customer_id=$2',[f.pet,f.cid]);for(const table of ['customer_membership','customer_address','customer_phone','customer_profile'])await db.query('DELETE FROM public.'+table+' WHERE customer_id=$1',[f.cid]);await db.query('DELETE FROM public.customer WHERE id=$1 AND auth_user_id=$2',[f.cid,f.auth]);await db.query('COMMIT');}if(f.auth)await ok(service.auth.admin.deleteUser(f.auth));}catch(e){await db.query('ROLLBACK').catch(()=>{});console.error('Fixture cleanup incomplete:',e.code||e.message);cleanupFailed=true;process.exitCode=1;}
 }
 if(!cleanupFailed){checks.push('All disposable Auth/customer/pet/chat data removed');fs.unlinkSync(manifest);}await db?.end();fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/accounts-browser.txt',JSON.stringify({pass:!process.exitCode,base,checks,scope:'Two disposable real Auth logins via phone/password UI, real API/Cloud; actual customer sessions untouched. Only QA data created and cleaned. No model or Cloud Logs.'},null,2)+'\n');console.log(JSON.stringify({pass:!process.exitCode,checks}));
}})();
