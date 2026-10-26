// Bounded integration only: synthetic actors/voucher, always ROLLBACK; no Logs.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs');
if(!process.argv.includes('--cloud')){console.log('No network. Use --cloud for rollback-only loyalty checks.');process.exit(0);}
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{
 const db=await connect();let queries=0;const [a,b,ca,cb,sa,staff,voucher,request,adjust]=Array.from({length:9},()=>randomUUID()),checks=[];
 const q=async(sql,args)=>{queries++;return db.query(sql,args);};
 const actor=async(id,role='authenticated')=>{await q('RESET ROLE');await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[id,role]);await q(role==='anon'?'SET LOCAL ROLE anon':'SET LOCAL ROLE authenticated');};
 const rejected=async(fn,codes)=>{await q('SAVEPOINT denied');let denied=false;try{await fn();}catch(e){assert.ok(codes.includes(e.code),'Unexpected SQLSTATE '+e.code);denied=true;}await q('ROLLBACK TO SAVEPOINT denied');await q('RELEASE SAVEPOINT denied');assert.ok(denied,'Expected denial');};
 const pass=name=>checks.push({name,status:'PASS'});
 const snapshot=async()=>(await q('SELECT public.own_loyalty_snapshot() value')).rows[0].value;
 const redeem=async(id,version)=>(await q('SELECT public.redeem_own_loyalty_voucher($1,$2,$3) value',[id,voucher,version])).rows[0].value;
 const version=async()=>(await q('SELECT md5(to_jsonb(v)::text) value FROM public.voucher v WHERE id=$1',[voucher])).rows[0].value;
 try{
  await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  await q('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[a,b,sa]);
  await q("INSERT INTO public.customer(id,auth_user_id,customer_code,customer_status) VALUES($1,$2,$3,'active'),($4,$5,$6,'active')",[ca,a,'E2E-LOYAL-A-'+ca,cb,b,'E2E-LOYAL-B-'+cb]);
  await q("INSERT INTO public.customer_profile(customer_id,full_name) VALUES($1,'E2E Loyalty A'),($2,'E2E Loyalty B') ON CONFLICT(customer_id) DO UPDATE SET full_name=excluded.full_name",[ca,cb]);
  await q("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'E2E Loyalty Admin','QA','active',false)",[staff,sa]);
  await q("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[staff]);
  await q("INSERT INTO public.voucher(id,voucher_code,voucher_name,discount_value,required_points,start_date,end_date,type,applicable_for) VALUES($1,$2,'E2E Loyalty Fixture',1000,40,(now() AT TIME ZONE 'Asia/Bangkok')::date-1,(now() AT TIME ZONE 'Asia/Bangkok')::date+1,'fixed','all')",[voucher,'E2E-'+voucher]);
  const initialVersion=await version();
  await actor(sa);
  const args=[ca,100,'E2E synthetic adjustment',adjust];
  await q('SELECT public.adjust_customer_points($1,$2,$3,$4)',args);await q('SELECT public.adjust_customer_points($1,$2,$3,$4)',args);
  let rows=(await q('SELECT points FROM public.paw_point_transaction WHERE customer_id=$1',[ca])).rows;assert.equal(rows.length,1);assert.equal(rows[0].points,100);pass('Admin adjustment and retry create one 100-point ledger entry');
  await actor(a);let s=await snapshot();assert.equal(s.customer_id,ca);assert.equal(Number(s.points),100);assert.ok(s.catalog.some(v=>v.id===voucher));assert.equal(s.history.length,1);pass('User snapshot reads Admin adjustment and active fixture voucher');
  await rejected(()=>q('SELECT public.adjust_customer_points($1,999,$2,$3)',[ca,'Forbidden',randomUUID()]),['42501']);
  await rejected(()=>q("INSERT INTO public.paw_point_transaction(customer_id,points,idempotency_key,sequence_no) VALUES($1,999,$2,2)",[ca,'forbidden:'+request]),['42501']);pass('Customer cannot call Admin adjustment or directly mint ledger points');
  assert.equal(await redeem(request,initialVersion),request);assert.equal(await redeem(request,initialVersion),request);s=await snapshot();assert.equal(Number(s.points),60);assert.equal(s.wallet.filter(w=>w.id===request).length,1);assert.equal(s.history.length,2);assert.equal(s.history.reduce((sum,r)=>sum+r.points,0),60);pass('Redemption and retry create one wallet item and one 40-point debit');
  await rejected(()=>redeem(request,'changed-version'),['PT409']);pass('Same request with different payload is rejected');
  await actor(sa);rows=(await q('SELECT points,customer_voucher_id FROM public.paw_point_transaction WHERE customer_id=$1 ORDER BY sequence_no',[ca])).rows;assert.deepEqual(rows.map(r=>r.points),[100,-40]);assert.equal(rows[1].customer_voucher_id,request);pass('Admin sees exact User redemption ledger and wallet reference');
  await q('RESET ROLE');await q('UPDATE public.voucher SET required_points=80 WHERE id=$1',[voucher]);let latest=await version();await actor(a);
  await rejected(()=>redeem(randomUUID(),initialVersion),['PT409']);await rejected(()=>redeem(randomUUID(),latest),['23514']);pass('Changed voucher rejects stale version; current cost enforces sufficient balance');
  await q('RESET ROLE');await q('UPDATE public.voucher SET is_active=false WHERE id=$1',[voucher]);latest=await version();await actor(a);s=await snapshot();assert.ok(!s.catalog.some(v=>v.id===voucher));await rejected(()=>redeem(randomUUID(),latest),['22023']);pass('Disabled voucher disappears from catalog and cannot be redeemed');
  await q('RESET ROLE');await q("UPDATE public.voucher SET is_active=true,start_date=(now() AT TIME ZONE 'Asia/Bangkok')::date-2,end_date=(now() AT TIME ZONE 'Asia/Bangkok')::date-1 WHERE id=$1",[voucher]);latest=await version();await actor(a);await rejected(()=>redeem(randomUUID(),latest),['22023']);pass('Expired voucher cannot be redeemed with a current version');
  await actor(b);s=await snapshot();assert.equal(s.customer_id,cb);assert.equal(Number(s.points),0);assert.equal(s.history.length,0);assert.equal(s.wallet.length,0);await rejected(()=>redeem(request,initialVersion),['PT409']);pass('B snapshot isolates A wallet/history and cannot replay A request');
  await actor('','anon');await rejected(()=>snapshot(),['42501']);await rejected(()=>redeem(randomUUID(),latest),['42501']);pass('Guest cannot read private loyalty snapshot or redeem');
  await actor(a);s=await snapshot();assert.equal(Number(s.points),60);assert.equal(s.history.length,2);assert.equal(s.wallet.length,1);pass('Denied operations leave balance and ledger unchanged');
  await q('RESET ROLE');await q('ROLLBACK');
  const cleanup=(await q('SELECT EXISTS(SELECT 1 FROM public.customer WHERE id=ANY($1::uuid[])) OR EXISTS(SELECT 1 FROM auth.users WHERE id=ANY($2::uuid[])) OR EXISTS(SELECT 1 FROM public.voucher WHERE id=$3) OR EXISTS(SELECT 1 FROM public.paw_point_transaction WHERE customer_id=ANY($1::uuid[])) OR EXISTS(SELECT 1 FROM public.customer_voucher WHERE id=$4) OR EXISTS(SELECT 1 FROM public.staff WHERE id=$5) remains',[[ca,cb],[a,b,sa],voucher,request,staff])).rows[0];assert.equal(cleanup.remains,false);pass('Rollback removes all fixture actors, voucher, wallet and ledger');
  fs.writeFileSync('docs/verification/sync/loyalty-cloud-rollback.txt',JSON.stringify({environment:'Supabase Cloud cpzuvaplseielhgcnqrn',timestamp:new Date().toISOString(),scope:'One voucher, one adjustment, one redemption; synthetic actors only; rollback; no Logs',status:'PASS',queries,checks},null,2)+'\n');
  console.log('PASS',checks.length,'loyalty checks;',queries,'SQL statements; rollback verified. Not full UI E2E.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});console.error('Loyalty integration failed:',e.code||'',e.message);process.exitCode=1;}finally{await db.end();}
})().catch(e=>{console.error(e.code||'connection_failed');process.exitCode=1;});
