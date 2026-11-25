-- Stage 2. Apply to an isolated test database first; production cutover is stage 6.
-- No Auth unlock, password reset or automatic STAFF assignment.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('pawpal-fixed-roles-v1',165));
-- BEGIN reviewed function fingerprints
DO $baseline$ DECLARE expected record; actual regprocedure; BEGIN
 FOR expected IN SELECT * FROM (VALUES
  ('pawpal_private.has_permission(text)','93f4b51c3d65238999fd45d8737ff5f2'),
  ('public.act_admin_chat(uuid,uuid,timestamp with time zone,text,text)','446d746612b6c3a0f6e602a0f079daf0'),
  ('public.act_admin_complaint(uuid,uuid,timestamp with time zone,text,jsonb)','be372988f112d072669535b6516219ac'),
  ('public.add_customer_pet(uuid,uuid,text,uuid,numeric,text,text,text)','8da640dbf2b182da5edcb54b704c3286'),
  ('public.admin_service_staff_candidates()','08d42e7b7a8c07c0a43afc512e21dac1'),
  ('public.close_admin_hotel_stay(uuid,timestamp with time zone)','f812ff69618418d1d1c40ad6fddec902'),
  ('public.create_admin_complaint(uuid,uuid,uuid,uuid,text,text,text,text)','c571bc6cbe2f3ea875579edd7f8a500e'),
  ('public.create_admin_logistics_booking(uuid,jsonb)','ecf5aa251b5a0ccd7b89a5eddf41ad94'),
  ('public.create_admin_sales_order(uuid,uuid,text,jsonb,jsonb)','d190084fbdcc2421006036ba49f9ff57'),
  ('public.create_admin_service_booking(uuid,jsonb)','a84e756684bc5402276fbd37237dfea0'),
  ('public.create_admin_service_ticket(uuid,uuid,uuid,text)','d1e342ccddda39e387b1eab6100d03f2'),
  ('public.create_admin_staff_profile(uuid,uuid,uuid,jsonb,text[],text[])','f5ec9e389eb4420f6348034781d73222'),
  ('public.create_chat_complaint(uuid,uuid,timestamp with time zone,uuid,text,text,text)','22b6b4ca91b7c2eaee104da717c0a326'),
  ('public.create_customer_quick(text,text,text,text,text,uuid,numeric)','129b0a79e0d6a8c62fb105b5a0e2ceeb'),
  ('public.get_admin_sales_cashier(uuid)','3591d732205a0b547dd04a928a4eb1c7'),
  ('public.get_admin_service_cashier(uuid)','790ab1f2f9dbd6830bc01d8888361630'),
  ('public.get_staff_login_context()','85f6d2c67325c118bd6a53504d720298'),
  ('public.post_admin_sales_money(uuid,uuid,text,text,jsonb)','cc89ac2e1a6b0787e5403020ba5b995a'),
  ('public.post_admin_service_money(uuid,uuid,text,text,jsonb)','7cbb2b1c50e6c328855721cc0c292348'),
  ('public.quote_admin_sales_order(uuid,jsonb,jsonb)','8f8eef8da65171d1c0fde53b8426368b'),
  ('public.record_admin_pet_weight(uuid,timestamp with time zone,uuid,numeric,text)','7b1b09d8d666cf2658833a429f4eb631'),
  ('public.resolve_admin_chat(uuid,uuid,timestamp with time zone,text,text,boolean)','ab055058ed8aa57b26bea13afb6bf4de'),
  ('public.save_admin_pet(uuid,timestamp with time zone,jsonb,numeric)','17aa6a837b8753e4ed5b4757900dcece'),
  ('public.save_admin_pickup_notification(uuid,uuid,timestamp with time zone,text,boolean)','cc86087aadced10bd90c52068bbc4f96'),
  ('public.save_admin_service_care_log(uuid,uuid,timestamp with time zone,timestamp with time zone,text,jsonb)','004ddd681e9675e69e8eedd676f5d7f1'),
  ('public.save_admin_service_record(uuid,uuid,timestamp with time zone,text,jsonb)','bc72895e8ccaf3d023a0688f63326294'),
  ('public.save_customer_note(uuid,timestamp with time zone,text)','48ef6467c8b3d85f1a2a18ff7f4f33dd'),
  ('public.set_admin_staff_access(uuid,uuid,timestamp with time zone,text[],text[],text)','d6409e4691f49682c6dc881438b2e57c'),
  ('public.update_admin_service_booking(uuid,timestamp with time zone,text,text,text)','f664d7767a8bc5f46ad0f0a5a44f4e4e'),
  ('public.update_customer_pet(uuid,uuid,timestamp with time zone,text,uuid,numeric,text,text,text)','949d1ca7a0a7c53e89153e0e7429626c'),
  ('public.update_customer_profile(uuid,timestamp with time zone,text,text,text,text,date,uuid,jsonb)','ad87e48306b4d09f80934a5d29918b45')
 ) fingerprints(signature,fingerprint) LOOP
  actual:=to_regprocedure(expected.signature);
  IF actual IS NULL OR md5(pg_get_functiondef(actual))<>expected.fingerprint THEN
   RAISE EXCEPTION 'fixed_roles_source_changed: %',expected.signature;
  END IF;
 END LOOP;
