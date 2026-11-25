const fs=require('node:fs');const{connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 const migration=fs.readFileSync('my-server/scripts/database/v1/242_admin_context_and_counts.sql','utf8');
 if(process.argv.includes('--apply')){await db.query(migration);console.log('Applied overview and complaint context RPCs.');return;}
 await db.query('BEGIN;'+migration.replace(/^BEGIN;\s*|^COMMIT;\s*$/gm,''));
 await db.query(`DO $$ DECLARE u uuid:=gen_random_uuid();s uuid:=gen_random_uuid();c uuid:=gen_random_uuid();oc uuid:=gen_random_uuid();p uuid:=gen_random_uuid();prefix text:=gen_random_uuid()::text;r jsonb;n bigint;BEGIN
 INSERT INTO auth.users(id) VALUES(u);
 INSERT INTO public.staff(id,full_name,phone_number,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Kiểm tra ngữ cảnh','09'||lpad(floor(random()*100000000)::text,8,'0'),'QA',u,'active',false);
 INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
 INSERT INTO public.customer(id,customer_code) VALUES(c,'CTX-'||c),(oc,'CTX-'||oc);
 INSERT INTO public.customer_profile(customer_id,full_name) VALUES(c,'Khách kiểm tra ngữ cảnh'),(oc,'Chủ khác');
 INSERT INTO public.pet_profile(id,pet_code,customer_id,pet_name,breed_id) SELECT p,'CTX-'||p,c,'Bé kiểm tra',id FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1;
 INSERT INTO public.sales_order(customer_id,order_code,order_status,created_at) SELECT c,prefix||'-'||i,'pending',now()-i*interval '1 second' FROM generate_series(1,23)i;
 INSERT INTO public.appointment(customer_id,pet_id,appointment_code,scheduled_start_at,scheduled_end_at) SELECT c,p,prefix||'-'||i,now()+i*interval '1 day',now()+i*interval '1 day'+interval '1 hour' FROM generate_series(1,23)i;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 INSERT INTO public.support_ticket(ticket_code,customer_id,order_id,channel,category,subject,priority,type,status) SELECT 'CTX-'||prefix,c,id,'admin','order','Phản ánh kiểm tra','critical','complaint','new' FROM public.sales_order WHERE order_code=prefix||'-23';
 r:=public.admin_overview_workload();
 SELECT count(*) INTO n FROM public.sales_order WHERE upper(order_status) IN('PENDING','CONFIRMED','PROCESSING','CHO_XAC_NHAN','DANG_XU_LY');IF (r->>'orders')::bigint<>n THEN RAISE EXCEPTION 'order_count';END IF;
 SELECT count(*) INTO n FROM public.support_ticket WHERE upper(coalesce(status,'')) NOT IN('RESOLVED','COMPLETED','CLOSED','REJECTED','DA_DONG','DA_GIAI_QUYET');IF (r->>'tickets')::bigint<>n THEN RAISE EXCEPTION 'ticket_count';END IF;
 IF r ? 'allOrders' OR r ? 'allTickets' THEN RAISE EXCEPTION 'full_rows';END IF;
 r:=public.admin_complaint_context('customers','',c);IF jsonb_array_length(r->'customers')<>1 THEN RAISE EXCEPTION 'owner_search';END IF;
 r:=public.admin_complaint_context('order','',c);IF jsonb_array_length(r->'refs')<>10 THEN RAISE EXCEPTION 'order_bounds';END IF;
 r:=public.admin_complaint_context('order','',c,prefix||'-23');IF jsonb_array_length(r->'refs')<>1 OR r->'refs'->0->>'duplicate'<>'CTX-'||prefix THEN RAISE EXCEPTION 'old_order_or_duplicate';END IF;
 r:=public.admin_complaint_context('order','',oc,prefix||'-23');IF jsonb_array_length(r->'refs')<>0 THEN RAISE EXCEPTION 'cross_owner';END IF;
 r:=public.admin_complaint_context('service','',c);IF jsonb_array_length(r->'refs')<>10 OR jsonb_array_length(r->'pets')<>1 THEN RAISE EXCEPTION 'service_bounds';END IF;
 DELETE FROM public.staff_role WHERE staff_id=s;INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'STAFF');
 BEGIN PERFORM public.admin_overview_workload();RAISE EXCEPTION 'staff_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_complaint_context('customers');RAISE EXCEPTION 'staff_context';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.admin_overview_workload();RAISE EXCEPTION 'anonymous_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_complaint_context('customers');RAISE EXCEPTION 'anonymous_context';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 END $$;ROLLBACK;`);
 console.log('PASS exact overview counts, 23-history context bounded to 10, older exact reference, customer scope and anonymous isolation; rolled back.');
}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
