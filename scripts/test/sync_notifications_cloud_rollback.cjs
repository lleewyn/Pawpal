// Synthetic fixtures only, no COMMIT, no Logs or external delivery.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs');
if(!process.argv.includes('--cloud')){console.log('No network. Use --cloud for rollback-only notification checks.');process.exit(0);}
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{
 const db=await connect();let queries=0;const ids=Array.from({length:7},()=>randomUUID());
 const [a,b,ca,cb,n1,n2,nb]=ids,checks=[];
 const q=async(sql,args)=>{queries++;return db.query(sql,args);};
 const actor=async(id,role='authenticated')=>{await q('RESET ROLE');await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[id,role]);await q(role==='anon'?'SET LOCAL ROLE anon':'SET LOCAL ROLE authenticated');};
 const reject=async(fn,codes)=>{await q('SAVEPOINT denial');let denied=false;try{await fn();}catch(e){assert.ok(codes.includes(e.code),'Unexpected SQLSTATE '+e.code);denied=true;}await q('ROLLBACK TO SAVEPOINT denial');await q('RELEASE SAVEPOINT denial');assert.ok(denied);};
 const pass=name=>checks.push({name,status:'PASS'});
 const snapshot=async()=>(await q('SELECT public.own_notifications_snapshot() value')).rows[0].value;
 const mark=async(id,before,owner)=>(await q('SELECT public.mark_own_notifications_read($1,$2,$3) value',[id,before,owner])).rows[0].value;
 try{
  await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  await q('INSERT INTO auth.users(id) VALUES($1),($2)',[a,b]);
  await q("INSERT INTO public.customer(id,auth_user_id,customer_code,customer_status) VALUES($1,$2,$3,'active'),($4,$5,$6,'active')",[ca,a,'E2E-NOTI-A-'+ca,cb,b,'E2E-NOTI-B-'+cb]);
  await q("INSERT INTO public.customer_profile(customer_id,full_name) VALUES($1,'E2E Notice A'),($2,'E2E Notice B') ON CONFLICT(customer_id) DO UPDATE SET full_name=excluded.full_name",[ca,cb]);
  await q("INSERT INTO public.notification(id,customer_id,notification_type,title,content,sent_at) VALUES($1,$2,'info','E2E A1','Synthetic',now()-interval '2 hours'),($3,$2,'info','E2E A2','Synthetic',now()-interval '1 hour'),($4,$5,'info','E2E B','Synthetic',now()-interval '1 hour')",[n1,ca,n2,nb,cb]);
  await actor(a);let s=await snapshot();assert.equal(s.customer_id,ca);assert.deepEqual(s.rows.map(n=>n.id),[n2,n1]);pass('A snapshot contains only own notices in time order');
  assert.equal(await mark(n1,null,ca),1);assert.equal(await mark(n1,null,ca),0);s=await snapshot();assert.ok(s.rows.find(n=>n.id===n1).read_at);assert.equal(s.rows.find(n=>n.id===n2).read_at,null);pass('Single read persists across RPC snapshots; retry changes zero rows');
  await reject(()=>mark(nb,null,ca),['42501']);await reject(()=>mark(n2,null,cb),['42501']);pass('Foreign notification and stale expected owner rejected');
  await reject(()=>mark(null,null,ca),['22023']);await reject(()=>mark(null,'2999-01-01T00:00:00Z',ca),['22023']);pass('Mark all requires a valid loaded snapshot cutoff');
  assert.equal(await mark(null,'2000-01-01T00:00:00Z',ca),0);assert.equal(await mark(null,s.snapshot_at,ca),1);assert.equal(await mark(null,s.snapshot_at,ca),0);s=await snapshot();assert.ok(s.rows.every(n=>n.read_at));pass('Mark all respects cutoff and retry, preserving already read rows');
  await actor(b);s=await snapshot();assert.equal(s.customer_id,cb);assert.deepEqual(s.rows.map(n=>n.id),[nb]);assert.equal(s.rows[0].read_at,null);await reject(()=>mark(n1,null,cb),['42501']);pass('B cannot read A through snapshot or mark A by ID; B remains unread');
  await actor('','anon');await reject(()=>snapshot(),['42501']);await reject(()=>mark(n1,null,ca),['42501']);pass('Guest cannot execute private notification RPCs');
  await q('RESET ROLE');await q('ROLLBACK');
  const cleanup=(await q('SELECT EXISTS(SELECT 1 FROM public.customer WHERE id=ANY($1::uuid[])) OR EXISTS(SELECT 1 FROM public.notification WHERE id=ANY($2::uuid[])) OR EXISTS(SELECT 1 FROM auth.users WHERE id=ANY($3::uuid[])) remains',[[ca,cb],[n1,n2,nb],[a,b]])).rows[0];assert.equal(cleanup.remains,false);pass('Rollback removes all synthetic notices and actors');
  fs.writeFileSync('docs/verification/sync/notifications-cloud-rollback.txt',JSON.stringify({environment:'Supabase Cloud cpzuvaplseielhgcnqrn',timestamp:new Date().toISOString(),scope:'3 synthetic notices, 2 owners; RPC/RLS only; always rollback; no Logs',status:'PASS',queries,checks},null,2)+'\n');
  console.log('PASS',checks.length,'notification checks;',queries,'SQL statements; rollback verified. Not full UI E2E.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});console.error('Notification check failed:',e.code||'',e.message);process.exitCode=1;}finally{await db.end();}
})().catch(e=>{console.error(e.code||'connection_failed');process.exitCode=1;});
