BEGIN;

-- Lightweight directory for selectors, filters and KPI calculations. Full account
-- permissions and personal profile fields are fetched only for visible staff.
CREATE OR REPLACE FUNCTION public.admin_staff_directory_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.read') THEN
        RAISE EXCEPTION 'staff_directory_forbidden' USING ERRCODE = '42501';
    END IF;
    RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('staff_record', jsonb_build_object(
        'id', s.id, 'full_name', s.full_name, 'job_title', s.job_title,
        'specialization', CASE WHEN coalesce(s.job_title, '') = '' THEN s.specialization ELSE NULL END,
        'employment_status', s.employment_status, 'service_locked', s.service_locked
    )) ORDER BY s.created_at, s.id) FROM public.staff s), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.admin_staff_schedule_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
DECLARE
    month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok';
    month_end timestamptz := (date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok') + interval '1 month') AT TIME ZONE 'Asia/Bangkok';
BEGIN
    IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.read') THEN
        RAISE EXCEPTION 'staff_schedule_forbidden' USING ERRCODE = '42501';
    END IF;
    RETURN (WITH combined AS (
        SELECT sch.* FROM public.staff_schedule sch WHERE start_at < month_end AND end_at > month_start
        UNION SELECT upcoming.* FROM public.staff s CROSS JOIN LATERAL (
            SELECT sch.* FROM public.staff_schedule sch WHERE sch.staff_id=s.id AND schedule_status='active'
                AND availability_status='available' AND end_at>now() ORDER BY start_at,id LIMIT 1
        ) upcoming
        UNION SELECT previous.* FROM public.staff s CROSS JOIN LATERAL (
            SELECT sch.* FROM public.staff_schedule sch WHERE sch.staff_id=s.id AND schedule_status='active'
                AND availability_status='available' AND end_at<=now() ORDER BY start_at DESC,id DESC LIMIT 1
        ) previous
    ) SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'staff_id',c.staff_id,'start_at',c.start_at,'end_at',c.end_at,
        'schedule_status',c.schedule_status,'availability_status',c.availability_status,'reason',c.reason,
        'updated_at',c.updated_at,'created_at',c.created_at) ORDER BY start_at,id),'[]'::jsonb) FROM combined c);
END $$;

CREATE OR REPLACE FUNCTION public.admin_staff_list_page(p_filters jsonb DEFAULT '{}'::jsonb, p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
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
END $$;

CREATE OR REPLACE FUNCTION public.admin_staff_assessment_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
DECLARE
    month_start date := date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok')::date;
BEGIN
    IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.read') THEN
        RAISE EXCEPTION 'staff_assessment_forbidden' USING ERRCODE = '42501';
    END IF;
    RETURN (WITH latest AS (
        SELECT DISTINCT ON (staff_id) a.* FROM public.staff_assessment a
        ORDER BY staff_id, assessment_date DESC, created_at DESC, id
    ), combined AS (
        SELECT a.* FROM public.staff_assessment a
        WHERE assessment_date >= month_start AND assessment_date < (month_start + interval '1 month')::date
        UNION SELECT * FROM latest
    ) SELECT coalesce(jsonb_agg(to_jsonb(c) - 'note' ORDER BY assessment_date DESC, created_at DESC, id), '[]'::jsonb) FROM combined c);
END $$;

-- The existing directory function continues to enforce its permission gates and
-- hide auth internals. Return a bounded page of details in the caller's ID order.
CREATE OR REPLACE FUNCTION public.admin_staff_directory_page(p_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.read') THEN
        RAISE EXCEPTION 'staff_directory_forbidden' USING ERRCODE = '42501';
    END IF;
    IF cardinality(p_ids) > 10 THEN
        RAISE EXCEPTION 'staff_page_too_large' USING ERRCODE = '22023';
    END IF;
    RETURN coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY array_position(p_ids, (d.staff_record->>'id')::uuid))
        FROM public.get_admin_staff_directory() d
        WHERE (d.staff_record->>'id')::uuid = ANY(p_ids)), '[]'::jsonb);
END $$;

-- Keep all searches on the server, including substrings of UUIDs. The caller's
-- assessment/staff RLS still applies; no security-definer elevation is added.
CREATE OR REPLACE FUNCTION public.admin_staff_assessment_page(
    p_query text DEFAULT '', p_type text DEFAULT 'ALL', p_result text DEFAULT 'ALL',
    p_page integer DEFAULT 1, p_staff_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
DECLARE
    needle text := lower(btrim(coalesce(p_query, '')));
    normalized text;
    response jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.read') THEN
        RAISE EXCEPTION 'staff_assessment_forbidden' USING ERRCODE = '42501';
    END IF;
    normalized := replace(regexp_replace(normalize(needle, NFD), U&'[\0300-\036f]', '', 'g'), 'đ', 'd');
    WITH matching AS MATERIALIZED (
        SELECT a.*, jsonb_build_object('full_name', assessor.full_name) AS assessor
        FROM public.staff_assessment a
        LEFT JOIN public.staff person ON person.id = a.staff_id
        LEFT JOIN public.staff assessor ON assessor.id = a.assessed_by
        WHERE (p_staff_id IS NULL OR a.staff_id = p_staff_id)
            AND (coalesce(p_type, 'ALL') = 'ALL' OR a.assessment_type = p_type)
            AND (coalesce(p_result, 'ALL') = 'ALL' OR a.result = p_result)
            AND (needle = '' OR strpos(a.id::text, needle) > 0 OR strpos(a.staff_id::text, needle) > 0
                OR strpos(replace(regexp_replace(normalize(lower(coalesce(person.full_name, '')), NFD), U&'[\0300-\036f]', '', 'g'), 'đ', 'd'), normalized) > 0)
    ), totals AS (
        SELECT count(*) AS total FROM matching
    ), bounds AS (
        SELECT total, least(greatest(coalesce(p_page, 1), 1), greatest(1, ceil(total / 10.0)::integer)) AS page FROM totals
    ), records AS (
        SELECT m.* FROM matching m
        ORDER BY assessment_date DESC, created_at DESC, id
        LIMIT 10 OFFSET (SELECT (page - 1) * 10 FROM bounds)
    )
    SELECT jsonb_build_object('total', b.total, 'page', b.page,
        'rows', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.assessment_date DESC, r.created_at DESC, r.id) FROM records r), '[]'::jsonb))
    INTO response FROM bounds b;
    RETURN response;
END $$;

REVOKE ALL ON FUNCTION public.admin_staff_directory_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_staff_schedule_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_staff_assessment_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_staff_directory_page(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_staff_list_page(jsonb,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_staff_assessment_page(text,text,text,integer,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_staff_directory_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_staff_schedule_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_staff_assessment_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_staff_directory_page(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_staff_list_page(jsonb,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_staff_assessment_page(text,text,text,integer,uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
