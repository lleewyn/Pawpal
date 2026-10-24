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
r:=public.get_admin_dashboard_low_stock();
IF jsonb_typeof(r)<>'array' OR jsonb_array_length(r)>4 THEN RAISE EXCEPTION 'invalid stock response';END IF;
SELECT least(4,count(*)) INTO expected FROM public.inventory i JOIN public.product_variant v ON v.id=i.product_variant_id JOIN public.product p ON p.id=v.product_id WHERE upper(v.status) NOT IN ('INACTIVE','DISCONTINUED','NGUNG_BAN') AND (i.quantity_in_stock=0 OR (i.minimum_stock>0 AND i.quantity_in_stock<=i.minimum_stock));
IF jsonb_array_length(r)<>expected THEN RAISE EXCEPTION 'stock count mismatch';END IF;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.get_admin_dashboard_low_stock();RAISE EXCEPTION 'unauthorized allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;
SELECT 'PASS stock RPC as authenticated admin, RLS result count <=4, unauthorized denied; rolled back';`));
