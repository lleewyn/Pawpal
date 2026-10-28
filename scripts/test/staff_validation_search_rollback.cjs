const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID:id}=require('node:crypto');
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect(),checks=[];try{
 await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
 await db.query(fs.readFileSync('scripts/database/v1/127_staff_validation_search.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 await db.query(fs.readFileSync('scripts/database/v1/128_staff_name_validation.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 await db.query(fs.readFileSync('scripts/database/v1/129_staff_phone_required.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 await db.query(fs.readFileSync('scripts/database/v1/130_staff_phone_duplicate.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 const user=id(),employeeUser=id(),actor=id(),employee=id(),shift=id(),request=id();
 await db.query('INSERT INTO auth.users(id) VALUES($1),($2)',[user,employeeUser]);
 await db.query("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password,phone_number) VALUES($1,$2,'QA staff reviewer','QA','active',false,'0912345679')",[actor,user]);await db.query("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[actor]);
 await db.query("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,phone_number,email) VALUES($1,$2,'QA Phạm   Thúy Vy','QA','active','0912345678','qa@example.invalid')",[employee,employeeUser]);
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user]);await db.query('SET LOCAL ROLE authenticated');
 for(const query of ['QA Phạm Thúy Vy','  QA   Phạm  Thúy   Vy  ','qa pham thuy vy','QA\tPhạm\nThúy Vy']){
  const r=(await db.query('SELECT public.admin_staff_list_page($1::jsonb,1) value',[JSON.stringify({query})])).rows[0].value;assert.equal(r.total,1);assert.equal(r.rows[0].staff_record.id,employee);
 }checks.push('Server search collapses whitespace on both query and stored names, retaining accent-insensitive search');
 await db.query('RESET ROLE');
 for(const phone of ['0912345679','+84912345679']){
  await db.query('SAVEPOINT duplicate_phone');let error;try{await db.query('UPDATE public.staff SET phone_number=$1 WHERE id=$2',[phone,employee]);}catch(e){error=e;}await db.query('ROLLBACK TO SAVEPOINT duplicate_phone');assert.equal(error?.message,'duplicate_staff_phone');
 }checks.push('Duplicate active staff phone blocked for both local and +84 representations');
 for(const name of ['', '   ', '\t\n', 'A', 'Nguyễn Văn 123']){
  await db.query('SAVEPOINT bad_name');let error;try{await db.query('UPDATE public.staff SET full_name=$1 WHERE id=$2',[name,employee]);}catch(e){error=e;}await db.query('ROLLBACK TO SAVEPOINT bad_name');assert.equal(error?.message,'invalid_staff_name');
 }checks.push('Database rejects blank/whitespace-only, one-character and digit-containing names');
 for(const phone of [null,'','   ','090111223','09011122334','0901abc233','0901@#$233','1901112233','0901 112 233']){
  await db.query('SAVEPOINT bad_phone');let error;try{await db.query('UPDATE public.staff SET phone_number=$1 WHERE id=$2',[phone,employee]);}catch(e){error=e;}await db.query('ROLLBACK TO SAVEPOINT bad_phone');assert.equal(error?.message,'invalid_staff_phone');
 }checks.push('Required phone rejects null, blank, whitespace, 9/11 digits and letters');
 await db.query("UPDATE public.staff SET phone_number='+84912345678' WHERE id=$1",[employee]);assert.equal((await db.query('SELECT phone_number FROM public.staff WHERE id=$1',[employee])).rows[0].phone_number,'0912345678');
 await db.query("UPDATE public.staff SET phone_number='+84901112233' WHERE id=$1",[employee]);assert.equal((await db.query('SELECT phone_number FROM public.staff WHERE id=$1',[employee])).rows[0].phone_number,'0901112233');checks.push('Grouped spaces rejected; international +84 normalized to ten-digit local phone');
 for(const [column,value,message] of [['phone_number','12345678','invalid_staff_phone'],['phone_number','1@gmail.com','invalid_staff_phone'],['email','qa@@example.com','invalid_staff_email'],['dob','2999-01-01','invalid_staff_birth_date']]){
  await db.query('SAVEPOINT invalid');let error;try{await db.query(`UPDATE public.staff SET ${column}=$1 WHERE id=$2`,[value,employee]);}catch(e){error=e;}await db.query('ROLLBACK TO SAVEPOINT invalid');assert.equal(error?.message,message);
 }checks.push('Database rejects invalid phone, email and future birth dates');
 await db.query("INSERT INTO public.staff_schedule(id,staff_id,start_at,end_at,availability_status,schedule_status) VALUES($1,$2,now()+interval '10 days',now()+interval '10 days 8 hours','available','active')",[shift,employee]);
 const schedule=(await db.query('SELECT *,updated_at::text AS version FROM public.staff_schedule WHERE id=$1',[shift])).rows[0];
 await db.query('SET LOCAL ROLE authenticated');
 const details={request_type:'LEAVE',schedule_id:shift,expected_updated_at:schedule.version,reason:'QA leave rollback',leave_type:'annual'};
 await db.query('SELECT public.save_admin_staff_shift_request($1,$2::jsonb,false)',[request,JSON.stringify(details)]);
 await db.query('SELECT public.review_admin_staff_shift_request($1,true)',[request]);
 await db.query('SELECT public.review_admin_staff_shift_request($1,true)',[request]);
 const status=(await db.query('SELECT status FROM public.staff_shift_request WHERE id=$1',[request])).rows[0];assert.equal(status.status,'approved');
 const leave=(await db.query('SELECT availability_status FROM public.staff_schedule WHERE id=$1',[shift])).rows[0];assert.equal(leave.availability_status,'leave');
 assert.equal((await db.query('SELECT employment_status FROM public.staff WHERE id=$1',[employee])).rows[0].employment_status,'active');
 checks.push('Leave approval succeeds and is idempotent; exact shift becomes leave without disabling employee');
 await db.query('RESET ROLE');await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK');
 fs.writeFileSync('docs/verification/sync/staff-validation-search-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks,scope:'Synthetic staff/shift/request only; all DDL and data rolled back; no Auth API calls or Logs'},null,2)+'\n');console.log('PASS '+checks.length+' staff business checks; all changes rolled back.');
}catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
