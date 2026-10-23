BEGIN;
CREATE OR REPLACE FUNCTION public.own_booking_day_slots(p_details jsonb,p_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE candidate timestamptz; answer jsonb; slots jsonb:='[]'; cfg jsonb; hours jsonb; opens timestamptz; closes timestamptz;
BEGIN
 PERFORM public.customer_profile_snapshot();
 IF p_day IS NULL OR p_day<(now() AT TIME ZONE 'Asia/Bangkok')::date OR p_day>(now() AT TIME ZONE 'Asia/Bangkok')::date+90 THEN RAISE EXCEPTION 'invalid_slot_day'; END IF;
 SELECT setting_value::jsonb INTO cfg FROM public.pawpal_setting WHERE setting_key='system_config';
 hours:=cfg->'operatingHours'->CASE WHEN extract(isodow FROM p_day) IN(6,7) THEN 'weekend' ELSE 'weekday' END;
 IF hours->>'open' IS NULL OR hours->>'close' IS NULL THEN RAISE EXCEPTION 'booking_hours_unconfigured'; END IF;
 opens:=(p_day+(hours->>'open')::time) AT TIME ZONE 'Asia/Bangkok';closes:=(p_day+(hours->>'close')::time) AT TIME ZONE 'Asia/Bangkok';
 FOR candidate IN SELECT generate_series(opens,closes-interval '1 minute',interval '30 minutes') LOOP
  IF candidate<=now() THEN CONTINUE; END IF;
  answer:=public.own_booking_availability(p_details||jsonb_build_object('scheduled_start_at',candidate));
  slots:=slots||jsonb_build_array(jsonb_build_object('start_at',candidate,'available',answer->'available','reason',answer->'reason','staff',answer->'staff'));
 END LOOP;
 RETURN jsonb_build_object('open',hours->>'open','close',hours->>'close','slots',slots);
END $$;
REVOKE ALL ON FUNCTION public.own_booking_day_slots(jsonb,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_booking_day_slots(jsonb,date) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
