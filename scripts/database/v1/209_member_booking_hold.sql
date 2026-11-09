BEGIN;
CREATE TABLE IF NOT EXISTS pawpal_private.member_booking_hold (
 customer_id uuid PRIMARY KEY REFERENCES public.customer(id) ON DELETE CASCADE,
 id uuid NOT NULL UNIQUE,
 details jsonb NOT NULL,
 staff_id uuid NOT NULL REFERENCES public.staff(id),
 starts timestamptz NOT NULL,
 ends timestamptz NOT NULL,
 expires_at timestamptz NOT NULL
);
REVOKE ALL ON pawpal_private.member_booking_hold FROM PUBLIC,anon,authenticated;

DO $$ DECLARE src text; marker text; BEGIN
 src:=pg_get_functiondef('public.own_booking_availability(jsonb)'::regprocedure);
 IF position('member_booking_hold' IN src)=0 THEN
  src:=replace(src,'DECLARE cid uuid;','<<availability_window>> DECLARE cid uuid;');
  marker:=' IF busy>=capacity THEN';
  IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected availability capacity definition'; END IF;
  src:=replace(src,marker,$patch$
 SELECT busy+count(*) INTO busy FROM pawpal_private.member_booking_hold h
 WHERE h.customer_id<>cid AND h.expires_at>clock_timestamp() AND h.starts<availability_window.ends AND h.ends>availability_window.starts;
 IF busy>=capacity THEN$patch$);
  marker:=' AND NOT EXISTS(SELECT 1 FROM public.appointment a';
  IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected availability staff definition'; END IF;
  src:=replace(src,marker,$patch$
 AND NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold h WHERE h.customer_id<>cid AND h.staff_id=s.id AND h.expires_at>clock_timestamp() AND h.starts<availability_window.ends AND h.ends>availability_window.starts)
 AND NOT EXISTS(SELECT 1 FROM public.appointment a$patch$);
  EXECUTE src;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.hold_own_service_booking(p_id uuid,p_details jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid; q jsonb; h pawpal_private.member_booking_hold;
BEGIN
 cid:=(public.customer_profile_snapshot()->>'id')::uuid;
 PERFORM 1 FROM public.customer WHERE id=cid FOR UPDATE;
 IF p_id IS NULL OR p_details IS NULL OR length(p_details::text)>16000 THEN RAISE EXCEPTION 'invalid_booking_details'; END IF;
 PERFORM pg_advisory_xact_lock(820068);
 -- The same choice never silently extends its fifteen-minute lease.
 SELECT * INTO h FROM pawpal_private.member_booking_hold WHERE customer_id=cid;
 IF h.id=p_id AND h.details=p_details AND h.expires_at>clock_timestamp() THEN
  RETURN jsonb_build_object('id',h.id,'expires_at',h.expires_at,'server_now',clock_timestamp());
 END IF;
 IF (p_details->>'scheduled_start_at')::timestamptz<=clock_timestamp()+interval '2 hours' THEN RAISE EXCEPTION 'booking_lead_time_required' USING ERRCODE='PT409'; END IF;
 IF nullif(p_details->>'preferred_staff_id','') IS NULL THEN RAISE EXCEPTION 'booking_staff_required' USING ERRCODE='PT409'; END IF;
 q:=pawpal_private.customer_new_booking_quote(p_details);
 IF q->>'category'<>'grooming_spa' THEN RAISE EXCEPTION 'invalid_booking_details'; END IF;
 INSERT INTO pawpal_private.member_booking_hold(customer_id,id,details,staff_id,starts,ends,expires_at)
 VALUES(cid,p_id,p_details,(p_details->>'preferred_staff_id')::uuid,(q->>'start_at')::timestamptz,(q->>'end_at')::timestamptz,clock_timestamp()+interval '15 minutes')
 ON CONFLICT(customer_id) DO UPDATE SET id=excluded.id,details=excluded.details,staff_id=excluded.staff_id,starts=excluded.starts,ends=excluded.ends,expires_at=excluded.expires_at
 RETURNING * INTO h;
 RETURN jsonb_build_object('id',h.id,'expires_at',h.expires_at,'server_now',clock_timestamp());
END $$;
CREATE OR REPLACE FUNCTION public.release_own_booking_hold(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(820068);
 DELETE FROM pawpal_private.member_booking_hold WHERE customer_id=(public.customer_profile_snapshot()->>'id')::uuid AND id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.hold_own_service_booking(uuid,jsonb),public.release_own_booking_hold(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.hold_own_service_booking(uuid,jsonb),public.release_own_booking_hold(uuid) TO authenticated;

DO $$ DECLARE src text; marker text; BEGIN
 src:=pg_get_functiondef('public.create_own_service_booking(uuid,text,jsonb)'::regprocedure);
 IF position('member_booking_hold' IN src)=0 THEN
  marker:=' quote:=pawpal_private.customer_new_booking_quote(p_details);';
  IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected booking create quote definition'; END IF;
  src:=replace(src,marker,$patch$
 PERFORM pg_advisory_xact_lock(820068);
 IF p_details ? 'hold_id' AND NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold h
 WHERE h.customer_id=owner_id AND h.id=(p_details->>'hold_id')::uuid AND h.details-'note'=p_details-'hold_id'-'note' AND h.expires_at>clock_timestamp()) THEN
  RAISE EXCEPTION 'booking_hold_expired' USING ERRCODE='PT409';
 END IF;
 quote:=pawpal_private.customer_new_booking_quote(p_details);$patch$);
  marker:=$marker$jsonb_build_object('details',p_details,'quote_version',p_expected_quote,'quote',quote)::text);$marker$;
  IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected booking audit definition'; END IF;
  src:=replace(src,marker,marker||$patch$
 IF p_details ? 'hold_id' AND quote->>'category'='grooming_spa' THEN
  UPDATE public.appointment SET staff_id=(p_details->>'preferred_staff_id')::uuid,appointment_status='confirmed' WHERE id=p_id;
  UPDATE public.appointment_item SET staff_id=(p_details->>'preferred_staff_id')::uuid WHERE appointment_id=p_id;
  DELETE FROM pawpal_private.member_booking_hold WHERE customer_id=owner_id;
 END IF;
$patch$);
  EXECUTE src;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
