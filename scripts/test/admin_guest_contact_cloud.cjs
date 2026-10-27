const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
const apply=process.argv.includes('--apply-cloud');if(!apply&&!process.argv.includes('--verify-cloud')){console.log('Use --verify-cloud for rollback checks or --apply-cloud after matching PASS.');process.exit(0);}
const file='scripts/database/v1/117_admin_guest_contact.sql',source=fs.readFileSync(file,'utf8'),oldSource=fs.readFileSync('scripts/database/v1/111_admin_customer_identity.sql','utf8'),reverse=fs.readFileSync('scripts/database/v1/117_admin_guest_contact_rollback.sql','utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),body=s=>s.match(/AS \$\$([\s\S]*?)\$\$;/)[1].replaceAll('\r\n','\n').trim();
const signature='public.admin_customer_page(text,text,text,text,integer,integer,text)',report='docs/verification/sync/admin-guest-contact-rollback.txt';
(async()=>{const db=await connect(),checks=[];let queries=0;const q=(sql,args)=>{queries++;return db.query(sql,args);},pass=name=>checks.push(name);
 try{
  await q("SET statement_timeout='8s';SET lock_timeout='2s'");
  const original=(await q('SELECT pg_get_functiondef($1::regprocedure) definition,prosrc,proacl::text acl FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0];
  assert.equal(original.prosrc.replaceAll('\r\n','\n').trim(),body(oldSource),'Live RPC differs from protected 111 baseline');
  if(apply){
   const proof=JSON.parse(fs.readFileSync(report,'utf8'));assert.equal(proof.status,'PASS');assert.equal(proof.sha256,sha(source));assert.equal(proof.originalSha256,sha(original.definition));
   const folder='D:/Aboutme/Pawpal-infra/supabase-local/backups/admin-guest-contact-117';fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(folder+'/before.sql',original.definition+';\n');fs.writeFileSync(folder+'/forward.sql',source);fs.writeFileSync(folder+'/reverse.sql',reverse);
   await q(source);const installed=(await q('SELECT prosrc,proacl::text acl FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0];assert.equal(installed.prosrc.replaceAll('\r\n','\n').trim(),body(source));assert.equal(installed.acl,original.acl);
   fs.writeFileSync('docs/verification/sync/admin-guest-contact-apply.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'APPLIED',migration:117,sha256:sha(source),aclUnchanged:true,scope:'Replace existing Admin read/search RPC only; no customer/phone/transaction rows updated. Original function and tested reverse backed up outside webroot.'},null,2)+'\n');console.log('APPLIED 117; grants unchanged, original read function backed up.');return;
  }
  const strip=s=>s.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');await q('BEGIN');await q(strip(source));
  const staffAuth=crypto.randomUUID(),memberAuth=crypto.randomUUID(),staff=crypto.randomUUID(),ids=Array.from({length:3},()=>crypto.randomUUID());
  let phone,primary;do{phone='09'+crypto.randomInt(10000000,99999999);}while((await q('SELECT 1 FROM public.customer_phone WHERE phone_number=$1',[phone])).rowCount);
  do{primary='08'+crypto.randomInt(10000000,99999999);}while((await q('SELECT 1 FROM public.customer_phone WHERE phone_number=$1',[primary])).rowCount);
  await q('INSERT INTO auth.users(id) VALUES($1),($2)',[staffAuth,memberAuth]);await q("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'Guest contact rollback QA','QA','active',false)",[staff,staffAuth]);await q("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[staff]);
  for(let i=0;i<3;i++)await q("INSERT INTO public.customer(id,customer_code,unverified_contact_phone,auth_user_id) VALUES($1,$2,$3,$4)",[ids[i],'CONTACT-'+ids[i],phone,i===2?memberAuth:null]);
  await q('INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES($1,$2,true)',[ids[2],primary]);
  await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[staffAuth]);await q('SET LOCAL ROLE authenticated');
  const page=async(query='',lookup='')=>(await q("SELECT public.admin_customer_page($1,'ALL','ALL','ALL',1,10,$2) value",[query,lookup])).rows[0].value;
  const guests=await page(phone);assert.ok(ids.slice(0,2).every(id=>guests.pageIds.includes(id)));assert.ok(!guests.pageIds.includes(ids[2]));pass('Admin phone search finds both isolated guests without canonical phones or merging');
  const one=await page('',ids[0]);assert.equal(one.total,1);assert.equal(one.custData[0].unverified_contact_phone,phone);assert.equal(one.custData[0].customer_type,'guest');assert.equal(one.phonesData.length,0);assert.ok(!('auth_user_id' in one.custData[0]));pass('Admin receives self-reported contact separately, without canonical phone creation or Auth ID exposure');
  const member=await page(primary);assert.ok(member.pageIds.includes(ids[2]));pass('Canonical primary phone keeps search priority for linked member');
  await q('RESET ROLE');await q("SELECT set_config('request.jwt.claim.sub',$1,true)",[memberAuth]);await q('SET LOCAL ROLE authenticated');await q('SAVEPOINT denied');let code;try{await page(phone);}catch(error){code=error.code;}await q('ROLLBACK TO SAVEPOINT denied');assert.equal(code,'42501');pass('Customer role still cannot access Admin contacts');
  await q('RESET ROLE');await q('SET LOCAL ROLE anon');await q('SAVEPOINT denied');code=null;try{await page(phone);}catch(error){code=error.code;}await q('ROLLBACK TO SAVEPOINT denied');assert.equal(code,'42501');pass('Anonymous role cannot execute Admin directory');
  await q('RESET ROLE');await q(strip(reverse));assert.equal((await q('SELECT prosrc FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0].prosrc.replaceAll('\r\n','\n').trim(),body(oldSource));pass('Reverse restores protected read RPC without deleting fixture data');
  await q('SET CONSTRAINTS ALL IMMEDIATE');await q('ROLLBACK');assert.equal((await q('SELECT pg_get_functiondef($1::regprocedure) definition FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0].definition,original.definition);assert.equal((await q('SELECT count(*)::int n FROM public.customer WHERE id=ANY($1::uuid[])',[ids])).rows[0].n,0);pass('All DDL/Auth/staff/customer/phone fixtures rolled back');
  fs.writeFileSync(report,JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',sha256:sha(source),originalSha256:sha(original.definition),queries,checks,scope:'Real Cloud SQL with synthetic Admin/customer JWT claims, rollback and reverse. No actual Auth login/UI/commit or real customer changes; no Logs.'},null,2)+'\n');console.log('PASS',checks.length,'Admin contact checks;',queries,'SQL; all fixtures/DDL rolled back.');
 }catch(error){await db.query('RESET ROLE').catch(()=>{});await db.query('ROLLBACK').catch(()=>{});console.error(error.code||error.name,error.message);process.exitCode=1;}finally{await db.end();}
})();
