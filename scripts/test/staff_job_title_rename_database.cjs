'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
async function main(){
 const db=await connect(),migration=fs.readFileSync('my-server/scripts/database/v1/284_staff_job_title_rename.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,'');
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='10s'");
  const staffHash=async()=>(await db.query("SELECT md5(string_agg(id::text||job_title,',' ORDER BY id)) value FROM public.staff")).rows[0].value,before=await staffHash();
  await db.query(migration);await db.query(migration);
  const actors=(await db.query("SELECT s.auth_user_id,r.role_code FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE s.employment_status='active' AND NOT s.must_change_password AND s.auth_user_id IS NOT NULL")).rows;
  const as=async role=>{await db.query('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actors.find(row=>row.role_code===role).auth_user_id]);await db.query('SET LOCAL ROLE authenticated');};
  await as('ADMIN');
  const catalog=async()=>(await db.query('SELECT public.admin_staff_job_title_catalog() value')).rows[0].value;
  const row=(await catalog()).find(row=>row.code==='ve_sinh_luu_tru'),id=randomUUID(),title='Nhân viên vệ sinh khách sạn';
  const save=(request,expected,name)=>db.query('SELECT public.rename_admin_staff_job_title($1,$2,$3,$4) value',[request,row.code,expected,name]);
  await save(id,row.title,title);await save(id,row.title,title);
  assert.equal(Number((await db.query('SELECT count(*) n FROM public.audit_log WHERE id=$1',[id])).rows[0].n),1);
  const updated=(await catalog()).find(value=>value.code===row.code);assert.equal(updated.title,title);assert.ok(updated.aliases.includes(row.title));
  const denied=async(fn,message)=>{await db.query('SAVEPOINT denied');try{await fn();assert.fail('Expected rejection');}catch(error){assert.equal(error.message,message);await db.query('ROLLBACK TO SAVEPOINT denied');}};
  await denied(()=>save(randomUUID(),row.title,'Tên mới khác'),'staff_job_title_changed');
  await denied(()=>save(randomUUID(),title,'Lễ tân'),'staff_job_title_exists');
  await as('STAFF');await denied(()=>save(randomUUID(),title,'Tên mới khác'),'staff_job_title_forbidden');assert.equal((await db.query('SELECT * FROM public.staff_job_title')).rowCount,0);
  await db.query('RESET ROLE');assert.equal(await staffHash(),before);await db.query('ROLLBACK');
  if(process.argv.includes('--apply-cloud')){await db.query('BEGIN');await db.query(migration);await db.query('COMMIT');}
  console.log('PASS: rename/aliases, duplicate/stale rejection, idempotent audit, STAFF denied; staff unchanged; trial rename rolled back; migration applied='+process.argv.includes('--apply-cloud'));
 }finally{await db.query('ROLLBACK');await db.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
