const assert=require('node:assert/strict'),{randomUUID}=require('crypto');const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='15s';SET LOCAL lock_timeout='4s'");
 const actor=(await db.query("select s.id,s.auth_user_id from staff s join staff_role r on r.staff_id=s.id where r.role_code='ADMIN' and s.employment_status='active' and not s.must_change_password limit 1")).rows[0];
 const uid=randomUUID(),cid=randomUUID(),voucher=randomUUID(),code='VERIFY-'+voucher;
 await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into customer(id,auth_user_id,customer_code) values($1,$2,$3)',[cid,uid,'VERIFY-'+cid]);
 await db.query("insert into voucher(id,voucher_code,voucher_name,applicable_for,type,discount_value,start_date,end_date,is_active) values($1,$2,'Rollback verification','all','fixed',10000,current_date-1,current_date+7,true)",[voucher,code]);
 const asUser=async id=>{await db.query('RESET ROLE');await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[id]);await db.query('SET LOCAL ROLE authenticated');};
 for(const option of ['points','voucher']){
  await db.query('RESET ROLE');const id=randomUUID();await db.query("insert into support_ticket(id,ticket_code,customer_id,channel,type,priority,category,subject,description,status,assigned_staff_id) values($1,$2,$3,'web','complaint','medium','other','Compensation rollback verification','Archived history verification','new',$4)",[id,'VERIFY-'+id,cid,actor.id]);
  await asUser(actor.auth_user_id);
  const row=async()=>{await db.query('RESET ROLE');const r=(await db.query('select *,updated_at::text expected from support_ticket where id=$1',[id])).rows[0];await asUser(actor.auth_user_id);return r;};
  const act=async(action,details,request=randomUUID(),expected)=>{const t=await row();await db.query('select act_admin_complaint($1,$2,$3,$4,$5)',[request,id,expected||t.expected,action,{note:'Verification rollback',...details}]);};
  if(option==='voucher'){await db.query('SAVEPOINT invalid_voucher');await assert.rejects(()=>act('propose',{option,amount:0,voucher_code:'MISSING-VERIFY-CODE'}),e=>e.message==='complaint_voucher_unavailable');await db.query('ROLLBACK TO invalid_voucher');}
  await act('propose',{option,amount:option==='points'?10:0,...(option==='voucher'?{voucher_code:code}:{})});assert.equal((await row()).status,'waiting_manager_approval');
  await db.query('SAVEPOINT unapproved');await assert.rejects(()=>act('complete',{}));await db.query('ROLLBACK TO unapproved');
  await act('approve',{});await act('start_resolution',{});const request=randomUUID(),version=(await row()).expected;await act('complete',{},request,version);await act('complete',{},request,version);assert.equal((await row()).status,'resolved');
  await db.query('RESET ROLE');const table=option==='points'?'paw_point_transaction':'customer_voucher';const records=(await db.query('select * from '+table+' where customer_id=$1',[cid])).rows;assert.equal(records.length,1);if(option==='points')assert.equal(records[0].points,10);
  const before=(await db.query('select id,content from support_ticket_message where ticket_id=$1 order by id',[id])).rows;
  await asUser(uid);await db.query("select rate_own_support_ticket($1,5,'Resolved verification')",[id]);
  await db.query('RESET ROLE');const ratedHistory=(await db.query('select id,content from support_ticket_message where ticket_id=$1 order by id',[id])).rows;await asUser(uid);
  await db.query('SAVEPOINT closed_reply');await assert.rejects(()=>db.query("select reply_own_support_ticket($1,$2,'New message after completion')",[randomUUID(),id]),e=>e.message==='support_reply_closed');await db.query('ROLLBACK TO closed_reply');
  await db.query('RESET ROLE');assert.equal((await db.query('select status from support_ticket where id=$1',[id])).rows[0].status,'closed');const archived=(await db.query('select id,content from support_ticket_message where ticket_id=$1 order by id',[id])).rows;assert.deepEqual(archived,ratedHistory);for(const message of before)assert.ok(archived.some(r=>r.id===message.id&&r.content===message.content));
  console.log('PASS '+option+': manager approval required, award once on retry, owner completion locks reply and preserves history');
 }
 await db.query('ROLLBACK');console.log('PASS all verification data rolled back');
 }finally{await db.query('ROLLBACK').catch(()=>{});await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
