const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 const source=fs.readFileSync('scripts/database/v1/273_guest_link_phone_conflict.sql','utf8');
 await db.query("BEGIN;SET LOCAL statement_timeout='10s';SET LOCAL lock_timeout='3s'");
 const before=(await db.query("SELECT pg_get_functiondef('public.complete_guest_customer_auth(text,uuid,text,text)'::regprocedure) d")).rows[0].d;
 await db.query(source.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,''));
 const uid=crypto.randomUUID(),guest=crypto.randomUUID(),other=crypto.randomUUID(),hash=crypto.randomBytes(32).toString('hex');let phone;
 do{phone='095'+crypto.randomInt(1000000,10000000);}while((await db.query("SELECT 1 FROM auth.users WHERE phone='84'||substring($1 FROM 2) UNION ALL SELECT 1 FROM customer_phone WHERE right(phone_number,9)=right($1,9)",[phone])).rowCount);
 await db.query("INSERT INTO auth.users(id,aud,role,phone,phone_confirmed_at) VALUES($1,'authenticated','authenticated',$2,now())",[uid,'84'+phone.slice(1)]);
 await db.query('INSERT INTO customer(id,customer_code,unverified_contact_phone) VALUES($1,$2,$3),($4,$5,NULL)',[guest,'VERIFY273-'+guest,phone,other,'VERIFY273-'+other]);
 await db.query("INSERT INTO customer_profile(customer_id,full_name) VALUES($1,'Alias guard rollback')",[guest]);
 await db.query("INSERT INTO guest_session(token_hash,purpose,customer_id,expires_at) VALUES($1,'commerce',$2,now()+interval '1 day')",[hash,guest]);
 for(const alias of ['+84','0084','84']){
  await db.query('SAVEPOINT alias');
  await db.query('INSERT INTO customer_phone(customer_id,phone_number,is_primary) VALUES($1,$2,true)',[other,alias+phone.slice(1)]);
  await db.query('SAVEPOINT denied');let code;try{await db.query('SELECT complete_guest_customer_auth($1,$2,$3,NULL)',[hash,uid,phone]);}catch(error){code=error.code;}
  await db.query('ROLLBACK TO denied');assert.equal(code,'PT409');await db.query('ROLLBACK TO alias');
 }
 await db.query('ROLLBACK');
 const backup='D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-member-history-272';
 fs.writeFileSync(backup+'/link-before-phone-guard.sql',before+';\n');
 await db.query(source);
 fs.writeFileSync('docs/verification/guest-member-history/phone-conflict-check.txt','PASS: +84, 0084 and 84 aliases belonging to another profile block linking. Fixtures rolled back; function-only migration 273 applied.\n');
 console.log('PASS three normalized-phone conflict checks; fixtures rolled back; guard 273 applied.');
 }finally{await db.query('ROLLBACK').catch(()=>{});await db.end();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
