// Real PostgreSQL tests in the task-owned local schema clone. No Cloud writes.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const folder='docs/security/phase2',env=JSON.parse(fs.readFileSync(folder+'/local-environment.txt','utf8'));
assert.match(env.database,/^pawpal_access_[a-f0-9]{12}$/);assert.equal(env.status,'READY');
const sql=input=>execFileSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',env.database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:30000,maxBuffer:4*1024*1024}).trim();
assert.equal(sql("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()"),env.marker);
const id=n=>'16500000-0000-4000-8000-'+String(n).padStart(12,'0');
const a=id(1),b=id(2),admin=id(3),blocked=id(4),customer=id(10),pet=id(11),species=id(12),breed=id(13),tier=id(14),category=id(15),service=id(16),appointment=id(20),otherAppointment=id(21),method=id(22),chat=id(30),otherChat=id(31),queue=id(32);
const report={capturedAt:new Date().toISOString(),migrationSha256:crypto.createHash('sha256').update(fs.readFileSync('scripts/database/v1/165_admin_fixed_roles.sql')).digest('hex'),scope:'Owned local clone of current Cloud schema; PostgreSQL authenticated/anon roles and claims; no Cloud writes or HTTP Auth JWT tests',checks:[],status:'INCOMPLETE'};
const check=(name,fn)=>{fn();report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
let fixtures=`INSERT INTO public.membership_tier(id,tier_name,minimum_expenditure,discount_percent,is_active) VALUES('${tier}','QA',0,0,true);`;
const actor=(who,statement)=>`BEGIN;${fixtures} SET LOCAL request.jwt.claim.sub='${who}';SET LOCAL ROLE authenticated;${statement};ROLLBACK;`;
const denied=(who,statement,code='42501')=>sql(actor(who,`DO $test$ BEGIN BEGIN ${statement}; RAISE EXCEPTION 'TEST_EXPECTED_DENIAL'; EXCEPTION WHEN SQLSTATE '${code}' THEN NULL; END; END $test$`));
try{
 let applied=sql("SELECT to_regclass('pawpal_private.work_rpc_catalog') IS NOT NULL")==='t';
 if(applied){
  sql(`DELETE FROM public.staff_role WHERE staff_id IN ('${a}','${b}') AND role_code='STAFF';`);
  sql(fs.readFileSync('scripts/database/v1/165_admin_fixed_roles.rollback.sql','utf8'));
  check('Rollback restores the original helper and leaves Auth locks intact',()=>{
   assert.equal(sql("SELECT to_regclass('pawpal_private.work_rpc_catalog') IS NULL"),'t');
   assert.equal(sql(`SELECT employment_status FROM public.staff WHERE id='${blocked}'`),'ACTIVE');
   assert.equal(sql(`SELECT banned_until>now() FROM auth.users WHERE id='${blocked}'`),'t');
   assert.equal(sql("SELECT position('work_rpc_permission' in pg_get_functiondef('public.create_customer_quick(text,text,text,text,text,uuid,numeric)'::regprocedure))"),'0');
  });applied=false;
 }
 if(!applied){
  sql(`INSERT INTO auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at,banned_until) VALUES
  ('${a}','authenticated','authenticated','access-a@example.invalid',now(),now(),now(),NULL),
  ('${b}','authenticated','authenticated','access-b@example.invalid',now(),now(),now(),NULL),
  ('${admin}','authenticated','authenticated','access-admin@example.invalid',now(),now(),now(),NULL),
  ('${blocked}','authenticated','authenticated','access-blocked@example.invalid',now(),now(),now(),now()+interval '100 years') ON CONFLICT(id) DO NOTHING;
  INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password,phone_number) VALUES
  ('${a}','${a}','Nhân viên An','Kiểm thử','active',false,'0900000001'),
  ('${b}','${b}','Nhân viên Bình','Kiểm thử','active',false,'0900000002'),
  ('${admin}','${admin}','Quản lý Chi','Kiểm thử','active',false,'0900000003'),
  ('${blocked}','${blocked}','Nhân viên Dung','Kiểm thử','ACTIVE',true,'0900000004') ON CONFLICT(id) DO NOTHING;
  INSERT INTO public.staff_role(staff_id,role_code) VALUES('${admin}','ADMIN') ON CONFLICT DO NOTHING;`);
  sql(fs.readFileSync('scripts/database/v1/165_admin_fixed_roles.sql','utf8'));
  sql(`INSERT INTO public.staff_role(staff_id,role_code) VALUES('${a}','STAFF'),('${b}','STAFF');`);
 }
 check('Migration and fixed-role account state',()=>{
  assert.equal(sql(`SELECT role_name FROM public.access_role WHERE code='ADMIN'`),'Quản lý');
  assert.equal(sql(`SELECT employment_status||':'||must_change_password||':'||(u.banned_until>now()) FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id WHERE s.id='${blocked}'`),'active:true:true');
  assert.equal(sql(`SELECT count(*) FROM public.staff_role WHERE staff_id='${blocked}'`),'0');
  const context=JSON.parse(sql(actor(a,"SELECT public.get_staff_login_context()")));
  assert.deepEqual(context.staff.access_roles,['STAFF']);assert.ok(context.staff.permission_codes.includes('work.cashier.collect'));assert.ok(!context.staff.permission_codes.includes('payment.write'));
 });
 check('Worker cannot read raw staff, schedules, money, audit or costs',()=>{
  for(const table of ['staff','staff_schedule','payment','refund_transaction','product_variant','audit_log'])assert.equal(sql(actor(a,`SELECT count(*) FROM public.${table}`)),'0');
  assert.equal(sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity AND has_table_privilege('authenticated',c.oid,'SELECT')"),'0');
 });
 check('Worker profile projection and page validation',()=>{
  const self=JSON.parse(sql(actor(a,"SELECT public.get_staff_workspace('self')")));assert.equal(self.items.length,1);assert.equal(self.items[0].id,a);assert.ok(!('auth_user_id' in self.items[0]));
  denied(a,`PERFORM public.get_staff_workspace('self','',NULL,0)`,'22023');
 });
 check('Fixed-role RPC rejects multiple roles and per-person grants',()=>{
  denied(admin,`PERFORM public.set_admin_staff_access(gen_random_uuid(),'${a}',now(),ARRAY['ADMIN','STAFF'],ARRAY[]::text[],'QA test')`,'22023');
  denied(admin,`PERFORM public.set_admin_staff_access(gen_random_uuid(),'${a}',now(),ARRAY['STAFF'],ARRAY['payment.write'],'QA test')`,'22023');
  denied(a,`PERFORM public.set_admin_staff_access(gen_random_uuid(),'${a}',now(),ARRAY['ADMIN'],ARRAY[]::text[],'QA test')`);
 });
 check('Last ADMIN, blocked identities, direct writes and revenue are protected',()=>{
  denied(admin,`PERFORM public.set_admin_staff_access(gen_random_uuid(),'${admin}',(SELECT updated_at FROM public.staff WHERE id='${admin}'),ARRAY['STAFF'],ARRAY[]::text[],'QA test')`,'22023');
  denied(blocked,`PERFORM public.get_staff_workspace('self')`);
  denied(a,`INSERT INTO public.staff_role(staff_id,role_code) VALUES('${blocked}','ADMIN')`);
  denied(a,`INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES('${a}','FAKE','staff','${a}','forged')`);
  denied(a,`PERFORM public.admin_copilot_extended_facts('revenue.summary',jsonb_build_object('start_at',now()-interval '1 day','end_at',now()))`);
 });
 check('Worker creates real customer through the reviewed transaction and cannot mass-list',()=>{
  const result=JSON.parse(sql(actor(a,`SELECT public.create_customer_quick('Khách kiểm thử','0900123456'); SELECT public.get_staff_workspace('customers','0900123456')`)).split('\n').at(-1));
  assert.equal(result.items.length,1);assert.equal(result.items[0].phone_number,'0900123456');
  denied(a,`PERFORM public.get_staff_workspace('customers')`,'22023');
 });
 fixtures=`
 INSERT INTO public.membership_tier(id,tier_name,minimum_expenditure,discount_percent,is_active) VALUES('${tier}','QA',0,0,true);
 INSERT INTO public.customer(id,customer_code,customer_status) VALUES('${customer}','QA-165','active');
 INSERT INTO public.customer_profile(customer_id,full_name) VALUES('${customer}','Khách kiểm thử');
 INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES('${customer}','0900222333',true);
 INSERT INTO public.customer_membership(customer_id,membership_tier_id) VALUES('${customer}','${tier}');
 INSERT INTO public.pet_species(id,species_name,is_active) VALUES('${species}','Chó kiểm thử',true);
 INSERT INTO public.pet_breed(id,species_id,breed_name,is_active) VALUES('${breed}','${species}','Giống kiểm thử',true);
 INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id,gender,status) VALUES('${pet}','${customer}','QA-PET','Bé kiểm thử','${breed}','unknown','active');
 INSERT INTO public.service_category(id,category_code,category_name) VALUES('${category}','grooming_spa','Dịch vụ kiểm thử');
 INSERT INTO public.service(id,category_id,service_code,service_name,estimated_duration,status) VALUES('${service}','${category}','QA-SERVICE','Tắm kiểm thử',30,'active');
 INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,appointment_status) VALUES
 ('${appointment}','QA-CA-A','${customer}','${pet}','${a}',now()+interval '1 day',now()+interval '1 day 30 minutes','confirmed'),
 ('${otherAppointment}','QA-CA-B','${customer}','${pet}','${b}',now()+interval '2 days',now()+interval '2 days 30 minutes','confirmed');
 INSERT INTO public.appointment_item(id,appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,discount_amount,duration_minutes,weight_snapshot,staff_id,status) VALUES
 ('${id(51)}','${appointment}','${service}',true,'Tắm kiểm thử',1,100000,0,30,5,'${a}','pending'),('${id(52)}','${otherAppointment}','${service}',true,'Tắm kiểm thử',1,100000,0,30,5,'${b}','pending');
 INSERT INTO public.service_supported_species(service_id,species_id) VALUES('${service}','${species}');
 INSERT INTO public.pet_weight_history(pet_id,weight,measured_at,recorded_by,note) VALUES('${pet}',5,now(),'${a}','QA');
 INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status) VALUES('${service}',0,20,100000,now()-interval '1 day','active');
 INSERT INTO public.payment_method_config(id,name,fee,available) VALUES('${method}','Tiền mặt',0,true);
 INSERT INTO public.product_category(id,category_name,status) VALUES('${id(40)}','Hàng kiểm thử','active');
 INSERT INTO public.product(id,category_id,product_name,unit,slug,status) VALUES('${id(41)}','${id(40)}','Sản phẩm kiểm thử','gói','qa-fixed-role','active');
 INSERT INTO public.product_variant(id,product_id,sku_variant,cost_price,sale_price,status) VALUES('${id(42)}','${id(41)}','QA-165-SKU',45000,100000,'active');
 INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,staff_id,idempotency_key) VALUES('${id(42)}','opening',10,'QA','${admin}','qa-opening');
 INSERT INTO public.chatbot_sentiment_tier(level,name,color_badge,sla_seconds) VALUES(1,'Bình thường','#236B48',300);
 INSERT INTO public.chat_conversation(id,customer_id,status,sentiment_level,sentiment_trend,channel,assigned_staff_id) VALUES
 ('${chat}','${customer}','agent_handling',1,'stable','web','${a}'),('${otherChat}','${customer}','agent_handling',1,'stable','web','${b}'),('${queue}','${customer}','waiting_agent',1,'stable','web',NULL);
 INSERT INTO public.chat_message(conversation_id,sender_type,content,raw_content,sentiment_score) VALUES('${chat}','bot','Nội dung công việc','RAW_PRIVATE',1),('${otherChat}','bot','Nội dung của người khác','RAW_OTHER',1);
 `;
 check('Assigned appointments and chat transcripts stay within actor scope',()=>{
  const jobs=JSON.parse(sql(actor(a,"SELECT public.get_staff_workspace('appointments')")));assert.deepEqual(jobs.items.map(i=>i.id),[appointment]);
  const messages=JSON.parse(sql(actor(a,`SELECT public.get_staff_workspace('messages','', '${chat}')`)));assert.equal(messages.items.length,1);assert.ok(!('raw_content' in messages.items[0]));
  denied(a,`PERFORM public.get_staff_workspace('messages','', '${otherChat}')`);
  const headers=JSON.parse(sql(actor(a,"SELECT public.get_staff_workspace('chat_queue')")));assert.equal(headers.items.length,1);assert.ok(!('customer_id' in headers.items[0]));
 });
 check('Worker updates customer contact without changing membership and updates pet without archiving',()=>{
  assert.equal(sql(actor(a,`SELECT public.update_customer_profile('${customer}',(public.get_staff_workspace('customers','', '${customer}')->'items'->0->>'updated_at')::timestamptz,'Khách cập nhật','0900222444',NULL,NULL,NULL,'${tier}',NULL)`)),customer);
  denied(a,`PERFORM public.update_customer_profile('${customer}',now(),'Khách cập nhật','0900222444',NULL,NULL,NULL,'${id(99)}',NULL)`);
  const details=JSON.stringify({customer_id:customer,breed_id:breed,pet_name:'Bé cập nhật',gender:'unknown',status:'active',safety_note:'Lưu ý kiểm thử'});
  assert.equal(sql(actor(a,`SELECT public.save_admin_pet('${pet}',(public.get_staff_workspace('pets','', '${pet}')->'items'->0->>'updated_at')::timestamptz,'${details}',NULL)`)),pet);
  denied(a,`PERFORM public.save_admin_pet('${pet}',now(),'${details.replace('"active"','"archived"')}',NULL)`);
 });
 check('Service progress requires assignment and disallows reassign/cancel/delete',()=>{
  assert.equal(sql(actor(a,`SELECT public.update_admin_service_booking('${appointment}',(public.get_staff_workspace('appointments')->'items'->0->>'updated_at')::timestamptz,'status','checked_in','QA')`)),appointment);
  denied(a,`PERFORM public.update_admin_service_booking('${otherAppointment}',now(),'status','checked_in','QA')`);
  denied(a,`PERFORM public.update_admin_service_booking('${appointment}',now(),'assign','${b}','QA')`);
  denied(a,`PERFORM public.update_admin_service_booking('${appointment}',now(),'status','cancelled','QA')`);
  denied(a,`PERFORM public.save_admin_service_care_log(gen_random_uuid(),'${appointment}',now(),NULL,'delete','{}')`);
  denied(a,`PERFORM public.post_admin_service_money(gen_random_uuid(),'${appointment}','x','refund','{}')`);
 });
 check('Worker can create booking using database price; unrelated appointment stays protected',()=>{
  const details=JSON.stringify({customer_id:customer,pet_id:pet,service_id:service,staff_id:a,scheduled_start_at:'2030-01-01T08:00:00+07:00',note:'QA'});
  assert.equal(sql(actor(a,`SELECT public.create_admin_service_booking('${id(23)}','${details}')`)),id(23));
  denied(a,`PERFORM public.get_admin_service_cashier('${otherAppointment}')`);
  const options=JSON.parse(sql(actor(a,'SELECT public.admin_service_staff_candidates()')));assert.ok(options.some(s=>s.id===a));assert.ok(options.every(s=>!('email' in s)&&!('phone_number' in s)));
  for(const kind of ['services','breeds','payment_methods','offers','hotel_rooms','hotel_stays','taxi_prices','taxi_trips'])assert.ok(Array.isArray(JSON.parse(sql(actor(a,`SELECT public.get_staff_workspace('${kind}')`))).items));
  for(const kind of ['service_records','care_logs']){
   assert.ok(Array.isArray(JSON.parse(sql(actor(a,`SELECT public.get_staff_workspace('${kind}','', '${appointment}')`))).items));
   denied(a,`PERFORM public.get_staff_workspace('${kind}','', '${otherAppointment}')`);
  }
 });
 check('Worker updates only own service item and cannot forge an unassigned item',()=>{
  const item=id(51);
  assert.equal(sql(actor(a,`SELECT public.update_admin_service_booking('${appointment}',(public.get_staff_workspace('appointments')->'items'->0->>'updated_at')::timestamptz,'status','checked_in','QA'); SELECT public.perform_staff_service_item('${item}',(public.get_staff_workspace('service_items','', '${appointment}')->'items'->0->>'updated_at')::timestamptz,'in_progress')`)).split('\n').at(-1),item);
  denied(a,`PERFORM public.perform_staff_service_item('${id(52)}',now(),'in_progress')`);
  const old=fixtures;fixtures+=`UPDATE public.appointment_item SET staff_id=NULL WHERE id='${id(52)}';`;
  denied(a,`PERFORM public.perform_staff_service_item('${id(52)}',now(),'in_progress')`);fixtures=old;
 });
 check('Shared appointment permits own line without completing a colleague line',()=>{
  const old=fixtures;fixtures+=`INSERT INTO public.appointment_item(id,appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,discount_amount,duration_minutes,weight_snapshot,staff_id,status) VALUES('${id(53)}','${appointment}','${service}',false,'Hạng mục phối hợp',1,50000,0,20,5,'${b}','pending');`;
  const line=JSON.parse(sql(actor(b,`SELECT public.update_admin_service_booking('${appointment}',(public.get_staff_workspace('appointments')->'items'->1->>'updated_at')::timestamptz,'status','checked_in','QA'); SELECT public.get_staff_workspace('service_items','', '${appointment}')`)).split('\n').at(-1));
  assert.equal(line.items.length,1);assert.equal(line.items[0].id,id(53));
  denied(a,`PERFORM public.save_admin_service_record(gen_random_uuid(),'${appointment}',now(),'handover','{}')`);fixtures=old;
 });
 check('Stock projection omits costs and legacy stock/points writers stay denied',()=>{
  const stock=JSON.parse(sql(actor(a,"SELECT public.get_staff_workspace('stock')")));assert.equal(stock.items[0].sale_price,100000);assert.ok(!('cost_price' in stock.items[0]));
  denied(a,`PERFORM public.adjust_customer_points('${customer}',50,'QA test',gen_random_uuid())`);
  denied(a,`PERFORM public.adjust_admin_sales_stock(gen_random_uuid(),'${id(42)}','{}')`);
 });
 check('Worker quotes/creates order at server price and collects without raw money permissions',()=>{
  const details=JSON.stringify({discount_mode:'none',delivery:false,note:'QA'}),lines=JSON.stringify([{variant_id:id(42),quantity:1,unit_price:1}]);
  const order=id(60),receipt=id(61),cash=JSON.stringify({method_id:method,amount:100000,reason:'Thu tiền kiểm thử',confirmed:true});
  const value=JSON.parse(sql(actor(a,`SELECT public.create_admin_sales_order('${order}','${customer}',public.quote_admin_sales_order('${customer}','${details}','${lines}')->>'version','${details}','${lines}');
   SELECT public.post_admin_sales_money('${receipt}','${order}',public.get_admin_sales_cashier('${order}')->>'version','collect','${cash}');
   SELECT public.post_admin_sales_money('${receipt}','${order}',public.get_admin_sales_cashier('${order}')->>'version','collect','${cash}');
   SELECT public.get_admin_sales_cashier('${order}')`)).split('\n').at(-1));
  assert.equal(value.total,100000);assert.equal(value.collected,100000);assert.equal(value.payments.length,1);
  denied(a,`PERFORM public.post_admin_sales_money(gen_random_uuid(),'${order}','x','refund','{}')`);
 });
 check('Worker collects own service payment and replay does not duplicate receipt',()=>{
  const cash=JSON.stringify({method_id:method,amount:100000,reason:'Thu tiền kiểm thử',confirmed:true});
  const value=JSON.parse(sql(actor(a,`SELECT public.post_admin_service_money('${id(62)}','${appointment}',public.get_admin_service_cashier('${appointment}')->>'version','collect','${cash}');
   SELECT public.post_admin_service_money('${id(62)}','${appointment}',public.get_admin_service_cashier('${appointment}')->>'version','collect','${cash}');
   SELECT public.get_admin_service_cashier('${appointment}')`)).split('\n').at(-1));
  assert.equal(value.collected,100000);assert.equal(value.payments.length,1);
 });
 check('Chat intake is atomic, and another handler or raw transcript remains inaccessible',()=>{
  const queueOwned=JSON.parse(sql(actor(a,`SELECT public.act_admin_chat('${id(70)}','${queue}',now(),'take','QA'); SELECT public.get_staff_workspace('conversations','', '${queue}')`)).split('\n').at(-1));assert.equal(queueOwned.items[0].id,queue);
  denied(a,`PERFORM public.act_admin_chat('${id(71)}','${otherChat}',now(),'send','QA message')`);
 });
 check('Complaint intake and assigned messaging cannot approve compensation',()=>{
  assert.equal(sql(actor(a,`SELECT public.create_chat_complaint('${id(72)}','${chat}',(public.get_staff_workspace('conversations','', '${chat}')->'items'->0->>'updated_at')::timestamptz,NULL,'service','Phản ánh kiểm thử','normal')`)),id(72));
  const old=fixtures;fixtures+=`INSERT INTO public.support_ticket(id,ticket_code,customer_id,channel,category,subject,description,priority,type,status,assigned_staff_id) VALUES('${id(73)}','QA-TICKET','${customer}','admin','service','Phản ánh kiểm thử','Thông tin kiểm thử','normal','complaint','pending','${a}');`;
  assert.equal(sql(actor(a,`SELECT public.act_admin_complaint('${id(74)}','${id(73)}',(public.get_staff_workspace('complaints','', '${id(73)}')->'items'->0->>'updated_at')::timestamptz,'message','{"note":"Đã tiếp nhận thông tin","internal":true}')`)),id(73));
  denied(a,`PERFORM public.act_admin_complaint(gen_random_uuid(),'${id(73)}',now(),'approve','{"note":"QA test"}')`);
  denied(b,`PERFORM public.act_admin_complaint(gen_random_uuid(),'${id(73)}',now(),'message','{"note":"QA test"}')`);
  denied(b,`PERFORM public.get_staff_workspace('complaint_messages','', '${id(73)}')`);
  fixtures=old;
 });
 check('Revoking account access affects the next database call with the same claims',()=>{
  denied(a,`RESET ROLE; UPDATE public.staff SET must_change_password=true WHERE id='${a}'; SET LOCAL ROLE authenticated; PERFORM public.get_staff_workspace('self')`);
 });
}catch(e){report.error={name:e.name,detail:String(e.stderr||e.message).slice(0,2000)};console.error(report.error.detail);process.exitCode=1;}
finally{report.status=process.exitCode?'FAIL':'PASS';fs.writeFileSync(folder+'/sql-results.txt',JSON.stringify(report,null,2)+'\n');if(!process.exitCode)fs.writeFileSync(require('node:path').join(env.privateDir,'business-fixture.sql'),fixtures);}
