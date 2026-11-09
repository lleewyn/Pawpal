-- Isolated database only. Fixtures are rolled back; no Cloud business data is created.
BEGIN;
CREATE FUNCTION pg_temp.assert(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion_failed: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN
  IF SQLSTATE=expected THEN RETURN; END IF; RAISE;
 END;
 RAISE EXCEPTION 'expected_error: %',expected;
END $$;
-- Skip unrelated business triggers/FKs only while building the isolated fixture graph.
SET LOCAL session_replication_role=replica;
INSERT INTO auth.users(id) VALUES ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
INSERT INTO public.staff(id,full_name,job_title,auth_user_id) VALUES
 ('20000000-0000-0000-0000-000000000001','Isolated admin','Test','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','Isolated staff','Test','10000000-0000-0000-0000-000000000002');
INSERT INTO public.staff_role(staff_id,role_code) VALUES ('20000000-0000-0000-0000-000000000001','ADMIN'),('20000000-0000-0000-0000-000000000002','STAFF');
INSERT INTO auth.users(id) VALUES ('10000000-0000-0000-0000-000000000003'),('10000000-0000-0000-0000-000000000004');
INSERT INTO public.customer(id,customer_code,auth_user_id) VALUES ('60000000-0000-0000-0000-000000000001','isolated-media-customer','10000000-0000-0000-0000-000000000003');
INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at,staff_id) VALUES
 ('70000000-0000-0000-0000-000000000001','isolated-media-appointment','60000000-0000-0000-0000-000000000001',gen_random_uuid(),now(),now()+interval '1 hour','20000000-0000-0000-0000-000000000002');
INSERT INTO public.care_log(id,appointment_id,action_name_snapshot,recorded_by) VALUES
 ('80000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','Isolated action','20000000-0000-0000-0000-000000000002');
INSERT INTO public.role_permission(role_code,permission_code) VALUES ('STAFF','work.service.perform') ON CONFLICT DO NOTHING;
INSERT INTO public.product_category(id,category_name) VALUES ('50000000-0000-0000-0000-000000000001','Isolated category');
INSERT INTO public.product(id,category_id,product_name,unit,slug,status) VALUES
 ('30000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Isolated product','piece','isolated-media-test','active'),
 ('30000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','Other product','piece','isolated-other-test','active');
