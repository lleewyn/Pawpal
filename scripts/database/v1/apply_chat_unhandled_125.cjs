// Add persistent counter + reviewed public chat transaction; no transcript/status backfill or rule seeding.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud for reviewed migration 125. No connection made.');process.exit(0);}
(async()=>{const db=await connect();try{
 const old='public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text,boolean)',signature=old.slice(0,-1)+',boolean)';
 const sql=fs.readFileSync('scripts/database/v1/125_chat_unhandled_handoff.sql','utf8');await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
 const before=(await db.query('SELECT pg_get_functiondef(to_regprocedure($1)) definition',[old])).rows[0].definition;
 const backup='docs/verification/sync/chat-unhandled-125-rollback.sql';
 if(before&&!fs.existsSync(backup))fs.writeFileSync(backup,'BEGIN;\nDROP TRIGGER IF EXISTS reset_unhandled_chat_on_resume ON public.chat_conversation;\nDROP FUNCTION IF EXISTS pawpal_private.reset_unhandled_chat_on_resume();\nDROP FUNCTION IF EXISTS '+signature+';\n'+before+';\nREVOKE ALL ON FUNCTION '+old+' FROM PUBLIC,anon,authenticated;\nGRANT EXECUTE ON FUNCTION '+old+" TO service_role;\nNOTIFY pgrst,'reload schema';\nCOMMIT;\n");
 await db.query(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const checks=(await db.query(`SELECT
  EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.chat_conversation'::regclass AND attname='bot_unhandled_count' AND attnotnull AND NOT attisdropped) AS durable_counter,
  EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.chat_conversation'::regclass AND tgname='reset_unhandled_chat_on_resume' AND NOT tgisinternal) AS resume_reset,
  to_regprocedure($1) IS NULL AS old_overload_removed,
  has_function_privilege('service_role',$2,'EXECUTE') AS gateway_available,
  NOT has_function_privilege('anon',$2,'EXECUTE') AS anonymous_blocked,
  NOT has_function_privilege('authenticated',$2,'EXECUTE') AS direct_customer_blocked,
  (SELECT pronargdefaults=2 FROM pg_proc WHERE oid=$2::regprocedure) AS legacy_compatible,
  strpos(pg_get_functiondef($2::regprocedure),'coalesce(threshold,3)')>0 AS default_third_turn,
  strpos(pg_get_functiondef($2::regprocedure),'bot_loop')>0 AS configured_rule_supported`,[old,signature])).rows[0];
 assert.ok(Object.values(checks).every(v=>v===true));await db.query('COMMIT');
 fs.writeFileSync('docs/verification/sync/chat-unhandled-125-cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'APPLIED',migration:'125_chat_unhandled_handoff.sql',sha256:crypto.createHash('sha256').update(sql).digest('hex'),checks,scope:'New counter defaults to zero; RPC/reset trigger/grants updated; no old messages/statuses rewritten, no rules seeded, no Logs'},null,2)+'\n');
 console.log('APPLIED migration 125; durable counter, third-turn default, configured rule, resume reset and service-only legacy-compatible RPC verified. No old transcripts/statuses rewritten.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
