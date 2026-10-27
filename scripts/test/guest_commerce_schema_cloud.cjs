const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
const file='scripts/database/v1/112_guest_commerce_identity.sql',reverseFile='scripts/database/v1/112_guest_commerce_identity_rollback.sql';
const source=fs.readFileSync(file,'utf8'),reverse=fs.readFileSync(reverseFile,'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const body=s=>s.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');
const reportPath='docs/verification/sync/guest-commerce-schema-rollback.txt';
const apply=process.argv.includes('--apply-cloud');
if(!apply&&!process.argv.includes('--verify-cloud')){console.log('Use --verify-cloud for transaction rollback tests; --apply-cloud requires matching PASS and pre-state.');process.exit(0);}
const metadataSql=`SELECT jsonb_build_object(
 'columns',(SELECT jsonb_agg(to_jsonb(s) ORDER BY table_name,ordinal_position) FROM (SELECT table_name,column_name,ordinal_position,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name IN('customer','guest_session')) s),
 'constraints',(SELECT jsonb_agg(to_jsonb(s) ORDER BY table_name,name) FROM (SELECT c.relname table_name,k.conname name,pg_get_constraintdef(k.oid,true) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid WHERE c.oid IN('public.customer'::regclass,'public.guest_session'::regclass)) s),
 'indexes',(SELECT jsonb_agg(to_jsonb(s) ORDER BY tablename,indexname) FROM (SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN('customer','customer_phone','guest_session')) s),
 'policies',(SELECT jsonb_agg(to_jsonb(s) ORDER BY tablename,policyname) FROM (SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN('customer','customer_phone','guest_session')) s),
 'acl',(SELECT jsonb_agg(jsonb_build_object('table',relname,'acl',relacl::text,'rls',relrowsecurity) ORDER BY relname) FROM pg_class WHERE oid IN('public.customer'::regclass,'public.guest_session'::regclass)),
 'triggers',(SELECT jsonb_agg(pg_get_triggerdef(oid,true) ORDER BY tgname) FROM pg_trigger WHERE tgrelid IN('public.customer'::regclass,'public.guest_session'::regclass) AND NOT tgisinternal),
 'protected_functions',(SELECT jsonb_agg(pg_get_functiondef(p.oid) ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('admin_customer_page','ensure_guest_customer','complete_customer_auth','create_own_sales_order','create_own_service_booking','own_customer_cart'))
) state`;
(async()=>{
 const db=await connect(),checks=[];let queries=0;
 const q=async(s,a)=>{queries++;return db.query(s,a);};
 const pass=name=>checks.push({name,status:'PASS'});
 const state=async()=>(await q(metadataSql)).rows[0].state;
 const denied=async(name,sql,args,code='23514')=>{await q('SAVEPOINT denied_case');let actual;try{await q(sql,args);}catch(e){actual=e.code;}await q('ROLLBACK TO SAVEPOINT denied_case');assert.equal(actual,code,name);pass(name);};
 const folder='D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-commerce-112';
 try{
  await q("SET statement_timeout='12s';SET lock_timeout='3s'");
  const before=await state(),beforeHash=hash(JSON.stringify(before));
  assert.ok(!before.columns.some(c=>c.column_name==='unverified_contact_phone'||(c.table_name==='guest_session'&&['purpose','customer_id'].includes(c.column_name))),'112 already present or unexpected partial state');
  if(apply){
   const evidence=JSON.parse(fs.readFileSync(reportPath,'utf8'));
   assert.equal(evidence.status,'PASS');assert.equal(evidence.sha256,hash(source));assert.equal(evidence.rollbackSha256,hash(reverse));assert.equal(evidence.beforeSchemaSha256,beforeHash);
   fs.mkdirSync(folder,{recursive:true});
   fs.writeFileSync(folder+'/before.private.json',JSON.stringify(before,null,2)+'\n');
   fs.writeFileSync(folder+'/forward.sql',source);fs.writeFileSync(folder+'/rollback-no-commerce-data.sql',reverse);
   await q('BEGIN');
   await q('LOCK TABLE public.customer,public.guest_session IN ACCESS EXCLUSIVE MODE');
   assert.equal(hash(JSON.stringify(await state())),beforeHash,'Schema changed after preflight');
   const fingerprint=async()=>{
    const result={};
    for(const table of ['customer','guest_session']){
     const columns=before.columns.filter(c=>c.table_name===table).map(c=>'"'+c.column_name.replaceAll('"','""')+'"').join(',');
     result[table]=(await q(`SELECT count(*)::int count,md5(coalesce(string_agg(jsonb_build_array(${columns})::text,',' ORDER BY id),'')) digest FROM public.${table}`)).rows[0];
    }
    return result;
   };
   const dataBefore=await fingerprint();
   await q(body(source));
   const after=await state();assert.ok(after.columns.some(c=>c.column_name==='unverified_contact_phone'));
   assert.deepEqual(after.policies,before.policies);assert.deepEqual(after.acl,before.acl);assert.deepEqual(after.protected_functions,before.protected_functions);
   const defaults=(await q("SELECT count(*)::int n FROM public.guest_session WHERE purpose<>'general' OR customer_id IS NOT NULL")).rows[0];assert.equal(defaults.n,0);
   const dataAfter=await fingerprint();assert.deepEqual(dataAfter,dataBefore,'Existing business fields changed');
   await q('COMMIT');
   fs.writeFileSync(folder+'/after.private.json',JSON.stringify(after,null,2)+'\n');
   fs.writeFileSync('docs/verification/sync/guest-commerce-schema-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',sha256:hash(source),rollbackSha256:hash(reverse),beforeSchemaSha256:beforeHash,afterSchemaSha256:hash(JSON.stringify(after)),backupFolder:folder,existingDataFingerprintUnchanged:true,rowCounts:{customer:dataBefore.customer.count,guest_session:dataBefore.guest_session.count},scope:'Additive schema only; existing RLS/ACL/business RPC unchanged; preexisting business fields fingerprinted before/after inside locked apply transaction; no profile backfill or transaction guest acceptance; rollback refuses commerce data loss'},null,2)+'\n');
   console.log('PASS applied 112; protected RPC/ACL/policies unchanged; existing sessions remain general.');return;
  }
  await q('BEGIN');await q(body(source));
  const after=await state();assert.deepEqual(after.policies,before.policies);assert.deepEqual(after.acl,before.acl);assert.deepEqual(after.protected_functions,before.protected_functions);pass('Existing RLS, grants and member/Admin RPC definitions unchanged');
  assert.deepEqual(after.indexes.filter(i=>i.tablename==='customer_phone'),before.indexes.filter(i=>i.tablename==='customer_phone'));pass('Existing primary phone unique indexes unchanged');
  assert.equal((await q("SELECT count(*)::int n FROM public.guest_session WHERE purpose<>'general' OR customer_id IS NOT NULL")).rows[0].n,0);pass('Existing sessions default to general without customer binding');
  const fixture=crypto.randomUUID(),guest=crypto.randomUUID(),other=crypto.randomUUID(),member=crypto.randomUUID(),uid=crypto.randomUUID(),general=crypto.randomUUID(),commerce=crypto.randomUUID(),linkedSession=crypto.randomUUID();
  await q('SAVEPOINT fixtures');
  await q("INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES($1,'authenticated','authenticated',$2,'{}','{}',now(),now())",[uid,'guest-schema-'+fixture+'@example.invalid']);
  await q("INSERT INTO public.customer(id,customer_code,unverified_contact_phone) VALUES($1,$3,'0950000001'),($2,$4,'0950000001')",[guest,other,'G112-A-'+fixture,'G112-B-'+fixture]);
  await q('INSERT INTO public.customer(id,customer_code) VALUES($1,$2)',[member,'G112-M-'+fixture]);
  pass('Duplicate self-declared contact allowed on isolated profiles without claiming primary phone');
  await denied('Malformed self-declared contact rejected',"UPDATE public.customer SET unverified_contact_phone='+84950000001' WHERE id=$1",[guest]);
  await q("INSERT INTO public.guest_session(id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 days')",[general,hash('general-'+fixture)]);pass('Legacy general session supports unchanged lifetime and nullable customer');
  await q("INSERT INTO public.guest_session(id,token_hash,expires_at,purpose,customer_id) VALUES($1,$2,now()+interval '7 days','commerce',$3)",[commerce,hash('commerce-'+fixture),guest]);pass('Commerce session binds active guest with self-declared contact');
  await denied('Commerce lifetime above seven days rejected',"INSERT INTO public.guest_session(token_hash,expires_at,purpose,customer_id) VALUES($1,now()+interval '8 days','commerce',$2)",[hash('long-'+fixture),guest]);
  await denied('Unknown purpose rejected',"INSERT INTO public.guest_session(token_hash,expires_at,purpose) VALUES($1,now()+interval '1 day','other')",[hash('bad-scope-'+fixture)]);
  await denied('Commerce without customer rejected',"INSERT INTO public.guest_session(token_hash,expires_at,purpose) VALUES($1,now()+interval '1 day','commerce')",[hash('no-owner-'+fixture)]);
  await denied('General cannot acquire customer binding',"UPDATE public.guest_session SET customer_id=$1 WHERE id=$2",[guest,general]);
  await denied('Chat/general token cannot become commerce token',"UPDATE public.guest_session SET purpose='commerce',customer_id=$1 WHERE id=$2",[guest,general]);
  await denied('Commerce cannot switch owner even when phone matches',"UPDATE public.guest_session SET customer_id=$1 WHERE id=$2",[other,commerce]);
  await denied('Commerce token hash cannot be replaced',"UPDATE public.guest_session SET token_hash=$1 WHERE id=$2",[hash('changed-'+fixture),commerce]);
  await denied('Commerce cannot extend expiration',"UPDATE public.guest_session SET expires_at=expires_at+interval '1 second' WHERE id=$1",[commerce]);
  await denied('Commerce cannot change created time',"UPDATE public.guest_session SET created_at=created_at-interval '1 second' WHERE id=$1",[commerce]);
  await denied('Profile without self-declared contact cannot be bound',"INSERT INTO public.guest_session(token_hash,expires_at,purpose,customer_id) VALUES($1,now()+interval '1 day','commerce',$2)",[hash('missing-contact-'+fixture),member]);
  await q("UPDATE public.customer SET customer_status='locked' WHERE id=$1",[guest]);assert.ok((await q('SELECT revoked_at FROM public.guest_session WHERE id=$1',[commerce])).rows[0].revoked_at);pass('Locking bound customer revokes commerce session');
  await denied('Revoked commerce token cannot be reactivated',"UPDATE public.guest_session SET revoked_at=NULL WHERE id=$1",[commerce]);
  await denied('Locked customer cannot receive new commerce session',"INSERT INTO public.guest_session(token_hash,expires_at,purpose,customer_id) VALUES($1,now()+interval '1 day','commerce',$2)",[hash('locked-'+fixture),guest]);
  await q("INSERT INTO public.guest_session(id,token_hash,expires_at,purpose,customer_id) VALUES($1,$2,now()+interval '1 day','commerce',$3)",[linkedSession,hash('link-'+fixture),other]);
  await q('UPDATE public.customer SET auth_user_id=$1 WHERE id=$2',[uid,other]);assert.ok((await q('SELECT revoked_at FROM public.guest_session WHERE id=$1',[linkedSession])).rows[0].revoked_at);pass('Linking Auth revokes guest session while preserving customer ID');
  await denied('Member cannot receive new commerce session',"INSERT INTO public.guest_session(token_hash,expires_at,purpose,customer_id) VALUES($1,now()+interval '1 day','commerce',$2)",[hash('member-'+fixture),other]);
  await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[uid]);await q('SET LOCAL ROLE authenticated');
  assert.equal((await q('SELECT count(*)::int n FROM public.guest_session WHERE id=ANY($1::uuid[])',[[general,commerce,linkedSession]])).rows[0].n,0);pass('Customer cannot read raw guest session hashes/bindings through RLS');
  await denied('Customer cannot call private trigger function','SELECT pawpal_private.guard_guest_commerce_session()',[], '42501');
  await q('RESET ROLE');await q('SET LOCAL ROLE anon');await denied('Anon cannot read guest session table','SELECT * FROM public.guest_session LIMIT 1',[],'42501');await q('RESET ROLE');
  await denied('Reverse migration refuses to discard new contact/session data',body(reverse),[]);
  await q('ROLLBACK TO SAVEPOINT fixtures');
  await q(body(reverse));assert.deepEqual(await state(),before);pass('Forward and guarded reverse restore original logical schema, grants and RPCs with no new data');
  await q('ROLLBACK');assert.deepEqual(await state(),before);pass('Outer rollback leaves no DDL or synthetic fixtures');
  const fixtureRows=(await q('SELECT count(*)::int n FROM public.customer WHERE id=ANY($1::uuid[])',[[guest,other,member]])).rows[0].n;assert.equal(fixtureRows,0);
  fs.writeFileSync(reportPath,JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',sha256:hash(source),rollbackSha256:hash(reverse),beforeSchemaSha256:beforeHash,queries,checks,scope:'Cloud DDL and synthetic role/fixture tests inside rollback; forward/reverse verified; no committed business mutations, no SMS/Logs; not real Auth/HTTP/guest checkout E2E'},null,2)+'\n');
  console.log('PASS',checks.length,'checks;',queries,'SQL; DDL and fixtures rolled back, guarded reverse verified.');
 }catch(error){await db.query('RESET ROLE').catch(()=>{});await db.query('ROLLBACK').catch(()=>{});console.error(error.code||error.name,error.message);process.exitCode=1;}
 finally{await db.end();}
})().catch(error=>{console.error(error.code||error.name);process.exitCode=1;});
