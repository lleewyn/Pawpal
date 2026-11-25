const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud for migration 128.');process.exit(0);}
(async()=>{const db=await connect();try{
 const sql=fs.readFileSync('scripts/database/v1/128_staff_name_validation.sql','utf8');await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");await db.query(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const checks=(await db.query(`SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.staff'::regclass AND tgname='validate_staff_name' AND NOT tgisinternal) AS trigger_present,
 NOT has_function_privilege('authenticated','pawpal_private.validate_staff_name()','EXECUTE') AS direct_call_blocked,
 NOT has_function_privilege('anon','pawpal_private.validate_staff_name()','EXECUTE') AS anonymous_blocked`)).rows[0];
 assert.ok(Object.values(checks).every(v=>v===true));await db.query('COMMIT');fs.writeFileSync('docs/verification/sync/staff-name-128-cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'APPLIED',sha256:crypto.createHash('sha256').update(sql).digest('hex'),checks,scope:'Validate names on insert or changed name only; no existing staff records modified'},null,2)+'\n');console.log('APPLIED 128; name trigger and grants verified. No existing records modified.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
