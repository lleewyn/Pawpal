const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud for migration 127.');process.exit(0);}
(async()=>{const db=await connect();try{
 const sql=fs.readFileSync('scripts/database/v1/127_staff_validation_search.sql','utf8');await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
 const old=(await db.query("SELECT pg_get_functiondef('public.admin_staff_list_page(jsonb,integer)'::regprocedure) definition")).rows[0].definition;
 const backup='docs/verification/sync/staff-validation-127-rollback.sql';if(!fs.existsSync(backup))fs.writeFileSync(backup,'BEGIN;\nDROP TRIGGER IF EXISTS validate_staff_contact ON public.staff;\nDROP FUNCTION IF EXISTS pawpal_private.validate_staff_contact();\n'+old+";\nNOTIFY pgrst,'reload schema';\nCOMMIT;\n");
 await db.query(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const checks=(await db.query(`SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.staff'::regclass AND tgname='validate_staff_contact' AND NOT tgisinternal) AS validation_trigger,
 has_function_privilege('authenticated','public.admin_staff_list_page(jsonb,integer)','EXECUTE') AS authenticated_available,
 NOT has_function_privilege('anon','public.admin_staff_list_page(jsonb,integer)','EXECUTE') AS anonymous_blocked,
 strpos(pg_get_functiondef('public.admin_staff_list_page(jsonb,integer)'::regprocedure),'[[:space:]]+')>0 AS whitespace_normalized`)).rows[0];
 assert.ok(Object.values(checks).every(v=>v===true));await db.query('COMMIT');
 fs.writeFileSync('docs/verification/sync/staff-validation-127-cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'APPLIED',sha256:crypto.createHash('sha256').update(sql).digest('hex'),checks,scope:'Staff search RPC and contact validation trigger only; no existing staff or schedules modified'},null,2)+'\n');console.log('APPLIED 127; search normalization and contact validation verified. No staff records or shifts modified.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
