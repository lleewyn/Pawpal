BEGIN;
CREATE OR REPLACE FUNCTION public.propose_booking_staff(p_id uuid, p_revision timestamp with time zone, p_staff uuid, p_start timestamp with time zone, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment;ends timestamptz;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(820068);
 SELECT * INTO a FROM public.appointment WHERE id=p_id FOR UPDATE;
 IF a.requested_staff_id IS NULL OR p_revision IS NULL OR a.updated_at<>p_revision THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409';END IF;
 IF coalesce(length(btrim(p_note)),0) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'invalid_reason';END IF;
 ends:=pawpal_private.validate_staff_proposal(p_id,p_staff,p_start);
 UPDATE public.appointment SET proposal_staff_id=p_staff,proposal_start_at=p_start,proposal_end_at=ends,proposal_created_at=clock_timestamp(),staff_confirmation_status='awaiting_customer' WHERE id=p_id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) SELECT id,'BOOKING_STAFF_PROPOSE','appointment',p_id,jsonb_build_object('staff_id',p_staff,'start_at',p_start,'note',p_note)::text FROM public.staff WHERE auth_user_id=auth.uid();
 RETURN p_id;
END $function$

REVOKE ALL ON FUNCTION public.propose_booking_staff(uuid,timestamptz,uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.propose_booking_staff(uuid,timestamptz,uuid,timestamptz,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