END $baseline$;
-- END reviewed function fingerprints
CREATE TABLE IF NOT EXISTS pawpal_private.access_migration_backup (
 version integer NOT NULL,kind text NOT NULL,key text NOT NULL,payload jsonb NOT NULL,
 PRIMARY KEY(version,kind,key)
);
REVOKE ALL ON pawpal_private.access_migration_backup FROM PUBLIC,anon,authenticated,service_role;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pawpal_private.access_migration_backup WHERE version=165) THEN
  RAISE EXCEPTION 'fixed_roles_already_applied'; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_role WHERE role_code NOT IN ('ADMIN','STAFF'))
 OR EXISTS(SELECT 1 FROM public.staff_role GROUP BY staff_id HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM public.staff_permission)
 OR EXISTS(SELECT 1 FROM public.access_role WHERE code<>'ADMIN')
 OR NOT EXISTS(SELECT 1 FROM public.access_role WHERE code='ADMIN')
 OR EXISTS(SELECT 1 FROM public.permission WHERE code LIKE 'work.%') THEN RAISE EXCEPTION 'fixed_roles_review_existing_access'; END IF;
 IF EXISTS(SELECT 1 FROM public.staff WHERE employment_status NOT IN ('active','leave','paused','resigned','ACTIVE','LEAVE','PAUSED','RESIGNED')) THEN
  RAISE EXCEPTION 'fixed_roles_review_unknown_employment_status'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
 AND ((c.relkind IN ('r','p') AND NOT c.relrowsecurity) OR (c.relkind='v' AND NOT coalesce(c.reloptions @> ARRAY['security_invoker=true'],false)) OR c.relkind='m')
 AND (has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') OR has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE'))) THEN
  RAISE EXCEPTION 'fixed_roles_review_unprotected_relation'; END IF;
END $$;
INSERT INTO pawpal_private.access_migration_backup
SELECT 165,'role',code,to_jsonb(r) FROM public.access_role r;
INSERT INTO pawpal_private.access_migration_backup
SELECT 165,'staff_status',id::text,jsonb_build_object('status',employment_status) FROM public.staff;
INSERT INTO pawpal_private.access_migration_backup
SELECT 165,'role_permission',role_code||':'||permission_code,to_jsonb(r) FROM public.role_permission r;
INSERT INTO pawpal_private.access_migration_backup
SELECT 165,'permission',code,to_jsonb(p) FROM public.permission p;
INSERT INTO pawpal_private.access_migration_backup
SELECT 165,'function',p.oid::regprocedure::text,jsonb_build_object('definition',pg_get_functiondef(p.oid),
 'acl',coalesce((SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'grantable',x.is_grantable)) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.privilege_type='EXECUTE'),'[]'::jsonb))
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind='f'
AND (n.nspname='public' OR n.nspname='pawpal_private' AND p.proname='has_permission');
INSERT INTO pawpal_private.access_migration_backup
SELECT 165,'schedule_policy',policyname,to_jsonb(p) FROM pg_policies p
WHERE schemaname='public' AND tablename='staff_schedule' AND policyname='anon_read_staff_schedule';
INSERT INTO pawpal_private.access_migration_backup VALUES(165,'grants','before',jsonb_build_object(
 'schedule_anon_select',has_table_privilege('anon','public.staff_schedule','SELECT'),
 'staff_id_update',has_column_privilege('authenticated','public.staff','id','UPDATE'),
 'schema_anon_usage',has_schema_privilege('anon','pawpal_private','USAGE'),
 'schema_authenticated_usage',has_schema_privilege('authenticated','pawpal_private','USAGE')));

