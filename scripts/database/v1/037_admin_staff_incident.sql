BEGIN;
CREATE OR REPLACE FUNCTION public.record_admin_staff_incident(p_request_id uuid,p_appointment_id uuid,p_expected_updated_at timestamptz,p_staff_id uuid,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.audit_log; apt public.appointment; payload text; minutes integer;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('appointment.read') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'staff_incident_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_appointment_id IS NULL OR p_staff_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>10000
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) k WHERE k NOT IN ('type','severity','requested_extension_minutes','note')) THEN RAISE EXCEPTION 'invalid_staff_incident' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('appointment_id',p_appointment_id,'staff_id',p_staff_id,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,37));
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_INCIDENT_RECORD' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;RETURN p_request_id;
 END IF;
 minutes:=(p_details->>'requested_extension_minutes')::integer;
 IF coalesce(length(btrim(p_details->>'type')),0) NOT BETWEEN 1 AND 200 OR coalesce(length(btrim(p_details->>'severity')),0) NOT BETWEEN 1 AND 100
 OR coalesce(length(btrim(p_details->>'note')),0) NOT BETWEEN 3 AND 4000 OR minutes IS NULL OR minutes NOT BETWEEN 0 AND 1440 THEN RAISE EXCEPTION 'invalid_staff_incident' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.staff WHERE id=p_staff_id FOR UPDATE;
 SELECT * INTO apt FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND OR apt.updated_at IS DISTINCT FROM p_expected_updated_at OR apt.appointment_status IN ('completed','cancelled','no_show') THEN RAISE EXCEPTION 'staff_work_changed' USING ERRCODE='PT409'; END IF;
 IF apt.staff_id IS DISTINCT FROM p_staff_id AND NOT EXISTS(SELECT 1 FROM public.appointment_item WHERE appointment_id=apt.id AND staff_id=p_staff_id AND status NOT IN ('completed','cancelled'))
 AND NOT EXISTS(SELECT 1 FROM public.taxi_trip WHERE appointment_id=apt.id AND driver_staff_id=p_staff_id AND status NOT IN ('completed','cancelled')) THEN RAISE EXCEPTION 'staff_incident_assignment_required' USING ERRCODE='PT409'; END IF;
 -- This records a requested extension; it never silently moves appointments or charges money.
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'STAFF_INCIDENT_RECORD','appointment_incident',p_request_id,payload);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.record_admin_staff_incident(uuid,uuid,timestamptz,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_admin_staff_incident(uuid,uuid,timestamptz,uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.guard_staff_audit() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF (NEW.action LIKE 'STAFF\_%' ESCAPE '\' OR (TG_OP='UPDATE' AND OLD.action LIKE 'STAFF\_%' ESCAPE '\'))
 AND current_user IN ('authenticated','anon','authenticator') THEN RAISE EXCEPTION 'staff_audit_server_only' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS v1_staff_audit_server ON public.audit_log;
CREATE TRIGGER v1_staff_audit_server BEFORE INSERT OR UPDATE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_staff_audit();
-- Do not allow browser clients to erase the audit journal or modify permission definitions.
REVOKE UPDATE,DELETE ON public.audit_log FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.permission FROM authenticated;
-- Existing invoker service RPCs use SELECT ... FOR UPDATE on staff. PostgreSQL
-- requires UPDATE privilege on at least one column even when no value is changed.
-- A column grant permits the lock; this trigger still rejects every direct edit.
CREATE OR REPLACE FUNCTION pawpal_private.guard_staff_direct_update() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF current_user IN ('authenticated','anon','authenticator') THEN RAISE EXCEPTION 'staff_profile_rpc_required' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_staff_direct_update() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS v1_staff_direct_update ON public.staff;
CREATE TRIGGER v1_staff_direct_update BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_staff_direct_update();
GRANT UPDATE(id) ON public.staff TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
