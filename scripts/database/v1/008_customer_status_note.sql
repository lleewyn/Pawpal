BEGIN;
CREATE OR REPLACE FUNCTION public.set_customer_status(p_customer_id uuid,p_expected_updated_at timestamptz,p_status text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE c public.customer; actor uuid;
BEGIN
 IF NOT pawpal_private.has_permission('customer.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'customer_write_forbidden' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('active','locked') THEN RAISE EXCEPTION 'invalid_customer_status' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.customer WHERE id=p_customer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR c.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'customer_profile_changed' USING ERRCODE='PT409'; END IF;
 IF c.customer_status=p_status THEN RETURN c.id; END IF;
 UPDATE public.customer SET customer_status=p_status WHERE id=c.id;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'UPDATE','customer',c.id,'Trạng thái hồ sơ: '||p_status);
 RETURN c.id;
END $$;
CREATE OR REPLACE FUNCTION public.save_customer_note(p_customer_id uuid,p_expected_updated_at timestamptz,p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE c public.customer; actor uuid;
BEGIN
 IF NOT pawpal_private.has_permission('customer.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'customer_write_forbidden' USING ERRCODE='42501'; END IF;
 IF length(p_note)>10000 THEN RAISE EXCEPTION 'customer_note_too_long' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.customer WHERE id=p_customer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR c.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'customer_profile_changed' USING ERRCODE='PT409'; END IF;
 UPDATE public.customer SET note=nullif(btrim(p_note),'') WHERE id=c.id;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'UPDATE','customer',c.id,'Cập nhật ghi chú nội bộ khách hàng.');
 RETURN c.id;
END $$;
REVOKE ALL ON FUNCTION public.set_customer_status(uuid,timestamptz,text),public.save_customer_note(uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_customer_status(uuid,timestamptz,text),public.save_customer_note(uuid,timestamptz,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
