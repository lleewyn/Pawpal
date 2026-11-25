const fs=require('node:fs'),path=require('node:path');const {connect}=require('./service_import_connection.cjs');
const prior=JSON.parse(fs.readFileSync('artifacts/data-cleanup/chatbot-audit/queue.private.json','utf8'));
const ids=prior.sla_cases.map(row=>row.id);
(async()=>{const db=await connect();try{await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='10s'");
 const report=(await db.query(`SELECT jsonb_build_object(
 'handoff_trigger',(SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='pawpal_private' AND p.proname='set_chat_handoff_sla'),
 'cases',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT c.id,c.status,c.is_urgent,c.assigned_staff_id,c.sla_deadline,c.resolved_at,
 (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at,m.id) FROM (SELECT id,sender_type,left(content,360) AS excerpt,created_at FROM public.chat_message WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 6)m) AS recent_messages
 FROM public.chat_conversation c WHERE c.id=ANY($1::uuid[]) ORDER BY c.id)x),
 'waiting_overdue',(SELECT count(*) FROM public.chat_conversation WHERE status='waiting_agent' AND sla_deadline<now()),
 'accepted_with_old_deadline',(SELECT count(*) FROM public.chat_conversation WHERE status='agent_handling' AND sla_deadline<now())
 ) AS report`,[ids])).rows[0].report;
 await db.query('ROLLBACK');fs.writeFileSync(path.resolve('artifacts/data-cleanup/chatbot-audit/sla-review.private.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await db.end();}})().catch(e=>{console.error(e.message||e.code||e.name);process.exitCode=1;});
