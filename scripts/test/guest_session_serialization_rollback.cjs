// Two real database connections; bounded lock check, never commits fixtures.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--verify-cloud')){console.log('Use --verify-cloud for two-writer rollback checks.');process.exit(0);}
(async()=>{
 const clients=[];let pending;const checks=[];
 const pass=name=>checks.push({name,status:'PASS'});
 try{
  clients.push(await connect());clients.push(await connect());const [a,b]=clients;
  for(const db of clients)await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='5s';SET LOCAL ROLE service_role");
  const pidA=Number((await a.query('SELECT pg_backend_pid() pid')).rows[0].pid),pidB=Number((await b.query('SELECT pg_backend_pid() pid')).rows[0].pid);
  assert.notEqual(pidA,pidB);
  const breed=(await a.query('SELECT id FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1')).rows[0];assert.ok(breed);
  const token=crypto.randomBytes(32).toString('hex'),petA=crypto.randomUUID(),petB=crypto.randomUUID();
  const expiry=(await a.query("SELECT now()+interval '1 day' expires")).rows[0].expires;
  const details={name:'Guest lock rollback probe',breedId:breed.id,weight:5};
  const sql='SELECT public.guest_commerce_save_pet($1,$2,$3,$4,$5,$6) value';
  const args=id=>[token,expiry,id,'0950000001','Guest lock rollback probe',JSON.stringify(details)];
  await a.query(sql,args(petA));
  // Attach rejection handler immediately, including while observing the blocker.
  pending=b.query(sql,args(petB)).then(value=>({value}),error=>({error}));
  let blockers=[];
  for(let i=0;i<10;i++){
   blockers=(await a.query('SELECT pg_blocking_pids($1) blockers',[pidB])).rows[0].blockers;
   if(blockers.map(Number).includes(pidA))break;
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(blockers.map(Number).includes(pidA),'Second writer must wait for the first transaction');
  const wait=(await a.query("SELECT locktype FROM pg_locks WHERE pid=$1 AND NOT granted",[pidB])).rows;
  assert.ok(wait.some(row=>row.locktype==='advisory'));
  pass('Independent writer B waits on the actual guest token advisory lock held by writer A');
  await a.query('ROLLBACK');
  const completed=await pending;pending=null;if(completed.error)throw completed.error;
  assert.equal(completed.value.rows[0].value.petId,petB);
  const retry=await b.query(sql,args(petB));assert.equal(retry.rows[0].value.created,false);
  const rows=(await b.query('SELECT id,customer_id FROM public.pet_profile WHERE id=ANY($1::uuid[])',[[petA,petB]])).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].id,petB);
  const sessions=(await b.query('SELECT customer_id FROM public.guest_session WHERE token_hash=$1',[token])).rows;
  assert.equal(sessions.length,1);assert.equal(sessions[0].customer_id,rows[0].customer_id);
  await b.query('SET CONSTRAINTS ALL IMMEDIATE');
  pass('After first writer rollback, waiting writer finishes with one bound profile and retry creates no extra pet');
  await b.query('ROLLBACK');
  for(const db of clients){
   assert.equal((await db.query('SELECT count(*)::int n FROM public.pet_profile WHERE id=ANY($1::uuid[])',[[petA,petB]])).rows[0].n,0);
   assert.equal((await db.query('SELECT count(*)::int n FROM public.guest_session WHERE token_hash=$1',[token])).rows[0].n,0);
  }
  pass('Both transactions rolled back; no session, customer or pet fixture committed');
  fs.writeFileSync('docs/verification/sync/guest-session-serialization-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks,scope:'Two real Cloud SQL connections with service_role and installed save-pet RPC; bounded advisory lock observation only. No Supabase Logs, commit, public catalog fixture, HTTP/UI, same-profile-after-commit or overselling acceptance.'},null,2)+'\n');
  console.log('PASS',checks.length,'two-writer serialization checks; all fixtures rolled back.');
 }finally{
  // Release A before awaiting B, even if an assertion fails while B is waiting.
  if(clients[0])await clients[0].query('ROLLBACK').catch(()=>{});
  if(pending)await pending;
  for(const db of clients){await db.query('ROLLBACK').catch(()=>{});await db.end();}
 }
})().catch(error=>{console.error(error.code||error.name,error.message);process.exitCode=1;});
