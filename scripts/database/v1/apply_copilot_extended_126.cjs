const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud for migration 126.');process.exit(0);}
(async()=>{const db=await connect();try{
 const sql=fs.readFileSync('scripts/database/v1/126_copilot_extended_facts.sql','utf8');
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
 await db.query(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const checks=(await db.query(`SELECT NOT prosecdef AS invoker,provolatile='s' AS stable,
 has_function_privilege('authenticated',oid,'EXECUTE') AS staff_available,
 NOT has_function_privilege('anon',oid,'EXECUTE') AS anonymous_blocked
 FROM pg_proc WHERE oid='public.admin_copilot_extended_facts(text,jsonb)'::regprocedure`)).rows[0];
 assert.ok(checks&&Object.values(checks).every(v=>v===true));await db.query('COMMIT');
 fs.writeFileSync('docs/verification/sync/copilot-extended-126-cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'APPLIED',migration:'126_copilot_extended_facts.sql',sha256:crypto.createHash('sha256').update(sql).digest('hex'),checks,scope:'Read-only RPC with permission checks; no business rows modified'},null,2)+'\n');
 console.log('APPLIED migration 126; read-only invoker RPC and access grants verified. No business rows modified.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
