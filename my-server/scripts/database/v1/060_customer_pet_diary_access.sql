BEGIN;
DO $$ DECLARE source text; BEGIN
 source:=pg_get_functiondef('public.save_own_pet(uuid,timestamptz,jsonb,numeric)'::regprocedure);
 source:=replace(source,$old$customer_status='active' FOR UPDATE$old$, $new$customer_status='active' AND pawpal_private.owns_customer(id) FOR UPDATE$new$);
 EXECUTE source;
END $$;
DROP POLICY IF EXISTS own_customer_appointment ON public.appointment;
CREATE POLICY own_customer_appointment ON public.appointment FOR SELECT TO authenticated USING(pawpal_private.owns_customer(customer_id));
DROP POLICY IF EXISTS own_customer_appointment_item ON public.appointment_item;
CREATE POLICY own_customer_appointment_item ON public.appointment_item FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.appointment a WHERE a.id=appointment_id AND pawpal_private.owns_customer(a.customer_id)));
DROP POLICY IF EXISTS own_customer_care_log ON public.care_log;
CREATE POLICY own_customer_care_log ON public.care_log FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.appointment a WHERE a.id=appointment_id AND pawpal_private.owns_customer(a.customer_id)));
DROP POLICY IF EXISTS own_customer_care_media ON public.care_log_media;
CREATE POLICY own_customer_care_media ON public.care_log_media FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.care_log l JOIN public.appointment a ON a.id=l.appointment_id
 WHERE l.id=care_log_id AND pawpal_private.owns_customer(a.customer_id)));
GRANT SELECT ON public.appointment,public.appointment_item,public.care_log,public.care_log_media TO authenticated;

CREATE OR REPLACE FUNCTION public.change_own_pet_status(p_id uuid,p_expected timestamptz,p_restore boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; pet public.pet_profile;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
  RAISE EXCEPTION 'Phiên khách hàng không hợp lệ' USING ERRCODE='42501'; END IF;
 SELECT * INTO pet FROM public.pet_profile WHERE id=p_id AND customer_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ của chủ nuôi' USING ERRCODE='42501'; END IF;
 IF pet.updated_at IS DISTINCT FROM p_expected OR p_restore IS NULL THEN
  RAISE EXCEPTION 'Hồ sơ đã thay đổi. Vui lòng tải lại trước khi lưu' USING ERRCODE='PT409'; END IF;
 UPDATE public.pet_profile SET status=CASE WHEN p_restore THEN 'active' ELSE 'inactive' END WHERE id=pet.id;
 RETURN pet.id;
END $$;
REVOKE ALL ON FUNCTION public.change_own_pet_status(uuid,timestamptz,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.change_own_pet_status(uuid,timestamptz,boolean) TO authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['appointment','appointment_item','care_log','care_log_media','pet_profile','pet_weight_history'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
   EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
  END IF;
 END LOOP;
END $$;
COMMIT;
NOTIFY pgrst,'reload schema';
