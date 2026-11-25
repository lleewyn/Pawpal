BEGIN;
-- Reuse the current customer availability rules without requiring a guest account.
DO $$
DECLARE body text:=pg_get_functiondef('pawpal_private.guest_booking_availability(uuid,jsonb)'::regprocedure);
 gate text:='IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=cid AND auth_user_id IS NULL AND customer_status=''active'' AND unverified_contact_phone IS NOT NULL) THEN RAISE EXCEPTION ''guest_session_invalid'' USING ERRCODE=''42501'';END IF;';
BEGIN
 IF strpos(body,gate)=0 THEN RAISE EXCEPTION 'unexpected_staff_booking_availability_source';END IF;
 body:=replace(body,'FUNCTION pawpal_private.guest_booking_availability(','FUNCTION pawpal_private.staff_booking_availability(');
 body:=replace(body,gate,'IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=cid AND customer_status=''active'') THEN RAISE EXCEPTION ''active_customer_required'' USING ERRCODE=''22023'';END IF;');
 EXECUTE body;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.staff_booking_availability(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION pawpal_private.validate_staff_grooming_slot(p_details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE kind text;availability jsonb;starts timestamptz:=(p_details->>'scheduled_start_at')::timestamptz;cfg jsonb;
BEGIN
 SELECT c.category_code INTO kind FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.id=(p_details->>'service_id')::uuid;
 IF kind IS DISTINCT FROM 'grooming_spa' THEN RETURN;END IF;
 IF (starts AT TIME ZONE 'Asia/Bangkok')::date>(now() AT TIME ZONE 'Asia/Bangkok')::date+90 THEN RAISE EXCEPTION 'invalid_slot_day' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(820068);
 availability:=pawpal_private.staff_booking_availability((p_details->>'customer_id')::uuid,p_details);
 IF NOT coalesce((availability->>'available')::boolean,false) THEN
  RAISE EXCEPTION '%',coalesce(availability->>'reason','booking_slot_unavailable') USING ERRCODE='PT409';
 END IF;
 SELECT setting_value::jsonb INTO cfg FROM public.pawpal_setting WHERE setting_key='system_config';
 IF starts IS NULL OR date_trunc('minute',starts)<>starts OR NOT coalesce(cfg->'bookingPolicy'->'timeSlots' @> jsonb_build_array(to_char(starts AT TIME ZONE 'Asia/Bangkok','HH24:MI')),false) THEN
  RAISE EXCEPTION 'invalid_booking_slot' USING ERRCODE='22023';
 END IF;
 IF jsonb_array_length(coalesce(availability->'staff','[]'::jsonb))=0 THEN RAISE EXCEPTION 'no_scheduled_staff' USING ERRCODE='PT409';END IF;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.validate_staff_grooming_slot(jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_staff_booking_slots(p_customer_id uuid,p_pet_id uuid,p_service_id uuid,p_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cfg jsonb;clock_value text;starts timestamptz;payload jsonb;availability jsonb;slots jsonb:='[]';kind text;
BEGIN
 IF pawpal_private.work_actor() IS NULL OR (NOT pawpal_private.work_is_admin() AND NOT pawpal_private.has_permission('work.booking.create')) THEN RAISE EXCEPTION 'work_booking_forbidden' USING ERRCODE='42501';END IF;
 IF p_day IS NULL OR p_day<(now() AT TIME ZONE 'Asia/Bangkok')::date OR p_day>(now() AT TIME ZONE 'Asia/Bangkok')::date+90 THEN RAISE EXCEPTION 'invalid_slot_day' USING ERRCODE='22023';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE id=p_pet_id AND customer_id=p_customer_id AND status='active') THEN RAISE EXCEPTION 'pet_owner_mismatch' USING ERRCODE='42501';END IF;
 SELECT c.category_code INTO kind FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.id=p_service_id AND s.status='active';
 IF kind IS DISTINCT FROM 'grooming_spa' THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_profile p ON p.id=p_pet_id JOIN public.pet_breed b ON b.id=p.breed_id AND b.species_id=ss.species_id WHERE ss.service_id=p_service_id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023';END IF;
 SELECT setting_value::jsonb INTO cfg FROM public.pawpal_setting WHERE setting_key='system_config';
 FOR clock_value IN SELECT DISTINCT value FROM jsonb_array_elements_text(coalesce(cfg->'bookingPolicy'->'timeSlots','[]')) WHERE value~'^([01][0-9]|2[0-3]):[0-5][0-9]$' ORDER BY value LOOP
  starts:=(p_day+clock_value::time) AT TIME ZONE 'Asia/Bangkok';
  payload:=jsonb_build_object('customer_id',p_customer_id,'pet_id',p_pet_id,'service_id',p_service_id,'scheduled_start_at',starts);
  availability:=pawpal_private.staff_booking_availability(p_customer_id,payload);
  IF coalesce((availability->>'available')::boolean,false) AND jsonb_array_length(coalesce(availability->'staff','[]'::jsonb))>0 THEN
   slots:=slots||jsonb_build_array(jsonb_build_object('start_at',starts,'label',clock_value));
  END IF;
 END LOOP;
 RETURN jsonb_build_object('day',p_day,'slots',slots);
END $$;
REVOKE ALL ON FUNCTION public.get_staff_booking_slots(uuid,uuid,uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_booking_slots(uuid,uuid,uuid,date) TO authenticated;

DO $$
DECLARE body text:=pg_get_functiondef('public.create_admin_service_booking(uuid,jsonb)'::regprocedure);
 needle text:=' IF starts<=now() THEN RAISE EXCEPTION ''future_booking_required'' USING ERRCODE=''22023''; END IF;';
BEGIN
 IF strpos(body,'validate_staff_grooming_slot')>0 THEN RETURN;END IF;
 IF strpos(body,needle)=0 OR strpos(body,'work_guard_booking_staff')=0 THEN RAISE EXCEPTION 'unexpected_staff_booking_creation_source';END IF;
 body:=replace(body,needle,needle||E'\n IF NOT pawpal_private.work_is_admin() THEN PERFORM pawpal_private.validate_staff_grooming_slot(p_details);END IF;');
 needle:=' PERFORM 1 FROM public.customer WHERE id=owner';
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_staff_booking_lock_source';END IF;
 EXECUTE replace(body,needle,E' IF NOT pawpal_private.work_is_admin() THEN PERFORM pg_advisory_xact_lock(820068);END IF;\n'||needle);
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
