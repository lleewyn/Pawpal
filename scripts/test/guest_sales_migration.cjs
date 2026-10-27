const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
const file='scripts/database/v1/115_guest_sales.sql',reverseFile='scripts/database/v1/115_guest_sales_rollback.sql';
const source=fs.readFileSync(file,'utf8'),reverse=fs.readFileSync(reverseFile,'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex'),body=s=>s.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');
const apply=process.argv.includes('--apply-cloud');
if(!apply&&!process.argv.includes('--verify-reverse')){console.log('Use --verify-reverse for DDL roundtrip, --apply-cloud after matching HTTP/SQL PASS.');process.exit(0);}
const signatures=['pawpal_private.quote_guest_sales_core(uuid,jsonb,jsonb)','pawpal_private.create_guest_sales_core(uuid,uuid,text,jsonb,jsonb)','pawpal_private.validate_guest_sales_input(jsonb,jsonb)','public.guest_sales_quote(text,jsonb,jsonb)','public.guest_sales_create(text,timestamptz,uuid,text,jsonb,jsonb,jsonb,uuid)','public.guest_sales_receipt(text,uuid)'];
(async()=>{const db=await connect();try{
 const report=JSON.parse(fs.readFileSync('docs/verification/sync/guest-sales-rollback.txt'));assert.equal(report.status,'PASS');assert.equal(report.checks.length,24);assert.equal(report.migrationSha256,hash(source));assert.equal(report.handlerSha256,hash(fs.readFileSync('scripts/api/guest_commerce.js','utf8')));
 const baseline=JSON.parse(fs.readFileSync('docs/verification/sync/guest-sales-source-baseline.txt')),originals=[];
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='2s'");
 for(const f of baseline.sources){const definition=(await db.query('SELECT pg_get_functiondef($1::regprocedure) value',[f.signature])).rows[0].value;assert.equal(hash(definition.replaceAll('\r\n','\n')),f.sha256);originals.push({...f,definition});}
 for(const signature of signatures)assert.equal((await db.query('SELECT to_regprocedure($1)::text value',[signature])).rows[0].value,null,'115 already installed or partial state');
 const folder='D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-sales-115';
 if(apply){const reverseProof=JSON.parse(fs.readFileSync('docs/verification/sync/guest-sales-reverse.txt'));assert.equal(reverseProof.status,'PASS');assert.equal(reverseProof.migrationSha256,hash(source));assert.equal(reverseProof.reverseSha256,hash(reverse));fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(folder+'/protected-member-functions-before.private.json',JSON.stringify(originals,null,2)+'\n');fs.writeFileSync(folder+'/forward.sql',source);fs.writeFileSync(folder+'/rollback-functions-only.sql',reverse);}
 await db.query(body(source));
 const installed=(await db.query(`SELECT n.nspname schema,p.proname,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') customer_execute,has_function_privilege('service_role',p.oid,'EXECUTE') service_execute
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname IN('guest_sales_quote','guest_sales_create','guest_sales_receipt')) OR
 (n.nspname='pawpal_private' AND p.proname IN('quote_guest_sales_core','create_guest_sales_core','validate_guest_sales_input')) ORDER BY 1,2`)).rows;
 assert.equal(installed.length,6);assert.ok(installed.every(f=>f.prosecdef&&!f.anon_execute&&!f.customer_execute&&f.service_execute===(f.schema==='public')&&f.proconfig.includes('search_path=pg_catalog, public')));
 for(const f of originals)assert.equal((await db.query('SELECT pg_get_functiondef($1::regprocedure) value',[f.signature])).rows[0].value,f.definition);
 if(apply){
  await db.query('COMMIT');fs.writeFileSync(folder+'/after.private.json',JSON.stringify(installed,null,2)+'\n');
  fs.writeFileSync('docs/verification/sync/guest-sales-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',migrationSha256:hash(source),reverseSha256:hash(reverse),protectedMemberFunctionsUnchanged:true,functions:installed.map(({definition,...f})=>f),scope:'New private guest pricing/stock helpers and service-only public quote/create/receipt; no business writes during apply, no member/RLS/table changes; backend code local, not deployed UI acceptance'},null,2)+'\n');
  console.log('PASS 115 applied: six fixed-path functions, server-only RPCs, member functions unchanged.');
 }else{
  await db.query(body(reverse));for(const signature of signatures)assert.equal((await db.query('SELECT to_regprocedure($1)::text value',[signature])).rows[0].value,null);
  for(const f of originals)assert.equal((await db.query('SELECT pg_get_functiondef($1::regprocedure) value',[f.signature])).rows[0].value,f.definition);
  await db.query('ROLLBACK');fs.writeFileSync('docs/verification/sync/guest-sales-reverse.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',migrationSha256:hash(source),reverseSha256:hash(reverse),scope:'Forward and reverse DDL executed in rollback, all six new functions removed; member definitions unchanged, no business data written'},null,2)+'\n');console.log('PASS 115 DDL forward/reverse and grants; all rolled back.');
 }
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
