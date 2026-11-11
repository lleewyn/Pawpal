const fs=require('node:fs'),path=require('node:path');
const {connect}=require('./service_import_connection.cjs');
const marker=String.raw`\m(test|testing|demo|dummy|mock|seed|e2e[0-9]*|qa[0-9]*|fixture|sandbox|playwright|smoke|regression)\M|kiểm thử|giả lập|thử nghiệm`;
(async()=>{const db=await connect();try{
 await db.query('BEGIN READ ONLY');await db.query("SET LOCAL statement_timeout='12s'");
 const report=(await db.query(`SELECT jsonb_build_object(
 'checked_at',now(),
 'conversations',(SELECT count(*) FROM public.chat_conversation),
 'messages',(SELECT count(*) FROM public.chat_message),
 'statuses',(SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*) n FROM public.chat_conversation GROUP BY status)s),
 'channels',(SELECT jsonb_object_agg(channel,n) FROM (SELECT channel,count(*) n FROM public.chat_conversation GROUP BY channel)s),
 'senders',(SELECT jsonb_object_agg(sender_type,n) FROM (SELECT sender_type,count(*) n FROM public.chat_message GROUP BY sender_type)s),
 'empty_conversations',(SELECT count(*) FROM public.chat_conversation c WHERE NOT EXISTS(SELECT 1 FROM public.chat_message m WHERE m.conversation_id=c.id)),
 'orphan_messages',(SELECT count(*) FROM public.chat_message m WHERE NOT EXISTS(SELECT 1 FROM public.chat_conversation c WHERE c.id=m.conversation_id)),
 'orphan_customer_links',(SELECT count(*) FROM public.chat_conversation c WHERE c.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customer t WHERE t.id=c.customer_id)),
 'blank_messages',(SELECT count(*) FROM public.chat_message WHERE btrim(content)=''),
 'old_open_7d',(SELECT count(*) FROM public.chat_conversation WHERE status NOT IN ('closed','resolved','completed') AND updated_at<now()-interval '7 days'),
 'overdue_waiting_handoff_sla',(SELECT count(*) FROM public.chat_conversation WHERE status='waiting_agent' AND sla_deadline<now()),
 'accepted_with_historical_deadline',(SELECT count(*) FROM public.chat_conversation WHERE status='agent_handling' AND sla_deadline<now()),
 'assigned_unavailable_staff',(SELECT count(*) FROM public.chat_conversation c JOIN public.staff s ON s.id=c.assigned_staff_id LEFT JOIN auth.users u ON u.id=s.auth_user_id WHERE c.status NOT IN ('closed','resolved','completed') AND (s.employment_status<>'active' OR u.banned_until>now())),
 'marked_conversations',(SELECT count(*) FROM public.chat_conversation c WHERE concat_ws(' ',c.ai_summary,c.internal_note)~*$1 OR EXISTS(SELECT 1 FROM public.chat_message m WHERE m.conversation_id=c.id AND m.content~*$1)),
 'marked_samples',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT c.id,c.status,c.created_at,(SELECT count(*) FROM public.chat_message m WHERE m.conversation_id=c.id) AS messages,
  (SELECT left(m.content,160) FROM public.chat_message m WHERE m.conversation_id=c.id AND m.content~*$1 ORDER BY m.created_at LIMIT 1) AS matched_excerpt
  FROM public.chat_conversation c WHERE concat_ws(' ',c.ai_summary,c.internal_note)~*$1 OR EXISTS(SELECT 1 FROM public.chat_message m WHERE m.conversation_id=c.id AND m.content~*$1) ORDER BY c.created_at LIMIT 12)x),
 'feedback',(SELECT jsonb_build_object('count',count(*),'invalid_score',count(*) FILTER(WHERE score<1 OR score>5)) FROM public.chat_feedback),
 'faq',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE is_active),'blank',count(*) FILTER(WHERE btrim(question)='' OR btrim(answer)=''),'test_markers',count(*) FILTER(WHERE concat_ws(' ',question,answer)~*$1)) FROM public.chatbot_knowledge_faq),
 'faq_duplicates',(SELECT count(*) FROM (SELECT lower(btrim(question)) FROM public.chatbot_knowledge_faq WHERE is_active GROUP BY lower(btrim(question)) HAVING count(*)>1)s),
 'prompts',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE is_active),'blank',count(*) FILTER(WHERE btrim(content)='')) FROM public.chatbot_system_prompt),
 'prompt_duplicate_channels',(SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT channel,count(*) FROM public.chatbot_system_prompt WHERE is_active GROUP BY channel HAVING count(*)>1)x),
 'canned',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE is_active),'blank',count(*) FILTER(WHERE btrim(content)=''),'test_markers',count(*) FILTER(WHERE concat_ws(' ',title,content)~*$1)) FROM public.chatbot_canned_response),
 'handover',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE is_active),'invalid_sla',count(*) FILTER(WHERE sla_seconds<=0)) FROM public.chatbot_handover_rule),
 'compensation',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE is_active),'negative_limits',count(*) FILTER(WHERE max_points<0 OR max_discount_vnd<0)) FROM public.chatbot_compensation_policy)
 ) AS report`,[marker])).rows[0].report;
 await db.query('ROLLBACK');
 const folder=path.resolve('artifacts/data-cleanup/chatbot-audit');fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'audit.private.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
