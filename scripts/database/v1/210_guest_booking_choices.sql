BEGIN;
-- Normalize free-text breeds through the existing live catalog resolver.
CREATE OR REPLACE FUNCTION pawpal_private.guest_pet_input(p_pet jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF p_pet ? 'breedName' OR p_pet ? 'speciesName' THEN
  IF jsonb_typeof(p_pet) IS DISTINCT FROM 'object' OR length(p_pet::text)>8000
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_pet) k WHERE k NOT IN('id','name','breedId','breedName','speciesName','gender','weight','allergy','safetyNote')) THEN
   RAISE EXCEPTION 'invalid_pet_fields' USING ERRCODE='22023';
  END IF;
  RETURN (p_pet-'breedName'-'speciesName')||jsonb_build_object('breedId',pawpal_private.resolve_customer_pet_breed(p_pet->>'speciesName',p_pet->>'breedName'));
 END IF;
 RETURN p_pet;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guest_pet_input(jsonb) FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE signature text;src text;BEGIN
 FOREACH signature IN ARRAY ARRAY['public.guest_commerce_save_pet(text,timestamptz,uuid,text,text,jsonb)','public.guest_profile_update(text,text,uuid,text,jsonb,jsonb)'] LOOP
  src:=pg_get_functiondef(signature::regprocedure);
  IF position('guest_pet_input' IN src)=0 THEN
   src:=regexp_replace(src,'BEGIN',E'BEGIN\n p_pet:=pawpal_private.guest_pet_input(p_pet);');
   EXECUTE src;
  END IF;
 END LOOP;
 src:=pg_get_functiondef('public.guest_commerce_context(text,integer)'::regprocedure);
 IF position('speciesName' IN src)=0 THEN
  src:=replace(src,$old$'breedId',breed_id,$old$,$new$'breedId',breed_id,'breedName',(SELECT b.breed_name FROM public.pet_breed b WHERE b.id=breed_id),'speciesId',(SELECT b.species_id FROM public.pet_breed b WHERE b.id=breed_id),'speciesName',(SELECT sp.species_name FROM public.pet_breed b JOIN public.pet_species sp ON sp.id=b.species_id WHERE b.id=breed_id),$new$);
  EXECUTE src;
 END IF;
 src:=pg_get_functiondef('public.guest_profile_read(text,uuid)'::regprocedure);
 IF position('speciesName' IN src)=0 THEN
  src:=replace(src,$old$'breedId',p.breed_id,$old$,$new$'breedId',p.breed_id,'breedName',(SELECT b.breed_name FROM public.pet_breed b WHERE b.id=p.breed_id),'speciesId',(SELECT b.species_id FROM public.pet_breed b WHERE b.id=p.breed_id),'speciesName',(SELECT sp.species_name FROM public.pet_breed b JOIN public.pet_species sp ON sp.id=b.species_id WHERE b.id=p.breed_id),$new$);
  EXECUTE src;
 END IF;
 -- Share the same capacity/staff leases with signed-in members.
 src:=pg_get_functiondef('pawpal_private.guest_booking_availability(uuid,jsonb)'::regprocedure);
 IF position('member_booking_hold' IN src)=0 THEN
  src:=replace(src,'DECLARE cid uuid;','<<availability_window>> DECLARE cid uuid;');
  IF position('<<availability_window>>' IN src)=0 THEN RAISE EXCEPTION 'Unexpected guest availability declaration';END IF;
  src:=replace(src,' IF busy>=capacity THEN',$new$
 SELECT busy+count(*) INTO busy FROM pawpal_private.member_booking_hold h
 WHERE h.customer_id<>cid AND h.expires_at>clock_timestamp() AND h.starts<availability_window.ends AND h.ends>availability_window.starts;
 IF busy>=capacity THEN$new$);
  src:=replace(src,' AND NOT EXISTS(SELECT 1 FROM public.appointment a',$new$
 AND NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold h WHERE h.customer_id<>cid AND h.staff_id=s.id AND h.expires_at>clock_timestamp() AND h.starts<availability_window.ends AND h.ends>availability_window.starts)
 AND NOT EXISTS(SELECT 1 FROM public.appointment a$new$);
  EXECUTE src;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guest_booking_hold(p_hash text,p_id uuid,p_details jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;q jsonb;h pawpal_private.member_booking_hold;
BEGIN
 s:=pawpal_private.require_guest_booking_session(p_hash);
 PERFORM 1 FROM public.customer WHERE id=s.customer_id FOR UPDATE;
 PERFORM pg_advisory_xact_lock(820068);
 IF p_id IS NULL OR p_details IS NULL OR length(p_details::text)>12000 THEN RAISE EXCEPTION 'invalid_booking_details';END IF;
 SELECT * INTO h FROM pawpal_private.member_booking_hold WHERE customer_id=s.customer_id;
 IF h.id=p_id AND h.details=p_details AND h.expires_at>clock_timestamp() THEN
  RETURN jsonb_build_object('id',h.id,'expires_at',h.expires_at,'server_now',clock_timestamp());
 END IF;
 IF (p_details->>'scheduled_start_at')::timestamptz<=clock_timestamp()+interval '2 hours' THEN RAISE EXCEPTION 'booking_lead_time_required' USING ERRCODE='PT409';END IF;
 IF nullif(p_details->>'preferred_staff_id','') IS NULL THEN RAISE EXCEPTION 'booking_staff_required' USING ERRCODE='PT409';END IF;
 q:=pawpal_private.guest_booking_quote_core(s.customer_id,p_details);
 IF q->>'category'<>'grooming_spa' THEN RAISE EXCEPTION 'invalid_booking_details';END IF;
 INSERT INTO pawpal_private.member_booking_hold(customer_id,id,details,staff_id,starts,ends,expires_at)
 VALUES(s.customer_id,p_id,p_details,(p_details->>'preferred_staff_id')::uuid,(q->>'start_at')::timestamptz,(q->>'end_at')::timestamptz,clock_timestamp()+interval '15 minutes')
 ON CONFLICT(customer_id) DO UPDATE SET id=excluded.id,details=excluded.details,staff_id=excluded.staff_id,starts=excluded.starts,ends=excluded.ends,expires_at=excluded.expires_at RETURNING * INTO h;
 RETURN jsonb_build_object('id',h.id,'expires_at',h.expires_at,'server_now',clock_timestamp());
END $$;
CREATE OR REPLACE FUNCTION public.guest_booking_release(p_hash text,p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;
BEGIN
 s:=pawpal_private.require_guest_booking_session(p_hash);
 PERFORM pg_advisory_xact_lock(820068);
 DELETE FROM pawpal_private.member_booking_hold WHERE customer_id=s.customer_id AND id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.guest_booking_hold(text,uuid,jsonb),public.guest_booking_release(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guest_booking_hold(text,uuid,jsonb),public.guest_booking_release(text,uuid) TO service_role;
DO $$ DECLARE src text;signature text;marker text;BEGIN
 FOREACH signature IN ARRAY ARRAY['public.guest_booking_quote(text,jsonb)','public.guest_booking_create(text,uuid,text,jsonb)'] LOOP
  src:=pg_get_functiondef(signature::regprocedure);
  IF position($check$'hold_id'$check$ IN src)=0 THEN src:=replace(src,$old$'pet_id','service_id'$old$,$new$'hold_id','pet_id','service_id'$new$);END IF;
  IF signature LIKE '%guest_booking_create%' AND position('member_booking_hold' IN src)=0 THEN
   marker:=' q:=pawpal_private.guest_booking_quote_core(s.customer_id,p_details);';
   IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected guest create quote';END IF;
   src:=replace(src,marker,$new$
 PERFORM 1 FROM public.customer WHERE id=s.customer_id FOR UPDATE;
 PERFORM pg_advisory_xact_lock(820068);
 IF p_details ? 'hold_id' AND NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold h WHERE h.customer_id=s.customer_id AND h.id=(p_details->>'hold_id')::uuid AND h.details-'note'=p_details-'hold_id'-'note' AND h.expires_at>clock_timestamp()) THEN
  RAISE EXCEPTION 'booking_hold_expired' USING ERRCODE='PT409';
 END IF;
 q:=pawpal_private.guest_booking_quote_core(s.customer_id,p_details);$new$);
   marker:=$marker$jsonb_build_object('session_id',s.id,'details',p_details,'quote_version',p_expected_quote,'quote',q)::text);$marker$;
   IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected guest create audit';END IF;
   src:=replace(src,marker,marker||$new$
 IF p_details ? 'hold_id' AND kind='grooming_spa' THEN
  UPDATE public.appointment SET staff_id=(p_details->>'preferred_staff_id')::uuid,appointment_status='confirmed' WHERE id=p_request;
  UPDATE public.appointment_item SET staff_id=(p_details->>'preferred_staff_id')::uuid WHERE appointment_id=p_request;
  DELETE FROM pawpal_private.member_booking_hold WHERE customer_id=s.customer_id;
 END IF;
$new$);
  END IF;
  EXECUTE src;
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
