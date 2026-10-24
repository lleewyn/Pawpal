const {sql}=require('../database/v1/cloud_connection.cjs');
console.log(sql(`BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id) VALUES(u);
INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Catalog verification','QA',u,'active',false);
INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');PERFORM set_config('request.jwt.claim.sub',u::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; item jsonb; expected integer; BEGIN
r:=public.search_admin_sales_customers();
IF jsonb_array_length(r)>10 THEN RAISE EXCEPTION 'customer limit';END IF;
FOR item IN SELECT value FROM jsonb_array_elements(r) LOOP
IF item ? 'address' OR item ? 'points' OR NOT EXISTS(SELECT 1 FROM public.customer WHERE id=(item->>'id')::uuid AND customer_status='active') THEN RAISE EXCEPTION 'customer payload/status';END IF;
END LOOP;
r:=public.search_admin_sales_variants();
IF jsonb_array_length(r)>10 THEN RAISE EXCEPTION 'variant limit';END IF;
FOR item IN SELECT value FROM jsonb_array_elements(r) LOOP
IF NOT EXISTS(SELECT 1 FROM public.product_variant v JOIN public.product p ON p.id=v.product_id WHERE v.id=(item->>'variantId')::uuid AND p.status='active' AND v.status='active') THEN RAISE EXCEPTION 'inactive variant';END IF;
END LOOP;
r:=public.get_admin_sales_product_page();SELECT count(*) INTO expected FROM public.product;
IF (r->>'total')::integer<>expected OR jsonb_array_length(r->'ids')>10 OR (r->'counts'->>'statTotalProducts')::integer<>expected THEN RAISE EXCEPTION 'catalog count/page mismatch';END IF;
r:=public.get_admin_sales_product_page('missing-'||gen_random_uuid());IF (r->>'total')::integer<>0 THEN RAISE EXCEPTION 'search mismatch';END IF;
r:=public.get_admin_sales_inventory_choices();SELECT count(*) INTO expected FROM public.product_variant v JOIN public.product p ON p.id=v.product_id;
IF jsonb_array_length(r)<>expected THEN RAISE EXCEPTION 'inventory choices incomplete';END IF;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.search_admin_sales_customers();RAISE EXCEPTION 'customer unauthorized';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
BEGIN PERFORM public.search_admin_sales_variants();RAISE EXCEPTION 'variant unauthorized';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
BEGIN PERFORM public.get_admin_sales_product_page();RAISE EXCEPTION 'catalog unauthorized';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
BEGIN PERFORM public.get_admin_sales_inventory_choices();RAISE EXCEPTION 'inventory unauthorized';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;
SELECT 'PASS sales customer/variant limits and activity, catalog paging/counts/search, inventory completeness, authorization; rolled back';`));
