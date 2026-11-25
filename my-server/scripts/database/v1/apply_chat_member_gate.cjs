const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
const apply=process.argv[2]==='apply';
const source=JSON.parse(fs.readFileSync('artifacts/data-cleanup/chat-member-gate/inspection.private.json','utf8'));
const reads=JSON.parse(fs.readFileSync('artifacts/data-cleanup/chat-member-gate/reads.private.json','utf8'));
const sql=fs.readFileSync('scripts/database/v1/229_chat_member_handoff.sql','utf8').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
const reviewed=source.guest_human_cases.map(c=>c.id).sort();
(async()=>{const db=await connect();try{
 await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE;SET LOCAL statement_timeout='10s';SET LOCAL lock_timeout='3s'");
 const old=[];
 for(const f of [...source.functions,...reads.functions]){const row=(await db.query('SELECT pg_get_functiondef(oid) definition FROM pg_proc WHERE proname=$1 AND pronamespace=$2::regnamespace',[f.name,f.name==='chat_media_access'?'pawpal_private':'public'])).rows;
  assert.equal(row.length,1);assert.equal(row[0].definition,f.definition,'Live definition changed: '+f.name);old.push(f);
 }
 const before=(await db.query('SELECT to_jsonb(c) row FROM public.chat_conversation c WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[reviewed])).rows.map(r=>r.row);
 assert.deepEqual(before.map(c=>c.id).sort(),reviewed);assert.ok(before.every(c=>c.status==='waiting_agent'&&c.customer_id===null&&c.assigned_staff_id===null));
 const fingerprint=async()=>(await db.query(`SELECT jsonb_build_object(
 'messages',(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.chat_message t),
 'media',(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY message_id,media_asset_id),'')) FROM public.chat_message_media t),
 'other_chats',(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.chat_conversation t WHERE NOT id=ANY($1::uuid[]))) data`,[reviewed])).rows[0].data;
 const original=await fingerprint();
 const backup=path.join('D:/Aboutme/Pawpal-infra/supabase-local/backups','chat-member-gate-'+new Date().toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(backup,{recursive:true});const encoded=JSON.stringify({before,functions:old,original},null,2);fs.writeFileSync(path.join(backup,'before.private.json'),encoded);fs.writeFileSync(path.join(backup,'before.sha256'),createHash('sha256').update(encoded).digest('hex'));
 await db.query(sql);
 const updated=await db.query("UPDATE public.chat_conversation SET status='bot_handling',assigned_staff_id=NULL,sla_deadline=NULL,updated_at=clock_timestamp() WHERE id=ANY($1::uuid[]) AND status='waiting_agent' AND customer_id IS NULL RETURNING id",[reviewed]);assert.equal(updated.rowCount,2);
 assert.deepEqual(await fingerprint(),original,'Migration touched history/media or other chats');
 await db.query('SAVEPOINT verification');
 let checks=0;
 async function denied(query,args,code='42501'){await db.query('SAVEPOINT denied');try{await db.query(query,args);throw Error('Expected rejection');}catch(e){assert.equal(e.code,code);checks++;}finally{await db.query('ROLLBACK TO SAVEPOINT denied');}}
 const guest=before[0];
 const members=(await db.query("SELECT c.id,c.auth_user_id FROM public.customer c WHERE pawpal_private.chat_customer_can_handoff(c.id) ORDER BY c.id LIMIT 2")).rows;assert.equal(members.length,2);
 const hash=(await db.query('SELECT token_hash FROM public.guest_session WHERE id=$1 AND revoked_at IS NULL AND expires_at>now()',[guest.guest_session_id])).rows[0]?.token_hash;assert.ok(hash);
 await denied("SELECT public.set_public_chat_mode($1,'waiting_agent')",[guest.id]);
 await denied("UPDATE public.chat_conversation SET status='agent_handling' WHERE id=$1",[guest.id]);
 const revision=async()=>(await db.query('SELECT updated_at::text FROM public.chat_conversation WHERE id=$1',[guest.id])).rows[0].updated_at;
 const message=randomUUID();
 await db.query("SELECT public.post_public_chat_message_media($1,$2,$3,NULL,$4,'Yêu cầu hỗ trợ','Yêu cầu hỗ trợ',false,4,'Chuyển nhân viên',true,false,'{}')",[message,guest.id,await revision(),hash]);
 let state=(await db.query('SELECT status,is_urgent,sla_deadline FROM public.chat_conversation WHERE id=$1',[guest.id])).rows[0];assert.equal(state.status,'bot_handling');assert.equal(state.is_urgent,true);assert.equal(state.sla_deadline,null);checks++;
 const reply=(await db.query("SELECT content FROM public.chat_message WHERE conversation_id=$1 AND sender_type='bot' ORDER BY created_at DESC,id DESC LIMIT 1",[guest.id])).rows[0].content;assert.match(reply,/thiết lập mật khẩu/);assert.doesNotMatch(reply,/chuyển.*nhân viên/i);checks++;
 await db.query('UPDATE public.chat_conversation SET bot_unhandled_count=1000000 WHERE id=$1',[guest.id]);
 await db.query("SELECT public.post_public_chat_message_media($1,$2,$3,NULL,$4,'Không rõ','Không rõ',false,2,'Chưa rõ',false,false,'{}')",[randomUUID(),guest.id,await revision(),hash]);
 assert.equal((await db.query('SELECT status FROM public.chat_conversation WHERE id=$1',[guest.id])).rows[0].status,'bot_handling');checks++;
 assert.equal((await db.query('SELECT pawpal_private.chat_media_access(NULL,$1,$2,true) allowed',[hash,guest.id])).rows[0].allowed,false);checks++;
 await denied('SELECT public.claim_public_chat($1,$2,$3)',[members[0].auth_user_id,'0'.repeat(64),guest.id]);
 await denied('SELECT public.claim_public_chat($1,$2,$3)',[randomUUID(),hash,guest.id]);
 await db.query('SELECT public.claim_public_chat($1,$2,$3)',[members[0].auth_user_id,hash,guest.id]);
 await db.query('SELECT public.claim_public_chat($1,$2,$3)',[members[0].auth_user_id,hash,guest.id]);checks++;
 await denied('SELECT public.claim_public_chat($1,$2,$3)',[members[1].auth_user_id,hash,guest.id]);
 assert.equal((await db.query('SELECT pawpal_private.chat_media_access(NULL,$1,$2,false) allowed',[hash,guest.id])).rows[0].allowed,false);checks++;
 await db.query("SELECT public.set_public_chat_mode($1,'waiting_agent')",[guest.id]);assert.equal((await db.query('SELECT status FROM public.chat_conversation WHERE id=$1',[guest.id])).rows[0].status,'waiting_agent');checks++;
 assert.equal((await db.query("SELECT has_function_privilege('authenticated','public.claim_public_chat(uuid,text,uuid)','EXECUTE') allowed")).rows[0].allowed,false);checks++;
 await db.query('ROLLBACK TO SAVEPOINT verification');
 assert.deepEqual(await fingerprint(),original,'Verification did not fully roll back');
 const remaining=Number((await db.query("SELECT count(*) n FROM public.chat_conversation WHERE status IN ('waiting_agent','agent_handling') AND NOT pawpal_private.chat_customer_can_handoff(customer_id)")).rows[0].n);assert.equal(remaining,0);
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query(apply?'COMMIT':'ROLLBACK');
 const result={applied:apply,checks,returnedToBot:apply?updated.rowCount:0,ineligibleHumanCases:remaining,historyAndMediaPreserved:true,noMessagesSent:true,backup};
 fs.writeFileSync('artifacts/data-cleanup/chat-member-gate/'+(apply?'applied':'dry-run')+'.private.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message||e.code||e.name);process.exitCode=1;});
