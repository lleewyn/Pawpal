const {sql}=require('../database/v1/cloud_connection.cjs');
console.log(sql(`BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); r jsonb; BEGIN
INSERT INTO auth.users(id) VALUES(u);INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Paging verification','QA',u,'active',false);INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
INSERT INTO public.customer(id,customer_code,customer_status) VALUES(c,'PAGING-'||c,'active');INSERT INTO public.customer_profile(customer_id,full_name) VALUES(c,'Paging verification '||c);
INSERT INTO public.paw_point_transaction(customer_id,points,description,idempotency_key,sequence_no,created_at) VALUES(c,100,'Paging verification',gen_random_uuid(),1,now()-interval '3 minutes'),(c,-30,'Paging verification',gen_random_uuid(),2,now()-interval '2 minutes'),(c,20,'Paging verification',gen_random_uuid(),3,now()-interval '1 minute');
PERFORM set_config('request.jwt.claim.sub',u::text,true);
r:=public.admin_pawpoint_page(c::text,'SUB',1,1);
IF (r->>'total')::integer<>1 OR (r->'rows'->0->>'balance')::numeric<>70 THEN RAISE EXCEPTION 'filtered historical balance incorrect %',r; END IF;
r:=public.admin_pawpoint_page(c::text,'ALL',2,1);IF jsonb_array_length(r->'rows')<>1 OR (r->>'page')::integer<>2 THEN RAISE EXCEPTION 'paging incorrect'; END IF;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);BEGIN PERFORM public.admin_pawpoint_page();RAISE EXCEPTION 'unauthorized allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;ROLLBACK;SELECT 'PASS paging, historical filtered balance, permission denial; all fixtures rolled back';`));