INSERT INTO public.access_role(code,role_name) VALUES('STAFF','Nhân viên')
ON CONFLICT(code) DO UPDATE SET role_name=EXCLUDED.role_name;
UPDATE public.access_role SET role_name='Quản lý' WHERE code='ADMIN';
INSERT INTO public.permission(code,description) SELECT code,description FROM (VALUES
 ('work.customer.read','Tra cứu khách hàng phục vụ công việc'),('work.customer.write','Thêm và cập nhật liên hệ khách hàng'),
 ('work.pet.read','Tra cứu hồ sơ thú cưng'),('work.pet.write','Thêm và cập nhật thông tin thú cưng'),
 ('work.booking.create','Tạo lịch hẹn theo quy trình'),('work.service.perform','Thực hiện ca dịch vụ được giao'),
 ('work.sales.create','Báo giá và tạo đơn theo giá máy chủ'),('work.cashier.collect','Thu tiền theo đơn hoặc ca'),
 ('work.stock.read','Tra cứu giá bán và tồn kho'),('work.chat.handle','Tiếp nhận và xử lý hội thoại của mình'),
 ('work.complaint.handle','Tiếp nhận và đề xuất xử lý phiếu được giao'),('work.self.read','Xem hồ sơ và công việc cá nhân'),
 ('work.copilot.use','Dùng trợ lý trong phạm vi vai trò')
) t(code,description) ON CONFLICT(code) DO UPDATE SET description=EXCLUDED.description;
DELETE FROM public.role_permission WHERE role_code='STAFF';
INSERT INTO public.role_permission(role_code,permission_code)
SELECT r.code,p.code FROM public.access_role r CROSS JOIN public.permission p
WHERE r.code IN ('ADMIN','STAFF') AND p.code LIKE 'work.%' ON CONFLICT DO NOTHING;
ALTER TABLE public.staff_role ADD CONSTRAINT v165_one_staff_role UNIQUE(staff_id);
ALTER TABLE public.staff_role ADD CONSTRAINT v165_known_staff_role CHECK(role_code IN ('ADMIN','STAFF'));
ALTER TABLE public.staff_permission ADD CONSTRAINT v165_no_personal_permission CHECK(false);
UPDATE public.staff SET employment_status=lower(employment_status)
WHERE employment_status IN ('ACTIVE','LEAVE','PAUSED','RESIGNED');

CREATE OR REPLACE FUNCTION pawpal_private.work_actor() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT s.id FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id
 WHERE s.auth_user_id=auth.uid() AND s.employment_status='active' AND NOT s.must_change_password
 AND coalesce(u.banned_until<=now(),true)
 AND (SELECT count(*) FROM public.staff_role r WHERE r.staff_id=s.id)=1
 AND EXISTS(SELECT 1 FROM public.staff_role r WHERE r.staff_id=s.id AND r.role_code IN ('ADMIN','STAFF'))
$$;
CREATE OR REPLACE FUNCTION pawpal_private.work_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=pawpal_private.work_actor() AND role_code='ADMIN')
$$;
CREATE OR REPLACE FUNCTION pawpal_private.work_is_staff_identity() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid())
$$;
CREATE OR REPLACE FUNCTION pawpal_private.has_permission(required_code text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff_role sr JOIN public.role_permission rp ON rp.role_code=sr.role_code
 WHERE sr.staff_id=pawpal_private.work_actor() AND rp.permission_code=required_code)
$$;
REVOKE ALL ON FUNCTION pawpal_private.work_actor(),pawpal_private.work_is_admin(),pawpal_private.work_is_staff_identity() FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA pawpal_private TO anon,authenticated;
GRANT EXECUTE ON FUNCTION pawpal_private.work_is_admin(),pawpal_private.work_is_staff_identity() TO anon,authenticated;
-- All direct access by staff identities remains administrative. Workers use projections/RPCs.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity LOOP
  EXECUTE format('CREATE POLICY v165_staff_boundary ON public.%I AS RESTRICTIVE FOR ALL TO anon,authenticated USING (NOT pawpal_private.work_is_staff_identity() OR pawpal_private.work_is_admin()) WITH CHECK (NOT pawpal_private.work_is_staff_identity() OR pawpal_private.work_is_admin())',t.relname);
 END LOOP;
END $$;
DROP POLICY IF EXISTS anon_read_staff_schedule ON public.staff_schedule;
REVOKE SELECT ON public.staff_schedule FROM anon;
REVOKE UPDATE(id) ON public.staff FROM authenticated;

CREATE TABLE pawpal_private.work_rpc_catalog(name text PRIMARY KEY,permission_code text NOT NULL);
REVOKE ALL ON pawpal_private.work_rpc_catalog FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO pawpal_private.work_rpc_catalog VALUES
 ('create_customer_quick','work.customer.write'),('update_customer_profile','work.customer.write'),('save_customer_note','work.customer.write'),
 ('add_customer_pet','work.pet.write'),('update_customer_pet','work.pet.write'),('save_admin_pet','work.pet.write'),('record_admin_pet_weight','work.pet.write'),
 ('create_admin_service_booking','work.booking.create'),('create_admin_logistics_booking','work.booking.create'),
 ('admin_service_staff_candidates','work.booking.create'),
 ('update_admin_service_booking','work.service.perform'),('save_admin_service_record','work.service.perform'),
 ('save_admin_service_care_log','work.service.perform'),('close_admin_hotel_stay','work.service.perform'),('save_admin_pickup_notification','work.service.perform'),
 ('quote_admin_sales_order','work.sales.create'),('create_admin_sales_order','work.sales.create'),
 ('get_admin_sales_cashier','work.cashier.collect'),('get_admin_service_cashier','work.cashier.collect'),
 ('post_admin_sales_money','work.cashier.collect'),('post_admin_service_money','work.cashier.collect'),
 ('act_admin_chat','work.chat.handle'),('resolve_admin_chat','work.chat.handle'),
 ('create_chat_complaint','work.complaint.handle'),
 ('create_admin_complaint','work.complaint.handle'),('create_admin_service_ticket','work.complaint.handle'),('act_admin_complaint','work.complaint.handle');

