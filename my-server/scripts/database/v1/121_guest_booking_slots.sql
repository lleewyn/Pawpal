BEGIN;
CREATE FUNCTION public.guest_booking_day_slots(p_hash text,p_details jsonb,p_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE candidate timestamptz; answer jsonb; slots jsonb:='[]'; session public.guest_session; cfg jsonb; hours jsonb; opens timestamptz; closes timestamptz;
BEGIN
 session:=pawpal_private.require_guest_booking_session(p_hash);
 IF jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>12000 THEN RAISE EXCEPTION 'invalid_booking_details' USING ERRCODE='22023';END IF;
 IF p_day IS NULL OR p_day<(now() AT TIME ZONE 'Asia/Bangkok')::date OR p_day>(now() AT TIME ZONE 'Asia/Bangkok')::date+90 THEN RAISE EXCEPTION 'invalid_slot_day'; END IF;
 SELECT setting_value::jsonb INTO cfg FROM public.pawpal_setting WHERE setting_key='system_config';
 hours:=cfg->'operatingHours'->CASE WHEN extract(isodow FROM p_day) IN(6,7) THEN 'weekend' ELSE 'weekday' END;
 IF hours->>'open' IS NULL OR hours->>'close' IS NULL THEN RAISE EXCEPTION 'booking_hours_unconfigured'; END IF;
 opens:=(p_day+(hours->>'open')::time) AT TIME ZONE 'Asia/Bangkok';closes:=(p_day+(hours->>'close')::time) AT TIME ZONE 'Asia/Bangkok';
 FOR candidate IN SELECT generate_series(opens,closes-interval '1 minute',interval '30 minutes') LOOP
  IF candidate<=now() THEN CONTINUE; END IF;
  answer:=pawpal_private.guest_booking_availability(session.customer_id,p_details||jsonb_build_object('scheduled_start_at',candidate));
  slots:=slots||jsonb_build_array(jsonb_build_object('start_at',candidate,'available',answer->'available','reason',answer->'reason','staff',coalesce(nullif(answer->'staff','null'::jsonb),'[]'::jsonb)));
 END LOOP;
 RETURN jsonb_build_object('open',hours->>'open','close',hours->>'close','slots',slots);
END $$;
REVOKE ALL ON FUNCTION public.guest_booking_day_slots(text,jsonb,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guest_booking_day_slots(text,jsonb,date) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
