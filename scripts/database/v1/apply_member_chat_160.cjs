// Apply only migration160 after its rollback-only SQL/RLS suite passes unchanged.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {connect}=require('./service_import_connection.cjs');
(async()=>{const migration='scripts/database/v1/160_member_chat_context.sql',evidence='docs/chatbot/member-phase1-2026-10-31/sql-checks.txt',prior=JSON.parse(fs.readFileSync(evidence,'utf8'));
 assert.equal(prior.pass,true);assert.equal(prior.applied,false);assert.ok(fs.statSync(migration).mtimeMs<=fs.statSync(evidence).mtimeMs,'SQL changed after tests; rerun its test suite first');
 const db=await connect();try{const existing=(await db.query("SELECT to_regprocedure('public.read_member_chat_context(jsonb)') AS fn")).rows[0].fn;
 if(existing){const rows=(await db.query("SELECT p.proname,md5(p.prosrc) AS hash FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname,p.proname) IN (('public','read_member_chat_context'),('pawpal_private','admit_member_chat_read')) ORDER BY p.proname")).rows;assert.deepEqual(rows,[{proname:'admit_member_chat_read',hash:'e00ae20a4bff4bba681617c21d30c707'},{proname:'read_member_chat_context',hash:'f77cc3f488c60ea8fc3132b56f3abf01'}],'Only reviewed initial160 may be updated');}
 const sql=fs.readFileSync(migration,'utf8');await db.query(sql);
 const meta=(await db.query("SELECT p.proname,p.prosecdef,p.proconfig,has_function_privilege('anon',p.oid,'execute') AS anon,has_function_privilege('authenticated',p.oid,'execute') AS authenticated,has_function_privilege('service_role',p.oid,'execute') AS service FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='read_member_chat_context'")).rows;
 assert.equal(meta.length,1);assert.equal(meta[0].prosecdef,false);assert.equal(meta[0].anon,false);assert.equal(meta[0].authenticated,true);assert.equal(meta[0].service,false);
 const report={applied:true,migration:'160_member_chat_context.sql',sha256:crypto.createHash('sha256').update(sql).digest('hex'),meta,scope:'Bounded member source and ownership-checked totals helper only; no business data migrated or modified; preceding transaction fixtures rolled back'};
 fs.writeFileSync('docs/chatbot/member-phase1-2026-10-31/migration-apply.txt',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
