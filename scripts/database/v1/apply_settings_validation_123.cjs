// Reviewed validation trigger only; no operating-configuration or business-data updates.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud for reviewed migration 123. No connection made.');process.exit(0);}
(async()=>{const db=await connect();try{
 const sql=fs.readFileSync('scripts/database/v1/123_settings_validation.sql','utf8');
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
 await db.query(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const checks=(await db.query(`SELECT
  EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.pawpal_setting'::regclass AND tgname='validate_system_configuration' AND NOT tgisinternal AND tgenabled='O') AS validation_trigger,
  strpos(pg_get_functiondef('pawpal_private.validate_system_configuration()'::regprocedure),'invalid_store_profile')>0 AS store_guard,
  strpos(pg_get_functiondef('pawpal_private.validate_system_configuration()'::regprocedure),'invalid_hotel_policy')>0 AS hotel_guard,
  NOT has_function_privilege('anon','pawpal_private.validate_system_configuration()','EXECUTE') AS anonymous_blocked,
  NOT has_function_privilege('authenticated','pawpal_private.validate_system_configuration()','EXECUTE') AS helper_private`)).rows[0];
 assert.ok(Object.values(checks).every(v=>v===true));await db.query('COMMIT');
 fs.writeFileSync('docs/verification/sync/settings-validation-123-cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'APPLIED',migration:'123_settings_validation.sql',sha256:crypto.createHash('sha256').update(sql).digest('hex'),checks,scope:'Validation function and trigger only; no existing configuration or business rows changed; no Logs'},null,2)+'\n');
 console.log('APPLIED migration 123; configuration validation trigger and private function permissions verified. Existing settings unchanged.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
