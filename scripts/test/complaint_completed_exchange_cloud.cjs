const assert=require('node:assert/strict'),{randomUUID}=require('crypto');const {connect}=require('../database/v1/service_import_connection.cjs');
const ticket='7c55ce88-ed57-4a93-b09f-9b28ad2adadf',returned='ab677a20-1b8e-4c4c-920b-ca0dd492c0c0',replacement='7f53383f-65f5-49dc-a78a-79e6f26195cb';
(async()=>{const db=await connect();try{
 const before=(await db.query('select row_to_json(t) data from support_ticket t where id=$1',[ticket])).rows[0].data;
 const customer=(await db.query('select auth_user_id from customer where id=$1',[before.customer_id])).rows[0];assert.ok(customer.auth_user_id);
 await db.query("BEGIN;SET LOCAL statement_timeout='15s';SET LOCAL lock_timeout='4s'");
 const actor=(await db.query("select s.auth_user_id from staff s join staff_role r on r.staff_id=s.id where r.role_code='ADMIN' and s.auth_user_id is not null and s.employment_status='active' and not s.must_change_password limit 1")).rows[0];
 await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actor.auth_user_id]);
 await db.query('SET LOCAL ROLE authenticated');
 const act=details=>db.query("select act_admin_complaint($1,$2,$3,'complete',$4)",[randomUUID(),ticket,before.updated_at,{note:'Verification rollback',...details}]);
 for(const details of [{evidence_id:randomUUID(),replacement_order_id:replacement},{evidence_id:returned,replacement_order_id:randomUUID()}]){
  await db.query('SAVEPOINT invalid');await assert.rejects(()=>act(details),e=>['complaint_return_mismatch','complaint_replacement_order_required'].includes(e.message));await db.query('ROLLBACK TO invalid');
 }
 await act({evidence_id:returned,replacement_order_id:replacement});
 const after=(await db.query('select status,updated_at from support_ticket where id=$1',[ticket])).rows[0];assert.equal(after.status,'resolved');assert.notEqual(after.updated_at.toISOString(),before.updated_at);
 console.log('PASS completed return + delivered replacement resolves ticket; wrong return/order rejected');
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[customer.auth_user_id]);
 await db.query('SAVEPOINT low_rating');await db.query("select rate_own_support_ticket($1,2,'Verification rollback')",[ticket]);
 await db.query('RESET ROLE');
 const low=(await db.query('select status,priority from support_ticket where id=$1',[ticket])).rows[0];assert.equal(low.status,'reprocessing');assert.equal(low.priority,'urgent');await db.query('ROLLBACK TO low_rating');
 await db.query("select rate_own_support_ticket($1,5,'Verification rollback')",[ticket]);
 await db.query('RESET ROLE');
 const rated=(await db.query('select status,rating,closed_at from support_ticket where id=$1',[ticket])).rows[0];assert.equal(rated.status,'closed');assert.equal(rated.rating,5);assert.ok(rated.closed_at);
 console.log('PASS owner rating closes ticket; under-three-star rating escalates instead');
 await db.query('ROLLBACK');
 const restored=(await db.query('select row_to_json(t) data from support_ticket t where id=$1',[ticket])).rows[0].data;assert.deepEqual(restored,before);
 console.log('PASS rollback: original complaint and customer history unchanged');
 }finally{await db.query('ROLLBACK').catch(()=>{});await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
