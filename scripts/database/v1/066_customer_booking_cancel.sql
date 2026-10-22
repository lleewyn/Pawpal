BEGIN;
-- Permit only the explicit owner cancellation event, keeping staff/sales rules.
DO $$ DECLARE body text; old_text text:=$old$ELSE RAISE EXCEPTION 'Audit actor requires active staff'; END IF;$old$;
BEGIN
 SELECT pg_get_functiondef('pawpal_private.audit_actor()'::regprocedure) INTO body;
 IF position('CUSTOMER_CANCEL_APPOINTMENT' IN body)=0 THEN
  IF position(old_text IN body)=0 THEN RAISE EXCEPTION 'Unexpected audit actor definition'; END IF;
  EXECUTE replace(body,old_text,$new$ELSIF NEW.entity_name='appointment' AND NEW.action='CUSTOMER_CANCEL_APPOINTMENT'
   AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid())
   AND EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=NEW.entity_id AND a.appointment_status='cancelled'
     AND pawpal_private.owns_customer(a.customer_id)) THEN RETURN NEW;
   ELSE RAISE EXCEPTION 'Audit actor requires active staff'; END IF;$new$);
 END IF;
END $$;
-- The trigger still owns the hotel-room/taxi release. No customer gets general
-- logistics privileges; the exception is restricted to a future owner cancel.
DO $$ DECLARE body text; old_text text:=$old$IF auth.role()='authenticated' AND (NOT pawpal_private.has_permission('audit_log.write')$old$;
BEGIN
 SELECT pg_get_functiondef('pawpal_private.sync_service_logistics()'::regprocedure) INTO body;
 IF position('NEW.appointment_status=''cancelled'' AND OLD.appointment_status' IN body)=0 THEN
  IF position(old_text IN body)=0 THEN RAISE EXCEPTION 'Unexpected logistics guard'; END IF;
  EXECUTE replace(body,old_text,$new$IF auth.role()='authenticated'
   AND NOT (NEW.appointment_status='cancelled' AND OLD.appointment_status IN ('pending','confirmed')
    AND NEW.staff_id IS NOT DISTINCT FROM OLD.staff_id AND NEW.scheduled_start_at=OLD.scheduled_start_at
    AND NEW.scheduled_end_at=OLD.scheduled_end_at AND NEW.scheduled_start_at>=now()+interval '2 hours'
    AND pawpal_private.owns_customer(NEW.customer_id)
    AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid())
    AND NOT EXISTS(SELECT 1 FROM public.payment WHERE appointment_id=NEW.id AND transaction_status='succeeded'))
   AND (NOT pawpal_private.has_permission('audit_log.write')$new$);
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.cancel_own_service_booking(p_request_id uuid,p_id uuid,p_expected_updated_at timestamptz,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; a public.appointment; previous public.audit_log; reason text:=btrim(p_reason);
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
  RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_expected_updated_at IS NULL OR reason IS NULL OR length(reason) NOT BETWEEN 1 AND 2000 THEN
  RAISE EXCEPTION 'cancellation_reason_required' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,66));
 SELECT * INTO a FROM public.appointment WHERE id=p_id AND customer_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO previous FROM public.audit_log WHERE action='CUSTOMER_CANCEL_APPOINTMENT'
  AND (CASE WHEN action='CUSTOMER_CANCEL_APPOINTMENT' THEN description::jsonb END)->>'request_id'=p_request_id::text LIMIT 1;
 IF FOUND THEN
  IF previous.entity_id<>p_id OR previous.description::jsonb->>'reason'<>reason
   OR (previous.description::jsonb->>'expected_updated_at')::timestamptz IS DISTINCT FROM p_expected_updated_at THEN
   RAISE EXCEPTION 'cancellation_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN a.id;
 END IF;
 IF a.updated_at IS DISTINCT FROM p_expected_updated_at THEN
  RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 IF a.appointment_status NOT IN ('pending','confirmed') OR a.scheduled_start_at<now()+interval '2 hours' THEN
  RAISE EXCEPTION 'booking_cancellation_window_closed' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.payment WHERE appointment_id=a.id AND transaction_status='succeeded') THEN
  RAISE EXCEPTION 'paid_booking_requires_refund_workflow' USING ERRCODE='22023'; END IF;
 UPDATE public.appointment SET appointment_status='cancelled' WHERE id=a.id;
 INSERT INTO public.audit_log(action,entity_name,entity_id,description)
 VALUES('CUSTOMER_CANCEL_APPOINTMENT','appointment',a.id,jsonb_build_object('request_id',p_request_id,'reason',reason,'expected_updated_at',p_expected_updated_at)::text);
 RETURN a.id;
END $$;
REVOKE ALL ON FUNCTION public.cancel_own_service_booking(uuid,uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_own_service_booking(uuid,uuid,timestamptz,text) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
