// Read-only committed-state verification for the isolated MCP UI fixture.
const fs=require('node:fs'),assert=require('node:assert/strict'),{createClient}=require('@supabase/supabase-js');
const phase=process.argv[2];if(!['published','hidden','transfer'].includes(phase)){console.log('No network. Specify published, hidden or transfer.');process.exit(0);}
const f=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/browser-check/two-portal.private.json','utf8')),{config}=require('../database/v1/cloud_connection.cjs').settings();
const options={auth:{persistSession:false,autoRefreshToken:false}},anon=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options),service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options),ok=async p=>{const r=await p;if(r.error)throw r.error;return r.data;};
(async()=>{
 const result={phase,timestamp:new Date().toISOString()};
 if(phase!=='transfer'){
  const reviews=await ok(anon.rpc('public_service_reviews',{p_service:f.ownedService})),catalog=await ok(anon.rpc('public_service_directory'));
  // Public RPC intentionally excludes inactive services even after moderation publishes a review.
  assert.equal(reviews.length,0);assert.ok(!catalog.some(s=>s.id===f.ownedService));
  const saved=await ok(service.from('review').select('id,review_status').eq('appointment_item_id',f.item).single());assert.equal(saved.review_status,phase==='published'?'published':'hidden');
  const actions=await ok(service.from('audit_log').select('id').eq('entity_id',saved.id).eq('action','MODERATE_SERVICE_REVIEW'));
  const notices=await ok(service.from('notification').select('source_event,customer_id').in('customer_id',f.customers.map(c=>c.cid)));assert.equal(notices.length,actions.length);assert.ok(notices.every(n=>n.customer_id===f.customers[0].cid));assert.equal(new Set(notices.map(n=>n.source_event)).size,notices.length);
  Object.assign(result,{committedReviewStatus:saved.review_status,publicReviewCount:reviews.length,inactiveServiceAbsentFromPublicDirectory:true,notifications:notices.length,uniqueEvents:true,correctOwner:true});
 }else{
  const chats=await ok(service.from('chat_conversation').select('id,status,assigned_staff_id,sla_deadline').eq('customer_id',f.customers[0].cid));assert.equal(chats.length,1);assert.equal(chats[0].assigned_staff_id,f.recipient.id);assert.equal(chats[0].status,'agent_handling');
  const rules=await ok(service.from('chatbot_handover_rule').select('id').eq('trigger_type','direct_request').eq('is_active',true));assert.equal(rules.length,0);assert.equal(chats[0].sla_deadline,null);
  const messages=await ok(service.from('chat_message').select('sender_type,content').eq('conversation_id',chats[0].id));assert.equal(messages.filter(m=>m.content==='E2E ADVANCED STAFF - fast send after take').length,1);assert.ok(!messages.some(m=>m.content.includes('PRIVATE transfer')));
  Object.assign(result,{assignedToRecipient:true,status:chats[0].status,staffMessages:messages.filter(m=>m.sender_type==='staff').length,privateNoteNotPublic:true,activeDirectRules:rules.length,deadline:chats[0].sla_deadline});
 }
 const path='docs/verification/sync/advanced-portal-live-probes.txt',rows=fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):[];rows.push({...result,status:'PASS'});fs.writeFileSync(path,JSON.stringify(rows,null,2)+'\n');console.log('PASS',phase,'committed-state probe; read-only, no Logs.');
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
