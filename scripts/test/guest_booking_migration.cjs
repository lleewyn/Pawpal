const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
const file='scripts/database/v1/114_guest_booking.sql',reverseFile='scripts/database/v1/114_guest_booking_rollback.sql';
const source=fs.readFileSync(file,'utf8'),reverse=fs.readFileSync(reverseFile,'utf8');
const body=s=>s.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,''),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const apply=process.argv.includes('--apply-cloud');
if(!apply&&!process.argv.includes('--verify-reverse')){console.log('Use --verify-reverse for additive DDL roundtrip, --apply-cloud after matching PASS.');process.exit(0);}
const signatures=['pawpal_private.guest_booking_availability(uuid,jsonb)','pawpal_private.guest_booking_quote_core(uuid,jsonb)','pawpal_private.require_guest_booking_session(text)','public.guest_booking_quote(text,jsonb)','public.guest_booking_create(text,uuid,text,jsonb)','public.guest_booking_receipt(text,uuid)'];
(async()=>{const db=await connect();try{
 const proof=JSON.parse(fs.readFileSync('docs/verification/sync/guest-booking-rollback.txt','utf8'));assert.equal(proof.status,'PASS');assert.equal(proof.checks.length,31);assert.equal(proof.migrationSha256,hash(source));assert.equal(proof.handlerSha256,hash(fs.readFileSync('scripts/api/guest_commerce.js','utf8')));
 const baseline=JSON.parse(fs.readFileSync('docs/verification/sync/guest-booking-source-baseline.txt','utf8')),originals=[];
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='2s'");
 for(const f of baseline.sources){const definition=(await db.query('SELECT pg_get_functiondef($1::regprocedure) value',[f.signature])).rows[0].value;assert.equal(hash(definition.replaceAll('\r\n','\n')),f.sha256);originals.push({...f,definition});}
 for(const signature of signatures)assert.equal((await db.query('SELECT to_regprocedure($1)::text value',[signature])).rows[0].value,null,'114 already installed or partial state');
 if(apply){
  const report=JSON.parse(fs.readFileSync('docs/verification/sync/guest-booking-reverse.txt','utf8'));assert.equal(report.status,'PASS');assert.equal(report.migrationSha256,hash(source));assert.equal(report.reverseSha256,hash(reverse));
  const folder='D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-booking-114';fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(folder+'/protected-member-functions-before.private.json',JSON.stringify(originals,null,2)+'\n');fs.writeFileSync(folder+'/forward.sql',source);fs.writeFileSync(folder+'/rollback-functions-only.sql',reverse);
 }
 await db.query(body(source));
 const installed=(await db.query(`SELECT n.nspname schema,p.proname,p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) definition,
 has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') customer_execute,has_function_privilege('service_role',p.oid,'EXECUTE') service_execute
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname IN('guest_booking_quote','guest_booking_create','guest_booking_receipt')) OR
 (n.nspname='pawpal_private' AND p.proname IN('guest_booking_availability','guest_booking_quote_core','require_guest_booking_session')) ORDER BY 1,2`)).rows;
 assert.equal(installed.length,6);assert.ok(installed.every(f=>f.prosecdef&&!f.anon_execute&&!f.customer_execute&&f.service_execute===(f.schema==='public')&&f.proconfig.includes('search_path=pg_catalog, public')));
 for(const f of originals)assert.equal((await db.query('SELECT pg_get_functiondef($1::regprocedure) value',[f.signature])).rows[0].value,f.definition);
 if(apply){
  await db.query('COMMIT');fs.writeFileSync('D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-booking-114/after.private.json',JSON.stringify(installed,null,2)+'\n');
  fs.writeFileSync('docs/verification/sync/guest-booking-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',migrationSha256:hash(source),reverseSha256:hash(reverse),protectedMemberFunctionsUnchanged:true,functions:installed.map(({definition,...f})=>f),scope:'New private helpers and service-only guest booking RPCs; no business records created during apply, no public browser grants; API code local, no UI/production backend acceptance'},null,2)+'\n');
  console.log('PASS applied 114: six new fixed-path functions, service-only public RPCs, original member functions unchanged.');
 }else{
  await db.query(body(reverse));for(const signature of signatures)assert.equal((await db.query('SELECT to_regprocedure($1)::text value',[signature])).rows[0].value,null);
  for(const f of originals)assert.equal((await db.query('SELECT pg_get_functiondef($1::regprocedure) value',[f.signature])).rows[0].value,f.definition);
  await db.query('ROLLBACK');fs.writeFileSync('docs/verification/sync/guest-booking-reverse.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',migrationSha256:hash(source),reverseSha256:hash(reverse),scope:'Forward DDL and SQL reverse executed inside rollback; six new functions removed, protected member definitions unchanged, no business row writes'},null,2)+'\n');
  console.log('PASS 114 forward/reverse and privileges checked; all DDL rolled back, member functions unchanged.');
 }
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
