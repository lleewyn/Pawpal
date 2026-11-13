const fs=require('node:fs');const{connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 const migration=fs.readFileSync('scripts/database/v1/241_admin_remaining_read_budget.sql','utf8');
 if(process.argv.includes('--apply')){await db.query(migration);console.log('Applied admin remaining read budget RPCs.');return;}
 await db.query('BEGIN;'+migration.replace(/^BEGIN;\s*|^COMMIT;\s*$/gm,''));
 await db.query(`DO $$ DECLARE u uuid:=gen_random_uuid();s uuid:=gen_random_uuid();t uuid:=gen_random_uuid();prefix text:=gen_random_uuid()::text;r jsonb;k text;n numeric;BEGIN
 INSERT INTO auth.users(id) VALUES(u);
 INSERT INTO public.staff(id,full_name,phone_number,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Kiểm tra báo cáo','09'||lpad(floor(random()*100000000)::text,8,'0'),'QA',u,'active',false);
 INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description,created_at) SELECT s,'COMPLAINT_ACTION','support_ticket',t,jsonb_build_object('action','complete','details',jsonb_build_object('evidence_id',i))::text,now()-i*interval '1 second' FROM generate_series(1,23)i;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description,created_at) VALUES(s,'COMPLAINT_ACTION','support_ticket',t,'invalid old text',now()),(s,'COMPLAINT_ACTION','support_ticket',t,'{"action":"propose","details":{"option":"refund","amount":23000}}',now());
 r:=public.admin_complaint_action_summary(t);IF jsonb_array_length(r)<>11 OR r->0->>'description' NOT LIKE '%propose%' THEN RAISE EXCEPTION 'action_summary_latest';END IF;
 r:=public.admin_complaint_completed_page(t,1);IF jsonb_array_length(r)<>11 THEN RAISE EXCEPTION 'action_page_one';END IF;
 r:=public.admin_complaint_completed_page(t,3);IF jsonb_array_length(r)<>3 THEN RAISE EXCEPTION 'action_page_last';END IF;

 FOREACH k IN ARRAY ARRAY['sources','customers','returning','membership','vouchers','points','products','services'] LOOP
  r:=public.admin_business_metric(k,'2026-11-01','2026-11-13');IF r IS NULL THEN RAISE EXCEPTION 'missing_metric %',k;END IF;
  IF k IN('products','services') AND jsonb_array_length(r)>20 THEN RAISE EXCEPTION 'ranking_bounds';END IF;
 END LOOP;
 r:=public.admin_business_metric('customers','2026-11-01','2026-11-13');
 SELECT count(*) INTO n FROM public.customer WHERE registered_at>='2026-11-01T00:00:00+07:00' AND registered_at<'2026-11-14T00:00:00+07:00';
 IF n<>coalesce((SELECT sum((x->>'count')::numeric) FROM jsonb_array_elements(r)x),0) THEN RAISE EXCEPTION 'customer_count';END IF;
 r:=public.admin_business_metric('points','2026-11-01','2026-11-13');
 SELECT coalesce(sum(points) FILTER(WHERE points>=0),0) INTO n FROM public.paw_point_transaction WHERE created_at>='2026-11-01T00:00:00+07:00' AND created_at<'2026-11-14T00:00:00+07:00';
 IF n<>(r->>'credited')::numeric THEN RAISE EXCEPTION 'points_count';END IF;

 INSERT INTO public.voucher(voucher_code,voucher_name,discount_value,start_date,end_date,type,applicable_for,max_usage)
 SELECT 'QA'||replace(prefix,'-','')||i,prefix||' '||i,1000,current_date,current_date+30,'fixed','shop',100 FROM generate_series(1,23)i;
 r:=public.admin_sales_voucher_page(prefix,3,false);IF (r->>'total')::integer<>23 OR jsonb_array_length(r->'rows')<>3 THEN RAISE EXCEPTION 'voucher_last_page';END IF;
 r:=public.admin_sales_voucher_page('',1,false);IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'rows')x WHERE (x->>'used')::bigint<>(SELECT count(*) FROM public.voucher_redemption WHERE voucher_id=(x->>'id')::uuid AND status='applied')) THEN RAISE EXCEPTION 'voucher_count';END IF;IF jsonb_array_length(r->'rows')>10 THEN RAISE EXCEPTION 'voucher_page_bounds';END IF;
 r:=public.admin_service_catalog_summary();IF EXISTS(SELECT 1 FROM jsonb_array_elements(r)x WHERE length(x->>'description')>160 OR jsonb_array_length(x->'images')>1 OR jsonb_array_length(x->'actions')>0 OR x ? 'benefits' OR x ? 'amenities') THEN RAISE EXCEPTION 'heavy_catalog';END IF;
 r:=public.admin_complaint_action_summary(gen_random_uuid());IF r<>'[]'::jsonb THEN RAISE EXCEPTION 'empty_actions';END IF;
 DELETE FROM public.staff_role WHERE staff_id=s;INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'STAFF');
 BEGIN PERFORM public.admin_sales_voucher_page();RAISE EXCEPTION 'staff_vouchers_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_service_catalog_summary();RAISE EXCEPTION 'staff_catalog_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_complaint_action_summary(t);RAISE EXCEPTION 'staff_actions_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.admin_business_metric('points','2026-11-01','2026-11-13');RAISE EXCEPTION 'anonymous_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 END $$;ROLLBACK;`);
 console.log('PASS business aggregates, ranking bounds, exact customer/point/voucher counts, complaint summary, anonymous denial; rolled back.');
}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
