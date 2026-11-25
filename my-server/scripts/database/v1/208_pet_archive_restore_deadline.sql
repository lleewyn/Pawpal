BEGIN;
CREATE FUNCTION pawpal_private.pet_restore_window_open(p_archived_at timestamptz,p_now timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT coalesce(p_now<=p_archived_at+interval '720 hours',false)
$$;
REVOKE ALL ON FUNCTION pawpal_private.pet_restore_window_open(timestamptz,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE source text; needle text:=' UPDATE public.pet_profile SET status=CASE WHEN p_restore'; BEGIN
 source:=pg_get_functiondef('public.change_own_pet_status(uuid,timestamptz,boolean)'::regprocedure);
 IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_pet_status_function';END IF;
 source:=replace(source,needle,$guard$ IF p_restore AND pet.status IN ('inactive','disabled','archived')
 AND NOT pawpal_private.pet_restore_window_open(pet.archived_at,clock_timestamp()) THEN
  RAISE EXCEPTION 'Đã quá thời hạn khôi phục 30 ngày' USING ERRCODE='PT410';
 END IF;
 UPDATE public.pet_profile SET status=CASE WHEN p_restore$guard$);
 EXECUTE source;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
