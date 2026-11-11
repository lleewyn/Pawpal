const fs=require('node:fs'),path=require('node:path');const {connect}=require('./service_import_connection.cjs');
const apply=process.argv[2]==='apply',id='2d4521f3-ac32-446f-8ddf-45c9842c5d65';
const prior=JSON.parse(fs.readFileSync('artifacts/data-cleanup/chatbot-audit/sla-review.private.json','utf8')).cases.find(row=>row.id===id);
(async()=>{const db=await connect();try{await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');await db.query("SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='5s'");
 const before=(await db.query('SELECT to_jsonb(c) AS row FROM public.chat_conversation c WHERE id=$1 FOR UPDATE',[id])).rows[0]?.row;
 if(!before||before.status!=='agent_handling'||before.assigned_staff_id!==prior.assigned_staff_id)throw Error('Reviewed preview conversation changed');
 const messages=(await db.query('SELECT id,sender_type,content,created_at::text FROM public.chat_message WHERE conversation_id=$1 ORDER BY created_at,id',[id])).rows;
 if(messages.length!==prior.recent_messages.length||messages.some((row,i)=>row.id!==prior.recent_messages[i].id||row.content!==prior.recent_messages[i].excerpt))throw Error('New or changed conversation messages; abort');
 if(!messages.some(row=>row.sender_type==='customer'&&row.content.includes('Ảnh mẫu từ assets, không phải yêu cầu chăm sóc hay khiếu nại.')))throw Error('Explicit preview-test evidence missing');
 const snapshot=async()=>(await db.query(`SELECT jsonb_build_object(
 'messages',(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.chat_message t WHERE conversation_id=$1),
 'sessions',(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.media_upload_session t WHERE chat_conversation_id=$1),
 'assets',(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY t.id),'')) FROM public.media_asset t JOIN public.media_upload_session s ON s.id=t.session_id WHERE s.chat_conversation_id=$1),
 'other_chats',(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) FROM public.chat_conversation t WHERE id<>$1)) AS data`,[id])).rows[0].data;
 const original=await snapshot();const folder=path.join('D:/Aboutme/Pawpal-infra/supabase-local/backups','close-preview-chat-'+new Date().toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'before.private.json'),JSON.stringify({before,original},null,2));
 await db.query(`UPDATE public.chat_conversation SET status='closed',assigned_staff_id=NULL,is_urgent=false,resolved_at=clock_timestamp(),resolved_by=NULL,
 resolved_reason='Kết thúc phiên kiểm tra ảnh',internal_note=concat_ws(E'\n',nullif(internal_note,''),'Đóng phiên kiểm tra ảnh theo rà soát dữ liệu; không phải kết quả xử lý yêu cầu khách hàng.'),updated_at=clock_timestamp() WHERE id=$1`,[id]);
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');if(JSON.stringify(original)!==JSON.stringify(await snapshot()))throw Error('Messages, media or other conversations changed');
 await db.query(apply?'COMMIT':'ROLLBACK');console.log(JSON.stringify({applied:apply,closedTestSessions:apply?1:0,noMessagesSent:true,historyAndMediaPreserved:true,backup:folder}));
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message||e.code||e.name);process.exitCode=1;});
