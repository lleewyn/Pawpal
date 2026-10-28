BEGIN;
DROP TRIGGER IF EXISTS validate_staff_contact ON public.staff;
DROP FUNCTION IF EXISTS pawpal_private.validate_staff_contact();
CREATE OR REPLACE FUNCTION public.admin_staff_list_page(p_filters jsonb DEFAULT '{}'::jsonb, p_page integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    needle text := lower(btrim(coalesce(p_filters->>'query', '')));
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
                OR strpos(replace(regexp_replace(normalize(lower(coalesce(s.full_name,'') || ' ' || coalesce(s.job_title,'')), NFD), U&'[\0300-\036f]', '', 'g'), 'đ', 'd'), normalized)>0)
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
NOTIFY pgrst,'reload schema';
COMMIT;
