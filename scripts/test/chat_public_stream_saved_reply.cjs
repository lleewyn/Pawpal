// Recover only the result of the explicitly approved one-question diagnostic.
// No Cloud Logs, no AI call, no broad transcript read, no private business data.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 const since=fs.statSync('scripts/test/chat_public_stream_model_browser.js').mtime;
 await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='5s'");
 const result=await db.query(`WITH own_diagnostic AS (
 SELECT m.id,m.conversation_id,m.created_at FROM public.chat_message m
 JOIN public.chat_conversation c ON c.id=m.conversation_id
 WHERE m.raw_content=$1 AND m.sender_type='guest' AND c.customer_id IS NULL
 AND m.created_at >= $2 AND m.created_at < $3
 ORDER BY m.created_at LIMIT 2
 ) SELECT q.created_at,b.content AS reply FROM own_diagnostic q
 JOIN LATERAL (SELECT content FROM public.chat_message WHERE conversation_id=q.conversation_id AND sender_type='bot' AND created_at>=q.created_at ORDER BY created_at,id LIMIT 1) b ON true`,['PawPal có những dịch vụ gì?',since,new Date()]);
 assert.equal(result.rows.length,1,'Expected one own diagnostic after the browser test file was created; do not inspect ambiguous matches');
 const report={question:'PawPal có những dịch vụ gì?',reply:result.rows[0].reply,pass:/Hotel/.test(result.rows[0].reply)&&/Taxi/.test(result.rows[0].reply),scope:'Read-only exact approved diagnostic since test file creation; one result only. Real UI finished before CDP failed reading its SSE body; per-chunk timing was not recovered. No second Gemini/UI send.'};
 fs.writeFileSync('docs/chatbot/guest-phase2-2026-10-31/streaming-real-model-result.txt',JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report));await db.query('ROLLBACK');
}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
