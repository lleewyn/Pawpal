SAVEPOINT product_catalog_smoke;
DO $$ DECLARE u uuid:=gen_random_uuid(); st uuid:=gen_random_uuid(); BEGIN
 INSERT INTO auth.users(id) VALUES(u);
 INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(st,'Kiểm tra danh mục CSV','QA',u,'active',false);
 INSERT INTO public.staff_role(staff_id,role_code) VALUES(st,'ADMIN');
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE meta jsonb; choices jsonb; p public.product; variants jsonb; details jsonb; first_id uuid; new_price numeric; old_stock integer; old_ledger integer; BEGIN
 meta:=public.get_admin_sales_product_page();
 IF (meta->>'total')::integer<>38 THEN RAISE EXCEPTION 'Admin product count mismatch'; END IF;
 choices:=public.get_admin_sales_inventory_choices();
 IF jsonb_array_length(choices)<>65 THEN RAISE EXCEPTION 'Admin inventory must offer exactly 65 current variants'; END IF;
 IF (SELECT sum((v->>'stock')::integer) FROM jsonb_array_elements(choices) v)<>4028 THEN RAISE EXCEPTION 'Admin CSV stock mismatch'; END IF;
 SELECT * INTO p FROM public.product WHERE product_code='TP-HAT-01';
 SELECT jsonb_agg(jsonb_build_object('id',v.id,'sku',v.sku_variant,'variant_name',v.variant_name,'cost_price',v.cost_price,'sale_price',v.sale_price,'compare_at_price',v.compare_at_price,'color_id',v.color_id,'size_id',v.size_id,'flavor_id',v.flavor_id,'status',v.status,'stock',i.quantity_in_stock,'minimum_stock',i.minimum_stock) ORDER BY v.sku_variant) INTO variants FROM public.product_variant v JOIN public.inventory i ON i.product_variant_id=v.id WHERE v.product_id=p.id AND NOT v.catalog_retired;
 first_id:=(variants->0->>'id')::uuid;new_price:=(variants->0->>'sale_price')::numeric+1000;
 SELECT quantity_in_stock INTO old_stock FROM public.inventory WHERE product_variant_id=first_id;
 SELECT count(*) INTO old_ledger FROM public.inventory_transaction WHERE product_variant_id=first_id;
 variants:=jsonb_set(variants,'{0,sale_price}',to_jsonb(new_price));
 details:=to_jsonb(p)||jsonb_build_object('images',coalesce((SELECT jsonb_agg(image_url ORDER BY display_order) FROM public.product_media WHERE product_id=p.id),'[]'::jsonb));
 PERFORM public.save_admin_sales_product(gen_random_uuid(),p.id,p.updated_at,details,variants);
 IF NOT EXISTS(SELECT 1 FROM public.product_variant WHERE id=first_id AND sale_price=new_price AND variant_name='400g') THEN RAISE EXCEPTION 'Admin price/name edit failed'; END IF;
 IF (SELECT quantity_in_stock FROM public.inventory WHERE product_variant_id=first_id)<>old_stock OR (SELECT count(*) FROM public.inventory_transaction WHERE product_variant_id=first_id)<>old_ledger THEN RAISE EXCEPTION 'Price edit changed stock'; END IF;
END $$;
RESET ROLE;
ROLLBACK TO SAVEPOINT product_catalog_smoke;
RELEASE SAVEPOINT product_catalog_smoke;