CREATE OR REPLACE FUNCTION pawpal_private.work_rpc_permission(fn text,required_code text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT pawpal_private.has_permission(required_code) OR EXISTS(
 SELECT 1 FROM pawpal_private.work_rpc_catalog c WHERE c.name=fn AND pawpal_private.has_permission(c.permission_code))
$$;
CREATE OR REPLACE FUNCTION pawpal_private.work_owns_appointment(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=target AND (
 a.staff_id=pawpal_private.work_actor()
 OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=pawpal_private.work_actor())
 OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=pawpal_private.work_actor())))
$$;

CREATE OR REPLACE FUNCTION pawpal_private.work_guard_rpc(fn text,args jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor(); target uuid; old_owner uuid; old_status text; existing_tier uuid; wanted_tier uuid;
BEGIN
 IF pawpal_private.work_is_admin() THEN RETURN; END IF;
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM pawpal_private.work_rpc_catalog c WHERE c.name=fn AND pawpal_private.has_permission(c.permission_code)) THEN
  RAISE EXCEPTION 'work_access_forbidden' USING ERRCODE='42501'; END IF;
 IF fn IN ('post_admin_sales_money','post_admin_service_money') AND args->>'p_action' IS DISTINCT FROM 'collect' THEN
  RAISE EXCEPTION 'work_collect_only' USING ERRCODE='42501'; END IF;
 IF fn='update_customer_profile' THEN
  SELECT membership_tier_id INTO existing_tier FROM public.customer_membership WHERE customer_id=(args->>'p_customer_id')::uuid;
  wanted_tier:=nullif(args->>'p_tier_id','')::uuid;
  IF wanted_tier IS DISTINCT FROM existing_tier THEN RAISE EXCEPTION 'work_tier_change_forbidden' USING ERRCODE='42501'; END IF;
 END IF;
 IF fn='save_admin_pet' THEN
  IF coalesce(args->'p_details'->>'status','active')<>'active' THEN RAISE EXCEPTION 'work_pet_archive_forbidden' USING ERRCODE='42501'; END IF;
  SELECT customer_id,status INTO old_owner,old_status FROM public.pet_profile WHERE id=(args->>'p_pet_id')::uuid FOR UPDATE;
  IF old_status IS NOT NULL AND old_status<>coalesce(args->'p_details'->>'status','active') THEN
   RAISE EXCEPTION 'work_pet_status_change_forbidden' USING ERRCODE='42501'; END IF;
  IF old_owner IS NOT NULL AND nullif(args->'p_details'->>'customer_id','')::uuid IS DISTINCT FROM old_owner THEN
   RAISE EXCEPTION 'work_pet_owner_change_forbidden' USING ERRCODE='42501'; END IF;
 END IF;
 IF fn IN ('update_admin_service_booking','save_admin_service_record','save_admin_service_care_log','close_admin_hotel_stay',
 'save_admin_pickup_notification','get_admin_service_cashier','post_admin_service_money','create_admin_service_ticket') THEN
  target:=coalesce(nullif(args->>'p_appointment_id','')::uuid,nullif(args->>'p_id','')::uuid);
  PERFORM 1 FROM public.staff WHERE id=actor FOR UPDATE;
  PERFORM 1 FROM public.appointment WHERE id=target FOR UPDATE;
  IF NOT pawpal_private.work_owns_appointment(target) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  IF fn='update_admin_service_booking' AND (args->>'p_action' IS DISTINCT FROM 'status' OR args->>'p_value' IS DISTINCT FROM 'checked_in') THEN
   RAISE EXCEPTION 'work_booking_action_forbidden' USING ERRCODE='42501'; END IF;
  IF fn='save_admin_service_care_log' AND args->>'p_action' IS DISTINCT FROM 'save' THEN
   RAISE EXCEPTION 'work_log_delete_forbidden' USING ERRCODE='42501'; END IF;
  -- Intake changes the primary line; handover completes all lines. Do not overwrite a co-worker's work.
  IF fn='save_admin_service_record' AND args->>'p_type'='intake' AND nullif(args->'p_details'->>'staffId','')::uuid IS DISTINCT FROM actor THEN
   RAISE EXCEPTION 'work_performer_mismatch' USING ERRCODE='42501'; END IF;
  IF fn='save_admin_service_record' AND EXISTS(SELECT 1 FROM public.appointment_item WHERE appointment_id=target
   AND staff_id IS NOT NULL AND staff_id<>actor AND status NOT IN ('completed','cancelled')
   AND (args->>'p_type'='handover' OR is_primary)) THEN
   RAISE EXCEPTION 'work_shared_appointment_requires_lead' USING ERRCODE='42501'; END IF;
  IF fn='save_admin_service_care_log' AND EXISTS(SELECT 1 FROM public.care_log WHERE id=(args->>'p_id')::uuid AND recorded_by IS DISTINCT FROM actor) THEN
   RAISE EXCEPTION 'work_log_owner_required' USING ERRCODE='42501'; END IF;
  IF fn='close_admin_hotel_stay' AND NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=target AND staff_id=actor) THEN
   RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  IF fn IN ('save_admin_service_record','save_admin_service_care_log','update_admin_service_booking','save_admin_pickup_notification')
   AND EXISTS(SELECT 1 FROM public.taxi_trip WHERE appointment_id=target AND driver_staff_id IS DISTINCT FROM actor) THEN
   RAISE EXCEPTION 'work_driver_assignment_required' USING ERRCODE='42501'; END IF;
 END IF;
 IF fn IN ('act_admin_chat','resolve_admin_chat','create_chat_complaint') THEN
  target:=(args->>'p_conversation_id')::uuid;
  PERFORM 1 FROM public.chat_conversation WHERE id=target FOR UPDATE;
  IF fn='act_admin_chat' AND args->>'p_action'='take' THEN
   IF NOT EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=target AND (assigned_staff_id IS NULL OR assigned_staff_id=actor)) THEN
    RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=target AND assigned_staff_id=actor) THEN
   RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501';
  END IF;
 END IF;
 IF fn='act_admin_complaint' THEN
  target:=(args->>'p_ticket_id')::uuid;
  PERFORM 1 FROM public.support_ticket WHERE id=target FOR UPDATE;
  IF args->>'p_action' NOT IN ('message','request_info','propose') OR args->>'p_action' IS NULL
  OR NOT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=target AND assigned_staff_id=actor) THEN
   RAISE EXCEPTION 'work_complaint_action_forbidden' USING ERRCODE='42501'; END IF;
 END IF;
 IF fn='create_admin_complaint' AND nullif(args->>'p_appointment_id','') IS NOT NULL
 AND NOT pawpal_private.work_owns_appointment((args->>'p_appointment_id')::uuid) THEN
  RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.work_rpc_permission(text,text),pawpal_private.work_owns_appointment(uuid),pawpal_private.work_guard_rpc(text,jsonb) FROM PUBLIC,anon,authenticated;

