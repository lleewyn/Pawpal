const {sql}=require('../database/v1/cloud_connection.cjs');
console.log(sql(`BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); w uuid:=gen_random_uuid(); c uuid; color uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id) VALUES(u);
INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Stock page verification','QA',u,'active',false);
INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
SELECT id INTO c FROM public.product_category LIMIT 1;
INSERT INTO public.product(id,category_id,product_name,unit,slug) VALUES(p,c,'Rollback stock product','unit','rollback-'||p);
INSERT INTO public.variant_color(id,color_name,hex_code) VALUES(color,'Rollback-'||color,'#123456');
INSERT INTO public.product_variant(id,product_id,sku_variant,cost_price,sale_price,color_id) VALUES(v,p,'rollback-'||v,1,2,NULL),(w,p,'rollback-'||w,1,2,color);
INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,staff_id,created_at,idempotency_key)
SELECT v,'adjustment',1,'Rollback stock history',s,'2020-01-01'::timestamptz+i*interval '1 second','stock-page-'||v||'-'||i FROM generate_series(1,25)i;
INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,staff_id,created_at,idempotency_key)
SELECT w,'adjustment',2,'Rollback stock history',s,'2020-01-01'::timestamptz+i*interval '2 seconds','stock-page-'||w||'-'||i FROM generate_series(1,7)i;
PERFORM set_config('test.stock_product',p::text,true);PERFORM set_config('request.jwt.claim.sub',u::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; item jsonb; p uuid:=current_setting('test.stock_product')::uuid; expected bigint; change integer; page integer; BEGIN
FOR page IN 1..4 LOOP
r:=public.get_admin_sales_stock_history_page(p,page);
IF (r->>'total')::integer<>32 OR jsonb_array_length(r->'rows')<>(CASE WHEN page=4 THEN 2 ELSE 10 END) THEN RAISE EXCEPTION 'ledger page/count mismatch';END IF;
FOR item IN SELECT value FROM jsonb_array_elements(r->'rows') LOOP
SELECT sum(t.quantity),max(ref.quantity) INTO expected,change FROM public.inventory_transaction ref JOIN public.inventory_transaction t ON t.product_variant_id=ref.product_variant_id AND (t.created_at,t.id)<=(ref.created_at,ref.id) WHERE ref.id=(item->>'id')::uuid;
IF (item->>'afterStock')::bigint<>expected OR (item->>'beforeStock')::bigint<>expected-change THEN RAISE EXCEPTION 'cross-page/per-variant balance mismatch';END IF;
END LOOP;
END LOOP;
r:=public.get_admin_sales_stock_history_page(p,1000000);IF (r->>'page')::integer<>4 THEN RAISE EXCEPTION 'clamp mismatch';END IF;
r:=public.get_admin_sales_stock_history_page(gen_random_uuid());IF (r->>'total')::integer<>0 THEN RAISE EXCEPTION 'scope mismatch';END IF;
BEGIN PERFORM public.get_admin_sales_stock_history_page(p,0);RAISE EXCEPTION 'invalid page accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.get_admin_sales_stock_history_page(p);RAISE EXCEPTION 'unauthorized accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;
SELECT 'PASS stock history: four pages, 10-row limit, full per-variant balances, clamp, empty scope, invalid page and unauthorized denial; all fixtures rolled back';`));
