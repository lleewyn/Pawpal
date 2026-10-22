// Explicit opt-in. Creates only tagged test records on the new Cloud project and removes them afterwards.
const assert=require('node:assert/strict'),fs=require('node:fs'),{randomUUID}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {settings,infra}=require('../database/v1/cloud_connection.cjs');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
if(process.argv[2]!=='run')throw Error('Use run to explicitly verify Production');
const base='https://pawpalgr3.vercel.app';
async function ok(p){const r=await p;if(r.error)throw Error(r.error.message);return r.data;}
(async()=>{
 const {config}=settings(),service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const id=randomUUID(),sessionToken=randomUUID(),tag='Chat acceptance '+id,copilotSession=randomUUID();
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}});
 let guest;
 async function publicCall(action,body={}){const r=await fetch(base+'/api/admin-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,conversationId:id,sessionToken,...body})});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;}
 try{
  await publicCall('public_open');await publicCall('public_mode',{mode:'waiting_agent'});
  const credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
  await page.goto(base+'/admin/login');await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1]);await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1]);await page.locator('#btnSubmitAdminLogin').click();
  await page.waitForFunction(()=>window.PawpalCustomers?.state.listLoadStatus==='loaded');await page.locator('[data-title="Chatbot"]').click();await page.waitForFunction(()=>window.PawpalChatbot?.state.liveLoaded);
  await page.evaluate(async id=>{sessionStorage.setItem('pawpal_admin_chatbot_conv_id',id);await PawpalChatbot.loadInboxSummary();},id);
  await page.waitForFunction(()=>PawpalChatbot.state.isRealtimeHealthy===true);
  await publicCall('public_send',{requestId:randomUUID(),question:tag});
  // No manual refresh: this must arrive through the Production Realtime subscription.
  await page.waitForFunction(tag=>document.getElementById('chatMessagesTimeline').textContent.includes(tag),tag,{timeout:30000});
  console.log('PASS Production Realtime delivers guest message without manual refresh.');
  await page.locator('#btnToggleTakeover').click();await page.waitForFunction(()=>PawpalChatbot.state.currentConversation?.isHandover);
  await page.locator('#chatInternalNoteInput').fill(tag+' private note');await page.locator('#btnSaveChatInternalNote').click();
  await page.waitForFunction(tag=>PawpalChatbot.state.currentConversation?.internalNotes===tag+' private note',tag);
  assert.ok(!(await publicCall('public_read')).messages.some(m=>m.content.includes('private note')));
  await page.locator('#chatMessageInput').fill(tag+' reply');await page.locator('#btnSendLiveMessage').click();await page.waitForFunction(()=>document.getElementById('chatMessageInput').value==='');
  assert.ok((await publicCall('public_read')).messages.some(m=>m.sender_type==='staff'&&m.content===tag+' reply'));
  await page.setViewportSize({width:1024,height:900});await page.screenshot({path:infra+'/chat-production-narrow.private.png'});await page.setViewportSize({width:1440,height:1000});
  await page.locator('#btnHeaderResolveChat').click();await page.locator('#textareaResolveNotes').fill(tag+' completed');
  const survey=page.locator('#modalResolveChatOverlay input[type="checkbox"]');if(await survey.count())await survey.check();
  await page.locator('#btnConfirmResolveChat').click();await page.waitForFunction(()=>PawpalChatbot.state.currentConversation?.status==='resolved');
  await page.waitForFunction(()=>document.getElementById('chatMessageInput').disabled&&document.getElementById('btnToggleTakeover').disabled);
  const history=await publicCall('public_read');assert.ok(history.messages.some(m=>m.metadata.type==='csat_invitation'));
  await publicCall('feedback',{score:4,comment:tag});assert.equal((await ok(service.from('chat_feedback').select('score').eq('conversation_id',id).single())).score,4);
  assert.ok((await publicCall('public_read')).messages.some(m=>m.metadata.type==='csat_invitation'&&m.metadata.submitted));
  console.log('PASS Production private note, staff reply, closed UI, invited guest feedback and persisted submitted state.');
  await page.locator('[data-tab="tab-chatbot-rules"]').click();
  await page.locator('#btnOpenAddFaqModal').click();await page.locator('#inputFaqQuestionText').fill(tag);await page.locator('#textareaFaqAnswerText').fill('Acceptance answer');await page.locator('#btnSaveFaqRecord').click();
  await page.waitForFunction(()=>!document.getElementById('modalFaqEditorOverlay').classList.contains('active'));
  assert.ok((await ok(service.from('chatbot_knowledge_faq').select('id').eq('question',tag).single())).id);
  await page.locator('[data-rules-view="profanity"]').click();await page.locator('#btnOpenAddProfanityModal').click();await page.locator('#inputProfanityKeywordText').fill(tag);await page.locator('#btnSaveProfanityRecord').click();
  await page.waitForFunction(()=>!document.getElementById('modalProfanityEditorOverlay').classList.contains('active'));
  assert.ok((await ok(service.from('chatbot_profanity_filter').select('id').eq('keyword',tag.toLowerCase()).single())).id);
  await page.locator('[data-rules-view="canned"]').click();await page.locator('#btnOpenAddCannedModal').click();await page.locator('#inputCannedShortcutText').fill('/qa'+id.slice(0,8));await page.locator('#inputCannedTitleText').fill(tag);await page.locator('#textareaCannedContentText').fill('Acceptance template');await page.locator('#btnSaveCannedRecord').click();
  await page.waitForFunction(()=>!document.getElementById('modalCannedEditorOverlay').classList.contains('active'));
  assert.ok((await ok(service.from('chatbot_canned_response').select('id').eq('title',tag).single())).id);
  console.log('PASS Production FAQ, moderation filter and canned response saved from browser.');
  await page.reload();await page.locator('#btnOpenAddFaqModal').waitFor({state:'attached'});
  console.log('PASS Production Chatbot reload restores module.');
  await page.locator('[data-tab="tab-ai-copilot"]').click();
  const ai=await page.evaluate(async({sessionId,requestId})=>{
   const session=(await window.getSupabaseClient().auth.getSession()).data.session;
   const response=await fetch('/api/admin-chat',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({sessionId,requestId,question:'Xin chao, hay noi ngan gon pham vi ho tro cua ban. Khong thay doi du lieu.'})});
   const result=await response.json();return {status:response.status,hasReply:result.ok&&typeof result.reply==='string'&&result.reply.length>0};
  },{sessionId:copilotSession,requestId:randomUUID()});
  assert.equal(ai.status,200);assert.equal(ai.hasReply,true);
  assert.equal((await ok(service.from('admin_copilot_history').select('id').eq('session_id',copilotSession))).length,2);
  await page.route('**/api/admin-chat',route=>route.abort());
  await page.locator('#copilotInput').fill(tag+' unsent draft');await page.locator('#btnSendCopilot').click();
  await page.waitForFunction(()=>!document.getElementById('btnSendCopilot').disabled);
  assert.equal(await page.locator('#copilotInput').inputValue(),tag+' unsent draft');await page.unroute('**/api/admin-chat');
  console.log('PASS Production real Gemini Copilot reply, persisted paired history and retained draft on network failure.');
 }catch(error){
  await page.screenshot({path:infra+'/chat-production-acceptance-failure.private.png'}).catch(()=>{});
  console.log(await page.evaluate(()=>({status:window.PawpalChatbot?.state.currentConversation?.status,inputDisabled:document.getElementById('chatMessageInput')?.disabled,takeDisabled:document.getElementById('btnToggleTakeover')?.disabled})).catch(()=>({})));
  throw error;
 }finally{
  // Also find records after a browser timeout so partially completed saves do not leave test rows.
  for(const [table,column,value]of [['chatbot_knowledge_faq','question',tag],['chatbot_profanity_filter','keyword',tag.toLowerCase()],['chatbot_canned_response','title',tag]])await ok(service.from(table).delete().eq(column,value));
  await ok(service.from('admin_copilot_history').delete().eq('session_id',copilotSession));
  guest=(await ok(service.from('chat_conversation').select('guest_session_id').eq('id',id).maybeSingle()))?.guest_session_id;
  for(const table of ['chat_feedback','chat_moderation_log','chat_message'])await ok(service.from(table).delete().eq('conversation_id',id));
  await ok(service.from('chat_conversation').delete().eq('id',id));if(guest)await ok(service.from('guest_session').delete().eq('id',guest));
  await browser.close();console.log('Removed dedicated test rows; audit trail retained.');
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
