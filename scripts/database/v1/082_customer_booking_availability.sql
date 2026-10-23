BEGIN;
CREATE OR REPLACE FUNCTION public.own_booking_availability(p_details jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid; svc public.service; starts timestamptz; ends timestamptz; cfg jsonb; hours jsonb; workers jsonb; capacity integer; busy integer; local_start timestamp; local_end timestamp; kind text; duration_value integer;
BEGIN
 cid:=(public.customer_profile_snapshot()->>'id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE id=(p_details->>'pet_id')::uuid AND customer_id=cid AND status='active') THEN RAISE EXCEPTION 'pet_owner_mismatch' USING ERRCODE='42501'; END IF;
 SELECT * INTO svc FROM public.service WHERE id=(p_details->>'service_id')::uuid AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'active_service_required'; END IF;
 SELECT category_code INTO kind FROM public.service_category WHERE id=svc.category_id;
 starts:=(p_details->>'scheduled_start_at')::timestamptz;
 IF starts IS NULL OR NOT isfinite(starts) OR starts<=now() THEN RETURN jsonb_build_object('available',false,'reason','future_booking_required'); END IF;
 duration_value:=svc.estimated_duration+coalesce((SELECT sum(estimated_duration) FROM public.service_addon WHERE service_id=svc.id AND status='active' AND id IN(SELECT (value#>>'{}')::uuid FROM jsonb_array_elements(coalesce(p_details->'addon_ids','[]')))),0);
 ends:=CASE WHEN kind='pet_hotel' THEN nullif(p_details->>'check_out_at','')::timestamptz WHEN kind='pet_taxi' THEN coalesce(nullif(p_details->>'return_at','')::timestamptz,starts)+make_interval(mins=>svc.estimated_duration) ELSE starts+make_interval(mins=>duration_value) END;
 SELECT setting_value::jsonb INTO cfg FROM public.pawpal_setting WHERE setting_key='system_config';
 local_start:=starts AT TIME ZONE 'Asia/Bangkok';local_end:=ends AT TIME ZONE 'Asia/Bangkok';
 hours:=cfg->'operatingHours'->CASE WHEN extract(isodow FROM local_start) IN(6,7) THEN 'weekend' ELSE 'weekday' END;
 IF coalesce(hours->>'open','')='' OR coalesce(hours->>'close','')='' THEN RETURN jsonb_build_object('available',false,'reason','booking_hours_unconfigured'); END IF;
 IF local_start::time<(hours->>'open')::time OR local_start::time>=(hours->>'close')::time OR (kind='grooming_spa' AND (local_end::date<>local_start::date OR local_end::time>(hours->>'close')::time)) THEN RETURN jsonb_build_object('available',false,'reason','outside_operating_hours','open',hours->>'open','close',hours->>'close'); END IF;
 IF kind='pet_hotel' THEN
  IF ends IS NULL OR ends<=starts THEN RETURN jsonb_build_object('available',false,'reason','invalid_hotel_stay'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE r.id=(p_details->>'room_id')::uuid AND r.status IN('active','available') AND t.status='active') OR EXISTS(SELECT 1 FROM public.hotel_booking WHERE room_id=(p_details->>'room_id')::uuid AND status NOT IN('cancelled','closed') AND check_in_at<ends AND check_out_at>starts) THEN RETURN jsonb_build_object('available',false,'reason','hotel_room_conflict'); END IF;
  RETURN jsonb_build_object('available',true,'staff','[]'::jsonb,'open',hours->>'open','close',hours->>'close');
 END IF;
 capacity:=nullif(cfg->'bookingPolicy'->>'slotCapacityMax','')::integer;
 IF capacity IS NULL OR capacity<1 THEN RETURN jsonb_build_object('available',false,'reason','booking_capacity_unconfigured'); END IF;
 SELECT count(*) INTO busy FROM public.appointment WHERE appointment_status NOT IN('completed','cancelled','no_show','da_huy','da_hoan_tat','vang_mat','expired') AND scheduled_start_at<ends AND scheduled_end_at>starts;
 IF busy>=capacity THEN RETURN jsonb_build_object('available',false,'reason','booking_slot_full'); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name) ORDER BY s.full_name),'[]') INTO workers FROM public.staff s
 WHERE s.employment_status='active' AND NOT s.service_locked AND s.staff_level_id IS NOT NULL
 AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE actual.id=s.staff_level_id AND actual.rank_order>=required.rank_order))
 AND EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status='available' AND sc.start_at<=starts AND sc.end_at>=ends)
 AND NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status<>'available' AND sc.start_at<ends AND sc.end_at>starts)
 AND NOT EXISTS(SELECT 1 FROM public.appointment a WHERE a.appointment_status NOT IN('completed','cancelled','no_show','da_huy','da_hoan_tat','vang_mat','expired') AND a.scheduled_start_at<ends AND a.scheduled_end_at>starts AND (a.staff_id=s.id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=s.id AND i.status<>'cancelled')));
 RETURN jsonb_build_object('available',CASE WHEN kind='grooming_spa' THEN jsonb_array_length(workers)>0 ELSE true END,'reason',CASE WHEN kind='grooming_spa' AND jsonb_array_length(workers)=0 THEN 'no_scheduled_staff' ELSE NULL END,'staff',CASE WHEN kind='grooming_spa' THEN workers ELSE '[]'::jsonb END,'open',hours->>'open','close',hours->>'close');
END $$;
REVOKE ALL ON FUNCTION public.own_booking_availability(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_booking_availability(jsonb) TO authenticated;
-- Validate availability again in the authoritative quote, including on creation.
DO $$ DECLARE src text; marker text:=' result:=jsonb_build_object('; BEGIN
 src:=pg_get_functiondef('pawpal_private.customer_new_booking_quote(jsonb)'::regprocedure);
 IF position('own_booking_availability' IN src)=0 THEN
  IF position(marker IN src)=0 THEN RAISE EXCEPTION 'Unexpected quote definition'; END IF;
  src:=replace(src,marker,$body$
 PERFORM pg_advisory_xact_lock(820068);
 context:=context||jsonb_build_object('availability',public.own_booking_availability(p_details));
 IF NOT coalesce((context->'availability'->>'available')::boolean,false) THEN RAISE EXCEPTION '%',context->'availability'->>'reason' USING ERRCODE='PT409'; END IF;
 IF nullif(p_details->>'preferred_staff_id','') IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(context->'availability'->'staff') v WHERE v->>'id'=p_details->>'preferred_staff_id') THEN RAISE EXCEPTION 'preferred_staff_unavailable' USING ERRCODE='PT409'; END IF;
  core:=core||jsonb_build_object('note',concat_ws(E'\n',core->>'note','Nhân viên ưu tiên: '||(SELECT v->>'name' FROM jsonb_array_elements(context->'availability'->'staff') v WHERE v->>'id'=p_details->>'preferred_staff_id')||' (chờ cửa hàng xác nhận phân công)'));
 END IF;
 result:=jsonb_build_object($body$);
  EXECUTE src;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
