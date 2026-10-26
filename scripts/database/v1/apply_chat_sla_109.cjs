// Explicit deploy only. Tests never invoke this entry point.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud to deploy reviewed migration 109. No connection made.');process.exit(0);}
(async()=>{const db=await connect();try{
 const sql=fs.readFileSync('scripts/database/v1/109_chat_handoff_sla.sql','utf8');await db.query("SET statement_timeout='8s';SET lock_timeout='3s'");await db.query(sql);
 const result=(await db.query(`SELECT
 EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.chat_conversation'::regclass AND tgname='v1_chat_handoff_sla' AND NOT tgisinternal) AS trigger_installed,
 strpos(pg_get_functiondef('pawpal_private.set_chat_handoff_sla()'::regprocedure),'direct_request')>0 AS direct_request_rule,
 NOT has_function_privilege('authenticated','pawpal_private.set_chat_handoff_sla()','EXECUTE') AS private_helper,
 has_function_privilege('service_role','public.set_public_chat_mode(uuid,text)','EXECUTE') AS gateway_retained,
 NOT has_function_privilege('authenticated','public.set_public_chat_mode(uuid,text)','EXECUTE') AS customer_gateway_blocked`)).rows[0];
 assert.deepEqual(result,{trigger_installed:true,direct_request_rule:true,private_helper:true,gateway_retained:true,customer_gateway_blocked:true});
 fs.writeFileSync('docs/verification/sync/chat-sla-cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),environment:'Supabase Cloud cpzuvaplseielhgcnqrn',migration:'109_chat_handoff_sla.sql',status:'APPLIED',sha256:crypto.createHash('sha256').update(sql).digest('hex'),checks:result,scope:'Trigger/function DDL only; no existing conversations or rules changed; no rules seeded, automatic matching or staff assignment'},null,2)+'\n');console.log('APPLIED migration 109; trigger and gateway/helper permissions verified. Existing rows unchanged.');
}catch(error){await db.query('ROLLBACK').catch(()=>{});console.error(error.code||'',error.message);process.exitCode=1;}finally{await db.end();}})().catch(error=>{console.error(error.code||'connection_failed');process.exitCode=1;});
