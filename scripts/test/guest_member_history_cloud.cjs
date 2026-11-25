const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
const apply=process.argv.includes('--apply-cloud');
if(!apply&&!process.argv.includes('--verify-cloud'))throw Error('Use --verify-cloud (rollback) or --apply-cloud.');
const migration='my-server/scripts/database/v1/272_guest_member_history.sql',source=fs.readFileSync(migration,'utf8');
const report='docs/verification/guest-member-history/database-check.txt';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const signature='public.complete_guest_customer_auth(text,uuid,text,text)';
const guest='f6429361-2394-49ff-aa9a-ff60784a16c3',member='11f261a4-a46c-4aa1-b28c-de595964db10',auth='46a00820-9017-47f9-b252-c870c4a55131',phone='0987987987';
const tables=['pet_profile','appointment','sales_order','payment','finance_entry','support_ticket','notification','customer_address','pawpal_private.booking_cancellation_event','pawpal_private.booking_unlock_event','pawpal_private.member_booking_hold'];
(async()=>{const db=await connect(),checks=[];const q=(sql,args)=>db.query(sql,args),pass=name=>checks.push(name);
 const snapshots=async()=>{const result={};for(const table of tables)result[table]=(await q(`SELECT to_jsonb(t)-'customer_id'-'updated_at' value FROM ${table} t WHERE customer_id=ANY($1::uuid[]) ORDER BY (to_jsonb(t)-'customer_id'-'updated_at')::text`,[[guest,member]])).rows.map(r=>r.value);return result;};
 const counts=async()=>{const result={};for(const table of ['pet_profile','appointment','sales_order','payment','support_ticket'])result[table]=(await q(`SELECT customer_id,count(*)::int count FROM ${table} WHERE customer_id=ANY($1::uuid[]) GROUP BY customer_id ORDER BY customer_id`,[[guest,member]])).rows;return result;};
 const deny=async(sql,args,code)=>{await q('SAVEPOINT denied');let actual;try{await q(sql,args);}catch(e){actual=e.code;}await q('ROLLBACK TO SAVEPOINT denied');await q('RELEASE SAVEPOINT denied');assert.equal(actual,code);};
 try{
  await q("BEGIN;SET LOCAL statement_timeout='12s';SET LOCAL lock_timeout='3s'");
  const original=(await q('SELECT pg_get_functiondef($1::regprocedure) definition',[signature])).rows[0].definition;
  const paymentGuard=(await q("SELECT pg_get_functiondef('pawpal_private.validate_payment()'::regprocedure) definition")).rows[0].definition;
  const before=await snapshots(),beforeCounts=await counts();
  assert.equal((await q('SELECT auth_user_id FROM customer WHERE id=$1',[member])).rows[0].auth_user_id,auth);
  assert.equal((await q('SELECT unverified_contact_phone FROM customer WHERE id=$1',[guest])).rows[0].unverified_contact_phone,phone);
  if(apply){
   const proof=JSON.parse(fs.readFileSync(report,'utf8'));assert.equal(proof.status,'PASS');assert.equal(proof.migrationSha256,sha(source));assert.equal(proof.originalSha256,sha(original));assert.equal(proof.paymentGuardSha256,sha(paymentGuard));assert.equal(proof.beforeSha256,sha(JSON.stringify(before)));
   const backup='D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-member-history-272';fs.mkdirSync(backup,{recursive:true});
   fs.writeFileSync(path.join(backup,'function-before.sql'),original+';\n');
   fs.writeFileSync(path.join(backup,'payment-guard-before.sql'),paymentGuard+';\n');
   const identity=(await q('SELECT to_jsonb(c) value FROM customer c WHERE id=ANY($1::uuid[]) ORDER BY id',[[guest,member]])).rows;
   const sessions=(await q('SELECT to_jsonb(s) value FROM guest_session s WHERE customer_id=$1',[guest])).rows;
   const fullRows={};for(const table of tables)fullRows[table]=(await q(`SELECT to_jsonb(t) value FROM ${table} t WHERE customer_id=ANY($1::uuid[])`,[[guest,member]])).rows;
   fs.writeFileSync(path.join(backup,'before.private.txt'),JSON.stringify({identity,sessions,fullRows,beforeCounts},null,2));
  }
  await q(source.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,''));
  const move='SELECT pawpal_private.move_guest_customer_history($1,$2,$3,$4) id';
  if(!apply){
   await deny('UPDATE public.payment SET customer_id=$1 WHERE id=(SELECT id FROM public.payment WHERE customer_id=$2 LIMIT 1)',[member,guest],'P0001');pass('Direct payment reassignment remains forbidden outside approved history migration');
   await deny(move,[guest,member,crypto.randomUUID(),phone],'42501');pass('Wrong Auth identity cannot move history');
   await deny('SELECT public.complete_guest_customer_auth($1,$2,$3,NULL)',['a'.repeat(64),auth,phone],'42501');pass('Phone and verified identity without guest cookie cannot claim a profile');
   for(const role of ['anon','authenticated']){
    await q('SET LOCAL ROLE '+role);await deny('SELECT public.complete_guest_customer_auth($1,$2,$3,NULL)',['a'.repeat(64),auth,phone],'42501');await q('RESET ROLE');
   }pass('Public callers cannot invoke server linking RPC');
  }
  const result=await q(move,[guest,member,auth,phone]);assert.equal(result.rows[0].id,member);
  assert.deepEqual(await snapshots(),before);pass('Existing IDs, details, amounts, statuses and timestamps except updated_at retained');
  const afterCounts=await counts();
  for(const table of Object.keys(beforeCounts)){assert.equal(afterCounts[table].find(r=>r.customer_id===guest),undefined);assert.equal(afterCounts[table].find(r=>r.customer_id===member)?.count||0,beforeCounts[table].reduce((sum,r)=>sum+r.count,0));}
  pass('Real phone history is unified under existing member, including all payments');
  assert.equal((await q('SELECT count(*)::int n FROM guest_session WHERE customer_id=$1 AND revoked_at IS NULL',[guest])).rows[0].n,0);pass('Old guest sessions revoked');
  await q(move,[guest,member,auth,phone]);assert.deepEqual(await counts(),afterCounts);pass('Retry does not duplicate records');
  await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[auth]);await q('SET LOCAL ROLE authenticated');
  assert.equal((await q('SELECT count(*)::int n FROM pet_profile WHERE customer_id=$1',[member])).rows[0].n,1);
  assert.equal((await q('SELECT count(*)::int n FROM appointment WHERE customer_id=$1',[member])).rows[0].n,1);
  assert.equal((await q('SELECT count(*)::int n FROM sales_order WHERE customer_id=$1',[member])).rows[0].n,5);
  await q('RESET ROLE');pass('Actual member RLS can read Đậu, one appointment and five orders');
  await q("SELECT set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claim.role','service_role',true)");
  if(!apply){
   // New guest activation must keep its original ID; existing-member login must merge exactly the cookie owner.
   for(const existing of [false,true]){
    const uid=crypto.randomUUID(),gid=crypto.randomUUID(),mid=existing?crypto.randomUUID():gid,pet=crypto.randomUUID(),booking=crypto.randomUUID(),order=crypto.randomUUID(),hash=crypto.randomBytes(32).toString('hex');
    let fixturePhone;do{fixturePhone='095'+crypto.randomInt(1000000,10000000);}while((await q("SELECT 1 FROM customer_phone WHERE phone_number=$1 UNION ALL SELECT 1 FROM auth.users WHERE phone='84'||substring($1 FROM 2)",[fixturePhone])).rowCount);
    await q("INSERT INTO auth.users(id,aud,role,phone,phone_confirmed_at,raw_app_meta_data) VALUES($1,'authenticated','authenticated',$2,now(),'{\"pawpal_test\":true}')",[uid,'84'+fixturePhone.slice(1)]);
    await q("INSERT INTO customer(id,customer_code,unverified_contact_phone) VALUES($1,$2,$3)",[gid,'VERIFY272-'+gid,fixturePhone]);
    await q("INSERT INTO customer_profile(customer_id,full_name) VALUES($1,'History rollback guest')",[gid]);
    if(existing){await q("INSERT INTO customer(id,customer_code,auth_user_id) VALUES($1,$2,$3)",[mid,'VERIFY272-'+mid,uid]);await q('INSERT INTO customer_phone(customer_id,phone_number,is_primary,verified_at) VALUES($1,$2,true,now())',[mid,fixturePhone]);}
    await q("INSERT INTO guest_session(token_hash,purpose,customer_id,expires_at) VALUES($1,'commerce',$2,now()+interval '1 day')",[hash,gid]);
    await q("INSERT INTO pet_profile(id,customer_id,pet_code,pet_name,breed_id) VALUES($1,$2,$3,'History pet',(SELECT id FROM pet_breed WHERE is_active ORDER BY id LIMIT 1))",[pet,gid,'VERIFY272-'+pet]);
    await q("INSERT INTO appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at) VALUES($1,$2,$3,$4,now()+interval '20 days',now()+interval '481 hours')",[booking,'VERIFY272-'+booking,gid,pet]);
    await q('INSERT INTO sales_order(id,order_code,customer_id) VALUES($1,$2,$3)',[order,'VERIFY272-'+order,gid]);
    await deny('SELECT public.complete_guest_customer_auth($1,$2,$3,NULL)',[crypto.randomBytes(32).toString('hex'),uid,fixturePhone],'42501');
    assert.equal((await q('SELECT public.complete_guest_customer_auth($1,$2,$3,$4) id',[hash,uid,fixturePhone,existing?null:'History member'])).rows[0].id,mid);
    assert.equal((await q('SELECT public.complete_guest_customer_auth($1,$2,$3,NULL) id',[hash,uid,fixturePhone])).rows[0].id,mid);
    for(const [table,id] of [['pet_profile',pet],['appointment',booking],['sales_order',order]])assert.equal((await q(`SELECT customer_id FROM ${table} WHERE id=$1`,[id])).rows[0].customer_id,mid);
    if(!existing)assert.equal((await q("SELECT count(*)::int n FROM paw_point_transaction WHERE customer_id=$1 AND idempotency_key='registration-welcome:'||$1::text",[mid])).rows[0].n,1);
    pass(existing?'Existing member claims only the proven guest and retry is safe':'Fresh activation keeps guest ID, all histories and one welcome award');
   }
  }
  await q('SET CONSTRAINTS ALL IMMEDIATE');pass('All deferred constraints pass');
  if(apply){await q('COMMIT');fs.writeFileSync('docs/verification/guest-member-history/applied.txt',JSON.stringify({status:'APPLIED',timestamp:new Date().toISOString(),migrationSha256:sha(source),beforeCounts,afterCounts,checks},null,2)+'\n');console.log('APPLIED 272 and scoped history repair:',JSON.stringify(afterCounts));}
  else{await q('ROLLBACK');fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({status:'PASS',timestamp:new Date().toISOString(),migrationSha256:sha(source),originalSha256:sha(original),paymentGuardSha256:sha(paymentGuard),beforeSha256:sha(JSON.stringify(before)),beforeCounts,afterCounts,checks,scope:'Cloud SQL rollback tests, actual business history and member RLS; no Auth sessions/password changes or committed data'},null,2)+'\n');console.log('PASS',checks.length,'Cloud rollback checks. No data/schema committed.');}
 }catch(error){await q('RESET ROLE').catch(()=>{});await q('ROLLBACK').catch(()=>{});throw error;}finally{await db.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