-- Adapt reviewed business transactions; retain original validation, locking and idempotency.
-- No temporary permission elevation or browser-supplied role/context flags.
DO $$ DECLARE f record; definition text; arglist text; patched text; BEGIN
 FOR f IN SELECT p.*,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 JOIN pawpal_private.work_rpc_catalog c ON c.name=p.proname WHERE n.nspname='public' AND p.prokind='f' LOOP
  IF (SELECT lanname FROM pg_language WHERE oid=f.prolang)<>'plpgsql' THEN RAISE EXCEPTION 'work_rpc_language_review_required: %',f.proname; END IF;
  SELECT string_agg(format('%L,to_jsonb(%I)',arg,arg),',') INTO arglist
  FROM unnest(f.proargnames[1:f.pronargs]) WITH ORDINALITY names(arg,ord);
  definition:=pg_get_functiondef(f.oid);
  definition:=replace(definition,'pawpal_private.has_permission(',format('pawpal_private.work_rpc_permission(%L,',f.proname));
  patched:=regexp_replace(definition,E'\n[ \t]*BEGIN[ \t\r]*\n',E'\nBEGIN\n'||format(' PERFORM pawpal_private.work_guard_rpc(%L,jsonb_build_object(%s));',f.proname,arglist)||E'\n'||
   CASE WHEN f.proname='admin_service_staff_candidates' THEN
   $projection$ IF NOT pawpal_private.work_is_admin() THEN
    RETURN coalesce((SELECT jsonb_agg(to_jsonb(candidate)) FROM (
     SELECT id,full_name,job_title,staff_level_id FROM public.staff
     WHERE employment_status='active' AND NOT service_locked AND pawpal_private.staff_skill_allows_assignment(id)
     ORDER BY full_name,id LIMIT 100) candidate),'[]'::jsonb);
   END IF;
   $projection$ ELSE '' END);
  IF patched=definition THEN RAISE EXCEPTION 'work_rpc_entry_review_required: %',f.proname; END IF;
  EXECUTE patched;
  EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER',f.oid::regprocedure);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',f.oid::regprocedure);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.oid::regprocedure);
 END LOOP;
 IF EXISTS(SELECT 1 FROM pawpal_private.work_rpc_catalog c WHERE NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=c.name)) THEN
  RAISE EXCEPTION 'work_rpc_missing'; END IF;
