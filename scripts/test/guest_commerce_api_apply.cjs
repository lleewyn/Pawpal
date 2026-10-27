const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('Use --apply-cloud only after matching HTTP/SQL rollback PASS.');process.exit(0);}
const file='scripts/database/v1/113_guest_commerce_api.sql',reverseFile='scripts/database/v1/113_guest_commerce_api_rollback.sql';
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),source=fs.readFileSync(file,'utf8');
const signatures=['public.guest_commerce_context(text,integer)','public.guest_commerce_save_pet(text,timestamptz,uuid,text,text,jsonb)','public.guest_commerce_end(text)'];
(async()=>{const db=await connect();try{
 const report=JSON.parse(fs.readFileSync('docs/verification/sync/guest-commerce-api-rollback.txt','utf8'));
 assert.equal(report.status,'PASS');assert.equal(report.migrationSha256,hash(source));assert.equal(report.handlerSha256,hash(fs.readFileSync('scripts/api/guest_commerce.js','utf8')));assert.equal(report.checks.length,24);
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='2s'");
 const before=[];for(const signature of signatures){const value=(await db.query('SELECT to_regprocedure($1)::text value',[signature])).rows[0].value;assert.equal(value,null,'Refuse overwrite or partial install');before.push({signature,definition:value});}
 const folder='D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-commerce-113';fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(folder+'/before.private.json',JSON.stringify(before,null,2)+'\n');fs.writeFileSync(folder+'/forward.sql',source);fs.copyFileSync(reverseFile,folder+'/rollback-functions-only.sql');
 await db.query(source.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,''));
 const installed=(await db.query(`SELECT p.proname,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') customer_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') service_execute FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN('guest_commerce_context','guest_commerce_save_pet','guest_commerce_end') ORDER BY p.proname`)).rows;
 assert.equal(installed.length,3);assert.ok(installed.every(r=>r.prosecdef&&!r.anon_execute&&!r.customer_execute&&r.service_execute&&r.proconfig.includes('search_path=pg_catalog, public')));
 await db.query('COMMIT');fs.writeFileSync(folder+'/after.private.json',JSON.stringify(installed,null,2)+'\n');
 fs.writeFileSync('docs/verification/sync/guest-commerce-api-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',migrationSha256:hash(source),rollbackSha256:hash(fs.readFileSync(reverseFile,'utf8')),backupFolder:folder,functions:installed.map(({definition,...r})=>r),scope:'Three new service-only fixed-path RPC definitions; no calls creating business records, schema/table data/RLS unchanged; backend code not deployed'},null,2)+'\n');
 console.log('PASS 113 applied: three fixed-path service-only RPCs; no business records created.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
