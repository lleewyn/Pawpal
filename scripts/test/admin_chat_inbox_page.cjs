const {sql}=require('../database/v1/cloud_connection.cjs');
console.log(sql(`BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id) VALUES(u);
INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Dashboard verification','QA',u,'active',false);
INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
PERFORM set_config('request.jwt.claim.sub',u::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; expected integer; BEGIN
r:=public.get_admin_chat_inbox_page('','all',1);
IF jsonb_typeof(r->'rows')<>'array' OR jsonb_array_length(r->'rows')>10 THEN RAISE EXCEPTION 'invalid inbox response';END IF;
IF (r->>'total')::integer<>(r->'counts'->>'all')::integer THEN RAISE EXCEPTION 'inbox counts mismatch';END IF;
r:=public.get_admin_chat_inbox_page('no-match-'||gen_random_uuid(),'urgent',1);
IF (r->>'total')::integer<>0 THEN RAISE EXCEPTION 'inbox search mismatch';END IF;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.get_admin_chat_inbox_page();RAISE EXCEPTION 'unauthorized allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;
SELECT 'PASS inbox paging <=10, totals, filtered search and unauthorized denial under authenticated role; rolled back';`));
