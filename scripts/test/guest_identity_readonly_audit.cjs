// Read-only metadata/aggregate audit; never applies migration 111 or changes customers.
const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--cloud-readonly')){console.log('No connection. Use --cloud-readonly for metadata/aggregate reads.');process.exit(0);}
(async()=>{const db=await connect();try{
 await db.query("BEGIN READ ONLY;SET LOCAL statement_timeout='8s'");
 const counts=(await db.query("SELECT count(*)::integer total,count(*) FILTER(WHERE c.auth_user_id IS NULL)::integer guests,count(*) FILTER(WHERE c.auth_user_id IS NOT NULL)::integer members,count(*) FILTER(WHERE (c.auth_user_id IS NOT NULL) IS DISTINCT FROM EXISTS(SELECT 1 FROM public.customer_membership m WHERE m.customer_id=c.id))::integer loyaltyIdentityMismatch FROM public.customer c")).rows[0];
 const metadata=(await db.query("SELECT has_column_privilege('authenticated','public.customer','auth_user_id','SELECT') auth_column_select,(SELECT relrowsecurity FROM pg_class WHERE oid='public.customer'::regclass) customer_rls_enabled,strpos(pg_get_functiondef('public.admin_customer_page(text,text,text,text,integer,integer,text)'::regprocedure),'customer_type')>0 page_returns_identity")).rows[0];
 const policy=(await db.query("SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='customer' AND cmd='SELECT'")).rows.map(r=>r.qual);
 await db.query('ROLLBACK');fs.writeFileSync('docs/verification/sync/guest-identity-readonly-audit.txt',JSON.stringify({timestamp:new Date().toISOString(),scope:'Existing Cloud read-only schema/aggregate checks, no customer records or credentials exported; not staging migration validation',counts,metadata,customerSelectPolicyExpressions:policy},null,2)+'\n');console.log('PASS read-only metadata/aggregate audit; no data/schema writes.');
}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name);process.exitCode=1;});
