BEGIN;
CREATE OR REPLACE FUNCTION public.save_admin_pickup_notification(p_id uuid,p_appointment_id uuid,p_expected_updated_at timestamptz,p_content text,p_ready boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; prior public.notification; actor uuid; intake public.appointment_record; pet_name text;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.read') OR NOT pawpal_private.has_permission('appointment_record.read')
 OR NOT pawpal_private.has_permission('appointment_adjustment.read') OR NOT pawpal_private.has_permission('pet_profile.read')
 OR NOT pawpal_private.has_permission('notification.read') OR NOT pawpal_private.has_permission('audit_log.read')
 OR NOT pawpal_private.has_permission('notification.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN
 RAISE EXCEPTION 'pickup_notification_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_appointment_id IS NULL OR p_ready IS DISTINCT FROM true OR coalesce(length(btrim(p_content)),0) NOT BETWEEN 1 AND 4000 THEN
 RAISE EXCEPTION 'pickup_notification_invalid' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,16));
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO prior FROM public.notification WHERE id=p_id;
 IF FOUND THEN
  IF prior.appointment_id IS DISTINCT FROM a.id OR prior.customer_id IS DISTINCT FROM a.customer_id OR prior.content<>btrim(p_content)
   OR prior.notification_type<>'service_pickup_ready' OR NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='SAVE_PICKUP_NOTIFICATION' AND staff_id=actor) THEN
   RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 IF a.appointment_status NOT IN ('in_progress','completed') THEN RAISE EXCEPTION 'pickup_notification_not_ready' USING ERRCODE='22023'; END IF;
 SELECT * INTO intake FROM public.appointment_record WHERE appointment_id=a.id AND record_type='intake' ORDER BY revision_no DESC LIMIT 1;
 IF intake.id IS NULL OR intake.customer_confirmation_status<>'confirmed' THEN RAISE EXCEPTION 'confirmed_intake_required' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.appointment_adjustment WHERE appointment_id=a.id AND (approval_status='pending' OR (approval_status='approved' AND customer_consent_status<>'confirmed'))) THEN RAISE EXCEPTION 'pending_service_adjustments' USING ERRCODE='22023'; END IF;
 SELECT p.pet_name INTO pet_name FROM public.pet_profile p WHERE p.id=a.pet_id;
 INSERT INTO public.notification(id,customer_id,notification_type,title,content,appointment_id)
 VALUES(p_id,a.customer_id,'service_pickup_ready','Mời đón bé '||coalesce(pet_name,'cưng'),btrim(p_content),a.id);
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,'SAVE_PICKUP_NOTIFICATION','notification',p_id,jsonb_build_object('appointment_id',a.id,'customer_id',a.customer_id,'ready_confirmed',true,'channel','internal','external_delivery',false)::text);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_pickup_notification(uuid,uuid,timestamptz,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_pickup_notification(uuid,uuid,timestamptz,text,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