SET LOCAL session_replication_role=origin;
SELECT pg_temp.assert(NOT has_table_privilege('anon','public.media_asset','SELECT'),'anonymous table ACL');
SELECT pg_temp.assert(NOT has_function_privilege('authenticated','public.finish_media_upload(uuid,uuid,uuid,text,integer,integer)','EXECUTE'),'service-only finalizer ACL');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.expect_error($q$SELECT public.prepare_media_upload('40000000-0000-0000-0000-000000000001','product_image','30000000-0000-0000-0000-000000000001',null,null,100,'image/png','a.png')$q$,'55000');
RESET ROLE;
UPDATE pawpal_private.media_settings SET enabled=true,max_storage_bytes=150;
SET LOCAL ROLE authenticated;
SELECT set_config('media.test_session',(public.prepare_media_upload('40000000-0000-0000-0000-000000000001','product_image','30000000-0000-0000-0000-000000000001',null,null,100,'image/png','a.png')->>'session_id'),true);
SELECT pg_temp.assert(public.prepare_media_upload('40000000-0000-0000-0000-000000000001','product_image','30000000-0000-0000-0000-000000000001',null,null,100,'image/png','a.png')->>'session_id'=current_setting('media.test_session'),'idempotent prepare');
SELECT pg_temp.expect_error($q$SELECT public.prepare_media_upload('40000000-0000-0000-0000-000000000001','product_image','30000000-0000-0000-0000-000000000001',null,null,99,'image/png','a.png')$q$,'PT409');
SELECT pg_temp.expect_error($q$SELECT public.prepare_media_upload('40000000-0000-0000-0000-000000000002','product_image','30000000-0000-0000-0000-000000000001',null,null,51,'image/png','b.png')$q$,'54000');
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.expect_error($q$SELECT public.claim_media_upload(current_setting('media.test_session')::uuid)$q$,'42501');
SELECT pg_temp.expect_error($q$SELECT public.prepare_media_upload(gen_random_uuid(),'product_image','30000000-0000-0000-0000-000000000001',null,null,10,'image/png','b.png')$q$,'42501');
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SELECT set_config('media.test_lease',public.claim_media_upload(current_setting('media.test_session')::uuid)->>'lease',true);
SELECT pg_temp.expect_error($q$SELECT public.claim_media_upload(current_setting('media.test_session')::uuid)$q$,'PT409');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.expect_error($q$SELECT public.finish_media_upload(current_setting('media.test_session')::uuid,gen_random_uuid(),'10000000-0000-0000-0000-000000000001',repeat('a',64),2,2)$q$,'42501');
SELECT set_config('media.test_asset',public.finish_media_upload(current_setting('media.test_session')::uuid,current_setting('media.test_lease')::uuid,'10000000-0000-0000-0000-000000000001',repeat('a',64),2,2)::text,true);
SELECT pg_temp.assert(public.finish_media_upload(current_setting('media.test_session')::uuid,current_setting('media.test_lease')::uuid,'10000000-0000-0000-0000-000000000001',repeat('a',64),2,2)::text=current_setting('media.test_asset'),'idempotent finalize');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.assert(public.resolve_media_asset(current_setting('media.test_asset')::uuid) IS NULL,'draft is private');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.expect_error($q$INSERT INTO public.product_media(product_id,image_url,media_asset_id) VALUES ('30000000-0000-0000-0000-000000000001','https://example.test/a.png',current_setting('media.test_asset')::uuid)$q$,'23514');
SELECT pg_temp.expect_error($q$INSERT INTO public.product_media(product_id,media_asset_id) VALUES ('30000000-0000-0000-0000-000000000002',current_setting('media.test_asset')::uuid)$q$,'42501');
INSERT INTO public.product_media(product_id,media_asset_id) VALUES ('30000000-0000-0000-0000-000000000001',current_setting('media.test_asset')::uuid);
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.assert((public.resolve_media_asset(current_setting('media.test_asset')::uuid)->>'public')::boolean,'attached active product public');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
UPDATE public.product SET status='inactive' WHERE id='30000000-0000-0000-0000-000000000001';
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.assert(public.resolve_media_asset(current_setting('media.test_asset')::uuid) IS NULL,'unpublished product hidden');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
DELETE FROM public.product_media WHERE media_asset_id=current_setting('media.test_asset')::uuid;
SELECT pg_temp.assert((SELECT state='pending_delete' FROM public.media_upload_session WHERE id=current_setting('media.test_session')::uuid),'detach queues retention');
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.claim_media_cleanup()),'retention prevents cleanup');
UPDATE public.media_upload_session SET expires_at=now()-interval '1 second',lease_until=null WHERE id=current_setting('media.test_session')::uuid;
UPDATE public.media_asset SET retention_until=now()-interval '1 second',legal_hold=true WHERE id=current_setting('media.test_asset')::uuid;
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.claim_media_cleanup()),'legal hold prevents cleanup');
UPDATE public.media_asset SET legal_hold=false WHERE id=current_setting('media.test_asset')::uuid;
SELECT set_config('media.test_cleanup',(SELECT x->>'lease' FROM public.claim_media_cleanup() x),true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.prepare_media_upload(gen_random_uuid(),'product_image','30000000-0000-0000-0000-000000000001',null,null,51,'image/png','b.png')$q$,'54000');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT public.finish_media_cleanup(current_setting('media.test_session')::uuid,current_setting('media.test_cleanup')::uuid);
RESET ROLE;
SELECT pg_temp.assert((SELECT state='deleted' FROM public.media_upload_session WHERE id=current_setting('media.test_session')::uuid),'quota released only after cleanup');
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert(public.prepare_media_upload(gen_random_uuid(),'product_image','30000000-0000-0000-0000-000000000001',null,null,150,'image/png','b.png') IS NOT NULL,'freed quota reusable');
RESET ROLE;
-- Assigned service staff and actual customer ownership on private evidence.
UPDATE pawpal_private.media_settings SET max_storage_bytes=1000;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT set_config('media.care_session',public.prepare_media_upload(gen_random_uuid(),'care_log_image',null,'70000000-0000-0000-0000-000000000001',null,100,'image/png','care.png')->>'session_id',true);
SELECT set_config('media.care_lease',public.claim_media_upload(current_setting('media.care_session')::uuid)->>'lease',true);
RESET ROLE;
UPDATE public.staff SET employment_status='inactive' WHERE id='20000000-0000-0000-0000-000000000002';
SET LOCAL ROLE service_role;
SELECT pg_temp.expect_error($q$SELECT public.finish_media_upload(current_setting('media.care_session')::uuid,current_setting('media.care_lease')::uuid,'10000000-0000-0000-0000-000000000002',repeat('b',64),2,2)$q$,'42501');
RESET ROLE;
UPDATE public.staff SET employment_status='active' WHERE id='20000000-0000-0000-0000-000000000002';
SET LOCAL ROLE service_role;
SELECT set_config('media.care_asset',public.finish_media_upload(current_setting('media.care_session')::uuid,current_setting('media.care_lease')::uuid,'10000000-0000-0000-0000-000000000002',repeat('b',64),2,2)::text,true);
RESET ROLE;
INSERT INTO public.care_log_media(care_log_id,media_type,file_name,file_size,staff_id,media_asset_id) VALUES
 ('80000000-0000-0000-0000-000000000001','image','care.png',100,'20000000-0000-0000-0000-000000000002',current_setting('media.care_asset')::uuid);
SELECT pg_temp.assert((SELECT legal_hold FROM public.media_asset WHERE id=current_setting('media.care_asset')::uuid),'evidence protected from cleanup');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.assert(public.resolve_media_asset(current_setting('media.care_asset')::uuid) IS NOT NULL,'owner reads care evidence');
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
SELECT pg_temp.assert(public.resolve_media_asset(current_setting('media.care_asset')::uuid) IS NULL,'other customer denied care evidence');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.assert(public.resolve_media_asset(current_setting('media.care_asset')::uuid) IS NULL,'anonymous denied care evidence');
RESET ROLE;
ROLLBACK;
SELECT 'MEDIA_DATABASE_CHECKS_PASS';
