BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_pet_reminder_sources()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('appointment.read') OR NOT pawpal_private.has_permission('appointment_item.read') OR NOT pawpal_private.has_permission('pet_profile.read') OR NOT pawpal_private.has_permission('audit_log.read') THEN RAISE EXCEPTION 'pet_reminder_read_forbidden' USING ERRCODE='42501';END IF;
 WITH completed AS MATERIALIZED (
  SELECT a.id,a.appointment_code,a.customer_id,a.pet_id,a.scheduled_start_at,a.appointment_status,
   (SELECT string_agg(i.name_snapshot,', ' ORDER BY i.id) FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.status='completed') service_name
  FROM public.appointment a WHERE a.appointment_status='completed' AND EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.id=a.pet_id AND p.status<>'archived')
 ), classified AS (
  SELECT a.*,r.kind FROM completed a CROSS JOIN (VALUES ('BATH',U&'t\1EAFm|bath'),('GROOM',U&'c\1EAFt t\1EC9a|groom|t\1EA1o ki\1EC3u|style'),('HOTEL',U&'hotel|l\01B0u tr\00FA|kh\00E1ch s\1EA1n')) r(kind,pattern)
  WHERE a.service_name ~* r.pattern
 ), latest AS MATERIALIZED (
  SELECT DISTINCT ON(pet_id,kind) * FROM classified ORDER BY pet_id,kind,scheduled_start_at DESC,id DESC
 ), appts AS (
  SELECT DISTINCT id,appointment_code,customer_id,pet_id,scheduled_start_at,appointment_status,service_name FROM latest
 ), contacts AS (
  SELECT l.entity_id,l.description,l.created_at,CASE WHEN pg_input_is_valid(l.description,'jsonb') THEN l.description::jsonb ELSE '{}'::jsonb END details
  FROM public.audit_log l WHERE l.action='PET_CONTACT' AND l.entity_name='pet_profile' AND l.entity_id IN (SELECT pet_id FROM latest)
 ), selected_contacts AS (
  SELECT DISTINCT ON(c.entity_id,c.details->>'type',c.details->>'appointment_id') c.entity_id,c.description,c.created_at FROM contacts c
  WHERE EXISTS(SELECT 1 FROM latest a WHERE a.pet_id=c.entity_id AND a.kind=c.details->>'type' AND a.id::text=c.details->>'appointment_id')
  ORDER BY c.entity_id,c.details->>'type',c.details->>'appointment_id',c.created_at DESC
 )
 SELECT jsonb_build_object('appointments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'appointment_code',a.appointment_code,'customer_id',a.customer_id,'pet_id',a.pet_id,'appointment_status',a.appointment_status,'appointment_date',a.scheduled_start_at,'service',jsonb_build_object('service_name',a.service_name)) ORDER BY a.scheduled_start_at DESC,a.id) FROM appts a),'[]'::jsonb),
 'contacts',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC) FROM selected_contacts c),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_pet_reminder_sources() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_pet_reminder_sources() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
