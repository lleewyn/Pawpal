const fs=require('node:fs'),path=require('node:path');const {connect}=require('./service_import_connection.cjs');
const marker=String.raw`\m(test|testing|demo|dummy|mock|seed|e2e[0-9]*|qa[0-9]*|fixture|sandbox|playwright|smoke|regression)\M|kiểm thử|giả lập|thử nghiệm`;
(async()=>{const db=await connect();try{
 await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='10s'");
 const result=(await db.query(`SELECT jsonb_build_object(
 'flagged_faq',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,category,question,left(answer,260) AS answer_excerpt,is_active FROM public.chatbot_knowledge_faq WHERE concat_ws(' ',question,answer)~*$1 ORDER BY id LIMIT 10)x),
 'prompt_keys',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT prompt_key,channel,is_active,length(content) AS characters FROM public.chatbot_system_prompt ORDER BY prompt_key LIMIT 30)x),
 'duplicate_prompt_content',(SELECT count(*) FROM (SELECT md5(content) FROM public.chatbot_system_prompt WHERE is_active GROUP BY md5(content) HAVING count(*)>1)x),
 'compensation_issue_duplicates',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT issue_type,count(*) AS policies FROM public.chatbot_compensation_policy WHERE is_active GROUP BY issue_type HAVING count(*)>1 ORDER BY issue_type LIMIT 15)x),
 'marked_message_reasons',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT conversation_id,sender_type,left(substring(content FROM greatest(1,regexp_instr(content,$1,1,1,0,'i')-35)),180) AS excerpt FROM public.chat_message WHERE content~*$1 ORDER BY conversation_id,created_at LIMIT 16)x)
 ) AS result`,[marker])).rows[0].result;
 await db.query('ROLLBACK');fs.writeFileSync(path.resolve('artifacts/data-cleanup/chatbot-audit/config.private.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
