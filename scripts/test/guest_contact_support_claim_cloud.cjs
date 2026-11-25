const fs=require('fs'),assert=require('node:assert/strict'),{randomUUID}=require('crypto');const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='15s';SET LOCAL lock_timeout='4s'");
 const uid=randomUUID(),otherUid=randomUUID(),cid=randomUUID(),other=randomUUID(),ticket=randomUUID(),legacy=randomUUID(),proof=randomUUID();
 const phone='09'+String(Math.floor(Math.random()*90000000)+10000000),otherPhone='08'+phone.slice(2);
 await db.query('insert into auth.users(id) values($1),($2)',[uid,otherUid]);
 for(const [id,auth,p]of [[cid,uid,phone],[other,otherUid,otherPhone]]){await db.query('insert into customer(id,auth_user_id,customer_code) values($1,$2,$3)',[id,auth,'VERIFY-'+id]);await db.query('insert into customer_phone(customer_id,phone_number,is_primary,verified_at) values($1,$2,true,now())',[id,p]);}
 await db.query("select set_config('request.jwt.claim.role','service_role',true)");
 const create=()=>db.query("select create_claimable_guest_contact_ticket($1,'Contact verification',$2,'Contact support verification','other','Please check my request',$3)",[ticket,phone,proof]);await create();await create();
 await db.query("insert into support_ticket(id,ticket_code,channel,type,category,status,priority,subject,description) values($1,$2,'contact','contact','other','pending','normal','Legacy claim verification',$3)",[legacy,'VERIFY-'+legacy,'Họ và tên: Contact verification\nSố điện thoại: '+phone+'\nLegacy request']);
 const migration=fs.readFileSync('my-server/scripts/database/v1/258_contact_support_claim.sql','utf8');await db.query(migration.slice(migration.indexOf('UPDATE public.support_ticket t SET guest_contact_name'),migration.indexOf('CREATE OR REPLACE FUNCTION public.claim_own_guest_contact_ticket')));
 await db.query("insert into support_ticket_message(ticket_id,sender_type,content,is_internal,sender_account_id) values($1,'staff','Public reply from support',false,(select auth_user_id from staff where auth_user_id is not null limit 1))",[ticket]);
 const before=(await db.query('select id,content from support_ticket_message where ticket_id=$1 order by id',[ticket])).rows;
 const actor=async user=>{await db.query('RESET ROLE');await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user]);await db.query('SET LOCAL ROLE authenticated');};
 await actor(otherUid);await db.query('SAVEPOINT wrong_owner');await assert.rejects(()=>db.query('select claim_own_guest_contact_ticket($1,$2)',[ticket,proof]),e=>e.message==='guest_contact_claim_phone_mismatch');await db.query('ROLLBACK TO wrong_owner');
 await actor(uid);await db.query('SAVEPOINT bad_proof');await assert.rejects(()=>db.query('select claim_own_guest_contact_ticket($1,$2)',[ticket,randomUUID()]),e=>e.message==='guest_contact_claim_invalid');await db.query('ROLLBACK TO bad_proof');
 await db.query('select claim_own_guest_contact_ticket($1,$2)',[ticket,proof]);await db.query('select claim_own_guest_contact_ticket($1,$2)',[ticket,proof]);await db.query('select claim_own_guest_contact_ticket($1,null)',[legacy]);
 const page=(await db.query("select own_support_tickets(1,'all',$1,1) data",[ticket])).rows[0].data;assert.ok(JSON.stringify(page).includes('Public reply from support'));
 await db.query('RESET ROLE');assert.deepEqual((await db.query('select id,content from support_ticket_message where ticket_id=$1 order by id',[ticket])).rows,before);assert.equal((await db.query('select count(*) n from support_ticket where id=any($1::uuid[]) and customer_id=$2',[[ticket,legacy],cid])).rows[0].n,'2');
 await db.query('ROLLBACK');console.log('PASS new and legacy Contact tickets join the same Support stream, retain public replies, retry without duplicates; wrong account/proof rejected; all data rolled back');
 }finally{await db.query('ROLLBACK').catch(()=>{});await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
