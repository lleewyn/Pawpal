const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='12s';SET LOCAL lock_timeout='3s'");
 if(!process.argv.includes('--installed'))await db.query(fs.readFileSync(require.resolve('../database/v1/208_pet_archive_restore_deadline.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,''));
 await db.query('SAVEPOINT fixtures');
 const boundary=(await db.query(`WITH point AS (SELECT clock_timestamp() t)
 SELECT pawpal_private.pet_restore_window_open(t-interval '720 hours',t) exact,
 pawpal_private.pet_restore_window_open(t-interval '720 hours',t+interval '1 microsecond') expired FROM point`)).rows[0];
 assert.equal(boundary.exact,true);assert.equal(boundary.expired,false);
 const actor=randomUUID(),phone='099'+String(Math.floor(Math.random()*1e7)).padStart(7,'0');
 await db.query('INSERT INTO auth.users(id,phone,phone_confirmed_at) VALUES($1,$2,now())',[actor,'84'+phone.slice(1)]);
 await db.query("SELECT public.complete_customer_auth($1,$2,'QA Restore deadline owner')",[actor,phone]);
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor]);
 const breed=(await db.query('SELECT id FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1')).rows[0].id;
 for(const [label,age,allowed]of [['day 29',29*86400,true],['day 30 with one minute left',30*86400-60,true],['day 31',31*86400,false],['missing timestamp',null,false]]){
  const pet=randomUUID();await db.query('SET LOCAL ROLE authenticated');
  await db.query('SELECT public.save_own_pet($1,null,$2,4.5)',[pet,{pet_name:'QA '+label,breed_id:breed,gender:'nu'}]);
  let row=(await db.query('SELECT updated_at::text revision FROM public.pet_profile WHERE id=$1',[pet])).rows[0];
  await db.query('SELECT public.change_own_pet_status($1,$2,false)',[pet,row.revision]);
  await db.query('RESET ROLE');
  // Seed only this disposable pet's historical date. Trigger bypass is session-local,
  // immediately restored, and every fixture (including the seeded date) is rolled back.
  await db.query("SET LOCAL session_replication_role='replica'");
  await db.query("UPDATE public.pet_profile SET archived_at=CASE WHEN $2::integer IS NULL THEN null ELSE clock_timestamp()-make_interval(secs=>$2::integer) END WHERE id=$1",[pet,age]);
  await db.query("SET LOCAL session_replication_role='origin'");await db.query('SET LOCAL ROLE authenticated');
  row=(await db.query('SELECT updated_at::text revision FROM public.pet_profile WHERE id=$1',[pet])).rows[0];
  if(allowed){await db.query('SELECT public.change_own_pet_status($1,$2,true)',[pet,row.revision]);}
  else{await db.query('SAVEPOINT denied');await assert.rejects(db.query('SELECT public.change_own_pet_status($1,$2,true)',[pet,row.revision]),error=>error.code==='PT410'&&error.message==='Đã quá thời hạn khôi phục 30 ngày');await db.query('ROLLBACK TO SAVEPOINT denied');}
  const saved=(await db.query('SELECT status,archived_at FROM public.pet_profile WHERE id=$1',[pet])).rows[0];assert.equal(saved.status,allowed?'active':'inactive');if(allowed)assert.equal(saved.archived_at,null);
  const bookable=(await db.query('SELECT public.own_booking_pets() pets')).rows[0].pets.some(p=>p.id===pet);assert.equal(bookable,allowed);
  await db.query('RESET ROLE');
 }
 await db.query('ROLLBACK TO SAVEPOINT fixtures');
 assert.equal((await db.query('SHOW session_replication_role')).rows[0].session_replication_role,'origin');
 console.log('PASS day 29/day 30 restore; exact deadline accepted; after deadline rejected; day 31 and missing timestamp denied by real RPC; expired pet remains inactive and unbookable. Fixtures rolled back.');
 await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');console.log(process.argv.includes('--apply')?'Applied restore deadline guard.':'Rehearsal rolled back.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message||e.code,e.where||'');process.exitCode=1;});
