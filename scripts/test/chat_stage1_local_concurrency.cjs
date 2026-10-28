// Real PostgreSQL transactions on a marker-verified task clone, max two connections.
// SQL role/claims tests, not GoTrue JWT or browser E2E; never connects to Cloud.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFile}=require('node:child_process');
if(!process.argv.includes('--local-fixtures')){console.log('No connection. Pass --local-fixtures for task-owned SQL tests.');process.exit(0);}
const arg=process.argv.indexOf('--evidence-dir'),out=arg<0?'docs/chatbot/stage1-server-2026-10-28':process.argv[arg+1];if(!/^docs\/chatbot\/stage1-[a-z0-9-]+$/.test(out))throw Error('invalid_evidence_dir');const env=JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8'));
if(env.status!=='READY'||!/^pawpal_chatbot_g0_[a-f0-9]{12}$/.test(env.database))throw Error('test_environment_unavailable');
const id=()=>crypto.randomUUID(),ids={owner:id(),other:id(),u1:id(),u2:id(),u3:id(),c1:id(),c2:id(),s1:id(),s2:id(),s3:id(),chat:id(),take1:id(),take2:id()};
const report={capturedAt:new Date().toISOString(),scope:'Task-local PostgreSQL, real commits and independent concurrent connections, SQL claims/roles; no Cloud, Auth HTTP or UI',checks:[],maxConnections:0,statements:0};let connections=0;
function run(text){return new Promise(resolve=>{
 connections++;report.maxConnections=Math.max(report.maxConnections,connections);report.statements++;
 const child=execFile('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',env.database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-f','-'],{windowsHide:true,timeout:15000,maxBuffer:1024*1024},(error,stdout,stderr)=>{connections--;resolve({ok:!error,text:stdout.trim(),code:stderr?.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]||null,diagnostic:stderr?.split('\n').find(l=>l.includes('ERROR:'))?.slice(0,180)});});child.stdin.end(text);
});}
async function query(sql,{actor,role='authenticated'}={}){
 const scope=actor!==undefined?`SET LOCAL request.jwt.claim.sub='${actor}'; SET LOCAL request.jwt.claim.role='${role}'; SET LOCAL ROLE ${role};`:'';
 return run(`BEGIN;SET LOCAL statement_timeout='5s';SET LOCAL lock_timeout='3s';${scope}${sql};COMMIT;`);
}
async function good(sql,actor,role){const r=await query(sql,actor===undefined?{}:{actor,role:role||'authenticated'});if(!r.ok)throw Object.assign(Error('sql_failed'),{code:r.code,diagnostic:r.diagnostic});return r.text?JSON.parse(r.text):null;}
async function deny(sql,actor,codes=['42501'],role='authenticated'){const r=await query(sql,{actor,role});assert.equal(r.ok,false,'expected permission/conflict denial');assert.ok(codes.includes(r.code),'unexpected SQLSTATE '+r.code);return r.code;}
const pass=name=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
const row=()=>good(`SELECT row_to_json(c) FROM (SELECT status,assigned_staff_id,updated_at::text,internal_note FROM public.chat_conversation WHERE id='${ids.chat}') c`);
const action=(request,version,kind,content='')=>`SELECT to_json(public.act_admin_chat('${request}','${ids.chat}','${version}'::timestamptz,'${kind}','${content}'))`;
(async()=>{
 const marker=await good(`SELECT to_json(shobj_description(oid,'pg_database')) FROM pg_database WHERE datname=current_database()`);assert.equal(marker,env.ownerMarker);
 await good(`INSERT INTO auth.users(id) VALUES('${ids.owner}'),('${ids.other}'),('${ids.u1}'),('${ids.u2}'),('${ids.u3}');
 INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES('${ids.c1}','${ids.owner}','G1-${ids.c1}'),('${ids.c2}','${ids.other}','G1-${ids.c2}');
 INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES
 ('${ids.s1}','${ids.u1}','QA Agent One','QA','active',false),('${ids.s2}','${ids.u2}','QA Agent Two','QA','active',false),('${ids.s3}','${ids.u3}','QA No Chat','QA','active',false);
 INSERT INTO public.staff_role(staff_id,role_code) VALUES('${ids.s1}','ADMIN'),('${ids.s2}','ADMIN');`);
 await good(`SELECT to_json(public.open_public_chat('${ids.chat}','${ids.c1}',NULL))`,'','service_role');
 await good(`SELECT public.set_public_chat_mode('${ids.chat}','waiting_agent')`,'','service_role');
 let c=await row();
 await deny(action(id(),c.updated_at,'take'),ids.owner);await deny(action(id(),c.updated_at,'take'),ids.u3);
 await deny(`SELECT public.set_public_chat_mode('${ids.chat}','bot_handling')`,ids.owner);pass('Customer and staff without chat rights cannot take or bypass gateway');
 const attempts=await Promise.all([query(action(ids.take1,c.updated_at,'take'),{actor:ids.u1}),query(action(ids.take2,c.updated_at,'take'),{actor:ids.u2})]);
 assert.equal(attempts.filter(r=>r.ok).length,1);assert.equal(attempts.filter(r=>r.code==='PT409').length,1);c=await row();assert.equal(c.status,'agent_handling');
 const winner=c.assigned_staff_id===ids.s1?{u:ids.u1,s:ids.s1,request:ids.take1}:{u:ids.u2,s:ids.s2,request:ids.take2},loser=winner.u===ids.u1?{u:ids.u2,s:ids.s2}:{u:ids.u1,s:ids.s1};
 pass('Two concurrent takes commit exactly one winner; other request conflicts');
 await deny(action(id(),c.updated_at,'send','unassigned attempt'),loser.u);
 const send=id(),version=c.updated_at,payload=action(send,version,'send','QA single reply');
 const replies=await Promise.all([query(payload,{actor:winner.u}),query(payload,{actor:winner.u})]);assert.ok(replies.every(r=>r.ok));
 const counts=await good(`SELECT json_build_object('messages',(SELECT count(*) FROM public.chat_message WHERE id='${send}'),'audits',(SELECT count(*) FROM public.audit_log WHERE id='${send}'))`);assert.equal(counts.messages,1);assert.equal(counts.audits,1);
 await deny(action(send,version,'send','changed payload'),winner.u,['PT409']);pass('Concurrent identical send retries commit one message/audit; changed payload conflicts');
 c=await row();await deny(action(id(),version,'note','stale version note'),winner.u,['PT409']);
 const transfer=id(),transferSql=`SELECT to_json(public.transfer_admin_chat('${transfer}','${ids.chat}','${c.updated_at}'::timestamptz,'${loser.s}','QA PRIVATE TRANSFER'))`;
 const transfers=await Promise.all([query(transferSql,{actor:winner.u}),query(transferSql,{actor:winner.u})]);assert.ok(transfers.every(r=>r.ok));c=await row();assert.equal(c.assigned_staff_id,loser.s);
 const transferred=await good(`SELECT json_build_object('messages',(SELECT count(*) FROM public.chat_message WHERE id='${transfer}'),'audits',(SELECT count(*) FROM public.audit_log WHERE id='${transfer}'),'publicNotes',(SELECT count(*) FROM public.chat_message WHERE conversation_id='${ids.chat}' AND content LIKE '%QA PRIVATE%'))`);assert.equal(transferred.messages,1);assert.equal(transferred.audits,1);assert.equal(transferred.publicNotes,0);
 await deny(action(id(),c.updated_at,'send','former agent reply'),winner.u);await good(action(id(),c.updated_at,'send','new agent reply'),loser.u);pass('Concurrent transfer retry commits once; former agent denied, recipient can reply, notes remain private');
 c=await row();const close=id(),closeSql=`SELECT to_json(public.resolve_admin_chat('${close}','${ids.chat}','${c.updated_at}'::timestamptz,'resolved_complete','QA finished',true))`;
 const closes=await Promise.all([query(closeSql,{actor:loser.u}),query(closeSql,{actor:loser.u})]);assert.ok(closes.every(r=>r.ok));c=await row();assert.equal(c.status,'resolved');
 await deny(action(id(),c.updated_at,'send','after closed'),loser.u,['PT409']);await deny(`SELECT public.set_public_chat_mode('${ids.chat}','waiting_agent')`,'',['PT409'],'service_role');pass('Concurrent completion retry closes once; closed chat cannot send or silently reopen');
 const session=id(),exchange=id();await good(`SELECT to_json(public.save_admin_copilot_exchange('${ids.u1}','${exchange}','${session}','QA history question','QA answer','QA title'))`,'','service_role');
 const visible=await good(`SELECT to_json(count(*)) FROM public.admin_copilot_history WHERE session_id='${session}'`,ids.u2);assert.equal(visible,0);
 const deleted=await query(`SELECT public.delete_admin_copilot_session('${session}')`,{actor:ids.u2});if(!deleted.ok)assert.ok(['42501','P0002','22023'].includes(deleted.code));
 assert.equal(await good(`SELECT to_json(count(*)) FROM public.admin_copilot_history WHERE session_id='${session}'`),2);pass('Other staff cannot read or delete owner copilot session');
 await deny(`SELECT raw_content FROM public.chat_message WHERE conversation_id='${ids.chat}'`,ids.owner);await deny(`SELECT public.read_admin_chat_raw('${send}')`,ids.u3);pass('Raw content is not exposed by ordinary SELECT or raw RPC without permission');
 const beforeRaw=await good(`SELECT to_json(count(*)) FROM public.audit_log WHERE action='CHAT_RAW_READ' AND entity_id='${send}'`);
 assert.equal(await good(`SELECT to_json(public.read_admin_chat_raw('${send}'))`,ids.u1),'QA single reply');
 assert.equal(await good(`SELECT to_json(count(*)) FROM public.audit_log WHERE action='CHAT_RAW_READ' AND entity_id='${send}'`),beforeRaw+1);pass('Authorized raw read returns original/fallback content and records one audit');
 await deny(`SELECT public.save_chat_feedback('${ids.chat}',4,'QA satisfied')`,ids.owner);
 const feedback=`SELECT to_json(public.save_chat_feedback('${ids.chat}',4,'QA satisfied'))`;
 const rated=await Promise.all([query(feedback,{actor:'',role:'service_role'}),query(feedback,{actor:'',role:'service_role'})]);assert.ok(rated.every(r=>r.ok));assert.equal(rated[0].text,rated[1].text);
 assert.equal(await good(`SELECT to_json(count(*)) FROM public.chat_feedback WHERE conversation_id='${ids.chat}'`),1);
 await deny(`SELECT public.save_chat_feedback('${ids.chat}',1,'changed')`,'',['PT409'],'service_role');pass('Service-only feedback concurrent retry saves once; changed payload conflicts');
 const raceTransfer=id(),raceClose=id();await good(`INSERT INTO public.chat_conversation(id,customer_id,status,assigned_staff_id,channel,sentiment_level,sentiment_trend) VALUES('${raceTransfer}','${ids.c1}','agent_handling','${ids.s1}','web',2,'stable'),('${raceClose}','${ids.c1}','agent_handling','${ids.s1}','web',2,'stable')`);
 const v1=await good(`SELECT to_json(updated_at::text) FROM public.chat_conversation WHERE id='${raceTransfer}'`);
 const separateTransfers=await Promise.all([0,1].map(()=>query(`SELECT to_json(public.transfer_admin_chat('${id()}','${raceTransfer}','${v1}'::timestamptz,'${ids.s2}','QA separate requests'))`,{actor:ids.u1})));assert.equal(separateTransfers.filter(r=>r.ok).length,1);assert.equal(separateTransfers.filter(r=>r.code==='PT409').length,1);pass('Distinct concurrent transfer request IDs on one revision produce one winner and one conflict');
 const v2=await good(`SELECT to_json(updated_at::text) FROM public.chat_conversation WHERE id='${raceClose}'`);
 const separateCloses=await Promise.all([0,1].map(()=>query(`SELECT to_json(public.resolve_admin_chat('${id()}','${raceClose}','${v2}'::timestamptz,'resolved_complete','QA close race',false))`,{actor:ids.u1})));assert.equal(separateCloses.filter(r=>r.ok).length,1);assert.equal(separateCloses.filter(r=>r.code==='PT409').length,1);pass('Distinct concurrent completion IDs on one revision produce one winner and one conflict');
 await good(`UPDATE auth.users SET banned_until=now()+interval '1 hour' WHERE id='${ids.u1}'`);
 await deny(`SELECT public.read_admin_chat_raw('${send}')`,ids.u1);await deny(`SELECT public.admin_copilot_recent_context('${session}')`,ids.u1);pass('Locked staff cannot read raw or copilot context despite retaining ADMIN role');
 assert.ok(report.maxConnections<=2);report.status='PASS';
})().catch(e=>{report.status='INCOMPLETE';report.error={name:e.name,code:e.code||null,diagnostic:e.diagnostic||e.message?.slice(0,180)};process.exitCode=1;})
.finally(()=>{fs.writeFileSync(out+'/concurrency-results.txt',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,maxConnections:report.maxConnections,error:report.error}));});
