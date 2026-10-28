const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');const {connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud for migration 134.');process.exit(0);}
(async()=>{const db=await connect();try{
 const sql=fs.readFileSync('scripts/database/v1/134_complaint_search_order.sql','utf8'),signature='public.admin_complaint_page(text,jsonb,integer,integer,text,uuid[])';await db.query("BEGIN;SET LOCAL statement_timeout='10s';SET LOCAL lock_timeout='3s'");
 const old=(await db.query('SELECT pg_get_functiondef($1::regprocedure) definition',[signature])).rows[0].definition,backup='docs/verification/sync/complaint-filters-134-rollback.sql';if(!fs.existsSync(backup))fs.writeFileSync(backup,'BEGIN;\n'+old+";\nDROP FUNCTION IF EXISTS public.admin_complaint_search_text(text);\nNOTIFY pgrst,'reload schema';\nCOMMIT;\n");
 await db.query(sql.replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));const checks=(await db.query(`SELECT NOT prosecdef AS invoker,provolatile='s' AS stable,
 has_function_privilege('authenticated',oid,'EXECUTE') AS staff_available,NOT has_function_privilege('anon',oid,'EXECUTE') AS anonymous_blocked,
 strpos(pg_get_functiondef(oid),'admin_complaint_search_text')>0 AS normalized_search,
 strpos(pg_get_functiondef(oid),'jsonb_agg(id ORDER BY sort_index)')>0 AS stable_page_order
 FROM pg_proc WHERE oid=$1::regprocedure`,[signature])).rows[0];assert.ok(Object.values(checks).every(v=>v===true));await db.query('COMMIT');
 fs.writeFileSync('docs/verification/sync/complaint-filters-134-cloud-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'APPLIED',sha256:crypto.createHash('sha256').update(sql).digest('hex'),checks,scope:'Read-only complaint normalized search, open high/urgent scope and stable page order; no ticket rows modified or SLA deadlines invented'},null,2)+'\n');console.log('APPLIED 134; normalized search, page order and access grants verified. No business rows modified.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
