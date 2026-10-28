BEGIN;
DROP TRIGGER IF EXISTS staff_assignment_eligibility ON public.staff_schedule;
DROP TRIGGER IF EXISTS staff_assignment_eligibility ON public.appointment;
DROP TRIGGER IF EXISTS staff_assignment_eligibility ON public.appointment_item;
DROP TRIGGER IF EXISTS staff_assignment_eligibility ON public.taxi_trip;
DROP FUNCTION IF EXISTS public.admin_service_staff_candidates();
DROP FUNCTION IF EXISTS pawpal_private.guard_staff_assignment_eligibility();
CREATE OR REPLACE FUNCTION public.own_booking_availability(p_details jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
 RETURN jsonb_build_object('available',true,'reason',NULL,'staff',CASE WHEN kind='grooming_spa' THEN workers ELSE '[]'::jsonb END,'open',hours->>'open','close',hours->>'close');
END $function$
;
CREATE OR REPLACE FUNCTION pawpal_private.guest_booking_availability(p_owner uuid, p_details jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE cid uuid; svc public.service; starts timestamptz; ends timestamptz; cfg jsonb; hours jsonb; workers jsonb; capacity integer; busy integer; local_start timestamp; local_end timestamp; kind text; duration_value integer;
BEGIN
 cid:=p_owner;
 IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=cid AND auth_user_id IS NULL AND customer_status='active' AND unverified_contact_phone IS NOT NULL) THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE id=(p_details->>'pet_id')::uuid AND customer_id=cid AND status='active') THEN RAISE EXCEPTION 'pet_owner_mismatch' USING ERRCODE='42501'; END IF;
 SELECT * INTO svc FROM public.service WHERE id=(p_details->>'service_id')::uuid AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'active_service_required'; END IF;
 SELECT category_code INTO kind FROM public.service_category WHERE id=svc.category_id;
 starts:=(p_details->>'scheduled_start_at')::timestamptz;
 IF starts IS NULL OR NOT isfinite(starts) OR starts<=now() THEN RETURN jsonb_build_object('available',false,'reason','future_booking_required'); END IF;
 duration_value:=pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=(p_details->>'pet_id')::uuid),starts)+coalesce((SELECT sum(estimated_duration) FROM public.service_addon WHERE service_id=svc.id AND status='active' AND id IN(SELECT (value#>>'{}')::uuid FROM jsonb_array_elements(coalesce(p_details->'addon_ids','[]')))),0);
 ends:=CASE WHEN kind='pet_hotel' THEN nullif(p_details->>'check_out_at','')::timestamptz WHEN kind='pet_taxi' THEN coalesce(nullif(p_details->>'return_at','')::timestamptz,starts)+make_interval(mins=>pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=(p_details->>'pet_id')::uuid),starts)) ELSE starts+make_interval(mins=>duration_value) END;
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
 RETURN jsonb_build_object('available',true,'reason',NULL,'staff',CASE WHEN kind='grooming_spa' THEN workers ELSE '[]'::jsonb END,'open',hours->>'open','close',hours->>'close');
END $function$
;
CREATE OR REPLACE FUNCTION public.admin_staff_list_page(p_filters jsonb DEFAULT '{}'::jsonb, p_page integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    needle text := lower(btrim(regexp_replace(coalesce(p_filters->>'query', ''), '[[:space:]]+', ' ', 'g')));
    normalized text;
    wanted_role text := lower(coalesce(p_filters->>'role', 'ALL'));
    response jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.read') THEN
        RAISE EXCEPTION 'staff_directory_forbidden' USING ERRCODE = '42501';
    END IF;
    normalized := replace(regexp_replace(normalize(needle, NFD), U&'[\0300-\036f]', '', 'g'), 'đ', 'd');
    WITH source AS (
        SELECT s.*, latest.result AS skill_result,
            lower(CASE
                WHEN lower(coalesce(nullif(s.job_title,''), s.specialization,'')) LIKE ANY(ARRAY['%bác sĩ%','%thú y%']) THEN 'Veterinarian'
                WHEN lower(coalesce(nullif(s.job_title,''), s.specialization,'')) LIKE ANY(ARRAY['%tài xế%','%taxi%']) THEN 'Driver'
                WHEN lower(coalesce(nullif(s.job_title,''), s.specialization,'')) LIKE '%lễ tân%' THEN 'Receptionist'
                WHEN lower(coalesce(nullif(s.job_title,''), s.specialization,'')) LIKE ANY(ARRAY['%cskh%','%chăm sóc khách%']) THEN 'CSKH'
                WHEN lower(coalesce(nullif(s.job_title,''), s.specialization,'')) LIKE ANY(ARRAY['%bảo mẫu%','%hotel%','%lưu trú%']) THEN 'Caregiver'
                WHEN lower(coalesce(nullif(s.job_title,''), s.specialization,'')) LIKE ANY(ARRAY['%groom%','%cắt tỉa%','%spa%']) THEN 'Groomer'
                ELSE 'Chưa phân loại' END) AS mapped_role,
            CASE s.employment_status WHEN 'active' THEN 'ACTIVE' WHEN 'leave' THEN 'LEAVE'
                WHEN 'paused' THEN 'PAUSE' WHEN 'resigned' THEN 'RESIGNED' WHEN 'terminated' THEN 'RESIGNED' ELSE s.employment_status END AS mapped_status
        FROM public.staff s LEFT JOIN LATERAL (
            SELECT result FROM public.staff_assessment a WHERE a.staff_id = s.id
            ORDER BY assessment_date DESC, created_at DESC, id LIMIT 1
        ) latest ON true
    ), matching AS MATERIALIZED (
        SELECT * FROM source s WHERE
            (needle = '' OR strpos(s.id::text, needle)>0 OR strpos(coalesce(s.phone_number,''),needle)>0
                OR strpos(lower(coalesce(s.email,'')),needle)>0
                OR strpos(replace(regexp_replace(normalize(lower(regexp_replace(coalesce(s.full_name,'') || ' ' || coalesce(s.job_title,''), '[[:space:]]+', ' ', 'g')), NFD), U&'[\0300-\036f]', '', 'g'), 'đ', 'd'), normalized)>0)
            AND (wanted_role = 'all' OR strpos(s.mapped_role,wanted_role)>0 OR strpos(lower(coalesce(s.job_title,'')),wanted_role)>0
                OR (wanted_role='medical_caregiver' AND (s.mapped_role IN ('veterinarian','caregiver') OR lower(coalesce(s.job_title,'')) LIKE ANY(ARRAY['%bác sĩ%','%bảo mẫu%']))))
            AND (coalesce(p_filters->>'status','ALL')='ALL' OR s.mapped_status=p_filters->>'status')
            AND (NOT coalesce((p_filters->>'retrain')::boolean,false) OR s.skill_result IN ('RETRAIN','FAIL') OR s.service_locked)
            AND (NOT coalesce((p_filters->>'locked')::boolean,false) OR s.service_locked)
            AND (coalesce(p_filters->>'shift','ALL')='ALL' OR
                (p_filters->>'shift'='ASSIGNED') = EXISTS(SELECT 1 FROM public.staff_schedule sch
                    WHERE sch.staff_id=s.id AND sch.schedule_status='active' AND sch.availability_status='available'))
    ), bounds AS (
        SELECT count(*) AS total, least(greatest(coalesce(p_page,1),1),greatest(1,ceil(count(*)/10.0)::integer)) AS page FROM matching
    ), records AS (
        SELECT id,created_at FROM matching ORDER BY created_at,id LIMIT 10 OFFSET (SELECT (page-1)*10 FROM bounds)
    ) SELECT jsonb_build_object('total',b.total,'page',b.page,
        'rows',public.admin_staff_directory_page((SELECT array_agg(id ORDER BY created_at,id) FROM records))) INTO response FROM bounds b;
    RETURN response;
END $function$
;
DROP FUNCTION IF EXISTS pawpal_private.staff_skill_allows_assignment(uuid);
NOTIFY pgrst,'reload schema';
COMMIT;
