-- Appended inside the isolated fixture transaction from media_stage3_checks.sql.
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SET LOCAL session_replication_role=replica;
INSERT INTO public.role_permission(role_code,permission_code)
 SELECT 'ADMIN',unnest(ARRAY['product.read','product.write','product_variant.read','product_variant.write','product_category.read','product_media.read','product_media.write','product_variant_media.read','product_variant_media.write','inventory.read','inventory.write','inventory_transaction.read','inventory_transaction.write','audit_log.read','audit_log.write','staff.read']) ON CONFLICT DO NOTHING;
SET LOCAL session_replication_role=origin;
SET LOCAL ROLE authenticated;
SELECT set_config('media.product_session',public.prepare_media_upload(gen_random_uuid(),'product_image','30000000-0000-0000-0000-000000000001',null,null,100,'image/png','product.png')->>'session_id',true);
SELECT set_config('media.product_lease',public.claim_media_upload(current_setting('media.product_session')::uuid)->>'lease',true);
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('media.product_asset',public.finish_media_upload(current_setting('media.product_session')::uuid,current_setting('media.product_lease')::uuid,'10000000-0000-0000-0000-000000000001',repeat('c',64),2,2)::text,true);
RESET ROLE;
SELECT set_config('media.product_details',jsonb_build_object('product_name','Isolated product','unit','piece','slug','isolated-media-test','status','active','category_id','50000000-0000-0000-0000-000000000001','media_sources',jsonb_build_array(jsonb_build_object('asset_id',current_setting('media.product_asset'))))::text,true);
SELECT set_config('media.product_variants','[{"id":"90000000-0000-0000-0000-000000000001","sku":"ISOLATED-MEDIA","variant_name":"Default","cost_price":1,"sale_price":2,"stock":0,"minimum_stock":0}]',true);
-- Execute the actual business RPC as its real caller role.
SET LOCAL ROLE authenticated;
SELECT public.save_admin_sales_product(gen_random_uuid(),'30000000-0000-0000-0000-000000000001',
 (SELECT updated_at FROM public.product WHERE id='30000000-0000-0000-0000-000000000001'),current_setting('media.product_details')::jsonb,current_setting('media.product_variants')::jsonb);
RESET ROLE;
SELECT set_config('media.product_ref',(SELECT id::text FROM public.product_media WHERE media_asset_id=current_setting('media.product_asset')::uuid),true);
SELECT pg_temp.assert((SELECT status='attached' FROM public.media_asset WHERE id=current_setting('media.product_asset')::uuid),'product RPC attaches asset');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.assert(EXISTS(SELECT 1 FROM jsonb_array_elements(public.customer_shop_catalog()) p WHERE p->>'id'='30000000-0000-0000-0000-000000000001' AND p->'image_urls'->>0='/api/media?action=read&id='||current_setting('media.product_asset')),'catalog resolves asset endpoint');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT public.save_admin_sales_product(gen_random_uuid(),'30000000-0000-0000-0000-000000000001',
 (SELECT updated_at FROM public.product WHERE id='30000000-0000-0000-0000-000000000001'),current_setting('media.product_details')::jsonb,current_setting('media.product_variants')::jsonb);
RESET ROLE;
SELECT pg_temp.assert((SELECT id::text=current_setting('media.product_ref') FROM public.product_media WHERE media_asset_id=current_setting('media.product_asset')::uuid),'unchanged reference is retained');
SELECT pg_temp.assert((SELECT status='attached' FROM public.media_asset WHERE id=current_setting('media.product_asset')::uuid),'retained asset never queued for deletion');
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.save_admin_sales_product(gen_random_uuid(),'30000000-0000-0000-0000-000000000001',
 (SELECT updated_at FROM public.product WHERE id='30000000-0000-0000-0000-000000000001'),jsonb_set(current_setting('media.product_details')::jsonb,'{media_sources}',jsonb_build_array(jsonb_build_object('asset_id',current_setting('media.care_asset')))),current_setting('media.product_variants')::jsonb)$q$,'42501');
SELECT public.save_admin_sales_product(gen_random_uuid(),'30000000-0000-0000-0000-000000000001',
 (SELECT updated_at FROM public.product WHERE id='30000000-0000-0000-0000-000000000001'),(current_setting('media.product_details')::jsonb-'media_sources')||'{"images":["https://example.test/legacy.png"]}'::jsonb,current_setting('media.product_variants')::jsonb);
RESET ROLE;
SELECT pg_temp.assert((SELECT status='pending_delete' FROM public.media_asset WHERE id=current_setting('media.product_asset')::uuid),'replacement detaches previous asset');
SELECT pg_temp.assert((SELECT image_url='https://example.test/legacy.png' AND media_asset_id IS NULL FROM public.product_media WHERE product_id='30000000-0000-0000-0000-000000000001'),'legacy URL save remains compatible');
