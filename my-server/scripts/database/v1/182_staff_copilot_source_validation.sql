-- Validate inherited and freshly-read sources before sending them to a provider.
BEGIN;
CREATE FUNCTION public.validate_staff_copilot_request(p_lease uuid,p_scope_refs jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET lock_timeout='1s' SET statement_timeout='6s' AS $$
DECLARE item pawpal_private.staff_copilot_slot; scope jsonb; refs jsonb;
BEGIN
 item:=pawpal_private.staff_copilot_request(p_lease,auth.uid());
 IF item.completed THEN RAISE EXCEPTION 'staff_request_completed' USING ERRCODE='PT409'; END IF;
 IF p_scope_refs IS NULL OR jsonb_typeof(p_scope_refs)<>'array' THEN RAISE EXCEPTION 'invalid_staff_source_refs' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(p_scope_refs)>64 OR octet_length(p_scope_refs::text)>16384 THEN RAISE EXCEPTION 'staff_scope_refs_exceeded' USING ERRCODE='54000'; END IF;
 SELECT coalesce(jsonb_agg(ref ORDER BY ref::text),'[]') INTO refs FROM (SELECT DISTINCT value ref FROM jsonb_array_elements(item.context_refs||p_scope_refs))t;
 IF jsonb_array_length(refs)>64 OR octet_length(refs::text)>16384 THEN RAISE EXCEPTION 'staff_scope_refs_exceeded' USING ERRCODE='54000'; END IF;
 scope:=pawpal_private.staff_copilot_scope(auth.uid());
 IF NOT pawpal_private.staff_copilot_refs_allowed(item.staff_id,scope->'permissions',refs) THEN RAISE EXCEPTION 'staff_request_source_forbidden' USING ERRCODE='42501'; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.validate_staff_copilot_request(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.validate_staff_copilot_request(uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
