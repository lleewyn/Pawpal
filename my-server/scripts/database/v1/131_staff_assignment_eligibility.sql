BEGIN;
-- Assessment-derived blocking stays independent from the manually managed service_locked flag.
CREATE OR REPLACE FUNCTION pawpal_private.staff_skill_allows_assignment(p_staff uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce((SELECT result='PASS' FROM public.staff_assessment WHERE staff_id=p_staff ORDER BY assessment_date DESC,created_at DESC,id LIMIT 1),true)
$$;
REVOKE ALL ON FUNCTION pawpal_private.staff_skill_allows_assignment(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION pawpal_private.guard_staff_assignment_eligibility()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE person uuid; state text; manual boolean;
BEGIN
 IF TG_TABLE_NAME='staff_schedule' THEN
  IF NEW.schedule_status<>'active' OR NEW.availability_status<>'available' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.staff_id=OLD.staff_id AND NEW.start_at=OLD.start_at AND NEW.end_at=OLD.end_at AND NEW.schedule_status=OLD.schedule_status AND NEW.availability_status=OLD.availability_status THEN RETURN NEW; END IF;
  person:=NEW.staff_id;
 ELSIF TG_TABLE_NAME='appointment' THEN
  IF NEW.appointment_status IN ('completed','cancelled','no_show') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.staff_id IS NOT DISTINCT FROM OLD.staff_id AND NEW.scheduled_start_at=OLD.scheduled_start_at AND NEW.scheduled_end_at=OLD.scheduled_end_at AND NEW.appointment_status=OLD.appointment_status THEN RETURN NEW; END IF;
  person:=NEW.staff_id;
 ELSIF TG_TABLE_NAME='appointment_item' THEN
  IF NEW.status IN ('completed','cancelled') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.staff_id IS NOT DISTINCT FROM OLD.staff_id AND NEW.appointment_id=OLD.appointment_id THEN RETURN NEW; END IF;
  person:=NEW.staff_id;
 ELSE
  IF NEW.status IN ('completed','cancelled') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.driver_staff_id IS NOT DISTINCT FROM OLD.driver_staff_id AND NEW.appointment_id=OLD.appointment_id THEN RETURN NEW; END IF;
  person:=NEW.driver_staff_id;
 END IF;
 IF person IS NULL THEN RETURN NEW; END IF;
 SELECT employment_status,service_locked INTO state,manual FROM public.staff WHERE id=person FOR UPDATE;
 IF NOT FOUND OR state<>'active' THEN RAISE EXCEPTION 'staff_not_available' USING ERRCODE='PT409'; END IF;
 -- Training can still be scheduled; skill/manual locks restrict service assignments.
 IF TG_TABLE_NAME<>'staff_schedule' AND (manual OR NOT pawpal_private.staff_skill_allows_assignment(person)) THEN
  RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='PT409';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_staff_assignment_eligibility() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS staff_assignment_eligibility ON public.staff_schedule;
DROP TRIGGER IF EXISTS staff_assignment_eligibility ON public.appointment;
DROP TRIGGER IF EXISTS staff_assignment_eligibility ON public.appointment_item;
DROP TRIGGER IF EXISTS staff_assignment_eligibility ON public.taxi_trip;
CREATE TRIGGER staff_assignment_eligibility BEFORE INSERT OR UPDATE OF staff_id,start_at,end_at,schedule_status,availability_status ON public.staff_schedule FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_staff_assignment_eligibility();
CREATE TRIGGER staff_assignment_eligibility BEFORE INSERT OR UPDATE OF staff_id,scheduled_start_at,scheduled_end_at,appointment_status ON public.appointment FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_staff_assignment_eligibility();
CREATE TRIGGER staff_assignment_eligibility BEFORE INSERT OR UPDATE OF staff_id,appointment_id ON public.appointment_item FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_staff_assignment_eligibility();
CREATE TRIGGER staff_assignment_eligibility BEFORE INSERT OR UPDATE OF driver_staff_id,appointment_id ON public.taxi_trip FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_staff_assignment_eligibility();

CREATE OR REPLACE FUNCTION public.admin_service_staff_candidates()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.read') THEN RAISE EXCEPTION 'staff_directory_forbidden' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'full_name',s.full_name,'job_title',s.job_title,'specialization',s.specialization,'phone_number',s.phone_number,'staff_level_id',s.staff_level_id,'service_locked',s.service_locked) ORDER BY s.id)
 FROM public.staff s WHERE s.employment_status='active' AND NOT s.service_locked AND pawpal_private.staff_skill_allows_assignment(s.id)),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.admin_service_staff_candidates() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_service_staff_candidates() TO authenticated;

-- Public availability uses the same latest assessment, without exposing assessment records.
DO $$ DECLARE signature text; definition text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['public.own_booking_availability(jsonb)','pawpal_private.guest_booking_availability(uuid,jsonb)'] LOOP
  definition:=pg_get_functiondef(signature::regprocedure);
  IF strpos(definition,'NOT s.service_locked')=0 THEN RAISE EXCEPTION 'unexpected_availability_definition'; END IF;
  IF strpos(definition,'staff_skill_allows_assignment')=0 THEN
   EXECUTE replace(definition,'NOT s.service_locked','NOT s.service_locked AND pawpal_private.staff_skill_allows_assignment(s.id)');
  END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.admin_staff_list_page(p_filters jsonb DEFAULT '{}'::jsonb, p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
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
            AND (NOT coalesce((p_filters->>'retrain')::boolean,false) OR s.skill_result IN ('RETRAIN','FAIL'))
            AND (NOT coalesce((p_filters->>'locked')::boolean,false) OR s.service_locked OR s.skill_result IN ('RETRAIN','FAIL'))
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
END $$;



NOTIFY pgrst,'reload schema';
COMMIT;
