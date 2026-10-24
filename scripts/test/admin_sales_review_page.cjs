const {sql}=require('../database/v1/cloud_connection.cjs');
console.log(sql(`BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id) VALUES(u);INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Review paging verification','QA',u,'active',false);INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');PERFORM set_config('request.jwt.claim.sub',u::text,true);END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE p uuid; r jsonb; expected integer; stars numeric; BEGIN
SELECT id INTO p FROM public.product LIMIT 1;
r:=public.get_admin_sales_review_page(p);
SELECT count(*),avg(rating) INTO expected,stars FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=p;
IF (r->>'total')::integer<>expected OR (r->>'count')::integer<>expected OR (r->>'average')::numeric IS DISTINCT FROM stars OR jsonb_array_length(r->'ids')>10 THEN RAISE EXCEPTION 'review totals mismatch';END IF;
r:=public.get_admin_sales_review_page(p,'MEDIA');
SELECT count(*) INTO expected FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=p AND EXISTS(SELECT 1 FROM public.review_media m WHERE m.review_id=r.id);
IF (r->>'total')::integer<>expected THEN RAISE EXCEPTION 'media filter mismatch';END IF;
r:=public.get_admin_sales_review_page(p,'5');
SELECT count(*) INTO expected FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=p AND r.rating=5;
IF (r->>'total')::integer<>expected THEN RAISE EXCEPTION 'star filter mismatch';END IF;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.get_admin_sales_review_page(p);RAISE EXCEPTION 'unauthorized accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;ROLLBACK;
SELECT 'PASS review paging/count/average/star/media filters and authorization; verification identity rolled back';`));
