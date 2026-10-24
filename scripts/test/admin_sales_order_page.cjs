const {sql}=require('../database/v1/cloud_connection.cjs');
console.log(sql(`BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id) VALUES(u);
INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Sales paging verification','QA',u,'active',false);
INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
PERFORM set_config('request.jwt.claim.sub',u::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; expected integer; code text; BEGIN
r:=public.get_admin_sales_order_page();
SELECT count(*) INTO expected FROM public.sales_order;
IF (r->>'total')::integer<>expected OR jsonb_array_length(r->'ids')>10 THEN RAISE EXCEPTION 'sales page/count mismatch';END IF;
IF public.admin_sales_search_text(U&'Nguy\\1ec5n \\0110\\1eb7ng')<>'nguyen dang' THEN RAISE EXCEPTION 'accent search mismatch';END IF;
r:=public.get_admin_sales_order_page('{}',1000000);
IF (r->>'page')::integer<>greatest(1,ceil(expected/10.0)::integer) THEN RAISE EXCEPTION 'clamp mismatch';END IF;
r:=public.get_admin_sales_order_page(jsonb_build_object('query','missing-'||gen_random_uuid()));
IF (r->>'total')::integer<>0 OR jsonb_array_length(r->'ids')<>0 THEN RAISE EXCEPTION 'empty search mismatch';END IF;
SELECT order_code INTO code FROM public.sales_order LIMIT 1;
IF code IS NOT NULL THEN
r:=public.get_admin_sales_order_page(jsonb_build_object('query',code));
IF (r->>'total')::integer<1 THEN RAISE EXCEPTION 'code search mismatch';END IF;
END IF;
r:=public.get_admin_sales_order_page('{"status":"delivered"}');
SELECT count(*) INTO expected FROM public.sales_order WHERE order_status IN ('delivered','completed');
IF (r->>'total')::integer<>expected THEN RAISE EXCEPTION 'delivered alias mismatch';END IF;
r:=public.get_admin_sales_order_page('{"status":"pending","overdue":true}');
SELECT count(*) INTO expected FROM public.sales_order WHERE order_status IN ('draft','pending') AND created_at<=now()-interval '31 minutes';
IF (r->>'total')::integer<>expected THEN RAISE EXCEPTION 'overdue filter mismatch';END IF;
BEGIN PERFORM public.get_admin_sales_order_page('{}',0);RAISE EXCEPTION 'invalid page accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.get_admin_sales_order_page();RAISE EXCEPTION 'unauthorized allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;
SELECT 'PASS authenticated sales paging, counts, clamp, accent/code search, overdue filter and authorization; rolled back';`));