END $$;

-- The existing guarded account workflow remains the only writer, now single-role and no overrides.
DO $$ DECLARE f record; definition text; BEGIN
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
 AND p.proname IN ('set_admin_staff_access','create_admin_staff_profile') LOOP
  definition:=pg_get_functiondef(f.oid);
  definition:=regexp_replace(definition,E'\n[ \t]*BEGIN[ \t\r]*\n',E'\nBEGIN\n'||E' IF cardinality(p_roles) IS DISTINCT FROM 1 OR p_roles[1] NOT IN (\'ADMIN\',\'STAFF\') OR p_roles[1] IS NULL OR cardinality(p_permissions) IS DISTINCT FROM 0 THEN RAISE EXCEPTION \'invalid_staff_access\' USING ERRCODE=\'22023\'; END IF;\n');
  EXECUTE definition;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_staff_login_context() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE person public.staff; roles text[]; codes text[]; active_account boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO person FROM public.staff WHERE auth_user_id=auth.uid();
 IF NOT FOUND THEN RETURN jsonb_build_object('is_staff',false,'is_active',false,'staff',NULL); END IF;
 SELECT coalesce(array_agg(role_code ORDER BY role_code),'{}'::text[]) INTO roles FROM public.staff_role WHERE staff_id=person.id;
 SELECT person.employment_status='active' AND coalesce(u.banned_until<=now(),true) INTO active_account FROM auth.users u WHERE u.id=auth.uid();
 SELECT coalesce(array_agg(rp.permission_code ORDER BY rp.permission_code),'{}'::text[]) INTO codes
 FROM public.role_permission rp WHERE rp.role_code=ANY(roles);
 IF NOT coalesce(active_account,false) OR person.must_change_password OR cardinality(roles)<>1 OR roles[1] NOT IN ('ADMIN','STAFF') THEN codes:='{}'::text[]; END IF;
 RETURN jsonb_build_object('is_staff',true,'is_active',coalesce(active_account,false),'staff',
 jsonb_build_object('id',person.id,'auth_user_id',person.auth_user_id,'full_name',person.full_name,'email',person.email,
 'phone_number',person.phone_number,'job_title',person.job_title,'specialization',person.specialization,
 'employment_status',person.employment_status,'must_change_password',person.must_change_password,'access_roles',roles,'permission_codes',codes));
END $$;
REVOKE ALL ON FUNCTION public.get_staff_login_context() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_login_context() TO authenticated;

