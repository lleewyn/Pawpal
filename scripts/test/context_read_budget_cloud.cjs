const fs=require('node:fs');
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 const migration=fs.readFileSync('scripts/database/v1/240_context_read_budget.sql','utf8');
 if(process.argv.includes('--apply')){await db.query(migration);console.log('Applied context read budget RPCs.');return;}
 await db.query('BEGIN;'+migration.replace(/^BEGIN;\s*|^COMMIT;\s*$/gm,''));
 await db.query(`DO $$ DECLARE u uuid:=gen_random_uuid();s uuid:=gen_random_uuid();r jsonb; BEGIN
  INSERT INTO auth.users(id) VALUES(u);
  INSERT INTO public.staff(id,full_name,phone_number,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Kiểm tra ngữ cảnh','09'||lpad(floor(random()*100000000)::text,8,'0'),'QA',u,'active',false);
  INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  r:=public.admin_booking_directory('customers','');
  IF jsonb_array_length(r->'customers')>15 OR jsonb_array_length(r->'pets')>100 THEN RAISE EXCEPTION 'directory_bounds';END IF;
  r:=public.admin_booking_directory('pets','');
  IF jsonb_array_length(r->'pets')>15 THEN RAISE EXCEPTION 'pet_bounds';END IF;
  BEGIN PERFORM public.own_context_choices('orders');RAISE EXCEPTION 'staff_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  PERFORM set_config('request.jwt.claim.sub','',true);
  BEGIN PERFORM public.admin_booking_directory();RAISE EXCEPTION 'anon_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 END $$;`);
 await db.query(`DO $$ DECLARE u uuid:=gen_random_uuid();c uuid:=gen_random_uuid();other_id uuid:=gen_random_uuid();pet_id uuid:=gen_random_uuid();r jsonb;prefix text:=gen_random_uuid()::text;BEGIN
 INSERT INTO auth.users(id) VALUES(u);
 INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES(c,u,'CTX-'||c),(other_id,NULL,'CTX-'||other_id);
 INSERT INTO public.sales_order(order_code,customer_id) SELECT prefix||'-'||i,c FROM generate_series(1,23)i;
 INSERT INTO public.sales_order(order_code,customer_id) VALUES(prefix||'-other',other_id);
 INSERT INTO public.pet_profile(id,pet_code,customer_id,pet_name,breed_id) SELECT pet_id,'CTX-'||pet_id,c,'B? ki?m tra',id FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1;
 INSERT INTO public.appointment(appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at,appointment_status) SELECT prefix||'-'||i,c,pet_id,now()-i*interval '1 day',now()-i*interval '1 day'+interval '1 hour','completed' FROM generate_series(1,23)i;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 r:=public.own_context_choices('orders');IF jsonb_array_length(r->'rows')<>15 THEN RAISE EXCEPTION 'order_bounds';END IF;
 r:=public.own_context_choices('orders','',prefix||'-23');IF jsonb_array_length(r->'rows')<>1 THEN RAISE EXCEPTION 'old_order';END IF;
 r:=public.own_context_choices('orders','',prefix||'-other');IF jsonb_array_length(r->'rows')<>0 THEN RAISE EXCEPTION 'other_owner';END IF;
 r:=public.own_context_financials('orders',ARRAY[(SELECT id FROM public.sales_order WHERE order_code=prefix||'-23'),(SELECT id FROM public.sales_order WHERE order_code=prefix||'-other')]);IF jsonb_array_length(r)<>1 THEN RAISE EXCEPTION 'financial_owner_scope';END IF;
 r:=public.own_context_choices('bookings');IF jsonb_array_length(r->'rows')<>15 THEN RAISE EXCEPTION 'booking_bounds';END IF;
 r:=public.own_context_choices('care');IF jsonb_array_length(r->'rows')<>1 THEN RAISE EXCEPTION 'care_bounds';END IF;
 END $$;`);
 await db.query('ROLLBACK');console.log('PASS context RPC compilation, directory bounds, staff/anonymous isolation (rolled back).');
}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
