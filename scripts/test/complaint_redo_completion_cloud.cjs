// Bounded live SQL checks. Complaint and synthetic appointment changes always roll back.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {connect}=require('../database/v1/service_import_connection.cjs');
const ticket='7f126cf4-027c-4084-9f61-50cc0a084f0b',original='b291cffd-0487-4fdd-8647-bcde6e9ce8ed',wrong='53d78b09-9837-46b5-a5a3-57bc963d49f6';
if(!process.argv.includes('--cloud')&&!process.argv.includes('--apply-cloud'))process.exit(0);
(async()=>{const db=await connect(),checks=[],pass=name=>{checks.push(name);console.log('PASS',name);};
 const migration=fs.readFileSync('scripts/database/v1/274_complaint_service_completion.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,'');
 const snapshot=async()=>(await db.query('SELECT to_jsonb(t) value FROM public.support_ticket t WHERE id=$1',[ticket])).rows[0].value;
 try{
  const before=await snapshot();assert.ok(before);
  await db.query("BEGIN;SET LOCAL statement_timeout='10s';SET LOCAL lock_timeout='3s'");await db.query(migration);await db.query(migration);
  const actor=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND s.auth_user_id IS NOT NULL AND NOT s.must_change_password LIMIT 1")).rows[0].auth_user_id;
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actor]);
  const fixture=randomUUID();
  await db.query("INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,appointment_status) SELECT $1,$2,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,'da_hoan_tat' FROM public.appointment WHERE id=$3",[fixture,'QA-REDO-'+fixture,original]);
  await db.query("INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes,status) SELECT $1,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes,'completed' FROM public.appointment_item WHERE appointment_id=$2",[fixture,original]);
  const act=async evidence=>db.query("SELECT public.act_admin_complaint($1,$2,$3,'complete',$4::jsonb)",[randomUUID(),ticket,before.updated_at,JSON.stringify({evidence_id:evidence,note:'Kiểm chứng làm lại dịch vụ, hoàn tác sau kiểm thử'})]);
  const denied=async(id,label)=>{await db.query('SET LOCAL ROLE authenticated');await db.query('SAVEPOINT denied');await assert.rejects(()=>act(id),e=>e.message==='complaint_booking_mismatch');await db.query('ROLLBACK TO SAVEPOINT denied');await db.query('RELEASE SAVEPOINT denied');pass(label);};
  await denied(wrong,'Existing basic bath cannot resolve complaint about different spa package');
  await denied(original,'Original appointment cannot be its own redo result');
  for(const status of ['da_hoan_tat','completed']){
   await db.query('RESET ROLE');await db.query('UPDATE public.appointment SET appointment_status=$2 WHERE id=$1',[fixture,status]);await db.query('SET LOCAL ROLE authenticated');
   await db.query('SAVEPOINT valid');await act(fixture);assert.equal((await snapshot()).status,'resolved');await db.query('ROLLBACK TO SAVEPOINT valid');await db.query('RELEASE SAVEPOINT valid');pass(status+' with same customer, pet and service resolves complaint');
  }
  await db.query('RESET ROLE');await db.query("UPDATE public.appointment SET appointment_status='confirmed' WHERE id=$1",[fixture]);await denied(fixture,'Unfinished redo is rejected');
  await db.query('RESET ROLE');await db.query("UPDATE public.appointment SET appointment_status='completed',created_at='2026-01-01' WHERE id=$1",[fixture]);await denied(fixture,'Appointment older than complaint is rejected');
  await db.query('RESET ROLE');await db.query('ROLLBACK');assert.deepEqual(await snapshot(),before);assert.equal((await db.query('SELECT 1 FROM public.appointment WHERE id=$1',[fixture])).rowCount,0);pass('Original ticket and all business data restored by rollback');
  if(process.argv.includes('--apply-cloud')){await db.query('BEGIN');await db.query(migration);await db.query('COMMIT');pass('Migration 274 applied: function definition only; no business records changed');}
  const folder='docs/verification/complaint-service-redo';fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(folder+'/database-verification.txt',JSON.stringify({status:'PASS',timestamp:new Date().toISOString(),checks},null,2)+'\n');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.code,e.message);process.exitCode=1;});
