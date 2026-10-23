const {sql}=require('../database/v1/cloud_connection.cjs');
console.log(sql(`BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); c1 uuid:=gen_random_uuid(); c2 uuid:=gen_random_uuid(); prefix text:='PAGING-'||gen_random_uuid(); r jsonb; BEGIN
INSERT INTO auth.users(id) VALUES(u);INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Directory verification','QA',u,'active',false);INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
INSERT INTO public.customer(id,customer_code,customer_status) VALUES(c1,prefix||'-1','active'),(c2,prefix||'-2','locked');INSERT INTO public.customer_profile(customer_id,full_name) VALUES(c1,'Directory fixture one'),(c2,'Directory fixture two');
PERFORM set_config('request.jwt.claim.sub',u::text,true);
r:=public.admin_customer_page(prefix,'ALL','ALL','ALL',1,1);IF (r->>'total')::integer<>2 OR jsonb_array_length(r->'pageIds')<>1 THEN RAISE EXCEPTION 'directory paging incorrect %',r;END IF;
r:=public.admin_customer_page(prefix,'ALL','LOCKED','ALL',1,10);IF (r->>'total')::integer<>1 OR r->'pageIds'->>0<>c2::text THEN RAISE EXCEPTION 'status filter incorrect';END IF;
r:=public.admin_customer_page('','ALL','ALL','ALL',1,10,prefix||'-1');IF (r->>'total')::integer<>1 THEN RAISE EXCEPTION 'lookup incorrect';END IF;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);BEGIN PERFORM public.admin_customer_page();RAISE EXCEPTION 'unauthorized allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;ROLLBACK;SELECT 'PASS directory paging, combined filter, full-ID lookup, permission denial; fixtures rolled back';`));
