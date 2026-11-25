// Explicit user-directed operational assignments. No default/bulk promotion policy.
const assert=require('node:assert/strict');
const {connect}=require('./service_import_connection.cjs');
const assignments=[
 {id:'f12d8dcc-aceb-4c80-adb4-c14e1d9afc30',name:'Lê Hoàng Tiến',code:'SENIOR',score:90},
 {id:'e0000000-5555-5555-5555-555555555555',name:'Nguyễn Thị Chăm Sóc',code:'SENIOR',score:95},
 {id:'d0000000-5555-5555-5555-555555555555',name:'Trần Văn Nhân Viên',code:'MASTER',score:100}
];
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL lock_timeout='3s';SET LOCAL statement_timeout='12s'");
 const results=[];
 for(const assignment of assignments){
  const row=(await db.query(`SELECT s.*,a.id assessment_id,a.score,a.result FROM public.staff s
   LEFT JOIN LATERAL(SELECT id,score,result FROM public.staff_assessment WHERE staff_id=s.id ORDER BY assessment_date DESC,created_at DESC,id LIMIT 1)a ON true
   WHERE s.id=$1 FOR UPDATE OF s`,[assignment.id])).rows[0];
  assert.ok(row);assert.equal(row.full_name,assignment.name);assert.equal(row.employment_status,'active');assert.equal(row.service_locked,false);
  assert.equal(row.result,'PASS');assert.equal(Number(row.score),assignment.score);
  const level=(await db.query('SELECT id,level_name FROM public.staff_level WHERE level_code=$1 AND is_active FOR SHARE',[assignment.code])).rows[0];assert.ok(level);
  if(row.staff_level_id!==level.id){
   assert.equal(row.staff_level_id,null,'Refuse to overwrite an independently changed level');
   const updated=await db.query('UPDATE public.staff SET staff_level_id=$2,updated_at=clock_timestamp() WHERE id=$1 AND staff_level_id IS NULL',[assignment.id,level.id]);assert.equal(updated.rowCount,1);
   await db.query(`INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
    VALUES(null,'ASSIGN_STAFF_LEVEL','staff',$1,$2)`,[assignment.id,JSON.stringify({source:'User-directed Codex maintenance',authorized_date:'2026-11-09',reason:'Người dùng yêu cầu gán cấp độ và giao quyền quyết định theo đánh giá hiện có. Đây là cấu hình phân công, không phải quy tắc tự động quy đổi điểm.',previous_level_id:row.staff_level_id,new_level_id:level.id,level_code:assignment.code,assessment_id:row.assessment_id,score:Number(row.score),assessment_result:row.result})]);
  }
  results.push({name:assignment.name,level:level.level_name});
 }
 const admin=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND NOT s.must_change_password ORDER BY s.id LIMIT 1")).rows[0];assert.ok(admin);
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[admin.auth_user_id]);
 const directory=(await db.query('SELECT public.admin_service_staff_candidates() staff')).rows[0].staff;
 assert.ok(assignments.every(assignment=>directory.some(staff=>staff.id===assignment.id)),'Assigned staff must remain eligible in the live directory');
 const candidates=(await db.query(`SELECT a.id FROM public.appointment a WHERE a.appointment_status IN ('confirmed','checked_in','in_progress')
  AND EXISTS(SELECT 1 FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id WHERE i.appointment_id=a.id AND i.status<>'cancelled' AND s.staff_level_required_id IS NOT NULL)
  ORDER BY a.scheduled_start_at DESC LIMIT 5`)).rows;
 const intakeChecks=[];for(const appointment of candidates){const result=(await db.query('SELECT public.admin_intake_staff_candidates($1) result',[appointment.id])).rows[0].result;intakeChecks.push({required_levels:result.required_levels,eligible_staff:result.staff.length});}
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');
 if(process.argv.includes('--apply')){await db.query('COMMIT');console.log('Assigned and audited:',results);}
 else{await db.query('ROLLBACK');console.log('Rehearsal rolled back:',results);}
 console.log('Live intake candidate checks:',intakeChecks);
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message||e.code);process.exitCode=1;});
