const fs=require('node:fs'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--cloud-readonly')){console.log('Use --cloud-readonly for installed 112 schema checks.');process.exit(0);}
(async()=>{const db=await connect();try{
 await db.query("BEGIN READ ONLY;SET LOCAL statement_timeout='8s'");
 const constraints=(await db.query("SELECT conname,convalidated FROM pg_constraint WHERE conrelid IN('public.customer'::regclass,'public.guest_session'::regclass) AND conname=ANY($1)",[['customer_unverified_contact_phone_format','guest_session_commerce_customer_fk','guest_session_purpose_check','guest_session_commerce_scope_check']])).rows;
 assert.equal(constraints.length,4);assert.ok(constraints.every(c=>c.convalidated));
 const functions=(await db.query("SELECT p.proname,p.prosecdef,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') customer_execute FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='pawpal_private' AND p.proname IN('guard_guest_commerce_session','revoke_customer_commerce_sessions')")).rows;
 assert.equal(functions.length,2);assert.ok(functions.every(f=>f.prosecdef&&!f.anon_execute&&!f.customer_execute&&f.proconfig.includes('search_path=pg_catalog, public')));
 const triggers=(await db.query("SELECT tgname,tgenabled FROM pg_trigger WHERE tgname IN('guard_guest_commerce_session','revoke_customer_commerce_sessions') AND tgrelid IN('public.customer'::regclass,'public.guest_session'::regclass)")).rows;
 assert.equal(triggers.length,2);assert.ok(triggers.every(t=>t.tgenabled==='O'));
 const legacy=(await db.query("SELECT count(*)::int n FROM pg_indexes WHERE schemaname='public' AND tablename='customer_phone' AND indexname IN('customer_phone_customer_id_idx','customer_phone_phone_number_idx') AND indexdef LIKE 'CREATE UNIQUE INDEX%'")).rows[0];assert.equal(legacy.n,2);
 const anonPolicies=(await db.query("SELECT count(*)::int n FROM pg_policies WHERE schemaname='public' AND tablename IN('customer','guest_session') AND 'anon'=ANY(roles)")).rows[0];assert.equal(anonPolicies.n,0);
 await db.query('ROLLBACK');fs.writeFileSync('docs/verification/sync/guest-commerce-schema-readonly.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',constraints,functions,triggers,primaryUniqueIndexesPreserved:legacy.n,anonymousPolicies:anonPolicies.n,scope:'Installed schema metadata only; no business writes or Logs; not HTTP/transaction E2E'},null,2)+'\n');
 console.log('PASS installed constraints validated, fixed-path trigger functions private, triggers enabled, primary phone indexes retained, no anonymous policies.');
}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
