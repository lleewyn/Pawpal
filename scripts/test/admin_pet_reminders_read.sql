BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id) VALUES(u);INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Reminder verification','QA',u,'active',false);INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');PERFORM set_config('request.jwt.claim.sub',u::text,true);END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; expected integer; BEGIN
r:=public.get_admin_pet_reminder_sources();
IF jsonb_typeof(r->'appointments')<>'array' OR jsonb_typeof(r->'contacts')<>'array' THEN RAISE EXCEPTION 'invalid reminder result';END IF;
WITH completed AS (
 SELECT a.id,a.pet_id,a.scheduled_start_at,(SELECT string_agg(i.name_snapshot,', ' ORDER BY i.id) FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.status='completed') service_name
 FROM public.appointment a WHERE a.appointment_status='completed' AND EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.id=a.pet_id AND p.status<>'archived')
), classified AS (
 SELECT a.*,r.kind FROM completed a CROSS JOIN (VALUES ('BATH',U&'t\1EAFm|bath'),('GROOM',U&'c\1EAFt t\1EC9a|groom|t\1EA1o ki\1EC3u|style'),('HOTEL',U&'hotel|l\01B0u tr\00FA|kh\00E1ch s\1EA1n')) r(kind,pattern) WHERE a.service_name ~* r.pattern
), latest AS (SELECT DISTINCT ON(pet_id,kind) id FROM classified ORDER BY pet_id,kind,scheduled_start_at DESC,id DESC)
SELECT count(DISTINCT id) INTO expected FROM latest;
IF expected<>jsonb_array_length(r->'appointments') THEN RAISE EXCEPTION 'reminder source count mismatch';END IF;
IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'appointments') row GROUP BY row->>'id' HAVING count(*)>1) THEN RAISE EXCEPTION 'duplicate appointment';END IF;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.get_admin_pet_reminder_sources();RAISE EXCEPTION 'unauthorized allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;SELECT 'PASS authenticated reminder sources, latest-per-pet/service counts, duplicate prevention and permission denial; rolled back';