-- Projected reads for phase 3; no SELECT of the underlying money/staff/cost tables is granted to workers.
CREATE OR REPLACE FUNCTION public.get_staff_workspace(p_kind text,p_query text DEFAULT '',p_id uuid DEFAULT NULL,p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor(); rows jsonb; offset_value integer; query_text text:=btrim(coalesce(p_query,''));
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'work_access_forbidden' USING ERRCODE='42501'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 1000 OR length(query_text)>120 THEN RAISE EXCEPTION 'invalid_work_query' USING ERRCODE='22023'; END IF;
 offset_value:=(p_page-1)*10;
 IF p_kind='self' THEN
  SELECT jsonb_build_array(jsonb_build_object('id',id,'full_name',full_name,'phone_number',phone_number,'email',email,'job_title',job_title,'specialization',specialization,'employment_status',employment_status)) INTO rows FROM public.staff WHERE id=actor;
 ELSIF p_kind='schedule' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,start_at,end_at,availability_status,schedule_status,reason FROM public.staff_schedule WHERE staff_id=actor ORDER BY start_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='assessment' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,assessment_date,assessment_type,score,result,note FROM public.staff_assessment WHERE staff_id=actor ORDER BY assessment_date DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='appointments' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT a.id,a.appointment_code,a.customer_id,a.pet_id,a.scheduled_start_at,a.scheduled_end_at,a.appointment_status,a.updated_at FROM public.appointment a WHERE pawpal_private.work_owns_appointment(a.id) AND (p_id IS NULL OR a.id=p_id) ORDER BY a.scheduled_start_at DESC,a.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='customers' THEN
  IF p_id IS NULL AND length(query_text)<3 THEN RAISE EXCEPTION 'work_search_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT c.id,c.customer_code,c.contact_email,c.updated_at,p.full_name,p.gender,p.date_of_birth,
   (SELECT membership_tier_id FROM public.customer_membership WHERE customer_id=c.id) membership_tier_id,
   (SELECT phone_number FROM public.customer_phone WHERE customer_id=c.id AND is_primary LIMIT 1) phone_number
   FROM public.customer c JOIN public.customer_profile p ON p.customer_id=c.id WHERE (p_id IS NULL OR c.id=p_id)
   AND (p_id IS NOT NULL OR strpos(lower(p.full_name||' '||c.customer_code),lower(query_text))>0 OR EXISTS(SELECT 1 FROM public.customer_phone ph WHERE ph.customer_id=c.id AND strpos(ph.phone_number,query_text)>0))
   ORDER BY p.full_name,c.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='addresses' THEN
  IF p_id IS NULL THEN RAISE EXCEPTION 'work_customer_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,customer_id,receiver_name,receiver_phone,province,street_address,postal_code,is_default
   FROM public.customer_address WHERE customer_id=p_id ORDER BY is_default DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='pets' THEN
  IF p_id IS NULL AND length(query_text)<3 THEN RAISE EXCEPTION 'work_search_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT p.id,p.pet_code,p.customer_id,p.pet_name,p.gender,p.date_of_birth,p.color,p.routine,p.allergy,p.safety_note,p.breed_id,p.updated_at,
   (SELECT weight FROM public.pet_current_weight WHERE pet_id=p.id) current_weight FROM public.pet_profile p
   WHERE (p_id IS NULL OR p.id=p_id OR p.customer_id=p_id) AND (p_id IS NOT NULL OR strpos(lower(p.pet_name||' '||p.pet_code),lower(query_text))>0) ORDER BY p.pet_name,p.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='stock' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT v.id,v.product_id,p.product_name,v.sku_variant,v.sale_price,coalesce(i.quantity_in_stock,0) quantity_in_stock
   FROM public.product_variant v JOIN public.product p ON p.id=v.product_id LEFT JOIN public.inventory i ON i.product_variant_id=v.id
   WHERE v.status='active' AND p.status='active' AND (query_text='' OR strpos(lower(p.product_name||' '||v.sku_variant),lower(query_text))>0)
   ORDER BY p.product_name,v.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='services' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT s.id,s.service_code,s.service_name,s.estimated_duration,c.category_code,s.staff_level_required_id
   FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.status='active'
   AND (query_text='' OR strpos(lower(s.service_name||' '||s.service_code),lower(query_text))>0) ORDER BY s.service_name,s.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='service_prices' THEN
  IF p_id IS NULL THEN RAISE EXCEPTION 'work_service_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,service_id,weight_from,weight_to,unit_price,duration_minutes
   FROM public.service_price_matrix WHERE service_id=p_id AND status='active' AND effective_from<=now() AND (effective_to IS NULL OR effective_to>now()) ORDER BY weight_from,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='breeds' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT b.id,b.breed_name,b.species_id,s.species_name
   FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.is_active AND s.is_active AND (query_text='' OR strpos(lower(b.breed_name),lower(query_text))>0) ORDER BY b.breed_name,b.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='points' THEN
  IF p_id IS NULL THEN RAISE EXCEPTION 'work_customer_required' USING ERRCODE='22023'; END IF;
  SELECT jsonb_build_array(jsonb_build_object('customer_id',p_id,'points',coalesce(sum(points),0))) INTO rows FROM public.paw_point_transaction WHERE customer_id=p_id;
 ELSIF p_kind='offers' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,voucher_code,type,discount_value,minimum_order_amount,required_points,start_date,end_date,applicable_for
   FROM public.voucher WHERE is_active AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date ORDER BY end_date,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='payment_methods' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,name FROM public.payment_method_config WHERE available AND fee=0 AND name IN ('Tiền mặt','Chuyển khoản ngân hàng','Quét mã VietQR') ORDER BY name,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='service_items' THEN
  IF NOT pawpal_private.work_owns_appointment(p_id) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT i.id,i.appointment_id,i.service_id,i.name_snapshot,i.staff_id,i.status,i.updated_at
   FROM public.appointment_item i WHERE i.appointment_id=p_id AND (i.staff_id=actor OR i.staff_id IS NULL AND EXISTS(SELECT 1 FROM public.appointment WHERE id=p_id AND staff_id=actor))
   ORDER BY i.is_primary DESC,i.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='service_records' THEN
  IF NOT pawpal_private.work_owns_appointment(p_id) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,record_type,revision_no,recorded_at,condition_note,safety_note_snapshot,allergy_note_snapshot,customer_confirmation_status
   FROM public.appointment_record WHERE appointment_id=p_id ORDER BY recorded_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='care_logs' THEN
  IF NOT pawpal_private.work_owns_appointment(p_id) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,action_name_snapshot,description,observed_condition,recorded_by,recorded_at,updated_at
   FROM public.care_log WHERE appointment_id=p_id ORDER BY recorded_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='hotel_rooms' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT r.id,r.room_number,r.room_type_id,t.room_type,t.daily_price,t.billing_minutes
   FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE r.status IN ('active','available') AND t.status='active' ORDER BY r.room_number,r.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='hotel_stays' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT h.id,h.appointment_id,h.booking_code,h.room_id,h.check_in_at,h.check_out_at,h.status,h.special_diet_notes,h.care_notes,h.updated_at
   FROM public.hotel_booking h WHERE pawpal_private.work_owns_appointment(h.appointment_id) AND (p_id IS NULL OR h.appointment_id=p_id) ORDER BY h.check_in_at DESC,h.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='taxi_prices' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,distance_from,distance_to,weight_from,weight_to,base_price,surcharge FROM public.taxi_price_rule
   WHERE status='active' AND effective_from<=now() AND (effective_to IS NULL OR effective_to>now()) ORDER BY distance_from,weight_from,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='taxi_trips' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,appointment_id,pickup_address,dropoff_address,distance_km,trip_type,outbound_at,return_at,status,updated_at
   FROM public.taxi_trip WHERE driver_staff_id=actor AND (p_id IS NULL OR appointment_id=p_id) ORDER BY outbound_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='order_lines' THEN
  IF p_id IS NULL THEN RAISE EXCEPTION 'work_order_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,order_id,product_name_snapshot,sku_snapshot,quantity,unit_price,discount_amount
   FROM public.sales_order_detail WHERE order_id=p_id ORDER BY id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='orders' THEN
  IF p_id IS NULL AND length(query_text)<3 THEN RAISE EXCEPTION 'work_search_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT o.id,o.order_code,o.customer_id,o.order_status,o.updated_at FROM public.sales_order o
   WHERE (p_id IS NOT NULL AND (o.id=p_id OR o.customer_id=p_id)) OR (p_id IS NULL AND lower(o.order_code)=lower(query_text)) ORDER BY o.created_at DESC,o.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='chat_queue' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,status,created_at FROM public.chat_conversation WHERE assigned_staff_id IS NULL AND status='waiting_agent' ORDER BY created_at,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='conversations' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,customer_id,status,ai_summary,internal_note,updated_at FROM public.chat_conversation WHERE assigned_staff_id=actor AND (p_id IS NULL OR id=p_id) ORDER BY updated_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='messages' THEN
  IF NOT EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=p_id AND assigned_staff_id=actor) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,sender_type,content,created_at FROM public.chat_message WHERE conversation_id=p_id ORDER BY created_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='complaints' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,ticket_code,customer_id,subject,status,priority,description,updated_at FROM public.support_ticket WHERE assigned_staff_id=actor AND (p_id IS NULL OR id=p_id) ORDER BY created_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='complaint_messages' THEN
  IF NOT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=p_id AND assigned_staff_id=actor) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,sender_type,content,is_internal,created_at FROM public.support_ticket_message
   WHERE ticket_id=p_id ORDER BY created_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSE RAISE EXCEPTION 'unsupported_work_kind' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('kind',p_kind,'page',p_page,'items',coalesce(rows,'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.get_staff_workspace(text,text,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_workspace(text,text,uuid,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.perform_staff_service_item(p_item uuid,p_expected_updated_at timestamptz,p_status text,p_note text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor(); item public.appointment_item; appointment public.appointment;
BEGIN
 IF actor IS NULL OR NOT pawpal_private.has_permission('work.service.perform') THEN RAISE EXCEPTION 'work_access_forbidden' USING ERRCODE='42501'; END IF;
 SELECT a.* INTO appointment FROM public.appointment a JOIN public.appointment_item i ON i.appointment_id=a.id WHERE i.id=p_item FOR UPDATE OF a;
 SELECT * INTO item FROM public.appointment_item WHERE id=p_item FOR UPDATE;
 IF item.id IS NULL OR NOT coalesce((pawpal_private.work_is_admin() OR item.staff_id=actor OR item.staff_id IS NULL AND appointment.staff_id=actor),false) THEN
  RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
 IF p_expected_updated_at IS NULL OR item.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'work_item_changed' USING ERRCODE='PT409'; END IF;
 IF appointment.appointment_status NOT IN ('checked_in','in_progress') OR p_status IS NULL
 OR NOT (item.status='pending' AND p_status='in_progress' OR item.status='in_progress' AND p_status='completed')
 OR length(coalesce(p_note,''))>2000 THEN RAISE EXCEPTION 'invalid_work_item_transition' USING ERRCODE='22023'; END IF;
 UPDATE public.appointment_item SET status=p_status WHERE id=item.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,'WORK_SERVICE_ITEM','appointment_item',item.id,jsonb_build_object('from',item.status,'to',p_status,'note',p_note)::text);
 RETURN item.id;
END $$;
REVOKE ALL ON FUNCTION public.perform_staff_service_item(uuid,timestamptz,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.perform_staff_service_item(uuid,timestamptz,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
