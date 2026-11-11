const fs=require('node:fs'),path=require('node:path');const {connect}=require('./service_import_connection.cjs');
(async()=>{const db=await connect();try{await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='10s'");
 const r=(await db.query(`SELECT jsonb_build_object(
 'sla_cases',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT c.id,c.status,c.sla_deadline,c.assigned_staff_id,c.is_urgent,
 (SELECT sender_type FROM public.chat_message m WHERE m.conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) AS last_sender,
 (SELECT max(created_at) FROM public.chat_message m WHERE m.conversation_id=c.id) AS last_message_at
 FROM public.chat_conversation c WHERE c.status NOT IN ('closed','resolved','completed') AND c.sla_deadline<now() ORDER BY sla_deadline LIMIT 10)x),
 'idle_bot_30d',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT c.id,c.updated_at,
 (SELECT max(created_at) FROM public.chat_message m WHERE m.conversation_id=c.id) AS last_message_at
 FROM public.chat_conversation c WHERE c.status='bot_handling' AND c.assigned_staff_id IS NULL AND NOT c.is_urgent AND c.sla_deadline IS NULL
 AND c.updated_at<now()-interval '30 days' AND EXISTS(SELECT 1 FROM public.chat_message m WHERE m.conversation_id=c.id)
 AND (SELECT sender_type FROM public.chat_message m WHERE m.conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1)='bot'
 AND NOT EXISTS(SELECT 1 FROM public.chat_message m WHERE m.conversation_id=c.id AND m.created_at>=now()-interval '30 days') ORDER BY c.id LIMIT 100)x)
 ) AS result`)).rows[0].result;await db.query('ROLLBACK');fs.writeFileSync(path.resolve('artifacts/data-cleanup/chatbot-audit/queue.private.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,2));
 }finally{await db.end();}})().catch(e=>{console.error(e.message||e.code||e.name);process.exitCode=1;});
