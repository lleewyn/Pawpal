// Reviewed public chat transaction only. No existing messages/conversations are rewritten.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud to apply reviewed migration 124. No connection made.');process.exit(0);}
(async()=>{const db=await connect();try{
 const oldSignature='public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text)',signature=oldSignature.slice(0,-1)+',boolean)';
 const sql=fs.readFileSync('scripts/database/v1/124_chat_automatic_handoff.sql','utf8');
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
 const before=(await db.query('SELECT pg_get_functiondef(to_regprocedure($1)) definition',[oldSignature])).rows[0].definition;
 const rollback='docs/verification/sync/chat-handoff-124-rollback.sql';
 if(before&&!fs.existsSync(rollback))fs.writeFileSync(rollback,'BEGIN;\nDROP FUNCTION IF EXISTS '+signature+';\n'+before+';\nREVOKE ALL ON FUNCTION '+oldSignature+' FROM PUBLIC,anon,authenticated;\nGRANT EXECUTE ON FUNCTION '+oldSignature+" TO service_role;\nNOTIFY pgrst,'reload schema';\nCOMMIT;\n");
 await db.query(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const checks=(await db.query(`SELECT
  to_regprocedure($1) IS NULL AS old_overload_removed,
  has_function_privilege('service_role',$2,'EXECUTE') AS gateway_available,
  NOT has_function_privilege('anon',$2,'EXECUTE') AS anonymous_blocked,
  NOT has_function_privilege('authenticated',$2,'EXECUTE') AS direct_customer_blocked,
  strpos(pg_get_functiondef($2::regprocedure),'p_handover OR p_level>=4')>0 AS automatic_handoff,
  (SELECT pronargdefaults=1 FROM pg_proc WHERE oid=$2::regprocedure) AS legacy_optional_argument`,[oldSignature,signature])).rows[0];
 assert.ok(Object.values(checks).every(v=>v===true));await db.query('COMMIT');
 fs.writeFileSync('docs/verification/sync/chat-handoff-124-cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'APPLIED',migration:'124_chat_automatic_handoff.sql',sha256:crypto.createHash('sha256').update(sql).digest('hex'),checks,scope:'Public chat RPC signature/body/grants only; old ten-argument clients supported by default parameter; existing conversations/messages untouched; no Logs'},null,2)+'\n');
 console.log('APPLIED migration 124; atomic handoff, service-only RPC and legacy call compatibility verified. Existing conversations/messages unchanged.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
