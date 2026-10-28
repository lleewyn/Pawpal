BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
CREATE OR REPLACE FUNCTION public.acquire_admin_chat_read(p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
SET statement_timeout='1s' AS $$
DECLARE actor_id uuid; selected smallint; lease uuid;
BEGIN
 IF p_request IS NULL OR auth.uid() IS NULL OR NOT pawpal_private.has_permission('admin_copilot_history.read') OR NOT pawpal_private.has_permission('admin_copilot_history.write') THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO actor_id FROM public.staff WHERE auth_user_id=auth.uid();
 IF actor_id IS NULL THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 -- Fail fast rather than waiting for admission or queuing an unbounded workload.
 IF NOT pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_admission_v1'),0) THEN RAISE EXCEPTION 'chat_read_busy' USING ERRCODE='PT429'; END IF;
 IF EXISTS(SELECT 1 FROM pawpal_private.chat_read_slot WHERE actor=actor_id AND expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'chat_read_actor_busy' USING ERRCODE='PT429'; END IF;
 SELECT slot INTO selected FROM pawpal_private.chat_read_slot WHERE expires_at IS NULL OR expires_at<=clock_timestamp() ORDER BY slot LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF selected IS NULL THEN RAISE EXCEPTION 'chat_read_busy' USING ERRCODE='PT429'; END IF;
 lease:=gen_random_uuid();
 UPDATE pawpal_private.chat_read_slot SET actor=actor_id,token=lease,request_id=p_request,expires_at=clock_timestamp()+interval '35 seconds' WHERE slot=selected;
 RETURN lease;
END $$;

DROP TABLE pawpal_private.chat_read_rate;
NOTIFY pgrst,'reload schema';
COMMIT;
